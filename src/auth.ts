import { createHmac } from "node:crypto";

export interface AccessKeyAuthorizationInput {
  accessKeyId: string;
  accessKeySecret: string;
  method: string;
  pathWithQuery: string;
  headers: Record<string, string>;
}

export interface AccessKeyAuthorization {
  authorization: string;
  stringToSign: string;
  signature: string;
}

export interface SignedHeadersInput {
  accessKeyId: string;
  accessKeySecret: string;
  method: string;
  pathWithQuery: string;
  organizationId?: string;
  now?: Date;
}

export function buildAccessKeyAuthorization(input: AccessKeyAuthorizationInput): AccessKeyAuthorization {
  const signatureHeaders = ["(request-target)", "accept", "date"];
  const normalizedHeaders = normalizeHeaderKeys(input.headers);
  const stringToSign = [
    `(request-target): ${input.method.toLowerCase()} ${input.pathWithQuery}`,
    `accept: ${requiredHeader(normalizedHeaders, "accept")}`,
    `date: ${requiredHeader(normalizedHeaders, "date")}`
  ].join("\n");
  const signature = createHmac("sha256", input.accessKeySecret).update(stringToSign).digest("base64");
  const authorization =
    `Signature keyId="${input.accessKeyId}",` +
    `algorithm="hmac-sha256",` +
    `headers="${signatureHeaders.join(" ")}",` +
    `signature="${signature}"`;

  return { authorization, stringToSign, signature };
}

export function buildSignedHeaders(input: SignedHeadersInput): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Date: (input.now ?? new Date()).toUTCString()
  };

  if (input.organizationId) {
    headers["X-JMS-ORG"] = input.organizationId;
  }

  headers.Authorization = buildAccessKeyAuthorization({
    accessKeyId: input.accessKeyId,
    accessKeySecret: input.accessKeySecret,
    method: input.method,
    pathWithQuery: input.pathWithQuery,
    headers
  }).authorization;

  return headers;
}

export function buildBearerHeaders(token: string, organizationId?: string): Record<string, string> {
  return buildTokenHeaders("Bearer", token, organizationId);
}

export function buildPrivateTokenHeaders(token: string, organizationId?: string): Record<string, string> {
  return buildTokenHeaders("Token", token, organizationId);
}

function buildTokenHeaders(scheme: "Bearer" | "Token", token: string, organizationId?: string): Record<string, string> {
  return {
    Accept: "application/json",
    Authorization: `${scheme} ${token}`,
    ...(organizationId ? { "X-JMS-ORG": organizationId } : {})
  };
}

function normalizeHeaderKeys(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function requiredHeader(headers: Record<string, string>, name: string): string {
  const value = headers[name];
  if (!value) {
    throw new Error(`Missing required signed header: ${name}`);
  }
  return value;
}
