---
description: "Hand the company over to the runtime: activate CEO (persistent mode), start queue polling."
---

# Company: Start

Hand the declared company over to the runtime: activate the CEO process, start watching the task queue, and emit a `company.started` event.

## User Input

```text
$ARGUMENTS
```

Optional flags:

- `--detach` — run the CEO process in the background (default).
- `--foreground` — keep the CEO process in the user's terminal for live debugging.

## Prerequisites

1. `/speckit-company.validate` reports 0 errors.
2. The `hermes` binary is installed and on `$PATH`. If not, abort with installation instructions: <https://hermes-agent.nousresearch.com/docs/>.
3. The runtime (haex-corp / SpecOps) is reachable. The runtime's API endpoint is read from `.specops/config.json`.

## Steps

### Step 1: Pre-flight

- Run `/speckit-company.validate` — abort on any error.
- Run `which hermes` — abort with help text if missing.
- Read `.specify/org/constitution.md` to derive `company_id` and `operating_mode`.

### Step 2: Provision per-agent Hermes profiles

For each agent in `.specify/org/agents/<role>.md` with `status: active`:

- Ensure `<project>/.hermes/<role>/` directory exists.
- The runtime will pass `HERMES_HOME=<project>/.hermes/<role>` when spawning that agent. No further provisioning needed — Hermes initializes the profile lazily on first run.

### Step 3: Notify runtime

POST the company definition to the runtime:

```
POST /api/projects/<project>/company/start
{ "company_id": "<slug>", "operating_mode": "<finite|continuous>" }
```

The runtime:

1. Loads agent specs via `spec-loader.js`.
2. Spawns the CEO process (Hermes, `runner_type: persistent`).
3. Wires the CEO to the `company-ops` MCP server.
4. Starts the queue-poller on `.specops/<slug>/queue/`.
5. Registers a `scheduled` cron entry per agent with `runner_type: scheduled`.
6. Writes a `company.started` event to the event-store.

### Step 4: Confirm

On success, print:

```
✓ Company '<slug>' is live.
  CEO process: PID <pid>
  Queue: .specops/<slug>/queue/
  Event log: .specops/<slug>/events.jsonl
```

Tell the user how to drop a task into the queue:

```bash
cat > .specops/<slug>/queue/example-task.yaml << 'YAML'
goal: "Build a /health endpoint"
autonomy: supervised
isolation: worktree
YAML
```

## Notes

- `start` is **idempotent**: if the company is already running, the runtime returns 200 with the existing PID.
- To stop, use the runtime's stop endpoint or `Ctrl-C` if `--foreground`.
- The CEO inherits the constitution as implicit context on every task. You don't need to pass it manually.
