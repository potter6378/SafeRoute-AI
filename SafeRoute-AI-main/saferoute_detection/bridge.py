"""
bridge.py — 탐지 ↔ 판단 브릿지

saferoute_policy 쪽 파일은 절대 수정하지 않는다. main.py의 process_one()과
동일한 로직(검증 → 변환 → 판정 → 사건 등록)을 여기서 재현해,
emitter.py가 만든 dict를 그대로 판단 엔진에 태운다.

지금은 두 파트가 같은 레포/같은 프로세스에 있다고 가정하고 함수 호출로
직접 연결한다. 나중에 실서비스에서 프로세스가 분리되면(REST API, 메시지 큐 등)
이 파일 하나만 바꾸면 된다 — scanner/emitter는 손댈 필요 없음(느슨한 결합).
"""
from __future__ import annotations
import sys
from pathlib import Path
from typing import List

# saferoute_policy를 형제 디렉토리에서 import
_POLICY_DIR = Path(__file__).resolve().parent.parent / "saferoute_policy"
if str(_POLICY_DIR) not in sys.path:
    sys.path.insert(0, str(_POLICY_DIR))

from validator import is_valid                      # noqa: E402
from adapter import to_internal                      # noqa: E402
from judge import judge                               # noqa: E402
from audit import AuditLog                             # noqa: E402
from state_machine import CaseStore, make_output, Case   # noqa: E402
from models import (                                      # noqa: E402
    Detection, DetectedType, RiskLevel, Decision,
    JudgeResult, AppliedRule,
)


def submit_to_policy(raw: dict, store: CaseStore) -> Case:
    """
    탐지 이벤트 dict 1건을 판단 엔진에 제출한다.
    saferoute_policy/main.py의 process_one()과 동일한 흐름
    (print만 빠짐 — 출력은 호출부 책임).
    """
    ok, reason = is_valid(raw)
    if not ok:
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
    return case


def submit_many(events: List[dict], store: CaseStore) -> List[Case]:
    return [submit_to_policy(e, store) for e in events]
