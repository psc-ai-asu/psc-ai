'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const NAVIGATION_HISTORY_KEY = 'reviewmyagent-navigation-history';

export default function NavigationHistory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if (pathname === '/login') return;

    const route = `${pathname}${search ? `?${search}` : ''}`;

    try {
      const history = JSON.parse(sessionStorage.getItem(NAVIGATION_HISTORY_KEY) || '[]');
      if (history.at(-1) !== route) {
        sessionStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify([...history, route].slice(-30)));
      }
    } catch {
      sessionStorage.setItem(NAVIGATION_HISTORY_KEY, JSON.stringify([route]));
    }
  }, [pathname, search]);

  return null;
}
