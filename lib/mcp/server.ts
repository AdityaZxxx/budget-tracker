import type { McpContext } from "./context";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { READ_WRITE_SCOPE } from "@/lib/constants";

import { registerReadTools } from "./read-tools";
import { registerWriteTools } from "./write-tools";

// The SDK allows one transport per server instance, so every request builds
// its own.
export function createMcpServer(context: McpContext) {
  const server = new McpServer({
    name: "sora",
    version: "1.0.0",
  });

  registerReadTools(server, context);

  // A read-only token is not offered the write tools at all, so the tool
  // list it sees is the list it can actually use.
  if (context.scope === READ_WRITE_SCOPE) {
    registerWriteTools(server, context);
  }

  return server;
}
