import { useState } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSpellStore } from '../store/spellStore'
import { useQuestStore } from '../store/questStore'
import { useUIStore, APP_TABS } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { getDerivedStats, staminaDrainAt, getBaseSpeed } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
import { applySpellBuffs } from '../formulas/spells'
import { usePartyEffectiveAttributes } from '../lib/partyBonuses'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

const TABS = APP_TABS

export default function StickyBar() {
  // Selective subscriptions — the whole-store hook re-rendered this sticky
  // header on every battle log entry / HP change
  const speed       = useBattleStore(s => s.speed)
  const skipAnim    = useBattleStore(s => s.skipAnim)
  const phase       = useBattleStore(s => s.phase)
  const setSpeed    = useBattleStore(s => s.setSpeed)
  const setSkipAnim = useBattleStore(s => s.setSkipAnim)
  const skipBattle  = useBattleStore(s => s.skipBattle)
  const activeTab    = useUIStore(s => s.activeTab)
  const setActiveTab = useUIStore(s => s.setActiveTab)

  const stamina           = useHeroStore(s => s.stamina)
  const attrs             = useHeroStore(s => s.attributes)
  const skipCharges       = useHeroStore(s => s.skipCharges)
  const maxSkipCharges    = useHeroStore(s => s.maxSkipCharges)
  const consumeSkipCharge = useHeroStore(s => s.consumeSkipCharge)
  const level             = useHeroStore(s => s.level)
  const xp                = useHeroStore(s => s.xp)
  const xpToNext          = useHeroStore(s => s.xpToNext)
  const freePoints        = useHeroStore(s => s.freePoints)
  const lastXpGain        = useHeroStore(s => s.lastXpGain)
  const xpGainVersion     = useHeroStore(s => s.xpGainVersion)
  const gold              = useHeroStore(s => s.gold)
  const lastGoldGain      = useHeroStore(s => s.lastGoldGain)
  const goldGainVersion   = useHeroStore(s => s.goldGainVersion)
  const equipment         = useInventoryStore(s => s.equipment)
  const activeBuffs       = useSpellStore(s => s.activeBuffs)

  const activeQuestCount = useQuestStore(s => s.quests.filter(q => q.status === 'active').length)
  const partyAttributes = usePartyEffectiveAttributes(attrs, level)

  const derived    = applySpellBuffs(
    getDerivedStats(partyAttributes, getEquipmentBonuses(equipment), level),
    activeBuffs,
  )
  const t          = useT()
  const lang       = useSettingsStore(s => s.lang)
  const isEn       = lang === 'en'
  const baseSpeed  = getBaseSpeed(derived)
  const [speedWindowStart, setSpeedWindowStart] = useState<number | null>(null)
  const [resumeSpeed, setResumeSpeed] = useState(baseSpeed)
  const recommendedSpeed = baseSpeed
  const speedAnchor = speedWindowStart ?? Math.max(1, Math.floor(speed > 0 ? speed : resumeSpeed || baseSpeed))
  const visibleSpeedStart = Math.max(1, speedAnchor)
  const SPEEDS = Array.from({ length: 4 }, (_, i) => visibleSpeedStart + i)
  const isPaused = speed <= 0

  const isOver       = phase === 'over' || phase === 'empty'
  const hasCharge    = skipCharges >= 1
  const skipDisabled = isOver || !hasCharge
  const wholeCharges = Math.floor(skipCharges)
  const chargeFill   = skipCharges < maxSkipCharges ? (skipCharges % 1) * 100 : 100
  const staminaPct   = Math.max(0, (stamina / derived.maxStamina) * 100)
  const xpPct        = (xp / xpToNext) * 100
  const staminaFill  = staminaPct > 50 ? 'bg-amber-400' : staminaPct > 25 ? 'bg-orange-400' : 'bg-red-500'

  const rawDrain  = isPaused ? 0 : staminaDrainAt(speed) / derived.staminaEfficiency
  const netChange = isPaused ? 0 : derived.staminaRegen - rawDrain
  const netDrain  = -netChange
  const timeLeft  = netDrain > 0 ? stamina / netDrain : null

  function timeAt(s: number) {
    const rd  = staminaDrainAt(s) / derived.staminaEfficiency
    const nd  = rd - derived.staminaRegen
    return nd > 0 ? stamina / nd : null
  }
  function isLow(s: number) { const tt = timeAt(s); return tt !== null && tt < 8 }

  function handleSkip()           { consumeSkipCharge(); setSkipAnim(true); skipBattle() }
  function handleSpeed(s: number) {
    setResumeSpeed(s)
    setSkipAnim(false)
    setSpeed(s)
  }
  function handlePauseToggle() {
    setSkipAnim(false)
    if (isPaused) {
      setSpeed(Math.max(1, resumeSpeed || baseSpeed))
    } else {
      setResumeSpeed(Math.max(1, speed))
      setSpeed(0)
    }
  }
  function shiftSpeedWindow(delta: number) {
    setSpeedWindowStart(prev => Math.max(1, (prev ?? visibleSpeedStart) + delta))
  }

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm px-3 sm:px-6 py-1.5 flex flex-col gap-1">

      {/* ── Row 1: Nav tabs (top on desktop; mobile uses BottomNav) ───────── */}
      <div className="hidden lg:flex items-center gap-0.5">
        {TABS.map(tab => {
          const active = activeTab === tab.id
          const badge  = tab.id === 'quests' && activeQuestCount > 0 ? activeQuestCount : null
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold transition-colors',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200',
              )}
            >
              {isEn ? tab.labelEn : tab.label}
              {badge !== null && (
                <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Row 2: Controls + Stamina + Gold + XP (wraps on mobile) ──────── */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">

        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={skipDisabled}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-all overflow-hidden',
            skipDisabled
              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              : skipAnim
                ? 'bg-rose-600 border-rose-500 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-900 hover:border-rose-300 dark:hover:border-rose-700',
          )}
        >
          {t.skip}
          <span className="flex gap-0.5">
            {Array.from({ length: Math.min(maxSkipCharges, 5) }).map((_, i) => (
              <span key={i} className={cn(
                'w-1 h-1 rounded-full transition-colors',
                i < wholeCharges
                  ? skipAnim ? 'bg-white/80' : 'bg-rose-500 dark:bg-rose-400'
                  : 'bg-slate-300 dark:bg-slate-600',
              )} />
            ))}
          </span>
          {skipCharges < maxSkipCharges && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10">
              <div
                className={cn('h-full', skipAnim ? 'bg-white/50' : 'bg-rose-400 dark:bg-rose-500')}
                style={{ width: `${chargeFill}%` }}
              />
            </div>
          )}
        </button>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <span className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.speed}</span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftSpeedWindow(-1)}
            disabled={visibleSpeedStart <= 1}
            title={isEn ? 'Show lower speeds' : 'Mostrar velocidades menores'}
            className={cn(
              'h-8 w-7 rounded-md border text-xs font-black transition-colors',
              visibleSpeedStart <= 1
                ? 'cursor-not-allowed border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                : 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >
            &lt;
          </button>

          <button
            type="button"
            onClick={handlePauseToggle}
            title={isPaused ? (isEn ? 'Resume' : 'Continuar') : (isEn ? 'Pause' : 'Pausar')}
            className={cn(
              'h-8 min-w-8 rounded-md border px-2 text-xs font-black transition-colors',
              isPaused
                ? 'border-emerald-400 bg-emerald-500 text-white shadow'
                : 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >
            {isPaused ? '▶' : 'Ⅱ'}
          </button>

          {SPEEDS.map(s => {
            const active = speed === s && !skipAnim && !isPaused
            const low    = isLow(s) && s > baseSpeed
            const time   = timeAt(s)
            const recommended = s === recommendedSpeed
            return (
              <button
                key={s}
                onClick={() => handleSpeed(s)}
                title={recommended
                  ? (isEn ? 'Recommended: highest sustainable speed' : 'Recomendada: maior velocidade sustentavel')
                  : undefined}
                className={cn(
                  'relative flex h-8 min-w-10 flex-col items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-all',
                  active
                    ? low
                      ? 'bg-orange-500 border-orange-400 text-white shadow'
                      : 'bg-indigo-600 border-indigo-400 text-white shadow'
                    : s === resumeSpeed && isPaused
                      ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                      : low
                        ? 'bg-slate-100 dark:bg-slate-800 border-orange-300 dark:border-orange-800/60 text-orange-500 dark:text-orange-400/70 hover:bg-orange-50 dark:hover:bg-slate-700'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                {recommended && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute right-1 top-1 h-1.5 w-1.5 rounded-full ring-1',
                      active
                        ? 'bg-emerald-200 ring-white/70'
                        : 'bg-emerald-500 ring-emerald-200 dark:ring-emerald-900',
                    )}
                  />
                )}
                {s}x
                {s > baseSpeed && time !== null && (
                  <span className={cn(
                    'text-[8px] leading-none tabular-nums',
                    active ? 'text-white/70' : 'text-slate-400 dark:text-slate-600',
                  )}>
                    {time < 99 ? `${time.toFixed(0)}s` : '--'}
                  </span>
                )}
                {active && s > baseSpeed && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10 rounded-b overflow-hidden">
                    <div
                      className={cn('h-full', low ? 'bg-orange-300' : 'bg-white/60')}
                      style={{ width: `${staminaPct}%` }}
                    />
                  </div>
                )}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => shiftSpeedWindow(1)}
            title={isEn ? 'Show higher speeds' : 'Mostrar velocidades maiores'}
            className="h-8 w-7 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-500 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            &gt;
          </button>
        </div>

        {/* Speed buttons */}
        {false && SPEEDS.map(s => {
          const effectiveSpeed = Math.max(speed, baseSpeed)
          const active = effectiveSpeed === s && !skipAnim
          const low    = isLow(s) && s > baseSpeed
          const time   = timeAt(s)
          return (
            <button key={s} onClick={() => handleSpeed(s)}
              className={cn(
                'relative flex flex-col items-center px-2.5 py-1 rounded text-xs font-semibold border transition-all',
                active
                  ? low
                    ? 'bg-orange-500 border-orange-400 text-white shadow'
                    : 'bg-indigo-600 border-indigo-400 text-white shadow'
                  : low
                    ? 'bg-slate-100 dark:bg-slate-800 border-orange-300 dark:border-orange-800/60 text-orange-500 dark:text-orange-400/70 hover:bg-orange-50 dark:hover:bg-slate-700'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              )}
            >
              {s}×
              {s > baseSpeed && time !== null && (
                <span className={cn(
                  'text-[8px] leading-none tabular-nums',
                  active ? 'text-white/70' : 'text-slate-400 dark:text-slate-600',
                )}>
                  {time < 99 ? `${time.toFixed(0)}s` : '—'}
                </span>
              )}
              {active && s > baseSpeed && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10 rounded-b overflow-hidden">
                  <div
                    className={cn('h-full', low ? 'bg-orange-300' : 'bg-white/60')}
                    style={{ width: `${staminaPct}%` }}
                  />
                </div>
              )}
            </button>
          )
        })}

        <div className="hidden lg:block w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        {/* Stamina + Gold + XP — own full-width row on mobile, inline on desktop */}
        <div className="w-full lg:w-auto lg:flex-1 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">

        {/* Stamina — flex-1 fills space between speed controls and gold */}
        <div className="w-full sm:flex-1 flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400/80 uppercase tracking-wider shrink-0">
            {t.stamina}
          </span>
          <div className="flex-1 relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden min-w-0">
            <div
              className={cn('h-full rounded-full transition-[width] duration-200', staminaFill)}
              style={{ width: `${staminaPct}%` }}
            />
          </div>
          <span className={cn(
            'text-[9px] tabular-nums shrink-0',
            netChange < 0 ? 'text-red-400 dark:text-red-500' : 'text-slate-400 dark:text-slate-500',
          )}>
            {Math.floor(stamina)}/{Math.round(derived.maxStamina)}
          </span>
          {timeLeft !== null && (
            <span className={cn(
              'text-[9px] tabular-nums shrink-0',
              timeLeft < 5 ? 'text-red-400' : timeLeft < 10 ? 'text-orange-400' : 'text-slate-400 dark:text-slate-600',
            )}>
              {timeLeft.toFixed(0)}s
            </span>
          )}
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2 min-w-0">
        {/* Gold */}
        <div className="relative flex items-center shrink-0">
          {goldGainVersion > 0 && (
            <div className="absolute inset-x-0 bottom-full mb-1 flex justify-center pointer-events-none">
              <span
                key={goldGainVersion}
                className="anim-xp-float text-[10px] font-bold text-yellow-400 whitespace-nowrap"
              >
                +{lastGoldGain} ⬡
              </span>
            </div>
          )}
          <span className="text-xs font-semibold text-yellow-500 dark:text-yellow-400 tabular-nums">
            ⬡ {gold}
          </span>
        </div>

        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 shrink-0" />

        {/* Level + XP */}
        <div className="relative flex flex-1 items-center justify-end gap-1.5 sm:gap-2.5 min-w-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            {t.level} {level}
          </span>
          <div className="relative flex items-center gap-1.5 min-w-0">
            {xpGainVersion > 0 && (
              <div className="absolute inset-x-0 bottom-full mb-1 flex justify-center pointer-events-none z-50">
                <span
                  key={xpGainVersion}
                  className="anim-xp-float text-[10px] font-bold text-indigo-400 whitespace-nowrap"
                >
                  +{lastXpGain} XP
                </span>
              </div>
            )}
            <div className="w-14 min-[420px]:w-20 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-[width] duration-300"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <span className="hidden min-[420px]:inline text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
              {xp}/{xpToNext} {t.xp}
            </span>
          </div>
          {freePoints > 0 && (
            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 px-1.5 py-0.5 rounded whitespace-nowrap">
              +{freePoints} pts
            </span>
          )}
        </div>
        </div>
        </div>
      </div>

    </div>
  )
}
