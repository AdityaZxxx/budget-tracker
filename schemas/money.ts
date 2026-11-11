import { z } from "zod";

// Coercion is a transport concern by design: the web coerces because a form
// hands over strings, the MCP stays strict because JSON carries a number.
// This is the one place the money rules live; splits are taken on both.
export function amountNumber(coerced: boolean) {
  return (coerced ? z.coerce.number() : z.number()).positive().multipleOf(0.01);
}

export function sharesArray(coerced: boolean) {
  const amount = coerced ? z.coerce.number() : z.number();
  return z.array(
    z.object({
      userId: z.string().min(1),
      amount: amount.nonnegative().multipleOf(0.01),
    }),
  );
}
