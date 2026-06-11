#!/usr/bin/env node
import { Command } from "commander";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, realpathSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stderr as processStderr } from "node:process";
import {
  buildBearerHeaders,
  buildPrivateTokenHeaders,
  buildSignedHeaders
} from "./auth.js";
import {
  accessKeyConfig,
  loadConfig,
  resolveConfigPath,
  saveConfig,
  tokenConfig,
  type CliConfig
} from "./config.js";
import { type ApiOperation, findOperation, loadOperations } from "./openapi.js";
import { createRequestPlan, type QueryValue, type RequestPlan } from "./request.js";

type Fetcher = typeof fetch;
export type Prompt = (message: string, options?: { secret?: boolean }) => Promise<string>;

export interface BuildProgramOptions {
  operations?: ApiOperation[];
  stdout?: (value: string) => void;
  stderr?: (value: string) => void;
  now?: () => Date;
  fetcher?: Fetcher;
  prompt?: Prompt;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
}

interface GlobalOptions {
  host?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  token?: string;
  privateToken?: string;
  org?: string;
}

interface RequestCommandOptions {
  param?: string[];
  path?: string[];
  query?: string[];
  header?: string[];
  limit?: string;
  offset?: string;
  body?: string;
  dryRun?: boolean;
  includeHeaders?: boolean;
  json?: boolean;
}

interface LoginCommandOptions {
  host?: string;
  username?: string;
  password?: string;
  publicKey?: string;
  tokenOnly?: boolean;
}

interface AccessKeyAuthCommandOptions {
  host?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  org?: string;
  dryRun?: boolean;
}

const AUTH_COMPLETE_MESSAGE = "认证完成";
const ASSET_TABLE_COLUMNS = [
  "id",
  "name",
  "address",
  "platform",
  "protocols",
  "category",
  "type",
  "connectivity",
  "is_active"
];
const TABLE_COLUMN_LABELS = new Map([
  ["is_active", "active"],
  ["nodes_display", "nodes"],
  ["org_name", "org"],
  ["date_created", "created"],
  ["date_updated", "updated"]
]);
const ASSET_TABLE_HIDDEN_COLUMNS = new Set([
  "comment",
  "domain",
  "nodes",
  "labels",
  "nodes_display",
  "auto_config",
  "created_by",
  "updated_by",
  "org_id",
  "org_name",
  "date_created",
  "date_updated",
  "date_verified",
  "ca_cert",
  "client_cert",
  "client_key",
  "allow_invalid_cert",
  "use_ssl"
]);
const GROUP_DESCRIPTIONS = new Map<string, string>([
  ["accounts", "Account commands"],
  ["assets", "Asset inventory commands"],
  ["audits", "Audit log commands"],
  ["authentication", "Authentication and connection token commands"],
  ["common", "Common service commands"],
  ["notifications", "Notification commands"],
  ["ops", "Operations task commands"],
  ["orgs", "Organization commands"],
  ["prometheus", "Prometheus metrics commands"],
  ["settings", "Settings commands"],
  ["terminal", "Terminal component and session commands"],
  ["tickets", "Ticket workflow commands"],
  ["users", "User and profile commands"],
  ["assets assets", "Asset records"],
  ["assets categories", "Asset categories"],
  ["assets clouds", "Cloud assets"],
  ["assets customs", "Custom assets"],
  ["assets databases", "Database assets"],
  ["assets devices", "Device assets"],
  ["assets favorite-assets", "Favorite assets"],
  ["assets gateways", "Gateway assets"],
  ["assets gpts", "GPT assets"],
  ["assets hosts", "Host assets"],
  ["assets nodes", "Asset nodes"],
  ["assets platform-automation-methods", "Platform automation methods"],
  ["assets protocols", "Asset protocols"],
  ["assets webs", "Web assets"],
  ["authentication connection-token", "Connection tokens"],
  ["authentication super-connection-token", "Super connection tokens"],
  ["terminal components", "Terminal components"],
  ["users connection-token", "User connection tokens"],
  ["users profile", "Current user profile"]
]);

function resolveBaseUrl(host: string): string {
  return host.includes("://") ? host : `https://${host}`;
}

export function operationCommandPath(operation: ApiOperation): string[] {
  const tagParts = operation.tag.split("_").filter((part) => part.length > 0);
  const actionText = operation.operationId.startsWith(`${operation.tag}_`)
    ? operation.operationId.slice(operation.tag.length + 1)
    : operation.operationId;
  const actionParts = actionText.split("_").filter((part) => part.length > 0);
  return [...tagParts, ...actionParts].map(toCommandName);
}

function toCommandName(value: string): string {
  return value.replaceAll("_", "-");
}

export function buildProgram(options: BuildProgramOptions = {}): Command {
  const operations = options.operations ?? loadOperations();
  const stdout = options.stdout ?? ((value: string) => process.stdout.write(value));
  const stderr = options.stderr ?? ((value: string) => process.stderr.write(value));
  const now = options.now ?? (() => new Date());
  const fetcher = options.fetcher ?? fetch;
  const prompt = options.prompt ?? promptFromTerminal;
  const env = options.env ?? process.env;
  const configPath = resolveConfigPath(options.configPath, env);
  const config = loadConfig(configPath);

  const program = new Command();
  program
    .name("jms")
    .description("OpenAPI-driven CLI for JumpServer")
    .version(readPackageVersion())
    .showHelpAfterError()
    .configureOutput({
      writeOut: (value) => stdout(value),
      writeErr: (value) => stderr(value)
    })
    .option("--host <url>", "JumpServer host URL")
    .option("--access-key-id <id>", "JumpServer Access Key id")
    .option("--access-key-secret <secret>", "JumpServer Access Key secret")
    .option("--token <token>", "Bearer token")
    .option("--private-token <token>", "Private token")
    .option("--org <id>", "JumpServer organization id");

  const apiCommand = program
    .command("api")
    .description("Explore and call documented OpenAPI operations");

  apiCommand
    .command("list")
    .description("List documented operations")
    .option("--tag <tag>", "Filter by tag")
    .option("--search <text>", "Filter by operation id, method, path, tag, or summary")
    .option("--json", "Print JSON")
    .action((commandOptions: { tag?: string; search?: string; json?: boolean }) => {
      const filtered = filterOperations(operations, commandOptions);
      if (commandOptions.json) {
        stdout(`${JSON.stringify(filtered, null, 2)}\n`);
        return;
      }
      stdout(`${formatOperationList(filtered)}\n`);
    });

  apiCommand
    .command("describe")
    .description("Describe one documented operation")
    .argument("<operationId>", "OpenAPI operationId")
    .option("--json", "Print JSON")
    .action((operationId: string, commandOptions: { json?: boolean }) => {
      const operation = findOperation(operationId, operations);
      stdout(
        commandOptions.json
          ? `${JSON.stringify(operation, null, 2)}\n`
          : `${formatOperationDescription(operation)}\n`
      );
    });

  const apiCallCommand = apiCommand
    .command("call")
    .description("Call an operation by operationId")
    .argument("<operationId>", "OpenAPI operationId")
    .action(async (operationId: string, commandOptions: RequestCommandOptions, command: Command) => {
      await runOperation(findOperation(operationId, operations), commandOptions, command, {
        stdout,
        stderr,
        now,
        fetcher,
        configPath,
        config,
        env
      });
    });
  addRequestOptions(apiCallCommand);

  const authCommand = program
    .command("auth")
    .description("Authenticate with JumpServer");

  authCommand
    .command("token")
    .description("Authenticate with username/password and create a Bearer token")
    .option("--host <url>", "JumpServer host URL")
    .option("-u, --username <username>", "Username")
    .option("-p, --password <password>", "Password")
    .option("--public-key <publicKey>", "Public key for public-key authentication")
    .option("--token-only", "Print only the token field from the auth response")
    .action(async (commandOptions: LoginCommandOptions, command: Command) => {
      await runLogin(findOperation("authentication_auth_create", operations), commandOptions, command, {
        stdout,
        stderr,
        now,
        fetcher,
        prompt,
        configPath,
        config,
        env
      });
    });

  authCommand
    .command("access-key")
    .description("Authenticate with Access Key and read the current user profile")
    .option("--host <url>", "JumpServer host URL")
    .option("--access-key-id <id>", "JumpServer Access Key id")
    .option("--access-key-secret <secret>", "JumpServer Access Key secret")
    .option("--org <id>", "JumpServer organization id")
    .option("--dry-run", "Print a concise request preview without sending it")
    .action(async (commandOptions: AccessKeyAuthCommandOptions, command: Command) => {
      await runAccessKeyAuth(findOperation("users_profile_read", operations), commandOptions, command, {
        stdout,
        stderr,
        now,
        fetcher,
        configPath,
        config,
        env
      });
    });

  registerOperationCommands(program, operations, {
    stdout,
    stderr,
    now,
    fetcher,
    configPath,
    config,
    env
  });

  return program;
}

function registerOperationCommands(parent: Command, operations: ApiOperation[], context: RunContext): void {
  for (const operation of operations) {
    const path = operationCommandPath(operation);
    const operationCommand = getOrCreateCommandPath(parent, path, operation);
    operationCommand.description(describeOperationCommand(operation));
    operationCommand.action(async (commandOptions: RequestCommandOptions, command: Command) => {
      await runOperation(operation, commandOptions, command, context);
    });
    addRequestOptions(operationCommand);
    operationCommand.addHelpText("after", operationHelpDetails(operation));
  }
}

function getOrCreateCommandPath(parent: Command, path: string[], operation: ApiOperation): Command {
  let current = parent;
  for (const [index, name] of path.entries()) {
    let next = current.commands.find((candidate) => candidate.name() === name);
    if (!next) {
      const commandPath = path.slice(0, index + 1);
      next = new Command(name)
        .description(describeCommandGroup(commandPath))
        .showHelpAfterError();
      current.addCommand(next);
    }
    current = next;
  }
  return current;
}

function describeCommandGroup(path: string[]): string {
  return GROUP_DESCRIPTIONS.get(path.join(" ")) ?? `${resourceLabel(path)} commands`;
}

function describeOperationCommand(operation: ApiOperation): string {
  const path = operationCommandPath(operation);
  const action = path[path.length - 1] ?? operation.method.toLowerCase();
  const resource = lowerFirst(resourceLabel(path.slice(0, -1)));
  return actionPhrase(action, resource);
}

function actionPhrase(action: string, resource: string): string {
  switch (action) {
    case "match":
      return `Search ${resource}`;
    case "list":
      return `List ${resource}`;
    case "read":
      return `Read ${resource}`;
    case "create":
      return `Create ${resource}`;
    case "update":
      return `Update ${resource}`;
    case "partial-update":
      return `Partially update ${resource}`;
    case "delete":
      return `Delete ${resource}`;
    default:
      return `${titleCase(action)} ${resource}`;
  }
}

function operationHelpDetails(operation: ApiOperation): string {
  return [
    "",
    "Details:",
    `  Path params: ${formatHelpParameters(operation.pathParameters)}`,
    `  Query params: ${formatHelpParameters(operation.queryParameters)}`,
    `  Body: ${formatBodyHelp(operation)}`,
    "",
    "Example:",
    `  jms ${operationCommandPath(operation).join(" ")}${exampleArguments(operation)}`
  ].join("\n");
}

function formatHelpParameters(parameters: ApiOperation["queryParameters"]): string {
  if (parameters.length === 0) {
    return "none";
  }
  return parameters.map((parameter) => `${parameter.name}${parameter.required ? " (required)" : ""}`).join(", ");
}

function formatBodyHelp(operation: ApiOperation): string {
  if (!operation.bodySchema) {
    return "none";
  }
  const requirement = operation.bodyRequired ? "required" : "optional";
  return `${requirement} ${formatSchemaReference(operation.bodySchema)}`;
}

function formatSchemaReference(schema: NonNullable<ApiOperation["bodySchema"]>): string {
  return schema.ref ?? schema.type ?? "JSON";
}

function exampleArguments(operation: ApiOperation): string {
  const parts: string[] = [];
  for (const parameter of operation.pathParameters) {
    parts.push(`--path ${parameter.name}=value`);
  }

  const query = operation.queryParameters.find((parameter) => parameter.name === "search") ?? operation.queryParameters[0];
  if (query) {
    parts.push(`--query ${query.name}=value`);
  }

  if (operation.bodySchema) {
    parts.push(`--body '{}'`);
  }

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function resourceLabel(path: string[]): string {
  if (path.length === 0) {
    return "resource";
  }
  const configured = GROUP_DESCRIPTIONS.get(path.join(" "));
  if (configured) {
    return configured.replace(/ commands$/i, "");
  }
  const resourceParts = path.length > 1 ? path.slice(1) : path;
  return titleCase(resourceParts.join(" "));
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => (part.toLowerCase() === "url" ? "URL" : `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`))
    .join(" ");
}

function lowerFirst(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return `${value[0]?.toLowerCase() ?? ""}${value.slice(1)}`;
}

interface RunContext {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
  now: () => Date;
  fetcher: Fetcher;
  configPath: string;
  config: CliConfig;
  env: NodeJS.ProcessEnv;
}

interface LoginRunContext extends RunContext {
  prompt: Prompt;
}

async function runLogin(
  operation: ApiOperation,
  commandOptions: LoginCommandOptions,
  command: Command,
  context: LoginRunContext
): Promise<void> {
  try {
    const globalOptions = resolveGlobalOptions(command, context);
    const resolvedCommandOptions = resolveLoginCommandOptions(commandOptions, context.env);
    const host = resolveRequiredHost(commandOptions.host ?? globalOptions.host);
    const body = await buildLoginBody(resolvedCommandOptions, context.prompt);
    const plan = await createRequestPlan({
      operation,
      baseUrl: resolveBaseUrl(host),
      pathValues: {},
      queryValues: {},
      bodyInput: JSON.stringify(body),
      basePath: operation.basePath
    });

    mergeHeadersCaseInsensitive(plan.headers, buildLoginHeaders(globalOptions.org));

    const requestInit = {
      method: plan.method,
      headers: plan.headers,
      ...(plan.body !== undefined ? { body: plan.body } : {})
    };
    const response = await context.fetcher(plan.url, requestInit);

    await printTokenAuthResponse(response, resolvedCommandOptions, context, {
      host,
      org: globalOptions.org
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.stderr(`${message}\n`);
    process.exitCode = 1;
  }
}

async function runOperation(
  operation: ApiOperation,
  commandOptions: RequestCommandOptions,
  command: Command,
  context: RunContext
): Promise<void> {
  try {
    const globalOptions = resolveGlobalOptions(command, context);
    const host = resolveRequiredHost(globalOptions.host);
    const requestValues = collectRequestValues(operation, commandOptions);
    const planInput = {
      operation,
      baseUrl: resolveBaseUrl(host),
      pathValues: requestValues.pathValues,
      queryValues: requestValues.queryValues,
      basePath: operation.basePath,
      headers: requestValues.headers
    };
    const plan = await createRequestPlan(
      commandOptions.body === undefined ? planInput : { ...planInput, bodyInput: commandOptions.body }
    );

    applyAuthHeaders(plan, operation, globalOptions, context.now());

    if (commandOptions.dryRun) {
      context.stdout(formatDryRun(plan));
      return;
    }

    const requestInit = {
      method: plan.method,
      headers: plan.headers,
      ...(plan.body !== undefined ? { body: plan.body } : {})
    };
    const response = await context.fetcher(plan.url, requestInit);
    await printResponse(response, commandOptions, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.stderr(`${message}\n`);
    process.exitCode = 1;
  }
}

async function runAccessKeyAuth(
  operation: ApiOperation,
  commandOptions: AccessKeyAuthCommandOptions,
  command: Command,
  context: RunContext
): Promise<void> {
  try {
    const globalOptions = resolveGlobalOptions(command, context);
    const host = resolveRequiredHost(commandOptions.host ?? globalOptions.host);
    const accessKeyId = commandOptions.accessKeyId ?? globalOptions.accessKeyId;
    const accessKeySecret = commandOptions.accessKeySecret ?? globalOptions.accessKeySecret;
    const org = commandOptions.org ?? globalOptions.org;

    if (!accessKeyId || !accessKeySecret) {
      throw new Error(
        "Missing Access Key credentials. Pass --access-key-id and --access-key-secret, or set JMS_ACCESS_KEY_ID and JMS_ACCESS_KEY_SECRET."
      );
    }

    const plan = await createRequestPlan({
      operation,
      baseUrl: resolveBaseUrl(host),
      pathValues: {},
      queryValues: {},
      basePath: operation.basePath
    });

    mergeHeadersCaseInsensitive(
      plan.headers,
      buildSignedHeaders({
        accessKeyId,
        accessKeySecret,
        method: operation.method,
        pathWithQuery: plan.pathWithQuery,
        now: context.now(),
        ...(org ? { organizationId: org } : {})
      })
    );

    if (commandOptions.dryRun) {
      context.stdout(formatDryRun(plan));
      return;
    }

    const response = await context.fetcher(plan.url, {
      method: plan.method,
      headers: plan.headers
    });
    if (response.ok) {
      await saveConfig(
        context.configPath,
        accessKeyConfig({
          host,
          accessKeyId,
          accessKeySecret,
          org
        })
      );
    }
    await printAuthCompletionResponse(response, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.stderr(`${message}\n`);
    process.exitCode = 1;
  }
}

function resolveGlobalOptions(command: Command, context: RunContext): GlobalOptions {
  const options = command.optsWithGlobals<GlobalOptions>();
  const resolved: GlobalOptions = {};
  setIfDefined(resolved, "host", options.host ?? context.env.JMS_HOST ?? context.config.host);
  setIfDefined(resolved, "accessKeyId", options.accessKeyId ?? context.env.JMS_ACCESS_KEY_ID ?? context.config.accessKeyId);
  setIfDefined(
    resolved,
    "accessKeySecret",
    options.accessKeySecret ?? context.env.JMS_ACCESS_KEY_SECRET ?? context.config.accessKeySecret
  );
  setIfDefined(resolved, "token", options.token ?? context.env.JMS_TOKEN ?? context.config.token);
  setIfDefined(resolved, "privateToken", options.privateToken ?? context.env.JMS_PRIVATE_TOKEN ?? context.config.privateToken);
  setIfDefined(resolved, "org", options.org ?? context.env.JMS_ORG ?? context.config.org);
  return resolved;
}

function resolveRequiredHost(host: string | undefined): string {
  if (!host) {
    throw new Error("Missing JumpServer host. Pass --host, set JMS_HOST, or run auth with --host to save one.");
  }
  return host;
}

function resolveLoginCommandOptions(
  options: LoginCommandOptions,
  env: NodeJS.ProcessEnv
): LoginCommandOptions {
  const resolved: LoginCommandOptions = {};
  setIfDefined(resolved, "host", options.host);
  setIfDefined(resolved, "username", options.username ?? env.JMS_USERNAME);
  setIfDefined(resolved, "password", options.password ?? env.JMS_PASSWORD);
  setIfDefined(resolved, "publicKey", options.publicKey ?? env.JMS_PUBLIC_KEY);
  setIfDefined(resolved, "tokenOnly", options.tokenOnly);
  return resolved;
}

function setIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

async function buildLoginBody(
  options: LoginCommandOptions,
  prompt: Prompt
): Promise<Record<string, string>> {
  const username = await requiredLoginValue("username", options.username, prompt, "Username: ");
  const body: Record<string, string> = { username };

  if (options.publicKey) {
    body.public_key = options.publicKey;
  }

  if (options.password !== undefined) {
    body.password = options.password;
  } else if (!options.publicKey) {
    body.password = await requiredLoginValue("password", undefined, prompt, "Password: ", { secret: true });
  }

  return body;
}

async function requiredLoginValue(
  name: string,
  value: string | undefined,
  prompt: Prompt,
  message: string,
  promptOptions?: { secret?: boolean }
): Promise<string> {
  const resolved = value ?? (await prompt(message, promptOptions));
  if (resolved.length === 0) {
    throw new Error(`Missing auth token ${name}. Pass --${name} or run auth token in an interactive terminal.`);
  }
  return resolved;
}

function buildLoginHeaders(organizationId: string | undefined): Record<string, string> {
  return {
    Accept: "application/json",
    ...(organizationId ? { "X-JMS-ORG": organizationId } : {})
  };
}

async function printTokenAuthResponse(
  response: Response,
  options: LoginCommandOptions,
  context: RunContext,
  configBase: CliConfig
): Promise<void> {
  const text = await response.text();

  if (!response.ok) {
    context.stderr(`认证失败: ${formatFailureMessage(text, response)}\n`);
    process.exitCode = 1;
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Login response was not JSON; cannot read token.");
  }

  if (!isTokenPayload(payload)) {
    throw new Error("Login response did not include a token field.");
  }

  await saveConfig(context.configPath, tokenConfig({ ...configBase, token: payload.token }));
  context.stdout(options.tokenOnly ? `${payload.token}\n` : `${AUTH_COMPLETE_MESSAGE}\n`);
}

async function printAuthCompletionResponse(response: Response, context: RunContext): Promise<void> {
  const text = await response.text();

  if (!response.ok) {
    context.stderr(`认证失败: ${formatFailureMessage(text, response)}\n`);
    process.exitCode = 1;
    return;
  }

  context.stdout(`${AUTH_COMPLETE_MESSAGE}\n`);
}

function isTokenPayload(payload: unknown): payload is { token: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "token" in payload &&
    typeof payload.token === "string" &&
    payload.token.length > 0
  );
}

function addRequestOptions(command: Command): void {
  command
    .option("-p, --param <name=value>", "Path parameter if the name is in the path template, otherwise query", collect, [])
    .option("--path <name=value>", "Path parameter value", collect, [])
    .option("-q, --query <name=value>", "Query parameter value", collect, [])
    .option("-H, --header <name=value>", "Extra request header", collect, [])
    .option("--limit <number>", "Number of results to return for limit/offset paginated APIs")
    .option("--offset <number>", "Initial result offset for limit/offset paginated APIs")
    .option("-b, --body <json|@file|->", "JSON request body, @file, or - for stdin")
    .option("--dry-run", "Print a concise request preview without sending it")
    .option("--include-headers", "Include response status and headers in output")
    .option("--json", "Print raw JSON response");
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function collectRequestValues(
  operation: ApiOperation,
  options: RequestCommandOptions
): {
  pathValues: Record<string, string>;
  queryValues: Record<string, QueryValue>;
  headers: Record<string, string>;
} {
  const pathParameterNames = new Set(operation.pathParameters.map((parameter) => parameter.name));
  const queryParameterNames = new Set(operation.queryParameters.map((parameter) => parameter.name));
  const pathValues: Record<string, string> = {};
  const queryValues: Record<string, QueryValue> = {};

  for (const [name, value] of parsePairs(options.param ?? [])) {
    if (pathParameterNames.has(name)) {
      pathValues[name] = value;
    } else {
      queryValues[name] = value;
    }
  }

  Object.assign(pathValues, Object.fromEntries(parsePairs(options.path ?? [])));
  Object.assign(queryValues, Object.fromEntries(parsePairs(options.query ?? [])));
  applyPaginationShortcut(operation, queryParameterNames, queryValues, "limit", options.limit);
  applyPaginationShortcut(operation, queryParameterNames, queryValues, "offset", options.offset);

  return {
    pathValues,
    queryValues,
    headers: Object.fromEntries(parsePairs(options.header ?? []))
  };
}

function applyPaginationShortcut(
  operation: ApiOperation,
  queryParameterNames: Set<string>,
  queryValues: Record<string, QueryValue>,
  name: "limit" | "offset",
  value: string | undefined
): void {
  if (value === undefined) {
    return;
  }

  if (!queryParameterNames.has(name)) {
    throw new Error(`${operation.operationId} does not support --${name}. Use --query ${name}=... only if the API accepts it.`);
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`Expected --${name} to be a non-negative integer, got: ${value}`);
  }

  queryValues[name] = value;
}

function parsePairs(values: string[]): Array<[string, string]> {
  return values.map((value) => {
    const separator = value.indexOf("=");
    if (separator <= 0) {
      throw new Error(`Expected name=value, got: ${value}`);
    }
    return [value.slice(0, separator), value.slice(separator + 1)];
  });
}

function applyAuthHeaders(plan: RequestPlan, operation: ApiOperation, options: GlobalOptions, now: Date): void {
  const org = options.org;
  let authHeaders: Record<string, string> = {};

  if (options.accessKeyId && options.accessKeySecret) {
    authHeaders = buildSignedHeaders({
      accessKeyId: options.accessKeyId,
      accessKeySecret: options.accessKeySecret,
      method: operation.method,
      pathWithQuery: plan.pathWithQuery,
      now,
      ...(org ? { organizationId: org } : {})
    });
  } else if (options.token) {
    authHeaders = buildBearerHeaders(options.token, org);
  } else if (options.privateToken) {
    authHeaders = buildPrivateTokenHeaders(options.privateToken, org);
  } else if (org) {
    authHeaders = {
      Accept: "application/json",
      "X-JMS-ORG": org
    };
  } else {
    authHeaders = {
      Accept: "application/json"
    };
  }

  mergeHeadersCaseInsensitive(plan.headers, authHeaders);
}

function mergeHeadersCaseInsensitive(target: Record<string, string>, source: Record<string, string>): void {
  const sourceNames = new Set(Object.keys(source).map((key) => key.toLowerCase()));
  for (const key of Object.keys(target)) {
    if (sourceNames.has(key.toLowerCase())) {
      delete target[key];
    }
  }
  Object.assign(target, source);
}

function formatDryRun(plan: RequestPlan): string {
  const lines = [
    "请求预览",
    `方法: ${plan.method}`,
    `地址: ${plan.url.href}`,
    `认证: ${describeAuthentication(plan.headers)}`,
    `请求体: ${plan.body === undefined ? "无" : "已设置"}`
  ];

  const organizationId = findHeaderValue(plan.headers, "x-jms-org");
  if (organizationId) {
    lines.splice(4, 0, `组织: ${organizationId}`);
  }

  return `${lines.join("\n")}\n`;
}

function describeAuthentication(headers: Record<string, string>): string {
  const authorization = findHeaderValue(headers, "authorization");
  if (!authorization) {
    return "无";
  }

  if (authorization.startsWith("Signature ")) {
    return "Access Key";
  }
  if (authorization.startsWith("Bearer ")) {
    return "Bearer Token";
  }
  if (authorization.startsWith("Token ")) {
    return "Private Token";
  }
  return "已设置";
}

function findHeaderValue(headers: Record<string, string>, name: string): string | undefined {
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return found?.[1];
}

async function printResponse(
  response: Response,
  options: RequestCommandOptions,
  context: RunContext
): Promise<void> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (options.includeHeaders) {
    context.stdout(`状态: ${response.status}${response.statusText ? ` ${response.statusText}` : ""}\n`);
  }

  if (!response.ok) {
    context.stderr(`请求失败: ${formatFailureMessage(text, response)}\n`);
    process.exitCode = 1;
    return;
  }

  const body = formatResponseBody(text, contentType, Boolean(options.json));
  if (body.length > 0) {
    context.stdout(body);
  }
}

function formatResponseBody(text: string, contentType: string, rawJson: boolean): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return "请求完成\n";
  }

  if (!contentType.includes("application/json")) {
    return `${trimmed}\n`;
  }

  try {
    const payload = JSON.parse(text);
    return rawJson ? `${JSON.stringify(payload, null, 2)}\n` : formatJsonResponse(payload);
  } catch {
    return `${trimmed}\n`;
  }
}

function formatJsonResponse(payload: unknown): string {
  if (Array.isArray(payload)) {
    return formatTable(payload);
  }

  if (isPlainObject(payload)) {
    if (Array.isArray(payload.results)) {
      const metadata = formatMetadata(payload, new Set(["results"]));
      return `${metadata}${formatTable(payload.results)}`;
    }
    return formatTable([payload]);
  }

  return `${String(payload)}\n`;
}

function formatMetadata(payload: Record<string, unknown>, excludedKeys: Set<string>): string {
  const lines = Object.entries(payload)
    .filter(([key, value]) => !excludedKeys.has(key) && value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${formatCell(value)}`);
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function formatTable(items: unknown[]): string {
  const rows = items.map(normalizeTableRow);
  const columns = selectTableColumns(tableColumns(rows), rows);

  if (columns.length === 0) {
    return "0 rows in set\n";
  }

  const widths = columns.map((column) => {
    const label = tableColumnLabel(column);
    return Math.max(displayWidth(label), ...rows.map((row) => displayWidth(truncateCell(row[column] ?? "", column))));
  });
  const separator = tableSeparator(widths);
  const lines = [
    separator,
    tableRow(columns.map(tableColumnLabel), columns, widths),
    separator,
    ...rows.map((row) => tableRow(columns.map((column) => truncateCell(row[column] ?? "", column)), columns, widths)),
    separator,
    rowCountLine(rows.length)
  ];
  return `${lines.join("\n")}\n`;
}

function rowCountLine(count: number): string {
  return `${count} ${count === 1 ? "row" : "rows"} in set`;
}

function normalizeTableRow(item: unknown): Record<string, string> {
  if (!isPlainObject(item)) {
    return { value: formatCell(item) };
  }

  return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, formatCell(value)]));
}

function tableColumns(rows: Array<Record<string, string>>): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (!seen.has(column)) {
        seen.add(column);
        columns.push(column);
      }
    }
  }
  return columns;
}

function selectTableColumns(columns: string[], rows: Array<Record<string, string>>): string[] {
  const visible = columns.filter((column) => hasColumnValue(rows, column));
  if (!isAssetLikeTable(visible)) {
    return visible;
  }
  const preferred = ASSET_TABLE_COLUMNS.filter((column) => visible.includes(column));
  return preferred.length > 0 ? preferred : visible.filter((column) => !ASSET_TABLE_HIDDEN_COLUMNS.has(column));
}

function hasColumnValue(rows: Array<Record<string, string>>, column: string): boolean {
  return rows.some((row) => (row[column] ?? "").trim().length > 0);
}

function isAssetLikeTable(columns: string[]): boolean {
  return columns.includes("address") && (columns.includes("platform") || columns.includes("protocols"));
}

function tableColumnLabel(column: string): string {
  return TABLE_COLUMN_LABELS.get(column) ?? column;
}

function truncateCell(value: string, column: string): string {
  const maxWidth = maxColumnWidth(column);
  if (displayWidth(value) <= maxWidth) {
    return value;
  }
  return truncateDisplay(value, maxWidth);
}

function maxColumnWidth(column: string): number {
  switch (column) {
    case "id":
      return 36;
    case "name":
      return 32;
    case "address":
      return 32;
    case "protocols":
      return 24;
    case "platform":
    case "category":
    case "type":
    case "connectivity":
      return 18;
    default:
      return 28;
  }
}

function tableSeparator(widths: number[]): string {
  return `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;
}

function tableRow(values: string[], columns: string[], widths: number[]): string {
  return `| ${values
    .map((value, index) => padDisplay(value, widths[index] ?? displayWidth(columns[index] ?? "")))
    .join(" | ")} |`;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatArrayItem).join(", ");
  }
  if (isPlainObject(value)) {
    return formatObjectCell(value);
  }
  return String(value);
}

function formatArrayItem(value: unknown): string {
  if (isPlainObject(value) && typeof value.name === "string" && isDisplayableScalar(value.port)) {
    return `${value.name}:${String(value.port)}`;
  }
  return formatCell(value);
}

function formatObjectCell(value: Record<string, unknown>): string {
  if (typeof value.name === "string" && isDisplayableScalar(value.id)) {
    return `${value.name} (${String(value.id)})`;
  }
  if (typeof value.label === "string" && isDisplayableScalar(value.value)) {
    return `${value.label} (${String(value.value)})`;
  }
  return JSON.stringify(value);
}

function isDisplayableScalar(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function padDisplay(value: string, width: number): string {
  return `${value}${" ".repeat(Math.max(0, width - displayWidth(value)))}`;
}

function truncateDisplay(value: string, maxWidth: number): string {
  if (maxWidth <= 3) {
    return ".".repeat(maxWidth);
  }

  const suffix = "...";
  let output = "";
  let width = 0;
  for (const char of value) {
    const charWidth = isWideCharacter(char) ? 2 : 1;
    if (width + charWidth > maxWidth - suffix.length) {
      break;
    }
    output += char;
    width += charWidth;
  }
  return `${output}${suffix}`;
}

function displayWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    width += isWideCharacter(char) ? 2 : 1;
  }
  return width;
}

function isWideCharacter(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  );
}

function formatFailureMessage(text: string, response: Response): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return trimmed;
  }

  try {
    return summarizeJsonError(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}

function summarizeJsonError(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (isPlainObject(payload)) {
    for (const key of ["detail", "message", "msg", "error", "error_description"]) {
      const value = payload[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  return "服务端返回错误";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function filterOperations(
  operations: ApiOperation[],
  options: { tag?: string; search?: string }
): ApiOperation[] {
  const search = options.search?.toLowerCase();
  return operations.filter((operation) => {
    if (options.tag && operation.tag !== options.tag) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [operation.operationId, operation.method, operation.path, operation.tag, operation.summary]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

function formatOperationList(operations: ApiOperation[]): string {
  return operations
    .map((operation) => `${operation.operationId.padEnd(64)} ${operation.method.padEnd(6)} ${operation.path}`)
    .join("\n");
}

function formatOperationDescription(operation: ApiOperation): string {
  return [
    `${operation.operationId}`,
    `${operation.method} ${operation.path}`,
    `Tag: ${operation.tag}`,
    `Summary: ${operation.summary}`,
    `Path params: ${formatParameters(operation.pathParameters)}`,
    `Query params: ${formatParameters(operation.queryParameters)}`,
    `Body required: ${operation.bodyRequired ? "yes" : "no"}`
  ].join("\n");
}

function formatParameters(parameters: ApiOperation["queryParameters"]): string {
  if (parameters.length === 0) {
    return "none";
  }
  return parameters.map((parameter) => `${parameter.name}${parameter.required ? " (required)" : ""}`).join(", ");
}

async function promptFromTerminal(message: string): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error("Cannot prompt for auth token credentials because stdin is not an interactive terminal.");
  }

  const readline = createInterface({
    input: stdin,
    output: processStderr
  });

  try {
    return await readline.question(message);
  } finally {
    readline.close();
  }
}

export function isDirectCliInvocation(metaUrl: string, argv1: string | undefined): boolean {
  if (!argv1) {
    return false;
  }

  return realPath(fileURLToPath(metaUrl)) === realPath(argv1);
}

export function readPackageVersion(packageJsonPath = resolvePackageJsonPath()): string {
  const payload = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  if (typeof payload.version !== "string" || payload.version.length === 0) {
    throw new Error(`Unable to read package version from ${packageJsonPath}`);
  }
  return payload.version;
}

function resolvePackageJsonPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../package.json");
}

function realPath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

if (isDirectCliInvocation(import.meta.url, process.argv[1])) {
  buildProgram().parseAsync(process.argv).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
