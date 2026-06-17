"use client";

import Link from "next/link";
import { Activity, FileDown, FileText, Image as ImageIcon, Layers, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  ProductImageStudioImageGeneratorCount,
  ProductImageStudioImageGeneratorModelLabel,
  ProductImageStudioImageGeneratorRatio,
  ProductImageStudioImageGeneratorResolution,
} from "@/features/product-image-studio/domain/imageGenerator";
import { ProductImageStudioGenerationOptionControls } from "./ProductImageStudioGenerationOptionControls";
import {
  CompactActionCard,
  CompactCardGrid,
  CompactPageHeader,
  CompactWorkModal,
} from "./ProductImageStudioSaasPrimitives";
import {
  ProductImageStudioSvgConversionModal,
  type ProductImageStudioSvgConversionState,
} from "./ProductImageStudioSvgConversionModal";
import styles from "./ProductImageStudioAiTools.module.css";

type AiToolCardBase = {
  readonly description: string;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly statusLabel: string;
  readonly title: string;
};

type RouteAiToolCard = AiToolCardBase & {
  readonly href: string;
  readonly kind: "route";
  readonly optionNamePrefix: "imageGenerator" | "productStaging";
};

type SvgAiToolCard = AiToolCardBase & {
  readonly kind: "svg";
};

type PlanningAiToolCard = AiToolCardBase & {
  readonly kind: "planning";
  readonly planHint: string;
};

type AiToolCard = PlanningAiToolCard | RouteAiToolCard | SvgAiToolCard;

const AI_TOOL_CARDS = [
  { description: "인쇄물 디자인을 업로드하고 실제 규격에 맞춘 설정샷을 만듭니다.", href: "/product-image-studio/ai-tools/product-staging", icon: Sparkles, id: "product-staging", kind: "route", optionNamePrefix: "productStaging", statusLabel: "사용 가능", title: "상품 설정샷 생성" },
  { description: "프롬프트와 참고 이미지를 넣어 새 이미지를 생성합니다.", href: "/product-image-studio/ai-tools/image-generator", icon: ImageIcon, id: "image-generator", kind: "route", optionNamePrefix: "imageGenerator", statusLabel: "사용 가능", title: "AI 이미지 생성기" },
  { description: "PNG 이미지를 로컬 벡터 SVG로 바꿉니다.", icon: FileDown, id: "svg-conversion", kind: "svg", statusLabel: "새 도구", title: "SVG 변환" },
  { description: "촬영 분위기에 맞는 배경과 소품 후보를 준비합니다.", icon: ImageIcon, id: "background-props", kind: "planning", planHint: "톤, 소품, 배경 방향을 먼저 정리합니다.", statusLabel: "계획", title: "배경/소품 생성" },
  { description: "대표 이미지와 상세 이미지에 맞는 출력 비율을 조정합니다.", icon: Settings, id: "ratio-resize", kind: "planning", planHint: "원본 유지 영역과 새 출력 비율을 확인합니다.", statusLabel: "계획", title: "비율 변경" },
  { description: "선택한 결과와 닮은 이미지 후보를 더 만듭니다.", icon: Activity, id: "similar-image", kind: "planning", planHint: "참고 결과와 변형 강도를 먼저 정합니다.", statusLabel: "계획", title: "비슷한 이미지 생성" },
  { description: "보관한 디자인을 목업 화면에 합성합니다.", icon: Layers, id: "mockup-composite", kind: "planning", planHint: "목업 종류와 배치 기준을 정리합니다.", statusLabel: "계획", title: "목업 합성" },
  { description: "상세페이지용 이미지 구성을 만듭니다.", icon: FileText, id: "detail-page-blocks", kind: "planning", planHint: "섹션 순서와 필요한 이미지 수를 정합니다.", statusLabel: "계획", title: "상세 이미지 블록" },
] as const satisfies readonly AiToolCard[];

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
  const [selectedTool, setSelectedTool] = useState<AiToolCard | null>(() => findTool(initialToolId));
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
        <CompactPageHeader eyebrow="도구 목록" meta={`${AI_TOOL_CARDS.length}개 도구`} title="이미지 작업 도구" />

        <CompactCardGrid ariaLabel="이미지 작업 도구">
          {AI_TOOL_CARDS.map((tool) => (
            <AiToolCardItem disabled={!isHydrated} key={tool.id} onSelect={setSelectedTool} tool={tool} />
          ))}
        </CompactCardGrid>
      </div>

      {selectedTool ? (
        <AiToolModal
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
  readonly onSelect: (tool: AiToolCard) => void;
  readonly tool: AiToolCard;
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
      statusTone={tool.kind === "planning" ? "pending" : "ready"}
      title={tool.title}
    />
  );
}

function AiToolModal({
  onClose,
  svgConversionInitialState,
  svgConversionInitialTitle,
  tool,
}: {
  readonly onClose: () => void;
  readonly svgConversionInitialState: ProductImageStudioSvgConversionState | undefined;
  readonly svgConversionInitialTitle: string | undefined;
  readonly tool: AiToolCard;
}) {
  switch (tool.kind) {
    case "route":
      return <RouteToolModal onClose={onClose} tool={tool} />;
    case "svg":
      return (
        <CompactWorkModal description={tool.description} onClose={onClose} open title="SVG 변환">
          <ProductImageStudioSvgConversionModal initialState={svgConversionInitialState} initialTitle={svgConversionInitialTitle} />
        </CompactWorkModal>
      );
    case "planning":
      return <PlanningToolModal onClose={onClose} tool={tool} />;
    default:
      return assertNever(tool);
  }
}

function RouteToolModal({ onClose, tool }: { readonly onClose: () => void; readonly tool: RouteAiToolCard }) {
  const [modelLabel, setModelLabel] = useState<ProductImageStudioImageGeneratorModelLabel>("gpt2");
  const [count, setCount] = useState<ProductImageStudioImageGeneratorCount>(1);
  const [ratio, setRatio] = useState<ProductImageStudioImageGeneratorRatio>("1:1");
  const [resolution, setResolution] = useState<ProductImageStudioImageGeneratorResolution>("1k");

  return (
    <CompactWorkModal
      description={tool.description}
      footer={
        <Link href={tool.href} prefetch={false}>
          작업 화면 열기
        </Link>
      }
      onClose={onClose}
      open
      title={`${tool.title} 준비`}
    >
      <div className={styles.modalStack}>
        <p>필요한 옵션을 확인한 뒤 작업 화면에서 이어갑니다.</p>
        <ProductImageStudioGenerationOptionControls count={count} modelLabel={modelLabel} namePrefix={tool.optionNamePrefix} onCountChange={setCount} onModelLabelChange={setModelLabel} onRatioChange={setRatio} onResolutionChange={setResolution} ratio={ratio} resolution={resolution} title="생성 옵션" />
      </div>
    </CompactWorkModal>
  );
}

function PlanningToolModal({ onClose, tool }: { readonly onClose: () => void; readonly tool: PlanningAiToolCard }) {
  return (
    <CompactWorkModal description={tool.description} onClose={onClose} open title={`${tool.title} 준비`}>
      <form className={styles.planningForm} data-ai-tool-planning="true">
        <p>작업 계획</p>
        <label className={styles.field}>
          <span>요청 메모</span>
          <textarea name={`${tool.id}-memo`} placeholder={tool.planHint} rows={3} />
        </label>
        <div className={styles.inlineGrid}>
          <label className={styles.field}>
            <span>자료 개수</span>
            <select name={`${tool.id}-asset-count`} defaultValue="3">
              <option value="1">1개</option>
              <option value="3">3개</option>
              <option value="5">5개</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>비율</span>
            <select name={`${tool.id}-ratio`} defaultValue="1:1">
              <option value="1:1">1:1</option>
              <option value="4:5">4:5</option>
              <option value="16:9">16:9</option>
            </select>
          </label>
        </div>
        <button className={styles.secondaryButton} type="button">
          작업 계획 저장
        </button>
      </form>
    </CompactWorkModal>
  );
}

function findTool(toolId: string | undefined): AiToolCard | null {
  if (!toolId) return null;
  const tool = AI_TOOL_CARDS.find((candidate) => candidate.id === toolId);
  return tool ?? null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected AI tool state: ${JSON.stringify(value)}`);
}
