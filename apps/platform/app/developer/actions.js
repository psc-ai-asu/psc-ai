'use server';

import { createClient } from '../lib/supabaseServer';

function buildAgentRow(row = {}) {
  return {
    id: row.id,
    name: row.name ?? 'Untitled Agent',
    description: row.description ?? '',
    framework: normalizeFramework(row.framework),
    status: row.status ?? 'active',
    public_metrics: Boolean(row.public_metrics),
    github_repo_url: row.github_repo_url ?? '',
    developed_by: row.developed_by,
    created_at: row.created_at,
  };
}

// Accepts "owner/repo", "github.com/owner/repo", or any github.com URL inside the repo
// (e.g. .../tree/main or ...repo.git) and returns https://github.com/<owner>/<repo>.
// Returns null when empty; throws when the value is not a GitHub repo.
function normalizeGithubRepoUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';

  if (!raw) {
    return null;
  }

  const path = raw
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .split(/[?#]/)[0];
  const [owner, repo = ''] = path.split('/');
  const repoName = repo.replace(/\.git$/i, '');

  if (
    raw.includes('://') && !/^https?:\/\/(www\.)?github\.com\//i.test(raw)
    || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(owner)
    || !/^[A-Za-z0-9._-]{1,100}$/.test(repoName)
  ) {
    throw new Error('GitHub repo must look like https://github.com/owner/repo.');
  }

  return `https://github.com/${owner}/${repoName}`;
}

function normalizeFramework(value) {
  const framework = typeof value === 'string' ? value.trim() : '';
  const validFrameworks = ['LangChain', 'CrewAI', 'AutoGen', 'OpenAI Swarm', 'Custom'];

  return validFrameworks.includes(framework) ? framework : 'Custom';
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
    framework: normalizeFramework(formData.framework),
    public_metrics: Boolean(formData.public_metrics),
    github_repo_url: normalizeGithubRepoUrl(formData.github_repo_url),
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
    framework: normalizeFramework(formData.framework),
    public_metrics: Boolean(formData.public_metrics),
    github_repo_url: normalizeGithubRepoUrl(formData.github_repo_url),
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
