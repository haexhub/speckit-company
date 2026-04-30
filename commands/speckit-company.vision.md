---
description: "Define the company's purpose, success criteria, and scope. Step 1 of the setup workflow."
---

# Company: Vision

Define what this company exists to do, what success looks like, and where its boundaries are.
This is Step 1 of the company setup workflow and the foundation everything else builds on.
The CEO reads this document on every task dispatch to anchor its judgement.

## User Input

```text
$ARGUMENTS
```

Free text description of the company's goal. With no arguments, run the full interactive wizard.
Pass `edit` to open the wizard against an existing vision.

## Prerequisites

None. If `.specify/org/` does not exist, Vision creates it (including `constitution.md` from the extension template) before proceeding. This makes Vision the effective entry point — `/speckit-company.init` is only needed if you want to bootstrap without immediately starting the wizard.

## Steps

### Step 1: Load existing vision

Read `.specify/org/vision.md` if it exists. Show current values and offer to edit individual fields.

### Step 2: Wizard

Ask in order:

- **Business Purpose** (≥ 1 concrete sentence) — what does this company do? What problem does it solve or value does it create? Vague answers invite follow-up: "maximize alpha on equity momentum strategies" is better than "do trading."
- **Success Criteria** (2–4 bullet points) — how do you know the company is working? Be specific and measurable: "backtest Sharpe ≥ 0.5 on out-of-sample data" beats "strategies are good."
- **Scope & Boundaries** (optional) — what is explicitly *out of scope*? What should this company never do, touch, or decide autonomously?

### Step 3: Write

Write to `.specify/org/vision.md`:

```markdown
---
company_id: "{{slug}}"
updated_at: "{{iso_timestamp}}"
---

# Vision: {{company_name}}

## Business Purpose

{{purpose}}

## Success Criteria

{{criteria_as_bullets}}

## Scope & Boundaries

{{boundaries}}
```

### Step 4: Confirm

Print the path and offer to proceed to `/speckit-company.roadmap`.

## Notes

- The vision document is read by the CEO on every task dispatch. Keep the Business Purpose concrete and under 3 sentences.
- Vision can be updated at any time. Changes take effect on the next task dispatch — no restart needed.
- Infrastructure dependencies (private repos, APIs) are collected later during Governance — not here.
