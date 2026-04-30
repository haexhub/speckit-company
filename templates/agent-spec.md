---
schema_version: "1.0"
role: "{{role}}"
spec_status: draft           # draft | approved | implemented
approved_by: null
created_at: "{{created_at}}"
---

# Agent Spec: {{role}}

## Purpose

[One paragraph: why this role exists in the company. What gap does it fill? What value does it create for the operating loop?]

## Domain & Expertise

[What field, industry, or technical domain does this agent work in? What background knowledge and seniority level is assumed?]

## Triggers & Inputs

[What activates this agent? What input does it receive per invocation?

Examples:
- "Dispatched by CEO with a strategy spec JSON from the research agent"
- "Triggered on a daily schedule with a market data snapshot as input"
- "Woken by an upstream agent completing its deliverable"
]

## Deliverables & Outputs

[What does this agent produce? Be specific about format, filename pattern, and destination path.

Examples:
- "Backtest report in `.specify/results/<run-id>/report.md` with the standardized metric table"
- "Updated `strategies/configs/<name>.json` with optimized parameters"
]

## Operating Principles

[Specific behavioral rules derived from the domain — not generic. These become the persona's core rules.]

- [principle 1 — e.g. "Never claim a strategy is profitable without running overfitting tests"]
- [principle 2 — e.g. "Always cite the source URL, author, and date for any researched strategy"]

## Escalation Logic

| Condition | Action |
|---|---|
| [concrete trigger — e.g. framework throws unexpected error] | escalate to [supervisor role] |
| [concrete trigger — e.g. strategy is implementable in-framework] | solve in-place |

## Required Capabilities

[What must this agent be able to do? Maps to the capability taxonomy in agent.md at runtime.]

| Capability | Why Needed |
|---|---|
| `filesystem:write` | [stores deliverables to disk] |
| `shell:execute` | [runs CLI tools] |

## Required Infrastructure

[External systems, private repos, APIs, or secrets this agent needs. Cross-reference constitution.md `infrastructure:` for known entries.]

| System | Type | Credential Env Var | Purpose |
|---|---|---|---|

## Skills

[Domain skill IDs this agent must have on day one. These map to skill files resolved at dispatch time.]

- `[skill-id]` — [what aspect of the job it covers]

## Success Criteria

[How do we know this agent is performing its role well? Observable, measurable outcomes.]

- [criterion 1]
- [criterion 2]
