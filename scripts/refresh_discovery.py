#!/usr/bin/env python3
"""Stage fresh reverse-engineering discoveries for manual curation in UnRepo.

Read an independent public JSON index as *untrusted data*. Never execute source
content, auto-install skills, or automatically promote candidates into Nexus.
Only Python standard library is required.
"""
import datetime as dt
import json
import math
import pathlib
import re
import urllib.request
from collections import defaultdict
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
INDEX = "https://raw.githubusercontent.com/alexgaoth/awesome-reverse-engineered/main/data/entries.json"
CATALOG = ROOT / "index.html"
OUTPUT = ROOT / "data" / "discovery-candidates.json"
MAX_PER_GROUP = 6
MAX_TOTAL = 54
CATEGORIES = {
    "Game Decompilations & Reimplementations": "Juegos y emulación",
    "Devices, IoT & Hardware": "IoT y hardware",
    "Unofficial Web/App API Clients": "APIs no oficiales",
    "AI Tools & LLM Clients": "IA y clientes LLM",
    "Automotive": "Automoción",
    "Firmware & Embedded": "Firmware y embebidos",
    "File Formats": "Formatos cerrados",
    "Network & Wire Protocols": "Protocolos de red",
    "Online Service Revivals": "Servicios revividos",
}

def key_for(url):
    try:
        u = urlsplit(url)
        if u.scheme != "https" or u.hostname != "github.com":
            return None
        parts = [p for p in u.path.split("/") if p]
        return (parts[0] + "/" + parts[1]).lower() if len(parts) >= 2 else None
    except (ValueError, TypeError):
        return None

def main():
    today = dt.datetime.now(dt.timezone.utc)
    content = CATALOG.read_text(encoding="utf-8")
    existing = {key_for(s) for s in re.findall(r'url:\s*"(https?://[^"]+)"', content)}
    req = urllib.request.Request(INDEX, headers={"User-Agent": "UnRepo-Discovery/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        raw = response.read(30_000_001)
    if len(raw) > 30_000_000:
        raise ValueError("Source index exceeds safe 30MB limit; previous shortlist preserved")
    entries = json.loads(raw.decode("utf-8"))
    if not isinstance(entries, list) or len(entries) < 100:
        raise ValueError("Index is empty or unexpectedly structured; previous shortlist preserved")
    found = defaultdict(list)
    for e in entries:
        if not isinstance(e, dict):
            continue
        cat = str(e.get("category") or "")
        if cat not in CATEGORIES or e.get("archived"):
            continue
        url = str(e.get("url") or "")
        key = key_for(url)
        if not key or key in existing:
            continue
        stars = e.get("stars")
        if not isinstance(stars, int) or stars < 25:
            continue
        pushed = str(e.get("pushed") or "")[:10]
        try:
            pushed_day = dt.date.fromisoformat(pushed)
        except ValueError:
            continue
        age = (today.date() - pushed_day).days
        if age < 0 or age > 180:
            continue
        rank = math.log1p(stars) * 2 + (180 - age) / 25
        found[cat].append((rank, {
            "repo": key, "url": "https://github.com/" + key,
            "name": str(e.get("name") or key).strip()[:120],
            "description": str(e.get("desc") or "").strip()[:320],
            "category": cat, "topic": CATEGORIES[cat],
            "stars_in_source": stars,
            "license_in_source": (str(e.get("license"))[:80] if e.get("license") else None),
            "last_push_in_source": pushed,
            "archived_in_source": False,
            "status": "needs_review",
        }))
    # Balanced topical slate, not merely a popularity leaderboard.
    candidates = []
    for cat in CATEGORIES:
        candidates.extend(item for _, item in sorted(found[cat], key=lambda t: -t[0])[:MAX_PER_GROUP])
    candidates = candidates[:MAX_TOTAL]
    if not candidates:
        raise ValueError("No matching projects; previous shortlist preserved")
    data = {
        "schema": 1,
        "generated_at": today.isoformat(timespec="seconds"),
        "source": INDEX,
        "method": "curation_queue_not_auto_import",
        "scope_note": "External index has its own editorial exclusions; discoveries are not a comprehensive security inventory.",
        "count": len(candidates),
        "candidates": candidates,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Staged {len(candidates)} candidates from {len(entries)} upstream records, with human review required.")

if __name__ == "__main__":
    main()
