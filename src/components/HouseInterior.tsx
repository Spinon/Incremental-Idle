import { useEffect } from 'react'
import { useMapStore } from '../store/mapStore'
import { useHeroStore } from '../store/heroStore'
import { useBattleStore } from '../store/battleStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import { FOREST_MONSTER_MAP, monsterName } from '../data/monsters'
import { MONSTER_RARITY_COLOR, MONSTER_RARITY_LABEL, MONSTER_RARITY_LABEL_EN } from '../formulas/monsters'
import type { MonsterRarity } from '../types/monster'
import { cn } from '../lib/utils'

const AUTO_RESTART_MS = 10_000

export default function HouseInterior() {
  const leaveScene     = useMapStore(s => s.leaveScene)
  const resetMap       = useMapStore(s => s.resetMap)
  const defeatPending  = useMapStore(s => s.defeatPending)
  const stuckPending   = useMapStore(s => s.stuckPending)
  const heroName       = useHeroStore(s => s.name)
  const heroLevel      = useHeroStore(s => s.level)
  const resetBattle    = useBattleStore(s => s.reset)
  const defeatSnapshot = useBattleStore(s => s.defeatSnapshot)
  const lang           = useSettingsStore(s => s.lang)
  const sceneAuto      = useUIStore(s => s.sceneAuto)
  const configureSceneAuto = useUIStore(s => s.configureSceneAuto)
  const setSceneAutoElapsed = useUIStore(s => s.setSceneAutoElapsed)
  const pauseSceneAuto = useUIStore(s => s.pauseSceneAuto)
  const clearSceneAuto = useUIStore(s => s.clearSceneAuto)

  // ── Auto-restart timer ─────────────────────────────────────────────────────
  // Counts down when the player is on the defeat screen or stuck screen.
  // Pauses when the user interacts with the panel so they can read / decide.
  const shouldAutoRestart = defeatPending || stuckPending
  const elapsed = sceneAuto.kind === 'home' ? sceneAuto.elapsedMs : 0
  const paused  = sceneAuto.kind === 'home' ? sceneAuto.paused : false

  // Reset when entering/leaving auto-restart state
  useEffect(() => {
    configureSceneAuto('home', AUTO_RESTART_MS, shouldAutoRestart)
    return () => clearSceneAuto('home')
  }, [clearSceneAuto, configureSceneAuto, shouldAutoRestart])

  useEffect(() => {
    if (!shouldAutoRestart || paused) return
    const startedAt = Date.now() - elapsed
    const id = setInterval(() => {
      const cur = Date.now() - startedAt
      if (cur >= AUTO_RESTART_MS) { clearInterval(id); startJourney() }
      else setSceneAutoElapsed(cur)
    }, 50)
    return () => clearInterval(id)
  }, [paused, shouldAutoRestart]) // eslint-disable-line react-hooks/exhaustive-deps

  const autoRestartPct = Math.min(100, (elapsed / AUTO_RESTART_MS) * 100)
  const autoRestartSec = Math.ceil(Math.max(0, (AUTO_RESTART_MS - elapsed) / 1000))

  function startJourney() {
    resetBattle()
    resetMap(heroLevel)
    leaveScene()
  }

  const isEn = lang === 'en'

  return (
    <div
      className="rounded-2xl border border-amber-900/40 dark:border-amber-800/30 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1c0f05 0%, #2d1a08 50%, #1a1205 100%)' }}
      onPointerDown={() => shouldAutoRestart && pauseSceneAuto()}   // any click pauses the auto-restart
    >
      {/* Roof beam */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #78350f, #92400e, #78350f)' }} />

      <div className="p-6 flex flex-col items-center gap-5">

        {(defeatPending || stuckPending) ? (
          /* ── Defeat / Stuck state ───────────────────────────────── */
          <>
            {stuckPending ? (
              <div className="w-full text-center py-3 rounded-xl border border-amber-800/50 bg-amber-950/30">
                <p className="text-amber-400 font-black text-2xl tracking-tight mb-1">
                  {isEn ? '🗺 Map Full' : '🗺 Mapa Bloqueado'}
                </p>
                <p className="text-amber-500/70 text-xs">
                  {isEn
                    ? 'All tiles placed — no space left. Starting a new journey.'
                    : 'Sem espaço para novas peças. Iniciando nova jornada.'}
                </p>
              </div>
            ) : (
              <div className="w-full text-center py-3 rounded-xl border border-red-900/50 bg-red-950/40">
                <p className="text-red-400 font-black text-2xl tracking-tight mb-1">
                  {isEn ? '☠ Defeated' : '☠ Derrotado'}
                </p>
                <p className="text-red-500/70 text-xs">
                  {isEn
                    ? 'Your journey ended in defeat. Rest and begin anew.'
                    : 'Sua jornada terminou em derrota. Descanse e recomece.'}
                </p>
              </div>
            )}

            {/* ── Defeat recap ──────────────────────────────────────── */}
            {defeatSnapshot && (() => {
              const template   = FOREST_MONSTER_MAP.get(defeatSnapshot.killerMonsterType)
              // Extract rarity from the killer's name prefix (e.g. "[Épico] Goblin")
              const killerRarity: MonsterRarity =
                defeatSnapshot.killerName.includes('[Único')   ? 'unique'   :
                defeatSnapshot.killerName.includes('[Épico')   ? 'epic'     :
                defeatSnapshot.killerName.includes('[Epic')    ? 'epic'     :
                defeatSnapshot.killerName.includes('[Raro')    ? 'rare'     :
                defeatSnapshot.killerName.includes('[Rare')    ? 'rare'     :
                defeatSnapshot.killerName.includes('[Incomum') ? 'uncommon' :
                defeatSnapshot.killerName.includes('[Uncommon')? 'uncommon' : 'normal'
              const rarityLabel = isEn ? MONSTER_RARITY_LABEL_EN[killerRarity] : MONSTER_RARITY_LABEL[killerRarity]
              const rarityColor = MONSTER_RARITY_COLOR[killerRarity] || 'text-slate-300'
              const killerDisplayName = template ? monsterName(template, isEn) : defeatSnapshot.killerName
              const displayLogName = (name: string) => name === heroName ? name : killerDisplayName
              return (
                <div className="w-full rounded-xl border border-red-900/40 bg-slate-950/60 p-3 flex flex-col gap-2">
                  {/* Killer info */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-red-400/60 uppercase tracking-widest font-semibold shrink-0">
                      {isEn ? 'Killed by' : 'Morto por'}
                    </span>
                    <span className="text-xl leading-none">{template?.emoji ?? '⚔'}</span>
                    <span className={cn('text-sm font-bold', rarityColor)}>
                      {rarityLabel && <span className="text-[10px] mr-1 opacity-80">[{rarityLabel}]</span>}
                      {killerDisplayName}
                    </span>
                    <span className="text-xs text-red-400 font-bold bg-red-950/50 px-1.5 py-0.5 rounded-full">
                      Nv.{defeatSnapshot.killerLevel}
                    </span>
                  </div>

                  {/* Battle log */}
                  {defeatSnapshot.log.length > 0 && (
                    <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1 font-bold">
                        {isEn ? 'Last battle log' : 'Último log de batalha'}
                      </p>
                      {defeatSnapshot.log.slice(0, 12).map((entry, i) => {
                        const isHero = entry.attacker === heroName
                        if (entry.spell) {
                          const { spell } = entry
                          const spellName = isEn ? (spell.nameEn ?? spell.name) : spell.name
                          const targetName = displayLogName(entry.defender)
                          const color =
                            spell.effectType === 'damage'  ? 'text-orange-400/80 bg-orange-950/20'
                            : spell.effectType === 'heal'  ? 'text-emerald-400/80 bg-emerald-950/20'
                            : spell.effectType === 'buff'  ? 'text-blue-400/80 bg-blue-950/20'
                            : spell.effectType === 'debuff'? 'text-purple-400/80 bg-purple-950/20'
                            :                               'text-amber-400/80 bg-amber-950/20'
                          return (
                            <div key={i} className={cn('text-[10px] px-2 py-0.5 rounded flex items-center gap-1', color)}>
                              <span>{spell.icon}</span>
                              <span className="font-semibold">{spellName}</span>
                              <span className="opacity-40">-&gt;</span>
                              <span className="truncate">{targetName}</span>
                              {spell.value > 0 && (
                                <span className="ml-auto font-bold">
                                  {spell.effectType === 'heal' ? `+${spell.value}` : `-${spell.value}`}
                                </span>
                              )}
                            </div>
                          )
                        }
                        return (
                          <div key={i} className={cn(
                            'text-[10px] px-2 py-0.5 rounded flex items-center gap-1',
                            isHero ? 'text-blue-400/80 bg-blue-950/20' : 'text-red-400/80 bg-red-950/20',
                          )}>
                            {entry.missed
                              ? <span className="italic">{displayLogName(entry.attacker)} <span className="font-bold">MISS</span></span>
                              : <>
                                  <span className="font-semibold">{displayLogName(entry.attacker)}</span>
                                  <span className="opacity-40">→</span>
                                  <span>{displayLogName(entry.defender)}</span>
                                  <span className={cn(
                                    'ml-auto font-bold flex items-center gap-0.5',
                                    entry.isCrit && 'text-amber-300',
                                  )}>
                                    {entry.isCrit && <span className="text-[8px]">⚡</span>}
                                    {entry.weaponEffect && entry.dmg > 0 && <span className="text-[8px] uppercase">{entry.weaponEffect.icon}</span>}
                                    {entry.dmg > 0 ? `-${entry.dmg}` : entry.weaponEffect?.icon ?? entry.dmg}
                                  </span>
                                </>
                            }
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="w-full flex justify-center gap-6 text-3xl select-none opacity-50 grayscale">
              <span>🔥</span><span>🪑</span><span>🪵</span><span>🕯️</span><span>📚</span>
            </div>

            <div className="w-full h-px bg-red-900/30" />

            {/* Auto-restart progress bar */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="relative w-full h-2 bg-red-950/60 rounded-full overflow-hidden border border-red-900/40">
                <div
                  className={cn(
                    'h-full rounded-full transition-none',
                    stuckPending ? 'bg-amber-600/70' : 'bg-red-600/70',
                  )}
                  style={{ width: `${autoRestartPct}%` }}
                />
              </div>
              <p className="text-[9px] text-center text-red-900/60">
                {paused
                  ? (isEn ? 'Auto-restart paused — click the button to continue' : 'Auto-reinício pausado — clique no botão para continuar')
                  : (isEn ? `New journey in ${autoRestartSec}s…` : `Nova jornada em ${autoRestartSec}s…`)}
              </p>
            </div>

            <button
              onClick={startJourney}
              className={cn(
                'w-full py-3 rounded-xl text-base font-bold border transition-colors',
                stuckPending
                  ? 'border-amber-700/60 bg-amber-900/40 text-amber-300 hover:bg-amber-900/60'
                  : 'border-red-700/60 bg-red-900/40 text-red-300 hover:bg-red-900/60',
              )}
            >
              {isEn ? '↺ Begin New Journey' : '↺ Iniciar Nova Jornada'}
            </button>

            <p className="text-[10px] text-red-900/60 text-center">
              {isEn
                ? 'All map progress will be reset. Inventory and equipment are kept.'
                : 'O progresso do mapa será reiniciado. Inventário e equipamentos são mantidos.'}
            </p>
          </>
        ) : (
          /* ── Normal state ────────────────────────────────────────── */
          <>
            <div className="w-full flex justify-center gap-6 text-3xl select-none opacity-80">
              <span title="Lareira">🔥</span>
              <span title="Cadeira">🪑</span>
              <span title="Mesa">🪵</span>
              <span title="Vela">🕯️</span>
              <span title="Livro">📚</span>
            </div>

            <div className="text-center">
              <p className="text-amber-200/90 font-bold text-lg">
                {isEn ? `Welcome home, ${heroName}!` : `Bem-vindo, ${heroName}!`}
              </p>
              <p className="text-amber-400/50 text-xs mt-1">
                {isEn ? 'A safe place to rest and plan your next journey.' : 'Um lugar seguro para descansar e planejar sua próxima jornada.'}
              </p>
            </div>

            <div className="w-full h-px bg-amber-900/40" />

            <div className="flex gap-3 w-full">
              <button
                onClick={leaveScene}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-amber-700/50 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50 transition-colors"
              >
                {isEn ? '← Return to Map' : '← Retornar ao Mapa'}
              </button>
              <button
                onClick={startJourney}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-red-900/40 bg-red-950/30 text-red-400 hover:bg-red-950/50 transition-colors"
              >
                {isEn ? '↺ New Journey' : '↺ Nova Jornada'}
              </button>
            </div>

            <p className="text-[10px] text-amber-900/60 text-center">
              {isEn
                ? 'Starting a new journey resets all map progress.'
                : 'Iniciar nova jornada reinicia todo o progresso do mapa.'}
            </p>
          </>
        )}
      </div>

      {/* Floor */}
      <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #451a03, #78350f, #451a03)' }} />
    </div>
  )
}
