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

1. `.specify/org/` exists (run `/speckit-company.init` first).
2. The role-id matches `^[a-z0-9][a-z0-9-]*$`.

## Steps

### Step 0: Load spec (if available)

Check for `.specify/org/specs/<role>.md`. If it exists:

1. Read it and confirm: "I found a spec for `<role>`. I'll use it as the baseline."
2. Pre-fill the wizard fields from the spec:
   - **Persona body** — synthesize from Purpose, Domain, Operating Principles, and Escalation Logic
   - **reports_to** — from spec frontmatter or Escalation table
   - **skills** — from spec Skills section
   - **env** — credential env vars from Required Infrastructure table
   - **setup** — infer from infrastructure (e.g. `pip install` for private packages)
   - **capabilities** — from Required Capabilities table
3. Present each pre-filled value. Let the user confirm or override before writing.

If no spec exists, run the wizard from scratch (Step 1 onward).

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
- **nix_packages**: space-separated list of nixpkgs attribute names that will be installed into this agent's Docker image. Examples: `git python311 nodejs_22 gh ripgrep`. If unsure of the package name, suggest searching https://search.nixos.org/packages. Leave empty if the agent only uses built-in tools.
- **tools.mcp**: comma-separated names of MCP servers (e.g. `company-ops`, `github`).
- **capabilities**: pick from the known taxonomy. Default-deny: anything not listed is forbidden. Categories: `filesystem`, `shell`, `network`, `code`, `secrets`, `payment`, `account`. See [taxonomy](../templates/agent.md) for sub-tags.
- **env** (required environment variables): Ask explicitly: *"Does this agent need any environment variables, API tokens, or credentials at runtime?"* For each:
  - `name`: variable name (e.g. `GITHUB_TOKEN`, `OPENAI_API_KEY`, `SERVICE_URL`)
  - `description`: what it is used for
  - `secret: true` if it contains credentials/tokens (stored in the runtime vault, never plain text)
  - `required: true/false`
  If none needed, write `env: []`.
- **setup** (one-time initialization): Ask explicitly: *"Does this agent need any software installed or repos cloned before it can run its first task?"* Examples: installing a private Python package, cloning a private repo, setting up a virtualenv. Write as a list of shell commands. Use `${ENV_VAR}` syntax to reference env vars declared above.
  If none needed, write `setup: []`.

### Step 2.5: Catalog resolution

After collecting `tools.mcp`, `tools.binaries`, `skills`, and `nix_packages` in Step 2, resolve each declared reference against the catalog before writing the agent file.

**Resolve catalog dir** the same way as `/speckit-company.catalog`: read `.specops/config.json` for `catalog.path`, default `<haex-corp>/catalog/`.

For each declared entry:

| Field | Catalog dir | Catalog file pattern |
|---|---|---|
| `tools.mcp[]` | `catalog/tools/` | `<id>.yml` |
| `skills[]` | `catalog/skills/` | `<id>.md` |

`nix_packages[]` are nixpkgs attribute names — they are **not** catalog references and do not need resolution here. `tools.binaries` is deprecated — use `nix_packages` instead.

For each declared ID that has **no matching catalog file**:

1. Announce: "The <kind> `<id>` is referenced by this agent but has no catalog entry yet."
2. Ask: "Create a catalog entry for `<id>` now?"
   - **Yes** → run the inline wizard for that catalog kind (same prompts as `add <kind> <id>` in `/speckit-company.catalog`). Write the file before continuing.
   - **No / Skip** → note the gap in a warning at the end: "Warning: `<id>` is undeclared in the catalog — run `/speckit-company.catalog add <kind> <id>` later."

If all declared references are satisfied, confirm: "All catalog references resolved."

### Step 3: Status

Default `status: active`. Offer to set `pending_retire` if the user is draining a role.

### Step 4: Write file

Render `.specify/org/agents/<role>.md` with the frontmatter and persona body. Preserve existing body if editing.

### Step 5: Validate

Run `node <ext>/scripts/validate.mjs .specify/org`. Report findings.

### Step 6: Update org chart

Update `.specify/org/org-chart.md` to reflect the current agents and their `reports_to` relationships.

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
