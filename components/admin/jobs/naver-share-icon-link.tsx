"use client";

import type { NaverShareIconType } from "@/lib/jobs/naver-share-icon";
import { getNaverShareIconDimensions, getNaverShareIconUrl } from "@/lib/jobs/naver-share-icon";

type Props = {
  href: string;
  title: string;
  iconType: NaverShareIconType;
  className?: string;
};

/**
 * Official N-square image + app-controlled `shareView` URL (same endpoint as the Naver plugin).
 */
export const NaverShareIconLink = ({ href, title, iconType, className }: Props) => {
  const { width, height } = getNaverShareIconDimensions(iconType);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={className}
    >
      <img
        src={getNaverShareIconUrl(iconType)}
        alt="네이버로 공유"
        width={width}
        height={height}
        className="block"
        decoding="async"
      />
    </a>
  );
};
