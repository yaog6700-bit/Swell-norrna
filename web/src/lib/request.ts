import { z } from 'zod'

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public retryAfter = 0,
  ) {
    super(code)
  }
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const parsed = z.object({ error: z.string() }).safeParse(body)
    const parsedMsg = z.object({ message: z.string() }).safeParse(body)
    const fallback = response.status === 401 ? 'unauthorized' : 'unavailable'
    const retry = Number(response.headers.get('Retry-After'))
    const code = parsed.success
      ? parsed.data.error
      : parsedMsg.success
        ? parsedMsg.data.message
        : fallback
    throw new ApiError(
      code,
      response.status,
      Number.isFinite(retry) ? Math.max(0, retry) : 0,
    )
  }
  const body: unknown =
    response.status === 204
      ? undefined
      : await response.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new ApiError('invalid_response', response.status)
  return parsed.data
}
