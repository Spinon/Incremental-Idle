export const PARTY_SLOT_COLORS = ['#38bdf8', '#a78bfa', '#f59e0b'] as const

export function partySlotIndex(slotId: string): number {
  const match = slotId.match(/(\d+)$/)
  const value = match ? Number(match[1]) - 1 : 0
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function partySlotColor(slotId: string): string {
  return PARTY_SLOT_COLORS[partySlotIndex(slotId) % PARTY_SLOT_COLORS.length]
}
