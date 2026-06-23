import { describe, expect, it } from "vitest";
import {
  buildProgram,
  isDirectCliInvocation,
  operationCommandPath,
  readPackageVersion
} from "../src/cli.js";
import { loadOperations } from "../src/openapi.js";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

let testConfigCounter = 0;

function buildTestProgram(options: Parameters<typeof buildProgram>[0] = {}) {
  return buildProgram({
    env: {},
    configPath: join(tmpdir(), `jms-cli-test-empty-${process.pid}-${testConfigCounter++}.json`),
    ...options
  });
}

describe("CLI command surface", () => {
  it("registers one hierarchical command path for every OpenAPI operation", () => {
    const operations = loadOperations();
    const program = buildTestProgram();
    const commandNames = new Set(program.commands.map((command) => command.name()));

    for (const operation of operations) {
      expect(findCommandPath(program, operationCommandPath(operation)), operation.operationId).toBeTruthy();
      expect(commandNames.has(operation.operationId), operation.operationId).toBe(false);
    }
  });

  it("registers glab-style top-level utility and module commands", () => {
    const program = buildTestProgram();
    const commandNames = new Set(program.commands.map((command) => command.name()));

    expect(commandNames.has("login")).toBe(false);
    expect(commandNames.has("auth")).toBe(true);
    expect(commandNames.has("api")).toBe(true);
    expect(commandNames.has("assets")).toBe(true);
    expect(commandNames.has("users")).toBe(true);
    expect(commandNames.has("assets_favorite-assets_read")).toBe(false);
    expect(findCommandPath(program, ["assets", "databases", "token"])).toBeTruthy();
  });

  it("collapses repeated OpenAPI tag segments in command paths", () => {
    const operations = loadOperations();
    const program = buildTestProgram({ operations });
    const assetsMatch = findOperationForTest(operations, "assets_assets_match");
    const accountsUsernameSuggestions = findOperationForTest(operations, "accounts_accounts_username_suggestions");

    expect(operationCommandPath(assetsMatch)).toEqual(["assets", "match"]);
    expect(operationCommandPath(accountsUsernameSuggestions)).toEqual(["accounts", "username", "suggestions"]);
    expect(findCommandPath(program, ["assets", "match"])).toBeTruthy();
    expect(findCommandPath(program, ["accounts", "username", "suggestions"])).toBeTruthy();
    expect(findCommandPath(program, ["assets", "assets"])).toBeUndefined();
    expect(findCommandPath(program, ["accounts", "accounts"])).toBeUndefined();

    for (const operation of operations) {
      const path = operationCommandPath(operation);
      for (let index = 1; index < path.length; index += 1) {
        expect(path[index], operation.operationId).not.toBe(path[index - 1]);
      }
    }
  });

  it("reads the CLI version from package metadata", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jms-package-"));
    const packageJsonPath = join(directory, "package.json");

    try {
      await writeFile(packageJsonPath, JSON.stringify({ version: "9.8.7" }));

      expect(readPackageVersion(packageJsonPath)).toBe("9.8.7");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("prints the package version with the version subcommand", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value)
    });
    program.exitOverride();

    await program.parseAsync(["node", "jms", "version"], { from: "node" });

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toBe(`${readPackageVersion()}\n`);
  });

  it("upgrades the current CLI package with npm", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const runs: Array<{ command: string; args: string[] }> = [];
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      upgradeRunner: async (command, args) => {
        runs.push({ command, args });
        return 0;
      }
    });
    program.exitOverride();

    await program.parseAsync(["node", "jms", "upgrade"], { from: "node" });

    expect(stderr).toEqual([]);
    expect(stdout).toEqual(["正在升级 jumpserver-cli 到最新版本...\n", "升级完成\n"]);
    expect(runs).toEqual([{ command: npmCommand, args: ["install", "-g", "jumpserver-cli@latest"] }]);
  });

  it("reports self-upgrade failures without hiding the npm exit code", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      upgradeRunner: async () => 7
    });
    program.exitOverride();

    await program.parseAsync(["node", "jms", "upgrade"], { from: "node" });

    expect(stdout).toEqual(["正在升级 jumpserver-cli 到最新版本...\n"]);
    expect(stderr.join("")).toBe("升级失败: npm install exited with code 7\n");
    expect(process.exitCode).toBe(7);
    process.exitCode = previousExitCode;
  });

  it("treats symlinked npm bin paths as direct CLI invocation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jms-cli-bin-"));
    const target = join(directory, "cli.js");
    const linkedBin = join(directory, "jms");

    try {
      await writeFile(target, "#!/usr/bin/env node\n");
      await symlink(target, linkedBin);

      expect(isDirectCliInvocation(pathToFileURL(target).href, linkedBin)).toBe(true);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("does not print auth values from environment or config defaults in help", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jms-config-"));
    const configPath = join(directory, "config.json");

    try {
      await writeFile(
        configPath,
        JSON.stringify({
          host: "saved-host.example.test",
          accessKeyId: "saved-access-key-id",
          accessKeySecret: "saved-access-key-secret",
          token: "saved-token",
          privateToken: "saved-private-token",
          org: "saved-org"
        })
      );

      const program = buildTestProgram({
        configPath,
        env: {
          JMS_HOST: "env-host.example.test",
          JMS_ACCESS_KEY_ID: "env-access-key-id",
          JMS_ACCESS_KEY_SECRET: "env-access-key-secret",
          JMS_TOKEN: "env-token",
          JMS_PRIVATE_TOKEN: "env-private-token",
          JMS_ORG: "env-org",
          JMS_USERNAME: "env-username",
          JMS_PASSWORD: "env-password",
          JMS_PUBLIC_KEY: "env-public-key"
        }
      });
      const auth = findCommandPath(program, ["auth"]);
      const token = findCommandPath(program, ["auth", "token"]);
      const accessKey = findCommandPath(program, ["auth", "access-key"]);
      const help = [program.helpInformation(), auth?.helpInformation(), token?.helpInformation(), accessKey?.helpInformation()].join("\n");

      for (const value of [
        "saved-access-key-id",
        "saved-access-key-secret",
        "saved-token",
        "saved-private-token",
        "saved-org",
        "env-access-key-id",
        "env-access-key-secret",
        "env-token",
        "env-private-token",
        "env-org",
        "env-username",
        "env-password",
        "env-public-key"
      ]) {
        expect(help).not.toContain(value);
      }
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("only exposes host for JumpServer target configuration", () => {
    const program = buildTestProgram();
    const auth = program.commands.find((command) => command.name() === "auth");
    const token = auth?.commands.find((command) => command.name() === "token");
    const accessKey = auth?.commands.find((command) => command.name() === "access-key");

    expect(optionFlags(program)).toContain("--host <url>");
    expect(optionFlags(program)).not.toContain("--base-url <url>");
    expect(optionFlags(token)).toContain("--host <url>");
    expect(optionFlags(token)).not.toContain("--base-url <url>");
    expect(optionFlags(accessKey)).toContain("--host <url>");
    expect(optionFlags(accessKey)).not.toContain("--base-url <url>");
  });

  it("requires a configured host instead of using an internal default target", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value)
    });

    await program.parseAsync(
      ["node", "jms", "--token", "token", "users", "profile", "read", "--dry-run"],
      { from: "node" }
    );

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("Missing JumpServer host");
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });

  it("prints resource-oriented descriptions in group help", () => {
    const program = buildTestProgram();
    const assets = findCommandPath(program, ["assets"]);
    const help = assets?.helpInformation() ?? "";

    expect(help).toContain("Asset inventory commands");
    expect(help).toContain("databases                    Database assets");
    expect(help).toContain("favorite-assets              Favorite assets");
    expect(help).toContain("match [options]              Search asset records");
    expect(help).toContain("protocols                    Asset protocols");
    expect(help).not.toContain("Work with assets");
    expect(help).not.toContain("assets                       Asset records");
  });

  it("prints user-oriented operation help without API method or path", () => {
    const stdout: string[] = [];
    const program = buildTestProgram({
      stdout: (value) => stdout.push(value)
    });
    const match = findCommandPath(program, ["assets", "databases", "match"]);
    match?.configureOutput({
      writeOut: (value) => stdout.push(value),
      writeErr: (value) => stdout.push(value)
    });
    match?.outputHelp();
    const help = stdout.join("");

    expect(help).toContain("Search database assets");
    expect(help).not.toContain("GET /assets/databases/suggestions/");
    expect(help).not.toContain("Endpoint:");
    expect(help).not.toContain("/api/v1/assets/databases/suggestions/");
    expect(help).toContain("Query params: id, name, address, is_active");
    expect(help).toContain("Body: none");
    expect(help).toContain("Example:");
    expect(help).toContain("jms assets databases match --query search=value");
  });

  it("prints Web UI-style connection tables for all selected database token credentials by default", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const requests: Array<{ url: string; method: string | undefined; body?: string }> = [];
    const selectedAssets = [
      {
        id: "database-1",
        name: "prod-main-db",
        address: "10.0.0.10",
        protocols: [{ name: "mysql", port: 3306 }]
      },
      {
        id: "database-2",
        name: "prod-report-db",
        address: "10.0.0.11",
        protocols: [{ name: "mysql", port: 3306 }]
      }
    ];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      databaseAssetSelect: async () => selectedAssets,
      fetcher: (async (input, init) => {
        const url = String(input);
        requests.push({
          url,
          method: init?.method,
          ...(typeof init?.body === "string" ? { body: init.body } : {})
        });

        const path = new URL(url).pathname;
        if (path === "/api/v1/perms/users/self/assets/") {
          return jsonResponse({ count: selectedAssets.length, results: selectedAssets });
        }
        if (path === "/api/v1/accounts/accounts/username-suggestions/") {
          const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { assets?: string[] };
          return jsonResponse([body.assets?.[0] === "database-1" ? "main-user" : "report-user"], 201);
        }
        if (path === "/api/v1/users/connection-token/") {
          const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { account?: string; asset?: string };
          const suffix = body.asset === "database-1" ? "main" : "report";
          return jsonResponse(
            {
              id: `connection-token-${suffix}`,
              value: `${suffix}-password`,
              date_expired: `2026-06-12T10:00:0${suffix === "main" ? "1" : "2"}+08:00`
            },
            201
          );
        }
        if (path === "/api/v1/users/connection-token/connection-token-main/client-url/") {
          return jsonResponse({
            url: jmsUrl({
              id: "connection-token-main",
              value: "main-password",
              protocol: "mysql",
              token: { id: "connection-token-main", value: "main-password" },
              endpoint: { host: "jumpserver.example.test", port: 33061 }
            })
          });
        }
        if (path === "/api/v1/users/connection-token/connection-token-report/client-url/") {
          return jsonResponse({
            url: jmsUrl({
              id: "connection-token-report",
              value: "report-password",
              protocol: "mysql",
              token: { id: "connection-token-report", value: "report-password" },
              endpoint: { host: "jumpserver.example.test", port: 33062 }
            })
          });
        }
        return jsonResponse({ detail: `Unexpected request: ${path}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-*"
      ],
      { from: "node" }
    );

    const output = stdout.join("");
    const tokenCreateBodies = requests
      .filter((request) => request.url.endsWith("/api/v1/users/connection-token/"))
      .map((request) => JSON.parse(request.body ?? "{}"));
    const usernameSuggestionBodies = requests.filter((request) =>
      request.url.endsWith("/api/v1/accounts/accounts/username-suggestions/")
    ).map((request) => JSON.parse(request.body ?? "{}"));

    expect(stderr).toEqual([]);
    expect(usernameSuggestionBodies).toEqual([
      { username: "", assets: ["database-1"] },
      { username: "", assets: ["database-2"] }
    ]);
    expect(tokenCreateBodies).toMatchObject([
      {
        asset: "database-1",
        account: "prod-main-db-账号",
        input_username: "main-user",
        connect_options: {
          reusable: false
        }
      },
      {
        asset: "database-2",
        account: "prod-report-db-账号",
        input_username: "report-user",
        connect_options: {
          reusable: false
        }
      }
    ]);
    expect(output).not.toContain("数据库 连接信息");
    const lines = output.split("\n");
    const firstTableBorderIndex = lines.findIndex((line) => line.startsWith("┌"));
    const firstTableBorder = lines[firstTableBorderIndex];
    expect(firstTableBorder).toMatch(/^┌─+┬─+┐$/);
    expect(lines[firstTableBorderIndex + 1]).toMatch(/^│ 名称\s+│ prod-main-db \(10\.0\.0\.10\)\s+│$/);
    expect(lines[firstTableBorderIndex + 2]).toMatch(/^├─+┼─+┤$/);
    expect(lines[firstTableBorderIndex + 3]).toMatch(/^│ 主机\s+│ jumpserver\.example\.test\s+│$/);
    expect(lines[firstTableBorderIndex + 4]).toMatch(/^├─+┼─+┤$/);
    const noteLineIndex = lines.findIndex((line) => line.includes("数据库类型 token 会缓存 5 分钟"));
    expect(lines[noteLineIndex]).toMatch(/^│ 说明\s+│ 数据库类型 token 会缓存 5 分钟.*│$/);
    const noteEndLineIndex = lines.findIndex((line, index) => index > noteLineIndex && line.includes("完全失效"));
    expect(lines[noteEndLineIndex]).toMatch(/^│\s+│ .*完全失效\s+│$/);
    expect(lines[noteEndLineIndex + 1]).toMatch(/^├─+┼─+┤$/);
    const commandLineIndex = lines.findIndex((line) => line.includes("MYSQL_PWD='main-password'"));
    expect(lines[commandLineIndex]).toMatch(/^│ 连接命令行\s+│ MYSQL_PWD='main-password'.*│$/);
    expect(lines[commandLineIndex + 1]).toMatch(/^└────────────┴─+┘$/);
    expect(output).toContain("prod-main-db (10.0.0.10)");
    expect(output).toContain("│ 主机");
    expect(output).toContain("jumpserver.example.test");
    expect(output).toContain("│ 端口");
    expect(output).toContain("33061");
    expect(output).toContain("│ 用户名");
    expect(output).toContain("connection-token-main");
    expect(output).toContain("│ 密码");
    expect(output).toContain("main-password");
    expect(output).toContain("│ 数据库");
    expect(output).toContain("│ 协议");
    expect(output).toContain("mysql");
    expect(output).toContain("│ 过期时间");
    expect(output).toContain("2026-06-12T10:00:01+08:00");
    expect(output).toContain("│ 开启复用");
    expect(output).toContain("否");
    expect(output).toContain("│ 连接命令行");
    expect(output).not.toContain("\n连接命令行\n");
    expect(output).toContain("MYSQL_PWD='main-password' mysql -h 'jumpserver.example.test' -P 33061 -u 'connection-token-main'");
    expect(output).toContain("prod-report-db (10.0.0.11)");
    expect(output).toContain("MYSQL_PWD='report-password' mysql -h 'jumpserver.example.test' -P 33062 -u 'connection-token-report'");
    expect(output).toMatch(/└[─]+┴[─]+┘\n\n[─]{10,}\n\n┌/);
    expect(output).not.toContain("+----------");
    expect(output).not.toContain("| 名称");
    expect(output).not.toContain("\t");
    expect(output).not.toContain("jms://");
  });

  it("prints token credentials for every permitted database asset with --all", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const assetRequestUrls: string[] = [];
    const assetDetailRequestUrls: string[] = [];
    const tokenCreateBodies: unknown[] = [];
    const assets = [
      {
        id: "database-1",
        name: "prod-main-db",
        address: "10.0.0.10",
        protocols: [{ name: "mysql", port: 3306 }]
      },
      {
        id: "database-2",
        name: "prod-report-db",
        address: "10.0.0.11",
        protocols: [{ name: "mysql", port: 3306 }]
      },
      {
        id: "database-3",
        name: "prod-audit-db",
        address: "10.0.0.12",
        protocols: [{ name: "mysql", port: 3306 }]
      }
    ];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      confirm: async () => {
        throw new Error("reusable prompt should not run when --all is used");
      },
      databaseAssetSelect: async () => {
        throw new Error("database asset selector should not run when --all is used");
      },
      select: async () => {
        throw new Error("select prompt should not run when --all is used");
      },
      fetcher: (async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/v1/perms/users/self/assets/") {
          assetRequestUrls.push(url.href);
          const offset = Number(url.searchParams.get("offset") ?? "0");
          if (offset === 0) {
            return jsonResponse({
              count: assets.length,
              next: "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&limit=2&offset=2",
              results: assets.slice(0, 2)
            });
          }
          if (offset === 2) {
            return jsonResponse({
              count: assets.length,
              next: null,
              results: assets.slice(2)
            });
          }
        }
        if (url.pathname === "/api/v1/accounts/accounts/username-suggestions/") {
          const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { assets?: string[] };
          const assetId = body.assets?.[0] ?? "database";
          return jsonResponse([`${assetId}-user`, `${assetId}-readonly`], 201);
        }
        const assetDetailMatch = url.pathname.match(/^\/api\/v1\/perms\/users\/self\/assets\/([^/]+)\/$/);
        if (assetDetailMatch) {
          const assetId = assetDetailMatch[1]!;
          assetDetailRequestUrls.push(url.href);
          return jsonResponse({
            id: assetId,
            permed_accounts: [
              {
                id: `${assetId}-account-id`,
                alias: `${assetId}-account-id`,
                name: `${assetId}-account`,
                username: `${assetId}-user`,
                has_secret: true
              }
            ]
          });
        }
        if (url.pathname === "/api/v1/users/connection-token/") {
          const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { account?: string; asset?: string };
          tokenCreateBodies.push(body);
          if (body.account !== `${body.asset}-account-id`) {
            return jsonResponse({ detail: "账号未找到" }, 404);
          }
          const suffix = body.asset?.replace("database-", "") ?? "unknown";
          return jsonResponse(
            {
              id: `connection-token-${suffix}`,
              value: `password-${suffix}`,
              date_expired: `2026-06-12T10:00:0${suffix}+08:00`
            },
            201
          );
        }
        const clientUrlMatch = url.pathname.match(
          /^\/api\/v1\/users\/connection-token\/connection-token-(\d+)\/client-url\/$/
        );
        if (clientUrlMatch) {
          const suffix = clientUrlMatch[1]!;
          return jsonResponse({
            url: jmsUrl({
              id: `connection-token-${suffix}`,
              value: `password-${suffix}`,
              protocol: "mysql",
              token: { id: `connection-token-${suffix}`, value: `password-${suffix}` },
              endpoint: { host: "jumpserver.example.test", port: 33060 + Number(suffix) }
            })
          });
        }
        return jsonResponse({ detail: `Unexpected request: ${url.pathname}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "--all",
        "--limit",
        "2"
      ],
      { from: "node" }
    );

    const output = stdout.join("");

    expect(stderr).toEqual([]);
    expect(assetRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&limit=2",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&limit=2&offset=2"
    ]);
    expect(assetDetailRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/database-1/",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/database-2/",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/database-3/"
    ]);
    expect(tokenCreateBodies).toMatchObject([
      { asset: "database-1", account: "database-1-account-id", input_username: "database-1-user" },
      { asset: "database-2", account: "database-2-account-id", input_username: "database-2-user" },
      { asset: "database-3", account: "database-3-account-id", input_username: "database-3-user" }
    ]);
    expect(output).toContain("prod-main-db (10.0.0.10)");
    expect(output).toContain("prod-report-db (10.0.0.11)");
    expect(output).toContain("prod-audit-db (10.0.0.12)");
    expect(output).toMatch(/└[─]+┴[─]+┘\n\n[─]{10,}\n\n┌/);
    expect(output).not.toContain("数据库 连接信息");
  });

  it("wraps database token tables to fit narrow terminals", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const selectedAsset = {
      id: "database-1",
      name: "海外-DB-直播业务库-节后-二期(cynosdbmysql-ins-p0c5r392)",
      address: "10.40.45.158",
      protocols: [{ name: "mysql", port: 3306 }]
    };

    const program = buildTestProgram({
      terminalColumns: 58,
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      databaseAssetSelect: async () => [selectedAsset],
      fetcher: (async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/api/v1/perms/users/self/assets/") {
          return jsonResponse({ count: 1, next: null, results: [selectedAsset] });
        }
        if (path === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["stream-user"], 201);
        }
        if (path === "/api/v1/users/connection-token/") {
          return jsonResponse({
            id: "connection-token-main",
            value: "long-password-for-wrapping",
            date_expired: "2026/09/20 14:47:23 +0800"
          }, 201);
        }
        if (path === "/api/v1/users/connection-token/connection-token-main/client-url/") {
          return jsonResponse({
            url: jmsUrl({
              id: "fe30d02b-234d-4b64-b05c-bc603f61e43b",
              value: "long-password-for-wrapping",
              token: { id: "fe30d02b-234d-4b64-b05c-bc603f61e43b", value: "long-password-for-wrapping" },
              endpoint: { host: "jumpserver.narrow-screen.example.test", port: 33061 }
            })
          });
        }
        return jsonResponse({ detail: `Unexpected request: ${path}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "直播业务库"
      ],
      { from: "node" }
    );

    const output = stdout.join("");

    expect(stderr).toEqual([]);
    expect(output).toContain("│ 连接命令行");
    expect(output).not.toContain("\n连接命令行\n");
    for (const line of output.trimEnd().split("\n")) {
      expect(displayWidthForTest(line), line).toBeLessThanOrEqual(58);
    }
  });

  it("enables reusable database tokens with --reusable", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    let tokenCreateBody: string | undefined;
    const selectedAsset = {
      id: "database-1",
      name: "prod-main-db",
      address: "10.0.0.10",
      protocols: [{ name: "mysql", port: 3306 }]
    };

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      databaseAssetSelect: async () => [selectedAsset],
      fetcher: (async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/api/v1/perms/users/self/assets/") {
          return jsonResponse({ count: 1, next: null, results: [selectedAsset] });
        }
        if (path === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["main-user"], 201);
        }
        if (path === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-main", value: "main-password" }, 201);
        }
        if (path === "/api/v1/users/connection-token/connection-token-main/client-url/") {
          return jsonResponse({
            url: jmsUrl({
              id: "connection-token-main",
              value: "main-password",
              token: { id: "connection-token-main", value: "main-password" },
              endpoint: { host: "jumpserver.example.test", port: 33061 }
            })
          });
        }
        return jsonResponse({ detail: `Unexpected request: ${path}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-main",
        "--reusable"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      connect_options: {
        reusable: true
      }
    });
    expect(stdout.join("")).toContain("│ 开启复用");
    expect(stdout.join("")).toContain("是");
  });

  it("can confirm reusable database tokens interactively when no reusable flag is passed", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const confirmations: Array<{ message: string; initialValue: boolean | undefined }> = [];
    let tokenCreateBody: string | undefined;
    const selectedAsset = {
      id: "database-1",
      name: "prod-main-db",
      address: "10.0.0.10",
      protocols: [{ name: "mysql", port: 3306 }]
    };

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      confirm: async (message, initialValue) => {
        confirmations.push({ message, initialValue });
        return true;
      },
      databaseAssetSelect: async () => [selectedAsset],
      fetcher: (async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/api/v1/perms/users/self/assets/") {
          return jsonResponse({ count: 1, next: null, results: [selectedAsset] });
        }
        if (path === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["main-user"], 201);
        }
        if (path === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-main", value: "main-password" }, 201);
        }
        if (path === "/api/v1/users/connection-token/connection-token-main/client-url/") {
          return jsonResponse({
            url: jmsUrl({
              id: "connection-token-main",
              value: "main-password",
              token: { id: "connection-token-main", value: "main-password" },
              endpoint: { host: "jumpserver.example.test", port: 33061 }
            })
          });
        }
        return jsonResponse({ detail: `Unexpected request: ${path}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-main"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(confirmations).toEqual([{ message: "是否开启复用", initialValue: false }]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      connect_options: {
        reusable: true
      }
    });
    expect(stdout.join("")).toContain("│ 开启复用");
    expect(stdout.join("")).toContain("是");
  });

  it("prints only DSN lines for selected database tokens with --dsn", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const selectedAssets = [
      {
        id: "database-1",
        name: "prod-main-db",
        address: "10.0.0.10",
        protocols: [{ name: "mysql", port: 3306 }]
      },
      {
        id: "database-2",
        name: "prod-report-db",
        address: "10.0.0.11",
        protocols: [{ name: "mysql", port: 3306 }]
      }
    ];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      databaseAssetSelect: async () => selectedAssets,
      fetcher: (async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/api/v1/perms/users/self/assets/") {
          return jsonResponse({ count: selectedAssets.length, results: selectedAssets });
        }
        if (path === "/api/v1/accounts/accounts/username-suggestions/") {
          const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { assets?: string[] };
          return jsonResponse([body.assets?.[0] === "database-1" ? "main-user" : "report-user"], 201);
        }
        if (path === "/api/v1/users/connection-token/") {
          const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { asset?: string };
          const suffix = body.asset === "database-1" ? "main" : "report";
          return jsonResponse({ id: `connection-token-${suffix}`, value: `${suffix}-password` }, 201);
        }
        if (path === "/api/v1/users/connection-token/connection-token-main/client-url/") {
          return jsonResponse({
            url: jmsUrl({
              id: "connection-token-main",
              value: "main-password",
              token: { id: "connection-token-main", value: "main-password" },
              endpoint: { host: "jumpserver.example.test", port: 33061 }
            })
          });
        }
        if (path === "/api/v1/users/connection-token/connection-token-report/client-url/") {
          return jsonResponse({
            url: jmsUrl({
              id: "connection-token-report",
              value: "report-password",
              token: { id: "connection-token-report", value: "report-password" },
              endpoint: { host: "jumpserver.example.test", port: 33062 }
            })
          });
        }
        return jsonResponse({ detail: `Unexpected request: ${path}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-*",
        "--dsn"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toBe(
      [
        "mysql://connection-token-main:main-password@jumpserver.example.test:33061/",
        "mysql://connection-token-report:report-password@jumpserver.example.test:33062/",
        ""
      ].join("\n")
    );
    expect(stdout.join("")).not.toContain("asset_id");
    expect(stdout.join("")).not.toContain("jms://");
  });

  it("prints the raw jms URL for database tokens only when requested", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async (input) => {
        const path = new URL(String(input)).pathname;
        if (path === "/api/v1/perms/users/self/assets/") {
          return jsonResponse({
            count: 1,
            results: [
              {
                id: "database-1",
                name: "prod-main-db",
                address: "10.0.0.10",
                protocols: [{ name: "mysql", port: 3306 }]
              }
            ]
          });
        }
        if (path === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["prod-user"], 201);
        }
        if (path === "/api/v1/users/connection-token/") {
          return jsonResponse({ id: "connection-token-raw", value: "raw-password" }, 201);
        }
        if (path === "/api/v1/users/connection-token/connection-token-raw/client-url/") {
          return jsonResponse({ url: "jms://raw-client-url" });
        }
        return jsonResponse({ detail: `Unexpected request: ${path}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-main",
        "--jms-url"
      ],
      { from: "node" }
    );

    const output = stdout.join("");
    expect(stderr).toEqual([]);
    expect(output).toContain("JMS 连接地址");
    expect(output).toContain("jms://raw-client-url");
  });

  it("submits terminal database multi-select without a confirmation prompt", async () => {
    const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");

    expect(source).toContain("clackMultiselect<DatabaseAsset | DatabaseAssetNavigationChoice>");
    expect(source).not.toContain("完成选择");
    expect(source).not.toContain('message: "下一步"');
  });

  it("clears submitted terminal prompt display before printing database token data", async () => {
    const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");

    expect(source).toContain("clearSubmittedPromptDisplay(processStderr");
    expect(source).toMatch(/selectDatabaseAssetsWithClack[\s\S]+clearSubmittedPromptDisplay\(processStderr/);
    expect(source).toMatch(/confirmFromTerminal[\s\S]+clearSubmittedPromptDisplay\(processStderr/);
  });

  it("uses a single matching database asset without opening the asset selector", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const assetRequestUrls: string[] = [];
    let tokenCreateBody: string | undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      databaseAssetSelect: async () => {
        throw new Error("database asset selector should not run for a single matching asset");
      },
      select: async () => {
        throw new Error("select prompt should not run for a single matching asset and username");
      },
      fetcher: (async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/v1/perms/users/self/assets/") {
          assetRequestUrls.push(url.href);
          return jsonResponse({
            count: 1,
            next: null,
            results: [
              {
                id: "database-1",
                name: "single-main-db",
                address: "10.0.0.10",
                protocols: [{ name: "mysql", port: 3306 }]
              }
            ]
          });
        }
        if (url.pathname === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["single-user"], 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-single", date_expired: "2026-06-12T10:00:00+08:00" }, 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/connection-token-single/client-url/") {
          return jsonResponse({ url: "jms://connect/single" });
        }
        return jsonResponse({ detail: `Unexpected request: ${url.pathname}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "single-main"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(assetRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=single-main&limit=20"
    ]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      asset: "database-1",
      account: "single-main-db-账号",
      input_username: "single-user"
    });
    expect(stdout.join("")).toContain("single-main-db (10.0.0.10)");
  });

  it("uses keyboard-style selection when the token command matches multiple assets or usernames", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const selections: Array<{ message: string; labels: string[] }> = [];
    let tokenCreateBody: string | undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      prompt: async () => {
        throw new Error("numeric prompt should not be used for list selection");
      },
      select: async (message, choices) => {
        selections.push({
          message,
          labels: choices.map((choice) => choice.label)
        });
        return choices[1]!.value;
      },
      fetcher: (async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/api/v1/perms/users/self/assets/") {
          return jsonResponse({
            count: 2,
            results: [
              {
                id: "database-1",
                name: "prod-main-db",
                address: "10.0.0.10",
                protocols: [{ name: "mysql", port: 3306 }]
              },
              {
                id: "database-2",
                name: "prod-report-db",
                address: "10.0.0.11",
                protocols: [{ name: "mysql", port: 3306 }]
              }
            ]
          });
        }
        if (path === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["report-reader", "report-account"], 201);
        }
        if (path === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-2", date_expired: "2026-06-12T10:00:00+08:00" }, 201);
        }
        if (path === "/api/v1/users/connection-token/connection-token-2/client-url/") {
          return jsonResponse({ url: "jms://connect/report" });
        }
        return jsonResponse({ detail: `Unexpected request: ${path}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-*"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(selections).toEqual([
      {
        message: "匹配到多个数据库实例",
        labels: ["prod-main-db (10.0.0.10)", "prod-report-db (10.0.0.11)"]
      },
      {
        message: "请选择数据库用户名",
        labels: ["report-reader", "report-account"]
      }
    ]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      asset: "database-2",
      account: "prod-report-db-账号",
      input_username: "report-account"
    });
  });

  it("loads more database asset pages from the token selector", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const assetRequestUrls: string[] = [];
    const selections: Array<{ message: string; labels: string[] }> = [];
    let tokenCreateBody: string | undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      select: async (message, choices) => {
        selections.push({
          message,
          labels: choices.map((choice) => choice.label)
        });
        return choices.find((choice) => choice.label.startsWith("加载更多"))?.value ?? choices.at(-1)!.value;
      },
      fetcher: (async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/v1/perms/users/self/assets/") {
          assetRequestUrls.push(url.href);
          const offset = url.searchParams.get("offset") ?? "0";
          if (offset === "0") {
            return jsonResponse({
              count: 3,
              results: [
                {
                  id: "database-1",
                  name: "prod-main-db",
                  address: "10.0.0.10",
                  protocols: [{ name: "mysql", port: 3306 }]
                },
                {
                  id: "database-2",
                  name: "prod-report-db",
                  address: "10.0.0.11",
                  protocols: [{ name: "mysql", port: 3306 }]
                }
              ]
            });
          }
          return jsonResponse({
            count: 3,
            results: [
              {
                id: "database-3",
                name: "prod-audit-db",
                address: "10.0.0.12",
                protocols: [{ name: "mysql", port: 3306 }]
              }
            ]
          });
        }
        if (url.pathname === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["audit-account"], 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-3", date_expired: "2026-06-12T10:00:00+08:00" }, 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/connection-token-3/client-url/") {
          return jsonResponse({ url: "jms://connect/audit" });
        }
        return jsonResponse({ detail: `Unexpected request: ${url.pathname}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-*",
        "--limit",
        "2"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(assetRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=prod-&limit=2",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=prod-&limit=2&offset=2"
    ]);
    expect(selections).toEqual([
      {
        message: "匹配到多个数据库实例",
        labels: [
          "prod-main-db (10.0.0.10)",
          "prod-report-db (10.0.0.11)",
          "加载更多...（已加载 2/3）"
        ]
      },
      {
        message: "匹配到多个数据库实例",
        labels: [
          "prod-main-db (10.0.0.10)",
          "prod-report-db (10.0.0.11)",
          "prod-audit-db (10.0.0.12)"
        ]
      }
    ]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      asset: "database-3",
      account: "prod-audit-db-账号",
      input_username: "audit-account"
    });
    expect(stdout.join("")).toContain("│ 名称");
    expect(stdout.join("")).not.toContain("数据库 连接信息");
  });

  it("loads database token assets from the current user's permitted database assets", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const assetRequestUrls: string[] = [];
    let tokenCreateBody: string | undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      select: async (_message, choices) => choices[0]!.value,
      fetcher: (async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/v1/perms/users/self/assets/") {
          assetRequestUrls.push(url.href);
          return jsonResponse({
            count: 40,
            next: "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&limit=10&offset=10",
            results: [
              {
                id: "database-1",
                name: "permed-main-db",
                address: "10.0.0.10",
                category: { value: "database", label: "数据库" },
                protocols: [{ name: "mysql", port: 3306 }]
              }
            ]
          });
        }
        if (url.pathname === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["permed-account"], 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-permed", date_expired: "2026-06-12T10:00:00+08:00" }, 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/connection-token-permed/client-url/") {
          return jsonResponse({ url: "jms://connect/permed" });
        }
        return jsonResponse({ detail: `Unexpected request: ${url.pathname}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "permed",
        "--limit",
        "10"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(assetRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=permed&limit=10"
    ]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      asset: "database-1",
      input_username: "permed-account"
    });
    expect(stdout.join("")).toContain("│ 名称");
    expect(stdout.join("")).not.toContain("数据库 连接信息");
  });

  it("lets the database asset selector search and request later pages", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const assetRequestUrls: string[] = [];
    let tokenCreateBody: string | undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      select: async () => {
        throw new Error("generic select should not choose database assets");
      },
      databaseAssetSelect: async (_message, input) => {
        await input.fetchPage(input.initialSearch, 0);
        await input.fetchPage("billing", 0);
        const selectedPage = await input.fetchPage("billing", 20);
        return [selectedPage.items[0]!];
      },
      fetcher: (async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/v1/perms/users/self/assets/") {
          assetRequestUrls.push(url.href);
          const search = url.searchParams.get("search");
          const offset = url.searchParams.get("offset") ?? "0";
          return jsonResponse({
            count: 40,
            next:
              offset === "0"
                ? "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=billing&limit=20&offset=20"
                : null,
            results: [
              {
                id: search === "billing" && offset === "20" ? "database-billing-page-2" : "database-first-page",
                name: search === "billing" && offset === "20" ? "billing-page-2-db" : "first-page-db",
                address: "10.0.0.20",
                protocols: [{ name: "mysql", port: 3306 }]
              }
            ]
          });
        }
        if (url.pathname === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["billing-account"], 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-search", date_expired: "2026-06-12T10:00:00+08:00" }, 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/connection-token-search/client-url/") {
          return jsonResponse({ url: "jms://connect/search" });
        }
        return jsonResponse({ detail: `Unexpected request: ${url.pathname}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(assetRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=prod&limit=20",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=billing&limit=20",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=billing&limit=20&offset=20"
    ]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      asset: "database-billing-page-2",
      input_username: "billing-account"
    });
    expect(stdout.join("")).toContain("│ 名称");
    expect(stdout.join("")).not.toContain("数据库 连接信息");
  });

  it("offers to load another database asset page when a full page has no reliable total", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const assetRequestUrls: string[] = [];
    const selections: Array<{ message: string; labels: string[] }> = [];
    let tokenCreateBody: string | undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      select: async (message, choices) => {
        selections.push({
          message,
          labels: choices.map((choice) => choice.label)
        });
        return choices.find((choice) => choice.label.startsWith("加载更多"))?.value ?? choices.at(-1)!.value;
      },
      fetcher: (async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/v1/perms/users/self/assets/") {
          assetRequestUrls.push(url.href);
          const offset = url.searchParams.get("offset") ?? "0";
          if (offset === "0") {
            return jsonResponse({
              count: 2,
              next: null,
              results: [
                {
                  id: "database-1",
                  name: "prod-main-db",
                  address: "10.0.0.10",
                  protocols: [{ name: "mysql", port: 3306 }]
                },
                {
                  id: "database-2",
                  name: "prod-report-db",
                  address: "10.0.0.11",
                  protocols: [{ name: "mysql", port: 3306 }]
                }
              ]
            });
          }
          return jsonResponse({
            count: 1,
            next: null,
            results: [
              {
                id: "database-3",
                name: "prod-audit-db",
                address: "10.0.0.12",
                protocols: [{ name: "mysql", port: 3306 }]
              }
            ]
          });
        }
        if (url.pathname === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["audit-account"], 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-4", date_expired: "2026-06-12T10:00:00+08:00" }, 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/connection-token-4/client-url/") {
          return jsonResponse({ url: "jms://connect/audit" });
        }
        return jsonResponse({ detail: `Unexpected request: ${url.pathname}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token",
        "prod-*",
        "--limit",
        "2"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(assetRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=prod-&limit=2",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&search=prod-&limit=2&offset=2"
    ]);
    expect(selections[0]?.labels).toEqual([
      "prod-main-db (10.0.0.10)",
      "prod-report-db (10.0.0.11)",
      "加载更多...（已加载 2）"
    ]);
    expect(selections.at(-1)?.labels).toEqual([
      "prod-main-db (10.0.0.10)",
      "prod-report-db (10.0.0.11)",
      "prod-audit-db (10.0.0.12)"
    ]);
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      asset: "database-3",
      input_username: "audit-account"
    });
    expect(stdout.join("")).toContain("│ 名称");
    expect(stdout.join("")).not.toContain("数据库 连接信息");
  });

  it("loads more after the server caps permitted database assets below the requested limit", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const assetRequestUrls: string[] = [];
    const selections: Array<{ message: string; labels: string[] }> = [];
    let tokenCreateBody: string | undefined;

    const firstPageAssets = Array.from({ length: 10 }, (_, index) => ({
      id: `database-${index + 1}`,
      name: `prod-db-${index + 1}`,
      address: `10.0.0.${index + 1}`,
      protocols: [{ name: "mysql", port: 3306 }]
    }));

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      select: async (message, choices) => {
        selections.push({
          message,
          labels: choices.map((choice) => choice.label)
        });
        return choices.find((choice) => choice.label.startsWith("加载更多"))?.value ?? choices.at(-1)!.value;
      },
      fetcher: (async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname === "/api/v1/perms/users/self/assets/") {
          assetRequestUrls.push(url.href);
          const offset = url.searchParams.get("offset") ?? "0";
          return jsonResponse({
            count: 40,
            next:
              offset === "0"
                ? "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&limit=20&offset=10"
                : null,
            results: offset === "0" ? firstPageAssets : []
          });
        }
        if (url.pathname === "/api/v1/accounts/accounts/username-suggestions/") {
          return jsonResponse(["capped-account"], 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/") {
          tokenCreateBody = typeof init?.body === "string" ? init.body : undefined;
          return jsonResponse({ id: "connection-token-5", date_expired: "2026-06-12T10:00:00+08:00" }, 201);
        }
        if (url.pathname === "/api/v1/users/connection-token/connection-token-5/client-url/") {
          return jsonResponse({ url: "jms://connect/capped" });
        }
        return jsonResponse({ detail: `Unexpected request: ${url.pathname}` }, 404);
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "auth-token",
        "assets",
        "databases",
        "token"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(assetRequestUrls).toEqual([
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&limit=20",
      "https://jumpserver.example.test/api/v1/perms/users/self/assets/?category=database&limit=20&offset=10"
    ]);
    expect(selections[0]?.labels.at(-1)).toBe("加载更多...（已加载 10/40）");
    expect(selections.at(-1)?.labels).not.toContain("加载更多...（已加载 10/40）");
    expect(JSON.parse(tokenCreateBody ?? "{}")).toMatchObject({
      asset: "database-10",
      input_username: "capped-account"
    });
    expect(stdout.join("")).toContain("│ 名称");
    expect(stdout.join("")).not.toContain("数据库 连接信息");
  });

  it("prints a human-friendly dry-run request plan for an operation command", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const program = buildTestProgram({
      now: () => new Date("2026-06-10T09:00:00Z"),
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value)
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--access-key-id",
        "key",
        "--access-key-secret",
        "secret",
        "--org",
        "00000000-0000-0000-0000-000000000002",
        "assets",
        "favorite-assets",
        "read",
        "--path",
        "id=asset-1",
        "--query",
        "search=prod",
        "--dry-run"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toBe(
      [
        "请求预览",
        "方法: GET",
        "地址: https://jumpserver.example.test/api/v1/assets/favorite-assets/asset-1/?search=prod",
        "认证: Access Key",
        "组织: 00000000-0000-0000-0000-000000000002",
        "请求体: 无",
        ""
      ].join("\n")
    );
    expect(stdout.join("")).not.toContain("Signature");
    expect(stdout.join("")).not.toContain("secret");
  });

  it("supports limit and offset pagination shortcuts for paginated operations", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value)
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "token",
        "assets",
        "match",
        "--limit",
        "20",
        "--offset",
        "40",
        "--dry-run"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toContain(
      "地址: https://jumpserver.example.test/api/v1/assets/assets/suggestions/?limit=20&offset=40"
    );
  });

  it("rejects pagination shortcuts for operations that do not declare pagination parameters", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;
    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value)
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "token",
        "users",
        "profile",
        "read",
        "--limit",
        "20",
        "--dry-run"
      ],
      { from: "node" }
    );

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toContain("users_profile_read does not support --limit");
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });

  it("overwrites auth-managed headers case-insensitively before sending Access Key requests", async () => {
    let capturedInit: RequestInit | undefined;
    const program = buildTestProgram({
      now: () => new Date("2026-06-10T09:00:00Z"),
      stdout: () => undefined,
      stderr: () => undefined,
      fetcher: (async (_input, init) => {
        capturedInit = init;
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--access-key-id",
        "key",
        "--access-key-secret",
        "secret",
        "--org",
        "00000000-0000-0000-0000-000000000002",
        "users",
        "profile",
        "read",
        "--header",
        "accept=text/plain",
        "--header",
        "date=Wed, 01 Jan 2020 00:00:00 GMT",
        "--header",
        "authorization=bad",
        "--header",
        "x-jms-org=bad"
      ],
      { from: "node" }
    );

    const headers = capturedInit?.headers as Record<string, string>;
    expect(Object.keys(headers).filter((key) => key.toLowerCase() === "accept")).toEqual(["Accept"]);
    expect(Object.keys(headers).filter((key) => key.toLowerCase() === "date")).toEqual(["Date"]);
    expect(Object.keys(headers).filter((key) => key.toLowerCase() === "authorization")).toEqual(["Authorization"]);
    expect(Object.keys(headers).filter((key) => key.toLowerCase() === "x-jms-org")).toEqual(["X-JMS-ORG"]);
    expect(headers.Accept).toBe("application/json");
    expect(headers.Date).toBe("Wed, 10 Jun 2026 09:00:00 GMT");
    expect(headers.Authorization).toContain('Signature keyId="key"');
    expect(headers["X-JMS-ORG"]).toBe("00000000-0000-0000-0000-000000000002");
  });

  it("prints a concise error when a JSON content type has malformed JSON", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async () =>
        new Response("not-json", {
          status: 502,
          statusText: "Bad Gateway",
          headers: { "content-type": "application/json" }
        })) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "token",
        "users",
        "profile",
        "read"
      ],
      { from: "node" }
    );

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toBe("请求失败: not-json\n");
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });

  it("prints object-array JSON responses as an ASCII table", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const payload = [
      {
        id: "e233e27d-957a-4087-85c4-6d1e6a02ee5d",
        name: "10.0.16.99",
        address: "tenant-2100132197-cn-shanghai-metainfra.bytehouse.ivolces.com",
        comment: "",
        domain: null,
        platform: { id: 1, name: "Linux" },
        nodes: [{ id: "node-1", name: "主控集群" }],
        labels: [],
        protocols: [
          { name: "ssh", port: 22 },
          { name: "sftp", port: 22 }
        ],
        nodes_display: ["/小鹅通/主控集群"],
        auto_config: { ping_enabled: true },
        created_by: "admin@example.test",
        date_created: "2026/06/10 09:00:00 +0800",
        is_active: true
      },
      {
        id: "de8f7f40-7863-4838-bb22-530ac8fdd287",
        name: "db-01",
        address: "10.0.16.100",
        comment: "hidden",
        domain: null,
        platform: { id: 17, name: "MySQL" },
        protocols: [{ name: "mysql", port: 3306 }],
        nodes_display: ["/小鹅通/DB/字节"],
        is_active: false
      }
    ];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" }
        })) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "token",
        "assets",
        "match"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toContain("| id                                   | name       | address");
    expect(stdout.join("")).toContain("| e233e27d-957a-4087-85c4-6d1e6a02ee5d | 10.0.16.99");
    expect(stdout.join("")).toContain("tenant-2100132197-cn-shanghai...");
    expect(stdout.join("")).toContain("| de8f7f40-7863-4838-bb22-530ac8fdd287 | db-01");
    expect(stdout.join("")).toContain("| false  |");
    expect(stdout.join("")).toContain("2 rows in set");
    expect(stdout.join("")).not.toContain("\"id\"");
    expect(stdout.join("")).not.toContain("comment");
    expect(stdout.join("")).not.toContain("nodes_display");
    expect(stdout.join("")).not.toContain("auto_config");
    expect(stdout.join("")).not.toContain("date_created");
    expect(stdout.join("")).not.toContain("admin@example.test");
  });

  it("prints raw JSON for operation responses when requested", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const payload = [
      {
        id: "asset-1",
        name: "10.0.16.99",
        comment: "raw comment",
        auto_config: { ping_enabled: true }
      }
    ];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" }
        })) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "token",
        "assets",
        "match",
        "--json"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toBe(`${JSON.stringify(payload, null, 2)}\n`);
  });

  it("prints paginated results as an ASCII table without truncating rows", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const payload = {
      count: 6,
      results: Array.from({ length: 6 }, (_, index) => ({
        id: `asset-${index + 1}`,
        name: `资产 ${index + 1}`,
        address: `10.0.0.${index + 1}`
      }))
    };

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" }
        })) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "https://jumpserver.example.test",
        "--token",
        "token",
        "assets",
        "favorite-assets",
        "list"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toContain("count: 6\n");
    expect(stdout.join("")).toContain("| asset-6 | 资产 6 | 10.0.0.6 |");
    expect(stdout.join("")).toContain("asset-6");
    expect(stdout.join("")).toContain("6 rows in set");
    expect(stdout.join("")).not.toContain("... 还有");
    expect(stdout.join("")).not.toContain("\"results\"");
  });

  it("supports auth token for username/password authentication", async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;
    const stdout: string[] = [];
    const stderr: string[] = [];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
        return new Response(JSON.stringify({ token: "auth-token" }), {
          status: 201,
          headers: { "content-type": "application/json" }
        });
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "auth",
        "token",
        "--host",
        "jumpserver.auth-token.test",
        "--username",
        "alice",
        "--password",
        "secret",
        "--token-only"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(capturedUrl).toBe("https://jumpserver.auth-token.test/api/v1/authentication/auth/");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.body).toBe('{"username":"alice","password":"secret"}');
    expect(stdout.join("")).toBe("auth-token\n");
  });

  it("supports deeper nested hierarchical operation commands", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value)
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "--host",
        "jumpserver.example.test",
        "--token",
        "token",
        "authentication",
        "connection-token",
        "client-url",
        "read",
        "--path",
        "id=token-1",
        "--dry-run"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toBe(
      [
        "请求预览",
        "方法: GET",
        "地址: https://jumpserver.example.test/api/v1/authentication/connection-token/token-1/client-url/",
        "认证: Bearer Token",
        "请求体: 无",
        ""
      ].join("\n")
    );
  });

  it("prints a concise error for auth token failures", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const previousExitCode = process.exitCode;
    process.exitCode = undefined;

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async () =>
        new Response(JSON.stringify({ detail: "用户名或密码错误" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "content-type": "application/json" }
        })) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "auth",
        "token",
        "--host",
        "jumpserver.auth-token.test",
        "--username",
        "alice",
        "--password",
        "bad",
        "--token-only"
      ],
      { from: "node" }
    );

    expect(stdout).toEqual([]);
    expect(stderr.join("")).toBe("认证失败: 用户名或密码错误\n");
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExitCode;
  });

  it("supports auth access-key as a first-class authentication check", async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;
    const stdout: string[] = [];
    const stderr: string[] = [];

    const program = buildTestProgram({
      now: () => new Date("2026-06-10T09:00:00Z"),
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      fetcher: (async (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
        return new Response(JSON.stringify({ username: "agent" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }) as typeof fetch
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "auth",
        "access-key",
        "--host",
        "jumpserver.auth-key.test",
        "--access-key-id",
        "key",
        "--access-key-secret",
        "secret",
        "--org",
        "00000000-0000-0000-0000-000000000002"
      ],
      { from: "node" }
    );

    const headers = capturedInit?.headers as Record<string, string>;
    expect(stderr).toEqual([]);
    expect(capturedUrl).toBe("https://jumpserver.auth-key.test/api/v1/users/profile/");
    expect(capturedInit?.method).toBe("GET");
    expect(headers.Accept).toBe("application/json");
    expect(headers.Date).toBe("Wed, 10 Jun 2026 09:00:00 GMT");
    expect(headers.Authorization).toContain('Signature keyId="key"');
    expect(headers["X-JMS-ORG"]).toBe("00000000-0000-0000-0000-000000000002");
    expect(stdout.join("")).toBe("认证完成\n");
  });

  it("prints a human-friendly dry-run for auth access-key", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const program = buildTestProgram({
      now: () => new Date("2026-06-10T09:00:00Z"),
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value)
    });

    await program.parseAsync(
      [
        "node",
        "jms",
        "auth",
        "access-key",
        "--host",
        "jumpserver.auth-key.test",
        "--access-key-id",
        "key",
        "--access-key-secret",
        "secret",
        "--dry-run"
      ],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toBe(
      [
        "请求预览",
        "方法: GET",
        "地址: https://jumpserver.auth-key.test/api/v1/users/profile/",
        "认证: Access Key",
        "请求体: 无",
        ""
      ].join("\n")
    );
    expect(stdout.join("")).not.toContain("Signature");
  });

  it("persists access-key auth settings for later commands", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jms-config-"));
    const configPath = join(directory, "config.json");
    try {
      const authStdout: string[] = [];
      const authStderr: string[] = [];
      const authProgram = buildTestProgram({
        configPath,
        now: () => new Date("2026-06-10T09:00:00Z"),
        stdout: (value) => authStdout.push(value),
        stderr: (value) => authStderr.push(value),
        fetcher: (async () =>
          new Response(JSON.stringify({ username: "agent" }), {
            status: 200,
            headers: { "content-type": "application/json" }
          })) as typeof fetch
      } as Parameters<typeof buildProgram>[0]);

      await authProgram.parseAsync(
        [
          "node",
          "jms",
          "auth",
          "access-key",
          "--host",
          "jumpserver.persisted.test",
          "--access-key-id",
          "saved-key",
          "--access-key-secret",
          "saved-secret",
          "--org",
          "00000000-0000-0000-0000-000000000002"
        ],
        { from: "node" }
      );

      expect(authStderr).toEqual([]);
      expect(authStdout.join("")).toBe("认证完成\n");
      expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
        host: "jumpserver.persisted.test",
        accessKeyId: "saved-key",
        accessKeySecret: "saved-secret",
        org: "00000000-0000-0000-0000-000000000002"
      });

      const stdout: string[] = [];
      const stderr: string[] = [];
      const program = buildTestProgram({
        configPath,
        now: () => new Date("2026-06-10T09:00:00Z"),
        stdout: (value) => stdout.push(value),
        stderr: (value) => stderr.push(value)
      } as Parameters<typeof buildProgram>[0]);

      await program.parseAsync(["node", "jms", "users", "profile", "read", "--dry-run"], { from: "node" });

      expect(stderr).toEqual([]);
      expect(stdout.join("")).toBe(
        [
          "请求预览",
          "方法: GET",
          "地址: https://jumpserver.persisted.test/api/v1/users/profile/",
          "认证: Access Key",
          "组织: 00000000-0000-0000-0000-000000000002",
          "请求体: 无",
          ""
        ].join("\n")
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("persists token auth settings for later commands", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jms-config-"));
    const configPath = join(directory, "config.json");
    try {
      const authStdout: string[] = [];
      const authStderr: string[] = [];
      const authProgram = buildTestProgram({
        configPath,
        stdout: (value) => authStdout.push(value),
        stderr: (value) => authStderr.push(value),
        fetcher: (async () =>
          new Response(JSON.stringify({ token: "saved-token" }), {
            status: 201,
            headers: { "content-type": "application/json" }
          })) as typeof fetch
      } as Parameters<typeof buildProgram>[0]);

      await authProgram.parseAsync(
        [
          "node",
          "jms",
          "auth",
          "token",
          "--host",
          "jumpserver.token.test",
          "--username",
          "alice",
          "--password",
          "secret"
        ],
        { from: "node" }
      );

      expect(authStderr).toEqual([]);
      expect(authStdout.join("")).toBe("认证完成\n");
      expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
        host: "jumpserver.token.test",
        token: "saved-token"
      });

      const stdout: string[] = [];
      const stderr: string[] = [];
      const program = buildTestProgram({
        configPath,
        stdout: (value) => stdout.push(value),
        stderr: (value) => stderr.push(value)
      } as Parameters<typeof buildProgram>[0]);

      await program.parseAsync(["node", "jms", "users", "profile", "read", "--dry-run"], { from: "node" });

      expect(stderr).toEqual([]);
      expect(stdout.join("")).toBe(
        [
          "请求预览",
          "方法: GET",
          "地址: https://jumpserver.token.test/api/v1/users/profile/",
          "认证: Bearer Token",
          "请求体: 无",
          ""
        ].join("\n")
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("prompts for missing auth token credentials in interactive mode", async () => {
    const prompts: string[] = [];
    let capturedInit: RequestInit | undefined;
    const stdout: string[] = [];
    const stderr: string[] = [];

    const program = buildTestProgram({
      stdout: (value) => stdout.push(value),
      stderr: (value) => stderr.push(value),
      prompt: async (message: string) => {
        prompts.push(message);
        return message.startsWith("Username") ? "bob" : "hunter2";
      },
      fetcher: (async (_input, init) => {
        capturedInit = init;
        return new Response(JSON.stringify({ token: "interactive-token" }), {
          status: 201,
          headers: { "content-type": "application/json" }
        });
      }) as typeof fetch
    } as Parameters<typeof buildProgram>[0]);

    await program.parseAsync(
      ["node", "jms", "--host", "https://jumpserver.example.test", "auth", "token"],
      { from: "node" }
    );

    expect(stderr).toEqual([]);
    expect(prompts).toEqual(["Username: ", "Password: "]);
    expect(capturedInit?.body).toBe('{"username":"bob","password":"hunter2"}');
    expect(stdout.join("")).toBe("认证完成\n");
  });
});

function findCommandPath(
  command: ReturnType<typeof buildProgram>,
  path: string[]
): ReturnType<typeof buildProgram> | undefined {
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

function optionFlags(command: ReturnType<typeof buildProgram> | undefined): string[] {
  return command?.options.map((option) => option.flags) ?? [];
}

function findOperationForTest(operations: ReturnType<typeof loadOperations>, operationId: string) {
  const operation = operations.find((candidate) => candidate.operationId === operationId);
  expect(operation).toBeTruthy();
  return operation!;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function jmsUrl(payload: unknown): string {
  return `jms://${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

function displayWidthForTest(value: string): number {
  let width = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    width += (
      (codePoint >= 0x1100 && codePoint <= 0x115f) ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    )
      ? 2
      : 1;
  }
  return width;
}
