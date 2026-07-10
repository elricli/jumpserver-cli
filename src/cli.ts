#!/usr/bin/env node
import { Command, Option } from "commander";
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
import { spawn } from "node:child_process";
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
  resolveAuthenticationMode,
  type CredentialSource,
  type AuthenticationMode
} from "./authentication-mode.js";
import {
  accessKeyConfig,
  loadConfig,
  resolveConfigPath,
  saveConfig,
  tokenConfig,
  type CliConfig
} from "./config.js";
import { type ApiOperation, findOperation, loadOperations } from "./openapi.js";
import {
  operationCommandPath,
  operationQueryOptionBindings
} from "./operation-command.js";
import {
  createRequestPlan,
  mergeHeadersCaseInsensitive,
  type QueryValue,
  type RequestPlan
} from "./request.js";
import {
  selectPermittedAssets,
  type PermittedAsset,
  type PermittedAssetPage,
  type PermittedAssetPageSelection,
  type PermittedAssetSelectionInput,
  type PermittedAssetSelectionView
} from "./permitted-asset-selection.js";

export type {
  PermittedAsset,
  PermittedAssetPage,
  PermittedAssetSelectionInput
} from "./permitted-asset-selection.js";

type Fetcher = typeof fetch;
export type Prompt = (message: string, options?: { secret?: boolean }) => Promise<string>;
export type ConfirmPrompt = (message: string, initialValue?: boolean) => Promise<boolean>;
export type UpgradeRunner = (command: string, args: string[]) => Promise<number>;
export interface SelectChoice<T> {
  label: string;
  value: T;
}
export type SelectPrompt = <T>(message: string, choices: Array<SelectChoice<T>>) => Promise<T>;
export type PermittedAssetSelectPrompt<TPermittedAsset extends PermittedAsset = PermittedAsset> =
  (message: string, input: PermittedAssetSelectionInput<TPermittedAsset>) => Promise<TPermittedAsset[]>;
export type DatabaseAsset = PermittedAsset;
export type DatabaseAssetPage = PermittedAssetPage<DatabaseAsset>;
export type DatabaseAssetSelectionInput = PermittedAssetSelectionInput<DatabaseAsset>;
export type DatabaseAssetSelectPrompt = PermittedAssetSelectPrompt<DatabaseAsset>;
export type HostAsset = PermittedAsset;
export type HostAssetPage = PermittedAssetPage<HostAsset>;
export type HostAssetSelectionInput = PermittedAssetSelectionInput<HostAsset>;
export type HostAssetSelectPrompt = PermittedAssetSelectPrompt<HostAsset>;

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
  hostAssetSelect?: HostAssetSelectPrompt;
  upgradeRunner?: UpgradeRunner;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
}

interface CommandGlobalOptions extends CredentialSource {
  host?: string;
  org?: string;
}

interface GlobalOptions {
  host?: string;
  org?: string;
  authenticationMode: AuthenticationMode;
}

type ConnectionOptions = Omit<GlobalOptions, "authenticationMode">;

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
  [key: string]: unknown;
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

interface HostTokenCommandOptions {
  account?: string;
  accountUsername?: string;
  loginUsername?: string;
  connectMethod?: string;
  protocol?: string;
  all?: boolean;
  limit?: string;
  jmsUrl?: boolean;
  sshCommand?: boolean;
  json?: boolean;
  reusable?: boolean;
}

type PermittedAssetCategory = "database" | "host";

interface PermittedAssetSelectionPolicy {
  category: PermittedAssetCategory;
  name: string;
  terminalName: string;
  searchPlaceholder: string;
}

interface ConnectionTokenCommandOptions {
  all?: boolean;
  limit?: string;
  reusable?: boolean;
}

interface ConnectionTokenWorkflow<TOptions extends ConnectionTokenCommandOptions, TPrepared, TOutput> {
  pattern: string | undefined;
  options: TOptions;
  command: Command;
  context: InteractiveRunContext;
  policy: PermittedAssetSelectionPolicy;
  selectAssets: PermittedAssetSelectPrompt;
  prepare: () => Promise<TPrepared>;
  createOutput: (asset: PermittedAsset, reusable: boolean, prepared: TPrepared) => Promise<TOutput>;
  formatOutputs: (outputs: TOutput[]) => string;
}

const AUTH_COMPLETE_MESSAGE = "认证完成";
const DEFAULT_ASSET_TOKEN_LIMIT = 20;
const DEFAULT_DATABASE_CONNECT_METHOD = "db_guide";
const DEFAULT_HOST_CONNECT_METHOD = "ssh_guide";
const DEFAULT_REUSABLE = false;
const DEFAULT_SSH_PORT = 2222;
const DEFAULT_TERMINAL_COLUMNS = 120;
const MIN_DATABASE_TABLE_VALUE_WIDTH = 12;
const ASSET_SEARCH_SHORTCUT = Symbol("asset-search-shortcut");
const DEFAULT_DATABASE_CONNECT_OPTIONS = {
  charset: "default",
  disableautohash: false,
  resolution: "auto",
  backspaceAsCtrlH: false,
  appletConnectMethod: "web"
};
const PERMITTED_ASSETS_OPERATION: ApiOperation = {
  method: "GET",
  path: "/perms/users/self/assets/",
  basePath: "/api/v1",
  operationId: "perms_users_self_assets_list",
  tag: "perms_users",
  summary: "List current user's permitted assets",
  queryParameters: [],
  pathParameters: []
};
const PERMITTED_ASSET_DETAIL_OPERATION: ApiOperation = {
  method: "GET",
  path: "/perms/users/self/assets/{id}/",
  basePath: "/api/v1",
  operationId: "perms_users_self_asset_read",
  tag: "perms_users",
  summary: "Read current user's permitted asset detail",
  queryParameters: [],
  pathParameters: [{ name: "id", required: true, schema: { type: "string" } }]
};
const DATABASE_PERMITTED_ASSET_POLICY: PermittedAssetSelectionPolicy = {
  category: "database",
  name: "数据库实例",
  terminalName: "database asset",
  searchPlaceholder: "输入数据库名称关键词"
};
const HOST_PERMITTED_ASSET_POLICY: PermittedAssetSelectionPolicy = {
  category: "host",
  name: "主机",
  terminalName: "host asset",
  searchPlaceholder: "输入主机名称关键词"
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
const DEPRECATED_QUERY_OPTION_WARNING =
  "警告: --query name=value 已弃用，将在下个版本删除；请改用具体子命令的直接 query 选项，例如 --search value。\n";

function resolveBaseUrl(host: string): string {
  return host.includes("://") ? host : `https://${host}`;
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
    (stdin.isTTY && !options.select
      ? (message, input) => selectPermittedAssetFromTerminal(message, input, DATABASE_PERMITTED_ASSET_POLICY)
      : permittedAssetSelectFromChoicePrompt(select, DATABASE_PERMITTED_ASSET_POLICY));
  const hostAssetSelect =
    options.hostAssetSelect ??
    (stdin.isTTY && !options.select
      ? (message, input) => selectPermittedAssetFromTerminal(message, input, HOST_PERMITTED_ASSET_POLICY)
      : permittedAssetSelectFromChoicePrompt(select, HOST_PERMITTED_ASSET_POLICY));
  const upgradeRunner = options.upgradeRunner ?? runUpgradeProcess;
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
    hostAssetSelect,
    canConfirmReusable: options.confirm !== undefined || stdin.isTTY,
    configPath,
    config,
    env,
    upgradeRunner
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

  program
    .command("version")
    .description("Print the CLI version")
    .action(() => {
      stdout(`${readPackageVersion()}\n`);
    });

  program
    .command("upgrade")
    .description("Upgrade jumpserver-cli to the latest npm release")
    .action(async () => {
      await runUpgradeCommand(context);
    });

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
  registerHostTokenCommand(program, operations, context);
  registerOperationCommands(program, operations, context);

  return program;
}

async function runUpgradeCommand(context: RunContext): Promise<void> {
  const command = npmCommand();
  const args = ["install", "-g", "jumpserver-cli@latest"];
  context.stdout("正在升级 jumpserver-cli 到最新版本...\n");

  let exitCode: number;
  try {
    exitCode = await context.upgradeRunner(command, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.stderr(`升级失败: ${message}\n`);
    process.exitCode = 1;
    return;
  }

  if (exitCode !== 0) {
    context.stderr(`升级失败: npm install exited with code ${exitCode}\n`);
    process.exitCode = exitCode;
    return;
  }

  context.stdout("升级完成\n");
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runUpgradeProcess(command: string, args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

function registerOperationCommands(parent: Command, operations: ApiOperation[], context: RunContext): void {
  for (const operation of operations) {
    const path = operationCommandPath(operation);
    const operationCommand = getOrCreateCommandPath(parent, path);
    operationCommand.description(describeOperationCommand(operation));
    operationCommand.action(async (commandOptions: RequestCommandOptions, command: Command) => {
      await runOperation(operation, commandOptions, command, context);
    });
    addRequestOptions(operationCommand, operation);
    addOperationQueryOptions(operationCommand, operation);
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
    .option("--limit <number>", "Database asset page size", String(DEFAULT_ASSET_TOKEN_LIMIT))
    .option("--reusable", "Enable reusable database token")
    .option("--no-reusable", "Disable reusable database token")
    .option("--jms-url", "Print the raw JumpServer jms:// client URL")
    .option("--dsn", "Print only database DSN lines")
    .option("--json", "Print JSON")
    .action(async (pattern: string | undefined, options: DatabaseTokenCommandOptions, command: Command) => {
      await runDatabaseTokenCommand(pattern, options, command, operations, context);
    });
}

function registerHostTokenCommand(parent: Command, operations: ApiOperation[], context: InteractiveRunContext): void {
  const hostsCommand = getOrCreateCommandPath(parent, ["assets", "hosts"]);
  hostsCommand
    .command("token")
    .description("Create a host SSH connection token")
    .argument("[pattern]", "Host asset name glob or substring")
    .option("--account <name>", "JumpServer asset account alias/name, defaults to a permitted account")
    .option("--account-username <username>", "Permitted asset account username for direct SSH command, defaults to the account username")
    .option("--login-username <username>", "JumpServer login username for direct SSH command, defaults to the current profile")
    .option("--connect-method <method>", "JumpServer connection method", DEFAULT_HOST_CONNECT_METHOD)
    .option("--protocol <protocol>", "Host protocol, defaults to ssh")
    .option("--all", "Create tokens for all matching permitted host assets without prompting")
    .option("--limit <number>", "Host asset page size", String(DEFAULT_ASSET_TOKEN_LIMIT))
    .option("--reusable", "Enable reusable SSH token")
    .option("--no-reusable", "Disable reusable SSH token")
    .option("--jms-url", "Print the raw JumpServer jms:// client URL")
    .option("--ssh-command", "Print only SSH command lines")
    .option("--json", "Print JSON")
    .action(async (pattern: string | undefined, options: HostTokenCommandOptions, command: Command) => {
      await runHostTokenCommand(pattern, options, command, operations, context);
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
  const originalTagPath = operation.tag.split("_").filter((part) => part.length > 0);
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

  const queryOptions = operationQueryOptionBindings(operation);
  const queryOption = queryOptions.find((option) => option.parameterName === "search") ?? queryOptions[0];
  if (queryOption) {
    parts.push(`--${queryOption.flagName} value`);
  } else if (operation.queryParameters.some((parameter) => parameter.name === "limit")) {
    parts.push("--limit 20");
  } else if (operation.queryParameters.some((parameter) => parameter.name === "offset")) {
    parts.push("--offset 0");
  } else {
    const query = operation.queryParameters[0];
    if (query) {
      parts.push(`--query ${query.name}=value`);
    }
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
  upgradeRunner: UpgradeRunner;
}

interface InteractiveRunContext extends RunContext {
  prompt: Prompt;
  confirm: ConfirmPrompt;
  select: SelectPrompt;
  databaseAssetSelect: DatabaseAssetSelectPrompt;
  hostAssetSelect: HostAssetSelectPrompt;
  canConfirmReusable: boolean;
}

type LoginRunContext = InteractiveRunContext;

interface PermittedAccount {
  alias: string;
  username: string;
}

interface DatabaseTokenIdentity {
  account: string;
  inputUsername: string;
}

interface HostTokenIdentity {
  account: string;
  accountUsername: string;
}

interface LoadMorePermittedAssetsChoice {
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

interface HostSshConnection {
  host: string;
  port: number;
  username: string;
  password?: string;
  command: string;
  accountCommand?: string;
}

interface ConnectionTokenCredential {
  id: string;
  expiresAt?: string;
  password?: string;
}

interface ConnectionTokenOutputBase {
  asset: {
    id: string;
    name: string;
    address?: string;
  };
  password?: string;
  protocol: string;
  connectMethod: string;
  reusable: boolean;
  tokenId: string;
  expiresAt?: string;
}

interface DatabaseTokenOutput extends ConnectionTokenOutputBase {
  account: string;
  inputUsername: string;
  dbGuide?: DatabaseGuideConnection;
  dsn?: string;
  jmsUrl?: string;
}

interface HostTokenOutput extends ConnectionTokenOutputBase {
  account: string;
  accountUsername: string;
  loginUsername?: string;
  sshGuide?: HostSshConnection;
  jmsUrl?: string;
}

async function runLogin(
  operation: ApiOperation,
  commandOptions: LoginCommandOptions,
  command: Command,
  context: LoginRunContext
): Promise<void> {
  try {
    const globalOptions = resolveConnectionOptions(command, context);
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
    warnDeprecatedQueryOption(commandOptions, context);
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
  return runConnectionTokenWorkflow({
    pattern,
    options,
    command,
    context,
    policy: DATABASE_PERMITTED_ASSET_POLICY,
    selectAssets: context.databaseAssetSelect,
    prepare: async () => undefined,
    createOutput: (asset, reusable) =>
      createDatabaseTokenOutput(asset, options, reusable, command, operations, context),
    formatOutputs: (outputs) => formatDatabaseTokenOutputs(outputs, options, context.terminalColumns)
  });
}

async function runHostTokenCommand(
  pattern: string | undefined,
  options: HostTokenCommandOptions,
  command: Command,
  operations: ApiOperation[],
  context: InteractiveRunContext
): Promise<void> {
  return runConnectionTokenWorkflow({
    pattern,
    options,
    command,
    context,
    policy: HOST_PERMITTED_ASSET_POLICY,
    selectAssets: context.hostAssetSelect,
    prepare: () =>
      options.sshCommand
        ? Promise.resolve(undefined)
        : resolveHostLoginUsername(options, command, operations, context),
    createOutput: (asset, reusable, loginUsername) =>
      createHostTokenOutput(asset, options, reusable, loginUsername, command, operations, context),
    formatOutputs: (outputs) => formatHostTokenOutputs(outputs, options, context.terminalColumns)
  });
}

async function runConnectionTokenWorkflow<
  TOptions extends ConnectionTokenCommandOptions,
  TPrepared,
  TOutput
>(workflow: ConnectionTokenWorkflow<TOptions, TPrepared, TOutput>): Promise<void> {
  try {
    const limit = parsePositiveInteger(
      workflow.options.limit ?? String(DEFAULT_ASSET_TOKEN_LIMIT),
      "--limit"
    );
    const assets = workflow.options.all
      ? await fetchAllPermittedAssets(
          workflow.pattern,
          limit,
          workflow.command,
          workflow.context,
          workflow.policy
        )
      : await choosePaginatedPermittedAssets(
          workflow.pattern,
          limit,
          workflow.command,
          workflow.context,
          workflow.selectAssets,
          workflow.policy
        );
    if (assets.length === 0) {
      throw new Error(`未选择${workflow.policy.name}`);
    }
    const reusable = await resolveReusable(workflow.options, workflow.context);
    const prepared = await workflow.prepare();

    const outputs: TOutput[] = [];
    for (const asset of assets) {
      outputs.push(await workflow.createOutput(asset, reusable, prepared));
    }

    workflow.context.stdout(workflow.formatOutputs(outputs));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    workflow.context.stderr(`${message}\n`);
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
  const { token, jmsUrl } = await createConnectionToken(
    {
      asset: asset.id,
      account,
      protocol,
      input_username: inputUsername,
      input_secret: "",
      connect_method: connectMethod,
      connect_options: buildDatabaseConnectOptions(reusable)
    },
    command,
    operations,
    context
  );
  const dbGuide = extractDatabaseGuideConnection(jmsUrl, token);
  const dsn = dbGuide ? formatDatabaseDsn(protocol, dbGuide) : undefined;

  return {
    ...connectionTokenOutputBase(asset, token, protocol, connectMethod, reusable),
    account,
    inputUsername,
    ...(dbGuide ? { dbGuide } : {}),
    ...(dsn ? { dsn } : {}),
    ...(options.jmsUrl ? { jmsUrl } : {})
  };
}

async function createHostTokenOutput(
  asset: HostAsset,
  options: HostTokenCommandOptions,
  reusable: boolean,
  loginUsername: string | undefined,
  command: Command,
  operations: ApiOperation[],
  context: InteractiveRunContext
): Promise<HostTokenOutput> {
  const { account, accountUsername } = await resolveHostTokenIdentity(asset, options, command, context);
  const protocol = options.protocol ?? defaultHostProtocol(asset);
  const connectMethod = options.connectMethod ?? DEFAULT_HOST_CONNECT_METHOD;
  const { token, jmsUrl } = await createConnectionToken(
    {
      asset: asset.id,
      account,
      protocol,
      input_username: "",
      input_secret: "",
      connect_method: connectMethod,
      connect_options: buildHostConnectOptions(reusable)
    },
    command,
    operations,
    context
  );
  const sshGuide = extractHostSshConnection(jmsUrl, token, {
    asset,
    accountUsername,
    ...(loginUsername ? { loginUsername } : {})
  });

  return {
    ...connectionTokenOutputBase(asset, token, protocol, connectMethod, reusable),
    account,
    accountUsername,
    ...(loginUsername ? { loginUsername } : {}),
    ...(sshGuide ? { sshGuide } : {}),
    ...(options.jmsUrl ? { jmsUrl } : {})
  };
}

function connectionTokenOutputBase(
  asset: PermittedAsset,
  token: ConnectionTokenCredential,
  protocol: string,
  connectMethod: string,
  reusable: boolean
): ConnectionTokenOutputBase {
  return {
    asset: {
      id: asset.id,
      name: asset.name,
      ...(asset.address ? { address: asset.address } : {})
    },
    ...(token.password ? { password: token.password } : {}),
    protocol,
    connectMethod,
    reusable,
    tokenId: token.id,
    ...(token.expiresAt ? { expiresAt: token.expiresAt } : {})
  };
}

async function createConnectionToken(
  body: Record<string, unknown>,
  command: Command,
  operations: ApiOperation[],
  context: RunContext
): Promise<{ token: ConnectionTokenCredential; jmsUrl: string }> {
  const tokenPayload = await callOperationJson({
    operation: findOperation("users_connection-token_create", operations),
    command,
    context,
    body
  });
  const token = normalizeConnectionToken(tokenPayload);
  const clientUrlPayload = await callOperationJson({
    operation: findOperation("users_connection-token_client-url_read", operations),
    command,
    context,
    pathValues: { id: token.id }
  });
  return { token, jmsUrl: extractClientUrl(clientUrlPayload) };
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
    const account = await chooseDatabasePermittedAccount(asset, command, context);
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

async function resolveHostTokenIdentity(
  asset: HostAsset,
  options: HostTokenCommandOptions,
  command: Command,
  context: InteractiveRunContext
): Promise<HostTokenIdentity> {
  if (options.account) {
    return {
      account: options.account,
      accountUsername: options.accountUsername ?? options.account
    };
  }

  const account = await chooseHostPermittedAccount(asset, command, context, !options.all);
  return {
    account: account.alias,
    accountUsername: options.accountUsername ?? account.username
  };
}

async function chooseDatabasePermittedAccount(
  asset: DatabaseAsset,
  command: Command,
  context: RunContext
): Promise<PermittedAccount> {
  const accounts = await fetchPermittedAccounts(asset, command, context);
  const account = accounts.find((item) => !item.alias.startsWith("@")) ?? accounts.find((item) => item.alias === "@INPUT") ?? accounts[0];
  if (!account) {
    throw new Error(`数据库实例没有可用授权账号: ${asset.name}`);
  }
  return account;
}

async function chooseHostPermittedAccount(
  asset: HostAsset,
  command: Command,
  context: InteractiveRunContext,
  allowInteractiveSelection: boolean
): Promise<PermittedAccount> {
  const accounts = await fetchPermittedAccounts(asset, command, context);
  const nonVirtualAccounts = accounts.filter((item) => !item.alias.startsWith("@"));
  const candidates = nonVirtualAccounts.length > 0 ? nonVirtualAccounts : accounts;
  if (candidates.length === 0) {
    throw new Error(`主机没有可用授权账号: ${asset.name}`);
  }
  if (candidates.length === 1 || !allowInteractiveSelection) {
    return candidates[0]!;
  }

  return context.select(
    "请选择主机账号",
    candidates.map((account) => ({
      label: formatHostAccountOption(account),
      value: account
    }))
  );
}

async function resolveReusable(
  options: { all?: boolean; reusable?: boolean },
  context: InteractiveRunContext
): Promise<boolean> {
  if (options.reusable !== undefined) {
    return options.reusable;
  }
  if (options.all) {
    return DEFAULT_REUSABLE;
  }
  if (!context.canConfirmReusable) {
    return DEFAULT_REUSABLE;
  }
  return context.confirm("是否开启复用", DEFAULT_REUSABLE);
}

async function resolveHostLoginUsername(
  options: HostTokenCommandOptions,
  command: Command,
  operations: ApiOperation[],
  context: RunContext
): Promise<string | undefined> {
  if (options.loginUsername) {
    return options.loginUsername;
  }

  try {
    const payload = await callOperationJson({
      operation: findOperation("users_profile_read", operations),
      command,
      context
    });
    return extractLoginUsername(payload);
  } catch {
    return undefined;
  }
}

function buildDatabaseConnectOptions(reusable: boolean): typeof DEFAULT_DATABASE_CONNECT_OPTIONS & { reusable: boolean } {
  return {
    ...DEFAULT_DATABASE_CONNECT_OPTIONS,
    reusable
  };
}

function buildHostConnectOptions(reusable: boolean): { reusable: boolean } {
  return { reusable };
}

async function choosePaginatedPermittedAssets(
  pattern: string | undefined,
  limit: number,
  command: Command,
  context: RunContext,
  selectAssets: PermittedAssetSelectPrompt,
  policy: PermittedAssetSelectionPolicy
): Promise<PermittedAsset[]> {
  const initialSearch = searchTextFromGlob(pattern);
  const pageCache = new Map<string, PermittedAssetPage>();
  const seenSourceAssetIds = new Map<string, Set<string>>();
  const fetchPage: PermittedAssetSelectionInput["fetchPage"] = async (search, offset) => {
    const cacheKey = `${search ?? ""}\0${offset}`;
    const cachedPage = pageCache.get(cacheKey);
    if (cachedPage) {
      return cachedPage;
    }
    const sourcePage = await fetchPermittedAssetsPage(policy.category, search, limit, offset, command, context);
    const searchKey = search ?? "";
    const seenIds = seenSourceAssetIds.get(searchKey) ?? new Set<string>();
    seenSourceAssetIds.set(searchKey, seenIds);
    const hasNewSourceAssets = collectNewPermittedAssets(sourcePage.items, seenIds).length > 0;
    const page = filterPermittedAssetPageForPattern(
      {
        ...sourcePage,
        hasMore: sourcePage.hasMore && hasNewSourceAssets
      },
      search === initialSearch ? pattern : undefined
    );
    pageCache.set(cacheKey, page);
    return page;
  };
  if (initialSearch) {
    const firstPage = await fetchPage(initialSearch, 0);
    if (firstPage.items.length === 1 && !firstPage.hasMore) {
      return [firstPage.items[0]!];
    }
  }

  return selectAssets(
    pattern ? `匹配到多个${policy.name}` : `请选择${policy.name}`,
    {
      ...(initialSearch ? { initialSearch } : {}),
      pageSize: limit,
      fetchPage
    }
  );
}

async function fetchAllPermittedAssets(
  pattern: string | undefined,
  limit: number,
  command: Command,
  context: RunContext,
  policy: PermittedAssetSelectionPolicy
): Promise<PermittedAsset[]> {
  const search = searchTextFromGlob(pattern);
  const assets: PermittedAsset[] = [];
  const seenAssetIds = new Set<string>();
  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const page = await fetchPermittedAssetsPage(policy.category, search, limit, offset, command, context);
    const previousOffset = offset;
    hasMore = page.hasMore;
    offset = page.nextOffset;
    const newAssets = collectNewPermittedAssets(page.items, seenAssetIds);
    assets.push(...newAssets);

    if (hasMore && (offset <= previousOffset || newAssets.length === 0)) {
      hasMore = false;
    }
  }

  return matchPermittedAssets(assets, pattern);
}

function permittedAssetSelectFromChoicePrompt(
  select: SelectPrompt,
  policy: PermittedAssetSelectionPolicy
): PermittedAssetSelectPrompt {
  return async (message, input) => {
    const loadedAssets: PermittedAsset[] = [];
    const seenAssetIds = new Set<string>();
    let count: number | undefined;
    let hasMore = true;
    let offset = 0;
    let loadedCount = 0;

    while (hasMore || loadedAssets.length > 0) {
      if (hasMore) {
        const previousOffset = offset;
        const page = await input.fetchPage(input.initialSearch, offset);
        count = page.count ?? count;
        offset = page.nextOffset;
        hasMore = page.hasMore && offset > previousOffset;
        loadedCount = count === undefined ? offset : Math.min(offset, count);

        loadedAssets.push(...collectNewPermittedAssets(page.items, seenAssetIds));
      }

      if (loadedAssets.length === 0 && hasMore) {
        continue;
      }
      if (loadedAssets.length === 0) {
        throw new Error(input.initialSearch ? `未找到匹配的${policy.name}: ${input.initialSearch}` : `未找到可选择的${policy.name}`);
      }
      if (input.initialSearch && loadedAssets.length === 1 && !hasMore) {
        return [loadedAssets[0]!];
      }

      const selected = await selectPermittedAssetPage(loadedAssets, message, loadedCount, count, hasMore, select);
      if (isLoadMorePermittedAssetsChoice(selected)) {
        continue;
      }
      return [selected];
    }

    throw new Error(input.initialSearch ? `未找到匹配的${policy.name}: ${input.initialSearch}` : `未找到可选择的${policy.name}`);
  };
}

async function fetchPermittedAssetsPage(
  category: PermittedAssetCategory,
  search: string | undefined,
  limit: number,
  offset: number,
  command: Command,
  context: RunContext
): Promise<PermittedAssetPage> {
  const payload = await callOperationJson({
    operation: PERMITTED_ASSETS_OPERATION,
    command,
    context,
    queryValues: {
      category,
      ...(search ? { search } : {}),
      limit,
      ...(offset > 0 ? { offset } : {})
    }
  });
  return normalizePermittedAssetPage(payload, limit, offset);
}

async function fetchPermittedAccounts(
  asset: PermittedAsset,
  command: Command,
  context: RunContext
): Promise<PermittedAccount[]> {
  const payload = await callOperationJson({
    operation: PERMITTED_ASSET_DETAIL_OPERATION,
    command,
    context,
    pathValues: { id: asset.id }
  });
  return normalizePermittedAccounts(payload);
}

async function selectPermittedAssetPage(
  assets: PermittedAsset[],
  message: string,
  loadedCount: number,
  count: number | undefined,
  hasMore: boolean,
  select: SelectPrompt
): Promise<PermittedAsset | LoadMorePermittedAssetsChoice> {
  const loadMoreChoice: LoadMorePermittedAssetsChoice = { type: "load-more" };
  const choices: Array<SelectChoice<PermittedAsset | LoadMorePermittedAssetsChoice>> = [
    ...assets.map((asset) => ({
      label: formatPermittedAssetOption(asset),
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
    const org = commandOptions.org ?? globalOptions.org;

    if (globalOptions.authenticationMode.kind !== "access-key") {
      throw new Error(
        "Missing Access Key credentials. Pass --access-key-id and --access-key-secret, or set JMS_ACCESS_KEY_ID and JMS_ACCESS_KEY_SECRET."
      );
    }
    const { accessKeyId, accessKeySecret } = globalOptions.authenticationMode;

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
  const options = command.optsWithGlobals<CommandGlobalOptions>();
  const resolved: GlobalOptions = {
    authenticationMode: resolveAuthenticationMode({
      cli: {
        accessKeyId: options.accessKeyId,
        accessKeySecret: options.accessKeySecret,
        token: options.token,
        privateToken: options.privateToken
      },
      env: {
        accessKeyId: context.env.JMS_ACCESS_KEY_ID,
        accessKeySecret: context.env.JMS_ACCESS_KEY_SECRET,
        token: context.env.JMS_TOKEN,
        privateToken: context.env.JMS_PRIVATE_TOKEN
      },
      config: context.config
    })
  };
  Object.assign(resolved, resolveConnectionOptions(command, context));
  return resolved;
}

function resolveConnectionOptions(command: Command, context: RunContext): ConnectionOptions {
  const options = command.optsWithGlobals<CommandGlobalOptions>();
  const resolved: ConnectionOptions = {};
  setIfDefined(resolved, "host", options.host ?? context.env.JMS_HOST ?? context.config.host);
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

function normalizePermittedAssets(payload: unknown): PermittedAsset[] {
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

function normalizePermittedAssetPage(payload: unknown, limit: number, offset: number): PermittedAssetPage {
  const rawItems = extractResultItems(payload);
  const items = normalizePermittedAssets(rawItems);
  const reportedCount = isPlainObject(payload) && typeof payload.count === "number" ? payload.count : undefined;
  const hasNextLink = isPlainObject(payload) && typeof payload.next === "string" && payload.next.length > 0;
  const loadedThroughPage = offset + rawItems.length;
  const count =
    reportedCount !== undefined && reportedCount > loadedThroughPage ? reportedCount : undefined;
  const nextOffset = nextOffsetFromPayload(payload) ?? offset + (rawItems.length > 0 ? rawItems.length : limit);
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

function nextOffsetFromPayload(payload: unknown): number | undefined {
  if (!isPlainObject(payload) || typeof payload.next !== "string" || payload.next.length === 0) {
    return undefined;
  }

  try {
    const value = new URL(payload.next, "https://jumpserver.invalid").searchParams.get("offset");
    if (value && /^\d+$/.test(value)) {
      const offset = Number(value);
      return Number.isSafeInteger(offset) ? offset : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizePermittedAccounts(payload: unknown): PermittedAccount[] {
  const items =
    isPlainObject(payload) && Array.isArray(payload.permed_accounts)
      ? payload.permed_accounts
      : extractResultItems(payload);
  return items.flatMap((item): PermittedAccount[] => {
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

function matchPermittedAssets<T extends { name: string }>(assets: T[], pattern: string | undefined): T[] {
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

function collectNewPermittedAssets<TPermittedAsset extends PermittedAsset>(assets: TPermittedAsset[], seenIds: Set<string>): TPermittedAsset[] {
  return assets.filter((asset) => {
    if (seenIds.has(asset.id)) {
      return false;
    }
    seenIds.add(asset.id);
    return true;
  });
}

function filterPermittedAssetPageForPattern<T extends PermittedAssetPage>(page: T, pattern: string | undefined): T {
  if (!pattern || !hasGlobMeta(pattern)) {
    return page;
  }

  return {
    ...page,
    items: matchPermittedAssets(page.items, pattern)
  };
}

function isLoadMorePermittedAssetsChoice(value: PermittedAsset | LoadMorePermittedAssetsChoice): value is LoadMorePermittedAssetsChoice {
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
  return segments[0];
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

function defaultHostProtocol(asset: HostAsset): string {
  if (Array.isArray(asset.protocols)) {
    const sshProtocol = asset.protocols.find((item) => isPlainObject(item) && item.name === "ssh");
    if (isPlainObject(sshProtocol) && typeof sshProtocol.name === "string") {
      return sshProtocol.name;
    }
    const protocol = asset.protocols.find((item) => isPlainObject(item) && typeof item.name === "string");
    if (isPlainObject(protocol) && typeof protocol.name === "string") {
      return protocol.name;
    }
  }
  return "ssh";
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

function extractLoginUsername(payload: unknown): string | undefined {
  if (!isPlainObject(payload)) {
    return undefined;
  }
  return stringField(payload, "username") ?? stringField(payload, "email") ?? stringField(payload, "name");
}

function normalizeConnectionToken(payload: unknown): ConnectionTokenCredential {
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
  token: ConnectionTokenCredential
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

function extractHostSshConnection(
  jmsUrl: string,
  token: ConnectionTokenCredential,
  input: {
    asset: HostAsset;
    accountUsername: string;
    loginUsername?: string;
  }
): HostSshConnection | undefined {
  const payload = decodeJmsClientUrl(jmsUrl);
  if (!isPlainObject(payload)) {
    return undefined;
  }

  const endpoint = plainObjectField(payload, "endpoint");
  const tokenPayload = plainObjectField(payload, "token");
  const host =
    (endpoint ? stringField(endpoint, "host") : undefined) ??
    stringField(payload, "host") ??
    stringField(payload, "hostname");
  const port =
    (endpoint ? numberField(endpoint, "port") : undefined) ??
    numberField(payload, "port") ??
    DEFAULT_SSH_PORT;
  const username = (tokenPayload ? stringField(tokenPayload, "id") : undefined) ?? stringField(payload, "id") ?? token.id;
  const password =
    (tokenPayload ? stringField(tokenPayload, "value") : undefined) ??
    stringField(payload, "value") ??
    token.password;

  if (!host || !username) {
    return undefined;
  }

  const accountCommandUsername = input.loginUsername
    ? `${input.loginUsername}#${input.accountUsername}#${input.asset.id}`
    : undefined;

  return {
    host,
    port,
    username,
    ...(password ? { password } : {}),
    command: formatSshCommand(username, host, port),
    ...(accountCommandUsername ? { accountCommand: formatSshCommand(accountCommandUsername, host, port) } : {})
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

function formatSshCommand(username: string, host: string, port: number): string {
  const normalizedHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
  return ["ssh", shellWord(`${username}@${normalizedHost}`), "-p", String(port)].join(" ");
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function shellWord(value: string): string {
  return /^[A-Za-z0-9_@%+=:,./#\-[\]]+$/.test(value) ? value : shellQuote(value);
}

function formatPermittedAssetOption(asset: PermittedAsset): string {
  return asset.address ? `${asset.name} (${asset.address})` : asset.name;
}

function formatHostAccountOption(account: PermittedAccount): string {
  return account.alias === account.username ? account.username : `${account.username} (${account.alias})`;
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

function formatHostTokenOutputs(
  outputs: HostTokenOutput[],
  options: HostTokenCommandOptions,
  terminalColumns: number
): string {
  if (options.sshCommand) {
    return formatHostTokenSshCommands(outputs);
  }
  if (options.json) {
    return `${JSON.stringify(outputs, null, 2)}\n`;
  }
  return formatHostTokenTables(outputs, options.jmsUrl === true, terminalColumns);
}

function formatDatabaseTokenDsns(outputs: DatabaseTokenOutput[]): string {
  return `${outputs.map(requireDatabaseDsn).join("\n")}\n`;
}

function formatHostTokenSshCommands(outputs: HostTokenOutput[]): string {
  return `${outputs.map(requireHostSshCommand).join("\n")}\n`;
}

function requireDatabaseDsn(output: DatabaseTokenOutput): string {
  if (!output.dsn) {
    throw new Error(`无法生成 DSN: ${output.asset.name} 缺少 DB 向导连接信息`);
  }
  return output.dsn;
}

function requireHostSshCommand(output: HostTokenOutput): string {
  if (!output.sshGuide) {
    throw new Error(`无法生成 SSH 命令: ${output.asset.name} 缺少 SSH 向导连接信息`);
  }
  return output.sshGuide.command;
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

function formatHostTokenTables(
  outputs: HostTokenOutput[],
  includeJmsUrl: boolean,
  terminalColumns: number
): string {
  const separator = formatDatabaseTokenOutputSeparator(terminalColumns);
  return `${outputs.map((output) => formatHostTokenTable(output, includeJmsUrl, terminalColumns)).join(`\n\n${separator}\n\n`)}\n`;
}

function formatDatabaseTokenTable(output: DatabaseTokenOutput, includeJmsUrl: boolean, terminalColumns: number): string {
  const rows: Array<[string, string]> = [
    ["名称", formatPermittedAssetOption(output.asset)],
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

function formatHostTokenTable(output: HostTokenOutput, includeJmsUrl: boolean, terminalColumns: number): string {
  const rows: Array<[string, string]> = [
    ["名称", formatPermittedAssetOption(output.asset)],
    ["主机", formatTableValue(output.sshGuide?.host)],
    ["端口", formatTableValue(output.sshGuide?.port)],
    ["用户名", formatTableValue(output.sshGuide?.username)],
    ["密码", formatTableValue(output.sshGuide?.password ?? output.password)],
    ["协议", output.protocol],
    ["过期时间", formatTableValue(output.expiresAt)],
    ["开启复用", output.reusable ? "是" : "否"],
    ["连接命令行", output.sshGuide?.command ?? "无法解析连接命令"],
    ...(output.sshGuide?.accountCommand
      ? [["资产账号命令", output.sshGuide.accountCommand] as [string, string]]
      : []),
    ["说明", "Token 命令密码是表格中的密码；资产账号命令密码是 JumpServer 登录密码"],
    ...(includeJmsUrl ? [["JMS 连接地址", formatTableValue(output.jmsUrl)] as [string, string]] : [])
  ];
  return formatKeyValueTable(rows, terminalColumns);
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

function addRequestOptions(command: Command, operation?: ApiOperation): void {
  command
    .option("-p, --param <name=value>", "Path parameter if the name is in the path template, otherwise query", collect, [])
    .option("--path <name=value>", "Path parameter value", collect, [])
    .option("-q, --query <name=value>", "Deprecated; use operation-specific query options instead", collect, [])
    .option("-H, --header <name=value>", "Extra request header", collect, []);

  if (!operation || operation.queryParameters.some((parameter) => parameter.name === "limit")) {
    command.option("--limit <number>", "Number of results to return for limit/offset paginated APIs");
  }
  if (!operation || operation.queryParameters.some((parameter) => parameter.name === "offset")) {
    command.option("--offset <number>", "Initial result offset for limit/offset paginated APIs");
  }

  command
    .option("-b, --body <json|@file|->", "JSON request body, @file, or - for stdin")
    .option("--dry-run", "Print a concise request preview without sending it")
    .option("--include-headers", "Include the HTTP status line in output")
    .option("--json", "Print raw JSON response");
}

function warnDeprecatedQueryOption(options: RequestCommandOptions, context: RunContext): void {
  if ((options.query ?? []).length > 0) {
    context.stderr(DEPRECATED_QUERY_OPTION_WARNING);
  }
}

function addOperationQueryOptions(command: Command, operation: ApiOperation): void {
  for (const binding of operationQueryOptionBindings(operation)) {
    command.addOption(new Option(`--${binding.flagName} <value>`, `Query parameter: ${binding.parameterName}`));
  }
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
  Object.assign(queryValues, collectOperationQueryOptionValues(operation, options));
  applyPaginationShortcut(operation, queryParameterNames, queryValues, "limit", options.limit);
  applyPaginationShortcut(operation, queryParameterNames, queryValues, "offset", options.offset);

  return {
    pathValues,
    queryValues,
    headers: Object.fromEntries(parsePairs(options.header ?? []))
  };
}

function collectOperationQueryOptionValues(
  operation: ApiOperation,
  options: RequestCommandOptions
): Record<string, QueryValue> {
  const values: Record<string, QueryValue> = {};

  for (const binding of operationQueryOptionBindings(operation)) {
    const value = options[binding.attributeName];
    if (value !== undefined) {
      values[binding.parameterName] = String(value);
    }
  }

  return values;
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
    throw new Error(`${operation.operationId} does not support --${name}. This API does not declare the ${name} query parameter.`);
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

  if (options.authenticationMode.kind === "access-key") {
    authHeaders = buildSignedHeaders({
      accessKeyId: options.authenticationMode.accessKeyId,
      accessKeySecret: options.authenticationMode.accessKeySecret,
      method: operation.method,
      pathWithQuery: plan.pathWithQuery,
      now,
      ...(org ? { organizationId: org } : {})
    });
  } else if (options.authenticationMode.kind === "bearer") {
    authHeaders = buildBearerHeaders(options.authenticationMode.token, org);
  } else if (options.authenticationMode.kind === "private-token") {
    authHeaders = buildPrivateTokenHeaders(options.authenticationMode.token, org);
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

type SearchableMultiselectOptions<T> = Parameters<typeof clackMultiselect<T>>[0];
type SearchableMultiselectResult<T> = Awaited<ReturnType<typeof clackMultiselect<T>>> | typeof ASSET_SEARCH_SHORTCUT;
type KeypressInfo = {
  name?: string;
  sequence?: string;
  ctrl?: boolean;
  meta?: boolean;
};

async function searchableClackMultiselect<T>(
  options: SearchableMultiselectOptions<T>
): Promise<SearchableMultiselectResult<T>> {
  const abortController = new AbortController();
  const promptInput = options.input ?? stdin;
  let searchRequested = false;
  const keypressListener = (char: string | undefined, key: KeypressInfo = {}) => {
    if (!isAssetSearchShortcutKey(char, key)) {
      return;
    }
    searchRequested = true;
    abortController.abort();
  };

  promptInput.on("keypress", keypressListener);
  try {
    const signal = options.signal
      ? AbortSignal.any([options.signal, abortController.signal])
      : abortController.signal;
    const result = await clackMultiselect<T>({
      ...options,
      signal
    });
    if (searchRequested && isCancel(result)) {
      return ASSET_SEARCH_SHORTCUT;
    }
    return result;
  } finally {
    promptInput.removeListener("keypress", keypressListener);
  }
}

function isAssetSearchShortcutKey(char: string | undefined, key: KeypressInfo): boolean {
  if (key.ctrl || key.meta) {
    return false;
  }
  return char === "/" || key.sequence === "/" || key.name === "slash";
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

async function selectPermittedAssetFromTerminal(
  message: string,
  input: PermittedAssetSelectionInput,
  policy: PermittedAssetSelectionPolicy
): Promise<PermittedAsset[]> {
  if (!stdin.isTTY) {
    throw new Error(`Cannot select a ${policy.terminalName} because stdin is not an interactive terminal.`);
  }

  return selectPermittedAssets(
    input,
    {
      selectPage: (view) => selectPermittedAssetsWithClack(message, view),
      promptSearch: ({ currentSearch, reason }) => promptPermittedAssetSearch(
        currentSearch,
        reason === "no-results"
          ? `没有匹配的${policy.name}，请输入新的搜索关键词`
          : `搜索${policy.name}`,
        policy.searchPlaceholder
      )
    },
    { requiredSelectionMessage: `至少选择一个${policy.name}` }
  );
}

interface PermittedAssetNavigationChoice {
  type: "previous" | "next" | "search";
}

async function selectPermittedAssetsWithClack(
  message: string,
  view: PermittedAssetSelectionView
): Promise<PermittedAssetPageSelection> {
  const { search, pageIndex, page, pageSize, selectedAssets, hasPreviousPage } = view;
  const loadedCount = page.nextOffset;
  const totalPages = page.count === undefined ? undefined : Math.max(1, Math.ceil(page.count / pageSize));
  const pageLabel = totalPages === undefined ? `${pageIndex + 1}` : `${pageIndex + 1}/${totalPages}`;
  const countLabel = page.count === undefined ? `${loadedCount}` : `${Math.min(loadedCount, page.count)}/${page.count}`;
  const selectedCountLabel = selectedAssets.length === 0 ? "未选择" : `已选择 ${selectedAssets.length}`;
  const promptMessage = `${message}  搜索: ${search || "(空)"}  页: ${pageLabel}  已加载: ${countLabel}  ${selectedCountLabel}  按 / 搜索`;
  const selectedAssetIds = new Set(selectedAssets.map((asset) => asset.id));
  const initialValues = page.items.filter((asset) => selectedAssetIds.has(asset.id));
  const navigationChoices: Array<SelectChoice<PermittedAssetNavigationChoice>> = [
    ...(hasPreviousPage
      ? [
          {
            label: "上一页",
            value: { type: "previous" } as PermittedAssetNavigationChoice
          }
        ]
      : []),
    ...(page.hasMore
      ? [
          {
            label: "下一页",
            value: { type: "next" } as PermittedAssetNavigationChoice
          }
        ]
      : []),
    {
      label: "重新搜索",
      value: { type: "search" }
    }
  ];
  const choices: Array<SelectChoice<PermittedAsset | PermittedAssetNavigationChoice>> = [
    ...page.items.map((asset) => ({
      label: formatPermittedAssetOption(asset),
      value: asset
    })),
    ...navigationChoices
  ];
  const selected = await searchableClackMultiselect<PermittedAsset | PermittedAssetNavigationChoice>({
    message: promptMessage,
    options: choices as Parameters<typeof searchableClackMultiselect<PermittedAsset | PermittedAssetNavigationChoice>>[0]["options"],
    initialValues,
    input: stdin,
    output: processStderr,
    maxItems: 20,
    required: false
  });

  if (selected === ASSET_SEARCH_SHORTCUT) {
    clearSubmittedPromptDisplay(processStderr, promptMessage, "/");
    return { action: "search", selectedAssets: initialValues };
  }

  if (isCancel(selected)) {
    clackCancel("已取消选择", { output: processStderr });
    throw new Error("已取消选择");
  }

  clearSubmittedPromptDisplay(
    processStderr,
    promptMessage,
    selected.map((value) => choiceLabelForValue(choices, value)).join(", ") || "none"
  );
  return {
    action: selected.find(isPermittedAssetNavigationChoice)?.type ?? "submit",
    selectedAssets: selected.filter(isPermittedAsset)
  };
}

async function promptPermittedAssetSearch(
  currentSearch: string | undefined,
  message: string,
  placeholder: string
): Promise<string | undefined> {
  const nextSearch = await clackText({
    message,
    initialValue: currentSearch ?? "",
    placeholder,
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

function isPermittedAssetNavigationChoice(value: unknown): value is PermittedAssetNavigationChoice {
  return isPlainObject(value) && (
    value.type === "previous" ||
    value.type === "next" ||
    value.type === "search"
  );
}

function isPermittedAsset(value: unknown): value is PermittedAsset {
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
