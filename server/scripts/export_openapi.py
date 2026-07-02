from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from app.main import create_app


def export_openapi(output_path: Path) -> None:
    schema: dict[str, Any] = create_app().openapi()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(schema, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export the FastAPI OpenAPI schema as stable JSON.",
    )
    parser.add_argument("output", type=Path, help="OpenAPI JSON output path.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    export_openapi(args.output)


if __name__ == "__main__":
    main()
