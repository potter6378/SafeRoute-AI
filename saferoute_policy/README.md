# SafeRoute 정책 엔진 (판단 계층)

명세서 『SafeRoute AI 정책 엔진(판단 계층) 상세 명세서』를 그대로 구현한 것.
탐지·시각화 파트가 아직 없어도 **가짜 로그로 단독 실행**된다.

## 실행

```bash
python tests.py          # 인수 테스트 10건 (명세서 9장) — 먼저 이걸로 검증
python main.py           # 실행 시 모드 선택
python main.py --auto    # 자동 데모 (승인·거부·타임아웃 자동 재현)
python main.py -i        # 대화형 소명 (사유·검토 직접 입력)
```

의존성 없음(표준 라이브러리만). Python 3.10+.

## 파일 구조 (모듈 분리)

| 파일 | 역할 | 명세서 |
|---|---|---|
| `config.py` | 임계치·화이트리스트·타임아웃 등 정책값 | 4.1 / 부록 A |
| `models.py` | 데이터 모델 · enum (Detection/판정/상태/로그) | 3·4·5·6·7장 |
| `fake_data.py` | 가짜 탐지 로그 생성기 | 착수 전략 |
| `validator.py` | 입력 유효성 검증 `is_valid()` | 3.3 |
| `adapter.py` | 경계 어댑터: 탐지 dict → 내부 모델 | 2.2 |
| `judge.py` | 판단 규칙 엔진 `judge()` (우선순위 핵심) | 4장 |
| `state_machine.py` | 상태 기계 + 소명 워크플로우 | 5장 |
| `audit.py` | 감사 로그 | 7장 |
| `tests.py` | 인수 테스트 TC-01~10 | 9장 |
| `main.py` | 데모 진입점 (자동 + 대화형) | — |

## 데이터 흐름

```
가짜로그 → validator → adapter → judge → state_machine → audit → 출력(시각화용)
```

## 팀 연동 시 바꾸는 곳 (혼자 개발 → 통합 전환)

- **박혜린(탐지) 형식이 확정되면** → `adapter.py`만 수정. judge·상태 기계는 그대로.
- **정책값 확정되면(임계치·화이트리스트·타임아웃)** → `config.py`만 수정.
- **김민주(시각화) 연동** → `state_machine.make_output()`이 만드는 dict(6장)와
  `audit.as_json()`(7장)을 그대로 전달.

## 미확정 항목 (명세서 부록 A)

`config.py` 상단 상수와 `judge.py`의 우선순위 순서가 회의 결정 대상.
특히 **기밀 태그 vs 화이트리스트 충돌**은 현재 '태그(차단) 우선'으로 구현돼 있음.
