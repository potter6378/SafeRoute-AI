export interface CaseLog {
  log_id: string
  timestamp_decided: string
  user_id: string
  domain: string
  detected_type: string
  count: number
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical'
  decision: 'ALLOW' | 'WARN' | 'BLOCK' | 'HOLD'
  applied_rule: string
  state: string
  reason: string | null
}

export interface Summary {
  total_cases: number
  by_decision: Record<string, number>
  by_risk_level: Record<string, number>
  by_detected_type: Record<string, number>
  top_domains: { domain: string; count: number }[]
}

const configured = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
const base = configured.endsWith('/api') ? configured : `${configured}/api`

export async function getApi<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${base}${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 404 ? '요청한 로그 또는 API를 찾을 수 없습니다.' : `조회 실패 (HTTP ${response.status})`)
  return response.json() as Promise<T>
}

export function getCases(filters: { decision?: string; risk_level?: string; domain?: string; limit?: number; offset?: number }, signal: AbortSignal) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)) })
  return getApi<{ total: number; items: CaseLog[] }>(`/cases?${query}`, signal)
}
