// KINEO-ADS-V2-2026-09-28 — leitura do link do negócio para o anúncio v2 (etapa 2, servidor).
//
// O leitor puro é o do v1 (lib/ads/linkReader.ts: readLinkFacts/linkSentence/safeLinkUrl/isPrivateHost). O download
// seguro (só host público, redirecionamento MANUAL com cada salto revalidado, corpo limitado) é CÓPIA do safeGet de
// app/api/ads/from-link/route.ts — a rota v1 fica intacta até a virada pública (regra da etapa) e o helper de lá não é
// exportado. Aqui só a página HTML; as imagens do site não entram (o v2 exige as fotos recortadas em 9:16 no navegador).
import { lookup } from 'node:dns/promises'
import { isPrivateHost, linkSentence, readLinkFacts, safeLinkUrl } from '@/lib/ads/linkReader'

const PAGE_MAX_BYTES = 1_500_000
const FETCH_TIMEOUT_MS = 8000
const UA = 'Mozilla/5.0 (compatible; KineoLinkReader/1.0; +https://www.usekineo.com)'

async function publicHost(u: URL): Promise<boolean> {
  if (isPrivateHost(u.hostname)) return false
  try {
    const addrs = await lookup(u.hostname, { all: true })
    return addrs.length > 0 && addrs.every((a) => !isPrivateHost(a.address))
  } catch {
    return false
  }
}

async function safeGetPage(start: URL): Promise<{ url: URL; type: string; body: Uint8Array } | null> {
  let url = start
  for (let hop = 0; hop < 4; hop++) {
    if (!(await publicHost(url))) return null
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' })
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location')
      const nu = next ? safeLinkUrl(new URL(next, url).toString()) : null
      if (!nu) return null
      url = nu
      continue
    }
    if (!res.ok || !res.body) return null
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      chunks.push(value)
      if (size > PAGE_MAX_BYTES) { await reader.cancel().catch(() => {}); break }
    }
    const body = new Uint8Array(Math.min(size, PAGE_MAX_BYTES))
    let off = 0
    for (const c of chunks) { const n = Math.min(c.byteLength, body.length - off); body.set(c.subarray(0, n), off); off += n; if (off >= body.length) break }
    return { url, type: (res.headers.get('content-type') ?? '').toLowerCase(), body }
  }
  return null
}

/** A frase do negócio lida do link (null = página inacessível ou não-HTML). */
export async function adsV2LinkText(raw: string): Promise<{ text: string; lang: string | null; host: string } | null> {
  const target = safeLinkUrl(raw)
  if (!target) return null
  const page = await safeGetPage(target).catch(() => null)
  if (!page || !/html|xml/.test(page.type)) return null
  const facts = readLinkFacts(new TextDecoder('utf-8').decode(page.body), page.url.toString())
  const text = linkSentence(facts)
  return text ? { text, lang: facts.lang, host: facts.host } : null
}
