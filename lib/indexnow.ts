// lib/indexnow.ts — [KINEO-SEO-VIDEO-PAGES-2026-08-11]
//
// ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────────
// O repo já tinha `scripts/submit-indexnow.mjs`, e ele funciona. O problema é
// o que ele submete e quando:
//
//   • ELE LÊ APENAS `/sitemap.xml`. Medido em produção em 11/08/2026:
//     /sitemap.xml ......... 164 URLs, ZERO delas `/v/…`
//     /video-sitemap.xml ... 650 URLs, 644 delas `/v/…`
//     Ou seja: as 644 páginas públicas de vídeo — a maior superfície
//     indexável do produto, que cresce ~170/semana sozinha — NUNCA foram
//     submetidas ao IndexNow. Nem uma vez.
//
//   • ELE É MANUAL (`npm run seo:indexnow:submit`). Uma página só entra no
//     fluxo se um humano lembrar de rodar o script. Um vídeo gerado às 3 da
//     manhã de sábado espera o próximo humano.
//
// Isso importa mais aqui do que num site qualquer: o IndexNow alimenta o Bing,
// e o Bing é o índice por trás da busca do ChatGPT — a fonte de aquisição que
// MAIS converte segundo as medições do próprio produto (docs/growth 23/07:
// ChatGPT trouxe 4 signups e os 2 checkouts da semana; Google trouxe 1 sessão
// e zero). O Google ignora IndexNow; o Bing age em horas.
//
// Este módulo é o submissor compartilhado. `app/api/cron/submit-indexnow`
// (diário, automático) e o script manual passam pelas MESMAS validações, para
// que não exista uma versão "boa" e uma versão "que alguém rodou de memória".
//
// ── O QUE ESTE MÓDULO NÃO FAZ ───────────────────────────────────────────────
// Não toca em preço, crédito, entitlement, e-mail ou qualquer estado do
// usuário. Só fala com a API pública do IndexNow. Falha SEMPRE de forma suave:
// devolve `{ ok: false, reason }` em vez de lançar, porque um cron de SEO nunca
// pode derrubar nada.

/** Host canônico. Igual a lib/publicVideos.ts, app/sitemap.ts e app/robots.ts. */
export const INDEXNOW_HOST = 'www.usekineo.com'
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`

/**
 * A chave do IndexNow NÃO é um segredo: o protocolo exige que ela seja
 * publicamente legível em `https://<host>/<key>.txt` — é exatamente assim que
 * o Bing verifica a posse do domínio. Ela já está versionada em
 * `public/8ee9f362d6ec4042b723993c3e15936b.txt` e em
 * `scripts/submit-indexnow.mjs`. Mantida aqui como default, sobrescrevível por
 * env caso a chave seja rotacionada sem redeploy do arquivo público.
 */
export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '8ee9f362d6ec4042b723993c3e15936b'
export const INDEXNOW_KEY_LOCATION = `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

/** Limite do protocolo: no máximo 10.000 URLs por POST. */
export const INDEXNOW_MAX_URLS = 10_000

export type IndexNowResult =
  | { ok: true; submitted: number; httpStatus: number; skipped: string[] }
  | { ok: false; reason: string; submitted: 0; skipped: string[] }

/**
 * Normaliza e valida um lote de URLs.
 *
 * Regras (as mesmas do script manual, agora em um lugar só):
 *  - só `https:` e só o host canônico — submeter um host errado é o caminho
 *    mais rápido para a chave ser rejeitada pelo Bing;
 *  - deduplica preservando a ordem (mais novo primeiro, quem chama decide);
 *  - trunca em INDEXNOW_MAX_URLS.
 *
 * URLs recusadas voltam em `skipped` em vez de derrubar o lote inteiro: o
 * script manual falhava a execução toda por causa de uma URL torta, o que
 * significa que uma linha ruim no sitemap bloqueava a submissão das outras 649.
 */
export function normalizeIndexNowUrls(urls: readonly string[]): {
  urlList: string[]
  skipped: string[]
} {
  const urlList: string[] = []
  const skipped: string[] = []
  const seen = new Set<string>()
  for (const raw of urls) {
    const value = (raw ?? '').toString().trim()
    if (!value) continue
    let parsed: URL
    try {
      parsed = new URL(value)
    } catch {
      skipped.push(value)
      continue
    }
    if (parsed.protocol !== 'https:' || parsed.host !== INDEXNOW_HOST) {
      skipped.push(value)
      continue
    }
    const normalized = parsed.toString()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    if (urlList.length < INDEXNOW_MAX_URLS) urlList.push(normalized)
  }
  return { urlList, skipped }
}

/**
 * Submete um lote ao IndexNow.
 *
 * `dryRun` monta e valida a carga sem enviar nada — é o que o cron usa quando
 * a flag de ambiente está desligada, para que o caminho de código exercitado em
 * produção seja o mesmo com e sem envio.
 */
export async function submitToIndexNow(
  urls: readonly string[],
  options: { dryRun?: boolean; timeoutMs?: number } = {},
): Promise<IndexNowResult> {
  const { urlList, skipped } = normalizeIndexNowUrls(urls)
  if (urlList.length === 0) {
    return { ok: false, reason: 'no valid URLs to submit', submitted: 0, skipped }
  }
  if (options.dryRun) {
    return { ok: true, submitted: urlList.length, httpStatus: 0, skipped }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000)
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
      signal: controller.signal,
    })
    // 200 = aceito, 202 = aceito e a chave será verificada depois. Ambos são
    // sucesso; qualquer outra coisa (403 chave inválida, 422 URL fora do host)
    // precisa aparecer no log do cron.
    if (response.status !== 200 && response.status !== 202) {
      const body = (await response.text().catch(() => '')).slice(0, 300)
      return {
        ok: false,
        reason: `indexnow returned HTTP ${response.status}${body ? `: ${body}` : ''}`,
        submitted: 0,
        skipped,
      }
    }
    return { ok: true, submitted: urlList.length, httpStatus: response.status, skipped }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'indexnow request failed',
      submitted: 0,
      skipped,
    }
  } finally {
    clearTimeout(timer)
  }
}

// ════════════════════════════════════════════════════════════════════════════
// KINEO-BING-SEO-1510 — o que MUDOU desde o último envio (sitemap + vídeos)
// ════════════════════════════════════════════════════════════════════════════
// O Bing Webmaster (relatório do Cowork, 15/10) mostrou o último envio do IndexNow em 13/10 00:54 e nada depois. Causa:
//   · o único caminho AUTOMÁTICO (app/api/cron/submit-indexnow, 1×/dia) só olhava as páginas públicas de VÍDEO dos
//     últimos 3 dias. Desde a trava de privacidade, vídeo só vira página pública com o consentimento do dono
//     (published_at), e o último foi carimbado em 30/09 — o cron termina todo dia em "no new indexable videos in window";
//   · as páginas de SEO (motores, comparações, /for, nichos) nunca entraram no cron: só iam ao Bing quando alguém rodava à
//     mão um script de ping da rodada (scripts/indexnow-ping-*.mjs). O envio de 13/10 foi um desses.
// Conserto: o cron passa a comparar o <lastmod> do /sitemap.xml PUBLICADO (e o published_at dos vídeos) com o que já foi
// enviado (o retrato gravado em `events` a cada envio real) e envia só o que mudou — portanto, a cada deploy de produção
// que muda o lastmod de uma página, na primeira execução depois dele. Funções puras abaixo; o guardião
// scripts/test-bing-seo-1510.mjs as exercita com mutantes.

/** Uma <url> do sitemap: endereço e lastmod como texto (comparado como texto; o sitemap é a fonte). */
export interface IndexNowEntry {
  loc: string
  lastmod: string
}

/** O retrato do que já foi enviado: URL → lastmod no momento do envio. */
export type IndexNowSnapshot = Record<string, string>

/** Sem retrato anterior (primeira execução), só entra o que tem lastmod nesta janela — nada de despejar o site inteiro. */
export const INDEXNOW_FIRST_RUN_WINDOW_DAYS = 7

/**
 * Teto da casa por 24 horas. O protocolo aceita até 10.000 URLs por POST (INDEXNOW_MAX_URLS); a casa fica uma ordem de
 * grandeza abaixo para nunca parecer spam ao Bing. O sitemap inteiro tem ~530 URLs, então o teto só morde num erro.
 */
export const INDEXNOW_DAILY_URL_CAP = 1000

/** Nomes dos eventos (tabela `events`, só service_role) que guardam o envio e o retrato. */
export const INDEXNOW_SUBMITTED_EVENT = 'indexnow_submitted'
export const INDEXNOW_SNAPSHOT_EVENT = 'indexnow_snapshot'

/** Lê as <url> de um sitemap XML (sem dependência: o formato é o que app/sitemap.ts gera). */
export function parseSitemapXml(xml: string): IndexNowEntry[] {
  const out: IndexNowEntry[] = []
  for (const m of (xml ?? '').matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (m[1].match(/<loc>([^<]+)<\/loc>/) ?? [])[1]?.trim() ?? ''
    const lastmod = (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) ?? [])[1]?.trim() ?? ''
    if (loc) out.push({ loc: loc.replace(/&amp;/g, '&'), lastmod })
  }
  return out
}

/**
 * As URLs que mudaram desde o retrato: URL nova ou lastmod diferente do enviado. Sem retrato, só as de lastmod dentro de
 * INDEXNOW_FIRST_RUN_WINDOW_DAYS. A ordem de `current` é preservada (quem chama põe o sitemap antes dos vídeos).
 */
export function changedSinceSnapshot(
  current: readonly IndexNowEntry[],
  previous: IndexNowSnapshot | null,
  nowMs: number,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const cutoff = nowMs - INDEXNOW_FIRST_RUN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  for (const e of current) {
    if (!e.loc || seen.has(e.loc)) continue
    seen.add(e.loc)
    if (previous) {
      if (previous[e.loc] !== e.lastmod) out.push(e.loc)
    } else {
      const t = Date.parse(e.lastmod)
      if (Number.isFinite(t) && t >= cutoff) out.push(e.loc)
    }
  }
  return out
}

/**
 * O retrato depois de um envio REAL: toda URL atual entra com o lastmod de agora, MENOS as que mudaram e não couberam no
 * envio (teto) — essas guardam o valor antigo (ou ficam de fora) para sair na próxima execução. URL que saiu do sitemap
 * sai do retrato.
 */
export function nextSnapshot(
  current: readonly IndexNowEntry[],
  previous: IndexNowSnapshot | null,
  changed: readonly string[],
  sent: ReadonlySet<string>,
): IndexNowSnapshot {
  const pending = new Set(changed.filter((u) => !sent.has(u)))
  const out: IndexNowSnapshot = {}
  for (const e of current) {
    if (!e.loc) continue
    if (!pending.has(e.loc)) out[e.loc] = e.lastmod
    else if (previous && Object.prototype.hasOwnProperty.call(previous, e.loc)) out[e.loc] = previous[e.loc]
  }
  return out
}

/** Quantas URLs ainda cabem no teto de 24 h, dado o que os envios reais das últimas 24 h já mandaram. */
export function remainingDailyBudget(sentLast24h: number): number {
  const used = Number.isFinite(sentLast24h) && sentLast24h > 0 ? Math.floor(sentLast24h) : 0
  return Math.max(0, INDEXNOW_DAILY_URL_CAP - used)
}
