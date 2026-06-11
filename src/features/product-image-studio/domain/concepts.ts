import { listOutputContracts } from "@/features/product-image-studio/domain/outputContracts";
import { listCardPoseSceneRules } from "@/features/product-image-studio/domain/scenePresets";
import type {
  CardDisplayPose,
  CardFormat,
  ProductImageStudioOutputType,
  ProductImageStudioProductType,
} from "@/features/product-image-studio/domain/types";

export type ProductImageStudioConceptPosePrompt = {
  readonly cardFormat: CardFormat;
  readonly pose: CardDisplayPose;
  readonly prompt: string;
};

export type ProductImageStudioConceptOutputPrompt = {
  readonly label: string;
  readonly outputType: ProductImageStudioOutputType;
  readonly posePrompts: readonly ProductImageStudioConceptPosePrompt[];
  readonly scenePrompt: string;
};

export type ProductImageStudioConceptRecommendation = {
  readonly id: string;
  readonly label: string;
  readonly outputPrompts: readonly ProductImageStudioConceptOutputPrompt[];
  readonly styleTags: readonly string[];
  readonly summary: string;
};

type CardSetConceptBlueprint = {
  readonly id: string;
  readonly label: string;
  readonly lighting: string;
  readonly mood: string;
  readonly props: string;
  readonly styleTags: readonly string[];
  readonly summary: string;
};

const CARD_SET_CONCEPT_BLUEPRINTS = [
  {
    id: "tabletop-set",
    label: "정돈된 테이블 세트컷",
    lighting: "부드러운 자연광과 얕은 그림자로 종이의 두께를 살립니다",
    mood: "밝은 테이블 위에 카드, 봉투, 봉합스티커를 가지런히 놓은 상품 중심 설정",
    props: "펜, 작은 리본, 종이 샘플을 절제해 상품보다 앞서지 않게 배치합니다",
    styleTags: ["상품 목록", "세트 구성", "밝은 배경"],
    summary: "스마트스토어 대표이미지와 상세 첫 화면에 쓰기 좋은 기본 세트 연출입니다.",
  },
  {
    id: "premium-stationery",
    label: "프리미엄 스테이셔너리",
    lighting: "낮은 대비의 스튜디오 조명으로 고급 종이 질감을 균일하게 보여줍니다",
    mood: "차분한 스튜디오 배경에서 인쇄물의 재질과 마감이 또렷하게 보이는 연출",
    props: "금속 클립, 얇은 패브릭, 무광 트레이를 보조 소품으로만 사용합니다",
    styleTags: ["고급지", "명함", "초대장"],
    summary: "고급 선물카드, 청첩장, 명함처럼 질감과 마감을 강조할 때 어울립니다.",
  },
  {
    id: "seasonal-gift",
    label: "시즌 선물 패키지",
    lighting: "따뜻한 측면광과 은은한 하이라이트로 계절감을 만듭니다",
    mood: "선물 포장 옆에 카드 세트가 놓인 따뜻한 시즌 상품 설정",
    props: "계절 꽃, 작은 오너먼트, 포장 끈을 상품 주변에 낮게 배치합니다",
    styleTags: ["연하장", "선물카드", "시즌"],
    summary: "연하장, 감사카드, 시즌 초대장처럼 선물 맥락이 중요한 상품에 맞습니다.",
  },
  {
    id: "wedding-announcement",
    label: "웨딩과 안내장 무드",
    lighting: "깨끗한 확산광으로 흰 종이와 봉투의 경계가 묻히지 않게 합니다",
    mood: "청첩장과 안내장에 어울리는 단정하고 기념일 느낌이 있는 설정",
    props: "진주빛 소품, 얇은 실링 리본, 작은 꽃잎을 여백 있게 둡니다",
    styleTags: ["청첩장", "초대장", "기념일"],
    summary: "청첩장, 초대장, 발표 안내장처럼 격식 있는 상품 설명 이미지에 적합합니다.",
  },
  {
    id: "minimal-studio",
    label: "미니멀 스튜디오",
    lighting: "균일한 스튜디오 조명과 선명한 접지 그림자로 형태를 정확히 보여줍니다",
    mood: "배경과 소품을 최소화해 업로드한 디자인과 인쇄물 형태가 가장 또렷한 연출",
    props: "소품 없이 얇은 받침면과 절제된 그림자만 사용합니다",
    styleTags: ["목업", "정확한 형태", "대표이미지"],
    summary: "디자인 왜곡을 줄이고 카드, 봉투, 스티커의 실제 형태를 설명하기 좋습니다.",
  },
  {
    id: "cozy-lifestyle",
    label: "코지 라이프스타일",
    lighting: "창가에서 들어오는 부드러운 빛과 생활감 있는 그림자를 사용합니다",
    mood: "책상, 노트, 작은 컵 주변에 카드 세트가 자연스럽게 놓인 생활형 설정",
    props: "노트, 펜, 작은 머그, 패브릭을 낮은 채도로 정리해 배치합니다",
    styleTags: ["라이프스타일", "감성컷", "상세페이지"],
    summary: "상세페이지 중간 설정샷이나 인스타 확장용 감성 이미지로 이어가기 좋습니다.",
  },
] as const satisfies readonly CardSetConceptBlueprint[];

export function listCardSetConceptRecommendations(): readonly ProductImageStudioConceptRecommendation[] {
  return CARD_SET_CONCEPT_BLUEPRINTS.map(toConceptRecommendation);
}

export function listProductImageStudioConceptRecommendations(
  productType: ProductImageStudioProductType,
): readonly ProductImageStudioConceptRecommendation[] {
  switch (productType) {
    case "card_envelope_seal_set":
      return listCardSetConceptRecommendations();
  }
}

function toConceptRecommendation(blueprint: CardSetConceptBlueprint): ProductImageStudioConceptRecommendation {
  return {
    id: blueprint.id,
    label: blueprint.label,
    outputPrompts: listOutputContracts().map((contract) => ({
      label: contract.label,
      outputType: contract.outputType,
      posePrompts: contract.supportsCardPose ? listCardPoseSceneRules().map((rule) => toPosePrompt(blueprint, rule)) : [],
      scenePrompt: [
        blueprint.mood,
        getOutputCompositionPrompt(contract.outputType),
        blueprint.props,
        blueprint.lighting,
      ].join(". "),
    })),
    styleTags: blueprint.styleTags,
    summary: blueprint.summary,
  };
}

function toPosePrompt(
  blueprint: CardSetConceptBlueprint,
  rule: ReturnType<typeof listCardPoseSceneRules>[number],
): ProductImageStudioConceptPosePrompt {
  return {
    cardFormat: rule.cardFormat,
    pose: rule.pose,
    prompt: [getKoreanPoseInstruction(rule.pose), rule.geometryPrompt, blueprint.lighting].join(". "),
  };
}

function getOutputCompositionPrompt(outputType: ProductImageStudioOutputType): string {
  switch (outputType) {
    case "set_combined":
      return "카드, 봉투, 봉합스티커가 모두 보이되 디자인 영역을 가리지 않는 구성";
    case "card_single":
      return "카드 한 장의 인쇄면과 종이 두께가 중심이 되는 단독 구성";
    case "envelope_single":
      return "봉투의 앞면, 여밈, 종이 질감이 잘 보이는 단독 구성";
    case "seal_sticker_single":
      return "봉합스티커의 형태와 접착 위치를 확인하기 쉬운 단독 구성";
  }
}

function getKoreanPoseInstruction(pose: CardDisplayPose): string {
  switch (pose) {
    case "folded_closed":
      return "접힌 카드가 닫힌 상태로 자연스럽게 놓이고 접힌 축의 그림자가 살짝 보이게 합니다";
    case "folded_open_spread":
      return "접힌 축을 중심으로 안쪽 펼침면이 자연스럽게 보이게 합니다";
    case "folded_half_open":
      return "반쯤 열린 접이식 카드가 세워진 각도와 안쪽 그림자를 자연스럽게 유지합니다";
    case "folded_standing":
      return "접이식 카드가 안정적으로 서 있고 종이 두께와 바닥 접점이 보이게 합니다";
    case "postcard_front_flat":
      return "접힘 없는 평평한 엽서 앞면을 테이블 위에 정확히 놓습니다";
    case "postcard_back_flat":
      return "접힘 없는 평평한 엽서 뒷면과 가장자리 두께를 보여줍니다";
    case "postcard_lifestyle_stack":
      return "접힘 없는 엽서 여러 장이 낮게 겹친 생활형 구성을 만듭니다";
  }
}
