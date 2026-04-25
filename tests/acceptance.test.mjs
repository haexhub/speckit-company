/**
 * End-to-end acceptance tests for speckit-company.
 *
 * Validates that the extension's pieces compose into a working spec-driven
 * company workflow:
 *   1. Bootstrap a fake spec-kit project layout from templates.
 *   2. Run validate.mjs against the sample org → 0 errors.
 *   3. Run render-org-chart.mjs → produces a Mermaid block.
 *   4. Round-trip the firma-ops MCP handlers (stub backend) for the five tools.
 *
 * Hermes binary is NOT required for these tests — they exercise the spec
 * layer + MCP contract only. Live runtime tests live in haex-corp.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { validateCompany } from "../scripts/validate.mjs";
import { renderOrgChartFromDir } from "../scripts/render-org-chart.mjs";
import { makeHandlers, TOOL_DEFINITIONS } from "../mcp-server/firma-ops/handlers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(__dirname);
const TEMPLATES = path.join(repoRoot, "templates");

async function bootstrapProject() {
  const proj = await fs.mkdtemp(path.join(os.tmpdir(), "speckit-company-e2e-"));
  const orgDir = path.join(proj, ".specify", "org");
  await fs.mkdir(path.join(orgDir, "agents"), { recursive: true });

  // Constitution from template, with placeholders replaced.
  const constitutionTpl = await fs.readFile(path.join(TEMPLATES, "constitution.md"), "utf8");
  const constitution = constitutionTpl
    .replace(/\{\{slug\}\}/g, "acme")
    .replace(/\{\{name\}\}/g, "Acme Corp")
    .replace(/\{\{iso_timestamp\}\}/g, new Date().toISOString());
  await fs.writeFile(path.join(orgDir, "constitution.md"), constitution);

  // CEO agent
  await fs.writeFile(
    path.join(orgDir, "agents", "ceo.md"),
    `---
schema_version: "1.0"
role: ceo
model: claude-opus-4-7
runner: hermes
runner_type: persistent
reports_to: null
skills: []
tools:
  builtin: [Read]
  mcp: [firma-ops]
capabilities:
  - filesystem:read
  - shell:execute
status: active
---

# CEO

You are the CEO of Acme Corp.
`
  );

  // Worker agent
  await fs.writeFile(
    path.join(orgDir, "agents", "engineer.md"),
    `---
schema_version: "1.0"
role: engineer
model: claude-sonnet-4-6
runner: hermes
runner_type: ephemeral
reports_to: ceo
skills: [tdd]
tools:
  builtin: [Read, Edit, Bash]
  mcp: []
capabilities:
  - filesystem:write
  - shell:execute
status: active
---

# Engineer

You are an engineer at Acme Corp.
`
  );

  return { proj, orgDir };
}

test("E2E: bootstrap → validate → render → 0 errors", async () => {
  const { proj, orgDir } = await bootstrapProject();
  try {
    const { findings } = await validateCompany(orgDir);
    const errors = findings.filter((f) => f.severity === "error");
    assert.deepEqual(errors, [], `unexpected errors: ${JSON.stringify(errors, null, 2)}`);

    const md = await renderOrgChartFromDir(orgDir);
    assert.match(md, /flowchart TD/);
    assert.match(md, /\bceo\b/);
    assert.match(md, /\bengineer\b/);
    assert.match(md, /ceo\s*-->\s*engineer/);
  } finally {
    await fs.rm(proj, { recursive: true, force: true });
  }
});

test("E2E: firma-ops MCP handlers round-trip the five tools (stub backend)", async () => {
  const { proj, orgDir } = await bootstrapProject();
  try {
    const handlers = makeHandlers(); // default = stubs

    // 1. dispatch_to_agent
    const dispatch = await handlers.dispatch_to_agent({
      role: "engineer",
      task: { goal: "implement /health endpoint", isolation: "worktree" },
    });
    assert.equal(dispatch.isError, false);
    const dData = JSON.parse(dispatch.content[1].text);
    assert.match(dData.dispatch_id, /^stub-engineer-/);

    // 2. read_artifact (read the bootstrap constitution)
    const ra = await handlers.read_artifact({
      path: path.join(orgDir, "constitution.md"),
    });
    const raData = JSON.parse(ra.content[1].text);
    assert.match(raData.content, /Acme Corp/);

    // 3. ask_user (stub returns simulated answer)
    const ask = await handlers.ask_user({
      question: "Use OAuth or JWT?",
      options: ["OAuth", "JWT"],
    });
    const askData = JSON.parse(ask.content[1].text);
    assert.match(askData.answer.simulated_answer, /\[user-stub\]/);

    // 4. escalate (stub returns approve)
    const esc = await handlers.escalate({
      reason: "agent unsure how to proceed",
    });
    const escData = JSON.parse(esc.content[1].text);
    assert.equal(escData.decision.decision, "approve");

    // 5. query_org_chart (stub returns empty agents array)
    const org = await handlers.query_org_chart({});
    const orgData = JSON.parse(org.content[1].text);
    assert.ok(Array.isArray(orgData.agents));
  } finally {
    await fs.rm(proj, { recursive: true, force: true });
  }
});

test("E2E: TOOL_DEFINITIONS schema is internally consistent (every tool has a handler)", async () => {
  const handlers = makeHandlers();
  for (const def of TOOL_DEFINITIONS) {
    assert.equal(typeof handlers[def.name], "function", `missing handler for ${def.name}`);
    assert.ok(def.description.length > 0);
    assert.equal(def.inputSchema.type, "object");
  }
});

test("E2E: CLI validate.mjs exits 0 on a bootstrapped valid company", async () => {
  const { proj, orgDir } = await bootstrapProject();
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn("node", ["scripts/validate.mjs", orgDir], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code));
    });
    assert.equal(exitCode, 0);
  } finally {
    await fs.rm(proj, { recursive: true, force: true });
  }
});

test("E2E: CLI validate.mjs exits 1 on a deliberately broken company", async () => {
  const { proj, orgDir } = await bootstrapProject();
  try {
    // Break it: introduce a second root to fail E_MULTIPLE_ROOTS
    await fs.writeFile(
      path.join(orgDir, "agents", "shadow-ceo.md"),
      `---
schema_version: "1.0"
role: shadow-ceo
model: claude-opus-4-7
runner: hermes
runner_type: persistent
reports_to: null
skills: []
tools:
  builtin: [Read]
  mcp: []
capabilities: [filesystem:read]
status: active
---

# Shadow CEO

Second root — should fail validation.
`
    );

    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn("node", ["scripts/validate.mjs", orgDir], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code));
    });
    assert.equal(exitCode, 1);
  } finally {
    await fs.rm(proj, { recursive: true, force: true });
  }
});
