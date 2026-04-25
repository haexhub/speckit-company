---
description: "Render the reports-to graph as a Mermaid diagram into org/org-chart.md."
---

# Company: Org Chart

Render the company's reports-to graph as a Mermaid `flowchart TD` block, written to `.specify/org/org-chart.md`. View the file in any Markdown renderer with Mermaid support.

## User Input

```text
$ARGUMENTS
```

Optional: `--stdout` to print the Mermaid block to stdout instead of writing the file.

## Prerequisites

1. `.specify/org/agents/` contains at least one agent file.

## Steps

### Step 1: Render

Run `node <ext>/scripts/render-org-chart.mjs .specify/org`.

### Step 2: Write file

If no `--stdout` flag, write the output to `.specify/org/org-chart.md` (overwrite). Otherwise print to stdout.

### Step 3: Brief validation

Run `node <ext>/scripts/validate.mjs .specify/org`. If `E_NO_CEO`, `E_MULTIPLE_ROOTS`, `E_DANGLING_REPORTS_TO`, or `E_CYCLE` is reported, surface the warning to the user — the chart will look weird otherwise.

## Notes

- Agents with `status: retired` are filtered out of the diagram.
- Status colors: green = active, gold = pending_retire, gray = retired.
- The chart is a **read-only artifact**. Do not edit by hand — the next `org-chart` re-run will overwrite it.
