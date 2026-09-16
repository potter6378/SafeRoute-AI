"""
tests.py — 탐지 파트 테스트

1) 패턴/마스킹 단위 테스트
2) emitter 스키마 정합성 테스트 (판단 엔진 validator를 실제로 통과하는지까지 확인)
3) 탐지 → 판단 통합 테스트 (bridge를 통해 실제 판정까지 확인)

실행: python tests.py
"""
from __future__ import annotations

from scanner import scan_text
from masking import mask_snippet
from risk import risk_level
from emitter import build_detection_events
from session_models import TrafficSession


def check(tc, cond, detail):
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {tc}: {detail}")
    return cond


def main() -> bool:
    print("=" * 68)
    print("  탐지 파트 테스트")
    print("=" * 68)
    results = []

    # --- 1) 패턴 탐지 ---
    found = scan_text("OPENAI_API_KEY=sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456")
    results.append(check("PATTERN-01", "API_KEY" in found, f"API 키 탐지 → {list(found)}"))

    found = scan_text("주민번호는 901212-1234567 입니다")
    results.append(check("PATTERN-02", "PERSONAL_INFO" in found, f"주민번호 탐지 → {list(found)}"))

    found = scan_text("password: hunter2")
    results.append(check("PATTERN-03", "CREDENTIAL" in found, f"자격증명 탐지 → {list(found)}"))

    found = scan_text("오늘 날씨 어때?")
    results.append(check("PATTERN-04", found == {}, f"무해한 텍스트 → {found}"))

    # --- 2) 마스킹 ---
    masked = mask_snippet("API_KEY", "sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456")
    results.append(check("MASK-01", "AbCdEfGhIjKlMnOpQrStUvWxYz" not in masked,
                         f"API 키 마스킹 → {masked!r}"))

    masked = mask_snippet("PERSONAL_INFO", "901212-1234567")
    results.append(check("MASK-02", masked == "901212-*******", f"주민번호 마스킹 → {masked!r}"))

    # --- 3) 위험도 격상 ---
    results.append(check("RISK-01", risk_level("API_KEY", 1) == "High",
                         "API_KEY count=1 → High"))
    results.append(check("RISK-02", risk_level("API_KEY", 5) == "Critical",
                         "API_KEY count=5 → Critical(격상)"))

    # --- 4) emitter 스키마 정합성 (판단 엔진 validator 실제로 통과하는지) ---
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "saferoute_policy"))
    from validator import is_valid  # noqa: E402

    session = TrafficSession(
        session_id="s1", user_id="emp_0001", domain="chatgpt.com",
        timestamp="2026-08-10T09:00:00+09:00",
        text="OPENAI_API_KEY=sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz123456",
    )
    events = build_detection_events(session)
    all_valid = all(is_valid(e)[0] for e in events)
    results.append(check("SCHEMA-01", all_valid,
                         f"탐지 이벤트 {len(events)}건이 판단 엔진 validator 통과"))

    empty_session = TrafficSession(
        session_id="s2", user_id="emp_0002", domain="chatgpt.com",
        timestamp="2026-08-10T09:00:00+09:00", text="안녕하세요",
    )
    empty_events = build_detection_events(empty_session)
    results.append(check("SCHEMA-02",
                         len(empty_events) == 1 and empty_events[0]["detected_type"] == "ETC",
                         f"무해 텍스트 → ETC/count=0 이벤트 1건 → {empty_events}"))

    # --- 5) 탐지 → 판단 통합 (bridge) ---
    from bridge import submit_to_policy, CaseStore, AuditLog

    audit = AuditLog()
    store = CaseStore(audit)
    case = submit_to_policy(events[0], store)
    results.append(check("INTEGRATION-01", case.result.decision.value in ("WARN", "BLOCK", "ALLOW"),
                         f"API_KEY 탐지 → 판단 엔진 판정: {case.result.decision.value}"))

    confidential_session = TrafficSession(
        session_id="s3", user_id="emp_0003", domain="chatgpt.com",
        timestamp="2026-08-10T09:00:00+09:00",
        text="[대외비] 소스코드입니다", classification_tag="CONFIDENTIAL",
    )
    conf_events = build_detection_events(confidential_session)
    conf_case = submit_to_policy(conf_events[0], store)
    results.append(check("INTEGRATION-02", conf_case.result.decision.value == "BLOCK",
                         f"CONFIDENTIAL 태그 → {conf_case.result.decision.value} (BLOCK 기대)"))

    print("-" * 68)
    passed = sum(results)
    total = len(results)
    print(f"  결과: {passed}/{total} 통과")
    print("=" * 68)
    return passed == total


if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
