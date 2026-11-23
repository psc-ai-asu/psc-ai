// Shared rules for how an agent's reviews and status are read.

// An agent is flagged as a candidate for firing below this average, once it has
// enough reviews that one bad experience can't trigger it. It's only a prompt:
// reviews can be unverified, so the developer always makes the decision.
export const POOR_SCORE_THRESHOLD = 3;
export const MIN_REVIEWS_FOR_FLAG = 3;

export const STATUS_NOTE_MIN_LENGTH = 10;
export const STATUS_NOTE_MAX_LENGTH = 1000;

export function isPerformingPoorly(agent) {
  return (
    agent.status === 'active'
    && agent.reviewCount >= MIN_REVIEWS_FOR_FLAG
    && agent.avgScore < POOR_SCORE_THRESHOLD
  );
}

export function averageScore(reviews = []) {
  if (reviews.length === 0) return null;
  return reviews.reduce((sum, review) => sum + Number(review.overall_score), 0) / reviews.length;
}

export function sortStatusEvents(events = []) {
  return [...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// The reason for firing, or null when the agent was fired before reasons were recorded.
export function firingEvent(agent) {
  const latest = sortStatusEvents(agent.status_events ?? agent.statusEvents)[0];
  return latest?.status === 'fired' ? latest : null;
}
