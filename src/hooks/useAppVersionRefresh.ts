import { useEffect } from 'react'

const VERSION_CHECK_INTERVAL_MS = 60_000
const RELOAD_ATTEMPT_KEY = 'ii-version-reload-attempt'

type VersionManifest = {
  version?: string
}

function versionManifestUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${base.endsWith('/') ? '' : '/'}version.json`
}

function reloadWithVersion(version: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('v', version)
  sessionStorage.setItem(RELOAD_ATTEMPT_KEY, version)
  window.location.replace(url.toString())
}

export function useAppVersionRefresh() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false

    async function checkVersion() {
      try {
        const response = await fetch(`${versionManifestUrl()}?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!response.ok) return

        const manifest = await response.json() as VersionManifest
        const latestVersion = manifest.version
        if (!latestVersion || latestVersion === __APP_VERSION__ || cancelled) return

        const attemptedVersion = sessionStorage.getItem(RELOAD_ATTEMPT_KEY)
        if (attemptedVersion === latestVersion) return

        reloadWithVersion(latestVersion)
      } catch {
        // Version checks should never interrupt gameplay when offline or during
        // a transient GitHub Pages/cache miss.
      }
    }

    void checkVersion()
    const interval = window.setInterval(() => void checkVersion(), VERSION_CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])
}
