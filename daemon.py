"""
daemon.py — SafeRoute 탐지 데몬

[배경] 8/12 회의에서 대표님이 지적한 부분: 탐지 엔진과 판단 엔진이 지금처럼
"내가 스크립트 실행하면 그때만 도는" 방식이면 실제 트래픽을 못 받는다.
라즈베리파이에서 24시간 켜져서 요청 오면 처리하는 "데몬"으로 만들어야 한다.

[구조] HTTPD(Apache)가 실제 트래픽을 받아서 이 Flask 프로세스로 넘겨준다.
      HTTPD = 웨이터, 이 daemon.py = 주방. (지난 설명 참고)

직원PC → HTTPD(80번 포트) → 리버스 프록시 → daemon.py(5000번 포트, 이 파일)
         → scanner/emitter(탐지) → bridge.py → 판단 엔진 → 결과 반환

[실행 방법]
  개발용:  python3 daemon.py                (터미널에 로그 바로 보임)
  운영용:  systemd 서비스로 등록 (saferoute-detection.service 참고)
           — 컴퓨터가 재부팅돼도, 프로세스가 죽어도 자동으로 다시 살아남

[데몬 vs 그냥 스크립트 — 무엇이 다른가]
  1. 화면 앞에 사람이 없어도 계속 돈다 (백그라운드 상주)
  2. 종료 신호(SIGTERM)를 받으면 처리 중이던 걸 정리하고 얌전히 끝난다
  3. 로그를 화면이 아니라 파일/저널에 남긴다 (아무도 안 보고 있으니까)
  4. 죽으면 자동으로 재시작된다 (systemd가 담당, 이 파일이 직접 안 함)
"""
from __future__ import annotations
import logging
import signal
import sys
from pathlib import Path

from flask import Flask, request, jsonify

from emitter import build_detection_events
from session_models import TrafficSession
from bridge import submit_to_policy, CaseStore, AuditLog, make_output

# ── 로깅 설정 ──────────────────────────────────────────────
# 데몬은 화면을 보는 사람이 없으므로 반드시 파일에도 남겨야 한다.
# /var/log 접근 권한이 없는 개발 환경(맥북 등)에서도 죽지 않도록 fallback 처리.
try:
    LOG_DIR = Path("/var/log/saferoute")
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    _log_file = LOG_DIR / "detection.log"
except PermissionError:
    LOG_DIR = Path.home() / ".saferoute" / "logs"
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    _log_file = LOG_DIR / "detection.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(_log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),  # 개발 중엔 터미널에도, systemd 운영 시엔 journal로 감
    ],
)
log = logging.getLogger("saferoute.daemon")

app = Flask(__name__)

# 지금은 프로세스 메모리에만 보관. 데몬이 재시작되면 사라짐.
# TODO(준희/혜린): 실제 운영 전에 SQLite나 파일로 영속화 필요 (아래 "다음 개선 과제" 참고)
_store = CaseStore(AuditLog())

REQUIRED_FIELDS = ("user_id", "domain", "timestamp")


@app.post("/detect")
def detect():
    """
    HTTPD가 넘겨주는 실제 트래픽 1건을 받아 탐지→판단까지 처리.

    요청 예시:
      POST /detect
      {
        "session_id": "sess_0001",
        "user_id": "emp_0417",
        "domain": "chatgpt.com",
        "timestamp": "2026-08-24T09:00:00+09:00",
        "text": "여기에 실제로 사용자가 보낸 텍스트",
        "classification_tag": null
      }
    """
    payload = request.get_json(silent=True)
    if not payload:
        log.warning("요청 바디가 JSON이 아니거나 비어있음")
        return jsonify({"error": "invalid json body"}), 400

    missing = [f for f in REQUIRED_FIELDS if f not in payload]
    if missing:
        log.warning("필수 필드 누락: %s", missing)
        return jsonify({"error": f"missing fields: {missing}"}), 400

    session = TrafficSession(
        session_id=payload.get("session_id", "unknown"),
        user_id=payload["user_id"],
        domain=payload["domain"],
        timestamp=payload["timestamp"],
        text=payload.get("text", ""),
        classification_tag=payload.get("classification_tag"),
    )

    events = build_detection_events(session)
    results = []
    for raw in events:
        case = submit_to_policy(raw, _store)
        out = make_output(case)
        results.append({
            "log_id": out.log_id,
            "decision": out.decision,
            "applied_rule": out.applied_rule,
        })
        log.info("%s | %s | %s | domain=%s", out.log_id, out.decision, out.applied_rule, session.domain)

    return jsonify({"results": results}), 200


@app.get("/health")
def health():
    """systemd나 모니터링 도구가 '이 데몬 아직 살아있나' 확인할 때 쓰는 용도"""
    return jsonify({"status": "ok", "cases_in_memory": len(_store.cases)}), 200


def _handle_shutdown(signum, _frame):
    """
    중요: 데몬은 사람이 터미널에서 Ctrl+C로 끄는 게 아니라,
    systemd가 'stop'/'restart' 명령을 내리면 운영체제가 SIGTERM을 보내서 끈다.
    이 핸들러가 없으면 딱 끊겨서 로그가 유실되거나 요청 처리 중간에 잘릴 수 있다.
    """
    log.info("종료 신호(%s) 수신 — 정리 후 종료", signum)
    sys.exit(0)


signal.signal(signal.SIGTERM, _handle_shutdown)
signal.signal(signal.SIGINT, _handle_shutdown)


if __name__ == "__main__":
    log.info("SafeRoute 탐지 데몬 시작 (127.0.0.1:5000), 로그 위치: %s", _log_file)
    # host를 0.0.0.0이 아닌 127.0.0.1로 묶는 이유: 외부에서 직접 5000번 포트로
    # 못 들어오게 막고, 반드시 HTTPD(80번)를 거치도록 강제하기 위함 (보안 경계).
    app.run(host="127.0.0.1", port=5000)
