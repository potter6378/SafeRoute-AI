import json
import re
from typing import Any, Dict


def parse_http_request(raw_request: str) -> Dict[str, Any]:
    """
    HTTP Raw 요청 문자열을 파싱하여 user_id, domain, text, timestamp 등을 추출합니다.
    """
    parsed_data = {
        "user_id": "unknown_user",
        "domain": "unknown_domain",
        "text": "",
        "timestamp": ""
    }

    if not raw_request:
        return parsed_data

    # 1. Host 헤더에서 domain 추출
    host_match = re.search(r'(?i)Host:\s*([^\r\n]+)', raw_request)
    if host_match:
        parsed_data["domain"] = host_match.group(1).strip()

    # 2. X-User-Id 헤더 등에서 user_id 추출
    user_match = re.search(r'(?i)X-User-Id:\s*([^\r\n]+)', raw_request)
    if user_match:
        parsed_data["user_id"] = user_match.group(1).strip()

    # 3. HTTP Body (본문) 추출 및 JSON 파싱
    body_parts = raw_request.split("\r\n\r\n", 1)
    if len(body_parts) > 1:
        body = body_parts[1].strip()
        try:
            body_json = json.loads(body)
            if isinstance(body_json, dict):
                parsed_data["text"] = body_json.get("text", body)
                if "user_id" in body_json:
                    parsed_data["user_id"] = body_json["user_id"]
            else:
                parsed_data["text"] = body
        except json.JSONDecodeError:
            parsed_data["text"] = body
    else:
        parsed_data["text"] = raw_request

    return parsed_data