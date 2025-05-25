import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Verifica autenticazione
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const activityId = params.id;

    // Recupera l'attività con i route points
    const { data: activity, error } = await supabase
      .from('activities')
      .select('id, route_points, user_id, athlete_id')
      .eq('id', activityId)
      .single();

    if (error) {
      console.error('Errore nel recupero dell\'attività:', error);
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 });
    }

    if (!activity) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 });
    }

    // Verifica che l'utente abbia accesso all'attività
    if (activity.user_id !== user.id) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    // Parsa i route points se esistono
    let routePoints = [];
    if (activity.route_points) {
      try {
        routePoints = typeof activity.route_points === 'string'
          ? JSON.parse(activity.route_points)
          : activity.route_points;
      } catch (parseError) {
        console.error('Errore nel parsing dei route points:', parseError);
        return NextResponse.json({ error: 'Errore nel parsing dei dati GPS' }, { status: 500 });
      }
    }

    return NextResponse.json({
      activityId: activity.id,
      routePoints: routePoints || [],
      totalPoints: routePoints?.length || 0
    });

  } catch (error) {
    console.error('Errore nell\'endpoint route-points:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
} 