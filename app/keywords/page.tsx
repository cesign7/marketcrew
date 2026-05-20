import { KeywordRuleBoard } from "@/components/keywords/KeywordRuleBoard";
import { AppShell } from "@/components/layout/AppShell";
import { getKeywordRules } from "@/lib/db/marketing-operations";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  const rules = await getKeywordRules();

  return (
    <AppShell>
      <div className="mb-5">
        <h2 className="text-2xl font-black tracking-tight">키워드/입찰실</h2>
        <p className="mt-2 text-sm font-semibold text-[#69727c]">
          최근 90일과 시즌 D-day 데이터를 기준으로 목표 순위 룰을 관리합니다.
        </p>
      </div>
      <KeywordRuleBoard rules={rules} />
    </AppShell>
  );
}
