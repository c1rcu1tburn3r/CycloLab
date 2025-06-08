import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json(
        { error: 'ID attività richiesto' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    // Recupera l'attività per ottenere il fit_file_path e verificare l'autorizzazione
    const { data: activity, error: fetchError } = await supabase
      .from('activities')
      .select('fit_file_path, title, athlete_id, athletes(user_id)')
      .eq('id', activityId)
      .single();

    if (fetchError || !activity) {
      return NextResponse.json(
        { error: 'Attività non trovata' },
        { status: 404 }
      );
    }

    // Verifica che l'utente sia autorizzato (proprietario dell'atleta)
    if (!activity.athletes || (activity.athletes as any).user_id !== user.id) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      );
    }

    // 1. Elimina il file FIT da Supabase Storage (se esiste)
    if (activity.fit_file_path) {
      const { error: fileError } = await supabase.storage
        .from('fit-files')
        .remove([activity.fit_file_path]);

      if (fileError) {
        console.error(`Errore nell'eliminazione del file ${activity.fit_file_path} da Storage:`, fileError.message);
        // Non blocchiamo l'eliminazione dell'attività per errori di storage
      }
    }

    // 2. Elimina eventuali salite rilevate associate
    const { error: climbsError } = await supabase
      .from('detected_climbs')
      .delete()
      .eq('activity_id', activityId);

    if (climbsError) {
      console.error('Errore eliminazione salite rilevate:', climbsError.message);
      // Non blocchiamo l'eliminazione per questo
    }

    // 3. Elimina eventuali performance di salita associate
    const { error: climbPerformancesError } = await supabase
      .from('climb_performances')
      .delete()
      .eq('activity_id', activityId);

    if (climbPerformancesError) {
      console.error('Errore eliminazione performance salite:', climbPerformancesError.message);
      // Non blocchiamo l'eliminazione per questo
    }

    // 4. Elimina il record dell'attività dal database
    const { error: activityError } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId);

    if (activityError) {
      return NextResponse.json(
        { error: `Errore durante l'eliminazione dell'attività: ${activityError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Attività "${activity.title}" eliminata con successo`
    });

  } catch (error: any) {
    console.error('Errore API eliminazione attività:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
} 