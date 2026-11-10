#!/usr/bin/env node
import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

import { CliError } from "./cli-error.js";
import { callTool } from "./client.js";
import {
  COMMANDS,
  commandUsage,
  type Command,
  type FlagValues,
  usage,
} from "./commands.js";
import { resolveConfig } from "./config.js";

const FAILURE = 1;

const NO_TOKEN = [
  "No Sora token found.",
  "",
  'Create a token on the Manage page under "Agent access", then give it to the CLI:',
  "",
  "  SORA_TOKEN=<token> sora balance",
  '  or write {"token":"<token>"} to ~/.config/sora/config.json',
].join("\n");

async function run(argv: string[]): Promise<number> {
  const [commandName, ...flags] = argv;

  if (commandName === undefined) {
    process.stderr.write(usage());
    return FAILURE;
  }

  if (
    commandName === "--help" ||
    commandName === "-h" ||
    commandName === "help"
  ) {
    process.stdout.write(usage());
    return 0;
  }

  const command = COMMANDS[commandName];

  if (!command) {
    process.stderr.write(`Unknown command "${commandName}".\n\n${usage()}`);
    return FAILURE;
  }

  const { help, values } = parseFlags(commandName, command, flags);

  if (help) {
    process.stdout.write(commandUsage(commandName, command));
    return 0;
  }

  const toolArguments = command.build(values);
  const { endpoint, token } = await resolveConfig();

  if (token === null) {
    throw new CliError(NO_TOKEN);
  }

  const outcome = await callTool(endpoint, token, {
    name: command.tool,
    arguments: toolArguments,
  });

  if (outcome.isError) {
    process.stderr.write(`${outcome.text}\n`);
    return FAILURE;
  }

  if (outcome.text !== "") {
    process.stdout.write(`${outcome.text}\n`);
  }

  return 0;
}

function parseFlags(
  commandName: string,
  command: Command,
  args: string[],
): { help: boolean; values: FlagValues } {
  const options: ParseArgsOptionsConfig = {
    help: { type: "boolean", short: "h" },
  };

  for (const entry of command.flags) {
    options[entry.name] = { type: "string" };
  }

  let parsed;

  try {
    parsed = parseArgs({ args, options, allowPositionals: false });
  } catch (error) {
    throw parseError(commandName, error);
  }

  const values: FlagValues = {};

  for (const [name, value] of Object.entries(parsed.values)) {
    if (typeof value === "string") {
      values[name] = value;
    }
  }

  return { help: parsed.values.help === true, values };
}

function parseError(commandName: string, error: unknown): CliError {
  const code =
    error instanceof Error && "code" in error
      ? (error as NodeJS.ErrnoException).code
      : undefined;

  if (code === "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL") {
    return new CliError(
      `sora ${commandName} takes flags only. Run "sora ${commandName}" --help to see the flags.`,
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  const sentence = message.endsWith(".") ? message : `${message}.`;

  return new CliError(
    `${sentence} Run "sora ${commandName}" --help to see the flags.`,
  );
}

try {
  process.exitCode = await run(process.argv.slice(2));
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = FAILURE;
}
