"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PRODUCT_IMAGE_STUDIO_AI_TOOLS,
  type ProductImageStudioAiTool,
} from "./ProductImageStudioAiToolCatalog";
import {
  findProductImageStudioAiTool,
  isProductImageStudioAiToolRunnable,
} from "./ProductImageStudioAiToolLookup";
import { ProductImageStudioAiToolWorkspaceModal } from "./ProductImageStudioAiToolWorkspaceModal";
import {
  CompactActionCard,
  CompactCardGrid,
  CompactEmptyState,
  CompactPageHeader,
  CompactWorkModal,
} from "./ProductImageStudioSaasPrimitives";
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
  const selectedRunnableTool =
    selectedTool && isProductImageStudioAiToolRunnable(selectedTool) ? selectedTool : null;
  const selectedPlannedTool =
    selectedTool && isProductImageStudioAiToolRunnable(selectedTool) === false ? selectedTool : null;

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

      {selectedRunnableTool ? (
        <ProductImageStudioAiToolWorkspaceModal
          onClose={closeTool}
          svgConversionInitialState={svgConversionInitialState}
          svgConversionInitialTitle={svgConversionInitialTitle}
          tool={selectedRunnableTool}
        />
      ) : null}
      {selectedPlannedTool ? <PlannedAiToolModal onClose={closeTool} tool={selectedPlannedTool} /> : null}
    </section>
  );
}

function PlannedAiToolModal({
  onClose,
  tool,
}: {
  readonly onClose: () => void;
  readonly tool: ProductImageStudioAiTool;
}) {
  return (
    <CompactWorkModal description={tool.description} onClose={onClose} open title={tool.title}>
      <CompactEmptyState
        description={`${tool.title} 워크플로를 곧 연결할 예정입니다. 지금은 생성 요청을 보내지 않습니다.`}
        title="준비 중"
      />
    </CompactWorkModal>
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
  const isRunnable = isProductImageStudioAiToolRunnable(tool);

  return (
    <CompactActionCard
      actionKind="button"
      actionLabel={isRunnable ? "열기" : "준비 중"}
      dataAttributes={{
        "data-ai-tool-card": tool.id,
        "data-ai-tool-card-ready": disabled || !isRunnable ? "false" : "true",
        "data-ai-tool-state": isRunnable ? "modal" : "planned",
      }}
      description={tool.description}
      disabled={disabled}
      icon={tool.icon}
      id={tool.id}
      onSelect={() => onSelect(tool)}
      statusLabel={isRunnable ? tool.statusLabel : "준비 중"}
      statusTone={isRunnable ? "ready" : "pending"}
      title={tool.title}
    />
  );
}
