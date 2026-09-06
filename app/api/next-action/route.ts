import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { seriesContinuationHrefOrNull } from '@/lib/seriesContinuation'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { getEffectiveEntitlement, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'
import { getFreeTierOffer } from '@/lib/freeTierOffer'
import { countFreeFastUsage } from '@/lib/freeFastQuota'
import { COMPOSE_CLAIM_EVENT, COMPOSE_CLAIM_PATH } from '@/lib/composeClaim'
import { EVENT_SESSION_COOKIE } from '@/lib/growth/checkoutAuthSessionBridge'

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

// ═══ KINEO-TENTATIVA-PERDIDA-2026-09-06 — sprint-assinaturas #7 ════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (7 dias, contas externas, e-mails
// descartáveis fora): 29 pessoas apertaram gerar e NUNCA receberam filme, e
// 20 delas vieram do `chatgpt` — a fonte que o fechamento de 05/09 chamou de
// "o produto inteiro". Para comparar, só 4 pessoas do chatgpt não chegaram a
// ver o composer. O maior buraco do topo do funil não é gente que não aperta o
// botão: é gente que aperta e não sai nada.
//
// DEZOITO DAS 29 AINDA TÊM OS 25 CRÉDITOS DO TRIAL INTACTOS. Elas não gastaram
// e não desistiram do produto — o produto é que não respondeu.
//
// E O QUE ESTE ARQUIVO DIZIA A ELAS: `state` é decidido por `!ultimo` (nenhum
// filme entregue), então todas caíam em `first_film` → "Make your first film",
// apontando para um composer vazio. Algumas tentaram QUATRO vezes. É a mesma
// classe de defeito que a #1 arrancou deste arquivo hoje de madrugada: o
// contrato afirmando, para a coorte que ele existe para servir, algo que não é
// verdade.
//
// O MODO DE MORTE (traçado inteiro em `adebotedaniel05`, chatgpt, 06/09 02:11
// UTC): o autostart despachou o render às 02:11:49 e NOVE SEGUNDOS depois o
// quickstart do ChatGPT navegou a pessoa para /studio. O POST chegou ao
// servidor (`generation_dispatch_received` 02:11:58) e um checkpoint foi salvo
// — e depois disso não existe mais nada: sem erro, sem estorno, sem vídeo, sem
// cobrança. Doze das 15 pessoas invisíveis ao cron de recuperação têm este
// mesmo formato: analyzing → scripting → options → generating, e o rastro
// simplesmente acaba.
//
// TRÊS COISAS QUE ESTE ESTADO NÃO FAZ, e cada uma tem preço conhecido:
//
//  1. NÃO PEDE DESCULPA E NÃO DIZ "CONSERTADO". A lição do #5 de 02/09 é que
//     7 de 11 dessas falhas são o produto RECUSANDO com razão (roteiro curto
//     demais para a duração pedida). Mandar "foi um bug nosso e já está
//     resolvido" seria mentira em duas frentes — e quem clica, falha de novo e
//     aprende que a marca mente.
//  2. NÃO NOMEIA O FILME. A tabela `generations` está VAZIA para as 29: não há
//     tema para citar. Citar um seria a mesma classe de defeito da #1.
//  3. NÃO DECIDE NADA SOBRE DINHEIRO. Leitura pura, como o resto do arquivo.
//
// FAIL-CLOSED POR CONSTRUÇÃO: sem chave de serviço, sem tentativa legível, ou
// com a tentativa recente demais, o estado NÃO nasce e a resposta é
// exatamente a de antes. O lado seguro aqui é o silêncio — dizer "seu filme
// não saiu" para alguém cujo render ainda está rodando seria inventar um
// defeito que não existe.

/** Janela de decantação. Um render normal fecha em ~3-6 min e a varredura de
 *  encalhe (`stranded_compose_attempt`) resolve dentro da hora — medida em
 *  53 SEGUNDOS no caso vivo de 06/09 04:45 UTC. Aos 45 min, "não saiu" já é
 *  fato, não impaciência. */
const MINUTOS_ATE_PERDIDA = 45

/** Eventos que provam, PARA O SERVIDOR, que um despacho aconteceu. São três em
 *  pontos diferentes do caminho, e isso é de propósito: as 15 pessoas
 *  invisíveis ao cron de recuperação não têm `generate_failed` nem
 *  `generation_stage_error` — o navegador delas morreu antes de contar. */
const EVENTOS_DE_TENTATIVA = [
  'video_generation_started',
  'generation_dispatch_received',
  'activation_autostart_dispatched',
] as const

/** Instante da tentativa de despacho MAIS RECENTE, ou null quando não há
 *  tentativa OU quando não deu para verificar. Os dois casos devolvem null de
 *  propósito: sem prova, não há estado novo. */
async function ultimaTentativaDeDespacho(userId: string): Promise<Date | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Mesma razão de `vagasFastGratis`: `events` é service-role-only desde o
  // lockdown de 26/08. Com o cliente do usuário isto voltaria VAZIO — e vazio
  // aqui significaria "nunca tentou", que é justamente a mentira a corrigir.
  if (!url || !key) return null
  try {
    const admin = createServiceClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await admin
      .from('events')
      .select('created_at')
      .eq('user_id', userId)
      .in('name', EVENTOS_DE_TENTATIVA as unknown as string[])
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) return null
    const bruto = Array.isArray(data) && data[0] ? data[0].created_at : null
    if (!bruto) return null
    const quando = new Date(bruto as string)
    return Number.isFinite(quando.getTime()) ? quando : null
  } catch {
    return null
  }
}

/** Nomes PÚBLICOS dos motores (CLAUDE.md, decisão do fundador 15/08). O custo
 *  NÃO mora aqui de propósito — vem de `creditCostForDuration`. Esta lista
 *  responde "como se chama", nunca "quanto custa".
 *
 *  Seedance 2.5 fica FORA: está atrás do interruptor `S25_PUBLIC` e só contas
 *  internas o enxergam. Anunciar motor que a pessoa não pode escolher é a
 *  mesma mentira de vitrine, do lado contrário. */
const MOTORES: ReadonlyArray<{ quality: Quality; label: string; deeplink: string }> = [
  { quality: 'fast', label: 'Kineo 1', deeplink: 'fast' },
  { quality: 'cinematic_ai', label: 'Seedance 1.5', deeplink: 'seedance' },
  { quality: 'cinematic_kling', label: 'Kling 2.5', deeplink: 'kling' },
  { quality: 'cinematic_veo', label: 'Veo 3.1', deeplink: 'veo' },
  { quality: 'cinematic_h3', label: 'MiniMax H3', deeplink: 'h3' },
  { quality: 'cinematic_omni', label: 'Omni Flash', deeplink: 'omni' },
  { quality: 'cinematic_hollywood', label: 'Kling 3', deeplink: 'hollywood' },
]

// ═══ KINEO-SAIDA-BARATA-2026-09-06 — sprint-assinaturas #16 ════════════
//
// DUAS COISAS QUE O CHECKPOINT DA #15 MEDIU NA MESMA CAIXA, e as duas tiram do
// ar a ÚNICA saída que não custa dinheiro:
//
//  (a) `?engine=` FALAVA OUTRA LÍNGUA. Este arquivo mandava o motor acessível
//      para o link de continuação no vocabulário do COBRADOR (`cinematic_ai`),
//      e quem lê o parâmetro do outro lado (`GenerateClient.tsx:1300`) só
//      aceita o vocabulário da TELA
//      (`fast|seedance|kling|veo|sora|hollywood|h3|omni|s25`). Fora do `fast`,
//      onde as duas línguas coincidem por acidente, o desvio de motor era
//      descartado em silêncio: a pessoa chegava ao compositor com o motor caro
//      ainda selecionado — o mesmo que ela acabou de não poder pagar.
//
//  (b) A OFERTA BARATA ESTAVA SOLDADA AO LINK DE SÉRIE. `secondary` exigia
//      `hrefContinuar`, que só existe quando o último filme tem tema
//      aproveitável. Caso vivo, medido em produção (pessoa `940aa17d`,
//      2026-09-06 09:36 UTC): saldo 7, faltavam 8, `affordable: 1`,
//      `engine_offered: "fast"` gravados no PRÓPRIO `next_action_served` — o
//      servidor SABIA que existia filme que aquele saldo pagava — e a caixa
//      saiu com "See plans" e nada mais, dentro do `generate_upgrade_modal`.
//      Na superfície mais perto do dinheiro, a casa recolheu a alternativa
//      gratuita e a resposta virou pedágio.
//
// O CONSERTO NÃO INVENTA DESTINO NOVO: sem tema, o botão aponta para o mesmo
// compositor de sempre (`/studio/create`), carregando só o motor que o saldo
// paga. Nenhum preço, plano, oferta ou promessa muda; a regra K1 (a porta do
// plano existe em todos os estados) continua intacta, porque o primário do
// estado seco continua sendo `see_plans`.
const DEEPLINK_PADRAO_COMPOSITOR = '/studio/create'

/** Traduz o motor do vocabulário do cobrador (`Quality`) para o do deeplink da
 *  tela. Motor fora da lista devolve null e quem chama simplesmente não manda
 *  o parâmetro — link sem `?engine=` é o comportamento de sempre, nunca um
 *  parâmetro que a tela vai jogar fora. */
function deeplinkDoMotor(quality: Quality | null): string | null {
  if (!quality) return null
  return MOTORES.find((m) => m.quality === quality)?.deeplink ?? null
}

/** `videos.quality_mode` guarda o motor. Traduz para o nome público; motor
 *  desconhecido devolve null e a resposta simplesmente omite o rótulo — dizer
 *  "seu último filme" sem adjetivo é melhor que chutar o motor errado. */
function rotuloDoMotor(quality_mode: string | null | undefined): string | null {
  const q = (quality_mode ?? '').toString().trim()
  return MOTORES.find((m) => m.quality === q)?.label ?? null
}

export type EstadoProximaAcao = 'first_film' | 'attempt_lost' | 'dry' | 'can_continue'

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

    let state: EstadoProximaAcao = !ultimo
      ? 'first_film'
      : balance < ultimoCusto
        ? 'dry'
        : 'can_continue'

    // KINEO-TENTATIVA-PERDIDA-2026-09-06 — `first_film` responde a DUAS
    // pessoas muito diferentes: a que nunca tentou e a que tentou e nao
    // recebeu nada. So a segunda existe em 29 exemplares por semana, e so para
    // ela "Make your first film" e falso. A pergunta so e feita quando NAO ha
    // filme entregue — quem ja recebeu um filme nunca cai aqui, por
    // construcao, entao nenhum estado antigo muda de comportamento.
    let tentativaMinutos: number | null = null
    if (state === 'first_film') {
      const tentativa = await ultimaTentativaDeDespacho(user.id)
      if (tentativa) {
        const minutos = Math.floor((Date.now() - tentativa.getTime()) / 60000)
        // Minuto negativo = relogio do banco a frente do nosso (o incidente de
        // JWT-skew de 28/08 provou que isso acontece nesta casa). Tratar como
        // recente e o lado seguro: o estado nao nasce.
        if (minutos >= MINUTOS_ATE_PERDIDA) {
          state = 'attempt_lost'
          tentativaMinutos = minutos
        }
      }
    }

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
    // KINEO-SAIDA-BARATA-2026-09-06 (a) — o parâmetro viaja no vocabulário da
    // TELA. Antes saía `cinematic_ai` e era descartado em silêncio.
    const deeplinkAcessivel = deeplinkDoMotor(motorAcessivel)
    // KINEO-LINK-QUE-SABE-DIZER-NAO-2026-09-06 — a variante que devolve null.
    // `buildSeriesContinuationHref` devolve a string '/studio' quando o tema
    // nao monta prompt, e '/studio' e truthy: o `?? hrefBarato` logo abaixo
    // NUNCA rodava, e o evento ainda rotulava o caminho como 'series'. Era o
    // beco que engoliu o unico clique real do mecanismo na madrugada de 06/09.
    const hrefContinuar = tema
      ? seriesContinuationHrefOrNull(tema, 'next_action', {
          engine: state === 'dry' ? deeplinkAcessivel : null,
        })
      : null

    // KINEO-SAIDA-BARATA-2026-09-06 (b) — a saída barata quando NÃO há tema
    // para continuar. Mesmo compositor de sempre, carregando só o motor que o
    // saldo paga; `src` próprio para que o banco separe este caminho do de
    // quem tinha série.
    const hrefBarato = deeplinkAcessivel
      ? `${DEEPLINK_PADRAO_COMPOSITOR}?engine=${encodeURIComponent(deeplinkAcessivel)}&src=next_action_dry_cheap`
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
          : state === 'attempt_lost'
            ? {
                // Sem desculpa e sem promessa: os dois unicos fatos que sao
                // verdade para TODA a coorte — a tentativa nao virou filme e o
                // saldo continua onde estava. Nada aqui afirma de quem foi a
                // culpa, porque em boa parte dos casos o produto recusou com
                // razao (licao do #5 de 02/09, que proibiu a desculpa falsa).
                kind: 'retry_first_film' as const,
                href: '/studio/create?src=next_action_lost',
                label: 'Pick up your film',
                sublabel: `Your last attempt never finished. Your ${balance} credits are still here.`,
              }
            : state === 'can_continue'
              ? {
                  // KINEO-LINK-QUE-SABE-DIZER-NAO-2026-09-06 — este ramo so
                  // existe porque `hrefContinuar` agora pode ser null tendo
                  // filme entregue (tema degenerado). Antes desta rodada o
                  // codigo caia em 'make_first_film' e dizia "Make your first
                  // film" para quem JA tem filme — frase falsa, e a casa
                  // proibiu frase falsa no #5 de 02/09. Sem tema nao ha
                  // episodio 2 para prometer, entao o rotulo nao promete: leva
                  // ao compositor, que e verdade para qualquer um.
                  kind: 'make_next_film' as const,
                  href: '/studio/create?src=next_action_no_seed',
                  label: 'Make your next film',
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
    // KINEO-SAIDA-BARATA-2026-09-06 — a condição que decide agora é APENAS
    // "existe motor que o saldo paga". O link de série virou preferência, não
    // requisito: com tema, continua a própria história; sem tema, cai no
    // compositor com o motor certo já escolhido. O que NÃO pode voltar a
    // acontecer é a alternativa sumir tendo motor acessível na mão.
    const hrefAlternativa = motorAcessivel ? (hrefContinuar ?? hrefBarato) : null
    const secondary =
      state === 'dry' && hrefAlternativa && motorAcessivel
        ? {
            kind: 'continue_cheaper' as const,
            href: hrefAlternativa,
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
        // KINEO-SAIDA-BARATA-2026-09-06 — sem isto não dá para provar que a
        // perna nova pegou: `series` é quem tinha tema (comportamento antigo),
        // `composer` é exatamente a coorte que antes ficava SEM alternativa, e
        // `none` é o único caso honesto de caixa sem saída barata (nenhum motor
        // cabe no saldo). `engine_deeplink` mostra o parâmetro que a tela
        // realmente recebe.
        alternative_route:
          state !== 'dry' ? null
          : !motorAcessivel ? 'none'
          : hrefContinuar ? 'series'
          : 'composer',
        engine_deeplink: deeplinkAcessivel,
        // KINEO-PROXIMA-ACAO-HONESTA-2026-09-06 — sem estes três não dá para
        // provar que a correção pegou: `treat_as_paid` separa quem o contrato
        // antes classificava errado, e `free_slots` mostra quantas vezes a
        // oferta grátis foi (corretamente) retirada.
        treat_as_paid: ent.treatAsPaid,
        is_trial: ent.isTrial,
        free_slots: vagasConhecidas,
        // KINEO-TENTATIVA-PERDIDA-2026-09-06 — sem isto nao da para separar
        // "nunca tentou" de "tentou e nao saiu" no denominador, que e
        // exatamente a distincao que este estado existe para fazer.
        last_attempt_minutes: tentativaMinutos,
      },
      dedupeMinutes: 30,
      // ⚠️ KINEO-PROXIMA-ACAO-DENOMINADOR-2026-09-06 — ESTE EVENTO ESTAVA
      // CONTANDO MONTAGEM, NÃO PESSOA, e o defeito era meu.
      //
      // `writeServerEvent` só deduplica `if (dedupeMinutes > 0 && sessionId)`
      // (lib/serverEvents.ts:53). Este `sid` vinha SÓ da query string, e
      // nenhuma das três montagens do cartão o envia — então `sessionId` era
      // null, o dedupe de 30 min NUNCA rodava, e cada montagem virava uma
      // linha nova.
      //
      // MEDIDO NA PRIMEIRA PESSOA REAL que o contrato serviu (06/09 06:09→06:11
      // UTC): **1 pessoa, 5 eventos em 2m15s**, todos `first_film`, todos com
      // `session_id` nulo. Lido de fora, `next_action_served = 5` parece cinco
      // pessoas servidas. Era uma.
      //
      // Por que isso é grave e não cosmético: este evento é o DENOMINADOR do
      // degrau que este ciclo inteiro existe para mover. Denominador inflado
      // por re-montagem faz qualquer taxa de clique despencar sem nada ter
      // piorado — e a casa já perdeu rotações lendo número assim.
      //
      // A cura lê o id da sessão do COOKIE que o próprio cliente já mantém
      // (`kineo_event_session_id`, escrito por `eventSessionId()` em
      // lib/analytics com Path=/), então vale para TODA montagem — inclusive
      // as da outra sessão — sem nenhuma delas mudar uma linha. A query string
      // continua tendo precedência para quem quiser mandar explícito.
      //
      // Falha aberta de propósito: visitante cujo cookie ainda não existe cai
      // em `null` e o evento é escrito. Perder dedupe é barato; perder o
      // evento seria caro.
      sessionId:
        req.nextUrl.searchParams.get('sid')
        ?? req.cookies.get(EVENT_SESSION_COOKIE)?.value
        ?? null,
    })

    return NextResponse.json({
      ok: true,
      state,
      balanceKnown: true,
      balance,
      filmsDelivered: lista.length,
      // Idade em minutos da tentativa que nao virou filme; null em todo estado
      // que nao seja `attempt_lost`. A tela NAO precisa dele para decidir quem
      // ve (quem decide e o `state`) — ele existe para medir e depurar.
      lastAttemptMinutes: tentativaMinutos,
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
