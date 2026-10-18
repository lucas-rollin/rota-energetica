"""CLI command to register downloaded raw data files into data/manifest.json."""

from __future__ import annotations

import argparse
import glob
import sys
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from pipeline.inspector import inspect_file
from pipeline.models import Entry, Manifest


def find_repo_root(start_path: Path | None = None) -> Path:
    """Find the root repository directory containing .git or data/ directory."""
    current = (start_path or Path.cwd()).resolve()
    for parent in [current, *current.parents]:
        if (parent / ".git").exists() or (parent / "data" / "manifest.json").exists():
            return parent
    return current


def parse_args(args: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="pipeline.register",
        description="Register downloaded raw data files in data/manifest.json.",
    )
    parser.add_argument(
        "-s",
        "--source",
        dest="source_id",
        required=True,
        help="Source ID defined in docs/fontes.md (e.g. P01, P04).",
    )
    parser.add_argument(
        "-u",
        "--origin-url",
        "--source-page-url",
        dest="origin_url",
        required=True,
        help="URL of the source page or data download.",
    )
    parser.add_argument(
        "-f",
        "--file",
        dest="specified_file",
        help="Path or glob pattern of raw file(s) to register.",
    )
    parser.add_argument(
        "files",
        nargs="*",
        help="Additional file paths or glob patterns to register.",
    )
    parser.add_argument(
        "-a",
        "--acquisition",
        choices=["manual", "auto"],
        default="manual",
        help="Method of acquisition ('manual' or 'auto', default: 'manual').",
    )
    parser.add_argument(
        "-d",
        "--retrieved-at",
        default=datetime.now(ZoneInfo("America/Sao_Paulo")).date().isoformat(),
        help="Download date formatted as YYYY-MM-DD (default: today).",
    )
    parser.add_argument(
        "-n",
        "--notes",
        default=None,
        help="Optional note describing the file or dataset.",
    )
    parser.add_argument(
        "-m",
        "--manifest",
        dest="manifest_path",
        default=None,
        help="Path to manifest.json (default: <repo_root>/data/manifest.json).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect files and print entries without saving to manifest.json.",
    )

    return parser.parse_args(args)


def resolve_file_paths(file_inputs: list[str], repo_root: Path) -> list[Path]:
    """Resolve file arguments and glob patterns to concrete existing paths."""
    resolved_paths: list[Path] = []
    for pattern in file_inputs:
        matched = glob.glob(pattern)
        if not matched:
            # Check relative to repo_root as well
            pattern_from_root = str(repo_root / pattern)
            matched = glob.glob(pattern_from_root)

        if matched:
            for m in matched:
                path = Path(m).resolve()
                if path.is_file() and path not in resolved_paths:
                    resolved_paths.append(path)
        else:
            path = Path(pattern).resolve()
            if path.is_file() and path not in resolved_paths:
                resolved_paths.append(path)
            else:
                print(
                    f"Warning: File or pattern not found: '{pattern}'", file=sys.stderr
                )

    return sorted(resolved_paths)


def main(args: Sequence[str] | None = None) -> int:
    parsed = parse_args(args)
    repo_root = find_repo_root()

    manifest_path = (
        Path(parsed.manifest_path).resolve()
        if parsed.manifest_path
        else (repo_root / "data" / "manifest.json")
    )

    # Collect all input files
    raw_file_inputs = []
    if parsed.specified_file:
        raw_file_inputs.append(parsed.specified_file)
    raw_file_inputs.extend(parsed.files)

    if not raw_file_inputs:
        print(
            "Error: No files specified to register. Use --file or pass files as arguments.",
            file=sys.stderr,
        )
        return 1

    file_paths = resolve_file_paths(raw_file_inputs, repo_root)
    if not file_paths:
        print("Error: None of the specified files exist.", file=sys.stderr)
        return 1

    print(f"Manifest location: {manifest_path}")
    print(f"Registering {len(file_paths)} file(s) for source {parsed.source_id}...")

    manifest = Manifest.load(manifest_path)

    registered_count = 0
    updated_count = 0

    for path in file_paths:
        try:
            rel_path = path.relative_to(repo_root).as_posix()
        except ValueError:
            # If outside repo root, use relative path from current dir
            rel_path = path.as_posix()

        print(f"\nProcessing: {rel_path}")
        sha256, rows, date_range = inspect_file(path)

        entry = Entry(
            source_id=parsed.source_id,
            file=rel_path,
            origin_url=parsed.origin_url,
            acquisition=parsed.acquisition,
            retrieved_at=parsed.retrieved_at,
            sha256=sha256,
            rows=rows,
            date_range=date_range,
            notes=parsed.notes,
        )

        is_new, msg = manifest.upsert_entry(entry)
        if is_new:
            registered_count += 1
        else:
            updated_count += 1

        print(f"  SHA-256:    {sha256[:16]}...")
        if rows is not None:
            print(f"  Rows:       {rows:,}")
        if date_range:
            print(f"  Date range: {date_range[0]} -> {date_range[1]}")
        print(f"  Status:     {msg}")

    if parsed.dry_run:
        print("\n[Dry run] Changes were not saved to disk.")
    else:
        manifest.save(manifest_path)
        print(
            f"\nSuccessfully saved {manifest_path} ({registered_count} added, {updated_count} refreshed)."
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
