---
description: "Bootstrap a new company: scaffold .specify/org/, then chain charter and ceo-hire wizards."
---

# Company: Init

Bootstrap a new spec-driven multi-agent company inside the current spec-kit project.

## User Input

```text
$ARGUMENTS
```

Expected form: a single slug (lowercase, hyphenated) that names the company. Example: `trading-firma` or `dev-team-alpha`.

## Prerequisites

1. The current directory is a spec-kit project (`.specify/` exists at repo root).
2. The slug matches `^[a-z0-9][a-z0-9-]*$`.
3. `.specify/org/` does not yet exist (otherwise re-run `/speckit-company.charter` and `/speckit-company.hire` instead).

## Steps

### Step 1: Validate slug

If `$ARGUMENTS` is empty or invalid, prompt the user for a slug.

### Step 2: Scaffold directory tree

Create the following structure under the current spec-kit project:

```
.specify/org/
├── constitution.md       (copy from <ext>/templates/constitution.md, replace {{slug}}/{{name}}/{{iso_timestamp}})
└── agents/               (empty directory)
```

Also create `.specops/<slug>/queue/` for incoming task specs (will be used at runtime).

### Step 3: Chain wizards

After scaffolding, announce the 8-step setup workflow and offer to proceed step by step:

```
Company scaffolded. Setup workflow:

  1. Vision      — purpose, success criteria, scope
  2. Roadmap     — task types, workflow paths, data flows
  3. Org Design  — AI derives agent topology from roadmap
  4. Governance  — operating mode, autonomy, budget, reporting
  5. Hire        — configure each agent (model, nix_packages, env, setup)
  6. Pipeline    — ingress sources, egress sinks, quality gates
  7. Validate    — full consistency check
  8. Execute     — hand off to runtime

Shall I start with Step 1 (Vision)?
```

Chain immediately into `/speckit-company.vision` if the user agrees.

The user may stop at any point — partial setup is fine. Re-running `init` against an existing slug is an error; run the individual commands instead.

## Notes

- The CEO is **mandatory**. Without a CEO the company can't accept tasks.
- The slug determines paths in `.specops/<slug>/`. Choose carefully — renaming later is a manual file move.
- If the project already has another company under `.specify/org/`, abort and tell the user: only one company per spec-kit project is supported in v0.1.
