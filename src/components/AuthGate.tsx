import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { useCloudSaveStore } from '../store/cloudSaveStore'
import { cn } from '../lib/utils'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(email: string): string | null {
  if (!emailPattern.test(email)) return 'Informe um e-mail valido.'
  return null
}

function validatePassword(password: string): string | null {
  if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.'
  return null
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const cloud = useCloudSaveStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    cloud.init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const busy = cloud.status === 'loading' || cloud.status === 'syncing'
  const mode = cloud.authMode
  const isSignUp = mode === 'sign-up'
  const isRecoveryRequest = mode === 'password-recovery-request'
  const isRecoveryVerify = mode === 'password-recovery-verify'
  const isPasswordReset = mode === 'password-reset'

  if (cloud.user && !isPasswordReset) return <>{children}</>

  function clearSecrets() {
    setPassword('')
    setConfirmPassword('')
    setRecoveryCode('')
  }

  function switchMode(nextMode: typeof mode) {
    setLocalError(null)
    clearSecrets()
    cloud.setAuthMode(nextMode)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLocalError(null)

    const cleanEmail = email.trim().toLowerCase()
    const emailError = !isPasswordReset ? validateEmail(cleanEmail) : null
    if (emailError) return setLocalError(emailError)

    if (mode === 'sign-in') {
      const passwordError = validatePassword(password)
      if (passwordError) return setLocalError(passwordError)
      await cloud.signInWithPassword(cleanEmail, password)
      setPassword('')
      return
    }

    if (mode === 'sign-up') {
      const passwordError = validatePassword(password)
      if (passwordError) return setLocalError(passwordError)
      if (password !== confirmPassword) return setLocalError('As senhas nao conferem.')
      await cloud.signUpWithPassword(cleanEmail, password)
      clearSecrets()
      return
    }

    if (mode === 'password-recovery-request') {
      await cloud.requestPasswordRecovery(cleanEmail)
      return
    }

    if (mode === 'password-recovery-verify') {
      const code = recoveryCode.replace(/\D/g, '')
      if (!/^\d{6,8}$/.test(code)) return setLocalError('Informe o codigo recebido por e-mail.')
      await cloud.verifyRecoveryOtp(cleanEmail || cloud.recoveryEmail || '', code)
      setRecoveryCode('')
      return
    }

    if (mode === 'password-reset') {
      const passwordError = validatePassword(password)
      if (passwordError) return setLocalError(passwordError)
      if (password !== confirmPassword) return setLocalError('As senhas nao conferem.')
      await cloud.updatePassword(password)
      clearSecrets()
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="border-b border-slate-800 px-6 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
            Incremental Idle
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            {isSignUp
              ? 'Criar conta'
              : isRecoveryRequest || isRecoveryVerify
                ? 'Recuperar senha'
                : isPasswordReset
                  ? 'Alterar senha'
                  : 'Entrar'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {isSignUp
              ? 'Crie uma conta para salvar seu progresso na nuvem.'
              : isRecoveryRequest
                ? 'Informe o e-mail da sua conta para receber um codigo.'
                : isRecoveryVerify
                  ? 'Digite o codigo enviado para o seu e-mail.'
                  : isPasswordReset
                    ? 'Escolha uma nova senha para continuar.'
                    : 'Faça login para carregar seu save local e sincronizar a nuvem.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {!cloud.configured && (
            <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              Supabase nao configurado neste build.
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
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
              />
            </label>
          )}

          {(mode === 'sign-in' || mode === 'sign-up') && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                disabled={busy}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
              />
            </label>
          )}

          {(isSignUp || isPasswordReset) && (
            <>
              {isPasswordReset && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nova senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    disabled={busy}
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Confirmar senha</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
                />
              </label>
            </>
          )}

          {isRecoveryVerify && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Codigo</span>
              <input
                type="text"
                inputMode="numeric"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                disabled={busy}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400"
              />
            </label>
          )}

          {(localError || cloud.error || cloud.message) && (
            <button
              type="button"
              onClick={() => { setLocalError(null); cloud.clearMessage() }}
              className={cn(
                'rounded-md border px-3 py-2 text-left text-xs leading-5',
                localError || cloud.error
                  ? 'border-red-800 bg-red-950/30 text-red-200'
                  : 'border-slate-700 bg-slate-950/40 text-slate-300',
              )}
            >
              {localError ?? cloud.error ?? cloud.message}
            </button>
          )}

          <button
            type="submit"
            disabled={busy || !cloud.configured}
            className="rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-indigo-400 disabled:opacity-40"
          >
            {busy
              ? 'Aguarde...'
              : isSignUp
                ? 'Criar conta'
                : isRecoveryRequest
                  ? 'Enviar codigo'
                  : isRecoveryVerify
                    ? 'Confirmar codigo'
                    : isPasswordReset
                      ? 'Atualizar senha'
                      : 'Entrar'}
          </button>

          {!isPasswordReset && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')}
                className="rounded-md border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                {mode === 'sign-up' ? 'Ja tenho conta' : 'Criar conta'}
              </button>
              <button
                type="button"
                onClick={() => switchMode(mode.startsWith('password-recovery') ? 'sign-in' : 'password-recovery-request')}
                className="rounded-md border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                {mode.startsWith('password-recovery') ? 'Voltar' : 'Esqueci a senha'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

