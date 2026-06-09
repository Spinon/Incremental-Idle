import { useCloudSaveStore } from '../store/cloudSaveStore'
import { CLOUD_RESTORE_OFFLINE_PENDING_KEY, LOCAL_PLAY_KEY, markLocalSaveChanged } from '../store/save'

const CRITICAL_SAVE_DEBOUNCE_MS = 2500
const CRITICAL_SAVE_RETRY_MS = 1500

let saveTimer: number | null = null
let retryTimer: number | null = null

function clearTimer(timer: number | null) {
  if (timer !== null) window.clearTimeout(timer)
}

function scheduleCriticalFlush(delayMs: number) {
  clearTimer(saveTimer)
  saveTimer = window.setTimeout(flushCriticalCloudSave, delayMs)
}

function scheduleRetry() {
  clearTimer(retryTimer)
  retryTimer = window.setTimeout(flushCriticalCloudSave, CRITICAL_SAVE_RETRY_MS)
}

function flushCriticalCloudSave() {
  saveTimer = null
  retryTimer = null

  if (localStorage.getItem(LOCAL_PLAY_KEY) === '1') return
  if (localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)) return

  const cloud = useCloudSaveStore.getState()
  if (!cloud.user || cloud.pendingRemote) return
  if (cloud.status === 'idle' || cloud.status === 'loading' || cloud.status === 'syncing') {
    scheduleRetry()
    return
  }
  if (!cloud.remoteChecked) return

  void cloud.pushLocalSave(true)
}

export function requestCriticalCloudSave() {
  if (localStorage.getItem(LOCAL_PLAY_KEY) === '1') return
  if (localStorage.getItem(CLOUD_RESTORE_OFFLINE_PENDING_KEY)) return

  markLocalSaveChanged()
  scheduleCriticalFlush(CRITICAL_SAVE_DEBOUNCE_MS)
}
