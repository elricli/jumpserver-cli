import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveApiJsonPath } from "../src/openapi-parser.js";
import { generateOperationCatalog } from "../src/openapi-toolchain.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "src/generated-operations.ts");
const operations = await generateOperationCatalog(resolveApiJsonPath(), outputPath);
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
