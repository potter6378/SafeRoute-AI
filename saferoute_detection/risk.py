"""
risk.py — risk_level 산정 (명세서 3.2: Low/Medium/High/Critical)

탐지 유형별 기본 위험도에서, 같은 유형이 일정 건수 이상 몰리면
Critical로 격상한다. 기준값은 판단 파트 임계치(count 자체)와는 별개로,
탐지 파트가 자체적으로 갖는 값이라 config.py에서 분리 관리한다.
"""
from __future__ import annotations

from detect_config import BASE_RISK, CRITICAL_ESCALATION


def risk_level(detected_type: str, count: int) -> str:
    base = BASE_RISK.get(detected_type, "Low")
    threshold = CRITICAL_ESCALATION.get(detected_type)
    if threshold is not None and count >= threshold:
        return "Critical"
    return base
