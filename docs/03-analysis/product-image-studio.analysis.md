---
feature: product-image-studio
phase: check
status: checked
matchRate: 97
checkedAt: 2026-06-11T19:40:00+09:00
planDoc: docs/01-plan/features/product-image-studio.plan.md
---

# product-image-studio Check

> **Summary**: 1차 MVP는 로컬 구현 기준으로 닫혔다. `/product-image-studio`는 기존 검색광고 화면과 분리되어 있으며, 카드 + 봉투 + 봉합스티커 세트의 업로드, 콘셉트 추천, fake/blocked 생성, 세트컷과 단독컷 결과, 비율 변경, 개별/ZIP 다운로드를 제공한다.

## 1. Success Criteria Check

| 기준 | 상태 | 근거 |
|------|:---:|------|
| 별도 route/context | 충족 | `/product-image-studio`와 `/api/product-image-studio/*`가 Search Ad와 분리되어 있다. |
| 카드 형식 지원 | 충족 | 접이식 카드와 엽서형 카드 선택, 형식별 자세/업로드 슬롯이 구현됐다. |
| 상품 사양 입력 | 충족 | 카드, 봉투, 봉합스티커의 실제 크기 프리셋과 목업 합성 우선 설정이 프로젝트 payload와 provider prompt에 포함된다. |
| 필수 출력 | 충족 | 세트컷, 카드 단독컷, 봉투 단독컷, 봉합스티커 단독컷 네 그룹을 결과 갤러리와 ZIP manifest에서 확인했다. |
| provider gate | 충족 | 기본값은 실제 provider 호출 차단이며 생성 API는 차단 상태를 한국어로 표시한다. |
| 다운로드/비율 변경 | 충족 | preset/custom 비율 변경 생성과 개별/ZIP 다운로드 route가 구현됐다. |
| 운영 안전 스모크 | 충족 | `MARKETCREW_AUTH_DISABLED=0`에서 페이지는 307 로그인 redirect, provider-status API는 401을 반환한다. |

## 2. Runtime Evidence

| 검증 | 결과 |
|------|------|
| `npm test -- --run tests/product-image-studio/docsContract.test.ts` | 문서 계약 확인 |
| `npm test -- --run tests/product-image-studio/productionSettings.test.ts` | 상품 사양, 프롬프트 라인, 자동 검수 기준 확인 |
| `npm test -- --run tests/product-image-studio/smokeContract.test.ts` | route/API 인증 계약 확인 |
| 브라우저 E2E QA | fake provider에서 업로드, 생성, 비율 변경, ZIP manifest 확인 |
| 브라우저 데스크톱/모바일 QA | 네 가지 결과 그룹과 다운로드 UI가 겹침 없이 표시됨 |
| 운영 배포/실 provider smoke | 운영 smoke는 main 반영 후 진행한다. 비용 발생 가능 provider 호출은 별도 승인 후 진행한다. |

## 3. Guardrails

- 외부 원장 쓰기 금지: 스마트스토어, AIPRESSO, 영카트, 네이버 광고, 데이터랩에 write path를 추가하지 않았다.
- 스마트스토어와 AIPRESSO는 현재 read/write 연동 없이 미래 adapter 경계로만 문서화했다.
- 실제 provider 호출 차단이 기본값이며, fake provider는 로컬 QA와 테스트 용도다.
- provider 상태 UI와 API는 키 값, 모델 값, env 이름을 노출하지 않는다.
- 타사 참고 이미지는 분위기 참고 입력으로만 취급하며 복제 보장 기능으로 문구화하지 않는다.

## 4. Remaining Risks

| 등급 | 항목 | 설명 | 권장 조치 |
|------|------|------|-----------|
| Important | 실제 이미지 품질 검증 | 현재 완료 기준은 fake provider와 gate/flow 검증이다. 실제 OpenAI 이미지 품질과 디자인 보존력은 아직 검증하지 않았다. | 비용 승인 후 낮은 수량의 live provider smoke를 별도 실행한다. |
| Important | 업로드 디자인 합성 정밀도 | MVP는 실제 크기, 목업 합성 우선, 자동 검수 기준을 prompt에 포함하지만 실제 합성 품질은 provider 결과에 의존한다. | 다음 단계에서 마스크/프레임 기반 합성 adapter를 분리 설계한다. |
| Minor | 프로젝트 목록/보관함 route | 현재 첫 화면 workflow와 결과 다운로드 중심이다. 별도 프로젝트 목록 화면은 nav만 준비됐다. | 생성 이력이 쌓인 뒤 목록/검색/삭제 정책을 추가한다. |

## 5. Next Step

1차 테스트는 로컬 fake provider로 진행한다. 사용자는 `PRODUCT_IMAGE_STUDIO_FAKE_PROVIDER_ENABLED=1` 상태에서 `/product-image-studio`를 열어 카드, 봉투, 봉합스티커 이미지를 올리고 세트컷/단독컷 생성과 ZIP 다운로드를 확인하면 된다. 실제 provider와 스마트스토어/AIPRESSO 연동은 별도 승인 후 다음 wave에서 붙인다.
