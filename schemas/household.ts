import { freeText } from "@/schemas/text";

export const HouseholdNameSchema = freeText({
  max: 50,
  maxMessage: "Keep the name under 50 characters",
});

export function parseHouseholdName(name: string) {
  const parsed = HouseholdNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Check the household name",
    );
  }

  return parsed.data;
}
