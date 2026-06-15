import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY,
  readProductImageStudioMaterialLibraryFromStorage,
  writeProductImageStudioMaterialLibraryToStorage,
} from "@/features/product-image-studio/client/materialLibraryStorage";
import { createMaterial, createTestStorage } from "./materialLibraryFixtures";

export function describeMaterialLibraryStorageCases(): void {
  describe("product image studio material library storage", () => {
    it("round-trips material records through browser storage", () => {
      const storage = createTestStorage();
      const material = createMaterial();

      const saved = writeProductImageStudioMaterialLibraryToStorage(storage, [material]);
      const loaded = readProductImageStudioMaterialLibraryFromStorage(storage);

      expect(saved).toBe(true);
      expect(storage.entries.has(PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY)).toBe(true);
      expect(loaded).toEqual([material]);
    });

    it("rejects unsafe material preview Data URLs from stored records", () => {
      const unsupportedPreview = {
        alt: "텍스트 파일 재질 미리보기",
        url: "data:text/plain;base64,SGVsbG8=",
      };
      const oversizedPreview = {
        alt: "너무 큰 재질 미리보기",
        url: `data:image/png;base64,${"a".repeat(1_500_001)}`,
      };
      const storage = createTestStorage([
        [
          PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY,
          JSON.stringify([
            { ...createMaterial(), id: "material-unsupported-preview", previewImage: unsupportedPreview },
            { ...createMaterial(), id: "material-oversized-preview", previewImage: oversizedPreview },
          ]),
        ],
      ]);

      expect(readProductImageStudioMaterialLibraryFromStorage(storage)).toEqual([]);
    });

    it("uses last-write-wins when saving the material library", () => {
      const storage = createTestStorage();
      const firstMaterial = createMaterial({ id: "material-first", name: "첫 번째 종이" });
      const secondMaterial = createMaterial({
        id: "material-second",
        name: "두 번째 종이",
        thickness: { unit: "mm", value: 0.42 },
      });

      writeProductImageStudioMaterialLibraryToStorage(storage, [firstMaterial]);
      writeProductImageStudioMaterialLibraryToStorage(storage, [secondMaterial]);

      expect(readProductImageStudioMaterialLibraryFromStorage(storage)).toEqual([secondMaterial]);
    });

    it("returns an empty list when storage is missing, malformed, or the wrong shape", () => {
      const missingStorage = createTestStorage();
      const malformedStorage = createTestStorage([[PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY, "{"]]);
      const wrongShapeStorage = createTestStorage([
        [PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY, JSON.stringify({ items: [] })],
      ]);

      expect(readProductImageStudioMaterialLibraryFromStorage(missingStorage)).toEqual([]);
      expect(readProductImageStudioMaterialLibraryFromStorage(malformedStorage)).toEqual([]);
      expect(readProductImageStudioMaterialLibraryFromStorage(wrongShapeStorage)).toEqual([]);
    });

    it("returns an empty list when storage getItem throws an Error", () => {
      const storage = {
        getItem: () => {
          throw new DOMException("storage access blocked", "SecurityError");
        },
      };

      expect(readProductImageStudioMaterialLibraryFromStorage(storage)).toEqual([]);
    });

    it("rethrows non-Error values from storage getItem", () => {
      const thrownValue = "storage access failed";
      const storage = {
        getItem: () => {
          throw thrownValue;
        },
      };
      let caughtValue: unknown;

      try {
        readProductImageStudioMaterialLibraryFromStorage(storage);
      } catch (error) {
        caughtValue = error;
      }

      expect(caughtValue).toBe(thrownValue);
    });

    it.each([
      ["invalid compatible target", { compatibleTargets: ["poster"] }],
      ["zero thickness", { thickness: { unit: "gsm", value: 0 } }],
      ["negative thickness", { thickness: { unit: "gsm", value: -1 } }],
      ["unknown thickness unit", { thickness: { unit: "lb", value: 120 } }],
      ["empty compatible targets", { compatibleTargets: [] }],
      ["invalid color hex", { colorHex: "warm-ivory" }],
    ])("rejects %s from stored material items", (_label, invalidPatch) => {
      const storage = createTestStorage([
        [PRODUCT_IMAGE_STUDIO_MATERIAL_LIBRARY_STORAGE_KEY, JSON.stringify([{ ...createMaterial(), ...invalidPatch }])],
      ]);

      expect(readProductImageStudioMaterialLibraryFromStorage(storage)).toEqual([]);
    });

    it("returns false when storage setItem throws a quota/write Error", () => {
      const storage = {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("quota exceeded", "QuotaExceededError");
        },
      };

      expect(writeProductImageStudioMaterialLibraryToStorage(storage, [createMaterial()])).toBe(false);
    });
  });
}
