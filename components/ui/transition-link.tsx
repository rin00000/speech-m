"use client";

import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useLoading } from "@/lib/ui/loading-context";

interface TransitionLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function TransitionLink({
  children,
  href,
  className,
  title,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();
  const { startNavigation } = useLoading();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 특수 키 클릭(새 탭 열기 등)은 기본 브라우저 흐름을 따르도록 격리
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();

    // 0ms 만에 즉시 로딩 프로그레스 바 실행 및 본문 스켈레톤 활성화!
    startNavigation();

    // 페이지 이동 요청
    router.push(href.toString());
  };

  return (
    <Link
      href={href}
      className={className}
      title={title}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}
