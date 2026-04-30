---
description: "Manage the central tool/skill catalog: list, add, remove, show."
---

# Company: Catalog

The catalog is the single source of truth for which **tools** (MCP servers, custom integrations), **skills** (system-prompt seed bodies), and **binary reference entries** (env keys, capability annotations) are available on this haex-corp instance.

Default location: `<haex-corp>/catalog/{tools,skills,binaries}/`. The path can be overridden via `.specops/config.json::catalog.path`.

> **Agent dependencies** — agents declare their runtime packages directly in their spec frontmatter as `nix_packages: [git, python311, ...]` (nixpkgs attribute names). The runtime builds a per-agent Nix-based Docker image from that list. `catalog/binaries/` entries are reference documentation for env keys and capability requirements — they are **not** the installation mechanism.

## User Input

```text
$ARGUMENTS
```

Subcommands:

- `list` — show all tools, skills, and binaries with their IDs, descriptions, and tags.
- `list tools` / `list skills` / `list binaries` — restrict to one kind.
- `show <kind> <id>` — print the full manifest of one entry. Example: `show tool github`, `show skill tdd`.
- `add tool <id>` — interactive wizard. Prompts for type, command, env keys, description, required_capabilities, tags. Writes `<catalog>/tools/<id>.yml`.
- `add binary <id>` — interactive wizard. Prompts for name, command, nix_package, version_check, env_keys, description, required_capabilities, tags. Writes `<catalog>/binaries/<id>.yml`.
- `add skill <id>` — interactive wizard. Prompts for description, tags, body. Writes `<catalog>/skills/<id>.md`.
- `remove <kind> <id>` — delete the manifest file. Prompts for confirmation.
- `validate` — run validation across the catalog itself (YAML parses, required fields present).

## Steps

### Step 1: Resolve catalog dir

Read `.specops/config.json` for `catalog.path`. Default: `<haex-corp>/catalog/`. Verify it exists; if not, create it and announce that the catalog is empty.

### Step 2: Dispatch on subcommand

For `list`, recursively read all `*.yml` and `*.md` files under `tools/` and `skills/`, parse frontmatter, render an aligned table:

```
TOOLS
  github         GitHub MCP                     vcs, collaboration
  slack          Slack MCP                      communication
  company-ops      Firma-Ops                      bundled, ceo, orchestration

SKILLS
  tdd            Test-Driven Development        quality, engineering, workflow
  verification…  Verification Before Completion quality, completion-gate
```

For `show`, print the file's frontmatter (and body for skills) verbatim plus the source path.

For `add tool`, walk the user through these prompts using `templates/tool.yml` as the structure:

- `type` (mcp / builtin / custom)
- if `mcp`: `transport`, `command`, `args`, `env_keys`
- `description` (one sentence)
- `required_capabilities` (multi-select from the standard taxonomy: filesystem, shell, network, code, secrets, payment, account)
- `tags`

For `add binary`, walk the user through these prompts using `templates/binary.yml` as the structure:

- `name` — human-readable name (e.g. "GitHub CLI")
- `command` — the executable name on `$PATH` (defaults to `<id>` if omitted)
- `nix_package` — **required** — the nixpkgs attribute name used to install this binary in agent images (e.g. `gh`, `nodejs_22`, `ripgrep`, `yq-go`). Explain: this is the Nix package attribute, not the command name — they sometimes differ (e.g. the `yq` command comes from the `yq-go` package). If the user is unsure, suggest searching https://search.nixos.org/packages.
- `version_check` — command to print the version (e.g. `gh --version`)
- `env_keys` — list of environment variable names this binary reads (e.g. `[GITHUB_TOKEN]`); leave empty if none
- `description` — one-to-two sentence description of what the binary does and which capabilities its use requires
- `required_capabilities` — multi-select from the standard taxonomy
- `tags`

For `add skill`, prompts:

- `name`, `description`, `tags`
- Body — multi-line. Default: a brief skeleton from `templates/skill.md`.

After writing, run a quick parse-check on the new file. Reject the write and re-prompt if YAML or frontmatter is malformed.

### Step 3: Confirm

Print the path of the created/edited file and a one-line summary. For `remove`, print the deleted path and a count of remaining entries.

## Notes

- After modifying the catalog, re-run `/speckit-company.validate --catalog <catalog-dir>` against any company that uses these IDs. Existing companies don't auto-revalidate.
- `bundled` tag means the entry ships with an extension (e.g. `company-ops` ships with speckit-company). Don't delete bundled entries — they're re-installed by the extension installer.
- The body of a skill becomes part of every using agent's system prompt. Keep it short and concrete; long skill bodies eat into context budget.
- This command does not require Hermes to be installed — catalog management is pure file operations.
