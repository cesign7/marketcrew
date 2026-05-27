"use client";

import { useMemo, useState } from "react";
import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdOperationStrategy } from "@/features/search-ad/domain/operationStrategies";

type OperationStrategyEditorProps = {
  strategies: SearchAdOperationStrategy[];
};

type RowState = {
  item: EditableStrategy;
  message?: {
    kind: "success" | "warning" | "error";
    text: string;
  };
  saving: boolean;
};

type EditableStrategy = Omit<SearchAdOperationStrategy, "minimumDataDays" | "minimumClicks" | "minimumCost"> & {
  minimumDataDays: string;
  minimumClicks: string;
  minimumCost: string;
};

type ApiPayload = {
  ok?: boolean;
  data?: SearchAdOperationStrategy;
  message?: string;
};

export function OperationStrategyEditor({ strategies }: OperationStrategyEditorProps) {
  const initialRows = useMemo(() => strategies.map((item) => ({ item: toEditableStrategy(item), saving: false })), [strategies]);
  const [rows, setRows] = useState<RowState[]>(initialRows);

  function updateRow(id: string, patch: Partial<EditableStrategy>) {
    setRows((current) => current.map((row) => (row.item.id === id ? { ...row, item: { ...row.item, ...patch }, message: undefined } : row)));
  }

  async function saveRow(id: string) {
    const row = rows.find((item) => item.item.id === id);
    if (!row) {
      return;
    }

    const parsed = toPayload(row.item);
    if (!parsed.ok) {
      setRows((current) => current.map((item) => (item.item.id === id ? { ...item, message: { kind: "error", text: parsed.message }, saving: false } : item)));
      return;
    }

    setRows((current) => current.map((item) => (item.item.id === id ? { ...item, saving: true, message: undefined } : item)));
    try {
      const response = await fetch("/api/search-ad/operation-strategies", {
        body: JSON.stringify(parsed.data),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok || payload.ok !== true || !payload.data) {
        throw new Error(payload.message ?? "운영 전략을 저장하지 못했습니다.");
      }
      const savedStrategy = payload.data;
      setRows((current) =>
        current.map((item) =>
          item.item.id === id
            ? {
                item: toEditableStrategy(savedStrategy),
                message: { kind: "success", text: "운영 전략을 저장했습니다. 다음 판단부터 참고 기준으로 사용됩니다." },
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
                message: { kind: "error", text: error instanceof Error ? error.message : "운영 전략 저장에 실패했습니다." },
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
              <th>범위</th>
              <th>시작 방식</th>
              <th>최소 기간</th>
              <th>최소 클릭</th>
              <th>최소 비용</th>
              <th>축소 기준</th>
              <th>승인 기준</th>
              <th>저장</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item.id}>
                <td>{getBrandLabel(row.item.brandKey)}</td>
                <td>{getAdProductLabel(row.item.adProductType)}</td>
                <td>{row.item.scopeLabel}</td>
                <td>
                  <input
                    aria-label="시작 방식"
                    className="criteria-text-input is-short"
                    onChange={(event) => updateRow(row.item.id, { initialScheduleLabel: event.currentTarget.value })}
                    type="text"
                    value={row.item.initialScheduleLabel}
                  />
                </td>
                <td>
                  <NumberInput ariaLabel="최소 판단 기간" onChange={(value) => updateRow(row.item.id, { minimumDataDays: value })} suffix="일" value={row.item.minimumDataDays} />
                </td>
                <td>
                  <NumberInput ariaLabel="최소 클릭" onChange={(value) => updateRow(row.item.id, { minimumClicks: value })} suffix="회" value={row.item.minimumClicks} />
                </td>
                <td>
                  <NumberInput ariaLabel="최소 비용" onChange={(value) => updateRow(row.item.id, { minimumCost: value })} suffix="원" value={row.item.minimumCost} />
                </td>
                <td>
                  <textarea
                    aria-label="축소 기준"
                    className="criteria-text-input"
                    onChange={(event) => updateRow(row.item.id, { narrowingRule: event.currentTarget.value })}
                    value={row.item.narrowingRule}
                  />
                </td>
                <td>
                  <textarea
                    aria-label="승인 기준"
                    className="criteria-text-input"
                    onChange={(event) => updateRow(row.item.id, { approvalRule: event.currentTarget.value })}
                    value={row.item.approvalRule}
                  />
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
      <p className="criteria-help">시즌 그룹은 고정 운영시간 위반으로 보지 않고, 넓게 열어 쌓은 데이터와 현재 API 설정을 함께 봅니다.</p>
    </div>
  );
}

function NumberInput({
  ariaLabel,
  onChange,
  suffix,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="criteria-number-input">
      <input aria-label={ariaLabel} inputMode="numeric" onChange={(event) => onChange(event.currentTarget.value)} type="text" value={value} />
      {suffix ? <span>{suffix}</span> : null}
    </label>
  );
}

function toEditableStrategy(item: SearchAdOperationStrategy): EditableStrategy {
  return {
    ...item,
    minimumDataDays: String(item.minimumDataDays),
    minimumClicks: String(item.minimumClicks),
    minimumCost: String(item.minimumCost),
  };
}

function toPayload(item: EditableStrategy): { ok: true; data: SearchAdOperationStrategy } | { ok: false; message: string } {
  const minimumDataDays = parseInteger(item.minimumDataDays);
  const minimumClicks = parseInteger(item.minimumClicks);
  const minimumCost = parseNumber(item.minimumCost);

  if (minimumDataDays === undefined || minimumDataDays < 1 || minimumDataDays > 120) {
    return { ok: false, message: "최소 판단 기간은 1~120일 사이로 입력해 주세요." };
  }

  if (minimumClicks === undefined || minimumClicks < 1) {
    return { ok: false, message: "최소 클릭은 1회 이상으로 입력해 주세요." };
  }

  if (minimumCost === undefined || minimumCost < 0) {
    return { ok: false, message: "최소 비용은 0원 이상으로 입력해 주세요." };
  }

  if (!item.narrowingRule.trim() || !item.approvalRule.trim() || !item.initialScheduleLabel.trim()) {
    return { ok: false, message: "시작 방식, 축소 기준, 승인 기준을 입력해 주세요." };
  }

  return {
    ok: true,
    data: {
      ...item,
      initialScheduleLabel: item.initialScheduleLabel.trim(),
      minimumDataDays,
      minimumClicks,
      minimumCost,
      narrowingRule: item.narrowingRule.trim(),
      approvalRule: item.approvalRule.trim(),
    },
  };
}

function parseInteger(value: string) {
  const parsed = parseNumber(value);
  return parsed !== undefined && Number.isInteger(parsed) ? parsed : undefined;
}

function parseNumber(value: string) {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}
