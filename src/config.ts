import { existsSync, readFileSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface CliConfig {
  host?: string | undefined;
  accessKeyId?: string | undefined;
  accessKeySecret?: string | undefined;
  token?: string | undefined;
  privateToken?: string | undefined;
  org?: string | undefined;
}

const CONFIG_KEYS = new Set([
  "host",
  "accessKeyId",
  "accessKeySecret",
  "token",
  "privateToken",
  "org"
]);

export function resolveConfigPath(
  explicitPath: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (explicitPath) {
    return explicitPath;
  }
  if (env.JMS_CONFIG) {
    return env.JMS_CONFIG;
  }
  if (env.XDG_CONFIG_HOME) {
    return join(env.XDG_CONFIG_HOME, "jms", "config.json");
  }
  return join(homedir(), ".config", "jms", "config.json");
}

export function loadConfig(configPath: string): CliConfig {
  if (!existsSync(configPath)) {
    return {};
  }

  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  if (!isPlainObject(parsed)) {
    throw new Error(`Invalid config file: ${configPath}`);
  }

  const config: CliConfig = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (CONFIG_KEYS.has(key) && typeof value === "string" && value.length > 0) {
      config[key as keyof CliConfig] = value;
    }
  }
  return config;
}

export async function saveConfig(configPath: string, config: CliConfig): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(configPath, 0o600);
}

export function mergeConfig(existing: CliConfig, updates: CliConfig): CliConfig {
  return stripUndefined({ ...existing, ...updates });
}

export function tokenConfig(updates: CliConfig & { token: string }): CliConfig {
  return stripUndefined({
    host: updates.host,
    token: updates.token,
    org: updates.org
  });
}

export function accessKeyConfig(
  updates: CliConfig & { accessKeyId: string; accessKeySecret: string }
): CliConfig {
  return stripUndefined({
    host: updates.host,
    accessKeyId: updates.accessKeyId,
    accessKeySecret: updates.accessKeySecret,
    org: updates.org
  });
}

function stripUndefined(config: CliConfig): CliConfig {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined && value !== "")
  ) as CliConfig;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
