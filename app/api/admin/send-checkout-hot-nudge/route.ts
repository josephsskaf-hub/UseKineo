import { readAll } from '@/lib/supabase/readAll'
// ═══ KINEO-SILENCIO-QUENTE-2026-09-07 — rotina FECHAR A VENDA, rotação #4 ═══
//
// O NÚMERO QUE MANDOU ESCREVER ISTO (medido 07/09 ~17:35 BRT, contas externas,
// 30 dias, contando PESSOAS):
//
//   · `checkout_started` .................................... 107 pessoas
//   · dessas, `payment_success` ............................. 6
//   · não pagaram ........................................... 101
//   · **horas até a casa dizer QUALQUER COISA a essas 101: 27** (média)
//   · e 19 delas nunca receberam carta nenhuma.
//
// Vinte e sete horas. A pessoa aperta "comprar", chega na página de pagamento
// da Stripe, não conclui — e a casa, que sabe disso no mesmo segundo, leva
// mais de um dia para abrir a boca. Não por descuido: por ARQUITETURA. A única
// carta desta coorte (`send-checkout-recovery`, #13 de 06/09) espera o evento
// `checkout.session.expired`, e a sessão da casa vive **24 horas**
// (KINEO-CHECKOUT-24H-2026-08-30). Some-se o cron dela, que roda duas vezes ao
// dia, e o piso é ~24h+ antes de qualquer palavra. Medido em regime: das 3
// sessões que expiraram DEPOIS daquela rota nascer, **0 receberam carta** — ela
// drenou o passivo de 18 dias em 06/09 e ainda não pegou um caso novo.
//
// ESTA ROTA NÃO ESPERA A SESSÃO MORRER. Ela fala com a pessoa **30 minutos**
// depois do clique de comprar, enquanto a página de pagamento dela ainda está
// VIVA — e é justamente por estar viva que a carta pode fazer a única promessa
// que vale: *o teu link continua de pé, não precisas escolher nada de novo.*
//
// ⛔ A PARADA, herdada da #13 e endurecida aqui: **se a Stripe não devolver uma
// sessão `open` com `url` viva, a pessoa NÃO recebe a carta.** Sessão paga,
// expirada, cancelada ou irrespondível = silêncio. O link é a promessa inteira;
// sem ele isto viraria mais um "volte pra gente", que é exatamente a classe de
// e-mail que a casa já mandou demais (memória `carta-nova-so-depois-da-velha-mover`).
//
// POR QUE ISSO NÃO CONTRARIA A CONCLUSÃO FECHADA DO FUNDADOR (19/08 — "o
// vazamento do checkout é PREÇO", estudo repetido, não reabrir): a carta **não
// cria preço, cupom nem desconto**. O botão da mesma página reabre a MESMA
// sessão, mesmo plano, mesmo valor que a pessoa já aceitou ver; e a oferta que
// ela pode levar (desde 08/10) é a de boas-vindas que o modal da home já faz a
// todo visitante, nunca uma nova. (Até 08/10 uma segunda linha nomeava o trial
// de $1 por 7 dias no Creator — ver o bloco KINEO-RESGATE-PAGAMENTO-2026-10-08
// logo abaixo: aquela porta morreu em 09/09 e a carta continuou prometendo.)
//
// PRECEDÊNCIA (memória `cron-no-mesmo-minuto-nao-tem-ordem`): esta carta e a de
// sessão expirada falam do MESMO momento e se excluem nos dois sentidos — o
// carimbo desta entra em `OUTRAS_CAMPANHAS` da #13 no mesmo commit. Quem levou
// a carta quente não leva a de expiração, e vice-versa. O cron roda em
// `6,21,36,51`, longe dos minutos :00/:30 das outras campanhas de checkout.
//
// ═══ KINEO-RESGATE-PAGAMENTO-2026-10-08 — a carta quente parou de prometer uma porta morta ═══
//
// A AUDITORIA (08/10, produção, só leitura, contas internas fora, 30 dias, por PESSOA):
//   · 59 pessoas com conta apertaram comprar e não pagaram — as 59 receberam ao menos uma carta de resgate, 55
//     receberam duas: esta (44, 31–45 min depois do clique, mediana 37), a da sessão expirada
//     (admin/send-checkout-recovery, 13) e a do cron/send-recovery (57, ~24 h depois, kind 'checkout_recovery' no
//     email_send_log). A carta EXISTE e DISPARA; construir uma sétima seria fabricar volume.
//   · O defeito estava DENTRO desta: o trial de $1 morreu em 09/09 21:14 UTC (65cd0c95, o interruptor do trial de
//     cartão em lib/checkoutPricing ficou desligado; o checkout ignora ?trial=1) e 41 dos 45 envios dos últimos 30
//     dias saíram depois disso prometendo o Creator a um dólar por sete dias, "then 29.9/month" — oferta que o
//     cobrador recusa e preço sem cifrão.
//   · Na história: 0 pagamentos depois desta carta (45) e da de expiração (49); 1 depois do cron/send-recovery (121).
//     Os 9 pagantes de 30 dias pagaram 0–5 min depois de abrir a sessão que pagaram. O WELCOME20 vendeu 1 Creator (28/09).
//
// O QUE MUDOU (decisão do fundador de 08/10: resgate com o WELCOME20 só para quem tem direito):
//   1. Sai a promessa do trial de $1. No lugar, para quem tem direito, a oferta de boas-vindas que JÁ é pública
//      (modal "Your first month is 20% off", código WELCOME20, cupom KINEO_WELCOME20, 20% só no 1º mês): um clique
//      de volta ao MESMO plano, mensal, com o código que o próprio checkout verifica e aplica (caminho logado ou compra
//      sem login). Direito = `decidirBoasVindas`: has_paid PROVADO false, Creator/Studio mensal (o recorte de
//      guestWelcomePromoShapeOk, o mesmo do checkout), origem 'standard', sessão SEM desconto nenhum (não acumula) e o
//      código conferido na Stripe AGORA (loadGuestWelcomePromoCandidate + publicPromoVerificationFailure). Quem não
//      tem direito recebe a carta de sempre, sem oferta. Um interruptor só: HOT_NUDGE_WELCOME20_LIVE.
//   2. Quem cai fora ganha uma linha `checkout_hot_nudge_skipped_v1` com o motivo (id determinístico por sessão ×
//      motivo: o cron de 15 em 15 min não duplica), só no envio de verdade — o ensaio não grava nada. Inclui a compra
//      sem login: a Stripe não devolve o e-mail de quem abandona sem consentimento promocional, e esse consentimento só
//      existe para empresa E cliente nos EUA (a conta da casa é brasileira) — o pulo 'convidado_sem_email' é a medida
//      desse buraco, não um defeito desta rota.
//   3. O envio grava a versão da carta e a decisão da oferta (EMAIL_VERSION, welcome20_offered, welcome20_reason).
// O QUE NÃO MUDOU, de propósito: a janela de 30 min–6 h, o carimbo de uma carta por pessoa NA VIDA (guardião
// test-hot-nudge-janela-campanhas), as exclusões, a supressão de 24 h, o teto de 30 e o cron com confirm=SEND.
//
// MODOS (GET):
//   (sem params)           → DRY RUN: quem receberia, e quem caiu fora e por quê. Não grava nada.
//   ?confirm=SEND&limit=N  → envia para os próximos N (default 30, teto 30) e grava enviados e pulados.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { pickMomentumTopic } from '@/lib/momentumTopic'
import { WELCOME20_PERCENT_OFF, WELCOME20_PROMOTION_CODE, publicPromoVerificationFailure } from '@/lib/growth/publicPromoTruth'
import { guestWelcomePromoShapeOk } from '@/lib/growth/guestCheckout'
import { deterministicEventUuid, loadGuestWelcomePromoCandidate } from '@/lib/stripe/guestCheckout'

export const maxDuration = 300
export const dynamic = 'force-dynamic'
// Ver KINEO-DATA-CACHE-2026-09-02: rota só-GET no Next 14.2 nasce com
// revalidate=false e leria o banco congelado para sempre.
export const fetchCache = 'force-no-store'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Joseph at Kineo <joseph@usekineo.com>'
const REPLY_TO = 'joseph@usekineo.com'
const SENT_EVENT = 'checkout_hot_nudge_emailed_v1'
const SITE = 'https://www.usekineo.com'
const ROTA = '/api/admin/send-checkout-hot-nudge'

/** KINEO-RESGATE-PAGAMENTO-2026-10-08 — quem caiu fora, e por quê. Só no envio de verdade; o ensaio não grava. */
export const SKIP_EVENT = 'checkout_hot_nudge_skipped_v1'
/** A versão da carta, gravada no envio: separa no banco a carta que prometia o trial de $1 (morto em 09/09) desta. */
export const EMAIL_VERSION = 'hot_nudge_v2_welcome20'
/** INTERRUPTOR ÚNICO da oferta de boas-vindas nesta carta. false = a carta sai sem oferta nenhuma (só a mesma página). */
export const HOT_NUDGE_WELCOME20_LIVE = true
/** A campanha que o clique leva até a Stripe (checkout_started.intent_campaign): é por ela que se mede quem voltou. */
export const WELCOME20_INTENT_CAMPAIGN = 'checkout_hot_nudge_welcome20'

/** A JANELA, e ela é o produto inteiro desta rota.
 *
 *  Piso de 30 minutos: menos que isso e a carta chega enquanto a pessoa ainda
 *  está digitando o cartão — seria a casa atropelando a própria venda.
 *  Teto de 6 horas: passado isso o momento esfriou e a coorte passa a ser da
 *  carta de expiração, que tem o link de recuperação e o texto certo para
 *  quem já desistiu. O cron de 15 em 15 minutos varre a janela inteira várias
 *  vezes; o carimbo vitalício garante uma carta por pessoa. */
export const JANELA_MIN_MINUTOS = 30
export const JANELA_MAX_MINUTOS = 360

/** Ninguém entra em duas campanhas — regra da casa desde o send-made-video-today.
 *  `checkout_recovery_emailed_v1` e `checkout_rescue_emailed_v1` estão aqui de
 *  propósito: são cartas sobre ESTE mesmo momento. */
const OUTRAS_CAMPANHAS = [
  'checkout_recovery_emailed_v1',
  'checkout_rescue_emailed_v1',
  'checkout30_emailed_v1',
  'card_declined_emailed_v1',
  'made_video_today_emailed_v1',
  'india_price_emailed_v1',
  'comeback50_emailed_v1',
  'hot_upsell_sent',
  'next_episode_wall_emailed_v1',
  'season_letter_emailed_v1',
]

/** ⛔ NUNCA escrever para estes (limite explícito do ciclo de 06/09). */
/**
 * A regra "ninguém entra em duas campanhas" TEM PRAZO — desde va-r15 (08/09).
 *
 * ERRADO ATÉ AQUI: `OUTRAS_CAMPANHAS` era consultada sem nenhum limite de
 * tempo, então uma `season_letter` de agosto calava PARA SEMPRE a carta que
 * fala em 30 minutos. Medido no banco em 08/09: das 99 pessoas com nome que
 * bateram no checkout em 30 dias, **74 (75%) estavam excluídas para sempre** —
 * sobravam 25. A carta genérica e antiga vencia a carta rara e quente, que é
 * exatamente a doença da memória `supressao-sem-precedencia-cala-a-carta-boa`.
 *
 * A regra continua valendo onde ela protege: quem recebeu OUTRA campanha nos
 * últimos 7 dias continua fora, porque aí a caixa de entrada dela é nossa de
 * verdade. O que morre é a exclusão eterna.
 *
 * Isto NÃO afrouxa nenhuma das outras travas: a supressão de 24h da casa, o
 * `SENT_EVENT` 1×-para-sempre, o opt-out, os bloqueados e o filtro de pagante
 * seguem intactos e sem prazo.
 */
export const OUTRAS_CAMPANHAS_JANELA_DIAS = 7

/** Pura e exportada: o guardião prova a fronteira, não a existência da constante. */
export function corteOutrasCampanhas(agoraMs: number, dias: number = OUTRAS_CAMPANHAS_JANELA_DIAS): string {
  return new Date(agoraMs - dias * 24 * 60 * 60 * 1000).toISOString()
}

const BLOQUEADOS = ['den.higgins', 'noelrss21', 'emiliomontinari', 'akajitin']

const DISPOSABLE = ['mailinator', 'yopmail', 'tempmail', 'hutdot.com', 'beiwoh.com', 'playboot.com', 'skyprofy.com', 'gouziben.com', 'joystill.com', 'lanvos.com', 'minitts.net', 'dysonc.com', 'guerrillamail', 'sharklasers', 'getnada', 'maildrop', 'trashmail', '10minutemail', 'dispostable', 'fakeinbox', 'temp-mail']
function isJunk(email: string): boolean {
  const e = email.toLowerCase()
  if (!e.includes('@') || e.endsWith('@')) return true
  if (e.startsWith('josephsskaf') || e.startsWith('josephskaf') || e.endsWith('@shortsforgeai.com')) return true
  return DISPOSABLE.some((d) => e.includes(d))
}
function isBloqueado(email: string): boolean {
  const e = email.toLowerCase()
  return BLOQUEADOS.some((b) => e.includes(b))
}

/** Quem sai da lista pelo PERFIL, e por quê — a mesma ordem de sempre (pagante → opt-out → e-mail → bloqueado).
 *  Pura e exportada: o guardião executa a tabela-verdade, e o motivo vira o evento de pulo. */
export function motivoDoPerfil(p: {
  has_paid?: boolean | null
  email_opted_out?: boolean | null
  email?: string | null
}): 'pagante' | 'optout' | 'email_invalido_ou_interno' | 'bloqueado' | null {
  const e = p.email ?? ''
  if (p.has_paid === true) return 'pagante'
  if (p.email_opted_out === true) return 'optout'
  if (!e || isJunk(e)) return 'email_invalido_ou_interno'
  if (isBloqueado(e)) return 'bloqueado'
  return null
}

function tituloDoFilme(title: string | null | undefined, topic: string | null | undefined): string | null {
  return pickMomentumTopic(title) ?? pickMomentumTopic(topic)
}
function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ─── A oferta de boas-vindas (KINEO-RESGATE-PAGAMENTO-2026-10-08) ─────────────────────────────────────────────────
export type MotivoSemBoasVindas =
  | 'oferta_desligada'
  | 'pagamento_nao_provado'
  | 'welcome20_nao_verificado'
  | 'nao_e_assinatura'
  | 'trial_de_cartao'
  | 'origem_especial'
  | 'periodo_fora_da_oferta'
  | 'plano_fora_da_oferta'
  | 'desconto_desconhecido'
  | 'ja_tem_desconto'

export type DecisaoBoasVindas =
  | { oferecer: true; tier: 'basic' | 'pro'; plano: 'Creator' | 'Studio' }
  | { oferecer: false; motivo: MotivoSemBoasVindas }

/** O pedaço da sessão Stripe que decide a oferta (o objeto que `sessions.retrieve` devolve cabe aqui). */
export type SessaoParaOferta = {
  mode?: string | null
  metadata?: { [key: string]: string } | null
  total_details?: { amount_discount?: number | null } | null
} | null | undefined

/** A pessoa tem direito ao WELCOME20 nesta carta? Pura, exportada, e FECHADA por padrão: qualquer coisa que a casa
 *  não sabe vira "não". As regras são as do checkout (KINEO-WELCOME20-2026-08-25), nunca uma régua nova:
 *   · has_paid PROVADO false — `!== true` abriria a porta justamente quando o perfil não foi lido (memória
 *     `predicado-largo-negado-falha-aberta`); "já usou o WELCOME20" está contido em "já pagou";
 *   · o código conferido na Stripe agora — a carta nunca promete o que o checkout vai recusar;
 *   · assinatura mensal de Creator ou Studio (o recorte de guestWelcomePromoShapeOk, o mesmo do checkout), nascida
 *     no checkout padrão (a volta ao vídeo e o Plan Fit têm destino próprio, que o link novo perderia);
 *   · a página aberta SEM desconto nenhum: a Stripe aceita um só, e quem já tem um (o próprio WELCOME20, intro,
 *     oferta privada, STUDIO50…) volta pela mesma página, com o desconto que já tinha. Nada acumula. */
export function decidirBoasVindas(input: {
  ligada: boolean
  hasPaid: boolean | null | undefined
  welcome20Verificado: boolean
  sessao: SessaoParaOferta
}): DecisaoBoasVindas {
  if (input.ligada !== true) return { oferecer: false, motivo: 'oferta_desligada' }
  if (input.hasPaid !== false) return { oferecer: false, motivo: 'pagamento_nao_provado' }
  if (input.welcome20Verificado !== true) return { oferecer: false, motivo: 'welcome20_nao_verificado' }
  const sessao = input.sessao
  if (!sessao || sessao.mode !== 'subscription') return { oferecer: false, motivo: 'nao_e_assinatura' }
  const md = sessao.metadata ?? {}
  if (md.card_trial === '1') return { oferecer: false, motivo: 'trial_de_cartao' }
  if (md.checkout_origin !== 'standard') return { oferecer: false, motivo: 'origem_especial' }
  if (md.billing !== 'monthly') return { oferecer: false, motivo: 'periodo_fora_da_oferta' }
  const tier = md.tier
  if ((tier !== 'basic' && tier !== 'pro') || !guestWelcomePromoShapeOk({ tier, isAnnual: false })) {
    return { oferecer: false, motivo: 'plano_fora_da_oferta' }
  }
  const desconto = sessao.total_details?.amount_discount
  if (typeof desconto !== 'number' || !Number.isFinite(desconto)) return { oferecer: false, motivo: 'desconto_desconhecido' }
  if (desconto !== 0 || md.intro === '1' || Boolean(md.public_promo_state) || Boolean(md.offer)) {
    return { oferecer: false, motivo: 'ja_tem_desconto' }
  }
  return { oferecer: true, tier, plano: tier === 'basic' ? 'Creator' : 'Studio' }
}

/** Um clique de volta ao MESMO plano, mensal, com o código que o checkout verifica e aplica sozinho. Logado ou não:
 *  sem sessão, a compra sem login abre a Stripe com o mesmo desconto; com ela, o caminho logado faz o resto.
 *  Etiquetado, senão a venda chega ao painel como tráfego direto. */
export function linkBoasVindas(tier: 'basic' | 'pro'): string {
  return `${SITE}/api/stripe/checkout?tier=${tier}&billing=monthly&promo=${WELCOME20_PROMOTION_CODE}&intent_campaign=${WELCOME20_INTENT_CAMPAIGN}&utm_source=lifecycle&utm_medium=email&utm_campaign=checkout_hot_nudge`
}

// ─── Quem caiu fora (KINEO-RESGATE-PAGAMENTO-2026-10-08) ─────────────────────────────────────────────────────────
export type MotivoDePulo =
  | 'convidado_sem_email'
  | 'perfil_ausente'
  | 'pagante'
  | 'optout'
  | 'email_invalido_ou_interno'
  | 'bloqueado'
  | 'outra_campanha_7d'
  | 'ja_recebeu'
  | 'suprimido_24h'
  | 'supressao_degradada'
  | 'sem_pagina_viva'

type Pulo = {
  userId: string | null
  sessionId: string
  motivo: MotivoDePulo
  tier: string | null
  clicouEm: string
  uaClass: string | null
}

/** Uma linha por (sessão Stripe, motivo): o cron passa pela mesma pessoa várias vezes dentro da janela, e o id
 *  determinístico faz a segunda gravação simplesmente não existir. */
export function idDoPulo(sessionId: string, motivo: MotivoDePulo): string {
  return deterministicEventUuid(SKIP_EVENT, `${sessionId}:${motivo}`)
}

function contarMotivos(itens: Array<{ motivo: string }>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const i of itens) out[i.motivo] = (out[i.motivo] ?? 0) + 1
  return out
}

/** Grava os pulos que ainda não existem. Nunca lança: a carta já saiu (ou não) quando isto roda, e a medição não
 *  pode virar 500 nem reenvio. Aguardado até o fim (memória `void-antes-do-return-morre-na-vercel`). */
async function gravarPulos(
  admin: SupabaseClient,
  pulos: Pulo[],
  agoraMs: number,
): Promise<{ gravados: number; ja_existiam: number; erro: string | null }> {
  if (pulos.length === 0) return { gravados: 0, ja_existiam: 0, erro: null }
  try {
    const linhas = new Map<string, Record<string, unknown>>()
    for (const p of pulos) {
      if (!p.sessionId) continue // sem sessão Stripe não há chave estável: melhor não gravar que gravar em duplicata
      const id = idDoPulo(p.sessionId, p.motivo)
      if (linhas.has(id)) continue
      linhas.set(id, {
        id,
        name: SKIP_EVENT,
        user_id: p.userId,
        path: ROTA,
        metadata: {
          reason: p.motivo,
          stripe_session_id: p.sessionId,
          tier: p.tier,
          checkout_started_at: p.clicouEm,
          minutes_after_click: Math.round((agoraMs - new Date(p.clicouEm).getTime()) / 60000),
          ua_class: p.uaClass,
          email_version: EMAIL_VERSION,
        },
      })
    }
    const ids = [...linhas.keys()]
    const existentes = new Set<string>()
    for (let i = 0; i < ids.length; i += 200) {
      const fatia = ids.slice(i, i + 200)
      const { data } = await readAll(() => admin.from('events').select('id').in('id', fatia), { route: ROTA, table: 'events' })
      for (const r of data ?? []) existentes.add((r as { id: string }).id)
    }
    const novas = ids.filter((id) => !existentes.has(id)).map((id) => linhas.get(id) as Record<string, unknown>)
    if (novas.length === 0) return { gravados: 0, ja_existiam: existentes.size, erro: null }
    const { error } = await admin.from('events').insert(novas)
    if (error) return { gravados: 0, ja_existiam: existentes.size, erro: `${error.code ?? ''} ${error.message}`.trim() }
    return { gravados: novas.length, ja_existiam: existentes.size, erro: null }
  } catch (e) {
    return { gravados: 0, ja_existiam: 0, erro: e instanceof Error ? e.message : 'error' }
  }
}

function assunto(filme: string | null): string {
  // Sem urgência falsa, sem contador inventado: é literalmente o estado da
  // sessão que a Stripe acabou de confirmar como `open`.
  return filme
    ? `Your payment page for "${filme}" is still open`
    : 'Your Kineo payment page is still open'
}

/** ⚠️ Cada frase desta carta tem de ser verdadeira NO INSTANTE DO ENVIO:
 *   · "still open" — a Stripe respondeu `status: 'open'` segundos atrás;
 *   · "same plan, same price" — é a MESMA sessão, buscada agora, não montada
 *     à mão aqui;
 *   · a oferta de boas-vindas só aparece com `oferta.oferecer` — direito provado por `decidirBoasVindas` e código
 *     conferido na Stripe nesta execução; o percentual vem de WELCOME20_PERCENT_OFF, nunca digitado;
 *   · nenhum crédito, preço, cupom novo ou trial é prometido em lugar nenhum. */
function corpoTexto(filme: string | null, liveUrl: string, userId: string, temFilme: boolean, oferta: DecisaoBoasVindas): string {
  const feito = temFilme
    ? (filme
      ? `You already made "${filme}" with Kineo, so you know what comes out the other side.`
      : `You already made a short with Kineo, so you know what comes out the other side.`)
    : `You got as far as the payment page, so something about this was worth your time.`
  const boasVindas = oferta.oferecer
    ? `If it was the price: your first month of ${oferta.plano} is ${WELCOME20_PERCENT_OFF}% off with our welcome offer. Same plan, applied automatically, no code to type:

${linkBoasVindas(oferta.tier)}

`
    : ''
  return `Hey — Joseph here, founder of Kineo.

You opened the payment page a little while ago and it is still sitting there, open. No charge was made.

${feito}

${boasVindas}If life just got in the way, this is the same page you left — same plan, same price, nothing to pick again:

${liveUrl}

And if something on that page did not add up, hit reply and tell me in one sentence. It comes straight to me, and I would rather know than guess.

— Joseph, founder
Kineo · usekineo.com
${emailFooterText(userId)}`
}

function corpoHtml(filme: string | null, liveUrl: string, userId: string, temFilme: boolean, oferta: DecisaoBoasVindas): string {
  const feito = temFilme
    ? (filme
      ? `You already made <strong>&ldquo;${escaparHtml(filme)}&rdquo;</strong> with Kineo, so you know what comes out the other side.`
      : `You already made a short with Kineo, so you know what comes out the other side.`)
    : `You got as far as the payment page, so something about this was worth your time.`
  const botao = (href: string, rotulo: string) =>
    `<p style="margin:26px 0">
  <a href="${href}" style="background:#2997ff;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block">${rotulo} &rarr;</a>
</p>`
  const meio = oferta.oferecer
    ? `<p>If it was the price: your first month of <strong>${oferta.plano}</strong> is <strong>${WELCOME20_PERCENT_OFF}% off</strong> with our welcome offer &mdash; same plan, applied automatically, no code to type:</p>
${botao(linkBoasVindas(oferta.tier), `Finish with ${WELCOME20_PERCENT_OFF}% off your first month`)}
<p style="font-size:14px;color:#555">If life just got in the way, <a href="${liveUrl}" style="color:#2997ff">the same page you left</a> is still open &mdash; same plan, same price, nothing to pick again.</p>`
    : `<p>If life just got in the way, this is the <strong>same page you left</strong> &mdash; same plan, same price, nothing to pick again:</p>
${botao(liveUrl, 'Finish where you left off')}`
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px">
<p>Hey &mdash; Joseph here, founder of <strong>Kineo</strong> 🎬</p>
<p>You opened the payment page a little while ago and it is <strong>still sitting there, open</strong>. No charge was made.</p>
<p>${feito}</p>
${meio}
<p>And if something on that page did not add up, hit reply and tell me in one sentence. It comes straight to me, and I would rather know than guess.</p>
<p>&mdash; Joseph, founder<br/>Kineo &middot; <a href="https://usekineo.com" style="color:#2997ff">usekineo.com</a></p>
${emailFooterHtml(userId)}</div>`
}

type Candidato = {
  id: string
  email: string
  sessionId: string
  tier: string | null
  pais: string
  filme: string | null
  temFilme: boolean
  clicouEm: string
  hasPaid: boolean | null
}

/** A DECISÃO, isolada da rede de propósito: dada a sessão que a Stripe
 *  devolve, esta carta pode ser enviada?
 *
 *  Fica exportada e PURA para que o guardião exercite a condição de verdade em
 *  vez de contar texto — um mutante que troque qualquer termo por `true` faz o
 *  teste cair (memória `guardiao-contar-texto-nao-prova-condicao`).
 *
 *  Quatro portas, todas fechadas por padrão:
 *   1. `status` tem de ser exatamente `'open'` — `complete` é gente que PAGOU e
 *      `expired` é a coorte da outra carta;
 *   2. `payment_status` não pode ser `'paid'` (cinto e suspensório: uma sessão
 *      recém-paga pode ser lida antes de virar `complete`);
 *   3. `url` tem de existir — é a promessa inteira da carta;
 *   4. `expires_at` da Stripe vem em SEGUNDOS. Comparar com `Date.now()` sem os
 *      mil seria dizer que toda sessão morreu em 1970 e a carta nunca sairia. */
export function escolherPaginaViva(
  sessao: {
    status?: string | null
    payment_status?: string | null
    url?: string | null
    expires_at?: number | null
  } | null | undefined,
  agoraMs: number,
): string | null {
  if (!sessao) return null
  if (sessao.status !== 'open') return null
  if (sessao.payment_status === 'paid') return null
  const url = sessao.url ?? null
  if (!url) return null
  const expira = sessao.expires_at ?? null
  if (expira !== null && expira !== undefined && expira * 1000 <= agoraMs) return null
  return url
}

/** Um `checkout_started` entra na janela? Pura, exportada, e é o que separa
 *  esta carta da carta de expiração — o guardião prova os dois lados da
 *  fronteira, não a existência das constantes. */
export function dentroDaJanela(
  clicadoEmMs: number,
  agoraMs: number,
  minMinutos: number = JANELA_MIN_MINUTOS,
  maxMinutos: number = JANELA_MAX_MINUTOS,
): boolean {
  const idadeMin = (agoraMs - clicadoEmMs) / 60000
  return idadeMin >= minMinutos && idadeMin <= maxMinutos
}

/** Busca na Stripe a página viva desta sessão — e a própria sessão, que é quem
 *  decide a oferta de boas-vindas. Devolve null quando a sessão não está
 *  aberta, quando já foi paga, quando não há url, quando ela morreu, ou quando
 *  a Stripe não responde — os cinco casos significam a mesma coisa para a
 *  carta: ela não pode ser enviada. */
async function paginaViva(sessionId: string): Promise<{ url: string; sessao: SessaoParaOferta } | null> {
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId)
    const url = escolherPaginaViva(s, Date.now())
    return url ? { url, sessao: s } : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const porCron = Boolean(cronSecret) && req.headers.get('authorization') === `Bearer ${cronSecret}`
    if (!porCron) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !ADMIN_EMAILS.has((user.email ?? '').toLowerCase())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'STRIPE_SECRET_KEY missing' }, { status: 503 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !secret) return NextResponse.json({ error: 'Supabase env missing' }, { status: 503 })
    const admin = createAdminClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

    const agora = Date.now()
    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    // ── 1. o clique de comprar MAIS RECENTE de cada pessoa, dentro da janela ──
    const desde = new Date(agora - JANELA_MAX_MINUTOS * 60 * 1000).toISOString()
    const ate = new Date(agora - JANELA_MIN_MINUTOS * 60 * 1000).toISOString()
    const { data: csRows, error: csErr } = await readAll(() => admin
      .from('events')
      .select('user_id, created_at, metadata')
      .eq('name', 'checkout_started')
      .gte('created_at', desde)
      .lte('created_at', ate)
      .order('created_at', { ascending: false }), { route: '/api/admin/send-checkout-hot-nudge', table: 'events' })
    if (csErr) return NextResponse.json({ error: csErr.message }, { status: 500 })

    const ultimaSessao = new Map<string, { sessionId: string; tier: string | null; pais: string; quando: string; uaClass: string | null }>()
    // A compra sem login (lib/growth/guestCheckout) chega aqui sem user_id. Não há a quem escrever: a Stripe não devolve o
    // e-mail de quem abandona sem consentimento promocional (só existe para empresa e cliente nos EUA). Vira pulo.
    const convidados = new Map<string, Pulo>()
    for (const r of csRows ?? []) {
      const uid = r.user_id as string | null
      if (uid && ultimaSessao.has(uid)) continue // a lista já vem do mais novo para o mais velho
      const md = (r.metadata ?? {}) as Record<string, unknown>
      const sid = typeof md.stripe_session_id === 'string' ? md.stripe_session_id : null
      if (!sid) continue
      // Redundante com o filtro do banco, e de propósito: a janela é a regra
      // desta rota e ela fica auditável em código, não só na query.
      if (!dentroDaJanela(new Date(r.created_at as string).getTime(), agora)) continue
      const tier = typeof md.tier === 'string' ? md.tier : null
      const uaClass = typeof md.ua_class === 'string' ? md.ua_class : null
      if (!uid) {
        if (!convidados.has(sid)) {
          convidados.set(sid, { userId: null, sessionId: sid, motivo: 'convidado_sem_email', tier, clicouEm: r.created_at as string, uaClass })
        }
        continue
      }
      ultimaSessao.set(uid, {
        sessionId: sid,
        tier,
        pais: typeof md.ip_country === 'string' ? md.ip_country : '',
        quando: r.created_at as string,
        uaClass,
      })
    }
    const pulos: Pulo[] = [...convidados.values()]
    const pulo = (id: string, motivo: MotivoDePulo): Pulo => {
      const s = ultimaSessao.get(id)
      return { userId: id, sessionId: s?.sessionId ?? '', motivo, tier: s?.tier ?? null, clicouEm: s?.quando ?? new Date(agora).toISOString(), uaClass: s?.uaClass ?? null }
    }
    const ids = [...ultimaSessao.keys()]
    if (ids.length === 0) {
      const gravacao = confirm ? await gravarPulos(admin, pulos, agora) : null
      return NextResponse.json({
        mode: confirm ? 'SENT' : 'DRY_RUN',
        janela_minutos: [JANELA_MIN_MINUTOS, JANELA_MAX_MINUTOS],
        elegiveis: 0,
        pulos_por_motivo: contarMotivos(pulos),
        ...(gravacao ? { pulos_gravados: gravacao.gravados, pulos_ja_existiam: gravacao.ja_existiam, pulos_erro: gravacao.erro } : {}),
        note: 'ninguém com conta apertou comprar dentro da janela quente',
      })
    }

    // ── 2. quem sai da lista, e por quê ─────────────────────────────────────
    const { data: perfis, error: perfErr } = await readAll(() => admin
      .from('profiles')
      .select('id, email, email_opted_out, has_paid')
      .in('id', ids.slice(0, 1000)), { route: '/api/admin/send-checkout-hot-nudge', table: 'profiles' })
    if (perfErr) return NextResponse.json({ error: perfErr.message }, { status: 500 })

    const comPerfil = new Set((perfis ?? []).map((p) => p.id as string))
    for (const id of ids) if (!comPerfil.has(id)) pulos.push(pulo(id, 'perfil_ausente'))

    const excluidos = { pagante: 0, optout: 0, junk: 0, bloqueado: 0, outra_campanha: 0, ja_recebeu: 0 }
    const CONTADOR = { pagante: 'pagante', optout: 'optout', email_invalido_ou_interno: 'junk', bloqueado: 'bloqueado' } as const
    const base = (perfis ?? []).filter((p) => {
      const motivo = motivoDoPerfil(p)
      if (motivo === null) return true
      excluidos[CONTADOR[motivo]]++
      pulos.push(pulo(p.id as string, motivo))
      return false
    })
    const baseIds = base.map((p) => p.id as string)

    // Os três dedupes com paginação completa: truncar em 1000 aqui é reenviar campanha
    // (KINEO-TRIPWIRE-1000-2026-08-28).
    const { data: pagouRows } = await readAll(() => admin
      .from('events').select('user_id').eq('name', 'payment_success').in('user_id', baseIds), { route: '/api/admin/send-checkout-hot-nudge', table: 'events' })
    const pagou = new Set((pagouRows ?? []).map((r) => r.user_id as string))
    const { data: outrasRows } = await readAll(() => admin
      .from('events').select('user_id').in('name', OUTRAS_CAMPANHAS).in('user_id', baseIds)
      .gte('created_at', corteOutrasCampanhas(agora)), { route: '/api/admin/send-checkout-hot-nudge', table: 'events' })
    const outras = new Set((outrasRows ?? []).map((r) => r.user_id as string))
    const { data: jaRows } = await readAll(() => admin
      .from('events').select('user_id').eq('name', SENT_EVENT).in('user_id', baseIds), { route: '/api/admin/send-checkout-hot-nudge', table: 'events' })
    const ja = new Set((jaRows ?? []).map((r) => r.user_id as string))

    // Filmes entregues — a carta muda de frase conforme a pessoa já tenha
    // recebido filme ou não, e nomear um filme que não existe é mentira.
    const filmes = new Map<string, { title: string | null; topic: string | null }>()
    for (let i = 0; i < baseIds.length; i += 200) {
      const slice = baseIds.slice(i, i + 200)
      const { data: vids } = await readAll(() => admin
        .from('videos').select('user_id, title, topic, created_at')
        .in('user_id', slice).order('created_at', { ascending: false }), { route: '/api/admin/send-checkout-hot-nudge', table: 'videos' })
      for (const v of vids ?? []) {
        const uid = v.user_id as string
        if (!filmes.has(uid)) filmes.set(uid, { title: v.title as string | null, topic: v.topic as string | null })
      }
    }

    const candidatos: Candidato[] = []
    for (const p of base) {
      const id = p.id as string
      if (pagou.has(id)) { excluidos.pagante++; pulos.push(pulo(id, 'pagante')); continue }
      if (outras.has(id)) { excluidos.outra_campanha++; pulos.push(pulo(id, 'outra_campanha_7d')); continue }
      if (ja.has(id)) { excluidos.ja_recebeu++; pulos.push(pulo(id, 'ja_recebeu')); continue }
      const sess = ultimaSessao.get(id)
      if (!sess) continue
      const f = filmes.get(id)
      candidatos.push({
        id,
        email: p.email as string,
        sessionId: sess.sessionId,
        tier: sess.tier,
        pais: sess.pais,
        filme: f ? tituloDoFilme(f.title, f.topic) : null,
        temFilme: Boolean(f),
        clicouEm: sess.quando,
        hasPaid: typeof p.has_paid === 'boolean' ? p.has_paid : null,
      })
    }

    // ── 3. supressão de 24h (falha FECHADA) ─────────────────────────────────
    const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))
    for (const c of candidatos) {
      if (sup.isSuppressed(c.id)) pulos.push(pulo(c.id, sup.degraded ? 'supressao_degradada' : 'suprimido_24h'))
    }
    const naoSuprimidos = candidatos
      .filter((c) => !sup.isSuppressed(c.id))
      // Quem já entregou filme primeiro: essa pessoa viu o produto funcionar
      // e a carta dela é a mais verdadeira. Depois, o clique mais recente.
      .sort((a, b) => Number(b.temFilme) - Number(a.temFilme) || b.clicouEm.localeCompare(a.clicouEm))

    const limiteParam = Number(req.nextUrl.searchParams.get('limit'))
    const lote = Number.isFinite(limiteParam) && limiteParam > 0 ? Math.min(limiteParam, 30) : 30

    // O código WELCOME20 é conferido na Stripe UMA vez por execução, e só se alguém do lote puder recebê-lo.
    let welcome20: Promise<boolean> | null = null
    const verificarWelcome20 = (): Promise<boolean> => {
      if (!welcome20) {
        welcome20 = loadGuestWelcomePromoCandidate(stripe, { kind: 'welcome_first_month_20', code: WELCOME20_PROMOTION_CODE, nowMs: agora })
          .then((candidato) => candidato !== null && publicPromoVerificationFailure(candidato) === null)
          .catch(() => false)
      }
      return welcome20
    }
    const ofertaPara = async (hasPaid: boolean | null, sessao: SessaoParaOferta): Promise<DecisaoBoasVindas> => {
      const provisoria = decidirBoasVindas({ ligada: HOT_NUDGE_WELCOME20_LIVE, hasPaid, welcome20Verificado: true, sessao })
      if (!provisoria.oferecer) return provisoria
      return decidirBoasVindas({ ligada: HOT_NUDGE_WELCOME20_LIVE, hasPaid, welcome20Verificado: await verificarWelcome20(), sessao })
    }

    // ── 4. a página viva, na Stripe, uma por pessoa ─────────────────────────
    const alvo = naoSuprimidos.slice(0, lote)
    const comPagina: Array<Candidato & { liveUrl: string; oferta: DecisaoBoasVindas }> = []
    let semPagina = 0
    for (const c of alvo) {
      const pagina = await paginaViva(c.sessionId)
      if (!pagina) { semPagina++; pulos.push(pulo(c.id, 'sem_pagina_viva')); continue }
      const oferta = await ofertaPara(c.hasPaid, pagina.sessao)
      comPagina.push({ ...c, liveUrl: pagina.url, oferta })
    }
    const semOferta = comPagina.flatMap((c) => (c.oferta.oferecer ? [] : [{ motivo: c.oferta.motivo }]))

    if (!confirm) {
      return NextResponse.json({
        mode: 'DRY_RUN',
        coorte: `apertou comprar há ${JANELA_MIN_MINUTOS}-${JANELA_MAX_MINUTOS} min · sessão ainda ABERTA na Stripe · nunca pagou · nenhuma outra campanha nos últimos ${OUTRAS_CAMPANHAS_JANELA_DIAS} dias · opt-in · e-mail real`,
        janela_minutos: [JANELA_MIN_MINUTOS, JANELA_MAX_MINUTOS],
        outras_campanhas_janela_dias: OUTRAS_CAMPANHAS_JANELA_DIAS,
        candidatos_apos_filtros: naoSuprimidos.length,
        no_proximo_lote: alvo.length,
        com_pagina_viva: comPagina.length,
        sem_pagina_viva_nao_recebem: semPagina,
        suprimidos_24h: sup.suppressedCount,
        supressao_degradada: sup.degraded,
        excluidos,
        oferta_boas_vindas_ligada: HOT_NUDGE_WELCOME20_LIVE,
        com_oferta_boas_vindas: comPagina.length - semOferta.length,
        sem_oferta_por_motivo: contarMotivos(semOferta),
        pulos_por_motivo: contarMotivos(pulos),
        pulos_gravados: 0,
        assunto_exemplo: assunto(comPagina[0]?.filme ?? null),
        lista: comPagina.map((c) => `${c.email} · ${c.pais || '??'} · ${c.tier ?? '?'} · ${c.temFilme ? 'com filme' : 'SEM filme'} · ${c.filme ?? '(sem título)'} · clicou ${c.clicouEm} · ${c.oferta.oferecer ? `${WELCOME20_PERCENT_OFF}% ${c.oferta.plano}` : `sem oferta (${c.oferta.motivo})`}`),
        from: FROM_EMAIL,
        hint: 'Acrescente &confirm=SEND (e opcionalmente &limit=N) para enviar.',
      })
    }

    let enviados = 0
    let falhas = 0
    const resultados: Array<{ email: string; outcome: string }> = []
    for (const c of comPagina) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: c.email,
            reply_to: REPLY_TO,
            subject: assunto(c.filme),
            text: corpoTexto(c.filme, c.liveUrl, c.id, c.temFilme, c.oferta),
            html: corpoHtml(c.filme, c.liveUrl, c.id, c.temFilme, c.oferta),
            headers: unsubscribeHeaders(c.id),
          }),
        })
        if (!res.ok) throw new Error(`resend ${res.status}`)
        await admin.from('events').insert({
          user_id: c.id,
          name: SENT_EVENT,
          metadata: {
            tier: c.tier,
            country: c.pais,
            has_film: c.temFilme,
            film: c.filme,
            checkout_started_at: c.clicouEm,
            minutes_after_click: Math.round((agora - new Date(c.clicouEm).getTime()) / 60000),
            stripe_session_id: c.sessionId,
            // O link NÃO é gravado: é uma porta de pagamento pessoal.
            live_url_used: true,
            email_version: EMAIL_VERSION,
            welcome20_offered: c.oferta.oferecer,
            welcome20_tier: c.oferta.oferecer ? c.oferta.tier : null,
            welcome20_reason: c.oferta.oferecer ? null : c.oferta.motivo,
          },
        })
        enviados++
        resultados.push({ email: c.email, outcome: 'sent' })
        await new Promise((r) => setTimeout(r, 600))
      } catch (e) {
        falhas++
        resultados.push({ email: c.email, outcome: `failed: ${e instanceof Error ? e.message : 'error'}` })
      }
    }

    const gravacao = await gravarPulos(admin, pulos, agora)
    return NextResponse.json({
      mode: 'SENT',
      enviados,
      falhas,
      com_oferta_boas_vindas: comPagina.length - semOferta.length,
      sem_pagina_viva_nao_receberam: semPagina,
      restam_apos_lote: Math.max(0, naoSuprimidos.length - alvo.length),
      pulos_por_motivo: contarMotivos(pulos),
      pulos_gravados: gravacao.gravados,
      pulos_ja_existiam: gravacao.ja_existiam,
      pulos_erro: gravacao.erro,
      resultados,
    })
  } catch (e) {
    console.error('[send-checkout-hot-nudge] failed:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
