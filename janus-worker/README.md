# Nexus Janus Intelligence — experimental

This proof of concept runs on GitHub Actions, not on the user's computer.

## Security prerequisite
The API key previously shared in chat must be rotated. Add the NEW key at:
Repository > Settings > Secrets and variables > Actions > New repository secret.
Name: `NEXUS_LLM_API_KEY`.

Never commit API keys or paste them into Actions workflow inputs. The service at
`https://api.apinex.bond/v1` is a third-party gateway; code sent for analysis
will be transmitted to it. Only analyze public code you are authorized to share.

## How to test
1. Open Actions > Nexus Janus Intelligence (experimental).
2. Choose Run workflow on the feature branch.
3. Repository: `janus-llm/janus-llm`; model: exact name supported by the provider (default `deepseek-chat` is unverified).
4. Download `nexus-intelligence-report` from the successful run.

The output is an Actions artifact, NOT automatically published on GitHub Pages.
No workflows run on push and no scheduled spend is enabled.
A real Janus installation and model-compatibility test must succeed before rollout.
The model cost metadata is zero because actual third-party gateway pricing is unknown;
it does not imply free API usage.
