"""
adapter.py — 경계 어댑터 (명세서 2.2 설계 원칙)

탐지 엔진의 원본 dict을 내부 표준 모델(Detection)로 변환한다.
이 한 겹 덕분에 나중에 박혜린 파트의 형식이 바뀌어도
judge()·상태 기계는 손대지 않고 이 파일만 고치면 된다.

미정의 detected_type → ETC,  잘못된 classification_tag → None(태그 없음)
으로 흡수한다(명세서 8장).
"""
from __future__ import annotations
from typing import Optional

from models import (
    Detection, DetectedType, RiskLevel, ClassificationTag,
)


def _parse_tag(value) -> Optional[ClassificationTag]:
    if value is None:
        return None
    try:
        return ClassificationTag(value)
    except ValueError:
        # 범위 밖 값은 '태그 없음'으로 흡수 (경고성 처리)
        print(f"  [adapter] 경고: 알 수 없는 classification_tag={value!r} → 무시")
        return None


def to_internal(raw: dict) -> Detection:
    """
    유효성 검증(validator.is_valid)을 통과한 dict을 Detection으로 변환.
    검증 전 호출하지 말 것 — 여기서는 형식이 맞다고 가정한다.
    """
    return Detection(
        log_id=raw["log_id"],
        timestamp=raw["timestamp"],
        user_id=raw["user_id"],
        domain=str(raw["domain"]).strip().lower(),
        detected_type=DetectedType.from_raw(raw["detected_type"]),
        count=int(raw["count"]),
        risk_level=RiskLevel(raw["risk_level"]),
        classification_tag=_parse_tag(raw.get("classification_tag")),
        raw_snippet=raw.get("raw_snippet"),
    )
