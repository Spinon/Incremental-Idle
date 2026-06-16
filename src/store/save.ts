import type { PersistStorage, StorageValue } from 'zustand/middleware'

export const SAVE_SCHEMA_VERSION = 2

export const SAVE_KEYS = {
  hero:      'incremental-idle-hero',
  inventory: 'incremental-idle-inventory',
  map:       'incremental-idle-map',
  battle:    'incremental-idle-battle',
  spells:    'incremental-idle-spells',
  quests:    'incremental-idle-quests',
  party:     'incremental-idle-party',
  settings:  'incremental-idle-settings',
  notifs:    'incremental-idle-notifs',
} as const

export const CLOUD_SAVE_SLOT_KEY = 'default'
export const CLOUD_SAVE_LOCAL_ID_KEY = 'incremental-idle-cloud-local-id'
export const CLOUD_SAVE_LOCAL_UPDATED_AT_KEY = 'incremental-idle-cloud-local-updated-at'
export const OFFLINE_LAST_ACTIVE_KEY = 'incremental-idle-last-active-at'
export const LOCAL_PLAY_KEY = 'incremental-idle-local-play'
// Stores the remote row updated_at currently being restored through offline progress.
export const CLOUD_RESTORE_OFFLINE_PENDING_KEY = 'incremental-idle-cloud-restore-offline-pending'
export const CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY = 'incremental-idle-cloud-accepted-remote-updated-at'
// Last cloud save row overwritten by an explicit "keep local" choice, kept as a
// best-effort recovery copy on this device.
export const CLOUD_OVERWRITTEN_BACKUP_KEY = 'incremental-idle-cloud-overwritten-backup'

const APP_STORAGE_PREFIXES = [
  'incremental-idle',
  'incremental_idle',
  'ii-',
] as const

function isAppOwnedStorageKey(key: string): boolean {
  return APP_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))
}

export type SaveKey = typeof SAVE_KEYS[keyof typeof SAVE_KEYS]

let deferredPersistDepth = 0
const deferredPersistValues = new Map<string, StorageValue<unknown>>()

// Custom PersistStorage instead of createJSONStorage: deferred mode must skip
// JSON.stringify entirely, not just the localStorage write. During offline
// simulation every set() persists, so serializing whole stores (map tiles,
// inventory) thousands of times dominated the simulation cost. Deferred mode
// keeps only the latest state object per key and serializes once on flush.
export const gameStorage: PersistStorage<unknown> = {
  getItem: (name) => {
    const raw = localStorage.getItem(name)
    if (raw === null) return null
    try {
      return JSON.parse(raw) as StorageValue<unknown>
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    if (deferredPersistDepth > 0) {
      deferredPersistValues.set(name, value)
      return
    }
    localStorage.setItem(name, JSON.stringify(value))
  },
  removeItem: (name) => {
    deferredPersistValues.delete(name)
    localStorage.removeItem(name)
  },
}

export function resetLocalGameStorage(options: { keepLocalPlay?: boolean } = {}): void {
  for (const key of [...deferredPersistValues.keys()]) {
    if (isAppOwnedStorageKey(key)) deferredPersistValues.delete(key)
  }

  for (const key of Object.keys(localStorage)) {
    if (isAppOwnedStorageKey(key) || key.startsWith('sb-')) {
      localStorage.removeItem(key)
    }
  }

  if (options.keepLocalPlay) {
    localStorage.setItem(LOCAL_PLAY_KEY, '1')
  } else {
    localStorage.removeItem(LOCAL_PLAY_KEY)
  }
}

export function beginDeferredPersistWrites(): void {
  deferredPersistDepth += 1
}

export function endDeferredPersistWrites(options: { flush: boolean } = { flush: true }): void {
  deferredPersistDepth = Math.max(0, deferredPersistDepth - 1)
  if (deferredPersistDepth > 0) return

  const writes = [...deferredPersistValues.entries()]
  deferredPersistValues.clear()

  if (!options.flush) return
  for (const [key, value] of writes) {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

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

  getLocalSaveId()
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
