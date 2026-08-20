// lib/freeTierOffer.ts — [KINEO-TRIAL-SWAP-2026-08-07] — TROCA ATÔMICA do
// free tier + copy, decidida por UMA flag.
//
//   KINEO_REVERSE_TRIAL_ENABLED === 'true'  (a MESMA flag de lib/reverseTrial.ts)
//
// ── O QUE ESTE ARQUIVO É ────────────────────────────────────────────────────
// A verdade única sobre "o que o plano free oferece", nas DUAS versões:
//
//   FLAG OFF (produção hoje): 3 Fast watermarked por janela rolante de 24h.
//   FLAG ON  (reverse trial): todo signup novo ganha trial Creator (40 créditos,
//     tudo exceto Studio — ver lib/reverseTrial.ts); o free tier residual
//     pós-trial vira 1 Fast/mês (janela rolante de 30 dias), 15s máx,
//     watermarked. (480p ficou PENDENTE — o pipeline Creatomate não tem knob de
//     resolução hoje; ver docs/SPRINT do dia.)
//
// COMPORTAMENTO e COPY leem o MESMO objeto: não existe estado em que o
// enforcement mudou e a promessa não (nem o contrário).
//
// ── COMO USAR ───────────────────────────────────────────────────────────────
// Server (páginas, API routes, crons, lib server-side):
//     const OFFER = getFreeTierOffer()
// Client components: NUNCA chamar getFreeTierOffer() — process.env desta flag
// não existe no bundle do browser e o resultado seria SEMPRE a versão OFF
// (copy velha com a flag ligada, o bug exato que esta troca proíbe). Usar:
//     const OFFER = useFreeTierOffer()   // components/FreeTierOfferProvider.tsx
// O provider é montado no app/layout.tsx (server) com o valor já resolvido.
//
// Para as ~90 frases de marketing de cauda longa (FAQ, comparações, e-mails),
// o call site mantém o literal ATUAL e troca pela versão nova via:
//     ft(OFFER, 'literal atual…', OFFER.copy.sentence)
// Com a flag OFF isso devolve o literal byte a byte — diff de runtime zero por
// construção, auditável no próprio call site. Com a flag ON, devolve a copy
// nova, que mora TODA aqui (campos de `copy`), nunca no call site.
//
// ── SSG / CACHE (decisão registrada) ────────────────────────────────────────
// As páginas de marketing são estáticas (SSG). Na Vercel, mudar uma env var só
// tem efeito com REDEPLOY — e o redeploy reconstrói todas as páginas estáticas
// e invalida o cache do deployment inteiro. Logo build-time e runtime leem o
// MESMO valor por deployment e a troca é atômica por deploy. Por isso NÃO
// adicionamos `dynamic`/`revalidate` (que sacrificariam o SSG das ~28 páginas
// de SEO à toa). Procedimento de virada: setar a env na Vercel E redeployar —
// nunca considerar a flag "ligada" antes do deploy novo estar servindo.

export interface FreeTierCopy {
  /** Frase-âncora aprovada pelo fundador (superfícies de destaque/CTA). */
  headline: string
  /** Free tier residual, forma curta. */
  residual: string
  /** Frase completa canônica para copy corrida (FAQ, parágrafos, e-mails). */
  sentence: string
  /** Chip/badge curto (linhas "· No card · Starter…"). */
  chip: string
  /** Chip em minúsculas (uso no meio de linha). */
  chipLower: string
  /** Descrição do card "Free" no pricing. */
  planCardBody: string
  /** Rótulo da janela para contadores ("today" / "this month"). */
  counterNoun: string
  /** Linha de limite exibida em modais/paywalls ("3 Fast previews every 24h"). */
  planLimitLine: string
  /** Mensagem 402 do enforcement no /api/compose. */
  limitHitError: string
  /** Frase autocontida para as páginas de comparação (lib/comparisons.ts). */
  cmpKineoFree: string
  /** Assunto do e-mail de cap atingido (cron send-cap-hit). */
  limitHitEmailSubject: string
  /** Primeiro parágrafo do e-mail de cap (texto puro). */
  limitHitEmailIntro: string
  /** Primeiro parágrafo do e-mail de cap (com markup <strong>). */
  limitHitEmailIntroHtml: string
  /** Linha "espere a cota voltar" dos e-mails de cap. */
  limitResetLine: string
  /**
   * KINEO-SEO-CTA-TRIAL-2026-08-07 — rótulo do BOTÃO primário das páginas de
   * aquisição. Entrou aqui porque a troca atômica cobriu meta, chip e FAQ e
   * deixou de fora justamente a string com maior taxa de leitura da página: o
   * botão. A dobra prometia "Free Creator trial — 50 credits" e o botão logo
   * abaixo vendia o free tier ANTIGO ("Make a Fast video free"), que com a flag
   * ON nem existe mais (1 Fast/mês). Quem lê só o botão — a maioria — recebia
   * a oferta fraca.
   */
  ctaPrimary: string
  /** Título do bloco de CTA (h2) das mesmas páginas. Mesmo motivo. */
  ctaHeading: string
}

export interface FreeTierOffer {
  /** true = reverse trial ligado (free tier novo + copy nova). */
  reverseTrial: boolean
  /** Vídeos Fast grátis por janela. */
  limit: number
  /** Janela rolante do limite, em ms. */
  windowMs: number
  /** Duração máxima (s) de um Fast grátis; null = sem clamp extra. */
  maxFreeFastSeconds: number | null
  copy: FreeTierCopy
}

// OFF = o comportamento e a copy de HOJE, byte a byte onde compartilhado.
const OFF_COPY: FreeTierCopy = {
  headline: 'Create up to 3 watermarked Fast videos every 24 hours — no card.',
  residual: '3 free Shorts every 24h',
  sentence:
    'A new account can create, watch, download and share up to 3 watermarked Fast videos every 24 hours with no card.',
  chip: 'Up to 3 watermarked Fast videos / 24h',
  chipLower: 'up to 3 watermarked Fast videos / 24h',
  planCardBody:
    'Create, watch, download and share up to 3 watermarked Fast videos every 24h, no card. Free access grants no credits or premium AI Generated videos.',
  counterNoun: 'today',
  planLimitLine: 'Fast previews every 24h',
  limitHitError:
    "You've hit today's free limit (3 Fast previews). Keep creating with Starter — same price worldwide. Cancel anytime.",
  cmpKineoFree: 'Kineo free: up to 3 watermarked Fast videos every 24 hours, no card.',
  limitHitEmailSubject: "You hit today's free limit — Starter removes the wall",
  limitHitEmailIntro:
    "You've used up today's free Fast previews — the cap is 3 every 24 hours.",
  limitHitEmailIntroHtml:
    "You've used up <strong>today's free Fast previews</strong> — the cap is 3 every 24 hours.",
  limitResetLine:
    'Or wait for the reset — free previews come back every 24 hours, and your videos stay in your library either way.',
  // Literais atuais das paginas, byte a byte (diff zero com a flag OFF).
  ctaPrimary: 'Make a Fast video free →',
  ctaHeading: 'Make a faceless Fast video free',
}

// KINEO-GRANT-COPY-UNICA-2026-08-17 — O NÚMERO DO GRANT AGORA TEM UMA FONTE SÓ.
//
// A aprovação de HOJE (40 → 50, "se só muda 1 dólar, pode mudar pra 50") mexeu
// em `TRIAL_CREDIT_CAP` e na maior parte da copy, mas o número estava digitado
// à mão em 9 frases deste arquivo e em 3 call sites. Duas delas ficaram para
// trás — e uma era o BOTÃO PRIMÁRIO ("Start free — 40 Creator credits →"),
// logo abaixo de uma dobra que dizia 50. A pessoa lia dois números na mesma
// tela e o menor estava no botão.
//
// Por que a constante mora AQUI e não é importada de lib/reverseTrial.ts:
// este arquivo é FOLHA de propósito (o cabeçalho de reverseTrial.ts registra
// "lib/freeTierOffer.ts não importa nada — sem ciclo") e entra no bundle do
// browser via `swapFreeTierCopy`. Importar reverseTrial.ts aqui arrastaria
// `@supabase/supabase-js` para o cliente e fecharia um ciclo.
// A trava fica na direção que já existe: reverseTrial.ts (que JÁ importa este
// arquivo) carrega uma asserção de tipo que quebra o `tsc` se os dois números
// divergirem. Mexer no teto sem mexer na copy passa a não compilar.
export const TRIAL_GRANT_CREDITS_COPY = 80 // KINEO-TRIAL-80-2026-08-20 — espelho de TRIAL_CREDIT_CAP (a trava de tipo em reverseTrial.ts quebra o build se divergirem)

// ON = decisão do fundador (docs/ORDENS-AQUISICAO-2026-08-02.md, bloco
// "DECISÕES FINAIS — REVERSE TRIAL"). NUNCA mencionar desconto/50% aqui:
// o 50% é exclusivo dos e-mails D5/D10 pós-trial, jamais superfície pública.
const G = TRIAL_GRANT_CREDITS_COPY
// KINEO-TRIAL-FILMES-2026-08-20 — "80 credits" não significa nada para quem
// acabou de chegar; "4 AI films" significa tudo. É a mesma regra que a página
// de preços já segue (fala em filmes, não em créditos) e agora vale também na
// porta de entrada — que é onde a pessoa decide se vale a pena criar a conta.
// Derivado do grant ÷ custo do Seedance (o motor mais caro que o trial abre),
// nunca digitado: se o grant mudar, o número de filmes acompanha sozinho.
export const TRIAL_FILMS = Math.floor(TRIAL_GRANT_CREDITS_COPY / 20)

// ⚠️ KINEO-TETO-COPY-2026-08-20 — A COPY DO MODELO NOVO (leia antes de mexer)
// O modelo mudou DUAS VEZES em 20/08 e a segunda desfez a primeira. Registro
// as duas para ninguém refazer o caminho:
//   1ª: trial pago de $1 com cartão obrigatório. Morreu no mesmo dia, quando
//       o estudo dos 5 concorrentes mostrou que NENHUM cobra entrada e que só
//       5% de 65 ferramentas do segmento pedem cartão — três delas usam "no
//       credit card required" como frase de venda.
//   2ª (a que vale): modelo do OpusClip adaptado. Sem cartão, sem taxa. O
//       trial abre TODOS os motores — inclusive os caros, que é onde ganhamos
//       deles — e o vídeo sai COM MARCA D'ÁGUA. O download limpo é o paywall.
// A frase-chave da copy é "yours to keep": a pessoa não compra promessa,
// compra a posse de um filme que ela JÁ fez e já viu.
// (bloco anterior mantido abaixo para histórico)
// ⚠️ KINEO-TRIAL-CARTAO-COPY-2026-08-20 — TODA PROMESSA DE "NO CARD" SAIU.
// O fundador viu a tela de cadastro e apontou: "aqui fala que no card
// required, e sim precisa do card não?". Está certo, e o problema era maior
// que a frase — era INCOERÊNCIA DE MODELO. Enquanto a conta nova ganhasse os
// créditos de graça, o trial com cartão que acabamos de construir não
// substituiria nada: ninguém entrega o cartão para receber o que já ganha
// sem ele.
// Estas frases são a fonte única de ~20 superfícies (landing, signup, login,
// páginas de SEO, comparativos, e-mails). Corrigir aqui conserta todas de uma
// vez — foi assim que a V6 fechou 273 preços chumbados.
// O que a copy passa a dizer, e é literalmente o que o Stripe faz: uma semana
// grátis, cartão na entrada, cobrança no dia 8, cancelamento em um clique.
// Dizer "cancele quando quiser" ao lado do cartão não é amaciar a pílula — é
// a informação que faz a pessoa clicar sem medo E o que nos protege de
// contestação depois.
const ON_COPY: FreeTierCopy = {
  headline:
    `Start free — every engine unlocked, including Kling 3. Make ${TRIAL_FILMS} AI films free, watermarked. Upgrade any time to download them clean.`,
  residual: '1 free Fast video/month',
  sentence:
    `Every new account gets ${TRIAL_GRANT_CREDITS_COPY} credits and every engine unlocked — Kling 3 included. Films come out watermarked; a plan removes the watermark and unlocks clean downloads.`,
  chip: `${TRIAL_GRANT_CREDITS_COPY} free credits — every engine unlocked`,
  chipLower: `${TRIAL_GRANT_CREDITS_COPY} free credits — every engine unlocked`,
  planCardBody:
    `Free to start: ${TRIAL_GRANT_CREDITS_COPY} credits, every engine unlocked including Kling 3. Watermarked while you try; a plan makes them yours to keep.`,
  counterNoun: 'this month',
  planLimitLine: 'free Fast video per month',
  limitHitError:
    "You've used this month's free Fast video. Keep creating with Starter — same price worldwide. Cancel anytime.",
  cmpKineoFree:
    `Kineo: ${TRIAL_GRANT_CREDITS_COPY} free credits on signup with every engine unlocked, Kling 3 included. Trial films are watermarked; any paid plan unlocks clean downloads.`,
  limitHitEmailSubject: 'You used your free Fast video — Starter removes the wall',
  limitHitEmailIntro:
    "You've used this month's free Fast video — the free plan includes 1 per month.",
  limitHitEmailIntroHtml:
    "You've used <strong>this month's free Fast video</strong> — the free plan includes 1 per month.",
  limitResetLine:
    'Or wait — your free Fast video comes back next month, and your videos stay in your library either way.',
  // Nomeia a coisa MAIOR que a pessoa recebe no clique, sem prometer desconto
  // (guardrail do fundador: 50%/COMEBACK50 nunca em superficie publica) e sem
  // numero de tracao. O numero e verificavel: e o grant exato, derivado.
  ctaPrimary: `Start free — every engine unlocked →`,
  // Primeira oracao da headline aprovada pelo fundador, verbatim.
  ctaHeading: 'Make a real film free — keep it for $7',
}

const DAY_MS = 24 * 60 * 60 * 1000

const OFF_OFFER: FreeTierOffer = {
  reverseTrial: false,
  limit: 3,
  windowMs: DAY_MS, // idêntico a FREE_FAST_WINDOW_MS (lib/freeFastQuota.ts)
  maxFreeFastSeconds: null,
  copy: OFF_COPY,
}

const ON_OFFER: FreeTierOffer = {
  reverseTrial: true,
  limit: 1,
  // "1 Fast/mês" implementado como janela ROLANTE de 30 dias — mesma mecânica
  // de contagem do compose (reservas na janela), sem calendário novo.
  windowMs: 30 * DAY_MS,
  maxFreeFastSeconds: 15,
  copy: ON_COPY,
}

/** Puro, sem env — é o que o provider client-side recebe já resolvido. */
export function buildFreeTierOffer(reverseTrialEnabled: boolean): FreeTierOffer {
  return reverseTrialEnabled ? ON_OFFER : OFF_OFFER
}

/**
 * SERVER-SIDE ONLY. Mesmo idioma de flag de lib/reverseTrial.ts: igualdade
 * estrita com 'true'; qualquer outro valor = OFF. Não importamos REVERSE_TRIAL_
 * ENABLED de lá porque aquele módulo puxa @supabase/supabase-js e este precisa
 * ser importável por qualquer página de marketing sem arrastar peso — mas a
 * flag é a MESMA env var, lida com o MESMO predicado.
 */
export function getFreeTierOffer(): FreeTierOffer {
  if (typeof window !== 'undefined') {
    // Num client component isto SEMPRE devolveria OFF (env server não existe no
    // browser) — copy velha com a flag ligada. O caminho certo é useFreeTierOffer().
    console.warn('[freeTierOffer] getFreeTierOffer() called in the browser — use useFreeTierOffer() instead')
  }
  return buildFreeTierOffer(process.env.KINEO_REVERSE_TRIAL_ENABLED === 'true')
}

/**
 * A troca de uma frase de cauda longa. OFF → devolve `legacy` byte a byte
 * (diff zero); ON → devolve `on` (ou a frase canônica). `legacy` fica no call
 * site DE PROPÓSITO: é o que torna o "flag OFF = copy 100% atual" auditável
 * por inspeção local, e a copy nova continua morando só neste arquivo.
 */
export function swapFreeTierCopy(offer: FreeTierOffer, legacy: string, on?: string): string {
  return offer.reverseTrial ? (on ?? offer.copy.sentence) : legacy
}
