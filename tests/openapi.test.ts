import { describe, expect, it } from "vitest";
import { extractOperations, loadOperations } from "../src/openapi.js";

describe("OpenAPI operation catalog", () => {
  it("loads every operation from api.json with stable operation ids", () => {
    const operations = loadOperations();

    expect(operations).toHaveLength(221);
    expect(new Set(operations.map((operation) => operation.operationId)).size).toBe(221);
    expect(operations.some((operation) => operation.operationId === "users_profile_read")).toBe(true);
    expect(operations.some((operation) => operation.operationId === "authentication_access-keys_create")).toBe(true);
  });

  it("loads path parameters for swagger path templates", () => {
    const operation = loadOperations().find(
      (candidate) => candidate.operationId === "assets_favorite-assets_read"
    );

    expect(operation?.pathParameters).toEqual([{ name: "id", required: true, schema: { type: "string" } }]);
  });

  it("merges path-level swagger parameters into each operation", () => {
    const operations = extractOperations({
      basePath: "/api/v2",
      paths: {
        "/resources/{id}/": {
          parameters: [{ name: "id", in: "path", required: true, type: "string" }],
          get: {
            operationId: "resources_read",
            tags: ["resources"],
            parameters: [{ name: "verbose", in: "query", required: false, type: "string" }]
          }
        }
      }
    });

    expect(operations).toEqual([
      expect.objectContaining({
        operationId: "resources_read",
        basePath: "/api/v2",
        pathParameters: [{ name: "id", required: true, schema: { type: "string" } }],
        queryParameters: [{ name: "verbose", required: false, schema: { type: "string" } }]
      })
    ]);
  });
});
