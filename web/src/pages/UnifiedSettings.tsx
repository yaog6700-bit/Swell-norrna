import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell, ArrowUpCircle, Palette, Shield } from 'lucide-react'
import { changePassword } from '@/lib/auth'
import { getSettings, saveSettings, testTelegram, checkUpdate, updateManager } from '@/lib/norrna-api'
import type { AppSettings } from '@/lib/norrna-api'
import { ThemeSelect, LanguageSelect } from '@/components/Preferences'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const TABS = [
  { id: 'appearance', icon: Palette,     labelKey: 'settingsTabAppearance' },
  { id: 'notify',     icon: Bell,        labelKey: 'settingsTabNotify' },
  { id: 'security',   icon: Shield,      labelKey: 'settingsTabSecurity' },
  { id: 'update',     icon: ArrowUpCircle, labelKey: 'settingsTabUpdate' },
] as const

type TabId = (typeof TABS)[number]['id']

export function UnifiedSettings() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('appearance')
  const active = TABS.find(t => t.id === tab)!

  return (
    <div className='max-w-3xl space-y-6'>
      <h1 className='page-title'>{t('navSettings')}</h1>

      {/* Tab bar */}
      <div className='flex gap-1 rounded-xl border border-border bg-muted p-1'>
        {TABS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ' +
              (tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <Icon className='size-4 shrink-0' aria-hidden='true' />
            <span className='hidden sm:inline'>{t(labelKey as any)}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {tab === 'appearance' && <AppearanceSection />}
        {tab === 'notify'     && <NotifySection />}
        {tab === 'security'   && <SecuritySection />}
        {tab === 'update'     && <UpdateSection />}
      </div>
    </div>
  )
}

/* ── Appearance ── */
function AppearanceSection() {
  const { t } = useTranslation()
  return (
    <div className='rounded-xl border border-border bg-card divide-y divide-border'>
      <Row label={t('themeLabel')}><ThemeSelect /></Row>
      <Row label={t('languageLabel')}><LanguageSelect /></Row>
    </div>
  )
}

/* ── Notifications ── */
function NotifySection() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: ['settings'], queryFn: ({ signal }) => getSettings(signal) })
  const save = useMutation({ mutationFn: saveSettings, onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }) })
  const test = useMutation({ mutationFn: testTelegram })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    save.mutate({
      telegram_bot_token: String(fd.get('token') ?? '').trim(),
      telegram_chat_id: String(fd.get('chat_id') ?? '').trim(),
      telegram_enabled: fd.get('enabled') === 'on',
      notify_offline: fd.get('notify_offline') === 'on',
      notify_quota: fd.get('notify_quota') === 'on',
    } as AppSettings)
  }

  if (isPending) return <p className='text-sm text-muted-foreground'>{t('loading')}</p>
  return (
    <form onSubmit={submit}>
      <div className='rounded-xl border border-border bg-card divide-y divide-border'>
        <div className='flex items-center gap-3 px-5 py-4'>
          <input type='checkbox' id='tg-enabled' name='enabled' defaultChecked={data?.telegram_enabled} className='rounded' />
          <label htmlFor='tg-enabled' className='text-sm font-medium'>{t('enableTelegram')}</label>
        </div>
        <Row label={t('botTokenLabel')}>
          <Input name='token' defaultValue={data?.telegram_bot_token} placeholder='1234567890:ABC…' className='w-64' />
        </Row>
        <Row label={t('chatIdLabel')}>
          <Input name='chat_id' defaultValue={data?.telegram_chat_id} placeholder='-1001234567890' className='w-64' />
        </Row>
        <div className='px-5 py-4 space-y-2'>
          <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>{t('notifyEvents')}</p>
          <label className='flex items-center gap-3 text-sm'>
            <input type='checkbox' name='notify_offline' defaultChecked={data?.notify_offline ?? true} className='rounded' />
            {t('notifyOfflineLabel')}
          </label>
          <label className='flex items-center gap-3 text-sm'>
            <input type='checkbox' name='notify_quota' defaultChecked={data?.notify_quota ?? true} className='rounded' />
            {t('notifyQuotaLabel')}
          </label>
        </div>
        <div className='flex flex-wrap items-center gap-2 px-5 py-4'>
          {test.isSuccess && <span className='text-sm text-success'>{t('testSuccess')}</span>}
          {test.isError && <span className='text-sm text-error'>{t('testFailed')}</span>}
          {save.isSuccess && <span className='text-sm text-success'>{t('saved')}</span>}
          {save.isError && <span className='text-sm text-error'>{t('saveFailed')}</span>}
          <div className='ml-auto flex gap-2'>
            <Button type='button' variant='outline' onClick={() => test.mutate()} disabled={test.isPending}>
              {test.isPending ? t('sending') : t('testMessage')}
            </Button>
            <Button type='submit' disabled={save.isPending}>
              {save.isPending ? t('saving') : t('saveSettings')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

/* ── Security ── */
function SecuritySection() {
  const { t } = useTranslation()
  const mut = useMutation({ mutationFn: changePassword })
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mut.mutate({ old_password: String(fd.get('old')), new_password: String(fd.get('new')) })
    if (mut.isSuccess) (e.target as HTMLFormElement).reset()
  }
  return (
    <form onSubmit={submit}>
      <div className='rounded-xl border border-border bg-card divide-y divide-border'>
        <Row label={t('currentPasswordLabel')}>
          <Input name='old' type='password' autoComplete='current-password' required className='w-64' disabled={mut.isPending} />
        </Row>
        <Row label={t('newPasswordLabel')} hint={t('newPasswordHint')}>
          <Input name='new' type='password' autoComplete='new-password' required minLength={6} className='w-64' disabled={mut.isPending} />
        </Row>
        <div className='flex items-center gap-3 px-5 py-4'>
          {mut.isSuccess && <span className='text-sm text-success'>{t('passwordChanged')}</span>}
          {mut.isError && <span className='text-sm text-error'>{t('passwordChangeFailed')}</span>}
          <Button type='submit' className='ml-auto' disabled={mut.isPending}>
            {mut.isPending ? t('changingPassword') : t('changePassword')}
          </Button>
        </div>
      </div>
    </form>
  )
}

/* ── Version Update ── */
function UpdateSection() {
  const { t } = useTranslation()
  const { data, isPending, refetch, isFetching } = useQuery({
    queryKey: ['update-check'],
    queryFn: ({ signal }) => checkUpdate(signal),
  })
  const upd = useMutation({ mutationFn: updateManager })
  return (
    <div className='rounded-xl border border-border bg-card divide-y divide-border'>
      <Row label={t('currentVersion')}>
        <span className='text-sm font-mono'>{isPending ? '…' : (data?.current_version || '—')}</span>
      </Row>
      <Row label={t('latestVersion')}>
        <span className={'text-sm font-mono ' + (data?.has_update ? 'text-warning font-semibold' : '')}>
          {isPending ? '…' : (data?.latest_version || '—')}
        </span>
      </Row>
      {data?.has_update && (
        <div className='px-5 py-3'>
          <p className='text-sm text-warning'>{t('updateAvailable')}</p>
        </div>
      )}
      <div className='flex items-center gap-2 px-5 py-4'>
        {upd.isSuccess && <span className='text-sm text-success'>{t('updateSuccess')}</span>}
        {upd.isError && <span className='text-sm text-error'>{t('updateFailed')}</span>}
        <div className='ml-auto flex gap-2'>
          <Button variant='outline' onClick={() => refetch()} disabled={isFetching}>
            {t('checkUpdate')}
          </Button>
          {data?.has_update && (
            <Button onClick={() => upd.mutate()} disabled={upd.isPending}>
              {upd.isPending ? t('updating') : t('updateManager')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Shared ── */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-4 px-5 py-4'>
      <div>
        <p className='text-sm font-medium'>{label}</p>
        {hint && <p className='mt-0.5 text-xs text-muted-foreground'>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

import React from 'react'