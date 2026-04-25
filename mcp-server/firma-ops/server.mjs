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

const server = new Server(
  { name: "firma-ops", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const handlers = makeHandlers();

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
