# Nexus Intelligence Lab — Experimental

This branch contains a provider-neutral analyzer, NOT an installed local LLM.
The active workflow is `.github/workflows/janus-intelligence.yml`.
It executes `janus-worker/multi_analyze.py` with Python 3.11 standard library and
APInex chat completions. The previous Janus experiment (`analyze.py`) is
retained for historical reference and is not called by this workflow.

## Current hard controls

- Manual `workflow_dispatch` only. No schedule and no automatic publishing to main.
- Allowed target: public GitHub `owner/repo`, repo size <= 100 MB (GitHub size units).
- Up to 3 source files; each 100–4,500 bytes, from a restricted extension allowlist.
- Up to 3 API requests per run.
- Estimated input tokens capped at 8,000 per run. Estimate = UTF-8 bytes / 3 plus request overhead.
- Output `max_tokens` = 500 per call, so <= 1,500 requested output tokens in aggregate.
- Each API request times out after 55 seconds; job limit 20 minutes.
- The estimate is NOT provider tokenization, billing enforcement, or proof of zero price.
- Error responses are never printed verbatim; API key is a GitHub Actions secret.
- Reports refer to a fixed Git commit and file blob SHAs and are AI-generated, unverified.

## Setup and run

Rotate any API key that has appeared in chats or public places. Add a fresh
`NEXUS_LLM_API_KEY` under GitHub repository Settings > Secrets and variables > Actions.
Select the `feature/janus-intelligence` branch from the workflow Run menu.
The default model is `free/glm-5.3-flash`, whose free-tier limits are controlled by APInex.

Before API calls, the workflow runs Python syntax checks, offline budget tests,
JavaScript syntax checks, and Node UI smoke tests for schema 1 and schema 2.
On success, download the `nexus-intelligence-report` artifact, containing
`report.json` with `schema: 2` and per-file analysis.

## UI and release

The `intelligence.html` experimental page loads
`data/intelligence/latest.json` and supports both the old schema 1 and new
schema 2. The existing `latest.json` is a real **single-file** fixture.
The multi-file artifact is **not automatically published** to that path.
Review and redact the new report before publishing it as `latest.json`.
This preserves read-only GitHub permissions and prevents unreviewed model
content from becoming public automatically.

A green GitHub Actions run is a test success, not a security audit or proof
of a deployed GitHub Pages preview. The published site remains on main until
reviewed and merged.
