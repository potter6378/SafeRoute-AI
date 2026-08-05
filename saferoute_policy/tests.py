"""
tests.py — 판단 엔진 인수 기준 (명세서 9장, TC-01 ~ TC-10)

가짜 로그로 판단 엔진을 단독 검증한다.
모든 케이스가 기대 판정·적용 규칙과 일치하면 '판단 엔진 1차 완료'로 본다.

실행:  python tests.py
"""
from __future__ import annotations

from validator import is_valid
from adapter import to_internal
from judge import judge
from audit import AuditLog
from state_machine import CaseStore
from models import Decision, AppliedRule, State


def _run_judge(raw: dict):
    """유효성 → 판정. 무효면 HOLD/INPUT_INVALID."""
    ok, _ = is_valid(raw)
    if not ok:
        return Decision.HOLD, AppliedRule.INPUT_INVALID
    r = judge(to_internal(raw))
    return r.decision, r.applied_rule


def base(**over) -> dict:
    d = {"log_id": "tc", "timestamp": "2026-08-05T00:00:00+09:00",
         "user_id": "emp_test", "domain": "chatgpt.com",
         "detected_type": "API_KEY", "count": 1, "risk_level": "High",
         "classification_tag": None, "raw_snippet": "x"}
    d.update(over)
    return d


def check(tc, cond, detail):
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {tc}: {detail}")
    return cond


def main() -> bool:
    print("=" * 68)
    print("  판단 엔진 인수 테스트 (명세서 9장)")
    print("=" * 68)
    results = []

    # --- judge 계층 (TC-01 ~ TC-07) ---
    d, r = _run_judge(base(count=0))
    results.append(check("TC-01", d == Decision.ALLOW and r == AppliedRule.DEFAULT_ALLOW,
                         f"count=0 → {d.value}/{r.value}"))

    d, r = _run_judge(base(count=3, domain="chatgpt.com"))
    results.append(check("TC-02", d == Decision.WARN and r == AppliedRule.THRESHOLD_WARN,
                         f"count=3 일반도메인 → {d.value}/{r.value}"))

    d, r = _run_judge(base(count=15))
    results.append(check("TC-03", d == Decision.BLOCK and r == AppliedRule.THRESHOLD_BLOCK,
                         f"count=15 → {d.value}/{r.value}"))

    d, r = _run_judge(base(domain="partner.com", count=5))
    results.append(check("TC-04", d == Decision.ALLOW and r == AppliedRule.WHITELIST,
                         f"partner.com count=5 → {d.value}/{r.value}"))

    d, r = _run_judge(base(classification_tag="PUBLIC", count=20))
    results.append(check("TC-05", d == Decision.ALLOW and r == AppliedRule.TAG_PUBLIC,
                         f"tag=PUBLIC count=20 → {d.value}/{r.value}"))

    d, r = _run_judge(base(classification_tag="CONFIDENTIAL", count=1))
    results.append(check("TC-06", d == Decision.BLOCK and r == AppliedRule.TAG_CONFIDENTIAL,
                         f"tag=CONFIDENTIAL count=1 → {d.value}/{r.value}"))

    no_count = base()
    no_count.pop("count")
    d, r = _run_judge(no_count)
    results.append(check("TC-07", d == Decision.HOLD and r == AppliedRule.INPUT_INVALID,
                         f"count 누락 → {d.value}/{r.value}"))

    # --- 상태 기계 계층 (TC-08 ~ TC-10) ---
    def fresh_case(log_id):
        audit = AuditLog()
        store = CaseStore(audit)
        raw = base(log_id=log_id, count=3)  # → WARN
        det = to_internal(raw)
        res = judge(det)
        case = store.open_case(det, res)
        return store, case

    store, case = fresh_case("tc08")
    store.submit_reason("tc08", "협력사 전달용 정상 업무")
    store.review("tc08", approved=True, reviewer="보안담당_김")
    results.append(check("TC-08", case.state == State.APPROVED,
                         f"WARN→사유→승인 → {case.state.value}"))

    store, case = fresh_case("tc09")
    store.submit_reason("tc09", "개인 참고용")
    store.review("tc09", approved=False, reviewer="보안담당_김")
    results.append(check("TC-09", case.state == State.DENIED,
                         f"WARN→사유→거부 → {case.state.value}"))

    store, case = fresh_case("tc10")
    store.timeout("tc10")
    results.append(check("TC-10", case.state == State.BLOCKED,
                         f"WARN→타임아웃 → {case.state.value}"))

    print("-" * 68)
    passed = sum(results)
    total = len(results)
    print(f"  결과: {passed}/{total} 통과")
    print("=" * 68)
    return passed == total


if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
