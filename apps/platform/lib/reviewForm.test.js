import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isReviewComplete } from "./reviewForm.js";

function filledAnswers() {
  return {
    task_description: "Plan my fall semester schedule around a part-time job.",
    completion: 4,
    helpfulness: 5,
    coherence: 4,
    factuality: 3,
    safety: 5,
    note: "Suggested one class that conflicts with my work hours.",
  };
}

describe("isReviewComplete", () => {
  it("returns false when task_description is missing", () => {
    const answers = filledAnswers();
    delete answers.task_description;

    assert.equal(isReviewComplete(answers), false);
  });

  it("returns false when completion is missing", () => {
    const answers = filledAnswers();
    delete answers.completion;

    assert.equal(isReviewComplete(answers), false);
  });

  it("returns false when helpfulness is missing", () => {
    const answers = filledAnswers();
    delete answers.helpfulness;

    assert.equal(isReviewComplete(answers), false);
  });

  it("returns false when coherence is missing", () => {
    const answers = filledAnswers();
    delete answers.coherence;

    assert.equal(isReviewComplete(answers), false);
  });

  it("returns false when factuality is missing", () => {
    const answers = filledAnswers();
    delete answers.factuality;

    assert.equal(isReviewComplete(answers), false);
  });

  it("returns false when safety is missing", () => {
    const answers = filledAnswers();
    delete answers.safety;

    assert.equal(isReviewComplete(answers), false);
  });

  it("returns true when note is missing", () => {
    const answers = filledAnswers();
    delete answers.note;

    assert.equal(isReviewComplete(answers), true);
  });

  it("returns true when all 6 required fields are filled", () => {
    assert.equal(isReviewComplete(filledAnswers()), true);
  });

  it("returns false when task_description contains only spaces", () => {
    assert.equal(isReviewComplete({ ...filledAnswers(), task_description: "   " }), false);
  });
});
