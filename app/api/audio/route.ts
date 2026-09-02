// app/api/audio/route.ts — KINEO-AUDIO-2026-08-17
// GET: galeria "My Audio" do usuario logado (24 mais recentes).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

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
