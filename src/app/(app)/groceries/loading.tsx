import { Skeleton, ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-1/2" />
      <ListSkeleton rows={5} />
    </div>
  );
}
