export interface CredentialSource {
  accessKeyId?: string | undefined;
  accessKeySecret?: string | undefined;
  token?: string | undefined;
  privateToken?: string | undefined;
}

export interface CredentialSources {
  cli: CredentialSource;
  env: CredentialSource;
  config: CredentialSource;
}

export type AuthenticationMode =
  | { kind: "none" }
  | { kind: "access-key"; accessKeyId: string; accessKeySecret: string }
  | { kind: "bearer"; token: string }
  | { kind: "private-token"; token: string };

export function resolveAuthenticationMode(sources: CredentialSources): AuthenticationMode {
  const candidates: Array<[label: string, credentials: CredentialSource]> = [
    ["CLI", sources.cli],
    ["environment", sources.env],
    ["saved config", sources.config]
  ];

  for (const [label, source] of candidates) {
    if (!hasCredentialInput(source)) {
      continue;
    }

    const hasAccessKey = source.accessKeyId !== undefined || source.accessKeySecret !== undefined;
    const authenticationModeCount =
      Number(hasAccessKey) + Number(source.token !== undefined) + Number(source.privateToken !== undefined);
    if (authenticationModeCount > 1) {
      throw new Error(
        `Multiple authentication modes in ${label}: choose exactly one of Access Key, Bearer token, or private token.`
      );
    }

    if (hasAccessKey) {
      if (!source.accessKeyId || !source.accessKeySecret) {
        throw new Error(
          `Incomplete Access Key credentials in ${label}: both accessKeyId and accessKeySecret are required.`
        );
      }
      return {
        kind: "access-key",
        accessKeyId: source.accessKeyId,
        accessKeySecret: source.accessKeySecret
      };
    }
    if (source.token !== undefined) {
      if (source.token.length === 0) {
        throw new Error(`Empty Bearer token in ${label}.`);
      }
      return { kind: "bearer", token: source.token };
    }
    if (source.privateToken !== undefined) {
      if (source.privateToken.length === 0) {
        throw new Error(`Empty private token in ${label}.`);
      }
      return { kind: "private-token", token: source.privateToken };
    }
  }
  return { kind: "none" };
}

function hasCredentialInput(source: CredentialSource): boolean {
  return (
    source.accessKeyId !== undefined ||
    source.accessKeySecret !== undefined ||
    source.token !== undefined ||
    source.privateToken !== undefined
  );
}
