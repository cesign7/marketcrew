import Link from "next/link";
import {
  ClipboardCheck,
  DatabaseZap,
  LayoutDashboard,
  RefreshCcw,
  Settings2,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ViewFilterControls, type ViewFilterOption } from "./ViewFilterControls";

export type AppNavKey = "operations" | "characters" | "approvals" | "data" | "growth" | "settings";

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
  { label: "커피프린트", value: "coffeeprint" },
  { label: "키워드광고", value: "search-ad" },
];
const periodFilters: ViewFilterOption[] = [
  { label: "오늘", value: "today" },
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "전년동기", value: "last-year" },
  { label: "명절기준", value: "holiday" },
];

export function AppShell({ active, eyebrow, title, description, generatedAt, actions, children }: AppShellProps) {
  const activeItem = navItems.find((item) => item.key === active) ?? navItems[0];

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="app-brand">
          <span>MarketCrew</span>
          <strong>대표 업무실</strong>
        </div>
        <nav className="app-nav" aria-label="주요 업무 메뉴">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`app-nav-link${isActive ? " is-active" : ""}`}
                href={item.href}
                key={item.key}
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
              <Link className="secondary-button" href={activeItem.href}>
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
