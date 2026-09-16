"""
main.py — 탐지 파트 데모 진입점

전체 파이프라인:
    가짜 트래픽 → [scanner] → [emitter] → (탐지 이벤트 dict) → [bridge] → 판단 엔진 → 판정 출력

실행:
    python main.py            # 탐지 결과 + 판단 결과 함께 출력
    python main.py --detect-only   # 탐지 결과만 출력 (판단 엔진 연결 안 함)
"""
from __future__ import annotations
import json
import sys

from fake_traffic import make_fake_traffic
from emitter import build_detection_events

ICON = {"ALLOW": "🟢", "WARN": "🟡", "BLOCK": "🔴", "HOLD": "⚪"}


def line(char="-", n=70):
    print(char * n)


def run_detect_only():
    line("=")
    print("  SafeRoute 탐지 엔진 — 단독 데모 (판단 엔진 연결 없음)")
    line("=")
    for session in make_fake_traffic():
        events = build_detection_events(session)
        print(f"\n[{session.session_id}] {session.user_id} @ {session.domain}")
        for e in events:
            print(f"  → {e['detected_type']:<14} count={e['count']:<3} "
                  f"risk={e['risk_level']:<8} snippet={e['raw_snippet']!r}")
    line("=")


def run_full_pipeline():
    from bridge import submit_to_policy, CaseStore, AuditLog, make_output

    line("=")
    print("  SafeRoute 탐지 → 판단 통합 데모")
    line("=")
    audit = AuditLog()
    store = CaseStore(audit)

    all_events = []
    print("\n[1단계] 탐지 (트래픽 → 탐지 이벤트)")
    line()
    for session in make_fake_traffic():
        events = build_detection_events(session)
        all_events.extend(events)
        for e in events:
            print(f"  🔍 {e['log_id']} | {e['detected_type']:<14} count={e['count']:<3} "
                  f"risk={e['risk_level']:<8} @ {e['domain']} | snippet={e['raw_snippet']!r}")

    print(f"\n[2단계] 판단 (탐지 이벤트 {len(all_events)}건 → 판정)")
    line()
    for raw in all_events:
        case = submit_to_policy(raw, store)
        out = make_output(case)
        icon = ICON.get(out.decision, "  ")
        print(f"  {icon} {out.log_id} | {out.decision:<5} | rule={out.applied_rule:<16} "
              f"| state={out.state:<14}")

    print(f"\n[3단계] 감사 로그 ({len(audit)}건)")
    line()
    print(audit.as_json())
    line("=")


def main():
    if "--detect-only" in sys.argv:
        run_detect_only()
    else:
        run_full_pipeline()


if __name__ == "__main__":
    main()
