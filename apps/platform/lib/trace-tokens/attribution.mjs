// Server-side only: pass a privileged database client, never a browser client.
// This header identifies the run's user; it does not authorize trace ingestion.
import { createHash } from 'node:crypto';

export const TRACE_TOKEN_HEADER = 'x-rma-trace-token';
const TOKEN = /^rma_trace_[A-Za-z0-9_-]{43}$/;

export async function resolveTraceUser(client, headers) {
  const secret = headers.get(TRACE_TOKEN_HEADER);
  // Missing, malformed, unknown and revoked tokens all mean unknown ownership.
  // Do not fall back to cookies, Authorization or user IDs in the trace payload.
  if (!secret || !TOKEN.test(secret)) return null;
  const { data, error } = await client.from('trace_tokens')
    .select('user_id').eq('token_hash', createHash('sha256').update(secret).digest('hex'))
    .is('revoked_at', null).maybeSingle();
  // A database outage is an operational failure, not evidence of an unknown user.
  if (error) throw new Error('Could not resolve trace ownership. Please try again.');
  return data?.user_id ?? null;
}
