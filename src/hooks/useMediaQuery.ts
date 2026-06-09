import { useEffect, useState } from 'react'

/**
 * Reactive media-query hook. Returns true while `query` matches.
 * SSR-safe (defaults to false when window is unavailable).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Tailwind `lg` breakpoint is 1024px — below it we treat the UI as "mobile/compact". */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)')
}
