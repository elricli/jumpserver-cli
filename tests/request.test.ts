import { describe, expect, it } from "vitest";
import { createRequestPlan } from "../src/request.js";

describe("request planning", () => {
  it("substitutes path parameters, appends query parameters, and parses JSON body", async () => {
    const plan = await createRequestPlan({
      operation: {
        method: "PATCH",
        path: "/assets/favorite-assets/{id}/",
        basePath: "/api/v1",
        operationId: "assets_favorite-assets_partial_update",
        tag: "assets_favorite-assets",
        summary: "assets_favorite-assets_partial_update",
        queryParameters: [{ name: "search", required: false, schema: { type: "string" } }],
        pathParameters: [{ name: "id", required: true }],
        bodyRequired: true
      },
      baseUrl: "https://jumpserver.example.test",
      pathValues: { id: "asset/with slash" },
      queryValues: { search: "prod" },
      bodyInput: '{"is_active":true}',
      headers: { "X-Test": "1" }
    });

    expect(plan.url.href).toBe(
      "https://jumpserver.example.test/api/v1/assets/favorite-assets/asset%2Fwith%20slash/?search=prod"
    );
    expect(plan.method).toBe("PATCH");
    expect(plan.body).toBe('{"is_active":true}');
    expect(plan.headers["Content-Type"]).toBe("application/json");
    expect(plan.headers["X-Test"]).toBe("1");
  });

  it("rejects requests missing required path parameters", async () => {
    await expect(
      createRequestPlan({
        operation: {
          method: "GET",
          path: "/users/users/{id}/",
          basePath: "/api/v1",
          operationId: "users_users_read",
          tag: "users_users",
          summary: "users_users_read",
          queryParameters: [],
          pathParameters: [{ name: "id", required: true }]
        },
        baseUrl: "https://jumpserver.example.test",
        pathValues: {},
        queryValues: {}
      })
    ).rejects.toThrow("Missing required path parameter: id");
  });

  it("uses the operation basePath when no explicit basePath override is provided", async () => {
    const plan = await createRequestPlan({
      operation: {
        method: "GET",
        path: "/users/profile/",
        basePath: "/api/v2",
        operationId: "users_profile_read",
        tag: "users_profile",
        summary: "users_profile_read",
        queryParameters: [],
        pathParameters: []
      },
      baseUrl: "https://jumpserver.example.test",
      pathValues: {},
      queryValues: {}
    });

    expect(plan.url.href).toBe("https://jumpserver.example.test/api/v2/users/profile/");
  });
});
