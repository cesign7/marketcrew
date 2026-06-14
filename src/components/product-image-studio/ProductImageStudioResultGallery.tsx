import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import {
  groupProductImageStudioResultsForGallery,
  type ProductImageStudioGalleryResult,
  type ProductImageStudioResultGroupKey,
} from "@/features/product-image-studio/domain/resultGallery";
import styles from "./ProductImageStudioResultGallery.module.css";

const GALLERY_USE_CASES = ["목록용", "대표용", "상세페이지용"] as const;

const RESULT_GROUP_BADGES = {
  card: "대표용 · 단독 구성",
  envelope: "상세페이지용 · 봉투 구성",
  seal: "상세페이지용 · 마감 구성",
  set: "목록용 · 세트 구성",
} as const satisfies Record<ProductImageStudioResultGroupKey, string>;

const RESULT_GROUP_DISPLAY_LABELS = {
  card: "카드 단독컷",
  envelope: "봉투 단독컷",
  seal: "봉합스티커 단독컷",
  set: "세트컷",
} as const satisfies Record<ProductImageStudioResultGroupKey, string>;

type ProductImageStudioResultGalleryProps = {
  readonly results: readonly ProductImageStudioGalleryResult[];
  readonly wizardState: ProductImageStudioWizardState;
};

export function ProductImageStudioResultGallery({ results, wizardState }: ProductImageStudioResultGalleryProps) {
  const groups = groupProductImageStudioResultsForGallery(results, wizardState);

  return (
    <section className={styles.gallery} aria-label="상품컷 갤러리">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>상품컷 갤러리</span>
          <h3>상품컷 미리보기</h3>
          <p>목록용, 대표용, 상세페이지용 이미지를 세트컷과 단독컷으로 나누어 확인합니다.</p>
        </div>
        <div className={styles.useCases} aria-label="상품컷 사용처">
          {GALLERY_USE_CASES.map((useCase) => (
            <span key={useCase}>{useCase}</span>
          ))}
        </div>
      </div>
      <p className={styles.actionHint}>선택한 결과는 아래에서 다시 만들기 또는 비율 변경으로 이어집니다.</p>
      <div className={styles.groupList}>
        {groups.map((group) => (
          <section className={group.emphasis === "combined" ? styles.featuredGroup : styles.group} key={group.key}>
            <div className={styles.groupHeading}>
              <div>
                <h4>{RESULT_GROUP_DISPLAY_LABELS[group.key]}</h4>
                <p>{group.summary}</p>
              </div>
              <span>{RESULT_GROUP_BADGES[group.key]}</span>
            </div>
            {group.items.length === 0 ? (
              <p className={styles.empty}>아직 {RESULT_GROUP_DISPLAY_LABELS[group.key]} 결과가 없습니다.</p>
            ) : (
              <div className={styles.resultList}>
                {group.items.map((item) => (
                  <article className={styles.resultCard} key={item.result.id}>
                    {item.result.previewUrl ? (
                      <img
                        alt={`${item.result.outputType} ${item.versionLabel}`}
                        className={styles.previewImage}
                        src={item.result.previewUrl}
                      />
                    ) : (
                      <div className={styles.previewPlaceholder}>미리보기 준비 중</div>
                    )}
                    <div>
                      <strong>{item.result.label}</strong>
                      <span>{item.versionLabel}</span>
                    </div>
                    <p>{item.detailLabel}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
