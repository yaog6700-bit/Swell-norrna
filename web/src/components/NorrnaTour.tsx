import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Map, Server, Route, X } from 'lucide-react'
import { listAgents } from '@/lib/norrna-api'
import { Button } from '@/components/ui/Button'

const STORAGE_KEY = 'norrna-tour-v1'
type TourStorage = { dismissed: boolean; step: number }
function loadStorage(): TourStorage {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? JSON.parse(v) : { dismissed: false, step: 0 }
  } catch { return { dismissed: false, step: 0 } }
}
function saveStorage(v: TourStorage) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch {}
}

function useTourProgress() {
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: ({ signal }) => listAgents(signal),
    staleTime: 10_000,
  })
  const hasAgent = (agents?.length ?? 0) > 0
  const hasOnlineAgent = (agents ?? []).some(a => a.status === 'online')
  return { step1Done: hasAgent, step2Done: hasOnlineAgent, step3Done: hasOnlineAgent }
}

const STEPS = [
  { icon: Server, titleKey: 'tourStep1Title', descKey: 'tourStep1Desc', actionKey: 'tourStep1Action', actionTo: '/agents', doneKey: 'step1Done' },
  { icon: Server, titleKey: 'tourStep2Title', descKey: 'tourStep2Desc', actionKey: 'tourStep2Action', actionTo: '/agents', doneKey: 'step2Done' },
  { icon: Route,  titleKey: 'tourStep3Title', descKey: 'tourStep3Desc', actionKey: 'tourStep3Action', actionTo: '/forwarding', doneKey: 'step3Done' },
] as const

export function NorrnaTour() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [storage, setStorage] = useState<TourStorage>(loadStorage)
  const [currentStep, setCurrentStep] = useState(storage.step)
  const progress = useTourProgress()

  // Persist step
  useEffect(() => {
    saveStorage({ ...storage, step: currentStep })
  }, [currentStep])

  const done = (key: string) => progress[key as keyof typeof progress] ?? false
  const completedCount = STEPS.filter(s => done(s.doneKey)).length

  const dismiss = () => {
    const next = { dismissed: true, step: currentStep }
    setStorage(next)
    saveStorage(next)
    setOpen(false)
  }

  const reopen = () => {
    // Find first incomplete step when reopening
    const firstIncomplete = STEPS.findIndex(s => !done(s.doneKey))
    setCurrentStep(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete)
    setOpen(true)
  }

  // Collapsed pill button (always visible after first dismiss, or when closed)
  if (!open) {
    return (
      <button
        onClick={reopen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg transition-all hover:bg-accent"
      >
        <Map className="size-4 text-muted-foreground" aria-hidden="true" />
        {t('tourOpen')}
        {completedCount > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-success text-xs font-bold text-white leading-none">
            {completedCount}
          </span>
        )}
      </button>
    )
  }

  // Full panel
  const step = STEPS[currentStep]
  const Icon = step.icon
  const stepDone = done(step.doneKey)

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Map className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold">{t('tourTitle')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t('tourStep', { current: currentStep + 1, total: STEPS.length })}</span>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="收起"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-foreground transition-all duration-500"
          style={{ width: (completedCount / STEPS.length * 100) + '%' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 px-4 pt-3">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={"flex-1 h-1.5 rounded-full transition-all " + (i === currentStep ? 'bg-foreground' : done(s.doneKey) ? 'bg-success' : 'bg-muted')}
            aria-label={t('tourStep', { current: i + 1, total: STEPS.length })}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={"flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors " + (stepDone ? 'bg-success-muted' : 'bg-muted')}>
            {stepDone
              ? <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
              : <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{t(step.titleKey as any)}</p>
            {stepDone && <p className="mt-0.5 text-xs font-medium text-success">{t('tourStepDone')}</p>}
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{t(step.descKey as any)}</p>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentStep(s => Math.max(0, s - 1))} disabled={currentStep === 0} aria-label={t('tourPrev')}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={currentStep === STEPS.length - 1} aria-label={t('tourNext')}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex gap-2">
          {currentStep === STEPS.length - 1 ? (
            <Button size="sm" onClick={dismiss}>{t('tourFinish')}</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(false)}>
                {t('tourSkip')}
              </Button>
              <Button asChild size="sm">
                <Link to={step.actionTo as any}>
                  {t(step.actionKey as any)}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}