// TEMP gallery — remove before commit. Mount via #gallery hash.
import { MonsterSprite } from './MonsterSprites'
import { HeroSprite } from './hero/HeroComposer'
import type { MonsterRarity } from '../../types/monster'

const MONSTERS = ['goblin', 'wolf', 'slime', 'bandit', 'giant_spider']
const RARITIES: MonsterRarity[] = ['normal', 'uncommon', 'rare', 'epic', 'unique']

const HERO_CONFIGS = [
  { head: 1, hair: 1, body: 1, weapon: 1, legs: 1 },
  { head: 2, hair: 3, body: 2, weapon: 1, legs: 3 },
  { head: 3, hair: 4, body: 3, weapon: 2, legs: 1 },
  { head: 1, hair: 2, body: 1, weapon: 3, legs: 2 },
] as const

export function SpriteGallery() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, overflow: 'auto', background: '#0e1018', padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {HERO_CONFIGS.map((c, i) => (
          <div key={i} style={{ background: '#1a2030', border: '1px solid #333', padding: 4 }}>
            <HeroSprite config={c} size={110} />
          </div>
        ))}
      </div>
      {MONSTERS.map(m => (
        <div key={m} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <span style={{ color: '#aaa', width: 90, fontSize: 11, fontFamily: 'monospace' }}>{m}</span>
          {RARITIES.map(r => (
            <div key={r} style={{ background: '#1a2030', border: '1px solid #333', padding: 2 }}>
              <MonsterSprite monsterId={m} rarity={r} size={84} />
            </div>
          ))}
          {/* enraged */}
          <div style={{ background: '#2a1414', border: '1px solid #633', padding: 2 }}>
            <MonsterSprite monsterId={m} rarity="normal" enraged size={84} />
          </div>
        </div>
      ))}
    </div>
  )
}
