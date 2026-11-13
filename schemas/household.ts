import { z } from "zod";

export const HouseholdNameSchema = z
  .string()
  .trim()
  .max(50, "Keep the name under 50 characters");
