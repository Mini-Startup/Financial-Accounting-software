'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function RouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    // Reset scroll on the main scrollable container
    const mainEl = document.getElementById('main-content-scroll') || document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      mainEl.scrollTop = 0;
    }
    // Also reset window scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
