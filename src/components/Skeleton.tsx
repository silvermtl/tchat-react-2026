interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-[#1a3a52] rounded animate-shimmer ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, #1a3a52 0%, #2a4a62 50%, #1a3a52 100%)',
        backgroundSize: '200% 100%',
      }}
    />
  );
}

export function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-12 w-3/4 rounded-lg" />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-6 w-40 mb-4" />
      <UserSkeleton />
      <UserSkeleton />
      <UserSkeleton />
    </div>
  );
}
