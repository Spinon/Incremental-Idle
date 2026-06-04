import { create } from 'zustand'

export type AppTab = 'battle' | 'map' | 'equips' | 'spells' | 'consumables' | 'quests'
export type SceneAutoKind = 'home' | 'market' | 'tower'

interface SceneAutoState {
  kind: SceneAutoKind | null
  active: boolean
  elapsedMs: number
  durationMs: number
  paused: boolean
}

interface UIStore {
  showMiniPlayer: boolean
  toggleMiniPlayer(): void
  setShowMiniPlayer(v: boolean): void
  activeTab: AppTab
  setActiveTab(tab: AppTab): void
  sceneAuto: SceneAutoState
  configureSceneAuto(kind: SceneAutoKind, durationMs: number, active: boolean): void
  setSceneAutoElapsed(elapsedMs: number): void
  pauseSceneAuto(): void
  clearSceneAuto(kind?: SceneAutoKind): void
}

export const useUIStore = create<UIStore>()((set) => ({
  showMiniPlayer: false,
  toggleMiniPlayer:       () => set(s => ({ showMiniPlayer: !s.showMiniPlayer })),
  setShowMiniPlayer: (v) => set({ showMiniPlayer: v }),
  activeTab:   'battle',
  setActiveTab: (tab) => set({ activeTab: tab }),
  sceneAuto: {
    kind: null,
    active: false,
    elapsedMs: 0,
    durationMs: 0,
    paused: false,
  },
  configureSceneAuto: (kind, durationMs, active) => set((s) => {
    const nextKind = active ? kind : null
    if (
      s.sceneAuto.kind === nextKind &&
      s.sceneAuto.active === active &&
      s.sceneAuto.durationMs === durationMs
    ) {
      return {}
    }
    return {
      sceneAuto: {
        kind: nextKind,
        active,
        elapsedMs: 0,
        durationMs,
        paused: false,
      },
    }
  }),
  setSceneAutoElapsed: (elapsedMs) => set((s) => ({
    sceneAuto: {
      ...s.sceneAuto,
      elapsedMs,
    },
  })),
  pauseSceneAuto: () => set((s) => (
    s.sceneAuto.active
      ? { sceneAuto: { ...s.sceneAuto, paused: true } }
      : {}
  )),
  clearSceneAuto: (kind) => set((s) => {
    if (kind && s.sceneAuto.kind !== kind) return {}
    return {
      sceneAuto: {
        kind: null,
        active: false,
        elapsedMs: 0,
        durationMs: 0,
        paused: false,
      },
    }
  }),
}))
