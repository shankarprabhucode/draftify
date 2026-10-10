import { useSyncExternalStore } from 'react'

/** True when the media query matches; re-renders on change. SSR/test safe. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  )
}

/** Tailwind's `md` breakpoint: the sidebar is inline from here up, a drawer below. */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
