import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { requireToken } from "@/lib/api-token";
import { READ_ONLY_SCOPE } from "@/lib/constants";
import { contextFromToken } from "@/lib/mcp/context";
import { createMcpServer } from "@/lib/mcp/server";

// Browser MCP clients call this endpoint from a page, so it needs CORS
// headers. The wildcard origin is safe because the endpoint authenticates on
// the Authorization header and sets no cookie, so no ambient session can ride.
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

// The MCP session layer would need state between invocations, which a
// serverless runtime cannot hold, so the transport runs with session
// management disabled.
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
    // An SSE stream leaves a keep-alive timer running after the response,
    // which holds the serverless invocation open, so the transport answers
    // with JSON.
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
