import { operations as generatedOperations } from "./generated-operations.js";
import type { ApiOperation } from "./openapi-parser.js";

export type {
  ApiOperation,
  HttpMethod,
  OperationParameter,
  ParameterSchema
} from "./openapi-parser.js";

export function loadOperations(): ApiOperation[] {
  return structuredClone(generatedOperations);
}

export function findOperation(operationId: string, operations = loadOperations()): ApiOperation {
  const operation = operations.find((candidate) => candidate.operationId === operationId);
  if (!operation) {
    throw new Error(`Unknown operationId: ${operationId}`);
  }
  return operation;
}
