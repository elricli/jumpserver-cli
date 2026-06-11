import { readFile } from "node:fs/promises";
import { stdin } from "node:process";
import type { ApiOperation } from "./openapi.js";

export interface RequestPlanInput {
  operation: ApiOperation;
  baseUrl: string;
  pathValues: Record<string, string | number | boolean | undefined>;
  queryValues: Record<string, QueryValue>;
  bodyInput?: string;
  headers?: Record<string, string>;
  basePath?: string;
}

export type QueryValue = string | number | boolean | Array<string | number | boolean> | undefined;

export interface RequestPlan {
  method: string;
  url: URL;
  pathWithQuery: string;
  headers: Record<string, string>;
  body?: string;
}

export async function createRequestPlan(input: RequestPlanInput): Promise<RequestPlan> {
  const operationPath = substitutePathParameters(input.operation, input.pathValues);
  const url = buildUrl(input.baseUrl, input.basePath ?? input.operation.basePath, operationPath);

  for (const [name, value] of Object.entries(input.queryValues)) {
    appendQueryValue(url, name, value);
  }

  const headers: Record<string, string> = { ...(input.headers ?? {}) };
  const body = await resolveBodyInput(input.bodyInput, Boolean(input.operation.bodyRequired));
  if (body !== undefined) {
    headers["Content-Type"] ??= "application/json";
  }

  return {
    method: input.operation.method,
    url,
    pathWithQuery: `${url.pathname}${url.search}`,
    headers,
    ...(body !== undefined ? { body } : {})
  };
}

function substitutePathParameters(
  operation: ApiOperation,
  pathValues: Record<string, string | number | boolean | undefined>
): string {
  let path = operation.path;

  for (const parameter of operation.pathParameters) {
    const value = pathValues[parameter.name];
    if (value === undefined || value === "") {
      throw new Error(`Missing required path parameter: ${parameter.name}`);
    }

    path = path.replaceAll(`{${parameter.name}}`, encodeURIComponent(String(value)));
  }

  const unresolved = path.match(/\{([^}]+)\}/);
  if (unresolved?.[1]) {
    throw new Error(`Missing required path parameter: ${unresolved[1]}`);
  }

  return path;
}

function buildUrl(baseUrl: string, basePath: string, operationPath: string): URL {
  const base = new URL(baseUrl);
  const alreadyIncludesBasePath = stripTrailingSlash(base.pathname).endsWith(stripTrailingSlash(basePath));
  const target = new URL(base.href);
  target.hash = "";
  target.search = "";
  target.pathname = joinUrlPath(base.pathname, alreadyIncludesBasePath ? "" : basePath, operationPath);
  return target;
}

function joinUrlPath(...parts: string[]): string {
  const filtered = parts.filter((part) => part.length > 0 && part !== "/");
  const lastPart = filtered.at(-1) ?? "";
  const trailingSlash = lastPart.endsWith("/") ? "/" : "";
  const body = filtered
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter((part) => part.length > 0)
    .join("/");
  return `/${body}${trailingSlash}`;
}

function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/g, "");
}

function appendQueryValue(url: URL, name: string, value: QueryValue): void {
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      url.searchParams.append(name, String(item));
    }
    return;
  }

  url.searchParams.set(name, String(value));
}

async function resolveBodyInput(bodyInput: string | undefined, bodyRequired: boolean): Promise<string | undefined> {
  if (bodyInput === undefined) {
    if (bodyRequired) {
      throw new Error("Request body is required. Pass --body with JSON, @file, or - for stdin.");
    }
    return undefined;
  }

  const raw = await readBodySource(bodyInput);
  try {
    return JSON.stringify(JSON.parse(raw));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON body: ${message}`);
  }
}

async function readBodySource(bodyInput: string): Promise<string> {
  if (bodyInput === "-") {
    return readStdin();
  }

  if (bodyInput.startsWith("@")) {
    return readFile(bodyInput.slice(1), "utf8");
  }

  return bodyInput;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
