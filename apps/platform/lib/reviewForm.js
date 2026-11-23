// The required fields on the review form. The note is optional.
export const REVIEW_FIELDS = [
  "task_description",
  "completion",
  "helpfulness",
  "coherence",
  "factuality",
  "safety",
];

export function countAnswered(answers) {
  return REVIEW_FIELDS.filter((field) => answers[field] !== "" && answers[field] !== undefined).length;
}

export function isReviewComplete(answers) {
  return countAnswered(answers) === REVIEW_FIELDS.length;
}
