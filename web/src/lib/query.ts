import { QueryClient, type QueryClient as QC } from '@tanstack/react-query'
import type { AuthState } from './auth'

export const authKey = ['auth'] as const

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000 },
    },
  })
}

export function replaceAuthState(client: QC, state: AuthState) {
  client.setQueryData(['auth'], state)
  client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' })
}