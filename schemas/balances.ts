import { z } from "zod";

export const MemberBalanceSchema = z.object({
  userId: z.string(),
  name: z.string(),
  balance: z.number(),
});

export const MemberBalancesSchema = z.array(MemberBalanceSchema);

export type MemberBalance = z.infer<typeof MemberBalanceSchema>;

export const SimplifiedTransferSchema = z.object({
  fromUserId: z.string(),
  fromName: z.string(),
  toUserId: z.string(),
  toName: z.string(),
  amount: z.number(),
});

export const SimplifiedTransfersSchema = z.array(SimplifiedTransferSchema);

export type SimplifiedTransfer = z.infer<typeof SimplifiedTransferSchema>;
