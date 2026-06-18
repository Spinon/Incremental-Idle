import { useEffect, useState } from 'react'
import { useMapStore } from '../store/mapStore'
import { useSettingsStore } from '../store/settingsStore'

const RETURN_MS = 2500

export default function RedTowerBlockedTransition() {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const completeRedTowerDungeon = useMapStore(s => s.completeRedTowerDungeon)
  const [elapsed, setElapsed] = useState(0)
  const pct = Math.min(100, (elapsed / RETURN_MS) * 100)

  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => {
      const current = Date.now() - startedAt
      if (current >= RETURN_MS) {
        clearInterval(id)
        completeRedTowerDungeon(false)
      } else {
        setElapsed(current)
      }
    }, 50)
    return () => clearInterval(id)
  }, [completeRedTowerDungeon])

  return (
    <div className="rounded-xl border border-red-900/50 bg-slate-950/80 overflow-hidden">
      <div className="h-1.5 w-full bg-red-900" />
      <div className="p-6 min-h-[220px] flex flex-col items-center justify-center text-center gap-4">
        <p className="text-[10px] uppercase tracking-[0.24em] font-black text-red-300">
          {isEn ? 'Dungeon sealed' : 'Dungeon selada'}
        </p>
        <h2 className="text-xl font-black text-slate-100">
          {isEn ? 'No tile can be placed' : 'Nenhuma peça pode ser posicionada'}
        </h2>
        <p className="max-w-md text-sm leading-6 text-slate-300">
          {isEn
            ? 'The remaining paths collapse. You will return to the Red Tower interior.'
            : 'Os caminhos restantes desabam. Voce retornara ao interior da Torre Vermelha.'}
        </p>
        <div className="mt-2 w-full max-w-sm h-2 rounded-full border border-red-900/60 bg-red-950/40 overflow-hidden">
          <div className="h-full rounded-full bg-red-500/80" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
