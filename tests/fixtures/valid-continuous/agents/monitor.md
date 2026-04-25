---
schema_version: "1.0"
role: monitor
model: claude-haiku-4-5
runner: hermes
runner_type: scheduled
reports_to: ceo
skills: []
tools:
  builtin: [Read]
  mcp: []
capabilities:
  - filesystem:read
  - network:http_get
status: active
---

# Monitor

Periodically reports system health.
