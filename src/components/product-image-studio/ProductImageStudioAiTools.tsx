"use client";

import { useCallback, useEffect, useState } from "react";
import {
  findProductImageStudioAiTool,
  PRODUCT_IMAGE_STUDIO_AI_TOOLS,
  type ProductImageStudioAiTool,
} from "./ProductImageStudioAiToolCatalog";
import { ProductImageStudioAiToolWorkspaceModal } from "./ProductImageStudioAiToolWorkspaceModal";
import { CompactActionCard, CompactCardGrid, CompactPageHeader } from "./ProductImageStudioSaasPrimitives";
import type { ProductImageStudioSvgConversionState } from "./ProductImageStudioSvgConversionModal";

type ProductImageStudioAiToolsHubProps = {
  readonly initialToolId?: string;
  readonly svgConversionInitialState?: ProductImageStudioSvgConversionState;
  readonly svgConversionInitialTitle?: string;
};

export function ProductImageStudioAiToolsHub({
  initialToolId,
  svgConversionInitialState,
  svgConversionInitialTitle,
}: ProductImageStudioAiToolsHubProps) {
  const [selectedTool, setSelectedTool] = useState<ProductImageStudioAiTool | null>(() =>
    findProductImageStudioAiTool(initialToolId),
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const closeTool = useCallback(() => {
    setSelectedTool(null);
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <section aria-label="AI 도구 목록" data-ai-tool-hydrated={isHydrated ? "true" : "false"}>
      <div
        aria-hidden={selectedTool ? true : undefined}
        data-ai-tool-background="true"
        inert={selectedTool ? true : undefined}
      >
        <CompactPageHeader
          eyebrow="도구 목록"
          meta={`${PRODUCT_IMAGE_STUDIO_AI_TOOLS.length}개 도구`}
          title="이미지 작업 도구"
        />

        <CompactCardGrid ariaLabel="이미지 작업 도구">
          {PRODUCT_IMAGE_STUDIO_AI_TOOLS.map((tool) => (
            <AiToolCardItem disabled={!isHydrated} key={tool.id} onSelect={setSelectedTool} tool={tool} />
          ))}
        </CompactCardGrid>
      </div>

      {selectedTool ? (
        <ProductImageStudioAiToolWorkspaceModal
          onClose={closeTool}
          svgConversionInitialState={svgConversionInitialState}
          svgConversionInitialTitle={svgConversionInitialTitle}
          tool={selectedTool}
        />
      ) : null}
    </section>
  );
}

function AiToolCardItem({
  disabled,
  onSelect,
  tool,
}: {
  readonly disabled: boolean;
  readonly onSelect: (tool: ProductImageStudioAiTool) => void;
  readonly tool: ProductImageStudioAiTool;
}) {
  return (
    <CompactActionCard
      actionKind="button"
      actionLabel="열기"
      dataAttributes={{
        "data-ai-tool-card": tool.id,
        "data-ai-tool-card-ready": disabled ? "false" : "true",
        "data-ai-tool-state": "modal",
      }}
      description={tool.description}
      disabled={disabled}
      icon={tool.icon}
      id={tool.id}
      onSelect={() => onSelect(tool)}
      statusLabel={tool.statusLabel}
      statusTone={tool.statusLabel === "계획" ? "pending" : "ready"}
      title={tool.title}
    />
  );
}
