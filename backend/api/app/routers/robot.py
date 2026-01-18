import subprocess
import sys
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()

_process_lock = threading.Lock()
_process: subprocess.Popen | None = None


def _get_repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _get_script_path() -> Path:
    return _get_repo_root() / "computer_vision" / "comp_vision.py"


@router.post("/robot/start")
def start_robot() -> dict:
    global _process
    with _process_lock:
        if _process is not None and _process.poll() is None:
            return {"status": "running"}

        script_path = _get_script_path()
        if not script_path.exists():
            raise HTTPException(status_code=500, detail="comp_vision.py not found")

        repo_root = _get_repo_root()
        _process = subprocess.Popen(
            [sys.executable, "-u", str(script_path)],
            cwd=str(repo_root),
        )

    return {"status": "started"}


@router.post("/robot/stop")
def stop_robot() -> dict:
    global _process
    with _process_lock:
        proc = _process
        if proc is None or proc.poll() is not None:
            _process = None
            return {"status": "stopped"}

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)

    with _process_lock:
        if _process is proc:
            _process = None

    return {"status": "stopped"}


@router.get("/robot/status")
def robot_status() -> dict:
    with _process_lock:
        running = _process is not None and _process.poll() is None
    return {"status": "running" if running else "stopped"}
