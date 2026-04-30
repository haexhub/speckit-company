---
description: "Consistency check: graph integrity, tools, models, mode-constraints, budget."
---

# Company: Validate

Run a full consistency check on `.specify/org/` and report findings by severity.

## User Input

```text
$ARGUMENTS
```

Optional: `--strict` (treat warnings as errors for exit-code purposes). Default behavior already exits non-zero on errors.

## Prerequisites

1. `.specify/org/` exists.

## Steps

### Step 1: Run validator

Invoke `node <ext>/scripts/validate.mjs .specify/org`. Capture stdout and exit-code.

### Step 2: Format report

Group findings by severity (errors, warnings, info). For each finding:

```
[ERROR] E_MULTIPLE_ROOTS: multiple agents have null reports_to: ceo, cto
```

If 0 findings: print `✓ Validation passed: 0 findings.` and exit 0.

### Step 3: Check setup completeness

Beyond the validator, check whether the setup workflow has been completed:

| File | Status | Action if missing |
|---|---|---|
| `.specify/org/vision.md` | required | Run `/speckit-company.vision` |
| `.specify/org/roadmap.md` | required | Run `/speckit-company.roadmap` |
| `.specify/org/pipeline.md` | required | Run `/speckit-company.pipeline` |
| `.specify/org/constitution.md` | required (validator checks) | Run `/speckit-company.init` |
| `.specify/org/agents/ceo.md` | required (validator checks) | Run `/speckit-company.hire ceo` |

Report missing files as warnings (not errors — the validator handles hard errors).

### Step 4: Suggest fixes

For each error code, append a short fix suggestion:

| Code | Fix |
|---|---|
| `E_NO_CEO` | Run `/speckit-company.hire ceo` and set `reports_to: null`. |
| `E_MULTIPLE_ROOTS` | Pick one CEO; set `reports_to:` on the others. |
| `E_DANGLING_REPORTS_TO` | Either hire the missing role or change the offender's `reports_to`. |
| `E_CYCLE` | Inspect the listed agents — break the loop by re-parenting one of them. |
| `E_INVALID_OPERATING_MODE` | Set `operating_mode` to `finite` or `continuous` in `constitution.md`. |
| `E_INVALID_AUTONOMY` | Set `default_autonomy` to `full`, `supervised`, or `interactive`. |
| `E_INVALID_RUNNER_TYPE` | Set `runner_type` to `ephemeral`, `persistent`, or `scheduled`. |
| `E_UNKNOWN_CAPABILITY` | Use a class from `filesystem`, `shell`, `network`, `code`, `secrets`, `payment`, `account`. |
| `E_PAYMENT_WITHOUT_BUDGET` | Set `budget.max_usd_per_task` and `budget.max_usd_per_day` in `constitution.md`. |
| `E_CONTINUOUS_WITHOUT_CADENCE` | Set `reporting_cadence` to `hourly`, `daily`, or `weekly`. |

## Notes

- Run this before `/speckit-company.start`. The runtime refuses to start a company with errors.
- The validator is a **pure function over files** — it does not call models or the network. It's safe to run on every file save.
