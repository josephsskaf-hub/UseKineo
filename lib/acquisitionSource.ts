// PUSH #26 — one canonical acquisition-source policy for capture, persistence
// and reporting. OAuth/payment returns are navigation infrastructure, not the
// page that acquired the user, so they must never become first-touch sources.

// ⚠️ KINEO-RENAME-2026-07-27 — NÃO REMOVA OS HOSTS shortsforgeai DAQUI.
// Esta lista responde "o referrer é a gente mesmo?". Os três hosts legados
// continuam servindo tráfego (middleware.ts faz 308 deles para www.usekineo.com),
// então um clique interno que passe por um deles ainda chega com esse referrer.
// Tirá-los daqui não renomeia nada: faz a própria Kineo virar "fonte externa" e
// sobrescrever o first-touch real de quem veio do ChatGPT, do TAAFT ou de busca
// orgânica — ou seja, envenena silenciosamente a atribuição de aquisição, que é
// justamente o número usado para decidir onde gastar. Some daqui quando os
// domínios legados forem desligados de verdade, não antes.
const OWN_HOSTS = new Set([
  'usekineo.com',
  'www.usekineo.com',
  'shortsforgeai.com',
  'www.shortsforgeai.com',
  'shortsforgeai.vercel.app',
])

const NON_ACQUISITION_HOSTS = new Set([
  'accounts.google.com',
  'checkout.stripe.com',
])

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-ATTRIBUTION-SURFACE-2026-08-12 — RÓTULO DE SUPERFÍCIE ≠ ORIGEM.
// ═══════════════════════════════════════════════════════════════════════════
// MEDIDO EM 10/08 (docs/CAC-POR-CANAL-2026-08-10.md): **42 dos 47 perfis com
// rótulo interno têm `signup_referrer` NULO** — a origem externa dessa gente é
// irrecuperável, e a ÚNICA conversão da história do produto está nesse balde.
// Enquanto isso valer, nenhum dólar de tráfego pago é avaliável depois de
// gasto, o que trava a decisão do TAAFT por falta de instrumento, não de
// dinheiro.
//
// O MECANISMO, traçado ponta a ponta antes desta correção:
//   1. o visitante chega SEM utm e SEM referrer externo utilizável (digitação
//      direta, app in-browser que remove o Referer, política de referrer);
//   2. `captureSourceOnce()` não tem nada para gravar e, DE PROPÓSITO, não
//      escreve marcador nenhum — para que um pouso externo posterior ainda
//      possa vencer o first-touch;
//   3. ele clica num CTA NOSSO, dentro do NOSSO site: `HomeTopicForm` manda
//      `?utm_source=homepage`, `StickyFreeShortCTA` manda `?utm_source=sticky_cta`;
//   4. `captureSourceOnce()` roda de novo, agora ACHA um `utm_source`, e o
//      grava como first-touch. O `document.referrer` é a nossa própria home,
//      que `sanitizeAcquisitionReferrer` (corretamente) zera.
//   → `signup_utm_source = 'sticky_cta'`, `signup_referrer = NULL`.
//
// "sticky_cta" não é de onde a pessoa veio. É onde ela CLICOU depois de já
// estar aqui. Gravar isso na coluna de ORIGEM não é um rótulo impreciso: é uma
// origem inventada ocupando o lugar da verdadeira, e ela some para sempre.
//
// A correção é recusar esses rótulos NA ORIGEM (aqui, o ponto de estrangulamento
// que TANTO a captura no cliente QUANTO a rota do servidor já chamam) e mandá-los
// para uma coluna própria, `signup_surface`. Sem o rótulo falso, o perfil fica
// com origem NULA — que o funil já lê como `(direct)`, ou seja "não sabemos".
// Um "não sabemos" honesto é instrumento; um "sticky_cta" falso é ruído que se
// parece com sinal.
//
// ⚠️ O QUE NÃO ENTRA NESTA LISTA, e por quê — a linha é "o clique começou no
// nosso site?", não "o texto parece interno?":
//   · `kineo_user` (lib/videoShare.ts) e `watermark` (app/free/route.ts) são
//     links que o USUÁRIO cola FORA daqui. Quem clica neles é visitante novo
//     chegando de um lugar externo — isso é aquisição de verdade, e é um dos
//     poucos canais que temos. Removê-los apagaria o boca a boca do placar.
//   · `homepage` e `sticky_cta` são renderizados por páginas nossas
//     (KineoLanding, /alternatives, /free-*, /cheapest-ai-shorts-maker,
//     /youtube-shorts-from-topic). Conferido arquivo por arquivo, não suposto.
const INTERNAL_SURFACE_LABELS = new Set([
  'homepage',
  'sticky_cta',
])

/**
 * Devolve o rótulo de superfície interna se `value` for um, senão null.
 * Usado para desviar o rótulo para `profiles.signup_surface` em vez de deixá-lo
 * ocupar a coluna de origem.
 */
export function internalSurfaceLabel(value: string | null | undefined): string | null {
  const token = (value ?? '').trim().toLowerCase().slice(0, 80)
  return token && INTERNAL_SURFACE_LABELS.has(token) ? token : null
}

function cleanHostname(value: string): string {
  return value.trim().replace(/^www\./, '').replace(/\.$/, '').toLowerCase()
}

function parsedReferrer(value: string | null | undefined): URL | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:', 'android-app:'].includes(parsed.protocol)) return null
    return parsed
  } catch {
    return null
  }
}

export function isNonAcquisitionHost(
  hostname: string | null | undefined,
  currentHostname?: string | null,
): boolean {
  const host = cleanHostname(hostname ?? '')
  if (!host) return true

  const current = cleanHostname(currentHostname ?? '')
  if (current && (host === current || host.endsWith(`.${current}`) || current.endsWith(`.${host}`))) {
    return true
  }

  return OWN_HOSTS.has(host) ||
    NON_ACQUISITION_HOSTS.has(host) ||
    host.endsWith('.supabase.co')
}

export function sanitizeAcquisitionReferrer(
  value: string | null | undefined,
  currentHostname?: string | null,
): string | null {
  const parsed = parsedReferrer(value)
  if (!parsed || isNonAcquisitionHost(parsed.hostname, currentHostname)) return null
  return parsed.toString().slice(0, 300)
}

function sourceFromHost(hostname: string): string | null {
  const host = cleanHostname(hostname)
  if (!host || isNonAcquisitionHost(host)) return null

  if (host === 'theresanaiforthat.com' || host.endsWith('.theresanaiforthat.com')) return 'taaft'
  if (host === 'google.com' || host.endsWith('.google.com') || host === 'com.google.android.googlequicksearchbox') return 'google'
  if (host === 'com.google.android.gm') return 'gmail'
  if (host === 'keep.google.com') return 'google-keep'
  if (host === 'chatgpt.com') return 'chatgpt'
  return host
}

export function sanitizeAcquisitionUtmSource(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim().toLowerCase()
  if (!raw) return null

  // Be tolerant of a full URL accidentally sent as utm_source, but apply the
  // same infrastructure/self-referral filter as a normal referrer.
  const asUrl = parsedReferrer(raw)
  if (asUrl) return sourceFromHost(asUrl.hostname)

  const token = cleanHostname(raw).slice(0, 80)
  if (!token || isNonAcquisitionHost(token)) return null
  // KINEO-ATTRIBUTION-SURFACE-2026-08-12 — um rótulo de superfície nossa nunca
  // é origem. Ele é capturado à parte (ver internalSurfaceLabel acima) e vai
  // para `signup_surface`; aqui ele vale null, e null deixa a origem vazia em
  // vez de mentir. Esta linha vem DEPOIS do filtro de host próprio de propósito:
  // são duas perguntas diferentes ("é a gente mesmo?" e "é uma tela nossa?") e
  // juntá-las faria a próxima pessoa apagar uma achando que apaga duplicata.
  if (INTERNAL_SURFACE_LABELS.has(token)) return null
  if (token === 'taaft' || token === 'theresanaiforthat.com' || token.endsWith('.theresanaiforthat.com')) return 'taaft'
  if (token === 'google' || token === 'google.com' || token === 'com.google.android.googlequicksearchbox') return 'google'
  if (token === 'gmail' || token === 'com.google.android.gm') return 'gmail'
  if (token === 'chatgpt' || token === 'chatgpt.com') return 'chatgpt'
  return token
}

export function acquisitionSource(input: {
  utmSource?: string | null
  legacyUtmSource?: string | null
  referrer?: string | null
}): string {
  const explicit = sanitizeAcquisitionUtmSource(input.utmSource) ||
    sanitizeAcquisitionUtmSource(input.legacyUtmSource)
  if (explicit) return explicit

  const referrer = sanitizeAcquisitionReferrer(input.referrer)
  if (!referrer) return 'direct'
  const parsed = parsedReferrer(referrer)
  return parsed ? (sourceFromHost(parsed.hostname) ?? 'direct') : 'direct'
}

export function hasCorrectableSelfReferral(value: string | null | undefined): boolean {
  const parsed = parsedReferrer(value)
  return Boolean(parsed && isNonAcquisitionHost(parsed.hostname))
}
