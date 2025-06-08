import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const athleteId = params.id;
    const { ftp, weight } = await request.json();

    if (!athleteId) {
      return NextResponse.json(
        { error: 'ID atleta richiesto' },
        { status: 400 }
      );
    }

    if (!ftp || typeof ftp !== 'number' || ftp <= 0) {
      return NextResponse.json(
        { error: 'FTP deve essere un numero positivo' },
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

    // Verifica che l'atleta appartenga all'utente
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, name, surname, user_id')
      .eq('id', athleteId)
      .eq('user_id', user.id)
      .single();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { error: 'Atleta non trovato o non autorizzato' },
        { status: 404 }
      );
    }

    // Crea una nuova voce del profilo con la data odierna
    const today = new Date().toISOString().split('T')[0];
    
    const entryData = {
      athlete_id: athleteId,
      effective_date: today,
      ftp_watts: Math.round(ftp),
      weight_kg: weight || null,
    };

    const { data: profileEntry, error: entryError } = await supabase
      .from('athlete_profile_entries')
      .upsert(entryData, {
        onConflict: 'athlete_id, effective_date',
      })
      .select()
      .single();

    if (entryError) {
      console.error('Errore creazione voce profilo:', entryError);
      return NextResponse.json(
        { error: `Errore durante l'aggiornamento del profilo: ${entryError.message}` },
        { status: 500 }
      );
    }

    // Aggiorna anche la tabella athletes se necessario
    if (weight) {
      const { error: updateError } = await supabase
        .from('athletes')
        .update({ weight_kg: weight })
        .eq('id', athleteId);

      if (updateError) {
        console.warn('Errore aggiornamento peso atleta:', updateError.message);
        // Non blocchiamo per questo errore
      }
    }

    return NextResponse.json({
      success: true,
      message: `FTP aggiornato a ${Math.round(ftp)}W per ${athlete.name} ${athlete.surname}`,
      data: profileEntry
    });

  } catch (error: any) {
    console.error('Errore API aggiornamento FTP:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
} 