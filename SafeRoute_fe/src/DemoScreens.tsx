import { useEffect } from 'react'

export type DemoMode = 'onboarding' | 'onboarding_loading' | 'captive_portal' | 'client_popup'

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
            다음 화면 미리보기
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
        <div style={{ fontSize: 14, color: '#D1D5DB', marginBottom: 8 }}>데모 화면 전환 중...</div>
        <div style={{ fontSize: 11, color: '#6B7280' }}>Preview only — no server request</div>
      </div>
    </div>
  )
}

function CaptivePortalScreen({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F3F4F6' }}>
      <div style={{ background: '#fff', width: 380, padding: 32, borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: '#1D4ED8', color: '#fff', fontSize: 24, fontWeight: 700, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>S</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>사내망 접속 안내</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>인증 화면 미리보기입니다. 실제 네트워크 연결은 수행하지 않습니다.</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>사번 (Employee ID)</label>
          <input type="text" placeholder="예: 2026101" style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6, outline: 'none' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>소속 부서</label>
          <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6, outline: 'none', background: '#fff' }}>
            <option>데모 부서</option>
          </select>
        </div>
        <button onClick={onNext} style={{ width: '100%', padding: '12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          데모 닫기
        </button>
      </div>
    </div>
  )
}

function ClientPopupScreen({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#E5E7EB', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 32 }}>
      <div style={{ background: '#fff', width: 360, padding: 20, borderRadius: 8, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '2px solid #FBC02D' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ fontSize: 24 }}>⚠️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>보안 정책 위반 경고 (WARN)</div>
            <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.5, marginBottom: 12 }}>
              데모 경고입니다. 입력한 소명은 서버에 제출되지 않습니다.
            </div>
            <textarea placeholder="소명 사유 입력 (예: NDA 체결 완료된 협력사 전송 건)" style={{ width: '100%', height: 60, padding: 8, fontSize: 12, border: '1px solid #D1D5DB', borderRadius: 4, resize: 'none', outline: 'none', marginBottom: 12 }}></textarea>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onNext} style={{ padding: '6px 12px', background: '#F57C00', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>데모 닫기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DemoScreens({ mode, onChange, onClose }: {
  mode: DemoMode; onChange: (mode: DemoMode) => void; onClose: () => void
}) {
  return <>
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: 12, background: '#FEF3C7', color: '#92400E', display: 'flex', justifyContent: 'space-between' }}>
      <span>화면 미리보기 · 설치, 인증, 소명 제출은 실행되지 않습니다.</span>
      <button onClick={onClose}>관리 화면으로 돌아가기</button>
    </div>
    {mode === 'onboarding' && <OnboardingScreen onNext={() => onChange('onboarding_loading')} />}
    {mode === 'onboarding_loading' && <OnboardingLoadingScreen onNext={onClose} />}
    {mode === 'captive_portal' && <CaptivePortalScreen onNext={onClose} />}
    {mode === 'client_popup' && <ClientPopupScreen onNext={onClose} />}
  </>
}
