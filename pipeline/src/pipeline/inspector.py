"""Inspection tools to compute checksums, row counts, and date ranges for raw files."""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path

import polars as pl


def compute_sha256(file_path: Path) -> str:
    """Calculate SHA-256 checksum of a file streaming chunks to save memory."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest().lower()


def detect_csv_dialect(file_path: Path) -> tuple[str, str]:
    """Detect CSV delimiter (semicolon or comma) and encoding."""
    # ANP and Brazilian gov files frequently use UTF-8 with BOM or UTF-8 with semicolon
    # Try reading first 4KB to sniff delimiter
    with open(file_path, "rb") as f:
        sample_bytes = f.read(4096)

    encoding = "utf-8"
    if sample_bytes.startswith(b"\xef\xbb\xbf"):
        encoding = "utf-8-sig"

    text_sample = sample_bytes.decode(encoding, errors="replace")
    try:
        dialect = csv.Sniffer().sniff(text_sample, delimiters=";,")
        delimiter = dialect.delimiter
    except Exception:
        # Fallback: count occurrences in first line
        first_line = text_sample.splitlines()[0] if text_sample else ""
        delimiter = ";" if first_line.count(";") > first_line.count(",") else ","

    return delimiter, encoding


def inspect_csv(file_path: Path) -> tuple[int | None, list[str] | None]:
    """Inspect CSV file to compute row count and date range if applicable.

    Returns:
        (rows, date_range)
    """
    delimiter, _ = detect_csv_dialect(file_path)

    # 1. Row count
    try:
        # Polars scan_csv is very fast and efficient
        lf = pl.scan_csv(
            file_path, separator=delimiter, encoding="utf8-lossy", ignore_errors=True
        )
        schema = lf.collect_schema()
        columns = list(schema.names())
        total_rows = lf.select(pl.len()).collect().item()
    except Exception:
        # Fallback to line counting
        try:
            with open(file_path, "rb") as f:
                lines = sum(1 for _ in f)
            total_rows = max(0, lines - 1)
            columns = []
        except Exception:
            return None, None

    if total_rows == 0 or not columns:
        return total_rows, None

    # 2. Date range detection
    candidate_date_cols = [
        "Data da Coleta",
        "data da coleta",
        "Data",
        "data",
        "Date",
        "date",
        "Timestamp",
        "timestamp",
        "datetime",
    ]

    date_col = next((c for c in candidate_date_cols if c in columns), None)
    if not date_col:
        # Try finding any column with 'data' or 'date' in its name
        date_col = next(
            (c for c in columns if any(k in c.lower() for k in ["data", "date"])),
            None,
        )

    if not date_col:
        return total_rows, None

    date_range = None
    try:
        # Scan only the date column to find min and max
        col_scan = pl.scan_csv(
            file_path,
            separator=delimiter,
            encoding="utf8-lossy",
            ignore_errors=True,
        ).select(date_col)

        # Try Brazilian format (%d/%m/%Y) first, then ISO (%Y-%m-%d)
        dates_df = (
            col_scan.select(
                pl.coalesce(
                    [
                        pl.col(date_col)
                        .cast(pl.String)
                        .str.to_date("%d/%m/%Y", strict=False),
                        pl.col(date_col)
                        .cast(pl.String)
                        .str.to_date("%Y-%m-%d", strict=False),
                        pl.col(date_col)
                        .cast(pl.String)
                        .str.to_date("%Y/%m/%d", strict=False),
                    ]
                ).alias("parsed_date")
            )
            .filter(pl.col("parsed_date").is_not_null())
            .collect()
        )

        if dates_df.height > 0:
            min_d = dates_df["parsed_date"].min()
            max_d = dates_df["parsed_date"].max()
            if min_d is not None and max_d is not None:
                # pyrefly: ignore [missing-attribute]
                date_range = [min_d.strftime("%Y-%m-%d"), max_d.strftime("%Y-%m-%d")]
    except Exception:
        date_range = None

    return total_rows, date_range


def inspect_file(file_path: Path) -> tuple[str, int | None, list[str] | None]:
    """Inspect any raw data file.

    Returns:
        (sha256, rows, date_range)
    """
    sha256 = compute_sha256(file_path)

    if file_path.suffix.lower() == ".csv":
        rows, date_range = inspect_csv(file_path)
    else:
        rows, date_range = None, None

    return sha256, rows, date_range
