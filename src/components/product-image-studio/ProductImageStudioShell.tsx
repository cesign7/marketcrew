import Link from "next/link";
import {
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  ChevronsUpDown,
  CircleUserRound,
  FileText,
  Home,
  Layers,
  Plus,
  Search,
  Settings,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "./ProductImageStudioShell.module.css";
import sidebarStyles from "./ProductImageStudioShellSidebar.module.css";
import workspaceStyles from "./ProductImageStudioShellWorkspace.module.css";

type ProductImageStudioShellProps = {
  readonly activePath: string;
  readonly children: React.ReactNode;
  readonly description: string;
  readonly showPrimaryAction?: boolean;
  readonly title: string;
};

type ProductImageStudioNavigationItem = {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly activePaths?: readonly string[];
};

type ProductImageStudioNavigationGroup = {
  readonly label: string;
  readonly items: readonly ProductImageStudioNavigationItem[];
};

type ProductImageStudioNavigationSummary = {
  readonly href: string;
  readonly label: string;
};

const PRODUCT_IMAGE_STUDIO_HOME_NAV_ITEM: ProductImageStudioNavigationItem = {
  key: "home",
  href: "/product-image-studio",
  label: "홈",
  icon: Home,
};

const PRODUCT_IMAGE_STUDIO_PRIMARY_NAV_ITEMS: readonly ProductImageStudioNavigationItem[] = [
  PRODUCT_IMAGE_STUDIO_HOME_NAV_ITEM,
  { key: "ai-tools", href: "/product-image-studio/ai-tools", label: "AI 도구", icon: Sparkles },
  { key: "batch", href: "/product-image-studio/batch", label: "일괄처리", icon: Layers },
  { key: "templates", href: "/product-image-studio/templates", label: "상품템플릿", icon: FileText },
  { key: "uploads", href: "/product-image-studio/uploads", label: "업로드", icon: Upload },
  {
    key: "library",
    href: "/product-image-studio/library",
    label: "라이브러리",
    icon: BookOpen,
    activePaths: ["/product-image-studio/specs"],
  },
  {
    key: "results",
    href: "/product-image-studio/results",
    label: "결과 보관함",
    icon: Archive,
    activePaths: [
      "/product-image-studio/activity",
      "/product-image-studio/designs",
      "/product-image-studio/projects",
    ],
  },
] as const;

const PRODUCT_IMAGE_STUDIO_BOTTOM_NAV_ITEMS: readonly ProductImageStudioNavigationItem[] = [
  { key: "usage", href: "/product-image-studio/usage", label: "사용량", icon: BarChart3 },
  { key: "invite", href: "/product-image-studio/invite", label: "회원초대", icon: UserPlus },
  { key: "settings", href: "/product-image-studio/settings", label: "환경설정", icon: Settings },
] as const;

const PRODUCT_IMAGE_STUDIO_NAV_GROUPS: readonly ProductImageStudioNavigationGroup[] = [
  {
    label: "작업",
    items: PRODUCT_IMAGE_STUDIO_PRIMARY_NAV_ITEMS,
  },
];

const PRODUCT_IMAGE_STUDIO_NAV_ITEMS = [
  ...PRODUCT_IMAGE_STUDIO_PRIMARY_NAV_ITEMS,
  ...PRODUCT_IMAGE_STUDIO_BOTTOM_NAV_ITEMS,
] as const;

export function getProductImageStudioNavItems(): readonly ProductImageStudioNavigationSummary[] {
  return PRODUCT_IMAGE_STUDIO_NAV_ITEMS.map((area) => ({ href: area.href, label: area.label }));
}

export function ProductImageStudioShell({
  activePath,
  children,
  description,
  showPrimaryAction = true,
  title,
}: ProductImageStudioShellProps) {
  const activeArea = getActiveArea(activePath);
  const ActiveIcon = activeArea.icon;

  return (
    <main className={styles.shell}>
      <aside className={sidebarStyles.sidebar} aria-label="상품 이미지 스튜디오 메뉴">
        <button className={sidebarStyles.workspaceSwitcher} type="button" aria-label="작업공간 전환">
          <span className={sidebarStyles.brandMark} aria-hidden="true">
            <Sparkles size={18} strokeWidth={2.35} />
          </span>
          <span className={sidebarStyles.workspaceCopy}>
            <strong>마켓크루</strong>
            <span>인쇄물 상품컷</span>
          </span>
          <ChevronsUpDown size={15} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className={sidebarStyles.railSection}>
          <nav className={sidebarStyles.nav} aria-label="상품 이미지 스튜디오 메뉴">
            {PRODUCT_IMAGE_STUDIO_NAV_GROUPS.map((group) => (
              <div className={sidebarStyles.navGroup} key={group.label}>
                <span className={sidebarStyles.sectionLabel}>{group.label}</span>
                {group.items.map((area) => renderNavigationLink(area, activeArea))}
              </div>
            ))}
          </nav>
        </div>

        <div className={sidebarStyles.sidebarFooter} style={{ display: "grid" }}>
          <nav className={sidebarStyles.nav} aria-label="상품 이미지 스튜디오 보조 메뉴">
            <div className={sidebarStyles.navGroup}>
              {PRODUCT_IMAGE_STUDIO_BOTTOM_NAV_ITEMS.map((area) => renderNavigationLink(area, activeArea))}
            </div>
          </nav>
          <div className={sidebarStyles.usageBadge} aria-label="이번 달 사용량">
            <span>이번 달 사용량</span>
            <strong>24 / 100장</strong>
          </div>
          <div className={sidebarStyles.accountArea}>
            <span className={sidebarStyles.accountIcon} aria-hidden="true">
              <CircleUserRound size={18} strokeWidth={2.2} />
            </span>
            <span className={sidebarStyles.accountCopy}>
              <span>운영 계정</span>
              <strong>관리자</strong>
            </span>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <section className={workspaceStyles.workspace}>
        <header className={workspaceStyles.topBar}>
          <button className={workspaceStyles.commandSearch} type="button" aria-label="스튜디오 검색">
            <span className={workspaceStyles.searchIcon} aria-hidden="true">
              <Search size={16} strokeWidth={2.25} />
            </span>
            <span className={workspaceStyles.commandSearchText}>상품명, 디자인, 생성 항목 검색</span>
            <kbd className={workspaceStyles.commandKey}>⌘K</kbd>
          </button>
          <div className={workspaceStyles.topBarActions}>
            <button className={workspaceStyles.iconButton} type="button" aria-label="알림">
              <Bell size={17} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className={workspaceStyles.pageHeader} aria-label="현재 작업">
          <div className={workspaceStyles.titleCopy}>
            <span>
              <span className={workspaceStyles.titleIcon} aria-hidden="true">
                <ActiveIcon size={14} strokeWidth={2.3} />
              </span>
              {activeArea.label}
            </span>
            <h1>{title}</h1>
            {description.trim().length > 0 ? <p>{description}</p> : null}
          </div>
          {showPrimaryAction ? (
            <Link className={workspaceStyles.primaryLink} href="/product-image-studio/ai-tools/product-staging" prefetch={false}>
              <span className={workspaceStyles.primaryIcon} aria-hidden="true">
                <Plus size={16} strokeWidth={2.35} />
              </span>
              새 상품컷
            </Link>
          ) : null}
        </section>

        <section className={workspaceStyles.contentWell}>
          {children}
        </section>
      </section>
    </main>
  );
}

function renderNavigationLink(
  area: ProductImageStudioNavigationItem,
  activeArea: ProductImageStudioNavigationItem,
): React.ReactNode {
  const Icon = area.icon;
  return (
    <Link
      aria-current={activeArea.key === area.key ? "page" : undefined}
      className={activeArea.key === area.key ? sidebarStyles.activeLink : sidebarStyles.navLink}
      href={area.href}
      key={area.key}
      prefetch={false}
    >
      <span className={sidebarStyles.navIcon} aria-hidden="true">
        <Icon size={17} strokeWidth={2.25} />
      </span>
      <span className={sidebarStyles.navText}>
        <strong>{area.label}</strong>
      </span>
    </Link>
  );
}

function getActiveArea(activePath: string): ProductImageStudioNavigationItem {
  let activeArea = PRODUCT_IMAGE_STUDIO_HOME_NAV_ITEM;
  let activeRank = -1;

  for (const area of PRODUCT_IMAGE_STUDIO_NAV_ITEMS) {
    const nextRank = getActiveAreaRank(area, activePath);
    if (nextRank > activeRank) {
      activeArea = area;
      activeRank = nextRank;
    }
  }

  return activeArea;
}

function getActiveAreaRank(area: ProductImageStudioNavigationItem, activePath: string): number {
  const paths = [area.href, ...(area.activePaths ?? [])];
  let activeRank = -1;

  for (const path of paths) {
    if (activePath === path || activePath.startsWith(`${path}/`)) {
      activeRank = Math.max(activeRank, path.length);
    }
  }

  return activeRank;
}
