import { spawnSync } from "node:child_process";
import {
  cp,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { ApiOperation } from "../src/openapi.js";
import {
  assessOperationCatalog,
  generateOperationCatalog
} from "../src/openapi-toolchain.js";

const temporaryDirectories: string[] = [];
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TSX_CLI = resolve(ROOT, "node_modules/tsx/dist/cli.mjs");

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("OpenAPI operation toolchain", () => {
  it("detects semantic catalog drift even when operation ids still match", () => {
    const source = [operationFixture()];
    const generated = structuredClone(source);
    generated[0]!.queryParameters[0]!.schema!.type = "integer";

    const comparison = assessOperationCatalog(source, generated);

    expect(comparison.status).toBe("out-of-sync");
    expect(comparison.differences).toEqual([
      expect.objectContaining({
        kind: "changed",
        operationId: "widgets_read",
        expected: expect.objectContaining({
          queryParameters: [{ name: "search", required: false, schema: { type: "string" } }]
        }),
        actual: expect.objectContaining({
          queryParameters: [{ name: "search", required: false, schema: { type: "integer" } }]
        })
      })
    ]);
  });

  it("reports an unchecked API catalog when the raw Swagger document is unavailable", () => {
    const comparison = assessOperationCatalog(undefined, [operationFixture()]);

    expect(comparison).toEqual({
      status: "not-checked",
      generatedOperationCount: 1,
      differences: []
    });
    expect(JSON.stringify(comparison)).not.toContain("100%");
  });

  it("replaces a generated catalog without leaving temporary output behind", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jumpserver-openapi-toolchain-"));
    temporaryDirectories.push(directory);
    const apiPath = join(directory, "api.json");
    const outputPath = join(directory, "generated-operations.ts");
    await writeFile(apiPath, JSON.stringify(swaggerFixture()));
    await writeFile(outputPath, "stale output");

    const operations = await generateOperationCatalog(apiPath, outputPath);
    const output = await readFile(outputPath, "utf8");

    expect(operations).toEqual([operationFixture()]);
    expect(output).toContain('import type { ApiOperation } from "./openapi.js";');
    expect(output).toContain('"operationId": "widgets_read"');
    expect((await readdir(directory)).sort()).toEqual(["api.json", "generated-operations.ts"]);
  });

  it("runs the generator when generated-operations.ts does not exist", async () => {
    const workspace = await createIsolatedWorkspace("jumpserver-generator-");
    const generatedModule = resolve(ROOT, "src/generated-operations.ts");
    await cp(resolve(ROOT, "src"), join(workspace, "src"), {
      recursive: true,
      filter: (source) => resolve(source) !== generatedModule
    });
    await mkdir(join(workspace, "scripts"), { recursive: true });
    await copyFile(
      resolve(ROOT, "scripts/generate-operations.ts"),
      join(workspace, "scripts/generate-operations.ts")
    );
    await writeFile(join(workspace, "api.json"), JSON.stringify(swaggerFixture()));
    await symlink(resolve(ROOT, "node_modules"), join(workspace, "node_modules"), "dir");

    const result = runTypeScript(workspace, "scripts/generate-operations.ts");

    expect(result.status, result.stderr).toBe(0);
    expect(await readFile(join(workspace, "src/generated-operations.ts"), "utf8")).toContain(
      '"operationId": "widgets_read"'
    );
  });

  it("reports command coverage without claiming API coverage when api.json is absent", async () => {
    const workspace = await createIsolatedWorkspace("jumpserver-coverage-");
    await cp(resolve(ROOT, "src"), join(workspace, "src"), { recursive: true });
    await mkdir(join(workspace, "scripts"), { recursive: true });
    await copyFile(
      resolve(ROOT, "scripts/check-api-coverage.ts"),
      join(workspace, "scripts/check-api-coverage.ts")
    );
    await symlink(resolve(ROOT, "node_modules"), join(workspace, "node_modules"), "dir");

    const result = runTypeScript(workspace, "scripts/check-api-coverage.ts");
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(report).toMatchObject({
      ok: true,
      rawApiJson: "not present",
      apiCatalogStatus: "not-checked",
      commandCoverage: "100%"
    });
    expect(report).not.toHaveProperty("apiCoverage");
    expect(report).not.toHaveProperty("coverage");
  });
});

async function createIsolatedWorkspace(prefix: string): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(sandbox);
  const workspace = join(sandbox, "workspace");
  await mkdir(workspace);
  await writeFile(
    join(workspace, "package.json"),
    JSON.stringify({ type: "module", version: "0.0.0-test" })
  );
  return workspace;
}

function runTypeScript(workspace: string, script: string) {
  return spawnSync(process.execPath, [TSX_CLI, script], {
    cwd: workspace,
    encoding: "utf8"
  });
}

function swaggerFixture() {
  return {
    swagger: "2.0",
    basePath: "/api/v2",
    paths: {
      "/widgets/": {
        get: {
          operationId: "widgets_read",
          tags: ["widgets"],
          summary: "Read widgets",
          parameters: [{ name: "search", in: "query", required: false, type: "string" }]
        }
      }
    }
  };
}

function operationFixture(): ApiOperation {
  return {
    method: "GET",
    path: "/widgets/",
    basePath: "/api/v2",
    operationId: "widgets_read",
    tag: "widgets",
    summary: "Read widgets",
    queryParameters: [{ name: "search", required: false, schema: { type: "string" } }],
    pathParameters: []
  };
}
