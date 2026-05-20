import { Clock3, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { getSearchAdSyncStatus } from "@/lib/integrations/naver-search-ad/status";
import { syncSearchAdAction } from "./actions";

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
              네이버 검색광고 저장 동기화
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#69727c]">
              캠페인, 광고그룹, 키워드 목록을 읽기 전용 API로 가져와 DB에 저장합니다.
              입찰가 변경, 키워드 수정, 광고문안 변경은 계속 차단됩니다.
            </p>
          </div>
          <form action={syncSearchAdAction}>
            <button
              disabled={!canSync}
              className="inline-flex items-center gap-2 rounded-full bg-[#0e8f81] px-5 py-3 text-sm font-black text-white hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#b7c8c5]"
            >
              <RefreshCw size={17} />
              동기화 실행
            </button>
          </form>
        </div>

        <div className="mt-7 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
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
            <div className="flex items-center gap-2">
              <Database size={18} className="text-[#73d6c8]" />
              <p className="font-black">마지막 저장 동기화</p>
            </div>
            {status.lastRun ? (
              <div className="mt-4 grid gap-3 text-sm font-semibold md:grid-cols-2">
                <Metric label="상태" value={syncStatusLabel(status.lastRun.status)} />
                <Metric
                  label="시작"
                  value={formatDate(status.lastRun.startedAt)}
                />
                <Metric
                  label="완료"
                  value={formatOptionalDate(status.lastRun.finishedAt)}
                />
                <Metric
                  label="캠페인"
                  value={`${status.lastRun.campaignsCount.toLocaleString()}개`}
                />
                <Metric
                  label="광고그룹"
                  value={`${status.lastRun.adgroupsCount.toLocaleString()}개`}
                />
                <Metric
                  label="키워드"
                  value={`${status.lastRun.keywordsCount.toLocaleString()}개`}
                />
                {status.lastRun.errorMessage ? (
                  <p className="rounded-2xl bg-white/10 p-3 text-[#ffd2c4] md:col-span-2">
                    {status.lastRun.errorMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-6 text-[#b9d9d2]">
                아직 API 저장 동기화 기록이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Summary label="광고 계정" value={status.account?.alias ?? "미연결"} />
          <Summary
            label="캠페인 스냅샷"
            value={`${status.campaignSnapshotCount.toLocaleString()}개`}
          />
          <Summary
            label="광고그룹 스냅샷"
            value={`${status.adgroupSnapshotCount.toLocaleString()}개`}
          />
          <Summary
            label="키워드 스냅샷"
            value={`${status.keywordSnapshotCount.toLocaleString()}개`}
          />
          <Summary
            label="자동 변경"
            value="차단됨"
          />
        </div>

        <section className="mt-6 rounded-3xl border border-[#eadfc8] bg-[#fffdf7] p-5">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-[#0e8f81]" />
            <h3 className="font-black">최근 동기화 이력</h3>
          </div>
          {status.recentRuns.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {status.recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="grid gap-3 rounded-2xl border border-[#eadfc8] bg-white p-4 text-sm font-semibold text-[#12302d] lg:grid-cols-[1fr_1fr_1fr_1fr]"
                >
                  <span className="font-black">{syncStatusLabel(run.status)}</span>
                  <span>{formatDate(run.startedAt)}</span>
                  <span>
                    캠페인 {run.campaignsCount.toLocaleString()} / 광고그룹{" "}
                    {run.adgroupsCount.toLocaleString()} / 키워드{" "}
                    {run.keywordsCount.toLocaleString()}
                  </span>
                  <span className={run.errorMessage ? "text-[#b34526]" : "text-[#14764d]"}>
                    {run.errorMessage ?? "저장 완료"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold text-[#69727c]">
              아직 표시할 동기화 이력이 없습니다.
            </p>
          )}
        </section>
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

function formatOptionalDate(date: Date | null) {
  return date ? formatDate(date) : "진행 중";
}
