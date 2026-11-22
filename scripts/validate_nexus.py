#!/usr/bin/env python3
"""Static smoke checks for UnRepo Nexus. No external calls or secrets required."""
from __future__ import annotations
import json
import pathlib
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGES = ["index.html", "rea-roadmap.html", "intelligence.html", "resiliencia-agentes.html", "soporte-remoto-windows.html", "silicon-lab.html", "space-lab.html"]
REQUIRED_IDS = {
    "sidebar", "brand", "navigation", "main", "menuBtn", "favToggle",
    "totalStat", "categoryStat", "savedStat", "search", "category", "tag",
    "level", "license", "sort", "activeFilters", "catalog", "loadMore",
    "nexusSecret", "nexusSecretClose",
}
REQUIRED_TEXT = (
    'id="nexusSecret"', 'sequence === "xus"', 'taps === 5',
    'const CATEGORY_NAMES=', 'const RESOURCE_METADATA=', 'loadGithubMetadata()',
    'rea-roadmap.html', 'intelligence.html', 'silicon-lab.html', 'space-lab.html',
)
URL_PATTERN = re.compile(r'\burl:\s*"(https?://[^"]+)"', re.I)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = []
        self.local_links = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if d.get("id"):
            self.ids.append(d["id"])
        if tag in {"a", "link", "script", "img"}:
            dest = d.get("href") or d.get("src") or ""
            if dest.startswith("./"):
                self.local_links.append(dest.split("#", 1)[0].split("?", 1)[0])


def fail(message):
    raise RuntimeError(message)


def main():
    pages = {}
    for path in PAGES:
        file = ROOT / path
        if not file.is_file():
            fail(f"Missing page: {path}")
        raw = file.read_text(encoding="utf-8")
        page = PageParser()
        page.feed(raw)
        dup_ids = sorted({x for x in page.ids if page.ids.count(x) > 1})
        if dup_ids:
            fail(f"{path}: duplicate element IDs: {dup_ids}")
        for rel in page.local_links:
            target = ROOT / rel
            if target.is_dir():
                target = target / "index.html"
            if not target.is_file():
                fail(f"{path}: broken local file path: {rel}")
        scripts = re.findall(r'<script\b[^>]*>(.*?)</script\s*>', raw, re.I | re.S)
        for n, script in enumerate(scripts, start=1):
            if not script.strip():
                continue
            with tempfile.TemporaryDirectory() as tmp:
                code = pathlib.Path(tmp) / f"inline-{n}.js"
                code.write_text(script, encoding="utf-8")
                check = subprocess.run(["node", "--check", str(code)],
                                       capture_output=True, text=True)
                if check.returncode:
                    fail(f"{path}: JavaScript syntax error: {check.stderr[:500]}")
        pages[path] = (raw, page)
        print(f"PASS {path}: {len(page.ids)} IDs, {len(scripts)} inline scripts")

    asset = ROOT / "assets" / "social" / "unrepo-icon-2026.png"
    if not asset.is_file():
        fail("Missing shared social image: assets/social/unrepo-icon-2026.png")
    index, parsed = pages["index.html"]
    missing = sorted(REQUIRED_IDS - set(parsed.ids))
    if missing:
        fail(f"Nexus missing UI controls: {missing}")
    for text in REQUIRED_TEXT:
        if text not in index:
            fail(f"Nexus missing behavior or route: {text}")
    if "https://tuconsultor.github.io/UnRepo/assets/social/unrepo-icon-2026.png" not in index:
        fail("Social metadata URL does not match published icon asset")
    if "banxian888.vip" in index.lower():
        fail("Unverified high-risk domain is publicly indexed")
    urls = URL_PATTERN.findall(index)
    if len(urls) < 375:
        fail(f"Catalogue unexpectedly shrank: {len(urls)}")
    canonical = [url.lower().rstrip("/") for url in urls]
    if len(canonical) != len(set(canonical)):
        fail("Duplicate resource URLs in Nexus catalogue")
    if any(urlsplit(url).scheme not in ("https", "http") for url in urls):
        fail("Unexpected URL scheme in resource catalogue")
    for url in (
        "https://github.com/openai/plugins",
        "https://github.com/gastownhall/beads",
        "https://academy.claude.com/",
        "https://github.com/diggerhq/opencomputer",
        "https://github.com/ysunyang4/Nexus",
        "https://github.com/facebookresearch/demucs",
        "https://github.com/facebookresearch/audiocraft",
        "https://github.com/SWivid/F5-TTS",
        "https://github.com/audacity/audacity",
        "https://github.com/KDE/kdenlive",
        "https://github.com/olive-editor/olive",
        "https://github.com/Breakthrough/PySceneDetect",
        "https://github.com/Zulko/moviepy",
        "https://github.com/SubtitleEdit/subtitleedit",
        "https://github.com/k4yt3x/video2x",
        "https://github.com/HandBrake/HandBrake",
        "https://github.com/obsproject/obs-studio",
    ):
        if url not in urls:
            fail(f"Missing newly curated resource: {url}")
    for category in ('sound:"Sonido y posproducción"', 'editing:"Montaje y edición"', 'delivery:"Exportación y emisión"'):
        if category not in index:
            fail(f"Missing audiovisual category: {category}")
    if "ARCHIVADO / Sin mantenimiento" not in index or "ALFA / Inestable" not in index:
        fail("Missing archived/alpha warning labels")
    if "CC-BY-NC-4.0 (pesos)" not in index or "CC-BY-NC (modelos preentrenados)" not in index:
        fail("Missing noncommercial audio-model license warnings")
    if '<footer class="footer">' not in index or "<!--<a" in index:
        fail("Malformed footer reintroduced")
    guide, _ = pages["rea-roadmap.html"]
    if "Prompt base de investigación" not in guide:
        fail("REA learning page content missing")
    metadata_path = ROOT / "data/github-metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("schema") != 1 or not isinstance(metadata.get("repos"), dict):
        fail("Invalid GitHub metadata JSON schema")
    keys = {f"{m.group(2)}/{m.group(3)}".lower() for m in
            re.finditer(r'url:\s*"(https://github\.com/([^/"?#]+)/([^/"?#]+))"', index, re.I)}
    uncovered = sorted(keys - set(metadata["repos"]))
    if uncovered:
        print(f"INFO: {len(uncovered)} new GitHub repos pending metadata refresh")
    print(f"PASS: {len(urls)} unique resources, {len(keys)} GitHub repos, "
          f"{len(metadata['repos'])} cached records")
    print("PASS: static validation complete (this is not a live browser test)")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
