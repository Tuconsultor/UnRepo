"""Weekly bounded candidate analysis; never publishes model output to the live site."""
import json
import os
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "janus-worker" / "weekly_repos.json"
DEST = ROOT / "data" / "intelligence" / "candidates"
MAX_REPOS = 5

def main():
    repos = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    if not isinstance(repos, list) or not 1 <= len(repos) <= MAX_REPOS:
        raise RuntimeError("CONFIG: only one to five weekly repositories")
    if len(set(repos)) != len(repos):
        raise RuntimeError("CONFIG: duplicate repositories")
    DEST.mkdir(parents=True, exist_ok=True)
    results = []
    for i, name in enumerate(repos):
        if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", name):
            raise RuntimeError("CONFIG: invalid repository in list")
        env = dict(os.environ, TARGET_REPO=name)
        # Each subprocess applies its own maximum of 3 calls and 8,000 input tokens (estimated).
        command = [sys.executable, str(ROOT / "janus-worker" / "multi_analyze.py")]
        try:
            process = subprocess.run(command, env=env, capture_output=True, text=True, timeout=240)
        except subprocess.TimeoutExpired:
            results.append({"repository": name, "status": "timeout"})
            continue
        if process.returncode:
            # Never print provider response or sensitive stderr.
            results.append({"repository": name, "status": "failed"})
            continue
        report = json.loads((ROOT / "janus-worker" / "output" / "report.json").read_text())
        if report.get("repository") != name or report.get("schema") != 2:
            raise RuntimeError("REPORT: output mismatch")
        filename = name.replace("/", "--") + ".json"
        (DEST / filename).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        results.append({"repository": name, "status": "draft_generated", "file": filename})
        print(f"Candidate {i+1}/{len(repos)} generated.")
    (DEST / "weekly-index.json").write_text(json.dumps({
        "review_required": True, "automatic_publication": False, "results": results
    }, indent=2) + "\n")
    successful = sum(r["status"] == "draft_generated" for r in results)
    print(f"Weekly batch complete: {successful}/{len(repos)} reports; maximum {len(repos)*3} provider calls.")
    if not successful:
        raise RuntimeError("BATCH: no candidates generated")

if __name__ == "__main__":
    main()
