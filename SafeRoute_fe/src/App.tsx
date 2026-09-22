import { useState } from 'react'
import { CaseDashboard, CaseList, CaseDetail } from './CaseViews'
import DemoScreens, { type DemoMode } from './DemoScreens'

type Page = 'dashboard' | 'incidents' | 'workflow' | 'policy' | 'audit' | 'ip_management'

function UnavailablePage({ title, description }: { title: string; description: string }) {
  return <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: 24 }}>
    <h2 style={{ fontSize: 16, marginTop: 0 }}>{title}</h2>
    <p style={{ color: '#92400E' }}>미연동 · 준비 중</p>
    <p style={{ color: '#6B7280' }}>{description}</p>
  </section>
}

const navItems: { key: Page; label: string; sub: string; icon: string }[] = [
  { key: 'dashboard', label: '보안 현황 대시보드', sub: 'Global Overview', icon: '▦' },
  { key: 'incidents', label: '실시간 인시던트 관제', sub: 'Incident Response', icon: '⚑' },
  { key: 'workflow', label: '판정 로그 상세', sub: 'Case Details', icon: '⬦' },
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

      <div style={{ padding: '16px 20px', borderTop: '1px solid #F3F4F6', color: '#6B7280', fontSize: 12 }}>
        SafeRoute 관리 화면
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
const pageTitles: Record<Page, { ko: string; en: string }> = {
  dashboard: { ko: '보안 현황 대시보드', en: 'Global Security Overview' },
  incidents: { ko: '실시간 인시던트 관제', en: 'Incident Response & Alert Management' },
  workflow: { ko: '판정 로그 상세', en: 'Case Details' },
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
      <div style={{ fontSize: 12, color: '#6B7280' }}>판정 로그 조회</div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// ─── Admin App (Former Root) ──────────────────────────────────────────────────
function AdminApp({ onSwitch }: { onSwitch: (mode: DemoMode) => void }) {
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null)

  const handleSelectIncident = (inc: string) => {
    setSelectedIncident(inc)
    setPage('workflow')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB' }}>
      <Sidebar current={page} onChange={setPage} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '8px 28px', background: '#111827', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
          <button onClick={() => onSwitch('onboarding')} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>온보딩 데모</button>
          <button onClick={() => onSwitch('captive_portal')} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>캡티브 포털 데모</button>
          <button onClick={() => onSwitch('client_popup')} style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>클라이언트 팝업 데모</button>
        </div>
        <Header page={page} />
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {page === 'dashboard' && <CaseDashboard />}
          {page === 'incidents' && <CaseList onSelect={handleSelectIncident} />}
          {page === 'workflow' && (
            selectedIncident ? <CaseDetail id={selectedIncident} onBack={() => setPage('incidents')} /> : <CaseList onSelect={handleSelectIncident} />
          )}
          {page === 'policy' && <UnavailablePage title="정책 및 룰셋 관리" description="정책 조회·변경 기능은 아직 연결되지 않았습니다. 정책 변경과 룰 테스트는 사용할 수 없습니다." />}
          {page === 'audit' && <UnavailablePage title="무결성 감사 로그" description="감사 로그가 연결되지 않아 무결성을 확인할 수 없습니다. 해시 체인 검증과 알림 발송 기능은 아직 구현되지 않았습니다." />}
          {page === 'ip_management' && <UnavailablePage title="IP 관리" description="IP·부서 매핑 조회 및 수동 등록 기능은 아직 연결되지 않았습니다." />}
        </main>
      </div>
    </div>
  )
}

export default function Root() {
  const [demoMode, setDemoMode] = useState<DemoMode | null>(null)
  if (demoMode) return <DemoScreens mode={demoMode} onChange={setDemoMode} onClose={() => setDemoMode(null)} />
  return <AdminApp onSwitch={setDemoMode} />
}
