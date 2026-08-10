# SafeRoute 탐지 엔진 (탐지 계층) + 브릿지

명세서 『SafeRoute AI 정책 엔진(판단 계층) 상세 명세서』 3장(입력 스키마)을
탐지 쪽에서 채워 넣는 파트. **판단 파트(`saferoute_policy/`) 코드는 한 줄도 수정하지 않았다** —
`bridge.py`에서 import만 해서 연결한다.

## 실행

```bash
python tests.py              # 단위 + 통합 테스트 12건 — 먼저 이걸로 검증
python main.py                # 탐지 → 판단 전체 파이프라인 데모
python main.py --detect-only  # 탐지 결과만 (판단 엔진 연결 안 함)
```

의존성 없음(표준 라이브러리만). Python 3.10+.
`saferoute_policy/`와 같은 부모 디렉토리 아래에 있어야 브릿지가 동작한다(형제 폴더 구조 가정).

## 파일 구조

| 파일 | 역할 |
|---|---|
| `patterns.py` | 탐지 유형별 정규식 (API_KEY·CREDENTIAL·PERSONAL_INFO·FINANCIAL·SOURCE_CODE·INTERNAL_DOC) |
| `scanner.py` | 텍스트 1건 → 유형별 매치 리스트 |
| `masking.py` | `raw_snippet` 마스킹 (원문 절대 밖으로 안 나감) |
| `risk.py` / `detect_config.py` | 유형·건수 기반 `risk_level` 산정 |
| `session_models.py` | `TrafficSession` (게이트웨이가 넘겨준 트래픽 1건) |
| `emitter.py` | 스캔 결과 → 판단 엔진 입력 스키마(명세서 3.1) dict 조립 |
| `bridge.py` | 판단 엔진(`saferoute_policy`) import 후 이벤트 제출 |
| `fake_traffic.py` | 가짜 트래픽 10건 (다양한 탐지·판정 경로 커버) |
| `main.py` | 데모 진입점 |
| `tests.py` | 패턴/마스킹/스키마/통합 테스트 |

## 데이터 흐름

```
가짜 트래픽 → scanner(정규식 매칭) → emitter(스키마 조립) → bridge(판단 엔진 제출)
                                                          → validator → adapter → judge → state_machine → audit
```

## 설계 원칙

- **탐지는 판정을 절대 하지 않는다.** ALLOW/WARN/BLOCK 임계치나 화이트리스트는 전부
  `saferoute_policy` 소관. 탐지는 `detected_type` / `count` / `risk_level` /
  `raw_snippet`(마스킹된)만 책임진다.
- **모듈명 충돌 주의**: `saferoute_policy`에도 `config.py`, `models.py`가 있다.
  같은 프로세스에서 두 파트를 함께 import하면(`bridge.py`처럼) 이름이 겹치는 모듈은
  `sys.modules` 캐시 충돌이 나서 엉뚱한 모듈이 로드된다. 그래서 탐지 쪽은
  `detect_config.py`, `session_models.py`로 이름을 분리했다. 앞으로 새 파일 추가할 때도
  판단 파트 파일명과 겹치지 않는지 확인할 것.
- **classification_tag**는 세션에 있으면 그대로 전달하고, 없으면 `None`으로 둔다
  (판단 엔진 adapter가 `None`을 "태그 없음"으로 정상 처리하도록 이미 구현돼 있음).

## 한계 (데모 수준)

- 정규식 기반 규칙 탐지다. 실서비스에서는 엔트로피 기반 시크릿 스캐너(예: 고엔트로피 문자열
  탐지), 개인정보 NER 모델 등으로 정밀도를 높여야 오탐/누락이 줄어든다.
- 패킷 캡처·TLS 복호화는 범위 밖(게이트웨이/공통 인프라)이며, `TrafficSession.text`가
  이미 복호화된 페이로드로 들어온다고 가정한다.
- `bridge.py`는 지금 같은 프로세스 내 함수 호출로 연결돼 있다. 실서비스에서 탐지·판단이
  별도 서비스로 분리되면(REST API, 메시지 큐 등) 이 파일만 바꾸면 되고, `scanner`/`emitter`는
  손댈 필요 없다.
- 대량 트래픽 처리 성능(정규식 컴파일 캐싱은 이미 돼 있지만, 초당 처리량 벤치마크는 안 함)은
  통합 단계에서 별도로 검증 필요.
