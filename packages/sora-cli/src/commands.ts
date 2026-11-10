import { CliError } from "./cli-error.js";

export type FlagValues = Record<string, string | undefined>;

export type FlagSpec = {
  name: string;
  placeholder: string;
  help: string;
  required: boolean;
};

export type Command = {
  tool: string;
  summary: string;
  flags: FlagSpec[];
  build: (values: FlagValues) => Record<string, unknown>;
};

const amountFlag = flag(
  "amount",
  "<amount>",
  "Amount of the Transaction.",
  true,
);

const categoryFlag = flag(
  "category",
  "<category>",
  "Name of a Category in the Household. Run 'sora categories' to see them.",
  true,
);

const descriptionFlag = flag(
  "description",
  "<description>",
  "What the Transaction was for.",
  false,
);

const dateFlag = flag(
  "date",
  "<YYYY-MM-DD>",
  "Date of the Transaction. Defaults to today.",
  false,
);

const monthFlag = flag(
  "month",
  "<YYYY-MM>",
  "Month to list. Without it the server picks the range.",
  false,
);

const categoryTypeFlag = flag(
  "type",
  "<expense|income>",
  "Only Categories of this type.",
  false,
);

export const COMMANDS: Record<string, Command> = {
  "add-expense": {
    tool: "add_transaction",
    summary: "Record a shared expense Transaction.",
    flags: [amountFlag, categoryFlag, descriptionFlag, dateFlag],
    build: (values) => ({
      amount: parseAmount(requireValue(values, "amount", "add-expense")),
      category: requireValue(values, "category", "add-expense"),
      ...(values.description === undefined
        ? {}
        : { description: values.description }),
      ...(values.date === undefined ? {} : { date: parseDate(values.date) }),
      type: "expense",
      shared: true,
    }),
  },
  "add-income": {
    tool: "add_transaction",
    summary: "Record a shared income Transaction.",
    flags: [amountFlag, categoryFlag, descriptionFlag, dateFlag],
    build: (values) => ({
      amount: parseAmount(requireValue(values, "amount", "add-income")),
      category: requireValue(values, "category", "add-income"),
      ...(values.description === undefined
        ? {}
        : { description: values.description }),
      ...(values.date === undefined ? {} : { date: parseDate(values.date) }),
      type: "income",
      shared: true,
    }),
  },
  balance: {
    tool: "get_balances",
    summary: "What each Member owes, and what they are owed.",
    flags: [],
    build: () => ({}),
  },
  transactions: {
    tool: "list_transactions",
    summary: "List the Household's Transactions.",
    flags: [monthFlag],
    build: (values) =>
      values.month === undefined ? {} : monthRange(values.month),
  },
  budgets: {
    tool: "list_budgets",
    summary: "List the Household's Budgets.",
    flags: [],
    build: () => ({}),
  },
  goals: {
    tool: "list_goals",
    summary: "List the Household's Goals.",
    flags: [],
    build: () => ({}),
  },
  categories: {
    tool: "list_categories",
    summary: "List the Household's Categories.",
    flags: [categoryTypeFlag],
    build: (values) =>
      values.type === undefined ? {} : { type: categoryTypeOf(values.type) },
  },
};

export function usage(): string {
  const commands = Object.entries(COMMANDS)
    .map(([name, command]) => `  ${name.padEnd(13)} ${command.summary}`)
    .join("\n");

  return [
    "sora is a command line client for your Sora Household.",
    "",
    "Usage:",
    "  sora <command> [flags]",
    "",
    "Commands:",
    commands,
    "",
    "Flags:",
    "  -h, --help    Show the help of a command.",
    "",
    'Run "sora <command> --help" for the flags of one command.',
    "",
    "The CLI talks to the Sora MCP endpoint and prints what the server says.",
    "The token comes from SORA_TOKEN, or from ~/.config/sora/config.json as",
    '{"token":"..."}. The endpoint comes from SORA_URL, defaulting to',
    "http://localhost:3000/api/mcp.",
    "",
  ].join("\n");
}

export function commandUsage(name: string, command: Command): string {
  const flags = [
    ...command.flags.map((entry) => [
      `--${entry.name} ${entry.placeholder}`,
      entry.help,
    ]),
    ["-h, --help", "Show this help."],
  ] as const;

  const width = Math.max(...flags.map(([left]) => left.length));
  const flagLines = flags
    .map(([left, help]) => `  ${left.padEnd(width)}  ${help}`)
    .join("\n");

  const usageLine = command.flags
    .map((entry) =>
      entry.required
        ? `--${entry.name} ${entry.placeholder}`
        : `[--${entry.name} ${entry.placeholder}]`,
    )
    .join(" ");

  return [
    `sora ${name} — ${command.summary}`,
    "",
    "Usage:",
    `  sora ${name}${usageLine ? ` ${usageLine}` : ""}`,
    "",
    `Calls the ${command.tool} tool.`,
    "",
    "Flags:",
    flagLines,
    "",
  ].join("\n");
}

function flag(
  name: string,
  placeholder: string,
  help: string,
  required: boolean,
): FlagSpec {
  return { name, placeholder, help, required };
}

function requireValue(
  values: FlagValues,
  name: string,
  command: string,
): string {
  const value = values[name];

  if (value === undefined || value.trim() === "") {
    throw new CliError(
      `Missing required flag --${name}. Run "sora ${command}" --help.`,
    );
  }

  return value;
}

function parseAmount(value: string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new CliError(
      `Invalid --amount: ${value}. Use a number, such as 500.`,
    );
  }

  return amount;
}

function parseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (
    !match ||
    Number(match[2]) < 1 ||
    Number(match[2]) > 12 ||
    Number(match[3]) < 1 ||
    Number(match[3]) > daysInMonth(Number(match[1]), Number(match[2]))
  ) {
    throw new CliError(`Invalid date: ${value}. Use the YYYY-MM-DD format.`);
  }

  return value;
}

function monthRange(value: string): { from: string; to: string } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);

  if (!match) {
    throw new CliError(
      `Invalid --month: ${value}. Use the YYYY-MM format, such as 2026-11.`,
    );
  }

  const [, year, month] = match;
  const lastDay = String(daysInMonth(Number(year), Number(month))).padStart(
    2,
    "0",
  );

  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${lastDay}`,
  };
}

function categoryTypeOf(value: string): "expense" | "income" {
  if (value !== "expense" && value !== "income") {
    throw new CliError(`Invalid --type: ${value}. Use "expense" or "income".`);
  }

  return value;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year: number, month: number): number {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

  if (month === 2 && leap) {
    return 29;
  }

  return DAYS_IN_MONTH[month - 1];
}
