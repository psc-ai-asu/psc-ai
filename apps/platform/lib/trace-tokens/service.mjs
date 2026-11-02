// Server-side implementation shared by the server actions and focused Node tests.
import { createHash, randomBytes } from 'node:crypto';

export const SAFE_COLUMNS = 'id,name,token_prefix,created_at,last_used_at,revoked_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function metadata(row) {
  return Object.fromEntries(SAFE_COLUMNS.split(',').map((key) => [key, row[key]]));
}

async function authenticate(client) {
  if (!client) throw new Error('Trace token management is not configured.');
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new Error('Sign in to manage your personal trace tokens.');
  return data.user.id;
}

export async function listTokens(client) {
  const userId = await authenticate(client);
  const { data, error } = await client.from('trace_tokens').select(SAFE_COLUMNS)
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error('Could not load trace tokens. Please try again.');
  return (data ?? []).map(metadata);
}

export async function createToken(client, name) {
  const userId = await authenticate(client);
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    throw new Error('Enter a token name between 1 and 80 characters.');
  }
  const secret = `rma_trace_${randomBytes(32).toString('base64url')}`;
  const { data, error } = await client.from('trace_tokens').insert({
    user_id: userId,
    name: name.trim(),
    token_hash: createHash('sha256').update(secret).digest('hex'),
    token_prefix: secret.slice(0, 18),
  }).select(SAFE_COLUMNS).single();
  if (error || !data) throw new Error('Could not create a trace token. Please try again.');
  // This is the only return path containing a plaintext credential.
  return { token: metadata(data), secret };
}

export async function revokeToken(client, id) {
  const userId = await authenticate(client);
  if (typeof id !== 'string' || !UUID.test(id)) throw new Error('Invalid token ID.');
  const { data, error } = await client.from('trace_tokens')
    .update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
    .is('revoked_at', null).select(SAFE_COLUMNS).maybeSingle();
  if (error) throw new Error('Could not revoke this trace token. Please try again.');
  if (!data) throw new Error('Token not found or already revoked.');
  return metadata(data);
}
