"use client";

import { useMemo, useState } from "react";
import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdRuleCriteria } from "@/features/search-ad/domain/types";
import { RULE_CRITERIA_SAVED_EVENT } from "./ruleCriteriaEvents";

type RuleCriteriaEditorProps = {
  criteria: SearchAdRuleCriteria[];
};

type RowState = {
  item: EditableCriteria;
  message?: {
    kind: "success" | "warning" | "error";
    text: string;
  };
  saving: boolean;
};

type EditableCriteria = Omit<SearchAdRuleCriteria, "periodDays" | "minImpressions" | "minClicks" | "minCost" | "targetCpa" | "targetRoas"> & {
  periodDays: string;
  minImpressions: string;
  minClicks: string;
  minCost: string;
  targetCpa: string;
  targetRoas: string;
};

type ApiPayload = {
  ok?: boolean;
  data?: SearchAdRuleCriteria;
  message?: string;
};

export function RuleCriteriaEditor({ criteria }: RuleCriteriaEditorProps) {
  const initialRows = useMemo(() => criteria.map((item) => ({ item: toEditableCriteria(item), saving: false })), [criteria]);
  const [rows, setRows] = useState<RowState[]>(initialRows);

  function updateRow(id: string, patch: Partial<EditableCriteria>) {
    setRows((current) => current.map((row) => (row.item.id === id ? { ...row, item: { ...row.item, ...patch }, message: undefined } : row)));
  }

  async function saveRow(id: string) {
    const row = rows.find((item) => item.item.id === id);
    if (!row) {
      return;
    }

    const parsed = toPayload(row.item);
    if (!parsed.ok) {
      setRows((current) =>
        current.map((item) => (item.item.id === id ? { ...item, message: { kind: "error", text: parsed.message }, saving: false } : item)),
      );
      return;
    }

    setRows((current) => current.map((item) => (item.item.id === id ? { ...item, saving: true, message: undefined } : item)));
    try {
      const response = await fetch("/api/search-ad/rule-criteria", {
        body: JSON.stringify(parsed.data),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || payload.ok !== true || !payload.data) {
        throw new Error(payload.message ?? "성과 기준을 저장하지 못했습니다.");
      }
      const savedCriteria = payload.data;
      window.dispatchEvent(new Event(RULE_CRITERIA_SAVED_EVENT));

      setRows((current) =>
        current.map((item) =>
          item.item.id === id
            ? {
                item: toEditableCriteria(savedCriteria),
                message: { kind: "success", text: "성과 기준을 저장했습니다. 다음 규칙 재계산부터 반영됩니다." },
                saving: false,
              }
            : item,
        ),
      );
    } catch (error) {
      setRows((current) =>
        current.map((item) =>
          item.item.id === id
            ? {
                ...item,
                message: { kind: "error", text: error instanceof Error ? error.message : "성과 기준 저장에 실패했습니다." },
                saving: false,
              }
            : item,
        ),
      );
    }
  }

  return (
    <div className="criteria-editor">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>브랜드</th>
              <th>광고유형</th>
              <th>사용</th>
              <th>기간</th>
              <th>최소 노출</th>
              <th>최소 클릭</th>
              <th>최소 비용</th>
              <th>목표 CPA</th>
              <th>목표 ROAS</th>
              <th>저장</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item.id}>
                <td>{getBrandLabel(row.item.brandKey)}</td>
                <td>{getAdProductLabel(row.item.adProductType)}</td>
                <td>
                  <label className="criteria-toggle">
                    <input
                      checked={row.item.enabled}
                      onChange={(event) => updateRow(row.item.id, { enabled: event.currentTarget.checked })}
                      type="checkbox"
                    />
                    <span>{row.item.enabled ? "사용" : "중지"}</span>
                  </label>
                </td>
                <td>
                  <NumberInput ariaLabel="기준 기간" onChange={(value) => updateRow(row.item.id, { periodDays: value })} suffix="일" value={row.item.periodDays} />
                </td>
                <td>
                  <NumberInput ariaLabel="최소 노출" onChange={(value) => updateRow(row.item.id, { minImpressions: value })} value={row.item.minImpressions} />
                </td>
                <td>
                  <NumberInput ariaLabel="최소 클릭" onChange={(value) => updateRow(row.item.id, { minClicks: value })} value={row.item.minClicks} />
                </td>
                <td>
                  <NumberInput ariaLabel="최소 비용" onChange={(value) => updateRow(row.item.id, { minCost: value })} suffix="원" value={row.item.minCost} />
                </td>
                <td>
                  <NumberInput ariaLabel="목표 CPA" onChange={(value) => updateRow(row.item.id, { targetCpa: value })} placeholder="없음" suffix="원" value={row.item.targetCpa} />
                </td>
                <td>
                  <NumberInput ariaLabel="목표 ROAS" onChange={(value) => updateRow(row.item.id, { targetRoas: value })} placeholder="없음" suffix="%" value={row.item.targetRoas} />
                </td>
                <td>
                  <button className="primary-button criteria-save-button" disabled={row.saving} onClick={() => saveRow(row.item.id)} type="button">
                    {row.saving ? "저장 중" : "저장"}
                  </button>
                  {row.message ? <span className={`state-message is-${row.message.kind}`}>{row.message.text}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="criteria-help">저장한 기준은 곧바로 기존 카드 문구를 바꾸지는 않고, 규칙 결과 재계산을 실행한 뒤 새 판단에 반영됩니다.</p>
    </div>
  );
}

function NumberInput({
  ariaLabel,
  onChange,
  placeholder,
  suffix,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="criteria-number-input">
      <input aria-label={ariaLabel} inputMode="numeric" onChange={(event) => onChange(event.currentTarget.value)} placeholder={placeholder} type="text" value={value} />
      {suffix ? <span>{suffix}</span> : null}
    </label>
  );
}

function toEditableCriteria(item: SearchAdRuleCriteria): EditableCriteria {
  return {
    ...item,
    periodDays: String(item.periodDays),
    minImpressions: String(item.minImpressions),
    minClicks: String(item.minClicks),
    minCost: String(item.minCost),
    targetCpa: item.targetCpa === null ? "" : String(item.targetCpa),
    targetRoas: item.targetRoas === null ? "" : String(item.targetRoas),
  };
}

function toPayload(item: EditableCriteria): { ok: true; data: SearchAdRuleCriteria } | { ok: false; message: string } {
  const periodDays = parseInteger(item.periodDays);
  const minImpressions = parseNumber(item.minImpressions);
  const minClicks = parseNumber(item.minClicks);
  const minCost = parseNumber(item.minCost);
  const targetCpa = parseNullableNumber(item.targetCpa);
  const targetRoas = parseNullableNumber(item.targetRoas);

  if (periodDays === undefined || periodDays < 1 || periodDays > 120) {
    return { ok: false, message: "기준 기간은 1~120일 사이로 입력해 주세요." };
  }

  if (minImpressions === undefined || minClicks === undefined || minCost === undefined || minImpressions < 0 || minClicks < 0 || minCost < 0) {
    return { ok: false, message: "최소 노출, 클릭, 비용은 0 이상 숫자로 입력해 주세요." };
  }

  if (targetCpa === undefined || targetRoas === undefined) {
    return { ok: false, message: "목표 CPA와 ROAS는 비워두거나 0 이상 숫자로 입력해 주세요." };
  }

  return {
    ok: true,
    data: {
      id: item.id,
      brandKey: item.brandKey,
      adProductType: item.adProductType,
      periodDays,
      minImpressions,
      minClicks,
      minCost,
      targetCpa,
      targetRoas,
      enabled: item.enabled,
    },
  };
}

function parseInteger(value: string) {
  const parsed = parseNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

function parseNullableNumber(value: string) {
  return value.trim() === "" ? null : parseNumber(value);
}

function parseNumber(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}
