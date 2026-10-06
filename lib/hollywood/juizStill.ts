// ═══ KINEO-JUIZ-STILL-2026-10-06 [TRAVA 8.2 — vai do fundador 06/10 'vai juiz'] — o juiz da FOTO-BASE antes de animar ═══
// Fundador (06/10): nos filmes de teste do Seedance 2.5 apareceram anacronismos — homem de gorro e jeans modernos na neve de
// 1816 (Tambora 713564f2: 6 das 7 cenas foram image-to-video a partir de um still FLUX), arranha-céus de vidro em Boston 1919
// (3a0082b2) — e a mesma foto de ambiente em 3 cenas (Londres 387d3344). A tarefa "nota 95" (e9423073) consertou o
// PLANEJAMENTO (época em toda cena e no still, foto de ambiente uma vez por filme); a foto em si continuava um sorteio do FLUX
// que ninguém olhava antes de virar o 1º quadro de um clipe pago. A aba /admin/coerencia julga o filme PRONTO (depois do
// gasto); este juiz olha a FOTO antes do POST do vídeo e, se ela tem defeito objetivo, pede UMA foto nova.
//
// Critérios objetivos (nunca gosto): (1) anacronismo de roupa/objeto/veículo/arquitetura para a época e o lugar da cena;
// (2) pessoa encarando a câmera ou posando; (3) texto legível; (4) igual à foto da cena anterior.
// Decisão: OK → a foto segue. REJECT → no máximo UMA regeração do FLUX, semente nova, com o motivo virando instrução POSITIVA
// sem o substantivo do objeto proibido (lição de 22/09 e de 06/10: "a proibição que nomeia o objeto desenha o objeto" — o
// "no phone" desenhava o celular; Boston, um TANQUE de melaço, recebia "no tanks"). 2º REJECT → segue a melhor das duas (nota
// do juiz) e registra. O juiz NUNCA impede a entrega: teto por chamada, por cena e por filme (como os 45 s do Omni), falha
// aberta em qualquer erro, disjuntor depois de 2 falhas seguidas.
// Custo (gpt-4o-mini, imagem detail 'low' ≈ 2.833 tokens): ≈ US$ 0,0005 por foto julgada sozinha, ≈ US$ 0,0009 com a foto da
// cena anterior junto; regeração FLUX dev 9:16 ≈ US$ 0,015. Típico (5-6 fotos, 1 regerada) ≈ US$ 0,02 por filme; o teto de
// tempo limita o pior caso a ~3 regerações ≈ US$ 0,06. Latência típica +1,5 a 3,5 s por foto julgada; teto de 45 s por filme.
// Este módulo é PURO (sem import): o guardião scripts/test-juiz-still-2026-10-06.mjs o executa em sandbox. A rota injeta o
// gerador de still e grava os eventos; o painel lê o resumo (lerResumoDoJuiz).

export const JUIZ_STILL_VERSAO = 'juiz_still_v1'
/** Um evento por foto julgada (veredito, motivo, regerou?, custo estimado, ms). session_id = generation_id. */
export const JUIZ_STILL_EVENTO = 'juiz_still'
/** Um evento por filme, depois do laço de cenas: é o que a aba /admin/coerencia mostra ao lado da nota. */
export const JUIZ_STILL_RESUMO_EVENTO = 'juiz_still_resumo'
/** As famílias em que o juiz roda. Começa só no Seedance 2.5 (fundador 06/10); abrir outra família = acrescentar aqui. */
export const JUIZ_STILL_FAMILIAS: readonly string[] = ['s25']
export const JUIZ_STILL_MODELO = 'gpt-4o-mini'
/** Teto de UMA chamada ao juiz (a chamada típica leva 1,5-3,5 s). */
export const JUIZ_STILL_TIMEOUT_MS = 6_000
/** Teto do juiz numa cena: julgar + regerar + julgar de novo. */
export const JUIZ_STILL_TETO_CENA_MS = 20_000
/** Teto do juiz no filme inteiro (o laço é serial e a rota tem 300 s) — o mesmo número das 2ªs chances de still do Omni. */
export const JUIZ_STILL_ORCAMENTO_FILME_MS = 45_000
/** Janela de espera da foto nova (a mesma do still do S25 na rota). */
export const JUIZ_STILL_JANELA_REGERACAO_MS = 9_000
/** Menos que isto de folga = não chama o juiz (a resposta não chegaria). */
export const JUIZ_STILL_MIN_CHAMADA_MS = 1_500
/** Menos que isto de folga = não regera (o FLUX dev de 28 passos leva 3-6 s; sobra para o 2º julgamento). */
export const JUIZ_STILL_MIN_REGERACAO_MS = 8_000
/** Falhas seguidas do juiz (timeout, HTTP, resposta ilegível) que desligam o juiz no resto do filme. */
export const JUIZ_STILL_FALHAS_PARA_DESLIGAR = 2
/** Uma foto nova FLUX dev 9:16 (576×1024 ≈ 0,59 MP × US$ 0,025/MP). Contada sempre que a regeração é pedida. */
export const JUIZ_STILL_REGERACAO_USD = 0.015
/** Tokens de entrada de UMA imagem detail 'low' no gpt-4o-mini (a mesma conta de lib/pixabay.ts, diretor que vê). */
export const JUIZ_TOKENS_POR_IMAGEM = 2833
export const JUIZ_USD_POR_TOKEN_ENTRADA = 0.15 / 1_000_000
export const JUIZ_USD_POR_TOKEN_SAIDA = 0.6 / 1_000_000
/** A foto da cena anterior vai junto (critério 4). Desligar = ~metade do custo, sem o critério de repetição por imagem. */
export const JUIZ_STILL_COMPARA_FOTO_ANTERIOR = true
/** Interruptor de emergência: KINEO_JUIZ_STILL=off desliga o juiz (o still segue como antes, byte a byte). */
export const JUIZ_STILL_LIGADO = !['0', 'false', 'no', 'off'].includes(
  (typeof process !== 'undefined' ? process.env.KINEO_JUIZ_STILL ?? '' : '').trim().toLowerCase(),
)

/** O juiz roda nesta família? Só as de JUIZ_STILL_FAMILIAS, e só com o interruptor ligado. */
export function juizStillLigado(family: string | null | undefined): boolean {
  return JUIZ_STILL_LIGADO && typeof family === 'string' && JUIZ_STILL_FAMILIAS.includes(family)
}

export type CriterioJuiz = 'anacronismo' | 'encara_camera' | 'texto' | 'repetida' | 'nenhum'
export type VereditoJuiz = 'OK' | 'REJECT' | 'ERRO' | 'PULADO'
export const ROTULO_CRITERIO: Record<CriterioJuiz, string> = {
  anacronismo: 'anacronismo',
  encara_camera: 'encara a câmera',
  texto: 'texto legível',
  repetida: 'igual à cena anterior',
  nenhum: '—',
}
const CRITERIO_DO_MODELO: Record<string, CriterioJuiz> = {
  anachronism: 'anacronismo',
  facing_camera: 'encara_camera',
  text: 'texto',
  repeat: 'repetida',
  none: 'nenhum',
}

const limpa = (t: string | null | undefined) => String(t ?? '').replace(/\s+/g, ' ').trim()

export type FotoAnterior = { cena: number; url: string; plano: string | null }
export type DescricaoAnterior = { cena: number; descricao: string }
export type EntradaJuiz = {
  /** índice 0-based da cena no plano */
  indice: number
  /** a foto-base a julgar (still FLUX da cena ou a foto de ambiente do filme) */
  url: string
  origem: 'still' | 'ambiente'
  /** o prompt com que a foto nasceu (hs.prompt) — a regeração parte dele */
  prompt: string
  /** o visual único da cena (s25Cena) — o que a cena deve mostrar; null = usa o prompt */
  nucleo: string | null
  /** a frase de época da cena ("Boston, 1919: period clothing…"); '' = filme sem época dita */
  epoca: string
  /** a narração da cena */
  fala: string
  /** o plano da cena (s25Cena.plano), para trocar de plano quando a foto repete a anterior */
  plano: string | null
  /** a foto-base mais recente das cenas anteriores (critério 4) */
  fotoAnterior: FotoAnterior | null
  /** o que as até 3 cenas anteriores mostram (texto) */
  descricoesAnteriores: DescricaoAnterior[]
  /** a semente do filme (a regeração usa outra, derivada dela) */
  seed: number
}

/**
 * As cenas anteriores para o juiz: a foto-base mais recente (qualquer cena antes desta que animou uma foto) e a descrição
 * das até 3 cenas imediatamente anteriores. `ancoras` = hSceneAnchors da rota (a image_url que de fato foi ao fornecedor).
 */
export function anterioresDoJuiz(
  indice: number,
  ancoras: ReadonlyArray<string | null | undefined>,
  descricoes: ReadonlyArray<string | null | undefined>,
  planos: ReadonlyArray<string | null | undefined>,
): { fotoAnterior: FotoAnterior | null; descricoesAnteriores: DescricaoAnterior[] } {
  let fotoAnterior: FotoAnterior | null = null
  for (let k = Math.min(indice, ancoras.length) - 1; k >= 0; k--) {
    const u = ancoras[k]
    if (typeof u === 'string' && u.length > 0) { fotoAnterior = { cena: k + 1, url: u, plano: planos[k] ?? null }; break }
  }
  const descricoesAnteriores: DescricaoAnterior[] = []
  for (let k = Math.max(0, indice - 3); k < indice; k++) {
    const d = limpa(descricoes[k]).slice(0, 220)
    if (d) descricoesAnteriores.push({ cena: k + 1, descricao: d })
  }
  return { fotoAnterior, descricoesAnteriores }
}

/** "Boston, 1919: period clothing, vehicles…" → "Boston, 1919" (o rótulo que o juiz e a regeração usam). */
export function rotuloDaEpoca(epoca: string | null | undefined): string {
  const e = limpa(epoca)
  if (!e) return ''
  const i = e.indexOf(': ')
  return (i > 0 ? e.slice(0, i) : e).replace(/[.\s]+$/, '').trim()
}

// ── 1. O PEDIDO AO JUIZ ──
export type ParteDoPedido = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } }
export type MensagemDoJuiz = { role: 'system' | 'user'; content: string | ParteDoPedido[] }

export const JUIZ_STILL_SISTEMA =
  'You check ONE photo before an image-to-video model animates it into a shot of a narrated documentary film. ' +
  'You only check objective defects that would ruin the shot; you never judge taste, beauty, style, lighting or composition. ' +
  'REJECT the photo only when at least one of these is CLEARLY true: ' +
  '(1) ANACHRONISM — clothing, objects, vehicles, signs or buildings that did not exist yet in the era and place of the scene (only when an era or place is known; weathered, rustic or simple things are fine); ' +
  '(2) FACING_CAMERA — a person looks straight into the lens or poses for the camera; ' +
  '(3) TEXT — legible letters, words, numbers or logos anywhere in the frame (illegible marks and blurred texture are fine); ' +
  '(4) REPEAT — only when the previous scene\'s photo is shown: this photo is essentially the same picture (same subject, same angle, same framing). ' +
  'Otherwise answer OK. When unsure, answer OK. ' +
  'Reply ONLY with JSON: {"verdict":"OK"|"REJECT","criterion":"none"|"anachronism"|"facing_camera"|"text"|"repeat",' +
  '"object":"<the wrong thing in 1-4 English words, empty when OK>",' +
  '"reason":"<max 15 words in Brazilian Portuguese, empty when OK>",' +
  '"fix":"<only for ANACHRONISM: what the frame should show in its place, max 20 English words, accurate to the era and place, describing only what to show — never the wrong thing, no negative words; else empty>",' +
  '"score":<0-100, how usable this photo is as the first frame of this scene>}'

/** O pedido ao juiz: a foto + época/lugar + o que a cena deve mostrar + a narração + as cenas anteriores (foto e texto). */
export function montarPedidoAoJuiz(e: EntradaJuiz, url: string): { messages: MensagemDoJuiz[]; imagens: number; caracteres: number } {
  const rotulo = rotuloDaEpoca(e.epoca)
  const mostra = limpa(e.nucleo || e.prompt).slice(0, 420)
  const linhas = [
    `SCENE ${e.indice + 1} (${e.origem === 'ambiente' ? 'the film\'s establishing photo of the place' : 'this scene\'s own photo'})`,
    `Era and place: ${rotulo || 'not stated — judge anachronism only against the story below'}`,
    `What the shot must show: ${mostra}`,
    `Narration heard during the shot: "${limpa(e.fala).slice(0, 300)}"`,
  ]
  if (e.descricoesAnteriores.length) linhas.push(`Earlier scenes: ${e.descricoesAnteriores.map((d) => `scene ${d.cena}: ${d.descricao}`).join(' | ')}`)
  const parts: ParteDoPedido[] = [{ type: 'text', text: linhas.join('\n') }, { type: 'text', text: `PHOTO TO CHECK (scene ${e.indice + 1}):` }, { type: 'image_url', image_url: { url, detail: 'low' } }]
  let imagens = 1
  const anterior = JUIZ_STILL_COMPARA_FOTO_ANTERIOR && e.fotoAnterior && e.fotoAnterior.url !== url ? e.fotoAnterior : null
  if (anterior) {
    parts.push({ type: 'text', text: `PREVIOUS SCENE'S PHOTO (scene ${anterior.cena}) — only for the REPEAT check, do not judge it:` })
    parts.push({ type: 'image_url', image_url: { url: anterior.url, detail: 'low' } })
    imagens++
  } else {
    parts.push({ type: 'text', text: 'No previous photo is shown: never use REPEAT.' })
  }
  const caracteres = JUIZ_STILL_SISTEMA.length + parts.reduce((s, p) => s + (p.type === 'text' ? p.text.length : 0), 0)
  return { messages: [{ role: 'system', content: JUIZ_STILL_SISTEMA }, { role: 'user', content: parts }], imagens, caracteres }
}

// ── 2. A RESPOSTA ──
export type RespostaDoJuiz = { veredito: 'OK' | 'REJECT'; criterio: CriterioJuiz; objeto: string; motivo: string; correcao: string; nota: number }
/**
 * Lê o JSON do juiz. null = resposta ilegível (vira ERRO, falha aberta). REJECT sem critério objetivo da lista (gosto) vira
 * OK; REJECT por repetição sem foto anterior mostrada também (o juiz não tinha como saber).
 */
export function lerRespostaDoJuiz(raw: string, comFotoAnterior: boolean): RespostaDoJuiz | null {
  let j: Record<string, unknown>
  try {
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null
    j = p as Record<string, unknown>
  } catch {
    return null
  }
  const v = String(j.verdict ?? '').trim().toUpperCase()
  if (v !== 'OK' && v !== 'REJECT') return null
  const criterio = CRITERIO_DO_MODELO[String(j.criterion ?? '').trim().toLowerCase()] ?? 'nenhum'
  const notaBruta = Number(j.score)
  const nota = Number.isFinite(notaBruta) ? Math.max(0, Math.min(100, Math.round(notaBruta))) : v === 'OK' ? 80 : 30
  const txt = (x: unknown, max: number) => limpa(typeof x === 'string' ? x : '').slice(0, max)
  const r: RespostaDoJuiz = { veredito: v, criterio, objeto: txt(j.object, 60), motivo: txt(j.reason, 160), correcao: txt(j.fix, 200), nota }
  if (r.veredito === 'REJECT' && (r.criterio === 'nenhum' || (r.criterio === 'repetida' && !comFotoAnterior))) {
    return { ...r, veredito: 'OK', motivo: r.motivo ? `recusa sem critério objetivo ignorada: ${r.motivo}`.slice(0, 160) : 'recusa sem critério objetivo ignorada' }
  }
  if (r.veredito === 'OK') return { ...r, criterio: 'nenhum' }
  return r
}

export type ChamadaDoJuiz = {
  veredito: VereditoJuiz
  criterio: CriterioJuiz
  objeto: string
  motivo: string
  correcao: string
  nota: number | null
  custoUsd: number
  ms: number
  imagens: number
  tokensEntrada: number | null
  tokensSaida: number | null
  erro: string | null
}

/** Custo da chamada: pelo `usage` da OpenAI quando veio; senão estimado (imagens × 2.833 + texto/4 de entrada, ~60 de saída). */
export function custoDoJuizUsd(usage: { prompt_tokens?: unknown; completion_tokens?: unknown } | null | undefined, imagens: number, caracteres: number): number {
  const entrada = Number(usage?.prompt_tokens)
  const saida = Number(usage?.completion_tokens)
  const e = Number.isFinite(entrada) && entrada > 0 ? entrada : imagens * JUIZ_TOKENS_POR_IMAGEM + Math.ceil(caracteres / 4)
  const s = Number.isFinite(saida) && saida > 0 ? saida : 60
  return Math.round((e * JUIZ_USD_POR_TOKEN_ENTRADA + s * JUIZ_USD_POR_TOKEN_SAIDA) * 1e6) / 1e6
}

/** Uma chamada ao juiz com teto próprio (AbortController). Nunca lança: qualquer falha = veredito ERRO com o motivo. */
export async function chamarJuiz(
  e: EntradaJuiz,
  url: string,
  opts: { timeoutMs: number; fetchImpl?: typeof fetch; apiKey?: string; agora?: () => number },
): Promise<ChamadaDoJuiz> {
  const agora = opts.agora ?? (() => Date.now())
  const t0 = agora()
  const { messages, imagens, caracteres } = montarPedidoAoJuiz(e, url)
  const comFotoAnterior = imagens > 1
  const base: ChamadaDoJuiz = { veredito: 'ERRO', criterio: 'nenhum', objeto: '', motivo: '', correcao: '', nota: null, custoUsd: 0, ms: 0, imagens, tokensEntrada: null, tokensSaida: null, erro: null }
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { ...base, erro: 'sem_chave', ms: agora() - t0 }
  const timeoutMs = Math.max(1, Math.floor(opts.timeoutMs))
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const doFetch = opts.fetchImpl ?? fetch
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: JUIZ_STILL_MODELO, temperature: 0, max_tokens: 180, response_format: { type: 'json_object' }, messages }),
    })
    if (!res.ok) return { ...base, erro: `http_${res.status}`, custoUsd: 0, ms: agora() - t0 }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const custoUsd = custoDoJuizUsd(data.usage, imagens, caracteres)
    const r = lerRespostaDoJuiz(data.choices?.[0]?.message?.content ?? '', comFotoAnterior)
    const tokens = { tokensEntrada: typeof data.usage?.prompt_tokens === 'number' ? data.usage.prompt_tokens : null, tokensSaida: typeof data.usage?.completion_tokens === 'number' ? data.usage.completion_tokens : null }
    if (!r) return { ...base, ...tokens, erro: 'resposta_ilegivel', custoUsd, ms: agora() - t0 }
    return { ...base, ...tokens, veredito: r.veredito, criterio: r.criterio, objeto: r.objeto, motivo: r.motivo, correcao: r.correcao, nota: r.nota, custoUsd, ms: agora() - t0 }
  } catch (err) {
    const nome = err instanceof Error ? err.name : ''
    // abortada pelo teto: a OpenAI pode ter cobrado a entrada — conta a estimativa (custo honesto, nunca subestimado)
    if (nome === 'AbortError' || nome === 'TimeoutError' || ctrl.signal.aborted) return { ...base, erro: `timeout_${timeoutMs}ms`, custoUsd: custoDoJuizUsd(null, imagens, caracteres), ms: agora() - t0 }
    return { ...base, erro: `fetch_${limpa(err instanceof Error ? err.message : String(err)).slice(0, 80)}`, ms: agora() - t0 }
  } finally {
    clearTimeout(timer)
  }
}

// ── 3. A REGERAÇÃO — o motivo vira instrução POSITIVA, sem o substantivo do objeto proibido ──
// Palavras de pessoa (a lista do detector de pessoa do S25 na rota + plurais): a correção do juiz não pode PÔR gente numa cena
// que não tinha — no S25 a cena com pessoa vai em t2v (hipótese do 422 do i2v com rosto, KINEO-S25-PESSOA-T2V-2026-09-15).
const PESSOA_RE = /\b(?:man|men|woman|women|person|persons|people|boy|boys|girl|girls|child|children|kids?|face|faces|hands?|figures?|crowds?|villagers?|workers?|engineers?|keepers?|sailors?|soldiers?|farmers?|scientists?|geologists?|watchmakers?|cartographers?|famil(?:y|ies)|he|she|his|her|they|them)\b/i
// Objeto que carrega texto: a correção não pode trocar um defeito por outro (letras inventadas).
const TEXTO_RE = /\b(?:signs?|signage|posters?|newspapers?|headlines?|labels?|banners?|billboards?|plaques?|inscriptions?|letters?|lettering|words?|text|writing|captions?|logos?)\b/i
// Negação: o motor não tem negative_prompt — "no X" desenha X.
const NEGACAO_RE = /\b(?:no|not|without|never|nothing|none|avoid|remove[sd]?|instead|rather|non|absent|lacking|free of)\b|n't\b/i

/** Radical grosseiro (cópia do de s25Cena/fidelidade — este módulo é puro): skyscrapers → skyscraper; jeans → jean. */
function radical(w: string): string {
  let v = w.toLowerCase()
  if (v.length > 5 && v.endsWith('ies')) v = v.slice(0, -3) + 'y'
  else if (v.length > 5 && v.endsWith('ing')) v = v.slice(0, -3)
  else if (v.length > 4 && v.endsWith('ed')) v = v.slice(0, -2)
  else if (v.length > 3 && v.endsWith('s') && !v.endsWith('ss')) v = v.slice(0, -1)
  if (v.length > 4 && v.endsWith('e')) v = v.slice(0, -1)
  return v
}
const palavrasDe = (t: string) => limpa(t).toLowerCase().replace(/[^a-zà-ÿ0-9\s-]/g, ' ').split(/[\s-]+/).filter((w) => w.length >= 3)
// Qualificador genérico não é o objeto: "modern car" proíbe "car", não "modern" (a frase de época do S25 já diz "no modern
// items"); "legible shop sign" proíbe "shop" e "sign".
const QUALIFICADORES = new Set(['modern', 'new', 'old', 'contemporary', 'current', 'recent', 'today', 'todays', 'big', 'small', 'large', 'huge',
  'tall', 'bright', 'visible', 'legible', 'readable', 'clear', 'shiny', 'colorful', 'colourful', 'anachronistic', 'wrong', 'out', 'place', 'the', 'and', 'with'])

/** Os radicais do objeto proibido ("glass skyscrapers" → glass, skyscraper) — nenhum pode ir para o que a regeração acrescenta. */
export function radicaisDoObjeto(objeto: string): string[] {
  return Array.from(new Set(palavrasDe(objeto).filter((w) => !QUALIFICADORES.has(w)).map(radical).filter((r) => r.length >= 3 && !QUALIFICADORES.has(r))))
}
/** Quantas palavras do texto são o objeto proibido (por radical). */
export function contaCitacoes(texto: string, objeto: string): number {
  const proibidos = new Set(radicaisDoObjeto(objeto))
  if (proibidos.size === 0) return 0
  return palavrasDe(texto).filter((w) => proibidos.has(radical(w))).length
}
/** O texto cita o objeto proibido (por radical)? */
export function citaObjeto(texto: string, objeto: string): boolean {
  return contaCitacoes(texto, objeto) > 0
}

/**
 * A correção do juiz (só anacronismo) só entra no prompt se for POSITIVA e segura: 3-25 palavras, sem negação, sem o objeto
 * proibido, sem objeto que carrega texto, e sem pôr gente onde a cena não tinha gente. Senão vale a frase padrão.
 */
export function correcaoValida(correcao: string, objeto: string, promptDaCena: string): boolean {
  const c = limpa(correcao)
  const n = c.split(/\s+/).filter(Boolean).length
  if (n < 3 || n > 25 || c.length > 200) return false
  if (/["“”]/.test(c)) return false
  if (NEGACAO_RE.test(c) || TEXTO_RE.test(c)) return false
  if (citaObjeto(c, objeto)) return false
  if (PESSOA_RE.test(c) && !PESSOA_RE.test(promptDaCena)) return false
  return true
}

/** A troca de plano para a foto que repetiu a anterior (frase de câmera, sem substantivo de coisa ou pessoa). */
export function planoNovoPara(planoAnterior: string | null, planoDaCena: string | null): string {
  const ref = planoAnterior && planoAnterior !== 'indefinido' ? planoAnterior : planoDaCena
  if (ref === 'aberto' || ref === 'aereo' || ref === 'alto') return 'an extreme close-up on one telling detail'
  if (ref === 'close' || ref === 'detalhe') return 'a wide view from far away'
  return 'a low-angle view from ground level'
}

/** A instrução da foto nova, por critério. Nunca nomeia o objeto proibido; nunca usa negação. */
export function instrucaoDeRegeracao(a: {
  criterio: CriterioJuiz
  correcao: string
  objeto: string
  epoca: string
  prompt: string
  plano: string | null
  planoAnterior: string | null
}): { instrucao: string; usouCorrecao: boolean } {
  if (a.criterio === 'anacronismo') {
    const rotulo = rotuloDaEpoca(a.epoca)
    const padrao = rotulo
      ? `Every detail in the frame true to ${rotulo}, built with the materials and craft of that time.`
      : 'Every detail in the frame true to the time and place of the story, built with the materials and craft of that time.'
    if (correcaoValida(a.correcao, a.objeto, a.prompt)) {
      const c = limpa(a.correcao).replace(/[.\s]+$/, '')
      return { instrucao: `${c.charAt(0).toUpperCase()}${c.slice(1)}. ${padrao}`, usouCorrecao: true }
    }
    return { instrucao: padrao, usouCorrecao: false }
  }
  if (a.criterio === 'encara_camera') return { instrucao: 'A candid moment seen from the side or from behind; nobody looks toward the lens or poses.', usouCorrecao: false }
  if (a.criterio === 'texto') return { instrucao: 'Every surface plain and unmarked.', usouCorrecao: false }
  if (a.criterio === 'repetida') return { instrucao: `Framed as ${planoNovoPara(a.planoAnterior, a.plano)}.`, usouCorrecao: false }
  return { instrucao: '', usouCorrecao: false }
}

/** O prompt da foto nova: o visual da cena primeiro, a instrução logo depois (onde a época mora no S25), o resto em seguida. */
export function promptDaRegeracao(prompt: string, nucleo: string | null, instrucao: string): string {
  const p = limpa(prompt)
  const n = limpa(nucleo)
  const i = limpa(instrucao)
  if (!i) return p
  if (n.length >= 8 && p.startsWith(n)) {
    let cabeca = n
    let resto = p.slice(n.length).trim()
    if (resto.startsWith('.')) { cabeca = `${n}.`; resto = resto.slice(1).trim() }
    if (!/[.!?]$/.test(cabeca)) cabeca = `${cabeca}.`
    return limpa(`${cabeca} ${i} ${resto}`)
  }
  return limpa(`${i} ${p}`)
}

/** Semente da foto nova: determinística (retentativa do mesmo filme refaz a mesma foto), diferente da do filme. */
export function seedDaRegeracao(seed: number, indice: number): number {
  const s = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 0
  return (s + 104_729 * (Math.max(0, Math.floor(indice)) + 1)) % 2_147_483_647
}

/** Qual foto segue: sem foto nova → a original; foto nova sem 2º veredito (erro/sem tempo) ou aprovada → a nova; as duas
 *  recusadas → a de nota maior (empate = a original, que tem a semente e a paleta do filme). */
export function escolherFoto(v1: ChamadaDoJuiz, v2: ChamadaDoJuiz | null, temRegerada: boolean): 'original' | 'regerada' {
  if (!temRegerada) return 'original'
  if (!v2 || v2.veredito !== 'REJECT') return 'regerada'
  return (v2.nota ?? 0) > (v1.nota ?? 0) ? 'regerada' : 'original'
}

// ── 4. O JULGAMENTO DE UMA FOTO (orquestra; nunca lança) ──
export type RelatoJuizStill = {
  versao: string
  cena: number
  origem: 'still' | 'ambiente'
  veredito: VereditoJuiz
  criterio: CriterioJuiz
  motivo: string
  objeto: string
  nota: number | null
  regerou: boolean
  regeracao_ok: boolean | null
  instrucao: string | null
  usou_correcao_do_juiz: boolean
  veredito_regerada: VereditoJuiz | null
  criterio_regerada: CriterioJuiz | null
  motivo_regerada: string | null
  nota_regerada: number | null
  escolhida: 'original' | 'regerada'
  custo_usd: number
  ms: number
  chamadas: number
  imagens: number
  modelo: string
  erro: string | null
  pulado_por: 'orcamento_filme' | 'teto_cena' | 'disjuntor' | null
  url_original: string
  url_final: string
}
export type FilmeDoJuiz = { gastoMs: number; falhasSeguidas: number; desligado: boolean; relatos: RelatoJuizStill[] }
export function novoFilmeDoJuiz(): FilmeDoJuiz {
  return { gastoMs: 0, falhasSeguidas: 0, desligado: false, relatos: [] }
}
export type DepsJuiz = {
  filme: FilmeDoJuiz
  /** gera a foto nova (na rota: generateCinematicSceneStill com o mesmo estilo do filme); null = falhou */
  gerarStill: (scenePrompt: string, seed: number, pollWindowMs: number) => Promise<string | null>
  fetchImpl?: typeof fetch
  apiKey?: string
  agora?: () => number
}

const arred = (x: number) => Math.round(x * 1e6) / 1e6

/**
 * Julga a foto-base de uma cena e decide qual foto segue para o vídeo. NUNCA lança e NUNCA devolve "sem foto": no pior caso
 * devolve a foto que recebeu. No máximo UMA regeração. Respeita o teto da cena e o orçamento do filme (estado em `d.filme`).
 */
export async function julgarFotoBase(e: EntradaJuiz, d: DepsJuiz): Promise<{ url: string; relato: RelatoJuizStill }> {
  const agora = d.agora ?? (() => Date.now())
  const t0 = agora()
  const filme = d.filme
  const r: RelatoJuizStill = {
    versao: JUIZ_STILL_VERSAO, cena: e.indice + 1, origem: e.origem, veredito: 'PULADO', criterio: 'nenhum', motivo: '', objeto: '', nota: null,
    regerou: false, regeracao_ok: null, instrucao: null, usou_correcao_do_juiz: false,
    veredito_regerada: null, criterio_regerada: null, motivo_regerada: null, nota_regerada: null,
    escolhida: 'original', custo_usd: 0, ms: 0, chamadas: 0, imagens: 0, modelo: JUIZ_STILL_MODELO, erro: null, pulado_por: null,
    url_original: e.url, url_final: e.url,
  }
  let url = e.url
  try {
    const prazoCena = t0 + JUIZ_STILL_TETO_CENA_MS
    const restanteFilme = () => JUIZ_STILL_ORCAMENTO_FILME_MS - filme.gastoMs - (agora() - t0)
    const restante = () => Math.min(prazoCena - agora(), restanteFilme())
    const quemLimita = (): 'orcamento_filme' | 'teto_cena' => (restanteFilme() <= prazoCena - agora() ? 'orcamento_filme' : 'teto_cena')
    if (filme.desligado) { r.pulado_por = 'disjuntor'; r.motivo = 'juiz desligado no filme depois de falhas seguidas'; return { url, relato: r } }
    if (restante() < JUIZ_STILL_MIN_CHAMADA_MS) { r.pulado_por = quemLimita(); r.motivo = 'sem tempo para julgar'; return { url, relato: r } }
    // Mesmo arquivo da foto anterior = repetição por construção (sem gastar o juiz).
    let v1: ChamadaDoJuiz
    if (e.fotoAnterior && e.fotoAnterior.url === e.url) {
      v1 = { veredito: 'REJECT', criterio: 'repetida', objeto: '', motivo: `a mesma foto da cena ${e.fotoAnterior.cena}`, correcao: '', nota: 0, custoUsd: 0, ms: 0, imagens: 0, tokensEntrada: null, tokensSaida: null, erro: null }
    } else {
      v1 = await chamarJuiz(e, e.url, { timeoutMs: Math.min(JUIZ_STILL_TIMEOUT_MS, restante()), fetchImpl: d.fetchImpl, apiKey: d.apiKey, agora })
      r.chamadas = 1
    }
    r.custo_usd = arred(r.custo_usd + v1.custoUsd)
    r.imagens += v1.imagens
    r.veredito = v1.veredito
    r.criterio = v1.criterio
    r.motivo = v1.motivo
    r.objeto = v1.objeto
    r.nota = v1.nota
    r.erro = v1.erro
    if (v1.veredito === 'ERRO') {
      filme.falhasSeguidas += 1
      if (filme.falhasSeguidas >= JUIZ_STILL_FALHAS_PARA_DESLIGAR) filme.desligado = true
      return { url, relato: r }
    }
    filme.falhasSeguidas = 0
    if (v1.veredito !== 'REJECT') return { url, relato: r }
    // REJECT — UMA foto nova, se houver tempo para gerar e julgar de novo.
    if (restante() < JUIZ_STILL_MIN_REGERACAO_MS) { r.pulado_por = quemLimita(); return { url, relato: r } }
    const planoAnterior = e.fotoAnterior?.plano ?? null
    const { instrucao, usouCorrecao } = instrucaoDeRegeracao({ criterio: v1.criterio, correcao: v1.correcao, objeto: v1.objeto, epoca: e.epoca, prompt: e.prompt, plano: e.plano, planoAnterior })
    if (!instrucao) return { url, relato: r }
    const promptNovo = promptDaRegeracao(e.prompt, e.nucleo, instrucao)
    r.regerou = true
    r.instrucao = instrucao.slice(0, 240)
    r.usou_correcao_do_juiz = usouCorrecao
    r.custo_usd = arred(r.custo_usd + JUIZ_STILL_REGERACAO_USD)
    let urlNova: string | null = null
    try {
      urlNova = await d.gerarStill(promptNovo, seedDaRegeracao(e.seed, e.indice), Math.max(1_000, Math.min(JUIZ_STILL_JANELA_REGERACAO_MS, restante() - JUIZ_STILL_MIN_CHAMADA_MS)))
    } catch {
      urlNova = null
    }
    r.regeracao_ok = typeof urlNova === 'string' && urlNova.length > 0
    if (!urlNova) return { url, relato: r }
    let v2: ChamadaDoJuiz | null = null
    if (restante() >= JUIZ_STILL_MIN_CHAMADA_MS) {
      v2 = await chamarJuiz(e, urlNova, { timeoutMs: Math.min(JUIZ_STILL_TIMEOUT_MS, restante()), fetchImpl: d.fetchImpl, apiKey: d.apiKey, agora })
      r.chamadas += 1
      r.custo_usd = arred(r.custo_usd + v2.custoUsd)
      r.imagens += v2.imagens
      r.veredito_regerada = v2.veredito
      r.criterio_regerada = v2.criterio
      r.motivo_regerada = v2.motivo || v2.erro || ''
      r.nota_regerada = v2.nota
    }
    r.escolhida = escolherFoto(v1, v2, true)
    if (r.escolhida === 'regerada') url = urlNova
    return { url, relato: r }
  } catch (err) {
    r.erro = `juiz_lancou: ${limpa(err instanceof Error ? err.message : String(err)).slice(0, 100)}`
    if (r.veredito === 'PULADO') r.veredito = 'ERRO'
    r.escolhida = 'original'
    url = e.url
    return { url, relato: r }
  } finally {
    r.ms = Math.max(0, agora() - t0)
    r.url_final = url
    filme.gastoMs += r.ms
    filme.relatos.push(r)
  }
}

// ── 5. O RESUMO DO FILME (evento juiz_still_resumo) e a leitura do painel ──
export type MotivoDoJuiz = { cena: number; origem: string; criterio: string; motivo: string; escolhida: string; veredito_regerada: string | null; motivo_regerada: string | null }
export type ResumoJuizStill = {
  versao: string
  cenas_no_filme: number
  fotos: number
  julgadas: number
  aprovadas: number
  recusadas: number
  regeradas: number
  regeracoes_falhas: number
  salvas: number
  com_defeito: number
  erros: number
  puladas: number
  motivos: MotivoDoJuiz[]
  custo_usd: number
  ms: number
  orcamento_ms: number
  orcamento_estourado: boolean
  disjuntor: boolean
}
/** O resumo por filme: quantas fotos o juiz viu, recusou, refez e salvou; os motivos; o custo e o tempo. */
export function resumoDoJuizStill(filme: FilmeDoJuiz, cenasNoFilme: number): ResumoJuizStill {
  const rs = filme.relatos
  const recusadas = rs.filter((r) => r.veredito === 'REJECT')
  return {
    versao: JUIZ_STILL_VERSAO,
    cenas_no_filme: cenasNoFilme,
    fotos: rs.length,
    julgadas: rs.filter((r) => r.veredito === 'OK' || r.veredito === 'REJECT').length,
    aprovadas: rs.filter((r) => r.veredito === 'OK').length,
    recusadas: recusadas.length,
    regeradas: rs.filter((r) => r.regerou).length,
    regeracoes_falhas: rs.filter((r) => r.regerou && r.regeracao_ok === false).length,
    salvas: recusadas.filter((r) => r.escolhida === 'regerada' && r.veredito_regerada === 'OK').length,
    com_defeito: recusadas.filter((r) => r.escolhida === 'original' || r.veredito_regerada === 'REJECT').length,
    erros: rs.filter((r) => r.veredito === 'ERRO').length,
    puladas: rs.filter((r) => r.veredito === 'PULADO').length,
    motivos: recusadas.slice(0, 12).map((r) => ({ cena: r.cena, origem: r.origem, criterio: r.criterio, motivo: r.motivo, escolhida: r.escolhida, veredito_regerada: r.veredito_regerada, motivo_regerada: r.motivo_regerada })),
    custo_usd: arred(rs.reduce((s, r) => s + r.custo_usd, 0)),
    ms: rs.reduce((s, r) => s + r.ms, 0),
    orcamento_ms: JUIZ_STILL_ORCAMENTO_FILME_MS,
    orcamento_estourado: rs.some((r) => r.pulado_por === 'orcamento_filme'),
    disjuntor: filme.desligado,
  }
}

export type JuizStillPainel = Omit<ResumoJuizStill, 'versao' | 'cenas_no_filme' | 'orcamento_ms'> & { versao: string }
/** Lê o resumo gravado (metadata do evento juiz_still_resumo) para a aba /admin/coerencia. Lixo/versão estranha = null. */
export function lerResumoDoJuiz(md: unknown): JuizStillPainel | null {
  if (!md || typeof md !== 'object' || Array.isArray(md)) return null
  const m = md as Record<string, unknown>
  if (typeof m.versao !== 'string' || !m.versao.startsWith('juiz_still')) return null
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0)
  const s = (x: unknown) => (typeof x === 'string' ? x : '')
  const motivos = Array.isArray(m.motivos)
    ? (m.motivos as unknown[]).slice(0, 12).flatMap((x) => {
        if (!x || typeof x !== 'object') return []
        const o = x as Record<string, unknown>
        return [{ cena: n(o.cena), origem: s(o.origem), criterio: s(o.criterio), motivo: s(o.motivo).slice(0, 160), escolhida: s(o.escolhida), veredito_regerada: typeof o.veredito_regerada === 'string' ? o.veredito_regerada : null, motivo_regerada: typeof o.motivo_regerada === 'string' ? o.motivo_regerada.slice(0, 160) : null }]
      })
    : []
  return {
    versao: m.versao,
    fotos: n(m.fotos),
    julgadas: n(m.julgadas),
    aprovadas: n(m.aprovadas),
    recusadas: n(m.recusadas),
    regeradas: n(m.regeradas),
    regeracoes_falhas: n(m.regeracoes_falhas),
    salvas: n(m.salvas),
    com_defeito: n(m.com_defeito),
    erros: n(m.erros),
    puladas: n(m.puladas),
    motivos,
    custo_usd: n(m.custo_usd),
    ms: n(m.ms),
    orcamento_estourado: m.orcamento_estourado === true,
    disjuntor: m.disjuntor === true,
  }
}
