import {
  BookOpen01Icon,
  Briefcase01Icon,
  DashboardSquare01Icon,
  FileEditIcon,
  Settings01Icon,
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
    label: "공고 관리",
    href: "/jobs",
    icon: Briefcase01Icon,
    role: "admin",
  },
  {
    label: "시험 후기",
    href: "/reviews",
    icon: FileEditIcon,
    role: "all",
  },
  {
    label: "스터디 관리",
    href: "/studies",
    icon: BookOpen01Icon,
    role: "admin",
  },
  {
    label: "내 스터디",
    href: "/studies",
    icon: BookOpen01Icon,
    role: "student",
  },
  {
    label: "설정",
    href: "/settings",
    icon: Settings01Icon,
    role: "all",
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.role === "all" || item.role === role);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
