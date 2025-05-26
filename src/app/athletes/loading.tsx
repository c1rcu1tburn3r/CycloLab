import AthleteCardSkeleton from '@/components/AthleteCardSkeleton';
import { Button } from "@/components/ui/button"; // Assuming similar button for consistency
import Link from 'next/link'; // If the "Add Athlete" button is a Link

export default function AthletesLoading() {
  const skeletonCount = 6; // Numero di skeleton da mostrare

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          {/* Ultra-Modern Header (Skeleton or Simplified) */}
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-t-3xl" />
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
                  <div>
                    <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-md w-48 mb-3 animate-pulse"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-md w-64 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded-md w-20 mb-2 animate-pulse"></div>
                    <div className="h-7 bg-gray-300 dark:bg-gray-700 rounded-md w-10 animate-pulse"></div>
                  </div>
                  {/* Skeleton for Add Athlete Button or keep the actual button if it doesn't depend on loaded data */}
                  <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg opacity-50 cursor-not-allowed">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Aggiungi Atleta
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats (Skeleton) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stats-card group animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                </div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-1"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            ))}
          </div>

          {/* Athletes Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {[...Array(skeletonCount)].map((_, index) => (
              <AthleteCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 