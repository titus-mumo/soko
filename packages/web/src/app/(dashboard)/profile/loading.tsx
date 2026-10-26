import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeaderSkeleton, ProfileSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeaderSkeleton />
      <Skeleton className="h-11 w-full max-w-md" />
      <ProfileSkeleton />
    </div>
  );
}
