"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import { sortSearchAdStateRecords, type SearchAdStateSort, type SearchAdStateSortKey } from "@/features/search-ad/domain/stateSorting";
import type { SearchAdActionLog, SearchAdActionPreview, SearchAdRequestedAction, SearchAdStateRecord } from "@/features/search-ad/domain/types";
import { formatDateTime, formatWon } from "./SearchAdCards";

type SearchAdStateTableProps = {
  description: string;
  records: SearchAdStateRecord[];
  targetType: "campaign" | "adgroup";
  title: string;
  writeEnabled: boolean;
};

type RowMessage = {
  kind: "success" | "warning" | "error";
  text: string;
};

type ApiPayload<T> = {
  ok?: boolean;
  data?: T;
  message?: string;
};

const SORT_HEADERS: Array<{ key: SearchAdStateSortKey; label: string }> = [
  { key: "name", label: "이름" },
  { key: "brand", label: "브랜드" },
  { key: "adProduct", label: "광고유형" },
  { key: "state", label: "현재 상태" },
  { key: "bidAmount", label: "입찰" },
  { key: "dailyBudget", label: "일예산" },
  { key: "collectedAt", label: "수집 시간" },
];

export function SearchAdStateTable({ records, targetType, title, description, writeEnabled }: SearchAdStateTableProps) {
  const [rows, setRows] = useState(records);
  const [sort, setSort] = useState<SearchAdStateSort | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, RowMessage>>({});

  useEffect(() => {
    setRows(records);
  }, [records]);

  const sortedRows = useMemo(() => sortSearchAdStateRecords(rows, sort), [rows, sort]);
  const summary = useMemo(() => getSearchAdStateSummary(rows, writeEnabled), [rows, writeEnabled]);

  function updateSort(key: SearchAdStateSortKey) {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }

      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  async function handleToggle(record: SearchAdStateRecord) {
    const request = buildStateTogglePreviewRequest(record, targetType);
    const nextUserLock = request.requestedAction === "turn_off";

    setPendingId(record.providerId);
    setMessages((current) => ({
      ...current,
      [record.providerId]: { kind: "warning", text: getStateTogglePendingMessage(targetType, writeEnabled) },
    }));

    try {
      const preview = await postJson<SearchAdActionPreview>("/api/search-ad/action-preview", request);
      const log = await postJson<SearchAdActionLog>("/api/search-ad/action-apply", {
        previewId: preview.id,
      });

      if (log.status === "applied") {
        setRows((current) =>
          current.map((row) =>
            row.providerId === record.providerId
              ? {
                  ...row,
                  userLock: nextUserLock,
                  statusReason: nextUserLock ? "사용자 중지" : "운영 가능",
                  collectedAt: new Date().toISOString(),
                }
              : row,
          ),
        );
        setMessages((current) => ({
          ...current,
          [record.providerId]: { kind: "success", text: getStateToggleSuccessMessage(targetType, nextUserLock) },
        }));
        return;
      }

      setMessages((current) => ({
        ...current,
        [record.providerId]: { kind: log.status === "blocked" ? "warning" : "error", text: log.reason || "상태 변경이 반영되지 않았습니다." },
      }));
    } catch (error) {
      const text = error instanceof Error ? error.message : "상태 변경 요청에 실패했습니다.";
      setMessages((current) => ({
        ...current,
        [record.providerId]: { kind: "error", text },
      }));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="state-summary-grid" aria-label={`${getStateTableTargetLabel(targetType)} 요약`}>
        <article>
          <span>전체</span>
          <strong>{summary.total.toLocaleString("ko-KR")}개</strong>
        </article>
        <article>
          <span>켜짐</span>
          <strong>{summary.on.toLocaleString("ko-KR")}개</strong>
        </article>
        <article>
          <span>꺼짐</span>
          <strong>{summary.off.toLocaleString("ko-KR")}개</strong>
        </article>
        <article>
          <span>매핑 필요</span>
          <strong>{summary.needsMapping.toLocaleString("ko-KR")}개</strong>
        </article>
        <article>
          <span>실제 변경</span>
          <strong>{summary.writeLabel}</strong>
        </article>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {SORT_HEADERS.map((header) => (
                <th aria-sort={sort?.key === header.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} key={header.key} scope="col">
                  <button className="table-sort-button" onClick={() => updateSort(header.key)} type="button">
                    <span>{header.label}</span>
                    <span aria-hidden="true">{sort?.key === header.key ? (sort.direction === "asc" ? "↑" : "↓") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((record) => {
              const isOn = record.userLock !== true;
              const message = messages[record.providerId];
              const isPending = pendingId === record.providerId;
              return (
                <tr key={record.id}>
                  <td className="state-name-cell" title={record.name}>
                    {record.name}
                  </td>
                  <td>{record.brandKey ? getBrandLabel(record.brandKey) : "매핑 필요"}</td>
                  <td>{record.adProductType ? getAdProductLabel(record.adProductType) : "매핑 필요"}</td>
                  <td>
                    <div className="state-toggle-cell">
                      <button
                        aria-label={getStateToggleAriaLabel(record, targetType)}
                        aria-pressed={isOn}
                        className={`state-toggle ${isOn ? "is-on" : "is-off"}`}
                        disabled={isPending}
                        onClick={() => handleToggle(record)}
                        type="button"
                      >
                        <span className="state-toggle-track" aria-hidden="true">
                          <span />
                        </span>
                        <strong>{isPending ? "처리 중" : isOn ? "켜짐" : "꺼짐"}</strong>
                      </button>
                      <span className="state-caption">{record.statusReason ?? record.status ?? "상태 없음"}</span>
                      {message ? <span className={`state-message is-${message.kind}`}>{message.text}</span> : null}
                    </div>
                  </td>
                  <td>{record.bidAmount == null ? "-" : formatWon(record.bidAmount)}</td>
                  <td>{record.dailyBudget == null ? "-" : formatWon(record.dailyBudget)}</td>
                  <td>{formatDateTime(record.collectedAt) ?? "-"}</td>
                </tr>
              );
            })}
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={7}>아직 수집된 상태 스냅샷이 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function getSearchAdStateSortHeaders() {
  return SORT_HEADERS;
}

export function getSearchAdStateSummary(records: SearchAdStateRecord[], writeEnabled: boolean) {
  return records.reduce(
    (summary, record) => ({
      total: summary.total + 1,
      on: summary.on + (record.userLock === true ? 0 : 1),
      off: summary.off + (record.userLock === true ? 1 : 0),
      needsMapping: summary.needsMapping + (!record.brandKey || !record.adProductType ? 1 : 0),
      writeLabel: writeEnabled ? "허용됨" : "차단됨",
    }),
    {
      total: 0,
      on: 0,
      off: 0,
      needsMapping: 0,
      writeLabel: writeEnabled ? "허용됨" : "차단됨",
    },
  );
}

export function getStateTableTargetLabel(targetType: "campaign" | "adgroup") {
  return targetType === "campaign" ? "캠페인" : "광고그룹";
}

export function buildStateTogglePreviewRequest(record: SearchAdStateRecord, targetType: "campaign" | "adgroup") {
  const currentOn = record.userLock !== true;
  const requestedAction: SearchAdRequestedAction = currentOn ? "turn_off" : "turn_on";
  return {
    requestedAction,
    targetId: record.providerId,
    targetType,
  };
}

export function getStateToggleAriaLabel(record: SearchAdStateRecord, targetType: "campaign" | "adgroup") {
  const actionLabel = record.userLock !== true ? "끄기" : "켜기";
  return `${record.name} ${getStateTableTargetLabel(targetType)} ${actionLabel}`;
}

function getStateTogglePendingMessage(targetType: "campaign" | "adgroup", writeEnabled: boolean) {
  const targetLabel = getStateTableTargetLabel(targetType);
  return writeEnabled ? `네이버 ${targetLabel}에 반영 중입니다.` : "실제 변경 권한을 확인 중입니다.";
}

function getStateToggleSuccessMessage(targetType: "campaign" | "adgroup", nextUserLock: boolean) {
  const targetLabel = getStateTableTargetLabel(targetType);
  return nextUserLock ? `네이버 ${targetLabel}을 껐습니다.` : `네이버 ${targetLabel}을 켰습니다.`;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiPayload<T>;

  if (payload.ok === true && payload.data) {
    return payload.data;
  }

  throw new Error(payload.message ?? (response.ok ? "요청을 처리하지 못했습니다." : `요청 실패: ${response.status}`));
}
