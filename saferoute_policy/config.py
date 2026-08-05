"""
config.py — 정책값(상수) 모음

명세서 4.1 / 4.4 / 부록 A 참조.
회의에서 값이 확정되면 이 파일 한 곳만 고치면 된다.
judge() · 상태 기계는 이 값을 참조하기만 하므로 로직은 손댈 필요 없다.
"""

# 임계치 (명세서 4.4)
WARN_THRESHOLD = 1      # count >= 1  → WARN
BLOCK_THRESHOLD = 10    # count >= 10 → BLOCK

# 화이트리스트 (명세서 4.3) — 도메인 정확 일치 + IP CIDR 대역
WHITELIST = [
    "partner.com",
    "trusted-vendor.co.kr",
    "10.0.0.0/8",
    "192.168.0.0/16",
]

# 소명 대기 타임아웃 (명세서 5.2 / 부록 A No.5)
# 자동 데모에서는 이 시간을 실제로 기다리지 않고 '미입력' 이벤트로 시뮬레이션한다.
WARN_TIMEOUT_SEC = 300  # 예: 5분 후 자동 차단
