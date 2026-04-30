---
schema_version: "1.0"
role: "{{role}}"
model: "{{model}}"            # e.g. claude-opus-4-7, claude-sonnet-4-6, gpt-4
runner: hermes                # always hermes for now (per-agent profile)
runner_type: ephemeral        # ephemeral | persistent | scheduled
reports_to: "{{reports_to}}"  # role-id of supervisor; null for the CEO
skills:                       # initial seed; Hermes adds more autonomously
  - "{{skill}}"
nix_packages: []              # nixpkgs attribute names installed into the agent's Docker image
                              # e.g. [git, python311, nodejs_22, gh, ripgrep]
tools:
  builtin: []                 # Read, Edit, Bash, WebSearch, WebFetch, Grep, ...
  mcp: []                     # references catalog/tools/<id>.yml: github, company-ops, ...
capabilities:                 # default-deny: anything not listed is forbidden
  - filesystem:read
env:                          # environment variables required at runtime (default-deny)
  # - name: GITHUB_TOKEN
  #   description: "PAT for cloning/accessing private repos"
  #   secret: true            # stored in runtime vault — never committed to plain config
  #   required: true
  # - name: MY_SERVICE_URL
  #   description: "Base URL of upstream service"
  #   secret: false
  #   required: true
setup:                        # one-time commands run in the agent container before first dispatch
  # - "pip install fwbg@git+https://${GITHUB_TOKEN}@github.com/org/fwbg.git"
  # - "gh repo clone org/private-repo /opt/workspace/private-repo"
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
