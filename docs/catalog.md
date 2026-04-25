# The central tool & skill catalog

The catalog is the single source of truth for which **tools** (MCP servers, custom integrations) and **skills** (system-prompt seed bodies) are available to every agent on this haex-corp instance. Agents reference catalog entries by ID; the runtime resolves them at spawn time; the validator refuses to start a company that references unknown IDs or lacks the capabilities a tool requires.

This decouples *capability deployment* from *agent definition*: when you set up a new MCP server (e.g. add Linear support), you add a single tool manifest, and every agent that needs Linear lists `linear` in its `tools.mcp`. No copy-pasting MCP config across agents.

## Layout

```
<haex-corp>/catalog/
├── tools/                    MCP servers, custom integrations
│   ├── company-ops.yml           (bundled with speckit-company)
│   ├── github.yml
│   ├── slack.yml
│   ├── playwright.yml
│   ├── filesystem.yml
│   └── ...your additions
├── skills/                   system-prompt seed bodies (markdown)
│   ├── tdd.md
│   ├── verification-before-completion.md
│   ├── systematic-debugging.md
│   ├── defensive-defaults.md
│   ├── pr-review-checklist.md
│   └── ...your additions
└── binaries/                 system-installed CLIs (python3, gh, docker, …)
    ├── python3.yml
    ├── node.yml
    ├── pnpm.yml
    ├── gh.yml
    ├── git.yml
    ├── docker.yml
    ├── curl.yml
    ├── jq.yml
    ├── yq.yml
    ├── rg.yml
    └── ...your additions
```

## Tool manifest

```yaml
# catalog/tools/<id>.yml
id: github
name: "GitHub MCP"
type: mcp                       # mcp | builtin | custom
transport: stdio                # for type=mcp
command: "uvx"
args: ["mcp-server-github"]
env_keys: [GITHUB_TOKEN]        # required env vars
description: "Read/write GitHub repos, issues, PRs."
required_capabilities:          # any agent using this tool MUST have these granted
  - secrets:read_env
  - network:http
  - account:github
tags: [vcs, collaboration]
```

## Binary manifest

```yaml
# catalog/binaries/<id>.yml
id: gh
name: "GitHub CLI"
type: binary
command: "gh"                    # binary name on $PATH (or absolute path)
version_check: "gh --version"   # informational
description: |
  Official GitHub CLI. Read-only ops need network:http + account:github.
  Mutating ops add network:http. Auth uses secrets:read_env if a token
  is supplied. Grant capabilities matching the agent's intended ops.
required_capabilities:           # MINIMUM to invoke the binary at all
  - shell:execute
tags: [vcs, github]
```

### Minimum-required principle

`required_capabilities` lists the **minimum capabilities to invoke the binary at all**, not the maximum needed for every conceivable operation. For most binaries that's just `shell:execute`. Exceptions are tools whose *entire purpose* is one capability class — `curl` requires `network:http` because there's no curl-without-HTTP, `rg` requires `filesystem:read` because there's no ripgrep-without-files.

This shifts the responsibility for use-case-specific capabilities to the **agent author**. If your agent does `git status` in a local repo, `binaries: [git]` + `capabilities: [shell:execute, filesystem:read]` is enough. If it does `git push`, add `filesystem:write` and `network:http`. **Three different agents can share one git manifest without one of them being over-granted.**

`shell:execute` is necessary but not sufficient — the agent must additionally list the binary in `tools.binaries: [...]`. This is the **binary whitelist** layer: even if `shell:execute` is granted broadly, the agent can only invoke binaries that appear in its list.

The runtime can probe `$PATH` to confirm declared binaries are actually installed (`checkBinaryAvailability(catalog)` returns `{present, missing}`). Missing binaries surface as warnings — useful when staging a setup on a new machine.

## Skill manifest

```markdown
---
id: tdd
name: "Test-Driven Development"
description: "Red → green → refactor."
tags: [quality, engineering]
---

# Test-Driven Development

(Markdown body — gets injected into the system prompt of every agent that
lists this skill in its `skills:` array.)
```

## Agent reference

```yaml
# .specify/org/agents/backend-dev.md
---
role: backend-dev
tools:
  builtin: [Read, Edit, Bash]
  mcp: [github, company-ops]              # → catalog/tools/{github,company-ops}.yml
  binaries: [git, gh, python3, jq]        # → catalog/binaries/{git,gh,python3,jq}.yml
skills: [tdd, verification-before-completion]   # → catalog/skills/{tdd,verification-before-completion}.md
capabilities:
  - filesystem:write
  - shell:execute
  - secrets:read_env
  - network:http
  - account:github
---
```

### Wildcards

Use `["*"]` to grant access to **every** entry in a catalog category:

```yaml
tools:
  mcp: ["*"]              # all tools in catalog/tools/
  binaries: ["*"]         # all binaries in catalog/binaries/
skills: ["*"]             # all skills in catalog/skills/
```

Wildcard is a **convenience shortcut**, not a permission bypass. The validator and runtime expand `["*"]` to the concrete catalog list. Validation only checks references resolve; capability enforcement happens at runtime when the agent actually invokes a tool. An agent with `binaries: ["*"]` and only `[shell:execute]` will pass validation but the runtime will refuse any operation that exceeds the granted capabilities.

Mixing literal IDs with `*` (`["python3", "*"]`) is allowed and degenerates to a plain wildcard — the explicit IDs are subsumed by the global expansion.

Use cases:
- **Sandbox / dev companies** where you trust the agent broadly: `binaries: ["*"]` + a permissive `capabilities` list.
- **Maintenance agents** that need to pull from any tool: `tools.mcp: ["*"]`.
- **Knowledge-saturated workers** that should know everything documented: `skills: ["*"]`.

## Validation rules

`validate.mjs --catalog <catalog-dir>` is a **reference checker**, not a security gate. It catches typos and stale IDs:

| Code | Meaning |
|---|---|
| `E_UNKNOWN_TOOL_REFERENCE` | Agent references a tool id that doesn't exist in `<catalog>/tools/`. |
| `E_UNKNOWN_SKILL_REFERENCE` | Agent references a skill id that doesn't exist in `<catalog>/skills/`. |
| `E_UNKNOWN_BINARY_REFERENCE` | Agent references a binary id that doesn't exist in `<catalog>/binaries/`. |

### Why no static capability gap check?

An earlier draft checked agent capabilities against `tool.required_capabilities` / `binary.required_capabilities`. We removed that because:

- Binaries like `git`, `gh`, `docker` cover both read-only and mutating operations within one CLI. There is no single static cap-set that's right.
- Static checks give a false sense of security — they don't actually prevent anything; the agent still calls the binary.
- The **real gate is the runtime**: when an agent invokes a tool, `capability-gate.js` checks the granted capabilities and refuses operations that exceed them. That's where security lives.

`required_capabilities` in manifests therefore stays as informational documentation: it tells a human reader what a typical agent author should grant. The validator does not enforce it.

The `start` runtime in haex-corp also runs the reference check via `CompanyRuntime` when `catalogDir` is set; dangling references abort startup.

## Workflow

1. **One-time:** install MCP servers locally (e.g. `uvx mcp-server-github`).
2. **One-time:** drop a manifest into `catalog/tools/<id>.yml`. Or use `/speckit-company.catalog add tool <id>`.
3. **Per agent:** list the tool ID in `agents/<role>.md::tools.mcp`.
4. **Run** `/speckit-company.validate --catalog <catalog>`. 0 errors = ready.
5. **Run** `/speckit-company.start`. The runtime hydrates references, sets up Hermes per agent, opens the queue.

Adding a new tool to your repertoire is therefore a single file write + a re-validate. No code changes anywhere else.

## Per-company overrides (planned)

Drop a manifest under `<spec-kit-project>/.specify/org/catalog/{tools,skills}/<id>.{yml,md}` to override a global entry for one specific company (e.g. point `github` at a self-hosted GHE instance for one team). Per-company entries take precedence over global ones. *(Not implemented in v0.1; the structure is reserved.)*

## Skills vs. Hermes self-curated skills

The catalog skills are **seed skills** — kuratiertes Knowhow, hand-written by you, prepended to every using agent's system prompt. Hermes additionally accumulates its own skills automatically as it works (per-agent, in `<project>/.hermes/<role>/skills/`). The two coexist:

- **Catalog skills** = stable institutional knowledge ("how we do TDD here", "our PR review checklist").
- **Hermes-curated skills** = role-specific, learned-by-doing knowledge that grows over the agent's lifetime.

Don't try to put role-specific learnings into catalog skills — let Hermes do that. Use catalog skills for things you'd write in an employee handbook.
