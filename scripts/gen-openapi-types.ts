/**
 * Generate TypeScript types from the live CanaryLLM OpenAPI spec.
 *
 *   bun run gen:openapi
 *
 * Output (`src/types/openapi.gen.d.ts`) is gitignored. Use it to diff against
 * the hand-written wire types when the gateway API changes.
 */
import { writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const SPEC_URL =
  process.env.CANARYLLM_OPENAPI_URL ??
  "https://api.ai.canarycoders.es/api/public/openapi.yaml";

const OUT = new URL("../src/types/openapi.gen.d.ts", import.meta.url);

const ast = await openapiTS(new URL(SPEC_URL));
const header = `// Generated from ${SPEC_URL}\n// Do not edit by hand. Run \`bun run gen:openapi\`.\n\n`;
await writeFile(OUT, header + astToString(ast), "utf8");

console.log(`Wrote ${OUT.pathname}`);
