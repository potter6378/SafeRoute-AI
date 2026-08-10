"""
fake_traffic.py — 가짜 트래픽 생성기

게이트웨이 인프라가 아직 없어도, 다양한 탐지 시나리오를 텍스트로
시뮬레이션해 탐지 → 판단 전체 파이프라인을 단독으로 데모할 수 있다.
(판단 파트가 fake_data.py로 먼저 검증했던 것과 같은 전략.)
"""
from __future__ import annotations
from typing import List

from session_models import TrafficSession


def make_fake_traffic() -> List[TrafficSession]:
    return [
        # 1) 무해한 일반 대화 → 탐지 없음 → ETC/count=0
        TrafficSession(
            session_id="sess_0001", user_id="emp_0101", domain="chatgpt.com",
            timestamp="2026-08-10T09:00:00+09:00",
            text="오늘 회의록 요약해줘. 특별한 내용은 없어.",
        ),

        # 2) API 키 유출 → API_KEY
        TrafficSession(
            session_id="sess_0002", user_id="emp_0417", domain="chatgpt.com",
            timestamp="2026-08-10T09:12:33+09:00",
            text="이 코드 왜 안돼? OPENAI_API_KEY=sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456",
        ),

        # 3) 대량 개인정보 → PERSONAL_INFO, Critical 격상 확인용
        TrafficSession(
            session_id="sess_0003", user_id="emp_0222", domain="claude.ai",
            timestamp="2026-08-10T09:20:10+09:00",
            text=(
                "고객 명단 정리 좀 도와줘: "
                "김철수 901212-1234567, 010-1234-5678 / "
                "이영희 950505-2345678, 010-9876-5432 / "
                "박민수 880101-1234567, 010-1111-2222 / "
                "최지우 920707-2456789, 010-3333-4444 / "
                "정다은 990909-2567890, 010-5555-6666"
            ),
        ),

        # 4) 협력사 도메인(화이트리스트) — 탐지 자체는 그대로 올라감(판단이 알아서 ALLOW 처리)
        TrafficSession(
            session_id="sess_0004", user_id="emp_0333", domain="partner.com",
            timestamp="2026-08-10T09:31:45+09:00",
            text="```python\ndef connect():\n    return db.connect()\n```",
        ),

        # 5) 공개 문서 태그 → classification_tag=PUBLIC (임계치 무시하고 ALLOW 되어야 함)
        TrafficSession(
            session_id="sess_0005", user_id="emp_0444", domain="chatgpt.com",
            timestamp="2026-08-10T09:40:02+09:00",
            text="이 보도자료 초안 다듬어줘. " * 5 + " 대외비 아님, 배포용.",
            classification_tag="PUBLIC",
        ),

        # 6) 기밀 태그 — 최우선 차단 확인용
        TrafficSession(
            session_id="sess_0006", user_id="emp_0417", domain="chatgpt.com",
            timestamp="2026-08-10T09:52:19+09:00",
            text="[대외비] 이번 분기 신제품 소스코드 리뷰해줘.\n```python\ndef secret_algo(): pass\n```",
            classification_tag="CONFIDENTIAL",
        ),

        # 7) 자격증명 유출 → CREDENTIAL, 소량 → WARN 예상
        TrafficSession(
            session_id="sess_0007", user_id="emp_0666", domain="gemini.google.com",
            timestamp="2026-08-10T10:11:41+09:00",
            text="DB 접속이 안 돼. password: hunter2 로 시도했는데 안 됨",
        ),

        # 8) 재무 정보 — 카드번호 패턴
        TrafficSession(
            session_id="sess_0008", user_id="emp_0777", domain="chatgpt.com",
            timestamp="2026-08-10T10:20:05+09:00",
            text="법인카드 4111 1111 1111 1234 로 결제된 내역 정산 도와줘",
        ),

        # 9) 여러 유형이 한 세션에 동시 발생 (이벤트 여러 건 생성 확인용)
        TrafficSession(
            session_id="sess_0009", user_id="emp_0888", domain="chatgpt.com",
            timestamp="2026-08-10T10:33:27+09:00",
            text=(
                "설정 파일 디버깅해줘:\n"
                "api_key: sk-abcdefghijklmnopqrstuvwx\n"
                "password: supersecret123\n"
                "```yaml\napiVersion: v1\n```"
            ),
        ),

        # 10) 사내 IP 대역(화이트리스트) — 소스코드 유형
        TrafficSession(
            session_id="sess_0010", user_id="emp_0999", domain="10.0.3.11",
            timestamp="2026-08-10T10:44:12+09:00",
            text="import os\nclass Config:\n    pass",
        ),
    ]
