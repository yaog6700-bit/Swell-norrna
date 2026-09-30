import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/request'
import { setup, signIn } from '@/lib/auth'
import { replaceAuthState } from '@/lib/query'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type FieldError = { field: string; message: string } | null

export function Auth({ mode }: { mode: 'setup' | 'login' }) {
  const creating = mode === 'setup'
  const { t } = useTranslation()
  const client = useQueryClient()
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  const [fieldError, setFieldError] = useState<FieldError>(null)

  useEffect(() => { if (creating) heading.current?.focus() }, [creating])

  const mutation = useMutation({
    gcTime: 0,
    mutationFn: (input: { username: string; password: string }) =>
      creating ? setup(input) : signIn(input),
    onSuccess: (authState) => replaceAuthState(client, authState),
  })

  const validate = (username: string, password: string, confirm?: string): FieldError => {
    if (!username) return { field: 'username', message: t('usernameEmpty') }
    if (username.length > 64) return { field: 'username', message: t('usernameTooLong') }
    if (password.length < 6) return { field: 'password', message: t('passwordTooShort') }
    if (confirm !== undefined && password !== confirm) return { field: 'confirm', message: t('passwordMismatch') }
    return null
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (mutation.isPending) return
    const form = event.currentTarget
    const data = new FormData(form)
    const username = String(data.get('username') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const confirm = creating ? String(data.get('confirm') ?? '') : undefined
    setFieldError(null)
    mutation.reset()
    const err = validate(username, password, confirm)
    if (err) {
      setFieldError(err)
      const el = form.elements.namedItem(err.field)
      if (el instanceof HTMLInputElement) el.focus()
      return
    }
    mutation.mutate({ username, password })
  }

  const errorMsg = mutation.error instanceof ApiError ? mutation.error.code : mutation.isError ? t('connectionError') : null

  const field = (name: string, labelKey: string, type: string, hintKey?: string) => (
    <div className='space-y-2'>
      <label htmlFor={'auth-' + name} className='text-sm font-medium'>{t(labelKey as any)}</label>
      <Input
        id={'auth-' + name}
        name={name}
        type={type}
        autoComplete={name === 'username' ? 'username' : name === 'password' ? (creating ? 'new-password' : 'current-password') : 'new-password'}
        autoCapitalize='none'
        spellCheck={false}
        maxLength={name === 'username' ? 64 : 256}
        required
        disabled={mutation.isPending}
        aria-invalid={fieldError?.field === name}
        aria-describedby={fieldError?.field === name ? 'field-error-' + name : hintKey ? 'hint-' + name : undefined}
      />
      {fieldError?.field === name ? (
        <p id={'field-error-' + name} role='alert' className='text-sm text-error'>{fieldError.message}</p>
      ) : hintKey ? (
        <p id={'hint-' + name} className='text-xs leading-5 text-muted-foreground'>{t(hintKey as any)}</p>
      ) : null}
    </div>
  )

  return (
    <AuthShell>
      {creating && (
        <Button variant='ghost' size='sm' className='-ml-2.5 mb-6 text-muted-foreground' disabled={mutation.isPending} onClick={() => navigate({ to: '/setup' })}>
          <ArrowLeft aria-hidden='true' />
          {t('backToWelcome')}
        </Button>
      )}
      {creating && (
        <p className='mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground'>{t('setupProgress')}</p>
      )}
      <h1 ref={heading} tabIndex={-1} className='text-2xl font-semibold tracking-tight outline-none'>
        {creating ? t('createAdmin') : t('signInTitle')}
      </h1>
      {creating && (
        <p className='mb-7 mt-2 text-sm leading-6 text-muted-foreground'>{t('createAdminDescription')}</p>
      )}
      <form noValidate onSubmit={submit} className={creating ? 'space-y-5' : 'mt-7 space-y-5'}>
        {field('username', 'usernameLabel', 'text', creating ? 'usernameHint' : undefined)}
        {field('password', 'passwordLabel', 'password', creating ? 'passwordHint' : undefined)}
        {creating && field('confirm', 'confirmPasswordLabel', 'password')}
        {errorMsg && <p role='alert' className='text-sm leading-6 text-error'>{errorMsg}</p>}
        <Button type='submit' className='w-full' disabled={mutation.isPending}>
          {mutation.isPending && <LoaderCircle className='motion-safe:animate-spin' aria-hidden='true' />}
          {mutation.isPending ? (creating ? t('creating') : t('signingIn')) : (creating ? t('createAccount') : t('signIn'))}
        </Button>
      </form>
    </AuthShell>
  )
}