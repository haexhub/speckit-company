# speckit-company

Spec-driven multi-agent companies for [spec-kit](https://github.com/github/spec-kit). Define a company's purpose and workflow once, let the AI derive the agent topology, then hand it over to a runtime that pulls tasks from a queue and executes them autonomously.

Every "agent" is a separate [Hermes Agent](https://hermes-agent.nousresearch.com/) profile — each role accumulates its own memory, skills, and specialization over time. Agents run in per-role Nix-based Docker images built from each agent's `nix_packages` declaration.

## Setup workflow

The extension provides an 8-step guided setup:

| Step | Command | What it produces |
|---|---|---|
| 1 | `vision` | Purpose, success criteria, scope → `vision.md` |
| 2 | `roadmap` | Task types, workflow stages, data flows → `roadmap.md` |
| 3 | `org-design` | AI derives agent topology from roadmap → agents hired |
| 4 | `governance` | Operating mode, autonomy, budget, reporting → `constitution.md` |
| 5 | `hire` | Per-agent config: model, `nix_packages`, capabilities, env, setup |
| 6 | `pipeline` | Ingress sources, egress sinks, quality gates → `pipeline.md` |
| 7 | `validate` | Consistency + completeness check |
| 8 | `start` | Hand off to runtime — CEO activates, queue polling begins |

```bash
# Start from inside a spec-kit project:
/speckit-company.vision     # what does this company exist to do?
```

Vision creates the `.specify/org/` structure on first run — no separate init needed.

After setup, queue tasks:

```bash
echo 'goal: "Build login form"' > .specops/my-company/queue/login.yaml
```

The CEO picks the task up, dispatches it through the agent graph, and reports back when done.

## Agent spec

```yaml
---
role: backtest
model: claude-sonnet-4-6
runner: hermes
runner_type: ephemeral          # ephemeral | persistent | scheduled
reports_to: ceo
nix_packages: [git, python311, docker]   # installed into agent's Docker image
tools:
  builtin: [Read, Write, Bash, Grep]
  mcp: [company-ops]
capabilities:                   # default-deny
  - filesystem:write
  - shell:execute
  - code:execute
env:
  - name: GITHUB_TOKEN
    secret: true
    required: true
setup:
  - "git clone https://github.com/org/repo /tmp/workspace"
status: active
---
# Persona: Backtest Agent

You are a quantitative developer specialised in...
```

## Concepts

### Spec layers

| Layer | Path | Changes |
|---|---|---|
| **Vision** | `.specify/org/vision.md` | rarely |
| **Roadmap** | `.specify/org/roadmap.md` | when workflow evolves |
| **Org** | `.specify/org/{constitution.md, agents/<role>.md}` | when team changes |
| **Pipeline** | `.specify/org/pipeline.md` | when I/O changes |
| **Task** | `.specops/<slug>/queue/<task>.yaml` | per task |

### Capability classes (default-deny)

`filesystem:`, `shell:`, `network:`, `code:`, `secrets:`, `payment:`, `account:`.

Sensitive capabilities (`payment:execute_unrestricted`, `account:*`) always require user approval at runtime regardless of the task's autonomy mode.

### Operating modes

- `finite` — goal-oriented queue, stops when empty.
- `continuous` — endless control-loop (e.g. a trading firm: research → backtest → analyse → report → repeat).

### Nix-based agent images

Each agent declares `nix_packages: [git, python311, ...]` using nixpkg attribute names. The runtime builds a per-agent Docker image from that list at company start. Agents sharing identical packages reuse the same cached image automatically.

## Requirements

- Node.js ≥ 22
- Nix ≥ 2.18 (with flakes enabled)
- spec-kit ≥ 0.2.0
- For `start` (runtime): Hermes Agent CLI in `$PATH`

## Project structure

```
speckit-company/
├── extension.yml          # spec-kit manifest (8 workflow steps)
├── commands/              # slash-command definitions
├── templates/             # spec templates (constitution, agent, vision, roadmap, pipeline)
├── scripts/               # validate.mjs
└── tests/                 # node:test specs
```

## License

MIT — see [LICENSE](LICENSE).
