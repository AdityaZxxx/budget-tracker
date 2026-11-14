import type { z } from "zod";

export async function fetchJson<TSchema extends z.ZodType>(
  url: string,
  schema: TSchema,
  errorMessage: string,
): Promise<z.output<TSchema>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const body: unknown = await response.json();
  return schema.parse(body);
}
