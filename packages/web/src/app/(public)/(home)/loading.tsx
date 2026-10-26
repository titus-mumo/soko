import { Skeleton } from "@/components/ui/Skeleton";
import {
  CategoryPillSkeleton,
  ProductGridSkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      {/* Hero */}
      <Skeleton className="h-[280px] rounded-none md:h-[400px]" />
      <div className="mx-auto max-w-7xl space-y-16 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="py-1">
          <CategoryPillSkeleton />
        </div>
        <div>
          <div className="mb-6 space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  );
}
