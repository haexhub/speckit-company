# Changelog

All notable changes to this extension are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[SemVer](https://semver.org/).

## [Unreleased]

### Added
- Initial scaffold of the `speckit-company` spec-kit extension.
- Slash commands: `init`, `charter`, `hire`, `org-chart`, `validate`, `start`.
- Templates for org constitution, agent spec, task spec, runtime config.
- `validate.mjs`: org-spec consistency check (graph integrity, capability taxonomy, payment-budget link, mode constraints).
- `render-org-chart.mjs`: Mermaid renderer for the reports-to graph with status-based coloring; retired agents are filtered.
- `company-ops` MCP server with five tools: `dispatch_to_agent`, `read_artifact`, `ask_user`, `escalate`, `query_org_chart`.
- HTTP backend (`http-backend.mjs`) for routing CEO tool calls to a live haex-corp runtime via configurable `COMPANY_OPS_BASE_URL` / `COMPANY_OPS_PROJECT` env.
- Documentation: `docs/INSTALL.md` (production + dev install, Hermes setup, troubleshooting), `docs/concepts.md` (spec hierarchy, capabilities, autonomy, worktree isolation, retirement).
- 35 unit + acceptance tests, all green. TDD throughout: tests written before implementation for validator, renderer, and HTTP backend.

### Inkrement 4 — central tool & skill catalog

- New slash command `/speckit.company.catalog` (list, show, add, remove, validate).
- New templates `templates/tool.yml` and `templates/skill.md`.
- `validate.mjs` accepts `--catalog <dir>` and emits three new error codes: `E_UNKNOWN_TOOL_REFERENCE`, `E_UNKNOWN_SKILL_REFERENCE`, `E_TOOL_CAPABILITY_MISSING`.
- `extension.yml` registers the new command.
- `docs/catalog.md` covers the schema, validation rules, and seed-skill vs. Hermes-curated-skill distinction.
- 38 tests green (3 new for catalog validation).

#### Inkrement 4b — binaries as third catalog category

- New catalog category `<haex-corp>/catalog/binaries/<id>.yml` for system-installed CLIs (`python3`, `node`, `pnpm`, `gh`, `git`, `docker`, `curl`, `jq`, `yq`, `rg` shipped as seeds).
- Agent frontmatter `tools.binaries: [...]` is the new binary-whitelist field. Two-layer permission: `shell:execute` capability *plus* the binary appears in the list.
- Validator emits `E_UNKNOWN_BINARY_REFERENCE` and `E_BINARY_CAPABILITY_MISSING`.
- Templates and docs updated. 41 tests green (3 new binary-validation tests).

#### Inkrement 4c — naming consistency + wildcards

- Renamed `firma-ops` MCP server to `company-ops` everywhere (directories, source files, env vars `FIRMA_OPS_*` → `COMPANY_OPS_*`, slash-command references, docs, fixtures, tests). Single naming convention restored: everything is "company".
- Added wildcard support: `tools.mcp: ["*"]`, `tools.binaries: ["*"]`, `skills: ["*"]` expand to all catalog entries. Wildcard is a convenience shortcut and does not bypass capability checks — each expanded entry is still validated against the agent's granted capabilities.
- Mixed wildcard (`["python3", "*"]`) degenerates to a plain wildcard.
- 43 tests green (2 new wildcard-validation tests).

#### Inkrement 4d — minimum-required capability principle for binaries

- Reworked all binary manifests in `<haex-corp>/catalog/binaries/` to declare only the **minimum capabilities to invoke the binary at all**, not the maximum needed for any operation.
- Most binaries (python3, node, pnpm, gh, git, docker, jq, yq) now require only `shell:execute`. Exceptions: `curl` (requires `network:http_get` — HTTP is its entire purpose), `rg` (requires `filesystem:read` — file searching is its entire purpose).
- Use-case-specific capabilities (filesystem:write for `git commit`, network:http_post for `gh pr create`, etc.) move from the binary manifest to the agent's own `capabilities` list — where they belong, because only the agent author knows the use case.
- Result: a single binary manifest now serves read-only and write-mode agents alike. A read-only audit worker can have `binaries: [git]` + `capabilities: [shell:execute, filesystem:read]` and pass validation; a commit-fähig worker adds `filesystem:write`. No over-granting.
- Test for `gh` capability gap rewritten to use `curl` (still has multi-cap requirement). docs/catalog.md updated with a "Minimum-required principle" subsection.
