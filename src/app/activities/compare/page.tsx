import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Activity } from '@/lib/types';
import ActivityComparisonDashboard from './ActivityComparisonDashboard';

async function getActivitiesForComparison(
  supabaseClient: any, 
  activityIds: string[],
  userId: string
): Promise<Activity[]> {
  const { data, error } = await supabaseClient
    .from('activities')
    .select('*, athletes(name, surname)')
    .in('id', activityIds)
    .eq('user_id', userId);

  if (error) {
    console.error('Errore nel recuperare le attività per comparazione:', error.message);
    return [];
  }
  return data || [];
}

interface ComparePageProps {
  searchParams: { ids?: string };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/auth/login');
  }

  // Parse activity IDs from URL
  const activityIds = searchParams.ids?.split(',').filter(Boolean) || [];
  
  if (activityIds.length < 2) {
    redirect('/activities?error=insufficient_activities');
  }

  if (activityIds.length > 4) {
    redirect('/activities?error=too_many_activities');
  }

  // Fetch activities for comparison
  const activities = await getActivitiesForComparison(supabase, activityIds, user.id);

  if (activities.length !== activityIds.length) {
    redirect('/activities?error=activities_not_found');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 grid-dots pointer-events-none" />
      
      <div className="relative">
        <div className="container mx-auto px-4 py-8">
          <ActivityComparisonDashboard activities={activities} />
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic'; 