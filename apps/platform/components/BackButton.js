'use client';

import { useRouter } from 'next/navigation';
import { NAVIGATION_HISTORY_KEY } from './NavigationHistory';

export default function BackButton() {
  const router = useRouter();

  const goBack = () => {
    const current = `${window.location.pathname}${window.location.search}`;

    try {
      const history = JSON.parse(sessionStorage.getItem(NAVIGATION_HISTORY_KEY) || '[]');

      while (history.at(-1) === current) history.pop();
      const previous = history.pop() || '/';
      sessionStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify(history));
      router.push(previous);
    } catch {
      router.push('/');
    }
  };

  return (
    <button type="button" className="app-back-button" onClick={goBack} aria-label="Go back">
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </button>
  );
}
