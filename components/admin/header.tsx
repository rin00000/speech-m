import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { MobileNavTrigger } from "@/components/admin/admin-shell";

interface HeaderProps {
  title: string;
  description?: string;
}

export const Header = ({ title, description }: HeaderProps) => (
  <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <MobileNavTrigger />
      <div className="min-w-0 flex flex-col leading-none">
        <h1 className="truncate text-base font-semibold text-slate-800">{title}</h1>
        {description && (
          <p className="mt-0.5 truncate text-xs text-slate-400">{description}</p>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2">
      {/* Search */}
      <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600">
        <HugeiconsIcon
          icon={Search01Icon}
          size={14}
          color="currentColor"
          strokeWidth={1.5}
        />
        <span className="hidden text-xs sm:inline">검색</span>
      </button>

      {/* Notifications */}
      <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
        <HugeiconsIcon
          icon={Notification01Icon}
          size={18}
          color="currentColor"
          strokeWidth={1.5}
        />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
      </button>
    </div>
  </header>
);
