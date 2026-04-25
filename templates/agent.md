---
schema_version: "1.0"
role: "{{role}}"
model: "{{model}}"            # e.g. claude-opus-4-7, claude-sonnet-4-6, gpt-4
runner: hermes                # always hermes for now (per-agent profile)
runner_type: ephemeral        # ephemeral | persistent | scheduled
reports_to: "{{reports_to}}"  # role-id of supervisor; null for the CEO
skills:                       # initial seed; Hermes adds more autonomously
  - "{{skill}}"
tools:
  builtin: []                 # Read, Edit, Bash, Grep, ...
  mcp: []                     # github, firma-ops, ...
capabilities:                 # default-deny: anything not listed is forbidden
  - filesystem:read
status: active                # active | pending_retire | retired
---

# Persona: {{role}}

> Replace this section with the system-prompt persona for this role. Speak in
> the second person ("You are an experienced..."). Cover:
>
> - Domain expertise and seniority
> - Operating principles (e.g. "always write a failing test first")
> - When to escalate to your supervisor vs. solve in-place
> - What kind of output the dispatching agent expects from you
