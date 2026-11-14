import { definePlugin, eslintCompatPlugin } from "@oxlint/plugins";

import { noArrayFilterMapRule } from "./rules/no-array-filter-map.ts";
import { noChainedTypeAssertionsRule } from "./rules/no-chained-type-assertions.ts";
import { noConditionalEmptyObjectSpreadRule } from "./rules/no-conditional-empty-object-spread.ts";
import noEmDashCopy from "./rules/no-em-dash-copy.ts";
import noHardcodedLocalhost from "./rules/no-hardcoded-localhost.ts";
import noHooklessUseFunction from "./rules/no-hookless-use-function.ts";
import noLowValueComments from "./rules/no-low-value-comments.ts";
import noManualMemo from "./rules/no-manual-memo.ts";
import { noModuleMockingRule } from "./rules/no-module-mocking.ts";
import noNativeTitleTooltip from "./rules/no-native-title-tooltip.ts";
import { noObjectParametersRule } from "./rules/no-object-parameters.ts";
import noOutsetStateIndicators from "./rules/no-outset-state-indicators.ts";
import { noReduceAccumulatorCopyRule } from "./rules/no-reduce-accumulator-copy.ts";
import { noReflectApplyRule } from "./rules/no-reflect-apply.ts";
import { noReflectGetRule } from "./rules/no-reflect-get.ts";
import { noForbiddenTermInSymbolNamesRule } from "./rules/no-shape-in-symbol-names.ts";
import { noUnknownParametersRule } from "./rules/no-unknown-parameters.ts";
import { noUnknownReturnsRule } from "./rules/no-unknown-returns.ts";
import { noUnknownTypeAliasesRule } from "./rules/no-unknown-type-aliases.ts";
import { noUnsafeDictionaryTypeRule } from "./rules/no-unsafe-dictionary-type.ts";
import noUnscopedHas from "./rules/no-unscoped-has.ts";
import { noWidenThenAssertRule } from "./rules/no-widen-then-assert.ts";
import requireSeamParse from "./rules/require-seam-parse.ts";
import requireSuppressionReason from "./rules/require-suppression-reason.ts";

// The anti-slop rules come from an ESLint-style plugin, so they are converted
// before they join the oxlint-native rules.
const antiSlopRules = eslintCompatPlugin({
  meta: { name: "anti-slop" },
  rules: {
    "no-array-filter-map": noArrayFilterMapRule,
    "no-chained-type-assertions": noChainedTypeAssertionsRule,
    "no-conditional-empty-object-spread": noConditionalEmptyObjectSpreadRule,
    "no-module-mocking": noModuleMockingRule,
    "no-object-parameters": noObjectParametersRule,
    "no-reduce-accumulator-copy": noReduceAccumulatorCopyRule,
    "no-reflect-apply": noReflectApplyRule,
    "no-reflect-get": noReflectGetRule,
    "no-shape-in-symbol-names": noForbiddenTermInSymbolNamesRule,
    "no-unknown-parameters": noUnknownParametersRule,
    "no-unknown-returns": noUnknownReturnsRule,
    "no-unknown-type-aliases": noUnknownTypeAliasesRule,
    "no-unsafe-dictionary-type": noUnsafeDictionaryTypeRule,
    "no-widen-then-assert": noWidenThenAssertRule,
  },
}).rules;

export default definePlugin({
  meta: {
    name: "sora",
  },
  rules: {
    ...antiSlopRules,
    "no-em-dash-copy": noEmDashCopy,
    "no-hardcoded-localhost": noHardcodedLocalhost,
    "no-hookless-use-function": noHooklessUseFunction,
    "no-low-value-comments": noLowValueComments,
    "no-manual-memo": noManualMemo,
    "no-native-title-tooltip": noNativeTitleTooltip,
    "no-outset-state-indicators": noOutsetStateIndicators,
    "no-unscoped-has": noUnscopedHas,
    "require-suppression-reason": requireSuppressionReason,
    "require-seam-parse": requireSeamParse,
  },
});
