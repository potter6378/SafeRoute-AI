"""
judge.py — 판단 규칙 엔진 (명세서 4장)

핵심은 4.1의 '판단 우선순위(first-match-wins)'다.
네 로직(태그·화이트리스트·임계치·소명)이 충돌해도 아래 순서로만 평가하며,
먼저 일치하는 규칙에서 판정을 확정하고 이후 규칙은 건너뛴다.

    0. 입력 무효               → HOLD   / INPUT_INVALID   (validator에서 걸러짐)
    1. tag = CONFIDENTIAL     → BLOCK  / TAG_CONFIDENTIAL
    2. tag = PUBLIC           → ALLOW  / TAG_PUBLIC
    3. domain ∈ 화이트리스트   → ALLOW  / WHITELIST
    4. count >= BLOCK 임계치   → BLOCK  / THRESHOLD_BLOCK
    5. count >= WARN 임계치    → WARN   / THRESHOLD_WARN
    6. 그 외                   → ALLOW  / DEFAULT_ALLOW
"""
from __future__ import annotations
import ipaddress

import config
from models import (
    Detection, JudgeResult, Decision, AppliedRule, ClassificationTag,
)


def in_whitelist(domain: str) -> bool:
    """
    화이트리스트 매칭 (명세서 4.3).
    - 도메인 문자열: 정확 일치 (대소문자 무시)
    - domain이 IP 형태이면: CIDR 대역 포함 여부
    """
    domain = domain.strip().lower()

    # IP인지 먼저 확인
    ip = None
    try:
        ip = ipaddress.ip_address(domain)
    except ValueError:
        ip = None

    for entry in config.WHITELIST:
        entry = entry.strip().lower()
        if "/" in entry:  # CIDR 대역
            if ip is not None:
                try:
                    if ip in ipaddress.ip_network(entry, strict=False):
                        return True
                except ValueError:
                    continue
        else:  # 도메인 정확 일치
            if domain == entry:
                return True
    return False


def judge(det: Detection) -> JudgeResult:
    """
    유효성 통과한 Detection 1건을 판정한다.
    입력 무효(HOLD)는 이 함수 호출 전에 validator에서 처리되므로
    여기서는 유효한 입력만 들어온다고 가정한다.
    """
    tag = det.classification_tag

    # 1~2. 분류 태그 우선 (명세서 4.2)
    if tag == ClassificationTag.CONFIDENTIAL:
        return JudgeResult(Decision.BLOCK, AppliedRule.TAG_CONFIDENTIAL)
    if tag == ClassificationTag.PUBLIC:
        return JudgeResult(Decision.ALLOW, AppliedRule.TAG_PUBLIC)

    # 3. 화이트리스트 (명세서 4.3)
    if in_whitelist(det.domain):
        return JudgeResult(Decision.ALLOW, AppliedRule.WHITELIST)

    # 4~5. 임계치 (명세서 4.4)
    if det.count >= config.BLOCK_THRESHOLD:
        return JudgeResult(Decision.BLOCK, AppliedRule.THRESHOLD_BLOCK)
    if det.count >= config.WARN_THRESHOLD:
        return JudgeResult(Decision.WARN, AppliedRule.THRESHOLD_WARN)

    # 6. 기본값
    return JudgeResult(Decision.ALLOW, AppliedRule.DEFAULT_ALLOW)
