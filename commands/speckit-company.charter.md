---
description: "Define business purpose, operating_mode, default autonomy, budget, and reporting cadence."
---

# Company: Charter

Fill in or update the company's `constitution.md` — the highest-level spec describing what the company is and how it operates.

## User Input

```text
$ARGUMENTS
```

Optional: a key=value pair to override a single field non-interactively, e.g. `operating_mode=continuous`. With no arguments, run the full interactive wizard.

## Prerequisites

1. `.specify/org/constitution.md` exists (created by `/speckit-company.init`).

## Steps

### Step 1: Read existing constitution

Load and parse `.specify/org/constitution.md`. Show the user the current values.

### Step 2: Wizard

Ask, one at a time, for each of:

- **Business Purpose** (free text, ≥ 1 sentence) — the CEO uses this on every task as anchoring context.
- **Operating Mode**: `finite` (goal-oriented queue → done) or `continuous` (endless control-loop with reporting).
- **Default Autonomy**: `full` (no user interaction during execution), `supervised` (CEO escalates at gates), or `interactive` (CEO asks user freely).
- **Budget**:
  - `max_usd_per_task` (default 5.00)
  - `max_usd_per_day` (default 50.00)
- **Reporting Cadence**: `on_completion` (default for `finite`), `hourly`, `daily`, or `weekly`. Mandatory if `operating_mode=continuous`.
- **Communication Principles** (optional, free text) — global rules that every agent receives as implicit context.
- **Infrastructure dependencies**: Ask explicitly: *"Does this company depend on any external systems, private repositories, APIs, or databases?"* For each dependency, collect:
  - `type`: `git_repo` / `api` / `database` / `message_queue` / `other`
  - `url`: the endpoint or repo URL
  - `access`: `public` or `private`
  - If `private`: which agents use it (`used_by`) and what env var provides credentials (`credential_env`)
  - `purpose`: one sentence describing what it is used for
  This information is recorded in the constitution frontmatter under `infrastructure:` and is the reference for configuring agent `env` and `setup` fields during the hire step.
  If none, write `infrastructure: []`.

### Step 3: Write back

Update the YAML frontmatter of `.specify/org/constitution.md`. Preserve the body sections (just replace placeholders or update prose where the user provided new content).

### Step 4: Validate

Run `node <ext>/scripts/validate.mjs .specify/org`. Report findings (errors/warnings/info). If the wizard introduced an error, point at the offending field and re-prompt.

## Notes

- `operating_mode=continuous` is a hard constraint that requires `reporting_cadence` — the validator will flag this.
- Budget caps are **hard limits** at runtime. Tasks exceeding `max_usd_per_task` get escalated to the user; the day-cap suspends new dispatches.
- The constitution body (after frontmatter) is meant to be edited freely — agents read it. Treat it like a company handbook.
