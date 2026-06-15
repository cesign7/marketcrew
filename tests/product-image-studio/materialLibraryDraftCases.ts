import { describe, expect, it } from "vitest";
import {
  createDefaultMaterialDraft,
  createMaterialRecordFromDraft,
} from "@/components/product-image-studio/productImageStudioMaterialPanelModel";

export function describeMaterialLibraryDraftCases(): void {
  describe("product image studio material library drafts", () => {
    it("stores validated local material preview Data URLs from drafts", () => {
      const draft = {
        ...createDefaultMaterialDraft(),
        compatibleTargets: ["folded_card"] as const,
        name: "랑데뷰 내추럴 240g",
        previewImage: { alt: "랑데뷰 내추럴 240g 재질 미리보기", url: "data:image/png;base64,iVBORw0KGgo=" },
      };

      const result = createMaterialRecordFromDraft(draft, []);

      expect(result.kind).toBe("valid");
      if (result.kind === "valid") {
        expect(result.record.previewImage).toEqual(draft.previewImage);
      }
    });

    it("rejects unsafe material preview Data URLs from drafts", () => {
      const unsupportedPreview = {
        alt: "텍스트 파일 재질 미리보기",
        url: "data:text/plain;base64,SGVsbG8=",
      };
      const draft = {
        ...createDefaultMaterialDraft(),
        compatibleTargets: ["folded_card"] as const,
        name: "텍스트 파일",
        previewImage: unsupportedPreview,
      };

      expect(createMaterialRecordFromDraft(draft, [])).toEqual({
        kind: "invalid",
        message: "재질 이미지는 PNG, JPG, WebP 파일만 사용할 수 있습니다.",
      });
    });
  });
}
