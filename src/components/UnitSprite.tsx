import { FOREST_MONSTER_MAP } from '../data/monsters'
import { cn } from '../lib/utils'
import { HeroSprite } from './icons/hero/HeroComposer'
import { useHeroStore } from '../store/heroStore'
import { MonsterSprite, MONSTER_PIXEL_SPRITES } from './icons/MonsterSprites'
import type { MonsterRarity } from '../types/monster'

const MONSTER_SPRITE_SIZE = 103
const MONSTER_EMOJI_SIZE = 103
const MONSTER_EMOJI_FONT_SIZE = 70

interface Props {
  side: 'player' | 'enemy'
  isHit: boolean
  hitDuration: string
  monsterType?: string
  monsterRarity?: MonsterRarity
  enraged?: boolean
  monsterVariant?: 'golden' | 'predator' | 'boss'
  attacking?: boolean
  attackDurationMs?: number
}

// ─── Player sprite — reads heroConfig from store ──────────────────────────────

function HeroSvg({ attacking, attackDurationMs }: { attacking?: boolean; attackDurationMs?: number }) {
  const config = useHeroStore(s => s.heroConfig)
  return <HeroSprite config={config} size={72} attacking={attacking} attackDurationMs={attackDurationMs} />
}

// ─── Emoji fallback ───────────────────────────────────────────────────────────

function EnemyEmoji({ emoji }: { emoji: string }) {
  return (
    <div style={{ width: MONSTER_EMOJI_SIZE, height: MONSTER_EMOJI_SIZE }} className="flex items-center justify-center">
      <span
        style={{ fontSize: MONSTER_EMOJI_FONT_SIZE, lineHeight: 1, display: 'block', transform: 'scaleX(-1)', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}
        role="img"
      >
        {emoji}
      </span>
    </div>
  )
}

export default function UnitSprite({ side, isHit, hitDuration, monsterType, monsterRarity, enraged, monsterVariant, attacking, attackDurationMs }: Props) {
  function renderSprite() {
    if (side === 'player') return <HeroSvg attacking={attacking} attackDurationMs={attackDurationMs} />

    const template = monsterType ? FOREST_MONSTER_MAP.get(monsterType) : null
    if (!template) return <MonsterSprite monsterId="goblin" size={MONSTER_SPRITE_SIZE} />

    if (MONSTER_PIXEL_SPRITES[template.id]) {
      return (
        <MonsterSprite
          monsterId={template.id}
          rarity={monsterRarity}
          enraged={enraged}
          variant={monsterVariant}
          size={MONSTER_SPRITE_SIZE}
          attacking={attacking}
          attackDurationMs={attackDurationMs}
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
