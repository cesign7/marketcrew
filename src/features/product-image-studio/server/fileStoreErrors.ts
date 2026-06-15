export type ProductImageStudioFileStoreErrorCode = "UNSUPPORTED_IMAGE_TYPE" | "IMAGE_TOO_LARGE" | "UNSAFE_SVG_ASSET";

export class ProductImageStudioFileStoreError extends Error {
  readonly code: ProductImageStudioFileStoreErrorCode;

  constructor(code: ProductImageStudioFileStoreErrorCode, message: string) {
    super(message);
    this.name = "ProductImageStudioFileStoreError";
    this.code = code;
  }
}
