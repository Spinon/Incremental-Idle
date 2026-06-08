import { useEffect, useRef } from 'react'
import { useBattleStore } from '../store/battleStore'
import { useCloudSaveStore } from '../store/cloudSaveStore'
import { useHeroStore } from '../store/heroStore'
import { useInventoryStore } from '../store/inventoryStore'
import { useMapStore } from '../store/mapStore'
import { useQuestStore } from '../store/questStore'
import { markLocalSaveChanged } from '../store/save'
import { useSpellStore } from '../store/spellStore'

const SYNC_DEBOUNCE_MS = 5000

export function useCloudSaveSync(paused = false) {
  const timer = useRef<number | null>(null)
  const pausedRef = useRef(paused)
  const wasPaused = useRef(paused)

  useEffect(() => {
    useCloudSaveStore.getState().init()
  }, [])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    function schedule() {
      if (pausedRef.current) return
      const cloud = useCloudSaveStore.getState()
      if (!cloud.user || cloud.pendingRemote || cloud.status === 'syncing') return
      if (!cloud.remoteChecked) return

      markLocalSaveChanged()
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        useCloudSaveStore.getState().pushLocalSave()
      }, SYNC_DEBOUNCE_MS)
    }

    const unsubs = [
      useHeroStore.subscribe(schedule),
      useInventoryStore.subscribe(schedule),
      useMapStore.subscribe(schedule),
      useBattleStore.subscribe(schedule),
      useSpellStore.subscribe(schedule),
      useQuestStore.subscribe(schedule),
    ]

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      unsubs.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  useEffect(() => {
    if (wasPaused.current && !paused) {
      const cloud = useCloudSaveStore.getState()
      if (cloud.user && !cloud.pendingRemote && cloud.status !== 'syncing' && cloud.remoteChecked) {
        markLocalSaveChanged()
        if (timer.current !== null) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          useCloudSaveStore.getState().pushLocalSave()
        }, SYNC_DEBOUNCE_MS)
      }
    }
    wasPaused.current = paused
  }, [paused])
}
