import { create } from 'zustand'

interface UIStore {
  showMiniPlayer: boolean
  toggleMiniPlayer(): void
  setShowMiniPlayer(v: boolean): void
}

export const useUIStore = create<UIStore>()((set) => ({
  showMiniPlayer: false,
  toggleMiniPlayer:       () => set(s => ({ showMiniPlayer: !s.showMiniPlayer })),
  setShowMiniPlayer: (v) => set({ showMiniPlayer: v }),
}))
