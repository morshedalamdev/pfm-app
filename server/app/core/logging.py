import logging
from logging.config import dictConfig
from typing import Any


def configure_logging(debug: bool = False) -> None:
    level = "DEBUG" if debug else "INFO"
    config: dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": ("%(asctime)s %(levelname)s [%(name)s] %(message)s"),
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            },
        },
        "root": {
            "level": level,
            "handlers": ["console"],
        },
        "loggers": {
            "app": {
                "level": level,
                "handlers": ["console"],
                "propagate": False,
            },
        },
    }
    dictConfig(config)
    logging.getLogger("app").debug("Logging configured")
