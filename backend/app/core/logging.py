"""Structured logging setup using loguru.

We intercept the standard logging module so libraries (uvicorn, sqlalchemy)
all flow through one consistent, JSON-friendly sink.
"""

import logging
import sys
from loguru import logger


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage())


def setup_logging() -> None:
    logger.remove()
    logger.add(sys.stdout, level="INFO", enqueue=True,
               format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | "
                      "<cyan>{name}</cyan> - <level>{message}</level>")
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
