import type { McpContext } from "./context";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerReadTools } from "./read-tools";

// A server per request. The endpoint is stateless, so there is nothing to
// carry over from one call to the next.
export function createMcpServer(context: McpContext) {
  const server = new McpServer({
    name: "sora",
    version: "1.0.0",
  });

  registerReadTools(server, context);

  return server;
}
