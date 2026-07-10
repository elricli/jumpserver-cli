export interface PermittedAsset {
  id: string;
  name: string;
  address?: string;
  protocols?: unknown;
  platform?: unknown;
}

export interface PermittedAssetPage<TPermittedAsset extends PermittedAsset = PermittedAsset> {
  items: TPermittedAsset[];
  count?: number;
  nextOffset: number;
  hasMore: boolean;
}

export interface PermittedAssetSelectionInput<TPermittedAsset extends PermittedAsset = PermittedAsset> {
  initialSearch?: string;
  pageSize: number;
  fetchPage: (
    search: string | undefined,
    offset: number
  ) => Promise<PermittedAssetPage<TPermittedAsset>>;
}

export type PermittedAssetSelectionAction = "previous" | "next" | "search" | "submit";

export interface PermittedAssetPageSelection<TPermittedAsset extends PermittedAsset = PermittedAsset> {
  action: PermittedAssetSelectionAction;
  selectedAssets: readonly TPermittedAsset[];
}

export interface PermittedAssetSelectionView<TPermittedAsset extends PermittedAsset = PermittedAsset> {
  search: string | undefined;
  pageIndex: number;
  pageSize: number;
  page: PermittedAssetPage<TPermittedAsset>;
  selectedAssets: readonly TPermittedAsset[];
  hasPreviousPage: boolean;
}

export interface PermittedAssetSearchRequest {
  currentSearch: string | undefined;
  reason: "no-results" | "requested";
}

export interface PermittedAssetSelectionUi<TPermittedAsset extends PermittedAsset = PermittedAsset> {
  selectPage: (
    view: PermittedAssetSelectionView<TPermittedAsset>
  ) => Promise<PermittedAssetPageSelection<TPermittedAsset>>;
  promptSearch: (request: PermittedAssetSearchRequest) => Promise<string | undefined>;
}

export interface PermittedAssetSelectionOptions {
  requiredSelectionMessage?: string;
}

export async function selectPermittedAssets<TPermittedAsset extends PermittedAsset = PermittedAsset>(
  input: PermittedAssetSelectionInput<TPermittedAsset>,
  ui: PermittedAssetSelectionUi<TPermittedAsset>,
  options: PermittedAssetSelectionOptions = {}
): Promise<TPermittedAsset[]> {
  const selectedAssets = new Map<string, TPermittedAsset>();
  const offsets = [0];
  let pageIndex = 0;
  let search = input.initialSearch;
  let navigationDirection: "next" | "previous" = "next";
  let firstSelectablePageIndex: number | undefined;
  let lastSeenSelectablePageIndex: number | undefined;
  let lastSelectablePageIndex: number | undefined;

  const resetPagination = (nextSearch: string | undefined): void => {
    search = nextSearch;
    pageIndex = 0;
    navigationDirection = "next";
    firstSelectablePageIndex = undefined;
    lastSeenSelectablePageIndex = undefined;
    lastSelectablePageIndex = undefined;
    offsets.length = 1;
    offsets[0] = 0;
  };

  while (true) {
    const offset = offsets[pageIndex] ?? pageIndex * input.pageSize;
    const page = await input.fetchPage(search, offset);
    offsets[pageIndex] = offset;
    offsets[pageIndex + 1] = page.nextOffset;

    if (page.items.length === 0) {
      if (navigationDirection === "previous" && pageIndex > 0) {
        pageIndex -= 1;
        continue;
      }
      if (navigationDirection === "next" && page.hasMore && page.nextOffset > offset) {
        pageIndex += 1;
        continue;
      }
      const fallbackPageIndex = navigationDirection === "previous"
        ? firstSelectablePageIndex
        : lastSeenSelectablePageIndex;
      if (fallbackPageIndex !== undefined) {
        if (navigationDirection === "next") {
          lastSelectablePageIndex = fallbackPageIndex;
        }
        pageIndex = fallbackPageIndex;
        continue;
      }

      resetPagination(await ui.promptSearch({ currentSearch: search, reason: "no-results" }));
      continue;
    }

    firstSelectablePageIndex ??= pageIndex;
    lastSeenSelectablePageIndex = Math.max(lastSeenSelectablePageIndex ?? pageIndex, pageIndex);
    const displayedPage = lastSelectablePageIndex !== undefined && pageIndex >= lastSelectablePageIndex
      ? { ...page, hasMore: false }
      : page;

    const selection = await ui.selectPage({
      search,
      pageIndex,
      pageSize: input.pageSize,
      page: displayedPage,
      selectedAssets: [...selectedAssets.values()],
      hasPreviousPage: pageIndex > firstSelectablePageIndex
    });
    updateSelectedAssets(selectedAssets, page.items, selection.selectedAssets);

    if (selection.action === "next") {
      navigationDirection = "next";
      pageIndex += 1;
      continue;
    }
    if (selection.action === "previous") {
      navigationDirection = "previous";
      pageIndex = Math.max(0, pageIndex - 1);
      continue;
    }
    if (selection.action === "search") {
      resetPagination(await ui.promptSearch({ currentSearch: search, reason: "requested" }));
      continue;
    }
    if (selection.action === "submit") {
      if (selectedAssets.size === 0) {
        throw new Error(options.requiredSelectionMessage ?? "At least one permitted asset must be selected.");
      }
      return [...selectedAssets.values()];
    }

    throw new Error(`Unsupported Permitted Asset selection action: ${selection.action}`);
  }
}

function updateSelectedAssets<TPermittedAsset extends PermittedAsset>(
  selectedAssets: Map<string, TPermittedAsset>,
  pageAssets: readonly TPermittedAsset[],
  selectedPageAssets: readonly TPermittedAsset[]
): void {
  const selectedIds = new Set(selectedPageAssets.map((asset) => asset.id));
  for (const asset of pageAssets) {
    if (selectedIds.has(asset.id)) {
      selectedAssets.set(asset.id, asset);
    } else {
      selectedAssets.delete(asset.id);
    }
  }
}
