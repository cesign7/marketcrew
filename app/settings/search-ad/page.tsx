import { RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getSearchAdSyncStatus } from "@/lib/integrations/naver-search-ad/status";
import { syncSearchAdDryRunAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SearchAdSettingsPage() {
  const status = await getSearchAdSyncStatus();
  const canSync = status.credentials.configured;

  return (
    <AppShell>
      <section className="rounded-[28px] border border-[#eadfc8] bg-white p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0e8f81]">
              검색광고 연동
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">
              네이버 검색광고 dry-run
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#69727c]">
              캠페인, 광고그룹, 키워드 목록만 읽어서 DB 스냅샷으로 저장합니다.
              입찰가 변경, 키워드 수정, 광고문안 변경은 실행하지 않습니다.
            </p>
          </div>
          <form action={syncSearchAdDryRunAction}>
            <button
              disabled={!canSync}
              className="inline-flex items-center gap-2 rounded-full bg-[#0e8f81] px-5 py-3 text-sm font-black text-white hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#b7c8c5]"
            >
              <RefreshCw size={17} />
              dry-run 동기화
            </button>
          </form>
        </div>

        <div className="mt-7 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-[#fff8ec] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#0e8f81]" />
              <p className="font-black">인증 상태</p>
            </div>
            {status.credentials.configured ? (
              <p className="mt-3 text-sm font-semibold text-[#14764d]">
                `.env`에 검색광고 API 키, 시크릿, Customer ID가 설정되어 있습니다.
              </p>
            ) : (
              <div className="mt-3 text-sm font-semibold text-[#b34526]">
                <p>아래 환경변수를 `.env`에 추가해야 동기화할 수 있습니다.</p>
                <ul className="mt-2 grid gap-1">
                  {status.credentials.missing.map((name) => (
                    <li key={name} className="font-black">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-[#12302d] p-5 text-white">
            <p className="font-black">마지막 동기화</p>
            {status.lastRun ? (
              <div className="mt-4 grid gap-3 text-sm font-semibold">
                <Metric label="상태" value={syncStatusLabel(status.lastRun.status)} />
                <Metric
                  label="시간"
                  value={formatDate(status.lastRun.startedAt)}
                />
                <Metric
                  label="가져온 키워드"
                  value={`${status.lastRun.keywordsCount.toLocaleString()}개`}
                />
                {status.lastRun.errorMessage ? (
                  <p className="rounded-2xl bg-white/10 p-3 text-[#ffd2c4]">
                    {status.lastRun.errorMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-[#b9d9d2]">
                아직 API dry-run 동기화 기록이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Summary label="광고 계정" value={status.account?.alias ?? "미연결"} />
          <Summary
            label="누적 키워드 스냅샷"
            value={`${status.snapshotCount.toLocaleString()}개`}
          />
          <Summary
            label="실행 방식"
            value="읽기 전용"
          />
          <Summary
            label="입찰 변경"
            value="차단됨"
          />
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-[#b9d9d2]">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#eadfc8] bg-[#fffdf7] p-4">
      <p className="text-xs font-black text-[#69727c]">{label}</p>
      <p className="mt-2 text-lg font-black text-[#12302d]">{value}</p>
    </div>
  );
}

function syncStatusLabel(status: string) {
  if (status === "SUCCEEDED") return "성공";
  if (status === "FAILED") return "실패";
  return "진행 중";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}
