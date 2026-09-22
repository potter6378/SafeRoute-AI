"""
detect_config.py — 탐지 파트 설정값

정책 엔진(saferoute_policy/config.py)의 임계치·화이트리스트와는 별개다.
탐지 파트는 오직 detected_type / count / risk_level 산정에만 관여하고,
ALLOW/WARN/BLOCK 판정 자체는 절대 여기서 하지 않는다(느슨한 결합 원칙).

파일명을 config.py가 아닌 detect_config.py로 둔 이유: saferoute_policy에도
동명의 config.py가 있어, 두 파트를 같은 프로세스에서 import할 때
(bridge.py 참고) 모듈 이름이 겹치면 sys.modules 캐시 충돌이 난다.
models.py도 같은 이유로 session_models.py로 분리했다.
"""

# 유형별 기본 위험도
BASE_RISK: dict[str, str] = {
    "API_KEY": "High",
    "CREDENTIAL": "High",
    "PERSONAL_INFO": "High",
    "FINANCIAL": "Medium",
    "SOURCE_CODE": "Medium",
    "INTERNAL_DOC": "Medium",
    "ETC": "Low",
}

# 같은 유형이 이 건수 이상 한 세션에서 발견되면 Critical로 격상
CRITICAL_ESCALATION: dict[str, int] = {
    "API_KEY": 5,
    "CREDENTIAL": 3,
    "PERSONAL_INFO": 5,
    "FINANCIAL": 5,
}
