import { describe, expect, it } from "vitest";
import { resolveAuthenticationMode, type CredentialSource } from "../src/authentication-mode.js";

describe("authentication mode resolution", () => {
  it("uses CLI credentials before environment and saved config credentials", () => {
    expect(
      resolveAuthenticationMode({
        cli: { token: "cli-token" },
        env: { privateToken: "env-private-token" },
        config: { accessKeyId: "saved-id", accessKeySecret: "saved-secret" }
      })
    ).toEqual({ kind: "bearer", token: "cli-token" });
  });

  it("uses environment credentials before saved config credentials", () => {
    expect(
      resolveAuthenticationMode({
        cli: {},
        env: { privateToken: "env-private-token" },
        config: { accessKeyId: "saved-id", accessKeySecret: "saved-secret" }
      })
    ).toEqual({ kind: "private-token", token: "env-private-token" });
  });

  it("uses a complete Access Key from saved config when higher-priority sources are empty", () => {
    expect(
      resolveAuthenticationMode({
        cli: {},
        env: {},
        config: { accessKeyId: "saved-id", accessKeySecret: "saved-secret" }
      })
    ).toEqual({
      kind: "access-key",
      accessKeyId: "saved-id",
      accessKeySecret: "saved-secret"
    });
  });

  it("rejects an incomplete CLI Access Key instead of combining sources or falling back", () => {
    expect(() =>
      resolveAuthenticationMode({
        cli: { accessKeyId: "cli-id" },
        env: { accessKeySecret: "env-secret" },
        config: { token: "saved-token" }
      })
    ).toThrowError(
      "Incomplete Access Key credentials in CLI: both accessKeyId and accessKeySecret are required."
    );
  });

  it.each(
    [
      {
        modes: "Access Key and Bearer token",
        credentials: { accessKeyId: "cli-id", accessKeySecret: "cli-secret", token: "cli-token" }
      },
      {
        modes: "Access Key and private token",
        credentials: { accessKeyId: "cli-id", accessKeySecret: "cli-secret", privateToken: "cli-private-token" }
      },
      {
        modes: "Bearer and private tokens",
        credentials: { token: "cli-token", privateToken: "cli-private-token" }
      }
    ] satisfies Array<{ modes: string; credentials: CredentialSource }>
  )("rejects $modes within the selected source", ({ credentials }) => {
    expect(() => resolveAuthenticationMode({ cli: credentials, env: {}, config: {} })).toThrowError(
      "Multiple authentication modes in CLI: choose exactly one of Access Key, Bearer token, or private token."
    );
  });

  it("rejects an empty token in a higher-priority source instead of falling back", () => {
    expect(() =>
      resolveAuthenticationMode({
        cli: { token: "" },
        env: {},
        config: { token: "saved-token" }
      })
    ).toThrowError("Empty Bearer token in CLI.");
  });

  it("rejects an empty private token in the selected source", () => {
    expect(() =>
      resolveAuthenticationMode({
        cli: {},
        env: { privateToken: "" },
        config: {}
      })
    ).toThrowError("Empty private token in environment.");
  });

  it("returns none when no source contains credentials", () => {
    expect(resolveAuthenticationMode({ cli: {}, env: {}, config: {} })).toEqual({ kind: "none" });
  });
});
