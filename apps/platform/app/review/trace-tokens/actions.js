'use server';

import { createClient } from '../../lib/supabaseServer';
import { createToken, listTokens, revokeToken } from '../../../lib/trace-tokens/service.mjs';

// Expected errors are safe messages; never serialize database errors or credentials.
async function perform(operation) {
  try {
    return { data: await operation(await createClient()) };
  } catch (error) {
    const safe = /^(Trace token management|Sign in|Enter a token name|Could not|Invalid token ID|Token not found)/;
    return { error: safe.test(error.message) ? error.message : 'Unable to manage trace tokens. Please try again.' };
  }
}

export async function createTraceTokenAction(name) {
  return perform((client) => createToken(client, name));
}
export async function listTraceTokensAction() {
  return perform(listTokens);
}
export async function revokeTraceTokenAction(id) {
  return perform((client) => revokeToken(client, id));
}
