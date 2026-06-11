import { describe, expect, it } from "vitest";
import { buildAccessKeyAuthorization, buildSignedHeaders } from "../src/auth.js";

describe("Access Key authentication", () => {
  it("builds JumpServer HTTP Signature authorization with request-target, accept, and date", () => {
    const signed = buildAccessKeyAuthorization({
      accessKeyId: "key",
      accessKeySecret: "secret",
      method: "GET",
      pathWithQuery: "/api/v1/users/profile/?limit=1",
      headers: {
        accept: "application/json",
        date: "Wed, 10 Jun 2026 09:00:00 GMT"
      }
    });

    expect(signed.stringToSign).toBe(
      "(request-target): get /api/v1/users/profile/?limit=1\n" +
        "accept: application/json\n" +
        "date: Wed, 10 Jun 2026 09:00:00 GMT"
    );
    expect(signed.authorization).toBe(
      'Signature keyId="key",algorithm="hmac-sha256",headers="(request-target) accept date",signature="aKCHsQm9QgADxHR8Hr80sno8bXezEjpraWTnhaB7yXw="'
    );
  });

  it("adds Date, Accept, X-JMS-ORG, and Authorization headers for AK requests", () => {
    const headers = buildSignedHeaders({
      accessKeyId: "key",
      accessKeySecret: "secret",
      method: "GET",
      pathWithQuery: "/api/v1/users/profile/",
      organizationId: "00000000-0000-0000-0000-000000000002",
      now: new Date("2026-06-10T09:00:00Z")
    });

    expect(headers.Accept).toBe("application/json");
    expect(headers.Date).toBe("Wed, 10 Jun 2026 09:00:00 GMT");
    expect(headers["X-JMS-ORG"]).toBe("00000000-0000-0000-0000-000000000002");
    expect(headers.Authorization).toContain('Signature keyId="key"');
  });
});
