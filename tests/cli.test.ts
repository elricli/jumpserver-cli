import { describe, expect, it } from "vitest";
import { buildProgram, isDirectCliInvocation, operationCommandPath, readPackageVersion } from "../src/cli.js";
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

  it("prints resource-oriented descriptions in group help", () => {
    const program = buildTestProgram();
    const assets = findCommandPath(program, ["assets"]);
    const help = assets?.helpInformation() ?? "";

    expect(help).toContain("Asset inventory commands");
    expect(help).toContain("assets                       Asset records");
    expect(help).toContain("databases                    Database assets");
    expect(help).toContain("favorite-assets              Favorite assets");
    expect(help).toContain("protocols                    Asset protocols");
    expect(help).not.toContain("Work with assets");
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
