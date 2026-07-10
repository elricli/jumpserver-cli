import type { Command } from "commander";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProgram } from "../src/cli.js";
import { operationCommandPath } from "../src/operation-command.js";
import { loadOperations, type ApiOperation } from "../src/openapi.js";
import { loadOperationsFromFile, resolveApiJsonPath } from "../src/openapi-parser.js";
import { assessOperationCatalog } from "../src/openapi-toolchain.js";

const operations = loadOperations();
const sourceOperations = tryLoadSourceOperations();
const catalogAssessment = assessOperationCatalog(sourceOperations, operations);
const duplicateCommandPaths = findDuplicateCommandPaths(operations);
const program = duplicateCommandPaths.length === 0
  ? buildProgram({
      operations,
      env: {},
      configPath: join(tmpdir(), `jumpserver-cli-coverage-${process.pid}-${randomUUID()}.json`)
    })
  : undefined;
const commandNames = new Set(program?.commands.map((command) => command.name()) ?? []);
const missingHierarchicalCommands = program
  ? operations
      .filter((operation) => !findCommandPath(program, operationCommandPath(operation)))
      .map((operation) => ({
        operationId: operation.operationId,
        commandPath: operationCommandPath(operation).join(" ")
      }))
  : [];
const directOperationCommands = program
  ? operations
      .filter((operation) => commandNames.has(operation.operationId))
      .map((operation) => operation.operationId)
  : [];
const coveredCommandCount = program ? operations.length - missingHierarchicalCommands.length : 0;
const hasCompleteCommandCoverage =
  operations.length > 0 &&
  missingHierarchicalCommands.length === 0 &&
  duplicateCommandPaths.length === 0 &&
  directOperationCommands.length === 0;
const ok =
  catalogAssessment.status !== "out-of-sync" &&
  catalogAssessment.differences.length === 0 &&
  hasCompleteCommandCoverage;

const report = {
  ok,
  rawApiJson: sourceOperations ? "checked" : "not present",
  apiCatalogStatus: catalogAssessment.status,
  ...(catalogAssessment.sourceOperationCount === undefined
    ? {}
    : { sourceOperationCount: catalogAssessment.sourceOperationCount }),
  generatedOperationCount: catalogAssessment.generatedOperationCount,
  coveredCommandCount,
  commandCoverage: hasCompleteCommandCoverage ? "100%" : "incomplete",
  ...(catalogAssessment.differences.length > 0
    ? { operationCatalogDifferences: catalogAssessment.differences }
    : {}),
  ...(missingHierarchicalCommands.length > 0 ? { missingHierarchicalCommands } : {}),
  ...(duplicateCommandPaths.length > 0 ? { duplicateCommandPaths } : {}),
  ...(directOperationCommands.length > 0 ? { directOperationCommands } : {})
};

if (ok) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}

function tryLoadSourceOperations() {
  try {
    return loadOperationsFromFile(resolveApiJsonPath());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unable to locate api.json")) {
      return undefined;
    }
    throw error;
  }
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

function findDuplicateCommandPaths(
  sourceOperations: readonly ApiOperation[]
): Array<{ commandPath: string; operationIds: string[] }> {
  const operationsByPath = new Map<string, { commandPath: string; operationIds: string[] }>();

  for (const operation of sourceOperations) {
    const path = operationCommandPath(operation);
    const key = JSON.stringify(path);
    const existing = operationsByPath.get(key);
    if (existing) {
      existing.operationIds.push(operation.operationId);
    } else {
      operationsByPath.set(key, {
        commandPath: path.join(" "),
        operationIds: [operation.operationId]
      });
    }
  }

  return [...operationsByPath.values()].filter((entry) => entry.operationIds.length > 1);
}
