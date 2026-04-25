# Installing speckit-company

This guide covers two install paths: **production** (via the spec-kit extension catalog) and **local development** (cloning this repo, registering as a local extension in haex-corp).

## Prerequisites

- **Node.js ≥ 22** (uses native `node --test` and ESM).
- **spec-kit ≥ 0.2.0** (for slash-command discovery).
- **Hermes Agent CLI** in `$PATH` ([hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/docs/)) — required only at runtime for `/speckit.company.start`. The spec layer (`init`/`charter`/`hire`/`org-chart`/`validate`) works without Hermes.
- **git** ≥ 2.30 (for worktree-based task isolation).

## Production install

The recommended way is via the spec-kit extension catalog once published:

```bash
# inside any spec-kit project
specify extension install speckit-company
```

This drops the extension into `.specify/extensions/speckit-company/` and exposes the slash commands.

## Local development install

Clone this repo and register it as a local extension in your haex-corp instance. This is what you want if you're modifying speckit-company itself.

```bash
git clone https://github.com/haex/speckit-company.git ~/Projekte/speckit-company
cd ~/Projekte/speckit-company
pnpm install
pnpm test                 # 35 unit + acceptance tests should pass
```

In your haex-corp `.specops/config.json`, add an entry under `localExtensions`:

```json
{
  "localExtensions": [
    {
      "slug": "speckit-company",
      "path": "/home/<you>/Projekte/speckit-company",
      "registeredAt": "<iso-timestamp>"
    }
  ]
}
```

haex-corp's UI will pick it up. Inside any project the extension can then be installed via the project's extension panel (or the equivalent CLI):

```bash
specops extension install speckit-company --local
```

## Runtime install (Hermes)

For `/speckit.company.start` to work, install Hermes locally per the Nous Research instructions. The runtime expects `hermes chat -q` to be invocable on stdin/stdout.

Verify:

```bash
which hermes
echo "say hello" | hermes chat -q
```

Per-agent profile isolation is automatic — speckit-company sets `HERMES_HOME=<project>/.hermes/<role>/` when spawning each agent's Hermes process. No manual profile management needed.

## firma-ops MCP server config

When running with a live haex-corp runtime, set:

```bash
export FIRMA_OPS_BASE_URL="http://127.0.0.1:3000"
export FIRMA_OPS_PROJECT="my-company"
# optional:
export FIRMA_OPS_AUTH_TOKEN="..."
```

Without these, the MCP server falls back to in-process stubs (useful for development).

## Troubleshooting

### "hermes: command not found" when calling `/speckit.company.start`

Hermes isn't on `$PATH`. Install it ([docs](https://hermes-agent.nousresearch.com/docs/)) or pass an explicit path via `.specify/org/company.yml`:

```yaml
hermes_binary: "/usr/local/bin/hermes"
```

### Validate reports `E_PAYMENT_WITHOUT_BUDGET`

An agent declares a `payment:*` capability but `constitution.md` has no `budget`. Either remove the capability or add to your constitution:

```yaml
budget:
  max_usd_per_task: 5.00
  max_usd_per_day: 50.00
```

### Tests fail with "yaml" not found

Run `pnpm install` first. The `yaml` package is a runtime dependency.

### chokidar watcher misses files on Linux

Old `inotify` limits. Bump them:

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/99-watchman.conf
sudo sysctl -p
```
