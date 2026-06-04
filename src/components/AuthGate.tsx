import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import SettingsMenu from './SettingsMenu'
import { useCloudSaveStore } from '../store/cloudSaveStore'
import { useSettingsStore } from '../store/settingsStore'
import { cn } from '../lib/utils'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(email: string, isEn: boolean): string | null {
  if (!emailPattern.test(email)) return isEn ? 'Enter a valid email.' : 'Informe um e-mail valido.'
  return null
}

function validatePassword(password: string, isEn: boolean): string | null {
  if (password.length < 6) {
    return isEn ? 'Password must have at least 6 characters.' : 'A senha precisa ter pelo menos 6 caracteres.'
  }
  return null
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const cloudConfigured = useCloudSaveStore(s => s.configured)
  const cloudStatus = useCloudSaveStore(s => s.status)
  const authMode = useCloudSaveStore(s => s.authMode)
  const cloudUser = useCloudSaveStore(s => s.user)
  const recoveryEmailValue = useCloudSaveStore(s => s.recoveryEmail)
  const cloudMessage = useCloudSaveStore(s => s.message)
  const cloudError = useCloudSaveStore(s => s.error)
  const clearCloudMessage = useCloudSaveStore(s => s.clearMessage)
  const initCloudSave = useCloudSaveStore(s => s.init)
  const setAuthMode = useCloudSaveStore(s => s.setAuthMode)
  const requestPasswordRecovery = useCloudSaveStore(s => s.requestPasswordRecovery)
  const signInWithPassword = useCloudSaveStore(s => s.signInWithPassword)
  const signUpWithPassword = useCloudSaveStore(s => s.signUpWithPassword)
  const updatePassword = useCloudSaveStore(s => s.updatePassword)
  const verifyRecoveryOtp = useCloudSaveStore(s => s.verifyRecoveryOtp)
  const theme = useSettingsStore(s => s.theme)
  const lang = useSettingsStore(s => s.lang)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    initCloudSave()
  }, [initCloudSave])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const busy = cloudStatus === 'loading' || cloudStatus === 'syncing'
  const mode = authMode
  const isEn = lang === 'en'
  const isSignUp = mode === 'sign-up'
  const isRecoveryRequest = mode === 'password-recovery-request'
  const isRecoveryVerify = mode === 'password-recovery-verify'
  const isPasswordReset = mode === 'password-reset'

  if (cloudUser && !isPasswordReset) return <>{children}</>

  function clearSecrets() {
    setPassword('')
    setConfirmPassword('')
    setRecoveryCode('')
  }

  function switchMode(nextMode: typeof mode) {
    setLocalError(null)
    clearSecrets()
    setAuthMode(nextMode)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLocalError(null)

    const cleanEmail = email.trim().toLowerCase()
    const recoveryEmail = (cleanEmail || recoveryEmailValue || '').trim().toLowerCase()
    const emailError = !isPasswordReset ? validateEmail(cleanEmail, isEn) : null
    if (emailError && mode !== 'password-recovery-verify') return setLocalError(emailError)

    if (mode === 'sign-in') {
      const passwordError = validatePassword(password, isEn)
      if (passwordError) return setLocalError(passwordError)
      await signInWithPassword(cleanEmail, password)
      setPassword('')
      return
    }

    if (mode === 'sign-up') {
      const passwordError = validatePassword(password, isEn)
      if (passwordError) return setLocalError(passwordError)
      if (password !== confirmPassword) {
        return setLocalError(isEn ? 'Passwords do not match.' : 'As senhas nao conferem.')
      }
      await signUpWithPassword(cleanEmail, password)
      clearSecrets()
      return
    }

    if (mode === 'password-recovery-request') {
      await requestPasswordRecovery(cleanEmail)
      return
    }

    if (mode === 'password-recovery-verify') {
      const code = recoveryCode.replace(/\D/g, '')
      const recoveryEmailError = validateEmail(recoveryEmail, isEn)
      if (recoveryEmailError) return setLocalError(recoveryEmailError)
      if (!/^\d{6,8}$/.test(code)) {
        return setLocalError(isEn ? 'Enter the code received by email.' : 'Informe o codigo recebido por e-mail.')
      }
      await verifyRecoveryOtp(recoveryEmail, code)
      setRecoveryCode('')
      return
    }

    if (mode === 'password-reset') {
      const passwordError = validatePassword(password, isEn)
      if (passwordError) return setLocalError(passwordError)
      if (password !== confirmPassword) {
        return setLocalError(isEn ? 'Passwords do not match.' : 'As senhas nao conferem.')
      }
      await updatePassword(password)
      clearSecrets()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center gap-3">
        <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg tracking-tight">
          INCREMENTAL IDLE
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-slate-400 dark:text-slate-500 text-sm">
          {isEn ? 'Version' : 'Versao'} v{__APP_VERSION__}
        </span>
        <div className="ml-auto">
          <SettingsMenu authOnly />
        </div>
      </header>

      <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-black/10 dark:shadow-black/40">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500 dark:text-indigo-300">
              Incremental Idle
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">
              {isSignUp
                ? (isEn ? 'Create account' : 'Criar conta')
                : isRecoveryRequest || isRecoveryVerify
                  ? (isEn ? 'Recover password' : 'Recuperar senha')
                  : isPasswordReset
                    ? (isEn ? 'Change password' : 'Alterar senha')
                    : (isEn ? 'Sign in' : 'Entrar')}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {isSignUp
                ? (isEn ? 'Create an account to save your progress in the cloud.' : 'Crie uma conta para salvar seu progresso na nuvem.')
                : isRecoveryRequest
                  ? (isEn ? 'Enter your account email to receive a code.' : 'Informe o e-mail da sua conta para receber um codigo.')
                  : isRecoveryVerify
                    ? (isEn ? 'Enter the code sent to your email.' : 'Digite o codigo enviado para o seu e-mail.')
                    : isPasswordReset
                      ? (isEn ? 'Choose a new password to continue.' : 'Escolha uma nova senha para continuar.')
                      : (isEn ? 'Sign in to load your save and sync cloud progress.' : 'Faca login para carregar seu save local e sincronizar a nuvem.')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            {!cloudConfigured && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
                {isEn ? 'Supabase is not configured in this build.' : 'Supabase nao configurado neste build.'}
              </div>
            )}

            {!isPasswordReset && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">E-mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={busy}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400"
                />
              </label>
            )}

            {(mode === 'sign-in' || mode === 'sign-up') && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isEn ? 'Password' : 'Senha'}</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  disabled={busy}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400"
                />
              </label>
            )}

            {(isSignUp || isPasswordReset) && (
              <>
                {isPasswordReset && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isEn ? 'New password' : 'Nova senha'}</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      disabled={busy}
                      className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isEn ? 'Confirm password' : 'Confirmar senha'}</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    disabled={busy}
                    className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400"
                  />
                </label>
              </>
            )}

            {isRecoveryVerify && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{isEn ? 'Code' : 'Codigo'}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                  disabled={busy}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-400"
                />
              </label>
            )}

            {(localError || cloudError || cloudMessage) && (
              <button
                type="button"
                onClick={() => { setLocalError(null); clearCloudMessage() }}
                className={cn(
                  'rounded-md border px-3 py-2 text-left text-xs leading-5',
                  localError || cloudError
                    ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-200'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-300',
                )}
              >
                {localError ?? cloudError ?? cloudMessage}
              </button>
            )}

            <button
              type="submit"
              disabled={busy || !cloudConfigured}
              className="rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-indigo-400 disabled:opacity-40"
            >
              {busy
                ? (isEn ? 'Please wait...' : 'Aguarde...')
                : isSignUp
                  ? (isEn ? 'Create account' : 'Criar conta')
                  : isRecoveryRequest
                    ? (isEn ? 'Send code' : 'Enviar codigo')
                    : isRecoveryVerify
                      ? (isEn ? 'Confirm code' : 'Confirmar codigo')
                      : isPasswordReset
                        ? (isEn ? 'Update password' : 'Atualizar senha')
                        : (isEn ? 'Sign in' : 'Entrar')}
            </button>

            {!isPasswordReset && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')}
                  className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {mode === 'sign-up'
                    ? (isEn ? 'I have an account' : 'Ja tenho conta')
                    : (isEn ? 'Create account' : 'Criar conta')}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode(mode.startsWith('password-recovery') ? 'sign-in' : 'password-recovery-request')}
                  className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {mode.startsWith('password-recovery')
                    ? (isEn ? 'Back' : 'Voltar')
                    : (isEn ? 'Forgot password' : 'Esqueci a senha')}
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}
