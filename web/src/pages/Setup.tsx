import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Route, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuthShell } from '@/components/AuthShell'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'

export function Setup() {
  const { t } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])

  const steps = [
    { icon: Shield, title: t('setupAccountStep'), detail: t('setupAccountDetail') },
    { icon: Route, title: t('setupForwardStep'), detail: t('setupForwardDetail') },
  ]

  return (
    <AuthShell>
      <Logo className='mb-7 size-12' />
      <h1 ref={heading} tabIndex={-1} className='text-2xl font-semibold tracking-tight text-balance outline-none'>
        {t('setupWelcome')}
      </h1>
      <p className='mt-3 text-sm leading-6 text-muted-foreground'>{t('setupWelcomeDescription')}</p>
      <ol className='my-8 space-y-5 border-y border-border py-6'>
        {steps.map(({ icon: Icon, title, detail }, index) => (
          <li key={title} className='flex gap-4'>
            <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground mt-0.5' aria-hidden='true'>
              {index + 1}
            </span>
            <div className='flex gap-3'>
              <Icon className='mt-0.5 size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
              <div>
                <h2 className='text-sm font-medium'>{title}</h2>
                <p className='mt-1 text-sm leading-6 text-muted-foreground'>{detail}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Button asChild className='h-11 w-full'>
        <Link to='/setup/admin'>
          {t('startSetup')}
          <ArrowRight aria-hidden='true' />
        </Link>
      </Button>
    </AuthShell>
  )
}