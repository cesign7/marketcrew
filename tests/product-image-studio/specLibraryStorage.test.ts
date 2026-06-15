import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_STUDIO_SPEC_LIBRARY_STORAGE_KEY,
  readProductImageStudioSpecLibraryFromStorage,
  writeProductImageStudioSpecLibraryToStorage,
} from "@/features/product-image-studio/client/specLibraryStorage";
import { createProductImageStudioSpecItem } from "@/features/product-image-studio/domain/specLibrary";

describe("product image studio spec library storage", () => {
  it("reads legacy reusable spec records while ignoring malformed old paper fields", () => {
    const storage = createMemoryStorage(JSON.stringify({
      items: [
        {
          createdAt: "2026-06-12T00:00:00.000Z",
          id: "legacy-postcard",
          name: "레거시 엽서",
          paperFinish: "silk",
          paperWeightGsm: "260gsm",
          sides: "front_back",
          sizeMm: { height: 148, width: 100 },
          type: "postcard",
        },
      ],
      sets: [],
    }));

    const store = readProductImageStudioSpecLibraryFromStorage(storage);

    expect(store.items).toEqual([
      {
        createdAt: "2026-06-12T00:00:00.000Z",
        id: "legacy-postcard",
        name: "레거시 엽서",
        sides: "front_back",
        sizeMm: { height: 148, width: 100 },
        type: "postcard",
      },
    ]);
  });

  it("serializes legacy reusable spec records without paperFinish or paperWeightGsm", () => {
    const sourceStorage = createMemoryStorage(JSON.stringify({
      items: [
        {
          createdAt: "2026-06-12T00:01:00.000Z",
          foldedSizeMm: { height: 150, width: 100 },
          foldDirection: "top_fold",
          id: "legacy-folded-card",
          name: "레거시 접이식 카드",
          openSizeMm: { height: 150, width: 200 },
          paperFinish: "glossy",
          paperWeightGsm: 320,
          type: "folded_card",
        },
      ],
      sets: [
        {
          createdAt: "2026-06-12T00:02:00.000Z",
          id: "set-legacy",
          itemIds: ["legacy-folded-card"],
          name: "레거시 세트",
        },
      ],
    }));
    const targetStorage = createMemoryStorage(null);
    const store = readProductImageStudioSpecLibraryFromStorage(sourceStorage);

    const didWrite = writeProductImageStudioSpecLibraryToStorage(targetStorage, store);

    expect(didWrite).toBe(true);
    expect(targetStorage.read()).toContain("\"foldDirection\":\"top_fold\"");
    expect(targetStorage.read()).not.toContain("\"paperFinish\"");
    expect(targetStorage.read()).not.toContain("\"paperWeightGsm\"");
  });

  it("serializes newly created reusable spec records without paperFinish or paperWeightGsm", () => {
    const item = createProductImageStudioSpecItem({
      createdAt: "2026-06-12T00:03:00.000Z",
      id: "new-postcard",
      name: "새 엽서",
      sides: "front_back",
      sizeMm: { height: 148, width: 100 },
      type: "postcard",
    });
    const storage = createMemoryStorage(null);

    const didWrite = writeProductImageStudioSpecLibraryToStorage(storage, { items: [item], sets: [] });

    expect(didWrite).toBe(true);
    expect(storage.read()).not.toContain("\"paperFinish\"");
    expect(storage.read()).not.toContain("\"paperWeightGsm\"");
  });
});

type MemorySpecLibraryStorage = {
  readonly getItem: (key: string) => string | null;
  readonly read: () => string | null;
  readonly setItem: (key: string, value: string) => void;
};

function createMemoryStorage(initialValue: string | null): MemorySpecLibraryStorage {
  let storedValue = initialValue;
  return {
    getItem: (key) => key === PRODUCT_IMAGE_STUDIO_SPEC_LIBRARY_STORAGE_KEY ? storedValue : null,
    read: () => storedValue,
    setItem: (key, value) => {
      if (key === PRODUCT_IMAGE_STUDIO_SPEC_LIBRARY_STORAGE_KEY) {
        storedValue = value;
      }
    },
  };
}
