import { useUIStore, type AppTab } from '../store/uiStore'

const TARGET_TAB: Record<string, AppTab> = {
  battle: 'battle',
  'battle-panel': 'battle',
  'hero-panel': 'battle',
  'market-panel': 'battle',
  home: 'battle',
  market: 'battle',
  map: 'map',
  'map-panel': 'map',
  equips: 'equips',
  equipment: 'equips',
  inventory: 'equips',
  'inventory-panel': 'equips',
  consumables: 'consumables',
  'consumables-panel': 'consumables',
  spells: 'spells',
  spellbook: 'spells',
  'spellbook-panel': 'spells',
  quests: 'quests',
  'quest-panel': 'quests',
}

export function navigateToShortcut(target?: string): boolean {
  if (!target) return false
  const tab = TARGET_TAB[target]
  if (!tab) return false
  useUIStore.getState().setActiveTab(tab)
  return true
}
