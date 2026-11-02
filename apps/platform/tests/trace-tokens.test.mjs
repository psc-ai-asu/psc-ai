import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createToken, listTokens, revokeToken, SAFE_COLUMNS } from '../lib/trace-tokens/service.mjs';

const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const id = '20000000-0000-4000-8000-000000000001';
function client(userId = owner, rows = [], fail = false) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from(table) {
      assert.equal(table, 'trace_tokens');
      let operation = 'list', inserted, changes;
      const filters = [];
      const query = {
        select(columns) { assert.equal(columns, SAFE_COLUMNS); return this; },
        insert(row) { operation = 'insert'; inserted = row; return this; },
        update(row) { operation = 'update'; changes = row; return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        is(key, value) { filters.push([key, value]); return this; },
        order() { return this; },
        single() { return this; }, maybeSingle() { return this; },
        then(resolve) {
          if (fail) return Promise.resolve({ error: { message: 'database secret internals' } }).then(resolve);
          if (operation === 'insert') {
            rows.push({ id, created_at: '2026-10-23T00:00:00Z', last_used_at: null, revoked_at: null, ...inserted });
            return Promise.resolve({ data: rows.at(-1) }).then(resolve);
          }
          assert.ok(filters.some(([key, value]) => key === 'user_id' && value === userId), 'explicit owner filter');
          const matches = rows.filter((row) => filters.every(([key, value]) => row[key] === value));
          if (operation === 'update') {
            for (const row of matches) Object.assign(row, changes);
            return Promise.resolve({ data: matches[0] ?? null }).then(resolve);
          }
          return Promise.resolve({ data: matches }).then(resolve);
        },
      };
      return query;
    },
  };
}

test('create stores SHA-256 only; secret returned only on successful creation', async () => {
  const rows = [];
  const db = client(owner, rows);
  const created = await createToken(db, '  Reviewer laptop  ');
  assert.match(created.secret, /^rma_trace_[A-Za-z0-9_-]{43}$/);
  assert.equal(rows[0].token_hash, createHash('sha256').update(created.secret).digest('hex'));
  assert.equal(rows[0].name, 'Reviewer laptop');
  assert.equal(rows[0].user_id, owner);
  assert.equal(rows[0].token_prefix, created.secret.slice(0, 18));
  assert.ok(!JSON.stringify(rows).includes(created.secret));
  assert.ok(!('token_hash' in created.token));
  const listed = await listTokens(db);
  assert.ok(!JSON.stringify(listed).includes(created.secret));
  assert.ok(!('token_hash' in listed[0]));
  const revoked = await revokeToken(db, id);
  assert.ok(revoked.revoked_at);
  assert.ok(!('secret' in revoked));
  assert.ok(!('token_hash' in revoked));
  await assert.rejects(revokeToken(db, id), /not found or already revoked/);
});

test('different tokens use independent cryptographic randomness', async () => {
  const a = await createToken(client(), 'A');
  const b = await createToken(client(), 'B');
  assert.notEqual(a.secret, b.secret);
});

test('other reviewers cannot list or revoke an owner token', async () => {
  const rows = [];
  await createToken(client(owner, rows), 'Owned');
  assert.deepEqual(await listTokens(client(other, rows)), []);
  await assert.rejects(revokeToken(client(other, rows), id), /not found/);
  assert.equal(rows[0].revoked_at, null);
});

test('unauthenticated operations, invalid names and IDs are rejected', async () => {
  for (const operation of [() => listTokens(client(null)), () => createToken(client(null), 'Name'), () => revokeToken(client(null), id)]) {
    await assert.rejects(operation, /Sign in/);
  }
  for (const name of ['', ' ', 'a'.repeat(81), null, {}]) {
    await assert.rejects(createToken(client(), name), /token name/);
  }
  await assert.rejects(revokeToken(client(), 'invalid'), /Invalid token ID/);
  await assert.rejects(listTokens(null), /not configured/);
});

test('database failures expose safe errors, never raw database details', async () => {
  for (const operation of [() => listTokens(client(owner, [], true)), () => createToken(client(owner, [], true), 'Name'), () => revokeToken(client(owner, [], true), id)]) {
    await assert.rejects(operation, (error) => error.message.startsWith('Could not') && !error.message.includes('internals'));
  }
});
