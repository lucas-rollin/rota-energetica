"""Main CLI dispatcher for the pipeline package."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from pipeline.aggregator import build_prices_history
from pipeline.config import DEFAULT_CONFIG, get_repo_root
from pipeline.defaults import apply_default_prices_to_parameters, compute_default_prices
from pipeline.models import PricesHistory, SimulationParameters, export_all_schemas
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
        repo_root = get_repo_root()
        out_dir = repo_root / "schemas"
    else:
        out_dir = parsed.output_dir

    results = export_all_schemas(out_dir)
    print(f"Exported {len(results)} JSON schemas to '{out_dir}':")
    for name, path in results.items():
        print(f"  - {name} ({path})")
    return 0


def build_cmd(args: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="pipeline build",
        description="Aggregate raw ANP and EIA data into data/processed/prices_history.json",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=None,
        help="Path to raw data directory (default: <repo_root>/data/raw)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Output path for prices_history.json (default: <repo_root>/data/processed/prices_history.json)",
    )
    parsed = parser.parse_args(args)

    repo_root = get_repo_root()
    raw_dir = parsed.raw_dir or (repo_root / "data" / "raw")
    output_path = parsed.output or (
        repo_root / "data" / "processed" / "prices_history.json"
    )
    params_path = repo_root / "data" / "parameters.json"

    if not params_path.exists():
        print(f"Error: Parameters file not found at '{params_path}'", file=sys.stderr)
        return 1

    start_time = time.perf_counter()
    params = SimulationParameters.load(params_path)

    anp_dir = raw_dir / "anp"
    anp_files = sorted(anp_dir.glob("ca-*.csv")) if anp_dir.exists() else []

    brent_file = raw_dir / "eia" / "brent-weekly.csv"

    print(f"Building prices history from {len(anp_files)} ANP files and EIA Brent...")
    history = build_prices_history(
        anp_files=anp_files,
        brent_file=brent_file,
        parameters=params,
        config=DEFAULT_CONFIG,
    )

    history.save(output_path)
    elapsed = time.perf_counter() - start_time

    diesel_pts = (
        len(history.fuels["diesel_s10"].series) if "diesel_s10" in history.fuels else 0
    )
    gnv_pts = len(history.fuels["gnv"].series) if "gnv" in history.fuels else 0
    brent_pts = len(history.fuels["brent"].series) if "brent" in history.fuels else 0

    print(f"Successfully generated '{output_path}' in {elapsed:.2f}s:")
    print(f"  - diesel_s10: {diesel_pts} weekly points")
    print(f"  - gnv:        {gnv_pts} weekly points")
    print(f"  - brent:      {brent_pts} weekly points")
    return 0


def defaults_cmd(args: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="pipeline defaults",
        description="Compute 12-week baseline default prices and optionally apply to parameters.json",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply computed default prices to data/parameters.json",
    )
    parser.add_argument(
        "--history",
        type=Path,
        default=None,
        help="Path to prices_history.json (default: <repo_root>/data/processed/prices_history.json)",
    )
    parsed = parser.parse_args(args)

    repo_root = get_repo_root()
    history_path = parsed.history or (
        repo_root / "data" / "processed" / "prices_history.json"
    )
    defaults_path = repo_root / "data" / "processed" / "default_prices.json"
    params_path = repo_root / "data" / "parameters.json"

    if not history_path.exists():
        print(
            f"Error: '{history_path}' does not exist. Run 'pipeline build' first.",
            file=sys.stderr,
        )
        return 1

    history = PricesHistory.load(history_path)

    aneel_file = (
        repo_root
        / "data"
        / "raw"
        / "aneel"
        / "tarifas-homologadas-distribuidoras-energia-eletrica.csv"
    )
    aneel_data = None
    if aneel_file.exists():
        try:
            from pipeline.aggregator import parse_aneel_csv

            aneel_data = parse_aneel_csv(aneel_file, DEFAULT_CONFIG)
        except Exception as e:
            print(f"Warning: Failed to parse ANEEL data ({e})", file=sys.stderr)

    catalog = compute_default_prices(history, DEFAULT_CONFIG, aneel_data=aneel_data)
    catalog.save(defaults_path)
    print(f"Saved default baseline prices to '{defaults_path}':")
    for fuel_key, item in catalog.defaults.items():
        fallback_str = (
            " (fallback: BR)" if item.is_fallback else f" ({item.reference_uf})"
        )
        print(
            f"  - {fuel_key}: {item.value:.2f} {item.unit}{fallback_str} [{item.badge}]"
        )

    if parsed.apply:
        updated_params, diffs = apply_default_prices_to_parameters(params_path, catalog)
        updated_params.save(params_path)
        print(f"\nApplied updates to '{params_path}':")
        for diff in diffs:
            print(f"  * {diff}")
    else:
        print(
            "\nDry run: pass '--apply' to update data/parameters.json with these values."
        )

    return 0


def main() -> None:
    """Command-line entry point dispatcher."""
    if len(sys.argv) > 1 and sys.argv[1] == "register":
        sys.exit(register_main(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "export-schemas":
        sys.exit(export_schemas_cmd(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "build":
        sys.exit(build_cmd(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] == "defaults":
        sys.exit(defaults_cmd(sys.argv[2:]))
    elif len(sys.argv) > 1 and sys.argv[1] in ("--help", "-h"):
        print("Usage: pipeline <command> [options]")
        print("\nAvailable commands:")
        print("  register        Register raw data files in data/manifest.json")
        print(
            "  export-schemas  Export JSON Schemas from Pydantic models to schemas/*.json"
        )
        print(
            "  build           Aggregate raw data into data/processed/prices_history.json"
        )
        print(
            "  defaults        Compute rolling baseline prices and optionally update parameters"
        )
        sys.exit(0)
    else:
        print("Usage: pipeline <command> [options]")
        print("\nAvailable commands:")
        print("  register        Register raw data files in data/manifest.json")
        print(
            "  export-schemas  Export JSON Schemas from Pydantic models to schemas/*.json"
        )
        print(
            "  build           Aggregate raw data into data/processed/prices_history.json"
        )
        print(
            "  defaults        Compute rolling baseline prices and optionally update parameters"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
