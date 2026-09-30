'use server';

import { createClient } from '../lib/supabaseServer';

function buildAgentRow(row = {}) {
  return {
    id: row.id,
    name: row.name ?? 'Untitled Agent',
    description: row.description ?? '',
    framework: row.framework ?? 'Custom',
    status: row.status ?? 'active',
    public_metrics: Boolean(row.public_metrics),
    developed_by: row.developed_by,
    created_at: row.created_at,
  };
}

export async function getAgentsAction() {
  const client = await createClient();

  if (!client) {
    return [];
  }

  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data, error } = await client
    .from('agents')
    .select('*')
    .eq('developed_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(buildAgentRow);
}

export async function addAgentAction(formData = {}) {
  const client = await createClient();

  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to add an agent.');
  }

  const payload = {
    developed_by: user.id,
    name: formData.name?.trim() || 'Untitled Agent',
    description: formData.description ?? '',
    framework: formData.framework || 'Custom',
    public_metrics: Boolean(formData.public_metrics),
    status: 'active',
  };

  const { data, error } = await client
    .from('agents')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return buildAgentRow(data);
}

export async function updateAgentAction(agentId, formData = {}) {
  const client = await createClient();

  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to update an agent.');
  }

  const payload = {
    name: formData.name?.trim() || 'Untitled Agent',
    description: formData.description ?? '',
    framework: formData.framework || 'Custom',
    public_metrics: Boolean(formData.public_metrics),
  };

  const { data, error } = await client
    .from('agents')
    .update(payload)
    .eq('id', agentId)
    .eq('developed_by', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Agent not found or you do not have permission to edit it.');
  }

  return buildAgentRow(data);
}

export async function deleteAgentAction(agentId) {
  const client = await createClient();

  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  const { data: { user }, error: userError } = await client.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be signed in to delete an agent.');
  }

  const { error } = await client
    .from('agents')
    .delete()
    .eq('id', agentId)
    .eq('developed_by', user.id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
