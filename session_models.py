"""
session_models.py — 탐지 파트 내부 모델

TrafficSession: 게이트웨이가 복호화해서 넘겨준 트래픽 1건.
실제 연동 시 이 구조가 게이트웨이 인터페이스 스펙에 맞게 바뀔 수 있다.

파일명이 models.py가 아닌 이유: saferoute_policy/models.py와 이름이 겹치면
같은 프로세스에서 두 파트를 동시에 import할 때 모듈 캐시 충돌이 난다.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional


@dataclass
class TrafficSession:
    session_id: str          # 게이트웨이가 부여하는 트래픽 세션 ID (log_id 생성에 사용되진 않음)
    user_id: str              # 익명화된 직원 ID (emp_####)
    domain: str                # 목적지 도메인(SNI)
    timestamp: str              # 세션 발생 시각 (ISO 8601)
    text: str                    # 복호화된 페이로드(사용자가 AI에 보낸 텍스트)
    classification_tag: Optional[str] = None  # 문서 보안 등급 — 알 수 있으면 채움, 모르면 None
