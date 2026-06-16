import { useEffect, useRef, useState } from 'react'
import { useCloudSaveStore } from '../store/cloudSaveStore'
import { useSettingsStore } from '../store/settingsStore'
import { useNotifStore } from '../store/notifStore'
import { CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY, CLOUD_RESTORE_OFFLINE_PENDING_KEY, CLOUD_SAVE_LOCAL_ID_KEY, CLOUD_SAVE_LOCAL_UPDATED_AT_KEY, LOCAL_PLAY_KEY, OFFLINE_LAST_ACTIVE_KEY, SAVE_KEYS, SAVE_SCHEMA_VERSION, markLocalSaveChanged } from '../store/save'
import { useT } from '../i18n/useT'
import { cn } from '../lib/utils'

const MID_FIGHT_KEY = 'ii-mid-fight'
const OFFLINE_SYNC_SNAPSHOT_KEY = 'incremental-idle-offline-sync-snapshot'
const OFFLINE_SYNC_PENDING_KEY = 'incremental-idle-offline-sync-pending'
const SEEN_DEATH_KEY = 'incremental_idle_seen_death_id'

export default function SettingsMenu({ authOnly = false }: { authOnly?: boolean }) {
  const [open, setOpen]           = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetInput, setResetInput] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const { theme, lang, setTheme, setLang } = useSettingsStore()
  const notifsEnabled = useNotifStore(s => s.enabled)
  const setNotifsEnabled = useNotifStore(s => s.setEnabled)
  const cloudConfigured = useCloudSaveStore(s => s.configured)
  const cloudStatus = useCloudSaveStore(s => s.status)
  const cloudUser = useCloudSaveStore(s => s.user)
  const cloudPendingRemote = useCloudSaveStore(s => s.pendingRemote)
  const cloudMessage = useCloudSaveStore(s => s.message)
  const cloudError = useCloudSaveStore(s => s.error)
  const clearCloudMessage = useCloudSaveStore(s => s.clearMessage)
  const chooseLocalSave = useCloudSaveStore(s => s.chooseLocal)
  const chooseRemoteSave = useCloudSaveStore(s => s.chooseRemote)
  const pullRemoteSave = useCloudSaveStore(s => s.pullRemoteSave)
  const pushLocalSave = useCloudSaveStore(s => s.pushLocalSave)
  const signOut = useCloudSaveStore(s => s.signOut)
  const updatePassword = useCloudSaveStore(s => s.updatePassword)
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const localPlay = typeof window !== 'undefined' && localStorage.getItem(LOCAL_PLAY_KEY) === '1'

  const canConfirmReset = resetInput === 'RESTART'

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function handleReset() {
    const keepLocalPlay = localPlay || !!cloudUser

    // Fire the cloud sign-out WITHOUT awaiting. Awaiting it (network round-trips
    // for the lock release + auth sign-out) yields control back to the event
    // loop, letting the running game loop re-persist the OLD in-memory state
    // over the fresh save we write below — which is why reset only worked from
    // local-play mode. The session lock lease covers a missed release.
    if (cloudUser) void signOut()

    for (const key of Object.values(SAVE_KEYS)) localStorage.removeItem(key)
    ;[
      CLOUD_SAVE_LOCAL_ID_KEY,
      CLOUD_SAVE_LOCAL_UPDATED_AT_KEY,
      OFFLINE_LAST_ACTIVE_KEY,
      CLOUD_ACCEPTED_REMOTE_UPDATED_AT_KEY,
      CLOUD_RESTORE_OFFLINE_PENDING_KEY,
      MID_FIGHT_KEY,
      OFFLINE_SYNC_SNAPSHOT_KEY,
      OFFLINE_SYNC_PENDING_KEY,
      SEEN_DEATH_KEY,
    ].forEach(key => localStorage.removeItem(key))

    // Drop any persisted Supabase auth session synchronously so the reload
    // starts clean (the fire-and-forget signOut above may not finish in time).
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-')) localStorage.removeItem(key)
    }

    if (keepLocalPlay) localStorage.setItem(LOCAL_PLAY_KEY, '1')
    else localStorage.removeItem(LOCAL_PLAY_KEY)

    localStorage.setItem(SAVE_KEYS.hero, JSON.stringify({
      state: {
        name: 'Hero',
        level: 1,
        xp: 0,
        xpToNext: 102,
        freePoints: 7,
        attributes: {
          forca: 0, agilidade: 0, destreza: 0, vitalidade: 0,
          inteligencia: 0, sabedoria: 0, carisma: 0,
        },
        stamina: 100,
        mana: 150,
        skipCharges: 3,
        maxSkipCharges: 3,
        gold: 0,
        lastXpGain: 0,
        xpGainVersion: 0,
        lastGoldGain: 0,
        goldGainVersion: 0,
      },
      version: SAVE_SCHEMA_VERSION,
    }))
    markLocalSaveChanged()

    // Synchronous from here to reload: no await means the game loop cannot
    // fire a persist tick that would clobber the fresh save written above.
    window.location.reload()
  }

  function returnToCloudLogin() {
    localStorage.removeItem(LOCAL_PLAY_KEY)
    window.location.reload()
  }

  async function handlePasswordUpdate() {
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError(lang === 'en' ? 'Password must have at least 6 characters.' : 'A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(lang === 'en' ? 'Passwords do not match.' : 'As senhas não conferem.')
      return
    }
    await updatePassword(newPassword)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordOpen(false)
  }

  const optionBase   = 'flex-1 py-1.5 rounded-lg text-sm font-medium border transition-all text-center'
  const optionActive = 'bg-indigo-600 border-indigo-400 text-white'
  const optionIdle   = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md border transition-all',
            open
              ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          )}
        >
          {t.settings.title}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 z-50
            bg-white dark:bg-slate-900
            border border-slate-200 dark:border-slate-700
            rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60
            p-4 flex flex-col gap-4"
          >
            {/* Theme */}
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
                {t.settings.theme}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setTheme('light')} className={cn(optionBase, theme === 'light' ? optionActive : optionIdle)}>
                  {t.settings.light}
                </button>
                <button onClick={() => setTheme('dark')} className={cn(optionBase, theme === 'dark' ? optionActive : optionIdle)}>
                  {t.settings.dark}
                </button>
              </div>
            </div>

            {/* Language */}
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
                {t.settings.lang}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setLang('pt')} className={cn(optionBase, lang === 'pt' ? optionActive : optionIdle)}>
                  PT
                </button>
                <button onClick={() => setLang('en')} className={cn(optionBase, lang === 'en' ? optionActive : optionIdle)}>
                  EN
                </button>
              </div>
            </div>

            {/* Notifications */}
            {!authOnly && (
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
                  {lang === 'en' ? 'Notifications' : 'Notificações'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setNotifsEnabled(true)} className={cn(optionBase, notifsEnabled ? optionActive : optionIdle)}>
                    {lang === 'en' ? 'On' : 'Ativado'}
                  </button>
                  <button onClick={() => setNotifsEnabled(false)} className={cn(optionBase, !notifsEnabled ? optionActive : optionIdle)}>
                    {lang === 'en' ? 'Off' : 'Desativado'}
                  </button>
                </div>
              </div>
            )}

            {/* Account */}
            {!authOnly && (
              <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
                {lang === 'en' ? 'Account' : 'Conta'}
              </p>

              {localPlay && !cloudUser ? (
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/20 px-2.5 py-2">
                    <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                      {lang === 'en' ? 'Playing locally' : 'Jogando localmente'}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-sky-600/80 dark:text-sky-300/75">
                      {lang === 'en'
                        ? 'Cloud save is paused until you sign in.'
                        : 'O save na nuvem fica pausado até você entrar.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={returnToCloudLogin}
                    className="py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {lang === 'en' ? 'Go to login' : 'Ir para login'}
                  </button>
                </div>
              ) : !cloudConfigured ? (
                <p className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-2 text-[11px] leading-4 text-amber-700 dark:text-amber-300">
                  {lang === 'en'
                    ? 'Supabase is not configured in this build.'
                    : 'Supabase ainda não está configurado neste build.'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30 px-2.5 py-2">
                    <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {cloudUser?.email}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      {cloudStatus === 'syncing'
                        ? (lang === 'en' ? 'Syncing...' : 'Sincronizando...')
                        : (lang === 'en' ? 'Connected' : 'Conectado')}
                    </p>
                  </div>

                  {cloudPendingRemote && (
                    <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-2">
                      <p className="text-[11px] leading-4 text-indigo-700 dark:text-indigo-300">
                        {lang === 'en'
                          ? 'A cloud save is available. Keeping local will replace it.'
                          : 'Existe um save na nuvem. Manter local vai substituir esse save.'}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => chooseLocalSave()}
                          className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                        >
                          {lang === 'en' ? 'Keep local' : 'Manter local'}
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseRemoteSave()}
                          className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-black text-white hover:bg-indigo-500"
                        >
                          {lang === 'en' ? 'Restore cloud' : 'Restaurar nuvem'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => pushLocalSave()}
                      disabled={cloudStatus === 'syncing'}
                      className={cn(optionBase, optionIdle, 'text-xs disabled:opacity-50')}
                    >
                      {lang === 'en' ? 'Save now' : 'Salvar agora'}
                    </button>
                    <button
                      type="button"
                      onClick={() => pullRemoteSave()}
                      disabled={cloudStatus === 'syncing'}
                      className={cn(optionBase, optionIdle, 'text-xs disabled:opacity-50')}
                      title={lang === 'en' ? 'Refresh cloud status' : 'Atualizar status da nuvem'}
                    >
                      {lang === 'en' ? 'Refresh' : 'Atualizar'}
                    </button>
                  </div>

                  {passwordOpen && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30 p-2.5">
                      <div className="flex flex-col gap-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder={lang === 'en' ? 'New password' : 'Nova senha'}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400"
                        />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder={lang === 'en' ? 'Confirm password' : 'Confirmar senha'}
                          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400"
                        />
                        {passwordError && (
                          <p className="text-[10px] leading-4 text-red-500 dark:text-red-300">{passwordError}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => { setPasswordOpen(false); setPasswordError(null); setNewPassword(''); setConfirmPassword('') }}
                            className="rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-300"
                          >
                            {lang === 'en' ? 'Cancel' : 'Cancelar'}
                          </button>
                          <button
                            type="button"
                            onClick={handlePasswordUpdate}
                            className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-black text-white hover:bg-indigo-500"
                          >
                            {lang === 'en' ? 'Update' : 'Alterar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!passwordOpen && (
                    <button
                      type="button"
                      onClick={() => setPasswordOpen(true)}
                      className="py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {lang === 'en' ? 'Change password' : 'Alterar senha'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {lang === 'en' ? 'Sign out' : 'Sair'}
                  </button>
                </div>
              )}

              {(cloudMessage || cloudError) && (
                <button
                  type="button"
                  onClick={() => clearCloudMessage()}
                  className={cn(
                    'mt-2 w-full rounded-lg border px-2.5 py-2 text-left text-[11px] leading-4',
                    cloudError
                      ? 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30 text-slate-500 dark:text-slate-400',
                  )}
                >
                  {cloudError ?? cloudMessage}
                </button>
              )}
              </div>
            )}

            {/* Danger zone */}
            {!authOnly && (
              <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-semibold">
                  {lang === 'en' ? 'Danger zone' : 'Zona de risco'}
                </p>
                <button
                  onClick={() => { setOpen(false); setResetOpen(true); setResetInput('') }}
                  className="w-full py-1.5 rounded-lg text-sm font-semibold border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  {lang === 'en' ? 'Reset Progress' : 'Resetar Progresso'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Reset confirmation modal ────────────────────────────────────────── */}
      {resetOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700
              rounded-2xl shadow-2xl shadow-black/40 p-6 w-80 flex flex-col gap-4 mx-4"
          >
            {/* Header */}
            <div className="text-center">
              <span className="text-4xl">⚠️</span>
              <h2 className="text-lg font-black text-red-600 dark:text-red-400 mt-2">
                {lang === 'en' ? 'Reset All Progress' : 'Resetar Todo o Progresso'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {lang === 'en'
                  ? 'This will permanently erase your hero, inventory, and map. It cannot be undone.'
                  : 'Isso irá apagar permanentemente seu herói, inventário e mapa. Não pode ser desfeito.'}
              </p>
            </div>

            {/* Confirmation input */}
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-1.5">
                {lang === 'en'
                  ? <>Type <strong className="font-mono text-slate-700 dark:text-slate-300">RESTART</strong> to confirm:</>
                  : <>Digite <strong className="font-mono text-slate-700 dark:text-slate-300">RESTART</strong> para confirmar:</>}
              </p>
              <input
                type="text"
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && canConfirmReset) handleReset() }}
                placeholder="RESTART"
                autoFocus
                spellCheck={false}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm font-mono tracking-widest transition-colors',
                  'bg-white dark:bg-slate-800 outline-none',
                  canConfirmReset
                    ? 'border-red-400 dark:border-red-600 text-red-600 dark:text-red-400'
                    : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300',
                )}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setResetOpen(false); setResetInput('') }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {lang === 'en' ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                onClick={handleReset}
                disabled={!canConfirmReset}
                className={cn(
                  'flex-[2] py-2 rounded-lg text-sm font-bold transition-colors',
                  canConfirmReset
                    ? 'bg-red-600 hover:bg-red-500 text-white border border-red-500 shadow'
                    : 'opacity-35 cursor-not-allowed bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400',
                )}
              >
                {lang === 'en' ? 'Reset Everything' : 'Resetar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
