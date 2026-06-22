#!/usr/bin/env node
import { Command } from "commander";
import {
  cancel as clackCancel,
  confirm as clackConfirm,
  isCancel,
  multiselect as clackMultiselect,
  password as clackPassword,
  select as clackSelect,
  text as clackText
} from "@clack/prompts";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, realpathSync } from "node:fs";
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
export type ConfirmPrompt = (message: string, initialValue?: boolean) => Promise<boolean>;
export interface SelectChoice<T> {
  label: string;
  value: T;
}
export type SelectPrompt = <T>(message: string, choices: Array<SelectChoice<T>>) => Promise<T>;
export interface DatabaseAssetSelectionInput {
  initialSearch?: string;
  pageSize: number;
  fetchPage: (search: string | undefined, offset: number) => Promise<DatabaseAssetPage>;
}
export type DatabaseAssetSelectPrompt = (message: string, input: DatabaseAssetSelectionInput) => Promise<DatabaseAsset[]>;

export interface BuildProgramOptions {
  operations?: ApiOperation[];
  stdout?: (value: string) => void;
  stderr?: (value: string) => void;
  terminalColumns?: number;
  now?: () => Date;
  fetcher?: Fetcher;
  prompt?: Prompt;
  confirm?: ConfirmPrompt;
  select?: SelectPrompt;
  databaseAssetSelect?: DatabaseAssetSelectPrompt;
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

interface DatabaseTokenCommandOptions {
  account?: string;
  inputUsername?: string;
  connectMethod?: string;
  protocol?: string;
  all?: boolean;
  limit?: string;
  jmsUrl?: boolean;
  dsn?: boolean;
  json?: boolean;
  reusable?: boolean;
}

const AUTH_COMPLETE_MESSAGE = "认证完成";
const DEFAULT_DATABASE_TOKEN_LIMIT = 20;
const DEFAULT_DATABASE_CONNECT_METHOD = "db_guide";
const DEFAULT_DATABASE_REUSABLE = false;
const DEFAULT_TERMINAL_COLUMNS = 120;
const MIN_DATABASE_TABLE_VALUE_WIDTH = 12;
const DEFAULT_DATABASE_CONNECT_OPTIONS = {
  charset: "default",
  disableautohash: false,
  resolution: "auto",
  backspaceAsCtrlH: false,
  appletConnectMethod: "web"
};
const PERMED_DATABASE_ASSETS_OPERATION: ApiOperation = {
  method: "GET",
  path: "/perms/users/self/assets/",
  basePath: "/api/v1",
  operationId: "perms_users_self_database_assets_list",
  tag: "perms_users",
  summary: "List current user's permitted database assets",
  queryParameters: [],
  pathParameters: []
};
const PERMED_DATABASE_ASSET_DETAIL_OPERATION: ApiOperation = {
  method: "GET",
  path: "/perms/users/self/assets/{id}/",
  basePath: "/api/v1",
  operationId: "perms_users_self_database_asset_read",
  tag: "perms_users",
  summary: "Read current user's permitted database asset detail",
  queryParameters: [],
  pathParameters: [{ name: "id", required: true, schema: { type: "string" } }]
};
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
const RESOURCE_LABELS_BY_TAG = new Map<string, string>([
  ["assets_assets", "Asset records"]
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
  return collapseAdjacentDuplicates([...tagParts, ...actionParts]).map(toCommandName);
}

function toCommandName(value: string): string {
  return value.replaceAll("_", "-");
}

function collapseAdjacentDuplicates(values: string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

function envColumns(env: NodeJS.ProcessEnv): number | undefined {
  const value = env.COLUMNS;
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

function resolveTerminalColumns(...candidates: Array<number | undefined>): number {
  return candidates.find((candidate) => candidate !== undefined && Number.isFinite(candidate) && candidate > 0) ?? DEFAULT_TERMINAL_COLUMNS;
}

export function buildProgram(options: BuildProgramOptions = {}): Command {
  const operations = options.operations ?? loadOperations();
  const stdout = options.stdout ?? ((value: string) => process.stdout.write(value));
  const stderr = options.stderr ?? ((value: string) => process.stderr.write(value));
  const terminalColumns = resolveTerminalColumns(options.terminalColumns, envColumns(options.env ?? process.env), process.stdout.columns);
  const now = options.now ?? (() => new Date());
  const fetcher = options.fetcher ?? fetch;
  const prompt = options.prompt ?? promptFromTerminal;
  const confirm = options.confirm ?? confirmFromTerminal;
  const select = options.select ?? selectFromTerminal;
  const databaseAssetSelect =
    options.databaseAssetSelect ??
    (stdin.isTTY && !options.select ? selectDatabaseAssetFromTerminal : databaseAssetSelectFromChoicePrompt(select));
  const env = options.env ?? process.env;
  const configPath = resolveConfigPath(options.configPath, env);
  const config = loadConfig(configPath);
  const context: InteractiveRunContext = {
    stdout,
    stderr,
    terminalColumns,
    now,
    fetcher,
    prompt,
    confirm,
    select,
    databaseAssetSelect,
    canConfirmDatabaseReusable: options.confirm !== undefined || stdin.isTTY,
    configPath,
    config,
    env
  };

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
      await runOperation(findOperation(operationId, operations), commandOptions, command, context);
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
      await runLogin(findOperation("authentication_auth_create", operations), commandOptions, command, context);
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
      await runAccessKeyAuth(findOperation("users_profile_read", operations), commandOptions, command, context);
    });

  registerDatabaseTokenCommand(program, operations, context);
  registerOperationCommands(program, operations, context);

  return program;
}

function registerOperationCommands(parent: Command, operations: ApiOperation[], context: RunContext): void {
  for (const operation of operations) {
    const path = operationCommandPath(operation);
    const operationCommand = getOrCreateCommandPath(parent, path);
    operationCommand.description(describeOperationCommand(operation));
    operationCommand.action(async (commandOptions: RequestCommandOptions, command: Command) => {
      await runOperation(operation, commandOptions, command, context);
    });
    addRequestOptions(operationCommand);
    operationCommand.addHelpText("after", operationHelpDetails(operation));
  }
}

function registerDatabaseTokenCommand(parent: Command, operations: ApiOperation[], context: InteractiveRunContext): void {
  const databasesCommand = getOrCreateCommandPath(parent, ["assets", "databases"]);
  databasesCommand
    .command("token")
    .description("Create a database connection token")
    .argument("[pattern]", "Database instance name glob or substring")
    .option("--account <name>", "JumpServer asset account name, defaults to a name derived from the asset")
    .option("--input-username <username>", "Database username, defaults to an interactive suggestion")
    .option("--connect-method <method>", "JumpServer connection method", DEFAULT_DATABASE_CONNECT_METHOD)
    .option("--protocol <protocol>", "Database protocol, defaults to the selected asset protocol")
    .option("--all", "Create tokens for all matching permitted database assets without prompting")
    .option("--limit <number>", "Database asset page size", String(DEFAULT_DATABASE_TOKEN_LIMIT))
    .option("--reusable", "Enable reusable database token")
    .option("--no-reusable", "Disable reusable database token")
    .option("--jms-url", "Print the raw JumpServer jms:// client URL")
    .option("--dsn", "Print only database DSN lines")
    .option("--json", "Print JSON")
    .action(async (pattern: string | undefined, options: DatabaseTokenCommandOptions, command: Command) => {
      await runDatabaseTokenCommand(pattern, options, command, operations, context);
    });
}

function getOrCreateCommandPath(parent: Command, path: string[]): Command {
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
  const resource = lowerFirst(operationResourceLabel(operation, path.slice(0, -1)));
  return actionPhrase(action, resource);
}

function operationResourceLabel(operation: ApiOperation, path: string[]): string {
  const originalTagPath = operation.tag.split("_").filter((part) => part.length > 0).map(toCommandName);
  const originalTagResourceLabel = RESOURCE_LABELS_BY_TAG.get(operation.tag);
  if (originalTagResourceLabel) {
    return originalTagResourceLabel;
  }
  const originalDescription = GROUP_DESCRIPTIONS.get(originalTagPath.join(" "));
  if (originalDescription && originalTagPath.length !== path.length) {
    return originalDescription.replace(/ commands$/i, "");
  }
  return resourceLabel(path);
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
  terminalColumns: number;
  now: () => Date;
  fetcher: Fetcher;
  configPath: string;
  config: CliConfig;
  env: NodeJS.ProcessEnv;
}

interface InteractiveRunContext extends RunContext {
  prompt: Prompt;
  confirm: ConfirmPrompt;
  select: SelectPrompt;
  databaseAssetSelect: DatabaseAssetSelectPrompt;
  canConfirmDatabaseReusable: boolean;
}

type LoginRunContext = InteractiveRunContext;

export interface DatabaseAsset {
  id: string;
  name: string;
  address?: string;
  protocols?: unknown;
  platform?: unknown;
}

export interface DatabaseAssetPage {
  items: DatabaseAsset[];
  count?: number;
  nextOffset: number;
  hasMore: boolean;
}

interface DatabasePermedAccount {
  alias: string;
  username: string;
}

interface DatabaseTokenIdentity {
  account: string;
  inputUsername: string;
}

interface LoadMoreDatabaseAssetsChoice {
  type: "load-more";
}

interface DatabaseGuideConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  command: string;
}

interface DatabaseTokenOutput {
  asset: {
    id: string;
    name: string;
    address?: string;
  };
  account: string;
  inputUsername: string;
  password?: string;
  protocol: string;
  connectMethod: string;
  reusable: boolean;
  tokenId: string;
  expiresAt?: string;
  dbGuide?: DatabaseGuideConnection;
  dsn?: string;
  jmsUrl?: string;
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

async function runDatabaseTokenCommand(
  pattern: string | undefined,
  options: DatabaseTokenCommandOptions,
  command: Command,
  operations: ApiOperation[],
  context: InteractiveRunContext
): Promise<void> {
  try {
    const limit = parsePositiveInteger(options.limit ?? String(DEFAULT_DATABASE_TOKEN_LIMIT), "--limit");
    const assets = options.all
      ? await fetchAllDatabaseAssets(pattern, limit, command, context)
      : await choosePaginatedDatabaseAssets(pattern, limit, command, operations, context);
    if (assets.length === 0) {
      throw new Error("未选择数据库实例");
    }
    const reusable = await resolveDatabaseReusable(options, context);

    const outputs: DatabaseTokenOutput[] = [];
    for (const asset of assets) {
      outputs.push(await createDatabaseTokenOutput(asset, options, reusable, command, operations, context));
    }

    context.stdout(formatDatabaseTokenOutputs(outputs, options, context.terminalColumns));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.stderr(`${message}\n`);
    process.exitCode = 1;
  }
}

async function createDatabaseTokenOutput(
  asset: DatabaseAsset,
  options: DatabaseTokenCommandOptions,
  reusable: boolean,
  command: Command,
  operations: ApiOperation[],
  context: InteractiveRunContext
): Promise<DatabaseTokenOutput> {
  const { account, inputUsername } = await resolveDatabaseTokenIdentity(asset, options, command, operations, context);
  const protocol = options.protocol ?? defaultDatabaseProtocol(asset);
  const connectMethod = options.connectMethod ?? DEFAULT_DATABASE_CONNECT_METHOD;
  const tokenPayload = await callOperationJson({
    operation: findOperation("users_connection-token_create", operations),
    command,
    context,
    body: {
      asset: asset.id,
      account,
      protocol,
      input_username: inputUsername,
      input_secret: "",
      connect_method: connectMethod,
      connect_options: buildDatabaseConnectOptions(reusable)
    }
  });
  const token = normalizeConnectionToken(tokenPayload);
  const clientUrlPayload = await callOperationJson({
    operation: findOperation("users_connection-token_client-url_read", operations),
    command,
    context,
    pathValues: { id: token.id }
  });
  const jmsUrl = extractClientUrl(clientUrlPayload);
  const dbGuide = extractDatabaseGuideConnection(jmsUrl, token);
  const dsn = dbGuide ? formatDatabaseDsn(protocol, dbGuide) : undefined;

  return {
    asset: {
      id: asset.id,
      name: asset.name,
      ...(asset.address ? { address: asset.address } : {})
    },
    account,
    inputUsername,
    ...(token.password ? { password: token.password } : {}),
    protocol,
    connectMethod,
    reusable,
    tokenId: token.id,
    ...(token.expiresAt ? { expiresAt: token.expiresAt } : {}),
    ...(dbGuide ? { dbGuide } : {}),
    ...(dsn ? { dsn } : {}),
    ...(options.jmsUrl ? { jmsUrl } : {})
  };
}

async function resolveDatabaseTokenIdentity(
  asset: DatabaseAsset,
  options: DatabaseTokenCommandOptions,
  command: Command,
  operations: ApiOperation[],
  context: InteractiveRunContext
): Promise<DatabaseTokenIdentity> {
  if (options.account) {
    const inputUsername =
      options.inputUsername ?? (await chooseDatabaseInputUsername(asset, command, operations, context, !options.all));
    return { account: options.account, inputUsername };
  }

  if (options.all) {
    const account = await chooseDatabasePermedAccount(asset, command, context);
    if (options.inputUsername) {
      return { account: account.alias, inputUsername: options.inputUsername };
    }
    if (account.alias === "@INPUT") {
      const inputUsername = await chooseDatabaseInputUsername(asset, command, operations, context, false);
      return { account: account.alias, inputUsername };
    }
    return { account: account.alias, inputUsername: account.username };
  }

  const inputUsername =
    options.inputUsername ?? (await chooseDatabaseInputUsername(asset, command, operations, context));
  return { account: defaultDatabaseAccountName(asset.name), inputUsername };
}

async function chooseDatabasePermedAccount(
  asset: DatabaseAsset,
  command: Command,
  context: RunContext
): Promise<DatabasePermedAccount> {
  const accounts = await fetchDatabasePermedAccounts(asset, command, context);
  const account = accounts.find((item) => !item.alias.startsWith("@")) ?? accounts.find((item) => item.alias === "@INPUT") ?? accounts[0];
  if (!account) {
    throw new Error(`数据库实例没有可用授权账号: ${asset.name}`);
  }
  return account;
}

async function resolveDatabaseReusable(
  options: DatabaseTokenCommandOptions,
  context: InteractiveRunContext
): Promise<boolean> {
  if (options.reusable !== undefined) {
    return options.reusable;
  }
  if (options.all) {
    return DEFAULT_DATABASE_REUSABLE;
  }
  if (!context.canConfirmDatabaseReusable) {
    return DEFAULT_DATABASE_REUSABLE;
  }
  return context.confirm("是否开启复用", DEFAULT_DATABASE_REUSABLE);
}

function buildDatabaseConnectOptions(reusable: boolean): typeof DEFAULT_DATABASE_CONNECT_OPTIONS & { reusable: boolean } {
  return {
    ...DEFAULT_DATABASE_CONNECT_OPTIONS,
    reusable
  };
}

async function choosePaginatedDatabaseAssets(
  pattern: string | undefined,
  limit: number,
  command: Command,
  operations: ApiOperation[],
  context: InteractiveRunContext
): Promise<DatabaseAsset[]> {
  const initialSearch = searchTextFromGlob(pattern);
  return context.databaseAssetSelect(
    pattern ? "匹配到多个数据库实例" : "请选择数据库实例",
    {
      ...(initialSearch ? { initialSearch } : {}),
      pageSize: limit,
      fetchPage: (search, offset) => fetchDatabaseAssetsPage(search, limit, offset, command, context)
    }
  );
}

async function fetchAllDatabaseAssets(
  pattern: string | undefined,
  limit: number,
  command: Command,
  context: RunContext
): Promise<DatabaseAsset[]> {
  const search = searchTextFromGlob(pattern);
  const assets: DatabaseAsset[] = [];
  const seenAssetIds = new Set<string>();
  const seenFetchedAssetIds = new Set<string>();
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const page = await fetchDatabaseAssetsPage(search, limit, offset, command, context);
    hasMore = page.hasMore;
    offset = page.nextOffset;

    let newFetchedAssets = 0;
    for (const asset of page.items) {
      if (!seenFetchedAssetIds.has(asset.id)) {
        seenFetchedAssetIds.add(asset.id);
        newFetchedAssets += 1;
      }
      if (!seenAssetIds.has(asset.id)) {
        seenAssetIds.add(asset.id);
        assets.push(asset);
      }
    }

    if (newFetchedAssets === 0) {
      hasMore = false;
    }
  }

  return assets;
}

function databaseAssetSelectFromChoicePrompt(select: SelectPrompt): DatabaseAssetSelectPrompt {
  return async (message, input) => {
    const loadedAssets: DatabaseAsset[] = [];
    const seenAssetIds = new Set<string>();
    const seenFetchedAssetIds = new Set<string>();
    let count: number | undefined;
    let hasMore = true;
    let offset = 0;
    let loadedCount = 0;

    while (hasMore || loadedAssets.length > 0) {
      if (hasMore) {
        const page = await input.fetchPage(input.initialSearch, offset);
        count = page.count;
        hasMore = page.hasMore;
        offset = page.nextOffset;
        loadedCount = count === undefined ? offset : Math.min(offset, count);

        let newFetchedAssets = 0;
        for (const asset of page.items) {
          if (!seenFetchedAssetIds.has(asset.id)) {
            seenFetchedAssetIds.add(asset.id);
            newFetchedAssets += 1;
          }
        }
        if (newFetchedAssets === 0) {
          hasMore = false;
        }

        for (const asset of page.items) {
          if (!seenAssetIds.has(asset.id)) {
            seenAssetIds.add(asset.id);
            loadedAssets.push(asset);
          }
        }
      }

      if (loadedAssets.length === 0 && hasMore) {
        continue;
      }
      if (loadedAssets.length === 0) {
        throw new Error(input.initialSearch ? `未找到匹配的数据库实例: ${input.initialSearch}` : "未找到可选择的数据库实例");
      }
      if (input.initialSearch && loadedAssets.length === 1 && !hasMore) {
        return [loadedAssets[0]!];
      }

      const selected = await selectDatabaseAssetPage(loadedAssets, message, loadedCount, count, hasMore, select);
      if (isLoadMoreDatabaseAssetsChoice(selected)) {
        if (!hasMore) {
          continue;
        }
        continue;
      }
      return [selected];
    }

    throw new Error(input.initialSearch ? `未找到匹配的数据库实例: ${input.initialSearch}` : "未找到可选择的数据库实例");
  };
}

async function fetchDatabaseAssetsPage(
  search: string | undefined,
  limit: number,
  offset: number,
  command: Command,
  context: RunContext
): Promise<DatabaseAssetPage> {
  const payload = await callOperationJson({
    operation: PERMED_DATABASE_ASSETS_OPERATION,
    command,
    context,
    queryValues: {
      category: "database",
      ...(search ? { search } : {}),
      limit,
      ...(offset > 0 ? { offset } : {})
    }
  });
  return normalizeDatabaseAssetsPage(payload, limit, offset);
}

async function fetchDatabasePermedAccounts(
  asset: DatabaseAsset,
  command: Command,
  context: RunContext
): Promise<DatabasePermedAccount[]> {
  const payload = await callOperationJson({
    operation: PERMED_DATABASE_ASSET_DETAIL_OPERATION,
    command,
    context,
    pathValues: { id: asset.id }
  });
  return normalizeDatabasePermedAccounts(payload);
}

async function selectDatabaseAssetPage(
  assets: DatabaseAsset[],
  message: string,
  loadedCount: number,
  count: number | undefined,
  hasMore: boolean,
  select: SelectPrompt
): Promise<DatabaseAsset | LoadMoreDatabaseAssetsChoice> {
  const loadMoreChoice: LoadMoreDatabaseAssetsChoice = { type: "load-more" };
  const choices: Array<SelectChoice<DatabaseAsset | LoadMoreDatabaseAssetsChoice>> = [
    ...assets.map((asset) => ({
      label: formatDatabaseAssetOption(asset),
      value: asset
    })),
    ...(hasMore
      ? [
          {
            label:
              count === undefined
                ? `加载更多...（已加载 ${loadedCount}）`
                : `加载更多...（已加载 ${loadedCount}/${count}）`,
            value: loadMoreChoice
          }
        ]
      : [])
  ];

  return select(message, choices);
}

async function chooseDatabaseInputUsername(
  asset: DatabaseAsset,
  command: Command,
  operations: ApiOperation[],
  context: InteractiveRunContext,
  allowInteractiveSelection = true
): Promise<string> {
  const payload = await callOperationJson({
    operation: findOperation("accounts_accounts_username_suggestions", operations),
    command,
    context,
    body: {
      username: "",
      assets: [asset.id]
    }
  });
  const accounts = extractAccountNames(payload);
  if (accounts.length === 0) {
    throw new Error(`数据库实例没有可用数据库用户名: ${asset.name}`);
  }
  if (accounts.length === 1 || !allowInteractiveSelection) {
    return accounts[0]!;
  }

  return context.select(
    "请选择数据库用户名",
    accounts.map((account) => ({
      label: account,
      value: account
    }))
  );
}

async function callOperationJson(input: {
  operation: ApiOperation;
  command: Command;
  context: RunContext;
  pathValues?: Record<string, string | number | boolean | undefined>;
  queryValues?: Record<string, QueryValue>;
  body?: unknown;
}): Promise<unknown> {
  const globalOptions = resolveGlobalOptions(input.command, input.context);
  const host = resolveRequiredHost(globalOptions.host);
  const plan = await createRequestPlan({
    operation: input.operation,
    baseUrl: resolveBaseUrl(host),
    pathValues: input.pathValues ?? {},
    queryValues: input.queryValues ?? {},
    basePath: input.operation.basePath,
    ...(input.body !== undefined ? { bodyInput: JSON.stringify(input.body) } : {})
  });

  applyAuthHeaders(plan, input.operation, globalOptions, input.context.now());
  const response = await input.context.fetcher(plan.url, {
    method: plan.method,
    headers: plan.headers,
    ...(plan.body !== undefined ? { body: plan.body } : {})
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`请求失败: ${formatFailureMessage(text, response)}`);
  }
  if (text.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("请求失败: 服务端返回的 JSON 无法解析");
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

function parsePositiveInteger(value: string, optionName: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`Expected ${optionName} to be a positive integer, got: ${value}`);
  }
  return Number(value);
}

function normalizeDatabaseAssets(payload: unknown): DatabaseAsset[] {
  return extractResultItems(payload).flatMap((item) => {
    if (!isPlainObject(item)) {
      return [];
    }

    const id = stringField(item, "id");
    const name = stringField(item, "name");
    if (!id || !name) {
      return [];
    }
    const address = stringField(item, "address");

    return [
      {
        id,
        name,
        ...(address ? { address } : {}),
        ...(item.protocols !== undefined ? { protocols: item.protocols } : {}),
        ...(item.platform !== undefined ? { platform: item.platform } : {})
      }
    ];
  });
}

function normalizeDatabaseAssetsPage(payload: unknown, limit: number, offset: number): DatabaseAssetPage {
  const rawItems = extractResultItems(payload);
  const items = normalizeDatabaseAssets(rawItems);
  const reportedCount = isPlainObject(payload) && typeof payload.count === "number" ? payload.count : undefined;
  const hasNextLink = isPlainObject(payload) && typeof payload.next === "string" && payload.next.length > 0;
  const loadedThroughPage = offset + rawItems.length;
  const count =
    reportedCount !== undefined && reportedCount > loadedThroughPage ? reportedCount : undefined;
  const nextOffset = offset + (rawItems.length > 0 ? rawItems.length : limit);
  const reachedRequestedLimit = rawItems.length >= limit;

  return {
    items,
    ...(count !== undefined ? { count } : {}),
    nextOffset,
    hasMore:
      rawItems.length > 0 &&
      (hasNextLink || nextOffset < (count ?? 0) || reachedRequestedLimit)
  };
}

function normalizeDatabasePermedAccounts(payload: unknown): DatabasePermedAccount[] {
  const items =
    isPlainObject(payload) && Array.isArray(payload.permed_accounts)
      ? payload.permed_accounts
      : extractResultItems(payload);
  return items.flatMap((item): DatabasePermedAccount[] => {
    if (!isPlainObject(item)) {
      return [];
    }
    const alias = stringField(item, "alias") ?? stringField(item, "id") ?? stringField(item, "username");
    if (!alias) {
      return [];
    }
    const username = stringField(item, "username") ?? stringField(item, "name") ?? alias;
    return [{ alias, username }];
  });
}

function extractResultItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (isPlainObject(payload) && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
}

function matchDatabaseAssets(assets: DatabaseAsset[], pattern: string | undefined): DatabaseAsset[] {
  const trimmedPattern = pattern?.trim();
  if (!trimmedPattern) {
    return assets;
  }

  if (!hasGlobMeta(trimmedPattern)) {
    const needle = trimmedPattern.toLowerCase();
    return assets.filter((asset) => asset.name.toLowerCase().includes(needle));
  }

  const matcher = globPatternToRegExp(trimmedPattern);
  return assets.filter((asset) => matcher.test(asset.name));
}

function isLoadMoreDatabaseAssetsChoice(value: DatabaseAsset | LoadMoreDatabaseAssetsChoice): value is LoadMoreDatabaseAssetsChoice {
  return isPlainObject(value) && value.type === "load-more";
}

function hasGlobMeta(value: string): boolean {
  return /[*?]/.test(value);
}

function globPatternToRegExp(pattern: string): RegExp {
  let source = "^";
  for (const char of pattern) {
    if (char === "*") {
      source += ".*";
    } else if (char === "?") {
      source += ".";
    } else {
      source += escapeRegExp(char);
    }
  }
  source += "$";
  return new RegExp(source, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

function searchTextFromGlob(pattern: string | undefined): string | undefined {
  const trimmed = pattern?.trim();
  if (!trimmed) {
    return undefined;
  }

  const segments = trimmed
    .split(/[*?]+/g)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .sort((left, right) => right.length - left.length);
  return segments[0] ?? trimmed;
}

function defaultDatabaseProtocol(asset: DatabaseAsset): string {
  if (Array.isArray(asset.protocols)) {
    const protocol = asset.protocols.find((item) => isPlainObject(item) && typeof item.name === "string");
    if (isPlainObject(protocol) && typeof protocol.name === "string") {
      return protocol.name;
    }
  }
  return "mysql";
}

function defaultDatabaseAccountName(assetName: string): string {
  const suffixMatch = assetName.match(/^(.*?)(\(([^)]*)\))$/);
  if (suffixMatch) {
    const baseName = suffixMatch[1]!;
    const suffix = suffixMatch[2]!;
    const suffixText = suffixMatch[3]!;
    return suffixText ? `${baseName}-账号${suffix}` : `${baseName}-账号`;
  }
  return `${assetName}-账号`;
}

function extractAccountNames(payload: unknown): string[] {
  const names = extractResultItems(payload)
    .map(accountName)
    .filter((name): name is string => Boolean(name));
  return [...new Set(names)];
}

function accountName(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (!isPlainObject(value)) {
    return undefined;
  }

  return stringField(value, "name") ?? stringField(value, "username") ?? stringField(value, "account") ?? stringField(value, "id");
}

function normalizeConnectionToken(payload: unknown): { id: string; expiresAt?: string; password?: string } {
  if (!isPlainObject(payload)) {
    throw new Error("创建连接 token 的响应不是 JSON 对象");
  }

  const id = stringField(payload, "id");
  if (!id) {
    throw new Error("创建连接 token 的响应缺少 id");
  }
  const expiresAt = stringField(payload, "date_expired");
  const password =
    stringField(payload, "value") ??
    stringField(payload, "secret") ??
    stringField(payload, "input_secret") ??
    stringField(payload, "password");

  return {
    id,
    ...(expiresAt ? { expiresAt } : {}),
    ...(password ? { password } : {})
  };
}

function extractClientUrl(payload: unknown): string {
  if (typeof payload === "string" && payload.length > 0) {
    return payload;
  }
  if (isPlainObject(payload)) {
    const url = stringField(payload, "url");
    if (url) {
      return url;
    }
  }
  throw new Error("连接地址响应缺少 url");
}

function extractDatabaseGuideConnection(
  jmsUrl: string,
  token: { id: string; password?: string }
): DatabaseGuideConnection | undefined {
  const payload = decodeJmsClientUrl(jmsUrl);
  if (!isPlainObject(payload)) {
    return undefined;
  }

  const endpoint = plainObjectField(payload, "endpoint");
  const tokenPayload = plainObjectField(payload, "token");
  const host = endpoint ? stringField(endpoint, "host") : undefined;
  const port = endpoint ? numberField(endpoint, "port") : undefined;
  const username = (tokenPayload ? stringField(tokenPayload, "id") : undefined) ?? stringField(payload, "id") ?? token.id;
  const password =
    (tokenPayload ? stringField(tokenPayload, "value") : undefined) ?? stringField(payload, "value") ?? token.password;
  const database =
    stringField(payload, "database") ??
    stringField(payload, "db") ??
    stringField(payload, "db_name") ??
    (endpoint ? stringField(endpoint, "database") ?? stringField(endpoint, "db") ?? stringField(endpoint, "db_name") : undefined);

  if (!host || port === undefined || !username || !password) {
    return undefined;
  }

  return {
    host,
    port,
    username,
    password,
    ...(database ? { database } : {}),
    command: formatMysqlGuideCommand(host, port, username, password)
  };
}

function decodeJmsClientUrl(jmsUrl: string): unknown {
  if (!jmsUrl.startsWith("jms://")) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.from(jmsUrl.slice("jms://".length), "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
}

function plainObjectField(payload: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = payload[key];
  return isPlainObject(value) ? value : undefined;
}

function stringField(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberField(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

function formatMysqlGuideCommand(host: string, port: number, username: string, password: string): string {
  return [
    `MYSQL_PWD=${shellQuote(password)}`,
    "mysql",
    "-h",
    shellQuote(host),
    "-P",
    String(port),
    "-u",
    shellQuote(username)
  ].join(" ");
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function formatDatabaseAssetOption(asset: DatabaseAsset): string {
  return asset.address ? `${asset.name} (${asset.address})` : asset.name;
}

const DATABASE_TOKEN_CACHE_NOTE =
  "数据库类型 token 会缓存 5 分钟，也就是说 token 使用后，不会立刻失效，而是客户端断开 5 分钟后，这个 token 才会完全失效";

function formatDatabaseTokenOutputs(
  outputs: DatabaseTokenOutput[],
  options: DatabaseTokenCommandOptions,
  terminalColumns: number
): string {
  if (options.dsn) {
    return formatDatabaseTokenDsns(outputs);
  }
  if (options.json) {
    return `${JSON.stringify(outputs, null, 2)}\n`;
  }
  return formatDatabaseTokenTables(outputs, options.jmsUrl === true, terminalColumns);
}

function formatDatabaseTokenDsns(outputs: DatabaseTokenOutput[]): string {
  return `${outputs.map(requireDatabaseDsn).join("\n")}\n`;
}

function requireDatabaseDsn(output: DatabaseTokenOutput): string {
  if (!output.dsn) {
    throw new Error(`无法生成 DSN: ${output.asset.name} 缺少 DB 向导连接信息`);
  }
  return output.dsn;
}

function formatDatabaseDsn(protocol: string, guide: DatabaseGuideConnection): string {
  const host = guide.host.includes(":") && !guide.host.startsWith("[") ? `[${guide.host}]` : guide.host;
  return `${protocol}://${encodeURIComponent(guide.username)}:${encodeURIComponent(guide.password)}@${host}:${guide.port}/`;
}

function formatDatabaseTokenTables(
  outputs: DatabaseTokenOutput[],
  includeJmsUrl: boolean,
  terminalColumns: number
): string {
  const separator = formatDatabaseTokenOutputSeparator(terminalColumns);
  return `${outputs.map((output) => formatDatabaseTokenTable(output, includeJmsUrl, terminalColumns)).join(`\n\n${separator}\n\n`)}\n`;
}

function formatDatabaseTokenTable(output: DatabaseTokenOutput, includeJmsUrl: boolean, terminalColumns: number): string {
  const rows: Array<[string, string]> = [
    ["名称", formatDatabaseDisplayName(output.asset)],
    ["主机", formatTableValue(output.dbGuide?.host)],
    ["端口", formatTableValue(output.dbGuide?.port)],
    ["用户名", formatTableValue(output.dbGuide?.username)],
    ["密码", formatTableValue(output.dbGuide?.password ?? output.password)],
    ["数据库", formatTableValue(output.dbGuide?.database)],
    ["协议", output.protocol],
    ["过期时间", formatTableValue(output.expiresAt)],
    ["开启复用", output.reusable ? "是" : "否"],
    ["说明", DATABASE_TOKEN_CACHE_NOTE],
    ["连接命令行", output.dbGuide?.command ?? "无法解析连接命令"],
    ...(includeJmsUrl ? [["JMS 连接地址", formatTableValue(output.jmsUrl)] as [string, string]] : [])
  ];
  return formatKeyValueTable(rows, terminalColumns);
}

function formatDatabaseDisplayName(asset: DatabaseTokenOutput["asset"]): string {
  return asset.address ? `${asset.name} (${asset.address})` : asset.name;
}

function formatTableValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).replace(/\r?\n/g, " ");
}

function formatKeyValueTable(rows: Array<[string, string]>, terminalColumns: number): string {
  const labelWidth = Math.max(...rows.map(([label]) => displayWidth(label)));
  const valueWidth = databaseTableValueWidth(rows, labelWidth, terminalColumns);
  const top = `┌${"─".repeat(labelWidth + 2)}┬${"─".repeat(valueWidth + 2)}┐`;
  const middle = `├${"─".repeat(labelWidth + 2)}┼${"─".repeat(valueWidth + 2)}┤`;
  const bottom = `└${"─".repeat(labelWidth + 2)}┴${"─".repeat(valueWidth + 2)}┘`;
  const lines = [top];
  for (const [index, [label, value]] of rows.entries()) {
    const wrappedValue = wrapDisplayValue(value, valueWidth);
    for (const [lineIndex, valueLine] of wrappedValue.entries()) {
      const labelLine = lineIndex === 0 ? label : "";
      lines.push(`│ ${padDisplay(labelLine, labelWidth)} │ ${padDisplay(valueLine, valueWidth)} │`);
    }
    lines.push(index === rows.length - 1 ? bottom : middle);
  }
  return lines.join("\n");
}

function databaseTableValueWidth(rows: Array<[string, string]>, labelWidth: number, terminalColumns: number): number {
  const naturalValueWidth = Math.max(...rows.map(([, value]) => displayWidth(value)), 1);
  const boundedTableWidth = Math.max(terminalColumns, labelWidth + MIN_DATABASE_TABLE_VALUE_WIDTH + 7);
  return Math.max(1, Math.min(naturalValueWidth, boundedTableWidth - labelWidth - 7));
}

function wrapDisplayValue(value: string, width: number): string[] {
  if (value.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let line = "";
  let lineWidth = 0;
  for (const char of value) {
    const charWidth = displayWidth(char);
    if (line.length > 0 && lineWidth + charWidth > width) {
      lines.push(line.trimEnd());
      line = "";
      lineWidth = 0;
      if (char === " ") {
        continue;
      }
    }
    line += char;
    lineWidth += charWidth;
  }
  lines.push(line.trimEnd());
  return lines;
}

function formatDatabaseTokenOutputSeparator(terminalColumns: number): string {
  return "─".repeat(Math.max(10, terminalColumns));
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

async function selectFromTerminal<T>(message: string, choices: Array<SelectChoice<T>>): Promise<T> {
  if (choices.length === 0) {
    throw new Error("Cannot select from an empty list.");
  }
  if (choices.length === 1) {
    return choices[0]!.value;
  }

  const options = choices.map((choice) => ({
    value: choice.value,
    label: choice.label
  })) as Parameters<typeof clackSelect<T>>[0]["options"];
  const selected = await clackSelect<T>({
    message,
    options,
    input: stdin,
    output: processStderr
  });

  if (isCancel(selected)) {
    clackCancel("已取消选择", { output: processStderr });
    throw new Error("已取消选择");
  }

  clearSubmittedPromptDisplay(processStderr, message, choiceLabelForValue(choices, selected));
  return selected;
}

async function selectDatabaseAssetFromTerminal(
  message: string,
  input: DatabaseAssetSelectionInput
): Promise<DatabaseAsset[]> {
  if (!stdin.isTTY) {
    throw new Error("Cannot select a database asset because stdin is not an interactive terminal.");
  }

  let query = input.initialSearch;
  let pageIndex = 0;
  const offsets = [0];
  const selectedAssets = new Map<string, DatabaseAsset>();

  while (true) {
    const offset = offsets[pageIndex] ?? pageIndex * input.pageSize;
    const page = await input.fetchPage(query, offset);
    offsets[pageIndex] = offset;
    offsets[pageIndex + 1] = page.nextOffset;

    if (page.items.length === 0) {
      query = await promptDatabaseAssetSearch(query, "没有匹配的数据库实例，请输入新的搜索关键词");
      pageIndex = 0;
      offsets.length = 1;
      offsets[0] = 0;
      continue;
    }

    const pageSelection = await selectDatabaseAssetsWithClack(
      message,
      query,
      pageIndex,
      page,
      input.pageSize,
      selectedAssets
    );
    const selectedPageAssets = pageSelection.filter(isDatabaseAsset);
    const pageSelectionIds = new Set(selectedPageAssets.map((asset) => asset.id));
    for (const asset of page.items) {
      if (pageSelectionIds.has(asset.id)) {
        selectedAssets.set(asset.id, asset);
      } else {
        selectedAssets.delete(asset.id);
      }
    }

    const action = pageSelection.find(isDatabaseAssetNavigationChoice);
    if (action?.type === "previous") {
      pageIndex = Math.max(0, pageIndex - 1);
    } else if (action?.type === "next") {
      pageIndex += 1;
    } else if (action?.type === "search") {
      query = await promptDatabaseAssetSearch(query, "搜索数据库实例");
      pageIndex = 0;
      offsets.length = 1;
      offsets[0] = 0;
      continue;
    } else {
      if (selectedAssets.size === 0) {
        throw new Error("至少选择一个数据库实例");
      }
      return [...selectedAssets.values()];
    }
  }
}

interface DatabaseAssetNavigationChoice {
  type: "previous" | "next" | "search";
}

async function selectDatabaseAssetsWithClack(
  message: string,
  query: string | undefined,
  pageIndex: number,
  page: DatabaseAssetPage,
  pageSize: number,
  selectedAssets: ReadonlyMap<string, DatabaseAsset>
): Promise<Array<DatabaseAsset | DatabaseAssetNavigationChoice>> {
  const loadedCount = page.nextOffset;
  const totalPages = page.count === undefined ? undefined : Math.max(1, Math.ceil(page.count / pageSize));
  const pageLabel = totalPages === undefined ? `${pageIndex + 1}` : `${pageIndex + 1}/${totalPages}`;
  const countLabel = page.count === undefined ? `${loadedCount}` : `${Math.min(loadedCount, page.count)}/${page.count}`;
  const selectedCountLabel = selectedAssets.size === 0 ? "未选择" : `已选择 ${selectedAssets.size}`;
  const promptMessage = `${message}  搜索: ${query || "(空)"}  页: ${pageLabel}  已加载: ${countLabel}  ${selectedCountLabel}`;
  const initialValues = page.items.filter((asset) => selectedAssets.has(asset.id));
  const navigationChoices: Array<SelectChoice<DatabaseAssetNavigationChoice>> = [
    ...(pageIndex > 0
      ? [
          {
            label: "上一页",
            value: { type: "previous" } as DatabaseAssetNavigationChoice
          }
        ]
      : []),
    ...(page.hasMore
      ? [
          {
            label: "下一页",
            value: { type: "next" } as DatabaseAssetNavigationChoice
          }
        ]
      : []),
    {
      label: "重新搜索",
      value: { type: "search" }
    }
  ];
  const choices: Array<SelectChoice<DatabaseAsset | DatabaseAssetNavigationChoice>> = [
    ...page.items.map((asset) => ({
      label: formatDatabaseAssetOption(asset),
      value: asset
    })),
    ...navigationChoices
  ];
  const selected = await clackMultiselect<DatabaseAsset | DatabaseAssetNavigationChoice>({
    message: promptMessage,
    options: choices as Parameters<typeof clackMultiselect<DatabaseAsset | DatabaseAssetNavigationChoice>>[0]["options"],
    initialValues,
    input: stdin,
    output: processStderr,
    maxItems: 20,
    required: false
  });

  if (isCancel(selected)) {
    clackCancel("已取消选择", { output: processStderr });
    throw new Error("已取消选择");
  }

  clearSubmittedPromptDisplay(
    processStderr,
    promptMessage,
    selected.map((value) => choiceLabelForValue(choices, value)).join(", ") || "none"
  );
  return selected;
}

async function promptDatabaseAssetSearch(currentSearch: string | undefined, message: string): Promise<string | undefined> {
  const nextSearch = await clackText({
    message,
    initialValue: currentSearch ?? "",
    placeholder: "输入数据库名称关键词",
    input: stdin,
    output: processStderr
  });

  if (isCancel(nextSearch)) {
    clackCancel("已取消选择", { output: processStderr });
    throw new Error("已取消选择");
  }

  clearSubmittedPromptDisplay(processStderr, message, nextSearch.trim());
  return nextSearch.trim() || undefined;
}

function isDatabaseAssetNavigationChoice(value: unknown): value is DatabaseAssetNavigationChoice {
  return isPlainObject(value) && (
    value.type === "previous" ||
    value.type === "next" ||
    value.type === "search"
  );
}

function isDatabaseAsset(value: unknown): value is DatabaseAsset {
  return isPlainObject(value) && typeof value.id === "string" && typeof value.name === "string";
}

function choiceLabelForValue<T>(choices: Array<SelectChoice<T>>, value: T): string {
  return choices.find((choice) => Object.is(choice.value, value))?.label ?? "";
}

async function promptFromTerminal(message: string, options?: { secret?: boolean }): Promise<string> {
  if (!stdin.isTTY) {
    throw new Error("Cannot prompt because stdin is not an interactive terminal.");
  }

  const normalizedMessage = message.replace(/:\s*$/, "");
  const value = options?.secret
    ? await clackPassword({
        message: normalizedMessage,
        input: stdin,
        output: processStderr
      })
    : await clackText({
        message: normalizedMessage,
        input: stdin,
        output: processStderr
      });

  if (isCancel(value)) {
    clackCancel("已取消输入", { output: processStderr });
    throw new Error("已取消输入");
  }

  clearSubmittedPromptDisplay(processStderr, normalizedMessage, options?.secret ? "" : value);
  return value;
}

async function confirmFromTerminal(message: string, initialValue = true): Promise<boolean> {
  if (!stdin.isTTY) {
    throw new Error("Cannot confirm because stdin is not an interactive terminal.");
  }

  const value = await clackConfirm({
    message,
    active: "是",
    inactive: "否",
    initialValue,
    input: stdin,
    output: processStderr
  });

  if (isCancel(value)) {
    clackCancel("已取消选择", { output: processStderr });
    throw new Error("已取消选择");
  }

  clearSubmittedPromptDisplay(processStderr, message, value ? "是" : "否");
  return value;
}

function clearSubmittedPromptDisplay(
  output: typeof processStderr,
  message: string,
  submittedValue: string
): void {
  if (!output.isTTY) {
    return;
  }

  const frameLines =
    1 +
    wrappedPromptLineCount(message, output) +
    wrappedPromptLineCount(submittedValue || " ", output);
  clearTerminalLines(output, frameLines + 1);
}

function wrappedPromptLineCount(value: string, output: typeof processStderr): number {
  const columns = typeof output.columns === "number" ? output.columns : 80;
  const width = Math.max(1, columns - 4);
  return value.split(/\r?\n/).reduce((count, line) => {
    return count + Math.max(1, Math.ceil(displayWidth(line) / width));
  }, 0);
}

function clearTerminalLines(output: typeof processStderr, lineCount: number): void {
  if (lineCount <= 0) {
    return;
  }

  const clearLine = "\x1B[2K";
  const cursorUp = "\x1B[1A";
  const cursorLeft = "\x1B[G";
  let sequence = "";
  for (let index = 0; index < lineCount; index += 1) {
    sequence += clearLine;
    if (index < lineCount - 1) {
      sequence += cursorUp;
    }
  }
  output.write(`${sequence}${cursorLeft}`);
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
