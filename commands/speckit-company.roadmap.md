---
description: "Define task types, workflow paths, and data flows. Step 2 of the setup workflow."
---

# Company: Roadmap

Map out what kinds of work this company does, how tasks flow through the system, and what data moves between stages. The roadmap is the direct input to Org Design — agent roles are derived from workflow stages, not designed independently.

## User Input

```text
$ARGUMENTS
```

Free text description of the main workflow. With no arguments, run the full interactive wizard.

## Prerequisites

1. `.specify/org/vision.md` exists (run `/speckit-company.vision` first).

## Steps

### Step 1: Load context

Read `.specify/org/vision.md` for business purpose and success criteria.
Read `.specify/org/roadmap.md` if it exists (edit mode).

### Step 2: Elicit workflow

Ask conversationally — stop as soon as the picture is clear, don't exhaust every question:

1. **Task types** — what kinds of tasks will this company handle?
   List them, give each a short slug (e.g. `strategy-analysis`, `feature-implementation`, `daily-report`).

2. **Trigger** — for each task type: how does a task of that type start?
   (Manual submission / GitHub issue / Jira ticket / schedule / spawned by another task)

3. **Stages** — for each task type: what are the processing stages from trigger to done?
   Describe the chain: "research → backtest → analysis → report" or "ticket → implement → review → PR."

4. **Data flow** — what does each stage consume and produce?
   Be concrete: "backtest stage takes `research.json`, produces `backtest_report.json` in `.specops/<slug>/strategies/<id>/runs/<run-id>/`."

5. **Inter-task dependencies** — can tasks spawn sub-tasks? Do some task types feed into others?

### Step 3: Write

Write to `.specify/org/roadmap.md` with one section per task type:

```markdown
---
company_id: "{{slug}}"
updated_at: "{{iso_timestamp}}"
---

# Roadmap: {{company_name}}

## Task Types

### {{task-slug}}
**Trigger**: ...
**Stages**: Stage A → Stage B → Stage C
**Data flow**:
  - Stage A: input → output
  - Stage B: input → output
**Spawns**: (none | list of task-slugs)
```

### Step 4: Confirm

Print the path and offer to proceed to `/speckit-company.org-design`.

## Notes

- Define workflows, not agents. Agents emerge from stages in the Org Design step.
- The more specific the stage descriptions and data flows, the better the AI can derive roles.
- Roadmap evolves over time. If new task types are added later, re-run `/speckit-company.org-design` to check whether new roles are needed.
