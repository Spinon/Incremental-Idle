import { useEffect, useRef, useState } from 'react'
import { useNotifStore, type GameNotif } from '../store/notifStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSettingsStore } from '../store/settingsStore'
import { cn } from '../lib/utils'
import { navigateToShortcut } from '../lib/shortcuts'
import type { ItemRarity } from '../types/item'

const DURATION_MS = 5000

// Rarity border colors match the rest of the UI
const RARITY_BORDER: Record<ItemRarity, string> = {
  common:   'border-slate-400   dark:border-slate-500',
  uncommon: 'border-green-500   dark:border-green-600',
  rare:     'border-blue-500    dark:border-blue-600',
  epic:     'border-purple-500  dark:border-purple-600',
  set:      'border-yellow-400  dark:border-yellow-500',
  unique:   'border-orange-500  dark:border-orange-400',
}

const RARITY_TIMER: Record<ItemRarity, string> = {
  common:   'bg-slate-400',
  uncommon: 'bg-green-500',
  rare:     'bg-blue-500',
  epic:     'bg-purple-500',
  set:      'bg-yellow-400',
  unique:   'bg-orange-500',
}

const RARITY_GLOW: Record<ItemRarity, string> = {
  common:   '',
  uncommon: 'shadow-green-500/20',
  rare:     'shadow-blue-500/25',
  epic:     'shadow-purple-500/30',
  set:      'shadow-yellow-400/30',
  unique:   'shadow-orange-500/35',
}

interface ToastCardProps {
  notif: GameNotif
}

function ToastCard({ notif }: ToastCardProps) {
  const dismiss    = useNotifStore(s => s.dismiss)
  const equipItem  = useInventoryStore(s => s.equipItem)
  const lang       = useSettingsStore(s => s.lang)
  const isEn       = lang === 'en'

  const [leaving, setLeaving] = useState(false)
  const hovered    = useRef(false)
  const elapsed    = useRef(0)
  const lastTick   = useRef<number | null>(null)
  const timerKey   = useRef(0)
  const [timerDur, setTimerDur] = useState(DURATION_MS)

  function close() {
    setLeaving(true)
    setTimeout(() => dismiss(notif.id), 200)
  }

  // Count-down timer — pauses when hovered
  useEffect(() => {
    function tick(now: number) {
      if (lastTick.current === null) { lastTick.current = now }
      if (!hovered.current) {
        elapsed.current += now - lastTick.current
      }
      lastTick.current = now

      if (elapsed.current >= DURATION_MS) {
        close()
        return
      }
      raf.current = requestAnimationFrame(tick)
    }

    const raf = { current: requestAnimationFrame(tick) }
    return () => cancelAnimationFrame(raf.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notif.id])

  function handleMouseEnter() {
    hovered.current = true
    // Freeze the CSS timer at the current position
    const remaining = Math.max(0, DURATION_MS - elapsed.current)
    timerKey.current += 1
    setTimerDur(remaining)
  }

  function handleMouseLeave() {
    hovered.current  = false
    lastTick.current = null   // reset so next tick doesn't count the pause gap
    // Restart the CSS timer from remaining duration
    timerKey.current += 1
    setTimerDur(Math.max(0, DURATION_MS - elapsed.current))
  }

  function scrollTo(id: string) {
    if (navigateToShortcut(id)) return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleCardClick() {
    if (notif.scrollTo) scrollTo(notif.scrollTo)
  }

  function handleAction(e: React.MouseEvent, kind: string, payload?: string) {
    e.stopPropagation()
    if (kind === 'equip' && payload) {
      equipItem(payload)
      scrollTo('inventory-panel')
    } else if (kind === 'scroll' && payload) {
      scrollTo(payload)
    }
    close()
  }

  const borderClass = notif.rarity ? RARITY_BORDER[notif.rarity] : 'border-slate-300 dark:border-slate-600'
  const timerClass  = notif.rarity ? RARITY_TIMER[notif.rarity]  : 'bg-indigo-500'
  const glowClass   = notif.rarity ? RARITY_GLOW[notif.rarity]   : ''

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative w-72 rounded-2xl border-2 shadow-xl cursor-pointer select-none overflow-hidden',
        'bg-white dark:bg-slate-900',
        borderClass,
        glowClass && `shadow-lg ${glowClass}`,
        leaving ? 'anim-toast-out' : 'anim-toast-in',
      )}
    >
      {/* Timer bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {!hovered.current && (
          <div
            key={timerKey.current}
            className={cn('h-full anim-toast-timer', timerClass)}
            style={{ animationDuration: `${timerDur}ms` }}
          />
        )}
        {hovered.current && (
          <div
            key={`paused-${timerKey.current}`}
            className={cn('h-full', timerClass)}
            style={{ width: `${Math.max(0, 100 - (elapsed.current / DURATION_MS) * 100)}%` }}
          />
        )}
      </div>

      {/* Content */}
      <div className="px-3.5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">
              {isEn ? notif.titleEn : notif.title}
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
              {isEn ? notif.bodyEn : notif.body}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); close() }}
            className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors text-lg leading-none"
            title={isEn ? 'Dismiss' : 'Ignorar'}
          >
            ×
          </button>
        </div>

        {/* Action buttons */}
        {notif.actions.length > 0 && (
          <div className="mt-2.5 flex gap-1.5 flex-wrap">
            {notif.actions.map((action, i) => (
              <button
                key={i}
                onClick={(e) => handleAction(e, action.kind, action.payload)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
                  i === 0
                    ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
                )}
              >
                {isEn ? action.labelEn : action.label}
              </button>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); close() }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 transition-all"
            >
              {isEn ? 'Ignore' : 'Ignorar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NotifToast() {
  const queue   = useNotifStore(s => s.queue)
  const enabled = useNotifStore(s => s.enabled)
  const paused  = useNotifStore(s => s.paused)

  if (!enabled || paused || queue.length === 0) return null

  // Show the oldest notification (index 0) first
  const current = queue[0]

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col-reverse gap-2 pointer-events-none">
      <div className="pointer-events-auto">
        <ToastCard key={current.id} notif={current} />
      </div>
      {/* Queue indicator */}
      {queue.length > 1 && (
        <div className="self-end pointer-events-none">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow">
            +{queue.length - 1}
          </span>
        </div>
      )}
    </div>
  )
}
