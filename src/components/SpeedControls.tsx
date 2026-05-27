import { useBattleStore, type Speed } from '../store/battleStore'
import { cn } from '../lib/utils'

const SPEEDS: Speed[] = [1, 2, 3, 4]

export default function SpeedControls() {
  const { speed, skipAnim, phase, setSpeed, setSkipAnim, skipBattle } = useBattleStore()

  const isOver = phase === 'over'

  function handleSkip() {
    setSkipAnim(true)
    skipBattle()
  }

  function handleSpeed(s: Speed) {
    setSkipAnim(false)
    setSpeed(s)
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={handleSkip}
        disabled={isOver}
        className={cn(
          'px-4 py-1.5 rounded-md text-sm font-semibold border transition-all',
          isOver
            ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500'
            : skipAnim
              ? 'bg-rose-700 border-rose-500 text-white shadow-lg shadow-rose-900/50'
              : 'bg-slate-700 border-slate-500 text-slate-200 hover:bg-rose-800 hover:border-rose-600'
        )}
      >
        Skip
      </button>

      <div className="w-px h-5 bg-slate-700" />

      <span className="text-xs text-slate-500 uppercase tracking-widest">Speed</span>

      {SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => handleSpeed(s)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-semibold border transition-all',
            speed === s && !skipAnim
              ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-900/40'
              : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
          )}
        >
          {s}×
        </button>
      ))}
    </div>
  )
}
