import { z } from 'zod'
import { request } from './request'

// ─── Schemas ───────────────────────────────────────────────────────────────

export const instanceConfigSchema = z.object({
  listen: z.string(),
  remote: z.string(),
  extra_remotes: z.array(z.string()).default([]),
  multiplex_mode: z.number().default(0),
  owner_user_id: z.string().nullable().optional(),
  final_target: z.string().nullable().optional(),
})

export const instanceSchema = z.object({
  id: z.string(),
  config: instanceConfigSchema,
  status: z.string(),
  note: z.string().default(''),
  auto_start: z.boolean().default(true),
  created_at: z.string().default(''),
  updated_at: z.string().default(''),
})

export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  api_key: z.string().default(''),
  user_id: z.string().default(''),
  status: z.string().default('offline'),
  ip: z.string().default(''),
  hostname: z.string().default(''),
  cpu_usage: z.number().default(0),
  memory_usage: z.number().default(0),
  memory_total: z.number().default(0),
  last_seen: z.string().default(''),
  connected_at: z.string().default(''),
  created_at: z.string(),
  updated_at: z.string().default(''),
  multiplex_capable: z.boolean().default(false),
  multiplex_port: z.number().default(0),
  traffic_quota_bytes: z.number().default(0),
  traffic_used_bytes: z.number().default(0),
  traffic_month: z.string().default(''),
  realm_version: z.string().default(''),
})

export const agentFullSchema = z.object({
  agent: agentSchema,
  instances: z.array(instanceSchema),
})

export const settingsSchema = z.object({
  telegram_bot_token: z.string().default(''),
  telegram_chat_id: z.string().default(''),
  telegram_enabled: z.boolean().default(false),
  notify_offline: z.boolean().default(true),
  notify_quota: z.boolean().default(true),
})

export const updateInfoSchema = z.object({
  current_version: z.string().default(''),
  latest_version: z.string().default(''),
  has_update: z.boolean().default(false),
  release_url: z.string().default(''),
})

export type Agent = z.infer<typeof agentSchema>
export type AgentFull = z.infer<typeof agentFullSchema>
export type Instance = z.infer<typeof instanceSchema>
export type InstanceConfig = z.infer<typeof instanceConfigSchema>
export type AppSettings = z.infer<typeof settingsSchema>
export type UpdateInfo = z.infer<typeof updateInfoSchema>

// ─── Wrapper ────────────────────────────────────────────────────────────────
const wrap = <T>(schema: z.ZodType<T>) =>
  z.object({ success: z.boolean(), data: schema.optional(), message: z.string().optional() })
    .transform(v => v.data as T)

const okSchema = z.object({ success: z.boolean(), message: z.string().optional() })

// ─── Agents ─────────────────────────────────────────────────────────────────

export function listAgents(signal?: AbortSignal) {
  return request('/api/agents', wrap(z.array(agentSchema)), { signal })
}

export function getAgentFull(id: string, signal?: AbortSignal) {
  return request(`/api/agents/${id}/full`, wrap(agentFullSchema), { signal })
}

export function createAgent(body: { name: string; api_key: string }) {
  return request('/api/agents', wrap(agentSchema), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAgent(id: string, body: { name?: string; api_key?: string; traffic_quota_gb?: number }) {
  return request(`/api/agents/${id}`, okSchema, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteAgent(id: string) {
  return request(`/api/agents/${id}`, okSchema, { method: 'DELETE' })
}

export function updateAgentBin(id: string) {
  return request(`/api/agents/${id}/update`, okSchema, { method: 'POST', body: '{}' })
}

// ─── Instances ───────────────────────────────────────────────────────────────

export function listInstances(agentId: string, signal?: AbortSignal) {
  return request(`/api/agents/${agentId}/instances`, wrap(z.array(instanceSchema)), { signal })
}

export function createInstance(agentId: string, body: { config: InstanceConfig; note?: string }) {
  return request(`/api/agents/${agentId}/instances`, wrap(instanceSchema), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateInstance(agentId: string, instanceId: string, body: { config: InstanceConfig; note?: string }) {
  return request(`/api/agents/${agentId}/instances/${instanceId}`, okSchema, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deleteInstance(agentId: string, instanceId: string) {
  return request(`/api/agents/${agentId}/instances/${instanceId}`, okSchema, { method: 'DELETE' })
}

export function startInstance(agentId: string, instanceId: string) {
  return request(`/api/agents/${agentId}/instances/${instanceId}/start`, okSchema, { method: 'POST', body: '{}' })
}

export function stopInstance(agentId: string, instanceId: string) {
  return request(`/api/agents/${agentId}/instances/${instanceId}/stop`, okSchema, { method: 'POST', body: '{}' })
}

export function restartInstance(agentId: string, instanceId: string) {
  return request(`/api/agents/${agentId}/instances/${instanceId}/restart`, okSchema, { method: 'POST', body: '{}' })
}

export const probeResultSchema = z.object({ success: z.boolean(), data: z.object({ latency_ms: z.number() }).optional() })

export function probeInstance(agentId: string, instanceId: string) {
  return request(`/api/agents/${agentId}/instances/${instanceId}/probe`, probeResultSchema, { method: 'POST', body: '{}' })
}

export function updateInstanceNote(agentId: string, instanceId: string, note: string) {
  return request(`/api/agents/${agentId}/instances/${instanceId}/note`, okSchema, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSettings(signal?: AbortSignal) {
  return request('/api/settings', wrap(settingsSchema), { signal })
}

export function saveSettings(body: AppSettings) {
  return request('/api/settings', okSchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function testTelegram() {
  return request('/api/settings/telegram/test', okSchema, { method: 'POST', body: '{}' })
}

// ─── Updates ────────────────────────────────────────────────────────────────

export function checkUpdate(signal?: AbortSignal) {
  return request('/api/update/check', wrap(updateInfoSchema), { signal })
}

export function updateManager() {
  return request('/api/update/manager', okSchema, { method: 'POST', body: '{}' })
}

// ─── Servers ──────────────────────────────────────────────────────────────
export const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  host: z.string(),
  port: z.number(),
  api_key: z.string().default(''),
  status: z.string().default('disconnected'),
  created_at: z.string().default(''),
  updated_at: z.string().default(''),
  user_id: z.string().default(''),
})
export type NorrnaServer = z.infer<typeof serverSchema>

export function listServers(signal?: AbortSignal) {
  return request('/api/servers', wrap(z.array(serverSchema)), { signal })
}
export function createServer(body: { name: string; host: string; port: number; api_key: string }) {
  return request('/api/servers', wrap(serverSchema), { method: 'POST', body: JSON.stringify(body) })
}
export function deleteServer(id: string) {
  return request("/api/servers/" + id, okSchema, { method: 'DELETE' })
}
export function connectServer(id: string) {
  return request("/api/servers/" + id + "/connect", okSchema, { method: 'POST', body: '{}' })
}

// -- Unlock --
export function unlockInstance(agentId: string, instanceId: string) {
  return request('/api/agents/' + agentId + '/instances/' + instanceId + '/unlock',
    z.object({ success: z.boolean(), data: z.any().optional(), message: z.string().optional() }),
    { method: 'POST', body: '{}' })
}

// -- Mux --
export function setAgentMux(agentId: string, body: { multiplex_capable: boolean; multiplex_port: number }) {
  return request('/api/agents/' + agentId + '/multiplex', okSchema, { method: 'POST', body: JSON.stringify(body) })
}
