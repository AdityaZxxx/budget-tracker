import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  createHouseholdCategory,
  deleteHouseholdCategory,
  updateHouseholdCategory,
} from "@/lib/categories";
import { READ_WRITE_SCOPE, VIEW_ONLY_ROLE } from "@/lib/constants";
import {
  categoryIconSchema,
  categoryNameSchema,
  categoryTypeSchema,
} from "@/schemas/categories";

import { toolError, toolResult } from "./tools";

// MCP writes follow the dashboard's authorization rule: token scope and
// Member role.
export function registerCategoryWriteTools(
  server: McpServer,
  context: McpContext,
) {
  server.registerTool(
    "create_category",
    {
      title: "Create category",
      description:
        "Create a Category in the Household: a label for Transactions, of type expense or income. A Transaction's category must match one of the Household's Categories.",
      inputSchema: {
        name: categoryNameSchema.describe(
          "Name of the Category, 3 to 20 characters.",
        ),
        icon: categoryIconSchema.describe(
          "Icon for the Category, up to 20 characters.",
        ),
        type: categoryTypeSchema.describe(
          "Whether the Category labels income or expense Transactions.",
        ),
      },
    },
    async ({ name, icon, type }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const category = await createHouseholdCategory(context.householdId, {
          name,
          icon,
          type,
        });

        return toolResult({
          name: category.name,
          icon: category.icon,
          type: category.type,
          memberId: context.userId,
        });
      } catch (error) {
        return toolError(errorMessage(error));
      }
    },
  );

  server.registerTool(
    "update_category",
    {
      title: "Update category",
      description:
        "Rename a Category in the Household or change its icon. Transactions and Budgets that used the old name move with it. The Settlement Category cannot be edited.",
      inputSchema: {
        originalName: categoryNameSchema.describe(
          "Current name of the Category. Use list_categories to see them.",
        ),
        name: categoryNameSchema.describe(
          "New name for the Category, 3 to 20 characters.",
        ),
        icon: categoryIconSchema.describe(
          "New icon for the Category, up to 20 characters.",
        ),
        type: categoryTypeSchema.describe(
          "Whether the Category labels income or expense Transactions.",
        ),
      },
    },
    async ({ originalName, name, icon, type }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const category = await updateHouseholdCategory(context.householdId, {
          originalName,
          name,
          icon,
          type,
        });

        return toolResult({
          name: category.name,
          icon: category.icon,
          type: category.type,
          memberId: context.userId,
        });
      } catch (error) {
        return toolError(errorMessage(error));
      }
    },
  );

  server.registerTool(
    "delete_category",
    {
      title: "Delete category",
      description:
        "Delete a Category from the Household. Use list_categories to see the Categories.",
      inputSchema: {
        name: categoryNameSchema.describe(
          "Name of the Category to delete. Use list_categories to see them.",
        ),
        type: categoryTypeSchema.describe(
          "Whether the Category labels income or expense Transactions.",
        ),
      },
    },
    async ({ name, type }) => {
      if (context.scope !== READ_WRITE_SCOPE)
        return toolError("This token is read-only.");
      if (context.role === VIEW_ONLY_ROLE)
        return toolError(
          "View-only members cannot make changes in this household.",
        );

      try {
        const category = await deleteHouseholdCategory(context.householdId, {
          name,
          type,
        });

        return toolResult({
          name: category.name,
          icon: category.icon,
          type: category.type,
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
