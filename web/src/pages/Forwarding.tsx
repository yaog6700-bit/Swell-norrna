import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Play, Square, RotateCcw, Route, Zap, Pencil, Unlock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { listAgents, listInstances, createInstance, updateInstance, deleteInstance, startInstance, stopInstance, restartInstance, probeInstance, unlockInstance } from '@/lib/norrna-api'
import type { Agent, Instance, InstanceConfig } from '@/lib/norrna-api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'

export function Forwarding() {
  const { t } = useTranslation()
  const { data, isPending, isError } = useQuery({ queryKey: ['agents'], queryFn: ({ signal }) => listAgents(signal) })
  const agents = data ?? []
  const [selected, setSelected] = useState<string | null>(null)
  const activeAgent = agents.find(a => a.id === selected) ?? agents[0] ?? null
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='page-title'>{t('forwardingTitle')}</h1>
        <p className='page-description'>{t('forwardingDescription')}</p>
      </div>
      {isPending && <p role='status' className='text-sm text-muted-foreground'>{t('loading')}</p>}
      {isError && <p role='alert' className='text-sm text-error'>{t('loadFailed')}</p>}
      {!isPending && agents.length === 0 && (
        <div className='rounded-xl border border-border bg-card px-6 py-12 text-center'>
          <Route className='mx-auto mb-4 size-10 text-muted-foreground' />
          <h2 className='font-semibold'>{t('noAgentForForwarding')}</h2>
          <p className='mt-2 text-sm text-muted-foreground'>{t('noAgentForForwardingDetail')}</p>
        </div>
      )}
      {agents.length > 0 && (
        <div className='flex gap-6'>
          <aside className='w-48 shrink-0'>
            <p className='mb-2 text-xs font-medium text-muted-foreground'>{t('selectNodeLabel')}</p>
            <nav className='space-y-1'>
              {agents.map(a => (
                <button key={a.id} onClick={() => setSelected(a.id)}
                  className={'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ' + ((activeAgent?.id === a.id) ? 'bg-accent font-medium' : 'hover:bg-muted')}
                >
                  <span className={'size-1.5 shrink-0 rounded-full ' + (a.status === 'online' ? 'bg-success' : 'bg-muted-foreground')} />
                  <span className='truncate'>{a.name}</span>
                </button>
              ))}
            </nav>
          </aside>
          <div className='min-w-0 flex-1'>
            {activeAgent && <InstanceList agent={activeAgent} />}
          </div>
        </div>
      )}
    </div>
  )
}

function InstanceList({ agent }: { agent: Agent }) {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['instances', agent.id],
    queryFn: ({ signal }) => listInstances(agent.id, signal),
  })
  const instances = data ?? []
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className={'size-2 rounded-full ' + (agent.status === 'online' ? 'bg-success' : 'bg-muted-foreground')} />
          <span className='font-medium'>{agent.name}</span>
          <span className='text-sm text-muted-foreground'>({t('rulesCount', { count: instances.length })})</span>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => refetch()} disabled={isFetching}>{t('refresh')}</Button>
          <Button size='sm' onClick={() => setShowCreate(true)} disabled={agent.status !== 'online'}>
            <Plus className='size-4' /> {t('addRule')}
          </Button>
        </div>
      </div>
      {isPending && <p role='status' className='text-sm text-muted-foreground'>{t('loading')}</p>}
      {isError && <p role='alert' className='text-sm text-error'>{t('loadFailed')}</p>}
      {!isPending && instances.length === 0 && (
        <div className='rounded-xl border border-border bg-card px-6 py-8 text-center'>
          <Route className='mx-auto mb-3 size-8 text-muted-foreground' />
          <p className='text-sm text-muted-foreground'>{t('noRulesForNode')}</p>
        </div>
      )}
      {instances.length > 0 && (
        <div className='divide-y divide-border rounded-xl border border-border bg-card'>
          {instances.map(inst => <InstanceRow key={inst.id} agentId={agent.id} instance={inst} agentOnline={agent.status === 'online'} />)}
        </div>
      )}
      <CreateInstanceDialog agentId={agent.id} open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}

function InstanceRow({ agentId, instance, agentOnline }: { agentId: string; instance: Instance; agentOnline: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [latency, setLatency] = React.useState<number | null>(null)
  const [latencyError, setLatencyError] = React.useState(false)
  const [showEdit, setShowEdit] = React.useState(false)
  const inv = () => qc.invalidateQueries({ queryKey: ['instances', agentId] })
  const start = useMutation({ mutationFn: () => startInstance(agentId, instance.id), onSuccess: inv })
  const stop = useMutation({ mutationFn: () => stopInstance(agentId, instance.id), onSuccess: inv })
  const restart = useMutation({ mutationFn: () => restartInstance(agentId, instance.id), onSuccess: inv })
  const del = useMutation({ mutationFn: () => deleteInstance(agentId, instance.id), onSuccess: inv })
  const probe = useMutation({
    mutationFn: () => probeInstance(agentId, instance.id),
    onSuccess: (res) => {
      setLatencyError(false)
      setLatency(res.data?.latency_ms ?? null)
      setTimeout(() => setLatency(null), 8000)
    },
    onError: () => { setLatencyError(true); setTimeout(() => setLatencyError(false), 4000) },
  })
  const [unlockResult, setUnlockResult] = React.useState<string | null>(null)
  const unlock = useMutation({
    mutationFn: () => unlockInstance(agentId, instance.id),
    onSuccess: (res) => {
      const msg = res.data ? JSON.stringify(res.data).replace(/[{}'"]/g, '').substring(0, 80) : (res.message ?? 'OK')
      setUnlockResult(msg)
      setTimeout(() => setUnlockResult(null), 10000)
    },
    onError: () => { setUnlockResult('检测失败'); setTimeout(() => setUnlockResult(null), 4000) },
  })
  const running = instance.status === 'Running'
  const modeLabel = (m: number) => m === 1 ? t('muxServer') : m === 2 ? t('muxClient') : t('normal')
  const latencyColor = latency === null ? '' : latency < 80 ? 'text-success' : latency < 200 ? 'text-warning' : 'text-error'
  return (
    <>
      <div className='flex flex-wrap items-center gap-3 px-5 py-3'>
        <span className={'size-1.5 shrink-0 rounded-full ' + (running ? 'bg-success' : 'bg-muted-foreground')} />
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
            <span className='font-mono text-sm'>{instance.config.listen}</span>
            <span className='text-xs text-muted-foreground'>→</span>
            <span className='font-mono text-sm'>{instance.config.remote}</span>
            {instance.config.multiplex_mode !== 0 && (
              <span className='rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'>{modeLabel(instance.config.multiplex_mode)}</span>
            )}
          </div>
          {instance.note && <p className='mt-0.5 text-xs text-muted-foreground'>{instance.note}</p>}
        </div>
        {/* Unlock result */}
        {unlockResult && !unlock.isPending && (
          <span className='max-w-[200px] truncate rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground' title={unlockResult}>{unlockResult}</span>
        )}
        {unlock.isPending && <span className='text-xs text-warning animate-pulse'>{t('unlockChecking')}</span>}
        {/* Latency badge */}
        {probe.isPending && <span className='text-xs text-muted-foreground animate-pulse'>{t('loading')}</span>}
        {latency !== null && !probe.isPending && (
          <span className={'rounded-md border border-border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ' + latencyColor}>{latency} ms</span>
        )}
        {latencyError && !probe.isPending && (
          <span className='rounded-md border border-error/30 px-2 py-0.5 text-xs text-error'>{'超时'}</span>
        )}
        <span className={'rounded-md px-2 py-0.5 text-xs font-medium ' + (running ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground')}>
          {running ? t('running') : t('stopped')}
        </span>
        <div className='flex gap-1'>
          {!running ? (
            <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={() => start.mutate()} disabled={!agentOnline || start.isPending} title={t('start')}><Play className='size-3.5' /></Button>
          ) : (
            <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={() => stop.mutate()} disabled={stop.isPending} title={t('stop')}><Square className='size-3.5' /></Button>
          )}
          <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={() => restart.mutate()} disabled={!agentOnline || restart.isPending || !running} title={t('restart')}><RotateCcw className='size-3.5' /></Button>
          <Button variant='ghost' size='icon' className={'size-8 transition-colors ' + (probe.isPending ? 'text-warning' : 'text-muted-foreground')} onClick={() => { setLatency(null); setLatencyError(false); probe.mutate() }} disabled={!agentOnline || probe.isPending} title={t('probeLatency')}><Zap className={'size-3.5 ' + (probe.isPending ? 'motion-safe:animate-pulse' : '')} /></Button>
          <Button variant='ghost' size='icon' className='size-8 text-muted-foreground' onClick={() => setShowEdit(true)} title={t('editRuleTitle')}><Pencil className='size-3.5' /></Button>
          <Button variant='ghost' size='icon' className={'size-8 ' + (unlock.isPending ? 'text-warning' : 'text-muted-foreground')} onClick={() => { setUnlockResult(null); unlock.mutate() }} disabled={!agentOnline || unlock.isPending} title={t('unlockCheck')}><Unlock className='size-3.5' /></Button>
          <Button variant='ghost' size='icon' className='size-8 text-error hover:bg-error-muted hover:text-error' onClick={() => { if (confirm('?')) del.mutate() }} title={t('deleteRule')}><Trash2 className='size-3.5' /></Button>
        </div>
      </div>
      <EditInstanceDialog agentId={agentId} instance={instance} open={showEdit} onClose={() => setShowEdit(false)} />
    </>
  )
}

function CreateInstanceDialog({ agentId, open, onClose }: { agentId: string; open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [enableMux, setEnableMux] = React.useState(false)
  const [useMux, setUseMux] = React.useState(false)

  React.useEffect(() => {
    if (!open) { setEnableMux(false); setUseMux(false) }
  }, [open])

  const mut = useMutation({
    mutationFn: (body: { config: InstanceConfig; note?: string }) => createInstance(agentId, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instances', agentId] }); onClose() },
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const listenIp = String(fd.get('listen_ip') || '::').trim()
    const listenPort = String(fd.get('listen_port') || '').trim()
    const remoteHost = String(fd.get('remote_host') || '').trim()
    const remotePort = String(fd.get('remote_port') || '').trim()
    const finalHost = String(fd.get('final_target_host') || '').trim()
    const finalPort = String(fd.get('final_target_port') || '').trim()
    const note = String(fd.get('note') || '').trim()

    const listen = listenIp + ':' + listenPort
    const remote = remoteHost + ':' + remotePort
    const finalTarget = finalHost && finalPort ? finalHost + ':' + finalPort : undefined

    // multiplex_mode: 0=normal, 1=mux server, 2=mux client
    const muxMode = enableMux ? 1 : useMux ? 2 : 0

    mut.mutate({
      config: {
        listen,
        remote,
        extra_remotes: [],
        multiplex_mode: muxMode,
        owner_user_id: null,
        final_target: finalTarget ?? null,
      },
      note: note || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('addRuleTitle')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className='space-y-5 py-2'>

          {/* 监听地址 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('listenLabel')}</label>
            <div className='flex gap-2'>
              <Input name='listen_ip' defaultValue='::' placeholder='::' className='flex-[7]' disabled={mut.isPending} />
              <Input name='listen_port' type='number' required placeholder={t('listenPortLabel')} min='1' max='65535' className='flex-[3]' disabled={mut.isPending} />
            </div>
            <p className='text-xs text-muted-foreground'>{t('listenIpHint')}</p>
          </div>

          {/* 启用端口复用 */}
          <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors'>
            <input
              type='checkbox'
              className='mt-0.5 size-4 rounded'
              checked={enableMux}
              onChange={e => { setEnableMux(e.target.checked); if (e.target.checked) setUseMux(false) }}
              disabled={mut.isPending}
            />
            <div>
              <p className='text-sm font-medium'>{t('enableMuxLabel')}</p>
              <p className='mt-0.5 text-xs text-muted-foreground'>{t('enableMuxHint')}</p>
            </div>
          </label>

          {/* 远程地址 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('remoteLabel')}</label>
            <div className='flex gap-2'>
              <Input name='remote_host' placeholder={t('remoteHostLabel')} className='flex-[7]' disabled={mut.isPending || enableMux} />
              <Input name='remote_port' type='number' placeholder={t('remotePortLabel')} min='1' max='65535' className='flex-[3]' disabled={mut.isPending || enableMux} />
            </div>
            <p className='text-xs text-muted-foreground'>{t('remoteHostHint')}</p>
          </div>

          {/* 通过端口复用连接（仅非 mux server 时显示）*/}
          {!enableMux && (
            <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors'>
              <input
                type='checkbox'
                className='mt-0.5 size-4 rounded'
                checked={useMux}
                onChange={e => setUseMux(e.target.checked)}
                disabled={mut.isPending}
              />
              <div>
                <p className='text-sm font-medium'>{t('useMuxLabel')}</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>{t('useMuxHint')}</p>
              </div>
            </label>
          )}

          {/* 最终目标地址（仅 mux client 时显示）*/}
          {useMux && !enableMux && (
            <div className='space-y-2'>
              <label className='text-sm font-medium'>{t('finalTargetLabel')}</label>
              <div className='flex gap-2'>
                <Input name='final_target_host' placeholder={t('finalTargetHostLabel')} className='flex-[7]' required disabled={mut.isPending} />
                <Input name='final_target_port' type='number' placeholder={t('finalTargetPortLabel')} min='1' max='65535' className='flex-[3]' required disabled={mut.isPending} />
              </div>
              <p className='text-xs text-muted-foreground'>{t('finalTargetHint')}</p>
            </div>
          )}

          {/* 备注 */}
          <div className='space-y-2'>
            <label htmlFor='inst-note' className='text-sm font-medium'>{t('noteLabel')}</label>
            <Input id='inst-note' name='note' placeholder={t('notePlaceholder')} disabled={mut.isPending} />
            <p className='text-xs text-muted-foreground'>{t('noteHint')}</p>
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

function EditInstanceDialog({ agentId, instance, open, onClose }: { agentId: string; instance: Instance; open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [enableMux, setEnableMux] = React.useState(instance.config.multiplex_mode === 1)
  const [useMux, setUseMux] = React.useState(instance.config.multiplex_mode === 2)

  React.useEffect(() => {
    if (open) {
      setEnableMux(instance.config.multiplex_mode === 1)
      setUseMux(instance.config.multiplex_mode === 2)
    }
  }, [open, instance])

  // Parse "ip:port" -> { ip, port }
  const splitAddr = (addr: string) => {
    const last = addr.lastIndexOf(':')
    if (last < 0) return { ip: addr, port: '' }
    return { ip: addr.slice(0, last), port: addr.slice(last + 1) }
  }
  const listen = splitAddr(instance.config.listen)
  const remote = splitAddr(instance.config.remote)
  const finalT = instance.config.final_target ? splitAddr(instance.config.final_target) : { ip: '', port: '' }

  const mut = useMutation({
    mutationFn: (body: { config: InstanceConfig; note?: string }) => updateInstance(agentId, instance.id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instances', agentId] }); onClose() },
  })

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const listenIp   = String(fd.get('listen_ip')  || '::').trim()
    const listenPort = String(fd.get('listen_port') || '').trim()
    const remoteHost = String(fd.get('remote_host') || '').trim()
    const remotePort = String(fd.get('remote_port') || '').trim()
    const finalHost  = String(fd.get('final_target_host') || '').trim()
    const finalPort  = String(fd.get('final_target_port') || '').trim()
    const note       = String(fd.get('note') || '').trim()
    const muxMode    = enableMux ? 1 : useMux ? 2 : 0
    mut.mutate({
      config: {
        listen: listenIp + ':' + listenPort,
        remote: remoteHost + ':' + remotePort,
        extra_remotes: instance.config.extra_remotes,
        multiplex_mode: muxMode,
        owner_user_id: instance.config.owner_user_id ?? null,
        final_target: finalHost && finalPort ? finalHost + ':' + finalPort : null,
      },
      note: note || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t('editRuleTitle')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className='space-y-5 py-2'>

          {/* 监听地址 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('listenLabel')}</label>
            <div className='flex gap-2'>
              <Input name='listen_ip'   defaultValue={listen.ip}   placeholder='::' className='flex-[7]' disabled={mut.isPending} />
              <Input name='listen_port' defaultValue={listen.port}  type='number' required placeholder={t('listenPortLabel')} min='1' max='65535' className='flex-[3]' disabled={mut.isPending} />
            </div>
            <p className='text-xs text-muted-foreground'>{t('listenIpHint')}</p>
          </div>

          {/* 启用端口复用 */}
          <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors'>
            <input type='checkbox' className='mt-0.5 size-4 rounded' checked={enableMux}
              onChange={e => { setEnableMux(e.target.checked); if (e.target.checked) setUseMux(false) }}
              disabled={mut.isPending} />
            <div>
              <p className='text-sm font-medium'>{t('enableMuxLabel')}</p>
              <p className='mt-0.5 text-xs text-muted-foreground'>{t('enableMuxHint')}</p>
            </div>
          </label>

          {/* 远程地址 */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('remoteLabel')}</label>
            <div className='flex gap-2'>
              <Input name='remote_host' defaultValue={remote.ip}   placeholder={t('remoteHostLabel')} className='flex-[7]' disabled={mut.isPending || enableMux} />
              <Input name='remote_port' defaultValue={remote.port}  type='number' placeholder={t('remotePortLabel')} min='1' max='65535' className='flex-[3]' disabled={mut.isPending || enableMux} />
            </div>
          </div>

          {/* 通过端口复用连接 */}
          {!enableMux && (
            <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors'>
              <input type='checkbox' className='mt-0.5 size-4 rounded' checked={useMux}
                onChange={e => setUseMux(e.target.checked)} disabled={mut.isPending} />
              <div>
                <p className='text-sm font-medium'>{t('useMuxLabel')}</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>{t('useMuxHint')}</p>
              </div>
            </label>
          )}

          {/* 最终目标 */}
          {useMux && !enableMux && (
            <div className='space-y-2'>
              <label className='text-sm font-medium'>{t('finalTargetLabel')}</label>
              <div className='flex gap-2'>
                <Input name='final_target_host' defaultValue={finalT.ip}   placeholder={t('finalTargetHostLabel')} className='flex-[7]' required disabled={mut.isPending} />
                <Input name='final_target_port' defaultValue={finalT.port}  type='number' placeholder={t('finalTargetPortLabel')} min='1' max='65535' className='flex-[3]' required disabled={mut.isPending} />
              </div>
            </div>
          )}

          {/* 备注 */}
          <div className='space-y-2'>
            <label htmlFor='edit-inst-note' className='text-sm font-medium'>{t('noteLabel')}</label>
            <Input id='edit-inst-note' name='note' defaultValue={instance.note} placeholder={t('editNotePlaceholder')} disabled={mut.isPending} />
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
import React from 'react'
