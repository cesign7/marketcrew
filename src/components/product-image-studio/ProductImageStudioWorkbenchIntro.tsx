import styles from "./ProductImageStudioWorkbenchIntro.module.css";

export function ProductImageStudioWorkbenchIntro() {
  return (
    <section className={styles.intro} aria-label="상품 캔버스">
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span>이미지 제작 작업대</span>
          <h2>상품 캔버스</h2>
          <p>카드 원본을 먼저 올리고, 필요한 순간에 봉투와 봉합스티커를 연결해 세트컷으로 넓힙니다.</p>
        </div>
        <ol className={styles.flow} aria-label="상품컷 제작 경로">
          <li>
            <strong>카드만으로 시작</strong>
            <span>단독컷 준비</span>
          </li>
          <li>
            <strong>세트컷으로 확장</strong>
            <span>봉투와 스티커 연결</span>
          </li>
          <li>
            <strong>목록용 상품컷</strong>
            <span>대표 이미지 출력</span>
          </li>
        </ol>
      </header>

      <div className={styles.workbench}>
        <div className={styles.canvas} aria-label="카드 봉투 봉합스티커 슬롯 관계">
          <div className={styles.canvasToolbar}>
            <span>현재 캔버스</span>
            <strong>목록용 상품컷</strong>
          </div>

          <div className={styles.stage} aria-label="카드와 세트 구성 슬롯">
            <div className={styles.envelopeSlot}>
              <span>봉투 슬롯</span>
              <strong>세트컷으로 확장</strong>
            </div>
            <div className={styles.cardSlot}>
              <span>카드 슬롯</span>
              <strong>카드만으로 시작</strong>
              <small>필수 시작점</small>
            </div>
            <div className={styles.sealSlot}>
              <span>봉합스티커 슬롯</span>
              <strong>선택 확장</strong>
            </div>
          </div>
        </div>

        <aside className={styles.startPanel} aria-label="카드 단독컷 시작 안내">
          <span>빠르게 만들 이미지</span>
          <h3>카드만 올려도 바로 시작</h3>
          <p>접이식 카드나 엽서형 카드의 업로드/규격 입력은 그대로 사용하고, 카드 준비가 끝나면 단독컷부터 추천합니다.</p>
          <dl>
            <div>
              <dt>카드</dt>
              <dd>필수 시작점</dd>
            </div>
            <div>
              <dt>봉투</dt>
              <dd>선택 확장</dd>
            </div>
            <div>
              <dt>봉합스티커</dt>
              <dd>선택 확장</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
