/**
 * 프로토타입 카탈로그의 테마 프리셋과 스타일 모드 타입.
 * 화면 컴포넌트가 색상 데이터 정의와 렌더링 책임을 함께 갖지 않도록 분리한다.
 */

export type ThemeKey = "periwinkle" | "mint" | "apricot" | "lavender" | "cyber";

export type RoundingMode = "tiimo" | "sharp" | "none";

export type CardBackgroundStyle = "solid" | "glass" | "transparent";

export interface ThemePreset {
  name: string;
  desc: string;
  colors: {
    bg: string;
    subtle: string;
    key: string;
    border: string;
    accent: string;
    accentHover: string;
    accentActive: string;
    ink: string;
  };
  swatches: Array<[string, string, string]>;
}

export const THEMES: Record<ThemeKey, ThemePreset> = {
  periwinkle: {
    name: "Periwinkle Classic (Original Tiimo)",
    desc: "아카데미의 신뢰감과 안정감을 주는 편안하고 맑은 파스텔 블루",
    colors: {
      bg: "#F4F8FE",
      subtle: "#E5EEFC",
      key: "#D2E0FB",
      border: "#B0C6F0",
      accent: "#4D72B3",
      accentHover: "#3A5994",
      accentActive: "#2A4275",
      ink: "#1B2B52",
    },
    swatches: [
      ["50", "#F4F8FE", "배경색 (bg-bg)"],
      ["100", "#E5EEFC", "소프트 칩 (bg-subtle)"],
      ["200", "#D2E0FB", "키 컬러 (border-accent)"],
      ["600", "#4D72B3", "액션 버튼 (bg-accent)"],
      ["900", "#1B2B52", "메인 텍스트 (ink)"],
    ],
  },
  mint: {
    name: "Neo Forest & Mint (Fresh Tech)",
    desc: "최신 IT 크리에이티브 허브를 연상시키는 신선하고 깔끔한 에메랄드&민트",
    colors: {
      bg: "#F0FDF4",
      subtle: "#DCFCE7",
      key: "#BBF7D0",
      border: "#86EFAC",
      accent: "#16A34A",
      accentHover: "#15803D",
      accentActive: "#14532D",
      ink: "#14532D",
    },
    swatches: [
      ["50", "#F0FDF4", "배경색 (bg-bg)"],
      ["100", "#DCFCE7", "소프트 칩 (bg-subtle)"],
      ["200", "#BBF7D0", "키 컬러 (border-accent)"],
      ["600", "#16A34A", "액션 버튼 (bg-accent)"],
      ["900", "#14532D", "메인 텍스트 (ink)"],
    ],
  },
  apricot: {
    name: "Warm Apricot (Sunset Peach)",
    desc: "친근하고 긍정적인 무드를 연출하며 가독성이 훌륭한 웜톤 오렌지 피치",
    colors: {
      bg: "#FFF7ED",
      subtle: "#FFEDD5",
      key: "#FED7AA",
      border: "#FDBA74",
      accent: "#EA580C",
      accentHover: "#C2410C",
      accentActive: "#9A3412",
      ink: "#431407",
    },
    swatches: [
      ["50", "#FFF7ED", "배경색 (bg-bg)"],
      ["100", "#FFEDD5", "소프트 칩 (bg-subtle)"],
      ["200", "#FED7AA", "키 컬러 (border-accent)"],
      ["600", "#EA580C", "액션 버튼 (bg-accent)"],
      ["900", "#431407", "메인 텍스트 (ink)"],
    ],
  },
  lavender: {
    name: "Lavender Boutique (Chic Violet)",
    desc: "고급스러운 부티크 아카데미의 세련되고 감각적인 크리에이티브 퍼플",
    colors: {
      bg: "#FAF5FF",
      subtle: "#F3E8FF",
      key: "#E9D5FF",
      border: "#D8B4FE",
      accent: "#7E22CE",
      accentHover: "#6B21A8",
      accentActive: "#581C87",
      ink: "#2E1065",
    },
    swatches: [
      ["50", "#FAF5FF", "배경색 (bg-bg)"],
      ["100", "#F3E8FF", "소프트 칩 (bg-subtle)"],
      ["200", "#E9D5FF", "키 컬러 (border-accent)"],
      ["600", "#7E22CE", "액션 버튼 (bg-accent)"],
      ["900", "#2E1065", "메인 텍스트 (ink)"],
    ],
  },
  cyber: {
    name: "Cyber Lime & Charcoal (Edgy Mono)",
    desc: "시크한 차콜 블랙 뼈대에 힙한 라임 형광 포인트를 얹은 고대비 스타일",
    colors: {
      bg: "#FAFAFA",
      subtle: "#F4F4F5",
      key: "#BEF264",
      border: "#E4E4E7",
      accent: "#18181B",
      accentHover: "#27272A",
      accentActive: "#09090B",
      ink: "#09090B",
    },
    swatches: [
      ["50", "#FAFAFA", "배경색 (bg-bg)"],
      ["100", "#F4F4F5", "소프트 칩 (bg-subtle)"],
      ["200", "#BEF264", "형광 라임 (key-point)"],
      ["600", "#18181B", "액션 버튼 (bg-accent)"],
      ["900", "#09090B", "메인 텍스트 (ink)"],
    ],
  },
};
