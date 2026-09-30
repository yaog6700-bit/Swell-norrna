import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  type RouterHistory,
} from '@tanstack/react-router'
import { AuthGate } from '@/components/AuthGate'
import { Auth } from '@/pages/Auth'
import { Setup } from '@/pages/Setup'
import { NotFound } from '@/pages/NotFound'

const root = createRootRoute({ component: AuthGate, notFoundComponent: NotFound })

const routes = root.addChildren([
  createRoute({ getParentRoute: () => root, path: '/setup', component: Setup }),
  createRoute({ getParentRoute: () => root, path: '/setup/admin', component: () => <Auth mode='setup' /> }),
  createRoute({ getParentRoute: () => root, path: '/login', component: () => <Auth mode='login' /> }),
  createRoute({
    getParentRoute: () => root, path: '/',
    component: lazyRouteComponent(() => import('@/pages/Home'), 'Home'),
  }),
  createRoute({
    getParentRoute: () => root, path: '/agents',
    component: lazyRouteComponent(() => import('@/pages/Agents'), 'Agents'),
  }),
  createRoute({
    getParentRoute: () => root, path: '/forwarding',
    component: lazyRouteComponent(() => import('@/pages/Forwarding'), 'Forwarding'),
  }),
  createRoute({
    getParentRoute: () => root, path: '/servers',
    component: lazyRouteComponent(() => import('@/pages/Servers'), 'Servers'),
  }),
  // Unified settings - all settings in one place, accessed from top-right gear icon
  createRoute({
    getParentRoute: () => root, path: '/settings',
    component: lazyRouteComponent(() => import('@/pages/UnifiedSettings'), 'UnifiedSettings'),
  }),
])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree: routes, history, defaultPreload: 'intent' })
}