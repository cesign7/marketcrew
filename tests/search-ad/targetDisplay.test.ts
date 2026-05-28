import { describe, expect, it } from "vitest";
import {
  getRuleResultAdLabel,
  getRuleResultCreativeLabel,
  getRuleResultDisplayTargetLabel,
  getRuleResultDisplayTargetTypeLabel,
  getRuleResultDetailHref,
  getRuleResultExtensionLabel,
  getRuleResultPeriodLabel,
  getRuleResultProductConnection,
  getRuleResultRawTargetId,
  getRuleResultTargetDetailLabel,
} from "@/features/search-ad/domain/targetDisplay";
import type { SearchAdRuleResult } from "@/features/search-ad/domain/types";

describe("rule result target display", () => {
  it("기존 저장 결과의 광고 소재 ID를 카드 제목에서 숨긴다", () => {
    const result = ruleResult({
      targetLabel: "nad-a001-02-000000203421541",
      targetType: "search_term",
      evidencePacket: {
        adgroupName: "M_감사/생일/답례 스티커",
      },
    });

    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("광고 소재");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("M_감사/생일/답례 스티커 광고 소재");
    expect(getRuleResultRawTargetId(result)).toBe("nad-a001-02-000000203421541");
  });

  it("기존 저장 결과의 타게팅 코드를 카드 제목에서 숨긴다", () => {
    const result = ruleResult({
      targetLabel: "grp-a001-02-000000029331497~GNF",
      targetType: "search_term",
      evidencePacket: {
        adgroupName: "M_감사/생일/답례 스티커",
      },
    });

    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("타게팅");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("M_감사/생일/답례 스티커 여성 타게팅");
    expect(getRuleResultTargetDetailLabel(result)).toBe("여성");
    expect(getRuleResultRawTargetId(result)).toBe("grp-a001-02-000000029331497~GNF");
  });

  it("타게팅 코드의 연령과 시간대를 한글로 보여준다", () => {
    const ageResult = ruleResult({
      targetLabel: "grp-a001-02-000000029331497~AG3539",
      evidencePacket: { adgroupName: "M_감사/생일/답례 스티커" },
    });
    const scheduleResult = ruleResult({
      targetLabel: "grp-m001-01-000001408384958~SDMON0820",
      evidencePacket: { adgroupName: "30_초대장" },
    });

    expect(getRuleResultTargetDetailLabel(ageResult)).toBe("35~39세");
    expect(getRuleResultDisplayTargetLabel(ageResult)).toBe("M_감사/생일/답례 스티커 35~39세 타게팅");
    expect(getRuleResultTargetDetailLabel(scheduleResult)).toBe("월요일 8:00~20:00");
  });

  it("실제 수집 기간과 규칙 기간을 함께 보여준다", () => {
    const result = ruleResult({
      periodDays: 30,
      evidencePacket: {
        dataCoverageLabel: "수집 기준일 2026-05-25 · 1일 기준 (목표 30일)",
      },
    });

    expect(getRuleResultPeriodLabel(result)).toBe("수집 기준일 2026-05-25 · 1일 기준 (목표 30일)");
  });

  it("수집 기간이 저장되지 않은 기존 결과는 원천 기준일로 보완한다", () => {
    const result = ruleResult({
      periodDays: 30,
      evidencePacket: {
        sourceDate: "2026-05-25",
      },
    });

    expect(getRuleResultPeriodLabel(result)).toBe("수집 기준일 2026-05-25 · 1일 기준 (목표 30일)");
  });

  it("소재명이 ID뿐이면 화면 소재명으로 쓰지 않는다", () => {
    const result = ruleResult({
      evidencePacket: {
        adHeadline: "nad-a001-02-000000203421541",
      },
    });

    expect(getRuleResultCreativeLabel(result)).toBeUndefined();
  });

  it("실제 소재명은 화면에 보여준다", () => {
    const result = ruleResult({
      evidencePacket: {
        adHeadline: "생일 스티커",
      },
    });

    expect(getRuleResultCreativeLabel(result)).toBe("생일 스티커");
  });

  it("광고 소재 카드 제목은 실제 소재명을 우선 보여준다", () => {
    const result = ruleResult({
      targetType: "ad",
      targetId: "nad-a001-02-000000203421541",
      targetLabel: "M_감사/생일/답례 스티커 광고 소재",
      evidencePacket: {
        adDisplayLabel: "생일축하스티커 생일01 답례품 감사 소량 주문",
        adgroupName: "M_감사/생일/답례 스티커",
      },
    });

    expect(getRuleResultAdLabel(result)).toBe("광고 소재");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("생일축하스티커 생일01 답례품 감사 소량 주문 광고 소재");
  });

  it("확장소재 카드 제목은 연결 소재와 확장소재 종류를 함께 보여준다", () => {
    const result = ruleResult({
      targetType: "ad_extension",
      targetId: "ext-a001-02-000000124735420",
      targetLabel: "M_감사/생일/답례 스티커 확장소재",
      evidencePacket: {
        adDisplayLabel: "생일축하스티커 생일01 답례품 감사 소량 주문",
        extensionDisplayLabel: "쇼핑 부가정보 · 고유번호 735420",
        extensionTypeLabel: "쇼핑 부가정보",
      },
    });

    expect(getRuleResultExtensionLabel(result)).toBe("쇼핑 부가정보 · 고유번호 735420");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("쇼핑 부가정보 · 고유번호 735420 · 생일축하스티커 생일01 답례품 감사 소량 주문");
    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("확장소재");
    expect(getRuleResultRawTargetId(result)).toBe("ext-a001-02-000000124735420");
  });

  it("기존 저장 결과의 파워링크 이미지 경로는 한글 소재명으로 보정한다", () => {
    const result = ruleResult({
      targetType: "ad_extension",
      targetId: "ext-a001-02-000000157571490",
      targetLabel: "M_감사/생일/답례 스티커 확장소재",
      evidencePacket: {
        adDisplayLabel: "생일축하스티커 생일01 답례품 감사 소량 주문",
        extensionDisplayLabel: "POWER_LINK_IMAGE · /MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg",
        extensionTypeLabel: "POWER_LINK_IMAGE",
      },
    });

    expect(getRuleResultExtensionLabel(result)).toBe("파워링크 이미지 · 이미지 소재");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("파워링크 이미지 · 이미지 소재 · 생일축하스티커 생일01 답례품 감사 소량 주문");
    expect(getRuleResultProductConnection(result).imageUrl).toBe("https://searchad-phinf.pstatic.net/MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg");
  });

  it("실제 검색어는 그대로 보여준다", () => {
    const result = ruleResult({
      targetLabel: "초대장디자인",
      targetType: "search_term",
      evidencePacket: {
        adgroupName: "30_초대장",
      },
    });

    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("검색어");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("초대장디자인");
  });

  it("규칙 결과 상세 링크를 만든다", () => {
    const result = ruleResult({
      id: "rule-low 스티커/테스트",
    });

    expect(getRuleResultDetailHref(result)).toBe("/rule-results/rule-low%20%EC%8A%A4%ED%8B%B0%EC%BB%A4%2F%ED%85%8C%EC%8A%A4%ED%8A%B8");
  });

  it("쇼핑검색 연결 상품명과 대표 이미지, 랜딩을 묶어 보여준다", () => {
    const result = ruleResult({
      adProductType: "shopping_search",
      evidencePacket: {
        productName: "1406 추석선물카드 감사 명절연하인사카드",
        productImageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
        pcFinalUrl: "https://smartstore.naver.com/main/products/6985720295",
        mobileFinalUrl: "https://m.smartstore.naver.com/main/products/6985720295",
      },
    });

    expect(getRuleResultProductConnection(result)).toEqual({
      productName: "1406 추석선물카드 감사 명절연하인사카드",
      imageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
      landingLabel:
        "PC https://smartstore.naver.com/main/products/6985720295 / 모바일 https://m.smartstore.naver.com/main/products/6985720295",
      hasConnection: true,
    });
  });

  it("상품명이 없을 때 기술 ID를 연결 상품명으로 쓰지 않는다", () => {
    const result = ruleResult({
      adProductType: "shopping_search",
      evidencePacket: {
        adHeadline: "nad-a001-02-000000203421541",
        productImageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
      },
    });

    expect(getRuleResultProductConnection(result)).toEqual({
      imageUrl: "https://shopping-phinf.pstatic.net/main_8453022/84530220617.1.jpg",
      hasConnection: true,
    });
  });

  it("확장소재 이미지 URL을 소재 미리보기 이미지로 쓴다", () => {
    const result = ruleResult({
      targetType: "ad_extension",
      evidencePacket: {
        extensionImagePath: "/MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg",
      },
    });

    expect(getRuleResultProductConnection(result)).toEqual({
      imageUrl: "https://searchad-phinf.pstatic.net/MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg",
      hasConnection: true,
    });
  });
});

function ruleResult(overrides: Partial<SearchAdRuleResult>): SearchAdRuleResult {
  return {
    id: "rule-result",
    brandKey: "stickersee",
    adProductType: "powerlink",
    category: "low_efficiency",
    targetType: "search_term",
    targetId: "target",
    targetLabel: "검색어",
    severity: "medium",
    periodDays: 30,
    reason: "점검이 필요합니다.",
    metrics: {},
    evidencePacket: {},
    createdAt: "2026-05-26T08:00:00+09:00",
    ...overrides,
  };
}
