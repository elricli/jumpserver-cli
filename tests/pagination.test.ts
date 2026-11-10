import { describe, expect, it } from "vitest";
import { fetchAllPages } from "../src/pagination.js";
import type { RequestPlan } from "../src/request.js";

function plan(): RequestPlan {
  const url = new URL("https://jumpserver.example.test/api/v1/assets/hosts/?search=prod&limit=2");
  return { method: "GET", url, pathWithQuery: `${url.pathname}${url.search}`, headers: {} };
}

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), { headers: { "content-type": "application/json" } });
}

describe("fetching all pages", () => {
  it("accepts an unpaginated array without requesting it again", async () => {
    let calls = 0;
    const items = [{ id: "host-1" }, { id: "host-2" }];
    const response = await fetchAllPages(plan(), async () => {
      calls += 1;
      if (calls > 1) throw new Error("unexpected extra page");
      return json(items);
    });

    expect(await response.json()).toEqual(items);
    expect(calls).toBe(1);
  });

  it("keeps the original target and filters when next points elsewhere", async () => {
    const urls: string[] = [];
    const response = await fetchAllPages(plan(), async (page) => {
      urls.push(page.url.href);
      expect(page.pathWithQuery).toBe(`${page.url.pathname}${page.url.search}`);
      if (urls.length > 2) throw new Error("unexpected extra page");
      return json(urls.length === 1
        ? { count: 2, next: "https://other.example.test/other/path/?offset=1&search=other", results: [{ id: "host-1" }] }
        : { count: 2, next: null, results: [{ id: "host-2" }] });
    });

    expect(urls).toEqual([
      "https://jumpserver.example.test/api/v1/assets/hosts/?search=prod&limit=2",
      "https://jumpserver.example.test/api/v1/assets/hosts/?search=prod&limit=2&offset=1"
    ]);
    expect(await response.json()).toEqual({ count: 2, next: null, previous: null, results: [{ id: "host-1" }, { id: "host-2" }] });
  });

  it("deduplicates overlapping asset IDs and preserves response metadata", async () => {
    let calls = 0;
    const response = await fetchAllPages(plan(), async () => {
      calls += 1;
      if (calls > 2) throw new Error("unexpected extra page");
      return json(calls === 1
        ? { count: 3, next: "?offset=2", source: "inventory", results: [{ id: "host-1" }, { id: "host-2" }] }
        : { count: 3, next: null, results: [{ id: "host-2" }, { id: "host-3" }] });
    });

    expect(await response.json()).toEqual({
      count: 3, next: null, previous: null, source: "inventory",
      results: [{ id: "host-1" }, { id: "host-2" }, { id: "host-3" }]
    });
  });

  it("fails when the server ignores offsets and repeats a page", async () => {
    let calls = 0;
    await expect(fetchAllPages(plan(), async () => {
      calls += 1;
      if (calls > 2) throw new Error("unexpected extra page");
      return json({ count: 10, results: [{ id: "host-1" }, { id: "host-2" }] });
    })).rejects.toThrow("repeated a page");
    expect(calls).toBe(2);
  });

  it("fails when the server supplies a non-advancing next offset", async () => {
    await expect(fetchAllPages(plan(), async () => json({
      count: 10, next: "?offset=0", results: [{ id: "host-1" }]
    }))).rejects.toThrow("non-advancing pagination offset");
  });

  it("fails when an empty page claims more results", async () => {
    await expect(fetchAllPages(plan(), async () => json({
      count: 10, next: "?offset=2", results: []
    }))).rejects.toThrow("empty page before pagination completed");
  });

  it.each(["not-json", JSON.stringify({ detail: "not a list" })])(
    "rejects responses that cannot be paginated: %s", async (body) => {
      await expect(fetchAllPages(plan(), async () => new Response(body))).rejects.toThrow("Cannot fetch --all");
    }
  );
});
