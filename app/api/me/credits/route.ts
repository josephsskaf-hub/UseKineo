import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// KINEO-S25-CARD-2026-09-01 — a flag `internal` existe para o /studio poder
// mostrar o card do Seedance 2.5 SO para contas da casa enquanto o motor
// esta no periodo de canario (o gate de verdade continua no servidor).
import { s25Visible } from '@/lib/engineLaunch'

// KINEO-CABE-2026-08-21 — saldo do usuário logado, para a tela poder dizer a
// verdade ANTES do clique. Existe porque o /studio oferecia motores que o
// saldo não cobre (Kling 3 = 150cr contra os 80 do trial) e só negava na
// última porta, depois de a pessoa ter escrito a ideia.
// Leitura pura, escopada pela sessão: nunca aceita id de terceiro.
export const dynamic = 'force-dynamic'
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ credits: null }, { status: 401 })
  const { data } = await supabase
    .from('profiles')
    .select('video_credits')
    .eq('id', user.id)
    .maybeSingle()
  return NextResponse.json({ credits: (data?.video_credits as number) ?? 0, internal: s25Visible(user.email) })
}
