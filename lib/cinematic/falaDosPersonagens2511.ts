// KINEO-FALA-DOS-PERSONAGENS-2511 [dono 25/11 17:48: NOTA 10 aos dois filmes com fala; "um vídeo que fala com o motor sincronizado e o som junto", "não quero
// deixar mais caro", "não quero correr o risco de falhar", "não quero erros"; decisão: docs/estrategia/DECISAO-PERSONAGEM-FALANDO-2511.md] — o modo
// "personagens falam" do filme grátis de 15 s: UM pedido ao Gemini Omni Flash 1.2 com a fala escrita no plano e o áudio nativo do motor (incluído no preço
// por segundo). Nenhuma etapa de voz nem de sincronia à parte; o mesmo débito. Este módulo é PURO (sem rede, sem banco): a chave, o pedido do corpo, a leitura
// das falas do roteiro, a voz de cada personagem pela ficha, o pedido falado ao Gemini e a conferência da fala (as palavras ditas × as escritas).
//
// Onde entra: só onde o Gemini entra (referência admitida, clipe de 15 s). Fora disso, ou se o Gemini cair para o Kling 4 (a entrada guardada do Kling 4 é a de
// hoje, com "Mouth closed"), o filme sai NARRADO como hoje, e o claim grava o motivo. O cliente nunca vê erro por causa do modo.
// Formato aceito (1ª entrega: só o roteiro do autor, 'verbatim'): cada seção do roteiro traz uma ou mais linhas "Nome: fala" (aspas opcionais), o Nome é um
// dos personagens COM referência (no máximo 2), até ~2,2 palavras por segundo do plano. Texto fora do formato, nome fora do elenco ou fala longa = narrado.
import { contaDaCasaExata } from '@/lib/internalAccounts'

export const FALA_DOS_PERSONAGENS_2511_VERSAO = 'fala_dos_personagens_2511_v1'
export type ModoFalaDosPersonagens2511 = 'off' | 'internal' | 'public'
/** 'internal' = só a lista EXATA da casa; cliente e 'off' = o pedido de hoje, byte a byte (nenhum campo novo). Voltar: 'off'. */
export const FALA_DOS_PERSONAGENS_2511: ModoFalaDosPersonagens2511 = 'internal'
export const falaDosPersonagensLigada = (modo: ModoFalaDosPersonagens2511, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))

/** O que o corpo do pedido escolheu: voz 'personagens' = o modo falado; qualquer outra coisa (ou nada) = o narrador de sempre. */
export type VozDoFilme2511 = 'narrador' | 'personagens'
export function vozPedida2511(body: unknown): VozDoFilme2511 {
  const v = body && typeof body === 'object' ? (body as { voz?: unknown }).voz : undefined
  return v === 'personagens' ? 'personagens' : 'narrador'
}

export type MotivoNarrado2511 =
  | 'lingua' | 'sem_gemini' | 'sem_referencia' | 'roteiro_sem_falas' | 'fala_fora_do_formato' | 'falante_fora_do_elenco' | 'fala_longa'
  | 'planos_desencontrados' | 'falante_fora_do_plano' | 'plano_sem_cauda' | 'fala_com_pessoa_real' | 'gemini_recusou_no_envio' | 'gemini_caiu'
export type LinhaDeFala2511 = { ref: 0 | 1; nome: string; texto: string }
/** O marcador que viaja no claim (kling4_trial.fala_2511) e que o compose lê. */
export type MarcadorDaFala2511 = { versao: string; pedida: 'personagens'; modo: 'falado' | 'narrado'; motivo: MotivoNarrado2511 | null; falas?: LinhaDeFala2511[][] }

/** Máximo de palavras faladas por plano: ~2,2 por segundo (5 s → 11; a receita de nota 10 tinha até 10 por plano de 5 s). */
export const PALAVRAS_POR_SEGUNDO_2511 = 2.2
const palavras = (t: string) => String(t ?? '').trim().split(/\s+/u).filter(Boolean)
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const limpaFala = (t: string) => String(t ?? '').replace(/\s+/gu, ' ').trim().replace(/^["“”'‘’]+|["“”'‘’]+$/gu, '').trim().replace(/["“”]/gu, "'")

/** As falas de cada plano, lidas da fala (voiceover) de cada plano. `nomes[k]` = os nomes do personagem da referência k (o 1º é o que vai ao motor).
 *  Fora do formato = o motivo (o filme sai narrado). */
export function lerFalas2511(falasDosPlanos: ReadonlyArray<string>, nomes: ReadonlyArray<ReadonlyArray<string>>, duracoes: ReadonlyArray<number>):
  { falas: LinhaDeFala2511[][] } | { motivo: MotivoNarrado2511 } {
  if (!Array.isArray(falasDosPlanos) || falasDosPlanos.length === 0 || falasDosPlanos.length !== duracoes.length) return { motivo: 'planos_desencontrados' }
  const rotulos: Array<{ re: string; ref: 0 | 1; nome: string }> = []
  nomes.slice(0, 2).forEach((lista, k) => {
    const principal = String(lista?.[0] ?? '').trim()
    for (const n of lista ?? []) { const t = String(n ?? '').trim(); if (t) rotulos.push({ re: escapa(t), ref: k as 0 | 1, nome: principal || t }) }
  })
  if (!rotulos.length) return { motivo: 'sem_referencia' }
  rotulos.sort((a, b) => b.re.length - a.re.length)
  // "Nome:" no começo do texto ou depois de um fim de frase/aspas; o nome inteiro, sem letra colada
  const rotulo = new RegExp(`(^|[.!?…"”'’]\\s*|\\n\\s*)(${rotulos.map((r) => r.re).join('|')})\\s*:`, 'giu')
  const qualquerRotulo = /(^|[.!?…"”'’]\s*|\n\s*)(\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*){0,2})\s*:/u
  const falas: LinhaDeFala2511[][] = []
  for (let i = 0; i < falasDosPlanos.length; i++) {
    const texto = String(falasDosPlanos[i] ?? '').trim()
    const linhas: LinhaDeFala2511[] = []
    if (texto) {
      const marcas = [...texto.matchAll(rotulo)]
      if (!marcas.length) return { motivo: qualquerRotulo.test(texto) ? 'falante_fora_do_elenco' : 'fala_fora_do_formato' }
      const inicio = (marcas[0].index ?? 0) + marcas[0][1].length
      if (texto.slice(0, inicio).trim()) return { motivo: 'fala_fora_do_formato' }
      for (let j = 0; j < marcas.length; j++) {
        const m = marcas[j], ini = (m.index ?? 0) + m[0].length, fim = j + 1 < marcas.length ? (marcas[j + 1].index ?? texto.length) + marcas[j + 1][1].length : texto.length
        const fala = limpaFala(texto.slice(ini, fim))
        if (!fala) return { motivo: 'fala_fora_do_formato' }
        if (qualquerRotulo.test(' ' + fala)) return { motivo: 'falante_fora_do_elenco' } // "Tom: …" no meio de uma fala de quem tem referência
        const r = rotulos.find((x) => new RegExp(`^${x.re}$`, 'iu').test(m[2].trim()))!
        linhas.push({ ref: r.ref, nome: r.nome, texto: fala })
      }
      const total = linhas.reduce((s, l) => s + palavras(l.texto).length, 0)
      if (total > Math.floor(PALAVRAS_POR_SEGUNDO_2511 * duracoes[i])) return { motivo: 'fala_longa' }
    }
    falas.push(linhas)
  }
  if (!falas.some((l) => l.length)) return { motivo: 'roteiro_sem_falas' }
  return { falas }
}

/** A voz do personagem, pela ficha (idade, gênero, tipo): nunca sotaque, nunca nome de pessoa real. */
export function vozDaFicha2511(f: { nome?: unknown; genero?: unknown; tipo?: unknown; canonica?: unknown } | null | undefined, estilizado: boolean): string {
  const c = typeof f?.canonica === 'string' ? f.canonica : ''
  const faixa = /(?<![\p{L}\p{N}])([1-9][0-9])\s*(?:-|–|to)\s*([1-9][0-9])(?![\p{N}])/u.exec(c) ?? /(?<![\p{L}\p{N}])([1-9][0-9])[\s-]*(?:years?|yrs?)[\s-]*old/iu.exec(c)
  const idade = faixa ? (Number(faixa[1]) + Number(faixa[2] ?? faixa[1])) / 2 : null
  const crianca = /(?<![\p{L}\p{N}])(?:child|kid|boy|girl|baby|toddler|teen\p{L}*|criança|menin\p{L}*|garot\p{L}*)(?![\p{L}\p{N}])/iu.test(c)
  const faixaEtaria = crianca ? 'child' : idade === null ? '' : idade >= 50 ? 'older' : idade <= 25 ? 'young' : 'adult'
  const genero = f?.genero === 'man' ? (crianca ? "boy's" : "man's") : f?.genero === 'woman' ? (crianca ? "girl's" : "woman's") : ''
  const desenho = estilizado || (f?.tipo !== undefined && f?.tipo !== 'humano') ? 'cartoon' : ''
  const partes = [faixaEtaria === 'child' && genero ? '' : faixaEtaria, desenho, genero].filter(Boolean)
  return `speaks in a clear, natural ${partes.length ? partes.join(' ') + ' ' : ''}voice`.replace(/\s+/g, ' ')
}

const REF_RE = /@Image([12])\b/g
/** A cauda que todo plano do Kling 4 grátis leva (lib/cinematic/filmQuality.ts). No modo falado ela sai do texto do GEMINI (o do Kling 4 fica igual). */
export const CAUDA_DA_BOCA_2511 = ' Mouth closed, no speaking.'
export type EntradaFaladaDoGemini = { prompt: string; image_urls: string[]; duration: number; resolution: '720p'; aspect_ratio: '9:16' }

/** O pedido FALADO ao Gemini a partir da entrada do Kling 4 reference já montada (a mesma que geminiDoKling4 lê): o cabeçalho com o diálogo sincronizado e as
 *  vozes, e em cada plano a cauda "Mouth closed" trocada pela fala de quem fala ("X says: …") e por "Y listens with the mouth closed." para quem está no
 *  plano sem falar. Fora do formato = o motivo (o filme sai narrado, pelo pedido de hoje). */
export function geminiFaladoDoKling4(input: unknown, nomesNoMotor: ReadonlyArray<string | null | undefined>, falas: ReadonlyArray<ReadonlyArray<LinhaDeFala2511>>,
  vozes: ReadonlyArray<string>): { entrada: EntradaFaladaDoGemini } | { motivo: MotivoNarrado2511 } {
  const i = input && typeof input === 'object' ? (input as Record<string, unknown>) : null
  if (!i || i.duration !== 15 || i.resolution !== '720p' || i.aspect_ratio !== '9:16') return { motivo: 'sem_gemini' }
  const fotos = i.image_urls, tiros = i.multi_prompt
  if (!Array.isArray(fotos) || fotos.length < 1 || fotos.length > 2 || !fotos.every((u) => typeof u === 'string' && /^https:\/\/\S+$/.test(u))) return { motivo: 'sem_referencia' }
  if (!Array.isArray(tiros) || tiros.length < 1 || tiros.length > 6) return { motivo: 'sem_gemini' }
  if (tiros.length !== falas.length) return { motivo: 'planos_desencontrados' }
  const quem = fotos.map((_, k) => String(nomesNoMotor[k] ?? '').replace(/\s+/g, ' ').trim())
  if (quem.some((n) => !n || n.length > 80 || /[<>"]/.test(n))) return { motivo: 'sem_referencia' }
  if (vozes.length < quem.length || vozes.slice(0, quem.length).some((v) => typeof v !== 'string' || !v.trim() || /[<>"]/.test(v))) return { motivo: 'sem_referencia' }
  let t = 0
  const linhas: string[] = []
  for (let k = 0; k < tiros.length; k++) {
    const s = tiros[k] && typeof tiros[k] === 'object' ? (tiros[k] as Record<string, unknown>) : null
    const d = s?.duration, p = s?.prompt
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || typeof p !== 'string' || !p.trim()) return { motivo: 'sem_gemini' }
    if (!p.endsWith(CAUDA_DA_BOCA_2511) || p.slice(0, -CAUDA_DA_BOCA_2511.length).includes('Mouth closed')) return { motivo: 'plano_sem_cauda' }
    const refs = new Set([...p.matchAll(REF_RE)].map((m) => Number(m[1]) - 1))
    if ([...refs].some((r) => r >= fotos.length) || /<IMAGE_REF_\d+>/.test(p)) return { motivo: 'sem_gemini' }
    const doPlano = falas[k] ?? []
    if (doPlano.some((l) => l.ref >= fotos.length || !refs.has(l.ref))) return { motivo: 'falante_fora_do_plano' }
    const ditas = doPlano.map((l) => `${quem[l.ref]} says: "${l.texto}"`)
    const caladas = [...refs].sort().filter((r) => !doPlano.some((l) => l.ref === r)).map((r) => `${quem[r]} listens with the mouth closed.`)
    const corpo = p.slice(0, -CAUDA_DA_BOCA_2511.length).replace(REF_RE, (_m, n) => `<IMAGE_REF_${Number(n) - 1}>`)
    linhas.push(`${t}-${t + d} s (shot ${k + 1}, hard cut): ${[corpo, ...ditas, ...caladas].join(' ')}`)
    t += d
  }
  if (t !== 15) return { motivo: 'sem_gemini' }
  const referencias = quem.length === 2
    ? `<IMAGE_REF_0> is ${quem[0]} and <IMAGE_REF_1> is ${quem[1]}; each keeps the same look and the same voice in every shot where they appear.`
    : `<IMAGE_REF_0> is ${quem[0]}, who keeps the same look and the same voice in every shot where they appear.`
  const voz = quem.map((n, k) => `${n} ${vozes[k]}.`).join(' ')
  const cabeca = `15-second vertical 9:16 film, ${tiros.length} shot${tiros.length === 1 ? '' : 's'} with hard cuts, with synchronized spoken dialogue in English. ` +
    `REFERENCES: ${referencias} VOICES: ${voz} Only the lines written below are spoken, exactly as written, with the lips in sync; no narrator, no other speech, no singing.`
  return { entrada: { prompt: [cabeca, ...linhas].join('\n'), image_urls: [...(fotos as string[])], duration: 15, resolution: '720p', aspect_ratio: '9:16' } }
}

// ═══ A conferência (8): as palavras que o motor disse (Whisper do áudio do clipe) × as falas escritas. Grava no claim; NÃO bloqueia (1ª entrega). ═══
export const CONFERENCIA_DA_FALA_2511_VERSAO = 'conferencia_da_fala_2511_v1'
const norm = (w: string) => String(w ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}']+/gu, '').replace(/^'+|'+$/g, '')
const tokens = (t: string) => palavras(t).map(norm).filter(Boolean)
/** nota = palavras escritas achadas NA ORDEM / palavras escritas (a maior subsequência comum); certa = nota ≥ 0,9 e inventadas ≤ max(2, 10%). */
export function conferirFala2511(ditas: ReadonlyArray<string>, falas: ReadonlyArray<ReadonlyArray<LinhaDeFala2511>>):
  { versao: string; nota: number; escritas: number; ditas: number; faltando: number; inventadas: number; certa: boolean } {
  const e = falas.flat().flatMap((l) => tokens(l.texto)), d = ditas.flatMap((w) => tokens(w))
  const m = e.length, n = d.length
  let prev = new Array<number>(n + 1).fill(0)
  for (let a = 1; a <= m; a++) {
    const cur = new Array<number>(n + 1).fill(0)
    for (let b = 1; b <= n; b++) cur[b] = e[a - 1] === d[b - 1] ? prev[b - 1] + 1 : Math.max(prev[b], cur[b - 1])
    prev = cur
  }
  const lcs = prev[n] ?? 0
  const nota = m ? Math.round((lcs / m) * 1000) / 1000 : 0
  const inventadas = n - lcs
  return { versao: CONFERENCIA_DA_FALA_2511_VERSAO, nota, escritas: m, ditas: n, faltando: m - lcs, inventadas, certa: m > 0 && nota >= 0.9 && inventadas <= Math.max(2, Math.ceil(m * 0.1)) }
}

/** O filme está FALADO de verdade na montagem: o claim pediu e montou falado E quem entregou foi o Gemini (sem queda). */
export function montagemFalada2511(marker: unknown, falModel: unknown): boolean {
  const m = marker && typeof marker === 'object' ? (marker as Record<string, unknown>) : null
  const f = m?.fala_2511 as Partial<MarcadorDaFala2511> | undefined
  return !!m && !!f && f.versao === FALA_DOS_PERSONAGENS_2511_VERSAO && f.modo === 'falado' && Array.isArray(f.falas) && f.falas.some((l) => Array.isArray(l) && l.length > 0) &&
    m.motor_do_clipe === 'gemini_omni_flash' && !m.gemini_queda && falModel === 'google/gemini-omni-flash/v1.2/reference-to-video'
}
