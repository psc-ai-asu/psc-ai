// Display helpers for sessions and runs. Times use the browser's time zone,
// so elements showing them set suppressHydrationWarning (the server's differs).

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

// "Today at 10:59 PM", "Yesterday at 9:02 AM", "Oct 22 at 12:13 AM"
export function formatWhen(iso) {
  const date = new Date(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const prefix = sameDay(date, new Date()) ? "Today" : sameDay(date, yesterday) ? "Yesterday" : day.format(date);
  return `${prefix} at ${time.format(date)}`;
}

const clock = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

// "Oct 29, 10:59:03 PM"
export function formatClock(iso) {
  return clock.format(new Date(iso));
}

export function formatTime(iso) {
  return time.format(new Date(iso));
}

// "<1 ms", "640 ms", "4.5 s", "1 m 12 s"
export function formatDuration(ms) {
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  return `${Math.floor(seconds / 60)} m ${Math.round(seconds % 60)} s`;
}

// "940", "18.3k"
export function formatTokens(count) {
  return count < 1000 ? String(count) : `${(count / 1000).toFixed(1)}k`;
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
