import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export interface SwaggerDocument {
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
  schema?: SwaggerSchema;
  items?: SwaggerSchema;
}

interface SwaggerSchema {
  type?: string;
  $ref?: string;
  items?: SwaggerSchema;
}

const METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
const SUPPORTED_PARAMETER_LOCATIONS = new Set(["query", "path", "body"]);

export function loadOperationsFromFile(apiPath: string): ApiOperation[] {
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

      const parameters = mergeSwaggerParameters(pathItem.parameters ?? [], operation.parameters ?? []);
      assertSupportedParameters(parameters, rawMethod, path);
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

function mergeSwaggerParameters(
  inherited: SwaggerParameter[],
  operationParameters: SwaggerParameter[]
): SwaggerParameter[] {
  const merged = [...inherited];
  const indexes = new Map<string, number>();

  for (const [index, parameter] of merged.entries()) {
    const key = swaggerParameterKey(parameter);
    if (key) {
      indexes.set(key, index);
    }
  }

  for (const parameter of operationParameters) {
    const key = swaggerParameterKey(parameter);
    const inheritedIndex = key ? indexes.get(key) : undefined;
    if (inheritedIndex === undefined) {
      if (key) {
        indexes.set(key, merged.length);
      }
      merged.push(parameter);
    } else {
      merged[inheritedIndex] = parameter;
    }
  }

  return merged;
}

function swaggerParameterKey(parameter: SwaggerParameter): string | undefined {
  return parameter.in && parameter.name ? `${parameter.in}\0${parameter.name}` : undefined;
}

function assertSupportedParameters(
  parameters: SwaggerParameter[],
  rawMethod: string,
  path: string
): void {
  for (const parameter of parameters) {
    if (!parameter.name?.trim()) {
      throw new Error(
        `Swagger parameter is missing a name for ${rawMethod.toUpperCase()} ${path}`
      );
    }
    if (!parameter.in || !SUPPORTED_PARAMETER_LOCATIONS.has(parameter.in)) {
      throw new Error(
        `Unsupported Swagger parameter location "${parameter.in ?? ""}" for ${rawMethod.toUpperCase()} ${path}: ${parameter.name}`
      );
    }
  }
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

function schemaFromSwaggerSchema(schema: SwaggerSchema): ParameterSchema {
  const ref = schema.$ref;
  const items = schema.items ? schemaFromSwaggerSchema(schema.items) : undefined;
  return {
    ...(schema.type ? { type: schema.type } : {}),
    ...(ref ? { ref } : {}),
    ...(items ? { items } : {})
  };
}
