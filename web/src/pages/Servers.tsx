import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Link2, Server } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { listServers, createServer, deleteServer, connectServer } from '@/lib/norrna-api'
import type { NorrnaServer } from '@/lib/norrna-api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import React from 'react'

export function Servers() {
  const { t } = useTranslation()
  const [showAdd, setShowAdd] = useState(false)
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['servers'],
    queryFn: ({ signal }) => listServers(signal),
  })
  const servers = data ?? []
  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='page-title'>{t('serverMgmtTitle')}</h1>
          <p className='page-description'>{t('serverMgmtDesc')}</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>{t('refresh')}</Button>
          <Button size='sm' onClick={() => setShowAdd(true)}><Plus className='size-4' /> {t('addServer')}</Button>
        </div>
      </div>
      {isPending && <p className='text-sm text-muted-foreground'>{t('loading')}</p>}
      {isError && <p className='text-sm text-error'>{t('loadFailed')}</p>}
      {!isPending && servers.length === 0 && (
        <div className='rounded-xl border border-border bg-card px-6 py-12 text-center'>
          <Server className='mx-auto mb-4 size-10 text-muted-foreground' />
          <h2 className='font-semibold'>{t('noServers')}</h2>
          <p className='mt-2 text-sm text-muted-foreground'>{t('noServersDesc')}</p>
        </div>
      )}
      {servers.length > 0 && (
        <div className='divide-y divide-border rounded-xl border border-border bg-card'>
          {servers.map(s => <ServerRow key={s.id} server={s} />)}
        </div>
      )}
      <AddServerDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}

function ServerRow({ server }: { server: NorrnaServer }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const inv = () => qc.invalidateQueries({ queryKey: ['servers'] })
  const del = useMutation({ mutationFn: () => deleteServer(server.id), onSuccess: inv })
  const conn = useMutation({ mutationFn: () => connectServer(server.id), onSuccess: inv })
  const connected = server.status === 'connected'
  return (
    <div className='flex flex-wrap items-center gap-4 px-5 py-4'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <span className={'size-2 shrink-0 rounded-full ' + (connected ? 'bg-success' : 'bg-muted-foreground')} />
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium'>{server.name}</p>
          <p className='truncate text-xs text-muted-foreground font-mono'>{server.host}:{server.port}</p>
        </div>
      </div>
      <span className={'rounded-md px-2 py-0.5 text-xs font-medium ' + (connected ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground')}>
        {connected ? t('connected') : t('disconnected')}
      </span>
      <div className='flex gap-1'>
        <Button variant='outline' size='sm' onClick={() => conn.mutate()} disabled={conn.isPending || connected}>
          <Link2 className='size-3.5' />
          {conn.isPending ? t('connecting') : t('connectServer')}
        </Button>
        <Button variant='ghost' size='icon' className='size-8 text-error hover:bg-error-muted hover:text-error'
          onClick={() => { if (confirm(server.name)) del.mutate() }}>
          <Trash2 className='size-4' />
        </Button>
      </div>
    </div>
  )
}

function AddServerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: createServer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servers'] }); onClose() },
  })
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mut.mutate({ name: String(fd.get('name')).trim(), host: String(fd.get('host')).trim(), port: Number(fd.get('port')), api_key: String(fd.get('api_key')).trim() })
  }
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('addServer')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className='space-y-4 py-2'>
          <div className='space-y-2'>
            <label htmlFor='sv-name' className='text-sm font-medium'>{t('serverNameLabel')}</label>
            <Input id='sv-name' name='name' required placeholder='Production Server' disabled={mut.isPending} />
          </div>
          <div className='grid grid-cols-3 gap-2'>
            <div className='col-span-2 space-y-2'>
              <label htmlFor='sv-host' className='text-sm font-medium'>{t('serverHostLabel')}</label>
              <Input id='sv-host' name='host' required placeholder='192.168.1.100' disabled={mut.isPending} />
            </div>
            <div className='space-y-2'>
              <label htmlFor='sv-port' className='text-sm font-medium'>{t('serverPortLabel')}</label>
              <Input id='sv-port' name='port' type='number' required defaultValue='9000' min='1' max='65535' disabled={mut.isPending} />
            </div>
          </div>
          <div className='space-y-2'>
            <label htmlFor='sv-key' className='text-sm font-medium'>{t('serverApiKeyLabel')}</label>
            <Input id='sv-key' name='api_key' required type='password' placeholder='API Key' disabled={mut.isPending} />
          </div>
          {mut.isError && <p className='text-sm text-error'>{t('createFailed')}</p>}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={mut.isPending}>{t('cancel')}</Button>
            <Button type='submit' disabled={mut.isPending}>{mut.isPending ? t('creating2') : t('create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}