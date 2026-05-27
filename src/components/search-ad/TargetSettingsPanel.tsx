import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdStateRecord, SearchAdTargetSettingRecord } from "@/features/search-ad/domain/types";
import { formatDateTime } from "./SearchAdCards";

type TargetSettingsPanelProps = {
  adgroups: SearchAdStateRecord[];
  targetSettings: SearchAdTargetSettingRecord[];
};

export function TargetSettingsPanel({ adgroups, targetSettings }: TargetSettingsPanelProps) {
  const rows = adgroups.map((adgroup) => {
    const settings = targetSettings.filter((setting) => setting.ownerId === adgroup.providerId);
    const timeSettings = settings.filter((setting) => setting.targetType === "TIME_WEEKLY_TARGET");
    const deviceSettings = settings.filter((setting) => setting.targetType === "PC_MOBILE_TARGET");
    const mediaSettings = settings.filter((setting) => setting.targetType === "MEDIA_TARGET");
    return {
      adgroup,
      timeLabel: timeSettings.length ? timeSettings.map((setting) => setting.settingLabel).join(", ") : "요일/시간 API 설정 없음",
      deviceLabel: deviceSettings.length ? deviceSettings.map((setting) => setting.settingLabel).join(", ") : "기기 API 설정 없음",
      mediaLabel: mediaSettings.length ? mediaSettings.map((setting) => setting.settingLabel).join(", ") : "매체 API 설정 없음",
      collectedAt: settings[0]?.collectedAt ?? adgroup.collectedAt,
    };
  });
  const timeConfigured = rows.filter((row) => row.timeLabel !== "요일/시간 API 설정 없음").length;
  const deviceConfigured = rows.filter((row) => row.deviceLabel !== "기기 API 설정 없음").length;

  return (
    <section className="content-panel">
      <div className="section-heading">
        <h2>운영시간·기기 설정</h2>
        <p>네이버 API의 광고그룹 타게팅 설정입니다. 실제 비용 발생 여부는 타게팅 보고서와 함께 비교합니다.</p>
      </div>
      <div className="state-summary-grid" aria-label="타게팅 설정 요약">
        <article>
          <span>광고그룹</span>
          <strong>{rows.length.toLocaleString("ko-KR")}개</strong>
        </article>
        <article>
          <span>요일/시간 설정</span>
          <strong>{timeConfigured.toLocaleString("ko-KR")}개</strong>
        </article>
        <article>
          <span>기기 설정</span>
          <strong>{deviceConfigured.toLocaleString("ko-KR")}개</strong>
        </article>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">광고그룹</th>
              <th scope="col">브랜드</th>
              <th scope="col">광고유형</th>
              <th scope="col">요일/시간</th>
              <th scope="col">기기</th>
              <th scope="col">매체</th>
              <th scope="col">수집 시간</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.adgroup.providerId}>
                <td className="state-name-cell" title={row.adgroup.name}>
                  {row.adgroup.name}
                </td>
                <td>{row.adgroup.brandKey ? getBrandLabel(row.adgroup.brandKey) : "매핑 필요"}</td>
                <td>{row.adgroup.adProductType ? getAdProductLabel(row.adgroup.adProductType) : "매핑 필요"}</td>
                <td>{row.timeLabel}</td>
                <td>{row.deviceLabel}</td>
                <td className="target-setting-cell" title={row.mediaLabel}>
                  {row.mediaLabel}
                </td>
                <td>{formatDateTime(row.collectedAt) ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>아직 수집된 광고그룹이 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
