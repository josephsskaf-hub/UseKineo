// ═══ KINEO-PACOTE-DE-PUBLICACAO-2026-09-06 (sprint-assinaturas #22) ════════
//
// A PORTA DE SERVIDOR DO PACOTE — para a tela, que e lote do Codex.
//
// POR QUE ELA EXISTE, e a razao e um erro meu medido nesta mesma rotacao:
// a #20 pendurou o pacote no e-mail de resgate (`cron/send-video-ready`), que
// alcanca **4 pessoas por semana**. O e-mail que alcanca **104** e o
// instantaneo, disparado de dentro de `/api/compose/status` — a rota que o
// cliente fica pollando enquanto o filme renderiza. Pendurar ali uma chamada
// de modelo de ate 12s bloquearia um poll e faria a tela parecer travada no
// exato minuto em que o filme fica pronto. Trocar risco de UX no pico de
// alegria por alcance nao vale.
//
// O lugar certo do pacote e a TELA de filme pronto: a pessoa acabou de ver o
// video, esta com o MP4 na mao e e ali que ela decide postar. Essa tela e
// territorio do Codex (regra de ouro do ciclo). Entao esta rota e o CONTRATO:
// o servidor fica pronto, e a montagem cabe em uma linha do lado de la.
//
// CONTRATO:
//   GET  — so LE (`escrever: false`). Custo ZERO garantido. Sem pacote =
//          200 com `pack: null`, nunca 404: ausencia nao e erro, e a tela
//          simplesmente nao mostra a caixa.
//   POST — escreve UMA vez por filme e guarda. Chamar de novo devolve o MESMO
//          pacote. E o que a tela chama quando o cliente aperta "Post it".
//
// O CREDITO SO ENTRA NO PLANO GRATUITO — mesma regra de
// `buildBrandedYouTubeDescription`, e o predicado vem de
// `getEffectiveEntitlement`, nunca redigitado aqui.
//
// NAO COBRA CREDITO. NAO CHAMA A FAL. NAO RENDERIZA. Escreve quatro textos.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import { garantirPacote, type FilmeDoPacote } from '@/lib/publishPackServer'
import type { PacoteDePublicacao } from '@/lib/publishPack'

export const dynamic = 'force-dynamic'
// Ver KINEO-DATA-CACHE-2026-09-02: rota so-GET no Next 14.2 nasce com
// revalidate=false e leria o banco congelado.
export const fetchCache = 'force-no-store'

function adminOuNulo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

const COLUNAS = 'id, title, topic, created_at'

type Ctx =
  | { erro: NextResponse }
  | { erro?: undefined; userId: string; admin: NonNullable<ReturnType<typeof adminOuNulo>>; alvo: FilmeDoPacote | null; gratuito: boolean }

async function contexto(req: NextRequest): Promise<Ctx> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: NextResponse.json({ error: 'You must be signed in.' }, { status: 401 }) }

  const admin = adminOuNulo()
  if (!admin) return { erro: NextResponse.json({ pack: null }, { status: 200 }) }

  const { data: perfil } = await admin
    .from('profiles')
    .select(TRIAL_ENTITLEMENT_COLUMNS)
    .eq('id', user.id)
    .maybeSingle()
  const ent = getEffectiveEntitlement(perfil ?? {})

  const pedido = req.nextUrl.searchParams.get('videoId')
  let alvo: FilmeDoPacote | null = null
  if (pedido) {
    const { data } = await admin
      .from('videos')
      .select(COLUNAS)
      .eq('user_id', user.id)
      .eq('id', pedido)
      .maybeSingle()
    alvo = (data as FilmeDoPacote | null) ?? null
  } else {
    const { data } = await admin
      .from('videos')
      .select(COLUNAS)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
    alvo = Array.isArray(data) && data[0] ? (data[0] as FilmeDoPacote) : null
  }
  // `treatAsPaid` e o predicado do cobrador. Gratuito = recebe a linha de
  // credito; pago = pacote limpo (memoria `predicado-do-cobrador-nao-se-redigita`).
  return { userId: user.id, admin, alvo, gratuito: !ent.treatAsPaid }
}

function resposta(pack: PacoteDePublicacao | null, alvo: FilmeDoPacote | null) {
  return NextResponse.json({
    pack,
    forVideoId: typeof alvo?.id === 'string' ? alvo.id : null,
    // A tela precisa saber se o credito viajou, para poder dizer a verdade
    // sobre o que ela esta entregando. Nunca deduzir isso do plano na tela.
    hasCredit: pack ? pack.ytDescription.toLowerCase().includes('usekineo.com') : false,
  })
}

export async function GET(req: NextRequest) {
  const ctx = await contexto(req)
  if (ctx.erro) return ctx.erro
  const { userId, admin, alvo, gratuito } = ctx
  if (!alvo) return resposta(null, null)
  const pack = await garantirPacote(admin, userId, alvo, { escrever: false, isFreePlan: gratuito })
  return resposta(pack, alvo)
}

export async function POST(req: NextRequest) {
  const ctx = await contexto(req)
  if (ctx.erro) return ctx.erro
  const { userId, admin, alvo, gratuito } = ctx
  if (!alvo) return resposta(null, null)
  const pack = await garantirPacote(admin, userId, alvo, { isFreePlan: gratuito })
  return resposta(pack, alvo)
}
