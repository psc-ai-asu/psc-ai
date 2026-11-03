// Real PostgreSQL privilege/RLS checks, in-memory only. No production credentials.
// PGLITE_MODULE_PATH may point to an isolated install; see docs/personal-trace-tokens.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');

const owner = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const id = '20000000-0000-4000-8000-000000000001';

test('migration enforces owner RLS, column secrecy and irreversible revocation', async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase auth/roles plus the broad baseline defaults this migration must undo.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      insert into auth.users values ('${owner}'), ('${other}');
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/20261023000000_personal_trace_tokens.sql', import.meta.url), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${owner}';`);
    await db.exec(`insert into public.trace_tokens (id, user_id, name, token_hash, token_prefix) values ('${id}', '${owner}', 'Owner', repeat('a',64), 'rma_trace_abcdefgh')`).then(
      () => assert.fail('id insert must be forbidden'),
      (error) => assert.match(error.message, /permission denied/),
    );
    await db.exec(`insert into public.trace_tokens (user_id,name,token_hash,token_prefix) values ('${owner}','Owner',repeat('a',64),'rma_trace_abcdefgh')`);
    const row = (await db.query('select id,name,token_prefix,created_at,last_used_at,revoked_at from public.trace_tokens')).rows[0];
    assert.equal(row.name, 'Owner');
    for (const sql of [
      'select token_hash from public.trace_tokens',
      'select * from public.trace_tokens',
      `update public.trace_tokens set name='changed'`,
      `update public.trace_tokens set user_id='${other}'`,
      `update public.trace_tokens set token_hash=repeat('b',64)`,
      `update public.trace_tokens set last_used_at=now()`,
      'delete from public.trace_tokens',
    ]) await assert.rejects(db.exec(sql), /permission denied/);
    await assert.rejects(db.exec(`insert into public.trace_tokens(user_id,name,token_hash,token_prefix) values ('${other}','Forged',repeat('b',64),'rma_trace_ijklmnop')`), /row-level security/);
    await db.exec(`set request.jwt.claim.sub = '${other}';`);
    assert.equal((await db.query('select id from public.trace_tokens')).rows.length, 0);
    assert.equal((await db.query(`update public.trace_tokens set revoked_at=now() where id='${row.id}' returning id`)).rows.length, 0);
    await db.exec(`set request.jwt.claim.sub = '${owner}';`);
    const revoked = (await db.query(`update public.trace_tokens set revoked_at='2099-01-01' where id='${row.id}' returning revoked_at`)).rows[0].revoked_at;
    assert.ok(new Date(revoked).getFullYear() < 2099);
    const again = (await db.query(`update public.trace_tokens set revoked_at=null where id='${row.id}' returning revoked_at`)).rows[0].revoked_at;
    assert.equal(String(again), String(revoked));
    await db.exec('set role anon');
    await assert.rejects(db.exec('select id from public.trace_tokens'), /permission denied/);
    await assert.rejects(db.exec(`insert into public.trace_tokens(name,token_hash,token_prefix) values ('Anonymous',repeat('c',64),'rma_trace_abcdefgh')`), /permission denied/);
  } finally { await db.close(); }
});
