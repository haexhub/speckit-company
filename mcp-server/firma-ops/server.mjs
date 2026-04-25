#!/usr/bin/env node
/**
 * firma-ops MCP server — bootstraps stdio transport, registers tool handlers.
 *
 * Inkrement 1: stub backends, contract-correct.
 * Inkrement 2: wired to haex-corp orchestrator + approval-service via local HTTP.
 *
 * Connect via the standard MCP stdio transport. Hermes registers this server
 * via its mcp-config and forwards CEO tool calls here.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { TOOL_DEFINITIONS, makeHandlers } from "./handlers.mjs";
import { httpContextFromEnv } from "./http-backend.mjs";

const server = new Server(
  { name: "firma-ops", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

// If FIRMA_OPS_BASE_URL is set, route handlers to the live haex-corp runtime;
// otherwise fall back to in-process stubs (useful for development).
const httpContext = httpContextFromEnv();
const handlers = makeHandlers(httpContext ?? {});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const handler = handlers[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    return await handler(args);
  } catch (err) {
    return {
      content: [{ type: "text", text: `${name} failed: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
