# SafeRoute 탐지 엔진 (탐지 계층) + 브릿지 + 데몬

명세서 『SafeRoute AI 정책 엔진(판단 계층) 상세 명세서』 3장(입력 스키마)을
탐지 쪽에서 채워 넣는 파트. **판단 파트(`saferoute_policy/`) 코드는 한 줄도 수정하지 않았다** —
`bridge.py`에서 import만 해서 연결한다.

## 실행

```bash
python tests.py              # 단위 + 통합 테스트 12건 — 먼저 이걸로 검증
python main.py                # 탐지 → 판단 전체 파이프라인 데모 (가짜 데이터)
python main.py --detect-only  # 탐지 결과만 (판단 엔진 연결 안 함)
python daemon.py               # 실제 서비스용 상시 프로세스 (Flask, 5000번 포트)
```

의존성: `daemon.py`를 쓰려면 `pip install -r requirements.txt` (Flask). 그 외 코드는
표준 라이브러리만 사용. Python 3.10+.
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
| `main.py` | 데모 진입점 (가짜 데이터) |
| `daemon.py` | **실서비스 진입점.** Flask 상시 프로세스, HTTPD가 이걸 리버스 프록시로 호출 |
| `saferoute-detection.service` | daemon.py를 systemd 서비스로 등록하는 유닛 파일 |
| `httpd-saferoute.conf` | Apache가 80번 포트 요청을 daemon.py(5000번)로 넘기는 설정 예시 |
| `requirements.txt` | daemon.py 실행에 필요한 패키지 (`flask`) |
| `tests.py` | 패턴/마스킹/스키마/통합 테스트 |

## 데이터 흐름

**가짜 데이터 데모** (`main.py`):
```
가짜 트래픽 → scanner(정규식 매칭) → emitter(스키마 조립) → bridge(판단 엔진 제출)
                                                          → validator → adapter → judge → state_machine → audit
```

**실서비스** (`daemon.py`):
```
직원 PC → HTTPD(80) → 리버스 프록시 → daemon.py(5000, Flask)
        → POST /detect: scanner/emitter → bridge → 판단 엔진 → 감사 로그(메모리)
        → GET  /api/cases, /api/cases/{id}, /api/stats/summary : 대시보드 조회용
```

## API (daemon.py) — 대시보드/프론트엔드 연동용

| 메서드 | 경로 | 용도 |
|---|---|---|
| POST | `/detect` | 트래픽 1건 제출 (게이트웨이 → 탐지 엔진) |
| GET | `/api/cases` | 판정 로그 목록 (필터: `decision`, `risk_level`, `domain`, `limit`, `offset`) |
| GET | `/api/cases/{log_id}` | 로그 단건 상세 |
| GET | `/api/stats/summary` | 대시보드 통계 요약 (결정/위험도/유형별 집계, 상위 도메인) |
| GET | `/health` | 데몬 생사 확인 |

응답 필드는 `saferoute_policy`의 `make_output()`(명세서 6장 "판단→시각화 전달 형식")을
그대로 따른다 — 이 API가 필드를 임의로 재정의하지 않는다. 자세한 요청/응답 예시는
민주님께 별도로 드린 API 명세서 참고.

**알려진 제한사항**: `make_output()`이 반환하는 필드에는 `raw_snippet`, `classification_tag`가
빠져있다. 대시보드에서 마스킹된 원문 스니펫이나 문서 보안등급을 보여줘야 한다면
이혜령님과 상의해서 `DecisionOutput`(saferoute_policy/models.py)에 필드를 추가해야 한다.

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
- **`daemon.py`는 127.0.0.1에만 바인딩한다.** 외부에서 5000번 포트로 직접 못 들어오게
  막고, 반드시 HTTPD(80번)를 거치도록 강제하기 위한 보안 경계다.

## 한계 (다음 개선 과제)

- 정규식 기반 규칙 탐지다. 실서비스에서는 엔트로피 기반 시크릿 스캐너(예: 고엔트로피 문자열
  탐지), 개인정보 NER 모델 등으로 정밀도를 높여야 오탐/누락이 줄어든다.
- 패킷 캡처·TLS 복호화는 범위 밖(게이트웨이/공통 인프라)이며, `TrafficSession.text`가
  이미 복호화된 페이로드로 들어온다고 가정한다.
- **`CaseStore`가 프로세스 메모리에만 있다.** 데몬이 재시작되면 그동안의 판정 기록이
  전부 사라진다. 실 운영 전에는 SQLite 등 파일 기반 저장소로 바꿔야 한다.
- Flask 개발 서버는 프로덕션용이 아니다(실행 시 경고 출력됨). 트래픽이 늘어나면
  `gunicorn` 같은 프로덕션 WSGI 서버로 교체 필요.
- 대량 트래픽 처리 성능(정규식 컴파일 캐싱은 이미 돼 있지만, 초당 처리량 벤치마크는 안 함)은
  통합 단계에서 별도로 검증 필요.

