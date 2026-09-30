import { useId, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { ChevronRight, LayoutDashboard, Route, Server, Settings, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authOptions } from '@/lib/auth'
import { ThemeSelect, LanguageSelect } from './Preferences'
import { Logo } from './Logo'
import { Session } from './Session'
import { NorrnaTour } from './NorrnaTour'
import { Button } from './ui/Button'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from './ui/Sidebar'

const navigation = [
  {
    labelKey: 'navOverview',
    items: [
      { to: '/',          labelKey: 'navDashboard',  icon: LayoutDashboard },
    ],
  },
  {
    labelKey: 'navManage',
    items: [
      { to: '/agents',    labelKey: 'navAgents',     icon: Server },
      { to: '/forwarding', labelKey: 'navForwarding', icon: Route },
      { to: '/servers',    labelKey: 'navServers',     icon: Globe },
    ],
  },
] as const

type NavItem = (typeof navigation)[number]['items'][number]

function NavigationItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const { t } = useTranslation()
  const { setOpenMobile } = useSidebar()
  const active = pathname === item.to || pathname.startsWith(item.to + '/')
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} className='h-10'>
        <Link to={item.to} onClick={() => setOpenMobile(false)} aria-current={active ? 'page' : undefined}>
          <Icon aria-hidden='true' />
          <span>{t(item.labelKey as any)}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function Navigation() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <Sidebar className='border-r border-border'>
      <SidebarHeader className='px-3 py-4'>
        <div className='flex min-w-0 items-center gap-2'>
          <Link to='/' className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [@media(pointer:coarse)]:size-11' aria-label={t('appName')}>
            <Logo className='size-6' />
          </Link>
          <div className='min-w-0 flex-1 px-1'>
            <p className='truncate text-sm font-semibold'>{t('appName')}</p>
            <p className='truncate text-xs text-muted-foreground'>{t('appSubtitle')}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className='gap-5'>
        {navigation.map(group => (
          <SidebarGroup key={group.labelKey} role='group' aria-label={t(group.labelKey as any)} className='px-3'>
            <SidebarGroupLabel>{t(group.labelKey as any)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => (
                  <NavigationItem key={item.to} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className='p-3'>
        <Session />
      </SidebarFooter>
    </Sidebar>
  )
}

export function Layout({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const { data } = useQuery(authOptions())
  if (!data?.user) return null
  return (
    <SidebarProvider>
      <a href='#main-content' className='sr-only z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4'>
        {t('skipContent')}
      </a>
      <Navigation />
      <SidebarInset className='min-w-0 bg-background'>
        <header className='flex min-h-16 items-center justify-between gap-3 px-4 md:px-6'>
          <SidebarTrigger className='size-7 text-muted-foreground [@media(pointer:coarse)]:size-11' />
          <div className='flex items-center gap-1'>
            <LanguageSelect compact />
            <ThemeSelect compact />
            <Button asChild variant='ghost' size='icon' className='text-muted-foreground [@media(pointer:coarse)]:size-11'>
              <Link to='/settings' aria-label={t('navSettings')} title={t('navSettings')}>
                <Settings aria-hidden='true' />
              </Link>
            </Button>
          </div>
        </header>
        <main id='main-content' className='mx-auto w-full max-w-6xl px-5 py-6 md:px-6'>
          {children ?? <Outlet />}
        </main>
        <NorrnaTour />
      </SidebarInset>
    </SidebarProvider>
  )
}