---
schema_version: "1.0"
company_id: "{{slug}}"
name: "{{name}}"
created_at: "{{iso_timestamp}}"
operating_mode: finite          # finite | continuous
default_autonomy: supervised    # full | supervised | interactive
budget:
  max_usd_per_task: 5.00
  max_usd_per_day: 50.00
reporting_cadence: on_completion  # on_completion | hourly | daily | weekly
infrastructure:                   # external systems this company depends on
  # - type: git_repo              # git_repo | api | database | message_queue | other
  #   url: "https://github.com/org/repo"
  #   access: private             # public | private
  #   credential_env: GITHUB_TOKEN  # env var that provides access (if private)
  #   used_by: [backtest-agent]   # which roles need this
  #   purpose: "Strategy framework source"
---

# Company Constitution: {{name}}

> **Business purpose and success criteria** are defined in `.specify/org/vision.md`.
> **Task types and workflow paths** are defined in `.specify/org/roadmap.md`.
> **Ingress, egress, and quality gates** are defined in `.specify/org/pipeline.md`.
> This file governs operational parameters only.

## Operating Mode

- **finite**: Goal-oriented runs. The company processes a queue of feature
  requests, completes them, and stops when the queue is empty.
- **continuous**: Endless control-loop. The company autonomously pursues a
  long-running business goal (e.g. trading, monitoring, research) and never
  reaches a "done" state — it only reports.

## Autonomy

The default applies to tasks that don't override `autonomy:` in their task
spec. Use `interactive` for design/brainstorming tasks, `supervised` for
implementation work, `full` only when you trust the company to operate
unattended (e.g. nightly maintenance jobs).

## Budget Guards

These are hard caps. If a task hits `max_usd_per_task`, the CEO must escalate
to the user before proceeding. If `max_usd_per_day` is reached, the runtime
suspends new dispatches until the next UTC day.

## Communication Principles

> Free-form notes that every agent receives as implicit context. Examples:
>
> - "Always cite the source file when referencing existing code."
> - "Prefer functional style over class hierarchies."
> - "Never delete user data without explicit user approval."

## Infrastructure Requirements

> List external systems, repos, APIs, or services the company depends on.
> For each: what it is, which agents use it, how access is granted (credential env var),
> and what happens if it is unavailable. This is the reference for agent `env:` and `setup:` fields.
