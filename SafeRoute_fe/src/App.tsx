import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = 'dashboard' | 'incidents' | 'workflow' | 'policy' | 'audit' | 'ip_management'
type AppMode = 'onboarding' | 'onboarding_loading' | 'captive_portal' | 'client_popup' | 'admin'
type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type WorkflowStatus = 'AUTO_BLOCKED' | 'PENDING_REVIEW' | 'APPROVED' | 'DENIED'
type Action = 'BLOCK' | 'WARN' | 'ALLOW' | 'HOLD'

interface Incident {
  id: string
  timestamp: string
  userId: string
  dept: string
  assetIp: string
  riskLevel: RiskLevel
  detectedType: string
  action: Action
  workflowStatus: WorkflowStatus
  count: number
  reason?: string
  policyRule?: string
  policyTag?: string
  recipient?: string
  payload?: string
  decisionAt?: string
  decisionBy?: string
}

interface TrendPoint { time: string; CRITICAL?: number; HIGH?: number; MEDIUM?: number; LOW?: number }
interface DepartmentPoint { dept: string; API_KEY_LEAK?: number; SOURCE_CODE_EXFIL?: number; PROMPT_INJECTION?: number }
interface LiveEvent { id: string; ts: string; dept: string; type: string; risk: RiskLevel; action: Action }
interface IpMapping { ip: string; dept: string; user: string; lastSeen: string; status: string }
interface AuditLog { seq: number; ts: string; actor: string; action: string; target: string; prevHash: string; rowHash: string; status: 'ok' | 'error' }
interface SecurityRule { id: string; name: string; regex: string; risk: RiskLevel; enabled: boolean }
interface WhitelistEntry { domain: string; label: string; addedBy: string; date: string; active: boolean }
interface SecurityData {
  kpis: { critical: string | number; pending: string | number; bypass: string | number; protection: string | number; traffic?: string | number }
  trend: TrendPoint[]
  departments: DepartmentPoint[]
  liveEvents: LiveEvent[]
  incidents: Incident[]
  ipMappings: IpMapping[]
  auditLogs: AuditLog[]
  rules: SecurityRule[]
  whitelist: WhitelistEntry[]
  conflictMode: 'BLOCK' | 'WARN'
}

const EMPTY_DATA: SecurityData = {
  kpis: { critical: 0, pending: 0, bypass: 0, protection: 0, traffic: 0 },
  trend: [], departments: [], liveEvents: [], incidents: [], ipMappings: [], auditLogs: [], rules: [], whitelist: [], conflictMode: 'WARN'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function riskColor(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return '#D32F2F'
    case 'HIGH': return '#F57C00'
    case 'MEDIUM': return '#FBC02D'
    case 'LOW': return '#388E3C'
    default: return '#6B7280'
  }
}

function riskBg(level: RiskLevel | string): string {
  switch (level) {
    case 'CRITICAL': return '#FEF2F2'
    case 'HIGH': return '#FFF7ED'
    case 'MEDIUM': return '#FEFCE8'
    case 'LOW': return '#F0FDF4'
    default: return '#F9FAFB'
  }
}

function actionColor(action: Action | string): string {
  switch (action) {
    case 'BLOCK': return '#D32F2F'
    case 'WARN': return '#FBC02D'
    case 'ALLOW': return '#388E3C'
    case 'HOLD': return '#7B1FA2'
    default: return '#6B7280'
  }
}

function statusLabel(s: WorkflowStatus): string {
  switch (s) {
    case 'AUTO_BLOCKED': return '자동 차단'
    case 'PENDING_REVIEW': return '소명 검토 대기'
    case 'APPROVED': return '승인'
    case 'DENIED': return '거부'
  }
}

function statusColor(s: WorkflowStatus): string {
  switch (s) {
    case 'AUTO_BLOCKED': return '#D32F2F'
    case 'PENDING_REVIEW': return '#FBC02D'
    case 'APPROVED': return '#388E3C'
    case 'DENIED': return '#6B7280'
  }
}

function typeLabel(t: string): string {
  switch (t) {
    case 'API_KEY_LEAK': return 'API키 유출'
    case 'SOURCE_CODE_EXFIL': return '소스코드 유출'
    case 'PROMPT_INJECTION': return '프롬프트 인젝션'
    default: return t
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      color, backgroundColor: bg, whiteSpace: 'nowrap'
    }}>
      {text}
    </span>
  )
}

function RiskBadge({ level }: { level: RiskLevel | string }) {
  return <Badge text={level} color={riskColor(level)} bg={riskBg(level)} />
}

function KpiCard({
  label, value, sub, color, delta
}: {
  label: string; value: string | number; sub?: string; color?: string; delta?: string
}) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
      padding: '20px 24px', flex: 1, minWidth: 0
    }}>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? '#111827', lineHeight: 1 }}>
        {value}
        {delta && (
          <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 8, color: '#D32F2F' }}>{delta}</span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12, letterSpacing: 0.2 }}>
      {children}
    </div>
  )
}

// ─── Page 1: Global Security Dashboard ───────────────────────────────────────
function DashboardPage({ data }: { data: SecurityData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 16 }}>
        <KpiCard label="미처리 크리티컬 위협" value={data.kpis.critical} color="#D32F2F" sub="즉시 대응 필요" />
        <KpiCard label="소명 검토 대기" value={data.kpis.pending} color="#FBC02D" sub="PENDING_REVIEW 건수" />
        <KpiCard label="우회 탐지 차단 (Plan B)" value={data.kpis.bypass} sub="클라이언트 로그 기반" />
        <KpiCard label="총 트래픽 / AI 보호율" value={data.kpis.protection} color="#388E3C" sub={`금일 처리 ${data.kpis.traffic ?? 0}건`} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Line chart */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px', minWidth: 0 }}>
          <SectionTitle>실시간 위협 발생 트렌드 (시간대별)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="CRITICAL" stroke="#D32F2F" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="HIGH" stroke="#F57C00" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="MEDIUM" stroke="#FBC02D" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="LOW" stroke="#388E3C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px', minWidth: 0 }}>
          <SectionTitle>부서별 유출 시도 분석</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.departments} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} width={40} />
              <Tooltip />
              <Bar dataKey="API_KEY_LEAK" stackId="a" fill="#D32F2F" name="API키 유출" />
              <Bar dataKey="SOURCE_CODE_EXFIL" stackId="a" fill="#F57C00" name="소스코드" />
              <Bar dataKey="PROMPT_INJECTION" stackId="a" fill="#FBC02D" name="프롬프트 인젝션" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live event feed */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <SectionTitle>라이브 위협 스트림</SectionTitle>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#388E3C', fontWeight: 500
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#388E3C',
              animation: 'pulse 1.5s infinite'
            }} />
            실시간 연결됨
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {data.liveEvents.map((e, i) => (
            <div key={e.id} style={{
              display: 'grid', gridTemplateColumns: '90px 80px 80px 1fr 140px 90px',
              alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < data.liveEvents.length - 1 ? '1px solid #F3F4F6' : 'none',
              background: e.risk === 'CRITICAL' ? '#FEF2F2' : 'transparent',
              borderRadius: 4, paddingLeft: e.risk === 'CRITICAL' ? 8 : 0
            }}>
              <span className="mono" style={{ fontSize: 11, color: '#9CA3AF' }}>{e.ts}</span>
              <span style={{ fontSize: 12, color: '#374151' }}>{e.dept}</span>
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }} className="mono">{e.id}</span>
              <span style={{ fontSize: 12 }}>{typeLabel(e.type)}</span>
              <RiskBadge level={e.risk} />
              <Badge text={e.action} color={actionColor(e.action)} bg={e.action === 'BLOCK' ? '#FEF2F2' : e.action === 'WARN' ? '#FEFCE8' : '#F0FDF4'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page 2: Incident Management ─────────────────────────────────────────────

function IncidentPage({ data, onSelect }: { data: SecurityData; onSelect: (inc: Incident) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [riskFilter, setRiskFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [holdOnly, setHoldOnly] = useState(false)
  const [holdModalInc, setHoldModalInc] = useState<Incident | null>(null)


  const filtered = data.incidents.filter(i => {
    if (riskFilter !== 'ALL' && i.riskLevel !== riskFilter) return false
    if (statusFilter !== 'ALL' && i.workflowStatus !== statusFilter) return false
    if (holdOnly && i.action !== 'HOLD') return false
    return true
  })

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(i => i.id)))
  }
  const toggle = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter bar */}
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
        padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>시간 범위</span>
        {['1시간', '6시간', '24시간', '7일'].map(t => (
          <button key={t} style={{
            padding: '4px 12px', border: '1px solid #E5E7EB', borderRadius: 4,
            fontSize: 12, background: t === '24시간' ? '#1D4ED8' : '#fff',
            color: t === '24시간' ? '#fff' : '#374151', cursor: 'pointer'
          }}>{t}</button>
        ))}
        <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>위험도</span>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
          <button key={r} onClick={() => setRiskFilter(r)} style={{
            padding: '4px 10px', border: `1px solid ${riskFilter === r ? (r === 'ALL' ? '#1D4ED8' : riskColor(r)) : '#E5E7EB'}`,
            borderRadius: 4, fontSize: 12,
            background: riskFilter === r ? (r === 'ALL' ? '#DBEAFE' : riskBg(r)) : '#fff',
            color: riskFilter === r ? (r === 'ALL' ? '#1D4ED8' : riskColor(r)) : '#374151',
            cursor: 'pointer', fontWeight: riskFilter === r ? 600 : 400
          }}>{r === 'ALL' ? '전체' : r}</button>
        ))}
        <div style={{ width: 1, height: 20, background: '#E5E7EB' }} />
        <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>상태</span>
        {(['ALL', 'PENDING_REVIEW', 'AUTO_BLOCKED', 'APPROVED', 'DENIED'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '4px 10px', border: `1px solid ${statusFilter === s ? '#1D4ED8' : '#E5E7EB'}`,
            borderRadius: 4, fontSize: 12,
            background: statusFilter === s ? '#DBEAFE' : '#fff',
            color: statusFilter === s ? '#1D4ED8' : '#374151',
            cursor: 'pointer', fontWeight: statusFilter === s ? 600 : 400
          }}>{s === 'ALL' ? '전체' : statusLabel(s as WorkflowStatus)}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#7B1FA2', fontWeight: 600 }}>HOLD 전용</span>
          <button onClick={() => setHoldOnly(!holdOnly)} style={{
            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: holdOnly ? '#7B1FA2' : '#D1D5DB', position: 'relative', transition: 'background 0.2s'
          }}>
            <span style={{
              position: 'absolute', top: 2, left: holdOnly ? 18 : 2, width: 16, height: 16,
              borderRadius: '50%', background: '#fff', transition: 'left 0.2s'
            }} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '40px 140px 110px 80px 100px 120px 110px 60px 130px 80px',
          alignItems: 'center', gap: 8, padding: '10px 16px',
          background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: 11, color: '#6B7280', fontWeight: 600
        }}>
          <input type="checkbox" onChange={toggleAll} checked={selected.size === filtered.length && filtered.length > 0} />
          <span>타임스탬프</span>
          <span>사용자 ID</span>
          <span>부서</span>
          <span>자산 IP</span>
          <span>탐지 유형</span>
          <span>위험도</span>
          <span>임계치</span>
          <span>워크플로우 상태</span>
          <span>조치</span>
        </div>
        {filtered.map((inc, i) => (
          <div
            key={inc.id}
            onClick={() => inc.action === 'HOLD' ? setHoldModalInc(inc) : onSelect(inc)}
            style={{
              display: 'grid', gridTemplateColumns: '40px 140px 110px 80px 100px 120px 110px 60px 130px 80px',
              alignItems: 'center', gap: 8, padding: '11px 16px',
              borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
              background: inc.riskLevel === 'CRITICAL' ? '#FEF2F2' : inc.action === 'HOLD' ? '#FAF5FF' : '#fff',
              cursor: 'pointer', transition: 'background 0.1s'
            }}
          >
            <input type="checkbox" checked={selected.has(inc.id)} onChange={() => toggle(inc.id)} onClick={e => e.stopPropagation()} />
            <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{inc.timestamp.slice(11)}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{inc.userId}</span>
            <span style={{ fontSize: 12, color: '#374151' }}>{inc.dept}</span>
            <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{inc.assetIp}</span>
            <span style={{ fontSize: 12 }}>{typeLabel(inc.detectedType)}</span>
            <RiskBadge level={inc.riskLevel} />
            <span style={{ fontSize: 12, textAlign: 'center', fontWeight: inc.count >= 5 ? 700 : 400, color: inc.count >= 5 ? '#D32F2F' : '#374151' }}>{inc.count}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(inc.workflowStatus) }}>
              {statusLabel(inc.workflowStatus)}
            </span>
            <Badge text={inc.action} color={actionColor(inc.action)} bg={
              inc.action === 'BLOCK' ? '#FEF2F2' : inc.action === 'WARN' ? '#FEFCE8' : inc.action === 'HOLD' ? '#FAF5FF' : '#F0FDF4'
            } />
          </div>
        ))}
      </div>

      {/* HOLD Modal */}
      {holdModalInc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, width: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#111827' }}>판단 보류(HOLD) 사유</div>
            <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 16 }}>
              {holdModalInc.reason || '필수 필드 누락으로 인해 엔진이 자동 판단을 보류했습니다.'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setHoldModalInc(null)} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: 4, cursor: 'pointer' }}>닫기</button>
              <button onClick={() => onSelect(holdModalInc)} style={{ padding: '8px 16px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>워크플로우 이동</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#111827', color: '#fff', borderRadius: 8, padding: '12px 24px',
          display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 50
        }}>
          <span style={{ fontSize: 13 }}>{selected.size}건 선택됨</span>
          {[
            { label: '화이트리스트 처리', color: '#388E3C' },
            { label: '일괄 승인 (APPROVE)', color: '#1D4ED8' },
            { label: '일괄 차단 (BLOCK)', color: '#D32F2F' },
          ].map(b => (
            <button key={b.label} style={{
              padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer',
              background: b.color, color: '#fff', fontSize: 12, fontWeight: 600
            }}>{b.label}</button>
          ))}
          <button onClick={() => setSelected(new Set())} style={{
            padding: '6px 12px', borderRadius: 4, border: '1px solid #374151',
            background: 'transparent', color: '#9CA3AF', fontSize: 12, cursor: 'pointer'
          }}>취소</button>
        </div>
      )}
    </div>
  )
}

// ─── Page 3: Threat Deep Dive & Workflow ──────────────────────────────────────

function WorkflowPage({ incident, data, onBack }: { incident: Incident | null; data: SecurityData; onBack: () => void }) {
  const inc = incident ?? data.incidents[0]
  const [decision, setDecision] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    if (timeLeft > 0 && !decision) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !decision) {
      setDecision('자동 차단 (TIMEOUT)')
    }
  }, [timeLeft, decision])


  if (!inc) return <div style={{ color: '#6B7280' }}>표시할 인시던트 데이터가 없습니다.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={onBack} style={{
        alignSelf: 'flex-start', border: 'none', background: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 13
      }}>
        ← 인시던트 목록으로
      </button>

      {/* Top: Threat summary */}
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>인시던트 ID</div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{inc.id}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <RiskBadge level={inc.riskLevel} />
            <Badge text={inc.action} color={actionColor(inc.action)} bg={inc.action === 'WARN' ? '#FEFCE8' : '#FEF2F2'} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>발신자</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{inc.userId}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{inc.dept} · {inc.assetIp}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>탐지 유형 · 임계치</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{typeLabel(inc.detectedType)}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>누적 {inc.count}회 · {inc.timestamp}</div>
        </div>
      </div>

      {/* Middle: Decision flow + masked payload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Policy decision diagram */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px' }}>
          <SectionTitle>판단 엔진 출력 — 로직 충돌 다이어그램</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0', overflowX: 'auto' }}>
            <div style={{ padding: 12, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, minWidth: 120 }}>
              <div style={{ fontSize: 11, color: '#6B7280' }}>적용 룰</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{inc.policyRule || '정책 정보 없음'}</div>
            </div>
            <div style={{ color: '#9CA3AF', fontSize: 18 }}>→</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, minWidth: 140 }}>
                <div style={{ fontSize: 10, color: '#D32F2F' }}>기밀 태그 감지</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>{inc.policyTag || '태그 정보 없음'}</div>
              </div>
              <div style={{ padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, minWidth: 140 }}>
                <div style={{ fontSize: 10, color: '#388E3C' }}>수신자 검증</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>{inc.recipient || '수신자 정보 없음'}</div>
              </div>
            </div>
            <div style={{ color: '#9CA3AF', fontSize: 18 }}>→</div>
            <div style={{ padding: 16, background: '#FEFCE8', border: '2px solid #FDE68A', borderRadius: 8, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: '#B45309' }}>충돌 판정 결과</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>WARN (다운그레이드)</div>
            </div>
          </div>
        </div>

        {/* Masked payload */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px' }}>
          <SectionTitle>원본 스니펫 (일부 마스킹)</SectionTitle>
          <div style={{
            background: '#111827', borderRadius: 6, padding: '16px', fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, lineHeight: 1.7, color: '#E5E7EB'
          }}>
            <span style={{ color: '#9CA3AF' }}>// 프롬프트 원본 (매칭 키워드 마스킹 처리)</span>
            <br />
            <span style={{ color: '#F9FAFB' }}>curl -H "Authorization: Bearer </span>
            <span style={{ background: '#D32F2F', padding: '0 4px', borderRadius: 2, color: '#fff' }}>████████████████</span>
            <span style={{ color: '#F9FAFB' }}>" \</span>
            <br />
            <span style={{ color: '#F9FAFB' }}>  https://</span>
            <span style={{ background: '#388E3C', padding: '0 4px', borderRadius: 2, color: '#fff' }}>{inc.recipient || '수신자 정보 없음'}</span>
            <span style={{ color: '#F9FAFB' }}>/api/upload \</span>
            <br />
            <span style={{ color: '#F9FAFB' }}>  -d @</span>
            <span style={{ background: '#FBC02D', padding: '0 4px', borderRadius: 2, color: '#111' }}>{inc.payload || '마스킹된 페이로드 없음'}</span>
            <br /><br />
            <span style={{ color: '#6B7280' }}>// detected_type: {inc.detectedType}</span>
            <br />
            <span style={{ color: '#6B7280' }}>// applied_rule: {inc.policyRule || 'N/A'}</span>
          </div>

          <div style={{ marginTop: 16 }}>
            <SectionTitle>소명 사유 (사용자 제출)</SectionTitle>
            <div style={{
              border: '1px solid #E5E7EB', borderRadius: 6, padding: '12px 14px',
              fontSize: 13, color: '#374151', lineHeight: 1.6, background: '#F9FAFB', minHeight: 64
            }}>
              {inc.reason ?? '소명 사유가 없습니다.'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Decision actions */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
        {!decision && (
          <div style={{ position: 'absolute', top: 0, left: 0, height: 4, background: '#E5E7EB', width: '100%' }}>
            <div style={{ height: '100%', background: timeLeft < 15 ? '#D32F2F' : '#388E3C', width: `${(timeLeft / 60) * 100}%`, transition: 'width 1s linear, background-color 0.3s' }} />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>관리자 결재 — 소명 처리</SectionTitle>
          {!decision && (
            <span style={{ fontSize: 14, fontWeight: 700, color: timeLeft < 15 ? '#D32F2F' : '#374151' }}>
              {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')} 남음
            </span>
          )}
        </div>
        <SectionTitle>관리자 결재 — 소명 처리</SectionTitle>
        {decision ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
            background: decision === '승인' ? '#F0FDF4' : decision === '차단 유지' ? '#FEF2F2' : '#EDE9FE',
            borderRadius: 6, border: `1px solid ${decision === '승인' ? '#BBF7D0' : decision === '차단 유지' ? '#FECACA' : '#DDD6FE'}`
          }}>
            <span style={{ fontSize: 20 }}>{decision === '승인' ? '✓' : decision === '차단 유지' ? '✕' : '↑'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>결재 완료: {decision}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{inc.decisionAt || '결정 시각 없음'} · {inc.decisionBy || '결정자 정보 없음'}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: '승인 (APPROVE)', color: '#388E3C', bg: '#F0FDF4', border: '#BBF7D0' },
              { label: '차단 유지 (DENY)', color: '#D32F2F', bg: '#FEF2F2', border: '#FECACA' },
              { label: '에스컬레이션', color: '#7B1FA2', bg: '#FAF5FF', border: '#DDD6FE' },
            ].map(b => (
              <button key={b.label} onClick={() => setDecision(b.label.split(' ')[0])} style={{
                padding: '10px 24px', borderRadius: 6, border: `1px solid ${b.border}`,
                background: b.bg, color: b.color, fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>{b.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page 4: Policy Management ────────────────────────────────────────────────
function PolicyPage({ data }: { data: SecurityData }) {
  const [tab, setTab] = useState<'rules' | 'whitelist'>('rules')
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState<null | boolean>(null)
  const [conflictMode, setConflictMode] = useState<'BLOCK' | 'WARN'>(data.conflictMode)

  const runTest = () => {
    setTestResult(testInput.includes('sk-') || testInput.includes('AKIA'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E5E7EB' }}>
        {[
          { key: 'rules', label: '탐지 룰 편집기' },
          { key: 'whitelist', label: '화이트리스트 및 충돌 정책' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'rules' | 'whitelist')} style={{
            padding: '10px 24px', border: 'none', borderBottom: tab === t.key ? '2px solid #1D4ED8' : '2px solid transparent',
            background: 'none', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? '#1D4ED8' : '#6B7280', cursor: 'pointer', marginBottom: -1
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'rules' && (
        <>
          {/* Rule list */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 140px 1fr 120px 100px 80px',
              padding: '10px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
              fontSize: 11, color: '#6B7280', fontWeight: 600, gap: 12
            }}>
              <span>룰 ID</span><span>룰 명칭</span><span>정규표현식</span>
              <span>위험도</span><span>즉시 차단</span><span>활성</span>
            </div>
            {data.rules.map((r, i) => (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '80px 140px 1fr 120px 100px 80px',
                padding: '12px 16px', alignItems: 'center', gap: 12,
                borderBottom: i < data.rules.length - 1 ? '1px solid #F3F4F6' : 'none',
                background: r.enabled ? '#fff' : '#F9FAFB'
              }}>
                <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{r.id}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
                <code style={{
                  fontSize: 11, background: '#F3F4F6', padding: '3px 8px', borderRadius: 4,
                  color: '#374151', wordBreak: 'break-all'
                }}>{r.regex}</code>
                <RiskBadge level={r.risk} />
                <span style={{ fontSize: 12, color: r.risk === 'CRITICAL' ? '#D32F2F' : '#9CA3AF', fontWeight: r.risk === 'CRITICAL' ? 600 : 400 }}>
                  {r.risk === 'CRITICAL' ? '✓ 즉시 차단' : '임계치 적용'}
                </span>
                <span style={{
                  display: 'inline-block', width: 36, height: 20, borderRadius: 10,
                  background: r.enabled ? '#388E3C' : '#D1D5DB', position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute', top: 2, left: r.enabled ? 18 : 2, width: 16, height: 16,
                    borderRadius: '50%', background: '#fff'
                  }} />
                </span>
              </div>
            ))}
          </div>

          {/* Test area */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px' }}>
            <SectionTitle>정규표현식 룰 테스트 (RULE-101)</SectionTitle>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <textarea
                value={testInput}
                onChange={e => { setTestInput(e.target.value); setTestResult(null) }}
                placeholder="테스트 입력값을 입력하세요..."
                style={{
                  flex: 1, border: '1px solid #E5E7EB', borderRadius: 6, padding: '10px 12px',
                  fontSize: 12, fontFamily: 'JetBrains Mono, monospace', resize: 'vertical',
                  minHeight: 80, outline: 'none', color: '#111827'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={runTest} style={{
                  padding: '10px 20px', background: '#1D4ED8', color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>테스트 실행</button>
                {testResult !== null && (
                  <div style={{
                    padding: '10px 16px', borderRadius: 6,
                    background: testResult ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${testResult ? '#FECACA' : '#BBF7D0'}`,
                    fontSize: 13, fontWeight: 600,
                    color: testResult ? '#D32F2F' : '#388E3C'
                  }}>
                    {testResult ? '⚠ 탐지됨 (MATCH)' : '✓ 정상 (NO MATCH)'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'whitelist' && (
        <>
          {/* Conflict mode toggle */}
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>기밀 태그 충돌 시 기본 동작</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>CONFIDENTIAL 태그와 화이트리스트 도메인이 충돌했을 때의 정책</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['BLOCK', 'WARN'] as const).map(m => (
                <button key={m} onClick={() => setConflictMode(m)} style={{
                  padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: conflictMode === m ? (m === 'BLOCK' ? '#D32F2F' : '#FBC02D') : '#F3F4F6',
                  color: conflictMode === m ? (m === 'BLOCK' ? '#fff' : '#111827') : '#6B7280'
                }}>
                  {m === 'BLOCK' ? '무조건 차단 (BLOCK)' : '경고 및 소명 (WARN)'}
                </button>
              ))}
            </div>
          </div>

          {/* Whitelist table */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 20px', borderBottom: '1px solid #E5E7EB'
            }}>
              <SectionTitle>신뢰 도메인 목록 (Whitelist)</SectionTitle>
              <button style={{
                padding: '6px 16px', background: '#1D4ED8', color: '#fff', border: 'none',
                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}>+ 도메인 추가</button>
            </div>
            {data.whitelist.map((w, i) => (
              <div key={w.domain} style={{
                display: 'grid', gridTemplateColumns: '200px 1fr 120px 100px 80px',
                alignItems: 'center', gap: 16, padding: '12px 20px',
                borderBottom: i < data.whitelist.length - 1 ? '1px solid #F3F4F6' : 'none',
                background: w.active ? '#fff' : '#F9FAFB'
              }}>
                <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{w.domain}</span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{w.label}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{w.addedBy}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{w.date}</span>
                <span style={{
                  display: 'inline-block', width: 36, height: 20, borderRadius: 10,
                  background: w.active ? '#388E3C' : '#D1D5DB', position: 'relative', cursor: 'pointer'
                }}>
                  <span style={{
                    position: 'absolute', top: 2, left: w.active ? 18 : 2, width: 16, height: 16,
                    borderRadius: '50%', background: '#fff'
                  }} />
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Page 5: Audit Logs ───────────────────────────────────────────────────────
function AuditPage({ data }: { data: SecurityData }) {
  const hasError = data.auditLogs.some(l => l.status === 'error')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Chain health status */}
      <style>{`
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.4); border-color: #D32F2F; background: #FEF2F2; }
          50% { box-shadow: 0 0 0 10px rgba(211, 47, 47, 0); border-color: #FECACA; background: #FFF5F5; }
          100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); border-color: #D32F2F; background: #FEF2F2; }
        }
      `}</style>
      <div style={{
        background: hasError ? '#FEF2F2' : '#F0FDF4',
        border: `2px solid ${hasError ? '#D32F2F' : '#BBF7D0'}`,
        borderRadius: 8, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 20,
        animation: hasError ? 'pulse-red 1.5s infinite' : 'none'
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: hasError ? '#D32F2F' : '#388E3C',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#fff', fontWeight: 700, flexShrink: 0
        }}>
          {hasError ? '!' : '✓'}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: hasError ? '#D32F2F' : '#388E3C' }}>
            {hasError ? '감사 체인 이상 감지 — 긴급 경고' : '감사 체인 검증됨 (Verified)'}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {hasError
              ? 'seq 1044 공백 감지 — HMAC-SHA256 체인 불연속. CISO에게 긴급 알림 발송됨.'
              : 'HMAC-SHA256 해시 체인 정상. 전체 시퀀스 연속성 검증 완료.'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>마지막 검증</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>2026-08-06 15:42:10</div>
        </div>
      </div>

      {/* Audit log table */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
          <SectionTitle>불변 감사 로그 (Append-Only)</SectionTitle>
          <span style={{ fontSize: 11, color: '#9CA3AF', alignSelf: 'center' }}>읽기 전용 — 수정·삭제 불가</span>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '70px 160px 120px 140px 120px 140px 100px 80px',
          padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
          fontSize: 11, color: '#6B7280', fontWeight: 600, gap: 10
        }}>
          <span>SEQ</span><span>타임스탬프</span><span>행위자</span><span>동작</span>
          <span>대상</span><span>prev_hash</span><span>row_hash</span><span>상태</span>
        </div>
        {data.auditLogs.map((log, i) => (
          <div key={log.seq} style={{
            display: 'grid', gridTemplateColumns: '70px 160px 120px 140px 120px 140px 100px 80px',
            padding: '11px 20px', alignItems: 'center', gap: 10,
            borderBottom: i < data.auditLogs.length - 1 ? '1px solid #F3F4F6' : 'none',
            background: log.status === 'error' ? '#FEF2F2' : '#fff',
            animation: log.status === 'error' ? 'none' : undefined
          }}>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: log.status === 'error' ? '#D32F2F' : '#111827' }}>
              {log.seq}
              {i > 0 && data.auditLogs[i - 1].seq - log.seq > 1 && (
                <span style={{ marginLeft: 4, fontSize: 10, color: '#D32F2F' }}>GAP</span>
              )}
            </span>
            <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{log.ts.slice(11)}</span>
            <span style={{ fontSize: 12, color: '#374151' }}>{log.actor}</span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: log.action === 'AUTO_BLOCK' ? '#D32F2F' : log.action === 'APPROVE' ? '#388E3C' : log.action === 'DENY' ? '#6B7280' : '#1D4ED8'
            }}>{log.action}</span>
            <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{log.target}</span>
            <span className="mono" style={{ fontSize: 10, color: '#9CA3AF' }}>{log.prevHash}</span>
            <span className="mono" style={{ fontSize: 10, color: log.status === 'error' ? '#D32F2F' : '#9CA3AF' }}>{log.rowHash}</span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: log.status === 'ok' ? '#388E3C' : '#D32F2F'
            }}>{log.status === 'ok' ? '✓ 검증됨' : '✕ 훼손 의심'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── Page 6: IP Management ───────────────────────────────────────────────────
function IpManagementPage({ data }: { data: SecurityData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>IP-부서 매핑 테이블</SectionTitle>
          <button style={{ padding: '6px 12px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12 }}>+ 수동 등록</button>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '150px 120px 150px 180px 100px',
          padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
          fontSize: 11, color: '#6B7280', fontWeight: 600, gap: 10
        }}>
          <span>IP 주소</span><span>부서</span><span>할당 사번</span><span>최근 연결 시간</span><span>상태</span>
        </div>
        {data.ipMappings.map((ip, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '150px 120px 150px 180px 100px',
            padding: '12px 20px', alignItems: 'center', gap: 10,
            borderBottom: i < data.ipMappings.length - 1 ? '1px solid #F3F4F6' : 'none',
          }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{ip.ip}</span>
            <span style={{ fontSize: 12, color: '#374151' }}>{ip.dept}</span>
            <span style={{ fontSize: 12, color: '#111827' }}>{ip.user}</span>
            <span className="mono" style={{ fontSize: 11, color: '#6B7280' }}>{ip.lastSeen}</span>
            <Badge text={ip.status} color={ip.status === 'ACTIVE' ? '#388E3C' : '#9CA3AF'} bg={ip.status === 'ACTIVE' ? '#F0FDF4' : '#F3F4F6'} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const navItems: { key: Page; label: string; sub: string; icon: string }[] = [
  { key: 'dashboard', label: '보안 현황 대시보드', sub: 'Global Overview', icon: '▦' },
  { key: 'incidents', label: '실시간 인시던트 관제', sub: 'Incident Response', icon: '⚑' },
  { key: 'workflow', label: '소명 워크플로우', sub: 'Threat Deep Dive', icon: '⬦' },
  { key: 'policy', label: '정책 및 룰셋 관리', sub: 'Policy Management', icon: '≡' },
  { key: 'audit', label: '무결성 감사 로그', sub: 'Audit & Integrity', icon: '⚿' },
  { key: 'ip_management', label: 'IP 관리', sub: 'IP & Dept Mapping', icon: '⌗' },
]

function Sidebar({ current, onChange }: { current: Page; onChange: (p: Page) => void }) {
  return (
    <div style={{
      width: 240, minHeight: '100vh', borderRight: '1px solid #E5E7EB',
      background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#1D4ED8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 700
          }}>S</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: -0.3 }}>SafeRoute</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', letterSpacing: 0.5 }}>SECURITY ADMIN</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 0', flex: 1 }}>
        <div style={{ padding: '4px 16px 8px', fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.8 }}>
          NAVIGATION
        </div>
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
              background: current === item.key ? '#EFF6FF' : 'transparent',
              borderLeft: current === item.key ? '3px solid #1D4ED8' : '3px solid transparent',
              transition: 'background 0.1s'
            }}
          >
            <span style={{ fontSize: 16, color: current === item.key ? '#1D4ED8' : '#9CA3AF', width: 20, textAlign: 'center' }}>
              {item.icon}
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: current === item.key ? 600 : 400, color: current === item.key ? '#1D4ED8' : '#374151' }}>
                {item.label}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF' }}>{item.sub}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#DBEAFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#1D4ED8'
          }}>서</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>admin.seo</div>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>CISO · SOC 총괄</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
const pageTitles: Record<Page, { ko: string; en: string }> = {
  dashboard: { ko: '보안 현황 대시보드', en: 'Global Security Overview' },
  incidents: { ko: '실시간 인시던트 관제', en: 'Incident Response & Alert Management' },
  workflow: { ko: '소명 기반 대응 워크플로우', en: 'Threat Deep Dive & Workflow' },
  policy: { ko: '보안 정책 및 룰셋 관리', en: 'Policy & Rule-set Management' },
  audit: { ko: '무결성 감사 로그', en: 'Audit & Integrity Logs' },
  ip_management: { ko: 'IP-부서 매핑', en: 'IP & Department Mapping' },
}

function Header({ page }: { page: Page }) {
  const t = pageTitles[page]
  return (
    <div style={{
      height: 56, borderBottom: '1px solid #E5E7EB', background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', flexShrink: 0
    }}>
      <div>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{t.ko}</span>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 10 }}>{t.en}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#388E3C', display: 'inline-block' }} />
          <span style={{ color: '#388E3C', fontWeight: 500 }}>Firebase 연결됨</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#388E3C', display: 'inline-block' }} />
          <span style={{ color: '#388E3C', fontWeight: 500 }}>해시 체인 정상</span>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#FEF2F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#D32F2F', fontWeight: 700, cursor: 'pointer', position: 'relative'
        }}>
          🔔
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: '50%',
            background: '#D32F2F', fontSize: 9, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700
          }}>7</span>
        </div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>2026-08-06 15:42</div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// ─── Admin App (Former Root) ──────────────────────────────────────────────────
function AdminApp({ data, onSwitch }: { data: SecurityData; onSwitch: (mode: AppMode) => void }) {
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const handleSelectIncident = (inc: Incident) => {
    setSelectedIncident(inc)
    setPage('workflow')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>
      <Sidebar current={page} onChange={setPage} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '8px 28px', background: '#111827', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <button onClick={() => onSwitch('onboarding')} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>하드웨어 온보딩 보기</button>
          <button onClick={() => onSwitch('captive_portal')} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>캡티브 포털 보기</button>
          <button onClick={() => onSwitch('client_popup')} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>클라이언트 팝업 보기</button>
        </div>
        <Header page={page} />
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {page === 'dashboard' && <DashboardPage data={data} />}
          {page === 'incidents' && <IncidentPage data={data} onSelect={handleSelectIncident} />}
          {page === 'workflow' && (
            <WorkflowPage
              incident={selectedIncident}
              data={data}
              onBack={() => setPage('incidents')}
            />
          )}
          {page === 'policy' && <PolicyPage data={data} />}
          {page === 'audit' && <AuditPage data={data} />}
          {page === 'ip_management' && <IpManagementPage data={data} />}
        </main>
      </div>
    </div>
  )
}

// ─── Extra Screens ────────────────────────────────────────────────────────────

function OnboardingScreen({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111827', color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ width: 400 }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#60A5FA' }}>SafeRoute OS Installer</div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 32 }}>Hardware initialization & Network Setup</div>
        
        <div style={{ background: '#1F2937', padding: 24, borderRadius: 8, border: '1px solid #374151' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Device ID (MAC Address)</label>
            <input type="text" placeholder="장치 ID를 입력하세요" style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: 4 }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>Admin Password</label>
            <input type="password" placeholder="Enter root password" style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: 4, outline: 'none' }} />
          </div>
          <button onClick={onNext} style={{ width: '100%', padding: '12px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            Initialize Node
          </button>
        </div>
      </div>
    </div>
  )
}

function OnboardingLoadingScreen({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onNext, 2500)
    return () => clearTimeout(timer)
  }, [onNext])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111827', color: '#fff', fontFamily: 'JetBrains Mono, monospace' }}>
      <div style={{ width: 400, textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #1F2937', borderTopColor: '#60A5FA', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }}></div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 14, color: '#D1D5DB', marginBottom: 8 }}>데이터베이스 동기화 중...</div>
        <div style={{ fontSize: 11, color: '#6B7280' }}>Fetching security policies from central server</div>
      </div>
    </div>
  )
}

function CaptivePortalScreen({ data, onNext }: { data: SecurityData; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F3F4F6' }}>
      <div style={{ background: '#fff', width: 380, padding: 32, borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: '#1D4ED8', color: '#fff', fontSize: 24, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>S</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>사내망 접속 안내</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>인터넷 연결을 위해 인증이 필요합니다.</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>사번 (Employee ID)</label>
          <input type="text" placeholder="예: 2026101" style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6, outline: 'none' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>소속 부서</label>
          <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6, outline: 'none', background: '#fff' }}>
            {data.departments.map(department => <option key={department.dept}>{department.dept}</option>)}
          </select>
        </div>
        <button onClick={onNext} style={{ width: '100%', padding: '12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          네트워크 연결
        </button>
      </div>
    </div>
  )
}

function ClientPopupScreen({ data, onNext }: { data: SecurityData; onNext: () => void }) {
  const incident = data.incidents[0]
  return (
    <div style={{ minHeight: '100vh', background: 'url(https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&q=80) center/cover', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 32 }}>
      <div style={{ background: '#fff', width: 360, padding: 20, borderRadius: 8, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '2px solid #FBC02D' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ fontSize: 24 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>보안 정책 위반 경고 (WARN)</div>
            <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5, marginBottom: 12 }}>
              {incident ? `${incident.recipient || '외부 수신자'}로 ${incident.policyTag || '보호 대상 정보'} 전송이 감지되었습니다. 전송 목적과 소명 사유를 입력해주세요.` : '표시할 보안 이벤트가 없습니다.'}
            </div>
            <textarea placeholder="소명 사유 입력 (예: NDA 체결 완료된 협력사 전송 건)" style={{ width: '100%', height: 60, padding: 8, fontSize: 12, border: '1px solid #D1D5DB', borderRadius: 4, resize: 'none', outline: 'none', marginBottom: 12 }}></textarea>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onNext} style={{ padding: '6px 12px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>전송 취소</button>
              <button onClick={onNext} style={{ padding: '6px 12px', background: '#F57C00', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>사유 제출 및 계속</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Root Entry ───────────────────────────────────────────────────────────────
function useSecurityData() {
  const [data, setData] = useState<SecurityData>(EMPTY_DATA)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined
    const applyData = (value: unknown) => {
      if (!value || typeof value !== 'object') return
      const incoming = value as Partial<SecurityData>
      setData(current => ({
        ...current,
        ...incoming,
        kpis: { ...current.kpis, ...(incoming.kpis ?? {}) },
      }))
    }

    const handleUpdate = (event: Event) => applyData((event as CustomEvent<unknown>).detail)
    window.addEventListener('security-data-updated', handleUpdate)

    if (!apiUrl) return () => window.removeEventListener('security-data-updated', handleUpdate)

    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`${apiUrl.replace(/\/$/, '')}/dashboard`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        if (!cancelled) applyData(payload)
      } catch (error) {
        console.error('SafeRoute data sync failed', error)
      }
    }
    load()
    const timer = window.setInterval(load, 10000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('security-data-updated', handleUpdate)
    }
  }, [])

  return data
}

export default function Root() {
  const [mode, setMode] = useState<AppMode>('admin')
  const data = useSecurityData()

  if (mode === 'onboarding') return <OnboardingScreen onNext={() => setMode('onboarding_loading')} />
  if (mode === 'onboarding_loading') return <OnboardingLoadingScreen onNext={() => setMode('admin')} />
  if (mode === 'captive_portal') return <CaptivePortalScreen data={data} onNext={() => setMode('admin')} />
  if (mode === 'client_popup') return <ClientPopupScreen data={data} onNext={() => setMode('admin')} />

  return <AdminApp data={data} onSwitch={setMode} />
}
