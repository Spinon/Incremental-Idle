import { useMapStore } from '../store/mapStore'
import { useHeroStore } from '../store/heroStore'
import { useBattleStore } from '../store/battleStore'
import { useSettingsStore } from '../store/settingsStore'
import { FOREST_MONSTER_MAP } from '../data/monsters'
import { MONSTER_RARITY_COLOR } from '../formulas/monsters'
import { cn } from '../lib/utils'

export default function HouseInterior() {
  const leaveScene     = useMapStore(s => s.leaveScene)
  const resetMap       = useMapStore(s => s.resetMap)
  const defeatPending  = useMapStore(s => s.defeatPending)
  const heroName       = useHeroStore(s => s.name)
  const heroLevel      = useHeroStore(s => s.level)
  const queueEnemy     = useBattleStore(s => s.queueEnemy)
  const resetBattle    = useBattleStore(s => s.reset)
  const defeatSnapshot = useBattleStore(s => s.defeatSnapshot)
  const lang           = useSettingsStore(s => s.lang)

  function startJourney() {
    // Reset battle to a weak enemy so the arena doesn't keep the previous goblin
    queueEnemy(Math.max(1, heroLevel - 5))
    resetBattle()
    resetMap(heroLevel)
    leaveScene()
  }

  const isEn = lang === 'en'

  return (
    <div className="rounded-2xl border border-amber-900/40 dark:border-amber-800/30 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1c0f05 0%, #2d1a08 50%, #1a1205 100%)' }}
    >
      {/* Roof beam */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #78350f, #92400e, #78350f)' }} />

      <div className="p-6 flex flex-col items-center gap-5">

        {defeatPending ? (
          /* ── Defeat state ────────────────────────────────────────── */
          <>
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

            {/* ── Defeat recap ──────────────────────────────────────── */}
            {defeatSnapshot && (
              <div className="w-full rounded-xl border border-red-900/40 bg-slate-950/60 p-3 flex flex-col gap-2">
                {/* Killer info */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-400/60 uppercase tracking-widest font-semibold">
                    {isEn ? 'Killed by' : 'Morto por'}
                  </span>
                  <span className="text-base leading-none">
                    {FOREST_MONSTER_MAP.get(defeatSnapshot.killerMonsterType)?.emoji ?? '⚔'}
                  </span>
                  <span className={cn(
                    'text-sm font-bold',
                    MONSTER_RARITY_COLOR[
                      (FOREST_MONSTER_MAP.get(defeatSnapshot.killerMonsterType) ? 'normal' : 'normal') as 'normal'
                    ] || 'text-slate-200',
                  )}>
                    {defeatSnapshot.killerName}
                  </span>
                  <span className="text-xs text-red-400 font-semibold">
                    Nv.{defeatSnapshot.killerLevel}
                  </span>
                </div>

                {/* Battle log */}
                {defeatSnapshot.log.length > 0 && (
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto scrollbar-thin">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">
                      {isEn ? 'Last battle log' : 'Último log de batalha'}
                    </p>
                    {defeatSnapshot.log.slice(0, 12).map((entry, i) => (
                      <div key={i} className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        entry.attacker === heroName
                          ? 'text-blue-400/80 bg-blue-950/20'
                          : 'text-red-400/80 bg-red-950/20',
                      )}>
                        {entry.missed
                          ? (isEn
                              ? `${entry.attacker} missed!`
                              : `${entry.attacker} errou!`)
                          : (isEn
                              ? `${entry.attacker} → ${entry.defender}: ${entry.dmg} dmg`
                              : `${entry.attacker} → ${entry.defender}: ${entry.dmg} de dano`)
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="w-full flex justify-center gap-6 text-3xl select-none opacity-50 grayscale">
              <span>🔥</span><span>🪑</span><span>🪵</span><span>🕯️</span><span>📚</span>
            </div>

            <div className="w-full h-px bg-red-900/30" />

            <button
              onClick={startJourney}
              className="w-full py-3 rounded-xl text-base font-bold border border-red-700/60 bg-red-900/40 text-red-300 hover:bg-red-900/60 transition-colors"
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
