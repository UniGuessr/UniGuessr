"""app package: exposes the path to the config directory."""

from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config"
