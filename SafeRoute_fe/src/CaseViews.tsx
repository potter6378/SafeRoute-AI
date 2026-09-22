import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getApi, getCases, type CaseLog, type Summary } from './api'

const panel = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: 20 }
const labels: Record<string, string> = { API_KEY: 'API 키', CREDENTIAL: '인증정보', PERSONAL_INFO: '개인정보', FINANCIAL: '금융정보', SOURCE_CODE: '소스코드', INTERNAL_DOC: '내부 문서', ETC: '기타' }
const date = (value: string) => new Date(value).toLocaleString('ko-KR')

function useQuery<T>(key: string, request: (signal: AbortSignal) => Promise<T>, poll = false) {
  const [result, setResult] = useState<{ key: string; value?: T; error?: string }>({ key })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    setResult({ key })
    async function load() {
      try {
        const value = await request(controller.signal)
        if (!controller.signal.aborted) setResult({ key, value })
      } catch (error) {
        if (!controller.signal.aborted) setResult(current => ({ ...current, key, error: error instanceof Error ? error.message : '서버 연결 실패' }))
      } finally {
        if (poll && !controller.signal.aborted) timer = setTimeout(load, 10000)
      }
    }
    void load()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [key, retry, poll])
  return { ...(result.key === key ? result : { key }), reload: () => setRetry(value => value + 1) }
}

function QueryStatus({ error, loading, reload }: { error?: string; loading: boolean; reload: () => void }) {
  if (error) return <p role="alert" style={{ color: '#B91C1C' }}>데이터 갱신 실패: {error} <button onClick={reload}>다시 시도</button></p>
  return loading ? <p role="status">불러오는 중...</p> : null
}

export function CaseDashboard() {
  const summary = useQuery('summary', signal => getApi<Summary>('/stats/summary', signal), true)
  const latest = useQuery('latest', signal => getCases({ limit: 10, offset: 0 }, signal), true)
  const data = summary.value
  return <div style={{ display: 'grid', gap: 20 }}>
    <QueryStatus error={summary.error} loading={!data} reload={summary.reload} />
    {data && <>
      <div style={{ display: 'flex', gap: 16 }}>{[['전체 판정', data.total_cases], ['차단', data.by_decision.BLOCK ?? 0], ['경고', data.by_decision.WARN ?? 0], ['보류', data.by_decision.HOLD ?? 0]].map(([label, value]) => <div key={label} style={{ ...panel, flex: 1 }}>{label}<div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div></div>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {[
          { title: '판정 결과', items: Object.entries(data.by_decision).map(([name, count]) => ({ name, count })) },
          { title: '위험도별 판정', items: Object.entries(data.by_risk_level).map(([name, count]) => ({ name, count })) },
          { title: '탐지 유형', items: Object.entries(data.by_detected_type).map(([name, count]) => ({ name: labels[name] || name, count })) },
          { title: '접속량 상위 도메인', items: data.top_domains.map(item => ({ name: item.domain, count: item.count })) },
        ].map(chart => <section key={chart.title} style={panel}><h3>{chart.title}</h3>{chart.items.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={chart.items}><XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="건수" fill="#2563EB" /></BarChart></ResponsiveContainer> : <p>집계된 데이터가 없습니다.</p>}</section>)}
      </div>
    </>}
    <section style={panel}><h3>최근 판정 로그 · 10초마다 갱신</h3>
      <QueryStatus error={latest.error} loading={!latest.value} reload={latest.reload} />
      {latest.value?.items.map(item => <p key={item.log_id}>{date(item.timestamp_decided)} · {item.user_id} · {item.domain} · {labels[item.detected_type] || item.detected_type} · {item.risk_level} · {item.decision}</p>)}
      {latest.value?.items.length === 0 && <p>아직 판정 로그가 없습니다.</p>}
    </section>
  </div>
}

export function CaseList({ onSelect }: { onSelect: (id: string) => void }) {
  const [decision, setDecision] = useState('')
  const [risk, setRisk] = useState('')
  const [domain, setDomain] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 20
  const key = JSON.stringify([decision, risk, domain, offset])
  const query = useQuery(key, signal => getCases({ decision, risk_level: risk, domain, offset, limit }, signal), true)
  useEffect(() => {
    if (query.value && offset > 0 && offset >= query.value.total) setOffset(Math.max(0, Math.ceil(query.value.total / limit) - 1) * limit)
  }, [query.value, offset])
  return <section style={panel}>
    <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
      <label>판정 <select value={decision} onChange={event => { setDecision(event.target.value); setOffset(0) }}><option value="">전체</option>{['ALLOW', 'WARN', 'BLOCK', 'HOLD'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>위험도 <select value={risk} onChange={event => { setRisk(event.target.value); setOffset(0) }}><option value="">전체</option>{['Low', 'Medium', 'High', 'Critical'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>도메인 <input placeholder="chatgpt.com" value={domain} onChange={event => { setDomain(event.target.value.trim()); setOffset(0) }} /></label>
      <button onClick={query.reload}>새로고침</button>
    </div>
    <QueryStatus error={query.error} loading={!query.value} reload={query.reload} />
    {query.value && <>
      <p>총 {query.value.total}건 · 10초마다 갱신</p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}><thead><tr>{['판정 시각', '사용자', '도메인', '탐지 유형', '위험도', '건수', '판정', '상태', '상세'].map(title => <th key={title} style={{ padding: 10 }}>{title}</th>)}</tr></thead>
        <tbody>{query.value.items.map(item => <tr key={item.log_id} style={{ borderTop: '1px solid #E5E7EB' }}>{[date(item.timestamp_decided), item.user_id, item.domain, labels[item.detected_type] || item.detected_type, item.risk_level, item.count, item.decision, item.state].map((value, index) => <td key={index} style={{ padding: 10, fontSize: 12 }}>{value}</td>)}<td><button onClick={() => onSelect(item.log_id)}>상세보기</button></td></tr>)}</tbody>
      </table></div>
      {!query.value.items.length && <p>조건에 맞는 판정 로그가 없습니다.</p>}
      <div style={{ display: 'flex', gap: 16, marginTop: 20 }}><button disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - limit))}>이전</button><span>{Math.floor(offset / limit) + 1} / {Math.max(1, Math.ceil(query.value.total / limit))}</span><button disabled={offset + limit >= query.value.total} onClick={() => setOffset(value => value + limit)}>다음</button></div>
    </>}
  </section>
}

export function CaseDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const query = useQuery(id, signal => getApi<CaseLog>(`/cases/${encodeURIComponent(id)}`, signal))
  const item = query.value
  return <section style={panel}>
    <button onClick={onBack}>← 판정 로그 목록</button><h3>판정 로그 상세</h3>
    <QueryStatus error={query.error} loading={!item} reload={query.reload} />
    {item && <dl>{Object.entries({ '로그 ID': item.log_id, '판정 시각': date(item.timestamp_decided), '사용자': item.user_id, '도메인': item.domain, '탐지 유형': labels[item.detected_type] || item.detected_type, '탐지 건수': item.count, '위험도': item.risk_level, '판정': item.decision, '적용 규칙': item.applied_rule, '진행 상태': item.state, '소명 사유': item.reason ?? '제출된 소명 사유가 없습니다.', '원문 스니펫': '현재 API에서 제공하지 않습니다.', '문서 보안등급': '현재 API에서 제공하지 않습니다.' }).map(([label, value]) => <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: 12, borderBottom: '1px solid #E5E7EB' }}><dt>{label}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{value}</dd></div>)}</dl>}
    <p style={{ color: '#6B7280' }}>현재는 조회만 지원합니다. 승인·거부 처리 API는 제공되지 않습니다.</p>
  </section>
}
