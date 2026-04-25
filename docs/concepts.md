# Concepts

## A spec-driven multi-agent company

A "company" is a declarative description of an AI team that handles incoming tasks. The same machinery scales from "build me a feature" workflows (finite mode) to long-running autonomous operations like a trading firm or content pipeline (continuous mode).

Three nested specs:

```
.specify/org/                      ← Org-Spec (rare changes)
├── constitution.md                  business purpose, mode, autonomy, budget
├── agents/<role>.md                 one file per role: persona + tools + caps
└── org-chart.md                     auto-rendered Mermaid diagram

.specify/specs/<feature>/          ← Product-Spec (per feature)
├── constitution.md                  project-wide rules ("every public API has a unit test")
├── spec.md / plan.md / tasks.md    standard spec-kit artefacts

.specops/<company>/queue/          ← Task-Spec (transient)
└── <task>.yaml                      one file per incoming task
```

## Two operating modes

| `operating_mode` | Lifecycle | Use case |
|---|---|---|
| `finite` | Queue → process → done | Feature delivery, refactors, audits |
| `continuous` | Endless control-loop with periodic reports | Trading firm, monitoring, research pipeline |

Continuous mode requires `reporting_cadence` (`hourly` / `daily` / `weekly`) — the runtime emits a synthetic report-task on each tick.

## Hierarchy: CEO + reports-to

Every company has a single root agent (the CEO). Workers declare `reports_to: <role>` to form a tree. The CEO is the **only** agent the user talks to; tasks land in the queue and the CEO triages, dispatches, interprets results, and iterates.

When a worker finishes, its result flows back to the dispatching agent (the CEO in the simple case). The CEO is a real reasoning agent — it interprets results, may generate new sub-tasks, may escalate to the user.

## Capabilities — default-deny permission layer

Each agent declares a list of allowed capabilities. Anything not listed is forbidden.

```yaml
capabilities:
  - filesystem:write
  - shell:execute
  - network:http_get
```

Categories:

| Class | Sub-tags (examples) |
|---|---|
| `filesystem` | `read`, `write`, `delete` |
| `shell` | `execute`, `execute_sandboxed` |
| `network` | `http_get`, `http_post`, `any` |
| `code` | `interpret`, `compile`, `run_tests` |
| `secrets` | `read_env`, `read_vault` |
| `payment` | `simulate`, `execute_below_<amount>`, `execute_unrestricted` |
| `account` | `youtube`, `facebook`, `slack`, `github`, `custom_<name>` |

### Sensitive grants always require approval

Even with `task.autonomy: full`, these grants trigger a user-approval gate at every use:

- `payment:execute_unrestricted`
- `secrets:read_vault`
- `network:any`
- any `account:*`

The runtime enforces this via the `capability-gate` module in haex-corp.

## Per-task autonomy

Autonomy is **per-task**, not per-company. The same company can run a brainstorming task interactively in the morning and a maintenance task fully autonomously at night.

```yaml
# .specops/<company>/queue/<task>.yaml
goal: "Build login feature"
autonomy: supervised        # full | supervised | interactive
approval_gates: [spec, plan]
budget: { max_usd: 5.00 }
isolation: worktree
mutates_filesystem: true
```

## Hermes Agent: per-role memory

Every agent is backed by a separate Hermes profile (different `HERMES_HOME` per role). This means:

- The CEO accumulates skills around triage, dispatch, user dialogue.
- The Frontend-Dev accumulates skills around Vue/React/TypeScript.
- The QA Agent accumulates skills around test-design and bug-pattern recognition.

Self-improvement is automatic — Hermes curates its own memory and synthesizes new skills after complex tasks. You don't have to manage it.

## Worktree isolation

When `mutates_filesystem: true`, the runtime creates `<repo>/.worktrees/<task-slug>/` with a dedicated branch (`company/<task-slug>`). Two parallel feature-development tasks can't trip on each other's working files.

For research / read-only tasks, set `isolation: shared` to skip the worktree overhead.

## Central tool, binary & skill catalog

Three categories live in a single shared catalog at `<haex-corp>/catalog/`. Agents reference entries by ID:

```yaml
tools:
  mcp: [github, company-ops]              # → catalog/tools/{github,company-ops}.yml
  binaries: [python3, gh, jq]           # → catalog/binaries/{python3,gh,jq}.yml
skills: [tdd, verification-before-completion]   # → catalog/skills/{tdd,...}.md
```

- **Tools** = MCP servers / custom integrations.
- **Binaries** = system CLIs (`python`, `gh`, `docker`). Two-layer permission: `shell:execute` capability *plus* the binary appears in this list.
- **Skills** = system-prompt seed bodies (markdown). Hand-curated institutional knowledge that gets prepended to the using agent's context.

The validator (`/speckit.company.validate --catalog <dir>`) refuses to start a company that references unknown IDs or that uses a tool/binary without holding the required capabilities. See [docs/catalog.md](catalog.md) for the full schema.

## Editing a company

Everything is a file under `.specify/org/`. Open `agents/<role>.md` in any editor and tweak the persona, tools, capabilities. Re-run `/speckit.company.validate` to confirm consistency. No "redeploy" step.

## Retiring an agent

Set `status: pending_retire` in the agent's frontmatter. The runtime stops dispatching new tasks to that role; in-flight tasks continue. Once in-flight count = 0, the runtime marks the role `retired`. Delete the file (or leave it for history) at your leisure.
