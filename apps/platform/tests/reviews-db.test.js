// Integration tests against the local Supabase stack (`supabase start`), signed
// in as a seeded reviewer so RLS applies as it does in the browser.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const RESEARCH_ASSISTANT = "a0000000-0000-0000-0000-000000000001"; // seeded, active

describe("reviews: direct insert", () => {
  let reviewer;
  let reviewerId;
  const created = [];

  before(async () => {
    assert.match(url ?? "", /^http:\/\/(127\.0\.0\.1|localhost)[:/]/, "Refusing to run against a non-local database");

    reviewer = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await reviewer.auth.signInWithPassword({
      email: "reviewer1@example.com",
      password: "password123",
    });
    assert.ifError(error);
    reviewerId = data.user.id;
  });

  // Reviewers can delete their own reviews (the "owner delete" policy).
  after(async () => {
    if (created.length) await reviewer.from("reviews").delete().in("id", created);
    await reviewer?.auth.signOut();
  });

  // The row AgentReviewForm sends for an unverified review.
  function validReview() {
    return {
      agent_id: RESEARCH_ASSISTANT,
      task: "Summarize a paper on agent evaluation.",
      goal_completion: 4,
      helpfulness: 5,
      coherence: 4,
      factuality: 3,
      safety: 5,
      review_note: null,
      review_by: reviewerId,
    };
  }

  // Inserts a review and records it for cleanup if it was saved.
  async function insertReview(row) {
    const { data, error } = await reviewer.from("reviews").insert(row).select().single();
    if (data) created.push(data.id);
    return { data, error };
  }

  it("saves a valid review with the values the form sends", async () => {
    const { data: review, error } = await insertReview(validReview());

    assert.ifError(error);

    assert.equal(review.agent_id, RESEARCH_ASSISTANT);
    assert.equal(review.review_by, reviewerId);
    assert.equal(review.task, "Summarize a paper on agent evaluation.");
    assert.equal(review.review_note, null);
    assert.equal(review.verification_status, "unverified");
    assert.equal(review.session_id, null);
    assert.equal(Number(review.overall_score), 4.2); // (4 + 5 + 4 + 3 + 5) / 5
  });

  // 23502 is Postgres's not_null_violation. Supabase leaves undefined fields
  // out of the request, so the task arrives empty.
  it("rejects a review with a missing required field", async () => {
    const { data, error } = await insertReview({ ...validReview(), task: undefined });

    assert.equal(data, null);
    assert.equal(error?.code, "23502");
  });
});
