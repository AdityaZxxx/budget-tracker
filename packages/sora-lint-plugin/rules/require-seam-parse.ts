import { defineRule, type ESTree } from "@oxlint/plugins";

const TS_FILE_PATTERN = /\.[cm]?tsx?$/u;
const WRITE_PATTERN =
  /(?:prisma|tx)\.[A-Za-z_]+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/;
const PARSE_PATTERN = /\.(?:safeParse|parse)\s*\(/;
const EXEMPT_PATTERN = /seam-parse-exempt/;

function isLibPath(filePath: string): boolean {
  return /(?:^|\/)lib\//.test(filePath) && !filePath.includes("/lib/mcp/");
}

function exported(node: ESTree.Node): boolean {
  const parent = node.parent;
  return (
    parent?.type === "ExportNamedDeclaration" ||
    parent?.type === "ExportDefaultDeclaration"
  );
}

function hasExemption(
  comments: readonly ESTree.Comment[],
  node: ESTree.Node,
): boolean {
  const line = node.loc?.start.line ?? 0;
  return comments.some(
    (comment) =>
      comment.loc?.start.line === line - 1 ||
      comment.loc?.end.line === line - 1 ||
      comment.loc?.start.line === line - 2,
  );
}

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "An exported lib/ writer that performs a database write must parse its own schema first, so the seam — not the transports — owns the rule.",
    },
    messages: {
      missingParse:
        "This lib/ writer performs a database write but never parses its schema. Every seam write begins with a safeParse of its own schema before it touches prisma.",
    },
  },
  create(context) {
    const { sourceCode } = context;
    const filePath = context.physicalFilename ?? "";
    if (!isLibPath(filePath) || !TS_FILE_PATTERN.test(filePath)) return {};

    return {
      FunctionDeclaration(node) {
        if (!exported(node)) return;
        const text = sourceCode.getText(node);
        if (!WRITE_PATTERN.test(text)) return;
        if (PARSE_PATTERN.test(text)) return;

        const comments = sourceCode.getAllComments().filter((comment) =>
          EXEMPT_PATTERN.test(comment.value),
        );
        if (hasExemption(comments, node)) {
          return;
        }

        context.report({ node, messageId: "missingParse" });
      },
    };
  },
});
