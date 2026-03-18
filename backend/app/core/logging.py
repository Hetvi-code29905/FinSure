# app/core/logging.py
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class _JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        skip = {
            "args","created","exc_info","exc_text","filename","funcName",
            "id","levelname","levelno","lineno","message","module","msecs",
            "msg","name","pathname","process","processName","relativeCreated",
            "stack_info","thread","threadName",
        }
        log: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.getMessage(),
        }
        for k, v in record.__dict__.items():
            if k not in skip:
                log[k] = v
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        return json.dumps(log)


class _TextFormatter(logging.Formatter):
    GREY   = "\x1b[38;5;240m"
    BLUE   = "\x1b[38;5;39m"
    YELLOW = "\x1b[38;5;220m"
    RED    = "\x1b[38;5;196m"
    BOLD   = "\x1b[1m"
    RESET  = "\x1b[0m"
    COLORS = {"DEBUG": "\x1b[38;5;240m", "INFO": "\x1b[38;5;39m",
               "WARNING": "\x1b[38;5;220m", "ERROR": "\x1b[38;5;196m",
               "CRITICAL": "\x1b[1m\x1b[38;5;196m"}
    SKIP = {
        "args","created","exc_info","exc_text","filename","funcName",
        "id","levelname","levelno","lineno","message","module","msecs",
        "msg","name","pathname","process","processName","relativeCreated",
        "stack_info","thread","threadName",
    }

    def format(self, record: logging.LogRecord) -> str:
        c = self.COLORS.get(record.levelname, "")
        r = self.RESET
        level = f"{c}{record.levelname:<8}{r}"
        name  = f"{self.GREY}{record.name}{r}"
        extras = {k: v for k, v in record.__dict__.items() if k not in self.SKIP}
        extra_str = ("  " + "  ".join(f"{k}={v}" for k, v in extras.items())) if extras else ""
        line = f"{level} {name}: {record.getMessage()}{extra_str}"
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


def setup_logging(level: str = "INFO", fmt: str = "text") -> None:
    formatter = _JSONFormatter() if fmt == "json" else _TextFormatter()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.handlers.clear()
    root.addHandler(handler)
    for lib in ("motor", "pymongo", "apscheduler", "urllib3", "httpx"):
        logging.getLogger(lib).setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)