import { differenceInDays } from "date-fns";
import { z } from "zod";
import { MAX_DATE_RANGE } from "../lib/constants";

export const OverviewQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((args) => {
    const { from, to } = args;
    const days = differenceInDays(to, from);

    const isValidRange = days >= 0 && days <= MAX_DATE_RANGE;
    return isValidRange;
  });
