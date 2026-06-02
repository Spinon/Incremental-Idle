import { cn } from '../lib/utils'

interface Props {
  name: string
  level?: number
  levelLabel?: string
  current: number
  max: number
  side: 'player' | 'enemy'
  rarityColor?: string   // optional text-color class for rarity-tinted enemy names
  modifierText?: string
  modifierColor?: string
}

export default function HpBar({
  name,
  level,
  levelLabel = 'Lv.',
  current,
  max,
  side,
  rarityColor,
  modifierText,
  modifierColor,
}: Props) {
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
    <div className={cn('w-44 flex flex-col gap-0.5', side === 'enemy' ? 'items-end' : 'items-start')}>
      {/* Modifier/title row */}
      <div className={cn(
        'h-3 w-full px-0.5 text-[9px] font-black uppercase tracking-widest truncate',
        side === 'enemy' ? 'text-right' : 'text-left',
        modifierText ? (modifierColor ?? 'text-slate-500 dark:text-slate-400') : 'text-transparent',
      )}>
        {modifierText || '\u00a0'}
      </div>

      {/* Name row */}
      <div className="flex w-full justify-between px-0.5 items-center">
        <span className={cn(
          'text-xs font-bold tracking-wide truncate max-w-[9rem]',
          side === 'enemy' && 'text-right ml-auto',
          rarityColor ?? 'text-slate-800 dark:text-slate-200',
        )}>
          {name}
        </span>
      </div>

      {/* Bar with HP overlay */}
      <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/70 dark:border-slate-600/60 shadow-inner">
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
        {/* HP text inside bar */}
        <span className={cn(
          'absolute inset-0 flex items-center px-2 text-[9px] font-bold tabular-nums select-none',
          level !== undefined && level > 0 ? 'justify-between' : side === 'enemy' ? 'justify-end' : 'justify-start',
          isLow ? 'text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.9)]' : 'text-white/90 drop-shadow-[0_0_2px_rgba(0,0,0,0.7)]',
        )}>
          {level !== undefined && level > 0 && <span>{levelLabel}{level}</span>}
          <span>{current}/{max}</span>
        </span>
      </div>
    </div>
  )
}
