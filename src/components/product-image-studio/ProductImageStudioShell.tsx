import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronsUpDown,
  CircleUserRound,
  FileText,
  Home,
  Image,
  Layers,
  Plus,
  Ruler,
  Search,
  Settings,
  Sparkles,
  Upload,
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

const PRODUCT_IMAGE_STUDIO_NAV_GROUPS: readonly ProductImageStudioNavigationGroup[] = [
  {
    label: "작업",
    items: [
      PRODUCT_IMAGE_STUDIO_HOME_NAV_ITEM,
      { key: "ai-tools", href: "/product-image-studio/ai-tools", label: "AI 도구", icon: Sparkles },
      { key: "batch", href: "/product-image-studio/batch", label: "일괄처리", icon: Layers },
      {
        key: "activity",
        href: "/product-image-studio/activity",
        label: "활동",
        icon: Activity,
        activePaths: ["/product-image-studio/results"],
      },
    ],
  },
  {
    label: "내 콘텐츠",
    items: [
      {
        key: "designs",
        href: "/product-image-studio/designs",
        label: "디자인",
        icon: Image,
        activePaths: ["/product-image-studio/projects"],
      },
      { key: "templates", href: "/product-image-studio/templates", label: "템플릿", icon: FileText },
      { key: "uploads", href: "/product-image-studio/uploads", label: "업로드", icon: Upload },
      { key: "specs", href: "/product-image-studio/specs", label: "상품 규격", icon: Ruler },
    ],
  },
  {
    label: "관리",
    items: [
      { key: "usage", href: "/product-image-studio/usage", label: "사용량", icon: BarChart3 },
      { key: "settings", href: "/product-image-studio/settings", label: "환경설정", icon: Settings },
    ],
  },
];

const PRODUCT_IMAGE_STUDIO_NAV_ITEMS = PRODUCT_IMAGE_STUDIO_NAV_GROUPS.flatMap((group) => group.items);

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
                {group.items.map((area) => {
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
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className={sidebarStyles.sidebarFooter}>
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
