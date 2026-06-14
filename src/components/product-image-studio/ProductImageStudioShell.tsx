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
  Search,
  Settings,
  Sparkles,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "./ProductImageStudioShell.module.css";

type ProductImageStudioShellProps = {
  readonly activePath: string;
  readonly children: React.ReactNode;
  readonly description: string;
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

export function ProductImageStudioShell({ activePath, children, description, title }: ProductImageStudioShellProps) {
  const activeArea = getActiveArea(activePath);
  const ActiveIcon = activeArea.icon;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar} aria-label="상품 이미지 스튜디오 메뉴">
        <button className={styles.workspaceSwitcher} type="button" aria-label="작업공간 전환">
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles size={18} strokeWidth={2.35} />
          </span>
          <span className={styles.workspaceCopy}>
            <strong>마켓크루</strong>
            <span>인쇄물 상품컷</span>
          </span>
          <ChevronsUpDown size={15} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className={styles.railSection}>
          <nav className={styles.nav} aria-label="상품 이미지 스튜디오 메뉴">
            {PRODUCT_IMAGE_STUDIO_NAV_GROUPS.map((group) => (
              <div className={styles.navGroup} key={group.label}>
                <span className={styles.sectionLabel}>{group.label}</span>
                {group.items.map((area) => {
                  const Icon = area.icon;
                  return (
                    <Link
                      aria-current={activeArea.key === area.key ? "page" : undefined}
                      className={activeArea.key === area.key ? styles.activeLink : styles.navLink}
                      href={area.href}
                      key={area.key}
                      prefetch={false}
                    >
                      <span className={styles.navIcon} aria-hidden="true">
                        <Icon size={17} strokeWidth={2.25} />
                      </span>
                      <span className={styles.navText}>
                        <strong>{area.label}</strong>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.usageBadge} aria-label="이번 달 사용량">
            <span>이번 달 사용량</span>
            <strong>24 / 100장</strong>
          </div>
          <div className={styles.accountArea}>
            <span className={styles.accountIcon} aria-hidden="true">
              <CircleUserRound size={18} strokeWidth={2.2} />
            </span>
            <span className={styles.accountCopy}>
              <span>운영 계정</span>
              <strong>관리자</strong>
            </span>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topBar}>
          <button className={styles.commandSearch} type="button" aria-label="스튜디오 검색">
            <span className={styles.searchIcon} aria-hidden="true">
              <Search size={16} strokeWidth={2.25} />
            </span>
            <span className={styles.commandSearchText}>상품명, 디자인, 생성 항목 검색</span>
            <kbd className={styles.commandKey}>⌘K</kbd>
          </button>
          <div className={styles.topBarActions}>
            <button className={styles.iconButton} type="button" aria-label="알림">
              <Bell size={17} strokeWidth={2.3} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className={styles.pageHeader} aria-label="현재 작업">
          <div className={styles.titleCopy}>
            <span>
              <span className={styles.titleIcon} aria-hidden="true">
                <ActiveIcon size={14} strokeWidth={2.3} />
              </span>
              {activeArea.label}
            </span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <Link className={styles.primaryLink} href="/product-image-studio/ai-tools/product-staging" prefetch={false}>
            <span className={styles.primaryIcon} aria-hidden="true">
              <Plus size={16} strokeWidth={2.35} />
            </span>
            새 상품컷
          </Link>
        </section>

        <section className={styles.contentWell}>
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
