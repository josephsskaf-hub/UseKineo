// ═══ KINEO-JUIZ-STILL-1410 [TRAVA 8.2 — vai do fundador 14/10 "tudo sim", melhoria nº 8] — o crítico do STILL antes do clipe pago ═══
// Cada cena ancorada nasce de um still FLUX (~US$ 0,015 de fal; contabilizado como ANCHORS_USD = 0,10) que vira o 1º quadro de
// um clipe image-to-video pago (Seedance 1.5 / Veo 3.1 / Kling 2.5 no caminho clássico; Kling 3 / H3 / Omni no hollywood). Um
// still com mão deformada, letreiro inventado, sujeito errado ou artefato vira um clipe pago com o mesmo defeito, e ninguém
// olhava a foto antes. O crítico de quadros do MP4 pronto é inviável (sem ffmpeg no servidor); o do STILL é viável: uma chamada
// de visão barata por foto, antes do POST do vídeo.
//
// O Seedance 2.5 (família s25) já tem o seu juiz (lib/hollywood/juizStill.ts, KINEO-JUIZ-STILL-2026-10-06: anacronismo, encara
// a câmera, texto legível, repetição) — este crítico NÃO roda no s25 (nada de juiz duplo nem regeração dupla). Os critérios
// daqui são os defeitos objetivos de geração: (1) anatomia deformada (mãos/rostos), (2) texto embaralhado/inventado,
// (3) sujeito errado para a fala, (4) artefato óbvio. Nunca gosto.
//
// MODO (env STILL_CRITIC_MODE): 'off' = nada roda (comportamento de antes, byte a byte); 'log_only' (PADRÃO) = julga e grava o
// evento cinematic_still_critic com veredito e motivos, mas NUNCA regera e a foto original segue sempre — para medir o falso
// positivo no tráfego real antes de ligar; 'enforce' = FAIL pede UMA foto nova (semente nova, instrução POSITIVA que não nomeia
// o defeito: "no X" desenha X), julga de novo se houver tempo e segue a melhor; no máximo 3 regerações por filme.
// KINEO-JUIZ-REFAZ-2810 [TRAVA 8.2 — vai do fundador 28/10 "o juiz tem de refazer até ficar bom"]: 'enforce' agora é um LAÇO —
// FAIL → foto nova → JULGA DE NOVO → ainda FAIL → segunda foto nova (instrução mais forte, derivada do MOTIVO do crítico e da cena
// inteira) → julga de novo. Até 2 fotos novas por cena (3 vereditos), 6 por filme, e segue a de MAIOR NOTA (aprovada > sem veredito >
// nota maior; empate = a original). Caso real: Gênesis 28/10 (dc4ac291) — original nota 20 "Main subject is not a cosmic galaxy", foto
// nova nota 30 FAIL, e a 30 FOI ENTREGUE porque 30 > 20 e não havia terceiro caminho. Com a folha (edit de US$ 0,15) fica em 1 foto nova.
// A rubrica ganhou o FAIL explícito para "mascote fofo no lugar do personagem pedido" e "personagem nomeado ausente".
// O crítico NUNCA segura o filme: teto por chamada (6 s), por cena (20 s), prazo absoluto do lote de stills (os 60 s do caminho
// clássico) ou orçamento por filme (45 s no hollywood), falha aberta em qualquer erro (a foto de antes segue), disjuntor depois
// de 2 erros. Timeout = a foto segue.
// Custo (gpt-4o-mini, imagem detail 'low' ≈ 2.833 tokens + ~450 de texto): ≈ US$ 0,0005 por foto julgada. Regeração FLUX dev
// 9:16 ≈ US$ 0,015 real (ANCHORS_USD conta 0,10 por prudência). Ver a estimativa por filme no relatório do commit.
// O modelo é o MESMO do juiz do s25 (JUIZ_STILL_MODELO): nenhuma string crua de modelo nova no código — a migração dos modelos
// da OpenAI (docs/MIGRACAO-MODELOS-OPENAI-2026-10-14.md, gpt-4o-mini sai em 14/01/2027) troca os dois juízes num lugar só.
// Este módulo só importa a constante do modelo; o resto é puro (o guardião scripts/test-juiz-still-1410.mjs o executa em sandbox).
import { JUIZ_STILL_MODELO } from '@/lib/hollywood/juizStill'

export const MARCA_CRITICO_STILL = 'KINEO-JUIZ-STILL-1410'
export const STILL_CRITIC_VERSAO = 'still_critic_v1'
/** Um evento por foto julgada. session_id = generation_id. */
export const STILL_CRITIC_EVENTO = 'cinematic_still_critic'
export const STILL_CRITIC_MODELO: string = JUIZ_STILL_MODELO
/** Teto de UMA chamada ao crítico (típico 1,5-3,5 s). */
export const STILL_CRITIC_TIMEOUT_MS = 6_000
/** Teto do crítico numa cena: julgar + regerar + julgar de novo (+ regerar + julgar). */
export const STILL_CRITIC_TETO_CENA_MS = 30_000 // KINEO-JUIZ-REFAZ-2810 — era 20 s (1 foto nova); 2 fotos novas = 3 vereditos (≈3 s) + 2 FLUX (≈5 s) ≈ 19-25 s
/** Orçamento do crítico no filme inteiro quando o laço é SERIAL (hollywood). No clássico vale o prazo absoluto dos stills. */
export const STILL_CRITIC_ORCAMENTO_SERIAL_MS = 45_000
/** Janela de espera da foto nova. */
export const STILL_CRITIC_JANELA_REGERACAO_MS = 9_000
/** Menos que isto de folga = não chama o crítico (a resposta não chegaria). */
export const STILL_CRITIC_MIN_CHAMADA_MS = 1_500
/** Menos que isto de folga = não regera (FLUX dev leva 3-6 s; sobra para o 2º julgamento). */
export const STILL_CRITIC_MIN_REGERACAO_MS = 8_000
/** Erros do crítico (timeout, HTTP, resposta ilegível) que desligam o crítico no resto do filme. */
export const STILL_CRITIC_ERROS_PARA_DESLIGAR = 2
/** Teto de regerações por filme (só 'enforce'): limita o custo no pior caso. */
export const STILL_CRITIC_MAX_REGERACOES_FILME = 6 // KINEO-JUIZ-REFAZ-2810 — era 3; 2 por cena × 3 cenas do filme grátis de 15 s (pior caso ≈ US$ 0,09 de FLUX + US$ 0,005 de crítico)
/** KINEO-JUIZ-REFAZ-2810 — fotos novas por CENA: 2 sem folha (FLUX, US$ 0,015 cada); 1 com folha (edit com referência, US$ 0,15). */
export const STILL_CRITIC_MAX_REGERACOES_CENA = 2 // KINEO-JUIZ-REFAZ-2810
export const STILL_CRITIC_MAX_REGERACOES_CENA_COM_FOLHA = 1 // KINEO-JUIZ-REFAZ-2810
/** Uma foto nova FLUX dev 9:16 (576×1024 ≈ 0,59 MP × US$ 0,025/MP). */
export const STILL_CRITIC_REGERACAO_USD = 0.015
export const STILL_CRITIC_TOKENS_POR_IMAGEM = 2833
export const STILL_CRITIC_USD_POR_TOKEN_ENTRADA = 0.15 / 1_000_000
export const STILL_CRITIC_USD_POR_TOKEN_SAIDA = 0.6 / 1_000_000

export type ModoCriticoStill = 'off' | 'log_only' | 'enforce'

/** STILL_CRITIC_MODE → modo. Vazio, ausente ou desconhecido = 'log_only' (o padrão seguro: mede, nunca regera). */
export function modoDoCriticoDoStill(valor?: string | null, padrao: ModoCriticoStill = 'log_only'): ModoCriticoStill { // KINEO-FILME15-FIEL-2610 — `padrao`: o que vale quando a env não decide (o filme grátis de 15 s pede 'enforce')
  const bruto = valor === undefined ? (typeof process !== 'undefined' ? process.env.STILL_CRITIC_MODE : undefined) : valor
  const v = String(bruto ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (v === 'off' || v === '0' || v === 'false' || v === 'no') return 'off'
  if (v === 'enforce') return 'enforce'
  if (v === 'log_only') return 'log_only' // KINEO-FILME15-FIEL-2610 — env explícita continua mandando
  return padrao // KINEO-FILME15-FIEL-2610 — era 'log_only' fixo; sem env, quem chama escolhe (pena dourada 26/10: porta nota 20 FAIL seguiu para o clipe)
}

/** O crítico roda nesta família hollywood? Nunca no s25 (já tem o juiz da foto-base, KINEO-JUIZ-STILL-2026-10-06). */
export function criticoNaFamiliaHollywood(family: string | null | undefined): boolean {
  return typeof family === 'string' && family.length > 0 && family !== 's25'
}

export type ProblemaStill = 'anatomia' | 'texto' | 'sujeito' | 'artefato' | 'identidade' // KINEO-META95-PERSONAGEM-2010 — 'identidade' só existe quando o pedido levou a folha (referencia)
const PROBLEMA_DO_MODELO: Record<string, ProblemaStill> = { anatomy: 'anatomia', text: 'texto', subject: 'sujeito', artifact: 'artefato', mascot: 'sujeito', missing: 'sujeito', missing_character: 'sujeito' } // KINEO-JUIZ-REFAZ-2810 — "mascot"/"missing" (se o modelo os escrever) são SUJEITO errado; era: só os 4
const PROBLEMA_IDENTIDADE: Record<string, ProblemaStill> = { identity: 'identidade' } // KINEO-META95-PERSONAGEM-2010 — lido SÓ com referência; sem ela "identity" segue ignorado (gosto), byte a byte o de antes
export type VereditoCritico = 'PASS' | 'FAIL' | 'ERRO' | 'PULADO'

const limpa = (t: string | null | undefined) => String(t ?? '').replace(/\s+/g, ' ').trim()
const arred = (x: number) => Math.round(x * 1e6) / 1e6

export type EntradaCritico = {
  /** índice 0-based da cena */
  indice: number
  /** o still a julgar */
  url: string
  /** o que a cena deve mostrar (o visual da cena) */
  mostra: string
  /** a narração da cena */
  fala: string
  /** o prompt com que o still nasceu — a regeração parte dele */
  prompt: string
  /** a semente do filme (a regeração usa outra, derivada dela) */
  seed: number
  /** KINEO-META95-PERSONAGEM-2010 — a folha de personagem (imagem de referência + descrição canônica): com ela o crítico recebe 2 imagens e o critério IDENTITY. Ausente = o pedido de sempre. */
  referencia?: { url: string; descricao: string } // KINEO-META95-PERSONAGEM-2010
}

// ── 1. O PEDIDO ──
export type ParteDoPedidoCritico = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } }
export type MensagemDoCritico = { role: 'system' | 'user'; content: string | ParteDoPedidoCritico[] }

export const STILL_CRITIC_SISTEMA =
  'You check ONE still image before an image-to-video model animates it into a shot of a narrated short film. ' +
  'You only flag objective generation defects that would visibly ruin the shot; you never judge taste, beauty, style, lighting, color or composition. ' +
  'FAIL the image only when at least one of these is CLEARLY true: ' +
  '(1) ANATOMY — a deformed human or animal body: extra, missing, fused or twisted fingers or limbs; a melted, duplicated or distorted face; impossible joints (small, distant or blurred figures are fine); ' +
  '(2) TEXT — garbled, misspelled, nonsense or invented letters, words, numbers or logos anywhere in the frame (blurred texture with no readable glyphs is fine); ' +
  '(3) SUBJECT — the main subject of the image is clearly not what the shot must show, judged against the description and the narration (another plausible angle of the same subject is fine); ' +
  // KINEO-JUIZ-REFAZ-2810 — o FAIL explícito do mascote e do personagem ausente (27-28/10: Krishna, Ghost Rider e Lucifer viraram o mesmo bichinho fofo; Amna e Baba Noor nunca apareceram)
  'this includes (3a) a requested named character, person, god, angel, demon, hero, animal or creature who is MISSING from the frame, and (3b) a cute cartoon mascot, plush toy, chibi or generic smiling creature standing in for the requested person, deity, mythical figure or named character (flag both as "subject"); ' + // KINEO-JUIZ-REFAZ-2810
  '(4) ARTIFACT — an obvious generation artifact: objects merged into each other, broken or impossible geometry, a split screen, collage or several panels, a border, a watermark, heavy smearing or noise, a blank or corrupted image. ' +
  'Otherwise answer PASS. When unsure, answer PASS. ' +
  'Reply ONLY with JSON: {"verdict":"PASS"|"FAIL","issues":[zero or more of "anatomy","text","subject","artifact"; empty when PASS],' +
  '"reason":"<max 15 English words, empty when PASS>","score":<0-100, how usable this image is as the first frame of this shot>}'

// KINEO-META95-PERSONAGEM-2010 — o 5º critério, anexado ao sistema SÓ quando o pedido traz a folha (lib/cinematic/folhaDePersonagem):
// KINEO-META95-PERSONAGEM-2010 — o Dino virou menino na cena 3 e o crítico de 4 critérios não tinha como dizer "é outro personagem".
export const STILL_CRITIC_IDENTIDADE = // KINEO-META95-PERSONAGEM-2010
  ' When a CHARACTER REFERENCE image is given, also apply (5) IDENTITY — the named character in the still is CLEARLY a different character from the reference: another species or kind of creature, a different sex or apparent age group, a clearly different body shape, different fur/skin/scale colour, different hair or a different outfit (a different pose, angle, expression, lighting or background is fine; the reference is a design sheet, not the shot). ' + // KINEO-META95-PERSONAGEM-2010
  'For (5) use the issue name "identity". Deliberate anatomy of a creature or mythical figure shown in the reference, such as the demon king Ravan with ten heads, is its identity and is not an anatomy defect.' // KINEO-META95-PERSONAGEM-AJUSTE-2010 — integração 21/10 (ideia da versão Codex): as 10 cabeças do Ravan não são defeito de anatomia; era: 'For (5) use the issue name "identity".'
/** O pedido ao crítico: a foto + o que a cena deve mostrar + a narração. Uma imagem só, detail 'low'. */
/** KINEO-JUIZ-REFAZ-2810 — o elenco nomeado que a rota pôs na frente do prompt (lib/cinematic/elencoEpoca CLAUSULA_ELENCO): o crítico precisa saber quem DEVE aparecer para reprovar "personagem ausente"/"mascote no lugar". '' = sem elenco no prompt. */
export function elencoNoPrompt(prompt: string): string { // KINEO-JUIZ-REFAZ-2810
  const m = /(?:Named )?[Cc]haracters? in this shot: (.+?) — clearly visible in frame/u.exec(String(prompt ?? '')) // KINEO-QUALIDADE-TODOS-MOTORES-2910 — unnamed possessive cast must reach the existing judge too.
  return m ? limpa(m[1]).slice(0, 320) : '' // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810
export function montarPedidoAoCritico(e: EntradaCritico, url: string): { messages: MensagemDoCritico[]; imagens: number; caracteres: number } {
  const elenco = elencoNoPrompt(e.prompt) // KINEO-JUIZ-REFAZ-2810
  const texto = [
    `SHOT ${e.indice + 1}`,
    `What the shot must show: ${limpa(e.mostra || e.prompt).slice(0, 420)}`,
    ...(elenco ? [`Named character(s) who MUST appear in this shot, exactly as described: ${elenco}`] : []), // KINEO-JUIZ-REFAZ-2810 — sem elenco no prompt: o texto de sempre, byte a byte
    `Narration heard during the shot: "${limpa(e.fala).slice(0, 300)}"`,
  ].join('\n')
  const parts: ParteDoPedidoCritico[] = [{ type: 'text', text: texto }, { type: 'image_url', image_url: { url, detail: 'low' } }]
  const sistema = e.referencia ? STILL_CRITIC_SISTEMA + STILL_CRITIC_IDENTIDADE : STILL_CRITIC_SISTEMA // KINEO-META95-PERSONAGEM-2010 — sem folha, o sistema de sempre
  const textoReferencia = e.referencia ? `CHARACTER REFERENCE (design sheet of the character who must appear in this shot, NOT the shot itself): ${limpa(e.referencia.descricao).slice(0, 400)}` : '' // KINEO-META95-PERSONAGEM-2010
  if (e.referencia) parts.splice(1, 0, { type: 'text', text: textoReferencia }, { type: 'image_url', image_url: { url: e.referencia.url, detail: 'low' } }, { type: 'text', text: `STILL TO CHECK (shot ${e.indice + 1}):` }) // KINEO-META95-PERSONAGEM-2010 — a folha vem ANTES do still, cada uma rotulada
  return { messages: [{ role: 'system', content: sistema }, { role: 'user', content: parts }], imagens: e.referencia ? 2 : 1, caracteres: sistema.length + texto.length + textoReferencia.length } // KINEO-META95-PERSONAGEM-2010 — era: sistema fixo, 1 imagem (sem folha, os mesmos números)
}

// ── 2. A RESPOSTA ──
export type RespostaDoCritico = { veredito: 'PASS' | 'FAIL'; problemas: ProblemaStill[]; motivo: string; nota: number }
/** Lê o JSON. null = ilegível (vira ERRO, falha aberta). FAIL sem nenhum problema da lista (gosto) vira PASS. */
export function lerRespostaDoCritico(raw: string, comIdentidade: boolean = false): RespostaDoCritico | null { // KINEO-META95-PERSONAGEM-2010 — `comIdentidade` (padrão false): só com a folha "identity" vira problema; era: (raw: string)
  let j: Record<string, unknown>
  try {
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null
    j = p as Record<string, unknown>
  } catch {
    return null
  }
  const v = String(j.verdict ?? '').trim().toUpperCase()
  if (v !== 'PASS' && v !== 'FAIL') return null
  const lista = Array.isArray(j.issues) ? j.issues : typeof j.issues === 'string' ? [j.issues] : []
  const problemas = Array.from(new Set(lista.map((x) => (comIdentidade ? { ...PROBLEMA_DO_MODELO, ...PROBLEMA_IDENTIDADE } : PROBLEMA_DO_MODELO)[String(x ?? '').trim().toLowerCase()]).filter((x): x is ProblemaStill => Boolean(x)))) // KINEO-META95-PERSONAGEM-2010 — era: só PROBLEMA_DO_MODELO
  const notaBruta = Number(j.score)
  const nota = Number.isFinite(notaBruta) ? Math.max(0, Math.min(100, Math.round(notaBruta))) : v === 'PASS' ? 80 : 30
  const motivo = limpa(typeof j.reason === 'string' ? j.reason : '').slice(0, 160)
  if (v === 'FAIL' && problemas.length === 0) return { veredito: 'PASS', problemas: [], motivo: motivo ? `recusa sem critério objetivo ignorada: ${motivo}`.slice(0, 160) : 'recusa sem critério objetivo ignorada', nota }
  if (v === 'PASS') return { veredito: 'PASS', problemas: [], motivo, nota }
  return { veredito: 'FAIL', problemas, motivo, nota }
}

export type ChamadaDoCritico = {
  veredito: VereditoCritico
  problemas: ProblemaStill[]
  motivo: string
  nota: number | null
  custoUsd: number
  ms: number
  erro: string | null
}

/** Custo: pelo `usage` quando veio; senão estimado (imagens × 2.833 + texto/4 de entrada, ~60 de saída). */
export function custoDoCriticoUsd(usage: { prompt_tokens?: unknown; completion_tokens?: unknown } | null | undefined, imagens: number, caracteres: number): number {
  const entrada = Number(usage?.prompt_tokens)
  const saida = Number(usage?.completion_tokens)
  const e = Number.isFinite(entrada) && entrada > 0 ? entrada : imagens * STILL_CRITIC_TOKENS_POR_IMAGEM + Math.ceil(caracteres / 4)
  const s = Number.isFinite(saida) && saida > 0 ? saida : 60
  return arred(e * STILL_CRITIC_USD_POR_TOKEN_ENTRADA + s * STILL_CRITIC_USD_POR_TOKEN_SAIDA)
}

/** Uma chamada com teto próprio (AbortController). Nunca lança: qualquer falha = ERRO com o motivo. */
export async function chamarCritico(
  e: EntradaCritico,
  url: string,
  opts: { timeoutMs: number; fetchImpl?: typeof fetch; apiKey?: string; agora?: () => number },
): Promise<ChamadaDoCritico> {
  const agora = opts.agora ?? (() => Date.now())
  const t0 = agora()
  const { messages, imagens, caracteres } = montarPedidoAoCritico(e, url)
  const base: ChamadaDoCritico = { veredito: 'ERRO', problemas: [], motivo: '', nota: null, custoUsd: 0, ms: 0, erro: null }
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
      body: JSON.stringify({ model: STILL_CRITIC_MODELO, temperature: 0, max_tokens: 120, response_format: { type: 'json_object' }, messages }),
    })
    if (!res.ok) return { ...base, erro: `http_${res.status}`, ms: agora() - t0 }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const custoUsd = custoDoCriticoUsd(data.usage, imagens, caracteres)
    const r = lerRespostaDoCritico(data.choices?.[0]?.message?.content ?? '', Boolean(e.referencia)) // KINEO-META95-PERSONAGEM-2010 — "identity" só conta com a folha; era: lerRespostaDoCritico(conteúdo)
    if (!r) return { ...base, erro: 'resposta_ilegivel', custoUsd, ms: agora() - t0 }
    return { ...base, veredito: r.veredito, problemas: r.problemas, motivo: r.motivo, nota: r.nota, custoUsd, ms: agora() - t0 }
  } catch (err) {
    const nome = err instanceof Error ? err.name : ''
    // abortada pelo teto: a entrada pode ter sido cobrada — conta a estimativa (custo nunca subestimado)
    if (nome === 'AbortError' || nome === 'TimeoutError' || ctrl.signal.aborted) return { ...base, erro: `timeout_${timeoutMs}ms`, custoUsd: custoDoCriticoUsd(null, imagens, caracteres), ms: agora() - t0 }
    return { ...base, erro: `fetch_${limpa(err instanceof Error ? err.message : String(err)).slice(0, 80)}`, ms: agora() - t0 }
  } finally {
    clearTimeout(timer)
  }
}

// ── 3. A REGERAÇÃO — instrução POSITIVA, sem nomear o defeito (o motor não tem negative: "no X" desenha X) ──
const INSTRUCAO: Record<ProblemaStill, string> = {
  sujeito: 'The main subject large, clear and centered in the frame, exactly as described.',
  anatomia: 'Natural anatomy: relaxed, well-formed hands and calm, naturally proportioned faces.',
  texto: 'Every surface plain and unmarked.',
  artefato: 'One clean, coherent photograph, every object whole, solid and separate.',
  identidade: 'The named character exactly as in the reference image: same species, body shape, colours, face, hair and outfit.', // KINEO-META95-PERSONAGEM-2010
}
const ORDEM: ProblemaStill[] = ['identidade', 'sujeito', 'anatomia', 'texto', 'artefato'] // KINEO-META95-PERSONAGEM-2010 — identidade primeiro (só existe com a folha); era: ['sujeito', 'anatomia', 'texto', 'artefato']

/** A instrução da foto nova: uma frase por problema, na ordem sujeito → anatomia → texto → artefato. '' = nada a refazer. */
export function instrucaoDoCritico(problemas: readonly ProblemaStill[]): string {
  return ORDEM.filter((p) => problemas.includes(p)).map((p) => INSTRUCAO[p]).join(' ')
}

// ═══ KINEO-JUIZ-REFAZ-2810 — a instrução MAIS FORTE da 2ª foto nova, derivada do MOTIVO do crítico (sempre positiva) ═══
// O crítico diz "Main subject is not a cosmic galaxy" / "The character is a lion, not a bear" / "Image does not depict Mishu, the tiny
// dragon" / "Missing charcoal and bones as described". Dali sai a EXIGÊNCIA ("a cosmic galaxy", "a bear", "Mishu, the tiny dragon") e
// ela entra como ordem positiva ("Required, large and unmistakable in frame: …"). Nunca "no X" — o motor não tem negative e desenha X.
// Só para SUJEITO/IDENTIDADE (num TEXTO embaralhado, "instead of 'Fjord'" pediria letreiro). Motivo sem padrão → só a instrução de sempre.
const EXIGENCIA_RES: ReadonlyArray<RegExp> = [ // KINEO-JUIZ-REFAZ-2810 — o artigo fica ("a cosmic galaxy"); só "the required/described" sai
  /,\s*not\s+([^.;:]+)/i, // KINEO-JUIZ-REFAZ-2810 — "is a lion, not a bear" / "shows arches, not stone foundations"
  /\b(?:is|are|was|were)\s+not\s+([^.;:]+)/i, // KINEO-JUIZ-REFAZ-2810 — "Main subject is not a cosmic galaxy"
  /\binstead of\s+([^.;:]+)/i, // KINEO-JUIZ-REFAZ-2810 — "shows a person instead of an aerial view"
  /\b(?:does|do|did)\s+not\s+(?:show|depict|include|contain|have|display|feature|present)\s+(?:the\s+(?:required|described|requested)\s+)?([^.;:]+)/i, // KINEO-JUIZ-REFAZ-2810 — "does not depict Mishu, the tiny dragon"
  /\b(?:missing|lacks?|lacking|without)\s+(?:the\s+(?:required|described|requested)\s+)?([^.;:]+)/i, // KINEO-JUIZ-REFAZ-2810 — "Missing charcoal and bones as described"
] // KINEO-JUIZ-REFAZ-2810
const EXIGENCIA_LIXO_RE = /^(?:description|the description|reference|the reference|character reference|required|as described|what the shot must show|the shot|the scene|the image|match(?:ing)?\b.*)$/i // KINEO-JUIZ-REFAZ-2810
/** A exigência positiva que o motivo do crítico carrega ("a cosmic galaxy"); null = o motivo não diz o que falta. */ // KINEO-JUIZ-REFAZ-2810
export function exigenciaDoMotivo(motivo: string | null | undefined): string | null { // KINEO-JUIZ-REFAZ-2810
  const m = limpa(motivo) // KINEO-JUIZ-REFAZ-2810
  if (!m) return null // KINEO-JUIZ-REFAZ-2810
  for (const re of EXIGENCIA_RES) { // KINEO-JUIZ-REFAZ-2810
    const x = re.exec(m)?.[1] // KINEO-JUIZ-REFAZ-2810
    if (!x) continue // KINEO-JUIZ-REFAZ-2810
    const alvo = limpa(x.replace(/\s+(?:as|like)\s+(?:described|required|requested|specified|in the (?:description|narration|shot|reference)).*$/i, '').replace(/\s+(?:in|from) the (?:image|frame|picture|still|shot)\b.*$/i, '').replace(/[.,;:!?]+$/, '')) // KINEO-JUIZ-REFAZ-2810
    if (alvo.length < 3 || alvo.length > 90) continue // KINEO-JUIZ-REFAZ-2810
    if (EXIGENCIA_LIXO_RE.test(alvo)) continue // KINEO-JUIZ-REFAZ-2810
    if (/\b(?:no|not|without|never|none|nothing)\b/i.test(alvo)) continue // KINEO-JUIZ-REFAZ-2810 — positiva sempre
    return alvo // KINEO-JUIZ-REFAZ-2810
  } // KINEO-JUIZ-REFAZ-2810
  return null // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810
/** A instrução da tentativa N: a de sempre (1ª) + a exigência do motivo (sujeito/identidade); na 2ª também a cena inteira ditada. '' = nada a refazer. */ // KINEO-JUIZ-REFAZ-2810
export function instrucaoDaTentativa(problemas: readonly ProblemaStill[], motivo: string | null | undefined, mostra: string | null | undefined, tentativa: number): string { // KINEO-JUIZ-REFAZ-2810
  const base = instrucaoDoCritico(problemas) // KINEO-JUIZ-REFAZ-2810
  if (!base) return '' // KINEO-JUIZ-REFAZ-2810
  const partes = [base] // KINEO-JUIZ-REFAZ-2810
  const exig = problemas.includes('sujeito') || problemas.includes('identidade') ? exigenciaDoMotivo(motivo) : null // KINEO-JUIZ-REFAZ-2810
  if (exig) partes.push(`Required, large and unmistakable in frame: ${exig}.`) // KINEO-JUIZ-REFAZ-2810
  if (tentativa >= 2) { const cena = limpa(mostra).replace(/[.\s]+$/, '').slice(0, 220); if (cena) partes.push(`This frame shows exactly this and nothing else: ${cena}.`) } // KINEO-JUIZ-REFAZ-2810 — 2ª foto nova: a cena inteira ditada (a 1ª só reforçou o sujeito e não bastou)
  return partes.join(' ') // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

/** O prompt da foto nova: a 1ª frase da cena (o visual) primeiro, a instrução logo depois, o resto em seguida. */
export function promptDaRegeracaoCritico(prompt: string, instrucao: string): string {
  const p = limpa(prompt)
  const i = limpa(instrucao)
  if (!i) return p
  const m = /^(.{8,}?[.!?])\s+(.*)$/.exec(p)
  if (m) return limpa(`${m[1]} ${i} ${m[2]}`)
  return limpa(`${p.replace(/[\s,;.]+$/, '')}. ${i}`)
}

/** Semente da foto nova: determinística (retentativa do mesmo filme refaz a mesma foto) e diferente da do filme. */
export function seedDaRegeracaoCritico(seed: number, indice: number, tentativa: number = 1): number { // KINEO-JUIZ-REFAZ-2810 — `tentativa` (1 = a de sempre, byte a byte; 2 = outra semente)
  const s = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 0
  const t = Math.max(1, Math.floor(Number.isFinite(tentativa) ? tentativa : 1)) // KINEO-JUIZ-REFAZ-2810
  return (s + 7_919 * (Math.max(0, Math.floor(indice)) + 1) + 15_485_863 * (t - 1)) % 2_147_483_647 // KINEO-JUIZ-REFAZ-2810 — era: (s + 7_919·(i+1)) % p
}

/** Qual foto segue: sem foto nova → a original; nova sem 2º veredito ou aprovada → a nova; as duas recusadas → nota maior
 *  (empate = a original, que tem a semente e a paleta do filme). */
export function escolherFotoCritico(v1: ChamadaDoCritico, v2: ChamadaDoCritico | null, temRegerada: boolean): 'original' | 'regerada' {
  if (!temRegerada) return 'original'
  if (!v2 || v2.veredito !== 'FAIL') return 'regerada'
  return (v2.nota ?? 0) > (v1.nota ?? 0) ? 'regerada' : 'original'
}

// ═══ KINEO-JUIZ-REFAZ-2810 — as TENTATIVAS de uma cena (original + até 2 fotos novas) e a escolha da melhor ═══
export type TentativaCritico = { // KINEO-JUIZ-REFAZ-2810
  /** 0 = original, 1 = 1ª foto nova, 2 = 2ª */ // KINEO-JUIZ-REFAZ-2810
  n: number // KINEO-JUIZ-REFAZ-2810
  origem: 'original' | 'regerada' // KINEO-JUIZ-REFAZ-2810
  /** null = a foto nova não saiu */ // KINEO-JUIZ-REFAZ-2810
  url: string | null // KINEO-JUIZ-REFAZ-2810
  veredito: VereditoCritico // KINEO-JUIZ-REFAZ-2810
  problemas: ProblemaStill[] // KINEO-JUIZ-REFAZ-2810
  motivo: string // KINEO-JUIZ-REFAZ-2810
  nota: number | null // KINEO-JUIZ-REFAZ-2810
  instrucao: string | null // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810
/**
 * Qual tentativa segue (índice n): uma APROVADA (a última, que é a mais recente); senão uma foto nova SEM veredito (timeout/erro do
 * crítico — a regra de antes: foto desconhecida vence a reprovada); senão a de MAIOR NOTA entre as que existem; empate = a mais antiga
 * (a original tem a semente e a paleta do filme). Nunca devolve uma tentativa sem foto.
 */ // KINEO-JUIZ-REFAZ-2810
export function escolherTentativaCritico(tentativas: ReadonlyArray<TentativaCritico>): number { // KINEO-JUIZ-REFAZ-2810
  const comFoto = tentativas.filter((t) => typeof t.url === 'string' && t.url.length > 0) // KINEO-JUIZ-REFAZ-2810
  if (comFoto.length === 0) return 0 // KINEO-JUIZ-REFAZ-2810
  const aprovadas = comFoto.filter((t) => t.veredito === 'PASS') // KINEO-JUIZ-REFAZ-2810
  if (aprovadas.length > 0) return aprovadas[aprovadas.length - 1].n // KINEO-JUIZ-REFAZ-2810
  const semVeredito = comFoto.filter((t) => t.n > 0 && t.veredito !== 'FAIL') // KINEO-JUIZ-REFAZ-2810
  if (semVeredito.length > 0) return semVeredito[semVeredito.length - 1].n // KINEO-JUIZ-REFAZ-2810
  let melhor = comFoto[0] // KINEO-JUIZ-REFAZ-2810
  for (const t of comFoto) if ((t.nota ?? 0) > (melhor.nota ?? 0)) melhor = t // KINEO-JUIZ-REFAZ-2810 — `>` estrito: empate fica com a mais antiga
  return melhor.n // KINEO-JUIZ-REFAZ-2810
} // KINEO-JUIZ-REFAZ-2810

// KINEO-JUIZ-ESTADOS-3010 — score ranks rejected candidates; it never grants approval.
export type EstadoFinalStill = 'PASS' | 'BEST_FAIL' | 'UNVERIFIED'
export type DecisaoFinalStill = {
  estado_final: EstadoFinalStill
  veredito_final: VereditoCritico
  nota_final: number | null
  aprovado_final: boolean
  regra_seguimento: 'animate_approved' | 'animate_degraded' | 'animate_unverified'
}
/** Preserve today's fail-open delivery policy until visual calibration supports a new gate.
 * Only PASS can become an approved reference. A higher FAIL score stays BEST_FAIL;
 * off/timeouts/skips stay UNVERIFIED. Neither changes the financial finalizer. */
export function decisaoFinalStill(veredito: VereditoCritico, nota: number | null): DecisaoFinalStill {
  const estado = veredito === 'PASS' ? 'PASS' : veredito === 'FAIL' ? 'BEST_FAIL' : 'UNVERIFIED'
  return { estado_final: estado, veredito_final: veredito, nota_final: nota, aprovado_final: estado === 'PASS',
    regra_seguimento: estado === 'PASS' ? 'animate_approved' : estado === 'BEST_FAIL' ? 'animate_degraded' : 'animate_unverified' }
}
/** Exact selected URL and attempt, including early returns (off, no budget, timeout). */
export function decisaoDaEscolhaCritico(r: Pick<RelatoCriticoStill, 'tentativas' | 'escolhida_tentativa' | 'url_final' | 'veredito'>): DecisaoFinalStill {
  const t = r.tentativas.find(t => t.n === r.escolhida_tentativa && t.url === r.url_final)
  return decisaoFinalStill(t?.veredito ?? (r.veredito === 'ERRO' ? 'ERRO' : 'PULADO'), t?.nota ?? null)
}

export type EvidenciaStillFinal = { cena: number; url: string | null; veredito: string | null; nota?: number | null }
/** The signed claim describes the frames actually dispatched, including a discarded sheet,
 * a late judge whose replacement was not used, or a text-to-video fallback. No new calls. */
export function relatoStillNoClaim(response: Record<string, unknown>, relatos: readonly RelatoCriticoStill[], extras: readonly EvidenciaStillFinal[] = []) {
  const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
  const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : []
  const trial = arr(obj(response.kling4_trial).scene_plan)
  const anchors = arr(response.scene_anchor_urls), inputs = arr(response.scene_fal_inputs)
  const urls = trial.length ? trial.map(s => obj(s).still_url)
    : Array.from({ length: Math.max(anchors.length, inputs.length, arr(response.scenes).length) }, (_, i) => {
      const input = inputs[i]
      // An exact t2v payload overrides a stale planned anchor too: no image was sent.
      if (input && typeof input === 'object' && !Array.isArray(input)) return obj(input).image_url ?? obj(input).start_image_url ?? null
      return anchors[i] ?? null // Historical claims without a recorded input retain their anchor evidence.
    })
  return { versao: 'still_decision_3010_v1', politica: 'preserve_delivery_only_pass_is_approved',
    cenas: urls.map((value, i) => {
      const url = typeof value === 'string' && value ? value : null
      const extra = [...extras].reverse().find(e => e.cena === i + 1 && e.url === url && url)
      const tentativa = [...relatos].reverse().filter(r => r.cena === i + 1).flatMap(r => [...r.tentativas].reverse()).find(t => t.url === url && url)
      const raw = (extra ? extra.veredito : tentativa?.veredito) ?? 'PULADO'
      const veredito = raw === 'PASS' || raw === 'FAIL' || raw === 'ERRO' ? raw : 'PULADO'
      return { cena: i + 1, url_final: url, ...decisaoFinalStill(veredito, (extra ? extra.nota : tentativa?.nota) ?? null),
        motivo_seguimento: !url ? 'no_still_text_to_video' : veredito === 'PASS' ? 'exact_frame_pass'
          : veredito === 'FAIL' ? 'best_available_fail_not_approved' : 'judge_unavailable_or_not_finished' }
    }),
  }
}

// ── 4. O JULGAMENTO DE UM STILL (orquestra; nunca lança) ──
export type PuladoPor = 'prazo' | 'teto_cena' | 'orcamento_filme' | 'disjuntor' | 'teto_regeracoes' | 'modo_log_only' | null
export type RelatoCriticoStill = DecisaoFinalStill & {
  versao: string
  modo: ModoCriticoStill
  cena: number
  veredito: VereditoCritico
  problemas: ProblemaStill[]
  motivo: string
  nota: number | null
  /** o veredito pediria foto nova (FAIL) — em log_only é a medida do que o enforce faria */
  regeraria: boolean
  regerou: boolean
  regeracao_ok: boolean | null
  /** KINEO-META95-PERSONAGEM-AJUSTE-2010 — por que a foto nova saiu ou não ('ok', 'provider_timeout', 'moderation_blocked', 'sem_url', 'lancou'…); só existe quando o chamador pede (relatarMotivo). */ // KINEO-META95-PERSONAGEM-AJUSTE-2010
  regeracao_motivo?: string // KINEO-META95-PERSONAGEM-AJUSTE-2010
  instrucao: string | null
  veredito_regerada: VereditoCritico | null
  problemas_regerada: ProblemaStill[] | null
  nota_regerada: number | null
  escolhida: 'original' | 'regerada'
  custo_usd: number
  ms: number
  chamadas: number
  modelo: string
  erro: string | null
  pulado_por: PuladoPor
  url_original: string
  url_final: string
  // KINEO-JUIZ-REFAZ-2810 — o laço: cada tentativa (original + fotos novas), as notas, quantas fotos novas saíram, qual seguiu e o que as fotos novas custaram
  regeracoes: number // KINEO-JUIZ-REFAZ-2810
  custo_regeracoes_usd: number // KINEO-JUIZ-REFAZ-2810
  tentativas: TentativaCritico[] // KINEO-JUIZ-REFAZ-2810
  notas: Array<number | null> // KINEO-JUIZ-REFAZ-2810
  /** 0 = a original seguiu; 1/2 = a 1ª/2ª foto nova */ // KINEO-JUIZ-REFAZ-2810
  escolhida_tentativa: number // KINEO-JUIZ-REFAZ-2810
}
export type FilmeDoCritico = {
  modo: ModoCriticoStill
  /** prazo absoluto (ms de relógio) — o fim do lote de stills no clássico; Infinity = sem prazo absoluto */
  prazo: number
  /** orçamento acumulado (ms) — o laço serial do hollywood; Infinity = sem orçamento acumulado */
  orcamentoMs: number
  gastoMs: number
  erros: number
  desligado: boolean
  regeracoesRestantes: number
  relatos: RelatoCriticoStill[]
}
export function novoFilmeDoCritico(modo: ModoCriticoStill, o: { prazo?: number; orcamentoMs?: number } = {}): FilmeDoCritico {
  return {
    modo,
    prazo: typeof o.prazo === 'number' && Number.isFinite(o.prazo) ? o.prazo : Infinity,
    orcamentoMs: typeof o.orcamentoMs === 'number' && Number.isFinite(o.orcamentoMs) ? o.orcamentoMs : Infinity,
    gastoMs: 0,
    erros: 0,
    desligado: false,
    regeracoesRestantes: STILL_CRITIC_MAX_REGERACOES_FILME,
    relatos: [],
  }
}
export type DepsCritico = {
  filme: FilmeDoCritico
  /** gera a foto nova (na rota: generateCinematicSceneStill com o mesmo estilo do filme); null = falhou */
  gerarStill: (scenePrompt: string, seed: number, pollWindowMs: number) => Promise<string | null | { url: string | null; motivo?: string | null }> // KINEO-META95-PERSONAGEM-AJUSTE-2010 — era: Promise<string | null>; o objeto traz o motivo da falha (o edit com folha)
  /** KINEO-META95-PERSONAGEM-AJUSTE-2010 — janelas por filme: o crítico nasceu medido no FLUX dev (3-6 s); o edit com folha leva 15-40 s e nunca cabia em 9 s. Ausentes = as de sempre. */ // KINEO-META95-PERSONAGEM-AJUSTE-2010
  tetoCenaMs?: number // KINEO-META95-PERSONAGEM-AJUSTE-2010
  janelaRegeracaoMs?: number // KINEO-META95-PERSONAGEM-AJUSTE-2010
  minRegeracaoMs?: number // KINEO-META95-PERSONAGEM-AJUSTE-2010
  /** KINEO-META95-PERSONAGEM-AJUSTE-2010 — grava `regeracao_motivo` no relato (só a folha pede; sem isto o relato é byte a byte o de antes). */ // KINEO-META95-PERSONAGEM-AJUSTE-2010
  relatarMotivo?: boolean // KINEO-META95-PERSONAGEM-AJUSTE-2010
  /** KINEO-JUIZ-REFAZ-2810 — fotos novas por cena. Ausente: 2 sem folha (FLUX), 1 com folha (edit de US$ 0,15). 0 = julga e nunca refaz. */ // KINEO-JUIZ-REFAZ-2810
  maxRegeracoesCena?: number // KINEO-JUIZ-REFAZ-2810
  fetchImpl?: typeof fetch
  apiKey?: string
  agora?: () => number
}

/**
 * Julga o still de uma cena e decide qual foto segue. NUNCA lança e NUNCA devolve "sem foto": no pior caso devolve a que
 * recebeu. 'off' não chama nada. 'log_only' julga e devolve SEMPRE a original. 'enforce': no máximo UMA regeração.
 * Respeita o teto da cena, o prazo absoluto e o orçamento do filme (estado em `d.filme`).
 */
export async function criticarStill(e: EntradaCritico, d: DepsCritico): Promise<{ url: string; relato: RelatoCriticoStill }> {
  const agora = d.agora ?? (() => Date.now())
  const t0 = agora()
  const filme = d.filme
  const r: RelatoCriticoStill = {
    ...decisaoFinalStill('PULADO', null),
    versao: STILL_CRITIC_VERSAO, modo: filme.modo, cena: e.indice + 1, veredito: 'PULADO', problemas: [], motivo: '', nota: null,
    regeraria: false, regerou: false, regeracao_ok: null, instrucao: null, veredito_regerada: null, problemas_regerada: null, nota_regerada: null,
    escolhida: 'original', custo_usd: 0, ms: 0, chamadas: 0, modelo: STILL_CRITIC_MODELO, erro: null, pulado_por: null,
    url_original: e.url, url_final: e.url,
    regeracoes: 0, custo_regeracoes_usd: 0, tentativas: [], notas: [], escolhida_tentativa: 0, // KINEO-JUIZ-REFAZ-2810
  }
  let url = e.url
  if (filme.modo === 'off') return { url, relato: r }
  try {
    const prazoCena = t0 + (typeof d.tetoCenaMs === 'number' && d.tetoCenaMs > 0 ? d.tetoCenaMs : STILL_CRITIC_TETO_CENA_MS) // KINEO-META95-PERSONAGEM-AJUSTE-2010 — era: t0 + STILL_CRITIC_TETO_CENA_MS
    const folgas = () => {
      const t = agora()
      return { prazo: filme.prazo - t, teto_cena: prazoCena - t, orcamento_filme: filme.orcamentoMs - filme.gastoMs - (t - t0) }
    }
    const restante = () => { const f = folgas(); return Math.min(f.prazo, f.teto_cena, f.orcamento_filme) }
    const quemLimita = (): 'prazo' | 'teto_cena' | 'orcamento_filme' => {
      const f = folgas()
      return f.prazo <= f.teto_cena && f.prazo <= f.orcamento_filme ? 'prazo' : f.orcamento_filme <= f.teto_cena ? 'orcamento_filme' : 'teto_cena'
    }
    if (filme.desligado) { r.pulado_por = 'disjuntor'; r.motivo = 'crítico desligado no filme depois de erros'; return { url, relato: r } }
    if (restante() < STILL_CRITIC_MIN_CHAMADA_MS) { r.pulado_por = quemLimita(); r.motivo = 'sem tempo para julgar'; return { url, relato: r } }
    const v1 = await chamarCritico(e, e.url, { timeoutMs: Math.min(STILL_CRITIC_TIMEOUT_MS, restante()), fetchImpl: d.fetchImpl, apiKey: d.apiKey, agora })
    r.chamadas = 1
    r.custo_usd = arred(r.custo_usd + v1.custoUsd)
    r.veredito = v1.veredito
    r.problemas = v1.problemas
    r.motivo = v1.motivo
    r.nota = v1.nota
    r.erro = v1.erro
    r.tentativas.push({ n: 0, origem: 'original', url: e.url, veredito: v1.veredito, problemas: v1.problemas, motivo: v1.motivo, nota: v1.nota, instrucao: null }) // KINEO-JUIZ-REFAZ-2810
    r.notas.push(v1.nota) // KINEO-JUIZ-REFAZ-2810
    if (v1.veredito === 'ERRO') {
      filme.erros += 1
      if (filme.erros >= STILL_CRITIC_ERROS_PARA_DESLIGAR) filme.desligado = true
      return { url, relato: r }
    }
    if (v1.veredito !== 'FAIL') return { url, relato: r }
    r.regeraria = true
    // log_only: mede e devolve a original — NUNCA regera.
    if (filme.modo !== 'enforce') { r.pulado_por = 'modo_log_only'; return { url, relato: r } }
    if (filme.regeracoesRestantes <= 0) { r.pulado_por = 'teto_regeracoes'; return { url, relato: r } }
    if (restante() < (typeof d.minRegeracaoMs === 'number' && d.minRegeracaoMs > 0 ? d.minRegeracaoMs : STILL_CRITIC_MIN_REGERACAO_MS)) { r.pulado_por = quemLimita(); if (d.relatarMotivo) r.regeracao_motivo = `sem_tempo:${r.pulado_por}`; return { url, relato: r } } // KINEO-META95-PERSONAGEM-AJUSTE-2010 — era: restante() < STILL_CRITIC_MIN_REGERACAO_MS
    const instrucao = instrucaoDoCritico(v1.problemas)
    if (!instrucao) return { url, relato: r }
    // ═══ KINEO-JUIZ-REFAZ-2810 — O LAÇO: foto nova → julga de novo → ainda FAIL → 2ª foto nova (instrução mais forte) → julga de novo ═══
    // Antes: UMA foto nova e "a melhor das duas" — a melhor de duas reprovadas ainda era o mascote (Gênesis 28/10: 20 → 30 FAIL, a 30 foi entregue).
    const maxCena = Math.max(0, Math.floor(typeof d.maxRegeracoesCena === 'number' && Number.isFinite(d.maxRegeracoesCena) ? d.maxRegeracoesCena : e.referencia ? STILL_CRITIC_MAX_REGERACOES_CENA_COM_FOLHA : STILL_CRITIC_MAX_REGERACOES_CENA)) // KINEO-JUIZ-REFAZ-2810
    const minRegeracaoMs = typeof d.minRegeracaoMs === 'number' && d.minRegeracaoMs > 0 ? d.minRegeracaoMs : STILL_CRITIC_MIN_REGERACAO_MS // KINEO-JUIZ-REFAZ-2810
    const janelaMs = typeof d.janelaRegeracaoMs === 'number' && d.janelaRegeracaoMs > 0 ? d.janelaRegeracaoMs : STILL_CRITIC_JANELA_REGERACAO_MS // KINEO-JUIZ-REFAZ-2810
    let atual: ChamadaDoCritico = v1 // KINEO-JUIZ-REFAZ-2810 — o último veredito; o laço só continua enquanto for FAIL
    for (let n = 1; n <= maxCena && atual.veredito === 'FAIL'; n++) { // KINEO-JUIZ-REFAZ-2810
      if (n > 1 && (filme.regeracoesRestantes <= 0 || restante() < minRegeracaoMs)) break // KINEO-JUIZ-REFAZ-2810 — a 1ª já foi conferida acima (teto e folga); a 2ª confere de novo e para em silêncio
      const instrucaoN = instrucaoDaTentativa(atual.problemas, atual.motivo, e.mostra || e.prompt, n) // KINEO-JUIZ-REFAZ-2810 — 1ª: a de sempre (+ exigência do motivo); 2ª: + a cena inteira ditada
      if (!instrucaoN) break // KINEO-JUIZ-REFAZ-2810
      filme.regeracoesRestantes -= 1 // reservado ANTES do await: tarefas paralelas do mesmo filme não passam do teto
      r.regerou = true
      if (n === 1) { r.instrucao = instrucaoN.slice(0, 240); r.regeracao_ok = false } // KINEO-JUIZ-REFAZ-2810 — `instrucao` do relato = a da 1ª foto nova (como antes); as demais ficam em `tentativas`
      r.regeracoes = n // KINEO-JUIZ-REFAZ-2810
      r.custo_usd = arred(r.custo_usd + STILL_CRITIC_REGERACAO_USD)
      r.custo_regeracoes_usd = arred(r.custo_regeracoes_usd + STILL_CRITIC_REGERACAO_USD) // KINEO-JUIZ-REFAZ-2810
      let urlNova: string | null = null
      try {
        const saida = await d.gerarStill(promptDaRegeracaoCritico(e.prompt, instrucaoN), seedDaRegeracaoCritico(e.seed, e.indice, n), Math.max(1_000, Math.min(janelaMs, restante() - STILL_CRITIC_MIN_CHAMADA_MS))) // KINEO-META95-PERSONAGEM-AJUSTE-2010 · KINEO-JUIZ-REFAZ-2810 — semente própria por tentativa
        urlNova = typeof saida === 'string' ? saida : saida && typeof saida === 'object' && typeof saida.url === 'string' ? saida.url : null // KINEO-META95-PERSONAGEM-AJUSTE-2010
        if (d.relatarMotivo) r.regeracao_motivo = saida && typeof saida === 'object' && typeof saida.motivo === 'string' && saida.motivo ? saida.motivo.slice(0, 60) : urlNova ? 'ok' : 'sem_url' // KINEO-META95-PERSONAGEM-AJUSTE-2010
      } catch {
        urlNova = null
        if (d.relatarMotivo) r.regeracao_motivo = 'lancou' // KINEO-META95-PERSONAGEM-AJUSTE-2010
      }
      if (!urlNova) { r.tentativas.push({ n, origem: 'regerada', url: null, veredito: 'PULADO', problemas: [], motivo: 'foto nova não saiu', nota: null, instrucao: instrucaoN.slice(0, 240) }); r.notas.push(null); break } // KINEO-JUIZ-REFAZ-2810 — gerador falhou/estourou a janela: não insiste (a 2ª falharia igual e o prazo acabaria)
      r.regeracao_ok = true // KINEO-JUIZ-REFAZ-2810 — ao menos uma foto nova saiu
      if (restante() < STILL_CRITIC_MIN_CHAMADA_MS) { r.tentativas.push({ n, origem: 'regerada', url: urlNova, veredito: 'PULADO', problemas: [], motivo: 'sem tempo para julgar', nota: null, instrucao: instrucaoN.slice(0, 240) }); r.notas.push(null); break } // KINEO-JUIZ-REFAZ-2810 — foto nova sem 2º veredito: segue (regra de antes), o laço para
      const vN = await chamarCritico(e, urlNova, { timeoutMs: Math.min(STILL_CRITIC_TIMEOUT_MS, restante()), fetchImpl: d.fetchImpl, apiKey: d.apiKey, agora }) // KINEO-JUIZ-REFAZ-2810 — JULGA DE NOVO, sempre que há tempo
      r.chamadas += 1
      r.custo_usd = arred(r.custo_usd + vN.custoUsd)
      r.tentativas.push({ n, origem: 'regerada', url: urlNova, veredito: vN.veredito, problemas: vN.problemas, motivo: vN.motivo, nota: vN.nota, instrucao: instrucaoN.slice(0, 240) }) // KINEO-JUIZ-REFAZ-2810
      r.notas.push(vN.nota) // KINEO-JUIZ-REFAZ-2810
      if (vN.veredito === 'ERRO') { filme.erros += 1; if (filme.erros >= STILL_CRITIC_ERROS_PARA_DESLIGAR) filme.desligado = true; break } // KINEO-JUIZ-REFAZ-2810 — crítico caiu na foto nova: ela segue sem veredito (regra de antes) e o laço para
      atual = vN // KINEO-JUIZ-REFAZ-2810
    } // KINEO-JUIZ-REFAZ-2810
    r.escolhida_tentativa = escolherTentativaCritico(r.tentativas) // KINEO-JUIZ-REFAZ-2810 — aprovada > foto nova sem veredito > maior nota (empate = original)
    r.escolhida = r.escolhida_tentativa === 0 ? 'original' : 'regerada' // KINEO-JUIZ-REFAZ-2810
    const ref = (r.escolhida_tentativa > 0 ? r.tentativas[r.escolhida_tentativa] : [...r.tentativas].reverse().find((t) => t.n > 0 && t.url)) ?? null // KINEO-JUIZ-REFAZ-2810 — os campos antigos (veredito_regerada…) descrevem a foto nova que SEGUIU; sem escolha, a última que saiu
    if (ref) { r.veredito_regerada = ref.veredito === 'PULADO' ? null : ref.veredito; r.problemas_regerada = ref.veredito === 'PULADO' ? null : ref.problemas; r.nota_regerada = ref.nota } // KINEO-JUIZ-REFAZ-2810 — PULADO = sem 2º veredito (null, como antes)
    if (r.escolhida_tentativa > 0) url = r.tentativas[r.escolhida_tentativa].url as string // KINEO-JUIZ-REFAZ-2810
    return { url, relato: r }
  } catch (err) {
    r.erro = `critico_lancou: ${limpa(err instanceof Error ? err.message : String(err)).slice(0, 100)}`
    if (r.veredito === 'PULADO') r.veredito = 'ERRO'
    r.escolhida = 'original'
    r.escolhida_tentativa = 0 // KINEO-JUIZ-ESTADOS-3010 — catch returns the original, never a stale selected index.
    url = e.url
    return { url, relato: r }
  } finally {
    r.ms = Math.max(0, agora() - t0)
    r.url_final = url
    Object.assign(r, decisaoDaEscolhaCritico(r)) // KINEO-JUIZ-ESTADOS-3010
    filme.gastoMs += r.ms
    filme.relatos.push(r)
  }
}

/** Quanto a rota espera pelas tarefas do crítico depois do laço: até o prazo absoluto (nunca além dele) ou, sem prazo, o
 *  teto de uma cena. Passou disso, a foto original segue (falha aberta). */
export function esperaMaximaDoCritico(filme: FilmeDoCritico, agora: number): number {
  const base = Number.isFinite(filme.prazo) ? Math.max(0, filme.prazo - agora) : STILL_CRITIC_TETO_CENA_MS
  return Math.min(base, STILL_CRITIC_TETO_CENA_MS)
}

/** Espera as tarefas do crítico até `ms`; devolve só as que terminaram (as outras ficam com a foto original). Nunca lança. */
export async function esperarCriticos<T>(tarefas: ReadonlyArray<Promise<T>>, ms: number): Promise<T[]> {
  const feitas: T[] = []
  const vigiadas = tarefas.map((p) => p.then((v) => { feitas.push(v) }, () => undefined))
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([Promise.all(vigiadas), new Promise<void>((resolve) => { timer = setTimeout(resolve, Math.max(0, ms)) })])
  if (timer !== undefined) clearTimeout(timer)
  return feitas.slice()
}
