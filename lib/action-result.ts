export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T> {
  return data === undefined ? { ok: true } : { ok: true, data };
}

export function fail(message: string): ActionResult<never> {
  return { ok: false, message };
}
