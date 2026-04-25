import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TOOL_DEFINITIONS, makeHandlers } from "../mcp-server/company-ops/handlers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = (name) => path.join(__dirname, "fixtures", name);

test("TOOL_DEFINITIONS exposes the five planned tools", () => {
  const names = TOOL_DEFINITIONS.map((t) => t.name).sort();
  assert.deepEqual(names, [
    "ask_user",
    "dispatch_to_agent",
    "escalate",
    "query_org_chart",
    "read_artifact",
  ]);
});

test("each tool definition has a non-empty description and an object inputSchema", () => {
  for (const def of TOOL_DEFINITIONS) {
    assert.equal(typeof def.description, "string");
    assert.ok(def.description.length > 0, `tool ${def.name} has empty description`);
    assert.equal(def.inputSchema.type, "object");
  }
});

test("dispatch_to_agent stub returns dispatch_id", async () => {
  const handlers = makeHandlers();
  const result = await handlers.dispatch_to_agent({ role: "dev", task: { goal: "test" } });
  assert.equal(result.isError, false);
  // Second content block is JSON
  const data = JSON.parse(result.content[1].text);
  assert.match(data.dispatch_id, /^stub-dev-\d+$/);
});

test("dispatch_to_agent rejects missing role", async () => {
  const handlers = makeHandlers();
  await assert.rejects(
    () => handlers.dispatch_to_agent({ task: { goal: "test" } }),
    /missing required argument: role/
  );
});

test("read_artifact reads a real file from disk", async () => {
  const handlers = makeHandlers();
  const result = await handlers.read_artifact({
    path: path.join(fixtures("valid-finite"), "constitution.md"),
  });
  const data = JSON.parse(result.content[1].text);
  assert.match(data.content, /Test Valid Finite/);
});

test("query_org_chart returns a stub structure", async () => {
  const handlers = makeHandlers();
  const result = await handlers.query_org_chart({});
  assert.equal(result.isError, false);
  const data = JSON.parse(result.content[1].text);
  assert.ok(Array.isArray(data.agents));
});

test("makeHandlers accepts a custom orchestrator backend", async () => {
  const calls = [];
  const handlers = makeHandlers({
    orchestrator: {
      async dispatch(req) {
        calls.push(req);
        return { dispatch_id: "custom-1", status: "accepted", note: "from injected backend" };
      },
    },
  });
  const result = await handlers.dispatch_to_agent({ role: "qa", task: { goal: "review" } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].role, "qa");
  const data = JSON.parse(result.content[1].text);
  assert.equal(data.dispatch_id, "custom-1");
});
