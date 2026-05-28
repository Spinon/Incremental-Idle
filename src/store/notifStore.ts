import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ItemRarity } from '../types/item'

export type NotifActionKind = 'equip' | 'scroll' | 'dismiss'

export interface NotifAction {
  label:   string          // PT
  labelEn: string          // EN
  kind:    NotifActionKind
  /** For 'equip': item id. For 'scroll': element id. */
  payload?: string
}

export interface GameNotif {
  id:       string
  title:    string         // PT
  titleEn:  string         // EN
  body:     string         // PT
  bodyEn:   string         // EN
  rarity?:  ItemRarity
  /** Element id to scroll into view when the card is clicked. */
  scrollTo?: string
  actions:  NotifAction[]
  createdAt: number
}

interface NotifStore {
  queue:   GameNotif[]
  enabled: boolean

  push(n: Omit<GameNotif, 'id' | 'createdAt'>): void
  dismiss(id: string): void
  setEnabled(v: boolean): void
}

let _seq = 0
function uid() { return `notif-${Date.now()}-${_seq++}` }

export const useNotifStore = create<NotifStore>()(
  persist(
    (set) => ({
      queue:   [],
      enabled: true,

      push: (n) => set((st) => {
        if (!st.enabled) return st
        // Limit queue to 5 notifications
        const newNotif: GameNotif = { ...n, id: uid(), createdAt: Date.now() }
        const trimmed = st.queue.length >= 5 ? st.queue.slice(1) : st.queue
        return { queue: [...trimmed, newNotif] }
      }),

      dismiss: (id) => set((st) => ({
        queue: st.queue.filter(n => n.id !== id),
      })),

      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: 'incremental-idle-notifs',
      partialize: (st) => ({ enabled: st.enabled }),
    }
  )
)
