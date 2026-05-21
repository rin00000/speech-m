import {
  BookOpen01Icon,
  Briefcase01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  Settings01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import type { UserRole } from "@/lib/auth/session";

export type NavRole = UserRole | "all";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof DashboardSquare01Icon;
  role: NavRole;
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "대시보드",
    href: "/dashboard",
    icon: DashboardSquare01Icon,
    role: "all",
  },
  {
    label: "채용 공고",
    href: "/jobs",
    icon: Briefcase01Icon,
    role: "all",
  },
  {
    label: "연습 원고",
    href: "/practice",
    icon: BookOpen01Icon,
    role: "student",
  },
  {
    label: "시험 후기",
    href: "/reviews",
    icon: FileEditIcon,
    role: "student",
  },
  {
    label: "내 스터디",
    href: "/studies",
    icon: BookOpen01Icon,
    role: "student",
  },
  {
    label: "스터디 관리",
    href: "/studies",
    icon: BookOpen01Icon,
    role: "admin",
  },
  {
    label: "회원 관리",
    href: "/users",
    icon: UserIcon,
    role: "admin",
  },
  {
    label: "설정",
    href: "/settings",
    icon: Settings01Icon,
    role: "all",
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  if (role === "admin") {
    // 관리자는 모든 메뉴 노출 (단, 수강생용 내 스터디와 중복되므로 내 스터디는 필터링)
    return NAV_ITEMS.filter((item) => item.label !== "내 스터디");
  }
  if (role === "student") {
    // 수강생은 student 및 all 노출 (admin 전용은 제외)
    return NAV_ITEMS.filter((item) => item.role === "all" || item.role === "student");
  }
  // guest(불특정 다수)는 오직 대시보드(안내), 채용 공고, 설정만 노출
  return NAV_ITEMS.filter((item) => item.role === "all" && item.href !== "/settings");
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
