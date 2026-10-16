"""Experimental Janus runner: read-only and intentionally bounded."""
import json
import os
import pathlib
import re
import subprocess
import tempfile
import urllib.request
from datetime import datetime, timezone

BASE = os.environ["NEXUS_API_BASE"].rstrip("/")
KEY = os.environ["NEXUS_API_KEY"]
MODEL = os.environ["NEXUS_MODEL"]
REPO = os.environ["TARGET_REPO"]
ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)

def request_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Nexus-Janus-PoC/1.0"})
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.load(response)

def main():
    # GitHub contents API limits results; download only a small known text file.
    root = request_json("https://api.github.com/repos/" + REPO)
    if root.get("private"):
        raise RuntimeError("Only public repositories are supported")
    branch = root["default_branch"]
    tree = request_json("https://api.github.com/repos/" + REPO + "/git/trees/" + branch + "?recursive=1")
    allowed = (".py", ".js", ".ts", ".go", ".rs")
    candidates = [x for x in tree.get("tree", []) if x.get("type") == "blob"
                  and x.get("path", "").endswith(allowed)
                  and x.get("size", 0) <= 12000
                  and not any(p in x["path"].lower() for p in ("/test", "vendor/", "node_modules/", ".github/"))]
    if not candidates:
        raise RuntimeError("No small source file for this controlled initial test")
    sample = candidates[0]
    raw_url = "https://raw.githubusercontent.com/" + REPO + "/" + branch + "/" + sample["path"]
    with urllib.request.urlopen(urllib.request.Request(raw_url, headers={"User-Agent":"Nexus-Janus-PoC"}), timeout=20) as response:
        source = response.read(12001)
    if len(source) > 12000:
        raise RuntimeError("Source too large")
    suffix = pathlib.Path(sample["path"]).suffix
    languages = {".py":"python",".js":"javascript",".ts":"typescript",".go":"go",".rs":"rust"}
    # Config follows Janus's native model schema, with a custom OpenAI-compatible endpoint.
    cfg = {
        "model_type": "OpenAI", "model_id": "gpt-4o",
        "model_args": {"model": MODEL, "base_url": BASE, "api_key": KEY,
                       "temperature": 0, "max_retries": 0, "timeout": 50},
        "token_limit": 8192,
        "model_cost": {"input": 0, "output": 0},
        "input_token_proportion": 0.4,
    }
    # Janus 4.5.4 overwrites the API key with OPENAI_API_KEY internally.
    os.environ["OPENAI_API_KEY"] = KEY
    config_dir = pathlib.Path.home() / ".janus" / "llm"
    config_dir.mkdir(parents=True, exist_ok=True)
    config_file = config_dir / "nexus.json"
    config_file.write_text(json.dumps(cfg), encoding="utf-8")
    config_file.chmod(0o600)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            source_dir = pathlib.Path(tmp) / "src"
            output_dir = pathlib.Path(tmp) / "docs"
            source_dir.mkdir()
            (source_dir / ("sample" + suffix)).write_bytes(source)
            args = ["janus", "document", "--doc-mode", "summary",
                    "--input", str(source_dir), "--output", str(output_dir),
                    "--llm", "nexus", "--language", languages[suffix]]
            # Avoid printing Janus stderr, which could contain provider response content.
            env = os.environ.copy()
            env["OPENAI_API_KEY"] = KEY
            result = subprocess.run(args, capture_output=True, text=True, timeout=120, env=env)
            if result.returncode:
                combined = (result.stderr + "\\n" + result.stdout).lower()
                patterns = [("no such option", "CLI_OPTION"), ("unexpected keyword argument", "MODEL_CONFIG"), ("validationerror", "MODEL_CONFIG"), ("api key", "AUTH_OR_CONFIG"), ("authentication", "AUTH"), ("401", "AUTH"), ("403", "FORBIDDEN"), ("404", "MODEL_OR_ENDPOINT"), ("429", "RATE_LIMIT"), ("connection", "CONNECTION"), ("timed out", "TIMEOUT"), ("token", "TOKEN_LIMIT")]
                category = next((label for needle, label in patterns if needle in combined), "UNKNOWN")
                # Only exception class identifiers: never expose exception messages,
                # URLs, prompts, HTTP response bodies, or credentials.
                exception_types = re.findall(
                    r"(?m)^([A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception|Exit)):", 
                    result.stderr
                )
                exception_type = exception_types[-1].split(".")[-1] if exception_types else "NONE"
                # Common local failures where no provider call should have occurred.
                if "keyerror" in combined:
                    category = "JANUS_CONFIG_KEY"
                if "attributeerror" in combined:
                    category = "JANUS_ATTRIBUTE"
                if "typeerror" in combined:
                    category = "JANUS_TYPE"
                if "traceback" not in combined and category == "UNKNOWN":
                    category = "CLI_OR_PROCESS"
                raise RuntimeError(
                    f"Janus failed: {category}; exception={exception_type}; "
                    f"exit={result.returncode}. Raw provider logs suppressed."
                )
            produced = list(output_dir.rglob("*.json"))
            if not produced:
                raise RuntimeError("Janus did not produce JSON output")
            parsed = json.loads(produced[0].read_text(encoding="utf-8"))
            summaries = parsed.get("outputs", [])
            report = {
                "schema": 1, "status": "experimental", "repository": REPO,
                "branch": branch, "source_file": sample["path"],
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "summary": summaries[:2], "verified": False,
                "notice": "AI-generated interpretation; not a security audit."
            }
            (OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    finally:
        config_file.unlink(missing_ok=True)

if __name__ == "__main__":
    main()
