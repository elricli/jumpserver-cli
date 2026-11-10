import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProgram } from "../src/cli.js";
import { buildSignedHeaders } from "../src/auth.js";

const host = "https://jumpserver.example.test";
const now = new Date("2026-11-10T09:00:00Z");
const assets = Array.from({ length: 25 }, (_, index) => ({ id: `asset-${index}`, name: `prod-${index}` }));
const assetCommands = [
  { command: ["assets"], path: "/api/v1/assets/assets/" },
  { command: ["assets", "databases"], path: "/api/v1/assets/databases/" },
  { command: ["assets", "hosts"], path: "/api/v1/assets/hosts/" }
];
let configCounter = 0;

function testProgram(fetcher: typeof fetch) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const program = buildProgram({
    env: {},
    configPath: join(tmpdir(), `jms-pagination-${process.pid}-${configCounter++}.json`),
    now: () => now,
    stdout: (value) => stdout.push(value),
    stderr: (value) => stderr.push(value),
    fetcher
  });
  program.exitOverride();
  const run = (args: string[]) => program.parseAsync([
    "node", "jms", "--host", host, "--access-key-id", "test-key", "--access-key-secret", "test-secret", ...args
  ], { from: "node" });
  return { program, stdout, stderr, run };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

describe("asset list pagination", () => {
  it.each(assetCommands)("honors match --limit and --offset for $command", async ({ command, path }) => {
    const requests: URL[] = [];
    const { run, stdout, stderr } = testProgram((async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      // JumpServer slices suggestions before applying limit/offset pagination.
      const available = url.pathname.endsWith("/suggestions/") ? assets.slice(0, 10) : assets;
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 10);
      return json({ count: available.length, results: available.slice(offset, offset + limit) });
    }) as typeof fetch);

    await run([...command, "match", "--limit", "20", "--offset", "5", "--json"]);

    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout.join("").trim()).results).toEqual(assets.slice(5, 25));
    expect(requests.map((url) => url.pathname)).toEqual([path]);
  });

  it.each(assetCommands)("fetches all pages for match and list on $command", async ({ command, path }) => {
    for (const action of ["match", "list"]) {
      const requests: URL[] = [];
      const { run, stdout, stderr } = testProgram((async (input, init) => {
        const url = new URL(String(input));
        requests.push(url);
        expect(url.pathname).toBe(path);
        expect(url.searchParams.get("search")).toBe("prod");
        expect(url.searchParams.get("is_active")).toBe("true");
        expect(url.searchParams.get("limit")).toBe("20");
        expect(new Headers(init?.headers).get("x-test")).toBe("custom");
        expect(new Headers(init?.headers).get("authorization")).toBe(buildSignedHeaders({
          accessKeyId: "test-key", accessKeySecret: "test-secret", method: "GET",
          pathWithQuery: `${url.pathname}${url.search}`, now
        }).Authorization);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        // The server caps pages below the requested limit.
        const results = assets.slice(offset, offset + 10);
        return json({
          count: assets.length,
          next: offset + results.length < assets.length ? `?offset=${offset + results.length}` : null,
          previous: null,
          results
        });
      }) as typeof fetch);

      await run([...command, action, "--all", "--limit", "20", "--search", "prod", "--is-active", "true", "--header", "X-Test=custom", "--json"]);

      expect(stderr).toEqual([]);
      expect(requests.map((url) => Number(url.searchParams.get("offset") ?? 0))).toEqual([0, 10, 20]);
      expect(JSON.parse(stdout.join("").trim())).toEqual({ count: 25, next: null, previous: null, results: assets });
    }
  });

  it("keeps unpaginated match on the suggestions endpoint", async () => {
    const { run, stdout, stderr } = testProgram((async (input) => {
      expect(new URL(String(input)).pathname).toBe("/api/v1/assets/hosts/suggestions/");
      return json(assets.slice(0, 10));
    }) as typeof fetch);

    await run(["assets", "hosts", "match", "--json"]);

    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout.join("").trim())).toEqual(assets.slice(0, 10));
  });

  it("previews --all without fetching and defaults its page size", async () => {
    const { run, stdout, stderr } = testProgram((async () => {
      throw new Error("dry-run must not fetch");
    }) as typeof fetch);

    await run(["assets", "hosts", "match", "--all", "--dry-run"]);

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toContain(`${host}/api/v1/assets/hosts/?limit=100`);
    expect(stdout.join("")).toContain("分页: 获取所有页");
  });

  it("supports --all through api call and respects an initial offset", async () => {
    const offsets: number[] = [];
    const { run, stdout, stderr } = testProgram((async (input) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/assets/hosts/");
      const offset = Number(url.searchParams.get("offset") ?? 0);
      offsets.push(offset);
      return json({ count: assets.length, results: assets.slice(offset, offset + 10) });
    }) as typeof fetch);

    await run(["api", "call", "assets_hosts_match", "--all", "--offset", "5", "--json"]);

    expect(stderr).toEqual([]);
    expect(offsets).toEqual([5, 15]);
    expect(JSON.parse(stdout.join("").trim()).results).toEqual(assets.slice(5));
  });

  it("also supports --all on other paginated GET commands", async () => {
    const { run, stdout, stderr } = testProgram((async (input) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset") ?? 0);
      return json({ count: 2, next: offset === 0 ? "?offset=1" : null, results: [assets[offset]] });
    }) as typeof fetch);

    await run(["assets", "favorite-assets", "list", "--all"]);

    expect(stderr).toEqual([]);
    expect(stdout.join("")).toContain("2 rows in set");
    expect(stdout.join("")).toContain("asset-1");
  });

  it("rejects --all for unsupported operations through api call", async () => {
    const previousExitCode = process.exitCode;
    try {
      const { run, stdout, stderr } = testProgram((async () => {
        throw new Error("must not fetch");
      }) as typeof fetch);

      await run(["api", "call", "users_profile_read", "--all"]);

      expect(stdout).toEqual([]);
      expect(stderr.join("")).toContain("does not support --all");
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it("fails without printing partial success when a later page fails", async () => {
    const previousExitCode = process.exitCode;
    try {
      const { run, stdout, stderr } = testProgram((async (input) => {
        const offset = Number(new URL(String(input)).searchParams.get("offset") ?? 0);
        return offset === 0
          ? json({ count: 2, next: "?offset=1", results: [assets[0]] })
          : json({ detail: "permission denied" }, 403);
      }) as typeof fetch);

      await run(["assets", "hosts", "match", "--all"]);

      expect(stdout).toEqual([]);
      expect(stderr.join("")).toContain("permission denied");
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it.each(["0", "-1", "abc"])("rejects --all --limit %s before fetching", async (limit) => {
    const previousExitCode = process.exitCode;
    try {
      const { run, stdout, stderr } = testProgram((async () => {
        throw new Error("must not fetch");
      }) as typeof fetch);

      await run(["assets", "hosts", "match", "--all", "--limit", limit]);

      expect(stdout).toEqual([]);
      expect(stderr.join("")).toContain("--limit");
      expect(stderr.join("")).not.toContain("must not fetch");
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});
