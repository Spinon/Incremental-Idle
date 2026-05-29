import { cn } from '../lib/utils'

interface Props {
  name: string
  level?: number
  current: number
  max: number
  side: 'player' | 'enemy'
  rarityColor?: string   // optional text-color class for rarity-tinted enemy names
}

export default function HpBar({ name, level, current, max, side, rarityColor }: Props) {
  const pct    = Math.max(0, Math.min(1, current / max))
  const pctNum = Math.round(pct * 100)
  const isLow  = pct <= 0.25 && current > 0

  // Smooth gradient stops based on HP percentage
  const barColor =
    pct > 0.6  ? 'bg-emerald-500 dark:bg-emerald-500' :
    pct > 0.35 ? 'bg-yellow-400 dark:bg-yellow-400'   :
    pct > 0.15 ? 'bg-orange-500 dark:bg-orange-400'   :
                 'bg-red-500 dark:bg-red-500'

  return (
    <div className={cn('w-44 flex flex-col gap-1', side === 'enemy' ? 'items-end' : 'items-start')}>
      {/* Name + level row */}
      <div className="flex w-full justify-between px-0.5 items-center">
        <span className={cn(
          'text-xs font-bold tracking-wide truncate max-w-[9rem]',
          rarityColor ?? 'text-slate-800 dark:text-slate-200',
        )}>
          {name}
          {level !== undefined && level > 0 && (
            <span className="ml-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">
              Nv.{level}
            </span>
          )}
        </span>
        <span className={cn(
          'text-[10px] tabular-nums shrink-0',
          isLow ? 'text-red-500 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400',
        )}>
          {current}/{max}
        </span>
      </div>

      {/* Bar */}
      <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/70 dark:border-slate-600/60 shadow-inner">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            barColor,
            isLow && 'anim-hp-pulse',
          )}
          style={{ width: `${pctNum}%` }}
        />
        {/* Gloss sheen */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 60%)' }} />
      </div>
    </div>
  )
}
