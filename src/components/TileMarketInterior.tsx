import { useEffect, useState } from 'react'
import { useMapStore, generateTileMarketOffer, gridKey, tileMarketPrice } from '../store/mapStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useSettingsStore } from '../store/settingsStore'
import { useUIStore } from '../store/uiStore'
import { getDerivedStats } from '../formulas/derived'
import { getEquipmentBonuses } from '../formulas/items'
import { cn } from '../lib/utils'
import type { Direction, MapTile, TileMarketOffer } from '../types/map'

const AUTO_LEAVE_MS = 6000
const DIR_LABEL: Record<Direction, string> = { N: 'N', S: 'S', E: 'E', W: 'W' }

function TilePreview({ tile }: { tile: MapTile }) {
  const pipe = '#2f3a50'
  const node = '#40516f'
  return (
    <div
      className="relative h-14 w-14 shrink-0 rounded-lg border border-sky-500/30 bg-slate-950"
      title={`Lv.${tile.level} - ${tile.connections.length} exits`}
    >
      <svg viewBox="0 0 52 52" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {tile.connections.includes('N') && <rect x="21" y="0" width="10" height="26" rx="2" fill={pipe} />}
        {tile.connections.includes('S') && <rect x="21" y="26" width="10" height="26" rx="2" fill={pipe} />}
        {tile.connections.includes('E') && <rect x="26" y="21" width="26" height="10" rx="2" fill={pipe} />}
        {tile.connections.includes('W') && <rect x="0" y="21" width="26" height="10" rx="2" fill={pipe} />}
        <circle cx="26" cy="26" r="6" fill={node} />
      </svg>
      <div className="absolute bottom-1 left-1 rounded bg-slate-950/80 px-1 text-[9px] font-black tabular-nums text-sky-300">
        {tile.level}
      </div>
    </div>
  )
}

export default function TileMarketInterior() {
  const exitMarket = useMapStore(s => s.exitMarket)
  const addDeckTile = useMapStore(s => s.addDeckTile)
  const saveTileMarketOffer = useMapStore(s => s.saveTileMarketOffer)
  const marketPos = useMapStore(s => s.playerPos)
  const marketKey = gridKey(marketPos.x, marketPos.y)
  const tileLevel = useMapStore(s => s.grid[marketKey]?.level ?? 1)
  const savedOffer = useMapStore(s => s.tileMarketOffers[marketKey])

  const gold = useHeroStore(s => s.gold)
  const spendGold = useHeroStore(s => s.spendGold)
  const heroLevel = useHeroStore(s => s.level)
  const heroAttrs = useHeroStore(s => s.attributes)
  const equipment = useInventoryStore(s => s.equipment)
  const deckSize = useMapStore(s => s.deck.length)
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'

  const sceneAuto = useUIStore(s => s.sceneAuto)
  const configureSceneAuto = useUIStore(s => s.configureSceneAuto)
  const setSceneAutoElapsed = useUIStore(s => s.setSceneAutoElapsed)
  const pauseSceneAuto = useUIStore(s => s.pauseSceneAuto)
  const clearSceneAuto = useUIStore(s => s.clearSceneAuto)

  const goldEfficiency = getDerivedStats(heroAttrs, getEquipmentBonuses(equipment), heroLevel).goldEfficiency
  const eff = (base: number) => Math.max(1, Math.round(base / goldEfficiency))

  const [offer] = useState<TileMarketOffer>(() => savedOffer ?? generateTileMarketOffer(tileLevel, 4))
  const [bought, setBought] = useState<Set<string>>(() => new Set(savedOffer?.boughtIds ?? []))
  const elapsed = sceneAuto.kind === 'market' ? sceneAuto.elapsedMs : 0
  const paused = sceneAuto.kind === 'market' ? sceneAuto.paused : false
  const pct = Math.min(100, (elapsed / AUTO_LEAVE_MS) * 100)

  useEffect(() => {
    if (!savedOffer) saveTileMarketOffer(marketKey, offer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    configureSceneAuto('market', AUTO_LEAVE_MS, true)
    return () => clearSceneAuto('market')
  }, [clearSceneAuto, configureSceneAuto])

  useEffect(() => {
    if (paused) return
    const startedAt = Date.now() - elapsed
    const id = setInterval(() => {
      const current = Date.now() - startedAt
      if (current >= AUTO_LEAVE_MS) {
        clearInterval(id)
        exitMarket()
      } else {
        setSceneAutoElapsed(current)
      }
    }, 50)
    return () => clearInterval(id)
  }, [paused]) // eslint-disable-line react-hooks/exhaustive-deps

  function markBought(id: string) {
    const next = new Set(bought)
    next.add(id)
    setBought(next)
    saveTileMarketOffer(marketKey, { ...offer, boughtIds: Array.from(next) })
  }

  function buyTile(tile: MapTile & { price: number }) {
    pauseSceneAuto()
    if (bought.has(tile.id)) return
    const price = eff(tileMarketPrice(tile))
    if (!spendGold(price)) return
    addDeckTile(tile)
    markBought(tile.id)
  }

  return (
    <div
      id="tile-market-panel"
      className="overflow-hidden rounded-2xl border border-sky-900/40 dark:border-sky-800/30"
      style={{ background: 'linear-gradient(160deg, #07111f 0%, #10233e 50%, #07131d 100%)' }}
      onPointerDown={pauseSceneAuto}
    >
      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #0e7490, #38bdf8, #0e7490)' }} />

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-sky-200">
              ▦ {isEn ? 'Tile Market' : 'Mercado de Tiles'}
            </h2>
            <p className="mt-0.5 text-[10px] text-sky-500/75">
              {isEn
                ? `Level ${tileLevel} tiles - bought tiles can exceed deck limit`
                : `Tiles nivel ${tileLevel} - compras podem exceder o limite do deck`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-yellow-400">⬡ {gold}</div>
            <div className="text-[10px] text-sky-500/70">Deck {deckSize}</div>
          </div>
        </div>

        <div className="h-px bg-sky-900/40" />

        <div className="grid grid-cols-1 gap-2">
          {offer.tiles.map(tile => {
            const isBought = bought.has(tile.id)
            const basePrice = tileMarketPrice(tile)
            const price = eff(basePrice)
            const canAfford = gold >= price
            return (
              <div
                key={tile.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border bg-sky-950/35 px-3 py-2.5 transition-colors',
                  isBought ? 'border-emerald-800/40 opacity-60' : 'border-sky-800/35',
                )}
              >
                <TilePreview tile={tile} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-bold text-sky-100">
                      {isEn ? 'Path tile' : 'Tile de caminho'}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-sky-400/70">
                      Lv.{tile.level}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-cyan-300/80">
                      {tile.connections.length} {isEn ? 'exits' : 'saidas'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tile.connections.map(dir => (
                      <span key={dir} className="rounded border border-sky-700/40 bg-sky-950/60 px-1.5 py-0.5 text-[9px] font-bold text-sky-300">
                        {DIR_LABEL[dir]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-semibold tabular-nums text-yellow-400">
                    ⬡ {price}
                    {price < basePrice && <span className="ml-0.5 text-[9px] text-emerald-400 line-through opacity-60">{basePrice}</span>}
                  </span>
                  <button
                    onClick={() => buyTile(tile)}
                    disabled={isBought || !canAfford}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                      isBought
                        ? 'cursor-not-allowed border-emerald-800/30 bg-emerald-900/20 text-emerald-500 opacity-40'
                        : canAfford
                          ? 'border-sky-500 bg-sky-600 text-white hover:bg-sky-500'
                          : 'cursor-not-allowed border-sky-800/30 bg-sky-900/30 text-sky-500 opacity-30',
                    )}
                  >
                    {isBought ? (isEn ? 'Bought' : 'Comprado') : (isEn ? 'Buy' : 'Comprar')}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative overflow-hidden rounded-lg">
          <button
            onClick={exitMarket}
            className="relative z-10 w-full rounded-lg border border-sky-700/40 bg-sky-900/20 py-2 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-900/40"
          >
            {isEn ? '< Return to Map' : '< Retornar ao Mapa'}
          </button>
          {!paused && (
            <div
              className="pointer-events-none absolute inset-0 origin-left rounded-lg bg-sky-500/20 transition-none"
              style={{ transform: `scaleX(${pct / 100})` }}
            />
          )}
        </div>
      </div>

      <div className="h-2 w-full" style={{ background: 'linear-gradient(90deg, #0c4a6e, #0369a1, #0c4a6e)' }} />
    </div>
  )
}
