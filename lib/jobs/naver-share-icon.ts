/**
 * Official N-square assets used by Naver's `naver_sharebutton.js`
 * (see https://ssl.pstatic.net/share/js/naver_sharebutton.js — IMG_BASE_URL / IMG_NAME / IMG_SIZE).
 * We use `<img src>` + our own `<a href>` so multiple buttons per page work and share URL stays correct.
 */
export const NAVER_SHARE_ICON_BASE_URL = "https://ssl.pstatic.net/share/images/appicon/";

export const NAVER_SHARE_ICON_TYPE = ["a", "b", "c", "d", "e", "f"] as const;
export type NaverShareIconType = (typeof NAVER_SHARE_ICON_TYPE)[number];

const ICON_FILES: Record<NaverShareIconType, string> = {
  a: "naver_square_16x16.png",
  b: "naver_square_20x20.png",
  c: "naver_square_24x24.png",
  d: "naver_square_30x30.png",
  e: "naver_square_36x36.png",
  f: "naver_square_40x40.png",
};

const ICON_SIZE: Record<NaverShareIconType, readonly [number, number]> = {
  a: [16, 16],
  b: [20, 20],
  c: [24, 24],
  d: [30, 30],
  e: [36, 36],
  f: [40, 40],
};

export const getNaverShareIconUrl = (type: NaverShareIconType): string =>
  `${NAVER_SHARE_ICON_BASE_URL}${ICON_FILES[type]}`;

export const getNaverShareIconDimensions = (type: NaverShareIconType): { width: number; height: number } => {
  const [width, height] = ICON_SIZE[type];
  return { width, height };
};
