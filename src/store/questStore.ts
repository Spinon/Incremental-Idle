import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Quest, QuestObjectiveExtermination, QuestObjectiveBounty } from '../types/quest'
import { DIFFICULTY_LABEL_PT, DIFFICULTY_LABEL_EN } from '../formulas/quests'
import { useHeroStore } from './heroStore'
import { useNotifStore } from './notifStore'
import { useSpellStore } from './spellStore'
import { useInventoryStore } from './inventoryStore'
import { SAVE_KEYS, SAVE_SCHEMA_VERSION, gameStorage, mergeSave, migrateSave } from './save'
import { requestCriticalCloudSave } from '../lib/cloudAutosave'

interface QuestStore {
  quests: Quest[]

  addQuest(quest: Quest): void
  failAllQuests(): void
  completeQuest(id: string): void

  // Progress hooks — called from game loop / move logic
  onPlayerMove(x: number, y: number): void
  onMonsterKill(monsterType: string, x: number, y: number): void
  onBountyDefeated(questId: string): void
  onBountyDefeatedAt(x: number, y: number): void

  // Reset on new run
  clearAll(): void
}

export const useQuestStore = create<QuestStore>()(
  persist(
    immer((set, get) => ({
      quests: [],

      addQuest: (quest) => set((st) => {
        st.quests.push(quest)
      }),

      failAllQuests: () => set((st) => {
        for (const q of st.quests) {
          if (q.status === 'active') q.status = 'failed'
        }
      }),

      completeQuest: (id) => {
        const quest = get().quests.find(q => q.id === id)
        if (!quest || quest.status !== 'active') return
        set((st) => {
          const q = st.quests.find(q => q.id === id)
          if (q) q.status = 'completed'
        })
        requestCriticalCloudSave()
        // Grant rewards after current tick to avoid state mutation ordering issues
        Promise.resolve().then(() => {
          const r = quest.rewards
          useHeroStore.getState().gainXp(r.xp)
          useHeroStore.getState().earnGold(r.gold)
          if (r.wordSand) useSpellStore.getState().addWordSand(r.wordSand)
          if (r.wordBits) useSpellStore.getState().grantRandomWordBits(r.wordBits)
          for (const item of r.items ?? []) useInventoryStore.getState().addItem(item)
          for (const c of r.consumables ?? []) useInventoryStore.getState().addConsumable(c)
          requestCriticalCloudSave()

          const parts: string[] = [`+${r.xp} XP`, `+${r.gold} ⬡`]
          const partsEn: string[] = [`+${r.xp} XP`, `+${r.gold} ⬡`]
          if (r.wordSand) { parts.push(`+${r.wordSand} AP`); partsEn.push(`+${r.wordSand} WS`) }
          if (r.wordBits) { parts.push(`+${r.wordBits} Pedaço${r.wordBits > 1 ? 's' : ''} de Palavra`); partsEn.push(`+${r.wordBits} Word Bit${r.wordBits > 1 ? 's' : ''}`) }
          if (r.items?.length)       { parts.push(`${r.items.length} item${r.items.length > 1 ? 'ns' : ''}`); partsEn.push(`${r.items.length} item${r.items.length > 1 ? 's' : ''}`) }
          if (r.consumables?.length) { parts.push(`${r.consumables.length} consumível${r.consumables.length > 1 ? 'is' : ''}`); partsEn.push(`${r.consumables.length} consumable${r.consumables.length > 1 ? 's' : ''}`) }

          useNotifStore.getState().push({
            title:   `✅ Missão Concluída!`,
            titleEn: `✅ Quest Complete!`,
            body:    `${quest.title} — ${parts.join(' · ')}  (${DIFFICULTY_LABEL_PT[quest.difficulty]})`,
            bodyEn:  `${quest.titleEn} — ${partsEn.join(' · ')}  (${DIFFICULTY_LABEL_EN[quest.difficulty]})`,
            scrollTo: 'equips',
            actions: [],
          })
        })
      },

      onPlayerMove: (x, y) => {
        const toComplete: string[] = []
        set((st) => {
          for (const q of st.quests) {
            if (q.status !== 'active') continue
            const obj = q.objective
            if ((obj.type === 'escort' || obj.type === 'delivery') &&
                obj.targetX === x && obj.targetY === y && !obj.reached) {
              obj.reached = true
              toComplete.push(q.id)
            }
          }
        })
        toComplete.forEach(id => get().completeQuest(id))
      },

      onMonsterKill: (monsterType, x, y) => {
        const toComplete: string[] = []
        set((st) => {
          for (const q of st.quests) {
            if (q.status !== 'active') continue
            const obj = q.objective

            if (obj.type === 'extermination') {
              const o = obj as QuestObjectiveExtermination
              const dist = Math.max(Math.abs(x - o.centerX), Math.abs(y - o.centerY))
              if (dist <= o.radius) {
                o.killed = Math.min(o.required, o.killed + 1)
                if (o.killed >= o.required) toComplete.push(q.id)
              }
            }

            if (obj.type === 'collection') {
              if (obj.monsterType === null || obj.monsterType === monsterType) {
                obj.collected = Math.min(obj.required, obj.collected + 1)
                if (obj.collected >= obj.required) toComplete.push(q.id)
              }
            }
          }
        })
        toComplete.forEach(id => get().completeQuest(id))
      },

      onBountyDefeated: (questId) => {
        set((st) => {
          const q = st.quests.find(q => q.id === questId)
          if (q?.status === 'active' && q.objective.type === 'bounty') {
            (q.objective as QuestObjectiveBounty).defeated = true
          }
        })
        get().completeQuest(questId)
      },

      onBountyDefeatedAt: (x, y) => {
        const quest = get().quests.find(q => (
          q.status === 'active' &&
          q.objective.type === 'bounty' &&
          q.objective.targetX === x &&
          q.objective.targetY === y
        ))
        if (quest) get().onBountyDefeated(quest.id)
      },

      clearAll: () => set((st) => {
        st.quests = []
      }),
    })),
    {
      name: SAVE_KEYS.quests,
      version: SAVE_SCHEMA_VERSION,
      migrate: migrateSave,
      merge: mergeSave,
      storage: gameStorage,
    }
  )
)
