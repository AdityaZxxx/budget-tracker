import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { requireToken } from "@/lib/api-token";
import { READ_ONLY_SCOPE } from "@/lib/constants";
import { contextFromToken } from "@/lib/mcp/context";
import { createMcpServer } from "@/lib/mcp/server";

// The token is the only credential, so the endpoint has no session of its own.
// The MCP protocol's session layer would be a second one that a serverless
// runtime cannot hold between invocations anyway, so the transport runs with
// session management disabled.
export async function POST(request: Request) {
  const auth = await requireToken(READ_ONLY_SCOPE);

  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const server = createMcpServer(contextFromToken(auth));
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // A JSON answer ends the request as soon as the tool is done. An SSE
    // stream would leave a keep-alive timer running after the response, which
    // holds the serverless invocation open.
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}
