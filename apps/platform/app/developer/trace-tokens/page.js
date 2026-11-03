import { redirect } from 'next/navigation';

// Preserve bookmarks from the former agent-scoped entry point.
export default function LegacyTraceTokensPage() {
  redirect('/review/trace-tokens');
}
