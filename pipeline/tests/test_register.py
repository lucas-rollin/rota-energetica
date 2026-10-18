from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from pipeline.inspector import compute_sha256, inspect_csv
from pipeline.models import Entry, Manifest
from pipeline.register import main as register_main


def test_entry_validation():
    valid_entry = Entry(
        source_id="P01",
        file="data/raw/anp/ca-2026-01.csv",
        origin_url="https://example.com/data",
        acquisition="manual",
        retrieved_at="2026-10-09",
        sha256="a" * 64,
        rows=100,
        date_range=["2026-01-01", "2026-06-30"],
    )
    assert valid_entry.source_id == "P01"
    assert valid_entry.rows == 100

    # Invalid source_id
    with pytest.raises(ValidationError):
        Entry(
            source_id="invalid",
            file="data/raw/test.csv",
            origin_url="https://example.com",
            acquisition="manual",
            retrieved_at="2026-10-09",
            sha256="a" * 64,
        )

    # Invalid sha256 (not 64 hex chars)
    with pytest.raises(ValidationError):
        Entry(
            source_id="P01",
            file="data/raw/test.csv",
            origin_url="https://example.com",
            acquisition="manual",
            retrieved_at="2026-10-09",
            sha256="abc",
        )


def test_manifest_upsert_and_save(tmp_path: Path):
    manifest_file = tmp_path / "manifest.json"
    manifest = Manifest.load(manifest_file)
    assert len(manifest.entries) == 0

    entry1 = Entry(
        source_id="P01",
        file="data/raw/anp/ca-2026-01.csv",
        origin_url="https://example.com",
        acquisition="manual",
        retrieved_at="2026-10-09",
        sha256="a" * 64,
    )
    is_new, _ = manifest.upsert_entry(entry1)
    assert is_new is True
    assert len(manifest.entries) == 1

    manifest.save(manifest_file)
    assert manifest_file.exists()

    # Reload from disk
    reloaded = Manifest.load(manifest_file)
    assert len(reloaded.entries) == 1
    assert reloaded.entries[0].source_id == "P01"

    # Update existing entry with new sha
    entry1_updated = Entry(
        source_id="P01",
        file="data/raw/anp/ca-2026-01.csv",
        origin_url="https://example.com",
        acquisition="manual",
        retrieved_at="2026-10-10",
        sha256="b" * 64,
    )
    is_new2, _msg = manifest.upsert_entry(entry1_updated)
    assert is_new2 is False
    assert len(manifest.entries) == 1
    assert manifest.entries[0].sha256 == "b" * 64


def test_inspect_csv(tmp_path: Path):
    sample_csv = tmp_path / "sample.csv"
    sample_csv.write_text(
        "Data da Coleta;Produto;Valor de Venda\n"
        "02/01/2026;DIESEL;6,50\n"
        "15/03/2026;DIESEL;6,60\n"
        "30/06/2026;DIESEL;6,70\n",
        encoding="utf-8",
    )

    sha = compute_sha256(sample_csv)
    assert len(sha) == 64

    rows, date_range = inspect_csv(sample_csv)
    assert rows == 3
    assert date_range == ["2026-01-02", "2026-06-30"]


def test_register_cli_dry_run(tmp_path: Path):
    sample_csv = tmp_path / "test_data.csv"
    sample_csv.write_text(
        "Date,Price\n2026-01-01,75.0\n2026-02-01,78.0\n", encoding="utf-8"
    )
    manifest_file = tmp_path / "manifest.json"

    ret = register_main(
        [
            "--source",
            "P04",
            "--origin-url",
            "https://eia.gov",
            "--file",
            str(sample_csv),
            "--manifest",
            str(manifest_file),
            "--dry-run",
        ]
    )
    assert ret == 0
    assert not manifest_file.exists()


def test_register_cli_execution(tmp_path: Path):
    sample_csv = tmp_path / "test_data.csv"
    sample_csv.write_text(
        "Date,Price\n2026-01-01,75.0\n2026-02-01,78.0\n", encoding="utf-8"
    )
    manifest_file = tmp_path / "manifest.json"

    ret = register_main(
        [
            "--source",
            "P04",
            "--origin-url",
            "https://eia.gov",
            "--file",
            str(sample_csv),
            "--manifest",
            str(manifest_file),
        ]
    )
    assert ret == 0
    assert manifest_file.exists()

    content = json.loads(manifest_file.read_text(encoding="utf-8"))
    assert content["schema_version"] == 1
    assert len(content["entries"]) == 1
    assert content["entries"][0]["source_id"] == "P04"
    assert content["entries"][0]["rows"] == 2
    assert content["entries"][0]["date_range"] == ["2026-01-01", "2026-02-01"]
