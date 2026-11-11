import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerCategoryWriteTools } from "./write-category-tools";
import { registerGoalBudgetWriteTools } from "./write-goal-budget-tools";
import { registerTransactionWriteTools } from "./write-transaction-tools";

export function registerWriteTools(server: McpServer, context: McpContext) {
  registerCategoryWriteTools(server, context);
  registerGoalBudgetWriteTools(server, context);
  registerTransactionWriteTools(server, context);
}
