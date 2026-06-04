import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  CLOUD_SAVE_SLOT_KEY,
  SAVE_SCHEMA_VERSION,
  applyLocalSaveSnapshot,
  captureLocalSaveSnapshot,
  getLocalSaveUpdatedAt,
  markLocalSaveChanged,
  type LocalSaveSnapshot,
} from './save'

type CloudStatus = 'idle' | 'loading' | 'signed-out' | 'signed-in' | 'syncing' | 'error'

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
  signInWithEmail(email: string): Promise<void>
  signOut(): Promise<void>
  pushLocalSave(): Promise<void>
  pullRemoteSave(): Promise<void>
  chooseLocal(): Promise<void>
  chooseRemote(): Promise<void>
  clearMessage(): void
}

function compareIso(a: string | null | undefined, b: string | null | undefined): number {
  const av = a ? Date.parse(a) : 0
  const bv = b ? Date.parse(b) : 0
  return av - bv
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

export const useCloudSaveStore = create<CloudSaveStore>((set, get) => ({
  configured: isSupabaseConfigured,
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
    set({ status: 'loading', error: null })

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }

    const session = data.session
    set({
      status: session ? 'signed-in' : 'signed-out',
      session,
      user: session?.user ?? null,
      remoteChecked: false,
    })

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
        status: nextSession ? 'signed-in' : 'signed-out',
        pendingRemote: null,
        remoteChecked: false,
      })
      if (nextSession?.user) {
        window.setTimeout(() => {
          get().pullRemoteSave().catch((err: unknown) => {
            set({ status: 'error', error: err instanceof Error ? err.message : String(err) })
          })
        }, 0)
      }
    })

    if (session?.user) await get().pullRemoteSave()
  },

  signInWithEmail: async (email) => {
    if (!supabase) return
    set({ status: 'loading', error: null, message: null })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    })
    if (error) {
      set({ status: 'error', error: error.message })
      return
    }
    set({
      status: 'signed-out',
      message: 'Magic link sent. Check your email to finish signing in.',
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
      message: 'Signed out. Local progress remains on this device.',
    })
  },

  pushLocalSave: async () => {
    const user = get().user
    if (!user) return

    set({ status: 'syncing', error: null, message: null })
    try {
      markLocalSaveChanged()
      const snapshot = captureLocalSaveSnapshot()
      const row = await upsertSnapshot(user.id, snapshot)
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
    const user = get().user
    if (!user) return

    set({ status: 'syncing', error: null, message: null })
    try {
      const remote = await fetchRemoteSave(user.id)
      const hadLocalUpdatedAt = getLocalSaveUpdatedAt() !== null
      const local = captureLocalSaveSnapshot()
      if (!remote) {
        await get().pushLocalSave()
        return
      }

      const remoteSnapshot = remote.save_data
      const hasLocalProgress = Object.keys(local.entries).length > 0
      if (!hadLocalUpdatedAt && hasLocalProgress && remote.local_save_id !== local.localSaveId) {
        set({
          status: 'signed-in',
          pendingRemote: remote,
          remoteUpdatedAt: remote.updated_at,
          localSnapshotAt: local.capturedAt,
          remoteChecked: true,
          message: 'Cloud save found. Choose which progress to keep.',
        })
        return
      }

      const localIsNewer = compareIso(local.capturedAt, remote.local_updated_at) > 0
      const remoteIsNewer = compareIso(remote.local_updated_at, local.capturedAt) > 0
      const sameDevice = remote.local_save_id === local.localSaveId

      if (remoteIsNewer && !sameDevice) {
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
        await get().pushLocalSave()
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
    await get().pushLocalSave()
  },

  chooseRemote: async () => {
    const remote = get().pendingRemote
    if (!remote) return
    applyLocalSaveSnapshot(remote.save_data)
    set({
      pendingRemote: null,
      remoteUpdatedAt: remote.updated_at,
      localSnapshotAt: remote.local_updated_at,
      remoteChecked: true,
      message: 'Cloud save restored. Reloading...',
    })
    window.setTimeout(() => window.location.reload(), 250)
  },

  clearMessage: () => set({ message: null, error: null }),
}))
