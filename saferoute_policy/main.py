"""
main.py — SafeRoute 정책 엔진 데모 진입점

전체 파이프라인:
    가짜 로그 → [validator] → [adapter] → [judge] → [state_machine] → [audit] → 출력

실행:
    python main.py            # 실행 시 모드 선택 (자동 / 대화형)
    python main.py --auto     # 자동 시나리오 (승인·거부·타임아웃 다 자동 재현)
    python main.py --interactive   # 소명 대화형 (사유·검토 직접 입력)
"""
from __future__ import annotations
import sys

from fake_data import make_fake_logs
from validator import is_valid
from adapter import to_internal
from judge import judge
from audit import AuditLog
from state_machine import CaseStore, make_output, Case
from models import Decision, State

# 판정별 표시 아이콘
ICON = {"ALLOW": "🟢", "WARN": "🟡", "BLOCK": "🔴", "HOLD": "⚪"}

# 자동 모드에서 WARN 사건별로 재현할 소명 시나리오
AUTO_SCRIPT = {
    "det_0002": ("approve", "협력사 전달용 정상 업무입니다", "보안담당_김"),
    "det_0008": ("approve", "분기 보고용 내부 자료입니다", "보안담당_김"),
    "det_0009": ("deny",    "개인 참고용으로 붙여넣었습니다", "보안담당_이"),
    "det_0010": ("timeout", None, None),
    "det_0012": ("timeout", None, None),
}


def line(char="-", n=70):
    print(char * n)


def print_decision(out) -> None:
    icon = ICON.get(out.decision, "  ")
    print(f"  {icon} {out.log_id} | {out.decision:<5} | rule={out.applied_rule:<16} "
          f"| state={out.state:<14} | {out.detected_type} x{out.count} @ {out.domain}")


def process_one(raw: dict, store: CaseStore) -> Case:
    """로그 1건: 검증 → 변환 → 판정 → 사건 생성. Case 반환."""
    ok, reason = is_valid(raw)
    if not ok:
        # 무효 입력은 HOLD로 기록 (명세서 8장). adapter를 못 태우므로 최소 정보로 처리.
        from models import Detection, DetectedType, RiskLevel, JudgeResult, AppliedRule
        det = Detection(
            log_id=raw.get("log_id", "unknown"),
            timestamp=raw.get("timestamp", ""),
            user_id=raw.get("user_id", "unknown"),
            domain=str(raw.get("domain", "")),
            detected_type=DetectedType.ETC,
            count=raw.get("count", 0) if isinstance(raw.get("count"), int) else 0,
            risk_level=RiskLevel.LOW,
        )
        res = JudgeResult(Decision.HOLD, AppliedRule.INPUT_INVALID)
        print(f"  ⚪ {det.log_id} | HOLD  | 입력 무효: {reason}")
        return store.open_case(det, res)

    det = to_internal(raw)
    res = judge(det)
    case = store.open_case(det, res)
    print_decision(make_output(case))
    return case


def run_auto():
    line("=")
    print("  SafeRoute 정책 엔진 — 자동 데모")
    line("=")
    audit = AuditLog()
    store = CaseStore(audit)

    print("\n[1단계] 판정 (탐지 로그 → 통과/경고/차단)")
    line()
    warned = []
    for raw in make_fake_logs():
        case = process_one(raw, store)
        if case.state == State.WARNED:
            warned.append(case.det.log_id)

    print(f"\n[2단계] 소명 워크플로우 자동 재현  (WARN {len(warned)}건)")
    line()
    for log_id in warned:
        action, reason, reviewer = AUTO_SCRIPT.get(log_id, ("timeout", None, None))
        if action == "timeout":
            store.timeout(log_id)
            print(f"  ⏱  {log_id}: 사유 미입력(타임아웃) → BLOCKED")
        else:
            store.submit_reason(log_id, reason)
            print(f"  ✍  {log_id}: 사유 입력 → PENDING_REVIEW  (\"{reason}\")")
            approved = (action == "approve")
            store.review(log_id, approved=approved, reviewer=reviewer)
            verdict = "APPROVED(통과)" if approved else "DENIED(차단)"
            print(f"  👤 {log_id}: {reviewer} 검토 → {verdict}")

    print("\n[3단계] 최종 상태 요약")
    line()
    for case in store.cases.values():
        print_decision(make_output(case))

    print(f"\n[4단계] 감사 로그  ({len(audit)}건 기록됨)")
    line()
    print(audit.as_json())
    line("=")


def run_interactive():
    line("=")
    print("  SafeRoute 정책 엔진 — 대화형 소명 모드")
    line("=")
    audit = AuditLog()
    store = CaseStore(audit)

    print("\n[1단계] 판정")
    line()
    warned = []
    for raw in make_fake_logs():
        case = process_one(raw, store)
        if case.state == State.WARNED:
            warned.append(case.det.log_id)

    print(f"\n[2단계] 소명 — WARN {len(warned)}건에 대해 직접 처리")
    print("  (사유를 비우고 엔터 → 타임아웃 차단)")
    line()
    for log_id in warned:
        case = store.cases[log_id]
        print(f"\n  ▶ {log_id}  ({case.det.detected_type.value} x{case.det.count} "
              f"@ {case.det.domain}, 위험도 {case.det.risk_level.value})")
        try:
            reason = input("    소명 사유> ").strip()
        except (EOFError, KeyboardInterrupt):
            reason = ""
        if not reason:
            store.timeout(log_id)
            print("    → 미입력 → BLOCKED")
            continue
        store.submit_reason(log_id, reason)
        try:
            verdict = input("    담당자 판단 [a=승인 / d=거부]> ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            verdict = "d"
        reviewer = "보안담당"
        approved = verdict.startswith("a")
        store.review(log_id, approved=approved, reviewer=reviewer)
        print(f"    → {'APPROVED(통과)' if approved else 'DENIED(차단)'}")

    print("\n[3단계] 최종 상태 요약")
    line()
    for case in store.cases.values():
        print_decision(make_output(case))

    print(f"\n[4단계] 감사 로그  ({len(audit)}건)")
    line()
    print(audit.as_json())
    line("=")


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    if arg == "--auto":
        return run_auto()
    if arg in ("--interactive", "-i"):
        return run_interactive()

    # 모드 선택
    print("실행 모드를 선택하세요:")
    print("  1) 자동 데모 (승인·거부·타임아웃 자동 재현)")
    print("  2) 대화형 소명 (사유·검토 직접 입력)")
    try:
        choice = input("선택 [1/2]> ").strip()
    except (EOFError, KeyboardInterrupt):
        choice = "1"
    if choice == "2":
        run_interactive()
    else:
        run_auto()


if __name__ == "__main__":
    main()
