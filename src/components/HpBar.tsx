interface Props {
  name: string
  current: number
  max: number
  side: 'player' | 'enemy'
}

export default function HpBar({ name, current, max, side }: Props) {
  const pct = Math.max(0, (current / max) * 100)
  const fill = pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className={`w-44 flex flex-col gap-1 ${side === 'enemy' ? 'items-end' : 'items-start'}`}>
      <div className="flex w-full justify-between px-0.5">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">{name}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{current}/{max}</span>
      </div>
      <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600 shadow-inner">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
