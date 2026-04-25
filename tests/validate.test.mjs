import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateCompany } from "../scripts/validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = (name) => path.join(__dirname, "fixtures", name);

const errorCodes = (findings) =>
  findings.filter((f) => f.severity === "error").map((f) => f.code).sort();

test("valid-finite produces no error findings", async () => {
  const { findings } = await validateCompany(fixtures("valid-finite"));
  assert.deepEqual(errorCodes(findings), [], `unexpected errors: ${JSON.stringify(findings, null, 2)}`);
});

test("valid-continuous produces no error findings", async () => {
  const { findings } = await validateCompany(fixtures("valid-continuous"));
  assert.deepEqual(errorCodes(findings), [], `unexpected errors: ${JSON.stringify(findings, null, 2)}`);
});

test("multi-root reports E_MULTIPLE_ROOTS", async () => {
  const { findings } = await validateCompany(fixtures("multi-root"));
  assert.ok(errorCodes(findings).includes("E_MULTIPLE_ROOTS"), `expected E_MULTIPLE_ROOTS in ${JSON.stringify(findings)}`);
});

test("dangling-parent reports E_DANGLING_REPORTS_TO", async () => {
  const { findings } = await validateCompany(fixtures("dangling-parent"));
  assert.ok(errorCodes(findings).includes("E_DANGLING_REPORTS_TO"), `expected E_DANGLING_REPORTS_TO in ${JSON.stringify(findings)}`);
});

test("no-ceo (cycle) reports both E_NO_CEO and E_CYCLE", async () => {
  const { findings } = await validateCompany(fixtures("no-ceo"));
  const codes = errorCodes(findings);
  assert.ok(codes.includes("E_NO_CEO"), `expected E_NO_CEO in ${JSON.stringify(findings)}`);
  assert.ok(codes.includes("E_CYCLE"), `expected E_CYCLE in ${JSON.stringify(findings)}`);
});

test("payment-no-budget reports E_PAYMENT_WITHOUT_BUDGET", async () => {
  const { findings } = await validateCompany(fixtures("payment-no-budget"));
  assert.ok(errorCodes(findings).includes("E_PAYMENT_WITHOUT_BUDGET"), `expected E_PAYMENT_WITHOUT_BUDGET in ${JSON.stringify(findings)}`);
});

test("unknown-capability reports E_UNKNOWN_CAPABILITY", async () => {
  const { findings } = await validateCompany(fixtures("unknown-capability"));
  assert.ok(errorCodes(findings).includes("E_UNKNOWN_CAPABILITY"), `expected E_UNKNOWN_CAPABILITY in ${JSON.stringify(findings)}`);
});

test("missing org dir reports E_MISSING_ORG_DIR", async () => {
  const { findings } = await validateCompany(fixtures("does-not-exist"));
  assert.ok(errorCodes(findings).includes("E_MISSING_ORG_DIR"), `expected E_MISSING_ORG_DIR in ${JSON.stringify(findings)}`);
});

test("findings carry severity, code, message", async () => {
  const { findings } = await validateCompany(fixtures("multi-root"));
  for (const f of findings) {
    assert.ok(["error", "warning", "info"].includes(f.severity), `bad severity: ${f.severity}`);
    assert.match(f.code, /^[EWI]_[A-Z_]+$/, `bad code: ${f.code}`);
    assert.equal(typeof f.message, "string");
    assert.ok(f.message.length > 0);
  }
});

import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";

async function makeMiniCatalog() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "vc-cat-"));
  await mkdir(path.join(dir, "tools"), { recursive: true });
  await mkdir(path.join(dir, "skills"), { recursive: true });
  await writeFile(
    path.join(dir, "tools", "firma-ops.yml"),
    `id: firma-ops
type: mcp
description: "test"
required_capabilities: [filesystem:read]
`
  );
  await writeFile(
    path.join(dir, "skills", "tdd.md"),
    `---
id: tdd
description: "test"
---
body
`
  );
  return dir;
}

test("with --catalog: valid-finite passes (firma-ops + tdd known)", async () => {
  const cat = await makeMiniCatalog();
  try {
    const { findings } = await validateCompany(fixtures("valid-finite"), { catalogDir: cat });
    assert.deepEqual(errorCodes(findings), []);
  } finally {
    await rm(cat, { recursive: true, force: true });
  }
});

test("with --catalog: agent referencing unknown tool yields E_UNKNOWN_TOOL_REFERENCE", async () => {
  // valid-continuous's monitor.md uses no MCP tools, but ceo uses firma-ops.
  // Build a catalog without firma-ops to force the error.
  const dir = await mkdtemp(path.join(os.tmpdir(), "vc-cat-empty-"));
  await mkdir(path.join(dir, "tools"), { recursive: true });
  await mkdir(path.join(dir, "skills"), { recursive: true });
  try {
    const { findings } = await validateCompany(fixtures("valid-continuous"), { catalogDir: dir });
    assert.ok(errorCodes(findings).includes("E_UNKNOWN_TOOL_REFERENCE"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("with --catalog: agent missing required tool capability yields E_TOOL_CAPABILITY_MISSING", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "vc-cat-strict-"));
  await mkdir(path.join(dir, "tools"), { recursive: true });
  await mkdir(path.join(dir, "skills"), { recursive: true });
  // Tool that requires a capability the ceo doesn't have
  await writeFile(
    path.join(dir, "tools", "firma-ops.yml"),
    `id: firma-ops
type: mcp
description: "test"
required_capabilities: [payment:execute_unrestricted]
`
  );
  try {
    const { findings } = await validateCompany(fixtures("valid-finite"), { catalogDir: dir });
    assert.ok(errorCodes(findings).includes("E_TOOL_CAPABILITY_MISSING"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeFixtureWithBinary(binaryId) {
  const proj = await mkdtemp(path.join(os.tmpdir(), "vc-bin-"));
  const orgDir = path.join(proj, "org");
  await mkdir(path.join(orgDir, "agents"), { recursive: true });
  await writeFile(
    path.join(orgDir, "constitution.md"),
    `---
schema_version: "1.0"
company_id: "bin-test"
name: "Bin"
operating_mode: finite
default_autonomy: supervised
budget:
  max_usd_per_task: 5.00
  max_usd_per_day: 50.00
reporting_cadence: on_completion
---

# Bin
`
  );
  await writeFile(
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
  builtin: [Read, Bash]
  mcp: []
  binaries: ["${binaryId}"]
capabilities:
  - filesystem:read
  - shell:execute
status: active
---

# CEO
`
  );
  return { proj, orgDir };
}

test("with --catalog: unknown binary reference yields E_UNKNOWN_BINARY_REFERENCE", async () => {
  const cat = await mkdtemp(path.join(os.tmpdir(), "vc-cat-bin-"));
  await mkdir(path.join(cat, "tools"), { recursive: true });
  await mkdir(path.join(cat, "skills"), { recursive: true });
  await mkdir(path.join(cat, "binaries"), { recursive: true });
  // catalog has no binaries
  const { proj, orgDir } = await makeFixtureWithBinary("ghosttool");
  try {
    const { findings } = await validateCompany(orgDir, { catalogDir: cat });
    assert.ok(errorCodes(findings).includes("E_UNKNOWN_BINARY_REFERENCE"));
  } finally {
    await rm(proj, { recursive: true, force: true });
    await rm(cat, { recursive: true, force: true });
  }
});

test("with --catalog: binary capability gap yields E_BINARY_CAPABILITY_MISSING", async () => {
  const cat = await mkdtemp(path.join(os.tmpdir(), "vc-cat-bin-cap-"));
  await mkdir(path.join(cat, "tools"), { recursive: true });
  await mkdir(path.join(cat, "skills"), { recursive: true });
  await mkdir(path.join(cat, "binaries"), { recursive: true });
  // binary needs payment:execute_unrestricted, ceo only has shell:execute + filesystem:read
  await writeFile(
    path.join(cat, "binaries", "money-cli.yml"),
    `id: money-cli
type: binary
command: money-cli
description: "fictitious"
required_capabilities: [shell:execute, payment:execute_unrestricted]
`
  );
  const { proj, orgDir } = await makeFixtureWithBinary("money-cli");
  try {
    const { findings } = await validateCompany(orgDir, { catalogDir: cat });
    assert.ok(errorCodes(findings).includes("E_BINARY_CAPABILITY_MISSING"));
  } finally {
    await rm(proj, { recursive: true, force: true });
    await rm(cat, { recursive: true, force: true });
  }
});

test("with --catalog: binary reference with matching caps passes", async () => {
  const cat = await mkdtemp(path.join(os.tmpdir(), "vc-cat-bin-ok-"));
  await mkdir(path.join(cat, "tools"), { recursive: true });
  await mkdir(path.join(cat, "skills"), { recursive: true });
  await mkdir(path.join(cat, "binaries"), { recursive: true });
  await writeFile(
    path.join(cat, "binaries", "python3.yml"),
    `id: python3
type: binary
command: python3
description: "Python 3"
required_capabilities: [shell:execute]
`
  );
  const { proj, orgDir } = await makeFixtureWithBinary("python3");
  try {
    const { findings } = await validateCompany(orgDir, { catalogDir: cat });
    assert.deepEqual(errorCodes(findings), []);
  } finally {
    await rm(proj, { recursive: true, force: true });
    await rm(cat, { recursive: true, force: true });
  }
});
