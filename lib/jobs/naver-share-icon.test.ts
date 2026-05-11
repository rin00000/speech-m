import { describe, expect, it } from "vitest";
import { getNaverShareIconDimensions, getNaverShareIconUrl } from "@/lib/jobs/naver-share-icon";

describe("getNaverShareIconUrl", () => {
  it("matches official plugin asset paths for type a and c", () => {
    expect(getNaverShareIconUrl("a")).toBe(
      "https://ssl.pstatic.net/share/images/appicon/naver_square_16x16.png",
    );
    expect(getNaverShareIconUrl("c")).toBe(
      "https://ssl.pstatic.net/share/images/appicon/naver_square_24x24.png",
    );
  });
});

describe("getNaverShareIconDimensions", () => {
  it("returns sizes aligned with naver_sharebutton.js IMG_SIZE", () => {
    expect(getNaverShareIconDimensions("a")).toEqual({ width: 16, height: 16 });
    expect(getNaverShareIconDimensions("f")).toEqual({ width: 40, height: 40 });
  });
});
