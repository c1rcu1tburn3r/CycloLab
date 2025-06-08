import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    // Verifica autenticazione
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    
    // Revalida il tag specifico per l'utente
    revalidateTag(`athletes-user-${user.id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Errore revalidazione cache atleti:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
} 