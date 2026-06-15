import { ProductImageStudioImageGenerator } from "@/components/product-image-studio/ProductImageStudioImageGenerator";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import { loadProductImageStudioProviderSettingsState } from "@/features/product-image-studio/server/providerSettingsState";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioImageGeneratorPage() {
  const providerSettingsState = await loadProductImageStudioProviderSettingsState();

  return (
    <ProductImageStudioShell
      activePath="/product-image-studio/ai-tools/image-generator"
      description="프롬프트와 참고 이미지로 바로 쓸 수 있는 상품 이미지를 만듭니다."
      showPrimaryAction={false}
      title="AI 이미지 생성기"
    >
      <ProductImageStudioImageGenerator providerStatus={providerSettingsState.status} />
    </ProductImageStudioShell>
  );
}
