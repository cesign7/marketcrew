import type { ReactNode } from "react";
import { ProductImageStudioShell } from "./ProductImageStudioShell";
import styles from "./ProductImageStudioWorkspaceSupportPages.module.css";

type WorkspaceSupportShellProps = {
  readonly activePath: string;
  readonly children: ReactNode;
  readonly description: string;
  readonly showPrimaryAction?: boolean;
  readonly title: string;
};

export function WorkspaceSupportShell({
  activePath,
  children,
  description,
  showPrimaryAction,
  title,
}: WorkspaceSupportShellProps) {
  return (
    <ProductImageStudioShell
      activePath={activePath}
      description={description}
      showPrimaryAction={showPrimaryAction}
      title={title}
    >
      <section className="page-stack">
        <div className={styles.supportStack}>{children}</div>
      </section>
    </ProductImageStudioShell>
  );
}

export function SectionHeading({
  description,
  eyebrow,
  title,
}: {
  readonly description: string;
  readonly eyebrow: string;
  readonly title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function EmptyState({ description, title }: { readonly description: string; readonly title: string }) {
  return (
    <div className={styles.emptyState}>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
