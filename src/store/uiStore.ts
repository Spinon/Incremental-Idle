import { create } from 'zustand'

export type AppTab = 'battle' | 'map' | 'equips' | 'spells' | 'consumables' | 'quests'

interface UIStore {
  showMiniPlayer: boolean
  toggleMiniPlayer(): void
  setShowMiniPlayer(v: boolean): void
  activeTab: AppTab
  setActiveTab(tab: AppTab): void
}

export const useUIStore = create<UIStore>()((set) => ({
  showMiniPlayer: false,
  toggleMiniPlayer:       () => set(s => ({ showMiniPlayer: !s.showMiniPlayer })),
  setShowMiniPlayer: (v) => set({ showMiniPlayer: v }),
  activeTab:   'battle',
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
