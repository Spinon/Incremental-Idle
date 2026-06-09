import { create } from 'zustand'

export type AppTab = 'battle' | 'map' | 'equips' | 'spells' | 'consumables' | 'quests'
export type SceneAutoKind = 'home' | 'market' | 'tower'

export interface AppTabDef {
  id: AppTab
  label: string
  labelEn: string
  icon: string
}

/** Shared nav tabs — used by StickyBar (desktop top) and BottomNav (mobile). */
export const APP_TABS: AppTabDef[] = [
  { id: 'battle',      label: 'Batalha',     labelEn: 'Battle',      icon: '⚔' },
  { id: 'map',         label: 'Mapa',        labelEn: 'Map',         icon: '🗺' },
  { id: 'equips',      label: 'Equips',      labelEn: 'Equips',      icon: '🛡' },
  { id: 'spells',      label: 'Magias',      labelEn: 'Spells',      icon: '✨' },
  { id: 'consumables', label: 'Consumíveis', labelEn: 'Consumables', icon: '🧪' },
  { id: 'quests',      label: 'Missões',     labelEn: 'Quests',      icon: '📜' },
]

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
  blueTowerTeleportSelecting: boolean
  blueTowerTeleportOrigin: { x: number; y: number } | null
  setBlueTowerTeleportSelecting(v: boolean): void
  setBlueTowerTeleportOrigin(pos: { x: number; y: number } | null): void
  pendingTileNormalizeConsumableId: string | null
  setPendingTileNormalizeConsumableId(id: string | null): void
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
  blueTowerTeleportSelecting: false,
  blueTowerTeleportOrigin: null,
  setBlueTowerTeleportSelecting: (v) => set({ blueTowerTeleportSelecting: v }),
  setBlueTowerTeleportOrigin: (pos) => set({ blueTowerTeleportOrigin: pos }),
  pendingTileNormalizeConsumableId: null,
  setPendingTileNormalizeConsumableId: (id) => set({ pendingTileNormalizeConsumableId: id }),
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
