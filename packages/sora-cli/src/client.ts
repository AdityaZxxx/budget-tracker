import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolOutcome = {
  text: string;
  isError: boolean;
};

// The endpoint answers application/json, which the transport handles on its
// own, so connecting is all the handshake this CLI needs.
export async function callTool(
  endpoint: string,
  token: string,
  call: ToolCall,
): Promise<ToolOutcome> {
  const client = new Client({ name: "sora-cli", version: "0.1.0" });

  try {
    const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });

    await client.connect(transport);

    const result = await client.callTool({
      name: call.name,
      arguments: call.arguments,
    });

    const text = textFromContent(result.content);

    return { text, isError: result.isError === true };
  } catch (error) {
    throw new Error(describeFailure(error, endpoint), { cause: error });
  } finally {
    await client.close();
  }
}

// The SDK types the tool result as a union that includes the compatibility
// result, where the content is unknown, so the text parts are picked out
// here instead of being assumed.
function textFromContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        (part as { type?: unknown }).type === "text",
    )
    .map((part) => part.text)
    .join("\n");
}

function describeFailure(error: unknown, endpoint: string): string {
  if (error instanceof McpError) {
    return error.message;
  }

  if (isStreamableHttpError(error)) {
    if (error.code === 401) {
      return "The Sora server rejected the token. Check the token, and check that the Household has agent access turned on.";
    }
    if (error.code === 403) {
      return "The token does not have access to this operation.";
    }
    if (error.code === 404) {
      return `No Sora endpoint answered at ${endpoint}. Check SORA_URL.`;
    }
    return `The Sora server answered with HTTP ${error.code}.`;
  }

  const cause = causeMessage(error);

  if (cause) {
    return `Could not reach the Sora server at ${endpoint}: ${cause}`;
  }

  return error instanceof Error ? error.message : String(error);
}

function isStreamableHttpError(
  error: unknown,
): error is Error & { code: number | undefined } {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "number"
  );
}

function causeMessage(error: unknown): string | null {
  if (!(error instanceof Error) || !("cause" in error)) {
    return null;
  }

  const cause = error.cause;

  if (cause instanceof AggregateError) {
    const reasons = cause.errors.map((entry) =>
      entry instanceof Error ? entry.message : String(entry),
    );

    return reasons.join(", ") || null;
  }

  if (cause instanceof Error && cause.message) {
    return cause.message;
  }

  return null;
}
