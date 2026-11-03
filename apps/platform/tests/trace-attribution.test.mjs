import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { TRACE_TOKEN_HEADER, resolveTraceUser } from '../lib/trace-tokens/attribution.mjs';

const secret = `rma_trace_${'a'.repeat(43)}`;
const userId = '10000000-0000-4000-8000-000000000001';
const hash = createHash('sha256').update(secret).digest('hex');
function database(rows, error = null) {
  return { from(table) {
    assert.equal(table, 'trace_tokens');
    const filters = [];
    return {
      select(columns) { assert.equal(columns, 'user_id'); return this; },
      eq(key, value) { filters.push([key, value]); return this; },
      is(key, value) { filters.push([key, value]); return this; },
      async maybeSingle() {
        assert.deepEqual(filters, [['token_hash', hash], ['revoked_at', null]]);
        const row = rows.find((row) => filters.every(([key, value]) => row[key] === value));
        return { data: row ? { user_id: row.user_id } : null, error };
      },
    };
  } };
}

test('missing or malformed attribution does not require a user or database lookup', async () => {
  for (const value of [null, '', 'invalid', `Bearer ${secret}`, `${secret},${secret}`]) {
    const headers = new Headers({ Authorization: `Bearer ${secret}`, Cookie: 'user_id=spoofed' });
    if (value !== null) headers.set(TRACE_TOKEN_HEADER, value);
    assert.equal(await resolveTraceUser(null, headers), null);
  }
});

test('a valid header resolves only the token owner UUID', async () => {
  const headers = new Headers({ 'X-RMA-Trace-Token': secret });
  assert.equal(await resolveTraceUser(database([{ token_hash: hash, user_id: userId, revoked_at: null }]), headers), userId);
});

test('unknown and revoked tokens leave ownership null', async () => {
  const headers = new Headers({ [TRACE_TOKEN_HEADER]: secret });
  for (const rows of [[], [{ token_hash: hash, user_id: userId, revoked_at: '2026-10-27T00:00:00Z' }]]) {
    assert.equal(await resolveTraceUser(database(rows), headers), null);
  }
});

test('lookup failures use a safe operational error', async () => {
  await assert.rejects(resolveTraceUser(database([], { message: 'private database details' }),
    new Headers({ [TRACE_TOKEN_HEADER]: secret })), { message: 'Could not resolve trace ownership. Please try again.' });
});
