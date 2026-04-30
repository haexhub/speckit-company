---
description: "Configure operating mode, autonomy, budget, and reporting cadence. Step 4 of the setup workflow."
---

# Company: Governance

Define how the company operates: its runtime behavior, autonomy defaults, spending limits, and reporting schedule. This step configures the operational parameters of the company — business purpose and workflow are defined in the preceding steps.

## User Input

```text
$ARGUMENTS
```

Optional: a key=value pair to override a single field non-interactively, e.g. `operating_mode=continuous`. With no arguments, run the full interactive wizard.

## Prerequisites

1. `.specify/org/constitution.md` exists (created by `/speckit-company.init`).

## Steps

### Step 1: Read existing constitution

Load and parse `.specify/org/constitution.md`. Show the current values.

### Step 2: Wizard

Ask one at a time:

- **Slug** — the company's identifier. Used as directory names and queue paths under `.specops/`. Must match `^[a-z0-9][a-z0-9-]*$`. Cannot be changed after first use without manual file moves — confirm carefully.
- **Operating Mode**: `finite` (goal-oriented queue → done when empty) or `continuous` (endless control-loop — company never stops, only reports).
- **Default Autonomy**: `full` (no user interaction during execution), `supervised` (CEO escalates at decision gates), or `interactive` (CEO asks user freely during tasks).
- **Budget**:
  - `max_usd_per_task` (default 5.00)
  - `max_usd_per_day` (default 50.00)
- **Reporting Cadence**: `on_completion` (default for `finite`), `hourly`, `daily`, or `weekly`. Mandatory when `operating_mode=continuous`.
- **Communication Principles** (optional, free text) — global rules every agent receives as implicit context. Examples: "Always cite sources", "Never delete data without explicit approval", "Prefer functional style."
- **Infrastructure dependencies** — ask: *"Does this company depend on any external systems, private repositories, APIs, or databases?"* For each:
  - `type`: `git_repo` / `api` / `database` / `message_queue` / `other`
  - `url`: endpoint or repo URL
  - `access`: `public` or `private`
  - If `private`: `used_by` (which roles), `credential_env` (env var that provides access)
  - `purpose`: one sentence
  Record under `infrastructure:` in the constitution frontmatter. Used during Hire to pre-fill `env` and `setup`.
  If none, write `infrastructure: []`.

### Step 3: Write back

Update the YAML frontmatter of `.specify/org/constitution.md`. Preserve all body sections.

### Step 4: Validate

Run `node <ext>/scripts/validate.mjs .specify/org`. Report findings. If an error was introduced, point at the offending field and re-prompt.

### Step 5: Confirm

Offer to proceed to `/speckit-company.hire ceo`.

## Notes

- Business purpose belongs in `/speckit-company.vision`, not here. This step covers operational parameters only.
- `operating_mode=continuous` requires `reporting_cadence` — the validator will flag this.
- Budget caps are hard limits at runtime. Tasks exceeding `max_usd_per_task` get escalated to the user; `max_usd_per_day` suspends new dispatches until the next UTC day.
- Infrastructure dependencies collected here are the reference for agent `env:` and `setup:` fields during the Hire step.
