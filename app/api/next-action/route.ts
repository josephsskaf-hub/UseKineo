import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { buildSeriesContinuationHref } from '@/lib/seriesContinuation'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import { getFreeTierOffer } from '@/lib/freeTierOffer'
import { countFreeFastUsage } from '@/lib/freeFastQuota'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'

// ═══ KINEO-PROXIMA-ACAO-2026-09-05 — sprint-assinaturas #7 (J5 reapontada) ══
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (marco 03/09 16:00 UTC, contas externas):
//   44 pessoas entregaram um filme. 21 delas ficaram com saldo MENOR que o
//   preço do filme que acabaram de fazer. Dessas 21, UMA chegou ao checkout.
//
// Onze estão exatamente no mesmo ponto: trial de 25, um Seedance de 15, sobram
// 10 — e o próximo filme do MESMO motor custa 15. Outras três estão a UM
// crédito do próximo filme (pagaram 13, sobraram 12). Não é gente desistindo
// do produto: é gente que acabou de gostar dele e bateu numa parede que não
// diz o próprio nome.
//
// O QUE A CASA FAZIA NESSE MOMENTO: nada. O saldo existe no canto da tela, o
// preço do motor existe no /studio, e ninguém nunca junta os dois números na
// frente da pessoa. Ela clica em gerar de novo, o modal de upgrade aparece
// como recusa (`upgrade_modal_opened` reason=trial_spent) e a conversa começa
// por "não". O fechamento do ciclo de 8h mediu o outro lado disso: 13 pessoas
// fizeram 2+ filmes e ZERO viram a tela de plano. O degrau 1→2 foi trabalhado
// seis rotações seguidas; este, o de 2+ → pagar, nunca foi.
//
// A INVERSÃO, e é toda a peça: em vez de esperar a pessoa esbarrar na recusa,
// o servidor RESPONDE, antes do clique, o que ela pode fazer agora — com os
// dois números na mão. "Seu último filme (Seedance 1.5) custou 15 créditos.
// Você tem 10." Depois disso, dois caminhos honestos: o motor que o saldo
// AINDA paga (o Kineo 1 quase sempre cabe) e a porta do plano.
//
// TRÊS REGRAS QUE VIERAM DIRETO DOS DADOS E DAS REGRAS DA CASA:
//
//  1. O PREÇO NÃO É INVENTADO. O "quanto custa o próximo" é o `credits_used`
//     que a pessoa LITERALMENTE acabou de pagar, lido do banco. Nada de tabela
//     paralela que envelhece: a classe de defeito "copy que mente" (CLAUDE.md,
//     achado 4 da auditoria de 28/08) nasce exatamente de preço recalculado
//     longe da fonte. Para as ALTERNATIVAS, o custo vem de
//     `creditCostForDuration`, que é a fonte única do cobrador — mesma função,
//     mesmo `isPaidUser`, mesma duração do filme que ela acabou de fazer.
//
//  2. REGRA K1 DO CICLO: a porta do plano NUNCA depende de ter filme ou
//     roteiro. Ela é devolvida em TODOS os estados, inclusive para quem nunca
//     entregou nada. Os 2 checkouts do ciclo vieram de contas com 0 filmes —
//     bloquear essa porta atrás de um render seria fechá-la na cara de quem
//     mais a procura.
//
//  3. ISTO NÃO CONCEDE, NÃO COBRA E NÃO ENVIA NADA. É leitura pura + um
//     evento. Nenhum crédito muda de mão, nenhum e-mail sai, nenhum preço é
//     alterado. O que a pessoa faz com a resposta é o fluxo normal, cobrado
//     normalmente.
//
// A TELA É DA OUTRA PISTA. Este arquivo devolve JSON e nada mais — o desenho
// do cartão é PEDIDO ao Codex (escopo de 05/09). Enquanto a tela não existe, o
// contrato já serve para medir: `next_action_served` passa a dar denominador
// ao degrau que hoje é 21 → 1.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Espelho do predicado do cobrador (`/api/generate-video-cinematic`, L1476).
 *  Se estes dois divergirem, o contrato passa a anunciar um preço que a
 *  cobrança não pratica — que é a definição do defeito da regra 1. */
const PAID_PLANS = new Set([
  'starter', 'starter_trial', 'basic', 'basic_trial',
  'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',
])

// ═══ KINEO-PROXIMA-ACAO-HONESTA-2026-09-06 — sprint-assinaturas #1 ══════════
//
// A REGRA 1 DESTE ARQUIVO ("o preço não é inventado") ESTAVA QUEBRADA NO
// PRÓPRIO ARQUIVO, e quebrada exatamente para a coorte que ele existe para
// servir. Medido em produção hoje, antes de qualquer linha deste commit:
//
//   · 798 das 803 contas com trial vivem em `plan='free'` e `has_paid=false`.
//     Para todas elas o `isPaidUser` acima (PAID_PLANS + has_paid) dá FALSE.
//   · `creditCostForDuration('fast', false, s)` devolve 0 — então este
//     contrato anunciava "Continue with Kineo 1 · 0 credits" para elas.
//   · Mas quem cobra é `/api/compose`, e lá o predicado é OUTRO:
//     `isFreePlanFast = isFreePlan && !hasPaid && !ent.isTrial` (L1668).
//     Com trial ATIVO, `ent.isTrial` é true, o render segue o caminho PAGO e
//     o Kineo 1 custa `creditCostForDuration('fast', TRUE, duration)` = 5+.
//
// Ou seja: o contrato prometia 0 e a casa cobrava 5, para a pessoa que já
// estava sem saldo. É a classe "copy que mente" do achado 4 da auditoria de
// 28/08 — a mesma que este arquivo citava no cabeçalho enquanto a cometia.
//
// A CAUSA ESTRUTURAL: `isPaidUser` era um TERCEIRO predicado, redigitado aqui.
// A cura não é consertar o cálculo — é parar de ter um cálculo. Agora este
// arquivo lê `getEffectiveEntitlement()`, a MESMA função de onde o compose
// tira o `ent`, e usa `treatAsPaid` (≡ `!isFreePlanFast` para plano free).
//
// E VEM UMA SEGUNDA VERDADE JUNTO, que nenhum dos dois lados dizia à pessoa:
// quando o Kineo 1 sai mesmo de graça (trial já encerrado), ele NÃO é
// ilimitado. Com o reverse trial LIGADO — e ele está ligado em produção, o
// evento `free_duration_clamped` disparou 9 vezes em 30 dias — o free tier dá
// 1 Fast por 30 dias e corta o filme em 15 segundos. Oferecer "de graça" sem
// dizer isso seria trocar uma mentira de preço por uma mentira de entrega.
//
// FALHA FECHADA: se a cota não puder ser VERIFICADA (sem service key, erro de
// banco), o Kineo 1 grátis simplesmente não é oferecido. O lado que erra
// prometendo é o único lado caro aqui — a pessoa já levou um "não" hoje.
const QUOTA_INDISPONIVEL = Symbol('quota-indisponivel')

/** Vagas restantes do Fast grátis na janela do FREE_OFFER, contadas com a
 *  MESMA fonte do compose (`lib/freeFastQuota.ts`: reservas + vídeos, com
 *  dedupe por render_id). Devolve o símbolo quando não deu para verificar. */
async function vagasFastGratis(userId: string): Promise<number | typeof QUOTA_INDISPONIVEL> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  // `events` é service-role-only desde o lockdown de 26/08: com o cliente do
  // usuário esta contagem voltaria VAZIA e viraria "cota livre" — o lado que
  // promete. Sem chave, não há verificação, e sem verificação não há oferta.
  if (!url || !key) return QUOTA_INDISPONIVEL
  const offer = getFreeTierOffer()
  const since = new Date(Date.now() - offer.windowMs).toISOString()
  try {
    const admin = createServiceClient(url, key, { auth: { persistSession: false } })
    const [claims, videos] = await Promise.all([
      admin
        .from('events')
        .select('id,metadata,created_at')
        .eq('user_id', userId)
        .eq('name', COMPOSE_CLAIM_EVENT)
        .eq('path', COMPOSE_CLAIM_PATH)
        .eq('metadata->>quality', 'fast')
        .eq('metadata->>cost', '0')
        .gte('created_at', since),
      admin
        .from('videos')
        .select('id,render_id,quality_mode,credits_used,created_at')
        .eq('user_id', userId)
        .eq('quality_mode', 'fast')
        .eq('credits_used', 0)
        .gte('created_at', since),
    ])
    if (claims.error || videos.error) return QUOTA_INDISPONIVEL
    const usados = countFreeFastUsage({
      claims: claims.data ?? [],
      videos: videos.data ?? [],
      defaultUserId: userId,
      // Mesma escolha do compose: linha sem dono aqui significa query mudada
      // por baixo, e numa contagem de cota isso não pode virar zero em
      // silêncio — zero é o lado que ABRE a cota.
      onUnknownUser: 'throw',
    }).get(userId) ?? 0
    return Math.max(0, offer.limit - usados)
  } catch {
    return QUOTA_INDISPONIVEL
  }
}

/** Nomes PÚBLICOS dos motores (CLAUDE.md, decisão do fundador 15/08). O custo
 *  NÃO mora aqui de propósito — vem de `creditCostForDuration`. Esta lista
 *  responde "como se chama", nunca "quanto custa".
 *
 *  Seedance 2.5 fica FORA: está atrás do interruptor `S25_PUBLIC` e só contas
 *  internas o enxergam. Anunciar motor que a pessoa não pode escolher é a
 *  mesma mentira de vitrine, do lado contrário. */
const MOTORES: ReadonlyArray<{ quality: Quality; label: string }> = [
  { quality: 'fast', label: 'Kineo 1' },
  { quality: 'cinematic_ai', label: 'Seedance 1.5' },
  { quality: 'cinematic_kling', label: 'Kling 2.5' },
  { quality: 'cinematic_veo', label: 'Veo 3.1' },
  { quality: 'cinematic_h3', label: 'MiniMax H3' },
  { quality: 'cinematic_omni', label: 'Omni Flash' },
  { quality: 'cinematic_hollywood', label: 'Kling 3' },
]

/** `videos.quality_mode` guarda o motor. Traduz para o nome público; motor
 *  desconhecido devolve null e a resposta simplesmente omite o rótulo — dizer
 *  "seu último filme" sem adjetivo é melhor que chutar o motor errado. */
function rotuloDoMotor(quality_mode: string | null | undefined): string | null {
  const q = (quality_mode ?? '').toString().trim()
  return MOTORES.find((m) => m.quality === q)?.label ?? null
}

export type EstadoProximaAcao = 'first_film' | 'dry' | 'can_continue'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      // As colunas de trial entram porque `getEffectiveEntitlement` decide a
      // partir delas. Esquecer UMA falha em silêncio e do lado caro (sem
      // `trial_ends_at` o relógio é lido como vencido) — mesma razão pela qual
      // o compose usa a constante compartilhada em vez de redigitar a lista.
      .select(`video_credits, plan, has_paid, ${TRIAL_ENTITLEMENT_COLUMNS}`)
      .eq('id', user.id)
      .maybeSingle()

    // Saldo desconhecido NÃO é saldo zero. A rodada #1 deste mesmo sprint
    // mandou 22 de 26 e-mails "você está sem crédito" para gente COM crédito
    // porque `null` foi lido como 0. Aqui, sem perfil legível, o contrato se
    // recusa a classificar: devolve `unknown` e nenhuma das duas portas mente.
    if (!profile || typeof profile.video_credits !== 'number') {
      return NextResponse.json({
        ok: true,
        state: null,
        balanceKnown: false,
        // A porta do plano sobrevive à ignorância (regra K1): ela não depende
        // de saber o saldo.
        primary: {
          kind: 'see_plans',
          href: '/pricing?src=next_action_unknown',
          label: 'See plans',
          sublabel: null,
        },
      })
    }

    const balance = Math.max(0, Math.floor(profile.video_credits))
    const planVal = (profile.plan ?? 'free').toString()
    const isPaidAccount = profile.has_paid === true || PAID_PLANS.has(planVal)
    // KINEO-PROXIMA-ACAO-HONESTA-2026-09-06 — o predicado do COBRADOR, não um
    // terceiro. `treatAsPaid = isPaidAccount || isTrial` é, para plano free,
    // exatamente `!isFreePlanFast` do compose (L1668). Passo o predicado local
    // em `isPaidAccount` como manda a invariante 1 de lib/reverseTrial.ts.
    const ent = getEffectiveEntitlement(profile, { isPaidAccount })
    const isPaidUser = ent.treatAsPaid

    const { data: filmes } = await supabase
      .from('videos')
      .select('topic, title, quality_mode, credits_used, duration_seconds, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)

    const lista = Array.isArray(filmes) ? filmes : []
    const ultimo = lista[0] ?? null

    // ── Estado ────────────────────────────────────────────────────────────
    // `credits_used` é o preço que a pessoa PAGOU pelo filme mais recente —
    // não uma reconstrução. Filme de 0 crédito (Kineo 1 no plano gratuito)
    // nunca deixa ninguém seco: 0 sempre cabe em qualquer saldo.
    const ultimoCusto =
      ultimo && typeof ultimo.credits_used === 'number' && ultimo.credits_used > 0
        ? Math.floor(ultimo.credits_used)
        : 0
    const segundos =
      ultimo && typeof ultimo.duration_seconds === 'number' && ultimo.duration_seconds > 0
        ? ultimo.duration_seconds
        : 60

    const state: EstadoProximaAcao = !ultimo
      ? 'first_film'
      : balance < ultimoCusto
        ? 'dry'
        : 'can_continue'

    // Alternativas: motores que o saldo AINDA paga, na MESMA duração do filme
    // que a pessoa acabou de fazer (comparar 90s com 35s daria um "cabe" que a
    // cobrança depois desmente). Custo sempre da fonte única.
    // KINEO-PROXIMA-ACAO-HONESTA-2026-09-06 — no caminho GRÁTIS o Kineo 1 custa
    // 0, mas 0 não quer dizer "à vontade": o free tier dá `offer.limit` Fast por
    // janela e corta o filme em `maxDurationSeconds`. As duas coisas são
    // verificadas ANTES de o motor virar oferta.
    const ofertaFree = getFreeTierOffer()
    const noCaminhoGratis = !ent.treatAsPaid
    const vagas = noCaminhoGratis ? await vagasFastGratis(user.id) : null
    const vagasConhecidas = typeof vagas === 'number' ? vagas : null
    // Fail-closed: cota não verificada = Kineo 1 grátis não é oferecido.
    const fastGratisDisponivel = noCaminhoGratis ? vagasConhecidas !== null && vagasConhecidas > 0 : true

    const acessiveis = MOTORES.map((m) => ({
      engine: m.quality,
      label: m.label,
      cost: creditCostForDuration(m.quality, isPaidUser, segundos),
      // O filme sai com este teto de segundos, e a tela precisa poder dizê-lo.
      // null = sem corte (é o caso de todo motor pago e de toda conta paga).
      maxSeconds: m.quality === 'fast' ? ent.maxDurationSeconds : null,
    }))
      .filter((m) => m.cost <= balance)
      .filter((m) => (m.engine === 'fast' ? fastGratisDisponivel : true))
      .sort((a, b) => b.cost - a.cost) // o melhor que o saldo paga vem primeiro

    const tema = (ultimo?.topic ?? ultimo?.title ?? null) as string | null
    const motorAcessivel = acessiveis.length > 0 ? acessiveis[0].engine : null

    // O link de continuar já sabe rebaixar o motor quando quem chama PROVA que
    // o saldo não cobre (sprint-retencao #2). Aqui a prova existe: só passamos
    // `engine` no estado seco, e só o motor que acabou de passar no filtro.
    const hrefContinuar = tema
      ? buildSeriesContinuationHref(tema, 'next_action', {
          engine: state === 'dry' ? motorAcessivel : null,
        })
      : null

    const shortBy = state === 'dry' ? Math.max(0, ultimoCusto - balance) : 0
    const rotulo = rotuloDoMotor(ultimo?.quality_mode)

    // ── A frase ───────────────────────────────────────────────────────────
    // Os dois números, juntos, sem adjetivo e sem promessa. Nada aqui afirma o
    // que um plano contém — preço e oferta são decisão do fundador e este
    // arquivo não os toca.
    const sublabel =
      state === 'dry'
        ? `Your last film${rotulo ? ` (${rotulo})` : ''} cost ${ultimoCusto} credits. You have ${balance}.`
        : null

    const primary =
      state === 'dry'
        ? {
            kind: 'see_plans' as const,
            href: '/pricing?src=next_action_dry',
            label: 'See plans',
            sublabel,
          }
        : state === 'can_continue' && hrefContinuar
          ? {
              kind: 'continue_series' as const,
              href: hrefContinuar,
              label: 'Build the next episode',
              sublabel: null,
            }
          : {
              kind: 'make_first_film' as const,
              href: '/studio/create',
              label: 'Make your first film',
              sublabel: null,
            }

    // Secundário no estado seco: o filme que o saldo AINDA paga. Existir uma
    // saída que não custa dinheiro é o que impede a resposta de virar pedágio.
    const secondary =
      state === 'dry' && hrefContinuar && motorAcessivel
        ? {
            kind: 'continue_cheaper' as const,
            href: hrefContinuar,
            label: `Continue with ${acessiveis[0].label}`,
            cost: acessiveis[0].cost,
          }
        : state !== 'dry'
          ? {
              kind: 'see_plans' as const,
              href: '/pricing?src=next_action_side',
              label: 'See plans',
              cost: null,
            }
          : null

    // Denominador. Sem isto o degrau "bateu na parede → achou a porta" continua
    // sendo 21 → 1 sem ninguém conseguir provar que mudou.
    void writeServerEvent({
      name: 'next_action_served',
      userId: user.id,
      metadata: {
        state,
        balance,
        last_cost: ultimoCusto,
        short_by: shortBy,
        films_delivered: lista.length,
        affordable: acessiveis.length,
        engine_offered: motorAcessivel,
        // KINEO-PROXIMA-ACAO-HONESTA-2026-09-06 — sem estes três não dá para
        // provar que a correção pegou: `treat_as_paid` separa quem o contrato
        // antes classificava errado, e `free_slots` mostra quantas vezes a
        // oferta grátis foi (corretamente) retirada.
        treat_as_paid: ent.treatAsPaid,
        is_trial: ent.isTrial,
        free_slots: vagasConhecidas,
      },
      dedupeMinutes: 30,
      sessionId: req.nextUrl.searchParams.get('sid'),
    })

    return NextResponse.json({
      ok: true,
      state,
      balanceKnown: true,
      balance,
      filmsDelivered: lista.length,
      shortBy,
      lastFilm: ultimo
        ? { engine: ultimo.quality_mode ?? null, engineLabel: rotulo, cost: ultimoCusto, seconds: segundos }
        : null,
      affordable: acessiveis,
      // KINEO-PROXIMA-ACAO-HONESTA-2026-09-06 — a verdade do free tier, para a
      // tela poder escrevê-la em vez de deduzi-la. `null` quando a conta não
      // está no caminho grátis (paga ou em trial): não há teto nem cota.
      freeTier: noCaminhoGratis
        ? {
            clampSeconds: ent.maxDurationSeconds,
            slotsLeft: vagasConhecidas,
            limit: ofertaFree.limit,
            windowHours: Math.round(ofertaFree.windowMs / 3600000),
          }
        : null,
      primary,
      secondary,
    })
  } catch (e) {
    console.error('[next-action]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
