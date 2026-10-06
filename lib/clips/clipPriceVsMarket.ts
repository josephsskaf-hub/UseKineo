// KINEO-CLIP-PRECO-MERCADO-2026-10-05 — A RÉGUA "~10% ABAIXO DO CONCORRENTE, MAS NUNCA NO PREJUÍZO" para o clipe avulso.
//
// Decisão do fundador (04/10): a Kineo passa a ter 2 produtos — 1 = CLIPES (porta de entrada), 2 = FILME NARRADO
// (premium). O clipe é o produto que o cliente COMPARA com Higgsfield/Kling/Runway na mesma aba do navegador, então o
// preço dele passa a olhar o mercado. Esta lib é PROPOSTA: só vale quando lib/clips/clipPricing.ts
// CLIP_PRECO_MERCADO_PUBLIC=true (decisão de preço público é do fundador). Desligado, nada aqui chega ao cliente.
//
// MÓDULO PURO (só `import type`, apagado na transpilação): o guardião scripts/test-clip-preco-mercado-2026-10-05.mjs o
// executa isolado. Ele NÃO importa clipPricing (evita ciclo): quem chama passa o custo da casa e o preço do crédito.
//
// A REGRA, em uma linha (por motor e duração):
//   mercado  = o MENOR US$/s entre os concorrentes que vendem o MESMO modelo na MESMA resolução, em planos da
//              "mesma prateleira" (mensalidade ≤ a do nosso Studio — ver MARKET_SHELF abaixo)
//   alvo     = floor( 90% × mercado × segundos ÷ US$/crédito do CREATOR )      ← o cliente compara no plano do meio
//   piso     = ceil( custo fal ÷ ( US$/crédito do STUDIO × (1 − 40%) ) )       ← margem medida no crédito MAIS BARATO
//   preço    = alvo, se alvo ≥ piso; senão piso com o rótulo "IMPOSSÍVEL A −10%" (não acompanhamos o prejuízo)
//   + o mínimo da casa (CLIP_MIN_CREDITS = 5, o preço do Modo Clipe do Studio): se ele subir o preço acima do alvo, o
//     rótulo diz "PISO DA CASA" — o −10% não vale ali, e isso fica escrito na tela de decisão do fundador.
//   Sem concorrente conhecido para o motor (ou só em resolução/modelo diferentes): mantém a regra de 29/09.
//
// POR QUE floor NO ALVO E ceil NO PISO: o alvo é uma promessa ("abaixo do concorrente") — arredondar para cima quebraria a
// promessa por meio crédito; o piso é uma trava de margem — arredondar para baixo deixaria a casa abaixo dos 40%.
//
// POR QUE O CREATOR NO ALVO E O STUDIO NO PISO: o Creator (US$ 29,90 / 150 cr) é o plano que a página de preços destaca e
// o "≈ US$" da tabela pública sai dele; o Studio (US$ 54,90 / 300 cr) é o crédito mais barato que a casa vende — se a
// margem de 40% fecha nele, fecha em todo plano e na barra (mesma escolha de clipPricing.ts, documentada lá).
//
// CUSTO DA FAL: a régua usa o MAIOR entre o número da casa (clipPricing CLIP_COSTS, 29/09) e o conferido em 05/10
// (ENGINE_FAL_CHECK abaixo). Divergência conhecida: Seedance 2.5 a 480p — a fal publica "≈ US$ 0,2205/s" (token, aprox.),
// a casa usa 0,208; o piso usa 0,2205 (conservador). O preço de HOJE (regra de 29/09) não muda por causa disso.
//
// FONTES (todas lidas em 05/10/2026 pela ferramenta de busca — os sites oficiais estão bloqueados pelo proxy da máquina,
// então "oficial" = trecho da página oficial devolvido por busca restrita ao domínio; a página em si não foi aberta).
// Cada linha de MARKET_QUOTES carrega a URL e se a fonte é oficial ou secundária. O que não foi achado é DESCONHECIDO
// (MARKET_UNKNOWN) — nunca inventado.
//
// KINEO-S25-CLIPES-2026-10-06 — Seedance 2.5 reconferido em 06/10 com as páginas oficiais ABERTAS (WebFetch): fal
// (bytedance/seedance-2.5, llms.txt), Runway (academy + runway.com/pricing), Higgsfield (2 posts do blog), Pika (pricing).
// Entraram Higgsfield Plus a 480p/720p/1080p, Pika a 720p e Runway Pro a 720p/1080p (MARKET_CHECKED_ON_S25). Achado que
// muda a leitura: a 480p o mais barato oficial passou a ser a Higgsfield Plus (3 cr/s = US$ 0,147/s), ABAIXO do custo da
// fal (~US$ 0,22/s) — a régua segue "IMPOSSÍVEL A −10%" e o preço do clipe do 2.5 é o decidido pelo fundador (clipPricing).
import type { ClipEngineKey } from './clipCatalog'

export const MARKET_CHECKED_ON = '2026-10-05'
/** KINEO-S25-CLIPES-2026-10-06 — data das cotações do Seedance 2.5 reconferidas nas páginas oficiais abertas. */
export const MARKET_CHECKED_ON_S25 = '2026-10-06'
/** "~10% abaixo do concorrente" (fundador, 04/10). */
export const MARKET_DISCOUNT = 0.1
/** Margem mínima sobre o custo da fal no crédito do Studio (fundador, 04/10: "nunca no prejuízo"; o piso pedido é 40%). */
export const MARKET_MARGIN_FLOOR = 0.4
export const MARKET_IMPOSSIBLE_LABEL = 'IMPOSSÍVEL A −10%'
export const MARKET_HOUSE_MIN_LABEL = 'PISO DA CASA'

export type MarketSourceKind = 'oficial' | 'secundaria'
// 'included' (KINEO-S25-CLIPES-2026-10-06) = o modelo gera o áudio na mesma passada e o FORNECEDOR cobra o mesmo com ou sem
// ele (Seedance 2.5 na fal: "The cost of video generation is the same regardless of whether audio is generated or not") —
// a comparação com o nosso clipe mudo é justa. Preço com áudio COBRADO À PARTE continua proibido.
export type MarketAudio = 'off' | 'unknown' | 'included'
export type MarketModel =
  | 'kling-3.0'
  | 'kling-2.5-turbo'
  | 'seedance-1.5-pro'
  | 'veo-3.1-fast'
  | 'minimax-h3'
  | 'gemini-omni-flash'
  | 'seedance-2.5'

export interface MarketPlan {
  competitor: 'Higgsfield' | 'Kling' | 'Runway' | 'Hailuo' | 'Pika'
  plan: string
  /** Mensalidade em centavos de US$ (cobrança mensal; o anual mais barato fica fora — ver nota no relatório). */
  usdCentsMonthly: number
  creditsMonthly: number
  source: MarketSourceKind
  url: string
  note?: string
}

export interface MarketQuote {
  id: string
  plan: MarketPlan
  model: MarketModel
  resolution: string
  /** 'off' = sem áudio confirmado; 'unknown' = a fonte não diz (nunca usamos preço COM áudio contra clipe mudo). */
  audio: MarketAudio
  creditsPerSecond: number
  source: MarketSourceKind
  url: string
  checkedOn: string
  note?: string
}

// ─── Planos (mensalidade e créditos) ─────────────────────────────────────────
const HF_PLANS_URL = 'https://higgsfield.ai/blog/credits-vs-unlimited-ai-video-generation'
const KLING_PLANS_URL = 'https://app.klingai.com/global/membership/membership-plan'
const KLING_PLANS_NOTE = 'Trecho oficial: 1º mês promocional (US$ 6,99 / 25,99 / 64,99 / 127,99) e depois US$ 8,8 / 32,56 / 80,96 / 159,99; usamos o valor de renovação. Guias de terceiros (eesel.ai/blog/kling-ai-pricing) listam US$ 10 / 37 / 92 / 180 — divergente.'
const RUNWAY_STANDARD_URL = 'https://help.runwayml.com/hc/en-us/articles/49191105352339-Standard-plan-details'
const RUNWAY_PRO_URL = 'https://help.runwayml.com/hc/en-us/articles/52070807060755-Pro-plan-details'

export const MARKET_PLANS = {
  hfStarter: { competitor: 'Higgsfield', plan: 'Starter', usdCentsMonthly: 1500, creditsMonthly: 200, source: 'oficial', url: HF_PLANS_URL },
  hfPlus: { competitor: 'Higgsfield', plan: 'Plus', usdCentsMonthly: 4900, creditsMonthly: 1000, source: 'oficial', url: HF_PLANS_URL },
  hfUltra: { competitor: 'Higgsfield', plan: 'Ultra', usdCentsMonthly: 12900, creditsMonthly: 3000, source: 'oficial', url: HF_PLANS_URL },
  klingStandard: { competitor: 'Kling', plan: 'Standard', usdCentsMonthly: 880, creditsMonthly: 660, source: 'oficial', url: KLING_PLANS_URL, note: KLING_PLANS_NOTE },
  klingPro: { competitor: 'Kling', plan: 'Pro', usdCentsMonthly: 3256, creditsMonthly: 3000, source: 'oficial', url: KLING_PLANS_URL, note: KLING_PLANS_NOTE },
  klingPremier: { competitor: 'Kling', plan: 'Premier', usdCentsMonthly: 8096, creditsMonthly: 8000, source: 'oficial', url: KLING_PLANS_URL, note: KLING_PLANS_NOTE },
  klingUltra: { competitor: 'Kling', plan: 'Ultra', usdCentsMonthly: 15999, creditsMonthly: 26000, source: 'oficial', url: KLING_PLANS_URL, note: KLING_PLANS_NOTE },
  runwayStandard: { competitor: 'Runway', plan: 'Standard', usdCentsMonthly: 1500, creditsMonthly: 625, source: 'oficial', url: RUNWAY_STANDARD_URL },
  runwayPro: { competitor: 'Runway', plan: 'Pro', usdCentsMonthly: 3500, creditsMonthly: 2250, source: 'oficial', url: RUNWAY_PRO_URL },
  // KINEO-S25-CLIPES-2026-10-06 — pika.art/pricing aberta em 06/10: "Starter: $10/month (900 credits)" e "Creator: $35/month
  // (3,150 credits)" na cobrança mensal (anual: US$ 8 / 28). Starter SEM licença comercial; Creator com.
  pikaStarter: { competitor: 'Pika', plan: 'Starter', usdCentsMonthly: 1000, creditsMonthly: 900, source: 'oficial', url: 'https://pika.art/pricing', note: 'Sem licença comercial (só a partir do Creator); sem marca d’água.' },
  pikaCreator: { competitor: 'Pika', plan: 'Creator', usdCentsMonthly: 3500, creditsMonthly: 3150, source: 'oficial', url: 'https://pika.art/pricing', note: 'Com licença comercial; sem marca d’água.' },
} as const satisfies Record<string, MarketPlan>

const RUNWAY_MODELS_URL = 'https://academy.runwayml.com/models-pricing'
const q = (
  id: string,
  plan: MarketPlan,
  model: MarketModel,
  resolution: string,
  audio: MarketAudio,
  creditsPerSecond: number,
  source: MarketSourceKind,
  url: string,
  note?: string,
): MarketQuote => ({ id, plan, model, resolution, audio, creditsPerSecond, source, url, checkedOn: MARKET_CHECKED_ON, ...(note ? { note } : {}) })
/** KINEO-S25-CLIPES-2026-10-06 — cotação conferida em 06/10 (páginas oficiais abertas). */
const q6 = (...args: Parameters<typeof q>): MarketQuote => ({ ...q(...args), checkedOn: MARKET_CHECKED_ON_S25 })

const P = MARKET_PLANS
const HF_K3_URL = 'https://higgsfield.ai/blog/credits-vs-unlimited-ai-video-generation'
const HF_K3_NOTE = 'Trecho oficial: "20 credits for a Kling 3.0 clip at 8 seconds 1080p" e "15 s … 37.5 credits at 1080p" (2,5 cr/s). Áudio não informado.'
const HF_SEC_URL = 'https://camclo3d.com/blog/higgsfield-pricing'
const HF_SEC_NOTE = 'Fonte secundária, não conferida na página oficial (tabela agregada de guias de terceiros: camclo3d.com, krea.ai). Diverge do trecho oficial de 2,5 cr/s.'
const KLING_K3_URL = 'https://klingai.com/blog/kling-video-3-0-credit-cost-guide'
const KLING_K25_URL = 'https://www.atlascloud.ai/blog/tips/kling-ai-pricing'
const KLING_K25_NOTE = 'Fonte secundária, não conferida na página oficial: "5-second 1080p clip at 25 credits" (anúncio do Kling 2.5 Turbo, set/2025, citado pelo guia).'
const RUNWAY_H3_URL = 'https://help.runwayml.com/hc/en-us/articles/54046029551379-Creating-with-Minimax-H3'
const HF_S25_URL = 'https://higgsfield.ai/blog/seedance-2-5-on-higgsfield-2026'
const HF_S25_NOTE = 'Post oficial (publicado em 06/08, alterado em 19/09/2026). O plano de entrada do 2.5 é o de US$ 49 (Plus, 1.000 cr: higgsfield.ai/blog/seedance-2-5-pricing-2026, "480p, 8 seconds: 24 credits"). Áudio gerado na mesma passada.'
const RUNWAY_S25_NOTE = '"ByteDance Seedance 2.5 … 480p 20/sec" (sem vídeo de entrada). Clipe de áudio e vídeo ("audio-video clips"), preço único.'
const PIKA_S25_NOTE = '"Seedance 2.5 Video · 720p · 5s" = 122 créditos — só 5 s a 720p é publicado (122 ÷ 5 = 24,4 cr/s). Áudio não informado.'

export const MARKET_QUOTES: readonly MarketQuote[] = [
  // Kling 3.0 · 1080p
  q('hf-k3-starter', P.hfStarter, 'kling-3.0', '1080p', 'unknown', 2.5, 'oficial', HF_K3_URL, HF_K3_NOTE),
  q('hf-k3-plus', P.hfPlus, 'kling-3.0', '1080p', 'unknown', 2.5, 'oficial', HF_K3_URL, HF_K3_NOTE),
  q('hf-k3-ultra', P.hfUltra, 'kling-3.0', '1080p', 'unknown', 2.5, 'oficial', HF_K3_URL, HF_K3_NOTE),
  q('hf-k3-starter-sec', P.hfStarter, 'kling-3.0', '1080p', 'unknown', 1.6, 'secundaria', HF_SEC_URL, HF_SEC_NOTE + ' "~8 credits per 5 seconds" a 1080p.'),
  q('hf-k3-plus-sec', P.hfPlus, 'kling-3.0', '1080p', 'unknown', 1.6, 'secundaria', HF_SEC_URL, HF_SEC_NOTE + ' "~8 credits per 5 seconds" a 1080p.'),
  q('hf-k3-ultra-sec', P.hfUltra, 'kling-3.0', '1080p', 'unknown', 1.6, 'secundaria', HF_SEC_URL, HF_SEC_NOTE + ' "~8 credits per 5 seconds" a 1080p.'),
  q('kling-k3-standard', P.klingStandard, 'kling-3.0', '1080p', 'off', 8, 'oficial', KLING_K3_URL, '"1080p No Native Audio: 8 Credits/s".'),
  q('kling-k3-pro', P.klingPro, 'kling-3.0', '1080p', 'off', 8, 'oficial', KLING_K3_URL, '"1080p No Native Audio: 8 Credits/s".'),
  q('kling-k3-premier', P.klingPremier, 'kling-3.0', '1080p', 'off', 8, 'oficial', KLING_K3_URL, '"1080p No Native Audio: 8 Credits/s".'),
  q('kling-k3-ultra', P.klingUltra, 'kling-3.0', '1080p', 'off', 8, 'oficial', KLING_K3_URL, '"1080p No Native Audio: 8 Credits/s".'),
  // Kling 3.0 · 720p — NÃO entra na régua do nosso Kling 3 (1080p); fica na tabela para o fundador ver o degrau de resolução.
  q('kling-k3-standard-720p', P.klingStandard, 'kling-3.0', '720p', 'off', 6, 'oficial', KLING_K3_URL, '"720p No Native Audio: 6 Credits/s".'),
  q('kling-k3-pro-720p', P.klingPro, 'kling-3.0', '720p', 'off', 6, 'oficial', KLING_K3_URL, '"720p No Native Audio: 6 Credits/s".'),
  q('runway-k3-standard', P.runwayStandard, 'kling-3.0', '1080p', 'off', 12, 'oficial', RUNWAY_MODELS_URL, '"Kling 3.0 Pro: No audio 12/sec". Resolução do Pro assumida 1080p (a página não diz no trecho).'),
  q('runway-k3-pro', P.runwayPro, 'kling-3.0', '1080p', 'off', 12, 'oficial', RUNWAY_MODELS_URL, '"Kling 3.0 Pro: No audio 12/sec". Resolução do Pro assumida 1080p (a página não diz no trecho).'),
  // Kling 2.5 Turbo · 1080p
  q('kling-k25-standard', P.klingStandard, 'kling-2.5-turbo', '1080p', 'off', 5, 'secundaria', KLING_K25_URL, KLING_K25_NOTE),
  q('kling-k25-pro', P.klingPro, 'kling-2.5-turbo', '1080p', 'off', 5, 'secundaria', KLING_K25_URL, KLING_K25_NOTE),
  q('kling-k25-premier', P.klingPremier, 'kling-2.5-turbo', '1080p', 'off', 5, 'secundaria', KLING_K25_URL, KLING_K25_NOTE),
  q('kling-k25-ultra', P.klingUltra, 'kling-2.5-turbo', '1080p', 'off', 5, 'secundaria', KLING_K25_URL, KLING_K25_NOTE),
  q('runway-k25-standard', P.runwayStandard, 'kling-2.5-turbo', '1080p', 'off', 15, 'oficial', RUNWAY_MODELS_URL, '"Kling 2.5 Turbo Pro … 720p 12/sec and 1080p 15/sec".'),
  q('runway-k25-pro', P.runwayPro, 'kling-2.5-turbo', '1080p', 'off', 15, 'oficial', RUNWAY_MODELS_URL, '"Kling 2.5 Turbo Pro … 720p 12/sec and 1080p 15/sec".'),
  // Veo 3.1 Fast · 1080p
  q('hf-veo-fast-starter-sec', P.hfStarter, 'veo-3.1-fast', '1080p', 'unknown', 4, 'secundaria', HF_SEC_URL, HF_SEC_NOTE + ' "Veo 3.1 Fast (720p or 1080p): ~16 credits per 4 seconds".'),
  q('hf-veo-fast-plus-sec', P.hfPlus, 'veo-3.1-fast', '1080p', 'unknown', 4, 'secundaria', HF_SEC_URL, HF_SEC_NOTE + ' "Veo 3.1 Fast (720p or 1080p): ~16 credits per 4 seconds".'),
  q('hf-veo-fast-ultra-sec', P.hfUltra, 'veo-3.1-fast', '1080p', 'unknown', 4, 'secundaria', HF_SEC_URL, HF_SEC_NOTE + ' "Veo 3.1 Fast (720p or 1080p): ~16 credits per 4 seconds".'),
  // MiniMax H3 · 768p
  q('runway-h3-standard', P.runwayStandard, 'minimax-h3', '768p', 'unknown', 10, 'oficial', RUNWAY_H3_URL, '"768p — 10 credits per second of output video".'),
  q('runway-h3-pro', P.runwayPro, 'minimax-h3', '768p', 'unknown', 10, 'oficial', RUNWAY_H3_URL, '"768p — 10 credits per second of output video".'),
  // Seedance 2.5 · 480p
  q('runway-s25-standard', P.runwayStandard, 'seedance-2.5', '480p', 'included', 20, 'oficial', RUNWAY_MODELS_URL, RUNWAY_S25_NOTE + ' 06/10: acesso do Standard ao 2.5 NÃO confirmado — runway.com/pricing lista o Seedance 2.5 só nos planos Pro e Max.'),
  q('runway-s25-pro', P.runwayPro, 'seedance-2.5', '480p', 'included', 20, 'oficial', RUNWAY_MODELS_URL, RUNWAY_S25_NOTE + ' 06/10: runway.com/pricing lista o Seedance 2.5 no Pro (US$ 35, 2.250 cr).'),
  // KINEO-S25-CLIPES-2026-10-06 — reconferido em 06/10 nas páginas oficiais abertas. A 480p, a Higgsfield Plus vira a mais
  // barata (US$ 0,147/s, abaixo do custo da fal); 720p/1080p ficam na tabela para o fundador ver o degrau de resolução.
  q6('hf-s25-plus', P.hfPlus, 'seedance-2.5', '480p', 'included', 3, 'oficial', HF_S25_URL, HF_S25_NOTE + ' "10 seconds, 480p | 30 credits ($1,50)".'),
  q6('hf-s25-plus-720p', P.hfPlus, 'seedance-2.5', '720p', 'included', 7, 'oficial', HF_S25_URL, HF_S25_NOTE + ' "10 seconds, 720p | 70 credits ($3,50)" (o post de 28/08 dava 52 cr / 8 s).'),
  q6('hf-s25-plus-1080p', P.hfPlus, 'seedance-2.5', '1080p', 'included', 12, 'oficial', HF_S25_URL, HF_S25_NOTE + ' "10 seconds, 1080p | 120 credits ($6,00)" (o post de 15/09 dava 72 cr / 8 s — divergente).'),
  q6('runway-s25-pro-720p', P.runwayPro, 'seedance-2.5', '720p', 'included', 30, 'oficial', RUNWAY_MODELS_URL, '"720p: 30/sec" (+15/s de vídeo de entrada, que o clipe não usa).'),
  q6('runway-s25-pro-1080p', P.runwayPro, 'seedance-2.5', '1080p', 'included', 68, 'oficial', RUNWAY_MODELS_URL, '"1080p: 68/sec" (+34/s de vídeo de entrada, que o clipe não usa).'),
  q6('pika-s25-starter-720p', P.pikaStarter, 'seedance-2.5', '720p', 'unknown', 24.4, 'oficial', 'https://pika.art/pricing', PIKA_S25_NOTE + ' Starter: 900 cr = 7 vídeos.'),
  q6('pika-s25-creator-720p', P.pikaCreator, 'seedance-2.5', '720p', 'unknown', 24.4, 'oficial', 'https://pika.art/pricing', PIKA_S25_NOTE + ' Creator: 3.150 cr = 25 vídeos.'),
]

/** O que foi procurado em 05/10 e NÃO foi achado com número confiável (fica de fora da régua, nunca inventado). */
export const MARKET_UNKNOWN: readonly string[] = [
  'Higgsfield — Kling 2.5 Turbo, Seedance 1.5 Pro, MiniMax H3 e Omni Flash: créditos por segundo DESCONHECIDOS.',
  // KINEO-S25-CLIPES-2026-10-06 — a linha de 05/10 ("Higgsfield — Seedance 2.5 só aparece a 1080p; a 480p é DESCONHECIDO")
  // caiu: o post oficial de 19/09 dá 480p/720p/1080p (cotações hf-s25-plus*). Fica só a divergência do 1080p.
  'Higgsfield — Seedance 2.5 a 1080p: os posts oficiais divergem (72 cr / 8 s em 15/09; 120 cr / 10 s em 19/09); número estável DESCONHECIDO (a régua compara 480p).',
  'Kling (site oficial) — só vende modelos Kling; o crédito do Kling 2.5 Turbo no app ficou DESCONHECIDO na página oficial (usamos fonte secundária, marcada).',
  'Runway — Seedance 1.5 Pro e Veo 3.1 Fast no app: DESCONHECIDO (o Veo 3.1 Fast de 10 cr/s é da API, a US$ 0,01/cr).',
  'Hailuo (hailuoai.video) — planos Standard US$ 14,99/1.000 cr, Pro US$ 54,99/4.500, Master US$ 119,99/10.000 (oficial, hailuoai.video/doc/payment-policy.html); o H3 a 768p no app é DESCONHECIDO ("768p later rollout"). A API da MiniMax cobra US$ 0,08/s a 768p (platform.minimax.io/docs/guides/pricing-video) — preço de API, fora da régua.',
  // KINEO-S25-CLIPES-2026-10-06 — corrigido: a Pika VENDE o Seedance 2.5 (pika.art/pricing aberta em 06/10).
  'Pika — vende o Seedance 2.5 só a 720p (122 cr / 5 s; Starter US$ 10 / 900 cr, Creator US$ 35 / 3.150 cr — cotações pika-s25-*); o 2.5 a 480p (a nossa resolução) é DESCONHECIDO — fica fora da régua. Os outros 6 motores da casa: não vende.',
  'Magnific (ex-Freepik) — vende o Seedance 2.5 (magnific.com/pricing, 06/10: "Seedance 2.5 Draft 480p" = 800 cr / 4 s; 1080p = 4.400 cr / 4 s), mas o preço MENSAL em US$ é DESCONHECIDO (a página mostrou reais; em US$ só o anual: Premium US$ 14,50/mês) — fora da régua, que usa cobrança mensal.',
  'Dreamina (ByteDance) — "$0.035" por segundo a 720p é PROMOÇÃO do 1º mês (23/09–09/10/2026) e "$0.047" é o Super ANUAL (dreamina.capcut.com/seedance/seedance-2-5-pricing-2026); o preço recorrente sem promoção é DESCONHECIDO — fora da régua.',
  'OpenArt, Pollo AI e Krea — vendem o Seedance 2.5, mas o custo em créditos é DESCONHECIDO (não publicado nas páginas de preço; a Pollo bloqueou a leitura em 06/10).',
  'Omni Flash (Gemini Omni Flash) e Seedance 1.5 Pro: nenhum concorrente com preço achado — mantêm a regra de 29/09.',
]

// ─── O que o NOSSO clipe entrega (modelo + resolução) e o custo da fal conferido em 05/10 ────────────────────────
export interface EngineMarketMatch {
  model: MarketModel
  /** Resolução que lib/clips/clipCatalog.ts buildClipFalInput pede (ou a nativa do modelo, quando não há chave). */
  resolution: string
  falUsdPerSecond: number
  falStatus: 'conferido' | 'aproximado'
  falUrl: string
  falNote: string
}

export const ENGINE_MARKET: Record<ClipEngineKey, EngineMarketMatch> = {
  hollywood: { model: 'kling-3.0', resolution: '1080p', falUsdPerSecond: 0.112, falStatus: 'conferido', falUrl: 'https://fal.ai/models/fal-ai/kling-video/v3/pro/text-to-video', falNote: '"$0.112 (audio off)" por segundo.' },
  kling: { model: 'kling-2.5-turbo', resolution: '1080p', falUsdPerSecond: 0.07, falStatus: 'conferido', falUrl: 'https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/text-to-video', falNote: '"For a 5-second video your request will cost $0.35 … additional second $0.07".' },
  seedance: { model: 'seedance-1.5-pro', resolution: '720p', falUsdPerSecond: 0.026, falStatus: 'conferido', falUrl: 'https://fal.ai/models/fal-ai/bytedance/seedance/v1.5/pro/text-to-video', falNote: '"$1.2 per million tokens without audio"; 720×1280×24×5/1024 = 108.000 tokens = US$ 0,13 / 5 s.' },
  veo: { model: 'veo-3.1-fast', resolution: '1080p', falUsdPerSecond: 0.1, falStatus: 'conferido', falUrl: 'https://fal.ai/models/fal-ai/veo3.1/fast', falNote: '"$0.10 without audio … for 720p or 1080p".' },
  h3: { model: 'minimax-h3', resolution: '768p', falUsdPerSecond: 0.06, falStatus: 'conferido', falUrl: 'https://fal.ai/models/minimax/h3/text-to-video', falNote: '"$0.06 per second at 768p".' },
  omni: { model: 'gemini-omni-flash', resolution: '720p', falUsdPerSecond: 0.13, falStatus: 'aproximado', falUrl: 'https://fal.ai/models/google/gemini-omni-flash/image-to-video', falNote: '"approximately $0.13 per second" a 720p (cobrança por token).' },
  // KINEO-S25-CLIPES-2026-10-06 — reconferido no llms.txt oficial: US$ 0,0214 por 1.000 tokens a 480p e 720p (~0,0234 a 1080p),
  // tokens = altura × largura × segundos × 24 ÷ 1.024 → ~US$ 0,215/s a 9:16 480p (496×864, a do exemplo 16:9 da fal girado) e
  // "roughly $0.2205 per second" no texto da fal; preço igual com ou sem áudio. O endpoint da casa (fal-ai/seedance-2.5, o
  // do filme) é o de acesso antecipado, sem preço público: o número da fatura manda.
  s25: { model: 'seedance-2.5', resolution: '480p', falUsdPerSecond: 0.2205, falStatus: 'aproximado', falUrl: 'https://fal.ai/models/bytedance/seedance-2.5/text-to-video/llms.txt', falNote: '"$0.0214 per 1000 tokens for 480p and 720p" e "roughly $0.2205 per second" a 480p (06/10); a casa usa 0,208 (lib/hollywood/router.ts) — a régua usa o maior.' },
}

// ─── A régua ─────────────────────────────────────────────────────────────────
/** US$ por segundo de uma cotação, no preço por crédito do plano dela. */
export function quoteUsdPerSecond(quote: MarketQuote): number {
  return (quote.plan.usdCentsMonthly / 100 / quote.plan.creditsMonthly) * quote.creditsPerSecond
}

/**
 * Cotações do MESMO modelo e da MESMA resolução que o nosso clipe entrega, em planos até `shelfMaxUsdCents` por mês
 * (a "mesma prateleira": quem paga US$ 29,90 no nosso Creator compara com o plano de US$ 30–50 do vizinho, não com o
 * Ultra de US$ 160). `shelfMaxUsdCents = Infinity` devolve todas (o relatório mostra as duas leituras).
 */
export function marketQuotesFor(engine: ClipEngineKey, shelfMaxUsdCents: number): MarketQuote[] {
  const match = ENGINE_MARKET[engine]
  return MARKET_QUOTES.filter(
    (quote) => quote.model === match.model && quote.resolution === match.resolution && quote.plan.usdCentsMonthly <= shelfMaxUsdCents,
  )
}

export function cheapestMarketQuote(engine: ClipEngineKey, shelfMaxUsdCents: number): MarketQuote | null {
  let best: MarketQuote | null = null
  for (const quote of marketQuotesFor(engine, shelfMaxUsdCents)) {
    if (!best || quoteUsdPerSecond(quote) < quoteUsdPerSecond(best)) best = quote
  }
  return best
}

export type MarketDecisionStatus = 'abaixo_do_mercado' | 'impossivel' | 'piso_da_casa' | 'sem_concorrente'

export interface MarketPricingContext {
  /** Custo fal por segundo que a casa usa hoje (clipPricing CLIP_COSTS). A régua usa o maior entre ele e o conferido. */
  houseFalUsdPerSecond: number
  /** US$/crédito do Studio (o crédito mais barato da casa) — base do piso de margem. */
  floorUsdPerCredit: number
  /** US$/crédito do Creator — base da comparação com o mercado. */
  refUsdPerCredit: number
  /** Mensalidade máxima (centavos) dos planos concorrentes que entram na comparação. */
  shelfMaxUsdCents: number
  /** Mínimo da casa por clipe (CLIP_MIN_CREDITS). */
  minCredits: number
  /** Preço pela regra de 29/09 — vale quando não há concorrente. */
  fallbackCredits: number
}

export interface MarketDecision {
  engine: ClipEngineKey
  seconds: number
  credits: number
  status: MarketDecisionStatus
  label: string
  cheapest: MarketQuote | null
  marketUsdPerSecond: number | null
  /** 90% do mercado, em US$, para a duração. */
  targetUsd: number | null
  marketCredits: number | null
  floorCredits: number
  falUsd: number
}

const round = (value: number, places: number): number => Math.round(value * 10 ** places) / 10 ** places

export function decideMarketClipPrice(engine: ClipEngineKey, seconds: number, ctx: MarketPricingContext): MarketDecision {
  if (!Number.isInteger(seconds) || seconds <= 0) throw new Error('decideMarketClipPrice: seconds must be a positive integer')
  const falPerSecond = Math.max(ctx.houseFalUsdPerSecond, ENGINE_MARKET[engine].falUsdPerSecond)
  const falUsd = round(falPerSecond * seconds, 4)
  const floorCredits = Math.ceil(round(falUsd / (ctx.floorUsdPerCredit * (1 - MARKET_MARGIN_FLOOR)), 6))
  const cheapest = cheapestMarketQuote(engine, ctx.shelfMaxUsdCents)
  if (!cheapest) {
    return {
      engine, seconds, credits: ctx.fallbackCredits, status: 'sem_concorrente', label: 'sem concorrente conhecido — regra de 29/09',
      cheapest: null, marketUsdPerSecond: null, targetUsd: null, marketCredits: null, floorCredits, falUsd,
    }
  }
  const marketUsdPerSecond = quoteUsdPerSecond(cheapest)
  const targetUsd = round((1 - MARKET_DISCOUNT) * marketUsdPerSecond * seconds, 6)
  const marketCredits = Math.floor(round(targetUsd / ctx.refUsdPerCredit, 6))
  const base = { engine, seconds, cheapest, marketUsdPerSecond, targetUsd, marketCredits, floorCredits, falUsd }
  if (marketCredits < floorCredits) {
    return { ...base, credits: Math.max(floorCredits, ctx.minCredits), status: 'impossivel', label: MARKET_IMPOSSIBLE_LABEL }
  }
  if (marketCredits < ctx.minCredits) {
    return { ...base, credits: ctx.minCredits, status: 'piso_da_casa', label: `${MARKET_HOUSE_MIN_LABEL} (${ctx.minCredits} cr)` }
  }
  const who = `${cheapest.plan.competitor} ${cheapest.plan.plan}`
  return { ...base, credits: marketCredits, status: 'abaixo_do_mercado', label: `−10% vs ${who}` }
}
