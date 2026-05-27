import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../i18n/translations'

type Theme = 'dark' | 'light'

interface SettingsStore {
  theme: Theme
  lang: Lang
  setTheme(t: Theme): void
  setLang(l: Lang): void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      lang: 'pt',
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'incremental-idle-settings' }
  )
)
