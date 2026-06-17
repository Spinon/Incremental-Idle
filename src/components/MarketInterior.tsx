import { useEffect, useState } from 'react'
import { useMapStore, gridKey } from '../store/mapStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useHeroStore } from '../store/heroStore'
import { useSettingsStore } from '../store/settingsStore'
import { useSpellStore, getKnownWordIds } from '../store/spellStore'
import { useUIStore } from '../store/uiStore'
import { wordSandPrice, wordBitPrice, wordSandOfferAmount, wordBitOfferAmount, ATTR_LABEL_PT, ATTR_LABEL_EN, getEquipmentBonuses, generateItem, generateConsumable, getItemDisplayName } from '../formulas/items'
import { MarketSpriteIcon } from './icons/ArcaneIcons'
import { getDerivedStats } from '../formulas/derived'
import { WORD_MAP } from '../data/words'
import { WORD_ICONS } from '../data/spells'
import { cn } from '../lib/utils'
import type { Item, Consumable, ItemRarity, ItemStats, MarketOffer, WordOffer, WordSandOffer, WordBitOffer } from '../types/item'

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
    case 'resetAttrs':
      return isEn
        ? `+${Math.round(c.magnitude)} free attribute refund${Math.round(c.magnitude) !== 1 ? 's' : ''}`
        : `+${Math.round(c.magnitude)} refund${Math.round(c.magnitude) !== 1 ? 's' : ''} gratis`
    case 'normalizeTile':
      return isEn ? 'Sets a map or deck tile to hero level' : 'Iguala um tile do mapa ou deck ao nivel do heroi'
    case 'shield':
      return `${isEn ? 'Shield' : 'Escudo'} ${Math.round(c.magnitude)}`
    case 'statBuff':
      return formatConsumableBuff(c, isEn)
    case 'physicalDamage':
      return `${Math.round(c.magnitude)} ${isEn ? 'physical damage' : 'dano fisico'}`
    case 'enemyDebuff':
      return `${isEn ? 'Weakens enemy' : 'Enfraquece inimigo'} (${c.durationTurns ?? 2} ${isEn ? 'turns' : 'turnos'})`
  }
}

const PERCENT_CONSUMABLE_STATS = new Set<keyof ItemStats>(['atkSpeed', 'moveSpeed', 'dropChance', 'goldMult', 'xpBonus'])

function formatConsumableStatValue(stat: keyof ItemStats | undefined, value: number): string {
  if (stat && PERCENT_CONSUMABLE_STATS.has(stat)) {
    return `+${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
  }
  return `+${Math.round(value)}`
}

function formatConsumableBuff(c: Consumable, isEn: boolean): string {
  const labels: Partial<Record<keyof ItemStats, [string, string]>> = {
    atk: ['ATK', 'ATK'],
    def: ['DEF', 'DEF'],
    atkSpeed: ['Vel.Atk', 'AtkSpd'],
    magicDamage: ['Magico', 'Magic'],
    dropChance: ['Drop', 'Drop'],
    xpBonus: ['Bonus XP', 'XP Bonus'],
  }
  const stat = c.stat
  const statLabel = stat ? labels[stat]?.[isEn ? 1 : 0] ?? stat : (isEn ? 'stat' : 'atributo')
  const duration = c.durationTurns ?? 1
  const durationUnit = c.durationUnit ?? (c.stat === 'xpBonus' ? 'turn' : 'battle')
  const unit = durationUnit === 'turn'
    ? (isEn ? `turn${duration === 1 ? '' : 's'}` : `turno${duration === 1 ? '' : 's'}`)
    : (isEn ? `battle${duration === 1 ? '' : 's'}` : `combate${duration === 1 ? '' : 's'}`)
  return `${formatConsumableStatValue(stat, c.magnitude)} ${statLabel} (${duration} ${unit})`
}

// ─── Equipment stat summary (brief) ──────────────────────────────────────────

const PERCENT_ITEM_STATS = new Set([
  'atkSpeed', 'moveSpeed', 'dropChance', 'goldMult', 'xpBonus',
  'critChance', 'accuracy', 'resIgnea', 'resGlacial', 'resSombria', 'resVital',
])

function itemDisplayName(item: Item, isEn: boolean): string {
  return getItemDisplayName(item, isEn)
}

function formatMarketStat(key: string, value: number): string {
  if (PERCENT_ITEM_STATS.has(key)) {
    return `+${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
  }
  return `+${Math.round(value)}`
}

function itemStatLine(item: Item, isEn: boolean): string {
  const LABELS: Record<string, [string, string]> = {
    atk: ['ATK', 'ATK'], def: ['DEF', 'DEF'], hp: ['HP', 'HP'],
    atkSpeed: ['Vel.Atk', 'AtkSpd'], magicDamage: ['Mágico', 'Magic'],
    vision: ['Visão', 'Vision'], moveSpeed: ['Mov', 'Move'],
    dropChance: ['Drop', 'Drop'], goldMult: ['Ouro', 'Gold'], xpBonus: ['XP+', 'XP+'],
    critChance: ['Crít', 'Crit'], accuracy: ['Prec', 'Acc'],
    resIgnea: ['R.Íg', 'F.Res'], resGlacial: ['R.Gl', 'I.Res'],
    resSombria: ['R.So', 'S.Res'], resVital: ['R.Vi', 'V.Res'],
  }
  const parts = Object.entries(item.stats).map(([k, v]) => {
    const lbl = LABELS[k]?.[isEn ? 1 : 0] ?? k
    const val = typeof v === 'number'
      ? formatMarketStat(k, v)
      : String(v)
    return `${lbl} ${val}`
  })
  // Set bonus suffix
  if (item.setBonus) {
    const lbl = LABELS[item.setBonus.stat]?.[isEn ? 1 : 0] ?? item.setBonus.stat
    const val = formatMarketStat(item.setBonus.stat, item.setBonus.value)
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
  const exitMarket   = useMapStore(s => s.exitMarket)
  const setSellMode  = useInventoryStore(s => s.setSellMode)
  const lang       = useSettingsStore(s => s.lang)
  const isEn       = lang === 'en'
  const sceneAuto      = useUIStore(s => s.sceneAuto)
  const configureSceneAuto = useUIStore(s => s.configureSceneAuto)
  const setSceneAutoElapsed = useUIStore(s => s.setSceneAutoElapsed)
  const pauseSceneAuto = useUIStore(s => s.pauseSceneAuto)
  const clearSceneAuto = useUIStore(s => s.clearSceneAuto)
  const setActiveTab = useUIStore(s => s.setActiveTab)

  function leaveMarket() {
    setSellMode(false)
    exitMarket()
  }

  useEffect(() => {
    return () => setSellMode(false)
  }, [setSellMode])

  // Tile level and position — shop is generated at the tile's level
  const marketPos = useMapStore(s => s.playerPos)
  const marketKey = gridKey(marketPos.x, marketPos.y)
  const tileLevel = useMapStore(s =>
    s.grid[marketKey]?.level ?? 1
  )

  const gold      = useHeroStore(s => s.gold)
  const spendGold = useHeroStore(s => s.spendGold)

  const addItem        = useInventoryStore(s => s.addItem)
  const addConsumable  = useInventoryStore(s => s.addConsumable)

  const addWordSand   = useSpellStore(s => s.addWordSand)
  const grantWordBitCredits = useSpellStore(s => s.grantWordBitCredits)
  const earnedWordIds = useSpellStore(s => s.earnedWordIds)
  const heroLevel     = useHeroStore(s => s.level)
  const heroAttrs     = useHeroStore(s => s.attributes)
  const equipment     = useInventoryStore(s => s.equipment)
  const tilesPlaced   = useMapStore(s => s.tilesPlaced)
  const savedOffer    = useMapStore(s => s.marketOffers[marketKey])
  const saveOffer     = useMapStore(s => s.saveMarketOffer)

  // Carisma-based market discount: prices divided by goldEfficiency
  const goldEfficiency = getDerivedStats(heroAttrs, getEquipmentBonuses(equipment), heroLevel).goldEfficiency
  /** Effective buy price after Carisma discount. */
  const eff = (base: number) => Math.max(1, Math.round(base / goldEfficiency))

  // Use the saved offer for this tile, or generate one on first visit.
  // This prevents refresh-to-reroll exploits — the same shop persists
  // until the player starts a new journey.
  const [offer] = useState<MarketOffer>(() => {
    if (savedOffer) return savedOffer
    // First visit: generate at the tile's level (items scale with tile difficulty)
    // Fisher-Yates pick — sort(() => Math.random() - 0.5) is a biased shuffle
    const sandAmount = wordSandOfferAmount(tileLevel, tilesPlaced)
    const bitAmount = wordBitOfferAmount(tileLevel, tilesPlaced)

    return {
      consumables: [generateConsumable(tileLevel), generateConsumable(tileLevel)],
      equipment:   [generateItem(tileLevel, true),  generateItem(tileLevel, true)],
      words:       [],
      wordSand:    [{ id: `ws_${marketKey}`, amount: sandAmount, price: wordSandPrice(sandAmount, tileLevel) }],
      wordBits:    [{ id: `wb_${marketKey}`, amount: bitAmount, price: wordBitPrice(bitAmount, tileLevel) }],
    }
  })

  // Persist the offer so re-entering shows the same shop
  useEffect(() => {
    if (!savedOffer) saveOffer(marketKey, offer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const wordSandOffers: WordSandOffer[] = offer.wordSand ?? [{
    id: `ws_${marketKey}`,
    amount: wordSandOfferAmount(tileLevel, tilesPlaced),
    price: wordSandPrice(wordSandOfferAmount(tileLevel, tilesPlaced), tileLevel),
  }]
  const wordBitOffers: WordBitOffer[] = offer.wordBits ?? [{
    id: `wb_${marketKey}`,
    amount: wordBitOfferAmount(tileLevel, tilesPlaced),
    price: wordBitPrice(wordBitOfferAmount(tileLevel, tilesPlaced), tileLevel),
  }]
  const wordOffers: WordOffer[] = []
  // Track what was bought from this persisted market tile.
  const [bought, setBought]   = useState<Set<string>>(() => new Set(savedOffer?.boughtIds ?? []))
  const [soldGold, setSoldGold] = useState(0)
  const elapsed = sceneAuto.kind === 'market' ? sceneAuto.elapsedMs : 0
  const paused  = sceneAuto.kind === 'market' ? sceneAuto.paused : false
  // Feedback for failed buys (inventory full)
  const [failId, setFailId]    = useState<string | null>(null)

  useEffect(() => {
    configureSceneAuto('market', AUTO_LEAVE_MS, true)
    return () => clearSceneAuto('market')
  }, [clearSceneAuto, configureSceneAuto])

  // Auto-sell on entry
  useEffect(() => {
    const g = useInventoryStore.getState().performAutoSell()
    if (g > 0) { useHeroStore.getState().earnGold(g); setSoldGold(g) }
  }, [])

  // Auto-leave timer — uses the same exit path as the button
  useEffect(() => {
    if (paused) return
    const startedAt = Date.now() - elapsed
    const id = setInterval(() => {
      const current = Date.now() - startedAt
      if (current >= AUTO_LEAVE_MS) {
        clearInterval(id)
        // exitMarket repositions the hero to a random adjacent tile and
        // sets scene='map'. The game loop will call moveOneStep on the next
        // tick to start the first battle after the market naturally.
        leaveMarket()
      } else {
        setSceneAutoElapsed(current)
      }
    }, 50)
    return () => clearInterval(id)
  }, [paused]) // eslint-disable-line react-hooks/exhaustive-deps

  function showFail(id: string) {
    setFailId(id)
    setTimeout(() => setFailId(f => f === id ? null : f), 1400)
  }

  function markBought(id: string) {
    // Keep the store write OUTSIDE the setState updater — updaters run during
    // the render phase, and writing to mapStore there triggers React's
    // "Cannot update a component while rendering" error.
    const next = new Set(bought)
    next.add(id)
    setBought(next)
    saveOffer(marketKey, { ...offer, boughtIds: Array.from(next) })
  }

  function buyConsumable(c: Consumable) {
    pauseSceneAuto()
    if (bought.has(c.id)) return
    const price = eff(c.price)
    if (!spendGold(price)) return
    const ok = addConsumable(c)
    if (!ok) { useHeroStore.getState().earnGold(price); showFail(c.id); return }
    markBought(c.id)
  }

  function buyWord(wo: WordOffer) {
    pauseSceneAuto()
    if (bought.has(wo.wordId)) return
    if (!spendGold(eff(wo.price))) return
    markBought(wo.wordId)
  }

  function buyWordSand(wo: WordSandOffer) {
    pauseSceneAuto()
    if (bought.has(wo.id)) return
    if (!spendGold(eff(wo.price))) return
    addWordSand(wo.amount)
    markBought(wo.id)
  }

  function buyWordBits(wo: WordBitOffer) {
    pauseSceneAuto()
    if (bought.has(wo.id)) return
    if (!spendGold(eff(wo.price))) return
    grantWordBitCredits(wo.amount)
    markBought(wo.id)
  }

  function buyEquipment(item: Item) {
    pauseSceneAuto()
    if (bought.has(item.id)) return
    const price = eff(item.price!)
    if (!spendGold(price)) return
    const ok = addItem(item as Item)
    if (!ok) { useHeroStore.getState().earnGold(price); showFail(item.id); return }
    markBought(item.id)
  }

  // Apply consumable effect immediately on buy (market items are also instantly usable at purchase? No — they go to inventory)
  // Actually per the feature request they go to inventory. buyConsumable already does addConsumable.

  const pct = Math.min(100, (elapsed / AUTO_LEAVE_MS) * 100)

  return (
    <div
      id="market-panel"
      className="rounded-2xl border border-indigo-900/40 dark:border-indigo-800/30 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f0c1e 0%, #1a1340 50%, #0c0f1e 100%)' }}
      onPointerDown={pauseSceneAuto}
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
              // Compare against the DISCOUNTED price — buyConsumable charges eff()
              const canAfford = gold >= eff(c.price)
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
                    <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">
                      ⬡ {eff(c.price)}
                      {eff(c.price) < c.price && <span className="text-[9px] text-emerald-400 ml-0.5 line-through opacity-60">{c.price}</span>}
                    </span>
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
              const canAfford = gold >= eff(price)
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
                        {itemDisplayName(item, isEn)}
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
                    <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">
                      ⬡ {eff(price)}
                      {eff(price) < price && <span className="text-[9px] text-emerald-400 ml-0.5 line-through opacity-60">{price}</span>}
                    </span>
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

        {/* Arcane resources */}
        {(wordSandOffers.length > 0 || wordBitOffers.length > 0) && (
          <>
            <div className="h-px bg-indigo-900/40" />
            <div>
              <p className="text-[9px] text-indigo-400/60 uppercase tracking-widest font-semibold mb-2">
                {isEn ? 'Arcane Resources' : 'Recursos Arcanos'}
              </p>
              <div className="flex flex-col gap-2">
                {wordSandOffers.map(wo => {
                  const isBought = bought.has(wo.id)
                  const canAfford = gold >= eff(wo.price)
                  return (
                    <div
                      key={wo.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors bg-indigo-950/40',
                        isBought ? 'border-green-800/40 opacity-60' : 'border-cyan-500/40',
                      )}
                    >
                      <MarketSpriteIcon name="wordSand" className="shrink-0" size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12px] font-bold text-cyan-300">+{wo.amount} WS</span>
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-cyan-500/80">
                            {isEn ? 'magic resource' : 'recurso magico'}
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-400/60 mt-0.5">
                          {isEn
                            ? 'Used to generate word bits and create spells.'
                            : 'Usada para gerar pedacos de palavra e criar magias.'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">
                          ⬡ {eff(wo.price)}
                          {eff(wo.price) < wo.price && <span className="text-[9px] text-emerald-400 ml-0.5 line-through opacity-60">{wo.price}</span>}
                        </span>
                        <button
                          onClick={() => buyWordSand(wo)}
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
                {wordBitOffers.map(wo => {
                  const isBought = bought.has(wo.id)
                  const canAfford = gold >= eff(wo.price)
                  return (
                    <div
                      key={wo.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors bg-indigo-950/40',
                        isBought ? 'border-green-800/40 opacity-60' : 'border-violet-500/40',
                      )}
                    >
                      <MarketSpriteIcon name="wordBit" className="shrink-0" size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12px] font-bold text-violet-300">+{wo.amount} WB</span>
                          <span className="text-[8px] font-semibold uppercase tracking-widest text-violet-500/80">
                            {isEn ? 'free generations' : 'geracoes gratis'}
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-400/60 mt-0.5">
                          {isEn
                            ? `Grants ${wo.amount} free use${wo.amount !== 1 ? 's' : ''} of the Generate Word Bit button (no Word Sand spent).`
                            : `Concede ${wo.amount} uso${wo.amount !== 1 ? 's' : ''} gratis do botao Gerar Pedaco de Palavra (sem gastar Areia de Palavra).`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">
                          ⬡ {eff(wo.price)}
                          {eff(wo.price) < wo.price && <span className="text-[9px] text-emerald-400 ml-0.5 line-through opacity-60">{wo.price}</span>}
                        </span>
                        <button
                          onClick={() => buyWordBits(wo)}
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
          </>
        )}

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
                  const canAfford = gold >= eff(wo.price)
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
                            {word.nameEn}
                          </span>
                          {!isEn && word.namePt !== word.nameEn && (
                            <span className="text-[9px] text-indigo-500/60">
                              {word.namePt}
                            </span>
                          )}
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
                        <span className="text-[11px] text-yellow-500 font-semibold tabular-nums">
                          ⬡ {eff(wo.price)}
                          {eff(wo.price) < wo.price && <span className="text-[9px] text-emerald-400 ml-0.5 line-through opacity-60">{wo.price}</span>}
                        </span>
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
            onClick={() => { setSellMode(true); setActiveTab('equips') }}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border border-yellow-700/40 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-900/40 transition-colors"
          >
            💰 {isEn ? 'Sell Items' : 'Vender Itens'}
          </button>

          {/* Leave button */}
          <div className="relative overflow-hidden rounded-lg flex-1">
            <button
              onClick={() => {
                // exitMarket repositions to a random adjacent tile.
                // No resetBattle — the next battle starts naturally via moveOneStep.
                leaveMarket()
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
