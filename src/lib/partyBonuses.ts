import type { Attributes } from '../types/hero'
import { usePartyStore } from '../store/partyStore'

const ATTR_KEYS = ['forca', 'vitalidade', 'agilidade', 'destreza', 'inteligencia', 'sabedoria', 'carisma'] as const

export function addAttributes(base: Attributes, bonus: Attributes): Attributes {
  return {
    forca: base.forca + bonus.forca,
    vitalidade: base.vitalidade + bonus.vitalidade,
    agilidade: base.agilidade + bonus.agilidade,
    destreza: base.destreza + bonus.destreza,
    inteligencia: base.inteligencia + bonus.inteligencia,
    sabedoria: base.sabedoria + bonus.sabedoria,
    carisma: base.carisma + bonus.carisma,
  }
}

export function getPartyAttributeBonus(playerLevel: number): Attributes {
  return usePartyStore.getState().getFollowAttributeBonus(playerLevel)
}

export function getPartyEffectiveAttributes(base: Attributes, playerLevel: number): Attributes {
  return addAttributes(base, getPartyAttributeBonus(playerLevel))
}

/**
 * Reactive variants for React components. The plain get* functions read the
 * party store via getState() and do NOT subscribe — a component using them
 * keeps showing stale stats when slots/modes change. These hooks subscribe
 * to the party state that feeds the bonus.
 */
export function usePartyAttributeBonus(playerLevel: number): Attributes {
  usePartyStore(s => s.slots)
  usePartyStore(s => s.knownNpcs)
  return getPartyAttributeBonus(playerLevel)
}

export function usePartyEffectiveAttributes(base: Attributes, playerLevel: number): Attributes {
  return addAttributes(base, usePartyAttributeBonus(playerLevel))
}

export function hasAttributeBonus(bonus: Attributes): boolean {
  return ATTR_KEYS.some(key => Math.abs(bonus[key]) > 0.001)
}
