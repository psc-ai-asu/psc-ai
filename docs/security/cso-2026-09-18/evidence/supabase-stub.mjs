// Minimal Supabase (GoTrue + PostgREST) stub for exercising the platform app locally.
// Logs every request so we can see exactly what the browser client sends.
import http from 'node:http';
import { appendFileSync } from 'node:fs';

const LOG = process.env.STUB_LOG || '/tmp/stub-requests.jsonl';
const users = new Map();     // email -> {id, email, password, user_metadata}
const profiles = [];         // {id, username, email}
const reviews = [];
const agents = [{ id: 'agt-1', owner_id: 'u-1', name: 'DemoAgent', framework: 'LangChain', public_metrics: {} }];
const TOKEN = 'stub-access-token';
let currentUser = null;

function seed() {
  const u = { id: 'u-1', email: 'alice@example.com', password: 'Alice1234!', user_metadata: { username: 'alice' } };
  users.set(u.email, u);
  profiles.push({ id: 'u-1', username: 'alice', email: 'alice@example.com' });
}
seed();

function userJson(u) { return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: u.user_metadata, app_metadata: {} }; }
function session(u) { return { access_token: TOKEN, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, refresh_token: 'r', user: userJson(u) }; }

function send(res, status, body, extra = {}) {
  const h = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*', ...extra };
  res.writeHead(status, h); res.end(body === undefined ? '' : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  let raw = ''; for await (const c of req) raw += c;
  const url = new URL(req.url, 'http://x');
  const entry = { t: new Date().toISOString(), method: req.method, path: url.pathname + url.search, apikey: req.headers.apikey, auth: req.headers.authorization, prefer: req.headers.prefer, body: raw ? (()=>{try{return JSON.parse(raw)}catch{return raw}})() : undefined };
  appendFileSync(LOG, JSON.stringify(entry) + '\n');
  console.log(`${req.method} ${url.pathname}${url.search} auth=${req.headers.authorization ? 'yes' : 'no'} body=${raw.slice(0,200)}`);
  if (req.method === 'OPTIONS') return send(res, 204);
  const body = entry.body;
  const p = url.pathname;

  // ---- auth ----
  if (p === '/auth/v1/signup') {
    if (users.has(body.email)) return send(res, 422, { code: 422, msg: 'User already registered' });
    const u = { id: 'u-' + (users.size + 1), email: body.email, password: body.password, user_metadata: body.data || {} };
    users.set(u.email, u); currentUser = u; return send(res, 200, session(u));
  }
  if (p === '/auth/v1/token') {
    const u = users.get(body.email);
    if (!u || u.password !== body.password) return send(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
    currentUser = u; return send(res, 200, session(u));
  }
  if (p === '/auth/v1/user') { return currentUser ? send(res, 200, userJson(currentUser)) : send(res, 401, { msg: 'no session' }); }
  if (p === '/auth/v1/logout') { currentUser = null; return send(res, 204); }

  // ---- rest ----
  const authed = req.headers.authorization === `Bearer ${TOKEN}`;
  if (p === '/rest/v1/profiles') {
    if (req.method === 'GET') {
      const sel = url.searchParams.get('select') || '*';
      let rows = profiles.map(pr => ({ ...pr }));
      for (const [k, v] of url.searchParams) { if (k !== 'select') { const [op, val] = v.split('.'); if (op === 'eq') rows = rows.filter(r => String(r[k]) === val); } }
      if (sel.includes('agents')) rows = rows.map(r => ({ ...r, agents: agents.filter(a => a.owner_id === r.id).map(a => ({ ...a, reviews: reviews.filter(rv => rv.agent_id === a.id).map(rv => ({ ...rv, reviewer: { username: (profiles.find(x => x.id === rv.review_by) || {}).username }, metrics: [] })) })) }));
      const single = /vnd\.pgrst\.object/.test(req.headers.accept || '');
      if (single) { if (rows.length !== 1) return send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }); return send(res, 200, rows[0]); }
      return send(res, 200, rows);
    }
    if (req.method === 'POST') { const rows = Array.isArray(body) ? body : [body]; rows.forEach(r => { const i = profiles.findIndex(x => x.id === r.id); i >= 0 ? profiles[i] = { ...profiles[i], ...r } : profiles.push(r); }); return send(res, 201, rows); }
  }
  if (p === '/rest/v1/reviews' && req.method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    rows.forEach(r => reviews.push({ id: 'rv-' + (reviews.length + 1), date: new Date().toISOString(), ...r }));
    return send(res, 201, rows);
  }
  if (p === '/__state') return send(res, 200, { users: [...users.values()], profiles, reviews, agents, currentUser });
  send(res, 404, { message: 'stub: unhandled ' + p });
});
server.listen(54321, () => console.log('supabase stub on :54321, log -> ' + LOG));
