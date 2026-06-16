import { useEffect, useMemo, useState } from 'react'
import { useHeroStore } from '../store/heroStore'
import { usePartyStore } from '../store/partyStore'
import { useSettingsStore } from '../store/settingsStore'
import { npcClassLabel, npcLevel, npcRaceLabel } from '../formulas/npcs'
import { usePartyAttributeBonus, hasAttributeBonus } from '../lib/partyBonuses'
import { partySlotColor } from '../lib/partySlots'
import { cn } from '../lib/utils'
import PartyNpcSprite from './icons/party/PartyNpcSprite'
import type { PartyMemberMode, PartyNpc } from '../types/party'

const ATTR_LABEL_PT = { forca: 'FOR', vitalidade: 'VIT', agilidade: 'AGI', destreza: 'DES', inteligencia: 'INT', sabedoria: 'SAB', carisma: 'CAR' }
const ATTR_LABEL_EN = { forca: 'STR', vitalidade: 'VIT', agilidade: 'AGI', destreza: 'DEX', inteligencia: 'INT', sabedoria: 'WIS', carisma: 'CHA' }
const ATTR_KEYS = ['forca', 'vitalidade', 'agilidade', 'destreza', 'inteligencia', 'sabedoria', 'carisma'] as const

function NpcPortrait({ npc, compact = false, color }: { npc: PartyNpc; compact?: boolean; color?: string }) {
  const accent = color ?? npc.color
  return (
    <PartyNpcSprite
      seed={npc.id}
      accent={accent}
      size={compact ? 34 : 50}
      title={npc.name}
      className="shrink-0"
    />
  )
}

function formatLogTime(createdAt: number) {
  return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function ModeButton({ active, mode, onClick, isEn }: { active: boolean; mode: PartyMemberMode; onClick: () => void; isEn: boolean }) {
  const label = mode === 'follow' ? (isEn ? 'Follow' : 'Seguir') : (isEn ? 'Explore' : 'Explorar')
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-colors',
        active ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
      )}
    >
      {label}
    </button>
  )
}

export default function PartyPanel() {
  const lang = useSettingsStore(s => s.lang)
  const isEn = lang === 'en'
  const heroLevel = useHeroStore(s => s.level)
  const knownNpcs = usePartyStore(s => s.knownNpcs)
  const slots = usePartyStore(s => s.slots)
  const ensureStarterNpcs = usePartyStore(s => s.ensureStarterNpcs)
  const assignToSlot = usePartyStore(s => s.assignToSlot)
  const removeFromSlot = usePartyStore(s => s.removeFromSlot)
  const setSlotMode = usePartyStore(s => s.setSlotMode)
  const fightLog = usePartyStore(s => s.fightLog)
  const recruitOffers = usePartyStore(s => s.recruitOffers)
  const acceptRecruit = usePartyStore(s => s.acceptRecruit)
  const dismissRecruit = usePartyStore(s => s.dismissRecruit)
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)
  const partyBonus = usePartyAttributeBonus(heroLevel)
  const attrLabels = isEn ? ATTR_LABEL_EN : ATTR_LABEL_PT

  useEffect(() => {
    ensureStarterNpcs(heroLevel)
  }, [ensureStarterNpcs, heroLevel])

  const selectedNpc = useMemo(() => knownNpcs.find(npc => npc.id === selectedNpcId) ?? knownNpcs[0] ?? null, [knownNpcs, selectedNpcId])
  const assignedIds = new Set(slots.map(slot => slot.memberId).filter(Boolean))

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight">{isEn ? 'Party' : 'Grupo'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isEn ? 'Known NPCs can follow you or explore the placed map.' : 'NPCs conhecidos podem seguir voce ou explorar o mapa colocado.'}
            </p>
          </div>
          {hasAttributeBonus(partyBonus) && (
            <div className="ml-auto rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{isEn ? 'Follower bonus' : 'Bonus de seguidores'}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {ATTR_KEYS.filter(key => partyBonus[key] > 0).map(key => `${attrLabels[key]} +${partyBonus[key].toFixed(1)}`).join('  ')}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {slots.map((slot, index) => {
          const npc = knownNpcs.find(n => n.id === slot.memberId)
          const slotColor = partySlotColor(slot.id)
          return (
            <div key={slot.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-center gap-2">
                {npc ? (
                  <NpcPortrait npc={npc} color={slotColor} />
                ) : (
                  <div
                    className="h-12 w-12 rounded-full border border-dashed border-slate-300 dark:border-slate-700"
                    style={{ boxShadow: `inset 0 0 0 3px ${slotColor}33` }}
                  />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slotColor }} />
                    Slot {index + 1}
                  </p>
                  <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{npc ? (isEn ? npc.nameEn : npc.name) : (isEn ? 'Empty' : 'Vazio')}</p>
                  {npc && <p className="text-[10px] text-slate-500">{npcClassLabel(npc.class, isEn)} - {isEn ? 'Lv.' : 'Nv.'}{npcLevel(heroLevel, npc)}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <ModeButton active={slot.mode === 'follow'} mode="follow" isEn={isEn} onClick={() => setSlotMode(slot.id, 'follow')} />
                <ModeButton active={slot.mode === 'explore'} mode="explore" isEn={isEn} onClick={() => setSlotMode(slot.id, 'explore')} />
                {npc && <button type="button" onClick={() => removeFromSlot(slot.id)} className="ml-auto rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{isEn ? 'Remove' : 'Remover'}</button>}
              </div>
              {npc && slot.mode === 'explore' && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-slate-100 dark:bg-slate-800/70 px-2 py-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span title={isEn ? 'Current map position' : 'Posição atual no mapa'}>📍 {npc.explorerPos.x},{npc.explorerPos.y}</span>
                  <span className="text-emerald-500 font-bold" title={isEn ? 'Wins' : 'Vitórias'}>✓ {npc.explorerWins}</span>
                  <span className="text-rose-500 font-bold" title={isEn ? 'Losses' : 'Derrotas'}>✗ {npc.explorerLosses}</span>
                  {npc.lastRewardText && <span className="font-semibold text-slate-600 dark:text-slate-300">{npc.lastRewardText}</span>}
                </div>
              )}
              {!npc && selectedNpc && <button type="button" onClick={() => assignToSlot(slot.id, selectedNpc.id)} className="mt-3 w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-500">{isEn ? 'Assign selected' : 'Inserir selecionado'}</button>}
            </div>
          )
        })}
      </section>

      {recruitOffers.length > 0 && (
        <section className="rounded-xl border border-purple-400/30 bg-purple-50/70 dark:bg-purple-950/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-purple-700 dark:text-purple-300">
              {isEn ? 'Rescued NPCs' : 'NPCs resgatados'}
            </h3>
            <span className="text-[10px] font-bold text-purple-500">{recruitOffers.length}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {recruitOffers.map(({ npc }) => (
              <div key={npc.id} className="flex items-center gap-2 rounded-lg border border-purple-400/20 bg-white/80 dark:bg-slate-950/40 p-2">
                <NpcPortrait npc={npc} compact color="#a855f7" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">{isEn ? npc.nameEn : npc.name}</p>
                  <p className="text-[10px] text-slate-500">{npcRaceLabel(npc.race, isEn)} - {npcClassLabel(npc.class, isEn)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => acceptRecruit(npc.id)}
                  className="rounded-md bg-purple-600 px-2 py-1 text-[10px] font-black text-white hover:bg-purple-500"
                >
                  {isEn ? 'Invite' : 'Chamar'}
                </button>
                <button
                  type="button"
                  onClick={() => dismissRecruit(npc.id)}
                  className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isEn ? 'Skip' : 'Recusar'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">{isEn ? 'Explorer fight log' : 'Log de lutas dos exploradores'}</h3>
          <span className="text-[10px] font-bold text-slate-400">{fightLog.length}/40</span>
        </div>
        {fightLog.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {isEn ? 'Explorer fights will appear here after player victories.' : 'As lutas dos exploradores aparecem aqui depois das vitorias do player.'}
          </p>
        ) : (
          <div className="mt-3 max-h-52 overflow-y-auto space-y-1.5">
            {fightLog.map(entry => {
              const slotColor = partySlotColor(entry.slotId)
              return (
                <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/35 px-2.5 py-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slotColor }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                      {isEn ? entry.npcNameEn : entry.npcName}{' '}
                      <span className={entry.won ? 'text-emerald-500' : 'text-rose-500'}>
                        {entry.won ? (isEn ? 'defeated' : 'venceu') : (isEn ? 'lost to' : 'perdeu para')}
                      </span>{' '}
                      {isEn ? entry.enemyNameEn : entry.enemyName} Lv.{entry.enemyLevel}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatLogTime(entry.createdAt)} - {entry.x},{entry.y}
                      {entry.won && ` - +${entry.xp} XP / +${entry.gold}g${entry.itemFound ? (isEn ? ' / item' : ' / item') : ''}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">{isEn ? 'Known NPCs' : 'NPCs conhecidos'}</h3>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {knownNpcs.map(npc => {
              const selected = selectedNpc?.id === npc.id
              const assigned = assignedIds.has(npc.id)
              return (
                <button key={npc.id} type="button" onClick={() => setSelectedNpcId(npc.id)} className={cn('flex items-center gap-2 rounded-lg border p-2 text-left transition-colors', selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60')}>
                  <NpcPortrait npc={npc} compact />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{isEn ? npc.nameEn : npc.name}</p>
                    <p className="text-[10px] text-slate-500">{npcRaceLabel(npc.race, isEn)} - {npcClassLabel(npc.class, isEn)}</p>
                  </div>
                  {assigned && <span className="ml-auto text-[10px] font-black text-indigo-500">{isEn ? 'In party' : 'Na party'}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-amber-300/40 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-950/15 p-3">
            <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-700 dark:text-amber-300">
              🐾 Pets
              <span className="rounded bg-amber-200/80 dark:bg-amber-800/60 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800 dark:text-amber-200">
                {isEn ? 'Soon' : 'Em breve'}
              </span>
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {isEn
                ? 'Pets will join the same party slots with their own progression — companions that follow or farm for you.'
                : 'Pets vão ocupar os mesmos slots da party com progressão própria — companheiros que seguem ou farmam por você.'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">{isEn ? 'Friends' : 'Amigos'}</h3>
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">{isEn ? 'Friend Code support will use these same party slots after the backend social layer is ready.' : 'Friend Code vai usar estes mesmos slots quando a camada social do backend estiver pronta.'}</p>
              <input disabled placeholder="Friend Code" className="mt-3 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 px-3 py-2 text-xs text-slate-400 outline-none" />
            </div>
          </div>
        </aside>
      </section>

      {selectedNpc && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center gap-3">
            <NpcPortrait npc={selectedNpc} />
            <div>
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">{isEn ? selectedNpc.nameEn : selectedNpc.name}</h3>
              <p className="text-xs text-slate-500">{npcRaceLabel(selectedNpc.race, isEn)} - {npcClassLabel(selectedNpc.class, isEn)} - {isEn ? 'Lv.' : 'Nv.'}{npcLevel(heroLevel, selectedNpc)}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {ATTR_KEYS.map(key => (
              <div key={key} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1">
                <p className="text-[9px] font-black text-slate-400">{attrLabels[key]}</p>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{Math.round(selectedNpc.attributes[key])}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{isEn ? 'Spells' : 'Magias'}: {selectedNpc.spellIds.join(', ')}</p>
          {selectedNpc.lastRewardText && <p className="mt-1 text-xs font-bold text-emerald-500">{selectedNpc.lastRewardText}</p>}
        </section>
      )}
    </div>
  )
}
