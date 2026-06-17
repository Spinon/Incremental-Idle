import { useQuestStore } from '../store/questStore'
import { useSettingsStore } from '../store/settingsStore'
import {
  DIFFICULTY_LABEL_PT, DIFFICULTY_LABEL_EN, DIFFICULTY_COLOR,
} from '../formulas/quests'
import { cn } from '../lib/utils'
import type { Quest, QuestObjective } from '../types/quest'

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-[width] duration-300', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Objective text ────────────────────────────────────────────────────────────

function objectiveText(obj: QuestObjective, isEn: boolean): string {
  switch (obj.type) {
    case 'escort':
      return isEn
        ? `Reach (${obj.targetX},${obj.targetY})`
        : `Chegar em (${obj.targetX},${obj.targetY})`
    case 'delivery':
      return isEn
        ? `Deliver to (${obj.targetX},${obj.targetY})`
        : `Entregar em (${obj.targetX},${obj.targetY})`
    case 'extermination':
      return isEn
        ? `Kill ${obj.killed}/${obj.required} near (${obj.centerX},${obj.centerY})`
        : `Matar ${obj.killed}/${obj.required} perto de (${obj.centerX},${obj.centerY})`
    case 'bounty':
      return isEn
        ? `Defeat ${obj.targetNameEn} at (${obj.targetX},${obj.targetY})`
        : `Derrotar ${obj.targetName} em (${obj.targetX},${obj.targetY})`
    case 'collection':
      return isEn
        ? `Kill ${obj.collected}/${obj.required}${obj.monsterType ? ` ${obj.monsterType}` : ''}`
        : `Matar ${obj.collected}/${obj.required}${obj.monsterType ? ` ${obj.monsterType}` : ''}`
  }
}

function objectiveProgress(obj: QuestObjective): { value: number; max: number } | null {
  if (obj.type === 'extermination') return { value: obj.killed, max: obj.required }
  if (obj.type === 'collection')    return { value: obj.collected, max: obj.required }
  return null
}

// ── Quest card ────────────────────────────────────────────────────────────────

function QuestCard({ quest, isEn }: { quest: Quest; isEn: boolean }) {
  const diffLabel = isEn ? DIFFICULTY_LABEL_EN[quest.difficulty] : DIFFICULTY_LABEL_PT[quest.difficulty]
  const diffColor = DIFFICULTY_COLOR[quest.difficulty]
  const progress  = objectiveProgress(quest.objective)
  const isDone    = quest.status === 'completed'
  const isFailed  = quest.status === 'failed'

  const typeColor =
    quest.type === 'bounty_monster' || quest.type === 'bounty_npc'
      ? 'border-orange-400/50 dark:border-orange-700/40'
      : 'border-slate-200 dark:border-slate-700/60'

  return (
    <div className={cn(
      'rounded-xl border p-3 flex flex-col gap-2 transition-opacity',
      typeColor,
      isDone   && 'opacity-50 border-green-400/40',
      isFailed && 'opacity-40 border-red-400/30',
    )}>
      {/* Header row */}
      <div className="flex items-start gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-[11px] font-bold leading-tight truncate',
            isDone ? 'text-green-600 dark:text-green-400' : isFailed ? 'text-red-500' : 'text-slate-800 dark:text-slate-100',
          )}>
            {isEn ? quest.titleEn : quest.title}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {isEn ? quest.descriptionEn : quest.description}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={cn('text-[9px] font-bold uppercase tracking-wide', diffColor)}>
            {diffLabel}
          </span>
          <span className="text-[9px] text-slate-400 dark:text-slate-600 whitespace-nowrap">
            Lv {quest.tileLevel}
          </span>
        </div>
      </div>

      {/* Objective */}
      <div className="flex flex-col gap-1">
        <p className={cn(
          'text-[10px]',
          isDone ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-slate-600 dark:text-slate-300',
        )}>
          {isDone
            ? (isEn ? '✓ Completed' : '✓ Concluída')
            : isFailed
              ? (isEn ? '✗ Failed' : '✗ Falhou')
              : objectiveText(quest.objective, isEn)}
        </p>
        {progress && !isDone && !isFailed && (
          <ProgressBar value={progress.value} max={progress.max} />
        )}
      </div>

      {/* Rewards */}
      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 pt-0.5 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          {isEn ? 'Rewards' : 'Recompensas'}
        </span>
        <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
          +{quest.rewards.xp} XP
        </span>
        <span className="text-[10px] font-semibold text-yellow-500 dark:text-yellow-400">
          +{quest.rewards.gold} ⬡
        </span>
        {!!quest.rewards.wordSand && (
          <span className="text-[10px] font-semibold text-sky-500 dark:text-sky-400">
            +{quest.rewards.wordSand} {isEn ? 'WS' : 'AP'}
          </span>
        )}
        {!!quest.rewards.wordBits && (
          <span className="text-[10px] font-semibold text-fuchsia-500 dark:text-fuchsia-400">
            +{quest.rewards.wordBits} {isEn ? '📜 Bits' : '📜 Pedaços'}
          </span>
        )}
        {!!quest.rewards.items?.length && (
          <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400">
            ⚔ {quest.rewards.items.length}
          </span>
        )}
        {!!quest.rewards.consumables?.length && (
          <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
            🧪 {quest.rewards.consumables.length}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function QuestPanel() {
  const quests = useQuestStore(s => s.quests)
  const lang   = useSettingsStore(s => s.lang)
  const isEn   = lang === 'en'

  const active    = quests.filter(q => q.status === 'active')
  const completed = quests.filter(q => q.status === 'completed')
  const failed    = quests.filter(q => q.status === 'failed')

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {isEn ? 'Quests' : 'Missões'}
        </h2>
        {active.length > 0 && (
          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-1.5 py-0.5 rounded-full">
            {active.length} {isEn ? 'active' : 'ativa' + (active.length !== 1 ? 's' : '')}
          </span>
        )}
      </div>

      {/* How to get quests hint */}
      {quests.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center gap-2 text-center">
          <span className="text-2xl">📜</span>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEn
              ? 'No quests yet. Find quest boards on the map to get started.'
              : 'Nenhuma missão ainda. Encontre murais de missão no mapa para começar.'}
          </p>
        </div>
      )}

      {/* Active quests */}
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-600 px-1">
            {isEn ? 'Active' : 'Em andamento'}
          </p>
          {active.map(q => <QuestCard key={q.id} quest={q} isEn={isEn} />)}
        </div>
      )}

      {/* Completed quests */}
      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] uppercase tracking-widest font-semibold text-green-500/70 dark:text-green-600/60 px-1">
            {isEn ? 'Completed' : 'Concluídas'} ({completed.length})
          </p>
          {completed.map(q => <QuestCard key={q.id} quest={q} isEn={isEn} />)}
        </div>
      )}

      {/* Failed quests */}
      {failed.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] uppercase tracking-widest font-semibold text-red-400/60 dark:text-red-600/50 px-1">
            {isEn ? 'Failed' : 'Falhas'} ({failed.length})
          </p>
          {failed.map(q => <QuestCard key={q.id} quest={q} isEn={isEn} />)}
        </div>
      )}
    </div>
  )
}
