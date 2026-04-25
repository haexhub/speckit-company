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
