"""
state_machine.py — 상태 기계 & 소명 워크플로우 (명세서 5장)

WARN 판정은 한 번에 끝나지 않고 사용자/담당자 개입에 따라 상태가 바뀐다.
아래 전이만 허용한다 (명세서 5.2):

    NEW  --ALLOW-->  ALLOWED           (종료)
    NEW  --BLOCK-->  BLOCKED           (종료)
    NEW  --WARN -->  WARNED
    WARNED         --사유 입력-->      PENDING_REVIEW
    WARNED         --타임아웃-->        BLOCKED   (안전 우선)
    PENDING_REVIEW --승인-->            APPROVED  (통과)
    PENDING_REVIEW --거부-->            DENIED    (차단)

HOLD 판정(입력 무효)은 정규 흐름 밖에서 HELD 상태로 기록한다(명세서 8장).
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Optional

from models import (
    Detection, JudgeResult, Decision, State, DecisionOutput,
)
from audit import AuditLog, now_iso


@dataclass
class Case:
    """소명 절차를 포함해 사건 1건의 현재 상태를 보관 (명세서 5.4)"""
    det: Detection
    result: JudgeResult
    state: State
    reason: Optional[str] = None
    reviewer: Optional[str] = None
    updated_at: str = ""


def make_output(case: Case) -> DecisionOutput:
    """판단 → 시각화 전달 형식 생성 (명세서 6장)"""
    return DecisionOutput(
        log_id=case.det.log_id,
        timestamp_decided=case.updated_at or now_iso(),
        user_id=case.det.user_id,
        domain=case.det.domain,
        detected_type=case.det.detected_type.value,
        count=case.det.count,
        risk_level=case.det.risk_level.value,
        decision=case.result.decision.value,
        applied_rule=case.result.applied_rule.value,
        state=case.state.value,
        reason=case.reason,
    )


class CaseStore:
    """사건 저장소 (명세서 5.4의 cases 딕셔너리)"""

    def __init__(self, audit: AuditLog):
        self.cases: Dict[str, Case] = {}
        self.audit = audit

    # --- NEW → ALLOWED / BLOCKED / WARNED  (기록 시점 ①) --------------------
    def open_case(self, det: Detection, result: JudgeResult) -> Case:
        # 멱등 처리: 동일 log_id 중복 수신 시 최초 1건만 (명세서 8장)
        if det.log_id in self.cases:
            print(f"  [state] 중복 log_id={det.log_id} → 무시(멱등)")
            return self.cases[det.log_id]

        decision = result.decision
        if decision == Decision.ALLOW:
            state = State.ALLOWED
        elif decision == Decision.BLOCK:
            state = State.BLOCKED
        elif decision == Decision.WARN:
            state = State.WARNED
        elif decision == Decision.HOLD:
            state = State.HELD  # 정규 흐름 밖, 사람 확인 대기
        else:
            state = State.NEW

        case = Case(det=det, result=result, state=state, updated_at=now_iso())
        self.cases[det.log_id] = case
        self.audit.record(det, result, final_state=state.value)
        return case

    # --- WARNED → PENDING_REVIEW  (기록 시점 ②) ----------------------------
    def submit_reason(self, log_id: str, reason: str) -> Case:
        case = self._require(log_id)
        if case.state != State.WARNED:
            raise ValueError(f"소명 사유 입력은 WARNED에서만 가능. 현재={case.state.value}")
        case.reason = reason
        case.state = State.PENDING_REVIEW
        case.updated_at = now_iso()
        self.audit.record(case.det, case.result,
                          final_state=case.state.value, reason=reason)
        return case

    # --- WARNED → BLOCKED (타임아웃)  ---------------------------------------
    def timeout(self, log_id: str) -> Case:
        case = self._require(log_id)
        if case.state != State.WARNED:
            raise ValueError(f"타임아웃은 WARNED에서만 가능. 현재={case.state.value}")
        case.state = State.BLOCKED
        case.updated_at = now_iso()
        self.audit.record(case.det, case.result,
                          final_state=case.state.value,
                          reason="소명 미이행(타임아웃) → 자동 차단")
        return case

    # --- PENDING_REVIEW → APPROVED / DENIED  (기록 시점 ③) -----------------
    def review(self, log_id: str, approved: bool, reviewer: str) -> Case:
        case = self._require(log_id)
        if case.state != State.PENDING_REVIEW:
            raise ValueError(f"검토는 PENDING_REVIEW에서만 가능. 현재={case.state.value}")
        case.state = State.APPROVED if approved else State.DENIED
        case.reviewer = reviewer
        case.updated_at = now_iso()
        self.audit.record(case.det, case.result,
                          final_state=case.state.value,
                          reason=case.reason, reviewer=reviewer)
        return case

    def _require(self, log_id: str) -> Case:
        if log_id not in self.cases:
            raise KeyError(f"존재하지 않는 case: {log_id}")
        return self.cases[log_id]
