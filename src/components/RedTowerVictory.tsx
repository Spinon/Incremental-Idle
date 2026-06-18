import { useMapStore } from '../store/mapStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'

const RARITY_LABEL_PT: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Epico',
  set: 'Conjunto',
  unique: 'Unico',
}

const RARITY_LABEL_EN: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  set: 'Set',
  unique: 'Unique',
}

export default function RedTowerVictory() {
  const isEn = useSettingsStore(s => s.lang === 'en')
  const rewards = useMapStore(s => s.redTowerVictoryRewards)
  const returnFromRedTower = useMapStore(s => s.returnFromRedTower)
  const setActiveTab = useUIStore(s => s.setActiveTab)

  function handleReturn() {
    returnFromRedTower()
    setActiveTab('map')
  }

  const rarity = rewards
    ? (isEn ? RARITY_LABEL_EN[rewards.itemRarity] : RARITY_LABEL_PT[rewards.itemRarity]) ?? rewards.itemRarity
    : '-'

  return (
    <div className="overflow-hidden rounded-xl border border-yellow-500/40 bg-slate-950/80 shadow-2xl shadow-yellow-950/20">
      <div className="border-b border-yellow-900/50 bg-yellow-950/20 px-5 py-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">
          {isEn ? 'Red Tower conquered' : 'Torre Vermelha conquistada'}
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-100">
          {isEn ? 'The sinister aura fades' : 'A aura sinistra se desfaz'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {isEn
            ? 'The dungeon collapses back into the tower, leaving its spoils behind.'
            : 'A dungeon colapsa de volta para a torre, deixando os espolios para tras.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
        <RewardTile label={isEn ? 'Gold' : 'Ouro'} value={rewards ? `+${rewards.gold}` : '-'} tone="yellow" />
        <RewardTile label={isEn ? 'Experience' : 'Experiencia'} value={rewards ? `+${rewards.xp}` : '-'} tone="indigo" />
        <RewardTile label={isEn ? 'Word Sand' : 'Areia de Palavra'} value={rewards ? `+${rewards.wordSand}` : '-'} tone="sky" />
        <RewardTile
          label={isEn ? 'Equipment' : 'Equipamento'}
          value={rewards ? (isEn ? rewards.itemNameEn : rewards.itemName) : '-'}
          detail={rarity}
          tone="rose"
          wide
        />
        <RewardTile
          label={isEn ? 'Forge Steel' : 'Aco de Forja'}
          value={rewards ? `T${rewards.materialTier} x${rewards.materialCount}` : '-'}
          tone="slate"
        />
      </div>

      <div className="border-t border-slate-800 px-5 py-4">
        <button
          type="button"
          onClick={handleReturn}
          className="w-full rounded-md border border-yellow-500/50 bg-yellow-500 px-4 py-3 text-sm font-black uppercase tracking-wider text-slate-950 transition-colors hover:bg-yellow-400"
        >
          {isEn ? 'Return to Map' : 'Retornar ao Mapa'}
        </button>
      </div>
    </div>
  )
}

function RewardTile({
  label,
  value,
  detail,
  tone,
  wide = false,
}: {
  label: string
  value: string
  detail?: string
  tone: 'yellow' | 'indigo' | 'sky' | 'rose' | 'slate'
  wide?: boolean
}) {
  const toneClass = {
    yellow: 'border-yellow-500/35 bg-yellow-950/20 text-yellow-200',
    indigo: 'border-indigo-500/35 bg-indigo-950/20 text-indigo-200',
    sky: 'border-sky-500/35 bg-sky-950/20 text-sky-200',
    rose: 'border-rose-500/35 bg-rose-950/20 text-rose-200',
    slate: 'border-slate-600 bg-slate-900/70 text-slate-200',
  }[tone]

  return (
    <div className={`${wide ? 'col-span-2' : ''} rounded-lg border p-3 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1 break-words text-lg font-black leading-tight">{value}</div>
      {detail && <div className="mt-1 text-xs font-bold opacity-75">{detail}</div>}
    </div>
  )
}
