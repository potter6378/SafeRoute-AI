from __future__ import annotations

import json
import re
from typing import Any

from models import DetectionInput


def _normalize_payload(payload: Any) -> dict[str, Any]:
    if isinstance(payload, str):
        text = payload.strip()
        if not text:
            return {}

        if text.startswith("{"):
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {}

        if "\n" in text:
            lines = text.splitlines()
            headers: dict[str, str] = {}
            body: str = ""
            in_body = False

            for line in lines:
                if not in_body:
                    if line.strip() == "":
                        in_body = True
                        continue
                    if ":" in line:
                        k, v = line.split(":", 1)
                        headers[k.strip().lower()] = v.strip()
                else:
                    body += line + "\n"

            if body.strip():
                try:
                    body_json = json.loads(body.strip())
                    if isinstance(body_json, dict):
                        payload_dict = dict(body_json)
                    else:
                        payload_dict = {}
                except json.JSONDecodeError:
                    payload_dict = {"text": body.strip()}

                for key in ("x-user-id", "x-domain", "x-timestamp"):
                    field_name = key.replace("x-", "", 1)
                    if key in headers and field_name not in payload_dict:
                        payload_dict[field_name] = headers[key]
                if "user_id" not in payload_dict and "x-user-id" in headers:
                    payload_dict["user_id"] = headers["x-user-id"]
                if "domain" not in payload_dict and "x-domain" in headers:
                    payload_dict["domain"] = headers["x-domain"]
                if "timestamp" not in payload_dict and "x-timestamp" in headers:
                    payload_dict["timestamp"] = headers["x-timestamp"]
                if "text" not in payload_dict and body.strip():
                    payload_dict["text"] = body.strip()
                return payload_dict

            return {
                key.replace("x-", "", 1): value
                for key, value in headers.items()
                if key in {"x-user-id", "x-domain", "x-timestamp"}
            }

        if re.match(r"^[a-zA-Z0-9_\-]+\s*=\s*.+$", text):
            return {"text": text}

    if isinstance(payload, dict):
        return dict(payload)

    return {}


def parse_http_request(raw_request: Any) -> dict[str, Any]:
    """Raw HTTP request string 또는 dict를 파싱해 탐지용 필드만 추출한다."""

    payload = _normalize_payload(raw_request)
    if not isinstance(payload, dict):
        return {}

    result: dict[str, Any] = {}
    for key in ("user_id", "domain", "text", "timestamp"):
        if key in payload and payload[key] is not None:
            result[key] = payload[key]

    if "body" in payload and isinstance(payload["body"], dict):
        for key in ("user_id", "domain", "text", "timestamp"):
            if key in payload["body"] and payload["body"][key] is not None:
                result[key] = payload["body"][key]

    if "headers" in payload and isinstance(payload["headers"], dict):
        headers = payload["headers"]
        if "X-User-Id" in headers and "user_id" not in result:
            result["user_id"] = headers["X-User-Id"]
        if "X-Domain" in headers and "domain" not in result:
            result["domain"] = headers["X-Domain"]
        if "X-Timestamp" in headers and "timestamp" not in result:
            result["timestamp"] = headers["X-Timestamp"]

    if "user_id" in payload and "user_id" not in result:
        result["user_id"] = payload["user_id"]
    if "domain" in payload and "domain" not in result:
        result["domain"] = payload["domain"]
    if "timestamp" in payload and "timestamp" not in result:
        result["timestamp"] = payload["timestamp"]
    if "text" in payload and "text" not in result:
        result["text"] = payload["text"]

    if "body" in payload and isinstance(payload["body"], str):
        try:
            body_json = json.loads(payload["body"])
        except json.JSONDecodeError:
            body_json = None
        if isinstance(body_json, dict):
            for key in ("user_id", "domain", "text", "timestamp"):
                if key in body_json and body_json[key] is not None:
                    result[key] = body_json[key]

    if "body" in payload and isinstance(payload["body"], str) and not result:
        result["text"] = payload["body"]

    return result
