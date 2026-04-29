import { useEffect } from 'react';

/**
 * Detects system color scheme preference and applies/removes the
 * `.dark` class on <html> accordingly. Updates live when the user
 * switches their OS theme.
 */
export function useSystemDarkMode() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (isDark) => {
      document.documentElement.classList.toggle('dark', isDark);
    };
    apply(mql.matches);
    const listener = (e) => apply(e.matches);
    mql.addEventListener?.('change', listener);
    return () => mql.removeEventListener?.('change', listener);
  }, []);
}