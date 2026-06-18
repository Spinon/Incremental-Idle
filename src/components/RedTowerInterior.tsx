import { useEffect } from 'react'
import { useHeroStore } from '../store/heroStore'
import { useMapStore } from '../store/mapStore'
import { usePartyStore } from '../store/partyStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'

const AUTO_RETURN_MS = 6000

export default function RedTowerInterior() {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const heroLevel = useHeroStore(s => s.level)
  const enterRedTowerDungeon = useMapStore(s => s.enterRedTowerDungeon)
  const returnFromRedTower = useMapStore(s => s.returnFromRedTower)
  const tile = useMapStore(s => s.grid[`${s.playerPos.x},${s.playerPos.y}`])
  const setActiveTab = useUIStore(s => s.setActiveTab)
  const resetExplorerPositions = usePartyStore(s => s.resetExplorerPositions)
  const sceneAuto = useUIStore(s => s.sceneAuto)
  const configureSceneAuto = useUIStore(s => s.configureSceneAuto)
  const setSceneAutoElapsed = useUIStore(s => s.setSceneAutoElapsed)
  const pauseSceneAuto = useUIStore(s => s.pauseSceneAuto)
  const clearSceneAuto = useUIStore(s => s.clearSceneAuto)
  const explored = tile?.content.type === 'redTower' && tile.explored
  const elapsed = sceneAuto.kind === 'redTower' ? sceneAuto.elapsedMs : 0
  const paused = sceneAuto.kind === 'redTower' ? sceneAuto.paused : false
  const pct = Math.min(100, (elapsed / AUTO_RETURN_MS) * 100)
  const sec = Math.ceil(Math.max(0, (AUTO_RETURN_MS - elapsed) / 1000))

  function handleEnter() {
    const entered = enterRedTowerDungeon(heroLevel)
    if (entered) {
      resetExplorerPositions({ x: 1, y: 1 })
      setActiveTab('map')
    }
  }

  function handleReturn() {
    returnFromRedTower()
    setActiveTab('map')
  }

  useEffect(() => {
    configureSceneAuto('redTower', AUTO_RETURN_MS, true)
    return () => clearSceneAuto('redTower')
  }, [clearSceneAuto, configureSceneAuto])

  useEffect(() => {
    if (paused) return
    const startedAt = Date.now() - elapsed
    const id = setInterval(() => {
      const current = Date.now() - startedAt
      if (current >= AUTO_RETURN_MS) {
        clearInterval(id)
        returnFromRedTower()
      } else {
        setSceneAutoElapsed(current)
      }
    }, 50)
    return () => clearInterval(id)
  }, [paused]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border border-red-900/50 bg-slate-950/70 overflow-hidden" onPointerDown={() => pauseSceneAuto()}>
      <div className="px-5 py-4 border-b border-red-950/70 bg-red-950/20">
        <p className="text-[10px] uppercase tracking-[0.22em] font-black text-red-300">
          {isEn ? 'Red Tower' : 'Torre Vermelha'}
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-100">
          {explored
            ? (isEn ? 'The aura is gone' : 'A aura se apagou')
            : (isEn ? 'A sinister aura waits inside' : 'Uma aura sinistra espera la dentro')}
        </h2>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm leading-6 text-slate-300">
          {explored
            ? (isEn ? 'This tower has already been conquered.' : 'Esta torre ja foi conquistada.')
            : (isEn ? 'The tower folds space into a sealed dungeon.' : 'A torre dobra o espaco em uma dungeon selada.')}
        </p>

        <div className="space-y-1.5">
          <div className="h-2 rounded-full border border-red-900/60 bg-red-950/40 overflow-hidden">
            <div className="h-full rounded-full bg-red-500/75" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[9px] text-center text-red-300/70">
            {paused
              ? (isEn ? 'Auto return paused' : 'Retorno automatico pausado')
              : (isEn ? `Auto-return in ${sec}s` : `Retorno automatico em ${sec}s`)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={explored}
            onClick={handleEnter}
            className="rounded-md border border-red-500/50 bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isEn ? 'Enter' : 'Entrar'}
          </button>
          <button
            type="button"
            onClick={handleReturn}
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wider text-slate-200 transition-colors hover:bg-slate-800"
          >
            {isEn ? 'Return to Map' : 'Retornar ao Mapa'}
          </button>
        </div>
      </div>
    </div>
  )
}
