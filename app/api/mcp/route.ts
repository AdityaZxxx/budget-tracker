import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { requireToken } from "@/lib/api-token";
import { READ_ONLY_SCOPE } from "@/lib/constants";
import { contextFromToken } from "@/lib/mcp/context";
import { createMcpServer } from "@/lib/mcp/server";

// Browser-based MCP clients, the MCP Inspector among them, call this endpoint
// from a web page, so the browser has to be told the endpoint is reachable.
// The token is a bearer credential the client sets itself and nothing here is
// authenticated by cookie, so there is no session for another site to ride.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, mcp-session-id, mcp-protocol-version, Last-Event-ID",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// The token is the only credential, so the endpoint has no session of its own.
// The MCP protocol's session layer would be a second one that a serverless
// runtime cannot hold between invocations anyway, so the transport runs with
// session management disabled.
export async function POST(request: Request) {
  const auth = await requireToken(READ_ONLY_SCOPE);

  if (!auth.ok) {
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: CORS_HEADERS },
    );
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
    const response = await transport.handleRequest(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      headers.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } finally {
    await transport.close();
    await server.close();
  }
}
