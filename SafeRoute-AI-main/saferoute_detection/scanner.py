"""
scanner.py — 탐지 핵심 로직

주어진 텍스트(게이트웨이가 복호화해 넘겨준 페이로드라고 가정)를
patterns.py의 정규식으로 스캔해, 유형별 매치 리스트를 돌려준다.

주의: 이 모듈은 '이미 복호화된 텍스트'를 입력으로 받는다.
패킷 캡처·TLS 복호화 자체는 게이트웨이/공통 인프라 영역이라 범위 밖이다
(명세서 1.2 제외 범위).
"""
from __future__ import annotations
import re
from typing import Dict, List

from patterns import PATTERNS


def scan_text(text: str) -> Dict[str, List[re.Match]]:
    """
    텍스트 1건을 스캔해 {detected_type: [매치, ...]} 형태로 반환.
    아무것도 안 걸리면 빈 dict.
    """
    if not text:
        return {}

    results: Dict[str, List[re.Match]] = {}
    for dtype, regex_list in PATTERNS.items():
        matches: List[re.Match] = []
        for regex in regex_list:
            matches.extend(regex.finditer(text))
        if matches:
            results[dtype] = matches
    return results
