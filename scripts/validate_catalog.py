#!/usr/bin/env python3
"""Validate the v1 shadow catalog against the existing embedded Nexus inventory.

Only Python standard library; reads local files and never executes scraped or cataloged code.
This is an integrity check, not a claim that external resources work.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys
from urllib.parse import urlsplit, urlunsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CATALOG = ROOT / "data" / "catalog.json"
SCHEMA = ROOT / "data" / "catalog.schema.json"
ATTRIBUTES = ("title", "desc", "url", "category", "icon", "tag", "evalType")
FIELD_RE = re.compile(
    r'\\b(' + "|".join(ATTRIBUTES) + r')\\s*:\\s*("(?:\\\\.|[^"\\\\])*")'
)
RESOURCE_REQUIRED = {
    "id", "title", "canonical_url", "source_url", "source_type", "category",
    "tags", "description", "capabilities", "use_cases", "prerequisites",
    "technical_level", "language", "access_model", "license", "repository_status",
    "first_seen_at", "last_verified_at", "evidence_urls", "limitations",
    "usage_notice", "related_resource_ids", "verification_status", "legacy_ui",
}


def fail(message: str) -> None:
    raise ValueError(message)


def canonical(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username:
        fail(f"Invalid catalog URL: {url!r}")
    host = parsed.hostname.lower()
    if parsed.port:
        host += ":" + str(parsed.port)
    path = parsed.path.rstrip("/")
    if host == "github.com":
        segments = path.split("/")
        if len(segments) >= 3:
            segments[1] = segments[1].lower()
            segments[2] = segments[2].lower()
        path = "/".join(segments)
    return urlunsplit((parsed.scheme.lower(), host, path, parsed.query, ""))


def read_inline() -> list[dict]:
    html = INDEX.read_text(encoding="utf-8")
    prefix = "const resourcesData = ["
    if prefix not in html:
        fail("Missing source array resourcesData")
    source = html.split(prefix, 1)[1].split("];", 1)[0]
    records = []
    for line in source.splitlines():
        if not re.match(r"\\s*\\{\\s*title:", line):
            continue
        fields = {
            match.group(1): json.loads(match.group(2))
            for match in FIELD_RE.finditer(line)
        }
        if not set(ATTRIBUTES[:-1]).issubset(fields):
            fail("Source record has unrecognized syntax; do not silently discard it")
        records.append(fields)
    if not records:
        fail("No source catalog resources found")
    return records


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        fail("Missing JSON Schema declaration")
    if catalog.get("schema_version") != 1 or catalog.get("stage") != "shadow_snapshot_not_rendered":
        fail("Unexpected catalog schema version or migration stage")
    if catalog.get("source", {}).get("file") != "index.html":
        fail("Catalog source lineage missing")
    actual = catalog.get("resources")
    if not isinstance(actual, list) or catalog.get("resource_count") != len(actual):
        fail("resource_count is inconsistent with the JSON array")
    expected = read_inline()
    if len(expected) != len(actual):
        fail(f"Source/export count mismatch: {len(expected)} != {len(actual)}")
    ids: set[str] = set()
    canonical_urls: set[str] = set()
    known_ids = {row["url"] for row in expected}
    for index, (old, new) in enumerate(zip(expected, actual), start=1):
        if not isinstance(new, dict) or set(new) != RESOURCE_REQUIRED:
            fail(f"Record {index} has missing or unexpected schema v1 fields")
        for target, original in (
            ("id", "url"), ("canonical_url", "url"), ("source_url", "url"),
            ("title", "title"), ("description", "desc"), ("category", "category")
        ):
            if new[target] != old[original]:
                fail(f"Record {index} differs in {target}; migration could lose data")
        if new["tags"] != [old["tag"]]:
            fail(f"Record {index} changed its tag")
        if new["legacy_ui"] != {
            "icon": old["icon"], **({"evalType": old["evalType"]} if "evalType" in old else {})
        }:
            fail(f"Record {index} changed its legacy presentation data")
        if new["verification_status"] != "pending_review":
            fail(f"Record {index} claims an unverified status transition")
        if new["source_type"] != (
            "github_repository" if re.match(r"^https://github\\.com/[^/]+/[^/]+", old["url"], re.I)
            else "website"
        ):
            fail(f"Record {index} changed its source URL type")
        if not isinstance(new["evidence_urls"], list):
            fail(f"Record {index} has invalid evidence_urls")
        if not isinstance(new["related_resource_ids"], list):
            fail(f"Record {index} has invalid related IDs")
        if any(ref not in known_ids for ref in new["related_resource_ids"]):
            fail(f"Record {index} references a missing related resource")
        url_key = canonical(new["canonical_url"])
        if url_key in canonical_urls:
            fail(f"Duplicate canonical URL: {url_key}")
        if new["id"] in ids:
            fail(f"Duplicate stable ID: {new['id']}")
        canonical_urls.add(url_key)
        ids.add(new["id"])
    if len(expected) < 375:
        fail(f"Baseline inventory fell below 375: {len(expected)}")
    print(f"PASS: {len(actual)} shadow resources match the embedded catalog exactly")
    print(f"PASS: {len(ids)} stable favorites IDs and {len(canonical_urls)} unique canonical URLs")
    print("PASS: no source items or legacy presentation fields were lost")
    print("NOTE: public browser behavior and external resource accessibility are NOT checked here")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
