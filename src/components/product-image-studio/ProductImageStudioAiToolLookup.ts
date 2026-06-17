import {
  PRODUCT_IMAGE_STUDIO_AI_TOOLS,
  type ProductImageStudioAiTool,
} from "./ProductImageStudioAiToolCatalog";

export function findProductImageStudioAiTool(toolId: string | undefined): ProductImageStudioAiTool | null {
  if (!toolId) return null;
  return PRODUCT_IMAGE_STUDIO_AI_TOOLS.find((candidate) => candidate.id === toolId) ?? null;
}

export function isProductImageStudioAiToolRunnable(tool: ProductImageStudioAiTool): boolean {
  switch (tool.kind) {
    case "generator":
    case "svg":
      return true;
    case "planned":
      return false;
    default:
      return assertNever(tool.kind);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected AI tool kind: ${JSON.stringify(value)}`);
}
