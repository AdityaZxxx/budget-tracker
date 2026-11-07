import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: {
    compilationMode: "infer",
    environment: {
      // The manual memoization is still in place, so the compiler must keep
      // honouring it until the useMemo and useCallback calls are retired.
      enablePreserveExistingMemoizationGuarantees: true,
    },
    // A component the compiler cannot handle is skipped, not a build failure.
    panicThreshold: "none",
  },
  experimental: {
    // Turbopack is the default builder in Next 16, so the Rust port of the
    // compiler runs without installing babel-plugin-react-compiler.
    turbopackRustReactCompiler: true,
  },
};

export default nextConfig;
