"use client";

/**
 * 내부 라우팅 링크에 전역 네비게이션 진행 표시를 연결하는 Link 래퍼입니다.
 * TransitionLink가 클릭 조건을 판별하고 LoadingProvider의 진행 상태와 Next router 이동을 함께 처리합니다.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { useLoading } from "@/lib/ui/loading-context";

type TransitionLinkProps = ComponentPropsWithoutRef<typeof Link>;

function shouldShowNavigationFeedback(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const anchor = event.currentTarget;
  const target = anchor.getAttribute("target");
  if ((target && target !== "_self") || anchor.hasAttribute("download")) return false;

  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#")) return false;

  const url = new URL(anchor.href);
  if (url.origin !== window.location.origin) return false;

  const currentRoute = `${window.location.pathname}${window.location.search}`;
  const nextRoute = `${url.pathname}${url.search}`;
  return currentRoute !== nextRoute;
}

export function TransitionLink({
  children,
  href,
  onClick,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const { startNavigation } = useLoading();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (!shouldShowNavigationFeedback(event)) return;

    event.preventDefault();
    const url = new URL(event.currentTarget.href);
    startNavigation();
    router.push(`${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
