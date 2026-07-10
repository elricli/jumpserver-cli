import { describe, expect, it } from "vitest";
import { operationQueryOptionBindings } from "../src/operation-command.js";
import type { ApiOperation } from "../src/openapi.js";

describe("Operation Command query options", () => {
  it("converts camelCase OpenAPI query parameter names to kebab-case flags", () => {
    const bindings = operationQueryOptionBindings(operationWithQueryParameter("isActive"), []);

    expect(bindings).toEqual([
      {
        parameterName: "isActive",
        flagName: "is-active",
        attributeName: "isActive"
      }
    ]);
  });

  it("rejects query parameter names that cannot be represented as CLI flags", () => {
    expect(() => operationQueryOptionBindings(operationWithQueryParameter("[]"), [])).toThrow(
      'Cannot expose OpenAPI query parameter "[]" as a CLI option.'
    );
  });

  it("prefixes flags that collide with options registered by the caller", () => {
    const bindings = operationQueryOptionBindings(
      operationWithQueryParameter("traceId"),
      ["trace-id"]
    );

    expect(bindings).toEqual([
      {
        parameterName: "traceId",
        flagName: "query-trace-id",
        attributeName: "queryTraceId"
      }
    ]);
  });
});

function operationWithQueryParameter(name: string): ApiOperation {
  return {
    method: "GET",
    path: "/example/",
    basePath: "/api/v1",
    operationId: "examples_list",
    tag: "examples",
    summary: "List examples",
    queryParameters: [{ name, required: false }],
    pathParameters: []
  };
}
