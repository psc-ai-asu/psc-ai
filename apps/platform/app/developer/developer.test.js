import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Let Node load actions.js outside Next.js changes must be made to not include registerHooks
// Only for testing
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/supabase/server") {
      return { url: "data:text/javascript,export const createClient = async () => globalThis.supabase;", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../../${specifier.slice(2)}.js`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { addAgentAction, getAgentsAction, updateAgentAction, deleteAgentAction } = await import("./actions.js");

// The developer account from supabase/seed.sql.
const seededDeveloperId = "10000000-0000-0000-0000-000000000001";
const seededEmail = "developer@example.com";
const seededUsername = "demo_developer";
const seededAgentId = "a0000000-0000-0000-0000-000000000004";

// In-memory stand-in for Supabase's "agents" table, signed in as the seeded developer.
function fakeSupabase(rows = []) {
  const user = { id: seededDeveloperId, email: seededEmail, user_metadata: { username: seededUsername } };
  globalThis.supabase = {
    rows,
    auth: { getUser: async () => ({ data: { user } }) },
    from() {
      let op = "select", payload;
      const filters = [];
      const query = {
        select: () => query,
        order: () => query,
        single: () => query,
        insert: (value) => { op = "insert"; payload = value[0]; return query; },
        update: (value) => { op = "update"; payload = value; return query; },
        delete: () => { op = "delete"; return query; },
        eq: (key, value) => { filters.push([key, value]); return query; },
        then(resolve) {
          if (op === "insert") {
            rows.push({ id: `agent-${rows.length + 1}`, ...payload });
            return resolve({ data: rows.at(-1) });
          }
          const matches = rows.filter((row) => filters.every(([key, value]) => row[key] === value));
          if (op === "update") Object.assign(matches[0], payload);
          if (op === "delete") matches.forEach((row) => rows.splice(rows.indexOf(row), 1));
          return resolve({ data: op === "update" ? matches[0] : matches });
        },
      };
      return query;
    },
  };
  return globalThis.supabase;
}

function filledForm() {
  return {
    name: "Course Planner",
    description: "Helps students plan their semester.",
    framework: "LangChain",
    public_metrics: true,
    github_repo_url: "psc-ai-asu/course-planner",
  };
}

// The seeded developer's Course Planner agent from supabase/seed.sql.
function seededAgent() {
  return {
    id: seededAgentId,
    developed_by: seededDeveloperId,
    name: "Course Planner",
    description: "Plans a one-semester class schedule from a student's request.",
    framework: "LangChain",
    public_metrics: true,
    status: "active",
  };
}

describe("developer agents", () => {
  it("creates an agent when all required fields are filled out", async () => {
    const supabase = fakeSupabase();

    const agent = await addAgentAction(filledForm());

    assert.equal(agent.name, "Course Planner");
    assert.equal(supabase.rows.length, 1);
  });

  it("does not create an agent when name is empty", async () => {
    const supabase = fakeSupabase();

    await assert.rejects(addAgentAction({ ...filledForm(), name: "" }));
    assert.equal(supabase.rows.length, 0);
  });

  it("shows an agent the developer previously onboarded", async () => {
    fakeSupabase([seededAgent()]);

    const agents = await getAgentsAction();

    assert.equal(agents[0].name, "Course Planner");
  });

  it("edits an existing agent's information", async () => {
    fakeSupabase([seededAgent()]);

    const agent = await updateAgentAction(seededAgentId, { ...filledForm(), name: "Course Planner v2" });

    assert.equal(agent.name, "Course Planner v2");
  });

  it("deletes an agent the developer previously onboarded", async () => {
    const supabase = fakeSupabase([seededAgent()]);

    await deleteAgentAction(seededAgentId);

    assert.equal(supabase.rows.length, 0);
  });

  it("does not create an agent when name contains only spaces", async () => {
    const supabase = fakeSupabase();

    await assert.rejects(addAgentAction({ ...filledForm(), name: "   " }));
    assert.equal(supabase.rows.length, 0);
  });
});
