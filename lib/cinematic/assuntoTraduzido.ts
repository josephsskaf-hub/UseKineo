// KINEO-META95-ASSUNTO-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — O ASSUNTO DO PEDIDO EM INGLÊS.
//
// Diagnóstico da meta 95 (docs/DIAGNOSTICO-META-95-2026-10-19.md, causa C2, 51% dos filmes abaixo de 95): o filtro
// anti-invenção (scrubInventedSetting) compara o prompt da cena, escrito em INGLÊS pelo descritor, com as PALAVRAS do pedido
// e da fala — na língua da pessoa. "Ottoman" foi apagado porque o pedido dizia "Osmanlı" (4a2e21ee, turco); "Bermuda
// Triangle" porque a fala dizia "Triângulo das Bermudas" (2f3692ff, português). O assunto do filme saía do prompt e o motor
// desenhava um trono vazio sem sultão.
//
// Este módulo dá ao filtro o pedido TRADUZIDO: uma chamada barata ao gpt-4o-mini (temperatura 0, ~US$ 0,0002, prazo curto),
// só quando a língua do filme não é inglês ou o texto tem escrita não latina. Devolve o texto em inglês + a lista de nomes
// próprios (pessoas, lugares, impérios, monumentos, marcas, épocas, anos) em grafia inglesa. Falhou (sem chave, prazo,
// 5xx, JSON ruim) → null, e o chamador NÃO apaga (regra do conserto: na dúvida, o assunto fica).
//
// Pedido em inglês sem escrita estrangeira: nada é chamado (precisaTraducao = false) — a estrada de sempre, byte a byte.
import { AI_TEXT_MODELS } from '@/lib/aiModels'

const MODELO_TRADUCAO = AI_TEXT_MODELS.scenePlannerLight // gpt-4o-mini (registro único de modelos: lib/aiModels.ts)
const PRAZO_MS = 6_000
const ENTRADA_MAX = 1_800

/** Escrita que não é latina (devanágari, árabe/urdu, cirílico, grego, hebraico, CJK…): o descritor escreve em inglês, o filtro precisa da tradução. */
const ESCRITA_NAO_LATINA_RE = /[\p{Script=Devanagari}\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Hebrew}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Bengali}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Gujarati}\p{Script=Gurmukhi}]/u

/** O filtro precisa do assunto traduzido? Língua do filme fora do inglês, ou pedido/fala com escrita não latina. */
export function precisaTraducao(contexto: string, idioma: string | null | undefined): boolean {
  const lang = typeof idioma === 'string' ? idioma.trim().toLowerCase() : ''
  if (lang && lang !== 'en') return true
  return ESCRITA_NAO_LATINA_RE.test(String(contexto ?? ''))
}

export interface AssuntoTraduzido { texto: string; nomes: string[]; ms: number; model: string }

function mensagens(contexto: string): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content:
        'You translate for a video pipeline. Translate the text to English and list every proper noun it contains, in standard ' +
        'English spelling: people, places, cities, countries, empires, dynasties, monuments, rivers, brands, events, eras and years ' +
        '(for example "Osmanlı" → "Ottoman", "موہنجو داڑو" → "Mohenjo-daro", "Triângulo das Bermudas" → "Bermuda Triangle"). ' +
        'Do not add facts that are not in the text. Reply with JSON only: {"english": string, "names": string[]}.',
    },
    { role: 'user', content: contexto },
  ]
}

/** Lê a resposta do modelo; qualquer coisa fora do formato = null (o chamador não apaga). */
export function lerTraducao(conteudo: string): { texto: string; nomes: string[] } | null {
  let parsed: unknown
  try { parsed = JSON.parse(String(conteudo ?? '')) } catch { return null }
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as { english?: unknown; names?: unknown }
  const english = typeof o.english === 'string' ? o.english.trim() : ''
  const nomes = Array.isArray(o.names) ? o.names.filter((n): n is string => typeof n === 'string' && n.trim().length > 0).map((n) => n.trim()) : []
  if (!english && nomes.length === 0) return null
  return { texto: english, nomes }
}

/**
 * Uma chamada por filme. Devolve o inglês + os nomes, ou null quando não dá para confiar (sem chave, prazo, erro, JSON ruim).
 * `fetchImpl` existe para o guardião offline; em produção é o fetch global.
 */
export async function traduzirAssunto(
  contexto: string,
  opts?: { timeoutMs?: number; fetchImpl?: typeof fetch; model?: string },
): Promise<AssuntoTraduzido | null> {
  const texto = String(contexto ?? '').replace(/\s+/g, ' ').trim().slice(0, ENTRADA_MAX)
  if (!texto) return null
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const started = Date.now()
  const model = opts?.model ?? MODELO_TRADUCAO
  const doFetch = opts?.fetchImpl ?? fetch
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? PRAZO_MS)
  try {
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 700, response_format: { type: 'json_object' }, messages: mensagens(texto) }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const lido = lerTraducao(data.choices?.[0]?.message?.content ?? '')
    if (!lido) return null
    return { ...lido, ms: Date.now() - started, model }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** O que entra no contexto do filtro: o inglês e os nomes, numa string só (o filtro compara palavras). */
export function vocabularioDoAssunto(t: AssuntoTraduzido | null | undefined): string {
  if (!t) return ''
  return `${t.texto} ${t.nomes.join(' ')}`.replace(/\s+/g, ' ').trim()
}
