import Link from "next/link";
import { Activity, FileText, Image as ImageIcon, Layers, Plus, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "./ProductImageStudioAiTools.module.css";

type EnabledAiToolCard = {
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly state: "enabled";
  readonly title: string;
};

type DisabledAiToolCard = {
  readonly description: string;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly state: "disabled";
  readonly title: string;
};

type AiToolCard = EnabledAiToolCard | DisabledAiToolCard;

const AI_TOOL_CARDS: readonly AiToolCard[] = [
  {
    description: "인쇄물 디자인을 업로드하고 실제 규격에 맞춘 설정샷을 만듭니다.",
    href: "/product-image-studio/ai-tools/product-staging",
    icon: Sparkles,
    id: "product-staging",
    state: "enabled",
    title: "상품 설정샷 생성",
  },
  {
    description: "프롬프트와 참고 이미지를 넣어 새 이미지를 생성합니다.",
    href: "/product-image-studio/ai-tools/image-generator",
    icon: ImageIcon,
    id: "image-generator",
    state: "enabled",
    title: "AI 이미지 생성기",
  },
  {
    description: "촬영 분위기에 맞는 배경과 소품 후보를 준비합니다.",
    icon: ImageIcon,
    id: "background-props",
    state: "disabled",
    title: "배경/소품 생성",
  },
  {
    description: "대표 이미지와 상세 이미지에 맞는 출력 비율을 조정합니다.",
    icon: Settings,
    id: "ratio-resize",
    state: "disabled",
    title: "비율 변경",
  },
  {
    description: "선택한 결과와 닮은 이미지 후보를 더 만듭니다.",
    icon: Activity,
    id: "similar-image",
    state: "disabled",
    title: "비슷한 이미지 생성",
  },
  {
    description: "보관한 디자인을 목업 화면에 합성합니다.",
    icon: Layers,
    id: "mockup-composite",
    state: "disabled",
    title: "목업 합성",
  },
  {
    description: "상세페이지에 넣을 이미지 블록 구성을 만듭니다.",
    icon: FileText,
    id: "detail-page-blocks",
    state: "disabled",
    title: "상세페이지 이미지 블록 생성",
  },
] as const;

export function ProductImageStudioAiToolsHub() {
  return (
    <section className={styles.hub} aria-label="AI 도구 목록">
      <div className={styles.summary}>
        <div>
          <p className={styles.kicker}>도구 목록</p>
          <h2>이미지 작업 도구</h2>
        </div>
        <span className={styles.count}>7개 도구</span>
      </div>

      <div className={styles.toolGrid}>
        {AI_TOOL_CARDS.map((tool) => (
          <AiToolCardItem key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function AiToolCardItem({ tool }: { readonly tool: AiToolCard }) {
  const Icon = tool.icon;

  return (
    <article className={styles.toolCard} data-ai-tool-card={tool.id} data-ai-tool-state={tool.state}>
      <div className={styles.cardHeader}>
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon size={20} strokeWidth={2.2} />
        </span>
        <span className={tool.state === "enabled" ? styles.readyPill : styles.pendingPill}>
          {tool.state === "enabled" ? "사용 가능" : "준비 중"}
        </span>
      </div>

      <div className={styles.cardCopy}>
        <h2>{tool.title}</h2>
        <p>{tool.description}</p>
      </div>

      {tool.state === "enabled" ? (
        <Link className={styles.cardAction} href={tool.href} prefetch={false}>
          <span className={styles.actionIcon} aria-hidden="true">
            <Plus size={16} strokeWidth={2.35} />
          </span>
          바로 시작
        </Link>
      ) : (
        <button className={styles.disabledAction} type="button" disabled aria-disabled="true">
          준비 중
        </button>
      )}
    </article>
  );
}
