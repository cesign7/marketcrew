import {
  BadgeCheck,
  BarChart3,
  Bot,
  ClipboardCheck,
  Coins,
  DatabaseZap,
  Settings,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/operations", label: "오늘의 운영실", icon: Bot },
  { href: "/approvals", label: "승인실", icon: ClipboardCheck },
  { href: "/keywords", label: "키워드/입찰실", icon: BarChart3 },
  { href: "/margins", label: "상품/마진실", icon: Coins },
  { href: "/settings/search-ad", label: "검색광고 연동", icon: DatabaseZap },
  { href: "/settings/automation-rules", label: "자동화 설정", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fff8ec] text-[#17212b]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#eadfc8] bg-[#fffdf7] px-5 py-6 lg:block">
        <Link href="/operations" className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#0e8f81] text-white shadow-[0_10px_25px_rgba(14,143,129,0.25)]">
            <BadgeCheck size={22} />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">AI 마케팅 운영실</p>
            <p className="text-xs font-semibold text-[#69727c]">
              커피프린트 · 스티커씨
            </p>
          </div>
        </Link>

        <nav className="mt-9 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-bold text-[#44505b] hover:-translate-y-0.5 hover:border-[#eadfc8] hover:bg-[#fff4dc] hover:text-[#12302d]"
              >
                <Icon
                  size={18}
                  className="text-[#0e8f81] group-hover:text-[#de6a4b]"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-3xl border border-[#eadfc8] bg-[#f7edda] p-4">
          <p className="text-sm font-black">오늘의 안전장치</p>
          <p className="mt-2 text-xs leading-5 text-[#69727c]">
            자동 입찰은 5% 이내, 최대 CPC와 월 예산 상한 안에서만 실행됩니다.
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[#eadfc8] bg-[#fff8ec]/90 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0e8f81]">
                AI Marketing Ops
              </p>
              <h1 className="text-2xl font-black tracking-tight">
                오늘의 마케팅 지휘실
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#eadfc8] bg-white px-4 py-2 text-sm font-bold text-[#44505b] shadow-sm">
              자동 실행 제한 모드
              <span className="size-2 rounded-full bg-[#0e8f81]" />
            </div>
          </div>
        </header>
        <main className="px-5 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
