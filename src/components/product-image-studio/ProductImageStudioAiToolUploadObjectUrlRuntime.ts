export type ProductImageStudioAiToolUploadObjectUrlRuntime = {
  readonly createForSlot: (slotId: string, file: File) => string;
  readonly revokeAll: () => void;
  readonly revokeForSlot: (slotId: string) => void;
};

type ProductImageStudioAiToolUploadObjectUrlRuntimeOptions = {
  readonly createObjectUrl: (file: File) => string;
  readonly revokeObjectUrl: (previewUrl: string) => void;
};

export function createProductImageStudioAiToolUploadObjectUrlRuntime(
  options: ProductImageStudioAiToolUploadObjectUrlRuntimeOptions,
): ProductImageStudioAiToolUploadObjectUrlRuntime {
  const previewUrlsBySlot = new Map<string, string>();

  return {
    createForSlot: (slotId, file) => {
      const previewUrl = options.createObjectUrl(file);
      const previousPreviewUrl = previewUrlsBySlot.get(slotId);
      if (previousPreviewUrl !== undefined) {
        options.revokeObjectUrl(previousPreviewUrl);
      }
      previewUrlsBySlot.set(slotId, previewUrl);
      return previewUrl;
    },
    revokeAll: () => {
      for (const previewUrl of previewUrlsBySlot.values()) {
        options.revokeObjectUrl(previewUrl);
      }
      previewUrlsBySlot.clear();
    },
    revokeForSlot: (slotId) => {
      const previewUrl = previewUrlsBySlot.get(slotId);
      if (previewUrl === undefined) return;
      options.revokeObjectUrl(previewUrl);
      previewUrlsBySlot.delete(slotId);
    },
  };
}
