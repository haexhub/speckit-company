---
description: "Write a detailed spec for a new agent role before hiring. Spec-first agent creation."
---

# Company: Specify Agent

Turn a natural-language description of an agent role into a complete spec document that guides the hire wizard. The spec is the authoritative "why" behind the agent — it lives alongside the config in git and can be used to regenerate or review the agent at any time.

## User Input

```text
$ARGUMENTS
```

Expected form: free-text description of the role. Examples:
- "A research agent that searches the internet for trading strategies and evaluates their theoretical soundness"
- "A monitoring agent that checks backtest results daily and flags regressions to the CEO"

With no arguments, prompt the user to describe the role they need.

## Prerequisites

1. `.specify/org/` exists (run `/speckit-company.init` first).
2. `.specify/org/constitution.md` should exist — read it for company context.

## Steps

### Step 1: Load company context

Read `.specify/org/constitution.md` for:
- Business purpose — what the company does and why
- Infrastructure dependencies — what external systems are already known
- Operating mode and autonomy level

Read `.specify/org/agents/` to list existing roles and their reporting structure. This helps position the new role correctly.

If `.specify/org/specs/` exists, list existing specs to avoid duplicating a role.

### Step 2: Determine role ID

Derive a role ID from the user's description (lowercase, hyphenated, e.g. `research-agent`). Confirm with the user if ambiguous.

Check: does `.specify/org/agents/<role>.md` already exist? If yes, confirm with the user whether to write a spec for the existing role (spec-after-the-fact) or create a new variant.

### Step 3: Elicit role details

Ask the user, conversationally and briefly, only what isn't already clear from $ARGUMENTS:

1. **Reports to**: which existing role supervises this agent? (List existing roles.)
2. **Core trigger**: what causes this agent to start work? (Dispatch from supervisor, schedule, event)
3. **Primary deliverable**: what does it produce, in what format, stored where?
4. **Decision gate**: what must it escalate vs. what can it solve in-place?
5. **External systems / credentials**: what does it need that isn't in the constitution's `infrastructure:` list?

Keep the conversation tight — the goal is to gather enough to write a complete spec, not to interview the user exhaustively.

### Step 4: Draft the spec

Using the template at `<ext>/templates/agent-spec.md`, populate all sections:

- **Purpose**: synthesize from the user's description + company context
- **Domain & Expertise**: infer from the role's function and the company's business
- **Triggers & Inputs**: from Step 3
- **Deliverables & Outputs**: from Step 3 — be specific (exact file paths and formats if known)
- **Operating Principles**: infer domain-specific, non-obvious rules.
  For trading roles: "Never claim a strategy profitable without overfitting tests", "Always cite source URL for researched strategies".
  These become the core of the agent's persona.
- **Escalation Logic**: table with concrete conditions. Match the constitution's `default_autonomy` level.
- **Required Capabilities**: infer from deliverables, tools, and infrastructure needs
- **Required Infrastructure**: cross-reference constitution `infrastructure:` for known systems; surface any additional ones the role needs
- **Skills**: list 2–5 domain skill IDs this agent should have on day one
- **Success Criteria**: 2–3 measurable, observable outcomes

Show the full draft to the user for review before writing.

### Step 5: Finalize and write

After user approval (or after incorporating feedback):

1. Create `.specify/org/specs/` if it doesn't exist.
2. Write the spec to `.specify/org/specs/<role>.md`.
3. Set `spec_status: approved` in the frontmatter.

Confirm: "Spec for '<role>' was saved to `.specify/org/specs/<role>.md`."

### Step 6: Offer to hire

Ask: "Should I create the agent now based on this spec? `/speckit-company.hire <role>`"

If yes → run `/speckit-company.hire <role>`. The hire command will detect and load the spec automatically.

## Output Artifact

`.specify/org/specs/<role>.md` — the approved agent spec.

## Notes

- The spec is a **requirements document**, not a config. It describes what the agent *should* do; `/speckit-company.hire` translates it into a runnable config (`agent.md`).
- When re-specifying an existing role: update the spec, set `spec_status: draft`, then re-run hire to re-sync the config.
- Specs are versioned in git alongside agent configs — they serve as the auditable "why" behind every agent's behavior.
- For agents that were hired before this command existed, run `/speckit-company.specify-agent <role>` to write the spec retroactively from the existing agent.md.
