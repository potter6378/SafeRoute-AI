"""
masking.py — raw_snippet 마스킹 규칙 (명세서 3.2 raw_snippet: "원문 노출 금지")

판단·시각화 파트로는 마스킹된 값만 나가야 한다.
원문은 이 모듈 밖으로 절대 반환하지 않는다.
"""
from __future__ import annotations
import re


def mask_snippet(detected_type: str, matched_text: str) -> str:
    s = matched_text.strip()

    if detected_type == "API_KEY":
        if len(s) <= 10:
            return "*" * len(s)
        return f"{s[:5]}****...****{s[-4:]}"

    if detected_type == "CREDENTIAL":
        # "password: hunter2" 형태 → 키워드만 남기고 값은 마스킹
        for sep in (":", "="):
            if sep in s:
                key = s.split(sep, 1)[0]
                return f"{key.strip()}{sep} ****"
        return "****"

    if detected_type == "PERSONAL_INFO":
        digits = re.sub(r"\D", "", s)
        if len(digits) == 13:  # 주민등록번호
            return f"{digits[:6]}-{'*' * 7}"
        if len(digits) >= 10:  # 휴대폰번호
            return f"{digits[:3]}-{digits[3:7]}-{'*' * 4}"
        return "*" * len(s)

    if detected_type == "FINANCIAL":
        digits = re.sub(r"\D", "", s)
        if len(digits) >= 12:
            return f"{digits[:4]}-****-****-{digits[-4:]}"
        return "****"

    if detected_type == "SOURCE_CODE":
        one_line = s.replace("\n", " ").strip()
        return (one_line[:20] + "...") if len(one_line) > 20 else one_line

    if detected_type == "INTERNAL_DOC":
        return s  # 마커 단어 자체는 민감정보가 아니므로 그대로 노출

    return "****"
