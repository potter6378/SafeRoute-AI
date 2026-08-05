"""
validator.py — 입력 유효성 검증 (명세서 3.3)

판정 전에 원본 탐지 dict를 검사한다.
하나라도 실패하면 (False, 사유)를 돌려주고, 판정은 HOLD로 처리된다.
"""
from __future__ import annotations
from typing import Tuple

from models import DetectedType, RiskLevel, ClassificationTag

REQUIRED_FIELDS = [
    "log_id", "timestamp", "user_id", "domain",
    "detected_type", "count", "risk_level",
]

_VALID_RISK = {r.value for r in RiskLevel}
_VALID_TAG = {t.value for t in ClassificationTag}


def is_valid(raw: dict) -> Tuple[bool, str]:
    """
    반환: (유효여부, 사유)
    사유는 유효할 때 "" , 무효일 때 실패 원인 문자열.
    """
    if not isinstance(raw, dict):
        return False, "입력이 dict 형식이 아님"

    # 1) 필수 필드 존재
    for f in REQUIRED_FIELDS:
        if f not in raw or raw[f] is None:
            return False, f"필수 필드 누락: {f}"

    # 2) count 는 0 이상의 정수 (bool은 int의 서브클래스라 배제)
    count = raw["count"]
    if isinstance(count, bool) or not isinstance(count, int):
        return False, f"count가 정수가 아님: {count!r}"
    if count < 0:
        return False, f"count가 음수: {count}"

    # 3) domain 비어있지 않음
    if not str(raw["domain"]).strip():
        return False, "domain이 빈 문자열"

    # 4) risk_level enum 범위
    if raw["risk_level"] not in _VALID_RISK:
        return False, f"risk_level 허용값 아님: {raw['risk_level']!r}"

    # 5) classification_tag (선택) — 값이 있으면 enum 범위 검사.
    #    범위 밖이면 무효가 아니라 '태그 없음'으로 흡수하므로 여기선 통과시킴(명세서 8장).

    # detected_type 은 미정의여도 ETC로 흡수하므로 무효 처리하지 않음(명세서 8장).
    return True, ""
