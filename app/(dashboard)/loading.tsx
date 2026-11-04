import { Skeleton } from "@/components/ui/skeleton";

const loading = () => {
  return (
    <div className="container space-y-4 py-8" role="status">
      <span className="sr-only">Loading dashboard…</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
};

export default loading;
