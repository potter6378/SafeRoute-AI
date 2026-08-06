import unittest

from models import DetectionInput
from parser import parse_http_request


class DetectionInputTests(unittest.TestCase):
    def test_detection_input_validates_and_serializes(self):
        payload = {
            "log_id": "det_12345",
            "timestamp": "2026-08-06T12:00:00+09:00",
            "user_id": "anon_42",
            "domain": "example.com",
            "detected_type": "API_KEY",
            "count": 2,
            "risk_level": "High",
            "classification_tag": "INTERNAL",
            "raw_snippet": "sk-***",
        }

        model = DetectionInput(**payload)
        self.assertEqual(model.log_id, "det_12345")
        self.assertEqual(model.detected_type, "API_KEY")
        self.assertEqual(model.model_dump()["count"], 2)

    def test_parse_http_request_extracts_fields_from_headers_and_body(self):
        raw_request = """POST /report HTTP/1.1
Host: api.example.com
X-User-Id: header_user
X-Domain: header-domain.com
X-Timestamp: 2026-08-06T11:00:00+09:00
Content-Type: application/json

{"user_id": "body_user", "domain": "body-domain.com", "text": "api key found", "timestamp": "2026-08-06T12:30:00+09:00"}"""

        result = parse_http_request(raw_request)

        self.assertEqual(result["user_id"], "body_user")
        self.assertEqual(result["domain"], "body-domain.com")
        self.assertEqual(result["text"], "api key found")
        self.assertEqual(result["timestamp"], "2026-08-06T12:30:00+09:00")


if __name__ == "__main__":
    unittest.main()
