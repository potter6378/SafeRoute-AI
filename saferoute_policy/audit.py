"""
audit.py — 감사 로그 (명세서 7장)

모든 판정과 소명 사유를 시간순으로 append 한다.
리스트에 계속 쌓는 수준이며, 시각화(김민주) 대시보드가 그대로 갖다 쓴다.

기록 시점 (명세서 7.3):
  ① 판정이 처음 확정될 때
  ② 사용자가 소명 사유를 입력해 상태가 바뀔 때
  ③ 담당자가 승인/거부해 최종 확정될 때
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import itertools
import json

from models import AuditEntry, Detection, JudgeResult

KST = timezone(timedelta(hours=9))


def now_iso() -> str:
    return datetime.now(KST).replace(microsecond=0).isoformat()


class AuditLog:
    def __init__(self):
        self._entries: List[AuditEntry] = []
        self._counter = itertools.count(1)

    def record(
        self,
        det: Detection,
        result: JudgeResult,
        final_state: str,
        reason: Optional[str] = None,
        reviewer: Optional[str] = None,
    ) -> AuditEntry:
        entry = AuditEntry(
            audit_id=f"aud_{next(self._counter):06d}",
            log_id=det.log_id,
            timestamp=now_iso(),
            user_id=det.user_id,
            domain=det.domain,
            detected_type=det.detected_type.value,
            count=det.count,
            risk_level=det.risk_level.value,
            decision=result.decision.value,
            applied_rule=result.applied_rule.value,
            final_state=final_state,
            reason=reason,
            reviewer=reviewer,
        )
        self._entries.append(entry)
        return entry

    @property
    def entries(self) -> List[AuditEntry]:
        return list(self._entries)

    def as_json(self, indent: int = 2) -> str:
        return json.dumps(
            [e.to_dict() for e in self._entries],
            ensure_ascii=False, indent=indent,
        )

    def __len__(self) -> int:
        return len(self._entries)
