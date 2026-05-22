export default function Loading() {
  return (
    <div className="route-loading-shell" role="status" aria-live="polite">
      <span className="route-loading-bar" aria-hidden="true" />
      <strong>업무 데이터 확인</strong>
      <p>최신 기준을 맞추고 있습니다.</p>
    </div>
  );
}
