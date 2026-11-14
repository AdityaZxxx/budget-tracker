import { freeText } from "@/schemas/text";

export const HouseholdNameSchema = freeText({
  max: 50,
  maxMessage: "Keep the name under 50 characters",
});
