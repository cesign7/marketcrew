import { describe, expect, it } from "vitest";
import {
  getRuleResultAdLabel,
  getRuleResultCreativeLabel,
  getRuleResultDisplayTargetLabel,
  getRuleResultDisplayTargetTypeLabel,
  getRuleResultDetailHref,
  getRuleResultExtensionContentStatusLabel,
  getRuleResultExtensionLabel,
  getRuleResultExtensionMaterialDisplay,
  getRuleResultPeriodLabel,
  getRuleResultPowerlinkExtensionPreview,
  getRuleResultPowerlinkAdPreview,
  getRuleResultProductConnection,
  getRuleResultRawTargetId,
  getRuleResultShoppingAdPreview,
  getRuleResultShoppingProductId,
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

  it("쇼핑검색 상품 광고는 네이버 화면 재구성용 표시 정보를 만든다", () => {
    const result = ruleResult({
      adProductType: "shopping_search",
      targetType: "ad",
      targetId: "nad-a001-02-000000203421541",
      evidencePacket: {
        productName: "생일축하스티커 생일01 답례품 감사 소량 주문",
        productImageUrl: "https://shopping-phinf.pstatic.net/main_8478242/84782425770.3.jpg",
        mallName: "스티커씨",
        mallProductId: "7237925448",
        lowPrice: "2500",
        reviewCountSum: "2272",
        purchaseCnt: "2264",
        scoreInfo: "4.94",
        deliveryFee: "3000",
        categoryPath: "생활/건강>문구/사무용품>스티커>주문제작스티커",
      },
    });

    expect(getRuleResultShoppingAdPreview(result)).toEqual({
      productName: "생일축하스티커 생일01 답례품 감사 소량 주문",
      imageUrl: "https://shopping-phinf.pstatic.net/main_8478242/84782425770.3.jpg",
      mallName: "스티커씨",
      highlightLabel: "상품 광고",
      priceLabel: "2,500원",
      reviewLabel: "리뷰 2,272",
      purchaseLabel: "구매 2,264",
      scoreLabel: "평점 4.94",
      deliveryLabel: "배송비 3,000원",
      categoryLabel: "생활/건강>문구/사무용품>스티커>주문제작스티커",
      mallProductId: "7237925448",
      adId: "nad-a001-02-000000203421541",
      basisLabel: "네이버 광고 API 원문 기반 재구성",
    });
  });

  it("파워링크 광고는 실제 제목과 설명 영역을 점검 대상으로 재구성한다", () => {
    const result = ruleResult({
      adProductType: "powerlink",
      targetType: "ad",
      targetId: "nad-a001-01-000000069812547",
      evidencePacket: {
        adHeadline: "{keyword:추석선물카드} 전문 커피프린트",
        adDescription: "추석선물카드제작! 기업맞춤 컬러로고 무료, 대량할인, 1일배송",
        pcDisplayUrl: "http://www.coffeeprint.co.kr",
        mobileDisplayUrl: "http://m.coffeeprint.co.kr",
        pcFinalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=90",
        mobileFinalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=90",
      },
    });

    expect(getRuleResultPowerlinkAdPreview(result)).toEqual({
      headline: "{keyword:추석선물카드} 전문 커피프린트",
      description: "추석선물카드제작! 기업맞춤 컬러로고 무료, 대량할인, 1일배송",
      displayUrl: "http://www.coffeeprint.co.kr",
      finalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=90",
      highlightLabel: "파워링크 광고",
      adId: "nad-a001-01-000000069812547",
      basisLabel: "네이버 광고 API 원문 기반 재구성",
    });
  });

  it("파워링크 광고 제목이 기술 ID뿐이면 미리보기 제목으로 쓰지 않는다", () => {
    const result = ruleResult({
      adProductType: "powerlink",
      targetType: "ad",
      targetId: "nad-a001-01-000000069812547",
      evidencePacket: {
        adHeadline: "nad-a001-01-000000069812547",
        adDescription: "커피쿠폰 제작 가능",
      },
    });

    expect(getRuleResultPowerlinkAdPreview(result)?.headline).toBe("광고 문구 확인 필요");
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

  it("쇼핑검색광고의 광고 ID는 상품 광고로 구분해서 보여준다", () => {
    const result = ruleResult({
      adProductType: "shopping_search",
      targetType: "ad",
      targetId: "nad-a001-02-000000203421541",
      targetLabel: "M_감사/생일/답례 스티커 광고 소재",
      evidencePacket: {
        adDisplayLabel: "생일축하스티커 생일01 답례품 감사 소량 주문",
        adgroupName: "M_감사/생일/답례 스티커",
        mallProductId: "7237925448",
        targetTypeLabel: "광고 소재",
      },
    });

    expect(getRuleResultAdLabel(result)).toBe("상품 광고");
    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("상품 광고");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("생일축하스티커 생일01 답례품 감사 소량 주문 상품 광고");
    expect(getRuleResultShoppingProductId(result)).toBe("7237925448");
    expect(getRuleResultRawTargetId(result)).toBe("nad-a001-02-000000203421541");
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

    expect(getRuleResultExtensionLabel(result)).toBe("쇼핑 상품 부가 정보 · 세부 항목 미제공");
    expect(getRuleResultExtensionContentStatusLabel(result)).toBe("세부 항목은 네이버 API 원문에 제공되지 않음");
    expect(getRuleResultExtensionMaterialDisplay(result)).toEqual({
      contentLabel: "세부 항목 미제공",
      tone: "shopping-extra",
      typeLabel: "쇼핑 상품 부가 정보",
    });
    expect(getRuleResultDisplayTargetLabel(result)).toBe("쇼핑 상품 부가 정보 · 세부 항목 미제공 · 생일축하스티커 생일01 답례품 감사 소량 주문");
    expect(getRuleResultDisplayTargetTypeLabel(result)).toBe("확장소재");
    expect(getRuleResultRawTargetId(result)).toBe("ext-a001-02-000000124735420");
  });

  it("부가정보 본문이 비어 있는 쇼핑 상품 부가 정보는 상품명으로 내용을 가장하지 않는다", () => {
    const result = ruleResult({
      targetType: "ad_extension",
      targetId: "ext-a001-02-000000146359903",
      targetLabel: "M_감사/생일/답례 스티커 확장소재",
      evidencePacket: {
        productName: "결혼식 답례품스티커 웨딩01 감사 결혼 간식 대절버스 스티커 주문제작",
        extensionDisplayLabel: "쇼핑 부가정보 · 고유번호 359903",
        extensionTypeLabel: "SHOPPING_EXTRA",
      },
    });

    expect(getRuleResultExtensionLabel(result)).toBe("쇼핑 상품 부가 정보 · 세부 항목 미제공");
    expect(getRuleResultExtensionContentStatusLabel(result)).toBe("세부 항목은 네이버 API 원문에 제공되지 않음");
    expect(getRuleResultDisplayTargetLabel(result)).toBe(
      "쇼핑 상품 부가 정보 · 세부 항목 미제공 · 결혼식 답례품스티커 웨딩01 감사 결혼 간식 대절버스 스티커 주문제작",
    );
  });

  it("쇼핑 부가정보 본문이 있으면 연결 상품명보다 본문을 먼저 보여준다", () => {
    const result = ruleResult({
      targetType: "ad_extension",
      targetId: "ext-a001-02-000000146359903",
      targetLabel: "M_감사/생일/답례 스티커 확장소재",
      evidencePacket: {
        productName: "결혼식 답례품스티커 웨딩01 감사 결혼 간식 대절버스 스티커 주문제작",
        extensionDisplayLabel: "쇼핑 부가정보 · 오늘 주문 가능",
        extensionTypeLabel: "SHOPPING_EXTRA",
      },
    });

    expect(getRuleResultExtensionLabel(result)).toBe("쇼핑 상품 부가 정보 · 오늘 주문 가능");
    expect(getRuleResultExtensionContentStatusLabel(result)).toBeUndefined();
    expect(getRuleResultDisplayTargetLabel(result)).toBe(
      "쇼핑 상품 부가 정보 · 오늘 주문 가능 · 결혼식 답례품스티커 웨딩01 감사 결혼 간식 대절버스 스티커 주문제작",
    );
  });

  it("기존 저장 결과의 파워링크 이미지 경로는 한글 소재명과 이미지 URL로 보정한다", () => {
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

    expect(getRuleResultExtensionLabel(result)).toBe("파워링크 이미지");
    expect(getRuleResultDisplayTargetLabel(result)).toBe("파워링크 이미지 · 생일축하스티커 생일01 답례품 감사 소량 주문");
    expect(getRuleResultProductConnection(result).imageUrl).toBe("https://searchad-phinf.pstatic.net/MjAyMzA0MTRfMTc3/MDAxNjgxNDY0MjA0MTQ0.Zr8nch0RFw.jpg");
  });

  it("파워링크 이미지 확장소재는 광고 문구와 이미지 확장 위치를 함께 재구성한다", () => {
    const result = ruleResult({
      adProductType: "powerlink",
      targetType: "ad_extension",
      targetId: "ext-a001-01-000000016529685",
      targetLabel: "30_초대장 확장소재",
      evidencePacket: {
        adHeadline: "{keyword:초대장} 전문 커피프린트",
        adDescription: "NEW! 기업{keyword:초대장}! 기업맞춤 컬러로고무료, 대량할인",
        pcDisplayUrl: "http://www.coffeeprint.co.kr",
        pcFinalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
        extensionType: "POWER_LINK_IMAGE",
        extensionTypeLabel: "파워링크 이미지",
        extensionLabel: "이미지 소재 214x214",
        extensionDisplayLabel: "파워링크 이미지 · 이미지 소재 214x214",
        extensionImageUrl: "https://searchad-phinf.pstatic.net/image.jpg",
      },
    });

    expect(getRuleResultPowerlinkExtensionPreview(result)).toEqual({
      headline: "{keyword:초대장} 전문 커피프린트",
      description: "NEW! 기업{keyword:초대장}! 기업맞춤 컬러로고무료, 대량할인",
      displayUrl: "http://www.coffeeprint.co.kr",
      finalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
      extensionTypeLabel: "파워링크 이미지",
      extensionContentLabel: "이미지 확장소재",
      extensionTone: "image",
      extensionImageUrl: "https://searchad-phinf.pstatic.net/image.jpg",
      highlightLabel: "파워링크 이미지",
      basisLabel: "네이버 광고 API 원문 기반 재구성",
    });
  });

  it("파워링크 이미지 추가 링크 확장소재는 광고 아래 이미지 링크 영역을 점검 대상으로 재구성한다", () => {
    const result = ruleResult({
      adProductType: "powerlink",
      targetType: "ad_extension",
      targetId: "ext-a001-01-000000315153393",
      targetLabel: "30_초대장 확장소재",
      evidencePacket: {
        adHeadline: "{keyword:초대장} 전문 커피프린트",
        pcDisplayUrl: "http://www.coffeeprint.co.kr",
        pcFinalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
        extensionType: "IMAGE_SUB_LINKS",
        extensionTypeLabel: "이미지 추가 링크",
        extensionLabel: "디자인초대장",
        extensionDisplayLabel: "이미지 추가 링크 · 디자인초대장",
        extensionImageUrl: "https://searchad-phinf.pstatic.net/image-sub-link.jpg",
      },
    });

    expect(getRuleResultPowerlinkExtensionPreview(result)).toEqual({
      headline: "{keyword:초대장} 전문 커피프린트",
      displayUrl: "http://www.coffeeprint.co.kr",
      finalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
      extensionTypeLabel: "이미지 추가 링크",
      extensionContentLabel: "디자인초대장",
      extensionTone: "image",
      extensionImageUrl: "https://searchad-phinf.pstatic.net/image-sub-link.jpg",
      highlightLabel: "이미지 추가 링크",
      basisLabel: "네이버 광고 API 원문 기반 재구성",
    });
  });

  it("파워링크 추가 링크 확장소재는 광고 아래 링크 영역을 점검 대상으로 재구성한다", () => {
    const result = ruleResult({
      adProductType: "powerlink",
      targetType: "ad_extension",
      targetId: "ext-a001-01-000000285945443",
      targetLabel: "30_초대장 확장소재",
      evidencePacket: {
        adHeadline: "{keyword:초대장} 전문 커피프린트",
        pcDisplayUrl: "http://www.coffeeprint.co.kr",
        pcFinalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
        extensionType: "SUB_LINKS",
        extensionTypeLabel: "추가 링크",
        extensionLabel: "디자인초대장",
        extensionDisplayLabel: "추가 링크 · 디자인초대장",
      },
    });

    expect(getRuleResultPowerlinkExtensionPreview(result)).toEqual({
      headline: "{keyword:초대장} 전문 커피프린트",
      displayUrl: "http://www.coffeeprint.co.kr",
      finalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
      extensionTypeLabel: "추가 링크",
      extensionContentLabel: "디자인초대장",
      extensionTone: "link",
      highlightLabel: "추가 링크",
      basisLabel: "네이버 광고 API 원문 기반 재구성",
    });
  });

  it("파워링크 제목 확장소재는 광고 문구 안의 확장 제목 위치를 점검 대상으로 재구성한다", () => {
    const result = ruleResult({
      adProductType: "powerlink",
      targetType: "ad_extension",
      targetId: "ext-a001-01-000000050217073",
      targetLabel: "30_초대장 확장소재",
      evidencePacket: {
        adHeadline: "{keyword:초대장} 전문 커피프린트",
        pcDisplayUrl: "http://www.coffeeprint.co.kr",
        pcFinalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
        extensionType: "HEADLINE",
        extensionTypeLabel: "제목 확장",
        extensionLabel: "50매부터 많아질수록 할인!",
        extensionDisplayLabel: "제목 확장 · 50매부터 많아질수록 할인!",
      },
    });

    expect(getRuleResultPowerlinkExtensionPreview(result)).toEqual({
      headline: "{keyword:초대장} 전문 커피프린트",
      displayUrl: "http://www.coffeeprint.co.kr",
      finalUrl: "https://coffeeprint.co.kr/shop/list.php?ca_id=30",
      extensionTypeLabel: "제목 확장",
      extensionContentLabel: "50매부터 많아질수록 할인!",
      extensionTone: "text",
      highlightLabel: "제목 확장",
      basisLabel: "네이버 광고 API 원문 기반 재구성",
    });
  });

  it("확장소재 종류와 실제 표시 내용을 분리해서 카드용 표시값을 만든다", () => {
    const promotion = ruleResult({
      targetType: "ad_extension",
      evidencePacket: {
        extensionDisplayLabel: "프로모션 · 50%할인 이벤트",
        extensionTypeLabel: "PROMOTION",
      },
    });
    const talk = ruleResult({
      targetType: "ad_extension",
      evidencePacket: {
        extensionDisplayLabel: "네이버 톡톡",
        extensionTypeLabel: "TALK",
      },
    });
    const imageSubLinks = ruleResult({
      targetType: "ad_extension",
      evidencePacket: {
        extensionDisplayLabel: "IMAGE_SUB_LINKS · 디자인초대장 · NEW",
        extensionTypeLabel: "IMAGE_SUB_LINKS",
      },
    });

    expect(getRuleResultExtensionMaterialDisplay(promotion)).toEqual({
      contentLabel: "50%할인 이벤트",
      tone: "promotion",
      typeLabel: "프로모션",
    });
    expect(getRuleResultExtensionMaterialDisplay(talk)).toEqual({
      contentLabel: "톡톡 연결",
      tone: "talk",
      typeLabel: "네이버 톡톡",
    });
    expect(getRuleResultExtensionMaterialDisplay(imageSubLinks)).toEqual({
      contentLabel: "디자인초대장",
      tone: "image",
      typeLabel: "이미지 추가 링크",
    });
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
