import styles from "./ProductImageStudioWorkbenchIntro.module.css";

export function ProductImageStudioWorkbenchIntro() {
  return (
    <section className={styles.intro} aria-label="이미지 제작 작업대">
      <div className={styles.copy}>
        <span>이미지 제작 작업대</span>
        <h2>빠르게 만들 이미지</h2>
        <p>카드만으로 시작하고, 봉투와 봉합스티커는 세트컷이 필요할 때 이어서 추가합니다.</p>
      </div>
      <div className={styles.canvas} aria-label="상품 캔버스">
        <div className={styles.stage}>
          <span>상품 캔버스</span>
          <strong>카드만으로 시작</strong>
          <p>업로드한 인쇄물 비율을 유지한 채 설정샷과 대표 이미지를 구성합니다.</p>
        </div>
        <ol className={styles.flow}>
          <li>업로드</li>
          <li>콘셉트</li>
          <li>초안</li>
        </ol>
      </div>
    </section>
  );
}
