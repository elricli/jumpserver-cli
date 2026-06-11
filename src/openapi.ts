import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { operations as generatedOperations } from "./generated-operations.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface ParameterSchema {
  type?: string;
  ref?: string;
  items?: ParameterSchema;
}

export interface OperationParameter {
  name: string;
  required: boolean;
  schema?: ParameterSchema;
}

export interface ApiOperation {
  method: HttpMethod;
  path: string;
  basePath: string;
  operationId: string;
  tag: string;
  summary: string;
  queryParameters: OperationParameter[];
  pathParameters: OperationParameter[];
  bodyRequired?: boolean;
  bodySchema?: ParameterSchema;
}

interface SwaggerDocument {
  basePath?: string;
  paths?: Record<string, SwaggerPathItem>;
}

interface SwaggerPathItem {
  parameters?: SwaggerParameter[];
  [method: string]: SwaggerOperation | SwaggerParameter[] | undefined;
}

interface SwaggerOperation {
  operationId?: string;
  tags?: string[];
  summary?: string;
  parameters?: SwaggerParameter[];
}

interface SwaggerParameter {
  name?: string;
  in?: string;
  required?: boolean;
  type?: string;
  schema?: {
    type?: string;
    $ref?: string;
    items?: SwaggerParameter["schema"];
  };
  items?: SwaggerParameter["schema"];
}

const METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

export function loadOperations(apiPath?: string): ApiOperation[] {
  if (!apiPath) {
    return generatedOperations.map((operation) => ({
      ...operation,
      queryParameters: operation.queryParameters.map((parameter) => ({ ...parameter })),
      pathParameters: operation.pathParameters.map((parameter) => ({ ...parameter })),
      ...(operation.bodySchema ? { bodySchema: { ...operation.bodySchema } } : {})
    }));
  }

  const document = JSON.parse(readFileSync(apiPath, "utf8")) as SwaggerDocument;
  return extractOperations(document);
}

export function extractOperations(document: SwaggerDocument): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const basePath = document.basePath ?? "/api/v1";

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [rawMethod, operation] of Object.entries(pathItem)) {
      if (!METHODS.has(rawMethod)) {
        continue;
      }

      if (!operation || Array.isArray(operation)) {
        throw new Error(`Invalid operation for ${rawMethod.toUpperCase()} ${path}`);
      }

      if (!operation.operationId) {
        throw new Error(`Missing operationId for ${rawMethod.toUpperCase()} ${path}`);
      }

      const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];
      const declaredPathParameters = parameters
        .filter((parameter) => parameter.in === "path" && parameter.name)
        .map(toOperationParameter);
      const inferredPathParameters = extractTemplateParameters(path)
        .filter((name) => !declaredPathParameters.some((parameter) => parameter.name === name))
        .map((name) => ({ name, required: true }));
      const bodyParameter = parameters.find((parameter) => parameter.in === "body");
      const bodySchema = bodyParameter ? schemaFromParameter(bodyParameter) : undefined;

      operations.push({
        method: rawMethod.toUpperCase() as HttpMethod,
        path,
        basePath,
        operationId: operation.operationId,
        tag: operation.tags?.[0] ?? "default",
        summary: operation.summary ?? operation.operationId,
        queryParameters: parameters
          .filter((parameter) => parameter.in === "query" && parameter.name)
          .map(toOperationParameter),
        pathParameters: [...declaredPathParameters, ...inferredPathParameters],
        ...(bodyParameter ? { bodyRequired: Boolean(bodyParameter.required) } : {}),
        ...(bodySchema ? { bodySchema } : {})
      });
    }
  }

  return operations.sort((left, right) => left.operationId.localeCompare(right.operationId));
}

export function findOperation(operationId: string, operations = loadOperations()): ApiOperation {
  const operation = operations.find((candidate) => candidate.operationId === operationId);
  if (!operation) {
    throw new Error(`Unknown operationId: ${operationId}`);
  }
  return operation;
}

export function resolveApiJsonPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "../api.json"),
    resolve(here, "../../api.json"),
    resolve(process.cwd(), "api.json")
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Unable to locate api.json. Checked: ${candidates.join(", ")}`);
  }
  return found;
}

function extractTemplateParameters(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => {
    const name = match[1];
    if (!name) {
      throw new Error(`Invalid empty path template in ${path}`);
    }
    return name;
  });
}

function toOperationParameter(parameter: SwaggerParameter): OperationParameter {
  if (!parameter.name) {
    throw new Error("Swagger parameter is missing name");
  }

  const schema = schemaFromParameter(parameter);
  return {
    name: parameter.name,
    required: Boolean(parameter.required),
    ...(schema ? { schema } : {})
  };
}

function schemaFromParameter(parameter: SwaggerParameter): ParameterSchema | undefined {
  const source = parameter.schema ?? parameter;
  const ref = "$ref" in source ? source.$ref : undefined;
  const type = source.type;
  const items = source.items ? schemaFromSwaggerSchema(source.items) : undefined;

  if (!ref && !type && !items) {
    return undefined;
  }

  return {
    ...(type ? { type } : {}),
    ...(ref ? { ref } : {}),
    ...(items ? { items } : {})
  };
}

function schemaFromSwaggerSchema(schema: NonNullable<SwaggerParameter["schema"]>): ParameterSchema {
  const ref = schema.$ref;
  const items = schema.items ? schemaFromSwaggerSchema(schema.items) : undefined;
  return {
    ...(schema.type ? { type: schema.type } : {}),
    ...(ref ? { ref } : {}),
    ...(items ? { items } : {})
  };
}
