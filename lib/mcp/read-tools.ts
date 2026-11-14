import type { McpContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { getMemberBalances } from "@/lib/balances";
import { getBudgetsWithProgress } from "@/lib/budgets";
import { getCategories } from "@/lib/categories";
import { resolveDateRange } from "@/lib/dates";
import { getGoalsWithProgress } from "@/lib/goals";
import prisma from "@/lib/prisma";
import { getBalanceStats, getTransactionsHistory } from "@/lib/transactions";

import {
  dateRangeSchema,
  toolError,
  toolErrorMessage,
  toolResult,
} from "./tools";

// Every read but the transaction list is a household aggregate over shared
// Transactions only.
export function registerReadTools(server: McpServer, context: McpContext) {
  server.registerTool(
    "get_overview",
    {
      title: "Get overview",
      description:
        "Total income, expenses, and net balance for the Household over a date range. Counts shared Transactions only.",
      inputSchema: dateRangeSchema,
    },
    async ({ from, to }) => {
      try {
        const range = resolveDateRange(from, to);
        const stats = await getBalanceStats(
          context.householdId,
          range.from,
          range.to,
        );

        return toolResult({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          currency: context.currency,
          income: stats.income,
          expenses: stats.expense,
          net: stats.income - stats.expense,
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "list_transactions",
    {
      title: "List transactions",
      description:
        "Transactions in the Household over a date range. Includes the shared ones and the caller's own personal ones.",
      inputSchema: {
        ...dateRangeSchema,
        category: z
          .string()
          .optional()
          .describe("Only Transactions in this category."),
        shared: z
          .boolean()
          .optional()
          .describe(
            "Only shared Transactions (true) or only personal ones (false).",
          ),
      },
    },
    async ({ from, to, category, shared }) => {
      try {
        const range = resolveDateRange(from, to);
        const currency = context.currency ?? "USD";
        const transactions = await getTransactionsHistory(
          context.householdId,
          context.userId,
          range.from,
          range.to,
          { category, shared },
        );

        return toolResult({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          currency,
          transactions: transactions.map((transaction) => ({
            id: transaction.id,
            date: transaction.date.toISOString(),
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            shared: transaction.shared,
            addedBy: transaction.addedByName,
          })),
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "get_balances",
    {
      title: "Get balances",
      description:
        "What each other Member owes the caller, or what the caller owes them, from shared Transactions and Settlements.",
      inputSchema: {},
    },
    async () => {
      try {
        const balances = await getMemberBalances(
          context.householdId,
          context.userId,
        );

        return toolResult({
          currency: context.currency,
          balances: balances.map((balance) => ({
            memberId: balance.userId,
            memberName: balance.name,
            balance: balance.balance,
            status:
              balance.balance === 0
                ? "settled"
                : balance.balance > 0
                  ? "you_owe"
                  : "they_owe_you",
          })),
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "list_budgets",
    {
      title: "List budgets",
      description:
        "The Household's monthly Budgets, with what has been spent against each one this month.",
      inputSchema: {},
    },
    async () => {
      try {
        const budgets = await getBudgetsWithProgress(context.householdId);

        return toolResult({
          currency: context.currency,
          budgets: budgets.map((budget) => ({
            id: budget.id,
            category: budget.category,
            amount: budget.amount,
            mode: budget.mode,
            spent: budget.spent,
            remaining: budget.remaining,
            percent: budget.percent,
          })),
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "list_goals",
    {
      title: "List goals",
      description:
        "The Household's Goals, with how much has been contributed towards each one.",
      inputSchema: {},
    },
    async () => {
      try {
        const goals = await getGoalsWithProgress(context.householdId);

        return toolResult({
          currency: context.currency,
          goals: goals.map((goal) => ({
            id: goal.id,
            name: goal.name,
            target: goal.target,
            contributed: goal.contributed,
            deadline: goal.deadline?.toISOString() ?? null,
          })),
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "list_members",
    {
      title: "List members",
      description:
        "Every member of the Household with their id, name and role. Use these ids for transactions, settlements and shares.",
      inputSchema: {},
    },
    async () => {
      try {
        const memberships = await prisma.householdMembership.findMany({
          where: {
            householdId: context.householdId,
          },
          include: {
            user: true,
          },
          orderBy: {
            joinedAt: "asc",
          },
        });

        return toolResult({
          members: memberships.map((membership) => ({
            id: membership.userId,
            name: membership.user.name,
            role: membership.role,
          })),
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );

  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description:
        "The Household's Categories. Use these when adding a Transaction, since a Transaction's category must match one of them.",
      inputSchema: {
        type: z
          .enum(["expense", "income"])
          .optional()
          .describe("Only Categories of this type."),
      },
    },
    async ({ type }) => {
      try {
        const categories = await getCategories(context.householdId, type);

        return toolResult({
          categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
            icon: category.icon,
            type: category.type,
          })),
        });
      } catch (error) {
        return toolError(toolErrorMessage(error));
      }
    },
  );
}
