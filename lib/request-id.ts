import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const storage = new AsyncLocalStorage<{ requestId: string }>();

export async function withRequestId<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ requestId: randomUUID() }, fn);
}

export function getRequestId() {
  return storage.getStore()?.requestId;
}
