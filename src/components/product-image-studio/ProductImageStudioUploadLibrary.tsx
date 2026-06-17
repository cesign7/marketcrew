import type { ProductImageStudioUploadArchiveItem } from "@/features/product-image-studio/server/uploadArchive";
import { ProductImageStudioUploadArchiveGrid } from "./ProductImageStudioUploadArchiveGrid";
import { WorkspaceSupportShell } from "./ProductImageStudioWorkspaceSupportLayout";
import styles from "./ProductImageStudioUploadLibrary.module.css";

type ProductImageStudioUploadsWorkspacePageProps = {
  readonly uploads?: readonly ProductImageStudioUploadArchiveItem[];
};

export function ProductImageStudioUploadsWorkspacePage({
  uploads = [],
}: ProductImageStudioUploadsWorkspacePageProps) {
  return (
    <WorkspaceSupportShell
      activePath="/product-image-studio/uploads"
      description=""
      showPrimaryAction={false}
      title="업로드"
    >
      <section className={styles.library} aria-label="업로드 이미지 목록">
        <ProductImageStudioUploadArchiveGrid uploads={uploads} />
      </section>
    </WorkspaceSupportShell>
  );
}
