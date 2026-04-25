/**
 * Pure tool handlers for the company-ops MCP server.
 *
 * Each handler receives `(args, context)` where context exposes runtime hooks
 * (orchestrator client, artifact reader, user-prompt channel). For Inkrement 1
 * we ship stub implementations that return predictable mock data so the
 * contract can be exercised end-to-end without a live runtime. Inkrement 2
 * replaces these with HTTP calls to haex-corp's server APIs.
 */

import { readFile } from "node:fs/promises";

export const TOOL_DEFINITIONS = [
  {
    name: "dispatch_to_agent",
    description:
      "Dispatch a sub-task to a specific worker agent identified by role. The runtime spawns the worker (Hermes profile per role), passes the task spec, and returns a dispatch handle.",
    inputSchema: {
      type: "object",
      properties: {
        role: { type: "string", description: "Worker role-id, e.g. 'frontend-dev'." },
        task: {
          type: "object",
          description: "Sub-task spec (same shape as queue task.yaml).",
          properties: {
            goal: { type: "string" },
            inputs: { type: "array", items: { type: "string" } },
            expected_outputs: { type: "array", items: { type: "string" } },
            isolation: { type: "string", enum: ["worktree", "shared"] },
          },
          required: ["goal"],
        },
      },
      required: ["role", "task"],
    },
  },
  {
    name: "read_artifact",
    description:
      "Read an artifact file produced by another agent. Path is relative to the project root or absolute. Use this to consume the previous agent's deliverables.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
      required: ["path"],
    },
  },
  {
    name: "ask_user",
    description:
      "Ask the user a clarification question. Suspends current task, waits for response. Only callable when the task autonomy permits user interaction (supervised or interactive).",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string" },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Optional multiple-choice options. If omitted, free-text reply.",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "escalate",
    description:
      "Escalate to the user with a reason. Halts the current task pending user decision. Use when task autonomy=full but a sensitive capability or unrecoverable error requires human oversight.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string" },
        suggested_action: { type: "string" },
      },
      required: ["reason"],
    },
  },
  {
    name: "query_org_chart",
    description:
      "Return the company's reports-to graph and per-agent metadata. Useful when the CEO needs to discover available roles before dispatch.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

export function makeHandlers(context = {}) {
  const {
    orchestrator = stubOrchestrator(),
    artifactReader = defaultArtifactReader(),
    userChannel = stubUserChannel(),
    orgReader = stubOrgReader(),
  } = context;

  return {
    async dispatch_to_agent(args) {
      validateRequired(args, ["role", "task"]);
      const handle = await orchestrator.dispatch({ role: args.role, task: args.task });
      return ok(`dispatched to ${args.role}`, handle);
    },

    async read_artifact(args) {
      validateRequired(args, ["path"]);
      const content = await artifactReader.read(args.path);
      return ok(`artifact loaded`, { path: args.path, content });
    },

    async ask_user(args) {
      validateRequired(args, ["question"]);
      const answer = await userChannel.ask({ question: args.question, options: args.options });
      return ok("user replied", { answer });
    },

    async escalate(args) {
      validateRequired(args, ["reason"]);
      const decision = await userChannel.escalate({
        reason: args.reason,
        suggested_action: args.suggested_action,
      });
      return ok("user decided", { decision });
    },

    async query_org_chart() {
      const chart = await orgReader.read();
      return ok("org chart", chart);
    },
  };
}

function validateRequired(args, keys) {
  for (const k of keys) {
    if (args[k] == null) throw new Error(`missing required argument: ${k}`);
  }
}

function ok(summary, data) {
  return {
    content: [
      { type: "text", text: summary },
      { type: "text", text: JSON.stringify(data, null, 2) },
    ],
    isError: false,
  };
}

// ---- Stub backends (Inkrement 1) ----

function stubOrchestrator() {
  return {
    async dispatch({ role, task }) {
      return {
        dispatch_id: `stub-${role}-${Date.now()}`,
        status: "queued",
        role,
        goal: task.goal,
        note: "stub orchestrator — Inkrement 2 will replace with real haex-corp call",
      };
    },
  };
}

function defaultArtifactReader() {
  return {
    async read(p) {
      return await readFile(p, "utf8");
    },
  };
}

function stubUserChannel() {
  return {
    async ask() {
      return {
        note: "stub user channel — Inkrement 2 will replace with approval-service call",
        simulated_answer: "[user-stub]",
      };
    },
    async escalate() {
      return {
        decision: "approve",
        note: "stub user channel — Inkrement 2 will replace with approval-service call",
      };
    },
  };
}

function stubOrgReader() {
  return {
    async read() {
      return {
        note: "stub org reader — Inkrement 2 will load .specify/org/agents/",
        agents: [],
      };
    },
  };
}
