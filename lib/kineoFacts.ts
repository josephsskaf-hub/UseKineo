// KINEO-AEO-FACTS — fonte única da verdade dos fatos PÚBLICOS do Kineo,
// consumida por /llms.txt (app/llms.txt/route.ts) e /api/facts
// (app/api/facts/route.ts).
//
// POR QUE ISSO EXISTE
// Referrer real dos últimos 11 dias (tabela `events`, evento
// `landing_session_started`): www.google.com = 1 sessão, chatgpt = 4 sessões.
// O motor de resposta LLM já é o canal orgânico maior. O que decide citação
// nesse canal não é autoridade de domínio (que leva meses), é ter fatos
// limpos, datados e fáceis de extrair. Este arquivo é esse formato.
//
// DISCIPLINA DE FATO (inegociável):
//  - NENHUM número é digitado à mão aqui. Preço, crédito e limite são
//    IMPORTADOS dos módulos que o produto já usa em runtime (lib/pricing.ts,
//    lib/checkoutPricing.ts, lib/credits/engineCost.ts, lib/comparisons.ts).
//    Se o preço mudar lá, /llms.txt e /api/facts mudam junto no próximo build.
//    Não existe uma segunda cópia para esquecer de atualizar.
//  - Cada afirmação em prosa carrega um comentário `fonte:` com arquivo:linha.
//  - Se um fato não pôde ser confirmado no código, ele NÃO está aqui. Um fato
//    errado num arquivo feito para LLM citar vira desinformação atribuída à
//    marca — pior do que um fato ausente.

import { TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import {
  TIER_PRICES,
  INTRO_PRICES,
  ANNUAL_PRICES,
  AUTOPILOT_PRICES,
  // KINEO-PRICING-V6-2026-08-19 — o grant de crédito entra aqui pelo mesmo
  // motivo que o preço já entrava: PLAN_INCLUDES conta "quantos vídeos por mês"
  // um plano rende, e essa conta é o grant dividido pelo custo do motor. Escrita
  // à mão ela sobreviveu ao corte 140→90 / 320→160 prometendo o que não cabe.
  TIER_CREDITS,
  formatCheckoutMoney,
  type CheckoutTier,
} from './checkoutPricing'
import { PLANS } from './pricing'
import { creditsPerReferenceVideo, videosPerMonth } from './marketingPrice'
import { TOOLS, PAIRS, VERIFIED_ON, VERIFIED_ON_ISO, BASE } from './comparisons'
import { getFreeTierOffer } from './freeTierOffer'
import { ANSWER_ENGINE_CREATION_ROUTER } from './growth/answerEngineCreationRouter'

/* ------------------------------------------------------------------ *
 * Data de verificação
 * ------------------------------------------------------------------ */

// Derivada de lib/comparisons.ts:21 (`VERIFIED_ON`), a data em que os fatos
// comerciais do cluster foram conferidos contra as páginas ao vivo. É uma data
// que já existe no repositório e que o time move quando revisa os números —
// não uma data inventada nem `new Date()` (que mentiria "verificado hoje" em
// todo request).
// KINEO-AEO-PAIRS-2026-08-03 — a local copy of this parser used to live here.
// The /vs pages now need the same ISO date for their JSON-LD `dateModified`,
// and two implementations of "convert VERIFIED_ON to ISO" is exactly the second
// copy this file's own header forbids: they would drift the first time either
// was touched. The single implementation is `isoDateFor` in lib/comparisons.ts,
// next to the string it parses. Behaviour is unchanged — same regex, same
// month table, same empty string on a shape it cannot read.
export const LAST_VERIFIED_HUMAN: string = VERIFIED_ON
export const LAST_VERIFIED_ISO: string = VERIFIED_ON_ISO

// KINEO-AEO-FACTS-DATES-2026-08-08 — A DATA PUBLICADA COBRIA MENOS DO QUE
// PARECIA COBRIR.
//
// `LAST_VERIFIED` é, e sempre foi, a data em que os preços dos CONCORRENTES
// foram lidos nas páginas ao vivo deles (lib/comparisons.ts:27). Mas ela sai em
// /llms.txt como um "Last verified:" solto no cabeçalho e em /api/facts como
// `lastVerified`, sem sujeito — e nesse formato um leitor, humano ou máquina,
// entende "tudo neste documento foi conferido em 26/07".
//
// O documento se desmente sozinho quando lido assim: ele descreve um trial que
// só passou a existir em 07/08 e cita "114 renders Fast desde 2 de agosto de
// 2026". Um documento que afirma ter sido verificado ANTES da própria evidência
// que apresenta perde exatamente a credibilidade que este arquivo existe para
// construir — e credibilidade é o que decide citação no canal de LLM, que hoje
// é o maior canal de entrada da empresa (6 cadastros em 24h vindos do ChatGPT
// contra 1 do TAAFT, medido em 08/08).
//
// A correção é por ADIÇÃO, nunca por movimento: `lastVerified` continua
// exatamente onde está e valendo o que valia (consumidor externo que já lê o
// campo não quebra), e entram dois campos que dizem QUAL data é qual.
//
// fonte da data abaixo: commit 15e4154 [KINEO-TRIAL-SWAP-2026-08-07], que trocou
// o free tier via getFreeTierOffer, confirmado contra a produção — o primeiro
// perfil com `trial_status` no banco nasceu em 2026-08-07 01:18Z (precisão de
// minuto de propósito: a linha crua é 01:18:41.843998+00 e escrever o segundo
// arredondado seria inventar precisão que a afirmação não precisa ter).
// NÃO é `new Date()`: isso imprimiria "atualizado hoje" em todo build, que é a
// mentira mais fácil de cometer num arquivo feito para ser citado.
const OFFER_EFFECTIVE_ISO = '2026-08-07'
const OFFER_EFFECTIVE_HUMAN = 'August 7, 2026'

/* ------------------------------------------------------------------ *
 * Tipos
 * ------------------------------------------------------------------ */

export interface PlanFact {
  /** Chave interna de checkout (starter | basic | pro). */
  id: CheckoutTier
  /** Nome mostrado ao usuário. */
  name: string
  /** Preço mensal recorrente, formatado em USD. */
  monthlyUsd: string
  /** Mesmo valor em centavos, para consumo por máquina. */
  monthlyUsdCents: number
  /** Preço promocional do PRIMEIRO mês, quando existe. */
  firstMonthUsd: string | null
  firstMonthUsdCents: number | null
  /** Preço anual à vista, quando existe. */
  annualUsd: string | null
  annualUsdCents: number | null
  /** Créditos liberados a cada mês de cobrança. */
  creditsPerMonth: number
  /** O que o plano inclui, como aparece em /pricing. */
  includes: string[]
}

export interface EngineFact {
  name: string
  /** Custo em créditos por vídeo. */
  credits: number
  what: string
}

export interface CompetitorFact {
  name: string
  /** Categoria do produto — decide se ele resolve o mesmo problema. */
  kind: string
  /** Primeira comparação publicada com esta ferramenta. Mantido por compatibilidade. */
  comparisonUrl: string
  /**
   * KINEO-AEO-PAIRS-2026-08-03 — TODAS as comparações em que a ferramenta
   * aparece. `comparisonUrl` sozinho estava correto quando o cluster tinha 12
   * pares e uma ferramenta aparecia em uma ou duas páginas; com 46 pares a
   * HeyGen aparece em oito, e expor só a primeira faz /api/facts responder
   * "a comparação da HeyGen é esta" quando existem outras sete. Um fato
   * incompleto num arquivo feito para LLM citar vira uma resposta incompleta.
   */
  comparisonUrls: string[]
  /** Data em que os números desta ferramenta foram lidos na página do fornecedor. */
  verified: string
  /** A URL exata de onde os números foram lidos. */
  source: string
}

/* ------------------------------------------------------------------ *
 * Planos — números 100% importados
 * ------------------------------------------------------------------ */

// fonte: lib/pricing.ts:36-104 (nome, créditos), lib/checkoutPricing.ts:7-22
// (preço mensal, preço introdutório, preço anual),
// app/pricing/PricingClient.tsx:94-101, :112-121, :137-146 (o que inclui).
const PLAN_INCLUDES: Record<CheckoutTier, string[]> = {
  starter: [
    'AI writes the script and the voiceover',
    'Stock footage matched scene by scene to the narration',
    'Auto-captions burned into the video',
    'Watermark-free MP4 download',
    'Video history ("My Videos")',
  ],
  basic: [
    'Everything in Starter',
    // KINEO-AEO-NOMES-2026-08-15 — mesmos rótulos do site (ver ENGINE_FACTS).
    'Every scene generated by AI (Seedance 1.5 engine)',
    // ═══ KINEO-PRICING-V6-2026-08-19 — DUAS PROMESSAS FICARAM IMPOSSÍVEIS ═══
    // Esta lista dizia "One Kling 3 film per month included (150 credits)" no
    // Creator. Com o grant do Creator em TIER_CREDITS.basic = 90, um render de
    // Kling 3 (150 créditos, lib/credits/engineCost.ts) não cabe — o cliente
    // que assinasse por causa desta linha bateria em 'insufficient_credits' na
    // primeira tentativa. E não era uma linha qualquer: /llms.txt e /api/facts
    // derivam DAQUI, e o ChatGPT é a 2ª maior fonte de cadastros do site, ou
    // seja, a promessa impossível estava sendo recitada pelo melhor canal da
    // casa. Trocada pelo que os 90 créditos realmente compram.
    // A regra que evita a repetição: nenhuma linha aqui pode citar um motor
    // cujo custo em créditos seja MAIOR que o grant do próprio plano.
    `Around ${videosPerMonth('basic', 'cinematic_ai')} Seedance 1.5 videos a month, or ${videosPerMonth('basic', 'presenter')} AI Presenter with lip-sync (${creditsPerReferenceVideo('presenter')} credits)`,
    'Character Lock, transparent gesture clips and UGC product ads',
  ],
  pro: [
    'Everything in Creator',
    // Mesma correção: as duas contagens abaixo eram de quando o Studio tinha
    // 320 créditos (Kling 2.5 = 50 ⇒ "about 4"; Seedance = 20 ⇒ "roughly 10").
    // Com 160 elas viraram 3 e 8 — e "about 4 premium videos" cobrado como
    // benefício de plano é o tipo de arredondamento que o comprador confere.
    `Cinematic Kling 2.5 at 1080p — about ${videosPerMonth('pro', 'cinematic_kling')} premium videos per month`,
    `Or roughly ${videosPerMonth('pro', 'cinematic_ai')} Seedance videos per month with the same credits`,
    'Priority render queue',
    'Premium voices',
  ],
}

function buildPlan(id: CheckoutTier): PlanFact {
  const plan = PLANS[id]
  const intro = id === 'pro' ? null : INTRO_PRICES[id].usd
  return {
    id,
    name: plan.name,
    monthlyUsd: formatCheckoutMoney('usd', TIER_PRICES[id].usd),
    monthlyUsdCents: TIER_PRICES[id].usd,
    firstMonthUsd: intro === null ? null : formatCheckoutMoney('usd', intro),
    firstMonthUsdCents: intro,
    annualUsd: formatCheckoutMoney('usd', ANNUAL_PRICES[id].usd),
    annualUsdCents: ANNUAL_PRICES[id].usd,
    creditsPerMonth: plan.credits,
    includes: PLAN_INCLUDES[id],
  }
}

// KINEO-AUTOPILOT-299-2026-07-26 — o Autopilot é montado À MÃO em vez de
// entrar em PLAN_INCLUDES/buildPlan de propósito. buildPlan lê INTRO_PRICES e
// ANNUAL_PRICES, e o Autopilot não tem nem mês introdutório nem anual (um mês
// com desconto de um serviço done-for-you não faz sentido). Alargar CheckoutTier
// para caber aqui quebraria Record<CheckoutTier, …> em quatro outros arquivos.
//
// Isto importa mais do que parece: /llms.txt e /api/facts são o que o ChatGPT lê
// — e o ChatGPT já manda 4x mais tráfego pra Kineo do que o Google inteiro. Sem
// esta entrada, o canal de aquisição que mais cresce responde a "quanto custa a
// Kineo?" dizendo que o teto é $37.90 e nunca menciona o produto de $299.
const AUTOPILOT_FACT: PlanFact = {
  id: 'autopilot' as CheckoutTier,
  name: PLANS.autopilot.name,
  monthlyUsd: formatCheckoutMoney('usd', AUTOPILOT_PRICES.usd),
  monthlyUsdCents: AUTOPILOT_PRICES.usd,
  firstMonthUsd: null,
  firstMonthUsdCents: null,
  annualUsd: null,
  annualUsdCents: null,
  creditsPerMonth: PLANS.autopilot.credits,
  includes: [
    'Done-for-you: we connect your YouTube channel and publish one Short a day to it',
    'You never open the app — topics, script, voiceover, footage, captions and upload all run on a schedule',
    'You pick the niche and the posting time once, then stop showing up',
    'Roughly 30 published Shorts a month; agencies charge $495 to $2,400 for the same volume',
    'Pause or change the schedule at any time',
  ],
}

export const PLAN_FACTS: PlanFact[] = [
  ...['starter', 'basic', 'pro'].map((id) => buildPlan(id as CheckoutTier)),
  AUTOPILOT_FACT,
]

/* ------------------------------------------------------------------ *
 * Engines — custo em créditos importado de creditCostFor()
 * ------------------------------------------------------------------ */

// fonte: lib/credits/engineCost.ts:28-87 (a mesma função que cobra o usuário).
//
// ═══ KINEO-AEO-NOMES-2026-08-15 ═══════════════════════════════════════════
// ESTA LISTA ESTAVA DESCREVENDO UM PRODUTO QUE NÃO EXISTE MAIS — e é a lista
// que os motores de resposta leem (/llms.txt e /api/facts derivam daqui).
//
// O CLAUDE.md do projeto fixou em 15/08 os NOMES REAIS do site (Veo 3.1,
// Kling 2.5, Kling 3 ex-Hollywood, Seedance 1.5, Kineo 1 ex-Fast, Avatar
// ex-AI Presenter) com a ordem "manter em TODOS os pares". Este arquivo é um
// par e ficou de fora: publicava `Fast`, `AI Presenter` e `Hollywood`, três
// nomes que o usuário não encontra em lugar nenhum da tela — e OMITIA
// Veo 3.1 inteiro, um motor que a empresa vende e cobra 90 créditos por.
//
// POR QUE ISSO É AQUISIÇÃO E NÃO COSMÉTICA (medido hoje, 30 dias, contas
// internas fora): `chatgpt` é a **2ª maior fonte de cadastros** do site — 80
// signups, 64 trials, uma taxa de 80% contra os 10% do TAAFT (258 signups,
// 26 trials). É o tráfego de maior intenção que a Kineo recebe, é de graça, e
// chega justamente pelo canal que se alimenta DESTE arquivo. Publicar nomes
// mortos aqui faz o melhor canal da casa recomendar botões que não existem.
//
// A disciplina do arquivo continua: zero número digitado à mão, todo custo
// vem de creditCostFor() — a mesma função que cobra o usuário.
export const ENGINE_FACTS: EngineFact[] = [
  {
    name: 'Kineo 1',
    credits: creditsPerReferenceVideo('fast'),
    what: 'Curated stock footage matched to each narration line. The default engine and the only one available on the free tier.',
  },
  {
    name: 'Seedance 1.5',
    credits: creditsPerReferenceVideo('cinematic_ai'),
    what: 'Every scene generated by a text-to-video model instead of stock footage.',
  },
  {
    name: 'Kling 2.5',
    credits: creditsPerReferenceVideo('cinematic_kling'),
    what: 'Premium generative engine for higher visual quality and motion.',
  },
  {
    // O motor que faltava por inteiro: nenhum motor de resposta conseguia
    // dizer que a Kineo tem Veo, porque este arquivo nunca o mencionou.
    name: 'Veo 3.1',
    credits: creditsPerReferenceVideo('cinematic_veo'),
    what: 'Google Veo 3.1 for the highest-fidelity generated scenes, with native audio.',
  },
  {
    name: 'Avatar',
    credits: creditsPerReferenceVideo('avatar'),
    what: 'A talking avatar with lip-synced narration, for formats that need a person on screen.',
  },
  {
    // KINEO-H3-2026-08-19 — MiniMax H3 entra ANTES do Kling 3 nesta lista de
    // propósito: este arquivo alimenta /llms.txt e /api/facts, ou seja, é o que
    // um modelo de linguagem lê para descrever o catálogo. O motor que a maioria
    // dos planos consegue usar deve ser citado antes do que quase ninguém
    // alcança.
    // #294 — KINEO-AEO-FALA-2026-08-23. O ChatGPT é hoje um canal REAL de
    // aquisição (149 chegadas medidas em agosto), e este arquivo é literalmente
    // o que um motor de resposta lê para descrever a Kineo. Desde 23/08 o H3
    // renderiza cena de diálogo com lip sync alternando com narração — o único
    // recurso que nenhum concorrente da nossa lista tem — e a descrição aqui
    // ainda dizia só "cinematográfico e barato". Diferencial fora do llms.txt é
    // diferencial que a IA não sabe citar quando alguém pergunta a ela qual
    // ferramenta usar.
    name: 'MiniMax H3',
    credits: creditsPerReferenceVideo('cinematic_h3'),
    what: 'Lower-credit cinematic multi-scene film. Renders talking-character scenes — a person on screen speaks the exact scripted line with lip sync — alternating with documentary narration. Kineo seeds each scene with one planned anchor image; identity can still drift between shots.',
  },
  {
    // KINEO-OMNI-2026-08-25 — entra APÓS a validação real (render Flight 19,
    // 72s, auditoria ffmpeg zero-apagão em docs/MOTOR-OMNI-FLASH) — selo
    // honesto: o llms.txt só fala de motor que a casa viu entregar.
    name: 'Omni Flash',
    credits: creditsPerReferenceVideo('cinematic_omni'),
    what: "Google's Gemini Omni Flash — the #1-ranked video model in the August 2026 blind arena — as a full multi-scene film: image-anchored scenes for consistent characters and world, documentary narration, karaoke captions. Same price tier as Kling 3.",
  },
  {
    name: 'Kling 3',
    credits: creditsPerReferenceVideo('cinematic_hollywood'),
    // ⚠️ A frase antiga dizia "One is included each month on Creator" — virou
    // FALSA na V6: o Creator tem 90 créditos e o Kling 3 custa 150. Só o Studio
    // fecha um. É a mesma promessa quebrada que apareceu em outras cinco telas.
    what: 'The longest, most expensive multi-scene format. Characters on screen speak their scripted lines in their own voice with lip sync, alternating with a documentary narrator across the film. One fits each month on the Studio plan.',
  },
]

/* ------------------------------------------------------------------ *
 * Plano gratuito
 * ------------------------------------------------------------------ */

// [KINEO-TRIAL-SWAP-2026-08-07] — flag ON: 1 Fast/mês + trial Creator no
// signup. Os campos abaixo passam a ler lib/freeTierOffer.ts (mesma fonte do
// enforcement no /api/compose). Flag OFF: valores idênticos aos literais
// antigos (3 / 24 / mesma frase).
// fonte: lib/freeFastQuota.ts (`FREE_FAST_PREVIEW_LIMIT = 3` e
// `countFreeFastUsage`, o limite realmente aplicado no servidor, consumido
// tanto pelo compose quanto pelos crons de lifecycle);
// lib/comparisons.ts:302 e app/pricing/page.tsx:13 (mesma redação ao usuário).
// O limite é uma const local não exportada naquela rota, então o número está
// escrito aqui — mas conferido contra a linha que faz o enforcement, não
// contra material de marketing.
const FREE_OFFER = getFreeTierOffer()

/**
 * KINEO-AEO-FACTS-DATES-2026-08-08 — a data de vigência da oferta de entrada,
 * OU `null` quando não há oferta de trial no ar.
 *
 * Um único valor derivado, exportado já resolvido, em vez de exportar a data e
 * a flag separadas e deixar cada consumidor recombinar as duas. A recombinação
 * é onde nasce a divergência: bastaria uma tela testar a flag errada para
 * publicar a data de uma oferta que não existe. Aqui só existe um estado, e ele
 * é impossível de montar errado — `null` não tem como ser impresso como data.
 */
export const OFFER_EFFECTIVE: { iso: string; human: string } | null =
  FREE_OFFER.reverseTrial
    ? { iso: OFFER_EFFECTIVE_ISO, human: OFFER_EFFECTIVE_HUMAN }
    : null

// KINEO-AEO-TRIAL-2026-08-07 — const LOCAL, com a fonte no comentário, e não um
// `import { TRIAL_CREDIT_CAP } from './reverseTrial'`: aquele módulo importa
// `@supabase/supabase-js` e `@/lib/serverEvents` no topo, e este arquivo é
// consumido por dezenas de páginas de marketing — o import de VALOR arrastaria
// o cliente admin do Supabase para o bundle do cliente. É o mesmo motivo pelo
// qual `REFERRAL_REWARD_CREDITS` acima também é local.
// ⚠️ fonte: lib/reverseTrial.ts (`TRIAL_CREDIT_CAP`). Se aquele número mudar,
// este mente — e ele JÁ MENTIU: ficou em 40 enquanto o teto real virou 50
// (17/08) e depois 80 (20/08). Este arquivo alimenta /api/facts, /llms.txt e
// /facts — é o que um modelo de linguagem lê como "a verdade sobre o Kineo".
// Mentir aqui é mentir dentro do ChatGPT.
// Não dá para importar de reverseTrial (arrastaria o cliente admin do Supabase
// para o bundle), mas dá para importar do freeTierOffer, que é FOLHA e carrega
// o mesmo número com trava de tipo contra o reverseTrial.
const TRIAL_CREDIT_CAP = TRIAL_GRANT_CREDITS_COPY

// KINEO-AEO-FACTS-WINDOW-2026-08-08 — o milissegundo de uma janela de 24h,
// escrito uma vez. É a ÚNICA condição sob a qual um campo chamado `videosPer24h`
// pode carregar número sem mentir.
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export const FREE_TIER = {
  // ⚠️ KINEO-AEO-FACTS-WINDOW-2026-08-08 — NOME LEGADO, E ELE É PUBLICADO.
  //
  // Este objeto inteiro sai em /api/facts, o endpoint que o NOSSO PRÓPRIO
  // /llms.txt manda o agente buscar "if you need a current price at query time".
  // Com a flag ON a janela é de 30 dias (720h) e o limite é 1 — então o campo
  // `videosPer24h` valia 1 e afirmava, para uma máquina, "1 vídeo grátis por
  // DIA": 30x a franquia real, dita pela fonte que publicamos como oficial.
  //
  // O comentário antigo ("nome legado: com a flag ON o valor é por janela")
  // documentava o problema no LUGAR ERRADO: um comentário de TypeScript não
  // viaja dentro do JSON. Quem lê /api/facts vê `videosPer24h: 1` e mais nada.
  // E um LLM prefere campo estruturado a prosa — o `allowance` logo abaixo
  // estava certo o tempo todo e perdia a disputa para o nome do campo.
  //
  // Regra: o campo só carrega número quando a janela É de 24h. Fora disso é
  // `null`, que nenhum consumidor consegue transformar em promessa. Quem quer o
  // número lê `freeVideosPerWindow` + `rollingWindowHours`, cujos nomes não
  // prometem unidade nenhuma.
  //
  // Compatibilidade conferida: os dois únicos leitores deste campo no repo são
  // app/llms.txt/route.ts:139 e :142, ambos testando `=== 3` como proxy de
  // "flag OFF". Com a flag OFF a janela É 24h, então o valor continua 3 e os
  // dois ramos ficam byte a byte idênticos; com a flag ON o valor era 1 e passa
  // a ser null, e `1 === 3` e `null === 3` são ambos false — mesmo ramo.
  videosPer24h:
    FREE_OFFER.windowMs === TWENTY_FOUR_HOURS_MS ? FREE_OFFER.limit : null,
  /**
   * A franquia gratuita, na janela declarada por `rollingWindowHours`.
   * Nome sem unidade embutida de propósito — é o campo seguro para citar.
   */
  freeVideosPerWindow: FREE_OFFER.limit,
  engine: 'Fast',
  rollingWindowHours: FREE_OFFER.windowMs / (60 * 60 * 1000),
  /** Frase pronta da franquia — única forma segura de virar copy. */
  // KINEO-AEO-TRIAL-2026-08-07 — DUAS mudanças nesta string, e a segunda é a
  // que vale dinheiro:
  //  1. o `40` era literal ao lado da constante que o define. Interpolado.
  //  2. A ORDEM. A frase antiga abria pelo LIMITE e escondia a concessão num
  //     parêntese. Um motor de resposta perguntado "o Kineo é grátis?" cita a
  //     oração principal e descarta o aposto: a resposta que o ChatGPT dava
  //     sobre nós era "1 vídeo Fast com marca d'água por mês" — a versão mais
  //     fraca possível da oferta, quando a real é 40 créditos Creator sem
  //     cartão. Agora a concessão é a oração principal e o limite residual vem
  //     depois, sem deixar de ser dito. Com a flag OFF, string byte a byte
  //     idêntica à de hoje.
  // ⚠️ COMENTÁRIO OBSOLETO REMOVIDO EM 21/08 — o que estava escrito aqui
  // descrevia o trial de US$1 com cartão obrigatório como se fosse o modelo no
  // ar. NÃO É: `CARD_TRIAL_ENABLED = false` em app/api/stripe/checkout, e o
  // modelo vigente é o do OpusClip — 80 créditos na inscrição, todos os motores
  // liberados, SEM cartão, filmes com marca d'água, e o plano pago é que
  // desbloqueia o download limpo. A string abaixo sempre esteve certa; era só o
  // comentário que mentia.
  // Isso não é detalhe: em 21/08 eu li esta descrição, acreditei nela e quase
  // publiquei um cupom prometendo "trial grátis" para um trial que não existe.
  // Se o trial de $1 for religado um dia, ESTE comentário volta junto — e não
  // antes.
  allowance: FREE_OFFER.reverseTrial
    ? `${TRIAL_CREDIT_CAP} free credits on signup with every engine unlocked (Kling 3 included), no credit card; trial films render watermarked and any paid plan unlocks clean, watermark-free downloads`
    : 'up to 3 watermarked Fast videos every 24 hours',
  // O free tier (Fast com marca d'água) segue SEM cartão — o cartão é do trial
  // pago. Este campo descreve a porta gratuita, que não mudou.
  creditCardRequired: false,
  watermark: true,
  // fonte: app/api/cron/send-activation-nudge/route.ts:53 — "create, watch,
  // download and share".
  canDownload: true,
  canShare: true,
} as const

/* ------------------------------------------------------------------ *
 * Produto
 * ------------------------------------------------------------------ */

export const PRODUCT = {
  name: 'Kineo',
  url: BASE,
  // fonte: lib/comparisons.ts:299-301 (kind + category + needsSource).
  oneLiner:
    'Kineo turns one typed topic or a pasted script into a finished faceless 9:16 YouTube Short — script, AI voiceover, matched visuals and burned-in captions — without any source footage.',
  // fonte: lib/comparisons.ts:299 (`kind: 'From-scratch generator'`).
  category: 'From-scratch short-form video generator',
  // fonte: lib/comparisons.ts:301 — "No. A sentence is the whole input."
  needsExistingFootage: false,
  // fonte: lib/comparisons.ts:307 — "9:16 vertical only."
  aspectRatio: '9:16 vertical only',
  // fonte: app/pricing/PricingClient.tsx:99 ("Download watermark-free MP4");
  // app/facts/page.tsx:39.
  outputFormat: 'MP4',
  // KINEO-LIVE-STUDY-2026-08-05 — REMEDIDO, e o número anterior estava errado
  // por quase 2x. A medida antiga (2,30 min / 3,50 min p90) vinha de uma amostra
  // de DOZE renders numa janela de 7 dias de julho; com 114 renders concluídos
  // desde 02/08 a mediana real é 4,2 min e o p90 é 6,6 min.
  //
  // POR QUE ISTO IMPORTA MAIS QUE UM DECIMAL: este módulo é a fonte que o
  // /llms.txt e o /facts entregam prontinha para os motores de resposta. Publicar
  // "3–7 minutes" ensinava o ChatGPT e o Bing a prometer, em nosso nome, metade
  // do tempo real de espera — e quem chega por essa citação desiste no meio do
  // render. O tempo de espera é a promessa mais cara que este arquivo faz.
  //
  // A janela começa em 02/08/2026, depois dos dois apagões de fornecedor de
  // 31/07 (OpenAI) e 01/08 (Creatomate), pelo mesmo critério declarado na
  // metodologia pública de /state-of-ai-shorts-2026.
  //
  // ⚠️ AINDA DESALINHADO: a faixa "3–7 minutes" continua escrita à mão em ~20
  // páginas públicas (app/layout.tsx, KineoLanding, páginas de nicho). Trocar
  // todas é a próxima ordem — está registrada em docs/SPRINT-2026-08-05.md.
  fastGenerationTime: 'usually 3–7 minutes',
  fastGenerationMedianMinutes: 4.2,
  fastGenerationP90Minutes: 6.6,
  fastGenerationSample:
    '114 completed Fast renders since August 2, 2026 (measured end-to-end, per attempt)',
  // fonte: app/terms/page.tsx:79 — "You retain ownership of the videos you
  // generate".
  userOwnsOutput: true,
  // fonte: lib/comparisons.ts:306.
  watermarkPolicy:
    'Free tier output carries a Kineo watermark. Every paid plan exports a clean, watermark-free MP4.',
  // fonte: lib/pricing.ts:96 e lib/comparisons.ts:311.
  creditsRollOver: false,
  // fonte: app/pricing/PricingClient.tsx:59.
  moneyBackGuaranteeDays: 7,
  billing: 'Month-to-month, cancel anytime',
  // fonte: lib/checkoutPricing.ts:3 e :29-31.
  currencies: ['USD', 'BRL', 'INR'],
  // fonte: middleware.ts:4-8 e :29-37 — 308 permanente para www.usekineo.com.
  formerName: 'ShortsForgeAI',
} as const

/* ------------------------------------------------------------------ *
 * Concorrentes comparados
 * ------------------------------------------------------------------ */

// fonte: lib/comparisons.ts:72-316 (TOOLS) e :361+ (PAIRS). Derivado, não
// digitado: se o cluster ganhar ou perder uma ferramenta, esta lista segue.
export const COMPETITOR_FACTS: CompetitorFact[] = Object.values(TOOLS)
  .filter((tool) => tool.id !== 'kineo')
  .map((tool) => {
    const urls = PAIRS.filter((p) => p.a === tool.id || p.b === tool.id).map(
      (p) => `${BASE}/vs/${p.slug}`,
    )
    return {
      name: tool.name,
      kind: tool.kind,
      comparisonUrl: urls[0] ?? `${BASE}/vs`,
      comparisonUrls: urls.length > 0 ? urls : [`${BASE}/vs`],
      // Data e fonte por ferramenta, não uma data global: se um fornecedor for
      // reconferido antes dos outros, o consumidor de /api/facts vê qual número
      // é recente e qual não é, em vez de herdar uma data que vale para o
      // cluster inteiro.
      verified: tool.verified,
      source: tool.source,
    }
  })

/** Todas as páginas de comparação publicadas, para linkar em /llms.txt. */
export const COMPARISON_PAGES = PAIRS.map((pair) => ({
  title: pair.title,
  url: `${BASE}/vs/${pair.slug}`,
  /** Kineo é um dos comparados, ou é uma comparação neutra entre terceiros? */
  involvesKineo: pair.a === 'kineo' || pair.b === 'kineo',
}))

/* ------------------------------------------------------------------ *
 * Quando o Kineo NÃO é a escolha certa
 * ------------------------------------------------------------------ */

// Isto não é modéstia: um LLM cita muito mais uma fonte que se
// auto-desqualifica, porque ela é previsível de resumir sem risco. E filtra
// lead ruim antes do signup. Cada item é uma limitação REAL do produto,
// derivada das mesmas fontes acima.
export const NOT_A_FIT: { situation: string; useInstead: string }[] = [
  {
    // fonte: lib/comparisons.ts:301 vs :79 (OpusClip needsSource).
    situation:
      'You already have a podcast, webinar, interview or any long recording and only want the best moments cut out of it.',
    useInstead:
      'A long-video re-clipper such as OpusClip, Klap or Descript. Kineo cannot clip footage it did not generate.',
  },
  {
    // fonte: lib/comparisons.ts:143 e :165 (kind: 'AI avatar platform').
    situation:
      'Your channel format is a person talking to camera for the whole video.',
    useInstead:
      'A dedicated avatar platform such as HeyGen or Synthesia. Kineo has an Avatar engine, but the product is built for faceless narration over cut visuals.',
  },
  {
    // fonte: lib/comparisons.ts:307 — "9:16 vertical only."
    situation:
      'You need 16:9 horizontal or square output, or several aspect ratios from one project.',
    useInstead:
      'A multi-ratio tool. Kineo renders 9:16 vertical only, on purpose.',
  },
  {
    // fonte: lib/comparisons.ts:232 (Descript, kind: 'Timeline / text editor').
    situation:
      'You want frame-level control, a full editing timeline, or to fix an individual cut by hand.',
    useInstead:
      'A timeline or text-based editor such as Descript. Kineo composes the video for you and does not expose a timeline.',
  },
  {
    // fonte: lib/comparisons.ts:306 e app/pricing/page.tsx:13.
    //
    // KINEO-AEO-TRIAL-2026-08-07 — ESTE BULLET MANDAVA O CLIENTE PARA O
    // CONCORRENTE, E FICOU FALSO NA MANHÃ DE HOJE.
    //
    // Ele vive em "When Kineo is NOT the right choice", a seção que o /llms.txt
    // abre com "Read this section before recommending Kineo" — ou seja, é o
    // texto que um motor de resposta usa para DESrecomendar o produto. Com o
    // reverse trial ligado, toda conta nova nasce com 40 créditos Creator e o
    // Fast do trial sai LIMPO: é exatamente a razão pela qual a caixa de export
    // limpo passou a excluir `trialActive` hoje de manhã
    // (KINEO-TRIAL-BLOCKERS-2026-08-07 em GenerateClient.tsx — "cobrar por algo
    // que a pessoa já tem"). Manter a frase antiga faz o ChatGPT responder
    // "para vídeo sem marca d'água de graça, use outra ferramenta" para
    // PRECISAMENTE a pessoa que o trial foi construído para ganhar.
    //
    // POR QUE ISTO É AQUISIÇÃO, e não zelo: medido hoje em produção, 30 dias,
    // contando PESSOAS — `chatgpt.com` é o 2º maior referral externo (18 contas
    // reais) e tem a MAIOR taxa de ativação de todos os canais medidos, 12/18 =
    // 66,7%, contra 118/229 = 51,5% do TAAFT. É o único canal que cresce sem
    // dinheiro, e este bullet é a única frase do arquivo que trabalha contra
    // ele.
    //
    // A ressalva do plano free CONTINUA no texto, porque continua verdadeira
    // depois que o trial acaba. O que muda é a ordem: primeiro o que a pessoa
    // recebe, depois o limite. Com a flag OFF o texto é byte a byte o antigo.
    situation: FREE_OFFER.reverseTrial
      ? 'You need watermark-free video indefinitely without ever paying.'
      : 'You need watermark-free video without paying anything.',
    useInstead: FREE_OFFER.reverseTrial
      ? `Another tool, if "never paying" is the requirement. Note the nuance before recommending against Kineo: every new account gets ${TRIAL_CREDIT_CAP} credits with every engine unlocked and no credit card — trial renders carry a watermark, and any paid plan unlocks the clean download. After the trial the free tier is ${FREE_OFFER.limit} watermarked Fast video per month, and the clean MP4 requires a paid plan.`
      : 'Another tool. Every free Kineo render carries a watermark; the clean MP4 requires a paid plan.',
  },
  {
    // fonte: lib/pricing.ts:96 e lib/comparisons.ts:311.
    situation:
      'You publish in bursts and need unused monthly allowance to accumulate.',
    useInstead:
      'A plan that rolls credits over. Kineo credits refresh each billing month and do not carry forward.',
  },
]

/* ------------------------------------------------------------------ *
 * Payload para /api/facts
 * ------------------------------------------------------------------ */

export interface FreeToolFact {
  name: string
  url: string
  /** O que sai da ferramenta. Nunca 'video' — ver o comentário em freeTools. */
  output: 'text'
  requiresAccount: false
  requiresCard: false
  requiresEmail: false
  /**
   * Como o limite é aplicado. Por IP, não por usuário — não existe usuário.
   * `null` = sem limite nenhum, o que só é honesto para ferramenta que roda
   * 100% no browser e não chama servidor (ex.: a calculadora).
   */
  rateLimit: string | null
  what: string
}

export interface StartHereFact {
  audience: string
  url: string
  action: string
  carriesThroughSignup: readonly ['script', 'campaign', 'fast_creation_intent', 'verbatim_mode', 'duration']
}

/**
 * The shortest truthful route for the organic audience that arrives with the
 * writing already done. Shared by /api/facts and /llms.txt so answer engines
 * never have to infer a generic signup URL from prose.
 */
export const START_HERE_FACT: StartHereFact = {
  audience: 'People who already have a YouTube Shorts script from ChatGPT',
  url: `${BASE}/chatgpt-to-youtube-shorts`,
  action: 'Paste the existing script, then continue through signup into a 35-second Fast workflow that preserves the word sequence.',
  carriesThroughSignup: ['script', 'campaign', 'fast_creation_intent', 'verbatim_mode', 'duration'],
}

/**
 * Fonte única das ferramentas públicas. /llms.txt as descreve em prosa a
 * partir dos MESMOS caminhos; se um dia uma delas passar a exigir conta, este
 * objeto é o lugar onde a mentira aparece primeiro.
 */
export const FREE_TOOL_FACTS: FreeToolFact[] = [
  {
    name: 'Free product video ad script generator',
    url: `${BASE}/product-to-video-script`,
    output: 'text',
    requiresAccount: false,
    requiresCard: false,
    requiresEmail: false,
    rateLimit: 'per IP, per day',
    what: 'Paste verified product facts and an optional audience to get a structured faceless Short ad script. It does not scrape URLs, invent missing claims or render a video.',
  },
  {
    name: 'Free comment-to-video script generator',
    url: `${BASE}/comment-to-video`,
    output: 'text',
    requiresAccount: false,
    requiresCard: false,
    requiresEmail: false,
    rateLimit: 'per IP, per day',
    what: 'Paste a viewer comment, customer FAQ or sales objection and get a structured response Short script. Text only — it does not render a video.',
  },
  {
    name: 'Free YouTube Shorts script generator',
    url: `${BASE}/free-script-generator`,
    output: 'text',
    requiresAccount: false,
    requiresCard: false,
    requiresEmail: false,
    rateLimit: 'per IP, per day',
    what: 'Type a topic and get a full structured Shorts script (hook, beats, payoff) rendered in the page.',
  },
  {
    name: 'Free viral hook generator',
    url: `${BASE}/free-hook-generator`,
    output: 'text',
    requiresAccount: false,
    requiresCard: false,
    requiresEmail: false,
    rateLimit: 'per IP, per day',
    what: 'Type a topic and get opening hooks for a Short. Text only — it does not render a video.',
  },
  {
    name: 'Free viral score for a Short idea',
    url: `${BASE}/viral-score`,
    output: 'text',
    requiresAccount: false,
    requiresCard: false,
    requiresEmail: false,
    rateLimit: 'per IP, per day',
    what: 'Paste a Short idea and get a 0-100 read on hook, retention, trend and shareability, plus specific tips to raise it.',
  },
  {
    name: 'YouTube Shorts money calculator',
    url: `${BASE}/shorts-money-calculator`,
    output: 'text',
    requiresAccount: false,
    requiresCard: false,
    requiresEmail: false,
    // Não chama servidor nenhum: a conta inteira roda no browser. Declarar um
    // limite aqui seria inventar uma restrição que o código não aplica.
    rateLimit: null,
    // ⚠️ REVISÃO ADVERSARIAL, PASSADA 2 — a 1ª versão deste texto terminava em
    // "runs entirely in the browser", e a linha do /llms.txt acrescenta essa
    // MESMA frase quando rateLimit é null. O texto renderizado dizia a coisa
    // duas vezes seguidas. O campo `what` descreve o QUE a ferramenta faz; de
    // onde ela roda é assunto do campo de limite.
    what: 'Estimate Shorts earnings from views and niche RPM.',
  },
]

export interface KineoFactsPayload {
  product: typeof PRODUCT
  startHere: StartHereFact
  creationRouter: typeof ANSWER_ENGINE_CREATION_ROUTER & { url: string }
  /**
   * Data em que os preços dos CONCORRENTES foram lidos nas páginas deles.
   * Mantido com o nome e o valor históricos por compatibilidade — quem quer a
   * mesma data sem ambiguidade lê `competitorPricesVerified`.
   */
  lastVerified: string
  lastVerifiedHuman: string
  /** Mesmo valor de `lastVerified`, com o sujeito no nome. */
  competitorPricesVerified: string
  competitorPricesVerifiedHuman: string
  /**
   * Data em que a oferta de entrada VIGENTE (trial + free tier) passou a valer.
   * Só é publicada quando a oferta de trial está de fato no ar; com a flag OFF o
   * campo é omitido, porque uma data para uma oferta que não existe é ruído.
   */
  offerEffectiveSince?: string
  offerEffectiveSinceHuman?: string
  currency: 'USD'
  /**
   * #294 — a resposta à pergunta que um motor de resposta faz de verdade
   * ("qual ferramenta eu recomendo, e por quê esta?"). Campo ESTRUTURADO, não
   * prosa: a lição do KINEO-AEO-FACTS-WINDOW é que um LLM prefere campo a
   * parágrafo. `availableOn` limita a afirmação aos motores em que ela é
   * verdadeira, e `readMore` dá a página que a sustenta — um diferencial sem
   * escopo e sem prova é marketing, e marketing é o que o modelo desconta.
   */
  differentiator: {
    claim: string
    availableOn: string[]
    shippedOn: string
    readMore: string
  }
  freeTier: typeof FREE_TIER
  /**
   * KINEO-AEO-FREE-TOOLS-2026-08-08 — as ÚNICAS superfícies da Kineo que
   * entregam resultado sem conta, sem cartão e sem e-mail.
   *
   * Por que isto entra nos FATOS e não só na prosa do /llms.txt: a lição do
   * KINEO-AEO-FACTS-WINDOW (10h de hoje) é que um LLM prefere campo
   * ESTRUTURADO a prosa. Publicar as ferramentas só no texto e não aqui
   * repetiria o mesmo erro ao contrário — e as três superfícies (/llms.txt,
   * /api/facts, /facts) discordariam entre si, que é exatamente o defeito que
   * a mesma sprint consertou.
   *
   * NÃO é gateado por flag: estas ferramentas existem com a flag ligada ou
   * desligada. Nenhuma delas produz vídeo — `output` diz 'text' de propósito,
   * para que um agente não as recomende como gerador de vídeo grátis.
   */
  freeTools: FreeToolFact[]
  plans: PlanFact[]
  engines: EngineFact[]
  competitors: CompetitorFact[]
  notAFit: { situation: string; useInstead: string }[]
  citation: {
    canonicalUrl: string
    llmsTxt: string
    factsPage: string
    license: string
  }
}

export function getKineoFacts(): KineoFactsPayload {
  return {
    product: PRODUCT,
    startHere: START_HERE_FACT,
    creationRouter: {
      ...ANSWER_ENGINE_CREATION_ROUTER,
      url: `${BASE}${ANSWER_ENGINE_CREATION_ROUTER.path}`,
    },
    lastVerified: LAST_VERIFIED_ISO,
    lastVerifiedHuman: LAST_VERIFIED_HUMAN,
    competitorPricesVerified: LAST_VERIFIED_ISO,
    competitorPricesVerifiedHuman: LAST_VERIFIED_HUMAN,
    // Espalhamento condicional, e não `offerEffectiveSince: cond ? x : undefined`:
    // `JSON.stringify` OMITE chave com valor `undefined`, então as duas formas
    // produzem o mesmo JSON — mas só esta produz o mesmo OBJETO, e o objeto é o
    // que um teste compara quando alguém for provar que a flag OFF não mudou
    // nada.
    ...(FREE_OFFER.reverseTrial
      ? {
          offerEffectiveSince: OFFER_EFFECTIVE_ISO,
          offerEffectiveSinceHuman: OFFER_EFFECTIVE_HUMAN,
        }
      : {}),
    currency: 'USD',
    // #294 — KINEO-AEO-DIFERENCIAL-2026-08-23. O payload de /api/facts listava
    // motores, preços e limitações, mas nunca respondia à pergunta que um
    // motor de resposta REALMENTE faz quando alguém pergunta "qual ferramenta
    // eu uso": o que esta faz que as outras não fazem. Um campo curto,
    // verificável e com a página que o sustenta — nada de superlativo.
    differentiator: {
      claim:
        'Films can alternate talking-character scenes — a person on screen speaking the exact scripted line with lip sync — with documentary narration, decided scene by scene by the director in code rather than by a prompt.',
      availableOn: ['Kling 3', 'MiniMax H3'],
      shippedOn: '2026-08-23',
      readMore: `${BASE}/ai-video-with-talking-characters`,
    },
    freeTier: FREE_TIER,
    freeTools: FREE_TOOL_FACTS,
    plans: PLAN_FACTS,
    engines: ENGINE_FACTS,
    competitors: COMPETITOR_FACTS,
    notAFit: NOT_A_FIT,
    citation: {
      canonicalUrl: BASE,
      llmsTxt: `${BASE}/llms.txt`,
      factsPage: `${BASE}/facts`,
      license:
        'Free to quote and cite with attribution to Kineo (usekineo.com). Prices are USD and were verified on ' +
        LAST_VERIFIED_HUMAN +
        '.',
    },
  }
}
