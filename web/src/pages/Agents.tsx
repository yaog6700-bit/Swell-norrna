import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, RefreshCw, Server, Copy, Check, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { listAgents, createAgent, deleteAgent, updateAgent, updateAgentBin, getAgentFull, setAgentMux } from '@/lib/norrna-api'
import type { Agent } from '@/lib/norrna-api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'

export function Agents() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['agents'],
    queryFn: ({ signal }) => listAgents(signal),
  })
  const agents = data ?? []
  const online = agents.filter(a => a.status === 'online').length
  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='page-title'>{t('agentsTitle')}</h1>
          <p className='page-description'>{t('agentsDescription', { total: agents.length, online })}</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={'size-4 ' + (isFetching ? 'motion-safe:animate-spin' : '')} aria-hidden='true' />
            {t('refresh')}
          </Button>
          <Button size='sm' onClick={() => setShowCreate(true)}>
            <Plus className='size-4' aria-hidden='true' /> {t('addAgent')}
          </Button>
        </div>
      </div>
      {isPending && <p role='status' className='text-sm text-muted-foreground'>{t('loading')}</p>}
      {isError && <p role='alert' className='text-sm text-error'>{t('loadFailed')}</p>}
      {!isPending && agents.length === 0 && (
        <div className='rounded-xl border border-border bg-card px-6 py-12 text-center'>
          <Server className='mx-auto mb-4 size-10 text-muted-foreground' />
          <h2 className='font-semibold'>{t('noAgentsTitle')}</h2>
          <p className='mt-2 text-sm text-muted-foreground'>{t('noAgentsDescription')}</p>
        </div>
      )}
      {agents.length > 0 && (
        <div className='divide-y divide-border rounded-xl border border-border bg-card'>
          {agents.map(agent => <AgentRow key={agent.id} agent={agent} />)}
        </div>
      )}
      <CreateAgentDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}

function AgentRow({ agent }: { agent: Agent }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const del = useMutation({ mutationFn: () => deleteAgent(agent.id), onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }) })
  const upd = useMutation({ mutationFn: () => updateAgentBin(agent.id) })
  const { data: full } = useQuery({
    queryKey: ['agent-full', agent.id],
    queryFn: ({ signal }) => getAgentFull(agent.id, signal),
    enabled: expanded,
  })
  const copyInstallCmd = () => {
    const cmd = "bash <(curl -fsSL http://PANEL_IP:3000/norrna_agent.sh) server=PANEL_IP:3001 apikey=" + agent.api_key + " dns=223.5.5.5:53"
    navigator.clipboard.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div>
      <div className='flex flex-wrap items-center gap-4 px-5 py-4'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <span className={'size-2 shrink-0 rounded-full ' + (agent.status === 'online' ? 'bg-success' : 'bg-muted-foreground')} />
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium'>{agent.name}</p>
            <p className='truncate text-xs text-muted-foreground'>{agent.ip || ''}{agent.hostname ? ' (' + agent.hostname + ')' : ''}</p>
          </div>
        </div>
        {agent.status === 'online' && (
          <div className='hidden items-center gap-4 text-xs text-muted-foreground sm:flex'>
            <span>CPU {agent.cpu_usage.toFixed(1)}%</span>
            {agent.memory_total > 0 && <span>{((agent.memory_usage / agent.memory_total) * 100).toFixed(0)}% RAM</span>}
            {agent.realm_version && <span>Realm {agent.realm_version}</span>}
          </div>
        )}
        {agent.traffic_quota_bytes > 0 && (
          <span className='hidden text-xs text-muted-foreground sm:block'>
            {fmtBytes(agent.traffic_used_bytes)} / {fmtBytes(agent.traffic_quota_bytes)}
          </span>
        )}
        <span className={'rounded-md px-2 py-0.5 text-xs font-medium ' + (agent.status === 'online' ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground')}>
          {t(agent.status === 'online' ? 'online' : 'offline')}
        </span>
        <div className='flex gap-1'>
          <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={copyInstallCmd} title={t('copyInstallCmd')}>
            {copied ? <Check className='size-4 text-success' /> : <Copy className='size-4' />}
          </Button>
          <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={() => setShowEdit(true)} title={t('editAgentTitle')}>
            <Pencil className='size-4' />
          </Button>
          <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={() => upd.mutate()} disabled={upd.isPending || agent.status !== 'online'} title={t('updateAgent')}>
            <RefreshCw className={'size-4 ' + (upd.isPending ? 'motion-safe:animate-spin' : '')} />
          </Button>
          <Button variant='ghost' size='icon' className='size-8 text-error hover:bg-error-muted hover:text-error' onClick={() => { if (confirm(agent.name)) del.mutate() }} title={t('deleteAgent')}>
            <Trash2 className='size-4' />
          </Button>
          <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={() => setExpanded(v => !v)} title={expanded ? t('collapse') : t('expand')}>
            {expanded ? <ChevronUp className='size-4' /> : <ChevronDown className='size-4' />}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className='border-t border-border bg-muted/30 px-5 py-4'>
          <p className='mb-2 text-xs font-medium text-muted-foreground'>{t('installCmdLabel')}</p>
          <code className='block rounded-lg bg-muted p-3 text-xs break-all leading-6'>
            {"bash <(curl -fsSL http://PANEL_IP:3000/norrna_agent.sh) server=PANEL_IP:3001 apikey=" + agent.api_key + " dns=223.5.5.5:53"}
          </code>
          {full && (
            <div className='mt-4'>
              <p className='mb-2 text-xs font-medium text-muted-foreground'>{t('forwardingInstances', { count: full.instances.length })}</p>
              {full.instances.length === 0 ? (
                <p className='text-xs text-muted-foreground'>{t('noInstances')}</p>
              ) : (
                <div className='space-y-1'>
                  {full.instances.map(inst => (
                    <div key={inst.id} className='flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs'>
                      <span className={'size-1.5 rounded-full ' + (inst.status === 'Running' ? 'bg-success' : 'bg-muted-foreground')} />
                      <span className='font-mono'>{inst.config.listen}</span>
                      <span className='text-muted-foreground'>→</span>
                      <span className='font-mono'>{inst.config.remote}</span>
                      {inst.note && <span className='ml-auto text-muted-foreground'>{inst.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <EditAgentDialog agent={agent} open={showEdit} onClose={() => setShowEdit(false)} />
    </div>
  )
}

function fmtBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return (bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 1) + ' ' + units[i]
}

function EditAgentDialog({ agent, open, onClose }: { agent: Agent; open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [keyCopied, setKeyCopied] = useState(false)
  const mut = useMutation({
    mutationFn: (body: { name?: string; traffic_quota_gb?: number }) => updateAgent(agent.id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); onClose() },
  })
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mut.mutate({
      name: String(fd.get('name')).trim() || agent.name,
      traffic_quota_gb: Number(fd.get('quota') ?? 0),
    })
  }
  const copyKey = () => {
    navigator.clipboard.writeText(agent.api_key).then(() => { setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000) })
  }
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('editAgentTitle')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className='space-y-4 py-2'>
          {/* Name */}
          <div className='space-y-2'>
            <label htmlFor='ea-name' className='text-sm font-medium'>{t('agentNameLabel')}</label>
            <Input id='ea-name' name='name' required defaultValue={agent.name} disabled={mut.isPending} />
          </div>
          {/* API Key (readonly + copy) */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('apiKeyLabel')}</label>
            <div className='flex gap-2'>
              <Input value={agent.api_key} readOnly className='flex-1 font-mono text-xs bg-muted cursor-default' />
              <Button type='button' variant='outline' size='icon' className='shrink-0' onClick={copyKey} title={t('copyApiKey')}>
                {keyCopied ? <Check className='size-4 text-success' /> : <Copy className='size-4' />}
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>{t('apiKeyHint')}</p>
          </div>
          {/* Quota */}
          <div className='space-y-2'>
            <label htmlFor='ea-quota' className='text-sm font-medium'>{t('quotaLabel')}</label>
            <Input
              id='ea-quota'
              name='quota'
              type='number'
              min='0'
              step='1'
              defaultValue={agent.traffic_quota_bytes > 0 ? Math.round(agent.traffic_quota_bytes / 1073741824) : 0}
              placeholder={t('quotaPlaceholder')}
              disabled={mut.isPending}
            />
            <p className='text-xs text-muted-foreground'>{t('quotaHint')}</p>
          </div>
          {mut.isError && <p role='alert' className='text-sm text-error'>{t('saveFailed')}</p>}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={mut.isPending}>{t('cancel')}</Button>
            <Button type='submit' disabled={mut.isPending}>{mut.isPending ? t('saving') : t('saveChanges')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function genApiKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function CreateAgentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [apiKey, setApiKey] = React.useState(genApiKey)

  React.useEffect(() => {
    if (open) setApiKey(genApiKey())
  }, [open])

  const mut = useMutation({
    mutationFn: createAgent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); onClose() },
  })
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    mut.mutate({ name: String(fd.get('name')).trim(), api_key: apiKey.trim() })
  }
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('addAgentTitle')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className='space-y-4 py-2'>
          <div className='space-y-2'>
            <label htmlFor='agent-name' className='text-sm font-medium'>{t('agentNameLabel')}</label>
            <Input id='agent-name' name='name' required placeholder={t('agentNamePlaceholder')} disabled={mut.isPending} />
          </div>
          <div className='space-y-2'>
            <label htmlFor='agent-key' className='text-sm font-medium'>{t('apiKeyLabel')}</label>
            <div className='flex gap-2'>
              <Input
                id='agent-key'
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                required
                className='font-mono text-xs'
                disabled={mut.isPending}
              />
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='shrink-0'
                onClick={() => setApiKey(genApiKey())}
                disabled={mut.isPending}
                title='重新生成'
              >
                <svg xmlns='http://www.w3.org/2000/svg' className='size-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M21 2v6h-6'/><path d='M3 12a9 9 0 0 1 15-6.7L21 8'/>
                  <path d='M3 22v-6h6'/><path d='M21 12a9 9 0 0 1-15 6.7L3 16'/>
                </svg>
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>{t('apiKeyHint')}</p>
          </div>
          {mut.isError && <p role='alert' className='text-sm text-error'>{t('createFailed')}</p>}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose} disabled={mut.isPending}>{t('cancel')}</Button>
            <Button type='submit' disabled={mut.isPending}>{mut.isPending ? t('creating2') : t('create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import React from 'react'
