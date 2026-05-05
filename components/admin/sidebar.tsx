"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Briefcase01Icon,
  FileEditIcon,
  BookOpen01Icon,
  Settings01Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";

type IconType = typeof DashboardSquare01Icon;

interface NavItem {
  label: string;
  href: string;
  icon: IconType;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "대시보드",
    href: "/dashboard",
    icon: DashboardSquare01Icon,
  },
  {
    label: "공고 관리",
    href: "/jobs",
    icon: Briefcase01Icon,
  },
  {
    label: "시험 후기",
    href: "/reviews",
    icon: FileEditIcon,
  },
  {
    label: "스터디 관리",
    href: "/studies",
    icon: BookOpen01Icon,
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  {
    label: "설정",
    href: "/settings",
    icon: Settings01Icon,
  },
];

const NavLink = ({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) => (
  <Link
    href={item.href}
    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
      isActive
        ? "bg-slate-800 text-slate-100"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
    }`}
  >
    <span
      className={`flex-shrink-0 transition-colors ${
        isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
      }`}
    >
      <HugeiconsIcon
        icon={item.icon}
        size={18}
        color="currentColor"
        strokeWidth={isActive ? 2 : 1.5}
      />
    </span>
    {item.label}
    {isActive && (
      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
    )}
  </Link>
);

export const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <aside className="flex h-full w-[260px] flex-shrink-0 flex-col bg-slate-900">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-lg shadow-indigo-500/30">
          <span className="text-xs font-bold text-white">SM</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold text-slate-100">Speech-M</span>
          <span className="text-[11px] text-slate-500">관리자 대시보드</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          메뉴
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 px-3 py-4">
        <div className="flex flex-col gap-1">
          {BOTTOM_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
            />
          ))}
          <button className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-slate-800/60 hover:text-rose-400">
            <span className="flex-shrink-0 text-slate-500 transition-colors group-hover:text-rose-400">
              <HugeiconsIcon
                icon={Logout01Icon}
                size={18}
                color="currentColor"
                strokeWidth={1.5}
              />
            </span>
            로그아웃
          </button>
        </div>

        {/* Director Profile */}
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
            원
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">원장님</p>
            <p className="truncate text-[11px] text-slate-500">관리자</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
