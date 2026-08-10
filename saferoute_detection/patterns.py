"""
patterns.py — 탐지 패턴 정의

명세서 3.2의 detected_type 7종 중 ETC를 제외한 6종을 정규식으로 탐지한다.
데모 수준의 규칙 기반(rule-based) 탐지이며, 실제 서비스에서는
엔트로피 기반 시크릿 탐지, NER 기반 개인정보 탐지 등으로 고도화가 필요하다
(saferoute_detection/README.md '한계' 참고).

각 detected_type은 여러 정규식을 OR로 묶어 매치한다.
"""
from __future__ import annotations
import re

PATTERNS: dict[str, list[re.Pattern]] = {
    # API 키 · 액세스 토큰
    "API_KEY": [
        re.compile(r"sk-[A-Za-z0-9]{20,}"),                        # OpenAI 스타일
        re.compile(r"AKIA[0-9A-Z]{16}"),                           # AWS Access Key
        re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),                 # GitHub 토큰
        re.compile(r"(?i)api[_-]?key\s*[:=]\s*['\"]?[A-Za-z0-9\-_]{16,}"),
    ],
    # 비밀번호 · 인증정보
    "CREDENTIAL": [
        re.compile(r"(?i)(?:password|pwd|비밀번호)\s*[:=]\s*\S+"),
        re.compile(r"[A-Za-z0-9_.+-]+:[^@\s]{4,}@[A-Za-z0-9.\-]+"),  # user:pass@host
    ],
    # 개인정보(주민번호·연락처)
    "PERSONAL_INFO": [
        re.compile(r"\d{6}[-\s]?[1-4]\d{6}"),                       # 주민등록번호
        re.compile(r"01[016789][-\s]?\d{3,4}[-\s]?\d{4}"),          # 휴대폰번호
    ],
    # 재무·계약 등 민감 수치
    "FINANCIAL": [
        re.compile(r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}"),      # 카드번호형
        re.compile(r"(?i)(?:계좌번호|account\s*no\.?)\s*[:=]?\s*[\d\-]{10,}"),
    ],
    # 소스코드 · 설정파일
    "SOURCE_CODE": [
        re.compile(r"```[\s\S]*?```"),                              # 코드 블록
        re.compile(r"(?m)^\s*(def |class |function |import |from .+ import|SELECT .+ FROM)"),
    ],
    # 사내 문서 · 내부 자료 (분류 마커)
    "INTERNAL_DOC": [
        re.compile(r"(대외비|사내한정|내부용|CONFIDENTIAL|Internal Use Only)"),
    ],
}
