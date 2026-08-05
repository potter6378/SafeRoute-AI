"""
fake_data.py — 가짜 탐지 로그 생성기 (명세서 5장 착수 전략)

박혜린 파트가 아직 없어도, 내 제안 스키마(명세서 3.1) 기준으로
가짜 로그를 만들어 판단 엔진을 단독 개발·시연할 수 있다.

일부 로그는 일부러 무효(필드 누락 등)로 만들어 HOLD 경로도 시연한다.
"""
from __future__ import annotations
from typing import List


def make_fake_logs() -> List[dict]:
    """다양한 판정 경로를 커버하는 탐지 로그 묶음."""
    return [
        # 1) 안전 — count 0 → ALLOW
        {"log_id": "det_0001", "timestamp": "2026-08-05T09:00:01+09:00",
         "user_id": "emp_0101", "domain": "chatgpt.com",
         "detected_type": "ETC", "count": 0, "risk_level": "Low",
         "classification_tag": None, "raw_snippet": ""},

        # 2) 소량 → WARN → 소명
        {"log_id": "det_0002", "timestamp": "2026-08-05T09:12:33+09:00",
         "user_id": "emp_0417", "domain": "chatgpt.com",
         "detected_type": "API_KEY", "count": 3, "risk_level": "High",
         "classification_tag": None, "raw_snippet": "sk-****...****a1b2"},

        # 3) 대량 → BLOCK
        {"log_id": "det_0003", "timestamp": "2026-08-05T09:20:10+09:00",
         "user_id": "emp_0222", "domain": "claude.ai",
         "detected_type": "PERSONAL_INFO", "count": 15, "risk_level": "Critical",
         "classification_tag": None, "raw_snippet": "9012**-*******"},

        # 4) 화이트리스트(협력사 도메인) → ALLOW
        {"log_id": "det_0004", "timestamp": "2026-08-05T09:31:45+09:00",
         "user_id": "emp_0333", "domain": "partner.com",
         "detected_type": "INTERNAL_DOC", "count": 5, "risk_level": "Medium",
         "classification_tag": None, "raw_snippet": "설계안 v2..."},

        # 5) 공개 태그 → ALLOW (임계치 무시)
        {"log_id": "det_0005", "timestamp": "2026-08-05T09:40:02+09:00",
         "user_id": "emp_0444", "domain": "chatgpt.com",
         "detected_type": "INTERNAL_DOC", "count": 20, "risk_level": "High",
         "classification_tag": "PUBLIC", "raw_snippet": "보도자료..."},

        # 6) 기밀 태그 → BLOCK (최우선)
        {"log_id": "det_0006", "timestamp": "2026-08-05T09:52:19+09:00",
         "user_id": "emp_0417", "domain": "chatgpt.com",
         "detected_type": "SOURCE_CODE", "count": 1, "risk_level": "High",
         "classification_tag": "CONFIDENTIAL", "raw_snippet": "def secret()..."},

        # 7) 무효 입력(count 누락) → HOLD
        {"log_id": "det_0007", "timestamp": "2026-08-05T10:01:00+09:00",
         "user_id": "emp_0555", "domain": "chatgpt.com",
         "detected_type": "API_KEY", "risk_level": "High",
         "classification_tag": None, "raw_snippet": "sk-..."},

        # 8) 소량 → WARN (소명 승인 시나리오용)
        {"log_id": "det_0008", "timestamp": "2026-08-05T10:11:41+09:00",
         "user_id": "emp_0666", "domain": "gemini.google.com",
         "detected_type": "FINANCIAL", "count": 4, "risk_level": "Medium",
         "classification_tag": None, "raw_snippet": "매출 12,3**..."},

        # 9) 소량 → WARN (소명 거부 시나리오용)
        {"log_id": "det_0009", "timestamp": "2026-08-05T10:20:05+09:00",
         "user_id": "emp_0777", "domain": "chatgpt.com",
         "detected_type": "CREDENTIAL", "count": 2, "risk_level": "High",
         "classification_tag": None, "raw_snippet": "pw: ****"},

        # 10) 소량 → WARN (타임아웃 시나리오용)
        {"log_id": "det_0010", "timestamp": "2026-08-05T10:33:27+09:00",
         "user_id": "emp_0888", "domain": "chatgpt.com",
         "detected_type": "PERSONAL_INFO", "count": 6, "risk_level": "Medium",
         "classification_tag": None, "raw_snippet": "010-1234-****"},

        # 11) 화이트리스트(사내 IP 대역) → ALLOW
        {"log_id": "det_0011", "timestamp": "2026-08-05T10:44:12+09:00",
         "user_id": "emp_0999", "domain": "10.0.3.11",
         "detected_type": "SOURCE_CODE", "count": 8, "risk_level": "Medium",
         "classification_tag": None, "raw_snippet": "config.yaml..."},

        # 12) 미정의 detected_type → ETC로 흡수, 소량 → WARN
        {"log_id": "det_0012", "timestamp": "2026-08-05T10:55:50+09:00",
         "user_id": "emp_1010", "domain": "perplexity.ai",
         "detected_type": "WEIRD_NEW_TYPE", "count": 1, "risk_level": "Low",
         "classification_tag": None, "raw_snippet": "??"},
    ]
