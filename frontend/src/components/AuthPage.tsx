import { useState, type FormEvent } from 'react'
import { useLogin, useSignup } from '../hooks/useAuth'
import { Spinner } from './SaveButton'

type Mode = 'login' | 'signup'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

const field =
  'w-full rounded-md border border-[#dadce0] bg-white px-3 py-2.5 text-[15px] outline-none transition focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/25 dark:border-[#5f6368] dark:bg-[#303134] dark:focus:border-[#8ab4f8]'

const DEMO = { email: 'demo@test.com', password: 'demo1234' }

function readQuery() {
  if (typeof window === 'undefined') return { mode: 'login' as Mode, demo: false }
  const q = new URLSearchParams(window.location.search)
  return { mode: q.get('mode') === 'signup' ? ('signup' as Mode) : ('login' as Mode), demo: q.get('demo') === '1' }
}

/** Sign-in / sign-up card shown while there is no session. */
export function AuthPage() {
  const [initial] = useState(readQuery)
  const [mode, setMode] = useState<Mode>(initial.mode)
  const [email, setEmail] = useState(initial.demo ? DEMO.email : '')
  const [password, setPassword] = useState(initial.demo ? DEMO.password : '')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const login = useLogin()
  const signup = useSignup()
  const active = mode === 'login' ? login : signup

  const emailError = !EMAIL.test(email.trim()) ? 'Enter a valid email address' : null
  const passwordError = password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters` : null
  const confirmError = mode === 'signup' && confirm !== password ? 'Passwords do not match' : null
  const invalid = emailError || passwordError || confirmError

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (invalid || active.isPending) return
    active.mutate({ email: email.trim(), password })
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setTouched(false)
    setConfirm('')
    login.reset()
    signup.reset()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-10 dark:bg-[#202124]">
      <div className="w-full max-w-sm">
        <a href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fbbc04] to-[#f28b82] text-lg font-bold text-[#202124]">
            D
          </span>
          <span className="text-2xl text-[#5f6368] dark:text-[#e8eaed]">Draftify</span>
        </a>

        <form
          onSubmit={submit}
          noValidate
          className="rounded-lg border border-[#dadce0] bg-white p-6 shadow-keep dark:border-[#5f6368] dark:bg-[#303134]"
        >
          <h1 className="mb-1 text-xl font-medium">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
          <p className="mb-5 text-sm text-[#5f6368] dark:text-[#9aa0a6]">
            {mode === 'login' ? 'to continue to Draftify' : 'Notes, labels and everything else are private to you'}
          </p>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={touched && !!emailError}
              className={field}
            />
            {touched && emailError && <span className="mt-1 block text-xs text-[#d93025]">{emailError}</span>}
          </label>

          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={touched && !!passwordError}
              className={field}
            />
            {touched && passwordError && <span className="mt-1 block text-xs text-[#d93025]">{passwordError}</span>}
          </label>

          {mode === 'signup' && (
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium">Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={touched && !!confirmError}
                className={field}
              />
              {touched && confirmError && <span className="mt-1 block text-xs text-[#d93025]">{confirmError}</span>}
            </label>
          )}

          {active.isError && (
            <p role="alert" className="mb-3 rounded-md bg-[#fce8e6] px-3 py-2 text-sm text-[#c5221f] dark:bg-[#5c2b29] dark:text-[#f28b82]">
              {active.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={active.isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-[#1a73e8] py-2.5 text-sm font-medium text-white transition hover:bg-[#1765cc] disabled:opacity-60"
          >
            {active.isPending && <Spinner className="h-4 w-4" />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {mode === 'login' && !initial.demo && (
            <p className="mt-4 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              Just looking?{' '}
              <a href="/app?demo=1" className="font-medium text-[#1a73e8] hover:underline">
                Use the demo account
              </a>
            </p>
          )}
          <p className="mt-5 text-center text-sm text-[#5f6368] dark:text-[#9aa0a6]">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-medium text-[#1a73e8] hover:underline">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('login')} className="font-medium text-[#1a73e8] hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </main>
  )
}
