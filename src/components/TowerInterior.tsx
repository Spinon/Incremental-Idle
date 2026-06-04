import { useEffect } from 'react'
import { useMapStore, gridKey } from '../store/mapStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'

const AUTO_TELEPORT_MS = 6000

export default function TowerInterior() {
  const exitBlueTower = useMapStore(s => s.exitBlueTower)
  const autoExitBlueTower = useMapStore(s => s.autoExitBlueTower)
  const blueTowerAutoTarget = useMapStore(s => s.blueTowerAutoTarget)
  const playerPos = useMapStore(s => s.playerPos)
  const grid = useMapStore(s => s.grid)
  const lang = useSettingsStore(s => s.lang)
  const sceneAuto = useUIStore(s => s.sceneAuto)
  const configureSceneAuto = useUIStore(s => s.configureSceneAuto)
  const setSceneAutoElapsed = useUIStore(s => s.setSceneAutoElapsed)
  const pauseSceneAuto = useUIStore(s => s.pauseSceneAuto)
  const clearSceneAuto = useUIStore(s => s.clearSceneAuto)
  const setActiveTab = useUIStore(s => s.setActiveTab)
  const setBlueTowerTeleportSelecting = useUIStore(s => s.setBlueTowerTeleportSelecting)
  const setBlueTowerTeleportOrigin = useUIStore(s => s.setBlueTowerTeleportOrigin)

  const isEn = lang === 'en'
  const currentTile = grid[gridKey(playerPos.x, playerPos.y)]
  const activeTowers = Object.values(grid).filter(t => t.content.type === 'blueTower' && t.explored)
  const hasTeleportTarget = !!blueTowerAutoTarget && activeTowers.some(t => !(t.x === playerPos.x && t.y === playerPos.y))
  const elapsed = sceneAuto.kind === 'tower' ? sceneAuto.elapsedMs : 0
  const paused = sceneAuto.kind === 'tower' ? sceneAuto.paused : false
  const pct = Math.min(100, (elapsed / AUTO_TELEPORT_MS) * 100)
  const sec = Math.ceil(Math.max(0, (AUTO_TELEPORT_MS - elapsed) / 1000))

  function returnToMap() {
    exitBlueTower()
  }

  function autoLeaveTower() {
    autoExitBlueTower()
  }

  function startTeleportSelection() {
    setBlueTowerTeleportOrigin({ x: playerPos.x, y: playerPos.y })
    exitBlueTower()
    setBlueTowerTeleportSelecting(true)
    setActiveTab('map')
  }

  useEffect(() => {
    configureSceneAuto('tower', AUTO_TELEPORT_MS, true)
    return () => clearSceneAuto('tower')
  }, [clearSceneAuto, configureSceneAuto])

  useEffect(() => {
    if (paused) return
    const startedAt = Date.now() - elapsed
    const id = setInterval(() => {
      const current = Date.now() - startedAt
      if (current >= AUTO_TELEPORT_MS) {
        clearInterval(id)
        autoLeaveTower()
      } else {
        setSceneAutoElapsed(current)
      }
    }, 50)
    return () => clearInterval(id)
  }, [autoExitBlueTower, elapsed, paused, setSceneAutoElapsed])

  return (
    <div
      className="rounded-2xl border border-sky-900/50 dark:border-sky-700/30 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #06192d 0%, #082f55 52%, #040b16 100%)' }}
      onPointerDown={() => pauseSceneAuto()}
    >
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #075985, #38bdf8, #075985)' }} />

      <div className="p-6 flex flex-col items-center gap-5">
        <div className="w-full text-center py-4 rounded-xl border border-sky-500/25 bg-sky-950/35">
          <div className="mx-auto mb-3 flex h-16 w-16 items-end justify-center rounded-xl border border-sky-400/30 bg-sky-900/40 shadow-[0_0_24px_rgba(56,189,248,0.18)]">
            <div className="mb-3 h-10 w-7 rounded-t-md border border-sky-200/60 bg-sky-500/35">
              <div className="mx-auto mt-2 grid w-4 grid-cols-2 gap-0.5">
                <span className="h-2 rounded-sm bg-sky-100/80" />
                <span className="h-2 rounded-sm bg-sky-100/80" />
                <span className="h-2 rounded-sm bg-sky-300/70" />
                <span className="h-2 rounded-sm bg-sky-300/70" />
              </div>
            </div>
          </div>
          <p className="text-xl font-black tracking-tight text-sky-100">
            {isEn ? 'Blue Tower' : 'Torre Azul'}
          </p>
          <p className="mt-1 text-xs text-sky-300/70">
            {isEn
              ? 'Its windows glow. The tower is connected to the awakened network.'
              : 'Suas janelas brilham. A torre está conectada à rede desperta.'}
          </p>
          <p className="mt-2 text-[10px] text-sky-500/80 tabular-nums">
            ({playerPos.x}, {playerPos.y}) - L{currentTile?.level ?? 1}
          </p>
        </div>

        <div className="w-full flex flex-col gap-1.5">
          <div className="relative w-full h-2 bg-sky-950/60 rounded-full overflow-hidden border border-sky-900/50">
            <div className="h-full rounded-full bg-sky-400/75 transition-none" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[9px] text-center text-sky-500/75">
            {paused
              ? (isEn ? 'Auto action paused' : 'Ação automática pausada')
              : hasTeleportTarget
              ? (isEn ? `Auto-teleport in ${sec}s` : `Teleporte automático em ${sec}s`)
              : (isEn ? `Auto-exit in ${sec}s` : `Saída automática em ${sec}s`)}
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={returnToMap}
            className="py-2 rounded-lg text-sm font-semibold border border-sky-700/50 bg-sky-950/25 text-sky-300 hover:bg-sky-900/35 transition-colors"
          >
            {isEn ? 'Leave' : 'Sair'}
          </button>
          <button
            type="button"
            onClick={startTeleportSelection}
            className="py-2 rounded-lg text-sm font-black border border-sky-400/60 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30 transition-colors"
          >
            Teleport
          </button>
        </div>
      </div>

      <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #082f49, #075985, #082f49)' }} />
    </div>
  )
}
