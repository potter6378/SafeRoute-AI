"""
models.py — 내부 데이터 모델 & enum 정의

명세서 3장(입력) · 4장(판정) · 5장(상태) · 6장(출력) · 7장(감사로그)에서
정의한 형식을 파이썬 타입으로 옮긴 것.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# enum 정의
# ---------------------------------------------------------------------------
class DetectedType(str, Enum):
    """탐지 유형 (명세서 3.2)"""
    API_KEY = "API_KEY"
    CREDENTIAL = "CREDENTIAL"
    PERSONAL_INFO = "PERSONAL_INFO"
    INTERNAL_DOC = "INTERNAL_DOC"
    SOURCE_CODE = "SOURCE_CODE"
    FINANCIAL = "FINANCIAL"
    ETC = "ETC"

    @classmethod
    def from_raw(cls, value) -> "DetectedType":
        """미정의 값은 ETC로 흡수 (명세서 8장)"""
        try:
            return cls(value)
        except ValueError:
            return cls.ETC


class RiskLevel(str, Enum):
    """위험도 (명세서 3.2)"""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class ClassificationTag(str, Enum):
    """문서 보안 등급 (명세서 3.2 / 4.2)"""
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"


class Decision(str, Enum):
    """판정 (명세서 4.1)"""
    ALLOW = "ALLOW"
    WARN = "WARN"
    BLOCK = "BLOCK"
    HOLD = "HOLD"


class AppliedRule(str, Enum):
    """판정 근거 규칙 = 설명가능성 (명세서 4.1)"""
    INPUT_INVALID = "INPUT_INVALID"
    TAG_CONFIDENTIAL = "TAG_CONFIDENTIAL"
    TAG_PUBLIC = "TAG_PUBLIC"
    WHITELIST = "WHITELIST"
    THRESHOLD_BLOCK = "THRESHOLD_BLOCK"
    THRESHOLD_WARN = "THRESHOLD_WARN"
    DEFAULT_ALLOW = "DEFAULT_ALLOW"


class State(str, Enum):
    """사건 상태 (명세서 5.1)"""
    NEW = "NEW"
    ALLOWED = "ALLOWED"
    BLOCKED = "BLOCKED"
    WARNED = "WARNED"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    HELD = "HELD"  # 명세서 8장 확장: 입력 무효로 사람 확인 대기


class DetectionInput(BaseModel):
    """HTTP 요청/탐지 이벤트를 검증하는 Pydantic 모델."""

    log_id: str = Field(..., min_length=1)
    timestamp: str
    user_id: str = Field(..., min_length=1)
    domain: str = Field(..., min_length=1)
    detected_type: Literal["API_KEY", "CREDENTIAL", "PERSONAL_INFO", "INTERNAL_DOC", "SOURCE_CODE", "FINANCIAL", "ETC"]
    count: int = Field(ge=0)
    risk_level: Literal["Low", "Medium", "High", "Critical"]
    classification_tag: Optional[Literal["PUBLIC", "INTERNAL", "CONFIDENTIAL"]] = None
    raw_snippet: Optional[str] = None

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, value: str) -> str:
        if not value:
            raise ValueError("timestamp must not be empty")
        return value


# ---------------------------------------------------------------------------
# 데이터 모델
# ---------------------------------------------------------------------------
@dataclass
class Detection:
    """
    내부 표준 모델 (명세서 3.1).
    탐지 엔진의 원본 dict은 adapter.to_internal()을 거쳐 이 형태가 된다.
    → 탐지 형식이 바뀌어도 어댑터만 고치면 judge()는 그대로.
    """
    log_id: str
    timestamp: str
    user_id: str
    domain: str
    detected_type: DetectedType
    count: int
    risk_level: RiskLevel
    classification_tag: Optional[ClassificationTag] = None
    raw_snippet: Optional[str] = None


@dataclass
class JudgeResult:
    """judge()의 반환값 (명세서 4.6)"""
    decision: Decision
    applied_rule: AppliedRule


@dataclass
class DecisionOutput:
    """판단 → 시각화 전달 형식 (명세서 6장)"""
    log_id: str
    timestamp_decided: str
    user_id: str
    domain: str
    detected_type: str
    count: int
    risk_level: str
    decision: str
    applied_rule: str
    state: str
    reason: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class AuditEntry:
    """감사 로그 1건 (명세서 7.1)"""
    audit_id: str
    log_id: str
    timestamp: str
    user_id: str
    domain: str
    detected_type: str
    count: int
    risk_level: str
    decision: str
    applied_rule: str
    final_state: str
    reason: Optional[str] = None
    reviewer: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)
