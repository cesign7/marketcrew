"use client";

import { X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import styles from "./ProductImageStudioSaasPrimitives.module.css";

type CompactWorkModalProps = {
  readonly children: ReactNode;
  readonly description?: string;
  readonly footer?: ReactNode;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly size?: "compact" | "workspace";
  readonly title: string;
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function CompactWorkModal({ children, description, footer, onClose, open, size = "compact", title }: CompactWorkModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const describedBy = description ? descriptionId : undefined;

  useEffect(() => {
    if (!open) return undefined;

    if (document.activeElement instanceof HTMLElement) {
      restoreFocusRef.current = document.activeElement;
    }

    const panel = panelRef.current;
    if (panel) {
      getInitialFocusTarget(panel).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldCloseWorkModalOnKey(event.key)) return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const restoreTarget = restoreFocusRef.current;
      if (restoreTarget?.isConnected) {
        restoreTarget.focus();
      }
    };
  }, [onClose, open]);

  if (!open) return null;

  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (isWorkModalOverlayDismissTarget(event.target, event.currentTarget)) {
      onClose();
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      data-work-modal-overlay-close="true"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        aria-describedby={describedBy}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.modalPanel}
        data-modal-size={size}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button
            aria-label="닫기"
            className={styles.modalClose}
            data-work-modal-initial-focus="true"
            onClick={onClose}
            type="button"
          >
            <X size={18} strokeWidth={2.35} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer ? <div className={styles.modalFooter}>{footer}</div> : null}
      </section>
    </div>
  );
}

export function shouldCloseWorkModalOnKey(key: string): boolean {
  return key === "Escape";
}

export function isWorkModalOverlayDismissTarget(target: EventTarget | null, currentTarget: EventTarget | null): boolean {
  return target !== null && target === currentTarget;
}

function getInitialFocusTarget(panel: HTMLElement): HTMLElement {
  const focusTarget = panel.querySelector<HTMLElement>(`[data-work-modal-initial-focus="true"],${FOCUSABLE_SELECTOR}`);
  return focusTarget ?? panel;
}
