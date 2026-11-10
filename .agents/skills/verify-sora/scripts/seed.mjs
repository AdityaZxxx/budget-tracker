#!/usr/bin/env node
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
// Seeds a disposable Sora household so a verification run starts from a known
// ledger. The browser still signs in through the real form; only the data is
// planted.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const stateDir = process.env.SORA_VERIFY_STATE_DIR;
const dbUrl = process.env.SORA_VERIFY_DB_URL;
const baseUrl = process.env.SORA_VERIFY_BASE_URL;

if (!stateDir || !dbUrl || !baseUrl) {
  console.error(
    "seed.mjs: SORA_VERIFY_STATE_DIR, SORA_VERIFY_DB_URL and SORA_VERIFY_BASE_URL are required",
  );
  process.exit(1);
}

const runId = process.env.SORA_VERIFY_RUN_ID ?? "unknown";
const primaryEmail = process.env.SORA_VERIFY_EMAIL ?? "avery@sora.test";
const primaryPassword = process.env.SORA_VERIFY_PASSWORD ?? "sora-verify-pass";
const memberEmail = process.env.SORA_VERIFY_MEMBER_EMAIL ?? "blake@sora.test";
const memberPassword =
  process.env.SORA_VERIFY_MEMBER_PASSWORD ?? "sora-verify-pass";

const adapter = new PrismaPg({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

// Every fixture lives in the current UTC month so the dashboard's default
// "this month" range and the budget progress agree with the expectations.
function currentMonthDates(count) {
  const now = new Date();
  const today = now.getUTCDate();
  return Array.from({ length: count }, (_, index) => {
    const day = Math.max(1, today - (count - 1 - index));
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 12));
  });
}

async function clean() {
  // Child rows first so the deletes never fight a foreign key.
  await prisma.$transaction([
    prisma.transactionShare.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.apiToken.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.category.deleteMany(),
    prisma.monthHistory.deleteMany(),
    prisma.yearHistory.deleteMany(),
    prisma.inviteLink.deleteMany(),
    prisma.householdMembership.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
    prisma.household.deleteMany(),
    prisma.rateLimit.deleteMany(),
  ]);
}

async function createUser({ id, name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
}

function historyRollups(transactions) {
  const months = new Map();
  const years = new Map();

  for (const transaction of transactions) {
    if (!transaction.shared) continue;
    const monthKey = `${transaction.date.getUTCFullYear()}-${transaction.date.getUTCMonth()}-${transaction.date.getUTCDate()}`;
    const yearKey = `${transaction.date.getUTCFullYear()}-${transaction.date.getUTCMonth()}`;
    const month = months.get(monthKey) ?? { income: 0, expense: 0 };
    const year = years.get(yearKey) ?? { income: 0, expense: 0 };
    const field = transaction.type === "income" ? "income" : "expense";
    month[field] += transaction.amount;
    year[field] += transaction.amount;
    months.set(monthKey, month);
    years.set(yearKey, year);
  }

  return { months, years };
}

async function main() {
  await clean();

  const averyId = randomUUID();
  const blakeId = randomUUID();
  const householdId = randomUUID();

  await createUser({
    id: averyId,
    name: "Avery Quinn",
    email: primaryEmail,
    password: primaryPassword,
  });
  await createUser({
    id: blakeId,
    name: "Blake Rivera",
    email: memberEmail,
    password: memberPassword,
  });

  const now = new Date();
  await prisma.household.create({
    data: {
      id: householdId,
      name: "Sora Verification Household",
      currency: "USD",
      agentAccessEnabled: true,
      createdAt: now,
    },
  });

  await prisma.householdMembership.createMany({
    data: [
      {
        householdId,
        userId: averyId,
        role: "member",
        joinedAt: new Date(now.getTime() - 2 * 86_400_000),
      },
      {
        householdId,
        userId: blakeId,
        role: "member",
        joinedAt: new Date(now.getTime() - 86_400_000),
      },
    ],
  });

  await prisma.category.createMany({
    data: [
      { householdId, name: "Salary", icon: "💰", type: "income" },
      { householdId, name: "Freelance", icon: "💻", type: "income" },
      { householdId, name: "Rent", icon: "🏠", type: "expense" },
      { householdId, name: "Groceries", icon: "🛒", type: "expense" },
      { householdId, name: "Utilities", icon: "💡", type: "expense" },
      { householdId, name: "Dining Out", icon: "🍽️", type: "expense" },
      { householdId, name: "Travel", icon: "✈️", type: "expense" },
    ],
  });

  const goal = await prisma.goal.create({
    data: {
      householdId,
      name: "Vacation",
      target: 2000,
      deadline: new Date(Date.UTC(now.getUTCFullYear() + 1, 5, 1)),
    },
  });

  await prisma.budget.create({
    data: {
      householdId,
      category: "Groceries",
      amount: 500,
      mode: "soft",
    },
  });

  const [d0, d1, d2, d3, d4] = currentMonthDates(5);

  const fixtures = [
    {
      amount: 5000,
      description: "Monthly salary",
      date: d0,
      type: "income",
      category: "Salary",
      categoryIcon: "💰",
      addedById: averyId,
    },
    {
      amount: 900,
      description: "Rent",
      date: d1,
      type: "expense",
      category: "Rent",
      categoryIcon: "🏠",
      addedById: averyId,
      shares: [
        { userId: averyId, amount: 150 },
        { userId: blakeId, amount: 750 },
      ],
    },
    {
      amount: 320.5,
      description: "Weekly groceries",
      date: d2,
      type: "expense",
      category: "Groceries",
      categoryIcon: "🛒",
      addedById: averyId,
    },
    {
      amount: 300,
      description: "Vacation fund",
      date: d2,
      type: "expense",
      category: "Travel",
      categoryIcon: "✈️",
      addedById: averyId,
      goalId: goal.id,
    },
    {
      amount: 180,
      description: "Electricity and water",
      date: d3,
      type: "expense",
      category: "Utilities",
      categoryIcon: "💡",
      addedById: blakeId,
    },
    {
      amount: 200,
      description: "Dinner out",
      date: d4,
      type: "expense",
      category: "Dining Out",
      categoryIcon: "🍽️",
      addedById: blakeId,
    },
  ];

  const created = await Promise.all(
    fixtures.map(async (fixture) => {
      const { shares, ...data } = fixture;
      const transaction = await prisma.transaction.create({
        data: {
          householdId,
          shared: true,
          addedVia: null,
          ...data,
        },
      });
      return { transaction, data, shares };
    }),
  );

  const shareRows = created.flatMap(({ transaction, shares }) =>
    (shares ?? []).map((share) => ({
      transactionId: transaction.id,
      userId: share.userId,
      amount: share.amount,
    })),
  );
  if (shareRows.length > 0) {
    await prisma.transactionShare.createMany({ data: shareRows });
  }

  const { months, years } = historyRollups(
    created.map(({ data }) => ({ ...data, shared: true })),
  );
  await Promise.all(
    [...months].map(([key, totals]) => {
      const [year, month, day] = key.split("-").map(Number);
      return prisma.monthHistory.create({
        data: { householdId, day, month, year, ...totals },
      });
    }),
  );
  await Promise.all(
    [...years].map(([key, totals]) => {
      const [year, month] = key.split("-").map(Number);
      return prisma.yearHistory.create({
        data: { householdId, month, year, ...totals },
      });
    }),
  );

  const readWriteToken = newToken();
  const readOnlyToken = newToken();
  await prisma.apiToken.createMany({
    data: [
      {
        householdId,
        userId: averyId,
        name: "verification read-write",
        scope: "read-write",
        tokenHash: hashToken(readWriteToken),
      },
      {
        householdId,
        userId: averyId,
        name: "verification read-only",
        scope: "read-only",
        tokenHash: hashToken(readOnlyToken),
      },
    ],
  });

  const expected = {
    overview: { income: 5000, expenses: 1900.5, net: 3099.5 },
    balances: {
      // get_balances is relative to the caller: Avery sees -870.25 for Blake,
      // meaning Blake owes Avery 870.25.
      averySeesBlake: -870.25,
      blakeOwesAvery: 870.25,
    },
    budgets: [
      {
        category: "Groceries",
        amount: 500,
        spent: 320.5,
        remaining: 179.5,
        percent: 64.1,
        mode: "soft",
      },
    ],
    goals: [{ name: "Vacation", target: 2000, contributed: 300 }],
    categories: {
      income: ["Freelance", "Salary"],
      expense: ["Dining Out", "Groceries", "Rent", "Travel", "Utilities"],
    },
  };

  const fixturePath = path.join(stateDir, "fixtures.json");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    fixturePath,
    JSON.stringify(
      {
        runId,
        baseUrl,
        householdId,
        currency: "USD",
        members: {
          avery: { id: averyId, email: primaryEmail, name: "Avery Quinn" },
          blake: { id: blakeId, email: memberEmail, name: "Blake Rivera" },
        },
        goalId: goal.id,
        tokens: { readWrite: readWriteToken, readOnly: readOnlyToken },
        expected,
      },
      null,
      2,
    ) + "\n",
  );

  const env = [
    `SORA_VERIFY_URL=${baseUrl}/api/mcp`,
    `SORA_VERIFY_TOKEN=${readWriteToken}`,
    `SORA_VERIFY_READ_ONLY_TOKEN=${readOnlyToken}`,
    `SORA_VERIFY_EMAIL=${primaryEmail}`,
    `SORA_VERIFY_PASSWORD=${primaryPassword}`,
    `SORA_VERIFY_MEMBER_EMAIL=${memberEmail}`,
    `SORA_VERIFY_MEMBER_PASSWORD=${memberPassword}`,
    `SORA_VERIFY_HOUSEHOLD_ID=${householdId}`,
    `SORA_VERIFY_USER_ID=${averyId}`,
    `SORA_VERIFY_MEMBER_ID=${blakeId}`,
    `SORA_VERIFY_GOAL_ID=${goal.id}`,
    "",
  ].join("\n");
  writeFileSync(path.join(stateDir, "run.env"), env);

  const summary = {
    runId,
    householdId,
    users: [primaryEmail, memberEmail],
    tokens: ["read-write", "read-only"],
    transactions: fixtures.length,
    fixtures: fixturePath,
    expected: {
      income: expected.overview.income,
      expenses: expected.overview.expenses,
      net: expected.overview.net,
      blakeOwesAvery: expected.balances.blakeOwesAvery,
      groceriesSpent: expected.budgets[0].spent,
      vacationContributed: expected.goals[0].contributed,
    },
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
