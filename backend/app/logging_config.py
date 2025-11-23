import logging
import sys

def setup_logging(level: str = "INFO"):
    """Configure root logging for the application.

    - Sets a simple console handler with timestamp, level and message.
    - Avoids printing secrets; code should use logger.exception for stack traces.
    """
    root = logging.getLogger()
    if root.handlers:
        # Avoid adding multiple handlers if setup_logging called multiple times
        return

    log_level = getattr(logging, level.upper(), logging.INFO)
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s - %(message)s')

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    root.setLevel(log_level)
    root.addHandler(console_handler)

    # Reduce verbosity from third-party libraries if desired
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
    logging.getLogger('uvicorn').setLevel(logging.INFO)
