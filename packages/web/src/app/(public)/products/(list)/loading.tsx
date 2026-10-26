import { Skeleton } from "@/components/ui/Skeleton";
import {
  CategoryPillSkeleton,
  PageHeaderSkeleton,
  ProductGridSkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading products">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeaderSkeleton />
        <Skeleton className="h-11 w-full rounded-lg sm:w-80" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryPillSkeleton />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
