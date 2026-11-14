import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { READ_WRITE_SCOPE, VIEW_ONLY_ROLE } from "@/lib/constants";
import { recordSettlement } from "@/lib/settlements";
import { createTransaction, deleteTransaction } from "@/lib/transactions";
import { settlementFields } from "@/schemas/settlement";
import { transactionFields } from "@/schemas/transaction";

import { parseDate, toolError, toolResult } from "./tools";

// The write tools change the Household's ledger, so they answer to the
// token's scope and to the Member's role, the same way the dashboard's own
// actions do.
export function registerTransactionWriteTools(
  server: McpServer,
  context: McpContext,
) {
  const transactionInput = transactionFields(false);
  const settlementInput = settlementFields(false);

  server.registerTool(
    "add_transaction",
    {
      title: "Add transaction",
      description:
        "Add a Transaction to the Household's ledger: an expense or income, shared with the Household or personal to the caller. A shared Transaction counts towards the Household's balances and Budgets; a personal one stays with the caller.",
      inputSchema: {
        amount: transactionInput.amount.describe(
          "Amount, in the Household's currency.",
        ),
        description: transactionInput.description.describe(
          "What the Transaction was for.",
        ),
        date: z
          .string()
          .optional()
          .describe("Date as YYYY-MM-DD. Defaults to today."),
        category: transactionInput.category.describe(
          "Name of a Category in the Household. Use list_categories to see them.",
        ),
        type: transactionInput.type
          .default("expense")
          .describe("Expense or income."),
        shared: transactionInput.shared.describe(
          "Shared Transactions count towards the Household's balances and Budgets; personal ones stay with the caller.",
        ),
        goalId: transactionInput.goalId.describe(
          "Id of a Goal in the Household the Transaction contributes to.",
        ),
        shares: transactionInput.shares.describe(
          "Per-member split of a shared expense, as amounts in the Household's currency. The amounts must add up to the Transaction's amount. Use list_members to get the member ids.",
        ),
        recurringItemId: transactionInput.recurringItemId.describe(
          "Id of a Recurring item in the Household this Transaction records. Optional; carries the item as posted for this occurrence.",
        ),
      },
    },
    async ({
      amount,
      description,
      date,
      category,
      type,
      shared,
      goalId,
      shares,
      recurringItemId,
    }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const transaction = await createTransaction(
          context.householdId,
          context.userId,
          {
            amount,
            description,
            date: date ? parseDate(date) : today(),
            category,
            type,
            shared,
            goalId: goalId || undefined,
            shares,
            recurringItemId,
            // The ledger keeps one answer to who added the Transaction.
            addedVia: "agent",
          },
        );

        return toolResult({
          id: transaction.id,
          currency: context.currency,
          date: transaction.date.toISOString(),
          description: transaction.description,
          amount: transaction.amount.toNumber(),
          type: transaction.type,
          category: transaction.category,
          shared: transaction.shared,
          memberId: context.userId,
        });
      } catch (error) {
        return toolError(errorMessage(error));
      }
    },
  );

  server.registerTool(
    "delete_transaction",
    {
      title: "Delete transaction",
      description:
        "Delete a Transaction from the Household's ledger. The Household's balances and history rollups move with it. Use list_transactions to find the Transaction's id.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe(
            "Id of the Transaction to delete. Use list_transactions to see them.",
          ),
      },
    },
    async ({ id }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        await deleteTransaction(context.householdId, id);

        return toolResult({ deleted: id, memberId: context.userId });
      } catch (error) {
        return toolError(errorMessage(error));
      }
    },
  );

  server.registerTool(
    "record_settlement",
    {
      title: "Record settlement",
      description:
        "Record a Settlement: the caller paid the other Member back what the caller owed them. Use it when get_balances shows the caller owes that Member. The Settlement is personal to the caller and clears that debt. No money moves inside the app.",
      inputSchema: {
        memberId: settlementInput.memberId.describe(
          "Id of the Member the caller paid back. Use get_balances to see them.",
        ),
        amount: settlementInput.amount.describe(
          "Amount paid back, in the Household's currency.",
        ),
      },
    },
    async ({ memberId, amount }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const settlement = await recordSettlement(
          context.householdId,
          context.userId,
          {
            memberId,
            amount,
            addedVia: "agent",
          },
        );

        return toolResult({
          id: settlement.id,
          currency: context.currency,
          date: settlement.date.toISOString(),
          amount: settlement.amount.toNumber(),
          description: settlement.description,
          memberId: context.userId,
        });
      } catch (error) {
        return toolError(errorMessage(error));
      }
    },
  );
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : String(cause);
}

// The calendar day is the caller's own, like the ranges the read tools
// resolve, and it is stored at UTC midnight so the day's parts match.
function today() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
  );
}
