import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INTERNAL_JUMPSERVER_HOST_RE = /\bjumpserver\.(?![a-z0-9.-]+\.test\b)[a-z0-9.-]+\.[a-z]{2,}\b/iu;

describe("package hygiene", () => {
  it("declares and publishes the MIT license", () => {
    const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      files?: string[];
      license?: string;
    };
    const packageLock = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf8")) as {
      packages?: Record<string, { license?: string }>;
    };
    const licenseText = readFileSync(resolve(ROOT, "LICENSE"), "utf8");

    expect(packageJson.license).toBe("MIT");
    expect(packageJson.files ?? []).toContain("LICENSE");
    expect(packageJson.files ?? []).toContain("skills");
    expect(packageLock.packages?.[""]?.license).toBe("MIT");
    expect(licenseText).toContain("MIT License");
    expect(licenseText).toContain("Copyright (c) 2026 elricli");
  });

  it("uses Clack prompts as a runtime dependency for interactive prompts", () => {
    const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const packageLock = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf8")) as {
      packages?: Record<string, unknown>;
    };

    expect(packageJson.dependencies?.["@clack/prompts"]).toBeTruthy();
    expect(packageJson.devDependencies?.["@clack/prompts"]).toBeUndefined();
    expect(packageLock.packages?.["node_modules/@clack/prompts"]).toBeTruthy();
  });

  it("does not track or publish the raw OpenAPI document", () => {
    const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
      files?: string[];
    };
    const gitTrackedApiJson = execFileSync("git", ["ls-files", "api.json"], {
      cwd: ROOT,
      encoding: "utf8"
    }).trim();
    const gitignoreEntries = readFileSync(resolve(ROOT, ".gitignore"), "utf8").split(/\r?\n/);

    expect(packageJson.files ?? []).not.toContain("api.json");
    expect(gitTrackedApiJson).toBe("");
    expect(gitignoreEntries).toContain("api.json");
  });

  it("does not contain internal JumpServer hostnames in tracked project files", () => {
    const trackedFiles = execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8"
    })
      .split(/\r?\n/)
      .filter((file) => file.length > 0);
    const hits = trackedFiles.flatMap((file) => {
      const content = readFileSync(resolve(ROOT, file), "utf8");
      return INTERNAL_JUMPSERVER_HOST_RE.test(content) ? [`${file}: internal JumpServer hostname`] : [];
    });

    expect(hits).toEqual([]);
  });
});
