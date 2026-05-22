"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  DatabaseZap,
  IdCard,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Settings2,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ViewFilterControls, type ViewFilterOption } from "./ViewFilterControls";

export type AppNavKey = "operations" | "characters" | "approvals" | "data" | "growth" | "people" | "settings";

type AppShellProps = {
  active: AppNavKey;
  eyebrow: string;
  title: string;
  description?: string;
  generatedAt?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const navItems = [
  {
    key: "operations",
    label: "오늘 업무실",
    description: "결재와 긴급 신호",
    href: "/operations",
    icon: LayoutDashboard,
  },
  {
    key: "characters",
    label: "캐릭터 업무데스크",
    description: "직원별 업무 현황",
    href: "/characters",
    icon: UsersRound,
  },
  {
    key: "approvals",
    label: "결재/실행관리",
    description: "승인부터 성과 확인",
    href: "/approvals",
    icon: ClipboardCheck,
  },
  {
    key: "data",
    label: "데이터 연동",
    description: "채널별 수집 근거",
    href: "/data",
    icon: DatabaseZap,
  },
  {
    key: "growth",
    label: "성장/성과",
    description: "제안과 결과 분석",
    href: "/growth",
    icon: TrendingUp,
  },
  {
    key: "people",
    label: "인사과",
    description: "역할과 사용 명세",
    href: "/people",
    icon: IdCard,
  },
  {
    key: "settings",
    label: "설정",
    description: "보안과 비용 한도",
    href: "/settings",
    icon: Settings2,
  },
] satisfies Array<{
  key: AppNavKey;
  label: string;
  description: string;
  href: string;
  icon: typeof LayoutDashboard;
}>;

const channelFilters: ViewFilterOption[] = [
  { label: "전체", value: "all" },
  { label: "스티커씨", value: "stickersee" },
  { label: "커피", value: "coffeeprint" },
];
const periodFilters: ViewFilterOption[] = [
  { label: "오늘", value: "today" },
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "전년", value: "last-year" },
  { label: "명절", value: "holiday" },
];

const sidebarStorageKey = "marketcrew:sidebar-collapsed";
const navWarmupStepMs = 60;

type MarketCrewWindow = Window &
  typeof globalThis & {
    __marketcrewWarmedRoutes?: Set<string>;
  };

export function AppShell({ active, eyebrow, title, description, generatedAt, actions, children }: AppShellProps) {
  const activeItem = navItems.find((item) => item.key === active) ?? navItems[0];
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const router = useRouter();

  const warmRoute = useCallback(
    (href: string) => {
      if (href === activeItem.href || typeof window === "undefined") {
        return;
      }

      const marketCrewWindow = window as MarketCrewWindow;
      marketCrewWindow.__marketcrewWarmedRoutes ??= new Set<string>();
      if (marketCrewWindow.__marketcrewWarmedRoutes.has(href)) {
        return;
      }

      marketCrewWindow.__marketcrewWarmedRoutes.add(href);
      try {
        router.prefetch(href);
      } catch {
        marketCrewWindow.__marketcrewWarmedRoutes.delete(href);
      }
    },
    [activeItem.href, router],
  );

  useEffect(() => {
    setIsSidebarCollapsed(window.localStorage.getItem(sidebarStorageKey) === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setPendingHref(null);
  }, [active]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const warmableRoutes = navItems.map((item) => item.href).filter((href) => href !== activeItem.href);
    const timeoutIds: number[] = [];
    warmableRoutes.forEach((href, index) => {
      timeoutIds.push(window.setTimeout(() => warmRoute(href), index * navWarmupStepMs));
    });

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [activeItem.href, warmRoute]);

  const SidebarToggleIcon = isSidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className={`app-frame${isSidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
      <aside className="app-sidebar">
        <div className="app-brand-row">
          <div className="app-brand">
            <span>MarketCrew</span>
            <strong>대표 업무실</strong>
          </div>
          <button
            aria-label={isSidebarCollapsed ? "왼쪽 메뉴 펼치기" : "왼쪽 메뉴 접기"}
            aria-pressed={isSidebarCollapsed}
            className="sidebar-toggle-button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            title={isSidebarCollapsed ? "왼쪽 메뉴 펼치기" : "왼쪽 메뉴 접기"}
            type="button"
          >
            <SidebarToggleIcon size={17} aria-hidden="true" />
          </button>
        </div>
        <nav className="app-nav" aria-label="주요 업무 메뉴">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`app-nav-link${isActive ? " is-active" : ""}${pendingHref === item.href && !isActive ? " is-pending" : ""}`}
                data-prefetch-mode="intent"
                href={item.href}
                key={item.key}
                onClick={() => {
                  setPendingHref(item.href);
                  warmRoute(item.href);
                }}
                onFocus={() => warmRoute(item.href)}
                onMouseEnter={() => warmRoute(item.href)}
                onTouchStart={() => warmRoute(item.href)}
                prefetch
                title={`${item.label} - ${item.description}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="app-main">
        <header className="workspace-topbar">
          <div className="workspace-header-row">
            <div className="workspace-title">
              <span className="eyebrow">{eyebrow}</span>
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
              {generatedAt ? <span className="workspace-generated-at">생성 시각 {generatedAt}</span> : null}
            </div>

            <section className="workspace-actions" aria-label="화면 실행 버튼">
              <Link className="secondary-button" href={activeItem.href} prefetch={false}>
                <RefreshCcw size={16} aria-hidden="true" />
                새로고침
              </Link>
              {actions}
              <LogoutButton />
            </section>
          </div>

          <ViewFilterControls channelFilters={channelFilters} periodFilters={periodFilters} />
        </header>

        <main className="operations-shell">{children}</main>
      </div>
    </div>
  );
}
