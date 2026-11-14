import type { McpContext } from "./context";
import type { UpdateGoalSchemaType } from "@/schemas/goals";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { deleteHouseholdBudget, setHouseholdBudget } from "@/lib/budgets";
import { READ_WRITE_SCOPE, VIEW_ONLY_ROLE } from "@/lib/constants";
import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  updateHouseholdGoal,
} from "@/lib/goals";
import { budgetFields } from "@/schemas/budgets";
import { goalFields } from "@/schemas/goals";

import { parseDate, toolError, toolErrorMessage, toolResult } from "./tools";

const DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// MCP writes follow the dashboard's authorization rule: token scope and
// Member role.
export function registerGoalBudgetWriteTools(
  server: McpServer,
  context: McpContext,
) {
  const goalInput = goalFields(false);
  const budgetInput = budgetFields(false);
  server.registerTool(
    "delete_goal",
    {
      title: "Delete goal",
      description:
        "Delete a Goal from the Household. Transactions tagged with the Goal keep the money in the ledger and lose the tag. Use list_goals to find the Goal's id.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Id of the Goal to delete. Use list_goals to see them."),
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
        await deleteHouseholdGoal(context.householdId, id);

        return toolResult({ deleted: id, memberId: context.userId });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "delete_budget",
    {
      title: "Delete budget",
      description:
        "Delete the Household's Budget for one expense Category. Use list_budgets to find the Budget's id.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe(
            "Id of the Budget to delete. Use list_budgets to see them.",
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
        await deleteHouseholdBudget(context.householdId, id);

        return toolResult({ deleted: id, memberId: context.userId });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "create_goal",
    {
      title: "Create goal",
      description:
        "Create a Goal in the Household: an amount to save, with an optional deadline. A Goal is not tied to a Transaction; money reaches it through Transactions tagged with the Goal.",
      inputSchema: {
        name: goalInput.name.describe("Name of the Goal, up to 50 characters."),
        target: goalInput.target.describe(
          "Amount to save, in the Household's currency.",
        ),
        deadline: z
          .string()
          .regex(DEADLINE_PATTERN)
          .optional()
          .describe("Deadline as YYYY-MM-DD. Optional."),
      },
    },
    async ({ name, target, deadline }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const goal = await createHouseholdGoal(context.householdId, {
          name,
          target,
          deadline: deadline ? parseDate(deadline) : undefined,
        });

        return toolResult({
          id: goal.id,
          currency: context.currency,
          name: goal.name,
          target: goal.target,
          deadline: goal.deadline?.toISOString() ?? null,
          memberId: context.userId,
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "update_goal",
    {
      title: "Update goal",
      description:
        "Update a Goal in the Household: its name, target, or deadline. Only the fields provided change. Transactions tagged with the Goal are not affected. Use list_goals to find the Goal's id.",
      inputSchema: {
        id: z
          .string()
          .min(1)
          .describe("Id of the Goal to update. Use list_goals to see them."),
        name: goalInput.name
          .optional()
          .describe("New name for the Goal, up to 50 characters."),
        target: goalInput.target
          .optional()
          .describe("New amount to save, in the Household's currency."),
        deadline: z
          .union([z.literal(""), z.string().regex(DEADLINE_PATTERN)])
          .nullable()
          .optional()
          .describe(
            "New deadline as YYYY-MM-DD, or null (or an empty string) to clear it. Omit to leave it unchanged.",
          ),
      },
    },
    async ({ id, name, target, deadline }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const update: UpdateGoalSchemaType = { id };
        if (name !== undefined) {
          update.name = name;
        }
        if (target !== undefined) {
          update.target = target;
        }
        if (deadline !== undefined) {
          update.deadline =
            deadline === null || deadline === "" ? null : parseDate(deadline);
        }

        const goal = await updateHouseholdGoal(context.householdId, update);

        return toolResult({
          id: goal.id,
          currency: context.currency,
          name: goal.name,
          target: goal.target,
          deadline: goal.deadline?.toISOString() ?? null,
          memberId: context.userId,
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "set_budget",
    {
      title: "Set budget",
      description:
        "Set the Household's monthly Budget for one expense Category: the limit, and whether it is soft (warns at the limit) or hard (rejects shared expenses over it). A Budget applies to shared expenses only. A Household has one Budget per Category, so setting a Category that already has one replaces its limit.",
      inputSchema: {
        category: budgetInput.category.describe(
          "Name of an expense Category in the Household. Use list_categories to see them.",
        ),
        amount: budgetInput.amount.describe(
          "Monthly limit, in the Household's currency.",
        ),
        mode: budgetInput.mode
          .default("soft")
          .describe(
            "Soft warns at the limit; hard rejects shared expenses over it.",
          ),
      },
    },
    async ({ category, amount, mode }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const budget = await setHouseholdBudget(context.householdId, {
          category,
          amount,
          mode,
        });

        return toolResult({
          id: budget.id,
          currency: context.currency,
          category: budget.category,
          amount: budget.amount,
          mode: budget.mode,
          memberId: context.userId,
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );
}
