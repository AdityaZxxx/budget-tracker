import { z } from "zod";

export const MAX_MONEY_AMOUNT = 1_000_000_000_000;

// Coercion is a transport concern by design: the web coerces because a form
// hands over strings, the MCP stays strict because JSON carries a number.
// This is the one place the money rules live; splits are taken on both.
function numberInput(coerced: boolean) {
  if (!coerced) {
    return z.number({ error: "Amount must be a number" });
  }

  return z.preprocess((value, ctx) => {
    if (typeof value === "boolean") {
      ctx.addIssue({
        code: "custom",
        message: "Amount must be a number",
      });
      return z.NEVER;
    }

    return value;
  }, z.coerce.number());
}

export function amountNumber(coerced: boolean) {
  return numberInput(coerced).pipe(
    z
      .number()
      .positive()
      .multipleOf(0.01)
      .max(MAX_MONEY_AMOUNT, "Amount must be at most 1,000,000,000,000"),
  );
}

export function sharesArray(coerced: boolean) {
  return z.array(
    z.object({
      userId: z.string().min(1),
      amount: numberInput(coerced).pipe(
        z
          .number()
          .positive("Share amounts must be greater than zero")
          .multipleOf(0.01)
          .max(MAX_MONEY_AMOUNT, "Amount must be at most 1,000,000,000,000"),
      ),
    }),
  );
}
