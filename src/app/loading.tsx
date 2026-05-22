export default function Loading() {
  return (
    <div className="route-loading-shell" role="status" aria-live="polite">
      <span className="route-loading-bar" aria-hidden="true" />
      <strong>화면 불러오는 중</strong>
      <p>최신 업무 데이터를 확인하고 있습니다.</p>
    </div>
  );
}
