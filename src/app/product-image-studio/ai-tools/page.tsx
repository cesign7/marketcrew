import { ProductImageStudioAiToolsHub } from "@/components/product-image-studio/ProductImageStudioAiTools";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";

export default function ProductImageStudioAiToolsPage() {
  return (
    <ProductImageStudioShell
      activePath="/product-image-studio/ai-tools"
      description="상품컷 생성에 필요한 AI 도구를 모았습니다."
      title="AI 도구"
    >
      <section className="page-stack">
        <ProductImageStudioAiToolsHub />
      </section>
    </ProductImageStudioShell>
  );
}
