import { isValidElement, type ReactNode, type SetStateAction } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDefaultMaterialDraft,
  PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE,
  PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_OVERSIZED_FILE_MESSAGE,
  type ProductImageStudioMaterialDraft,
} from "@/components/product-image-studio/productImageStudioMaterialPanelModel";

type ImageFieldMessage = { readonly text: string; readonly tone: "error" | "success" } | null;

type TestFileInput = {
  readonly files: { readonly item: (index: number) => File | null };
  readonly setCustomValidity: (message: string) => void;
  value: string;
};

type TestFileChangeHandler = (event: { readonly currentTarget: TestFileInput }) => void;

type FileInputElementProps = {
  readonly children?: ReactNode;
  readonly onChange?: TestFileChangeHandler;
  readonly type?: string;
};

export function describeMaterialImageFieldCases(): void {
  afterEach(() => {
    vi.doUnmock("react");
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  describe("product image studio material image field", () => {
    it.each([
      {
        file: new File([new Uint8Array(1_000_001)], "too-large.png", { type: "image/png" }),
        message: PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_OVERSIZED_FILE_MESSAGE,
        prepare: () => undefined,
        reason: "an over-limit PNG is selected",
      },
      {
        file: new File(["tiny"], "broken.png", { type: "image/png" }),
        message: PRODUCT_IMAGE_STUDIO_MATERIAL_IMAGE_INVALID_READ_MESSAGE,
        prepare: () => {
          class FailingFileReader {
            readonly result: string | ArrayBuffer | null = null;
            addEventListener(_eventName: string, _listener: () => void): void {}
            readAsDataURL(_file: Blob): void {
              throw new Error("read failed");
            }
          }
          vi.stubGlobal("FileReader", FailingFileReader);
        },
        reason: "FileReader cannot read the image",
      },
    ])("clears stale previews when $reason", async ({ file, message, prepare }) => {
      prepare();
      const previousPreview = { alt: "기존 재질 미리보기", url: "data:image/png;base64,aGVsbG8=" };
      const draft = { ...createDefaultMaterialDraft(), previewImage: previousPreview };
      const field = await createMaterialImageFieldFixture(draft);
      const input = createFileInput(file);

      field.onChange({ currentTarget: input.element });

      expect(field.currentDraft().previewImage).toBeUndefined();
      expect(input.element.value).toBe("");
      expect(input.currentValidityMessage()).toBe(message);
      expect(field.currentMessage()).toEqual({ text: message, tone: "error" });
    });
  });
}

async function createMaterialImageFieldFixture(draft: ProductImageStudioMaterialDraft): Promise<{
  readonly currentDraft: () => ProductImageStudioMaterialDraft;
  readonly currentMessage: () => ImageFieldMessage;
  readonly onChange: TestFileChangeHandler;
}> {
  vi.resetModules();
  let currentDraft = draft;
  let currentMessage: ImageFieldMessage = null;
  vi.doMock("react", async (importOriginal) => {
    const original = await importOriginal<typeof import("react")>();
    return {
      ...original,
      useState: () =>
        [
          currentMessage,
          (update: SetStateAction<ImageFieldMessage>) => {
            currentMessage = typeof update === "function" ? update(currentMessage) : update;
          },
        ] as const,
    };
  });
  const { ProductImageStudioMaterialImageField } = await import(
    "@/components/product-image-studio/ProductImageStudioMaterialImageField"
  );
  const element = ProductImageStudioMaterialImageField({
    draft,
    setDraft: (update) => {
      currentDraft = typeof update === "function" ? update(currentDraft) : update;
    },
  });
  const onChange = findFileInputChangeHandler(element);
  if (!onChange) {
    throw new Error("Expected material image file input change handler");
  }
  return { currentDraft: () => currentDraft, currentMessage: () => currentMessage, onChange };
}

function createFileInput(file: File): {
  readonly currentValidityMessage: () => string;
  readonly element: TestFileInput;
} {
  let validityMessage = "";
  return {
    currentValidityMessage: () => validityMessage,
    element: {
      files: { item: (index) => (index === 0 ? file : null) },
      setCustomValidity: (message) => {
        validityMessage = message;
      },
      value: file.name,
    },
  };
}

function findFileInputChangeHandler(node: ReactNode): TestFileChangeHandler | null {
  if (!isValidElement<FileInputElementProps>(node)) {
    return null;
  }
  if (node.props.type === "file" && node.props.onChange) {
    return node.props.onChange;
  }
  const children = node.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const handler = findFileInputChangeHandler(child);
      if (handler) {
        return handler;
      }
    }
  }
  return findFileInputChangeHandler(children);
}
