import type { ProductImageStudioSpecItem, ProductImageStudioSpecSet } from "./specLibraryTypes";

export function createProductImageStudioSpecSet(input: ProductImageStudioSpecSet): ProductImageStudioSpecSet {
  return {
    createdAt: input.createdAt,
    id: input.id,
    itemIds: [...new Set(input.itemIds)],
    name: input.name.trim(),
  };
}

export function upsertProductImageStudioSpecItem(
  items: readonly ProductImageStudioSpecItem[],
  item: ProductImageStudioSpecItem,
): readonly ProductImageStudioSpecItem[] {
  return [item, ...items.filter((candidate) => candidate.id !== item.id)];
}

export function removeProductImageStudioSpecItem(
  items: readonly ProductImageStudioSpecItem[],
  itemId: string,
): readonly ProductImageStudioSpecItem[] {
  return items.filter((candidate) => candidate.id !== itemId);
}

export function upsertProductImageStudioSpecSet(
  sets: readonly ProductImageStudioSpecSet[],
  set: ProductImageStudioSpecSet,
): readonly ProductImageStudioSpecSet[] {
  return [set, ...sets.filter((candidate) => candidate.id !== set.id)];
}

export function removeProductImageStudioSpecSet(
  sets: readonly ProductImageStudioSpecSet[],
  setId: string,
): readonly ProductImageStudioSpecSet[] {
  return sets.filter((candidate) => candidate.id !== setId);
}

export function removeProductImageStudioSpecItemFromSets(
  sets: readonly ProductImageStudioSpecSet[],
  itemId: string,
): readonly ProductImageStudioSpecSet[] {
  return sets
    .map((set) => ({ ...set, itemIds: set.itemIds.filter((candidate) => candidate !== itemId) }))
    .filter((set) => set.itemIds.length > 0);
}
