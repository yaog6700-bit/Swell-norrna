import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { changePassword } from '@/lib/auth'
import { ThemeSelect, LanguageSelect } from '@/components/Preferences'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function Settings() {
  const { t } = useTranslation()
  const changePwd = useMutation({
    mutationFn: (body: { old_password: string; new_password: string }) => changePassword(body),
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    changePwd.mutate({
      old_password: String(fd.get('old_password')),
      new_password: String(fd.get('new_password')),
    })
    if (changePwd.isSuccess) (e.target as HTMLFormElement).reset()
  }

  return (
    <div className='max-w-2xl space-y-8'>
      <h1 className='page-title'>{t('prefsTitle')}</h1>

      <div className='rounded-xl border border-border bg-card divide-y divide-border'>
        {/* Theme row */}
        <div className='flex items-center justify-between px-5 py-4'>
          <div>
            <p className='text-sm font-medium'>{t('themeLabel')}</p>
          </div>
          <ThemeSelect />
        </div>

        {/* Language row */}
        <div className='flex items-center justify-between px-5 py-4'>
          <div>
            <p className='text-sm font-medium'>{t('languageLabel')}</p>
          </div>
          <LanguageSelect />
        </div>

        {/* Password row */}
        <div className='flex items-center justify-between px-5 py-4'>
          <div>
            <p className='text-sm font-medium'>{t('changePasswordSection')}</p>
            <p className='mt-0.5 text-xs text-muted-foreground'>{t('newPasswordHint')}</p>
          </div>
          <ChangePasswordDialog />
        </div>
      </div>
    </div>
  )
}

function ChangePasswordDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const changePwd = useMutation({
    mutationFn: (body: { old_password: string; new_password: string }) => changePassword(body),
    onSuccess: () => setOpen(false),
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    changePwd.mutate({
      old_password: String(fd.get('old_password')),
      new_password: String(fd.get('new_password')),
    })
  }

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setOpen(true)}>{t('changePassword')}</Button>
      {open && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl'>
            <h2 className='mb-5 text-base font-semibold'>{t('changePasswordSection')}</h2>
            <form onSubmit={submit} className='space-y-4'>
              <div className='space-y-2'>
                <label htmlFor='cp-old' className='text-sm font-medium'>{t('currentPasswordLabel')}</label>
                <Input id='cp-old' name='old_password' type='password' autoComplete='current-password' required disabled={changePwd.isPending} />
              </div>
              <div className='space-y-2'>
                <label htmlFor='cp-new' className='text-sm font-medium'>{t('newPasswordLabel')}</label>
                <Input id='cp-new' name='new_password' type='password' autoComplete='new-password' required minLength={6} disabled={changePwd.isPending} />
              </div>
              {changePwd.isError && <p role='alert' className='text-sm text-error'>{t('passwordChangeFailed')}</p>}
              <div className='flex justify-end gap-2 pt-1'>
                <Button type='button' variant='outline' onClick={() => setOpen(false)} disabled={changePwd.isPending}>{t('cancel')}</Button>
                <Button type='submit' disabled={changePwd.isPending}>{changePwd.isPending ? t('changingPassword') : t('changePassword')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

import React from 'react'