import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeaderSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div
      className="space-y-8"
      role="status"
      aria-label="Loading delivery zones"
    >
      <PageHeaderSkeleton />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
