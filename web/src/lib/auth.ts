import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { request } from './request'

const authSchema = z.object({
  initialized: z.boolean(),
  user: z.object({
    id: z.string(),
    username: z.string().min(1).max(64),
    role: z.enum(['admin', 'member']),
  }).nullable(),
  time_zone: z.string().default('UTC'),
})

export type AuthState = z.infer<typeof authSchema>
export type User = NonNullable<AuthState['user']>
export type Role = User['role']
export const authKey = ['auth'] as const

function commitAuthState(client: QueryClient, state: AuthState) {
  client.setQueryData(authKey, state)
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== authKey[0] })
}

export async function replaceAuthState(client: QueryClient, state: AuthState) {
  await client.cancelQueries()
  commitAuthState(client, state)
}

// Step 1: check-setup -> needs_setup?
const checkSetupSchema = z.object({ success: z.boolean(), needs_setup: z.boolean() })
// Step 2: check -> authenticated?
const checkAuthSchema = z.object({ authenticated: z.boolean() })
// Step 3: me -> user info
const meSchema = z.object({
  success: z.boolean(),
  user: z.object({ id: z.string(), username: z.string(), role: z.string() }).optional(),
})

async function fetchAuthState(signal?: AbortSignal): Promise<AuthState> {
  // 1. Does the system need setup?
  const setupCheck = await request('/api/auth/check-setup', checkSetupSchema, { signal })
  if (setupCheck.needs_setup) {
    return { initialized: false, user: null, time_zone: 'UTC' }
  }

  // 2. Is there a valid session?
  const authCheck = await request('/api/auth/check', checkAuthSchema, { signal })
  if (!authCheck.authenticated) {
    return { initialized: true, user: null, time_zone: 'UTC' }
  }

  // 3. Get user details
  const me = await request('/api/auth/me', meSchema, { signal })
  if (!me.user) {
    return { initialized: true, user: null, time_zone: 'UTC' }
  }

  return {
    initialized: true,
    user: {
      id: me.user.id,
      username: me.user.username,
      role: me.user.role === 'Admin' ? 'admin' : 'member',
    },
    time_zone: 'UTC',
  }
}

export const authOptions = () =>
  queryOptions({
    queryKey: authKey,
    queryFn: async ({ signal, client }) => {
      const state = await fetchAuthState(signal)
      const previous = client.getQueryData<AuthState>(authKey)
      if (previous && (previous.user?.id !== state.user?.id || previous.user?.role !== state.user?.role)) {
        await client.cancelQueries({ predicate: (query) => query.queryKey[0] !== authKey[0] })
        commitAuthState(client, state)
      }
      return state
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  })

const successSchema = z.object({ success: z.boolean(), message: z.string().optional() })

export function signIn(input: { username: string; password: string }) {
  return request('/api/auth/login', successSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then(() => fetchAuthState())
}

export function setup(input: { username: string; password: string }) {
  return request('/api/auth/setup', successSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  }).then(() => fetchAuthState())
}

export function signOut() {
  return request('/api/auth/logout', successSchema, { method: 'POST', body: '{}' })
    .then(() => fetchAuthState())
}

export function changePassword(input: { old_password: string; new_password: string }) {
  return request('/api/auth/change-password', successSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}