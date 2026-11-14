import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_ENDPOINT = "http://localhost:3000/api/mcp";

const CONFIG_PATH = join(homedir(), ".config", "sora", "config.json");

export type ResolvedConfig = {
  endpoint: string;
  token: string | null;
};

// The environment wins over the stored file so a script can point the CLI at
// another Sora without editing the file.
export async function resolveConfig(): Promise<ResolvedConfig> {
  const stored = await readStoredConfig();

  return {
    endpoint: validEndpoint(process.env.SORA_URL?.trim() || DEFAULT_ENDPOINT),
    token: process.env.SORA_TOKEN?.trim() || stored.token?.trim() || null,
  };
}

function validEndpoint(endpoint: string): string {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error(
      `Invalid endpoint URL: ${endpoint}. Set SORA_URL to the full URL of the Sora MCP endpoint.`,
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      `Invalid endpoint URL: ${endpoint}. Set SORA_URL to an http(s) URL of the Sora MCP endpoint.`,
    );
  }

  return endpoint;
}

async function readStoredConfig(): Promise<{ token?: string }> {
  let raw: string;

  try {
    raw = await readFile(CONFIG_PATH, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      return {};
    }
    throw error;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `${CONFIG_PATH} is not valid JSON. Fix the file or remove it.`,
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${CONFIG_PATH} must hold a JSON object.`);
  }

  const { token } = parsed as { token?: unknown };

  return { token: typeof token === "string" ? token : undefined };
}

function isMissingFile(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as NodeJS.ErrnoException).code === "ENOENT"
  );
}
