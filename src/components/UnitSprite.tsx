import { FOREST_MONSTER_MAP } from '../data/monsters'
import { cn } from '../lib/utils'
import { HeroSprite } from './icons/hero/HeroComposer'
import { useHeroStore } from '../store/heroStore'
import { MonsterSprite, MONSTER_PIXEL_SPRITES } from './icons/MonsterSprites'
import type { MonsterRarity } from '../types/monster'

interface Props {
  side: 'player' | 'enemy'
  isHit: boolean
  hitDuration: string
  monsterType?: string
  monsterRarity?: MonsterRarity
  enraged?: boolean
}

// ─── Player sprite — reads heroConfig from store ──────────────────────────────

function HeroSvg() {
  const config = useHeroStore(s => s.heroConfig)
  return <HeroSprite config={config} size={72} />
}

// ─── Emoji fallback ───────────────────────────────────────────────────────────

function EnemyEmoji({ emoji }: { emoji: string }) {
  return (
    <div style={{ width: 80, height: 80 }} className="flex items-center justify-center">
      <span
        style={{ fontSize: 56, lineHeight: 1, display: 'block', transform: 'scaleX(-1)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}
        role="img"
      >
        {emoji}
      </span>
    </div>
  )
}

export default function UnitSprite({ side, isHit, hitDuration, monsterType, monsterRarity, enraged }: Props) {
  function renderSprite() {
    if (side === 'player') return <HeroSvg />

    const template = monsterType ? FOREST_MONSTER_MAP.get(monsterType) : null
    if (!template) return <MonsterSprite monsterId="goblin" size={80} />

    if (MONSTER_PIXEL_SPRITES[template.id]) {
      return (
        <MonsterSprite
          monsterId={template.id}
          rarity={monsterRarity}
          enraged={enraged}
          size={80}
        />
      )
    }
    return <EnemyEmoji emoji={template.emoji} />
  }

  return (
    <div
      className={cn('relative', isHit && 'anim-shake')}
      style={isHit ? { animationDuration: hitDuration } : undefined}
    >
      <div
        className={cn(isHit && 'anim-flash')}
        style={isHit ? { animationDuration: hitDuration } : undefined}
      >
        {renderSprite()}
      </div>
    </div>
  )
}
