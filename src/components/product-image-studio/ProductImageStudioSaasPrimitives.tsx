"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./ProductImageStudioSaasPrimitives.module.css";
export {
  CompactWorkModal,
  isWorkModalOverlayDismissTarget,
  shouldCloseWorkModalOnKey,
} from "./ProductImageStudioWorkModal";

type CompactStatusTone = "neutral" | "pending" | "ready";

type DataAttributes = Readonly<Partial<Record<`data-${string}`, string>>>;

type CompactPageHeaderProps = {
  readonly description?: string;
  readonly eyebrow?: string;
  readonly meta?: string;
  readonly title: string;
};

type CompactCardGridProps = {
  readonly ariaLabel: string;
  readonly children: ReactNode;
};

type CompactActionCardBaseProps = {
  readonly dataAttributes?: DataAttributes;
  readonly description: string;
  readonly icon?: LucideIcon;
  readonly iconNode?: ReactNode;
  readonly id: string;
  readonly statusLabel?: string;
  readonly statusTone?: CompactStatusTone;
  readonly title: string;
};

type CompactActionCardButtonProps = CompactActionCardBaseProps & {
  readonly actionKind: "button";
  readonly actionLabel: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

type CompactActionCardLinkProps = CompactActionCardBaseProps & {
  readonly actionKind: "link";
  readonly actionLabel: string;
  readonly href: string;
};

type CompactActionCardDisabledProps = CompactActionCardBaseProps & {
  readonly actionKind: "disabled";
  readonly actionLabel: string;
};

export type CompactActionCardProps =
  | CompactActionCardButtonProps
  | CompactActionCardDisabledProps
  | CompactActionCardLinkProps;

type CompactItemCardProps = {
  readonly description: string;
  readonly icon?: LucideIcon;
  readonly iconNode?: ReactNode;
  readonly meta?: string;
  readonly title: string;
};

type CompactEmptyStateProps = {
  readonly action?: ReactNode;
  readonly description: string;
  readonly icon?: LucideIcon;
  readonly iconNode?: ReactNode;
  readonly title: string;
};

export function CompactPageHeader({ description, eyebrow, meta, title }: CompactPageHeaderProps) {
  return (
    <header className={styles.pageHeader} data-saas-page-header="true">
      <div className={styles.pageHeaderCopy}>
        {eyebrow ? <p>{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <span>{description}</span> : null}
      </div>
      {meta ? <strong className={styles.pageHeaderMeta}>{meta}</strong> : null}
    </header>
  );
}

export function CompactCardGrid({ ariaLabel, children }: CompactCardGridProps) {
  return (
    <div aria-label={ariaLabel} className={styles.cardGrid} data-saas-card-grid="true">
      {children}
    </div>
  );
}

export function CompactActionCard(props: CompactActionCardProps) {
  const statusTone = props.statusTone ?? "neutral";
  const icon = renderIconContent(props.icon, props.iconNode, 20);

  return (
    <article
      className={styles.actionCard}
      data-saas-action-card={props.id}
      data-saas-card-state={props.actionKind}
      {...props.dataAttributes}
    >
      <div className={styles.cardTop}>
        {icon ? (
          <span className={styles.iconBox} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {props.statusLabel ? (
          <span className={styles.statusBadge} data-status-tone={statusTone}>
            {props.statusLabel}
          </span>
        ) : null}
      </div>
      <div className={styles.cardCopy}>
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
      {renderActionCardControl(props)}
    </article>
  );
}

export function CompactItemCard({ description, icon: Icon, iconNode, meta, title }: CompactItemCardProps) {
  const icon = renderIconContent(Icon, iconNode, 18);

  return (
    <article className={styles.itemCard} data-saas-item-card="true">
      {icon ? (
        <span className={styles.iconBox} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className={styles.cardCopy}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {meta ? <span className={styles.itemMeta}>{meta}</span> : null}
    </article>
  );
}

export function CompactEmptyState({ action, description, icon: Icon, iconNode, title }: CompactEmptyStateProps) {
  const icon = renderIconContent(Icon, iconNode, 22);

  return (
    <section className={styles.emptyState} data-saas-empty-state="true">
      {icon ? (
        <span className={styles.emptyIcon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className={styles.cardCopy}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </section>
  );
}

function renderIconContent(Icon: LucideIcon | undefined, iconNode: ReactNode | undefined, size: number) {
  if (iconNode) return iconNode;
  return Icon ? <Icon size={size} strokeWidth={2.2} /> : null;
}

function renderActionCardControl(props: CompactActionCardProps) {
  switch (props.actionKind) {
    case "button":
      return (
        <button
          aria-label={`${props.title} 열기`}
          className={styles.cardAction}
          disabled={props.disabled}
          onClick={props.onSelect}
          type="button"
        >
          <ArrowRight size={15} strokeWidth={2.35} />
          {props.actionLabel}
        </button>
      );
    case "disabled":
      return (
        <button aria-disabled="true" className={styles.disabledAction} disabled type="button">
          {props.actionLabel}
        </button>
      );
    case "link":
      return (
        <Link aria-label={`${props.title} 열기`} className={styles.cardAction} href={props.href} prefetch={false}>
          <ArrowRight size={15} strokeWidth={2.35} />
          {props.actionLabel}
        </Link>
      );
    default:
      return assertNever(props);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected action card variant: ${JSON.stringify(value)}`);
}
