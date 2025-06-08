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
    
    const athleteId = params.id;
    
    // Verifica che l'atleta appartenga all'utente
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id')
      .eq('id', athleteId)
      .eq('user_id', user.id)
      .single();
    
    if (athleteError || !athlete) {
      return NextResponse.json({ error: 'Atleta non trovato' }, { status: 404 });
    }
    
    // Recupera le attività dell'atleta
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('user_id', user.id)
      .order('activity_date', { ascending: false });
    
    if (activitiesError) {
      console.error('Errore recupero attività:', activitiesError);
      return NextResponse.json({ error: 'Errore nel recupero delle attività' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: activities || [] 
    });
    
  } catch (error) {
    console.error('Errore endpoint attività atleta:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
} 