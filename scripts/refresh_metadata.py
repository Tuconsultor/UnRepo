"""Refresh static GitHub repository metadata used by UnRepo.
Requires only the Python standard library and a GITHUB_TOKEN-compatible GH_TOKEN.
Runs in GitHub Actions; keeps last known values on transient API failures.
"""
import datetime as dt
import json
import os
import pathlib
import re
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGE = ROOT / "index.html"
OUTPUT = ROOT / "data" / "github-metadata.json"
PATTERN = re.compile(r'url:\s*"(https://github\.com/([^/"?#]+)/([^/"?#]+))"', re.I)
TOKEN = os.environ.get("GH_TOKEN", "")

def load_existing():
    try:
        data = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return data.get("repos", {})
    except (OSError, ValueError, TypeError):
        return {}

def fetch(repo):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "UnRepo-Metadata-Curator",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if TOKEN:
        headers["Authorization"] = "Bearer " + TOKEN
    request = urllib.request.Request("https://api.github.com/repos/" + repo, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                payload = json.load(response)
            lic = payload.get("license") or {}
            return {
                "stars": payload.get("stargazers_count"),
                "updated_at": payload.get("pushed_at"),
                "archived": payload.get("archived"),
                "license": lic.get("spdx_id") if lic.get("spdx_id") not in (None, "NOASSERTION") else None,
                "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            }
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429) and attempt < 2:
                delay = min(int(exc.headers.get("Retry-After", "8") or "8"), 30)
                time.sleep(delay)
            elif exc.code >= 500 and attempt < 2:
                time.sleep(2 ** attempt)
            else:
                print(f"ERROR {repo}: HTTP {exc.code}")
                return None
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                print(f"ERROR {repo}: {exc}")
                return None
    return None

def main():
    source = PAGE.read_text(encoding="utf-8")
    names = sorted({f"{owner}/{name}" for _, owner, name in PATTERN.findall(source) if owner and name})
    existing = load_existing()
    result = {}
    success = 0
    for repo in names:
        item = fetch(repo)
        if item is not None:
            result[repo.lower()] = item
            success += 1
        elif repo.lower() in existing:
            result[repo.lower()] = existing[repo.lower()]
        time.sleep(0.06)
    if not names:
        raise SystemExit("No GitHub repository URLs found: refusing to overwrite cache")
    if success == 0:
        raise SystemExit("All API requests failed: preserving existing cache")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"schema": 1, "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "repos": result}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Saved {success}/{len(names)} live results; {len(result)-success} retained from cache.")

if __name__ == "__main__":
    main()
