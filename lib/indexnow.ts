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
