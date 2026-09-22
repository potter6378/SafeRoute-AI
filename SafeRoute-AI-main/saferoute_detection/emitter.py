"""
emitter.py — 탐지 이벤트 조립기

scan_text() 결과를 판단 엔진의 입력 스키마(명세서 3.1)와
정확히 같은 모양의 dict로 변환한다. 판단 파트는 이 dict만 보고 판정하므로
필드명·타입을 여기서 어긋나면 판단 엔진의 validator에서 튕긴다.

한 세션에서 여러 유형이 동시에 걸리면 유형별로 이벤트를 하나씩 만든다
(예: API_KEY 3건 + PERSONAL_INFO 1건 → 이벤트 2개).
아무것도 안 걸리면 count=0 / ETC 이벤트 1건을 만든다(판단 엔진 fake_data.py의
관례와 동일 — 통과 판정을 남기기 위함).
"""
from __future__ import annotations
import itertools
from typing import List

from scanner import scan_text
from masking import mask_snippet
from risk import risk_level
from session_models import TrafficSession

_counter = itertools.count(1)


def _new_log_id(timestamp: str) -> str:
    """det_YYYYMMDD_##### 형식 (명세서 3.1 예시와 동일 규칙)"""
    date_part = timestamp[:10].replace("-", "")
    return f"det_{date_part}_{next(_counter):05d}"


def build_detection_events(session: TrafficSession) -> List[dict]:
    """
    TrafficSession 1건 → 판단 엔진 입력 스키마 dict의 리스트.
    필드 순서/이름은 명세서 3.1을 그대로 따른다.
    """
    findings = scan_text(session.text)

    if not findings:
        return [{
            "log_id": _new_log_id(session.timestamp),
            "timestamp": session.timestamp,
            "user_id": session.user_id,
            "domain": session.domain,
            "detected_type": "ETC",
            "count": 0,
            "risk_level": "Low",
            "classification_tag": session.classification_tag,
            "raw_snippet": "",
        }]

    events = []
    for dtype, matches in findings.items():
        count = len(matches)  # count는 반드시 int (판단 엔진 validator가 엄격 검사)
        snippet = mask_snippet(dtype, matches[0].group())
        events.append({
            "log_id": _new_log_id(session.timestamp),
            "timestamp": session.timestamp,
            "user_id": session.user_id,
            "domain": session.domain,
            "detected_type": dtype,
            "count": int(count),
            "risk_level": risk_level(dtype, count),
            "classification_tag": session.classification_tag,
            "raw_snippet": snippet,
        })
    return events
