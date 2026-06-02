export const SAVE_SCHEMA_VERSION = 2

export const SAVE_KEYS = {
  hero:      'incremental-idle-hero',
  inventory: 'incremental-idle-inventory',
  map:       'incremental-idle-map',
  battle:    'incremental-idle-battle',
  spells:    'incremental-idle-spells',
  quests:    'incremental-idle-quests',
  settings:  'incremental-idle-settings',
  notifs:    'incremental-idle-notifs',
} as const

type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function mergeValue(defaultValue: unknown, savedValue: unknown): unknown {
  if (savedValue === undefined) return defaultValue
  if (Array.isArray(savedValue)) return savedValue
  if (isPlainRecord(defaultValue) && isPlainRecord(savedValue)) {
    const merged: PlainRecord = { ...defaultValue }
    for (const [key, value] of Object.entries(savedValue)) {
      merged[key] = mergeValue(merged[key], value)
    }
    return merged
  }
  return savedValue
}

export function mergeSave<T>(persistedState: unknown, currentState: T): T {
  return mergeValue(currentState, persistedState) as T
}

export function migrateSave<T>(persistedState: unknown): T {
  return (isPlainRecord(persistedState) ? persistedState : {}) as T
}
