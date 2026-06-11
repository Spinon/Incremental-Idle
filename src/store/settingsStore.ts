import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../i18n/translations'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, gameStorage, mergeSave, migrateSave } from './save'

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
    {
      name: SAVE_KEYS.settings,
      version: SAVE_SCHEMA_VERSION,
      storage: gameStorage,
      migrate: migrateSave,
      merge: mergeSave,
    }
  )
)
