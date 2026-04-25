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
- `firma-ops` MCP server with five tools: `dispatch_to_agent`, `read_artifact`, `ask_user`, `escalate`, `query_org_chart`.
- HTTP backend (`http-backend.mjs`) for routing CEO tool calls to a live haex-corp runtime via configurable `FIRMA_OPS_BASE_URL` / `FIRMA_OPS_PROJECT` env.
- Documentation: `docs/INSTALL.md` (production + dev install, Hermes setup, troubleshooting), `docs/concepts.md` (spec hierarchy, capabilities, autonomy, worktree isolation, retirement).
- 35 unit + acceptance tests, all green. TDD throughout: tests written before implementation for validator, renderer, and HTTP backend.
