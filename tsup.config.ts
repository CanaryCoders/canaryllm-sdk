import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    compat: "src/compat.ts",
    "realtime-client/index": "src/realtime-client/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  treeshake: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  cjsInterop: true,
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
