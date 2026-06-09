import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY,
  CLOUD_SAVE_SLOT_KEY,
  CLOUD_RESTORE_OFFLINE_PENDING_KEY,
  LOCAL_PLAY_KEY,
  SAVE_KEYS,
  SAVE_SCHEMA_VERSION,
  applyLocalSaveSnapshot,
  captureLocalSaveSnapshot,
  getLocalSaveUpdatedAt,
  markLocalSaveChanged,
  type LocalSaveSnapshot,
} from './save'

type CloudStatus = 'idle' | 'loading' | 'signed-out' | 'signed-in' | 'syncing' | 'error'
type AuthMode = 'sign-in' | 'sign-up' | 'password-recovery-request' | 'password-recovery-verify' | 'password-reset'

interface CloudSaveRow {
  user_id: string
  slot_key: string
  save_data: LocalSaveSnapshot
  save_schema_version: number
  game_version: string
  local_save_id: string
  local_updated_at: string
  metadata: Record<string, unknown>
  updated_at: string
}

interface CloudSaveStore {
  configured: boolean
  authMode: AuthMode
  recoveryEmail: string | null
  status: CloudStatus
  session: Session | null
  user: User | null
  remoteUpdatedAt: string | null
  localSnapshotAt: string | null
  remoteChecked: boolean
  message: string | null
  error: string | null
  pendingRemote: CloudSaveRow | null

  init(): Promise<void>
  setAuthMode(mode: AuthMode): void
  signInWithPassword(email: string, password: string): Promise<void>
  signUpWithPassword(email: string, password: string): Promise<void>
  requestPasswordRecovery(email: string): Promise<void>
  verifyRecoveryOtp(email: string, token: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>
  pushLocalSave(force?: boolean): Promise<void>
  pullRemoteSave(): Promise<void>
  chooseLocal(): Promise<void>
  chooseRemote(): Promise<void>
  clearMessage(): void
}

let initPromise: Promise<void> | null = null
const CLOUD_SAVE_CONFLICT_GRACE_MS = 5 * 60 * 1000

function authStatusFromSession(session: Session | null): CloudStatus {
  return session ? 'signed-in' : 'signed-out'
}

function isoMs(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function compareIso(a: string | null | undefined, b: string | null | undefined): number {
  return isoMs(a) - isoMs(b)
}

function readPersistedState(snapshot: LocalSaveSnapshot, key: keyof typeof SAVE_KEYS): Record<string, unknown> {
  const raw = snapshot.entries[SAVE_KEYS[key]]
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    const state = parsed?.state
    return state && typeof state === 'object' && !Array.isArray(state) ? state : {}
  } catch {
    return {}
  }
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function saveSummary(snapshot: LocalSaveSnapshot) {
  const hero = readPersistedState(snapshot, 'hero')
  const map = readPersistedState(snapshot, 'map')
  const inventory = readPersistedState(snapshot, 'inventory')
  const spells = readPersistedState(snapshot, 'spells')
  const quests = readPersistedState(snapshot, 'quests')

  return {
    entryCount: Object.keys(snapshot.entries).length,
    level: num(hero.level),
    xp: num(hero.xp),
    gold: num(hero.gold),
    tilesPlaced: num(map.tilesPlaced),
    inventoryCount: Array.isArray(inventory.inventory) ? inventory.inventory.length : 0,
    earnedWordCount: Array.isArray(spells.earnedWordIds) ? spells.earnedWordIds.length : 0,
    questCount: Array.isArray(quests.quests) ? quests.quests.length : 0,
  }
}

function hasMeaningfulDifference(local: LocalSaveSnapshot, remote: LocalSaveSnapshot): boolean {
  const l = saveSummary(local)
  const r = saveSummary(remote)

  if (l.entryCount === 0 || r.entryCount === 0) return true
  if (Math.abs(l.entryCount - r.entryCount) >= 3) return true
  if (Math.abs(l.level - r.level) >= 1) return true
  if (Math.abs(l.tilesPlaced - r.tilesPlaced) >= 5) return true
  if (Math.abs(l.inventoryCount - r.inventoryCount) >= 5) return true
  if (Math.abs(l.earnedWordCount - r.earnedWordCount) >= 3) return true
  if (Math.abs(l.questCount - r.questCount) >= 2) return true

  const goldGap = Math.abs(l.gold - r.gold)
  const biggestGold = Math.max(l.gold, r.gold)
  if (goldGap >= 100 && goldGap / Math.max(1, biggestGold) >= 0.25) return true

  const xpGap = Math.abs(l.xp - r.xp)
  const biggestXp = Math.max(l.xp, r.xp)
  if (xpGap >= 100 && xpGap / Math.max(1, biggestXp) >= 0.25) return true

  return false
}

async function fetchRemoteSave(userId: string): Promise<CloudSaveRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('cloud_saves')
    .select('*')
    .eq('user_id', userId)
    .eq('slot_key', CLOUD_SAVE_SLOT_KEY)
    .maybeSingle()

  if (error) throw error
  return data as CloudSaveRow | null
}

async function upsertSnapshot(userId: string, snapshot: LocalSaveSnapshot): Promise<CloudSaveRow> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase
    .from('cloud_saves')
    .upsert({
      user_id: userId,
      slot_key: CLOUD_SAVE_SLOT_KEY,
      save_data: snapshot,
      save_schema_version: SAVE_SCHEMA_VERSION,
      game_version: snapshot.appVersion,
      local_save_id: snapshot.localSaveId,
      local_updated_at: snapshot.capturedAt,
      metadata: {
        source: 'web',
      },
    }, { onConflict: 'user_id,slot_key' })
    .select('*')
    .single()

  if (error) throw error
  return data as CloudSaveRow
}

function markAcceptedRemote(row: CloudSaveRow) {
  localStorage.setItem(CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY, row.updated_at)
}

function clearAcceptedRemote() {
  localStorage.removeItem(CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY)
}

function isAcceptedRemote(row: CloudSaveRow): boolean {
  return localStorage.getItem(CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY) === row.updated_at
}

function applyRemoteSaveAndReload(row: CloudSaveRow) {
  const remoteLastActiveAt = row.save_data.lastActiveAt
    ?? Date.parse(row.local_updated_at || row.updated_at)
  applyLocalSaveSnapshot({
    ...row.save_data,
    capturedAt: row.save_data.capturedAt || row.local_updated_at,
    lastActiveAt: Number.isFinite(remoteLastActiveAt) ? remoteLastActiveAt : undefined,
  })
  markAcceptedRemote(row)
  window.location.reload()
}

export const useCloudSaveStore = create<CloudSaveStore>((set, get) => ({
  configured: isSupabaseConfigured,
  authMode: 'sign-in',
  recoveryEmail: null,
  status: isSupabaseConfigured ? 'idle' : 'error',
  session: null,
  user: null,
  remoteUpdatedAt: null,
  localSnapshotAt: null,
  remoteChecked: false,
  message: isSupabaseConfigured ? null : 'Cloud save is missing Supabase environment variables.',
  error: null,
  pendingRemote: null,

  init: async () => {
    if (!supabase) return
    if (localStorage.getItem(LOCAL_PLAY_KEY) === '1') {
      set({
        status: 'signed-out',
        session: null,
        user: null,
        pendingRemote: null,
        remoteChecked: false,
      })
      return
    }
    if (initPromise) return initPromise

    initPromise = (async () => {
      set({ status: 'loading', error: null })

      const { data, error } = await supabase.auth.getSession()
      if (error) {
        set({ status: 'error', error: error.message })
        return
      }

      const session = data.session
      set({
        status: authStatusFromSession(session),
        session,
        user: session?.user ?? null,
        remoteChecked: false,
      })

      supabase.auth.onAuthStateChange((event, nextSession) => {
        const previousUserId = get().user?.id ?? null
        const nextUserId = nextSession?.user?.id ?? null
        const userChanged = previousUserId !== nextUserId
        const shouldClearPending = event === 'SIGNED_OUT' || userChanged
        set({
          session: nextSession,
          user: nextSession?.user ?? null,
          status: authStatusFromSession(nextSession),
          authMode: event === 'PASSWORD_RECOVERY' ? 'password-reset' : get().authMode,
          pendingRemote: shouldClearPending ? null : get().pendingRemote,
          remoteChecked: nextSession?.user && !userChanged ? get().remoteChecked : false,
        })
        if (nextSession?.user && (userChanged || !get().remoteChecked)) {
          window.setTimeout(() => {
            get().pullRemoteSave().catch((err: unknown) => {
              set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
            })
          }, 0)
        }
      })

      if (session?.user) await get().pullRemoteSave()
    })()

    return initPromise
  },

  setAuthMode: (authMode) => set({ authMode, message: null, error: null }),

  signInWithPassword: async (email, password) => {
    if (!supabase) return
    set({ status: 'loading', error: null, message: null })
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    set({
      status: authStatusFromSession(data.session),
      session: data.session,
      user: data.session?.user ?? null,
      authMode: 'sign-in',
      message: 'Login successful.',
    })
    if (data.session?.user) await get().pullRemoteSave()
  },

  signUpWithPassword: async (email, password) => {
    if (!supabase) return
    set({ status: 'loading', error: null, message: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    set({
      status: authStatusFromSession(data.session),
      session: data.session,
      user: data.session?.user ?? null,
      authMode: 'sign-in',
      message: data.session
        ? 'Account created.'
        : 'Account created. Check your email to confirm before logging in.',
    })
    if (data.session?.user) await get().pullRemoteSave()
  },

  requestPasswordRecovery: async (email) => {
    if (!supabase) return
    set({ status: 'loading', error: null, message: null })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    set({
      status: 'signed-out',
      authMode: 'password-recovery-verify',
      recoveryEmail: email,
      message: 'Recovery code sent. Check your email.',
    })
  },

  verifyRecoveryOtp: async (email, token) => {
    if (!supabase) return
    set({ status: 'loading', error: null, message: null })
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    set({
      status: authStatusFromSession(data.session),
      session: data.session,
      user: data.session?.user ?? null,
      authMode: 'password-reset',
      recoveryEmail: null,
      message: 'Code confirmed. Choose a new password.',
    })
  },

  updatePassword: async (password) => {
    if (!supabase) return
    set({ status: 'loading', error: null, message: null })
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    await supabase.auth.signOut()
    set({
      status: 'signed-out',
      session: null,
      user: null,
      authMode: 'sign-in',
      message: 'Password updated. Sign in again.',
    })
  },

  signOut: async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    set({
      status: 'signed-out',
      session: null,
      user: null,
      pendingRemote: null,
      remoteChecked: false,
      authMode: 'sign-in',
      message: 'Signed out. Local progress remains on this device.',
    })
  },

  pushLocalSave: async (force = false) => {
    if (localStorage.getItem(LOCAL_PLAY_KEY) === '1') return
    if (!force && (get().pendingRemote || !get().remoteChecked || get().status === 'syncing')) return
    const user = get().user
    if (!user) return

    set({ status: 'syncing', error: null, message: null })
    try {
      markLocalSaveChanged()
      const snapshot = captureLocalSaveSnapshot()
      const row = await upsertSnapshot(user.id, snapshot)
      clearAcceptedRemote()
      set({
        status: 'signed-in',
        remoteUpdatedAt: row.updated_at,
        localSnapshotAt: snapshot.capturedAt,
        remoteChecked: true,
        pendingRemote: null,
        message: 'Cloud save updated.',
      })
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  },

  pullRemoteSave: async () => {
    if (localStorage.getItem(LOCAL_PLAY_KEY) === '1') return
    if (get().pendingRemote || get().status === 'syncing') return
    const user = get().user
    if (!user) return

    set({ status: 'syncing', error: null, message: null })
    try {
      const remote = await fetchRemoteSave(user.id)
      const hadLocalUpdatedAt = getLocalSaveUpdatedAt() !== null
      const local = captureLocalSaveSnapshot({ markChanged: false })
      if (!remote) {
        await get().pushLocalSave(true)
        return
      }

      const remoteSnapshot = remote.save_data
      const acceptedRemote = isAcceptedRemote(remote)
      const localIsNewer = compareIso(local.capturedAt, remote.local_updated_at) > 0
      const remoteIsNewer = compareIso(remote.local_updated_at, local.capturedAt) > 0
      const timestampGapMs = Math.abs(compareIso(local.capturedAt, remote.local_updated_at))
      const withinConflictGrace = timestampGapMs <= CLOUD_SAVE_CONFLICT_GRACE_MS
      const restoreOfflinePending = localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY) === '1'
      const meaningfulDifference = hasMeaningfulDifference(local, remoteSnapshot)

      if (!hadLocalUpdatedAt && !meaningfulDifference) {
        applyRemoteSaveAndReload(remote)
        return
      }

      if (!hadLocalUpdatedAt && meaningfulDifference) {
        set({
          status: 'signed-in',
          pendingRemote: remote,
          remoteUpdatedAt: remote.updated_at,
          localSnapshotAt: local.capturedAt,
          remoteChecked: true,
          message: 'Cloud and local progress differ. Choose which one to keep.',
        })
        return
      }

      if (localIsNewer && (restoreOfflinePending || acceptedRemote || (withinConflictGrace && !meaningfulDifference))) {
        localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
        await get().pushLocalSave(true)
        return
      }

      if (acceptedRemote && !remoteIsNewer) {
        localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
        set({
          status: 'signed-in',
          remoteUpdatedAt: remote.updated_at,
          localSnapshotAt: local.capturedAt,
          remoteChecked: true,
          pendingRemote: null,
          message: 'Cloud save is up to date.',
        })
        return
      }

      if (remoteIsNewer && !meaningfulDifference) {
        applyRemoteSaveAndReload(remote)
        return
      }

      if (remoteIsNewer) {
        set({
          status: 'signed-in',
          pendingRemote: remote,
          remoteUpdatedAt: remote.updated_at,
          localSnapshotAt: local.capturedAt,
          remoteChecked: true,
          message: 'A newer cloud save is available.',
        })
        return
      }

      if (localIsNewer) {
        if (localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY) === '1' || !meaningfulDifference) {
          localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
          await get().pushLocalSave(true)
          return
        }
        set({
          status: 'signed-in',
          pendingRemote: remote,
          remoteUpdatedAt: remote.updated_at,
          localSnapshotAt: local.capturedAt,
          remoteChecked: true,
          message: 'Local progress is newer than the cloud save. Choose which one to keep.',
        })
        return
      }

      set({
        status: 'signed-in',
        remoteUpdatedAt: remote.updated_at,
        localSnapshotAt: local.capturedAt,
        remoteChecked: true,
        pendingRemote: null,
        message: 'Cloud save is up to date.',
      })

      if (remoteSnapshot.schemaVersion > local.schemaVersion) {
        set({ message: 'Cloud save was created by a newer game version.' })
      }
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  },

  chooseLocal: async () => {
    clearAcceptedRemote()
    await get().pushLocalSave(true)
  },

  chooseRemote: async () => {
    const remote = get().pendingRemote
    if (!remote) return
    const remoteLastActiveAt = remote.save_data.lastActiveAt
      ?? Date.parse(remote.local_updated_at || remote.updated_at)
    localStorage.setItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY, '1')
    markAcceptedRemote(remote)
    set({
      status: 'syncing',
      pendingRemote: null,
      remoteUpdatedAt: remote.updated_at,
      localSnapshotAt: remote.local_updated_at,
      remoteChecked: false,
      message: 'Restoring cloud save.',
      error: null,
    })
    applyLocalSaveSnapshot({
      ...remote.save_data,
      capturedAt: remote.save_data.capturedAt || remote.local_updated_at,
      lastActiveAt: Number.isFinite(remoteLastActiveAt) ? remoteLastActiveAt : undefined,
    })
    window.location.reload()
  },

  clearMessage: () => set({ message: null, error: null }),
}))
