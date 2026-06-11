import type { ProductImageStudioWizardState } from "@/features/product-image-studio/domain/projectWizard";
import {
  groupProductImageStudioResultsForGallery,
  type ProductImageStudioGalleryResult,
} from "@/features/product-image-studio/domain/resultGallery";
import styles from "./ProductImageStudioResultGallery.module.css";

type ProductImageStudioResultGalleryProps = {
  readonly results: readonly ProductImageStudioGalleryResult[];
  readonly wizardState: ProductImageStudioWizardState;
};

export function ProductImageStudioResultGallery({ results, wizardState }: ProductImageStudioResultGalleryProps) {
  const groups = groupProductImageStudioResultsForGallery(results, wizardState);

  return (
    <section className={styles.gallery} aria-label="생성 결과 갤러리">
      <div className={styles.heading}>
        <h3>결과 갤러리</h3>
        <p>세트컷과 단독컷을 나누어 비교합니다.</p>
      </div>
      <div className={styles.groupList}>
        {groups.map((group) => (
          <section className={group.emphasis === "combined" ? styles.featuredGroup : styles.group} key={group.key}>
            <div className={styles.groupHeading}>
              <div>
                <h4>{group.label}</h4>
                <p>{group.summary}</p>
              </div>
              <span>{group.emphasis === "combined" ? "세트 구성" : "단독 구성"}</span>
            </div>
            {group.items.length === 0 ? (
              <p className={styles.empty}>{group.emptyMessage}</p>
            ) : (
              <div className={styles.resultList}>
                {group.items.map((item) => (
                  <article className={styles.resultCard} key={item.result.id}>
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
