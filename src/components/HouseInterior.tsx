import { useMapStore } from '../store/mapStore'
import { useHeroStore } from '../store/heroStore'
import { useSettingsStore } from '../store/settingsStore'

export default function HouseInterior() {
  const leaveScene     = useMapStore(s => s.leaveScene)
  const resetMap       = useMapStore(s => s.resetMap)
  const defeatPending  = useMapStore(s => s.defeatPending)
  const heroName       = useHeroStore(s => s.name)
  const heroLevel      = useHeroStore(s => s.level)
  const lang           = useSettingsStore(s => s.lang)

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

            <div className="w-full flex justify-center gap-6 text-3xl select-none opacity-50 grayscale">
              <span>🔥</span><span>🪑</span><span>🪵</span><span>🕯️</span><span>📚</span>
            </div>

            <div className="w-full h-px bg-red-900/30" />

            <button
              onClick={() => { resetMap(heroLevel); leaveScene() }}
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
                onClick={() => { resetMap(heroLevel); leaveScene() }}
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
