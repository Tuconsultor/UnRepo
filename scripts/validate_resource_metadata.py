#!/usr/bin/env python3
"""Verify lossless export of editorial resource metadata (no JS execution).

Parses the current one-record-per-line RESOURCE_METADATA object subset. The
parser deliberately fails closed on unfamiliar syntax rather than discarding
unknown fields; future source syntax changes need a reviewed migration.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CATALOG = ROOT / "data" / "catalog.json"
SNAPSHOT = ROOT / "data" / "resource-metadata.json"
START = "const RESOURCE_METADATA={"
END = "\n};\nconst DEFAULT_METADATA"
ENTRY = re.compile(r'^\s*("(?:\\.|[^"\\])*")\s*:\s*(\{.*\})\s*,?\s*$')
KEY = re.compile(r'([,{]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)')


def fail(message: str) -> None:
    raise ValueError(message)


def extract_metadata(text: str) -> dict:
    if text.count(START) != 1:
        fail("RESOURCE_METADATA must occur exactly once")
    start = text.index(START) + len(START)
    end = text.find(END, start)
    if end < 0:
        fail("Missing unchanged metadata/default object boundary")
    records: dict[str, dict] = {}
    for lineno, line in enumerate(text[start:end].splitlines(), start=1):
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        match = ENTRY.fullmatch(line)
        if not match:
            fail(f"Unrecognized metadata record at body line {lineno}")
        url = json.loads(match.group(1))
        if not isinstance(url, str) or not url.startswith(("https://", "http://")):
            fail(f"Invalid resource URL at body line {lineno}")
        if url in records:
            fail(f"Duplicate editorial URL: {url}")
        # Source currently uses JSON string literals, booleans and unquoted
        # property identifiers. Convert identifiers only, never eval JavaScript.
        properties = KEY.sub(r'\1"\2"\3', match.group(2))
        try:
            value = json.loads(properties)
        except json.JSONDecodeError as error:
            fail(f"Non-JSON metadata syntax at line {lineno}: {error}")
        if not isinstance(value, dict) or not value:
            fail(f"Invalid empty metadata at line {lineno}")
        # Detect repeated property names that JSON parsers might otherwise
        # silently overwrite, without assuming which property set is allowed.
        raw_names = re.findall(r'([,{]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:', match.group(2))
        identifiers = [name for _, name in raw_names]
        if len(identifiers) != len(value) or len(set(identifiers)) != len(identifiers):
            fail(f"Duplicate/unrecognized editorial field at line {lineno}")
        if any(type(v) not in (str, bool, int, float, type(None)) for v in value.values()):
            fail(f"Metadata contains unexpected nested/array values at line {lineno}")
        records[url] = value
    return records


def main() -> None:
    source = INDEX.read_text(encoding="utf-8")
    data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    actual = extract_metadata(source)
    if data.get("schema_version") != 1 or data.get("stage") != "shadow_snapshot_not_rendered":
        fail("Missing required v1 shadow status")
    if data.get("source", {}).get("file") != "index.html":
        fail("Invalid source file provenance")
    if data.get("source", {}).get("constant") != "RESOURCE_METADATA":
        fail("Invalid source constant provenance")
    if data.get("resource_count") != len(actual):
        fail(f"Metadata count drift: snapshot={data.get('resource_count')}, HTML={len(actual)}")
    if data.get("records") != actual:
        fail("Shadow metadata values differ from HTML; potential loss or unreviewed edit")
    if len(actual) != len(set(actual)):
        fail("Duplicate editorial URLs")
    urls = {x["canonical_url"].lower().rstrip("/") for x in catalog["resources"]}
    orphans = [url for url in actual if url.lower().rstrip("/") not in urls]
    if orphans:
        fail(f"Metadata with no catalog resource: {orphans[:4]}")
    if len(catalog["resources"]) < 380:
        fail("Catalog unexpectedly shrank")
    print(f"PASS: {len(actual)} editorial records exactly match the embedded source")
    print(f"PASS: every editorial entry references one of {len(urls)} catalog resources")
    print("PASS: no inferred values; existing public HTML remains the runtime source")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
