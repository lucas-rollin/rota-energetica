"""Main CLI dispatcher for the pipeline package."""

from __future__ import annotations

import sys

from pipeline.register import main as register_main


def main() -> None:
    """Command-line entry point dispatcher."""
    if len(sys.argv) > 1 and sys.argv[1] == "register":
        sys.exit(register_main(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] in ("--help", "-h"):
        print("Usage: pipeline <command> [options]")
        print("\nAvailable commands:")
        print("  register    Register raw data files in data/manifest.json")
        sys.exit(0)
    else:
        print("Usage: pipeline register [options]")
        print("Run 'pipeline register --help' for details on registering raw data.")
        sys.exit(1)


if __name__ == "__main__":
    main()
