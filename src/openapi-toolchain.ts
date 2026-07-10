import { randomUUID } from "node:crypto";
import { open, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  loadOperationsFromFile,
  type ApiOperation,
  type OperationParameter,
  type ParameterSchema
} from "./openapi-parser.js";

export type OperationCatalogStatus = "matched" | "out-of-sync" | "not-checked";

export interface OperationCatalogDifference {
  kind: "missing" | "unexpected" | "changed" | "duplicate-source" | "duplicate-generated";
  operationId: string;
  expected?: ApiOperation;
  actual?: ApiOperation;
}

export interface OperationCatalogAssessment {
  status: OperationCatalogStatus;
  sourceOperationCount?: number;
  generatedOperationCount: number;
  differences: OperationCatalogDifference[];
}

export function assessOperationCatalog(
  sourceOperations: readonly ApiOperation[] | undefined,
  generatedOperations: readonly ApiOperation[]
): OperationCatalogAssessment {
  if (!sourceOperations) {
    const differences: OperationCatalogDifference[] = [];
    indexOperations(generatedOperations, new Map(), "duplicate-generated", differences);
    return {
      status: "not-checked",
      generatedOperationCount: generatedOperations.length,
      differences
    };
  }

  const differences = compareOperationCatalogs(sourceOperations, generatedOperations);
  return {
    status: differences.length === 0 ? "matched" : "out-of-sync",
    sourceOperationCount: sourceOperations.length,
    generatedOperationCount: generatedOperations.length,
    differences
  };
}

export function compareOperationCatalogs(
  sourceOperations: readonly ApiOperation[],
  generatedOperations: readonly ApiOperation[]
): OperationCatalogDifference[] {
  const expectedById = new Map<string, ApiOperation>();
  const actualById = new Map<string, ApiOperation>();
  const differences: OperationCatalogDifference[] = [];

  indexOperations(sourceOperations, expectedById, "duplicate-source", differences);
  indexOperations(generatedOperations, actualById, "duplicate-generated", differences);

  for (const [operationId, expected] of expectedById) {
    const actual = actualById.get(operationId);
    if (!actual) {
      differences.push({ kind: "missing", operationId, expected });
    } else if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      differences.push({ kind: "changed", operationId, expected, actual });
    }
  }

  for (const [operationId, actual] of actualById) {
    if (!expectedById.has(operationId)) {
      differences.push({ kind: "unexpected", operationId, actual });
    }
  }

  return differences.sort((left, right) =>
    `${left.operationId}\0${left.kind}`.localeCompare(`${right.operationId}\0${right.kind}`)
  );
}

export async function generateOperationCatalog(
  apiPath: string,
  outputPath: string
): Promise<ApiOperation[]> {
  const operations = loadOperationsFromFile(apiPath);
  await writeOperationCatalogAtomically(outputPath, serializeOperationCatalog(operations));
  return operations;
}

export function serializeOperationCatalog(operations: readonly ApiOperation[]): string {
  return [
    'import type { ApiOperation } from "./openapi.js";',
    "",
    `export const operations: ApiOperation[] = ${JSON.stringify(operations, null, 2)};`,
    ""
  ].join("\n");
}

async function writeOperationCatalogAtomically(outputPath: string, content: string): Promise<void> {
  const temporaryPath = join(
    dirname(outputPath),
    `.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`
  );
  const file = await open(temporaryPath, "wx");
  let closed = false;

  try {
    await file.writeFile(content, "utf8");
    await file.sync();
    await file.close();
    closed = true;
    await rename(temporaryPath, outputPath);
  } catch (error) {
    if (!closed) {
      await file.close().catch(() => undefined);
    }
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function indexOperations(
  operations: readonly ApiOperation[],
  index: Map<string, ApiOperation>,
  duplicateKind: "duplicate-source" | "duplicate-generated",
  differences: OperationCatalogDifference[]
): void {
  for (const operation of operations) {
    const normalized = normalizeOperation(operation);
    if (index.has(normalized.operationId)) {
      differences.push({ kind: duplicateKind, operationId: normalized.operationId });
    } else {
      index.set(normalized.operationId, normalized);
    }
  }
}

function normalizeOperation(operation: ApiOperation): ApiOperation {
  return {
    method: operation.method,
    path: operation.path,
    basePath: operation.basePath,
    operationId: operation.operationId,
    tag: operation.tag,
    summary: operation.summary,
    queryParameters: operation.queryParameters.map(normalizeParameter),
    pathParameters: operation.pathParameters.map(normalizeParameter),
    ...(operation.bodyRequired === undefined ? {} : { bodyRequired: operation.bodyRequired }),
    ...(operation.bodySchema ? { bodySchema: normalizeSchema(operation.bodySchema) } : {})
  };
}

function normalizeParameter(parameter: OperationParameter): OperationParameter {
  return {
    name: parameter.name,
    required: parameter.required,
    ...(parameter.schema ? { schema: normalizeSchema(parameter.schema) } : {})
  };
}

function normalizeSchema(schema: ParameterSchema): ParameterSchema {
  return {
    ...(schema.type ? { type: schema.type } : {}),
    ...(schema.ref ? { ref: schema.ref } : {}),
    ...(schema.items ? { items: normalizeSchema(schema.items) } : {})
  };
}
