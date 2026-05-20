# AI 마케팅 오피스 MVP 개정안

원본: `C:\Users\DESIGNID_05\Downloads\AI_MARKETING_OFFICE_MVP_KEYWORD_PRODUCT_CHANNEL_PLAN.md`  
개정일: 2026-05-20  
목적: 기존 기획 문서를 구현 가능한 MVP 지시서로 다듬고, 문제점과 보완사항을 명확히 반영한다.

---

## 1. 검토 요약

원문은 “키워드/상품/광고 채널을 AI 회의 형태로 제안한다”는 제품 방향이 분명하다. 다만 개발 지시서로 바로 사용하기에는 몇 가지 불확실성이 있다. 특히 MVP 범위, LLM 출력 계약, 채널 점수 산식, 실패 처리, DB 제약조건, UI 상태 정의가 부족해 구현자마다 해석이 달라질 수 있다.

이번 개정안은 아래 기준으로 문서를 보완했다.

- MVP 범위를 “제안 생성, 저장, 표시”로 고정
- 광고 집행, 발송, 자동 게시, 외부 API 연동을 명확히 제외
- AI 역할별 입력/출력 JSON 계약을 일관되게 정리
- 채널 점수 계산 기준과 상태 분류 기준을 추가
- Prisma 모델에 관계, 인덱스, 고유 제약, 재실행 추적 필드를 보강
- API 엔드포인트의 책임과 실패 응답 기준을 구체화
- UI의 로딩, 실패, 빈 상태, raw output 노출 정책을 추가
- 완료 기준을 기능 시나리오와 검증 기준으로 분리

---

## 2. 주요 문제점 및 수정 방향

| 구분 | 원문 문제점 | 개정 방향 |
|---|---|---|
| 범위 | AI 역할, 채널, UI, 향후 연동이 한 문서에 섞여 MVP 경계가 흐림 | MVP, 제외 범위, 다음 단계 후보를 분리 |
| 데이터 계약 | 추천 결과 필드가 있으나 enum, 필수 여부, 점수 범위가 불명확 | 공통 enum, JSON 구조, 필수 필드, 점수 범위를 정의 |
| 채널 점수 | `totalScore` 산식이 없어 결과 일관성이 낮음 | 1~5 점수와 100점 환산식을 정의 |
| AI 실행 | 동기/비동기, 실패, 재시도, 부분 성공 처리 기준이 부족 | `AiMeeting`과 `AiAgentRun` 상태 전이를 명시 |
| DB 모델 | 캠페인과 상품의 관계, 인덱스, 고유 제약이 부족 | `CampaignProduct`, 인덱스, unique 제약 추가 |
| 보안/품질 | 내부 추론 노출 금지는 있으나 prompt injection, JSON 파싱 실패 대응이 약함 | 입력 검증, schema validation, 실패 저장, 사용자 노출 정책 추가 |
| API | 조회 중심이고 update, 재실행, 에러 응답 기준이 부족 | MVP 필수 API와 선택 API를 나누고 응답 기준 추가 |
| UI | 결과 표시 방식은 있으나 로딩/실패/빈 상태가 빠짐 | 화면별 상태와 관리자 raw output 정책 추가 |
| 완료 기준 | 정상 흐름 위주라 실패 케이스 검증이 부족 | 정상/실패/품질 검증 기준으로 재정리 |

---

## 3. 개정된 목표

AIPRESSO와 별도 서비스로 개발할 **AI 마케팅 오피스**의 MVP를 구현한다. 사용자가 브랜드, 상품, 시즌, 목표, 예산 수준을 입력하면 여러 AI 역할이 마케팅 회의를 수행한 것처럼 다음 결과를 생성한다.

1. 키워드 제안
2. 상품 제안
3. 광고 채널 제안
4. 최종 실행 우선순위 보고서

이번 MVP는 **외부 API 연동 없이 수동 입력 데이터와 LLM 응답만으로 동작**한다. 실제 광고 집행, 이메일 발송, 게시물 발행, 이미지 생성은 하지 않는다.

---

## 4. MVP 범위

### 포함

- Workspace, Brand, Product, Campaign 생성 및 조회
- Campaign에 연결된 AI Meeting 시작
- Keyword Strategist AI 실행 및 결과 저장
- Product Planner AI 실행 및 결과 저장
- Channel Strategist AI 실행 및 결과 저장
- Marketing Director AI 최종 보고서 생성 및 저장
- 추천 결과를 프론트엔드에서 역할별로 표시
- LLM 응답 JSON schema 검증
- 실패 상태와 에러 메시지 저장
- 테스트용 seed 데이터 제공

### 제외

- 네이버 검색광고 API 실제 연동
- 스마트스토어 상품, 주문, 매출 데이터 연동
- 인스타그램, 블로그, 이메일 자동 발행
- 광고비 자동 집행
- 상세페이지, 배너, 이미지 자동 생성
- 실시간 WebSocket
- 복잡한 2D/3D 게임형 UI
- 멀티 테넌트 권한 관리 고도화

---

## 5. 핵심 사용자 흐름

```txt
1. 사용자가 Workspace를 선택한다.
2. Brand를 생성하거나 기존 Brand를 선택한다.
3. Product를 등록한다.
4. Campaign을 생성한다.
5. Campaign에 분석할 Product를 연결한다.
6. AI Meeting을 시작한다.
7. 3개 전문 AI가 순차 또는 병렬로 추천 결과를 만든다.
8. Marketing Director AI가 추천 결과를 통합해 최종 보고서를 만든다.
9. 사용자가 키워드, 상품, 채널, 최종 보고서를 한 화면에서 확인한다.
```

MVP에서는 AI 실행을 순차 처리로 시작한다. 응답 시간이 길어질 수 있으므로 백엔드 상태는 비동기 작업처럼 저장한다.

---

## 6. 입력 데이터

### Brand 입력

| 필드 | 필수 | 설명 |
|---|---:|---|
| `name` | 예 | 브랜드명 |
| `category` | 아니오 | 업종 또는 상품군 |
| `websiteUrl` | 아니오 | 자사몰, 스마트스토어, 랜딩 URL |
| `description` | 아니오 | 브랜드 설명 |

### Product 입력

| 필드 | 필수 | 설명 |
|---|---:|---|
| `name` | 예 | 상품명 |
| `category` | 아니오 | 상품 카테고리 |
| `priceRange` | 아니오 | 가격대 또는 주문 규모 |
| `description` | 아니오 | 상품 설명 |
| `strengths` | 아니오 | 주요 장점 배열 |
| `targetUsers` | 아니오 | 타겟 고객 배열 |

### Campaign 입력

| 필드 | 필수 | 설명 |
|---|---:|---|
| `title` | 예 | 캠페인명 |
| `goal` | 예 | 매출 증대, 문의 증가, 시즌 판매 등 |
| `season` | 아니오 | 추석, 연말, 생일 시즌 등 |
| `target` | 아니오 | 캠페인 타겟 |
| `budgetLevel` | 아니오 | `UNKNOWN`, `LOW`, `MEDIUM`, `HIGH` |
| `productIds` | 예 | 분석할 상품 ID 목록 |
| `currentConcern` | 아니오 | 현재 고민 또는 제약 |

---

## 7. 추천 결과 공통 규칙

### 공통 enum

```txt
RecommendationPriority = HIGH | MEDIUM | LOW
ImpactLevel = HIGH | MEDIUM | LOW
EffortLevel = HIGH | MEDIUM | LOW
RiskLevel = HIGH | MEDIUM | LOW
BudgetLevel = UNKNOWN | LOW | MEDIUM | HIGH
```

### 공통 필드 규칙

- `priority`는 정렬 기준으로 사용한다.
- `confidence`는 0부터 1 사이의 숫자다.
- `riskNote`는 리스크가 없으면 `null`을 사용한다.
- 모든 추천은 실제 실행 명령이 아니라 “제안”이다.
- 외부 데이터가 없으면 `sourceAssumption`에 “사용자 입력 기반 추정”처럼 근거 수준을 남긴다.

---

## 8. 키워드 제안

### KeywordType

```txt
PURCHASE_INTENT
INFORMATIONAL
PRODUCT_ATTRIBUTE
SEASONAL
NEGATIVE_KEYWORD
SEO
HASHTAG
PRODUCT_TITLE
```

### RecommendedUsage

```txt
NAVER_SEARCH_AD
NAVER_SHOPPING
PRODUCT_TITLE
LANDING_COPY
DETAIL_PAGE
BLOG_SEO
INSTAGRAM_HASHTAG
EMAIL_CRM
```

### Keyword Strategist Output

```json
{
  "visibleThoughtSummary": "구매 의도 키워드와 정보 탐색 키워드를 분리해 광고비 낭비를 줄이는 방향입니다.",
  "keywords": [
    {
      "keyword": "기업 추석카드",
      "keywordType": "PURCHASE_INTENT",
      "recommendedUsage": ["NAVER_SEARCH_AD", "PRODUCT_TITLE", "LANDING_COPY"],
      "reason": "기업 고객의 구매 의도가 명확하고 시즌 상품과 직접 연결됩니다.",
      "priority": "HIGH",
      "confidence": 0.82,
      "sourceAssumption": "사용자 입력 기반 추정",
      "riskNote": null
    }
  ]
}
```

### 키워드 품질 기준

- 구매 의도 키워드와 정보 탐색 키워드를 분리한다.
- 광고 제외 키워드는 실제 광고 세팅 전 사람이 검토해야 한다.
- 상품명 반영 키워드는 과도한 키워드 나열이 되지 않도록 2~4개 이내로 추천한다.
- SEO 키워드는 블로그 제목, 본문, FAQ에 활용 가능한 형태로 제안한다.

---

## 9. 상품 제안

### Product Planner Output

```json
{
  "visibleThoughtSummary": "기존 제작 역량으로 빠르게 상품화 가능한 시즌 상품을 우선 추천합니다.",
  "products": [
    {
      "title": "기업 추석 선물카드 봉투 포함 세트",
      "productConcept": "회사명, 로고, 인사말을 넣어 제작할 수 있는 기업용 명절카드 세트",
      "targetCustomer": ["기업 총무", "소상공인", "거래처 선물 준비 고객"],
      "suggestedOptions": ["디자인 선택", "회사명 인쇄", "로고 삽입", "봉투 포함", "수량 선택"],
      "suggestedProductTitle": "기업 추석 선물카드 제작 봉투포함 회사명 인쇄 명절카드",
      "recommendedKeywords": ["기업 추석카드", "회사 명절카드", "거래처 추석카드"],
      "recommendedChannels": ["NAVER_SEARCH_AD", "NAVER_SHOPPING", "BLOG_SEO", "EMAIL_CRM"],
      "reason": "시즌성과 B2B 재구매 가능성이 높고 기존 카드 제작 역량으로 바로 상품화할 수 있습니다.",
      "expectedImpact": "HIGH",
      "effortLevel": "MEDIUM",
      "riskLevel": "LOW",
      "priority": 1
    }
  ]
}
```

### 상품 제안 평가 기준

- 검색 수요 가능성
- 시즌성
- 제작 가능성
- 예상 마진
- 기존 상품과의 연관성
- 반복구매 가능성
- 광고 적합성
- 콘텐츠 확장성
- 차별화 가능성

MVP에서는 실제 검색량, 매출, 마진 데이터를 가져오지 않으므로 모든 수요와 마진 판단은 “입력 정보 기반 추정”으로 표시한다.

---

## 10. 광고 채널 제안

광고 문안 생성과 광고 채널 선택은 분리한다. 이번 기능은 “어떤 광고 문안을 쓸까?”가 아니라 **“어디에 광고하거나 노출할까?”**를 제안한다.

### MarketingChannel

```txt
NAVER_SEARCH_AD
NAVER_SHOPPING
BLOG_SEO
INSTAGRAM_META
YOUTUBE_SHORTS
GOOGLE_SEARCH
EMAIL_CRM
KAKAO_MESSAGE
SOOP
DAANGN
TIKTOK
INFLUENCER
```

### ChannelRecommendationType

```txt
MAINTAIN
EXPAND
TEST
HOLD
STOP
```

### 점수 기준

각 항목은 1~5점으로 평가한다.

| 항목 | 설명 |
|---|---|
| `targetFitScore` | 타겟 고객과 채널 이용자 적합도 |
| `purchaseIntentScore` | 구매 의도가 명확한 트래픽을 얻을 가능성 |
| `creativeFitScore` | 상품을 이미지, 영상, 텍스트로 표현하기 쉬운 정도 |
| `measurementScore` | 클릭, 문의, 구매 전환 측정 가능성 |
| `costFitScore` | 예산 수준과 채널 비용 구조의 적합성 |
| `seasonFitScore` | 시즌 이슈와 채널 운영 타이밍 적합성 |
| `trendFitScore` | 현재 콘텐츠 소비 트렌드와의 적합성 |
| `riskScore` | 비용 낭비, 운영 난이도, 브랜드 훼손 가능성. 낮을수록 안전 |

`totalScore`는 아래 방식으로 100점 환산한다.

```txt
positiveScore = targetFitScore + purchaseIntentScore + creativeFitScore + measurementScore + costFitScore + seasonFitScore + trendFitScore
riskAdjustedScore = 6 - riskScore
totalScore = round(((positiveScore + riskAdjustedScore) / 40) * 100)
```

### 상태 분류 기준

| 상태 | 기준 |
|---|---|
| `EXPAND` | 80점 이상이고 리스크가 낮으며 즉시 운영 가치가 높음 |
| `MAINTAIN` | 기존 운영 채널로 유지 가치가 있으나 증액 근거는 제한적 |
| `TEST` | 60점 이상이지만 성과 검증이 필요해 소액 테스트가 적합 |
| `HOLD` | 현재 정보만으로는 실행 근거가 부족함 |
| `STOP` | 리스크가 높거나 타겟, 예산, 측정 기준과 맞지 않음 |

### Channel Strategist Output

```json
{
  "visibleThoughtSummary": "네이버 검색광고는 확대 후보이고, 유튜브 Shorts는 소액 테스트 후보입니다.",
  "channels": [
    {
      "channel": "YOUTUBE_SHORTS",
      "recommendationType": "TEST",
      "totalScore": 74,
      "scoreDetail": {
        "targetFitScore": 4,
        "purchaseIntentScore": 3,
        "creativeFitScore": 5,
        "measurementScore": 3,
        "costFitScore": 4,
        "seasonFitScore": 4,
        "trendFitScore": 5,
        "riskScore": 3
      },
      "reason": "스티커와 카드 상품은 제작 과정과 완성품을 짧은 영상으로 보여주기 좋아 소액 테스트 가치가 있습니다.",
      "requiredAssets": ["15초 세로 영상 2종", "세로형 썸네일", "짧은 CTA 문구"],
      "testBudgetSuggestion": "LOW",
      "testPeriodDays": 7,
      "successMetrics": ["CTR", "사이트 방문", "장바구니", "문의 발생"],
      "riskNote": "즉시 구매 전환보다는 리타겟팅 모수 확보 목적이 더 적합할 수 있습니다.",
      "priority": 2
    }
  ]
}
```

---

## 11. AI 역할

### Keyword Strategist AI

역할:

- 키워드 발굴
- 키워드 유형 분류
- 광고, 상품명, 블로그, 인스타, 상세페이지 사용처 제안
- 제외 키워드 후보 제안

System Prompt 초안:

```txt
너는 네이버 검색광고, 스마트스토어, 자사몰 상품을 위한 키워드 전략가다.
입력된 브랜드, 상품, 시즌, 타겟, 고민을 기반으로 키워드를 제안한다.
키워드는 PURCHASE_INTENT, INFORMATIONAL, PRODUCT_ATTRIBUTE, SEASONAL, NEGATIVE_KEYWORD, SEO, HASHTAG, PRODUCT_TITLE 중 하나로 분류한다.
각 키워드의 추천 사용처와 이유, 우선순위, confidence, riskNote를 JSON으로 반환한다.
외부 데이터가 없는 판단은 사용자 입력 기반 추정이라고 표시한다.
근거 없이 확신하지 않는다.
```

### Product Planner AI

역할:

- 신상품 제안
- 기존 상품 개선안 제안
- 상품명, 옵션, 타겟, 추천 채널 제안
- 키워드 기반 상품화 아이디어 제안

System Prompt 초안:

```txt
너는 온라인 쇼핑몰 상품기획자다.
검색 수요 가능성, 시즌성, 제작 가능성, 예상 마진, 기존 상품과의 연관성, 반복구매 가능성, 광고 적합성, 콘텐츠 확장성, 차별화 가능성을 기준으로 상품 제안을 만든다.
MVP에서는 실제 검색량과 매출 데이터가 없으므로 수치가 필요한 판단은 추정이라고 표시한다.
상품명, 옵션 구성, 추천 키워드, 추천 채널, 상세페이지 방향을 JSON으로 반환한다.
```

### Channel Strategist AI

역할:

- 광고 채널 제안
- 유지, 확대, 테스트, 보류, 중단 분류
- 채널별 적합도 점수화
- 소액 테스트 조건 제안

System Prompt 초안:

```txt
너는 광고 채널 전략가이자 미디어 플래너다.
네이버 검색광고, 네이버 쇼핑검색, 블로그 SEO, 인스타/메타 광고, 유튜브 Shorts, 구글 검색광고, 이메일/CRM, 카카오 메시지, SOOP, 당근, 틱톡, 인플루언서 채널을 비교한다.
각 채널을 targetFitScore, purchaseIntentScore, creativeFitScore, measurementScore, costFitScore, seasonFitScore, trendFitScore, riskScore 기준으로 1~5점 평가한다.
riskScore는 낮을수록 안전하다.
채널별 recommendationType, totalScore, reason, requiredAssets, successMetrics, riskNote를 JSON으로 반환한다.
```

### Marketing Director AI

역할:

- 각 AI 의견 통합
- 우선순위 결정
- 최종 보고서 생성
- 실행 목록 생성

System Prompt 초안:

```txt
너는 AI 마케팅 오피스의 마케팅 총괄자다.
키워드 전략 AI, 상품기획 AI, 광고 채널 전략 AI의 결과를 통합해 실행 가능한 마케팅 전략 보고서를 작성한다.
광고 내용과 광고 채널을 분리해 판단한다.
우선순위, 리스크, 이번 주 실행 항목, 보류 항목을 명확히 표시한다.
실제 광고비 집행, 이메일 발송, 게시물 발행은 사람 승인 전에는 실행하지 않는다는 점을 명시한다.
사용자에게 내부 추론을 노출하지 말고 visibleThoughtSummary 수준의 업무 판단 요약만 반환한다.
```

---

## 12. 데이터 모델 개정안

Prisma 기준 모델 초안이다. 기존 인증/사용자 모델이 있다면 `Workspace` 소유자 관계는 기존 구조에 맞춰 연결한다.

```prisma
model Workspace {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  brands Brand[]
}

model Brand {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  websiteUrl  String?
  category    String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  campaigns Campaign[]
  products  Product[]

  @@index([workspaceId])
}

model Product {
  id          String   @id @default(cuid())
  brandId     String
  name        String
  category    String?
  priceRange  String?
  description String?
  strengths   Json?
  targetUsers Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  brand Brand @relation(fields: [brandId], references: [id], onDelete: Cascade)
  campaignProducts CampaignProduct[]

  @@index([brandId])
}

model Campaign {
  id          String         @id @default(cuid())
  brandId     String
  title       String
  goal        String
  season      String?
  target      String?
  budgetLevel BudgetLevel    @default(UNKNOWN)
  currentConcern String?
  inputSnapshot Json?
  status      CampaignStatus @default(DRAFT)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  brand Brand @relation(fields: [brandId], references: [id], onDelete: Cascade)
  campaignProducts CampaignProduct[]
  aiMeetings AiMeeting[]

  @@index([brandId, status])
}

model CampaignProduct {
  campaignId String
  productId  String
  role       CampaignProductRole @default(PRIMARY)
  createdAt  DateTime @default(now())

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  product  Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@id([campaignId, productId])
  @@index([productId])
}

model AiMeeting {
  id          String          @id @default(cuid())
  campaignId  String
  topic       String
  status      AiMeetingStatus @default(PENDING)
  inputJson   Json
  finalReport Json?
  outputVersion String?
  errorMessage String?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  agentRuns AiAgentRun[]
  keywordRecommendations KeywordRecommendation[]
  productRecommendations ProductRecommendation[]
  channelRecommendations ChannelRecommendation[]

  @@index([campaignId, status])
}

model AiAgentRun {
  id          String      @id @default(cuid())
  meetingId   String
  roleKey     AgentRoleKey
  status      AiRunStatus @default(PENDING)
  inputJson   Json
  outputJson  Json?
  rawText     String?
  visibleThoughtSummary String?
  confidenceScore Float?
  tokenUsage  Json?
  errorMessage String?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())

  meeting AiMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  @@index([meetingId, roleKey])
}

model KeywordRecommendation {
  id          String   @id @default(cuid())
  meetingId   String
  keyword     String
  keywordType KeywordType
  recommendedUsage Json
  reason      String
  priority    RecommendationPriority
  confidence  Float?
  sourceAssumption String?
  riskNote    String?
  createdAt   DateTime @default(now())

  meeting AiMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  @@unique([meetingId, keyword])
  @@index([meetingId, priority])
}

model ProductRecommendation {
  id          String   @id @default(cuid())
  meetingId   String
  title       String
  productConcept String
  targetCustomer Json?
  suggestedOptions Json?
  suggestedProductTitle String?
  recommendedKeywords Json?
  recommendedChannels Json?
  reason      String
  expectedImpact ImpactLevel
  effortLevel EffortLevel
  riskLevel   RiskLevel
  priority    Int
  createdAt   DateTime @default(now())

  meeting AiMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  @@index([meetingId, priority])
}

model ChannelRecommendation {
  id          String   @id @default(cuid())
  meetingId   String
  channel     MarketingChannel
  recommendationType ChannelRecommendationType
  totalScore  Int
  scoreDetail Json
  reason      String
  requiredAssets Json?
  testBudgetSuggestion BudgetLevel?
  testPeriodDays Int?
  successMetrics Json?
  riskNote    String?
  priority    Int
  createdAt   DateTime @default(now())

  meeting AiMeeting @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  @@unique([meetingId, channel])
  @@index([meetingId, recommendationType, priority])
}

enum BudgetLevel {
  UNKNOWN
  LOW
  MEDIUM
  HIGH
}

enum CampaignProductRole {
  PRIMARY
  REFERENCE
}

enum CampaignStatus {
  DRAFT
  ANALYZING
  COMPLETED
  FAILED
  ARCHIVED
}

enum AiMeetingStatus {
  PENDING
  RUNNING
  PARTIAL_COMPLETED
  COMPLETED
  FAILED
}

enum AiRunStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum AgentRoleKey {
  KEYWORD_STRATEGIST
  PRODUCT_PLANNER
  CHANNEL_STRATEGIST
  MARKETING_DIRECTOR
}

enum KeywordType {
  PURCHASE_INTENT
  INFORMATIONAL
  PRODUCT_ATTRIBUTE
  SEASONAL
  NEGATIVE_KEYWORD
  SEO
  HASHTAG
  PRODUCT_TITLE
}

enum MarketingChannel {
  NAVER_SEARCH_AD
  NAVER_SHOPPING
  BLOG_SEO
  INSTAGRAM_META
  YOUTUBE_SHORTS
  GOOGLE_SEARCH
  EMAIL_CRM
  KAKAO_MESSAGE
  SOOP
  DAANGN
  TIKTOK
  INFLUENCER
}

enum ChannelRecommendationType {
  MAINTAIN
  EXPAND
  TEST
  HOLD
  STOP
}

enum RecommendationPriority {
  HIGH
  MEDIUM
  LOW
}

enum ImpactLevel {
  HIGH
  MEDIUM
  LOW
}

enum EffortLevel {
  HIGH
  MEDIUM
  LOW
}

enum RiskLevel {
  HIGH
  MEDIUM
  LOW
}
```

---

## 13. 백엔드 구조

```txt
src/modules/marketing-office/
├─ marketing-office.module.ts
├─ controllers/
│  ├─ brands.controller.ts
│  ├─ products.controller.ts
│  ├─ campaigns.controller.ts
│  ├─ ai-meetings.controller.ts
│  └─ recommendations.controller.ts
├─ services/
│  ├─ ai-meeting-orchestrator.service.ts
│  ├─ ai-agent-runner.service.ts
│  ├─ ai-model-router.service.ts
│  ├─ prompt-template.service.ts
│  ├─ keyword-recommendation.service.ts
│  ├─ product-recommendation.service.ts
│  ├─ channel-recommendation.service.ts
│  └─ final-report.service.ts
├─ dto/
│  ├─ create-brand.dto.ts
│  ├─ update-brand.dto.ts
│  ├─ create-product.dto.ts
│  ├─ update-product.dto.ts
│  ├─ create-campaign.dto.ts
│  ├─ start-ai-meeting.dto.ts
│  └─ recommendation-filter.dto.ts
└─ schemas/
   ├─ keyword-output.schema.ts
   ├─ product-output.schema.ts
   ├─ channel-output.schema.ts
   └─ final-report.schema.ts
```

---

## 14. API 설계

### Brand

```http
POST /marketing-office/brands
GET /marketing-office/brands
GET /marketing-office/brands/:brandId
PATCH /marketing-office/brands/:brandId
```

### Product

```http
POST /marketing-office/brands/:brandId/products
GET /marketing-office/brands/:brandId/products
GET /marketing-office/products/:productId
PATCH /marketing-office/products/:productId
```

### Campaign

```http
POST /marketing-office/brands/:brandId/campaigns
GET /marketing-office/brands/:brandId/campaigns
GET /marketing-office/campaigns/:campaignId
PATCH /marketing-office/campaigns/:campaignId
```

### AI Meeting

```http
POST /marketing-office/campaigns/:campaignId/meetings
GET /marketing-office/meetings/:meetingId
GET /marketing-office/meetings/:meetingId/agent-runs
GET /marketing-office/meetings/:meetingId/final-report
POST /marketing-office/meetings/:meetingId/retry
```

### Recommendations

```http
GET /marketing-office/meetings/:meetingId/recommendations/keywords
GET /marketing-office/meetings/:meetingId/recommendations/products
GET /marketing-office/meetings/:meetingId/recommendations/channels
```

### API 에러 응답 기준

```json
{
  "error": {
    "code": "AI_OUTPUT_SCHEMA_INVALID",
    "message": "AI 응답 JSON 구조가 예상 schema와 다릅니다.",
    "details": {
      "roleKey": "CHANNEL_STRATEGIST",
      "meetingId": "cm..."
    }
  }
}
```

권장 에러 코드:

- `VALIDATION_ERROR`
- `BRAND_NOT_FOUND`
- `PRODUCT_NOT_FOUND`
- `CAMPAIGN_NOT_FOUND`
- `MEETING_NOT_FOUND`
- `AI_PROVIDER_ERROR`
- `AI_OUTPUT_EMPTY`
- `AI_OUTPUT_SCHEMA_INVALID`
- `AI_TIMEOUT`
- `AI_RATE_LIMITED`

---

## 15. AI 실행 흐름

```txt
1. Campaign 생성
2. Campaign 입력 스냅샷 저장
3. AI Meeting 생성, status = PENDING
4. AI Meeting 시작, status = RUNNING
5. Keyword Strategist Agent Run 생성 및 실행
6. Product Planner Agent Run 생성 및 실행
7. Channel Strategist Agent Run 생성 및 실행
8. 세 전문 AI 결과를 DB에 저장
9. Marketing Director Agent Run 실행
10. finalReport 저장
11. 모든 필수 결과가 저장되면 Meeting status = COMPLETED
12. 일부 전문 AI만 성공하면 Meeting status = PARTIAL_COMPLETED
13. 필수 결과가 모두 실패하면 Meeting status = FAILED
```

### 실패 처리

- LLM 호출 실패 시 해당 `AiAgentRun.status`를 `FAILED`로 저장한다.
- JSON 파싱 실패 시 `rawText`와 `errorMessage`를 저장한다.
- 사용자 화면에는 내부 오류 전문이 아니라 요약 메시지를 보여준다.
- `Marketing Director AI`는 전문 AI 결과가 최소 2개 이상 성공했을 때만 실행한다.
- retry는 실패한 Agent Run만 다시 실행하는 방식으로 시작한다.

---

## 16. 최종 보고서 구조

```json
{
  "summary": "이번 캠페인은 네이버 검색광고와 블로그 SEO를 중심으로 운영하고, 유튜브 Shorts는 소액 테스트를 권장합니다.",
  "keywordStrategy": {
    "mainKeywords": ["기업 추석카드"],
    "seoKeywords": ["회사 명절카드 제작"],
    "negativeKeywords": ["무료", "도안 다운로드"]
  },
  "productStrategy": {
    "recommendedProducts": ["기업 추석 선물카드 봉투 포함 세트"],
    "productTitleSuggestions": ["기업 추석 선물카드 제작 봉투포함 회사명 인쇄 명절카드"]
  },
  "channelStrategy": {
    "expand": ["NAVER_SEARCH_AD"],
    "maintain": ["BLOG_SEO"],
    "test": ["YOUTUBE_SHORTS"],
    "hold": ["INSTAGRAM_META"],
    "stop": []
  },
  "priorityActions": [
    {
      "title": "기업 추석카드 구매 키워드 광고그룹 분리",
      "type": "KEYWORD",
      "priority": "HIGH",
      "reason": "광고비 낭비를 줄이고 전환율을 높이기 위함",
      "ownerHint": "마케팅 담당자",
      "dueHint": "이번 주"
    }
  ],
  "risks": [
    {
      "title": "검색량 추정 불확실성",
      "level": "MEDIUM",
      "mitigation": "실제 광고 집행 전 키워드 플래너 또는 검색광고 도구로 검색량을 확인합니다."
    }
  ],
  "nextSteps": [
    "상위 구매 키워드 5개를 광고그룹으로 분리",
    "추천 상품명 2안을 상세페이지 제목에 A/B 테스트",
    "유튜브 Shorts용 15초 영상 소재 2종 제작"
  ]
}
```

---

## 17. 프론트엔드 화면 구조

Next.js 기준 페이지:

```txt
src/app/marketing-office/
├─ page.tsx
├─ brands/
│  └─ page.tsx
├─ campaigns/
│  ├─ page.tsx
│  └─ [campaignId]/
│     └─ page.tsx
└─ meetings/
   └─ [meetingId]/
      └─ page.tsx
```

컴포넌트:

```txt
src/components/marketing-office/
├─ BrandForm.tsx
├─ ProductForm.tsx
├─ CampaignForm.tsx
├─ AiOfficeScene.tsx
├─ AgentCard.tsx
├─ AgentDetailPanel.tsx
├─ KeywordRecommendationTable.tsx
├─ ProductRecommendationCards.tsx
├─ ChannelRecommendationBoard.tsx
├─ FinalReportPanel.tsx
└─ RecommendationPriorityBadge.tsx
```

### UI 상태

| 상태 | 표시 |
|---|---|
| 빈 상태 | “아직 캠페인이 없습니다” 또는 “AI Meeting을 시작하세요” |
| 실행 중 | Agent 카드별 `RUNNING` 상태와 skeleton 표시 |
| 부분 완료 | 성공한 결과는 표시하고 실패한 Agent는 재시도 버튼 표시 |
| 실패 | 사용자 친화적 오류 메시지와 관리자용 오류 코드 표시 |
| 완료 | 키워드 테이블, 상품 카드, 채널 보드, 최종 보고서 표시 |

### AI Office Scene

MVP에서는 게임형 UI 대신 카드형으로 구현한다.

```txt
키워드 전략 AI
상태: 완료
판단 요약: 구매 의도 키워드와 정보성 키워드를 분리해야 합니다.

상품기획 AI
상태: 완료
판단 요약: 시즌성 높은 상품을 우선 추천합니다.

광고 채널 AI
상태: 완료
판단 요약: 네이버 검색광고는 확대, 유튜브 Shorts는 테스트 후보입니다.

마케팅 총괄 AI
상태: 완료
판단 요약: 키워드, 상품, 채널 제안을 통합해 이번 주 실행안을 정리했습니다.
```

카드를 클릭하면 우측 패널 또는 모달에 다음 정보를 표시한다.

- 역할 설명
- 현재 상태
- `visibleThoughtSummary`
- 주요 제안
- `confidenceScore`
- 관리자/개발 모드에서만 raw output

---

## 18. 테스트 데이터

### Brand 1

```json
{
  "name": "Coffeeprint",
  "category": "인쇄/카드/초대장",
  "websiteUrl": "https://coffeeprint.co.kr",
  "description": "기업용 명절카드, 연하장, 초대장, 봉투 등을 제작하는 인쇄 쇼핑몰"
}
```

### Product 1

```json
{
  "name": "추석 선물카드",
  "category": "명절카드",
  "priceRange": "소량~기업 주문",
  "description": "회사명, 로고, 인사말을 넣어 제작 가능한 기업용 추석카드",
  "strengths": ["봉투 포함", "소량 제작 가능", "회사명 인쇄", "로고 삽입 가능"],
  "targetUsers": ["기업 총무", "소상공인", "거래처 선물 준비 고객"]
}
```

### Brand 2

```json
{
  "name": "스티커씨",
  "category": "스티커/답례품",
  "websiteUrl": "https://smartstore.naver.com",
  "description": "행사, 생일, 웨딩, 답례품용 소량 스티커를 판매하는 스마트스토어"
}
```

### Product 2

```json
{
  "name": "생일 답례품 스티커",
  "category": "답례품 스티커",
  "priceRange": "20개 소량 주문",
  "description": "어린이집, 유치원, 생일 답례품에 사용하는 원형 48mm 스티커",
  "strengths": ["원형 48mm", "소량 주문", "문구 변경", "디자인 선택"],
  "targetUsers": ["어린이집 학부모", "유치원 학부모", "행사 준비 고객"]
}
```

### Campaign 예시

```json
{
  "title": "2026 추석 기업카드 마케팅 캠페인",
  "goal": "기업 고객 문의와 주문 증가",
  "season": "2026 추석",
  "target": "기업 총무, 소상공인, 거래처 선물 준비 고객",
  "budgetLevel": "LOW",
  "currentConcern": "광고비 낭비 없이 구매 의도 키워드와 시즌 상품을 우선 검증하고 싶음"
}
```

---

## 19. 개발 순서

1. Prisma 모델 추가 및 마이그레이션
2. Brand, Product, Campaign CRUD API 구현
3. CampaignProduct 연결 로직 구현
4. AiMeeting 생성 및 시작 API 구현
5. AI Model Router 더미 구현
6. Prompt Template service 구현
7. 각 Agent Runner 구현
8. JSON Schema 기반 응답 검증 구현
9. Recommendation 저장 로직 구현
10. Final Report 생성 로직 구현
11. 프론트 기본 페이지 구현
12. AI Office 카드 UI 구현
13. Keyword, Product, Channel Recommendation UI 구현
14. 테스트 데이터 추가
15. 에러 처리, 빈 상태, 부분 완료 UI 추가
16. README에 사용 방법 작성

---

## 20. 품질 기준

### 기능 기준

- 브랜드를 생성하고 조회할 수 있다.
- 상품을 등록하고 조회할 수 있다.
- 캠페인을 생성하고 상품을 연결할 수 있다.
- 캠페인에 대해 AI Meeting을 시작할 수 있다.
- 키워드 제안이 저장된다.
- 상품 제안이 저장된다.
- 광고 채널 제안이 저장된다.
- 최종 보고서가 저장된다.
- 각 AI 역할별 `visibleThoughtSummary`를 UI에서 볼 수 있다.
- 실패한 Agent Run을 재시도할 수 있다.

### 데이터 기준

- LLM 응답은 schema 검증을 통과해야 저장된다.
- schema 검증 실패 시 Agent Run은 `FAILED`로 저장된다.
- Agent Run의 input, output, status, errorMessage를 DB에 저장한다.
- 사용자는 내부 추론 전체가 아니라 `visibleThoughtSummary`만 본다.
- raw output은 관리자/개발 모드에서만 확인한다.

### UI 기준

- 추천 항목은 우선순위별로 정렬한다.
- 채널 제안은 `EXPAND / MAINTAIN / TEST / HOLD / STOP` 상태별로 묶어 보여준다.
- 상품 제안은 카드 형태로 보여준다.
- 키워드 제안은 테이블 형태로 보여준다.
- 최종 보고서는 한 화면에서 복사할 수 있다.
- 로딩, 빈 상태, 실패, 부분 완료 상태를 각각 제공한다.

---

## 21. 완료 기준

### 정상 시나리오

1. Coffeeprint 브랜드 생성
2. 추석 선물카드 상품 생성
3. “2026 추석 기업카드 마케팅 캠페인” 생성
4. 캠페인에 상품 연결
5. AI Meeting 시작
6. 키워드 전략 AI 결과 확인
7. 상품기획 AI 결과 확인
8. 광고 채널 AI 결과 확인
9. 마케팅 총괄 AI 최종 보고서 확인
10. 키워드, 상품, 채널 추천 목록이 DB에 저장됨
11. 프론트에서 추천 결과를 확인 가능

### 실패 시나리오

1. LLM 응답이 비어 있으면 Agent Run이 `FAILED`가 된다.
2. JSON 파싱에 실패하면 rawText와 errorMessage가 저장된다.
3. 일부 Agent만 실패하면 Meeting은 `PARTIAL_COMPLETED`가 된다.
4. 실패한 Agent만 retry할 수 있다.
5. 사용자 화면에는 안전한 오류 메시지가 표시된다.

---

## 22. 구현 후 보고서 양식

구현 후 아래 내용을 보고서로 남긴다.

- 생성/수정한 파일 목록
- DB 마이그레이션 내용
- 주요 API 엔드포인트
- AI 출력 schema 목록
- 테스트 방법
- 실패 처리 검증 결과
- 남은 TODO
- 다음 단계 제안

---

## 23. 다음 단계 후보

MVP 완료 후 아래 기능을 단계적으로 검토한다.

1. 승인함 기능
2. 업무 보드 기능
3. 네이버 검색광고 API 연동
4. 스마트스토어 주문/상품 데이터 연동
5. 광고 문안 자동 생성
6. 블로그/인스타/이메일 초안 자동 생성
7. 상세 이미지/배너 템플릿 자동 렌더링
8. 성과 분석 기반 다음 제안 생성
9. 캠페인별 추천 결과 비교 리포트
10. 팀원 권한과 승인 워크플로

