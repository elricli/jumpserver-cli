import { describe, expect, it } from "vitest";
import {
  selectPermittedAssets,
  type PermittedAsset,
  type PermittedAssetPageSelection,
  type PermittedAssetSelectionUi
} from "../src/permitted-asset-selection.js";

describe("Permitted Asset selection", () => {
  it("continues next across an empty filtered page to the next selectable page", async () => {
    const first = asset("first", "First database");
    const later = asset("later", "Later database");
    const fetchedOffsets: number[] = [];
    const shownPageIndexes: number[] = [];
    const decisions: PermittedAssetPageSelection[] = [
      { action: "next", selectedAssets: [first] },
      { action: "submit", selectedAssets: [later] }
    ];
    const ui: PermittedAssetSelectionUi = {
      selectPage: async (view) => {
        shownPageIndexes.push(view.pageIndex);
        return decisions.shift()!;
      },
      promptSearch: async () => {
        throw new Error("search should not be prompted");
      }
    };

    const selected = await selectPermittedAssets(
      {
        pageSize: 10,
        fetchPage: async (_search, offset) => {
          fetchedOffsets.push(offset);
          if (offset === 0) {
            return { items: [first], nextOffset: 10, hasMore: true };
          }
          if (offset === 10) {
            return { items: [], nextOffset: 20, hasMore: true };
          }
          return { items: [later], nextOffset: 30, hasMore: false };
        }
      },
      ui
    );

    expect(fetchedOffsets).toEqual([0, 10, 20]);
    expect(shownPageIndexes).toEqual([0, 2]);
    expect(selected).toEqual([first, later]);
  });

  it("continues previous across an empty page to the prior selectable page", async () => {
    const first = asset("first", "First host");
    const later = asset("later", "Later host");
    const fetchedOffsets: number[] = [];
    const shownPageIndexes: number[] = [];
    const decisions: PermittedAssetPageSelection[] = [
      { action: "next", selectedAssets: [first] },
      { action: "previous", selectedAssets: [later] },
      { action: "submit", selectedAssets: [first] }
    ];
    const ui: PermittedAssetSelectionUi = {
      selectPage: async (view) => {
        shownPageIndexes.push(view.pageIndex);
        return decisions.shift()!;
      },
      promptSearch: async () => {
        throw new Error("search should not be prompted");
      }
    };

    const selected = await selectPermittedAssets(
      {
        pageSize: 10,
        fetchPage: async (_search, offset) => {
          fetchedOffsets.push(offset);
          if (offset === 0) {
            return { items: [first], nextOffset: 10, hasMore: true };
          }
          if (offset === 10) {
            return { items: [], nextOffset: 20, hasMore: true };
          }
          return { items: [later], nextOffset: 30, hasMore: false };
        }
      },
      ui
    );

    expect(fetchedOffsets).toEqual([0, 10, 20, 10, 0]);
    expect(shownPageIndexes).toEqual([0, 2, 0]);
    expect(selected).toEqual([first, later]);
  });

  it("resets pagination when the user searches again", async () => {
    const first = asset("first", "First database");
    const second = asset("second", "Second database");
    const match = asset("match", "Billing database");
    const fetches: Array<{ search: string | undefined; offset: number }> = [];
    const shownPages: Array<{ search: string | undefined; pageIndex: number; hasPreviousPage: boolean }> = [];
    const decisions: PermittedAssetPageSelection[] = [
      { action: "next", selectedAssets: [] },
      { action: "search", selectedAssets: [] },
      { action: "submit", selectedAssets: [match] }
    ];
    const ui: PermittedAssetSelectionUi = {
      selectPage: async (view) => {
        shownPages.push({
          search: view.search,
          pageIndex: view.pageIndex,
          hasPreviousPage: view.hasPreviousPage
        });
        return decisions.shift()!;
      },
      promptSearch: async (request) => {
        expect(request).toEqual({ currentSearch: "old", reason: "requested" });
        return "billing";
      }
    };

    const selected = await selectPermittedAssets(
      {
        initialSearch: "old",
        pageSize: 10,
        fetchPage: async (search, offset) => {
          fetches.push({ search, offset });
          if (search === "billing") {
            return { items: [match], nextOffset: 10, hasMore: false };
          }
          return offset === 0
            ? { items: [first], nextOffset: 10, hasMore: true }
            : { items: [second], nextOffset: 20, hasMore: false };
        }
      },
      ui
    );

    expect(fetches).toEqual([
      { search: "old", offset: 0 },
      { search: "old", offset: 10 },
      { search: "billing", offset: 0 }
    ]);
    expect(shownPages).toEqual([
      { search: "old", pageIndex: 0, hasPreviousPage: false },
      { search: "old", pageIndex: 1, hasPreviousPage: true },
      { search: "billing", pageIndex: 0, hasPreviousPage: false }
    ]);
    expect(selected).toEqual([match]);
  });

  it("rejects submission without a selected Permitted Asset", async () => {
    const available = asset("available", "Available database");

    await expect(selectPermittedAssets(
      {
        pageSize: 10,
        fetchPage: async () => ({ items: [available], nextOffset: 10, hasMore: false })
      },
      {
        selectPage: async () => ({ action: "submit", selectedAssets: [] }),
        promptSearch: async () => {
          throw new Error("search should not be prompted");
        }
      },
      { requiredSelectionMessage: "至少选择一个数据库" }
    )).rejects.toThrow("至少选择一个数据库");
  });
});

function asset(id: string, name: string): PermittedAsset {
  return { id, name };
}
