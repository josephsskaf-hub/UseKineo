// KINEO-NOTA-AUTO-V2-1311 — 2ª tentativa da nota automática do filme: JUIZ POR CENA (pedido da CEO, 13/11/2026 tarde).
//
// Por quê: a 1ª tentativa (notaRevisor.ts, juiz de nota geral) NÃO PASSOU no ensaio de 13/11 madrugada: o gpt-4o
// pegou 85% dos filmes ruins com 61% de alarme falso. Ele lia o pedido ao pé da letra e via "personagem trocou" e
// "cena fora do pedido" em filme bom, mas não via a fala desmentida pelo quadro (a fala diz "relógio às 02:46" e o
// relógio mostra outra hora).
//
// O que muda:
//   · o filme vira MOMENTOS: cada cena do plano (segundos de cada clipe, escalados à duração real). Um clipe único vira
//     4 janelas de tempo. Cada momento leva a SUA fala e os SEUS 2–3 quadros;
//   · o modelo responde a CINCO perguntas FECHADAS por momento, cada uma com o campo "vejo" (o que está no quadro):
//     1 sujeito da fala aparece? · 2 ação bate com a fala? · 3 mesma pessoa do quadro de referência? · 4 texto na tela
//     além da legenda · 5 época e lugar batem com o pedido?;
//   · a pergunta 3 só é feita quando o PLANO diz que é a mesma pessoa: um nome do elenco (personagem.elenco ou
//     elenco_trava) que aparece em ≥ 2 momentos. A referência é o 1º momento em que ele aparece;
//   · a NOTA SAI DO CÓDIGO (notaDasRespostas), nunca do modelo. Resposta negativa sem "vejo" escrito não conta;
//   · texto inventado também é decidido aqui: número na tela que não está na fala nem no pedido, ou texto que o modelo
//     marca como ilegível.
// Sem exemplo concreto de filme no prompt (regra da casa 11/11). Falha aberta: erro = null, nunca exceção.
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { evidenceFromBirth } from '@/lib/regua95/coherenceV2'
import { chamarVisaoJson, type ParteVisao, type ProvedorVisao } from '@/lib/regua95/visaoProvedor'
import { FAL_NTH_FRAME_MODEL, FAL_USD_PER_COMPUTE_SECOND, PIXEL_FPS_ASSUMED } from '@/lib/regua95/pixelScore'

export const NOTA_CENA_VERSION = 'nota_auto_v2_cena'
export type NotaAutoDetail = 'low' | 'high' | 'auto'

/** US$ por milhão de tokens (entrada/saída) dos modelos de visão do registro. */
export const NOTA_AUTO_RATES: Record<string, { inPerM: number; outPerM: number }> = {
  [AI_TEXT_MODELS.writer]: { inPerM: 2.5, outPerM: 10 },
  [AI_TEXT_MODELS.research]: { inPerM: 0.4, outPerM: 1.6 },
  [AI_TEXT_MODELS.vision]: { inPerM: 0.15, outPerM: 0.6 },
}

/** Tira do pedido os marcadores do nosso roteirista ([Pexels: …], HOOK:, MICRO REWARD 1:, [Idea: …]) — sobra o que o cliente quer. */
export function limparPedido(s: string): string {
  return String(s ?? '')
    .replace(/\[(?:Pexels|Pixabay|B-?roll|Visual)[^\]]*\]/gi, ' ')
    .replace(/^\s*(?:HOOK|MICRO REWARD\s*\d*|ESCALATION|PAYOFF|RHYTHM|CTA)\s*(?:\([^)]*\))?\s*:\s*/gim, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, 1800)
}

/** Teto de quadros por filme (custo). Ensaio (quadros de 432 px): ~US$ 0,02 por filme no gpt-4o. EM PRODUÇÃO (quadros da fal, maiores): medido US$ 0,07–0,09 por filme no gpt-4o, 45–57 s (13/11, 2 primeiros filmes). */
export const NOTA_CENA_QUADROS = 12
export const NOTA_CENA_JANELAS_CLIPE_UNICO = 4

export type MomentoPlano = {
  m: number
  cena: number
  inicio: number
  fim: number
  fala: string
  /** nomes do elenco que o PLANO põe neste momento */
  nomes: string[]
}
export type PlanoFilme = { segundos: number; momentos: MomentoPlano[]; elenco: string[] }

const str = (x: unknown) => (typeof x === 'string' ? x : '')
const arr = (x: unknown) => (Array.isArray(x) ? (x as unknown[]) : [])
const r2 = (x: number) => Math.round(x * 100) / 100

/** Palavra-chave de um nome do elenco: "Tsutomu Yamaguchi" → ["tsutomu","yamaguchi"]; "the plump raccoon" → ["raccoon"]. */
export function chavesDoNome(nome: string): string[] {
  const p = nome.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean)
  const vazias = new Set(['the', 'a', 'an', 'o', 'a', 'os', 'as', 'um', 'uma', 'il', 'la', 'le', 'el', 'lo', 'de', 'da', 'do', 'of'])
  const fortes = p.filter((w) => !vazias.has(w) && w.length >= 3)
  if (!fortes.length) return []
  // nome próprio (maiúscula no original): todas as palavras; descrição comum ("the tiny robot"): só o substantivo final.
  return /\p{Lu}/u.test(nome.trim()[0] ?? '') && !/^(the|a|an)\b/i.test(nome.trim()) ? fortes : [fortes[fortes.length - 1]]
}

function citaNome(texto: string, nome: string): boolean {
  const t = ` ${texto.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ')} `
  return chavesDoNome(nome).some((k) => t.includes(` ${k} `) || t.includes(` ${k}'s `) || t.includes(` ${k}s `))
}

/**
 * Do evento de nascimento (cinematic_submission_claim.metadata.response) e da duração REAL do MP4 para os momentos.
 * null quando não há cena nenhuma (sem plano não há juiz por cena).
 */
export function planoDoNascimento(response: Record<string, unknown> | null | undefined, segundosVideo: number | null | undefined): PlanoFilme | null {
  const evd = evidenceFromBirth(response ?? null)
  if (!evd || !response) return null
  const n = evd.scenes.length
  if (n < 1) return null
  const dur = typeof segundosVideo === 'number' && Number.isFinite(segundosVideo) && segundosVideo > 0 ? segundosVideo : evd.duration ?? 15
  // nomes por cena: elenco_trava (o plano diz quem está em cada cena) > personagem.elenco citado no prompt/fala da cena
  const porCena = new Map<number, Set<string>>()
  const trava = (response as { elenco_trava?: { cenas?: unknown } }).elenco_trava
  for (const c of arr(trava && typeof trava === 'object' ? trava.cenas : null)) {
    const o = c && typeof c === 'object' ? (c as Record<string, unknown>) : {}
    const cena = Number(o.cena)
    if (!Number.isInteger(cena) || cena < 1) continue
    for (const nome of arr(o.nomes).map(str).filter(Boolean)) {
      const s = porCena.get(cena) ?? new Set<string>()
      s.add(nome)
      porCena.set(cena, s)
    }
  }
  const pers = (response as { personagem?: { elenco?: unknown } }).personagem
  const elencoPers = arr(pers && typeof pers === 'object' ? pers.elenco : null)
    .map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {}))
    .filter((x) => ['humano', 'animal', 'criatura'].includes(str(x.tipo)) && str(x.nome))
    .map((x) => str(x.nome))
  if (!porCena.size && elencoPers.length) {
    evd.scenes.forEach((s, i) => {
      for (const nome of elencoPers) {
        if (n === 1 || citaNome(`${s.prompt} ${s.spoken}`, nome)) {
          const set = porCena.get(i + 1) ?? new Set<string>()
          set.add(nome)
          porCena.set(i + 1, set)
        }
      }
    })
  }
  const elenco = Array.from(new Set(Array.from(porCena.values()).flatMap((s) => Array.from(s))))
  // segundos de cada cena: clip_seconds escalado à duração real; sem ele, partes iguais
  const cs = arr(response.clip_seconds).map((x) => Number(x))
  const pesos = cs.length === n && cs.every((x) => Number.isFinite(x) && x > 0) ? cs : Array.from({ length: n }, () => 1)
  const soma = pesos.reduce((a, b) => a + b, 0)
  const momentos: MomentoPlano[] = []
  // KINEO-NOTA-AUTO-V3-1311 — Kling 4 (teste grátis e pago) roda o filme num clipe só, mas o nascimento guarda o plano por cena
  // em kling4_trial/kling4_paid.scene_plan (fala, início e duração de cada plano). Com ele, cada plano vira um momento de verdade.
  const k4 = [response.kling4_trial, response.kling4_paid]
    .map((x) => (x && typeof x === 'object' ? arr((x as Record<string, unknown>).scene_plan) : []))
    .find((x) => x.length >= 2)
  if (n === 1 && k4) {
    const planos = k4.map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {}))
    const fimTotal = Math.max(...planos.map((p) => Number(p.start_seconds) + Number(p.duration_seconds)).filter((x) => Number.isFinite(x) && x > 0), 0)
    if (fimTotal > 0) {
      planos.forEach((p, i) => {
        const ini = Number(p.start_seconds) || 0
        const d = Number(p.duration_seconds) || 0
        const texto = str(p.text).trim()
        const nomes = elencoPers.filter((nome) => citaNome(`${str(p.prompt)} ${texto}`, nome))
        momentos.push({ m: i + 1, cena: i + 1, inicio: r2((dur * ini) / fimTotal), fim: r2((dur * (ini + d)) / fimTotal), fala: texto, nomes })
      })
    }
  }
  if (momentos.length) {
    // já veio do plano por cena do Kling 4
  } else if (n === 1) {
    // clipe único: 4 janelas; a fala se reparte pelas palavras, em tempo uniforme
    const palavras = (evd.scenes[0].spoken || evd.narration).split(/\s+/).filter(Boolean)
    const k = NOTA_CENA_JANELAS_CLIPE_UNICO
    for (let j = 0; j < k; j++) {
      const a = Math.floor((palavras.length * j) / k)
      const b = Math.floor((palavras.length * (j + 1)) / k)
      momentos.push({ m: j + 1, cena: 1, inicio: r2((dur * j) / k), fim: r2((dur * (j + 1)) / k), fala: palavras.slice(a, b).join(' '), nomes: Array.from(porCena.get(1) ?? []) })
    }
  } else {
    let t = 0
    evd.scenes.forEach((s, i) => {
      const len = (dur * pesos[i]) / soma
      momentos.push({ m: i + 1, cena: i + 1, inicio: r2(t), fim: r2(t + len), fala: s.spoken.trim(), nomes: Array.from(porCena.get(i + 1) ?? []) })
      t += len
    })
  }
  // Plano antigo, sem elenco gravado: o próprio roteiro é o plano. Nome próprio (maiúscula fora do início da frase) que a
  // fala repete em ≥ 2 momentos = a mesma pessoa/personagem. Pronome não conta.
  if (!elenco.length) {
    // nome próprio = palavra com maiúscula no MEIO de uma frase em algum ponto da narração inteira (a janela pode começar nele)
    const proprios = new Set<string>()
    const todaFala = momentos.map((m) => m.fala).join(' ')
    for (const x of Array.from(todaFala.matchAll(/(^|[.!?…:;"“]\s*)?\b(\p{Lu}[\p{Ll}'’]{2,})\b/gu))) {
      if (!x[1] && x.index !== 0 && !NAO_NOME.has(x[2].toLowerCase())) proprios.add(x[2])
    }
    const nomesDaFala = (t: string) => new Set(Array.from(t.matchAll(/\b\p{Lu}[\p{Ll}'’]{2,}\b/gu)).map((x) => x[0]).filter((w) => proprios.has(w)))
    const conta = new Map<string, number>()
    const porMomento = momentos.map((m) => nomesDaFala(m.fala))
    for (const s of porMomento) for (const nome of Array.from(s)) conta.set(nome, (conta.get(nome) ?? 0) + 1)
    const recorrentes = Array.from(conta.entries()).filter(([, c]) => c >= 2).map(([n]) => n)
    momentos.forEach((m, i) => { m.nomes = recorrentes.filter((n) => porMomento[i].has(n)) })
    return { segundos: dur, momentos, elenco: recorrentes }
  }
  return { segundos: dur, momentos, elenco }
}

/** Palavras com maiúscula que não são personagem (dias, meses, Deus, pronome de tratamento, siglas comuns). */
const NAO_NOME = new Set(['god', 'lord', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'the', 'this', 'that', 'and', 'but', 'his', 'her', 'their', 'mr', 'mrs', 'dr', 'earth', 'internet'])

/** Instantes dos quadros de cada momento (orçamento NOTA_CENA_QUADROS; 1 a 3 por momento, longe dos cortes). */
export function temposDosQuadros(p: PlanoFilme, teto = NOTA_CENA_QUADROS): number[][] {
  const M = p.momentos.length
  const base = Math.max(1, Math.min(3, Math.floor(teto / M)))
  let sobra = Math.max(0, teto - base * M)
  return p.momentos.map((m) => {
    let k = base
    if (sobra > 0 && k < 3 && M > teto / 3) { k++; sobra-- }
    const len = Math.max(0.1, m.fim - m.inicio)
    const margem = Math.min(0.35, len / 6)
    const util = Math.max(0.05, len - 2 * margem)
    return Array.from({ length: k }, (_, i) => r2(m.inicio + margem + (util * (i + 0.5)) / k))
  })
}

/** Checagem de identidade que o plano pede: momento → referência (1º momento em que o mesmo nome aparece). */
export function checagensDeIdentidade(p: PlanoFilme): Map<number, { nome: string; ref: number }> {
  const primeiro = new Map<string, number>()
  const out = new Map<number, { nome: string; ref: number }>()
  for (const m of p.momentos) {
    for (const nome of m.nomes) {
      const r = primeiro.get(nome)
      if (r === undefined) primeiro.set(nome, m.m)
      else if (!out.has(m.m)) out.set(m.m, { nome, ref: r })
    }
  }
  return out
}

export type QuadroCena = { url: string; t: number; m: number }
export type NotaCenaEntrada = { plano: PlanoFilme; quadros: QuadroCena[]; pedido: string; produto: string; motor: string | null }

export function buildNotaCenaMessages(e: NotaCenaEntrada, detail: NotaAutoDetail = 'high') {
  const ident = checagensDeIdentidade(e.plano)
  const idxPorM = new Map<number, number[]>()
  e.quadros.forEach((q, i) => idxPorM.set(q.m, [...(idxPorM.get(q.m) ?? []), i]))
  const system = [
    'You check short AI-generated films moment by moment, like a strict reviewer who decides whether the customer would post the film.',
    'The film is split into MOMENTS. For each moment you get what the narrator SAYS during it and 1 to 3 frames taken from it. You also get the customer request.',
    'For EVERY moment answer the closed questions below. Each answer has a "vejo" field: write, in at most 12 words, what you literally see in the frames that supports the answer. Never answer "nao" without writing what you see instead.',
    'Q1 sujeito: name the main subject the speech of this moment is about (a person, animal, object or place). Does THAT subject appear in the frames, as the story describes it? "sim" only when what is shown fits that subject: for a real or historical person, the right era, origin and age; for a named animal or object, that animal or object. A generic stand-in of the wrong kind (a modern man for a historical figure, another animal, another object) is "nao". "sem_sujeito" when the speech names no concrete subject.',
    'Q2 acao: does what happens in the frames match what the speech says happens (the action, the event, the object, the number or time it mentions)? "sim", "parcial" (related but a clear detail is wrong), or "nao" (the frames show something else). A generic but related establishing shot is "sim". Judge only what is visible.',
    'Q3 mesma_pessoa (ONLY when the moment says "identity check"): compare the named character in this moment with the same character in the reference frame. "sim" (same character), "nao" (clearly a different individual), or "nao_aparece". If "nao", list the differences among: cabelo, roupa, idade, etnia, genero, especie, rosto. Different angle, light, distance, pose or expression is NOT a different person. When the speech or request says the character changes (ages, changes clothes, transforms), that change is expected.',
    'Q4 texto: ignore the subtitle (the narration caption burned into the frame). Transcribe ANY OTHER text, letters or numbers visible in the image (signs, screens, clocks, documents, logos) in "outro_texto" (empty string when none). "ilegivel": true when that other text is garbled, fake letters or misspelled.',
    'Q5 epoca_lugar: do the era and the place shown match the story (request and speech)? Look at clothing, technology, vehicles, architecture and landscape. "sim", "nao" (something in the frame belongs to another era or place), or "nao_da_para_saber" only when the frames show nothing that can be dated or placed.',
    'Answer ONLY with JSON: {"momentos": [{"m": number, "sujeito": {"da_fala": string, "aparece": "sim"|"nao"|"sem_sujeito", "vejo": string}, "acao": {"bate": "sim"|"parcial"|"nao", "vejo": string}, "mesma_pessoa": {"resposta": "sim"|"nao"|"nao_aparece", "diferencas": [string], "vejo": string} (only when asked), "texto": {"outro_texto": string, "ilegivel": boolean}, "epoca_lugar": {"bate": "sim"|"nao"|"nao_da_para_saber", "vejo": string}}], "resumo": string (one line, Portuguese)}',
  ].join('\n\n')
  const head = [
    `Product: ${e.produto}. Engine: ${e.motor ?? 'unknown'}. Duration: ${Math.round(e.plano.segundos)} s. ${e.plano.momentos.length} moments, ${e.quadros.length} frames (#0 to #${e.quadros.length - 1}).`,
    `Customer request:\n"""${limparPedido(e.pedido) || '(not recorded)'}"""`,
  ].join('\n\n')
  type Parte = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: NotaAutoDetail } }
  const content: Parte[] = [{ type: 'text', text: head }]
  for (const m of e.plano.momentos) {
    const idx = idxPorM.get(m.m) ?? []
    if (!idx.length) continue
    const id = ident.get(m.m)
    const refIdx = id ? (idxPorM.get(id.ref) ?? [])[Math.floor(((idxPorM.get(id.ref) ?? []).length - 1) / 2)] : undefined
    const linhas = [
      `MOMENT ${m.m} (${m.inicio.toFixed(1)}–${m.fim.toFixed(1)} s). Speech: "${m.fala.slice(0, 600) || '(no speech)'}"`,
      id && refIdx !== undefined ? `Identity check: the plan says "${id.nome}" here is the SAME character as in reference frame #${refIdx} (moment ${id.ref}).` : 'No identity check for this moment.',
      `Frames of this moment: ${idx.map((i) => `#${i}`).join(', ')}.`,
    ]
    content.push({ type: 'text', text: linhas.join('\n') })
    for (const i of idx) {
      content.push({ type: 'text', text: `Frame #${i} (t=${e.quadros[i].t.toFixed(1)} s)` })
      content.push({ type: 'image_url', image_url: { url: e.quadros[i].url, detail } })
    }
  }
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content },
  ]
}

// ── as respostas e a nota (código) ──

export type RespostaMomento = {
  m: number
  sujeito: 'sim' | 'nao' | 'sem_sujeito' | null
  acao: 'sim' | 'parcial' | 'nao' | null
  pessoa: 'sim' | 'nao' | 'nao_aparece' | null
  diferencas: string[]
  outroTexto: string
  ilegivel: boolean
  epoca: 'sim' | 'nao' | 'nao_da_para_saber' | null
  vejo: { sujeito: string; acao: string; pessoa: string; epoca: string }
}
const DIFERENCAS = new Set(['cabelo', 'roupa', 'idade', 'etnia', 'genero', 'especie', 'rosto'])
const umDe = <T extends string>(x: unknown, ok: readonly T[]): T | null => {
  const v = String(x ?? '').trim().toLowerCase()
  return (ok as readonly string[]).includes(v) ? (v as T) : null
}
/** "vejo" vale como evidência quando diz alguma coisa (≥ 3 palavras, não um "n/a"). */
export function temEvidencia(s: string): boolean {
  const t = s.trim()
  if (!t || /^(n\/?a|none|nothing|-|nada|null)$/i.test(t)) return false
  return t.split(/\s+/).length >= 3
}

export function normalizarRespostas(json: unknown, p: PlanoFilme): { respostas: RespostaMomento[]; resumo: string } {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {}
  const ident = checagensDeIdentidade(p)
  const validos = new Set(p.momentos.map((m) => m.m))
  const porM = new Map<number, RespostaMomento>()
  for (const raw of arr(o.momentos)) {
    const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    const m = Number(x?.m)
    if (!x || !validos.has(m) || porM.has(m)) continue
    const g = (k: string) => (x[k] && typeof x[k] === 'object' ? (x[k] as Record<string, unknown>) : {})
    const su = g('sujeito'), ac = g('acao'), pe = g('mesma_pessoa'), tx = g('texto'), ep = g('epoca_lugar')
    porM.set(m, {
      m,
      sujeito: umDe(su.aparece, ['sim', 'nao', 'sem_sujeito'] as const),
      acao: umDe(ac.bate, ['sim', 'parcial', 'nao'] as const),
      // a pergunta 3 só vale onde o PLANO a fez; resposta fora disso é ignorada
      pessoa: ident.has(m) ? umDe(pe.resposta, ['sim', 'nao', 'nao_aparece'] as const) : null,
      diferencas: ident.has(m) ? arr(pe.diferencas).map((d) => String(d).trim().toLowerCase()).filter((d) => DIFERENCAS.has(d)) : [],
      outroTexto: str(tx.outro_texto).trim().slice(0, 200),
      ilegivel: tx.ilegivel === true,
      epoca: umDe(ep.bate, ['sim', 'nao', 'nao_da_para_saber'] as const),
      vejo: { sujeito: str(su.vejo).slice(0, 240), acao: str(ac.vejo).slice(0, 240), pessoa: str(pe.vejo).slice(0, 240), epoca: str(ep.vejo).slice(0, 240) },
    })
  }
  return { respostas: p.momentos.map((m) => porM.get(m.m)).filter((r): r is RespostaMomento => !!r), resumo: str(o.resumo).trim().slice(0, 240) }
}

/** Números na tela que não existem na fala nem no pedido = texto inventado (o relógio que não marca a hora dita). */
export function numerosInventados(outroTexto: string, falaEPedido: string): string[] {
  const conhecidos = new Set((falaEPedido.match(/\d+/g) ?? []).map((d) => d.replace(/^0+(?=\d)/, '')))
  return Array.from(new Set((outroTexto.match(/\d+/g) ?? []).map((d) => d.replace(/^0+(?=\d)/, '')))).filter((d) => !conhecidos.has(d))
}

export type DefeitoCena = { categoria: 'PESSOA_FALTANDO' | 'CENA_FORA_DO_PEDIDO' | 'PERSONAGEM_TROCOU' | 'TEXTO_INVENTADO' | 'EPOCA_ERRADA'; m: number; evidencia: string }
export type ContagemCena = { momentos: number; semSujeito: number; acao: number; troca: number; texto: number; epoca: number }

/** Das respostas para defeitos com evidência e contagens. Negativa sem "vejo" não conta. */
export function defeitosDasRespostas(rs: RespostaMomento[], p: PlanoFilme, pedido: string): { defeitos: DefeitoCena[]; contagem: ContagemCena } {
  const defeitos: DefeitoCena[] = []
  const c: ContagemCena = { momentos: Math.max(1, p.momentos.length), semSujeito: 0, acao: 0, troca: 0, texto: 0, epoca: 0 }
  const falaToda = p.momentos.map((m) => m.fala).join(' ')
  for (const r of rs) {
    if (r.sujeito === 'nao' && temEvidencia(r.vejo.sujeito)) {
      c.semSujeito++
      defeitos.push({ categoria: 'PESSOA_FALTANDO', m: r.m, evidencia: r.vejo.sujeito })
    }
    if ((r.acao === 'nao' || r.acao === 'parcial') && temEvidencia(r.vejo.acao)) {
      c.acao += r.acao === 'nao' ? 1 : 0.5
      defeitos.push({ categoria: 'CENA_FORA_DO_PEDIDO', m: r.m, evidencia: `${r.acao}: ${r.vejo.acao}` })
    }
    if (r.pessoa === 'nao' && r.diferencas.length > 0 && temEvidencia(r.vejo.pessoa)) {
      c.troca++
      defeitos.push({ categoria: 'PERSONAGEM_TROCOU', m: r.m, evidencia: `${r.diferencas.join('/')}: ${r.vejo.pessoa}` })
    }
    const inventados = r.outroTexto ? numerosInventados(r.outroTexto, `${falaToda} ${pedido}`) : []
    if (r.outroTexto && (r.ilegivel || inventados.length)) {
      c.texto++
      defeitos.push({ categoria: 'TEXTO_INVENTADO', m: r.m, evidencia: `"${r.outroTexto}"${inventados.length ? ` (números fora da fala: ${inventados.join(', ')})` : ' (ilegível)'}` })
    }
    if (r.epoca === 'nao' && temEvidencia(r.vejo.epoca)) {
      c.epoca++
      defeitos.push({ categoria: 'EPOCA_ERRADA', m: r.m, evidencia: r.vejo.epoca })
    }
  }
  return { defeitos, contagem: c }
}

/**
 * A régua do código. Pesos AJUSTADOS só na metade de ajuste do ensaio (scripts/calibra-nota-auto-v2-1311.mts) e
 * congelados aqui; a metade de prova nunca entra no ajuste. Frações: o peso vale o filme INTEIRO com o defeito.
 */
// Ajuste de 13/11 (57 filmes, gpt-4o): o melhor peso com alarme ≤ 10% pegou só 63% dos ruins. A época (Q5) saiu com peso 0:
// no ajuste ela disparou em 3 de 11 filmes BONS e em 8 de 32 ruins, ou seja, mais alarme que acerto.
export const REGUA_NOTA_CENA = { base: 8, semSujeito: 4, acao: 2, troca: 1, texto: 1, epoca: 0, piso: 1 }
export type ReguaNotaCena = typeof REGUA_NOTA_CENA

export function notaDasRespostas(c: ContagemCena, regua: ReguaNotaCena = REGUA_NOTA_CENA): number {
  const n = Math.max(1, c.momentos)
  const nota = regua.base
    - regua.semSujeito * (c.semSujeito / n)
    - regua.acao * (c.acao / n)
    - regua.troca * Math.min(2, c.troca)
    - regua.texto * Math.min(2, c.texto)
    - regua.epoca * Math.min(1, c.epoca / n * 2)
  return Math.max(regua.piso, Math.min(10, Math.round(nota * 2) / 2))
}

export type NotaCenaResultado = {
  version: typeof NOTA_CENA_VERSION
  nota: number
  defeitos: DefeitoCena[]
  contagem: ContagemCena
  respostas: RespostaMomento[]
  resumo: string
  model: string
  detail: NotaAutoDetail
  frames: number
  usd: number
  ms: number
}

/** Uma leitura do juiz por cena. Falha aberta: null. */
export async function julgarNotaCena(
  e: NotaCenaEntrada,
  opts?: { fetchImpl?: typeof fetch; apiKey?: string; model?: string; provedor?: ProvedorVisao; tokenGateway?: string | null; detail?: NotaAutoDetail; timeoutMs?: number; usdQuadros?: number; regua?: ReguaNotaCena },
): Promise<(NotaCenaResultado & { bruto: unknown; provedor: ProvedorVisao }) | null> {
  const started = Date.now()
  if (!e.quadros.length || !e.plano.momentos.length) return null
  const detail = opts?.detail ?? 'high'
  const [sys, user] = buildNotaCenaMessages(e, detail) as [{ role: 'system'; content: string }, { role: 'user'; content: ParteVisao[] }]
  // KINEO-NOTA-AUTO-1MIN-1311 — a chamada passa pela interface única (visaoProvedor.ts): OpenAI ou Claude pelo gateway
  const r = await chamarVisaoJson({ system: sys.content, content: user.content, maxTokens: 3000 }, { provedor: opts?.provedor, modelo: opts?.model, fetchImpl: opts?.fetchImpl, apiKey: opts?.apiKey, tokenGateway: opts?.tokenGateway, timeoutMs: opts?.timeoutMs })
  if (!r) return null
  const { respostas, resumo } = normalizarRespostas(r.json, e.plano)
  if (!respostas.length) return null
  const { defeitos, contagem } = defeitosDasRespostas(respostas, e.plano, e.pedido)
  const usd = r.usd + (opts?.usdQuadros ?? 0)
  return {
    version: NOTA_CENA_VERSION,
    nota: notaDasRespostas(contagem, opts?.regua),
    defeitos,
    contagem,
    respostas,
    resumo,
    model: r.modelo,
    provedor: r.provedor,
    detail,
    frames: e.quadros.length,
    usd: Math.round(usd * 1e6) / 1e6,
    ms: Date.now() - started,
    bruto: r.json,
  }
}

/**
 * Em produção: os quadros de cada momento pela fal (extract-nth-frame a cada 0,5 s, o mesmo modelo do pixel_score) e, para
 * cada instante pedido, o quadro mais perto. null quando não deu. Nunca lança.
 */
export async function extrairQuadrosPorTempoFal(
  videoUrl: string,
  plano: PlanoFilme,
  opts?: { fetchImpl?: typeof fetch; falKey?: string; timeoutMs?: number },
): Promise<{ quadros: QuadroCena[]; usd: number } | null> {
  const key = opts?.falKey ?? process.env.FAL_KEY ?? process.env.FAL_API_KEY
  if (!key || !videoUrl || !plano.momentos.length) return null
  const doFetch = opts?.fetchImpl ?? fetch
  // 1 quadro por segundo (era a cada 0,5 s): metade dos quadros para a fal gerar e subir; o mais perto de cada instante
  // fica a ≤ 0,5 s dele (os momentos têm 3 s ou mais). KINEO-NOTA-AUTO-CUSTO-1311
  const passo = Math.max(1, PIXEL_FPS_ASSUMED)
  const max = Math.min(120, Math.ceil(plano.segundos) + 2)
  const started = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 90_000)
  try {
    const res = await doFetch(`https://fal.run/${FAL_NTH_FRAME_MODEL}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl, frame_interval: passo, max_frames: max, output_format: 'jpg', quality: 80 }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { images?: Array<{ url?: unknown }> }
    const urls = (Array.isArray(data.images) ? data.images : []).map((im) => (typeof im?.url === 'string' ? im.url : ''))
    if (!urls.filter(Boolean).length) return null
    const tempos = temposDosQuadros(plano)
    const quadros: QuadroCena[] = []
    plano.momentos.forEach((m, mi) => {
      for (const t of tempos[mi]) {
        const i = Math.max(0, Math.min(urls.length - 1, Math.round((t * PIXEL_FPS_ASSUMED) / passo)))
        if (urls[i]) quadros.push({ url: urls[i], t, m: m.m })
      }
    })
    if (!quadros.length) return null
    return { quadros, usd: ((Date.now() - started) / 1000) * FAL_USD_PER_COMPUTE_SECOND }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
