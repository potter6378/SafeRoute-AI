import uuid
from datetime import datetime
from typing import Any, Dict, Union

from detector.parser import parse_http_request
from detector.masking import mask_sensitive_data
from models import DetectionInput


def process_raw_request(raw_request: Union[str, Dict[str, Any]]) -> DetectionInput:
    """
    HTTP Raw 요청을 받아서 파싱 -> 마스킹 -> DetectionInput 모델 변환까지
    한 번에 처리하는 메인 파이프라인 함수입니다.
    """
    # 1. HTTP 요청 파싱 (오늘 구현)
    parsed = parse_http_request(raw_request)
    text = parsed.get("text", "")

    # 2. 텍스트 마스킹 처리 (내일 구현)
    masked_snippet = mask_sensitive_data(text)

    # 3. 간단한 위험도 판단 (예시)
    detected_type = "API_KEY" if "sk-" in text else "ETC"
    risk_level = "High" if "sk-" in text else "Low"

    # 4. 정책 엔진 전달용 DetectionInput 규격 생성
    return DetectionInput(
        log_id=f"det_{uuid.uuid4().hex[:8]}",
        timestamp=parsed.get("timestamp") or datetime.utcnow().isoformat() + "Z",
        user_id=parsed.get("user_id", "unknown_user"),
        domain=parsed.get("domain", "unknown_domain"),
        detected_type=detected_type,
        count=1 if text else 0,
        risk_level=risk_level,
        raw_snippet=masked_snippet
    )