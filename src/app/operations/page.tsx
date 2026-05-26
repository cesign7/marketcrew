import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default function OperationsPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <strong>마켓크루</strong>
          <span>재시작 기준선</span>
        </div>
        <LogoutButton />
      </header>

      <section className="panel" aria-labelledby="status-title">
        <span className="eyebrow">운영 상태</span>
        <h1 id="status-title">깨끗한 기준선에서 다시 시작합니다.</h1>
        <p className="muted">
          기존 업무 카드, 캐릭터 데스크, 결재 기록, 수집 이력, AI 판단 기록은 초기화했습니다. 연결 설정은 유지되어
          다음 설계부터 바로 붙일 수 있습니다.
        </p>

        <div className="grid">
          <div className="metric">
            <span>Web</span>
            <strong>연결 유지</strong>
          </div>
          <div className="metric">
            <span>API</span>
            <strong>상태 확인</strong>
          </div>
          <div className="metric">
            <span>DB</span>
            <strong>초기화 완료</strong>
          </div>
        </div>

        <div className="notice">
          외부 광고, 상품, 고객 데이터 쓰기는 아직 열지 않았습니다. 새 기능은 별도 계획과 승인 뒤에 추가합니다.
        </div>
      </section>
    </main>
  );
}
