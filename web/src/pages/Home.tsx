import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Server, Activity, AlertTriangle, Route, Database } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState, useEffect, type ElementType } from 'react'
import { authOptions } from '@/lib/auth'
import { listAgents, getAgentFull } from '@/lib/norrna-api'
import type { Agent, AgentFull } from '@/lib/norrna-api'
import { Button } from '@/components/ui/Button'

function fmtBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return (bytes / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 1) + ' ' + units[i]
}

function usagePct(used: number, quota: number) {
  if (quota <= 0) return null
  return Math.min(100, (used / quota) * 100)
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: ElementType; label: string; value: string; sub?: string; accent?: 'success' | 'warning' | 'error'
}) {
  const colors = { success: 'text-success', warning: 'text-warning', error: 'text-error' }
  return (
    <div className='rounded-xl border border-border bg-card p-5 space-y-3'>
      <div className='flex items-center gap-2.5'>
        <span className='flex size-8 items-center justify-center rounded-lg bg-muted'>
          <Icon className='size-4 text-muted-foreground' aria-hidden='true' />
        </span>
        <span className='text-sm text-muted-foreground'>{label}</span>
      </div>
      <p className={'text-2xl font-semibold tabular-nums ' + (accent ? colors[accent] : '')}>{value}</p>
      {sub && <p className='text-xs text-muted-foreground'>{sub}</p>}
    </div>
  )
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function Home() {
  const { t } = useTranslation()
  const { data: auth } = useQuery(authOptions())
  const now = useClock()
  const user = auth?.user
  if (!user) return null
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='page-title'>{t('dashboardTitle')}</h1>
          <p className='page-description'>{t('dashboardGreeting', { name: user.username })}</p>
        </div>
        <div className='text-right'>
          <p className='text-2xl font-semibold tabular-nums tracking-tight'>{timeStr}</p>
          <p className='text-xs text-muted-foreground'>{dateStr}</p>
        </div>
      </div>
      <DashboardStats />
    </div>
  )
}

function DashboardStats() {
  const { t } = useTranslation()
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['agents'],
    queryFn: ({ signal }) => listAgents(signal),
  })
  const agents = data ?? []

  const fullQueries = useQuery({
    queryKey: ['agents-full-summary'],
    queryFn: async ({ signal }) => {
      const list = await listAgents(signal)
      const fulls = await Promise.all(list.map(a => getAgentFull(a.id, signal).catch(() => null)))
      return fulls.filter(Boolean) as AgentFull[]
    },
    staleTime: 30_000,
  })
  const fulls = fullQueries.data ?? []

  if (isPending) return <p role='status' className='text-sm text-muted-foreground'>{t('loading')}</p>
  if (isError) return (
    <div role='alert' className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
      <span>{t('loadFailed')}</span>
      <Button variant='outline' onClick={() => refetch()} disabled={isFetching}>{t('retry')}</Button>
    </div>
  )

  const online = agents.filter(a => a.status === 'online').length
  const offline = agents.length - online
  const totalUsed = agents.reduce((s, a) => s + a.traffic_used_bytes, 0)
  const totalQuota = agents.reduce((s, a) => s + a.traffic_quota_bytes, 0)
  const overallPct = usagePct(totalUsed, totalQuota)
  const totalRules = fulls.reduce((s, f) => s + f.instances.length, 0)
  const runningRules = fulls.reduce((s, f) => s + f.instances.filter(i => i.status === 'Running').length, 0)

  return (
    <div className='space-y-8'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard icon={Server}        label={t('totalNodes')}   value={String(agents.length)} />
        <StatCard icon={Activity}      label={t('onlineNodes')}  value={String(online)}  accent={online > 0 ? 'success' : undefined} />
        <StatCard icon={AlertTriangle} label={t('offlineNodes')} value={String(offline)} accent={offline > 0 ? 'error' : undefined} />
        <StatCard icon={Route}         label={t('totalRules')}   value={String(totalRules)} sub={t('rulesRunning', { running: runningRules, total: totalRules })} />
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <StatCard icon={Database} label={t('monthlyTraffic')} value={fmtBytes(totalUsed)}
          sub={totalQuota > 0 ? t('usedOf', { used: fmtBytes(totalUsed), total: fmtBytes(totalQuota) }) : t('noQuota')} />
        <StatCard icon={Database} label={t('remainingQuota')}
          value={totalQuota > 0 ? fmtBytes(Math.max(0, totalQuota - totalUsed)) : t('noQuota')}
          accent={overallPct !== null && overallPct >= 90 ? 'error' : overallPct !== null && overallPct >= 75 ? 'warning' : undefined} />
        <div className='rounded-xl border border-border bg-card p-5 space-y-3'>
          <div className='flex items-center gap-2.5'>
            <span className='flex size-8 items-center justify-center rounded-lg bg-muted'>
              <Activity className='size-4 text-muted-foreground' aria-hidden='true' />
            </span>
            <span className='text-sm text-muted-foreground'>{t('usageRate')}</span>
          </div>
          <p className={'text-2xl font-semibold tabular-nums ' + (overallPct !== null && overallPct >= 90 ? 'text-error' : overallPct !== null && overallPct >= 75 ? 'text-warning' : '')}>
            {overallPct !== null ? overallPct.toFixed(1) + '%' : t('noQuota')}
          </p>
          {overallPct !== null && (
            <div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
              <div className={'h-full rounded-full transition-all duration-700 ' + (overallPct >= 90 ? 'bg-error' : overallPct >= 75 ? 'bg-warning' : 'bg-success')}
                style={{ width: overallPct + '%' }} />
            </div>
          )}
        </div>
      </div>

      {agents.length > 0 && (
        <section>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='font-semibold'>{t('trafficDetail')}</h2>
            <Button asChild variant='outline' size='sm'><Link to='/agents'>{t('manageNodes')}</Link></Button>
          </div>
          <div className='divide-y divide-border rounded-xl border border-border bg-card'>
            {agents.map(agent => <AgentTrafficRow key={agent.id} agent={agent} fulls={fulls} />)}
          </div>
        </section>
      )}

      {agents.length === 0 && (
        <section className='rounded-xl border border-border bg-card px-6 py-10 text-center'>
          <Server className='mx-auto mb-4 size-10 text-muted-foreground' aria-hidden='true' />
          <h2 className='font-semibold'>{t('noAgentsTitle')}</h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>{t('noAgentsDescription')}</p>
          <Button asChild className='mt-6'><Link to='/agents'>{t('addNode')}</Link></Button>
        </section>
      )}
    </div>
  )
}

function AgentTrafficRow({ agent, fulls }: { agent: Agent; fulls: AgentFull[] }) {
  const { t } = useTranslation()
  const full = fulls.find(f => f.agent.id === agent.id)
  const instances = full?.instances ?? []
  const running = instances.filter(i => i.status === 'Running').length
  const pct = usagePct(agent.traffic_used_bytes, agent.traffic_quota_bytes)
  const nearLimit = pct !== null && pct >= 80
  const overLimit = pct !== null && pct >= 100
  return (
    <div className='flex flex-wrap items-center gap-4 px-5 py-4'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <span className={'size-2 shrink-0 rounded-full ' + (agent.status === 'online' ? 'bg-success' : 'bg-muted-foreground')} />
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <p className='truncate text-sm font-medium'>{agent.name}</p>
            {overLimit && <span className='rounded bg-error-muted px-1.5 py-0.5 text-xs font-medium text-error'>{t('overLimit')}</span>}
            {nearLimit && !overLimit && <span className='rounded bg-warning-muted px-1.5 py-0.5 text-xs font-medium text-warning'>{t('nearLimit')}</span>}
          </div>
          <p className='text-xs text-muted-foreground'>{agent.ip || '—'}{agent.hostname ? ' · ' + agent.hostname : ''}</p>
        </div>
      </div>
      <div className='hidden text-center sm:block'>
        <p className='text-sm font-medium tabular-nums'>{running}<span className='text-muted-foreground'>/{instances.length}</span></p>
        <p className='text-xs text-muted-foreground'>{t('runningRules')}</p>
      </div>
      <div className='w-40'>
        {agent.traffic_quota_bytes > 0 ? (
          <>
            <div className='mb-1.5 flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>{fmtBytes(agent.traffic_used_bytes)}</span>
              <span className='text-muted-foreground'>{fmtBytes(agent.traffic_quota_bytes)}</span>
            </div>
            <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
              <div className={'h-full rounded-full transition-all duration-700 ' + (overLimit ? 'bg-error' : nearLimit ? 'bg-warning' : 'bg-success')}
                style={{ width: Math.min(100, (agent.traffic_used_bytes / agent.traffic_quota_bytes) * 100) + '%' }} />
            </div>
            <p className={'mt-1 text-right text-xs font-medium ' + (overLimit ? 'text-error' : nearLimit ? 'text-warning' : 'text-muted-foreground')}>
              {((agent.traffic_used_bytes / agent.traffic_quota_bytes) * 100).toFixed(1)}%
            </p>
          </>
        ) : (
          <div className='text-right'>
            <p className='text-sm font-medium'>{fmtBytes(agent.traffic_used_bytes)}</p>
            <p className='text-xs text-muted-foreground'>{t('noQuotaSet')}</p>
          </div>
        )}
      </div>
      <span className={'rounded-md px-2 py-0.5 text-xs font-medium ' + (agent.status === 'online' ? 'bg-success-muted text-success' : 'bg-muted text-muted-foreground')}>
        {t(agent.status === 'online' ? 'online' : 'offline')}
      </span>
    </div>
  )
}