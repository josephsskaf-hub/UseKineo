// app/api/audio/route.ts — KINEO-AUDIO-2026-08-17
// GET: galeria "My Audio" do usuario logado (24 mais recentes).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ audios: [] })

  const { data, error } = await supabase
    .from('audios')
    .select('id,url,model,voice,text,duration_ms,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) return NextResponse.json({ audios: [] })
  return NextResponse.json({ audios: data ?? [] })
}
