---
description: "Define ingress sources, egress sinks, and quality gates. Step 6 of the setup workflow."
---

# Company: Pipeline

Define where tasks enter the system (ingress), where results are delivered (egress), and what must pass before delivery (quality gates). This is the Input → Processing → Output definition for the company.

## User Input

```text
$ARGUMENTS
```

With no arguments, run the full interactive wizard. Pass a task-slug to edit only that task type's pipeline.

## Prerequisites

1. `.specify/org/roadmap.md` exists — pipeline must align with defined task types.
2. `.specify/org/agents/` exists — at least a CEO is hired.

## Steps

### Step 1: Load context

Read:
- `.specify/org/roadmap.md` — task types to configure pipeline for
- `.specify/org/agents/` — existing roles (for quality gate agent references)
- `.specify/org/pipeline.md` if it exists (edit mode)

### Step 2: Ingress wizard

For each task type in the roadmap, ask how tasks of that type enter the system.

**Available sources:**

| Source | When to use |
|---|---|
| `manual` | User submits tasks directly via CLI or UI |
| `github_issues` | GitHub issues trigger tasks (filter by label, milestone, etc.) |
| `gitlab_issues` | GitLab issues trigger tasks |
| `jira` | Jira tickets trigger tasks |
| `schedule` | Cron-based trigger (e.g. daily at 08:00 UTC) |
| `webhook` | Arbitrary HTTP POST to the company's ingest endpoint |
| `spawned` | Created by another agent within this company (no external config needed) |

For each non-manual, non-spawned source, collect:
- Connection details (repo URL / project ID / board name / cron expression)
- Filter rules (e.g. `label=agent-ready`, `status=In Progress`, `assignee=bot`)
- Credential env var (e.g. `GITHUB_TOKEN`, `JIRA_TOKEN`, `GITLAB_TOKEN`)
- Which agent receives the dispatched task (usually `ceo`)

### Step 3: Egress wizard

For each task type, ask where the result is delivered.

**Available sinks:**

| Sink | When to use |
|---|---|
| `github_pr` | Open a pull request against a target branch |
| `gitlab_mr` | Open a merge request |
| `github_comment` | Post a comment on the originating issue |
| `gitlab_comment` | Post a note on the originating issue |
| `slack_message` | Post to a Slack channel |
| `file_artifact` | Write output to a path in the workspace |
| `report_file` | Write a Markdown/JSON report to `.specops/<slug>/reports/` |
| `manual` | Return result directly to the user (for interactive/CLI use) |

For each non-manual sink, collect:
- Target (repo URL, channel name, output path)
- Credential env var if needed

### Step 4: Quality gates wizard

Ask: *"Before results are delivered via egress, what must pass?"*

For each task type, collect zero or more gates (in execution order):

| Gate | Description |
|---|---|
| `tests_pass` | Automated test suite exits 0 — specify the command (e.g. `pytest tests/`) |
| `lint_pass` | Linter reports no errors — specify the command (e.g. `ruff check .`) |
| `agent_review` | A specific agent role reviews and approves before egress (specify role) |
| `human_review` | A human must approve — blocks until user responds |
| `metric_threshold` | A numeric metric must meet a threshold (e.g. `sharpe_ratio >= 0.5`) — specify how to extract the metric |
| `custom` | A shell command that exits 0 on pass |

If no gates are needed, write `quality_gates: []`.

### Step 5: Write

Write to `.specify/org/pipeline.md`:

```markdown
---
company_id: "{{slug}}"
updated_at: "{{iso_timestamp}}"
---

# Pipeline: {{company_name}}

## {{task-slug}}

### Ingress
- source: github_issues
  url: https://github.com/org/repo
  filter: label=agent-ready
  credential_env: GITHUB_TOKEN
  dispatched_to: ceo

### Egress
- sink: github_pr
  target_branch: main
  credential_env: GITHUB_TOKEN

### Quality Gates
1. tests_pass: pytest tests/
2. human_review
```

### Step 6: Validate credentials

For every credential env var collected, check whether it is already declared in any agent's `env:` field or the constitution `infrastructure:`. List any new ones and suggest adding them to the relevant agent during hire (or re-run `/speckit-company.hire <role>` to add them).

### Step 7: Confirm

Print the file path and offer to proceed to `/speckit-company.validate`.

## Notes

- `manual` ingress + `manual` egress is a valid minimal setup — fully interactive, result returned to the user directly. Good for prototyping before connecting external systems.
- Quality gates run in order. If any gate fails, egress is blocked and the CEO is notified to retry or escalate.
- `human_review` as a gate is compatible with `default_autonomy=full` — it only triggers at the delivery boundary, not during processing.
- Credential env vars collected here must be declared in the relevant agent's `env:` field before the company can start.
