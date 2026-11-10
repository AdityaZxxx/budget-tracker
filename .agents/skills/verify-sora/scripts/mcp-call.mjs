#!/usr/bin/env node
// Calls one Sora MCP tool with JSON arguments and prints the tool result.
// Verifies the transport the CLI and assistants use, not just the HTTP API.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.SORA_URL;
const token = process.env.SORA_TOKEN;

if (!url || !token) {
  console.error("mcp-call.mjs: SORA_URL and SORA_TOKEN are required");
  process.exit(1);
}

const [toolName, rawArguments = "{}"] = process.argv.slice(2);
const listTools = toolName === "--list" || toolName === "list";

if (!toolName) {
  console.error("Usage: mcp-call.mjs <tool> [json-arguments]");
  console.error("       mcp-call.mjs --list");
  process.exit(1);
}

let args = {};
if (!listTools) {
  try {
    args = JSON.parse(rawArguments);
  } catch (error) {
    console.error(`Invalid JSON arguments: ${error.message}`);
    process.exit(1);
  }
}

const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: {
    headers: { Authorization: `Bearer ${token}` },
  },
});
const client = new Client({ name: "sora-verify", version: "1.0.0" });

try {
  await client.connect(transport);

  if (listTools) {
    const result = await client.listTools();
    for (const tool of result.tools) {
      console.log(`${tool.name}\t${tool.title ?? ""}`);
    }
    process.exit(0);
  }

  const result = await client.callTool({ name: toolName, arguments: args });
  const text = result.content?.find((part) => part.type === "text")?.text ?? "";

  if (result.isError) {
    console.error(text || `Tool ${toolName} failed`);
    process.exitCode = 1;
  } else {
    console.log(text);
  }
} catch (error) {
  console.error(`mcp-call: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
