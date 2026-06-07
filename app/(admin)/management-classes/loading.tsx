import {
  Skeleton,
  SkeletonLine,
  SkeletonPageHeader,
} from "@/components/ui/skeleton";

export default function ManagementClassesLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SkeletonPageHeader />

      <div className="grid flex-1 gap-4 p-4 md:p-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <SkeletonLine size="sm" width="1/2" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-10 rounded-2xl" />
                <Skeleton className="h-10 rounded-2xl" />
                <Skeleton className="h-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <SkeletonLine size="sm" width="1/2" />
              <Skeleton className="mt-4 h-24 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
