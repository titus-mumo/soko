import { Skeleton } from "@/components/ui/Skeleton";
import {
  CategoryPillSkeleton,
  PageHeaderSkeleton,
  ProductGridSkeleton,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading category">
      <Skeleton className="h-4 w-48" />
      <PageHeaderSkeleton />
      <CategoryPillSkeleton />
      <ProductGridSkeleton />
    </div>
  );
}
