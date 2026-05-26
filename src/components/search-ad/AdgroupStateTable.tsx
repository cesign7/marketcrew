"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import { sortSearchAdStateRecords, type SearchAdStateSort, type SearchAdStateSortKey } from "@/features/search-ad/domain/stateSorting";
import type { SearchAdActionLog, SearchAdActionPreview, SearchAdRequestedAction, SearchAdStateRecord } from "@/features/search-ad/domain/types";
import { formatDateTime, formatWon } from "./SearchAdCards";

type AdgroupStateTableProps = {
  records: SearchAdStateRecord[];
  title: string;
  description: string;
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

export function AdgroupStateTable({ records, title, description, writeEnabled }: AdgroupStateTableProps) {
  const [rows, setRows] = useState(records);
  const [sort, setSort] = useState<SearchAdStateSort | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, RowMessage>>({});

  useEffect(() => {
    setRows(records);
  }, [records]);

  const sortedRows = useMemo(() => sortSearchAdStateRecords(rows, sort), [rows, sort]);

  function updateSort(key: SearchAdStateSortKey) {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }

      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  async function handleToggle(record: SearchAdStateRecord) {
    const currentOn = record.userLock !== true;
    const requestedAction: SearchAdRequestedAction = currentOn ? "turn_off" : "turn_on";
    const nextUserLock = requestedAction === "turn_off";

    setPendingId(record.providerId);
    setMessages((current) => ({
      ...current,
      [record.providerId]: { kind: "warning", text: writeEnabled ? "네이버 광고그룹에 반영 중입니다." : "실제 변경 권한을 확인 중입니다." },
    }));

    try {
      const preview = await postJson<SearchAdActionPreview>("/api/search-ad/action-preview", {
        targetType: "adgroup",
        targetId: record.providerId,
        requestedAction,
      });
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
          [record.providerId]: { kind: "success", text: nextUserLock ? "네이버 광고그룹을 껐습니다." : "네이버 광고그룹을 켰습니다." },
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
                  <td className="state-name-cell">{record.name}</td>
                  <td>{record.brandKey ? getBrandLabel(record.brandKey) : "매핑 필요"}</td>
                  <td>{record.adProductType ? getAdProductLabel(record.adProductType) : "매핑 필요"}</td>
                  <td>
                    <div className="state-toggle-cell">
                      <button
                        aria-label={`${record.name} 광고그룹 ${isOn ? "끄기" : "켜기"}`}
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
