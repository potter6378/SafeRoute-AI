# SafeRoute AI 백엔드 API 명세서 (대시보드 연동용)

**작성**: 박혜린 (탐지 파트) · **대상**: 김민주 (대시보드) · **날짜**: 2026-09-19
**서버 주소**: `http://<라즈베리파이_IP>/api/...` (HTTPD가 80번 포트에서 받아서 내부적으로 전달합니다)

---

## 요약

지금까지 백엔드에 **조회용 API가 아예 없어서** 프론트 연동이 안 됐던 것으로 확인됐습니다.
아래 3개를 새로 만들었습니다. 대시보드에서 필요한 화면과 1:1로 매칭해뒀어요.

| 화면 | 쓸 API |
|---|---|
| 판정 로그 목록 / 실시간 알림 | `GET /api/cases` |
| 로그 상세보기 | `GET /api/cases/{log_id}` |
| 통계 요약 (차트) | `GET /api/stats/summary` |

---

## 1. `GET /api/cases` — 판정 로그 목록

### 요청

```
GET /api/cases
GET /api/cases?decision=WARN
GET /api/cases?risk_level=High&domain=chatgpt.com
GET /api/cases?limit=20&offset=0
```

**쿼리 파라미터 (전부 선택사항)**

| 이름 | 값 | 설명 |
|---|---|---|
| `decision` | `ALLOW` / `WARN` / `BLOCK` / `HOLD` | 이 판정 결과만 필터 |
| `risk_level` | `Low` / `Medium` / `High` / `Critical` | 이 위험도만 필터 |
| `domain` | 예: `chatgpt.com` | 이 도메인만 필터 |
| `limit` | 숫자 (기본 50) | 한 번에 가져올 개수 |
| `offset` | 숫자 (기본 0) | 페이지네이션 시작 위치 |

### 응답 (200)

```json
{
  "total": 3,
  "items": [
    {
      "log_id": "det_20260916_00001",
      "timestamp_decided": "2026-09-19T16:54:43+09:00",
      "user_id": "emp_01",
      "domain": "chatgpt.com",
      "detected_type": "API_KEY",
      "count": 1,
      "risk_level": "High",
      "decision": "WARN",
      "applied_rule": "THRESHOLD_WARN",
      "state": "WARNED",
      "reason": null
    }
  ]
}
```

**필드 설명**

| 필드 | 타입 | 의미 |
|---|---|---|
| `log_id` | string | 로그 고유 ID |
| `timestamp_decided` | string (ISO 8601) | 판정이 내려진 시각 |
| `user_id` | string | 직원 ID (익명화됨, 예: `emp_01`) |
| `domain` | string | 접속한 AI 서비스 도메인 |
| `detected_type` | string | `API_KEY` / `CREDENTIAL` / `PERSONAL_INFO` / `FINANCIAL` / `SOURCE_CODE` / `INTERNAL_DOC` / `ETC` |
| `count` | int | 해당 유형이 몇 건 걸렸는지 |
| `risk_level` | string | `Low` / `Medium` / `High` / `Critical` |
| `decision` | string | `ALLOW` / `WARN` / `BLOCK` / `HOLD` |
| `applied_rule` | string | 어떤 규칙으로 판정했는지 (예: `THRESHOLD_WARN`, `WHITELIST`, `TAG_CONFIDENTIAL`) |
| `state` | string | 사건 진행 상태 (`ALLOWED`/`BLOCKED`/`WARNED`/`APPROVED`/`DENIED` 등) |
| `reason` | string 또는 null | WARN 상태일 때 사용자가 입력한 소명 사유 (아직 없으면 null) |

목록은 **최신순으로 정렬**되어 내려갑니다.

---

## 2. `GET /api/cases/{log_id}` — 로그 단건 상세

### 요청
```
GET /api/cases/det_20260916_00001
```

### 응답 (200)
`/api/cases`의 `items` 안에 있는 객체 하나와 **완전히 동일한 형태**입니다.

### 응답 (404) — 존재하지 않는 log_id
```json
{ "error": "not found" }
```

---

## 3. `GET /api/stats/summary` — 통계 요약 (차트용)

### 요청
```
GET /api/stats/summary
```

### 응답 (200)
```json
{
  "total_cases": 3,
  "by_decision": { "ALLOW": 1, "WARN": 2 },
  "by_risk_level": { "High": 2, "Low": 1 },
  "by_detected_type": { "API_KEY": 1, "PERSONAL_INFO": 1, "ETC": 1 },
  "top_domains": [
    { "domain": "chatgpt.com", "count": 2 },
    { "domain": "claude.ai", "count": 1 }
  ]
}
```

`by_decision`, `by_risk_level`, `by_detected_type`은 그대로 파이차트/막대그래프에 넣으시면 됩니다.
`top_domains`는 접속량 상위 5개 도메인입니다.

---

## ⚠️ 지금 당장은 없는 필드 (필요하면 말씀해주세요)

- **`raw_snippet`** (마스킹된 원문 일부, 예: `sk-proj****...****3456`) — 지금 응답에 없습니다. 로그 상세보기에서 "뭐가 걸렸는지 미리보기"를 보여주고 싶으시면 알려주세요. 이혜령님과 상의해서 추가하겠습니다.
- **`classification_tag`** (문서 보안등급: `PUBLIC`/`CONFIDENTIAL`) — 이것도 현재 응답에 없습니다. 필요하시면 말씀해주세요.

이 두 개는 판단 엔진 쪽(`이혜령님 코드`)의 출력 형식에 원래 없던 필드라, 추가하려면 그쪽과 같이 협의해야 합니다. 급하시면 먼저 말씀 주세요.

---

## 참고사항

- 지금은 서버가 재시작되면 그동안 쌓인 로그가 사라집니다 (메모리에만 저장 중). 대시보드 테스트 중에 데이터가 갑자기 없어지면 이것 때문일 가능성이 큽니다 — 서버가 재시작됐는지 먼저 확인해주세요.
- 트래픽이 하나도 안 들어온 상태에서 `/api/cases`를 호출하면 `{"total": 0, "items": []}`가 정상 응답입니다. 에러 아닙니다.
- CORS 설정은 아직 안 해뒀습니다. 대시보드를 다른 포트/도메인에서 띄워서 호출하다가 브라우저가 막으면 알려주세요.
