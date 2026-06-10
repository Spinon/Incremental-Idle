import { create } from 'zustand'
import type { RealtimeChannel, Session, User } from '@supabase/supabase-js'
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

interface CloudSessionLock {
  activeClientSessionId?: string
  activeClientHeartbeatAt?: string
  activeClientStartedAt?: string
  activeClientAppVersion?: string
}

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
const CLOUD_SESSION_CLIENT_ID_KEY = 'incremental-idle-cloud-client-session-id'
const CLOUD_SESSION_LEASE_MS = 2 * 60 * 1000
const CLOUD_SESSION_HEARTBEAT_MS = 15 * 1000
const CLOUD_SESSION_WATCH_MS = 5 * 1000
const ACTIVE_SESSION_ERROR = 'This account is active in another browser or device.'
let sessionHeartbeatTimer: number | null = null
let sessionWatchTimer: number | null = null
let sessionWatchChannel: RealtimeChannel | null = null
let watchedUserId: string | null = null

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

function makeClientSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function getClientSessionId(): string {
  try {
    const existing = sessionStorage.getItem(CLOUD_SESSION_CLIENT_ID_KEY)
    if (existing) return existing

    const id = makeClientSessionId()
    sessionStorage.setItem(CLOUD_SESSION_CLIENT_ID_KEY, id)
    return id
  } catch {
    return makeClientSessionId()
  }
}

function readSessionLock(metadata: Record<string, unknown> | null | undefined): CloudSessionLock {
  return {
    activeClientSessionId: typeof metadata?.activeClientSessionId === 'string' ? metadata.activeClientSessionId : undefined,
    activeClientHeartbeatAt: typeof metadata?.activeClientHeartbeatAt === 'string' ? metadata.activeClientHeartbeatAt : undefined,
    activeClientStartedAt: typeof metadata?.activeClientStartedAt === 'string' ? metadata.activeClientStartedAt : undefined,
    activeClientAppVersion: typeof metadata?.activeClientAppVersion === 'string' ? metadata.activeClientAppVersion : undefined,
  }
}

function isFreshLock(lock: CloudSessionLock, now = Date.now()): boolean {
  const heartbeatAt = isoMs(lock.activeClientHeartbeatAt)
  return heartbeatAt > 0 && now - heartbeatAt < CLOUD_SESSION_LEASE_MS
}

function isLockedByAnotherClient(row: CloudSaveRow | null, clientSessionId = getClientSessionId()): boolean {
  if (!row) return false
  const lock = readSessionLock(row.metadata)
  return !!lock.activeClientSessionId
    && lock.activeClientSessionId !== clientSessionId
    && isFreshLock(lock)
}

function withSessionLockMetadata(row: CloudSaveRow | null, nowIso = new Date().toISOString()): Record<string, unknown> {
  const current = row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata
    : {}
  const previous = readSessionLock(current)

  return {
    ...current,
    source: 'web',
    activeClientSessionId: getClientSessionId(),
    activeClientHeartbeatAt: nowIso,
    activeClientStartedAt: previous.activeClientSessionId === getClientSessionId()
      ? previous.activeClientStartedAt ?? nowIso
      : nowIso,
    activeClientAppVersion: __APP_VERSION__,
  }
}

function clearSessionHeartbeat() {
  if (sessionHeartbeatTimer === null) return
  window.clearInterval(sessionHeartbeatTimer)
  sessionHeartbeatTimer = null
}

function exclusiveConflictMessage() {
  return 'Sua conta foi aberta em outro lugar. Entre novamente para assumir este dispositivo.'
}

function setExclusiveConflictState() {
  useCloudSaveStore.setState({
    status: 'signed-out',
    session: null,
    user: null,
    pendingRemote: null,
    remoteChecked: false,
    authMode: 'sign-in',
    error: exclusiveConflictMessage(),
    message: null,
  })
}

function clearSessionWatch() {
  if (sessionWatchTimer !== null) {
    window.clearInterval(sessionWatchTimer)
    sessionWatchTimer = null
  }
  if (sessionWatchChannel && supabase) {
    void supabase.removeChannel(sessionWatchChannel)
  }
  sessionWatchChannel = null
  watchedUserId = null
  window.removeEventListener('focus', checkWatchedSession)
  document.removeEventListener('visibilitychange', checkWatchedSession)
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
  const existing = await fetchRemoteSave(userId)

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
      metadata: withSessionLockMetadata(existing),
    }, { onConflict: 'user_id,slot_key' })
    .select('*')
    .single()

  if (error) throw error
  return data as CloudSaveRow
}

async function writeSessionLock(userId: string): Promise<CloudSaveRow | null> {
  if (!supabase) return null
  const existing = await fetchRemoteSave(userId)
  if (!existing) return upsertSnapshot(userId, captureLocalSaveSnapshot())

  const { data, error } = await supabase
    .from('cloud_saves')
    .update({ metadata: withSessionLockMetadata(existing) })
    .eq('user_id', userId)
    .eq('slot_key', CLOUD_SAVE_SLOT_KEY)
    .select('*')
    .single()

  if (error) throw error
  return data as CloudSaveRow
}

async function releaseSessionLock(userId: string): Promise<void> {
  if (!supabase) return
  const existing = await fetchRemoteSave(userId)
  if (!existing) return

  const lock = readSessionLock(existing.metadata)
  if (lock.activeClientSessionId !== getClientSessionId()) return

  const { activeClientSessionId, activeClientHeartbeatAt, activeClientStartedAt, activeClientAppVersion, ...rest } = existing.metadata ?? {}
  void activeClientSessionId
  void activeClientHeartbeatAt
  void activeClientStartedAt
  void activeClientAppVersion

  const { error } = await supabase
    .from('cloud_saves')
    .update({ metadata: rest })
    .eq('user_id', userId)
    .eq('slot_key', CLOUD_SAVE_SLOT_KEY)

  if (error) throw error
}

async function assertExclusiveSession(userId: string): Promise<void> {
  const remote = await fetchRemoteSave(userId)
  if (isLockedByAnotherClient(remote)) {
    throw new Error(ACTIVE_SESSION_ERROR)
  }
  await writeSessionLock(userId)
}

async function claimExclusiveSession(userId: string, revokeOtherSessions: boolean): Promise<void> {
  if (revokeOtherSessions) {
    const { error } = await supabase!.auth.signOut({ scope: 'others' })
    if (error) throw error
  }
  await writeSessionLock(userId)
}

async function signOutLocalForExclusiveConflict(): Promise<void> {
  clearSessionHeartbeat()
  clearSessionWatch()
  if (supabase) await supabase.auth.signOut({ scope: 'local' })
}

async function checkWatchedSession(): Promise<void> {
  if (!watchedUserId) return

  try {
    const remote = await fetchRemoteSave(watchedUserId)
    if (!isLockedByAnotherClient(remote)) return
    setExclusiveConflictState()
    await signOutLocalForExclusiveConflict()
  } catch {
    // Network/RLS errors should not kick the player out by themselves.
  }
}

function handleWatchedRow(row: CloudSaveRow | null) {
  if (!isLockedByAnotherClient(row)) return
  setExclusiveConflictState()
  void signOutLocalForExclusiveConflict()
}

function startSessionWatch(userId: string) {
  clearSessionWatch()
  watchedUserId = userId
  window.addEventListener('focus', checkWatchedSession)
  document.addEventListener('visibilitychange', checkWatchedSession)
  sessionWatchTimer = window.setInterval(() => {
    void checkWatchedSession()
  }, CLOUD_SESSION_WATCH_MS)

  if (!supabase) return
  sessionWatchChannel = supabase
    .channel(`cloud-session-lock:${userId}:${getClientSessionId()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cloud_saves',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = (payload.new && typeof payload.new === 'object')
          ? payload.new as CloudSaveRow
          : null
        handleWatchedRow(row)
      },
    )
    .subscribe()
}

function startSessionHeartbeat(userId: string) {
  clearSessionHeartbeat()
  sessionHeartbeatTimer = window.setInterval(() => {
    assertExclusiveSession(userId).catch(() => {
      setExclusiveConflictState()
      void signOutLocalForExclusiveConflict()
    })
  }, CLOUD_SESSION_HEARTBEAT_MS)
}

function startExclusiveSessionMonitoring(userId: string) {
  startSessionHeartbeat(userId)
  startSessionWatch(userId)
  void checkWatchedSession()
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

function clearStalePendingRestore(row: CloudSaveRow) {
  const pendingRestore = localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
  if (pendingRestore && pendingRestore !== row.updated_at) {
    localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
  }
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
      if (session?.user) startExclusiveSessionMonitoring(session.user.id)

      supabase.auth.onAuthStateChange((event, nextSession) => {
        const previousUserId = get().user?.id ?? null
        const nextUserId = nextSession?.user?.id ?? null
        const userChanged = previousUserId !== nextUserId
        const shouldClearPending = event === 'SIGNED_OUT' || userChanged
        const explicitAuthFlow = event === 'SIGNED_IN' && get().status === 'loading'
        set({
          session: nextSession,
          user: nextSession?.user ?? null,
          status: authStatusFromSession(nextSession),
          authMode: event === 'PASSWORD_RECOVERY' ? 'password-reset' : get().authMode,
          pendingRemote: shouldClearPending ? null : get().pendingRemote,
          remoteChecked: nextSession?.user && !userChanged ? get().remoteChecked : false,
        })
        if (nextSession?.user && !explicitAuthFlow) startExclusiveSessionMonitoring(nextSession.user.id)
        else {
          clearSessionHeartbeat()
          clearSessionWatch()
        }
        if (nextSession?.user && !explicitAuthFlow && (userChanged || !get().remoteChecked)) {
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
    if (data.session?.user) {
      try {
        await claimExclusiveSession(data.session.user.id, true)
        startExclusiveSessionMonitoring(data.session.user.id)
      } catch (err) {
        await signOutLocalForExclusiveConflict()
        set({ status: 'error', session: null, user: null, error: err instanceof Error ? err.message : String(err) })
        return
      }
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
    if (data.session?.user) {
      try {
        await claimExclusiveSession(data.session.user.id, true)
        startExclusiveSessionMonitoring(data.session.user.id)
      } catch (err) {
        await signOutLocalForExclusiveConflict()
        set({ status: 'error', session: null, user: null, error: err instanceof Error ? err.message : String(err) })
        return
      }
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
    if (data.session?.user) {
      try {
        await claimExclusiveSession(data.session.user.id, true)
        startExclusiveSessionMonitoring(data.session.user.id)
      } catch (err) {
        await signOutLocalForExclusiveConflict()
        set({ status: 'error', session: null, user: null, error: err instanceof Error ? err.message : String(err) })
        return
      }
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
    await supabase.auth.signOut({ scope: 'local' })
    clearSessionHeartbeat()
    clearSessionWatch()
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
    const userId = get().user?.id
    if (userId) {
      try {
        await releaseSessionLock(userId)
      } catch {
        // Signing out should not be blocked by a best-effort lock release.
      }
    }
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    clearSessionHeartbeat()
    clearSessionWatch()
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
      await assertExclusiveSession(user.id)
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
      if (err instanceof Error && err.message === ACTIVE_SESSION_ERROR) {
        await signOutLocalForExclusiveConflict()
        setExclusiveConflictState()
        return
      }
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
      await assertExclusiveSession(user.id)
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
      const restoreRemoteUpdatedAt = localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
      const restoreOfflinePending = restoreRemoteUpdatedAt === remote.updated_at && acceptedRemote
      const meaningfulDifference = hasMeaningfulDifference(local, remoteSnapshot)
      clearStalePendingRestore(remote)

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

      if (localIsNewer && (restoreOfflinePending || (acceptedRemote && !meaningfulDifference) || (withinConflictGrace && !meaningfulDifference))) {
        localStorage.removeItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)
        await get().pushLocalSave(true)
        return
      }

      if (acceptedRemote && !remoteIsNewer) {
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
        if (restoreOfflinePending || !meaningfulDifference) {
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
      if (err instanceof Error && err.message === ACTIVE_SESSION_ERROR) {
        await signOutLocalForExclusiveConflict()
        setExclusiveConflictState()
        return
      }
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
    localStorage.removeItem(LOCAL_PLAY_KEY)
    localStorage.setItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY, remote.updated_at)
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
