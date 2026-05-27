"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RULE_CRITERIA_SAVED_EVENT } from "./ruleCriteriaEvents";

type RuleRebuildResponse =
  | {
      data?: {
        saved?: number;
      };
      ok: true;
    }
  | {
      code?: string;
      data?: {
        ageSeconds?: number;
        nextAttemptAt?: string;
      };
      message?: string;
      ok: false;
    };

type RebuildState =
  | {
      actionHref?: string;
      actionText?: string;
      kind: "idle";
      text: string;
    }
  | {
      actionHref?: string;
      actionText?: string;
      kind: "success" | "warning" | "error";
      text: string;
    };

export function RuleRebuildPanel() {
  const [state, setState] = useState<RebuildState>({
    kind: "idle",
    text: "백필이 완료된 뒤 누르면 저장된 보고서를 기준으로 규칙 결과를 다시 만듭니다.",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleRuleCriteriaSaved() {
      setState({
        kind: "warning",
        text: "성과 기준이 저장됐습니다. 규칙 결과 재계산을 눌러 새 카드에 반영하세요.",
      });
    }

    window.addEventListener(RULE_CRITERIA_SAVED_EVENT, handleRuleCriteriaSaved);
    return () => window.removeEventListener(RULE_CRITERIA_SAVED_EVENT, handleRuleCriteriaSaved);
  }, []);

  async function rebuildRules() {
    setLoading(true);
    setState({ kind: "warning", text: "규칙 결과를 재계산할 수 있는 상태인지 확인 중입니다." });

    try {
      const response = await fetch("/api/search-ad/rules/rebuild", {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as RuleRebuildResponse;
      setState(getRuleRebuildMessage(payload, response.status));
    } catch (error) {
      setState({
        kind: "error",
        text: error instanceof Error ? error.message : "규칙 결과 재계산 요청에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rule-rebuild-panel">
      <div>
        <strong>백필 완료 후 규칙 재계산</strong>
        <p>중간 백필 데이터로 실수 재계산하지 않도록, 백필이 진행 중이면 서버에서 차단합니다.</p>
        <span className={`state-message is-${state.kind === "idle" ? "warning" : state.kind}`}>{state.text}</span>
        {state.actionHref && state.actionText ? (
          <Link className="table-link rule-rebuild-link" href={state.actionHref}>
            {state.actionText}
          </Link>
        ) : null}
      </div>
      <button className="primary-button" disabled={loading} onClick={rebuildRules} type="button">
        {loading ? "확인 중" : "규칙 결과 재계산"}
      </button>
    </div>
  );
}

export function getRuleRebuildMessage(payload: RuleRebuildResponse, status: number): RebuildState {
  if (payload.ok === true) {
    const saved = payload.data?.saved ?? 0;
    return {
      actionHref: "/rule-results",
      actionText: "규칙 결과 보기",
      kind: "success",
      text: `${saved.toLocaleString("ko-KR")}건의 규칙 결과를 다시 만들었습니다.`,
    };
  }

  if (status === 409 || payload.code === "SEARCH_AD_BACKFILL_RUNNING") {
    return {
      kind: "warning",
      text: payload.message ?? "보고서 백필이 아직 진행 중입니다. 완료 후 다시 실행하세요.",
    };
  }

  return {
    kind: "error",
    text: payload.message ?? "규칙 결과 재계산에 실패했습니다.",
  };
}
