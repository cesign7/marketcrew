import {
  canRequestProductImageStudioConcepts,
  getProductImageStudioAvailableOutputs,
  type ProductImageStudioWizardState,
} from "@/features/product-image-studio/domain/projectWizard";
import styles from "./ProductImageStudioWorkflowSteps.module.css";

type ProductImageStudioWorkflowStepsProps = {
  readonly state: ProductImageStudioWizardState;
};

type WorkflowStep = {
  readonly label: string;
  readonly status: "ready" | "todo";
  readonly summary: string;
  readonly title: string;
};

export function ProductImageStudioWorkflowSteps({ state }: ProductImageStudioWorkflowStepsProps) {
  const steps = buildWorkflowSteps(state);

  return (
    <ol className={styles.steps} aria-label="이미지 프로젝트 진행 단계">
      {steps.map((step) => (
        <li className={styles.step} data-status={step.status} key={step.label}>
          <span>{step.label}</span>
          <div>
            <strong>{step.title}</strong>
            <small>{step.summary}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}

function buildWorkflowSteps(state: ProductImageStudioWizardState): readonly WorkflowStep[] {
  const availableOutputCount = getProductImageStudioAvailableOutputs(state).length;
  return [
    {
      label: "1",
      status: state.projectName.trim().length > 0 ? "ready" : "todo",
      summary: state.projectName.trim().length > 0 ? "이름 입력됨" : "이름과 규격 입력",
      title: "프로젝트",
    },
    {
      label: "2",
      status: state.uploadedRoles.length > 0 ? "ready" : "todo",
      summary: state.uploadedRoles.length > 0 ? `${state.uploadedRoles.length}개 업로드` : "카드 이미지부터",
      title: "디자인",
    },
    {
      label: "3",
      status: canRequestProductImageStudioConcepts(state) ? "ready" : "todo",
      summary: availableOutputCount > 0 ? `${availableOutputCount}개 컷 가능` : "준비 후 생성",
      title: "생성",
    },
  ];
}
