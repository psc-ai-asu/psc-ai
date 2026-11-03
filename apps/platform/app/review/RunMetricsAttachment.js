import Link from 'next/link';

// UI placeholder until ingestion, owner-scoped run listing, and atomic review/run
// persistence exist. Never offer a selection that submission would silently drop.
export default function RunMetricsAttachment() {
  return (
    <section className="p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/20" aria-labelledby="run-metrics-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="run-metrics-title" className="text-sm text-zinc-200 font-medium">Attach run metrics</h2>
        <span className="text-xs text-zinc-500">Optional</span>
      </div>
      <p id="saved-run-help" className="text-xs text-zinc-400 leading-relaxed mt-2">
        Choose a saved run captured with your personal trace token to attach its metrics to this review.
      </p>
      <label htmlFor="review-run" className="block text-xs text-zinc-300 mt-4 mb-2">Saved run for this agent</label>
      <select id="review-run" disabled aria-describedby="saved-run-help saved-run-status" className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500 disabled:cursor-not-allowed">
        <option value="">No saved runs available yet</option>
      </select>
      <p id="saved-run-status" className="text-xs text-zinc-500 leading-relaxed mt-3">
        Run capture and metrics are coming soon. You can submit your review without an attachment.
      </p>
      <Link href="/review/trace-tokens" target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-violet-400 hover:text-violet-300">
        Manage personal traces &amp; tokens (opens in a new tab) →
      </Link>
    </section>
  );
}
