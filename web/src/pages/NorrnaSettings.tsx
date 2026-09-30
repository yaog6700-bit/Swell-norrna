import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, saveSettings, testTelegram, checkUpdate, updateManager } from '@/lib/norrna-api'
import type { AppSettings } from '@/lib/norrna-api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Bell, RefreshCw, ArrowUpCircle } from 'lucide-react'

export function NorrnaSettings() {
  return <SettingsPage />
}

export function NotificationsSettings() {
  return <SettingsPage tab='notifications' />
}

export function UpdateSettings() {
  return <SettingsPage tab='update' />
}

function SettingsPage({ tab = 'notifications' }: { tab?: 'notifications' | 'update' }) {
  return (
    <div className='max-w-2xl space-y-8'>
      <div>
        <h1 className='page-title'>系统设置</h1>
      </div>
      {tab === 'notifications' && <NotificationSettings />}
      {tab === 'update' && <UpdateSettings_ />}
    </div>
  )
}

function NotificationSettings() {
  const qc = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: ['settings'], queryFn: ({ signal }) => getSettings(signal) })
  const save = useMutation({ mutationFn: saveSettings, onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }) })
  const test = useMutation({ mutationFn: testTelegram })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const s: AppSettings = {
      telegram_bot_token: String(fd.get('token') ?? '').trim(),
      telegram_chat_id: String(fd.get('chat_id') ?? '').trim(),
      telegram_enabled: fd.get('enabled') === 'on',
      notify_offline: fd.get('notify_offline') === 'on',
      notify_quota: fd.get('notify_quota') === 'on',
    }
    save.mutate(s)
  }

  if (isPending) return <p className='text-sm text-muted-foreground'>加载中…</p>

  return (
    <section className='rounded-xl border border-border bg-card p-6'>
      <div className='mb-5 flex items-center gap-2'>
        <Bell className='size-4 text-muted-foreground' />
        <h2 className='font-semibold'>Telegram 通知</h2>
      </div>
      <form onSubmit={submit} className='space-y-4'>
        <div className='flex items-center gap-3'>
          <input type='checkbox' id='tg-enabled' name='enabled' defaultChecked={data?.telegram_enabled} className='rounded' />
          <label htmlFor='tg-enabled' className='text-sm font-medium'>启用 Telegram 通知</label>
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <label htmlFor='tg-token' className='text-sm font-medium'>Bot Token</label>
            <Input id='tg-token' name='token' defaultValue={data?.telegram_bot_token} placeholder='1234567890:ABC...' />
          </div>
          <div className='space-y-2'>
            <label htmlFor='tg-chat' className='text-sm font-medium'>Chat ID</label>
            <Input id='tg-chat' name='chat_id' defaultValue={data?.telegram_chat_id} placeholder='-1001234567890' />
          </div>
        </div>
        <div className='space-y-2 border-t border-border pt-4'>
          <p className='text-xs font-medium text-muted-foreground'>通知事件</p>
          <div className='flex flex-col gap-2'>
            <label className='flex items-center gap-3 text-sm'>
              <input type='checkbox' name='notify_offline' defaultChecked={data?.notify_offline ?? true} className='rounded' />
              Agent 离线
            </label>
            <label className='flex items-center gap-3 text-sm'>
              <input type='checkbox' name='notify_quota' defaultChecked={data?.notify_quota ?? true} className='rounded' />
              流量超限
            </label>
          </div>
        </div>
        {test.isSuccess && <p className='text-sm text-success'>测试消息已发送</p>}
        {test.isError && <p className='text-sm text-error'>发送失败，请检查配置</p>}
        {save.isSuccess && <p className='text-sm text-success'>已保存</p>}
        {save.isError && <p className='text-sm text-error'>保存失败</p>}
        <div className='flex gap-2 pt-1'>
          <Button type='submit' disabled={save.isPending}>{save.isPending ? '保存中…' : '保存'}</Button>
          <Button type='button' variant='outline' onClick={() => test.mutate()} disabled={test.isPending}>
            {test.isPending ? '发送中…' : '发送测试消息'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function UpdateSettings_() {
  const { data, isPending, refetch, isFetching } = useQuery({
    queryKey: ['update-check'],
    queryFn: ({ signal }) => checkUpdate(signal),
  })
  const upd = useMutation({ mutationFn: updateManager })

  return (
    <section className='rounded-xl border border-border bg-card p-6'>
      <div className='mb-5 flex items-center gap-2'>
        <ArrowUpCircle className='size-4 text-muted-foreground' />
        <h2 className='font-semibold'>版本更新</h2>
      </div>
      <div className='space-y-4'>
        {isPending ? (
          <p className='text-sm text-muted-foreground'>检查中…</p>
        ) : (
          <div className='space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>当前版本</span>
              <span className='font-medium'>{data?.current_version || '未知'}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>最新版本</span>
              <span className={'font-medium ' + (data?.has_update ? 'text-warning' : '')}>{data?.latest_version || '未知'}</span>
            </div>
            {data?.has_update && (
              <div className='rounded-lg bg-warning-muted px-4 py-3 text-xs text-warning'>
                新版本可获取新功能和安全修复
              </div>
            )}
            {!data?.has_update && data?.current_version && (
              <div className='rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground'>
                已是最新版本
              </div>
            )}
          </div>
        )}
        {upd.isSuccess && <p className='text-sm text-success'>更新成功，约 8 秒后自动重启，请刷新页面</p>}
        {upd.isError && <p className='text-sm text-error'>更新失败，请检查网络或手动更新</p>}
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={'size-4 ' + (isFetching ? 'motion-safe:animate-spin' : '')} />
            检查更新
          </Button>
          {data?.has_update && (
            <Button onClick={() => upd.mutate()} disabled={upd.isPending}>
              {upd.isPending ? '更新中…' : '立即更新'}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}