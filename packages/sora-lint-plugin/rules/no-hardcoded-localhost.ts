import { defineRule, type ESTree, type Options } from "@oxlint/plugins";
import { sep } from "node:path";

const LOOPBACK_ADDRESS =
  /(^|[^\w.-])(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?![\w.-])/iu;

const MESSAGE =
  "Do not hardcode a machine-specific address. A host, a port and a secret belong in config or env.";

function readAllowlist(options: Readonly<Options>): readonly string[] {
  const [first] = options;

  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return [];
  }

  const { allow } = first;

  if (!Array.isArray(allow)) return [];

  return allow.filter((entry): entry is string => typeof entry === "string");
}

function toPrefix(entry: string): string {
  return entry.replace(/\/\*+$/u, "").replace(/\/+$/u, "");
}

// The allowlist names repository-relative paths, and the linter can run from
// any directory, so the paths are matched as suffixes of the file path.
function isAllowlisted(filename: string, allowlist: readonly string[]): boolean {
  const path = filename.split(sep).join("/");

  return allowlist.some((entry) => {
    const prefix = toPrefix(entry);

    return (
      path === prefix ||
      path.startsWith(`${prefix}/`) ||
      path.endsWith(`/${prefix}`) ||
      path.includes(`/${prefix}/`)
    );
  });
}

function isPropertyKey(node: ESTree.Node): boolean {
  const parent = node.parent;

  if (parent === null || parent.type !== "Property") return false;
  if (parent.computed) return false;

  return parent.key === node;
}

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow machine-specific addresses in string literals; hosts, ports and secrets belong in config or env. The allow option lists the repository-relative paths that are exempt.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const allowlist = readAllowlist(context.options);

    if (isAllowlisted(context.filename, allowlist)) return {};

    const check = (node: ESTree.Node, text: string | null | undefined) => {
      if (!text) return;
      if (!LOOPBACK_ADDRESS.test(text)) return;

      context.report({ node, message: MESSAGE });
    };

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        if (isPropertyKey(node)) return;

        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked);
      },
    };
  },
});
