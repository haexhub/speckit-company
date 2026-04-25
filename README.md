# speckit-company

Spec-driven multi-agent companies for [spec-kit](https://github.com/github/spec-kit). Declare a company once — its CEO, its workers, the reports-to graph, capabilities, budgets — and then drop tasks into a queue for the company to execute autonomously.

Every "agent" is a separate [Hermes Agent](https://hermes-agent.nousresearch.com/) profile, so each role accumulates its own memory, skills, and specialization over time.

## Quickstart

```bash
# Inside a spec-kit project:
/speckit.company.init my-company
/speckit.company.charter        # purpose, operating_mode, autonomy, budget
/speckit.company.hire ceo       # mandatory, single point of contact
/speckit.company.hire engineer  # add as many workers as needed
/speckit.company.org-chart      # renders mermaid diagram
/speckit.company.validate       # 0 findings = ready
/speckit.company.start          # hand over to runtime, queue polling begins
```

Then queue tasks:

```bash
echo 'goal: "Build login form"' > .specops/my-company/queue/login.yaml
```

The CEO picks the task up, dispatches it to the relevant worker via the reports-to graph, interprets the result, iterates.

## Concepts

### Three spec layers

| Layer | Path | Frequency |
|---|---|---|
| **Org-Spec** | `.specify/org/{constitution.md, agents/<role>.md, org-chart.md}` | rarely (org changes) |
| **Product-Spec** | `.specify/specs/<feature>/{spec.md, plan.md, tasks.md}` | per feature |
| **Task-Spec** | `.specops/<company>/queue/<task>.yaml` | transient |

### Agent-Spec (immutable after `hire`)

```yaml
---
role: backend-dev
model: claude-sonnet-4-6
runner: hermes
runner_type: ephemeral          # ephemeral | persistent | scheduled
reports_to: cto
skills: [tdd, verification-before-completion]
tools:
  builtin: [Read, Edit, Bash, Grep]
  mcp: [github, firma-ops]
capabilities:                   # default-deny
  - filesystem:write
  - shell:execute
  - network:http_get
status: active                  # active | pending_retire | retired
---
# Persona

You are an experienced backend engineer focused on...
```

### Capability classes (default-deny)

`filesystem:`, `shell:`, `network:`, `code:`, `secrets:`, `payment:`, `account:`. Sensitive capabilities (`payment:execute_unrestricted`, `account:*`) always require user approval at runtime, regardless of the task's autonomy mode.

### Operating modes

- `finite` — goal-oriented (build a feature → done).
- `continuous` — control-loop (e.g. trading firm: research → evaluate → deploy → monitor → report → repeat).

## Documentation

- [docs/INSTALL.md](docs/INSTALL.md) — production + local dev install, Hermes setup, firma-ops env config, troubleshooting.
- [docs/concepts.md](docs/concepts.md) — spec hierarchy, operating modes, capability taxonomy, autonomy, worktree isolation, retirement.

## Requirements

- Node.js 22+
- spec-kit ≥ 0.2.0
- For `start` (runtime): the Hermes Agent CLI installed in `$PATH`.

## Project structure

```
speckit-company/
├── extension.yml          # spec-kit manifest
├── commands/              # slash-command definitions
├── templates/             # spec templates (constitution, agent, task)
├── scripts/               # validate.mjs, render-org-chart.mjs
├── mcp-server/firma-ops/  # CEO's runtime tools (dispatch, ask_user, ...)
└── tests/                 # node:test specs
```

## License

MIT — see [LICENSE](LICENSE).
