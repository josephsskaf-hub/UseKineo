// ═══ KINEO-5-LINGUAS-0311 [TRAVA 8.2 — "vai" do fundador 03/11: "vamos ficar só com 5 línguas, vamos enxugar pra poder
// melhorar nessas"] — o site indexado fala 5 línguas: inglês, alemão, espanhol, português e francês ═══
//
// O CASO (medido 03/11): entre 29 e 31/10 entraram 448 páginas de efeitos em 16 línguas — metade do sitemap (893). Nos mesmos
// dias o ChatGPT (que busca no índice do Bing) caiu de 27 para 3 chegadas por janela de 12 h e o Bing de 10 para 3. Página
// traduzida em massa é gatilho conhecido de rebaixar o site inteiro. E as línguas de fora não pagam: dos 11 pagantes de 60 d,
// nenhum veio de Índia/Paquistão/Turquia (296 cadastros, 0 pagos); /for/urdu era das mais citadas e só trazia quem não compra.
//
// O QUE MUDA (só índice — NADA é apagado; a página continua no ar e abre por link, menu e narração seguem nas 16+ línguas):
//   · caminhoForaDasLinguas(): a versão de página numa língua fora das 5 (…/<código> no fim, ou /ai-video-generator/for/<língua>)
//   · o sitemap tira essas URLs e as alternates de língua de fora (app/sitemap.ts → filtrarSitemapPorLingua)
//   · o middleware manda `X-Robots-Tag: noindex, follow` nessas páginas (o Bing/Google tira do índice e segue os links)
// VOLTAR ATRÁS: acrescentar o código em LINGUAS_INDEXADAS (e o nome em NOMES_INDEXADOS). Medir em 7–10 d: chegadas do
// chatgpt.com e do bing.com em landing_session_started contra a janela de 29/10–02/11.
//
// MÓDULO PURO, SEM IMPORT (o middleware roda na borda; o guardião scripts/test-5-linguas-0311.mjs o executa).

export const LINGUAS_INDEXADAS = ['en', 'de', 'es', 'pt', 'fr'] as const
export const LINGUAS_INDEXADAS_MARCA = 'KINEO-5-LINGUAS-0311'

/** Os códigos de língua que aparecem como último segmento de página localizada (efeitos, motores, gerador grátis). */
const CODIGOS_DE_LINGUA: ReadonlySet<string> = new Set([
  'en', 'de', 'es', 'pt', 'fr', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi', 'he', 'sv', 'da', 'fi', 'cs', 'el',
  'ro', 'ms', 'bg', 'no', 'hu', 'sk', 'hr', 'sl', 'ca', 'af', 'ja', 'ko', 'zh', 'th', 'bn',
])
/** As famílias de página que têm versão por língua no fim do caminho. Fora delas, um segmento de 2 letras não é língua. */
const FAMILIAS_LOCALIZADAS = ['/effects/', '/ai-video-generator/', '/free-shorts-generator/'] as const
/** /ai-video-generator/for/<nome>: as páginas "vídeo nesta língua" que continuam no índice. */
const NOMES_INDEXADOS: ReadonlySet<string> = new Set(['english', 'german', 'spanish', 'portuguese', 'french'])
const NOMES_DE_LINGUA: ReadonlySet<string> = new Set([
  'english', 'german', 'spanish', 'portuguese', 'french', 'hindi', 'italian', 'arabic', 'indonesian', 'turkish', 'urdu', 'ukrainian',
  'vietnamese', 'russian', 'polish', 'dutch', 'hebrew', 'swedish', 'danish', 'finnish', 'czech', 'greek', 'romanian', 'malay',
  'bulgarian', 'norwegian', 'hungarian', 'slovak', 'croatian', 'slovenian', 'catalan', 'afrikaans',
])

export function linguaIndexada(codigo: string | null | undefined): boolean {
  const c = String(codigo ?? '').toLowerCase().split(/[-_]/)[0]
  return (LINGUAS_INDEXADAS as readonly string[]).includes(c)
}

/** O caminho é a versão de uma página numa língua FORA das 5? (só caminho, sem host/query) */
export function caminhoForaDasLinguas(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? '').split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase()
  if (!p) return false
  const seg = p.split('/').filter(Boolean)
  const ultimo = seg[seg.length - 1] ?? ''
  if (p.startsWith('/ai-video-generator/for/') && seg.length === 3 && NOMES_DE_LINGUA.has(ultimo)) return !NOMES_INDEXADOS.has(ultimo)
  if (seg.length >= 2 && FAMILIAS_LOCALIZADAS.some((f) => p.startsWith(f)) && CODIGOS_DE_LINGUA.has(ultimo)) return !linguaIndexada(ultimo)
  return false
}

type Entrada = { url: string; alternates?: { languages?: Record<string, string | undefined> } }

/** O sitemap sem as páginas de língua fora das 5, e sem alternates apontando para elas. Nunca lança; a ordem é preservada. */
export function filtrarSitemapPorLingua<T extends Entrada>(entradas: readonly T[]): T[] {
  const out: T[] = []
  for (const e of entradas) {
    let caminho = ''
    try { caminho = new URL(e.url).pathname } catch { caminho = String(e.url ?? '') }
    if (caminhoForaDasLinguas(caminho)) continue
    const langs = e.alternates?.languages
    if (langs && typeof langs === 'object') {
      const podadas: Record<string, string> = {}
      for (const [loc, href] of Object.entries(langs)) {
        if (typeof href !== 'string') continue
        let alvo = ''
        try { alvo = new URL(href).pathname } catch { alvo = String(href ?? '') }
        if (loc === 'x-default' || (linguaIndexada(loc) && !caminhoForaDasLinguas(alvo))) podadas[loc] = href
      }
      out.push({ ...e, alternates: { ...e.alternates, languages: podadas } })
    } else {
      out.push(e)
    }
  }
  return out
}
