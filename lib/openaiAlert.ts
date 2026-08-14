import OpenAI from 'openai'

// KINEO-OPENAI-ALERT-2026-07-31 — shared OpenAI quota alarm.
// Incident 31/07: the OpenAI account ran out of credits at 11:07Z and EVERY
// GPT-backed route (generate-script, scene generation, b-roll plan, the
// PUBLIC landing demo) returned mute 500s for 3+ hours — during the biggest
// TAAFT signup wave in the company's history. 10 external users hit dead
// buttons; the only trace was events rows nobody reads in real time.
// Mirrors lib/falAlert.ts (same incident class with fal.ai on 10/07: balance
// hit $0, generic 502, no e-mail, no signal).
// Throttled to once per 30 min per lambda instance.

// One shared user-facing sentence so every surface tells the same truth.
// Honest, no fake apology-speak: capacity is down, the team already knows,
// the user loses nothing by coming back later.
export const ENGINE_CAPACITY_MESSAGE =
  'Kineo is at full capacity right now — the team was automatically alerted and is adding capacity. Your free videos and credits are untouched. Please try again in a little while.'

// KINEO-OPENAI-429-BLINDSPOT-2026-08-14 — o detector só via METADE dos 429.
//
// Medido no check-up de fornecedores de 14/08 (painel oficial): saldo OpenAI
// US$3,07, auto-reload DESLIGADO, queima US$1,93/dia = 1,6 dia. A OpenAI está
// no estágio `scripting` de TODO vídeo. É a MESMA configuração do incidente de
// 31/07 (116 falhas, 3h de produto morto durante a maior onda do TAAFT).
//
// A auditoria desta sprint achou o furo: a versão anterior desta função exigia
// que a palavra `credit|quota|billing` aparecesse no corpo do 429. A OpenAI
// devolve `rate_limit_exceeded` SEM nenhuma dessas palavras — e é exatamente
// isso que ela devolve quando a conta está no fim (o rate limit de uma conta
// sem saldo colapsa antes de o `insufficient_quota` aparecer). Esse 429 caía
// fora do detector, não acendia o alarme, não mandava e-mail, e o usuário via:
//
//     "Failed to plan scenes. Please try a different prompt."
//
// que é a copy TÓXICA: ela culpa o prompt do usuário por uma falha nossa de
// saldo, e foi ela que produziu as 5+ tentativas cegas por pessoa em 31/07.
// Cada uma dessas tentativas cegas é 1 chamada gpt-4o a mais contra a conta
// que está morrendo — o erro se retroalimentava.
//
// A REGRA NOVA, e ela é deliberadamente mais larga: **todo 429 da OpenAI é
// tratado como capacidade.** Errar para este lado é barato (a pessoa lê
// "estamos no limite, volte já já", que é verdade em rate limit também) e
// errar para o outro é caro (a pessoa é culpada por um problema nosso e
// retenta às cegas). Um 429 nunca é culpa do prompt.
export function looksOpenAiQuotaDead(e: unknown): boolean {
  const err = e as { status?: number; message?: string; code?: string } | null
  if (!err) return false
  const blob = `${err.message ?? ''} ${err.code ?? ''}`.toLowerCase()
  if (/insufficient_quota|no credits remaining|rate_limit_exceeded/.test(blob)) return true
  // Todo 429 conta, com ou sem palavra-chave no corpo. Ver bloco acima.
  return err.status === 429
}

// KINEO-OPENAI-HANG-2026-08-05 — the OTHER way OpenAI takes the product down.
//
// The 31/07 detector above only fires when OpenAI ANSWERS, and answers
// "insufficient_quota". On 05/08 it answered nothing at all: requests hung
// until Vercel's gateway killed the lambda (504 on generate-video-fast,
// TypeError with null http_status on the client). Credits were fine, the
// alarm never rang, and 2 users — one a brand-new TAAFT signup on their very
// first video — burned 20 minutes on 4 dead attempts in silence.
//
// Now that lib/openai.ts caps the client timeout, that silence surfaces as a
// catchable timeout/connection error, which THIS predicate recognises so the
// same honest 503 + founder page fires for a hang as for an empty wallet.
export function looksOpenAiHanging(e: unknown): boolean {
  if (!e) return false

  // GATE FIRST, match second. Two traps found in adversarial review:
  //
  //  1. `err.name` is USELESS for this. openai/error.js never assigns `name` on
  //     its subclasses, so APIConnectionTimeoutError reports name === 'Error'.
  //     Matching on class names is dead code; only `instanceof` works.
  //  2. Callers wrap broad try blocks. /api/generate-script catches its WHOLE
  //     body, so a Supabase ECONNRESET or a client disconnect during
  //     req.json() would otherwise match the regex below and page the founder
  //     with "OpenAI is not responding" while OpenAI is perfectly healthy.
  //     Requiring an OpenAI SDK error class makes that impossible.
  //
  // APIConnectionError is the parent of APIConnectionTimeoutError and is what
  // the SDK throws for ECONNRESET / socket hang up / DNS / undici's bare
  // "fetch failed" — i.e. roughly half of "OpenAI is unreachable" used to slip
  // through into a mute 500 with no alert at all.
  if (e instanceof OpenAI.APIConnectionError) return true

  // Everything below is gated on the error having come from the OpenAI SDK.
  // Without this gate the string matching would also fire on a Supabase
  // ECONNRESET or a client disconnect during req.json(), because callers wrap
  // broad try blocks — and the founder would be paged with "OpenAI is not
  // responding" while OpenAI is perfectly healthy.
  if (!(e instanceof OpenAI.APIError)) return false

  const err = e as { status?: number; message?: string; code?: string; cause?: { code?: string } }
  // 504/522/524 = an upstream gateway gave up waiting on OpenAI.
  if (err.status === 504 || err.status === 522 || err.status === 524) return true

  // NOTE: deliberately NOT matching /aborted/. APIUserAbortError carries
  // "Request was aborted." and would turn any future req.signal wiring — a very
  // common Next.js pattern — into a false outage page on every user navigation.
  const blob = `${err.message ?? ''} ${err.code ?? ''} ${err.cause?.code ?? ''}`.toLowerCase()
  return /timed out|etimedout|econnreset|socket hang up|connection error|fetch failed/.test(blob)
}

// KINEO-OPENAI-HANG-2026-08-05 — throttle PER KIND, not globally. With one
// shared counter a 'hang' alert would swallow a 'quota' alert for 30 minutes,
// and that is the dangerous ordering: quota is the actionable one (a 2-minute
// top-up), and it would be suppressed by an alert whose whole message is
// "topping up fixes nothing."
const LAST_OPENAI_ALERT: Record<'quota' | 'hang' | 'rate_limit', number> = {
  quota: 0,
  hang: 0,
  rate_limit: 0,
}

// KINEO-OPENAI-429-BLINDSPOT-2026-08-14 — o par obrigatório do alargamento.
//
// `looksOpenAiQuotaDead` passou a aceitar TODO 429 de propósito: para o
// USUÁRIO, rate limit e saldo zero são a mesma coisa (capacidade), e a frase
// honesta serve para os dois. Para o FUNDADOR não são: uma manda recarregar,
// a outra diz que recarregar não resolve nada. O bloco de `kind` logo abaixo
// existe justamente porque "um alerta que prescreve a ação errada custa mais
// tempo que nenhum alerta" — e o alargamento, sozinho, faria todo pico de
// tráfego mandar um e-mail com o assunto "OpenAI SEM CRÉDITOS" e um link para
// a página de cobrança. Cobrar do fundador uma recarga que não era necessária
// é o caminho mais curto para ele aprender a ignorar o alarme, e é justamente
// nesta semana (saldo real US$3,07) que o alarme precisa ser crível.
//
// Regra: a mensagem ao usuário é larga, a afirmação ao fundador é estreita.
// Só chamamos de "sem créditos" o que a OpenAI declarou como falta de crédito.
export function openAiAlertKind(e: unknown): 'quota' | 'rate_limit' {
  const err = e as { message?: string; code?: string } | null
  const blob = `${err?.message ?? ''} ${err?.code ?? ''}`.toLowerCase()
  if (/insufficient_quota|no credits remaining|billing/.test(blob)) return 'quota'
  if (/rate_limit_exceeded|rate limit/.test(blob)) return 'rate_limit'
  // 429 sem nenhuma pista no corpo: nesta conta, com auto-reload DESLIGADO e
  // 1,6 dia de saldo, o palpite útil é saldo. Errar para 'quota' faz o fundador
  // OLHAR o painel de cobrança; errar para 'rate_limit' faz ele não olhar.
  return 'quota'
}

/**
 * Page the founder when OpenAI takes generation down.
 *
 * KINEO-OPENAI-HANG-2026-08-05 — `kind` exists because the two failure modes
 * need OPPOSITE actions, and an alert that prescribes the wrong one costs more
 * time than no alert. 'quota' = go top up the balance. 'hang' = the balance is
 * FINE and topping it up fixes nothing; OpenAI is slow or the network is, and
 * the only useful move is to watch it / degrade. Defaults to 'quota' so the
 * pre-existing call sites keep their exact previous behaviour.
 */
export async function alertOpenAiExhausted(
  context: string,
  kind: 'quota' | 'hang' | 'rate_limit' = 'quota',
): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key || key === 'your_resend_api_key_here') return
    const now = Date.now()
    if (now - LAST_OPENAI_ALERT[kind] < 30 * 60 * 1000) return
    LAST_OPENAI_ALERT[kind] = now
    const from = process.env.RESEND_FROM_EMAIL || 'Kineo <support@usekineo.com>'

    const subject =
      kind === 'hang'
        ? '🚨 Kineo: OpenAI NÃO ESTÁ RESPONDENDO — geração de vídeo travando (créditos OK)'
        : kind === 'rate_limit'
          ? '⚠️ Kineo: OpenAI em RATE LIMIT — geração falhando (NÃO é falta de crédito)'
          : '🚨 Kineo: OpenAI SEM CRÉDITOS — toda a geração de vídeo está parada'

    const body =
      kind === 'rate_limit'
        ? `A OpenAI está devolvendo 429 de RATE LIMIT — ela recusou a chamada por VELOCIDADE, não por saldo. Recarregar crédito NÃO resolve isto.\n\n` +
          `Sintoma para o usuário: o vídeo não sai. Ele já vê a mensagem honesta de capacidade (503), não mais "tente um prompt diferente" — essa copy culpava o usuário por um problema nosso e produziu 5+ tentativas cegas por pessoa em 31/07.\n\n` +
          `Contexto: ${context}\n` +
          `Hora: ${new Date().toISOString()}\n\n` +
          `⚠️ ATENÇÃO em 14/08/2026: o saldo REAL da conta é US$3,07 com auto-reload DESLIGADO. Rate limit e saldo baixo são coisas diferentes, mas nesta semana valem a mesma visita ao painel:\n` +
          `https://platform.openai.com/settings/organization/limits/ (rate limits)\n` +
          `https://platform.openai.com/settings/organization/billing/ (saldo — e LIGAR o auto-reload)\n\n` +
          `Este alerta repete no máximo a cada 30 min por instância.`
        : kind === 'hang'
        ? `As chamadas para a OpenAI estão ESTOURANDO O TEMPO (não é falta de crédito — recarregar NÃO resolve).\n\n` +
          `Sintoma para o usuário: o vídeo fica "gerando" e morre. Foi exatamente isso que aconteceu em 05/08, quando um cadastro novo vindo do TAAFT tentou 4 vezes em 20 minutos e falhou nas 4.\n\n` +
          `Contexto: ${context}\n` +
          `Hora: ${new Date().toISOString()}\n\n` +
          `Onde olhar: https://status.openai.com/ e os logs da Vercel do deploy em produção.\n\n` +
          `O app já mostra mensagem honesta de capacidade (503) em vez de erro mudo, e o cron de win-back recupera quem falhou. ` +
          `Este alerta repete no máximo a cada 30 min por instância enquanto durar.`
        : `A conta da OpenAI está sem créditos — script, cenas, b-roll e a demo da landing estão falhando AGORA para todos os usuários (e para cada visitante do TAAFT que testa o produto).\n\n` +
          `Contexto: ${context}\n` +
          `Hora: ${new Date().toISOString()}\n\n` +
          `Recarregar (leva 2 min): https://platform.openai.com/settings/organization/billing/\n\n` +
          `Enquanto isso o app mostra uma mensagem honesta de capacidade (503) em vez de erro mudo. ` +
          `Este alerta repete no máximo a cada 30 min por instância enquanto o problema durar.`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: ['josephsskaf@gmail.com'], subject, text: body }),
    })
    console.error(
      kind === 'hang'
        ? '[openai-alert] OPENAI HANGING/TIMEOUT — founder alerted'
        : kind === 'rate_limit'
          ? '[openai-alert] OPENAI RATE LIMITED — founder alerted'
          : '[openai-alert] OPENAI QUOTA EXHAUSTED — founder alerted',
    )
  } catch (e) {
    console.error('[openai-alert] alert email failed:', e instanceof Error ? e.message : String(e))
  }
}
