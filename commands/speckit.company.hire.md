---
description: "Hire (or edit) any agent role. Universal for CEO and workers. Idempotent."
---

# Company: Hire

Add a new agent to the company, or edit an existing one. CEO and worker roles use the same flow — the only difference is that the CEO has `reports_to: null`.

## User Input

```text
$ARGUMENTS
```

Expected form: a single role-id (lowercase, hyphenated). Examples: `ceo`, `frontend-dev`, `qa-lead`. With no arguments, prompt the user.

## Prerequisites

1. `.specify/org/` exists (run `/speckit.company.init` first).
2. The role-id matches `^[a-z0-9][a-z0-9-]*$`.

## Steps

### Step 1: Resolve role file

`.specify/org/agents/<role>.md`. If it exists → edit mode (load existing frontmatter as defaults). If not → new mode (load `<ext>/templates/agent.md` as a base).

### Step 2: Wizard

Prompt, in order:

- **Persona** (free text body, second-person voice) — system-prompt for this agent.
- **Model**: e.g. `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`, `gpt-4`, `local:llama3`. Hermes will route through the chosen model.
- **runner_type**: `ephemeral` (spawn per task, default for workers), `persistent` (always-on daemon, default for CEO), `scheduled` (cron-triggered, e.g. monitor/reporter).
- **reports_to**: another role-id, or `null` for the CEO. List existing roles to choose from. Reject self-reference.
- **skills**: comma-separated list of seed skills (Hermes will accumulate more autonomously).
- **tools.builtin**: comma-separated subset of Claude-Code-style tools the agent may use.
- **tools.mcp**: comma-separated names of MCP servers (e.g. `company-ops`, `github`).
- **capabilities**: pick from the known taxonomy. Default-deny: anything not listed is forbidden. Categories: `filesystem`, `shell`, `network`, `code`, `secrets`, `payment`, `account`. See [taxonomy](../templates/agent.md) for sub-tags.

### Step 3: Status

Default `status: active`. Offer to set `pending_retire` if the user is draining a role.

### Step 4: Write file

Render `.specify/org/agents/<role>.md` with the frontmatter and persona body. Preserve existing body if editing.

### Step 5: Validate

Run `node <ext>/scripts/validate.mjs .specify/org`. Report findings.

### Step 6: Re-render org chart

Run `/speckit.company.org-chart` to keep the diagram in sync.

## Sensitive Capabilities

If the user adds any of these, **explicitly warn** that they trigger user-approval at runtime regardless of task autonomy:

- `payment:execute_unrestricted`
- `account:*`
- `secrets:read_vault`
- `network:any`

## Notes

- Re-running `hire <role>` against an existing role is **edit mode** — fields not changed in the wizard are preserved.
- The model is **immutable in spirit**: changing the model resets Hermes' learned skills for this role. Warn the user when changing it.
- `status: pending_retire` makes the agent invisible to new dispatches but lets in-flight tasks finish. After in-flight count = 0, the runtime sets `status: retired` automatically.
