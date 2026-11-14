import type {
  CallToolResult,
  CompatibilityCallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export type ToolArguments = Record<string, string | number | boolean>;

export type ToolCall = {
  name: string;
  arguments: ToolArguments;
};

export type ToolOutcome = {
  text: string;
  isError: boolean;
};

const ContentPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.string() }).loose(),
]);

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

    if (text === null) {
      return {
        text: "The tool answered with content the CLI could not read.",
        isError: true,
      };
    }

    return { text, isError: result.isError === true };
  } catch (error) {
    throw new Error(describeFailure(error, endpoint), { cause: error });
  } finally {
    await client.close();
  }
}

// The SDK types the tool result as a union that includes the compatibility
// result, so the content is parsed here rather than assumed.
function textFromContent(
  content: CallToolResult["content"] | CompatibilityCallToolResult["content"],
): string | null {
  const parts = z.array(ContentPartSchema).safeParse(content);

  if (!parts.success) {
    return null;
  }

  const text = parts.data
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("\n");

  return text === "" ? null : text;
}

function describeFailure(cause: unknown, endpoint: string): string {
  if (cause instanceof McpError) {
    return cause.message;
  }

  if (isStreamableHttpError(cause)) {
    if (cause.code === 401) {
      return "The Sora server rejected the token. Check the token, and check that the Household has agent access turned on.";
    }
    if (cause.code === 403) {
      return "The token does not have access to this operation.";
    }
    if (cause.code === 404) {
      return `No Sora endpoint answered at ${endpoint}. Check SORA_URL.`;
    }
    return `The Sora server answered with HTTP ${cause.code}.`;
  }

  const nested = causeMessageOf(cause);

  if (nested) {
    return `Could not reach the Sora server at ${endpoint}: ${nested}`;
  }

  return cause instanceof Error ? cause.message : String(cause);
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

function causeMessageOf(cause: unknown): string | null {
  if (!(cause instanceof Error) || !("cause" in cause)) {
    return null;
  }

  const nested = cause.cause;

  if (nested instanceof AggregateError) {
    const reasons = nested.errors.map((entry) =>
      entry instanceof Error ? entry.message : String(entry),
    );

    return reasons.join(", ") || null;
  }

  if (nested instanceof Error && nested.message) {
    return nested.message;
  }

  return null;
}
