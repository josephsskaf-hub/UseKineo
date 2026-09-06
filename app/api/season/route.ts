// ═══ KINEO-TEMPORADA-2026-09-06 (sprint-assinaturas #18, #19) ══════════════
//
// A porta de servidor da TEMPORADA. Ver lib/temporada.ts para o número que
// mandou construir isto (64 pessoas que fizeram UM filme, ainda têm saldo e
// foram embora satisfeitas em ~30 min).
//
// CONTRATO, e ele é deliberado:
//
//   GET  — só LÊ. Nunca chama modelo, nunca gasta um centavo (`escrever:
//          false`). Existe para que qualquer tela, carta ou varredura possa
//          perguntar "esta pessoa tem temporada?" sem risco de custo surpresa.
//          Sem temporada = 200 com `season: null`, nunca 404: ausência de
//          temporada não é erro.
//   POST — escreve UMA vez por filme e guarda. Chamar de novo devolve a MESMA
//          temporada (a lição do #14: quem volta tem de encontrar o mesmo
//          texto, não um diferente).
//
// ⚠️ #19 — O ESCRITOR NÃO MORA MAIS AQUI. Ele foi para lib/temporadaServer.ts
// porque a CARTA da temporada precisa escrever para gente que não está logada
// (a coorte inteira das 64 tem filme anterior ao deploy de hoje, então ninguém
// tem temporada gravada). Duas implementações do mesmo texto divergiriam no
// primeiro ajuste — memória `predicado-do-cobrador-nao-se-redigita`.
//
// NÃO COBRA CRÉDITO. NÃO CHAMA A FAL. NÃO RENDERIZA. Escreve cinco títulos.
// O episódio só vira filme pelo fluxo normal, cobrado normalmente.
//
// NÃO ESCREVE OFERTA. A rota devolve o CUSTO de cada episódio vindo de
// `creditCostForDuration` (fonte única) e o SALDO da pessoa. Quem monta a
// frase ("cabe no seu saldo" / "o resto da temporada") é a carta ou a tela —
// preço público é decisão do fundador e este arquivo não o toca.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import { TOTAL_EPISODIOS, type TemporadaEscrita } from '@/lib/temporada'
import { garantirTemporada, type FilmeDaTemporada } from '@/lib/temporadaServer'

export const dynamic = 'force-dynamic'

function adminOuNulo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

const COLUNAS_FILME = 'id, title, topic, quality_mode, duration_seconds, created_at'

/** O custo de repetir o MESMO motor e a MESMA duração do filme 1. É esse o
 *  número honesto: a pessoa vai querer o episódio 3 com a cara do episódio 1,
 *  não com a cara do motor mais barato da casa. */
function custoDoEpisodio(filme: FilmeDaTemporada, pago: boolean): number | null {
  const q = typeof filme.quality_mode === 'string' ? (filme.quality_mode as Quality) : null
  if (!q) return null
  const seg =
    typeof filme.duration_seconds === 'number' && filme.duration_seconds > 0 ? filme.duration_seconds : 60
  try {
    return creditCostForDuration(q, pago, seg)
  } catch {
    return null
  }
}

function resposta(
  t: TemporadaEscrita | null,
  alvo: FilmeDaTemporada | null,
  balance: number,
  custo: number | null,
) {
  return NextResponse.json({
    season: t
      ? {
          fromVideoId: typeof alvo?.id === 'string' ? alvo.id : null,
          fromTitle: t.fromTitle,
          // `affordable` é derivado, não digitado: é a MESMA conta que o
          // cobrador faz. A carta e a tela leem daqui em vez de refazerem.
          episodes: t.episodes.map((e) => ({ ...e, cost: custo, affordable: custo !== null && custo <= balance })),
        }
      : null,
    balance,
    episodeCost: custo,
    // Quantos episódios da temporada o saldo de hoje paga. É este número que
    // transforma "60 créditos" em "o resto da sua temporada" sem inventar preço.
    affordableEpisodes: custo && custo > 0 ? Math.min(TOTAL_EPISODIOS, Math.floor(balance / custo)) : null,
  })
}

type Contexto =
  | { erro: NextResponse }
  | {
      erro?: undefined
      userId: string
      admin: ReturnType<typeof adminOuNulo>
      alvo: FilmeDaTemporada | null
      balance: number
      pago: boolean
    }

async function contexto(req: NextRequest): Promise<Contexto> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: NextResponse.json({ error: 'You must be signed in.' }, { status: 401 }) }

  const admin = adminOuNulo()
  const perfil = admin
    ? (
        await admin
          .from('profiles')
          .select(`video_credits, ${TRIAL_ENTITLEMENT_COLUMNS}`)
          .eq('id', user.id)
          .maybeSingle()
      ).data
    : null

  const cru = (perfil ?? {}) as { video_credits?: unknown }
  const balance = typeof cru.video_credits === 'number' ? Math.max(0, Math.floor(cru.video_credits)) : 0
  // O predicado do cobrador, nunca redigitado (memória
  // `predicado-do-cobrador-nao-se-redigita`).
  const ent = getEffectiveEntitlement(perfil ?? {})

  const pedido = req.nextUrl.searchParams.get('videoId')
  let alvo: FilmeDaTemporada | null = null
  if (admin) {
    if (pedido) {
      const { data } = await admin
        .from('videos')
        .select(COLUNAS_FILME)
        .eq('user_id', user.id)
        .eq('id', pedido)
        .maybeSingle()
      alvo = (data as FilmeDaTemporada | null) ?? null
    } else {
      const { data } = await admin
        .from('videos')
        .select(COLUNAS_FILME)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
      alvo = Array.isArray(data) && data[0] ? (data[0] as FilmeDaTemporada) : null
    }
  }
  return { userId: user.id, admin, alvo, balance, pago: ent.treatAsPaid }
}

export async function GET(req: NextRequest) {
  const ctx = await contexto(req)
  if (ctx.erro) return ctx.erro
  const { userId, admin, alvo, balance, pago } = ctx
  if (!alvo || !admin) return resposta(null, null, balance, null)
  // `escrever: false` é a promessa desta metade: leitura NUNCA gasta.
  const t = await garantirTemporada(admin, userId, alvo, { escrever: false })
  return resposta(t, alvo, balance, custoDoEpisodio(alvo, pago))
}

export async function POST(req: NextRequest) {
  const ctx = await contexto(req)
  if (ctx.erro) return ctx.erro
  const { userId, admin, alvo, balance, pago } = ctx
  if (!alvo || !admin) return resposta(null, null, balance, null)
  const t = await garantirTemporada(admin, userId, alvo)
  return resposta(t, alvo, balance, custoDoEpisodio(alvo, pago))
}
