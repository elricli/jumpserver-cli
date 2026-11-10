import type { RequestPlan } from "./request.js";

export const DEFAULT_LIST_PAGE_SIZE = 100;

export function paginationInteger(value: string, name: "limit" | "offset"): number {
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < (name === "limit" ? 1 : 0)) {
    throw new Error(`Expected --${name} to be a ${name === "limit" ? "positive" : "non-negative"} safe integer, got: ${value}`);
  }
  return number;
}

export async function fetchAllPages(
  initialPlan: RequestPlan,
  fetchPage: (plan: RequestPlan) => Promise<Response>
): Promise<Response> {
  const limit = paginationInteger(initialPlan.url.searchParams.get("limit") ?? String(DEFAULT_LIST_PAGE_SIZE), "limit");
  let offset = paginationInteger(initialPlan.url.searchParams.get("offset") ?? "0", "offset");
  let plan = initialPlan;
  let firstPayload: Record<string, unknown> | undefined;
  let firstResponse: Response | undefined;
  const results: unknown[] = [];
  const seenPages = new Set<string>();
  const seenIds = new Set<string>();

  while (true) {
    const response = await fetchPage(plan);
    if (!response.ok) {
      return response;
    }

    let payload: unknown;
    try {
      payload = await response.clone().json();
    } catch {
      throw new Error("Cannot fetch --all: the server response is not valid JSON.");
    }

    // Some JumpServer installations disable pagination and return the complete array.
    if (!firstPayload && Array.isArray(payload)) {
      return response;
    }
    if (!isRecord(payload) || !Array.isArray(payload.results)) {
      throw new Error("Cannot fetch --all: expected a JSON array or a paginated results array.");
    }
    firstPayload ??= payload;
    firstResponse ??= response;
    const items = payload.results;
    const pageKey = JSON.stringify(items.map((item) => itemId(item) ?? item));
    if (items.length > 0 && seenPages.has(pageKey)) {
      throw new Error("Cannot fetch --all: the server repeated a page instead of advancing pagination.");
    }
    seenPages.add(pageKey);
    const newItems = items.filter((item) => {
      const id = itemId(item);
      if (id === undefined) {
        return true;
      }
      if (seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    });
    if (items.length > 0 && newItems.length === 0) {
      throw new Error("Cannot fetch --all: the server returned no new results while advancing pagination.");
    }
    results.push(...newItems);

    const next = typeof payload.next === "string" && payload.next.length > 0 ? payload.next : undefined;
    const count = typeof payload.count === "number" && Number.isSafeInteger(payload.count) ? payload.count : undefined;
    const hasMore = next !== undefined || (payload.next !== null && (
      count === undefined ? items.length >= limit : offset + items.length < count
    ));
    if (!hasMore) {
      return new Response(JSON.stringify({
        ...firstPayload,
        count: results.length,
        next: null,
        previous: null,
        results
      }), {
        status: firstResponse.status,
        statusText: firstResponse.statusText,
        headers: { "content-type": "application/json" }
      });
    }
    if (items.length === 0) {
      throw new Error("Cannot fetch --all: the server returned an empty page before pagination completed.");
    }

    // Read only the offset from next; keep the original host, path, and filters.
    const nextValue = next ? new URL(next, plan.url).searchParams.get("offset") : null;
    const nextOffset = paginationInteger(nextValue ?? String(offset + items.length), "offset");
    if (nextOffset <= offset) {
      throw new Error("Cannot fetch --all: the server returned a non-advancing pagination offset.");
    }
    const url = new URL(plan.url);
    url.searchParams.set("offset", String(nextOffset));
    plan = { ...plan, url, pathWithQuery: `${url.pathname}${url.search}`, headers: { ...plan.headers } };
    offset = nextOffset;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function itemId(item: unknown): string | undefined {
  return isRecord(item) && (typeof item.id === "string" || typeof item.id === "number")
    ? `${typeof item.id}:${item.id}`
    : undefined;
}
