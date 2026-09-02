import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { emailFooterHtml, emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { recordResendResponse } from '@/lib/email/quota'
// KINEO-D0-EMAIL-REVIEW-2026-08-07 — a linha do que sobra depois do trial não
// pode ser redigitada aqui. Com a flag ON o free tier é 1 Fast/MÊS, não 3/dia;
// o e-mail "ends soon" dizia "free daily limit", que é a copy da flag OFF.
import { getFreeTierOffer } from '@/lib/freeTierOffer'
import {
  REVERSE_TRIAL_ENABLED,
  TRIAL_CREDIT_CAP,
  TRIAL_VARIANT_DAYS,
  isPayingProfile,
  isTrialActive,
  trialCreditsUsed,
  type TrialProfileFields,
  type TrialVariant,
} from '@/lib/reverseTrial'
// KINEO-D0-ONE-CLICK-2026-08-12 — fonte única dos temas de 1 clique do d0.
// É o MESMO pool que /viral-now e /generate?viral_topic= já servem; nada é
// duplicado aqui (a cópia local de lista com fonte única foi o defeito de
// 05/08 com isTestEmail()).
import { VIRAL_TOPICS_POOL } from '@/lib/viralTopics'
// KINEO-SPRINT-V1V4-2026-09-01 (#25) — MESMO motor de continuacao das telas e
// do momentum nudge (#24). O e-mail nunca monta a frase do episodio 2 a mao:
// se a frase mudar la, este e-mail acompanha sozinho.
import {
  buildSeriesContinuationEmailUrl,
  normalizeSeriesSeed,
  type SeriesContinuationSource,
} from '@/lib/seriesContinuation'
import { OUR_FAILURE_EVENT_NAME, isOurFailure } from '@/lib/lifecycle/ourFailure'
import {
  EMPTY_OTHER_DELIVERIES,
  countOtherDeliveries,
  describeOtherDeliveries,
  otherDeliveriesTotal,
  type OtherDeliveries,
} from '@/lib/lifecycle/otherDeliveries'
import {
  filmNoun,
  filmPlanLine,
  filmsPerPlan,
  isBurnedWithFilm,
  lossBodyFor,
  type LossBody,
} from '@/lib/lifecycle/trialFilmPlans'

// trial-lifecycle-emails — REVERSE TRIAL FASE 2, ITEM 4 (07/08/2026).
// [KINEO-TRIAL-EMAILS-2026-08-07]
//
// UM cron diário, CINCO e-mails, cada um no máximo UMA vez por conta, para
// sempre. A sequência (spec do fundador, ORDENS-AQUISICAO 06/08 noite):
//
//   d0_welcome         — trial ativado há <24h: "your Creator trial is live —
//                        50 credits". Um CTA só: gerar vídeo.
//   ending_soon        — variante 3d no D2 / variante 7d no D5 ("ends
//                        tomorrow"/"2 days left") + o que a pessoa perde.
//                        SEM desconto — preço cheio.
//   expired_offer_d5   — 5 dias após o fim, não converteu: 50% off Creator por
//                        3 meses, cupom COMEBACK50 (já existe na Stripe desde
//                        a ORDEM I; o checkout resolve ?promo=). REGRA DO
//                        FUNDADOR: o desconto existe SÓ nestes dois e-mails,
//                        NUNCA em superfície pública.
//   expired_lastcall_d10 — 10 dias após o fim: última chamada do mesmo cupom.
//   trial_extended     — KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12: expirou
//                        tendo CONCLUÍDO 3+ vídeos, sem assinar, nunca
//                        estendido, e com ≥1 crédito utilizável depois da
//                        restauração. "+2 more days" + UPDATE real
//                        (trial_ends_at = now+2d, status volta a 'active',
//                        trial_extended = true). Idempotente por
//                        trial_extended — UMA extensão por conta, para sempre.
//                        O critério ANTERIOR era o oposto ("usou <10 dos 40
//                        créditos") e mediu 0 vídeos e 0 conversões em 25
//                        envios — ver o bloco de EXTENSION_MIN_VIDEOS.
//
// FLAG: KINEO_REVERSE_TRIAL_ENABLED, a MESMA do trial (não a de lifecycle).
// Estes e-mails são parte da feature — com a flag OFF não existe linha com
// trial_status preenchido, mas o gate explícito garante que nem a query roda.
// (?dry=1 atravessa o gate, como em send-credits-back: dimensionar antes de
// ligar é o motivo de o dry-run existir.)
//
// IDEMPOTÊNCIA — tabela trial_emails_log (migração 07/08), PK(user_id,
// email_kind). O cron REIVINDICA a linha ANTES de enviar (upsert com
// ignoreDuplicates; 0 linhas = outro run já pegou) e só então chama a Resend.
// Envio que falha apaga a reivindicação e reentra amanhã. Crash entre claim e
// envio perde no máximo UM e-mail — o lado barato ("perder um e-mail é barato;
// e-mail repetido queima domínio", lib/lifecycle/suppression.ts).
//
// QUEM NUNCA RECEBE NADA DAQUI: trial_status='converted' (fora da query),
// pagante por isPayingProfile (denylist invertida — na dúvida, é pagante e não
// recebe upsell), email_opted_out, contas de teste, e qualquer um que recebeu
// outro e-mail de lifecycle nas últimas 24h (supressão cruzada fail-closed).
// Na direção oposta, os envios daqui entram na janela dos outros jobs via
// trial_emails_log em lib/lifecycle/suppression.ts — mesmo commit, como manda
// a regra de lá.
//
// RELÓGIOS. Não existe trial_started_at nem trial_expired_at:
//   · início  = trial_ends_at − dias da variante (TRIAL_VARIANT_DAYS);
//   · fim     = o MENOR entre trial_ends_at e — SÓ quando o status já é
//     'downgraded' — trial_downgraded_at, entre os que já passaram. Quem morre
//     de relógio tem o prazo; quem estoura o TETO antes do prazo tem o carimbo
//     do cron horário de downgrade (até ele passar, a conta não entra em janela
//     nenhuma — atraso de ~1h, irrelevante em janelas de dias). É MENOR, e não
//     "o prazo, senão o carimbo", e a qualificação do status não é detalhe: ver
//     KINEO-TRIAL-CLOCK-NONMONOTONIC-2026-08-10 em dueKind(). Perda de acesso é
//     evento único DENTRO DE UM CICLO; a distância até ela só cresce. (Entre
//     ciclos não: a extensão reescreve trial_ends_at e o relógio recomeça, de
//     propósito — é outro trial.)
//
// ═══ AGENDAMENTO — KINEO-TRIAL-EMAIL-STARVATION-2026-08-08 ══════════════════
// "25 * * * *" (vercel.json). ERA "30 16 * * *" — UM disparo por dia.
//
// O DEFEITO, MEDIDO E NÃO DEDUZIDO: `trial_emails_log` tinha ZERO linhas em
// toda a história, com 16 trials reais e 2 dias de flag ligada. Nenhum dos
// cinco e-mails desta rota — welcome, ending_soon, D5, D10, extensão — chegou
// a existir. E não é bug de código desta rota: é INANIÇÃO ESTRUTURAL.
//
// A trava é a supressão cruzada de 24h (lib/lifecycle/suppression.ts), que é
// "primeiro a carimbar leva". Contra ela corriam:
//   send-video-ready      :10,:40  → 48 disparos/dia
//   send-cap-hit          :15,:45  → 48 disparos/dia
//   send-blackout-winback :05,:35  → 48 disparos/dia
//   send-activation-nudge :40      → 24 disparos/dia
//   send-post-nudge       :50      → 24 disparos/dia
//   ... e esta rota, 1 disparo/dia. 1 contra ~190.
//
// A PROVA (08/08, as 16 linhas com trial_status preenchido): 14 delas já
// tinham carimbo REAL de outro job de lifecycle dentro de 3h26 do cadastro —
// send-video-ready em 10 casos (43min a 76min depois do signup),
// send-post-nudge em 3, send-activation-nudge em 1. TODOS antes de qualquer
// 16:30Z possível. No dia seguinte o mesmo padrão se repete (send-video-rescue
// carimbou 7574e7f0 e d1b6d890 às 14:00:57Z de 08/08, 2h30 antes do único tiro
// do dia). Um job de 1 tiro/dia dentro de uma janela EXCLUSIVA de 24h disputada
// por jobs de 24-48 tiros/dia não tem azar: ele tem aritmética contra.
//
// ⚠️ O COMENTÁRIO ANTIGO ERRAVA NA UNIDADE, E O ERRO SOBREVIVEU A UMA CORREÇÃO.
// Ele raciocinava sobre colisão de MINUTO (":30 não colide com nenhum job
// horário") e concluía que "a supressão cruzada de 24h resolve a interseção das
// coortes". A trava não é de minuto, é de 24 HORAS — escolher um minuto vazio
// não compra nada. Em 07/08 o KINEO-D0-EMAIL-REVIEW já tinha DIAGNOSTICADO esta
// corrida (ver D0_WINDOW_MS) e receitou o paliativo certo para o remédio errado:
// alargou a janela de 48h→72h para dar "três tentativas" em vez de duas. Três
// tentativas por dia útil contra ~190 carimbos continuam perdendo — e o placar
// de 24h depois foi 0 linhas. A cadência era a variável, não a janela.
//
// POR QUE :25 E NÃO :05/:35. Minutos já ocupados por job horário: :00 :05 :10
// :15 :20 :30 :35 :40 :45 :50 :55. :25 é livre (só o send-credits-back diário
// das 15:25 cruza, 1× por dia). Cadência HORÁRIA e não semi-horária de
// propósito: 24 tiros/dia já põe esta rota em pé de igualdade com os jobs que
// hoje a atropelam, sem dobrar a carga de leitura nem o risco de cota da Resend
// (100/dia no plano grátis — ver docs/CAPACIDADE-TAAFT-2026-08-08.md). Uma
// variável por vez.
//
// SEGURANÇA DE DUPLICATA: intocada. A idempotência real é o claim em
// trial_emails_log com PK(user_id, email_kind) ANTES do envio — 24 execuções
// por dia não podem mandar dois do mesmo kind, porque o upsert com
// ignoreDuplicates devolve 0 linhas para a segunda. A cadência não afrouxa
// nada: ela só dá mais chances de ganhar a MESMA janela.

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
export const maxDuration = 60

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Kineo Team <hello@usekineo.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/**
 * Teto duro de envios por execução. A spec dizia 200 quando a rota rodava UMA
 * vez por dia: 200 era o teto DIÁRIO disfarçado de teto por execução.
 *
 * KINEO-TRIAL-EMAIL-STARVATION-2026-08-08 — com cadência horária o mesmo 200
 * viraria 4.800/dia de teto teórico, num domínio cuja cota da Resend no plano
 * grátis é 100/dia (docs/CAPACIDADE-TAAFT-2026-08-08.md). 40 por execução
 * mantém o teto diário na mesma ordem de grandeza do que a spec autorizou e
 * ainda drena, em 2 execuções (2 horas), o maior dia de cadastros da história
 * da empresa (69 em 01/08) — contra as 24h que a cadência antiga levava para
 * drenar o primeiro lote. Ninguém é perdido: quem não coube volta no próximo
 * run, ordenado por KIND_PRIORITY.
 */
const MAX_PER_RUN = 40
/** PostgREST manda `in.(...)` na query string — fatiar para não estourar a URL. */
const CHUNK_SIZE = 200
/**
 * KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — contagem de vídeos concluídos.
 * 50 contas por requisição contra um teto de 1.000 linhas: saturar exigiria
 * média de 20 vídeos concluídos por conta em trial (hoje a coorte inteira tem
 * 121 vídeos para 122 contas). Se um dia saturar, o cron falha FECHADO em vez
 * de subestimar — ver o bloco na leitura.
 */
const VIDEO_COUNT_USERS_PER_QUERY = 50
/** Página de leitura. ABAIXO do `max-rows` do PostgREST — ver o laço. */
const VIDEO_COUNT_PAGE = 500
/** Teto de segurança por bloco: acima disto, fecha em vez de paginar sem fim. */
const VIDEO_COUNT_HARD_CAP = 50_000
/**
 * KINEO-FAILED-BY-US-2026-08-12 — leitura de "esta conta foi derrubada por
 * NÓS". Mesmos parâmetros da contagem de vídeos (50 contas por requisição,
 * página de 500, teto por bloco), e pela mesma razão: cada conta traz N linhas,
 * não 1.
 *
 * A janela existe porque a pergunta tem prazo: o e-mail fala do trial DESTA
 * pessoa, e uma falha de junho não explica um trial de agosto. 14 dias cobrem
 * com folga o trial mais longo (7d) mais a coorte pós-fim que ainda recebe D5
 * (5 dias) e D10 (10 dias).
 */
const OUR_FAILURE_LOOKBACK_MS = 14 * DAY_MS

/**
 * Janela do welcome. A spec diz "ativação <24h", e é isso que o cron diário
 * alcança; as horas extras existem SÓ para o caso de o primeiro dia ter sido
 * comido pela supressão cruzada (ex.: activation-nudge saiu horas antes) — a
 * pessoa recebe o welcome no D1/D2 em vez de nunca.
 *
 * ⚠️ KINEO-D0-EMAIL-REVIEW-2026-08-07 — 48h → 72h, MEDIDO, não estético. As
 * duas primeiras contas reais (07/08, NP e PK) estavam DEVIDAS para o welcome
 * no primeiro disparo (16:30Z) e as DUAS estavam suprimidas: cada uma já tinha
 * recebido o "your video is ready" no mesmo dia (09:40:44Z e 05:40:44Z,
 * carimbos reais de 2026 em video_ready_sent_at, não carimbo de pulo). Com
 * janela de 48h isso dá exatamente DUAS tentativas; como send-video-ready
 * (:10/:40), send-cap-hit (:15/:45) e send-post-nudge (:50) rodam de hora em
 * hora e carimbam a mesma janela de 24h, duas tentativas seguidas comidas
 * fazem o welcome nunca existir — em silêncio, sem erro em lugar nenhum. 72h
 * dá três tentativas. A copy foi tornada neutra no tempo no mesmo commit ("40
 * credits just landed" virou saldo real), então o e-mail continua verdadeiro
 * se sair no D2. Para a variante 3d nada muda: `isTrialActive` e o ramo
 * `ending_soon` já resolvem a linha antes de chegar aqui.
 */
const D0_WINDOW_MS = 72 * HOUR_MS

/**
 * ⚠️ IDADE MÍNIMA DO WELCOME — KINEO-TRIAL-EMAIL-STARVATION-2026-08-08.
 *
 * Guarda que existe SÓ por causa da mudança de cadência acima, e que impede
 * esta correção de trocar um dano por outro.
 *
 * Com 1 disparo/dia, o welcome nunca chegava perto do cadastro. Com disparo
 * horário ele passaria a ser devido no PRIMEIRO :25 depois do signup — isto é,
 * 0 a 60 minutos depois — e aí GANHARIA a janela de 24h de quem hoje a leva:
 * o send-video-ready (:10/:40), que carimbou 10 das 16 contas de trial entre
 * 43min e 76min do cadastro. Trocar "your video is ready" (um e-mail disparado
 * por um fato, que leva a pessoa de volta à tela do vídeo pronto — onde mora a
 * caixa de oferta do trial que subiu hoje, commit dd1575c) por um welcome
 * genérico seria uma REGRESSÃO de receita disfarçada de correção.
 *
 * 4h resolve os dois lados sem inventar uma política nova:
 *   · quem GEROU vídeo recebe primeiro o e-mail transacional, que é melhor —
 *     e o welcome espera a janela abrir (tem 72h e agora 24 tentativas/dia
 *     para caber nela, contra as 3 tentativas totais de antes);
 *   · quem NÃO gerou nada não dispara send-video-ready nenhum, e é exatamente
 *     essa pessoa que o texto do welcome ("Your first AI video in 5 minutes")
 *     existe para buscar — ela recebe no mesmo dia, ainda dentro do D0.
 *
 * A guarda vale só para os dois ramos de `d0_welcome`. `ending_soon` continua
 * alcançável em qualquer idade de propósito: um prazo curto patológico
 * (trial_ends_at próximo por qualquer motivo) tem que conseguir avisar.
 */
const D0_MIN_AGE_MS = 4 * HOUR_MS

/**
 * "Ends tomorrow"/"ends soon", por variante. Com cadência diária, o disparo
 * cai no D2 da variante 3d (resta ≤36h) e no D5 da 7d (restam ≤60h) — os dias
 * exatos da spec, tolerando o jitter de um cron por dia.
 */
const ENDING_SOON_MS: Record<TrialVariant, number> = {
  '3d': 36 * HOUR_MS,
  '7d': 60 * HOUR_MS,
}

/**
 * ═══ KINEO-TRIAL-DOWNGRADE-SILENCE-2026-08-10 ════════════════════════════════
 * Janela do e-mail de PERDA, disparado logo depois do downgrade: [0, 48h).
 *
 * O BURACO QUE ESTA CONSTANTE FECHA (medido em produção, não deduzido). Até
 * hoje `dueKind()` só tinha três saídas para uma linha morta: extensão (exige
 * `used < 10`), D5 (a partir de 5 dias) e D10. Logo, quem foi rebaixado tendo
 * usado 10 créditos ou mais caía num `return null` implícito e ficava
 * **CINCO DIAS EM SILÊNCIO** — e só então recebia um cupom. O instante de maior
 * aversão à perda da vida do funil (o crédito acabou de ser revogado) não tinha
 * e-mail nenhum, e o primeiro contato pós-morte era um desconto.
 *
 * POR QUE HOJE. Os dois primeiros vencimentos reais da história são hoje,
 * 10/08, às 17:57Z e 18:22Z. Um deles usou 11 créditos — acima do teto da
 * extensão — e é a MESMA conta que produziu o único clique em COMPRAR da
 * história da empresa (`e934461f`, ver SPRINT-2026-08-08). Sem esta janela, o
 * lead mais quente que a empresa já teve morre sem receber uma linha até 15/08.
 *
 * POR QUE 48h E NÃO ATÉ O D5. O assunto é "what you JUST lost". Passadas 48h a
 * frase deixa de ser verdade, e mandar um e-mail de perda uma semana depois é
 * pior do que não mandar. Acima de 48h o comportamento é EXATAMENTE o de antes
 * (silêncio até o D5) — esta mudança não pode causar regressão em nenhuma linha
 * que já existia, só preenche um vazio.
 *
 * NÃO LEVA DESCONTO, DE PROPÓSITO. COMEBACK50 é do D5/D10 e de mais lugar
 * nenhum (ordem do fundador, 06/08). Descontar no minuto da perda queima a
 * margem exatamente em quem tem a maior intenção e ensina a coorte a esperar
 * pelo cupom. Aqui a oferta é o preço cheio; o cupom é a segunda tentativa.
 */
const DOWNGRADED_LOSS_TO_MS = 48 * HOUR_MS

/** Janela do e-mail de oferta D5: [5, 10) dias após o fim do trial. */
const OFFER_D5_FROM_MS = 5 * DAY_MS
/** D10 (última chamada): [10, 15) dias. Depois disso, silêncio — coorte morta. */
const OFFER_D10_FROM_MS = 10 * DAY_MS
const OFFER_D10_TO_MS = 15 * DAY_MS

/** Extensão: só faz sentido logo depois do fim — não ressuscitar linha velha. */
const EXTENSION_MAX_AGE_MS = 7 * DAY_MS
/**
 * ═══ KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — A EXTENSÃO PREMIAVA QUEM NÃO USOU ══
 *
 * O critério anterior era `trial_credits_used < 10` — literalmente "mal tocou
 * no produto". MEDIDO em produção antes de trocar (não deduzido):
 *
 *   · 25 e-mails `trial_extended` enviados (o 3º kind mais enviado da casa);
 *   · **0 de 25 geraram um vídeo depois da extensão**;
 *   · **0 de 25 converteram**;
 *   · média de créditos usados na coorte estendida: **2,6 de 40**;
 *   · 10 dos 25 nunca tinham gerado UM vídeo na vida.
 *
 * E o efeito colateral é pior que a ineficácia. A extensão reescreve
 * `trial_status` para 'active', então ela TIRA a pessoa da coorte
 * expired/downgraded — a única que recebe `downgraded_loss` e o COMEBACK50 do
 * D5/D10. Ou seja: o instrumento selecionava quem não usou o produto e o
 * removia da única sequência que pede dinheiro. Hoje 24 dessas contas estão
 * dentro do número "trials ativos" com saldo médio de **39,0 de 40** intactos.
 *
 * O critério novo é o da ordem do fundador (06/08): "+2 dias se 3+ vídeos e
 * não assinou". Ele aponta para o lado oposto do funil — quem já provou o
 * produto e ainda não pagou é o lead mais quente que existe, e é a essa pessoa
 * que mais tempo faz diferença.
 *
 * ⚠️ TERCEIRA CONDIÇÃO, QUE NÃO ESTÁ NA ORDEM MAS É EXIGIDA PELA VERDADE DO
 * E-MAIL: dias sem crédito não são extensão, são promessa falsa. Durante o
 * trial o Fast custa 1 crédito de verdade (`compose/route.ts` #1252: o trial
 * segue o caminho PAGO justamente para o render aparecer no teto de 40). Logo,
 * quem gerou 3+ vídeos e queimou os 40 não ganha NADA com mais dias — e para
 * essa pessoa o caminho certo já existe e é melhor: cai em `downgraded_loss`
 * ("veja o que você perdeu") e depois no COMEBACK50. O pedido certo para quem
 * esgotou o teto é o cartão, não o calendário. Por isso a extensão exige ≥1
 * crédito utilizável DEPOIS da restauração.
 *
 * NENHUM TETO FOI TOCADO: a restauração continua sendo `granted − used`, ou
 * seja ≤ 40 por construção, e o teto segue em 40 (guardrail do fundador).
 */
const EXTENSION_MIN_VIDEOS = 3
/** Ordem do fundador: +2 dias (era 3 no critério antigo). */
const EXTENSION_DAYS = 2
/** Menos que isto e "mais dias" não compra nem um Fast — ver o bloco acima. */
const EXTENSION_MIN_USABLE_CREDITS = 1

/**
 * Cupom 50% off / 3 meses, criado na Stripe pela ORDEM I (COMEBACK50 — cupom E
 * promotion code, conferido no dashboard em GATES-ABERTOS). NADA é criado na
 * Stripe por este cron: o link /pricing?promo= já resolve no checkout
 * (PricingClient #453 → app/api/stripe/checkout).
 */
const COMEBACK_CODE = 'COMEBACK50'

type EmailKind =
  | 'd0_welcome'
  | 'ending_soon'
  | 'downgraded_loss'
  | 'expired_offer_d5'
  | 'expired_lastcall_d10'
  | 'trial_extended'

/**
 * Ordem de corte quando o teto por execução aperta: o mais valioso primeiro.
 *
 * (O comentário anterior dizia "o teto de 200". `MAX_PER_RUN` é 40 desde que
 * existe — número falso num comentário que justifica uma decisão, corrigido de
 * passagem em 10/08. Lição 5 da sprint 21h de 07/08: comentário que afirma um
 * número é afirmação verificável, e entra na revisão como código.)
 *
 * KINEO-TRIAL-DOWNGRADE-SILENCE-2026-08-10 — `downgraded_loss` entra em 3,
 * ACIMA das duas ofertas com cupom, e a razão não é estética: a janela dele é
 * de 48h e a do D5 é de 5 dias. Num corte por teto, adiar o D5 custa horas de
 * uma janela de 120h; adiar a perda pode estourar a janela inteira e o e-mail
 * nunca mais sai. Prioridade alta = janela curta, não "importância".
 */
const KIND_PRIORITY: Record<EmailKind, number> = {
  trial_extended: 0,
  d0_welcome: 1,
  ending_soon: 2,
  downgraded_loss: 3,
  expired_offer_d5: 4,
  expired_lastcall_d10: 5,
}

// Fail-closed cron auth (KINEO-CRON-FAILCLOSED-2026-07-27 pattern).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

function isTestEmail(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') ||
    e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') ||
    e.startsWith('test') ||
    e.includes('mailinator') ||
    e.startsWith('smoketest')
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function parseTime(raw: unknown): number {
  if (!raw) return 0
  const t = Date.parse(String(raw))
  return Number.isNaN(t) ? 0 : t
}

interface Candidate {
  id: string
  email: string
  kind: EmailKind
  variant: TrialVariant
  /** trial_status observado na leitura — vira CAS na extensão. */
  status: string
  /** true = a extensão ainda precisa do UPDATE (false = retry só do e-mail). */
  needsExtensionUpdate: boolean
  /** Saldo observado (CAS da restauração de crédito na extensão). */
  balance: number | null
  /** Créditos a devolver na extensão (só linha 'downgraded' já revogada). */
  restore: number
  /**
   * KINEO-D0-EMAIL-REVIEW-2026-08-07 — o que a pessoa TEM agora, não o que foi
   * concedido. O welcome dizia "50 credits just landed in your account" para
   * quem já tinha gasto um (as duas primeiras contas reais estavam em 39). "40"
   * é verdade sobre a CONCESSÃO (trial_credits_granted) e mentira sobre o
   * SALDO, e a frase fala de saldo ("in your account"). O número vai daqui, do
   * mínimo entre o que sobra do teto e o saldo real — nunca superestima.
   */
  creditsLeft: number
  /** Créditos de trial já gastos. Decide "first Short" × "next Short". */
  creditsUsed: number
  /**
   * KINEO-TRIAL-DOWNGRADE-SILENCE-2026-08-10 — quantos créditos a REVOGAÇÃO
   * levou. É `granted − used`, o mesmo teto que `downgradeExpiredTrial` pode
   * ter tirado, e serve a UMA frase do e-mail de perda.
   *
   * ⚠️ Só é afirmável quando `status === 'downgraded'`. Numa linha 'expired' o
   * cron de downgrade ainda NÃO passou e o saldo continua na conta: dizer "seus
   * créditos expiraram" ali seria mentira verificável pela própria pessoa, que
   * abriria o app e veria o número intacto. Quem decide isso é `dueKind`, não a
   * template — por isso o campo já chega aqui valendo 0 no caso 'expired'.
   */
  creditsLost: number
  /**
   * KINEO-BUGHUNT-FILA-2026-08-08 — quanto tempo REALMENTE falta, medido na
   * linha. É daqui que sai a copy do `ending_soon`; ver `endingSoonTiming()`.
   * Para as coortes pós-fim vale 0 e ninguém lê.
   *
   * O relógio é o MESMO `now` que decidiu o kind, de propósito: este arquivo
   * inteiro existe para não ter duas verdades sobre o mesmo instante. A deriva
   * possível é o tempo do laço de envio (minutos), abaixo da granularidade de
   * hora da frase.
   */
  msLeft: number
  /**
   * KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — vídeos CONCLUÍDOS da conta
   * (`videos.status = 'completed'`), contados uma vez por execução para a
   * coorte pós-trial. É o único critério da extensão que fala do PRODUTO em
   * vez de falar do saldo — e a copy do e-mail afirma este número, então ele
   * não pode ser estimado a partir de créditos gastos (Fast custa 1, Creator
   * custa 20: "créditos usados" não determina "vídeos feitos").
   *
   * Vale 0 para as coortes que não precisam dele (ninguém lê fora da extensão).
   */
  videosMade: number
  /**
   * KINEO-FAILED-BY-US-2026-08-12 — a conta tem, nos últimos 14 dias, pelo
   * menos uma geração que falhou por causa NOSSA (ver `lib/lifecycle/
   * ourFailure.ts` para a regra estreita que autoriza esta afirmação).
   *
   * Só duas superfícies leem: os ramos "nunca gerou nada" do `ending_soon` e do
   * `downgraded_loss`. Fora deles não muda uma vírgula do e-mail.
   *
   * ⚠️ FALHA ABERTA, ao contrário de `videosMade` — e a diferença é o tipo de
   * afirmação. `videosMade` vira NÚMERO impresso ("you made 4 videos"), então
   * ler errado publica uma mentira e a coorte inteira espera. Este campo só
   * ACRESCENTA um pedido de desculpas: `false` por leitura falha devolve a copy
   * que já está no ar hoje, que não afirma culpa de ninguém. Silenciar o
   * `ending_soon` da coorte inteira por causa de uma consulta auxiliar custaria
   * o último e-mail que essas contas ainda recebem — janela de horas, não de
   * dias. O degrade é observável no JSON de resposta (`our_failure_degraded`).
   */
  failedOnUs: boolean
  /**
   * KINEO-SPRINT-V1V4-2026-09-01 (#25) — o tema do ULTIMO video concluido da
   * conta, ja normalizado pela regua de `lib/seriesContinuation.ts`.
   *
   * Existe por um numero so: das 285 pessoas externas que fizeram EXATAMENTE
   * UM video em 30 dias, 281 tem tema aproveitavel, e 200 delas receberam o
   * `downgraded_loss` — o e-mail que mais alcanca esse grupo e que oferecia um
   * unico caminho: /pricing. Com este campo ele passa a oferecer tambem o
   * episodio 2 do tema DELA.
   *
   * ⚠️ FALHA ABERTA, como `failedOnUs` e ao contrario de `videosMade`: `null`
   * (leitura falhou, sem tema, ou tema vazio) devolve o e-mail de hoje BYTE A
   * BYTE. Nenhuma coorte e silenciada por causa de um campo que so ACRESCENTA
   * um link.
   */
  lastTopic: string | null
  /**
   * sprint-assinaturas #20 — custo (credits_used) e duracao do video mais
   * RECENTE, colhidos no MESMO laco que ja pagina `videos` (zero consulta
   * nova). So o `downgraded_loss` le, e so no corpo `burned_with_film`, para
   * dizer "62-second film" e quantos filmes COMO ESSE cada plano compra.
   * Falha aberta (null): a copy nao afirma segundos nem filmes por plano.
   */
  lastCost: number | null
  lastDuration: number | null
  /**
   * sprint-assinaturas #20 — a pessoa gastou o trial INTEIRO ('downgraded',
   * used >= granted) e tem >= 1 video entregue: e o lead mais quente da casa
   * e recebia a lista de perdas 10 min depois do filme chegar (zareshahi0).
   * Decidido em `dueKind` (unico lugar que ve status/granted/used/videosMade).
   */
  burnedWithFilm: boolean
  /**
   * KINEO-SPRINT-ASSINATURAS-2026-09-02 (#11) — o que a conta RECEBEU fora de
   * `videos`: clipes do /animate, imagens, audios. Existe porque xzavior000
   * fez 5 clipes em 24 min, queimou o trial inteiro e recebeu "nothing we
   * sent you actually put a finished video in your hands". Ver o cabecalho de
   * `lib/lifecycle/otherDeliveries.ts`.
   *
   * So o `downgraded_loss` le, e so para NAO cair no ramo "nunca rodou" e para
   * dizer o que fica na conta. FALHA ABERTA (zeros): o pior caso e a copy de
   * hoje. Nunca autoriza extensao, credito ou desconto.
   */
  otherMade: OtherDeliveries
}

interface ProfileRow extends TrialProfileFields {
  id?: unknown
  email?: unknown
  plan?: unknown
  has_paid?: unknown
  trial_variant?: unknown
  trial_extended?: unknown
  trial_credits_granted?: unknown
  trial_downgraded_at?: unknown
  video_credits?: unknown
}

function variantOf(raw: unknown): TrialVariant {
  return raw === '7d' ? '7d' : '3d'
}

/**
 * Decide QUAL e-mail (se algum) esta linha deve receber hoje. No máximo UM
 * kind por conta por execução — as coortes são disjuntas por status, e os dois
 * cruzamentos possíveis são resolvidos por prioridade explícita:
 *   · trial recém-nascido da variante 3d: welcome (D0/D1) ganha de ending_soon;
 *   · expirado com 3+ vídeos e crédito utilizável: extensão ganha da perda/D5.
 *
 * `videoCounts` — vídeos concluídos por conta, SÓ da coorte pós-trial. `null`
 * significa "não consegui contar nesta execução" e é FALHA FECHADA: sem essa
 * contagem não dá para provar os 3+ vídeos, e mandar `downgraded_loss` no
 * lugar queimaria o claim permanente da PK por causa de um erro de leitura.
 * A coorte pós-trial inteira espera o próximo run (o cron é HORÁRIO e a janela
 * da perda é de 48h — adiar uma hora não custa e-mail nenhum).
 */
function dueKind(
  row: ProfileRow,
  now: number,
  videoCounts: Map<string, number> | null,
  ourFailureIds: ReadonlySet<string>,
  lastTopics: Map<string, string> | null,
  lastFilms: Map<string, { cost: number | null; duration: number | null }> | null,
  otherCounts: Map<string, OtherDeliveries> | null = null,
): Candidate | null {
  const id = typeof row.id === 'string' ? row.id : ''
  const email = typeof row.email === 'string' ? row.email.trim() : ''
  if (!id || !email || isTestEmail(email)) return null
  // Pagante NUNCA recebe e-mail de trial — nem welcome (o webhook da Stripe
  // carimba 'converted', mas a denylist invertida cobre a janela até lá).
  if (isPayingProfile(row)) return null

  const status = typeof row.trial_status === 'string' ? row.trial_status : ''
  const variant = variantOf(row.trial_variant)
  const used = trialCreditsUsed(row)
  const extended = row.trial_extended === true
  const endsMs = parseTime(row.trial_ends_at)

  // KINEO-D0-EMAIL-REVIEW-2026-08-07 — saldo que o e-mail pode AFIRMAR. Dois
  // limites, e vale o menor: o que sobra do teto do trial (o e-mail fala do
  // trial) e o saldo real da conta (é dele que o débito sai). Saldo ausente ou
  // não-numérico cai no limite do teto — nunca inventa crédito que não existe.
  const rawBalanceNow = row.video_credits
  const balanceNow =
    typeof rawBalanceNow === 'number' && Number.isFinite(rawBalanceNow) ? Math.max(0, rawBalanceNow) : null
  const capLeft = Math.max(0, TRIAL_CREDIT_CAP - used)
  const creditsLeft = balanceNow === null ? capLeft : Math.min(capLeft, balanceNow)

  // KINEO-TRIAL-DOWNGRADE-SILENCE-2026-08-10 — `granted` era calculado DENTRO
  // do ramo da extensão. Agora dois ramos precisam do mesmo número (a extensão,
  // para devolver; a perda, para afirmar quanto sumiu), e duas cópias da mesma
  // conta em ramos diferentes é exatamente como este arquivo já criou bug antes
  // (ver o bloco da coorte no cron de downgrade). Uma conta, um lugar.
  const grantedRaw = row.trial_credits_granted
  const granted = typeof grantedRaw === 'number' && Number.isFinite(grantedRaw) ? grantedRaw : 0

  const base = {
    id,
    email,
    variant,
    status,
    needsExtensionUpdate: false,
    balance: null,
    restore: 0,
    creditsLeft,
    creditsUsed: used,
    // Preenchido de verdade só no ramo 'downgraded' — ver o comentário do campo.
    creditsLost: 0,
    msLeft: Math.max(0, endsMs - now),
    // Preenchido de verdade só no ramo da extensão — ver o comentário do campo.
    videosMade: 0,
    // KINEO-FAILED-BY-US-2026-08-12 — vale para TODOS os kinds desde já (o
    // conjunto vem pronto), mas só os dois ramos "nunca gerou nada" leem.
    //
    // ⚠️ A SEGUNDA CONDIÇÃO NÃO É REDUNDANTE, e ela é o achado da 2ª passada da
    // revisão. A copy nova afirma "you tried and it NEVER finished" — falso
    // para quem tem vídeo pronto. O ramo do `ending_soon` que hospeda a frase
    // não filtra por vídeo: ele filtra por `creditsUsed <= 0`, apoiado no
    // comentário "gerar debita, logo 0 usados ⇒ 0 vídeos". Isso é verdade
    // enquanto o trial for concedido NO CADASTRO (medido hoje: 0 contas com 0
    // créditos usados e vídeo pronto, em 51). No dia em que um usuário free
    // ANTIGO ganhar um trial, ele terá vídeos e 0 créditos de trial usados — e
    // a inferência vira mentira sem que uma linha mude. `videoCounts` cobre a
    // coorte inteira (a leitura é sobre `cohortIds`, não só a pós-trial), então
    // conferir custa um `get`. `null` (leitura falhou) mantém `true`: este
    // campo falha ABERTO por decisão, e o pior caso do fail-open é a copy de
    // hoje para alguém que talvez tenha um vídeo — não uma coorte silenciada.
    failedOnUs:
      ourFailureIds.has(id) && (videoCounts === null || (videoCounts.get(id) ?? 0) === 0),
    // Normalizado UMA vez aqui (e nao na hora de montar o e-mail) para que o
    // teste consiga provar o contrato do campo sem montar e-mail nenhum.
    lastTopic: normalizeSeriesSeed(lastTopics?.get(id) ?? '') || null,
    lastCost: lastFilms?.get(id)?.cost ?? null,
    lastDuration: lastFilms?.get(id)?.duration ?? null,
    // So vira true no ramo pos-trial, com videosMade real — ver `postBase`.
    burnedWithFilm: false,
    // #11 — falha aberta: sem leitura, zeros (copy de hoje).
    otherMade: otherCounts?.get(id) ?? EMPTY_OTHER_DELIVERIES,
  }

  if (status === 'active') {
    // Retry do e-mail de extensão: o UPDATE aconteceu num run anterior mas o
    // envio falhou depois do claim ser desfeito (ou o processo morreu antes
    // dele). A assinatura é inconfundível: já estendido, ativo, e o novo prazo
    // cabe dentro dos 3 dias da extensão. Sem UPDATE novo — só o e-mail.
    if (extended && endsMs > now && endsMs - now <= EXTENSION_DAYS * DAY_MS) {
      // KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — a copy nova AFIRMA o número
      // de vídeos, então o retry também depende da contagem. Sem ela, adia (é
      // um retry: o custo de esperar mais uma hora é zero).
      if (videoCounts === null) return null
      return { ...base, kind: 'trial_extended', videosMade: videoCounts.get(id) ?? 0 }
    }
    // 'active' no banco mas já vencido (relógio ou teto) = limbo pré-cron de
    // downgrade. Nenhum e-mail: "ends tomorrow" depois do fim é mentira, e a
    // coorte pós-fim pega a linha quando o status virar.
    if (!isTrialActive(row, now)) return null
    const startMs = endsMs - TRIAL_VARIANT_DAYS[variant] * DAY_MS
    const ageMs = now - startMs
    // D0_MIN_AGE_MS: ver o bloco da constante. Só o welcome espera; o aviso de
    // prazo, não.
    if (ageMs >= D0_MIN_AGE_MS && ageMs < 24 * HOUR_MS) return { ...base, kind: 'd0_welcome' }
    if (endsMs - now <= ENDING_SOON_MS[variant]) return { ...base, kind: 'ending_soon' }
    if (ageMs >= D0_MIN_AGE_MS && ageMs < D0_WINDOW_MS) return { ...base, kind: 'd0_welcome' }
    return null
  }

  if (status === 'expired' || status === 'downgraded') {
    // Fim observável: o PRIMEIRO carimbo real que já passou — `trial_ends_at`
    // para quem morreu de relógio, `trial_downgraded_at` para quem estourou o
    // teto antes do prazo. Sem nenhum dos dois, a linha ainda não tem relógio —
    // espera o próximo run. (A frase anterior aqui dizia "trial_ends_at quando
    // já passou; SENÃO o carimbo", que é literalmente o defeito descrito no
    // bloco KINEO-TRIAL-CLOCK-NONMONOTONIC abaixo: o "senão" caducava.)
    //
    // ⚠️ KINEO-DOWNGRADE-CRON-FIX-2026-08-07 — DEPENDÊNCIA REGISTRADA, NÃO É
    // BUG DESTA ROTA. A COORTE aqui está certa: `.in('trial_status', ['active',
    // 'expired','downgraded'])` já enxerga quem morreu por TETO com prazo no
    // futuro. Quem NÃO enxergava era o relógio: para essa pessoa
    // `trial_ends_at` está no futuro, então o único carimbo possível é
    // `trial_downgraded_at` — escrito exclusivamente pelo cron de downgrade.
    // Enquanto aquele cron devolvia 200 sem processar ninguém (rodadas de
    // 01:55:17Z e 02:55:07Z de 07/08), `endedAt` ficava 0 e o D5/D10 NUNCA saía
    // — justamente para o lead mais quente do funil, o que gastou os 40
    // créditos. Corrigido na origem (a coorte do downgrade), e não aqui:
    // inventar um segundo relógio (ex.: último débito) criaria duas verdades
    // sobre "quando o trial acabou", que é a classe de erro que este arquivo
    // inteiro existe para impedir.
    // ═══ KINEO-TRIAL-CLOCK-NONMONOTONIC-2026-08-10 — O RELÓGIO ANDAVA PARA TRÁS ══
    //
    // O DEFEITO (medido em produção, não deduzido). A linha anterior era:
    //
    //     endsMs > 0 && endsMs <= now ? endsMs : downAt > 0 && downAt <= now ? downAt : 0
    //
    // Ela prefere `trial_ends_at` SEMPRE QUE ele já passou. Para quem morre no
    // TETO, `trial_downgraded_at` é dias ANTES de `trial_ends_at` — então o
    // ternário devolve `downAt` enquanto o prazo é futuro e TROCA para `endsMs`
    // no instante em que o prazo passa. `sinceEnd` não é uma função crescente do
    // tempo: ele CAI para ~0 nesse instante, e a cadência inteira reinicia.
    //
    // A COORTE ATINGIDA É 100% DA COORTE REBAIXADA. 10 de 10 linhas
    // 'downgraded' da história têm `trial_ends_at > trial_downgraded_at` — ou
    // seja, TODA pessoa que já foi rebaixada morreu por teto, nenhuma por
    // relógio. Não é um caso de borda; é o caso normal. (9 delas são reais; a
    // décima, `84c9ddee`, cai em `isTestEmail` e nunca receberia e-mail. O
    // script de prova roda sobre as 9 — os dois números falam da mesma coorte.)
    //
    // O CUSTO, nas 9 linhas reais de hoje, MEDIDO simulando o cron hora a hora
    // (scripts/prove-trial-clock-monotonic.mjs, seção 4 — e não por aritmética
    // sobre as datas, que foi como a primeira versão deste comentário errou o
    // número; a revisão adversarial derrubou, ver o doc da sprint). O desvio do
    // relógio NÃO cai igual sobre os três kinds:
    //   · downgraded_loss — a janela de 48h REABRE no instante da troca. Não
    //     duplica e-mail (o claim em trial_emails_log é permanente); o que ela
    //     dava, por acidente, era uma 2ª janela caso a 1ª fosse comida pela
    //     supressão cruzada. Com o cron horário, 48 tentativas contra uma trava
    //     de 24h/usuário tornam essa rede desnecessária.
    //   · expired_offer_d5 (COMEBACK50) — atrasa +3d SÓ nas 5 linhas em que
    //     `ends − down < 5d`; nas outras 4 o D5 abre antes de o ternário trocar
    //     de perna, e os dois relógios disparam no MESMO instante. Média 1,7d.
    //     `e6acebb8` recebe o D5 em 14/08 nos dois — o número "21/08" da versão
    //     anterior deste comentário era do D10.
    //   · expired_lastcall_d10 — este desliza SEMPRE: +3d em 5 linhas e +7d em
    //     4, média 4,8d. Em `e6acebb8` o defeito empurra o last-call de 19/08
    //     (relógio novo) para 26/08 (relógio antigo). É o kind que a correção
    //     realmente devolve.
    //
    // ⚠️ RESTRIÇÃO DE CALENDÁRIO PARA O DEPLOY. O relógio novo anda para trás,
    // logo as janelas FECHADAS também: o D10 novo fecha em `down+15d` enquanto o
    // antigo só abre em `ends+10d`. Nas 4 linhas de desvio grande esses
    // intervalos não se sobrepõem — deployar entre 25/08 e 27/08 mataria o
    // last-call dessas contas EM SILÊNCIO. A seção 6 do script de prova falha
    // sozinha se o dia do deploy cair nessa faixa; rodar `npm run
    // prove:trial-clock` antes de subir é o que torna esta frase acionável.
    //
    // ISTO NÃO É OPINIÃO NOVA SOBRE QUAL É O FIM: o bloco logo acima já decidiu
    // que, para quem estoura o teto, o fim observável é `trial_downgraded_at`. O
    // ternário concordava com essa decisão por alguns dias e depois a desfazia
    // sozinho. A correção só faz a decisão parar de expirar.
    //
    // A REGRA: o fim é o PRIMEIRO carimbo real que já passou, nunca o mais
    // recente. Perda de acesso é evento único dentro de um ciclo — uma vez que
    // aconteceu, a distância até ela só cresce. (Um ciclo NOVO, aberto pela
    // extensão, reescreve `trial_ends_at` e reinicia legitimamente a contagem.)
    //
    // ⚠️ POR QUE `downAt` SÓ VALE EM 'downgraded': a coluna é reescrita a cada
    // rebaixamento (patch incondicional em `downgradeExpiredTrial`), mas uma
    // linha 'expired' é o estado TRANSITÓRIO entre o vencimento — teto OU
    // relógio, gravado pelo próprio débito em `recordReverseTrialDebit` — e o
    // cron das :55 fechar a conta. Nela o carimbo é, por construção, de um ciclo
    // ANTERIOR (rebaixado → estendido → venceu de novo). Confiar nele ali seria
    // adotar como fim deste ciclo a morte do ciclo passado, e o `min()` tornaria
    // esse erro permanente. Em 'expired' o único relógio honesto é o prazo. Hoje
    // isso é inerte: 0 linhas 'expired' e 0 `trial_extended` no banco, e as 10
    // 'downgraded' têm o carimbo.
    //
    // `endedByStamp`, e não "byCap": `trial_downgraded_at` é carimbado nas duas
    // mortes, teto e relógio — `downgradeExpiredTrial` não distingue. O `min()`
    // neutraliza a diferença; o NOME não pode afirmar uma causa que a coluna não
    // carrega.
    const downAt = status === 'downgraded' ? parseTime(row.trial_downgraded_at) : 0
    const endedByClock = endsMs > 0 && endsMs <= now ? endsMs : 0
    const endedByStamp = downAt > 0 && downAt <= now ? downAt : 0
    const endedAt =
      endedByClock > 0 && endedByStamp > 0
        ? Math.min(endedByClock, endedByStamp)
        : endedByClock > 0
          ? endedByClock
          : endedByStamp
    if (endedAt === 0) return null
    const sinceEnd = now - endedAt

    // KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — falha fechada: sem contagem
    // de vídeos não se decide NADA sobre esta linha (nem a extensão, nem a
    // perda, nem o D5). Ver o bloco do parâmetro `videoCounts`.
    if (videoCounts === null) return null
    const videosMade = videoCounts.get(id) ?? 0

    if (!extended && videosMade >= EXTENSION_MIN_VIDEOS && sinceEnd < EXTENSION_MAX_AGE_MS) {
      const rawBalance = row.video_credits
      const balance = typeof rawBalance === 'number' && Number.isFinite(rawBalance) ? rawBalance : null
      // `granted` vem do escopo da função desde
      // KINEO-TRIAL-DOWNGRADE-SILENCE-2026-08-10 (era recalculado aqui).
      // Linha 'downgraded' já teve o não-gasto revogado pelo cron de downgrade;
      // a extensão devolve granted−used — o teto do que aquela revogação pode
      // ter tirado (ela revoga min(saldo, não-gasto), então no caso raro de o
      // saldo estar abaixo do não-gasto isto devolve um pouco mais do que saiu;
      // limitado a UMA vez por conta via trial_extended e a ≤40 por construção,
      // é o lado barato do erro). Linha sem registro de concessão (granted 0)
      // devolve 0 — mesma regra de dinheiro de downgradeExpiredTrial. Linha
      // 'expired' ainda tem o saldo: devolver seria conceder em dobro.
      const restore = status === 'downgraded' ? Math.max(0, granted - used) : 0
      // ⚠️ KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — o teste é sobre o saldo
      // DEPOIS da restauração, e não sobre `creditsLeft`. Numa linha
      // 'downgraded' o cron de downgrade já zerou `video_credits`, então
      // `creditsLeft` (= min(capLeft, saldo)) vale 0 para TODA a coorte
      // rebaixada — usá-lo aqui reprovaria justamente as contas que a extensão
      // existe para servir. O crédito utilizável é o que a extensão vai
      // escrever: saldo observado + restauração, limitado pelo teto de 40.
      const usableAfterExtension = Math.min(capLeft, (balance ?? 0) + restore)
      if (usableAfterExtension >= EXTENSION_MIN_USABLE_CREDITS) {
        return {
          ...base,
          kind: 'trial_extended',
          needsExtensionUpdate: true,
          balance,
          restore,
          creditsLeft: usableAfterExtension,
          videosMade,
        }
      }
      // Esgotou o teto tendo feito 3+ vídeos: NÃO recebe dias que não pode
      // gastar. Cai de propósito no `downgraded_loss` logo abaixo — é o lead
      // mais quente do funil e o pedido certo para ele é o cartão.
    }
    // ═══ KINEO-TRIAL-DOWNGRADE-SILENCE-2026-08-10 — O E-MAIL DA PERDA ════════
    // Chega aqui quem NÃO foi estendido: ou já usou 10+ créditos, ou já gastou
    // a extensão única, ou passou dos 7 dias. Antes desta linha existir, essa
    // pessoa não recebia NADA por 5 dias. Ver o bloco de DOWNGRADED_LOSS_TO_MS.
    //
    // A frase de crédito só é afirmada sobre linha 'downgraded': é a única em
    // que a revogação COMPROVADAMENTE aconteceu (o cron carimba o status e o
    // saldo na MESMA escrita atômica). Em 'expired' o saldo ainda está lá, e o
    // e-mail se calaria sobre créditos em vez de mentir — por isso o `0`.
    // ⚠️ KINEO-LOSS-NEVER-RAN-2026-08-12 — `videosMade` PRECISA descer em TODOS
    // os retornos desta coorte, não só no da extensão. O `base` carrega 0, e 0
    // é o valor que o `downgraded_loss` lê como "nunca gerou nada": deixar o
    // default aqui mandaria a versão "você nunca rodou" para 100% da coorte,
    // inclusive para quem fez 12 vídeos. É a mesma classe de erro do campo
    // `creditsLost`, que existe justamente porque um default silencioso vira
    // afirmação falsa no corpo do e-mail.
    const postBase = {
      ...base,
      videosMade,
      burnedWithFilm: isBurnedWithFilm({ status, granted, used, videosMade }),
    }
    if (sinceEnd < DOWNGRADED_LOSS_TO_MS) {
      const lost = status === 'downgraded' ? Math.max(0, granted - used) : 0
      return { ...postBase, kind: 'downgraded_loss', creditsLost: lost }
    }
    if (sinceEnd >= OFFER_D5_FROM_MS && sinceEnd < OFFER_D10_FROM_MS) {
      return { ...postBase, kind: 'expired_offer_d5' }
    }
    if (sinceEnd >= OFFER_D10_FROM_MS && sinceEnd < OFFER_D10_TO_MS) {
      return { ...postBase, kind: 'expired_lastcall_d10' }
    }
  }

  return null
}

/**
 * ═══ KINEO-BUGHUNT-FILA-2026-08-08 — O PRAZO VEM DO RELÓGIO, NÃO DA VARIANTE ═══
 *
 * O DEFEITO (item #3 de docs/BUGHUNT-2026-08-08.md, medido, não deduzido):
 * a frase era `c.variant === '3d' ? 'tomorrow' : 'in 2 days'`. Ou seja, o
 * e-mail afirmava um PRAZO derivado do plano do trial, não do tempo que
 * faltava — e as duas coisas divergem sempre que a supressão de 24h empurra o
 * envio para o dia seguinte.
 *
 * O caminho real: cron diário 16:30Z + supressão cruzada de 24h. Para um trial
 * de 3 dias nascido depois das 16:30, o `d0_welcome` ocupa o D1, o `ending_soon`
 * do D2 é suprimido pelo PRÓPRIO welcome, e a linha só passa no D3 — a ~1h30 do
 * fim, dizendo "ends tomorrow". Metade das contas reais é 3d.
 *
 * A CORREÇÃO NÃO MEXE EM QUEM RECEBE, SÓ NO QUE O E-MAIL DIZ. `dueKind()` não
 * mudou uma linha: a coorte, a janela `ENDING_SOON_MS`, a prioridade e a
 * cadência diária são exatamente as de antes. Trocar a cadência (a outra
 * correção sugerida no doc, 6/6h) multiplicaria por 4 as execuções de um job de
 * e-mail sem ninguém ter medido o custo — e não é preciso: o problema nunca foi
 * a hora do envio, foi a frase mentir sobre ela.
 *
 * NOS DIAS CERTOS A COPY É BYTE A BYTE A MESMA — é isso que torna a mudança
 * segura de auditar:
 *   · 3d disparando no D2 (msLeft ≤ 36h, ≥ 24h) → "tomorrow"      + o subject antigo
 *   · 7d disparando no D5 (msLeft ≤ 60h, ≥ 48h) → "in 2 days"     + o subject antigo
 * O que muda é só o caso que estava errado: com menos de 24h a frase vira
 * "in about N hours", e abaixo de 6h o assunto vira "Last call" — porque
 * mandar "acaba amanhã" para quem acaba em 90 minutos não é urgência, é
 * informação falsa, e queima a única chance de conversão que resta.
 *
 * ARREDONDAMENTO PARA BAIXO (`Math.floor`), sempre: o e-mail nunca pode
 * prometer mais tempo do que existe. 5h59 vira "about 5 hours", não 6.
 */
const ENDING_SOON_URGENT_MS = 6 * HOUR_MS

// ⚠️ DEFEITO DA MINHA 1ª PASSADA, corrigido: esta função nasceu `export`ada
// (reflexo de "seria bom testar de fora"). Um arquivo `route.ts` do App Router
// só pode exportar os campos que o Next reconhece — `GET`, `dynamic`,
// `maxDuration` e afins; qualquer outro nome faz o `next build` falhar na
// validação de tipos das rotas. E o `tsc --noEmit` desta casa NÃO pegaria:
// a checagem mora no .d.ts que o Next gera durante o build. O teste de fora
// mora em scripts/prove-ending-soon-timing.mjs, que carrega uma cópia
// declarada como cópia.
function endingSoonTiming(msLeft: number): { when: string; subject: string } {
  const safeMs = Number.isFinite(msLeft) ? Math.max(0, msLeft) : 0
  if (safeMs < HOUR_MS) {
    return {
      when: 'in less than an hour',
      subject: 'Last call — your Creator trial ends in less than an hour',
    }
  }
  if (safeMs < DAY_MS) {
    const hours = Math.floor(safeMs / HOUR_MS)
    const when = `in about ${hours} ${hours === 1 ? 'hour' : 'hours'}`
    return {
      when,
      subject:
        safeMs < ENDING_SOON_URGENT_MS
          ? `Last call — your Creator trial ends ${when}`
          : `Your Creator trial ends ${when}`,
    }
  }
  if (safeMs < 2 * DAY_MS) {
    return { when: 'tomorrow', subject: 'Your Creator trial ends tomorrow' }
  }
  const days = Math.floor(safeMs / DAY_MS)
  return { when: `in ${days} days`, subject: `${days} days left on your Creator trial` }
}

function utm(campaign: string): string {
  return `utm_source=lifecycle&utm_medium=email&utm_campaign=${campaign}&intent_campaign=${campaign}`
}

// ── KINEO-D0-ONE-CLICK-2026-08-12 ──────────────────────────────────────────
// POR QUE ISTO EXISTE (medido em produção hoje, 12/08 ~10:15Z):
//   · 98 trials ativos; 50 deles (51%) NUNCA geraram um vídeo.
//   · Desses 50, os 50 NUNCA TENTARAM — zero linhas em `videos`, nem falhas.
//     Não é bug de render: é gente que chegou, ganhou 40 créditos e não clicou.
//   · 1.990 créditos concedidos estão parados nessas contas. 17 expiram em 48h.
//   · 44 dos 50 RECEBERAM o d0_welcome. O e-mail chegou. Ninguém agiu.
//   · Efeito medido do d0_welcome em 93 envios (76 maduros >24h): 6 vídeos
//     depois do envio = 6,5%. Entre os que nunca tinham gerado: 0.
//
// O e-mail não falhava por entrega nem por texto — falhava por DESTINO. O CTA
// levava para `/generate` puro, que é uma caixa de texto vazia pedindo uma
// ideia. Quem não tem ideia não digita: essa é a parede.
//
// REGRA ZERO — o trilho de 1 clique JÁ EXISTE e já é usado pelas 28 páginas de
// SEO e pela /checkout/success: `/generate?prompt=<texto>&create_intent=fast`
// prefila e dispara sozinho (GenerateClient, effect do `create_intent`). Nada
// novo foi construído aqui; o d0_welcome era a única superfície de aquisição
// que ainda não usava o trilho.
//
// DUAS RESTRIÇÕES QUE O CÓDIGO IMPÕE (conferidas, não supostas):
//  1. `if (!explicitPrompt) consumeAndSkip('empty_prompt')` — o autostart exige
//     `prompt=` COM texto. Mandar só `viral_topic=` geraria um clique que não
//     faz nada, que é exatamente o modo de falha do item 7. Por isso os links
//     carregam o prompt.
//  2. `prompt` é cortado em 1000 chars (GenerateClient) / 2000 (page.tsx). Os
//     prompts do VIRAL_TOPICS_POOL têm ~1.400 chars de roteiro estruturado e
//     sairiam TRUNCADOS no meio de uma cena. Por isso o link leva o TÍTULO
//     curto: o AUTO-STRUCTURE (/api/generate-script, v2.5) transforma tema
//     livre em roteiro HOOK/MICRO REWARD antes do analyze-idea. Título curto é
//     o formato que aquele trilho foi desenhado para receber.
//  3. Sem `viral_topic=` de propósito: aquele parâmetro liga `fromViralNow`, que
//     mexe em `setMode`. O trilho provado das 28 páginas é prompt+create_intent
//     e só. Uma variável por vez.
//
// Os IDs do pool são estáveis (não rodam com a rotação de 4h de /viral-now),
// então um e-mail aberto 3 dias depois continua clicando em algo que existe.
const D0_TOPIC_COUNT = 3

function d0Seed(userId: string): number {
  // FNV-1a sobre o id da conta. NÃO é para sobreviver a reenvio: a idempotência
  // é a PK(user_id, email_kind) de `trial_emails_log` (o claim é permanente,
  // linha 55 e 128), então um segundo d0_welcome para a mesma conta não existe.
  // É para o disparo ser REPRODUZÍVEL: dado um id, dá para recalcular
  // exatamente quais 3 links aquela pessoa recebeu quando ela responder
  // "cliquei e deu errado". Um Math.random() aqui tornaria o e-mail já enviado
  // impossível de reconstruir.
  let h = 0x811c9dc5
  for (let i = 0; i < userId.length; i += 1) {
    h ^= userId.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * Três temas de VERTICAIS DISTINTAS, os de maior viralScore de cada uma,
 * girados pelo id da conta. Verticais distintas porque o objetivo do e-mail é
 * que a pessoa reconheça UM tema como "esse aí sou eu" — três variações de
 * dinheiro não dão essa chance.
 */
function starterTopics(userId: string): { title: string; label: string }[] {
  const bestByVertical = new Map<string, (typeof VIRAL_TOPICS_POOL)[number]>()
  for (const topic of VIRAL_TOPICS_POOL) {
    const current = bestByVertical.get(topic.vertical)
    if (!current || topic.viralScore > current.viralScore) bestByVertical.set(topic.vertical, topic)
  }
  const champions = [...bestByVertical.values()].sort(
    (a, b) => b.viralScore - a.viralScore || a.id.localeCompare(b.id),
  )
  if (champions.length === 0) return []
  const offset = d0Seed(userId) % champions.length
  const picked: { title: string; label: string }[] = []
  for (let i = 0; i < champions.length && picked.length < D0_TOPIC_COUNT; i += 1) {
    const topic = champions[(offset + i) % champions.length]
    picked.push({ title: topic.title, label: `${topic.emoji} ${topic.title}` })
  }
  return picked
}

function oneClickTopicUrl(title: string, campaign: string): string {
  return `${APP_URL}/generate?prompt=${encodeURIComponent(title)}&create_intent=fast&${utm(campaign)}`
}

/**
 * Blocos de 1 clique (texto + HTML) a partir de uma lista de temas. Extraído
 * porque o d0_welcome e o ending_soon precisam do MESMO bloco: manter duas
 * cópias era garantir que uma envelhecesse sozinha — o defeito de 05/08 com a
 * lista local do isTestEmail().
 */
function oneClickBlocks(
  topics: { title: string; label: string }[],
  campaign: string,
  attr: (url: string) => string,
): { text: string; html: string } {
  return {
    text: topics.map((t) => `${t.label}\n${oneClickTopicUrl(t.title, campaign)}`).join('\n\n'),
    html: topics
      .map(
        (t) =>
          `<p style="margin:0 0 10px;"><a href="${attr(oneClickTopicUrl(t.title, campaign))}" style="display:block;background:#f5f7fa;border:1px solid #d9e1ec;border-left:4px solid #2997ff;color:#111;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 16px;border-radius:8px;">${t.label} &rarr;</a></p>`,
      )
      .join('\n  '),
  }
}

// ── KINEO-SPRINT-V1V4-2026-09-01 (#25) — O SEGUNDO CAMINHO ────────────────
//
// O NUMERO QUE MANDOU CONSTRUIR ISTO (medido hoje, so pessoas externas):
//   · 285 pessoas fizeram EXATAMENTE UM video em 30 dias; 281 tem tema.
//   · para 206 delas o ULTIMO evento registrado na conta e um e-mail nosso —
//     ou seja, depois do video 1 nada mais acontece: a casa fala, ela nao volta.
//   · 200 dessas pessoas receberam o `downgraded_loss`. E o e-mail que mais
//     alcanca quem fez UM video.
//   · e o `downgraded_loss` de quem TEM video oferecia UM unico caminho:
//     /pricing. Pedimos dinheiro a quem ainda nao pediram para fazer o 2o video.
//
// O destino importa mais que o pedido (tabela da rodada #24, 30d, externos):
//   volta ao Studio em branco ....... 123 pessoas → 30 fizeram o 2o (24%)
//   chegada por continuacao de serie . 59 pessoas → 31 fizeram o 2o (53%)
//
// ⚠️ O QUE ESTE BLOCO NAO FAZ, DE PROPOSITO: nao toca no CTA de /pricing (ele
// continua byte a byte, e primeiro), nao fala de preco, de plano, de credito
// nem de cota. A licao do assunto "Your free video is still waiting" esta no
// comentario logo abaixo: o slot free e reservado ANTES do render, entao
// prometer "de graca" aqui pode ser falso. Este bloco promete so o que o link
// entrega: a caixa ja preenchida com o episodio 2 do tema dela.
// ⚠️ A FONTE E PARAMETRO, NAO CONSTANTE (#26). A 1a versao deste helper
// gravava `lifecycle_loss_email` fixo. Ao reusa-lo no `ending_soon` isso
// jogaria os cliques dos DOIS e-mails no mesmo balde de
// `series_continuation_landed`, e a unica pergunta que este bloco existe para
// responder — QUAL carta faz a pessoa voltar — ficaria sem resposta. Campo que
// aparece em mais de uma superficie nasce de UMA variavel, por superficie.
function episodeTwoBlock(
  seed: string | null,
  campaign: string,
  source: SeriesContinuationSource,
  attr: (url: string) => string,
): { text: string; html: string } | null {
  const tema = normalizeSeriesSeed(seed ?? '')
  if (!tema) return null
  const url = buildSeriesContinuationEmailUrl(APP_URL, tema, source, {
    utm_source: 'lifecycle',
    utm_medium: 'email',
    utm_campaign: campaign,
    intent_campaign: campaign,
  })
  // Sem tema utilizavel o helper devolve `/generate` pelado — que e exatamente
  // o destino de 24% que este bloco existe para evitar. Fail-closed: sem
  // episodio 2 de verdade, nenhum bloco.
  if (!url.includes('prompt=')) return null
  const label = `Episode 2: ${tema}`
  return {
    text: `Or make episode 2 of the one you already made — it opens with the topic already written:\n${label}\n${url}`,
    html:
      `  <p style="margin:0 0 10px;font-size:14px;color:#555;">Or make <strong>episode 2</strong> of the one you already made &mdash; it opens with the topic already written:</p>\n` +
      `  <p style="margin:0 0 18px;"><a href="${attr(url)}" style="display:block;background:#f5f7fa;border:1px solid #d9e1ec;border-left:4px solid #2997ff;color:#111;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 16px;border-radius:8px;">${escapeHtmlText(label)} &rarr;</a></p>`,
  }
}

/** O tema vem do banco (texto do usuario) e vai para dentro de um <a>. Escapar
 *  nao e paranoia: um tema com `<` quebraria o HTML do e-mail inteiro. */
function escapeHtmlText(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildEmail(c: Candidate): { subject: string; text: string; html: string; body?: LossBody } {
  const footerText = emailFooterText(c.id)
  const footerHtml = emailFooterHtml(c.id)
  // KINEO-D0-EMAIL-REVIEW-2026-08-07 — 480px → 560px: o rodapé de
  // emailFooterHtml() é 560px com `margin:… auto`, então o corpo de 480px
  // ficava à esquerda e o rodapé centralizado, desalinhados no mesmo e-mail.
  const wrap = (inner: string) =>
    `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.6;max-width:560px;">${inner}</div>\n${footerHtml}`
  // `&` cru dentro de href é referência de entidade não terminada. Escapar SÓ
  // no HTML — a versão `text` tem que continuar com a URL literal, senão a
  // pessoa cola "&amp;utm_source" no navegador.
  const attr = (url: string) => url.replace(/&/g, '&amp;')
  const cta = (url: string, label: string) =>
    `<p style="margin:0 0 20px;"><a href="${attr(url)}" style="display:inline-block;background:#2997ff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:10px;">${label} &rarr;</a></p>`
  const sig = `<p style="margin:0 0 2px;">Kineo Team</p>\n<p style="margin:0;"><a href="https://www.usekineo.com" style="color:#2997ff;">usekineo.com</a></p>`

  if (c.kind === 'd0_welcome') {
    const url = `${APP_URL}/generate?${utm('trial_d0')}`
    // ── KINEO-D0-EMAIL-REVIEW-2026-08-07 — TRÊS AFIRMAÇÕES CORRIGIDAS ────────
    //
    // 1. "50 credits just landed in your account". As duas primeiras contas
    //    reais (07/08) receberiam isso com 39 no saldo — já tinham gerado um
    //    Short. `${TRIAL_CREDIT_CAP}` é a CONCESSÃO; a frase fala do SALDO. O
    //    número passa a ser `c.creditsLeft`, medido na linha.
    //
    // 2. "everything Creator has is unlocked". FALSO por spec: o trial NUNCA
    //    tem os motores Studio (Kling / Veo / Hollywood — lib/reverseTrial.ts,
    //    invariante 2 de getEffectiveEntitlement: `allowsStudioEngines` é
    //    `isPaidAccount`, jamais `treatAsPaid`), e o plano Creator é vendido
    //    justamente COM Hollywood ("1 Hollywood film every month included",
    //    lib/pricing.ts). O e-mail prometia um motor que o servidor recusa com
    //    402. A frase passa a ser a MESMA que a copy pública aprovada usa:
    //    "every engine except Studio" (ON_COPY em lib/freeTierOffer.ts).
    //
    // 3. "Make your first Short" para quem já fez o primeiro. Ambas as contas
    //    reais tinham trial_credits_used=1 e video_ready_sent_at carimbado
    //    horas antes. Condicional em `c.creditsUsed`.
    const first = c.creditsUsed <= 0
    const creditLine = first
      ? `${c.creditsLeft} credits are sitting in your account`
      : `You have ${c.creditsLeft} credits left`
    // KINEO-D0-ONE-CLICK-2026-08-12 — a frase deixa de mandar a pessoa DIGITAR
    // (a parede: 50 de 50 que não geraram também nunca tentaram) e passa a
    // mandar ESCOLHER. Ver o bloco de comentário em starterTopics().
    const topics = starterTopics(c.id)
    const bodyLine = first
      ? `The fastest way to see what that means is to not think about it. Pick one of these and the video starts writing and rendering by itself — about a minute, nothing to fill in:`
      : `You've already put it to work once — the rest of the trial is for finding the format that sticks. Pick one and it starts by itself:`
    const ctaLabel = first ? 'Make your first Short' : 'Make your next Short'
    // Fallback: se o pool ficar vazio por qualquer motivo, o e-mail volta a ser
    // exatamente o de antes em vez de sair sem CTA nenhum.
    const hasTopics = topics.length > 0
    const bodyLineSafe = hasTopics
      ? bodyLine
      : first
        ? `The fastest way to see what that means: make one Short. Type any topic, hit generate, and it's done in about a minute.`
        : `You've already put it to work once — the rest of the trial is for finding the format that sticks. Type any topic, hit generate, and it's done in about a minute.`
    const d0Blocks = oneClickBlocks(topics, 'trial_d0', attr)
    const topicsText = hasTopics
      ? `\n${d0Blocks.text}\n\nOr start from your own topic: ${url}\n`
      : `\n${ctaLabel}: ${url}\n`
    const topicsHtml = hasTopics
      ? `${d0Blocks.html}
  <p style="margin:14px 0 20px;font-size:14px;color:#555;">Or <a href="${attr(url)}" style="color:#2997ff;">start from your own topic</a>.</p>`
      : cta(url, ctaLabel)
    const text = `Hey,

Your Creator trial is live. ${creditLine} — EVERY engine is unlocked, Kling 3 included. Films carry a watermark until you upgrade.

${bodyLineSafe}
${topicsText}
Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial is live.</strong> ${creditLine} &mdash; EVERY engine is unlocked, Kling 3 included. Films carry a watermark until you upgrade.</p>
  <p style="margin:0 0 14px;">${bodyLineSafe}</p>
  ${topicsHtml}
  ${sig}`)
    return { subject: `Your Creator trial is live — ${c.creditsLeft} credits inside`, text: `${text}${footerText}`, html }
  }

  if (c.kind === 'ending_soon') {
    const url = `${APP_URL}/pricing?${utm('trial_ending')}`
    // KINEO-BUGHUNT-FILA-2026-08-08 — era `c.variant === '3d' ? 'tomorrow' :
    // 'in 2 days'`: um prazo derivado do PLANO do trial, não do tempo que
    // falta. Ver o bloco de `endingSoonTiming()`.
    const { when, subject } = endingSoonTiming(c.msLeft)
    // KINEO-D0-EMAIL-REVIEW-2026-08-07 — "You're back to the free daily limit"
    // era a copy da flag DESLIGADA (3 Fast a cada 24h). Com KINEO_REVERSE_TRIAL_
    // ENABLED ligada — o único mundo em que este e-mail existe — o free tier é
    // 1 Fast por MÊS (ON_OFFER: limit 1, windowMs 30 dias). Dizer "daily"
    // prometia 30x o que a pessoa vai receber e ainda esvaziava a urgência do
    // próprio e-mail. A linha vem de getFreeTierOffer() para não poder divergir
    // de novo quando o free tier mudar.
    const freeResidual = getFreeTierOffer().copy.residual

    // ── KINEO-STALLED-ENDING-2026-08-12 ───────────────────────────────────────
    // "If Kineo's been working for you, keep everything exactly as it is" +
    // botão para /pricing. Para QUEM NUNCA GEROU NADA essa frase é literalmente
    // falsa e o pedido é o errado: é pedir para comprar um produto que a pessoa
    // nunca viu funcionar. Medido hoje (12/08): dos 98 trials ativos, 50 nunca
    // geraram e 17 deles vencem em 48h com ~680 créditos parados. O d0_welcome
    // NÃO alcança mais essas pessoas (claim permanente na PK de
    // trial_emails_log — elas já receberam), então `ending_soon` é literalmente
    // o último e-mail que ainda pode fazê-las ver o produto rodar uma vez.
    //
    // A conversão não é o próximo passo delas; a PRIMEIRA EXECUÇÃO é. Ninguém
    // assina o que nunca viu funcionar, e a única conversão da história do
    // produto veio de uma conta que tinha vídeo pronto.
    //
    // `creditsUsed <= 0` implica zero vídeo (gerar debita), que é a mesma
    // inferência que o ramo `first` do d0_welcome já usa desde 07/08 — não é
    // regra nova. O link para /pricing continua no e-mail, só deixa de ser o
    // único caminho oferecido a quem ainda não tem o que avaliar.
    const neverUsed = c.creditsUsed <= 0
    const endTopics = starterTopics(c.id)
    if (neverUsed && endTopics.length > 0) {
      const blocks = oneClickBlocks(endTopics, 'trial_ending_stalled', attr)

      // ── KINEO-FAILED-BY-US-2026-08-12 ───────────────────────────────────────
      // ESTE E-MAIL NÃO PODE DIZER A MESMA COISA PARA DUAS PESSOAS OPOSTAS.
      //
      // O ramo acima nasceu hoje de manhã em cima de um número medido —
      // "50 dos 98 trials ativos nunca geraram um vídeo e ZERO deles tentou" —
      // e o número estava certo nas fontes que ele usou (`videos` vazio,
      // `trial_credits_used = 0`) e ERRADO no mundo: `events` mostra que 35
      // dessas contas chamaram `generate_started` e **22 têm falha registrada
      // como NOSSA**, 21 delas exclusivamente dentro do apagão de 30 horas de
      // 09–10/08. As duas fontes concordavam porque falha nossa não debita.
      //
      // Para essas 22 pessoas — 11 das quais vencem nas próximas 24h — a frase
      // "You haven't made a Short yet. That's the one thing worth doing" é o
      // conselho de quem não olhou: elas tentaram, algumas cinco vezes, e a
      // resposta que receberam na tela foi "Render service rejected the job.
      // Please try again." Repetir "é só um minuto" para quem já gastou vários
      // é pedir de novo a coisa que a casa quebrou, sem admitir que quebrou.
      //
      // A copy de desculpa é a mesma promessa do `send-blackout-winback`
      // ("The failure was ours") — que para ESTA coorte nunca saiu: aquele cron
      // só age enquanto houver marcador de apagão nas últimas 48h, e o símbolo
      // `creatomate_rejected` só passou a ser escrito DEPOIS que o apagão
      // acabou. Zero envios desde 01/08, medido. Este ramo é o que resta.
      //
      // O QUE CADA FRASE PODE AFIRMAR (a regra que este arquivo já pagou caro
      // três vezes: afirmação factual sobre o usuário ou é conferida no banco,
      // ou vira afirmação sobre a REGRA, que é sempre verdadeira):
      //   · "não foi você" — verdadeira por construção da coorte (`failedOnUs`
      //     exige 5xx nosso ou símbolo de apagão de fornecedor; paywall, gate e
      //     entrada inválida ficam de fora — ver lib/lifecycle/ourFailure.ts);
      //   · "nada foi cobrado" — NÃO é verdadeira por construção. É gated em
      //     `creditsUsed <= 0`, que este ramo já provou linha acima. As 22 têm
      //     todas 0 usados hoje, mas amanhã uma delas pode ter 1, e aí a frase
      //     some sozinha em vez de mentir;
      //   · NÃO dizemos "está consertado". Este cron não sabe se está — ele não
      //     mede a saúde do render. Afirmar conserto é a única frase aqui que
      //     pode ser desmentida pelo próximo clique da pessoa, e ela é
      //     justamente a que não precisamos: o CTA já é o teste.
      if (c.failedOnUs) {
        // ⚠️ UM ÚNICO `oneClickBlocks` PARA AS DUAS METADES DO E-MAIL. A 1ª
        // versão deste ramo reaproveitava `blocks.text` (montado com
        // `trial_ending_stalled`) e montava o HTML com
        // `trial_ending_failed_by_us`: o MESMO e-mail sairia com duas origens
        // de UTM, e o CTR desta copy — a única pergunta que ela existe para
        // responder — ficaria dividido entre dois nomes, com a metade texto
        // somando no balde do ramo que ela substitui. Campo que aparece em mais
        // de uma superfície nasce de UMA variável.
        const fbuBlocks = oneClickBlocks(endTopics, 'trial_ending_failed_by_us', attr)
        // ⚠️ A LINHA DE CRÉDITO É CONDICIONAL, e não por simetria: `creditsLeft`
        // é `min(teto − usados, saldo real)`, então uma conta com concessão
        // falha tem `usados = 0` (ela passa no `neverUsed` acima) e `saldo = 0`.
        // Sem esta guarda o e-mail diria "0 trial credits are still sitting in
        // your account, untouched" — absurdo escrito com convicção. Hoje não há
        // nenhuma conta ATIVA nesse estado (medido: 0 de 106), e é exatamente
        // por isso que a guarda entra agora: ela custa uma linha enquanto a
        // coorte é zero e custa um e-mail ridículo no dia em que não for. O
        // ramo `neverUsed` que já está no ar tem o MESMO buraco, registrado
        // como dívida no doc da sprint em vez de corrigido aqui — mexer na copy
        // que saiu hoje de manhã, sem coorte viva, é risco sem prêmio.
        const fbuCreditsText =
          c.creditsLeft > 0
            ? `\n${c.creditsLeft} trial credits are still sitting in your account, untouched by those attempts. They expire ${when}, when the trial ends.\n`
            : `\nYour trial ends ${when}.\n`
        const fbuCreditsHtml =
          c.creditsLeft > 0
            ? `  <p style="margin:0 0 14px;">${c.creditsLeft} trial credits are still sitting in your account, <strong>untouched</strong> by those attempts. They expire ${when}, when the trial ends.</p>\n`
            : `  <p style="margin:0 0 14px;">Your trial ends ${when}.</p>\n`
        const fbuText = `Hey,

You tried to make a Short on Kineo and it never finished. That wasn't you and it wasn't your topic — the failure was on our side.
${fbuCreditsText}
If you want to try again, pick a topic below — it starts writing and rendering by itself, no blank page:

${fbuBlocks.text}

Or start from your own topic: ${APP_URL}/generate?${utm('trial_ending_failed_by_us')}

If you'd rather keep the Creator engines after that, the plans are here: ${url}

Kineo Team
usekineo.com`
        const fbuHtml = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>You tried to make a Short on Kineo and it never finished.</strong> That wasn't you and it wasn't your topic &mdash; the failure was on our side.</p>
${fbuCreditsHtml}  <p style="margin:0 0 14px;">If you want to try again, pick a topic below &mdash; it starts writing and rendering by itself, no blank page:</p>
  ${fbuBlocks.html}
  <p style="margin:14px 0 18px;font-size:14px;color:#555;">Or <a href="${attr(`${APP_URL}/generate?${utm('trial_ending_failed_by_us')}`)}" style="color:#2997ff;">start from your own topic</a>.</p>
  <p style="margin:0 0 14px;font-size:14px;color:#555;">If you'd rather keep the Creator engines after that, <a href="${attr(url)}" style="color:#2997ff;">the plans are here</a>.</p>
  ${sig}`)
        return {
          // O assunto NÃO promete conserto nem pede compra: diz de quem foi a
          // culpa e o que ainda está lá. É a única coisa nova que esta pessoa
          // não sabe. Gated no saldo pela mesma razão do corpo — assunto que
          // anuncia "your 0 credits" é o pior lugar possível para essa frase,
          // porque é o único texto que TODA a coorte lê.
          subject:
            c.creditsLeft > 0
              ? `That one was on us — your ${c.creditsLeft} credits expire ${when}`
              : `That one was on us — your trial ends ${when}`,
          text: `${fbuText}${footerText}`,
          html: fbuHtml,
        }
      }

      const text = `Hey,

Your Creator trial ends ${when}, and the ${c.creditsLeft} credits in your account expire with it.

You haven't made a Short yet. That's the one thing worth doing before then — it takes about a minute, and you don't have to come up with a topic. Pick one and it starts writing and rendering by itself:

${blocks.text}

Or start from your own topic: ${APP_URL}/generate?${utm('trial_ending_stalled')}

If you'd rather keep the Creator engines after that, the plans are here: ${url}

Kineo Team
usekineo.com`
      const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial ends ${when}</strong>, and the ${c.creditsLeft} credits in your account expire with it.</p>
  <p style="margin:0 0 14px;">You haven't made a Short yet. That's the one thing worth doing before then &mdash; it takes about a minute, and you don't have to come up with a topic. Pick one and it starts writing and rendering by itself:</p>
  ${blocks.html}
  <p style="margin:14px 0 18px;font-size:14px;color:#555;">Or <a href="${attr(`${APP_URL}/generate?${utm('trial_ending_stalled')}`)}" style="color:#2997ff;">start from your own topic</a>.</p>
  <p style="margin:0 0 14px;font-size:14px;color:#555;">If you'd rather keep the Creator engines after that, <a href="${attr(url)}" style="color:#2997ff;">the plans are here</a>.</p>
  ${sig}`)
      return {
        subject: `You still have ${c.creditsLeft} credits — they expire ${when}`,
        text: `${text}${footerText}`,
        html,
      }
    }

    // ── KINEO-SPRINT-V1V4-2026-09-01 (#26) ────────────────────────────────────
    // ESTE RAMO E O ULTIMO E-MAIL QUE ALGUEM COM 1 VIDEO RECEBE ANTES DE PERDER
    // OS CREDITOS, E ELE SO SABE PEDIR DINHEIRO.
    //
    // Medido hoje no banco (30d, so externos): das 285 pessoas que fizeram
    // EXATAMENTE UM video, 184 receberam o `ending_soon` — o segundo maior
    // alcance da casa nesse grupo, atras so do `downgraded_loss` (200), que a
    // rodada #25 tratou. Quem cai AQUI ja passou pelos dois desvios acima
    // (`neverUsed` e `failedOnUs`), ou seja: e gente que USOU credito. Para ela
    // o e-mail dizia "If Kineo's been working for you, keep everything exactly
    // as it is" e apontava para /pricing, e mais nada. Pedimos a assinatura a
    // quem ainda nao pediram para fazer o segundo video.
    //
    // O destino importa mais que o pedido (tabela da #24, 30d, externos):
    //   volta ao Studio em branco ....... 123 pessoas -> 30 fizeram o 2o (24%)
    //   chegada por continuacao de serie . 59 pessoas -> 31 fizeram o 2o (53%)
    //
    // MESMO CONTRATO DA #25, DE PROPOSITO: o CTA `Keep Creator` continua
    // PRIMEIRO e byte a byte; o assunto NAO muda; o bloco novo nao fala de
    // preco, plano, credito, cota, cupom nem "free"; e sem tema utilizavel o
    // e-mail sai exatamente como sai hoje (fail-closed dentro do helper).
    // `c.lastTopic` ja e colhido no mesmo laco que pagina `videos` desde a #25
    // — ZERO consulta nova. Quem tem credito usado mas nenhum video CONCLUIDO
    // tem `lastTopic` nulo e nao recebe bloco nenhum: nunca inventamos o
    // assunto de um video que a pessoa nao terminou.
    const ep2 = episodeTwoBlock(c.lastTopic, 'trial_ending_episode2', 'lifecycle_ending_email', attr)

    const text = `Hey,

Your Creator trial ends ${when}. After that you're back on the free plan, which means:

- Your unused trial credits expire
- The Creator AI engines lock
- You're down to ${freeResidual}

If Kineo's been working for you, keep everything exactly as it is: ${url}
${ep2 ? `\n${ep2.text}\n` : ''}
Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial ends ${when}.</strong> After that you're back on the free plan, which means:</p>
  <ul style="margin:0 0 14px;padding-left:20px;color:#475569;">
    <li>Your unused trial credits expire</li>
    <li>The Creator AI engines lock</li>
    <li>You're down to ${freeResidual}</li>
  </ul>
  <p style="margin:0 0 14px;">If Kineo's been working for you, keep everything exactly as it is:</p>
  ${cta(url, 'Keep Creator')}
${ep2 ? `${ep2.html}\n` : ''}  ${sig}`)
    return { subject, text: `${text}${footerText}`, html }
  }

  if (c.kind === 'downgraded_loss') {
    // ═══ KINEO-TRIAL-DOWNGRADE-SILENCE-2026-08-10 ═══════════════════════════
    // SEM PREÇO LITERAL, e isto é decisão, não esquecimento. Nenhum dos quatro
    // e-mails deste arquivo imprime valor: todos mandam para /pricing, que
    // resolve a moeda na hora (US$ / valor / BRL, fonte única em
    // lib/checkoutPricing.ts). Este cron NÃO sabe a moeda da pessoa — existe
    // `signup_country` na tabela, mas ele não é a entrada de
    // checkoutPricing, e derivar moeda aqui criaria uma SEGUNDA verdade de
    // preço fora da fonte única, que é exatamente o que a ordem do fundador
    // proíbe. Um e-mail que promete um número e um checkout que cobra outro é
    // o bug de 08/08 ($4,90 × $99) de novo, por outra porta.
    //
    // SEM CUPOM: COMEBACK50 é do D5/D10 e de mais lugar nenhum.
    const url = `${APP_URL}/pricing?${utm('trial_downgraded_loss')}`
    const freeResidual = getFreeTierOffer().copy.residual
    // A linha de crédito é condicional em DOIS testes (status provado
    // 'downgraded' em dueKind + quantidade > 0). Quem queimou os 40 não perdeu
    // saldo nenhum — para essa pessoa a frase seria ruído, e ruído numa lista
    // de perdas enfraquece as perdas que são reais.
    const lostLine = c.creditsLost > 0 ? `${c.creditsLost} unused trial credits — gone` : null
    const bullets = [
      lostLine,
      'The Creator AI engines are locked again',
      `You're back to ${freeResidual}`,
    ].filter((l): l is string => l !== null)

    // ═══ KINEO-LOSS-NEVER-RAN-2026-08-12 — A LISTA DE PERDAS PARA QUEM NUNCA GANHOU ══
    //
    // Este e-mail dizia, para TODO mundo: "The videos you already made are
    // yours — they stay in your account." Para quem nunca gerou um vídeo a
    // frase é literalmente FALSA, e é o mesmo defeito que o `ending_soon`
    // acabou de corrigir (KINEO-STALLED-ENDING-2026-08-12): pedir conversão a
    // quem nunca viu o produto rodar.
    //
    // POR QUE AGORA: o commit da extensão invertida
    // (KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12) TROUXE essa gente para cá. O
    // critério antigo pescava justamente quem tinha 0 vídeo e o parava numa
    // extensão de 3 dias; agora essas contas caem direto no `downgraded_loss`.
    // Corrigir a extensão sem corrigir o destino dela seria mudar o endereço de
    // um e-mail falso, não consertá-lo. Coorte que passa a chegar aqui: 51
    // trials ativos com ZERO vídeo (medido hoje).
    //
    // O que muda para quem tem 0 vídeo:
    //   · some a frase falsa sobre "os vídeos que você já fez";
    //   · a AFIRMAÇÃO sobre o que a casa mandou é a única forma provada segura
    //     (ENGAGEMENT-LOG 11/08): fala do RESULTADO, não de quais jobs
    //     dispararam — verdadeira por construção da coorte (0 vídeos);
    //   · o primeiro caminho oferecido deixa de ser /pricing e passa a ser o
    //     trilho de 1 clique que JÁ EXISTE (`oneClickBlocks`, o mesmo do
    //     d0_welcome e do ending_soon — nenhuma cópia nova). O free residual
    //     do plano em que a pessoa acabou de cair cobre esse vídeo.
    //   · /pricing CONTINUA no e-mail — só deixa de ser o único caminho.
    // Quem tem 1+ vídeo recebe o e-mail de antes, byte a byte.
    // #11 — "nunca rodou" so vale se TAMBEM nao ha clipe/imagem/audio entregue.
    // Quem fez 5 clipes no /animate e queimou o trial NAO pode ler "nothing we
    // sent you actually put a finished video in your hands".
    const otherTotal = otherDeliveriesTotal(c.otherMade)
    const neverRan = c.videosMade === 0 && otherTotal === 0
    if (neverRan) {
      // ⚠️ SEMENTE DIFERENTE, DE PROPÓSITO (2ª passada da revisão). `starterTopics`
      // gira por FNV-1a do id, então `starterTopics(c.id)` devolveria os MESMOS
      // três temas que o d0_welcome e o ending_soon já mandaram para esta
      // pessoa. Ela não clicou nos dois primeiros; mostrar os mesmos três pela
      // terceira vez é o pedido com o menor rendimento possível. O sufixo muda
      // o offset da rotação sem tocar no pool nem na copy, e mantém a
      // propriedade que a semente existe para ter: dado o id, ainda dá para
      // reconstruir exatamente quais links a pessoa recebeu.
      const lossTopics = starterTopics(`${c.id}:loss`)
      // Pool vazio ⇒ nada de e-mail sem CTA: devolve o texto anterior intacto.
      if (lossTopics.length > 0) {
        // ── KINEO-FAILED-BY-US-2026-08-12 ─────────────────────────────────────
        // Mesma correção do `ending_soon`, um degrau depois no relógio, e aqui
        // ela importa MAIS: o `ending_soon` ainda podia ser lido como convite;
        // este e-mail é uma lista de perdas. Mandar "veja o que você perdeu"
        // para quem nunca conseguiu rodar POR CULPA NOSSA, sem uma palavra
        // sobre isso, é cobrar da pessoa o preço de um erro nosso — e é o
        // e-mail que antecede o pedido de dinheiro (COMEBACK50 no D5).
        //
        // A frase de abertura que já existe ("nothing we sent you actually put
        // a finished video in your hands") continua verdadeira e continua no
        // lugar: ela fala do RESULTADO, a única forma que este arquivo já
        // provou segura três vezes. O que entra é a atribuição — de quem foi a
        // culpa — e ela só entra para quem `ourFailure.ts` classifica.
        const blocks = oneClickBlocks(
          lossTopics,
          c.failedOnUs ? 'trial_loss_failed_by_us' : 'trial_loss_stalled',
          attr,
        )
        const fbuLineText = c.failedOnUs
          ? '\nThe attempts you did make never finished, and that was on our side, not yours.\n'
          : ''
        const fbuLineHtml = c.failedOnUs
          ? `  <p style="margin:0 0 14px;">The attempts you did make never finished, and <strong>that was on our side</strong>, not yours.</p>\n`
          : ''
        const nrText = `Hey,

Your Creator trial ended, and nothing we sent you actually put a finished video in your hands. Here's what closed with it:

${bullets.map((b) => `- ${b}`).join('\n')}
${fbuLineText}
You can still make one on the free plan you're back on. Pick a topic and it starts writing and rendering by itself — no blank page to stare at:

${blocks.text}

If you'd rather have the Creator engines back: ${url}

Kineo Team
usekineo.com`
        const nrHtml = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial ended</strong>, and nothing we sent you actually put a finished video in your hands. Here's what closed with it:</p>
  <ul style="margin:0 0 14px;padding-left:20px;color:#475569;">
    ${bullets.map((b) => `<li>${b}</li>`).join('\n    ')}
  </ul>
${fbuLineHtml}  <p style="margin:0 0 14px;">You can still make one on the <strong>free plan you're back on</strong>. Pick a topic and it starts writing and rendering by itself &mdash; no blank page to stare at:</p>
  ${blocks.html}
  <p style="margin:14px 0 18px;font-size:14px;color:#555;">If you'd rather have the Creator engines back, <a href="${attr(url)}" style="color:#2997ff;">see the plans</a>.</p>
  ${sig}`)
        // ⚠️ O ASSUNTO NÃO PROMETE COTA. A primeira versão era "Your free video
        // is still waiting", que afirma que o slot free está disponível — e o
        // slot é reservado ANTES do render (`reserveFreeFastPreviewSlot`), então
        // um render que falhou consome a cota e NÃO deixa vídeo concluído.
        // Existe, portanto, uma conta com 0 vídeos e 0 cota, para quem aquele
        // assunto seria falso. Este afirma só o que o código garante: o link
        // prefila e dispara sozinho.
        return {
          subject: `Your first video is one click away`,
          text: `${nrText}${footerText}`,
          html: nrHtml,
          body: lossBodyFor({ neverRan: true, burnedWithFilm: false }),
        }
      }
    }

    // ═══ sprint-assinaturas #20 — QUEM GASTOU O TRIAL INTEIRO E TEM O FILME ═══
    // zareshahi0 (chatgpt.com, 02/09): 1o video = 25cr = trial inteiro; filme
    // de 62s na Library as 08:15 UTC e, as 08:25, ESTE e-mail dizendo "here's
    // what you just lost access to". Medido 14d: 29 pessoas nesse caso, 401
    // `downgraded_loss` no total, 4 checkouts depois, 1 pagante. Para quem
    // gastou tudo E recebeu, a 1a frase tem de ser o filme, e o pedido tem de
    // ser medido em filmes COMO AQUELE — numeros derivados de TIER_CREDITS e do
    // custo real do video (lib/lifecycle/trialFilmPlans.ts), nunca digitados.
    // Sem preco literal (regra deste arquivo: /pricing resolve a moeda), sem
    // cupom. As perdas continuam listadas — so deixam de ser a manchete.
    if (c.burnedWithFilm) {
      const noun = filmNoun(c.lastDuration)
      const libraryUrl = `${APP_URL}/library?${utm('trial_loss_burned_film_library')}`
      const plansUrl = `${APP_URL}/pricing?${utm('trial_loss_burned_film')}`
      const rows = filmsPerPlan(c.lastCost)
      const ep2b = episodeTwoBlock(c.lastTopic, 'trial_loss_burned_film_episode2', 'lifecycle_loss_email', attr)
      const madeLine = c.videosMade === 1
        ? `the ${noun} you made is in your Library — yours to keep`
        : `the ${c.videosMade} videos you made are in your Library — yours to keep`
      const plansText = rows
        ? `\nIf you want the next one, a plan is measured in films like that one:\n${rows.map((r) => `- ${filmPlanLine(r)}`).join('\n')}\n`
        : ''
      const plansHtml = rows
        ? `  <p style="margin:0 0 8px;">If you want the next one, a plan is measured in films like that one:</p>\n  <ul style="margin:0 0 14px;padding-left:20px;color:#475569;">\n    ${rows.map((r) => `<li>${escapeHtmlText(filmPlanLine(r))}</li>`).join('\n    ')}\n  </ul>\n`
        : ''
      const bText = `Hey,

Your Creator trial ended — you used all of it, and ${madeLine}:
${libraryUrl}

Here's what closed with the trial:

${bullets.map((b) => `- ${b}`).join('\n')}
${plansText}
See the plans: ${plansUrl}
${ep2b ? `\n${ep2b.text}\n` : ''}
Kineo Team
usekineo.com`
      const bHtml = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial ended</strong> &mdash; you used all of it, and ${escapeHtmlText(madeLine)}.</p>
  ${cta(libraryUrl, 'Open your Library')}
  <p style="margin:0 0 14px;">Here's what closed with the trial:</p>
  <ul style="margin:0 0 14px;padding-left:20px;color:#475569;">
    ${bullets.map((b) => `<li>${b}</li>`).join('\n    ')}
  </ul>
${plansHtml}  ${cta(plansUrl, 'See the plans')}
${ep2b ? `${ep2b.html}\n` : ''}  ${sig}`)
      return {
        subject: c.videosMade === 1
          ? `Your trial went into one ${noun} — it's in your Library`
          : `Your trial went into ${c.videosMade} videos — they're in your Library`,
        text: `${bText}${footerText}`,
        html: bHtml,
        body: lossBodyFor({ neverRan: false, burnedWithFilm: true }),
      }
    }

    // KINEO-SPRINT-V1V4-2026-09-01 (#25) — o segundo caminho, so para quem TEM
    // video (o ramo `neverRan` acima nao passa por aqui: quem nunca terminou um
    // video nao tem episodio 2, e ja recebe os temas de 1 clique do pool).
    const ep2 = episodeTwoBlock(c.lastTopic, 'trial_loss_episode2', 'lifecycle_loss_email', attr)

    // #11 — a frase "the videos you already made" e verdadeira para quem tem
    // linha em `videos`. Para quem so tem clipes/imagens/audios, a frase
    // nomeia EXATAMENTE o que ficou (numero medido, nao adjetivo). Quem tem os
    // dois recebe a frase de sempre — "videos" ja cobre.
    const otherKept = c.videosMade === 0 && otherTotal > 0 ? describeOtherDeliveries(c.otherMade) : ''
    const keptText = otherKept
      ? `The ${otherKept} you already made are yours — they stay in your Library.`
      : `The videos you already made are yours — they stay in your account.`
    const keptHtml = otherKept
      ? `The ${otherKept} you already made are yours &mdash; they stay in your Library.`
      : `The videos you already made are yours &mdash; they stay in your account.`

    const text = `Hey,

Your Creator trial ended. Here's what you just lost access to:

${bullets.map((b) => `- ${b}`).join('\n')}

${keptText}

If the trial was doing its job, Creator picks up exactly where it left off: ${url}
${ep2 ? `\n${ep2.text}\n` : ''}
Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;"><strong>Your Creator trial ended.</strong> Here's what you just lost access to:</p>
  <ul style="margin:0 0 14px;padding-left:20px;color:#475569;">
    ${bullets.map((b) => `<li>${b}</li>`).join('\n    ')}
  </ul>
  <p style="margin:0 0 14px;">${keptHtml}</p>
  <p style="margin:0 0 14px;">If the trial was doing its job, Creator picks up exactly where it left off:</p>
  ${cta(url, 'Get Creator back')}
${ep2 ? `${ep2.html}\n` : ''}  ${sig}`)
    return {
      subject: `Here's what you just lost access to`,
      text: `${text}${footerText}`,
      html,
      body: lossBodyFor({ neverRan: false, burnedWithFilm: false }),
    }
  }

  if (c.kind === 'expired_offer_d5') {
    const url = `${APP_URL}/pricing?promo=${COMEBACK_CODE}&${utm('trial_offer_d5')}`

    // ═══ sprint-assinaturas #21 (2026-09-02) — O D5 IGNORAVA O FILME ═══════
    // Medido 21d (externos): 442 `expired_offer_d5` enviados, 248 para gente
    // COM video entregue; 38 tiveram QUALQUER evento nas 72h seguintes, 2
    // abriram /pricing, 0 checkout, 0 pagante. O D10: 276 enviados, 5 eventos,
    // 0 /pricing. E o e-mail de pedido de dinheiro mais enviado da casa e o
    // unico que nao cita NADA da pessoa: "Your Creator trial ended a few days
    // ago" e igual para quem nunca rodou e para quem tem um filme de 62s na
    // Library. Para quem TEM video, a manchete passa a ser o filme dela (o
    // mesmo principio do #20), a Library vira o 1o link (o que ela ja
    // experimentou), o cupom continua o MESMO (o cupom e do Codex — nao
    // muda codigo, prazo nem porcentagem) e o pedido e medido em filmes COMO
    // AQUELE que o Creator compra (TIER_CREDITS / custo real — nunca digitado;
    // custo desconhecido = a frase cala). Episodio 2 do tema dela quando ha
    // tema (#25 do v1v4). Quem NAO tem video recebe o e-mail de hoje byte a
    // byte. O evento grava body 'offer_with_film' | 'standard' para provar
    // qual saiu.
    if (c.videosMade >= 1) {
      const noun = filmNoun(c.lastDuration)
      const libraryUrl = `${APP_URL}/library?${utm('trial_offer_d5_library')}`
      const creatorRow = filmsPerPlan(c.lastCost)?.find((r) => r.tier === 'basic') ?? null
      const ep2 = episodeTwoBlock(c.lastTopic, 'trial_offer_d5_episode2', 'lifecycle_loss_email', attr)
      const madeLine = c.videosMade === 1
        ? `the ${noun} you made is still in your Library`
        : `the ${c.videosMade} videos you made are still in your Library`
      const filmsLine = creatorRow && creatorRow.films >= 1
        ? `That's ${creatorRow.films} ${creatorRow.films === 1 ? 'film' : 'films'} like that one every month, at half the price.`
        : ''
      const wText = `Hey,

Your Creator trial ended a few days ago, and ${madeLine}:
${libraryUrl}

If you want the next one, here's a better deal than the trial ever was: 50% off Creator for 3 months, with code ${COMEBACK_CODE}.${filmsLine ? ` ${filmsLine}` : ''}

Claim it here — the code applies at checkout: ${url}
${ep2 ? `\n${ep2.text}\n` : ''}
Kineo Team
usekineo.com`
      const wHtml = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Your Creator trial ended a few days ago, and <strong>${escapeHtmlText(madeLine)}</strong>.</p>
  ${cta(libraryUrl, 'Open your Library')}
  <p style="margin:0 0 14px;">If you want the next one, here's a better deal than the trial ever was: <strong>50% off Creator for 3 months</strong>, with code <strong>${COMEBACK_CODE}</strong>.${filmsLine ? ` ${escapeHtmlText(filmsLine)}` : ''}</p>
  ${cta(url, `Claim 50% off`)}
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">The code applies automatically at checkout.</p>
${ep2 ? `${ep2.html}\n` : ''}  ${sig}`)
      return {
        subject: c.videosMade === 1
          ? `Your ${noun} is still in your Library — and Creator is 50% off`
          : `Your ${c.videosMade} videos are still in your Library — and Creator is 50% off`,
        text: `${wText}${footerText}`,
        html: wHtml,
        body: 'offer_with_film',
      }
    }

    const text = `Hey,

Your Creator trial ended a few days ago. If the timing wasn't right, here's a better deal than the trial ever was:

50% off Creator for 3 months, with code ${COMEBACK_CODE}.

Claim it here — the code applies at checkout: ${url}

Everything you had in the trial comes back the moment you subscribe.

Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Your Creator trial ended a few days ago. If the timing wasn't right, here's a better deal than the trial ever was:</p>
  <p style="margin:0 0 14px;font-size:16px;"><strong>50% off Creator for 3 months</strong>, with code <strong>${COMEBACK_CODE}</strong>.</p>
  <p style="margin:0 0 14px;">Everything you had in the trial comes back the moment you subscribe.</p>
  ${cta(url, `Claim 50% off`)}
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">The code applies automatically at checkout.</p>
  ${sig}`)
    return { subject: 'Come back to Creator — 50% off for 3 months', text: `${text}${footerText}`, html, body: 'standard' }
  }

  if (c.kind === 'expired_lastcall_d10') {
    const url = `${APP_URL}/pricing?promo=${COMEBACK_CODE}&${utm('trial_offer_d10')}`

    // ═══ sprint-assinaturas #22 (2026-09-02) — O D10 TAMBEM IGNORAVA O FILME ══
    // Medido 21d (externos): 276 `expired_lastcall_d10` enviados (~27/dia),
    // 161 para gente COM video entregue (todos com custo real gravado), 5
    // eventos nas 72h, 0 em /pricing, 0 checkout, 0 pagante. E o ultimo
    // e-mail da esteira e o unico que fala so do cupom: "your 50% off ... is
    // still live, but this is the last time we'll mention it" — nada da
    // pessoa. Mesmo tratamento do #21 (D5): para quem TEM video, a manchete e
    // o filme dela, a Library e o 1o link, o cupom continua o MESMO (codigo,
    // prazo, porcentagem — o cupom e do Codex), a promessa "ultima vez que
    // falamos nisso" continua verdadeira (o cron nao manda nada depois do
    // D10), e o pedido e medido em filmes COMO AQUELE que o Creator compra
    // (TIER_CREDITS / custo real; custo desconhecido = a frase cala). Quem
    // NAO tem video recebe o e-mail de hoje byte a byte. O evento grava body
    // 'offer_with_film' | 'standard' para provar qual saiu (mesma taxonomia
    // do D5, para a medicao comparar os dois com a mesma chave).
    if (c.videosMade >= 1) {
      const noun = filmNoun(c.lastDuration)
      const libraryUrl = `${APP_URL}/library?${utm('trial_offer_d10_library')}`
      const creatorRow = filmsPerPlan(c.lastCost)?.find((r) => r.tier === 'basic') ?? null
      const ep2 = episodeTwoBlock(c.lastTopic, 'trial_offer_d10_episode2', 'lifecycle_loss_email', attr)
      const madeLine = c.videosMade === 1
        ? `the ${noun} you made is still in your Library`
        : `the ${c.videosMade} videos you made are still in your Library`
      const filmsLine = creatorRow && creatorRow.films >= 1
        ? `That's ${creatorRow.films} ${creatorRow.films === 1 ? 'film' : 'films'} like that one every month, at half the price.`
        : ''
      const wText = `Hey,

Quick heads-up, and then we'll leave you alone: ${madeLine}, and your 50% off Creator for 3 months (code ${COMEBACK_CODE}) is still live — but this is the last time we'll mention it.

Your Library: ${libraryUrl}

Grab the deal here — the code applies at checkout: ${url}${filmsLine ? `\n${filmsLine}` : ''}
${ep2 ? `\n${ep2.text}\n` : ''}
No hard feelings either way.

Kineo Team
usekineo.com`
      const wHtml = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Quick heads-up, and then we'll leave you alone: <strong>${escapeHtmlText(madeLine)}</strong>, and your <strong>50% off Creator for 3 months</strong> (code <strong>${COMEBACK_CODE}</strong>) is still live — but this is the last time we'll mention it.</p>
  ${cta(libraryUrl, 'Open your Library')}
  ${filmsLine ? `<p style="margin:0 0 14px;">${escapeHtmlText(filmsLine)}</p>\n` : ''}  ${cta(url, 'Claim 50% off')}
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">The code applies automatically at checkout. No hard feelings either way.</p>
${ep2 ? `${ep2.html}\n` : ''}  ${sig}`)
      return {
        subject: c.videosMade === 1
          ? `Last call on 50% off Creator — your ${noun} is waiting in your Library`
          : `Last call on 50% off Creator — your ${c.videosMade} videos are waiting in your Library`,
        text: `${wText}${footerText}`,
        html: wHtml,
        body: 'offer_with_film',
      }
    }

    const text = `Hey,

Quick heads-up, and then we'll leave you alone: your 50% off Creator for 3 months (code ${COMEBACK_CODE}) is still live, but this is the last time we'll mention it.

Grab it here: ${url}

After this it's full price. No hard feelings either way.

Kineo Team
usekineo.com`
    const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">Quick heads-up, and then we'll leave you alone: your <strong>50% off Creator for 3 months</strong> (code <strong>${COMEBACK_CODE}</strong>) is still live, but this is the last time we'll mention it.</p>
  ${cta(url, 'Claim 50% off')}
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">After this it's full price. No hard feelings either way.</p>
  ${sig}`)
    return { subject: `Last call: 50% off Creator expires`, text: `${text}${footerText}`, html, body: 'standard' }
  }

  // trial_extended
  // ═══ KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — A COPY VIROU AO CONTRÁRIO ══
  //
  // O texto anterior abria com "Looks like you barely got a chance to try your
  // Creator trial". Com o critério novo (3+ vídeos concluídos) essa frase é
  // FALSA POR CONSTRUÇÃO para 100% de quem recebe — a pessoa não é quem mal
  // tentou, é quem mais usou. Copy que sobrevive à troca do critério que a
  // seleciona é copy que ninguém releu; ela entra na mesma revisão do código.
  //
  // As duas afirmações do e-mail são verificáveis pelo destinatário em um
  // clique, e as duas vêm de número medido, não de adjetivo:
  //   · `videosMade` — linhas em `videos` com status 'completed' (a mesma
  //     contagem que autorizou a extensão);
  //   · `creditsLeft` — aqui vale o saldo utilizável DEPOIS da restauração,
  //     limitado pelo teto de 40 (ver `usableAfterExtension` em dueKind). Foi
  //     conferido ≥1 antes de a extensão existir: este e-mail nunca promete
  //     dias que não compram nada.
  const url = `${APP_URL}/generate?${utm('trial_extended')}`
  // ⚠️ 3ª PASSADA DA REVISÃO ADVERSARIAL — ATRIBUIÇÃO FALSA, PEGA ANTES DO
  // COMMIT. A frase era "You made N videos **on your Creator trial**". A
  // contagem vem de `videos` INTEIRA, não da janela do trial: uma conta que já
  // gerava no free tier antes de o reverse trial existir traz vídeos ANTERIORES
  // ao trial, e a frase os creditaria ao trial. É afirmação que o destinatário
  // confere em um clique no /history — a classe de erro que mais aparece neste
  // repositório. Windowing por conta foi descartado por não ser recuperável no
  // ramo de retry (a extensão reescreve `trial_ends_at` e apaga o início do
  // ciclo). A frase abaixo afirma as duas coisas SEPARADAMENTE, e as duas são
  // verdadeiras por construção: N vídeos na conta, e o trial acabou.
  const madeLine =
    c.videosMade > 0
      ? `You made ${c.videosMade} video${c.videosMade === 1 ? '' : 's'} with Kineo — and your Creator trial has run out`
      : `Your Creator trial has run out`
  const creditLine =
    c.creditsLeft === 1
      ? `You have 1 credit left`
      : `You have ${c.creditsLeft} credits left`
  const text = `Hey,

${madeLine}. So we put ${EXTENSION_DAYS} more days back on it, starting now.

${creditLine}. Same engines, same quality: ${url}

This is a one-time extension — after it, Creator goes back to being a paid plan.

Kineo Team
usekineo.com`
  const html = wrap(`
  <p style="margin:0 0 14px;">Hey,</p>
  <p style="margin:0 0 14px;">${madeLine}. So <strong>we put ${EXTENSION_DAYS} more days back on it, starting now.</strong></p>
  <p style="margin:0 0 14px;">${creditLine}. Same engine, same clean exports, no card needed.</p>
  ${cta(url, 'Keep creating')}
  <p style="margin:0 0 20px;font-size:13px;color:#64748b;">This is a one-time extension &mdash; after it, Creator goes back to being a paid plan.</p>
  ${sig}`)
  return { subject: `${EXTENSION_DAYS} more days on your Creator trial`, text: `${text}${footerText}`, html }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?dry=1 — mede o público sem enviar, sem estender e sem reivindicar nada.
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'

  if (!dryRun && !REVERSE_TRIAL_ENABLED) {
    return NextResponse.json({ paused: true, sent: 0, reason: 'reverse_trial_flag_off' })
  }
  if (!dryRun && !RESEND_API_KEY) {
    console.error('[trial-lifecycle-emails] RESEND_API_KEY not set')
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase service env missing' }, { status: 500 })
  }
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Leitura de cron nunca vem de cache (KINEO-LIFECYCLE-FRESH-READ-2026-08-05).
    global: { fetch: freshFetch },
  })

  const now = Date.now()

  // ── 1) Toda conta que já teve trial e ainda pode receber algo ──────────────
  // 'converted' fica FORA da query — quem pagou nunca mais entra aqui, nem por
  // bug de janela. Volume: trials nascem só com a flag ON, coorte de dias.
  const { data: rows, error: rowsErr } = await admin
    .from('profiles')
    .select(
      'id, email, plan, has_paid, trial_status, trial_ends_at, trial_downgraded_at, trial_variant, trial_credits_used, trial_credits_granted, trial_extended, video_credits',
    )
    .in('trial_status', ['active', 'expired', 'downgraded'])
    .eq('email_opted_out', false)
    .limit(5000)

  if (rowsErr) {
    console.error('[trial-lifecycle-emails] cohort query failed:', rowsErr.message)
    return NextResponse.json({ error: rowsErr.message }, { status: 500 })
  }

  // ── 1-bis) Vídeos CONCLUÍDOS por conta ────────────────────────────────────
  // KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — a extensão passou a ser
  // decidida pelo PRODUTO (3+ vídeos), não pelo saldo, e nenhuma coluna de
  // `profiles` responde isso: Fast custa 1 crédito e Creator custa 20, então
  // `trial_credits_used` não determina quantos vídeos existem.
  //
  // Contagem em JS sobre os ids da coorte (dezenas de contas, não milhares) —
  // PostgREST não faz group-by, e uma RPC nova seria superfície nova para uma
  // soma. `.in()` em blocos de VIDEO_COUNT_USERS_PER_QUERY (50), MENOR que o
  // CHUNK_SIZE de 200 usado no log: aqui cada conta traz N linhas, não 1, então
  // o bloco tem de ser menor para a paginação abaixo ser rasa.
  // (A 1ª versão deste comentário dizia "blocos de CHUNK_SIZE" e era falsa —
  // número afirmado em comentário entra na revisão como código entra.)
  //
  // `null` = leitura falhou ⇒ FALHA FECHADA nos ramos que dependem dela (ver
  // `dueKind`). Nunca vira 0 silencioso: 0 significaria "não fez nada" e
  // reprovaria a extensão de quem fez, que é exatamente o defeito que este
  // commit corrige.
  const cohortIds = Array.from(
    new Set(
      ((rows ?? []) as ProfileRow[])
        .map((r) => (typeof r.id === 'string' ? r.id : ''))
        .filter((s): s is string => s.length > 0),
    ),
  )
  const counts = new Map<string, number>()
  // KINEO-SPRINT-V1V4-2026-09-01 (#25) — tema do video mais RECENTE por conta,
  // colhido no MESMO laco que ja pagina `videos`. Zero consulta nova: e a
  // diferenca entre `select('user_id')` e `select('user_id, topic, created_at')`.
  // Guardamos o carimbo junto porque a paginacao ordena por `id` (requisito da
  // estabilidade, ver o comentario abaixo) e id de uuid NAO tem ordem temporal:
  // sem comparar `created_at` o "ultimo tema" seria o de uma linha qualquer.
  const lastTopicAt = new Map<string, number>()
  const topics = new Map<string, string>()
  // #20 — custo/duracao do video mais recente (mesmo carimbo, mesma regra).
  const lastFilmAt = new Map<string, number>()
  const films = new Map<string, { cost: number | null; duration: number | null }>()
  let countsUsable = true
  outer: for (const part of chunk(cohortIds, VIDEO_COUNT_USERS_PER_QUERY)) {
    let from = 0
    for (;;) {
      const { data: vidRows, error: vidErr } = await admin
        .from('videos')
        .select('user_id, topic, created_at, credits_used, duration')
        .in('user_id', part)
        .eq('status', 'completed')
        // ⚠️ ORDENAÇÃO ESTÁVEL É REQUISITO DA PAGINAÇÃO, NÃO ENFEITE. Sem
        // ORDER BY o Postgres não promete ordem alguma entre duas execuções da
        // MESMA consulta, e `.range()` sobre ordem instável duplica linhas numa
        // página e pula linhas na outra — o erro apareceria como contagem de
        // vídeos errada, ou seja, exatamente na afirmação que o e-mail faz ao
        // usuário. `videos.id` é uuid NOT NULL (chave), então a ordem é total.
        // (Defeito criado pela 1ª correção desta leitura — a paginação — e
        // pego na 2ª passada da revisão adversarial.)
        .order('id', { ascending: true })
        .range(from, from + VIDEO_COUNT_PAGE - 1)
      if (vidErr) {
        console.error('[trial-lifecycle-emails] video count query failed:', vidErr.message)
        countsUsable = false
        break outer
      }
      const got = (vidRows ?? []) as Array<Record<string, unknown>>
      for (const v of got) {
        if (typeof v.user_id !== 'string') continue
        counts.set(v.user_id, (counts.get(v.user_id) ?? 0) + 1)
        // O tema NUNCA falha fechado: qualquer duvida (tema nao-string, vazio,
        // carimbo ilegivel) simplesmente nao entra no mapa, e o e-mail sai
        // exatamente como sai hoje.
        const at = typeof v.created_at === 'string' ? Date.parse(v.created_at) : NaN
        const when = Number.isFinite(at) ? at : 0
        // #20 — independe do tema (um video sem tema ainda tem custo/duracao).
        if (when >= (lastFilmAt.get(v.user_id) ?? -1)) {
          lastFilmAt.set(v.user_id, when)
          films.set(v.user_id, {
            cost: typeof v.credits_used === 'number' && Number.isFinite(v.credits_used) ? v.credits_used : null,
            duration: typeof v.duration === 'number' && Number.isFinite(v.duration) ? v.duration : null,
          })
        }
        const rawTopic = typeof v.topic === 'string' ? v.topic : ''
        if (!rawTopic.trim()) continue
        if (when >= (lastTopicAt.get(v.user_id) ?? -1)) {
          lastTopicAt.set(v.user_id, when)
          topics.set(v.user_id, rawTopic)
        }
      }
      // ⚠️ PÁGINA CURTA É O ÚNICO SINAL DE FIM QUE O PostgREST DÁ — e é por
      // isso que VIDEO_COUNT_PAGE fica ABAIXO do `max-rows` do servidor
      // (default 1.000 no Supabase). Pedir MAIS do que o servidor entrega faria
      // toda página parecer curta e o laço pararia na primeira, truncando em
      // SILÊNCIO. Truncar aqui subestima, e subestimar reprova a extensão de
      // quem fez os vídeos — exatamente o defeito que este commit corrige.
      // (Foi por isso que a 1ª versão desta leitura, com `.limit(1000)` + teste
      // `got.length >= 1000`, foi descartada: ela só detecta saturação se o teto
      // do servidor for igual ao pedido, e não é uma garantia que o código
      // controla.)
      if (got.length < VIDEO_COUNT_PAGE) break
      from += got.length
      if (from >= VIDEO_COUNT_HARD_CAP) {
        console.error(
          `[trial-lifecycle-emails] video count exceeded ${VIDEO_COUNT_HARD_CAP} rows for ${part.length} users — failing closed`,
        )
        countsUsable = false
        break outer
      }
    }
  }
  const videoCounts: Map<string, number> | null = countsUsable ? counts : null
  // Mesma leitura, mesmo degrade: se a paginacao abortou, nao ha tema confiavel.
  const lastTopics: Map<string, string> | null = countsUsable ? topics : null
  const lastFilms: Map<string, { cost: number | null; duration: number | null }> | null = countsUsable ? films : null
  if (videoCounts === null) {
    // Observabilidade explícita. Sem esta linha (e sem o campo no JSON de
    // resposta) uma falha PERSISTENTE da contagem silenciaria a coorte
    // pós-trial inteira — extensão, perda, D5 e D10 — sem deixar rastro. É a
    // classe de falha que este arquivo mais repete: supressão silenciosa que
    // ninguém mede porque o cron continua devolvendo 200.
    console.error('[trial-lifecycle-emails] VIDEO COUNTS UNAVAILABLE — post-trial cohort deferred this run')
  }

  // ── 1-ter) Quem foi derrubado por NÓS ─────────────────────────────────────
  // KINEO-FAILED-BY-US-2026-08-12 — ver o cabeçalho de `lib/lifecycle/
  // ourFailure.ts` para POR QUE esta leitura existe. Em uma linha: `videos` e
  // `trial_credits_used` concordam em dizer "não fez nada" justamente porque
  // falha nossa não debita, então a vítima de um apagão nosso é, nas duas
  // fontes, idêntica a quem nunca abriu o app. `events` é a única que sabe.
  //
  // Mesma forma da contagem de vídeos (blocos de 50 contas, página de 500,
  // `.order('id')` obrigatório) — e o ORDER BY aqui é ainda menos opcional:
  // `events` recebe escrita o tempo todo, e `.range()` sobre ordem instável
  // pularia linhas em silêncio. Diferença de contrato: aqui a falha é ABERTA
  // (ver o comentário do campo `failedOnUs`).
  const ourFailureIds = new Set<string>()
  let ourFailureUsable = true
  const failureSince = new Date(now - OUR_FAILURE_LOOKBACK_MS).toISOString()
  outerFail: for (const part of chunk(cohortIds, VIDEO_COUNT_USERS_PER_QUERY)) {
    let from = 0
    for (;;) {
      const { data: evRows, error: evErr } = await admin
        .from('events')
        .select('id, user_id, metadata')
        .in('user_id', part)
        .eq('name', OUR_FAILURE_EVENT_NAME)
        .gte('created_at', failureSince)
        .order('id', { ascending: true })
        .range(from, from + VIDEO_COUNT_PAGE - 1)
      if (evErr) {
        console.error('[trial-lifecycle-emails] our-failure query failed:', evErr.message)
        ourFailureUsable = false
        break outerFail
      }
      const got = (evRows ?? []) as Array<{ user_id?: unknown; metadata?: unknown }>
      for (const e of got) {
        if (typeof e.user_id === 'string' && isOurFailure(e.metadata)) ourFailureIds.add(e.user_id)
      }
      if (got.length < VIDEO_COUNT_PAGE) break
      from += got.length
      if (from >= VIDEO_COUNT_HARD_CAP) {
        console.error(
          `[trial-lifecycle-emails] our-failure read exceeded ${VIDEO_COUNT_HARD_CAP} rows for ${part.length} users — giving up on this signal`,
        )
        ourFailureUsable = false
        break outerFail
      }
    }
  }
  if (!ourFailureUsable) {
    // ⚠️ O CONJUNTO PARCIAL É DESCARTADO INTEIRO, de propósito. Um `break` no
    // meio da paginação deixa metade da coorte classificada e metade não — e a
    // metade não lida vira "não foi vítima", que é a afirmação errada com cara
    // de resposta. Ou o sinal vale para todo mundo, ou não vale para ninguém.
    ourFailureIds.clear()
    console.error('[trial-lifecycle-emails] OUR-FAILURE SIGNAL UNAVAILABLE — copy de desculpa suprimida neste run')
  }

  // ── 1-quater) O que a coorte RECEBEU fora de `videos` ─────────────────────
  // #11 — ver lib/lifecycle/otherDeliveries.ts. Falha ABERTA: `degraded`
  // devolve zeros (a copy de hoje) e fica visivel no JSON de resposta.
  const other = await countOtherDeliveries(admin, cohortIds)
  if (other.degraded) {
    console.error('[trial-lifecycle-emails] OTHER-DELIVERIES PARTIAL — animate/images/audio treated as 0 where unread')
  }

  const candidates: Candidate[] = []
  for (const row of (rows ?? []) as ProfileRow[]) {
    const c = dueKind(row, now, videoCounts, ourFailureIds, lastTopics, lastFilms, other.counts)
    if (c) candidates.push(c)
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      sent: 0,
      cohort: (rows ?? []).length,
      eligible: 0,
      reason: 'nobody_due',
      // Sem este campo, "ninguém devido" e "não consegui olhar para a coorte
      // pós-trial" seriam a MESMA resposta 200 — e a segunda é um incidente.
      video_counts_degraded: videoCounts === null,
      other_deliveries_degraded: other.degraded,
      // KINEO-FAILED-BY-US-2026-08-12 — degrade observável e SEPARADO do de
      // cima: este não adia ninguém, só apaga o pedido de desculpas. Sem campo
      // próprio, um run que mandou a copy antiga por falha de leitura seria
      // indistinguível de um run em que ninguém era vítima.
      our_failure_degraded: !ourFailureUsable,
    })
  }

  // ── 2) Idempotência: quem já recebeu este kind não entra nem no batch ──────
  // (O claim do passo 4 é a trava real contra corrida; este filtro só evita
  // gastar supressão e teto com quem certamente será pulado.)
  const alreadySent = new Set<string>()
  for (const part of chunk(Array.from(new Set(candidates.map((c) => c.id))), CHUNK_SIZE)) {
    const { data: logRows, error: logErr } = await admin
      .from('trial_emails_log')
      .select('user_id, email_kind')
      .in('user_id', part)
    if (logErr) {
      // Falha fechada: sem enxergar o log, enviar é arriscar duplicata.
      console.error('[trial-lifecycle-emails] log query failed:', logErr.message)
      return NextResponse.json({ error: 'email_log_unavailable' }, { status: 503 })
    }
    for (const r of (logRows ?? []) as Array<Record<string, unknown>>) {
      if (typeof r.user_id === 'string' && typeof r.email_kind === 'string') {
        alreadySent.add(`${r.user_id}:${r.email_kind}`)
      }
    }
  }
  const fresh = candidates.filter((c) => !alreadySent.has(`${c.id}:${c.kind}`))

  // ── 3) Supressão cruzada de 24h (fail-closed) + teto por execução ──────────
  const suppression = await loadLifecycleSuppression(admin, fresh.map((c) => c.id))
  const eligible = fresh.filter((c) => !suppression.isSuppressed(c.id))
  eligible.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind])
  const batch = eligible.slice(0, MAX_PER_RUN)

  const byKind: Record<string, number> = {}
  for (const c of batch) byKind[c.kind] = (byKind[c.kind] ?? 0) + 1

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      sent: 0,
      would_send: batch.length,
      by_kind: byKind,
      cohort: (rows ?? []).length,
      due: candidates.length,
      already_sent_filtered: candidates.length - fresh.length,
      suppressed_recent_lifecycle: suppression.suppressedCount,
      suppression_degraded: suppression.degraded,
      capped_out: Math.max(0, eligible.length - batch.length),
      flag_enabled: REVERSE_TRIAL_ENABLED,
      // KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — true = a coorte pós-trial
      // INTEIRA foi adiada nesta execução (ver a leitura de vídeos).
      video_counts_degraded: videoCounts === null,
      other_deliveries_degraded: other.degraded,
      // KINEO-FAILED-BY-US-2026-08-12 — degrade observável e SEPARADO do de
      // cima: este não adia ninguém, só apaga o pedido de desculpas. Sem campo
      // próprio, um run que mandou a copy antiga por falha de leitura seria
      // indistinguível de um run em que ninguém era vítima.
      our_failure_degraded: !ourFailureUsable,
    })
  }

  let sent = 0
  let failed = 0
  let skippedClaimed = 0
  let skippedExtensionRace = 0
  // KINEO-TRIAL-REVIVE-RACE-2026-08-11 — linhas cujo trial_status mudou entre a
  // leitura da coorte e o envio (na prática: ressuscitadas por estorno). Se este
  // contador começar a subir, é sinal de que o apagão de fornecedor está
  // devolvendo trials em volume — vale olhar antes do relatório das 22h.
  let skippedStatusChanged = 0
  let creditsRestored = 0

  for (const c of batch) {
    // ── 4a) Extensão: o UPDATE vem ANTES do e-mail ──────────────────────────
    // CAS em trial_extended=false + trial_status observado (+ saldo quando há
    // dinheiro a devolver). 0 linhas = corrida perdida (outro run estendeu, ou
    // a pessoa pagou e o webhook mudou o status) → NADA é enviado. Sem retry:
    // amanhã este cron reavalia com dados frescos. trial_extended=true na
    // mesma escrita é o que torna a extensão UMA por conta, para sempre —
    // mesmo que o e-mail falhe depois, o UPDATE nunca se repete.
    if (c.kind === 'trial_extended' && c.needsExtensionUpdate) {
      const patch: Record<string, unknown> = {
        trial_status: 'active',
        trial_ends_at: new Date(now + EXTENSION_DAYS * DAY_MS).toISOString(),
        trial_extended: true,
      }
      if (c.restore > 0) patch.video_credits = (c.balance ?? 0) + c.restore
      let write = admin
        .from('profiles')
        .update(patch)
        .eq('id', c.id)
        .eq('trial_extended', false)
        .eq('trial_status', c.status)
      if (c.restore > 0) {
        write = c.balance === null ? write.is('video_credits', null) : write.eq('video_credits', c.balance)
      }
      const { data: updated, error: updateErr } = await write.select('id')
      if (updateErr || !updated || updated.length === 0) {
        if (updateErr) console.error(`[trial-lifecycle-emails] extension update failed for ${c.id.slice(0, 8)}:`, updateErr.message)
        skippedExtensionRace++
        continue
      }
      creditsRestored += c.restore
      console.log(`[trial-lifecycle-emails] EXTENDED user=${c.id.slice(0, 8)} +${EXTENSION_DAYS}d restored=${c.restore}cr`)
    }

    // ── 4a-bis) RELEITURA DE STATUS ANTES DO CLAIM ─────────────────────────
    // KINEO-TRIAL-REVIVE-RACE-2026-08-11 (2ª revisão adversarial, NOVO-3).
    // A coorte é lida uma vez e o envio percorre até 40 linhas depois disso.
    // Desde que o estorno de fornecedor pode RESSUSCITAR um trial rebaixado
    // (ver recordReverseTrialRefundForRender), existe uma janela real entre a
    // leitura e o envio. Sem esta releitura o dano é duplo e permanente:
    //   1. sai "Here's what you just lost access to" para uma conta cujo trial
    //      voltou a viver — afirmação falsa que o usuário confere em 1 clique;
    //   2. o claim é gravado e é PERMANENTE, e a ressurreição já rodou o seu
    //      DELETE deste mesmo kind ANTES do insert — então o e-mail da morte
    //      REAL, dias depois, nunca mais sai. Some justamente o lead que já
    //      provou intenção.
    // Mesmo padrão de releitura que downgradeExpiredTrial usa antes de gravar.
    const { data: fresh, error: freshErr } = await admin
      .from('profiles')
      .select('trial_status')
      .eq('id', c.id)
      .maybeSingle()
    if (freshErr) {
      console.error(`[trial-lifecycle-emails] releitura falhou para ${c.id.slice(0, 8)}:`, freshErr.message)
      failed++
      continue
    }
    const freshStatus = typeof fresh?.trial_status === 'string' ? fresh.trial_status : ''
    if (freshStatus !== c.status) {
      console.log(
        `[trial-lifecycle-emails] STATUS MUDOU user=${c.id.slice(0, 8)} ` +
          `coorte=${c.status} agora=${freshStatus} kind=${c.kind} — pulando sem claim`,
      )
      skippedStatusChanged++
      continue
    }

    // ── 4b) Claim do e-mail ANTES do envio ──────────────────────────────────
    // ignoreDuplicates + PK(user_id, email_kind): 0 linhas = já reivindicado
    // (execução paralela ou run anterior) → não envia. Duplo envio é
    // impossível por construção; o pior caso (crash entre claim e envio) perde
    // um e-mail, que é o lado barato.
    const { data: claimed, error: claimErr } = await admin
      .from('trial_emails_log')
      .upsert(
        { user_id: c.id, email_kind: c.kind, sent_at: new Date().toISOString() },
        { onConflict: 'user_id,email_kind', ignoreDuplicates: true },
      )
      .select('user_id')
    if (claimErr) {
      console.error(`[trial-lifecycle-emails] claim failed for ${c.id.slice(0, 8)}:`, claimErr.message)
      failed++
      continue
    }
    if (!claimed || claimed.length === 0) {
      skippedClaimed++
      continue
    }

    const body = buildEmail(c)
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [c.email],
          reply_to: 'hello@usekineo.com',
          subject: body.subject,
          text: body.text,
          html: body.html,
          headers: unsubscribeHeaders(c.id),
        }),
      })
      // KINEO-EMAIL-QUOTA-WIRED-2026-08-17 — `revenue`: os 6 kinds do trial são
      // a sequência que fecha venda e NUNCA cedem vaga. Sem claim, por isso
      // (o veredito de `revenue` é sempre "pode"); o que entra é o ledger.
      // Ponto importante e não óbvio: `trial_lifecycle_email_sent` só é gravado
      // no ramo `res.ok`, então um dia inteiro morto por 429 aparece hoje como
      // "0 e-mails devidos" e não como "100 e-mails recusados". Esta linha é a
      // que desfaz essa ilusão — e é o número que justifica pagar o plano.
      await recordResendResponse({
        kind: `trial_${c.kind}`,
        priority: 'revenue',
        userId: c.id,
        res,
        admin,
      })

      if (res.ok) {
        sent++
        // Instrumentação: denominador do funil por kind (sent → arrived → paid).
        await admin.from('events').insert({
          user_id: c.id,
          name: 'trial_lifecycle_email_sent',
          path: '/api/cron/trial-lifecycle-emails',
          metadata: {
            kind: c.kind,
            variant: c.variant,
            restored: c.restore,
            // #20 — o que a pessoa LEU. O #19 nao conseguiu provar qual corpo
            // do `downgraded_loss` saiu para o zare; agora fica no evento.
            videos_made: c.videosMade,
            credits_lost: c.creditsLost,
            ...(body.body ? { body: body.body } : {}),
          },
        })
        console.log(`[trial-lifecycle-emails] sent ${c.kind} to ${c.email}`)
      } else {
        failed++
        console.error(`[trial-lifecycle-emails] resend failed (${c.kind}) for ${c.email}:`, await res.text())
        // Devolve a reivindicação — reentra amanhã. Para a extensão, o UPDATE
        // fica (é idempotente e já é verdade); o ramo de retry em dueKind()
        // reenvia só o e-mail.
        await admin.from('trial_emails_log').delete().eq('user_id', c.id).eq('email_kind', c.kind)
      }
    } catch (err) {
      failed++
      console.error(`[trial-lifecycle-emails] error (${c.kind}) for ${c.email}:`, err)
      await admin.from('trial_emails_log').delete().eq('user_id', c.id).eq('email_kind', c.kind)
    }
  }

  return NextResponse.json({
    sent,
    failed,
    by_kind: byKind,
    cohort: (rows ?? []).length,
    due: candidates.length,
    already_sent_filtered: candidates.length - fresh.length,
    eligible: eligible.length,
    capped_out: Math.max(0, eligible.length - batch.length),
    skipped_claimed: skippedClaimed,
    skipped_extension_race: skippedExtensionRace,
    skipped_status_changed: skippedStatusChanged,
    credits_restored: creditsRestored,
    suppressed_recent_lifecycle: suppression.suppressedCount,
    suppression_degraded: suppression.degraded,
    // KINEO-TRIAL-EXTENSION-INVERTED-2026-08-12 — mesma razão de
    // `suppression_degraded` estar aqui: um 200 com a coorte pós-trial inteira
    // adiada tem de ser distinguível de um 200 normal.
    video_counts_degraded: videoCounts === null,
    other_deliveries_degraded: other.degraded,
    // KINEO-FAILED-BY-US-2026-08-12 — a resposta do caminho FELIZ é a que mais
    // precisa deste campo: as outras duas já são caminhos anômalos. Aqui um 200
    // com envios feitos e a atribuição de culpa suprimida por falha de leitura
    // sairia idêntico a um 200 em que ninguém era vítima.
    our_failure_degraded: !ourFailureUsable,
  })
}
