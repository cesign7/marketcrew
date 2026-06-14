import styles from "./ProductImageStudioWorkbenchIntro.module.css";

const TOOL_ITEMS = [
  { label: "업로드", marker: "업" },
  { label: "규격", marker: "규" },
  { label: "배경", marker: "배" },
  { label: "생성", marker: "생" },
] as const;

export function ProductImageStudioWorkbenchIntro() {
  return (
    <section className={styles.studioBoard} aria-label="상품 캔버스">
      <aside className={styles.toolRail} aria-label="상품컷 작업대">
        {TOOL_ITEMS.map((item, index) => (
          <button className={index === 0 ? styles.activeTool : styles.toolButton} key={item.label} type="button">
            <strong aria-hidden="true">{item.marker}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </aside>

      <div className={styles.canvasPanel}>
        <header className={styles.canvasHeader}>
          <div>
            <span>상품컷 작업대</span>
            <h2>상품 캔버스</h2>
          </div>
          <div className={styles.canvasMeta} aria-label="현재 출력 설정">
            <span>4:5</span>
            <span>0.5K 초안</span>
          </div>
        </header>

        <div className={styles.artboard} aria-label="카드 봉투 봉합스티커 슬롯">
          <div className={styles.envelopeSlot}>
            <span>봉투 슬롯</span>
          </div>
          <div className={styles.cardSlot}>
            <span>카드 슬롯</span>
            <strong>카드만으로 시작</strong>
          </div>
          <div className={styles.sealSlot}>
            <span>봉합스티커 슬롯</span>
          </div>
        </div>
      </div>

      <aside className={styles.inspector} aria-label="설정샷 생성 순서">
        <div className={styles.inspectorHeader}>
          <strong aria-hidden="true">준</strong>
          <div>
            <span>빠르게 만들 이미지</span>
            <h3>카드만 올려도 시작</h3>
          </div>
        </div>
        <ol className={styles.flow} aria-label="상품컷 제작 경로">
          <li>
            <strong>카드만으로 시작</strong>
            <span>단독컷</span>
          </li>
          <li>
            <strong>세트컷으로 확장</strong>
            <span>봉투와 스티커</span>
          </li>
          <li>
            <strong>목록용 상품컷</strong>
            <span>대표 이미지</span>
          </li>
        </ol>
        <div className={styles.uploadHint}>
          <strong aria-hidden="true">+</strong>
          <span>업로드한 구성품만 캔버스에 배치합니다.</span>
        </div>
      </aside>
    </section>
  );
}
