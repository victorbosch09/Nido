import { Skeleton, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-24 w-full rounded-3xl" />
      <ListSkeleton rows={4} />
    </div>
  );
}
