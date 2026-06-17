import { Images, Layers3, Mail, Palette, ScrollText, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CompactActionCard,
  CompactCardGrid,
  CompactPageHeader,
} from "./ProductImageStudioSaasPrimitives";
import { WorkspaceSupportShell } from "./ProductImageStudioWorkspaceSupportLayout";
import styles from "./ProductImageStudioWorkspaceSupportPages.module.css";

type CompactLinkCard = {
  readonly actionLabel: string;
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly statusLabel?: string;
  readonly title: string;
};

const LIBRARY_CARDS: readonly CompactLinkCard[] = [
  {
    actionLabel: "열기",
    description: "촬영 구도와 합성 참고 파일을 모읍니다.",
    href: "/product-image-studio/uploads?kind=mockups",
    icon: Images,
    id: "mockups",
    statusLabel: "업로드",
    title: "목업",
  },
  {
    actionLabel: "열기",
    description: "배경 이미지와 소품 자료를 모읍니다.",
    href: "/product-image-studio/uploads?kind=backgrounds",
    icon: Palette,
    id: "background-props",
    statusLabel: "업로드",
    title: "배경/소품",
  },
  {
    actionLabel: "편집",
    description: "인쇄 재질과 용지 기준을 관리합니다.",
    href: "/product-image-studio/specs?tab=materials",
    icon: Layers3,
    id: "materials",
    statusLabel: "규격",
    title: "용지·재질",
  },
  {
    actionLabel: "편집",
    description: "카드, 봉투, 스티커 규격 편집기로 이동합니다.",
    href: "/product-image-studio/specs",
    icon: ScrollText,
    id: "product-specs",
    statusLabel: "규격",
    title: "상품 규격",
  },
] as const;

export function ProductImageStudioLibraryWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/library"
      description="작업 자료와 규격 편집기를 한곳에서 엽니다."
      title="라이브러리"
    >
      <CompactPageHeader
        eyebrow="자료 바로가기"
        title="라이브러리"
        description="목업, 배경/소품, 용지·재질, 상품 규격을 빠르게 엽니다."
        meta={`${LIBRARY_CARDS.length}개`}
      />
      <CompactCardGrid ariaLabel="라이브러리 바로가기">
        {LIBRARY_CARDS.map((card) => renderLinkCard(card))}
      </CompactCardGrid>
    </WorkspaceSupportShell>
  );
}

export function ProductImageStudioInviteWorkspacePage() {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/invite"
      description="팀원 초대 화면을 미리 확인합니다."
      showPrimaryAction={false}
      title="회원초대"
    >
      <CompactPageHeader
        eyebrow="UI 전용"
        title="회원초대"
        description="초대 메일은 발송하지 않습니다."
        meta="발송 안 함"
      />
      <CompactCardGrid ariaLabel="회원초대 상태">
        <CompactActionCard
          actionKind="disabled"
          actionLabel="UI 전용"
          description="현재 화면은 초대 초안만 확인합니다."
          iconNode={renderCompactIcon(UserPlus)}
          id="invite-ui-only"
          statusLabel="발송하지 않습니다"
          title="초대 발송 차단"
        />
        <CompactActionCard
          actionKind="link"
          actionLabel="설정 확인"
          description="실제 권한 관리는 환경설정에서 별도 승인 후 연결합니다."
          href="/product-image-studio/settings"
          iconNode={renderCompactIcon(Mail)}
          id="invite-settings"
          statusLabel="대기"
          title="권한 연결 대기"
        />
      </CompactCardGrid>
      <form aria-label="회원초대 초안" className={styles.panel} data-invite-ui-only="true">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>초대 초안</span>
          <h2>발송하지 않는 입력란</h2>
          <p>입력값은 이 화면에서만 보이며 서버로 보내지 않습니다.</p>
        </div>
        <div className={styles.twoColumn}>
          <label>
            <span>이메일</span>
            <input
              autoComplete="off"
              inputMode="email"
              name="invite-email"
              pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
              placeholder="name@example.com"
              type="email"
            />
          </label>
          <label>
            <span>역할</span>
            <select defaultValue="viewer" name="invite-role">
              <option value="viewer">보기 전용</option>
              <option value="operator">작업 가능</option>
            </select>
          </label>
        </div>
        <label>
          <span>메모</span>
          <textarea name="invite-note" placeholder="초대 목적을 짧게 적어 둡니다." rows={3} />
        </label>
        <button className={styles.secondaryAction} type="button">
          초대 미리보기
        </button>
      </form>
    </WorkspaceSupportShell>
  );
}

function renderLinkCard(card: CompactLinkCard) {
  return (
    <CompactActionCard
      actionKind="link"
      actionLabel={card.actionLabel}
      description={card.description}
      href={card.href}
      iconNode={renderCompactIcon(card.icon)}
      id={card.id}
      key={card.id}
      statusLabel={card.statusLabel}
      statusTone="ready"
      title={card.title}
    />
  );
}

function renderCompactIcon(Icon: LucideIcon) {
  return <Icon size={20} strokeWidth={2.2} />;
}
