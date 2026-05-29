import { useEffect, useState } from 'react'
import { useMapStore, gridKey } from '../store/mapStore'
import { useBattleStore } from '../store/battleStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useHeroStore } from '../store/heroStore'
import { useSettingsStore } from '../store/settingsStore'
import { useSpellStore, getKnownWordIds } from '../store/spellStore'
import { generateMarketOffer, wordPrice, ATTR_LABEL_PT, ATTR_LABEL_EN } from '../formulas/items'
import { DROP_WORDS, WORD_MAP } from '../data/words'
import { WORD_ICONS } from '../data/spells'
import { cn } from '../lib/utils'
import type { Item, Consumable, ItemRarity, MarketOffer, WordOffer } from '../types/item'

// ─── Rarity colours (minimal palette) ────────────────────────────────────────

const RARITY_BORDER: Record<ItemRarity, string> = {
  common:   'border-slate-400  dark:border-slate-600',
  uncommon: 'border-green-500  dark:border-green-600',
  rare:     'border-blue-500   dark:border-blue-600',
  epic:     'border-purple-500 dark:border-purple-600',
  set:      'border-yellow-400 dark:border-yellow-500',
  unique:   'border-orange-500 dark:border-orange-400',
}
const RARITY_TEXT: Record<ItemRarity, string> = {
  common:   'text-slate-400   dark:text-slate-500',
  uncommon: 'text-green-400   dark:text-green-500',
  rare:     'text-blue-400    dark:text-blue-400',
  epic:     'text-purple-400  dark:text-purple-400',
  set:      'text-yellow-400  dark:text-yellow-300',
  unique:   'text-orange-400  dark:text-orange-300',
}
const RARITY_LABEL_PT: Record<ItemRarity, string> = {
  common: 'Comum', uncommon: 'Incomum', rare: 'Raro', epic: 'Épico',
  set: 'Conjunto', unique: 'Único',
}
const RARITY_LABEL_EN: Record<ItemRarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic',
  set: 'Set', unique: 'Unique',
}

// ─── Consumable description ───────────────────────────────────────────────────

function consumableDesc(c: Consumable, isEn: boolean): string {
  switch (c.effect) {
    case 'stamina':
      return isEn
        ? `Restore ${Math.round(c.magnitude * 100)}% Stamina`
        : `Restaura ${Math.round(c.magnitude * 100)}% de Stamina`
    case 'mana':
      return isEn
        ? `Restore ${Math.round(c.magnitude * 100)}% Mana`
        : `Restaura ${Math.round(c.magnitude * 100)}% de Mana`
    case 'skip':
      return isEn
        ? `+${c.magnitude} Skip Charge${c.magnitude > 1 ? 's' : ''}`
        : `+${c.magnitude} Turbo Charge${c.magnitude > 1 ? 's' : ''}`
    case 'xp':
      return `+${Math.round(c.magnitude)} XP`
  }
}

// ─── Equipment stat summary (brief) ──────────────────────────────────────────

function itemStatLine(item: Item, isEn: boolean): string {
  const LABELS: Record<string, [string, string]> = {
    atk: ['ATK', 'ATK'], def: ['DEF', 'DEF'], hp: ['HP', 'HP'],
    atkSpeed: ['Vel.Atk', 'AtkSpd'], magicDamage: ['Mágico', 'Magic'],
    vision: ['Visão', 'Vision'], moveSpeed: ['Mov', 'Move'],
    dropChance: ['Drop', 'Drop'], goldMult: ['Ouro', 'Gold'], xpBonus: ['XP+', 'XP+'],
  }
  const parts = Object.entries(item.stats).map(([k, v]) => {
    const lbl = LABELS[k]?.[isEn ? 1 : 0] ?? k
    const val = typeof v === 'number'
      ? (k === 'dropChance' ? `+${(v * 100).toFixed(1)}%` : k.endsWith('Mult') || k.endsWith('Bonus') || k.endsWith('Speed') ? `+${v.toFixed(2)}×` : `+${Math.round(v)}`)
      : String(v)
    return `${lbl} ${val}`
  })
  // Set bonus suffix
  if (item.setBonus) {
    const lbl = LABELS[item.setBonus.stat]?.[isEn ? 1 : 0] ?? item.setBonus.stat
    const val = typeof item.setBonus.value === 'number' && item.setBonus.stat.endsWith('Mult')
      ? `+${item.setBonus.value.toFixed(3)}×`
      : `+${item.setBonus.value}`
    parts.push(`◆${lbl} ${val}/${isEn ? 'set' : 'conj'}`)
  }
  // Attr bonus suffix
  if (item.attrBonus) {
    for (const [k, v] of Object.entries(item.attrBonus)) {
      const lbl = isEn ? ATTR_LABEL_EN[k as keyof typeof ATTR_LABEL_EN] : ATTR_LABEL_PT[k as keyof typeof ATTR_LABEL_PT]
      parts.push(`★${lbl} +${v}`)
    }
  }
  return parts.join('  ')
}

const SLOT_NAME_PT: Record<string, string> = {
  head: 'Cabeça', shoulder: 'Ombro', chest: 'Peitoral',
  gloves: 'Luvas', legs: 'Pernas', feet: 'Pés', acc: 'Acessório',
}
const SLOT_NAME_EN: Record<string, string> = {
  head: 'Head', shoulder: 'Shoulder', chest: 'Chest',
  gloves: 'Gloves', legs: 'Legs', feet: 'Feet', acc: 'Accessory',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_LEAVE_MS = 6000

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketInterior() {
  const leaveScene   = useMapStore(s => s.leaveScene)
  const exitMarket   = useMapStore(s => s.exitMarket)
  const resetBattle  = useBattleStore(s => s.reset)
  const setSellMode  = useInventoryStore(s => s.setSellMode)
  const lang       = useSettingsStore(s => s.lang)
  const isEn       = lang === 'en'

  // Tile level at player's current position
  const tileLevel = useMapStore(s => {
    const pos = s.playerPos
    return s.grid[gridKey(pos.x, pos.y)]?.level ?? 1
  })

  const gold      = useHeroStore(s => s.gold)
  const spendGold = useHeroStore(s => s.spendGold)

  const addItem        = useInventoryStore(s => s.addItem)
  const addConsumable  = useInventoryStore(s => s.addConsumable)

  const earnWord     = useSpellStore(s => s.earnWord)
  const earnedWordIds = useSpellStore(s => s.earnedWordIds)
  const heroLevel    = useHeroStore(s => s.level)
  const heroAttrs    = useHeroStore(s => s.attributes)
  const tilesPlaced  = useMapStore(s => s.tilesPlaced)

  // Generate offer once on mount
  const [offer] = useState<MarketOffer>(() => generateMarketOffer(tileLevel))

  // Generate word offers once on mount — filtered by progression and known words
  const [wordOffers] = useState<WordOffer[]>(() => {
    const knownIds = new Set(getKnownWordIds(
      heroLevel, heroAttrs.inteligencia, heroAttrs.sabedoria, earnedWordIds,
    ))
    const available = DROP_WORDS.filter(w => {
      if (knownIds.has(w.id)) return false
      if (w.rarity === 'unique' && tilesPlaced < 80) return false
      if (w.rarity === 'epic'   && tilesPlaced < 60) return false
      if (w.rarity === 'rare'   && tilesPlaced < 40) return false
      return true
    })
    // Shuffle and take up to 2
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2).map(w => ({
      wordId: w.id,
      price:  wordPrice(w.rarity as 'rare' | 'epic' | 'unique', tileLevel),
    }))
  })

  // Track what was bought (id-set)
  const [bought, setBought]   = useState<Set<string>>(new Set())
  const [soldGold, setSoldGold] = useState(0)
  const [elapsed, setElapsed]  = useState(0)
  const [paused,  setPaused]   = useState(false)
  // Feedback for failed buys (inventory full)
  const [failId, setFailId]    = useState<string | null>(null)

  // Auto-sell on entry
  useEffect(() => {
    const g = useInventoryStore.getState().performAutoSell()
    if (g > 0) { useHeroStore.getState().earnGold(g); setSoldGold(g) }
  }, [])

  // Auto-leave timer
  useEffect(() => {
    if (paused) return
    const startedAt = Date.now() - elapsed
    const id = setInterval(() => {
      const current = Date.now() - startedAt
      if (current >= AUTO_LEAVE_MS) { clearInterval(id); leaveScene() }
      else setElapsed(current)
    }, 50)
    return () => clearInterval(id)
  }, [paused]) // eslint-disable-line react-hooks/exhaustive-deps

  function showFail(id: string) {
    setFailId(id)
    setTimeout(() => setFailId(f => f === id ? null : f), 1400)
  }

  function buyConsumable(c: Consumable) {
    setPaused(true)
    if (!spendGold(c.price)) return
    const ok = addConsumable(c)
    if (!ok) { useHeroStore.getState().earnGold(c.price); showFail(c.id); return }
    setBought(b => new Set(b).add(c.id))
  }

  function buyWord(wo: WordOffer) {
    setPaused(true)
    if (!spendGold(wo.price)) return
    earnWord(wo.wordId)
    setBought(b => new Set(b).add(wo.wordId))
  }

  function buyEquipment(item: Item) {
    setPaused(true)
    if (!spendGold(item.price!)) return
    const ok = addItem(item as Item)
    if (!ok) { useHeroStore.getState().earnGold(item.price!); showFail(item.id); return }
    setBought(b => new Set(b).add(item.id))
  }

  // Apply consumable effect immediately on buy (market items are also instantly usable at purchase? No — they go to inventory)
  // Actually per the feature request they go to inventory. buyConsumable already does addConsumable.

  const pct = Math.min(100, (elapsed / AUTO_LEAVE_MS) * 100)

  return (
    <div
      id="market-panel"
      className="rounded-2xl border border-indigo-900/40 dark:border-indigo-800/30 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f0c1e 0%, #1a1340 50%, #0c0f1e 100%)' }}
      onPointerDown={() => setPaused(true)}
    >
      {/* Awning */}
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #3730a3, #4f46e5, #3730a3)' }} />

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-indigo-300 font-bold text-base">
              ⚑ {isEn ? 'Market' : 'Mercado'}
            </h2>
            <p className="text-[10px] text-indigo-500/70 mt-0.5">
              {isEn
                ? `Level ${tileLevel} market — 2 consumables · 2 equipment`
                : `Mercado nível ${tileLevel} — 2 consumíveis · 2 equipamentos`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 font-bold text-sm">⬡ {gold}</div>
            <div className="text-[10px] text-yellow-600/70">{isEn ? 'gold' : 'ouro'}</div>
          </div>
        </div>

        {/* Auto-sell notice */}
        {soldGold > 0 && (
          <div className="rounded-lg bg-yellow-950/30 border border-yellow-800/30 px-3 py-1.5 text-[10px] text-yellow-400/80">
            {isEn
              ? `Auto-sell: sold items for ⬡ ${soldGold}`
              : `Auto-venda: itens vendidos por ⬡ ${soldGold}`}
          </div>
        )}

        <div className="h-px bg-indigo-900/40" />

        {/* ── Consumables ── */}
        <div>
          <p className="text-[9px] text-indigo-400/60 uppercase tracking-widest font-semibold mb-2">
            {isEn ? 'Consumables' : 'Consumíveis'}
          </p>
          <div className="flex flex-col gap-2">
            {offer.consumables.map(c => {
              const isBought  = bought.has(c.id)
              const canAfford = gold >= c.price
              const isFull    = failId === c.id
              const rarLbl    = isEn ? RARITY_LABEL_EN[c.rarity] : RARITY_LABEL_PT[c.rarity]
              return (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors',
                    'bg-indigo-950/40',
                    isBought ? 'border-green-800/40 opacity-60' : 'border-indigo-800/20',
                  )}
                >
                  <span className="text-xl shrink-0">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-semibold text-indigo-100">
                        {isEn ? c.nameEn : c.name}
                      </span>
                      <span className={cn('text-[8px] font-semibold uppercase tracking-widest', RARITY_TEXT[c.rarity])}>
                        {rarLbl}
                      </span>
                      <span className="text-[9px] text-indigo-500/60">Lv.{c.level}</span>
                    </div>
                    <div className="text-[10px] text-indigo-400/70 mt-0.5">{consumableDesc(c, isEn)}</div>
                    {isFull && (
                      <div className="text-[9px] text-red-400 mt-0.5">
                        {isEn ? 'Consumable bag full!' : 'Bolsa de consumíveis cheia!'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">⬡ {c.price}</span>
                    <button
                      onClick={() => buyConsumable(c)}
                      disabled={isBought || !canAfford}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                        isBought
                          ? 'opacity-40 cursor-not-allowed bg-green-900/20 border-green-800/30 text-green-500'
                          : canAfford
                            ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                            : 'opacity-30 cursor-not-allowed bg-indigo-900/30 border-indigo-800/30 text-indigo-500',
                      )}
                    >
                      {isBought ? (isEn ? 'Bought' : 'Comprado') : (isEn ? 'Buy' : 'Comprar')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="h-px bg-indigo-900/40" />

        {/* ── Equipment ── */}
        <div>
          <p className="text-[9px] text-indigo-400/60 uppercase tracking-widest font-semibold mb-2">
            {isEn ? 'Equipment' : 'Equipamentos'}
          </p>
          <div className="flex flex-col gap-2">
            {offer.equipment.map(item => {
              const isBought  = bought.has(item.id)
              const price     = item.price!
              const canAfford = gold >= price
              const isFull    = failId === item.id
              const rarLbl    = isEn ? RARITY_LABEL_EN[item.rarity] : RARITY_LABEL_PT[item.rarity]
              const slotName  = isEn ? SLOT_NAME_EN[item.slot] : SLOT_NAME_PT[item.slot]
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors',
                    'bg-indigo-950/40',
                    isBought ? 'border-green-800/40 opacity-60' : RARITY_BORDER[item.rarity] + '/40',
                  )}
                >
                  {/* Slot icon placeholder */}
                  <div className={cn(
                    'w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 text-[9px] font-bold',
                    RARITY_BORDER[item.rarity],
                    RARITY_TEXT[item.rarity],
                  )}>
                    {slotName?.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('text-[12px] font-semibold truncate', RARITY_TEXT[item.rarity])}>
                        {item.name}
                      </span>
                      <span className="text-[8px] font-semibold uppercase tracking-widest text-indigo-500/60">
                        {rarLbl}
                      </span>
                      <span className="text-[9px] text-indigo-500/60">Lv.{item.level}</span>
                    </div>
                    <div className="text-[10px] text-indigo-400/60 mt-0.5 truncate">
                      {itemStatLine(item, isEn)}
                    </div>
                    {isFull && (
                      <div className="text-[9px] text-red-400 mt-0.5">
                        {isEn ? 'Inventory full!' : 'Inventário cheio!'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">⬡ {price}</span>
                    <button
                      onClick={() => buyEquipment(item)}
                      disabled={isBought || !canAfford}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                        isBought
                          ? 'opacity-40 cursor-not-allowed bg-green-900/20 border-green-800/30 text-green-500'
                          : canAfford
                            ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                            : 'opacity-30 cursor-not-allowed bg-indigo-900/30 border-indigo-800/30 text-indigo-500',
                      )}
                    >
                      {isBought ? (isEn ? 'Bought' : 'Comprado') : (isEn ? 'Buy' : 'Comprar')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Spellbook words ── */}
        {wordOffers.length > 0 && (
          <>
            <div className="h-px bg-indigo-900/40" />
            <div>
              <p className="text-[9px] text-indigo-400/60 uppercase tracking-widest font-semibold mb-2">
                {isEn ? 'Arcane Words' : 'Palavras Arcanas'}
              </p>
              <div className="flex flex-col gap-2">
                {wordOffers.map(wo => {
                  const word      = WORD_MAP.get(wo.wordId)
                  if (!word) return null
                  const isBought  = bought.has(wo.wordId)
                  const canAfford = gold >= wo.price
                  const icon      = WORD_ICONS[word.id] ?? '📖'

                  // Count new spell combos this word would unlock with current known words
                  const knownIds = getKnownWordIds(
                    heroLevel, heroAttrs.inteligencia, heroAttrs.sabedoria, earnedWordIds,
                  )
                  const newCombos = knownIds.length  // 1 new word × N known = N new combos

                  const rarityBorder: Record<string, string> = {
                    rare:   'border-blue-500/50',
                    epic:   'border-purple-500/50',
                    unique: 'border-orange-500/50',
                  }
                  const rarityText: Record<string, string> = {
                    rare:   'text-blue-400',
                    epic:   'text-purple-400',
                    unique: 'text-orange-400',
                  }
                  const rarLbls: Record<string, string> = isEn
                    ? { rare: 'Rare', epic: 'Epic', unique: 'Unique' }
                    : { rare: 'Raro', epic: 'Épico', unique: 'Único' }
                  const rarLbl = rarLbls[word.rarity] ?? word.rarity

                  return (
                    <div
                      key={wo.wordId}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors bg-indigo-950/40',
                        isBought ? 'border-green-800/40 opacity-60' : rarityBorder[word.rarity] ?? 'border-indigo-800/30',
                      )}
                    >
                      <span className="text-2xl shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-[12px] font-bold', rarityText[word.rarity])}>
                            {isEn ? word.nameEn : word.namePt}
                          </span>
                          <span className={cn('text-[8px] font-semibold uppercase tracking-widest', rarityText[word.rarity])}>
                            {rarLbl}
                          </span>
                          <span className="text-[9px] text-indigo-500/60 capitalize">
                            {isEn ? word.category : word.category === 'element' ? 'elemento' : 'forma'}
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-400/60 mt-0.5">
                          {word.description}
                        </div>
                        <div className="text-[9px] text-indigo-500/70 mt-0.5">
                          {isEn
                            ? `+${newCombos} new spell${newCombos !== 1 ? 's' : ''} unlocked`
                            : `+${newCombos} novo${newCombos !== 1 ? 's' : ''} feitiço${newCombos !== 1 ? 's' : ''} desbloqueado${newCombos !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">⬡ {wo.price}</span>
                        <button
                          onClick={() => buyWord(wo)}
                          disabled={isBought || !canAfford}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
                            isBought
                              ? 'opacity-40 cursor-not-allowed bg-green-900/20 border-green-800/30 text-green-500'
                              : canAfford
                                ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                                : 'opacity-30 cursor-not-allowed bg-indigo-900/30 border-indigo-800/30 text-indigo-500',
                          )}
                        >
                          {isBought ? (isEn ? 'Learned' : 'Aprendida') : (isEn ? 'Learn' : 'Aprender')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer actions */}
        <div className="flex gap-2">
          {/* Manual sell button — opens sell mode in inventory (stays in market) */}
          <button
            onClick={() => { setSellMode(true); document.getElementById('inventory-panel')?.scrollIntoView({ behavior: 'smooth' }) }}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border border-yellow-700/40 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-900/40 transition-colors"
          >
            💰 {isEn ? 'Sell Items' : 'Vender Itens'}
          </button>

          {/* Leave button */}
          <div className="relative overflow-hidden rounded-lg flex-1">
            <button
              onClick={() => {
                exitMarket()
                resetBattle()
              }}
              className="w-full py-2 rounded-lg text-sm font-semibold border border-indigo-700/40 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-900/40 transition-colors relative z-10"
            >
              {isEn ? '← Return to Map' : '← Retornar ao Mapa'}
            </button>
            {!paused && (
              <div
                className="absolute inset-0 rounded-lg bg-indigo-600/20 origin-left transition-none pointer-events-none"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Floor */}
      <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #1e1b4b, #312e81, #1e1b4b)' }} />
    </div>
  )
}
