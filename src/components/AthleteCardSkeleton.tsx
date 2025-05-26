export default function AthleteCardSkeleton() {
  return (
    <div className="stats-card group animate-pulse">
      {/* Avatar Skeleton */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-300 dark:bg-gray-700"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-md w-3/4 mx-auto mt-4"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200/50 dark:bg-gray-700/30 rounded-xl p-3">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded-md w-1/2 mb-2"></div>
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded-md w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
} 