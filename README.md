# ModelRadar — LLM deprecation check for CI

**Scan your codebase for deprecated and retiring LLM model IDs — and fail the
build before a model you depend on disappears.**

Providers retire models on their own schedule. If your code hardcodes a model
ID, you usually find out when production breaks. This catches it in CI instead.

Part of [ModelRadar](https://modelradar.embervalue.com). Lifecycle data comes
from the open
[modelradar-data](https://github.com/alexanderkatsovych/modelradar-data)
dataset (CC BY 4.0).

## GitHub Action

Add this workflow — it fails the build when your code uses a model scheduled to
retire within 90 days:

```yaml
name: ModelRadar
on: [push, pull_request]
jobs:
  llm-deprecation-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: alexanderkatsovych/modelradar-cli@v1
```

With options:

```yaml
      - uses: alexanderkatsovych/modelradar-cli@v1
        with:
          path: ./src      # directory to scan (default: .)
          max-days: '60'   # fail if a model retires within N days (default: 90)
          strict: 'true'   # also fail on deprecated models (default: false)
```

## CLI

```bash
npx github:alexanderkatsovych/modelradar-cli scan [path]
```

Options: `--max-days=90` · `--strict` · `--json`

### Example

```
ModelRadar — scanned 214 file(s) in ./src

  RETIRED     gpt-4-32k   already retired → openai/gpt-4o
    src/llm/client.ts
  RETIRING    claude-3-opus-20240229   retires 2026-07-30 — 41 days left
    src/agents/research.ts
  ok          gpt-4o   active

✖ 2 model(s) need attention.
```

Exit code `1` means action is needed — wire it straight into CI.

## How it works

Zero dependencies. It fetches the open model dataset over HTTPS, then walks your
source files locally and matches model IDs only where they appear as real
string values — so prose and URLs don't trigger false alarms. **Your code is
never uploaded anywhere.**

## License

MIT — see [LICENSE](LICENSE).
