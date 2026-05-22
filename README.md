# ModelRadar CLI &amp; GitHub Action

**Scan your codebase for deprecated and retiring LLM model IDs — and fail CI
before a model you depend on disappears.**

Part of [ModelRadar](https://modelradar.embervalue.com). Model lifecycle data
comes from the open
[modelradar-data](https://github.com/alexanderkatsovych/modelradar-data)
dataset.

## GitHub Action

Add this workflow — it fails the build if your code uses a model scheduled to
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
npx github:alexanderkatsovych/modelradar-cli scan
```

Once published to npm:

```bash
npx modelradar scan [path] [--max-days=90] [--strict] [--json]
```

It walks your source files, finds LLM model IDs (`gpt-4o`, `claude-*`,
`gemini-*`, `grok-*`, and more), checks each against the ModelRadar dataset,
and reports which are **retired**, **retiring soon**, or **deprecated**.
Exit code `1` means action is needed — ideal for CI.

## How it works

Zero dependencies. It fetches the open model dataset over HTTPS and scans your
tree locally — **your code is never uploaded anywhere**.

## License

MIT — see [LICENSE](LICENSE).
