import { describe, expect, it } from "vitest";
import { operations as generatedOperations } from "../src/generated-operations.js";
import { extractOperations } from "../src/openapi-parser.js";
import { loadOperations, type ApiOperation } from "../src/openapi.js";

describe("OpenAPI operation catalog", () => {
  it("loads the generated operation catalog with stable operation ids", () => {
    const operations = loadOperations();

    expect(operations.length).toBeGreaterThan(0);
    expect(new Set(operations.map((operation) => operation.operationId)).size).toBe(
      operations.length
    );
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

  it("lets operation parameters override inherited parameters by location and name", () => {
    const operations = extractOperations({
      paths: {
        "/resources/{id}/": {
          parameters: [
            { name: "id", in: "path", required: true, type: "string" },
            { name: "id", in: "query", required: false, type: "string" },
            { name: "search", in: "query", required: false, type: "string" }
          ],
          get: {
            operationId: "resources_read",
            parameters: [
              { name: "id", in: "query", required: true, type: "integer" },
              { name: "limit", in: "query", required: false, type: "integer" }
            ]
          }
        }
      }
    });

    expect(operations[0]?.pathParameters).toEqual([
      { name: "id", required: true, schema: { type: "string" } }
    ]);
    expect(operations[0]?.queryParameters).toEqual([
      { name: "id", required: true, schema: { type: "integer" } },
      { name: "search", required: false, schema: { type: "string" } },
      { name: "limit", required: false, schema: { type: "integer" } }
    ]);
  });

  it("rejects Swagger parameter locations that the generated CLI cannot represent", () => {
    expect(() =>
      extractOperations({
        paths: {
          "/resources/": {
            get: {
              operationId: "resources_read",
              parameters: [{ name: "X-Trace-Id", in: "header", required: false, type: "string" }]
            }
          }
        }
      })
    ).toThrow('Unsupported Swagger parameter location "header" for GET /resources/: X-Trace-Id');
  });

  it("rejects nameless Swagger parameters instead of silently dropping them", () => {
    expect(() =>
      extractOperations({
        paths: {
          "/resources/": {
            get: {
              operationId: "resources_read",
              parameters: [{ in: "query", required: true, type: "string" }]
            }
          }
        }
      })
    ).toThrow("Swagger parameter is missing a name for GET /resources/");
  });

  it("returns deeply independent operation schemas from separate catalog loads", () => {
    const syntheticOperation: ApiOperation = {
      method: "POST",
      path: "/tests/nested-schema/",
      basePath: "/api/v1",
      operationId: "tests_nested_schema_create",
      tag: "tests",
      summary: "Nested schema isolation fixture",
      queryParameters: [],
      pathParameters: [],
      bodyRequired: true,
      bodySchema: {
        type: "array",
        items: {
          type: "array",
          items: { type: "string" }
        }
      }
    };
    generatedOperations.push(syntheticOperation);

    try {
      const first = loadOperations().find(
        (operation) => operation.operationId === syntheticOperation.operationId
      );
      const second = loadOperations().find(
        (operation) => operation.operationId === syntheticOperation.operationId
      );

      if (!first?.bodySchema?.items?.items || !second?.bodySchema?.items?.items) {
        throw new Error("Expected nested schemas in the synthetic operation");
      }
      first.bodySchema.items.items.type = "integer";

      expect(second.bodySchema.items.items.type).toBe("string");
      expect(
        loadOperations().find((operation) => operation.operationId === syntheticOperation.operationId)
          ?.bodySchema?.items?.items?.type
      ).toBe("string");
    } finally {
      const index = generatedOperations.indexOf(syntheticOperation);
      if (index >= 0) {
        generatedOperations.splice(index, 1);
      }
    }
  });
});
