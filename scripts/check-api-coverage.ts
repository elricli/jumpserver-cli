import { buildProgram, operationCommandPath } from "../src/cli.js";
import { loadOperations, resolveApiJsonPath } from "../src/openapi.js";
import { readFileSync } from "node:fs";
import type { Command } from "commander";

interface RawOperation {
  method: string;
  path: string;
  operationId: string;
  parameters: Array<{ name: string; in: string }>;
}

interface RawSwaggerDocument {
  paths?: Record<string, RawSwaggerPathItem>;
}

interface RawSwaggerPathItem {
  parameters?: RawSwaggerParameter[];
  [method: string]: RawSwaggerOperation | RawSwaggerParameter[] | undefined;
}

interface RawSwaggerOperation {
  operationId?: string;
  parameters?: RawSwaggerParameter[];
}

interface RawSwaggerParameter {
  name?: string;
  in?: string;
}

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

const operations = loadOperations();
const program = buildProgram({ operations });
const commandNames = new Set(program.commands.map((command) => command.name()));
const rawOperations = loadRawOperations(resolveApiJsonPath());
const rawOperationIds = new Set(rawOperations.map((operation) => operation.operationId));
const loadedOperationIds = new Set(operations.map((operation) => operation.operationId));
const missingLoadedOperations = rawOperations.filter((operation) => !loadedOperationIds.has(operation.operationId));
const extraLoadedOperations = operations.filter((operation) => !rawOperationIds.has(operation.operationId));
const missingHierarchicalCommands = operations
  .filter((operation) => !findCommandPath(program, operationCommandPath(operation)))
  .map((operation) => ({
    operationId: operation.operationId,
    commandPath: operationCommandPath(operation).join(" ")
  }));
const directOperationCommands = operations
  .filter((operation) => commandNames.has(operation.operationId))
  .map((operation) => operation.operationId);
const unsupportedParameters = rawOperations.flatMap((operation) =>
  operation.parameters
    .filter((parameter) => !["query", "path", "body"].includes(parameter.in))
    .map((parameter) => ({ ...operation, parameter }))
);
const duplicateOperationIds = findDuplicates(rawOperations.map((operation) => operation.operationId));
const missingOperationIds = rawOperations.filter((operation) => operation.operationId.length === 0);

if (
  rawOperations.length !== 221 ||
  missingLoadedOperations.length > 0 ||
  extraLoadedOperations.length > 0 ||
  missingHierarchicalCommands.length > 0 ||
  directOperationCommands.length > 0 ||
  unsupportedParameters.length > 0 ||
  duplicateOperationIds.length > 0 ||
  missingOperationIds.length > 0
) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        rawOperationCount: rawOperations.length,
        expectedRawOperationCount: 221,
        loadedOperationCount: operations.length,
        coveredOperationCount: operations.length - missingHierarchicalCommands.length,
        missingLoadedOperations,
        extraLoadedOperations,
        missingHierarchicalCommands,
        directOperationCommands,
        unsupportedParameters,
        duplicateOperationIds,
        missingOperationIds
      },
      null,
      2
    )
  );
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        ok: true,
        rawOperationCount: rawOperations.length,
        loadedOperationCount: operations.length,
        coveredOperationCount: operations.length,
        coverage: "100%"
      },
      null,
      2
    )
  );
}

function findCommandPath(command: Command, path: string[]): Command | undefined {
  let current = command;
  for (const part of path) {
    const next = current.commands.find((candidate) => candidate.name() === part);
    if (!next) {
      return undefined;
    }
    current = next;
  }
  return current;
}

function loadRawOperations(apiPath: string): RawOperation[] {
  const document = JSON.parse(readFileSync(apiPath, "utf8")) as RawSwaggerDocument;
  const rawOperations: RawOperation[] = [];

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }

      if (!operation || Array.isArray(operation)) {
        rawOperations.push({
          method: method.toUpperCase(),
          path,
          operationId: "",
          parameters: normalizeParameters(pathItem.parameters ?? [])
        });
        continue;
      }

      rawOperations.push({
        method: method.toUpperCase(),
        path,
        operationId: operation.operationId ?? "",
        parameters: normalizeParameters([...(pathItem.parameters ?? []), ...(operation.parameters ?? [])])
      });
    }
  }

  return rawOperations;
}

function normalizeParameters(parameters: RawSwaggerParameter[]): Array<{ name: string; in: string }> {
  return parameters.map((parameter) => ({
    name: parameter.name ?? "",
    in: parameter.in ?? ""
  }));
}

function findDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}
