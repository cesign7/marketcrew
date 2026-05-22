"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import type { FollowUpInternalTask } from "@/lib/domain";

type FollowUpTaskStatusButtonProps = {
  taskId: string;
  status: FollowUpInternalTask["status"];
};

type PatchResponse = {
  task?: FollowUpInternalTask;
  error?: {
    code?: string;
    message?: string;
  };
};

export function FollowUpTaskStatusButton({ taskId, status }: FollowUpTaskStatusButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const nextStatus: FollowUpInternalTask["status"] = status === "DONE" ? "OPEN" : "DONE";
  const Icon = status === "DONE" ? RotateCcw : CheckCircle2;

  async function updateStatus() {
    setSubmitting(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/follow-ups/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json()) as PatchResponse;

      if (!response.ok || payload.error) {
        setMessage(payload.error?.message ?? "후속 업무 상태를 바꾸지 못했습니다.");
        return;
      }

      setMessage(nextStatus === "DONE" ? "완료 처리했습니다." : "다시 열었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="followup-action">
      <button className="secondary-button" disabled={submitting} onClick={() => void updateStatus()} type="button">
        <Icon size={15} aria-hidden="true" />
        {status === "DONE" ? "다시 열기" : "완료 처리"}
      </button>
      {message ? <span role="status">{message}</span> : null}
    </div>
  );
}
