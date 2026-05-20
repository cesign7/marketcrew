import { AppShell } from "@/components/layout/AppShell";

export default function MarginsPage() {
  return (
    <AppShell>
      <section className="rounded-[28px] border border-[#eadfc8] bg-white p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0e8f81]">
          준비 중
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight">
          상품/마진실
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#69727c]">
          다음 단계에서 상품별 원가 계산식, 옵션/수량별 마진, 영카트와
          스마트스토어 상품 매핑을 연결합니다.
        </p>
      </section>
    </AppShell>
  );
}
