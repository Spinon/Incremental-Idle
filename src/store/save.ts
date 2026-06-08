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

export const CLOUD_SAVE_SLOT_KEY = 'default'
export const CLOUD_SAVE_LOCAL_ID_KEY = 'incremental-idle-cloud-local-id'
export const CLOUD_SAVE_LOCAL_UPDATED_AT_KEY = 'incremental-idle-cloud-local-updated-at'
export const OFFLINE_LAST_ACTIVE_KEY = 'incremental-idle-last-active-at'

export type SaveKey = typeof SAVE_KEYS[keyof typeof SAVE_KEYS]

export interface LocalSaveSnapshot {
  schemaVersion: number
  appVersion: string
  localSaveId: string
  capturedAt: string
  lastActiveAt?: number
  entries: Partial<Record<SaveKey, string>>
}

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

function makeLocalSaveId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function getLocalSaveId(): string {
  const existing = localStorage.getItem(CLOUD_SAVE_LOCAL_ID_KEY)
  if (existing) return existing

  const id = makeLocalSaveId()
  localStorage.setItem(CLOUD_SAVE_LOCAL_ID_KEY, id)
  return id
}

export function getLocalSaveUpdatedAt(): string | null {
  return localStorage.getItem(CLOUD_SAVE_LOCAL_UPDATED_AT_KEY)
}

export function markLocalSaveChanged(date = new Date()): string {
  const value = date.toISOString()
  localStorage.setItem(CLOUD_SAVE_LOCAL_UPDATED_AT_KEY, value)
  return value
}

export function captureLocalSaveSnapshot(options: { markChanged?: boolean } = {}): LocalSaveSnapshot {
  const entries: LocalSaveSnapshot['entries'] = {}
  for (const key of Object.values(SAVE_KEYS)) {
    const value = localStorage.getItem(key)
    if (value !== null) entries[key] = value
  }

  const existingUpdatedAt = getLocalSaveUpdatedAt()
  const shouldMarkChanged = options.markChanged !== false
  const lastActiveAt = Number(localStorage.getItem(OFFLINE_LAST_ACTIVE_KEY))

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    appVersion: __APP_VERSION__,
    localSaveId: getLocalSaveId(),
    capturedAt: existingUpdatedAt ?? (shouldMarkChanged ? markLocalSaveChanged() : ''),
    lastActiveAt: Number.isFinite(lastActiveAt) && lastActiveAt > 0 ? lastActiveAt : Date.now(),
    entries,
  }
}

export function applyLocalSaveSnapshot(snapshot: LocalSaveSnapshot): void {
  if (!isPlainRecord(snapshot) || !isPlainRecord(snapshot.entries)) return

  for (const key of Object.values(SAVE_KEYS)) {
    const value = snapshot.entries[key]
    if (typeof value === 'string') localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  }

  if (typeof snapshot.localSaveId === 'string' && snapshot.localSaveId) {
    localStorage.setItem(CLOUD_SAVE_LOCAL_ID_KEY, snapshot.localSaveId)
  }
  if (typeof snapshot.capturedAt === 'string' && snapshot.capturedAt) {
    localStorage.setItem(CLOUD_SAVE_LOCAL_UPDATED_AT_KEY, snapshot.capturedAt)
  }

  const fallbackLastActiveAt = typeof snapshot.capturedAt === 'string'
    ? Date.parse(snapshot.capturedAt)
    : NaN
  const lastActiveAt = typeof snapshot.lastActiveAt === 'number' && Number.isFinite(snapshot.lastActiveAt)
    ? snapshot.lastActiveAt
    : fallbackLastActiveAt
  if (Number.isFinite(lastActiveAt) && lastActiveAt > 0) {
    localStorage.setItem(OFFLINE_LAST_ACTIVE_KEY, String(lastActiveAt))
  }
}
