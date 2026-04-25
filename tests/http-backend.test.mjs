import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

import { makeHttpContext } from "../mcp-server/firma-ops/http-backend.mjs";
import { makeHandlers } from "../mcp-server/firma-ops/handlers.mjs";

function makeMockServer({ routes }) {
  return new Promise((resolve) => {
    const calls = [];
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const key = `${req.method} ${req.url.split("?")[0]}`;
        calls.push({ key, body, query: req.url.split("?")[1] ?? null });
        const handler = routes[key];
        if (!handler) {
          res.writeHead(404, { "content-type": "text/plain" });
          res.end(`no route for ${key}`);
          return;
        }
        const result = handler({ body: body ? JSON.parse(body) : null, query: req.url });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
      });
    });
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, port, calls });
    });
  });
}

test("dispatch tool POSTs to /api/projects/<slug>/company/dispatch", async () => {
  const { server, port, calls } = await makeMockServer({
    routes: {
      "POST /api/projects/myproj/company/dispatch": ({ body }) => ({
        dispatch_id: "remote-1",
        status: "accepted",
        echo: body,
      }),
    },
  });

  const ctx = makeHttpContext({ baseUrl: `http://127.0.0.1:${port}`, project: "myproj" });
  const handlers = makeHandlers(ctx);

  const result = await handlers.dispatch_to_agent({
    role: "dev",
    task: { goal: "build feature X" },
  });

  assert.equal(result.isError, false);
  const data = JSON.parse(result.content[1].text);
  assert.equal(data.dispatch_id, "remote-1");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].key, "POST /api/projects/myproj/company/dispatch");
  const requestBody = JSON.parse(calls[0].body);
  assert.equal(requestBody.role, "dev");
  assert.equal(requestBody.task.goal, "build feature X");

  server.close();
});

test("ask_user POSTs to /ask-user", async () => {
  const { server, port, calls } = await makeMockServer({
    routes: {
      "POST /api/projects/myproj/company/ask-user": ({ body }) => ({
        answer: `received: ${body.question}`,
      }),
    },
  });

  const ctx = makeHttpContext({ baseUrl: `http://127.0.0.1:${port}`, project: "myproj" });
  const handlers = makeHandlers(ctx);

  const result = await handlers.ask_user({ question: "Who?", options: ["Alice", "Bob"] });
  const data = JSON.parse(result.content[1].text);
  assert.match(data.answer.answer, /received: Who/);
  assert.equal(calls.length, 1);
  const reqBody = JSON.parse(calls[0].body);
  assert.deepEqual(reqBody.options, ["Alice", "Bob"]);
  server.close();
});

test("escalate POSTs to /escalate", async () => {
  const { server, port } = await makeMockServer({
    routes: {
      "POST /api/projects/myproj/company/escalate": () => ({ decision: "approve" }),
    },
  });

  const ctx = makeHttpContext({ baseUrl: `http://127.0.0.1:${port}`, project: "myproj" });
  const handlers = makeHandlers(ctx);
  const result = await handlers.escalate({ reason: "test" });
  const data = JSON.parse(result.content[1].text);
  assert.equal(data.decision.decision, "approve");
  server.close();
});

test("query_org_chart GETs /agents", async () => {
  const { server, port } = await makeMockServer({
    routes: {
      "GET /api/projects/myproj/company/agents": () => ({
        agents: [{ role: "ceo" }, { role: "dev" }],
      }),
    },
  });

  const ctx = makeHttpContext({ baseUrl: `http://127.0.0.1:${port}`, project: "myproj" });
  const handlers = makeHandlers(ctx);
  const result = await handlers.query_org_chart({});
  const data = JSON.parse(result.content[1].text);
  assert.equal(data.agents.length, 2);
  assert.equal(data.agents[0].role, "ceo");
  server.close();
});

test("Authorization header is set when token is provided", async () => {
  const headers = [];
  const server = http.createServer((req, res) => {
    headers.push({ authorization: req.headers.authorization });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ dispatch_id: "x" }));
  });
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();

  const ctx = makeHttpContext({
    baseUrl: `http://127.0.0.1:${port}`,
    project: "myproj",
    token: "test-token",
  });
  const handlers = makeHandlers(ctx);
  await handlers.dispatch_to_agent({ role: "x", task: { goal: "y" } });

  assert.equal(headers[0].authorization, "Bearer test-token");
  server.close();
});

test("HTTP failure surfaces as a tool error", async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(503, { "content-type": "text/plain" });
    res.end("backend down");
  });
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();

  const ctx = makeHttpContext({ baseUrl: `http://127.0.0.1:${port}`, project: "myproj" });
  const handlers = makeHandlers(ctx);

  await assert.rejects(
    () => handlers.dispatch_to_agent({ role: "x", task: { goal: "y" } }),
    /failed.*503/
  );
  server.close();
});
