"""Main CLI dispatcher for the pipeline package."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pipeline.models import export_all_schemas
from pipeline.register import main as register_main


def export_schemas_cmd(args: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="pipeline export-schemas",
        description="Export JSON Schemas from Pydantic models to schemas/*.json",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=Path,
        default=None,
        help="Directory to save schemas (default: <repo_root>/schemas)",
    )
    parsed = parser.parse_args(args)

    if parsed.output_dir is None:
        # Default to repo root / schemas
        repo_root = Path(__file__).resolve().parents[3]
        out_dir = repo_root / "schemas"
    else:
        out_dir = parsed.output_dir

    results = export_all_schemas(out_dir)
    print(f"Exported {len(results)} JSON schemas to '{out_dir}':")
    for name, path in results.items():
        print(f"  - {name} ({path})")
    return 0


def main() -> None:
    """Command-line entry point dispatcher."""
    if len(sys.argv) > 1 and sys.argv[1] == "register":
        sys.exit(register_main(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "export-schemas":
        sys.exit(export_schemas_cmd(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] in ("--help", "-h"):
        print("Usage: pipeline <command> [options]")
        print("\nAvailable commands:")
        print("  register        Register raw data files in data/manifest.json")
        print(
            "  export-schemas  Export JSON Schemas from Pydantic models to schemas/*.json"
        )
        sys.exit(0)
    else:
        print("Usage: pipeline <command> [options]")
        print("\nAvailable commands:")
        print("  register        Register raw data files in data/manifest.json")
        print(
            "  export-schemas  Export JSON Schemas from Pydantic models to schemas/*.json"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
