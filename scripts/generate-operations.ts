import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadOperations, resolveApiJsonPath } from "../src/openapi.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "src/generated-operations.ts");
const operations = loadOperations(resolveApiJsonPath());
const content = [
  'import type { ApiOperation } from "./openapi.js";',
  "",
  `export const operations: ApiOperation[] = ${JSON.stringify(operations, null, 2)};`,
  ""
].join("\n");

await writeFile(outputPath, content);
console.log(
  JSON.stringify(
    {
      output: outputPath,
      operations: operations.length
    },
    null,
    2
  )
);
