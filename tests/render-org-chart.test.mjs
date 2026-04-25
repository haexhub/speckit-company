import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderOrgChart, renderOrgChartFromDir } from "../scripts/render-org-chart.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = (name) => path.join(__dirname, "fixtures", name);

test("renderOrgChart emits a flowchart header", () => {
  const out = renderOrgChart([
    { role: "ceo", reports_to: null, status: "active", model: "claude-opus-4-7" },
  ]);
  assert.match(out, /^flowchart TD/m);
});

test("renderOrgChart includes a node per agent", () => {
  const out = renderOrgChart([
    { role: "ceo", reports_to: null, status: "active", model: "claude-opus-4-7" },
    { role: "dev", reports_to: "ceo", status: "active", model: "claude-sonnet-4-6" },
  ]);
  assert.match(out, /\bceo\b/);
  assert.match(out, /\bdev\b/);
});

test("renderOrgChart adds an edge for each reports_to relationship", () => {
  const out = renderOrgChart([
    { role: "ceo", reports_to: null, status: "active", model: "claude-opus-4-7" },
    { role: "dev", reports_to: "ceo", status: "active", model: "claude-sonnet-4-6" },
  ]);
  // Mermaid edges are like "ceo --> dev"
  assert.match(out, /ceo\s*-->\s*dev/);
});

test("renderOrgChart applies status classes", () => {
  const out = renderOrgChart([
    { role: "ceo", reports_to: null, status: "active", model: "claude-opus-4-7" },
    { role: "old", reports_to: "ceo", status: "pending_retire", model: "claude-haiku-4-5" },
  ]);
  // class assignments — Mermaid uses ":::class" after the node id (or after a labelled node "id[\"label\"]")
  assert.match(out, /ceo(\[[^\]]*\])?:::active/);
  assert.match(out, /old(\[[^\]]*\])?:::pending_retire/);
  // classDef definitions
  assert.match(out, /classDef\s+active/);
  assert.match(out, /classDef\s+pending_retire/);
});

test("renderOrgChart handles multi-level hierarchy", () => {
  const out = renderOrgChart([
    { role: "ceo", reports_to: null, status: "active", model: "x" },
    { role: "cto", reports_to: "ceo", status: "active", model: "x" },
    { role: "dev", reports_to: "cto", status: "active", model: "x" },
  ]);
  assert.match(out, /ceo\s*-->\s*cto/);
  assert.match(out, /cto\s*-->\s*dev/);
});

test("renderOrgChart shows model in node label", () => {
  const out = renderOrgChart([
    { role: "ceo", reports_to: null, status: "active", model: "claude-opus-4-7" },
  ]);
  assert.match(out, /claude-opus-4-7/);
});

test("renderOrgChartFromDir reads a fixture and produces a mermaid block", async () => {
  const md = await renderOrgChartFromDir(fixtures("valid-finite"));
  assert.match(md, /```mermaid/);
  assert.match(md, /```\s*$/);  // closing fence
  assert.match(md, /flowchart TD/);
  assert.match(md, /\bceo\b/);
  assert.match(md, /\bdev\b/);
});

test("renderOrgChartFromDir filters out 'retired' agents", async () => {
  // We don't have a fixture for this; build inline via renderOrgChart
  const out = renderOrgChart([
    { role: "ceo", reports_to: null, status: "active", model: "x" },
    { role: "ghost", reports_to: "ceo", status: "retired", model: "x" },
  ]);
  // Retired agents are hidden — the chart shouldn't reference them.
  assert.doesNotMatch(out, /\bghost\b/);
});
