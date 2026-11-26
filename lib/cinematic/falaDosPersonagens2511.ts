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
// [CEO 25/11] o piso do filme FALADO (12 palavras), lido pelos dois portões de tamanho; mora no módulo sem import para o escritor do servidor ler sem a régua
export { PALAVRAS_MIN_NO_FILME_FALADO_2511, falasDoRoteiroSemElenco2511, roteiroFaladoNoPortao2511 } from '@/lib/cinematic/roteiroFalado2511'
import { PALAVRAS_MIN_NO_FILME_FALADO_2511 } from '@/lib/cinematic/roteiroFalado2511' // KINEO-FALA-NO-ENSAIO-2611 — o piso do falado, também no ensaio
import { ANTES_DE_OUTRA_PESSOA_2511 } from '@/lib/cinematic/referenciaUnica2411' // [revisora 52b12696, boca errada] o mesmo corte da régua
import { falanteConhecido2511, falanteAdulto2511 } from '@/lib/cinematic/reguaDaPessoaNaFala2511' // [revisora 392f0a52, T1 e T2] quem fala

export const FALA_DOS_PERSONAGENS_2511_VERSAO = 'fala_dos_personagens_2511_v1'
export type ModoFalaDosPersonagens2511 = 'off' | 'internal' | 'public'
/** 'internal' = só a lista EXATA da casa; cliente e 'off' = o pedido de hoje, byte a byte (nenhum campo novo). Voltar: 'off'. */
export const FALA_DOS_PERSONAGENS_2511: ModoFalaDosPersonagens2511 = 'internal'
export const falaDosPersonagensLigada = (modo: ModoFalaDosPersonagens2511, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))

/** [CEO 25/11, contrato combinado com o GPT] o corpo do pedido: voice_mode 'characters' = o modo falado; 'narrator', qualquer outra coisa ou nada = o narrador de
 *  sempre (o pedido de hoje, byte a byte). Não depende de script_mode: o roteiro do cliente ou o do nosso escritor, com linhas "Nome: fala", vale igual. */
export type VozDoFilme2511 = 'narrador' | 'personagens'
export function vozPedida2511(body: unknown): VozDoFilme2511 {
  const v = body && typeof body === 'object' ? (body as { voice_mode?: unknown }).voice_mode : undefined
  return v === 'characters' ? 'personagens' : 'narrador'
}

export type MotivoNarrado2511 =
  | 'lingua' | 'sem_gemini' | 'sem_referencia' | 'roteiro_sem_falas' | 'fala_fora_do_formato' | 'falante_fora_do_elenco' | 'fala_longa'
  | 'planos_desencontrados' | 'falante_fora_do_plano' | 'plano_sem_cauda' | 'fala_com_pessoa_real' | 'gemini_recusou_no_envio' | 'gemini_caiu'
  | 'falante_conhecido' /* [T1] quem fala é figura conhecida, pessoa real, personagem de obra ou de marca */ | 'falante_menor' /* [T2] filme fotorreal: quem fala não é adulto provado */
export type LinhaDeFala2511 = { ref: 0 | 1; nome: string; texto: string }
/** O marcador que viaja no claim (kling4_trial.fala_2511) e que o compose lê. */
export type MarcadorDaFala2511 = { versao: string; pedida: 'characters'; modo: 'falado' | 'narrado'; motivo: MotivoNarrado2511 | null; falas?: LinhaDeFala2511[][] }

/** [revisora 392f0a52, T4] no modo falado não há narração a medir: o tempo de cada plano no pedido FALADO sai das palavras (duracoesDaFala2511), e o teto é
 *  de 3 palavras por segundo do plano repartido (fala rápida, ainda natural). No filme inteiro: até 45 palavras (3 × 15 s). O roteiro-limite do escritor (até 8
 *  por seção, 25 a 35 no filme) sempre cabe. */
export const PALAVRAS_POR_SEGUNDO_2511 = 3
export const PALAVRAS_NO_FILME_2511 = 45
/** O piso de cada plano no pedido falado (o plano calado também fica na tela). */
export const PISO_DO_PLANO_FALADO_2511 = 2
const palavras = (t: string) => String(t ?? '').trim().split(/\s+/u).filter(Boolean)
const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const limpaFala = (t: string) => String(t ?? '').replace(/\s+/gu, ' ').trim().replace(/^["“”'‘’]+|["“”'‘’]+$/gu, '').trim().replace(/["“”]/gu, "'")

/** As falas de cada plano, lidas da fala (voiceover) de cada plano. `nomes[k]` = os nomes do personagem da referência k (o 1º é o que vai ao motor).
 *  `planos` = quantos planos o pedido tem (a fala de cada plano é uma entrada). Fora do formato = o motivo (o filme sai narrado). */
export function lerFalas2511(falasDosPlanos: ReadonlyArray<string>, nomes: ReadonlyArray<ReadonlyArray<string>>, planos: number):
  { falas: LinhaDeFala2511[][] } | { motivo: MotivoNarrado2511 } {
  if (!Array.isArray(falasDosPlanos) || falasDosPlanos.length === 0 || falasDosPlanos.length !== planos) return { motivo: 'planos_desencontrados' }
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
    }
    falas.push(linhas)
  }
  if (!falas.some((l) => l.length)) return { motivo: 'roteiro_sem_falas' }
  if (falas.flat().reduce((s, l) => s + palavras(l.texto).length, 0) > PALAVRAS_NO_FILME_2511) return { motivo: 'fala_longa' }
  return { falas }
}

/** [T4] O tempo de cada plano no pedido FALADO: o piso de 2 s para cada um e o resto dos 15 s repartido pelas palavras (maior resto), inteiros, soma 15.
 *  Sem nenhuma palavra = partes iguais. Fora do formato (planos demais para o piso) = null. */
export function duracoesDaFala2511(falas: ReadonlyArray<ReadonlyArray<LinhaDeFala2511>>, total = 15): number[] | null {
  const n = falas.length
  if (!n || n * PISO_DO_PLANO_FALADO_2511 > total) return null
  const w = falas.map((l) => l.reduce((s, x) => s + palavras(x.texto).length, 0))
  const W = w.reduce((a, b) => a + b, 0), resto = total - n * PISO_DO_PLANO_FALADO_2511
  const quota = w.map((x) => (W ? (resto * x) / W : resto / n))
  const d = quota.map((q) => PISO_DO_PLANO_FALADO_2511 + Math.floor(q))
  let falta = total - d.reduce((a, b) => a + b, 0)
  const ordem = quota.map((q, i) => [q - Math.floor(q), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1])
  for (let k = 0; falta > 0; k = (k + 1) % n, falta--) d[ordem[k][1]]++
  return d
}

/** [T1 e T2] quem fala pode falar: nenhuma figura conhecida, pessoa real, personagem de obra ou de marca; no filme FOTORREAL, só adulto provado (falha
 *  fechada). `fichas[k]` = a ficha do personagem da referência k (nome, núcleo, canônica); sem ficha = só os nomes (sem sinal de adulto = barra). */
export function admitirFalantes2511(falas: ReadonlyArray<ReadonlyArray<LinhaDeFala2511>>, fichas: ReadonlyArray<{ nome?: unknown; nucleo?: unknown; canonica?: unknown } | null>,
  nomes: ReadonlyArray<ReadonlyArray<string>>, estilizado: boolean): MotivoNarrado2511 | null {
  const quem = [...new Set(falas.flat().map((l) => l.ref))]
  for (const r of quem) {
    const f = fichas[r] ?? { nome: nomes[r]?.[0], nucleo: nomes[r]?.[1] ?? nomes[r]?.[0] }
    if (falanteConhecido2511(f) || (nomes[r] ?? []).some((n) => falanteConhecido2511({ nome: n }))) return 'falante_conhecido'
  }
  if (!estilizado) for (const r of quem) {
    const f = fichas[r] ?? { nome: nomes[r]?.[0], nucleo: nomes[r]?.[1] ?? nomes[r]?.[0] }
    if (!falanteAdulto2511(f, falas.flat().map((l) => l.texto))) return 'falante_menor'
  }
  return null
}

// [CEO 25/11, combinado com a 2c5749dd (volta 7): REGRA ÚNICA DO RÓTULO] quem fala pelo PAPEL usa o NÚCLEO do papel ("Keeper", "Captain"). O personagem COM nome
// ("a pirate captain named Rosa") fica no elenco só como "Rosa", e o escritor não põe nome de gente no rótulo: o leitor aceita também o núcleo do papel
// dele, tirado da canônica ("Rosa, a pirate captain, …" → "captain"). Só quando o papel é ÚNICO entre os falantes e não é o nome de outro (ambíguo = não
// casa = narrado). Sem o aposto na canônica (só o nome), nada muda. Os nomes que vão ao motor e às frases da referência NÃO mudam (só a leitura das falas).
const escapaPapel = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** O núcleo do papel na canônica: a 1ª oração depois do nome, "a/an/the … X" (sem o "named …"), X = a última palavra. Sem isso, null. */
export function papelDaFicha2511(f: { nome?: unknown; nucleo?: unknown; canonica?: unknown } | null | undefined): string | null {
  let t = typeof f?.canonica === 'string' ? f.canonica.trim() : ''
  for (const n of [f?.nome, f?.nucleo]) if (typeof n === 'string' && n.trim()) t = t.replace(new RegExp('^' + escapaPapel(n.trim()) + '(?:\\s*[,:—–-]\\s*|\\s+(?:is|was)\\s+)', 'iu'), '')
  const inteira = (t.split(/[,;.\n]/u)[0] ?? '').replace(/\s+(?:named|called|who|that|which|whose)\s+.*$/iu, '').trim()
  // [revisora 52b12696, boca errada] "the wife of the captain" é a ESPOSA, não o capitão: corta antes de of/by/with/beside/… (o corte da régua). Com "'s"
  // ("the captain's wife") o substantivo antes é de OUTRA pessoa: sem papel. Sem isso, "Captain:" saía da boca da Mara.
  const corte = ANTES_DE_OUTRA_PESSOA_2511.exec(inteira)
  if (corte && /^['’]s$/iu.test(corte[0])) return null
  const oracao = corte ? inteira.slice(0, corte.index).trim() : inteira
  const m = /^(?:a|an|the)\s+((?:[\p{L}'’-]+\s+){0,3}[\p{L}'’-]+)$/iu.exec(oracao)
  if (!m) return null
  const nucleo = (m[1].split(/\s+/u).pop() ?? '').toLowerCase()
  return nucleo.length >= 3 && nucleo.length <= 20 && /^\p{L}+$/u.test(nucleo) ? nucleo : null
}
/** Os nomes que o leitor das falas aceita para cada referência: os de sempre + o núcleo do papel, quando ele é único e não é o nome de outro. */
export function nomesDaFala2511(nomes: ReadonlyArray<ReadonlyArray<string>>, fichas: ReadonlyArray<{ nome?: unknown; nucleo?: unknown; canonica?: unknown } | null>): string[][] {
  const papeis = nomes.map((_, k) => papelDaFicha2511(fichas[k] ?? null))
  return nomes.map((lista, k) => {
    const p = papeis[k]
    const outro = (q: string) => nomes.some((l, j) => j !== k && l.some((n) => String(n).trim().toLowerCase() === q))
    if (!p || papeis.filter((x) => x === p).length > 1 || outro(p) || lista.some((n) => String(n).trim().toLowerCase() === p)) return [...lista]
    return [...lista, p]
  })
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
  // [T4] o tempo de cada plano no pedido falado vem das palavras (o do Kling 4 era o da narração medida); o pedido do Kling 4 da queda fica com o de hoje
  if (tiros.reduce((s: number, x) => s + (x && typeof x === 'object' && Number.isInteger((x as { duration?: unknown }).duration) ? Number((x as { duration: number }).duration) : NaN), 0) !== 15) return { motivo: 'sem_gemini' }
  const tempos = duracoesDaFala2511(falas)
  if (!tempos) return { motivo: 'planos_desencontrados' }
  let t = 0
  const linhas: string[] = []
  for (let k = 0; k < tiros.length; k++) {
    const s = tiros[k] && typeof tiros[k] === 'object' ? (tiros[k] as Record<string, unknown>) : null
    const d = tempos[k], p = s?.prompt
    if (typeof p !== 'string' || !p.trim()) return { motivo: 'sem_gemini' }
    if ((falas[k] ?? []).reduce((n, l) => n + palavras(l.texto).length, 0) > Math.floor(PALAVRAS_POR_SEGUNDO_2511 * d)) return { motivo: 'fala_longa' }
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

// KINEO-FALA-NO-ENSAIO-2611 [CEO 26/11] — o dry_run da casa devolvia só a régua do NARRADO (que conta os rótulos "Nome:") e não dizia se o filme sairia falado:
// o bloco da fala mora no envio, depois do dry_run. Esta PREVISÃO usa as MESMAS peças do envio (lerFalas2511, nomesDaFala2511, admitirFalantes2511,
// duracoesDaFala2511, a lista de pessoas reais), sobre o elenco que o dry_run já calculou. A folha, a referência e o pedido ao Gemini só existem no envio:
// PASS aqui = o que depende do texto e das fichas está certo; não prova a folha nem o Gemini. Nada gasta, nada muda no envio.
export const FALA_NO_ENSAIO_2611_VERSAO = 'fala_no_ensaio_2611_v1'
export type MotivoDoEnsaioDaFala2611 = MotivoNarrado2511 | 'nao_pedido' | 'chave_desligada' | 'sem_elenco' | 'palavras_fora' | 'duracao' | 'ficha_sem_descricao'
export type EnsaioDaFala2611 = {
  versao: string; veredito: 'PASS' | 'FAIL'; modo: 'falado' | 'narrado'; motivo: MotivoDoEnsaioDaFala2611 | null
  falantes: string[]; falas: LinhaDeFala2511[][] | null; segundos_dos_planos: number[] | null; palavras: number; faixa: [number, number]; aviso: string
}
type FichaDoEnsaio2611 = { nome?: unknown; nucleo?: unknown; canonica?: unknown; tipo?: unknown; protagonista?: unknown }
export function ensaioDaFala2611(a: {
  pedida: boolean; ligada: boolean; ingles: boolean; gemini: boolean; estilizado: boolean
  falasDosPlanos: ReadonlyArray<string>; elenco: ReadonlyArray<FichaDoEnsaio2611>; mencionaPessoaReal: (texto: string) => boolean
  descritos?: ReadonlyArray<string> /* (2) os falantes cuja ficha saiu da descrição do autor na marca (descricoesDasMarcas2611) */
}): EnsaioDaFala2611 {
  const faixa: [number, number] = [PALAVRAS_MIN_NO_FILME_FALADO_2511, PALAVRAS_NO_FILME_2511]
  const aviso = 'previsão pelo texto e pelas fichas: a folha, a referência e o pedido ao Gemini só existem no envio'
  const humanos = [...a.elenco].filter((f) => f && f.tipo === 'humano' && typeof f.nome === 'string' && f.nome.trim())
    .sort((x, y) => Number(y.protagonista === true) - Number(x.protagonista === true)).slice(0, 2)
  const falantes = humanos.map((f) => String(f.nome))
  const base = { versao: FALA_NO_ENSAIO_2611_VERSAO, falantes, falas: null, segundos_dos_planos: null, palavras: 0, faixa, aviso }
  const nao = (motivo: MotivoDoEnsaioDaFala2611, extra: Partial<EnsaioDaFala2611> = {}): EnsaioDaFala2611 => ({ ...base, ...extra, veredito: 'FAIL', modo: 'narrado', motivo })
  if (!a.pedida) return nao('nao_pedido')
  if (!a.ligada) return nao('chave_desligada')
  if (!a.ingles) return nao('lingua')
  if (!a.gemini) return nao('sem_gemini')
  if (!humanos.length) return nao('sem_elenco')
  const nomes = humanos.map((f) => [...new Set([f.nome, f.nucleo].filter((n): n is string => typeof n === 'string' && !!n.trim()).map((n) => n.trim()))])
  const lidas = lerFalas2511(a.falasDosPlanos, nomesDaFala2511(nomes, humanos), a.falasDosPlanos.length)
  if ('motivo' in lidas) return nao(lidas.motivo)
  const falas = lidas.falas
  const n = falas.flat().reduce((s, l) => s + palavras(l.texto).length, 0)
  if (a.mencionaPessoaReal(falas.flat().map((l) => l.texto).join(' '))) return nao('fala_com_pessoa_real', { falas, palavras: n })
  // (2) o PASS exige a ficha de cada falante com a descrição do autor (a da marca): sem ela o rosto sai sorteado e a idade some
  if ([...new Set(falas.flat().map((l) => l.nome))].some((nm) => !(a.descritos ?? []).includes(nm))) return nao('ficha_sem_descricao', { falas, palavras: n })
  const quem = admitirFalantes2511(falas, humanos, nomes, a.estilizado)
  if (quem) return nao(quem, { falas, palavras: n })
  if (n < faixa[0] || n > faixa[1]) return nao('palavras_fora', { falas, palavras: n })
  const segundos = duracoesDaFala2511(falas, 15)
  if (!segundos) return nao('duracao', { falas, palavras: n, segundos_dos_planos: segundos })
  return { ...base, falas, palavras: n, segundos_dos_planos: segundos, veredito: 'PASS', modo: 'falado', motivo: null }
}

// KINEO-FALA-NO-ENSAIO-2611 (2) [CEO 26/11] — no roteiro FALADO a seção só tem `Nome: fala` fora das marcas; a leitura do elenco tomava a FALA como descrição
// ("Thomas, Then we give them light, exactly as the author wrote") e deixava o "]" e a fala vazarem ("…during a storm] Maria: There is a boat…"). No modo
// falado, a ficha de cada falante sai da descrição DENTRO da marca [Pexels: …] da 1ª seção que o descreve: o trecho "Nome, a/an/the/N…" da própria marca
// (nunca passa do "]": só a marca é lida), cortado na vírgula de lugar ou de ação (", at the lighthouse…", ", watching…"). A linha `Nome: fala` nunca é
// lida aqui, e o vocativo da fala não troca o dono (só conta o nome que ABRE o aposto dentro da marca). Sem descrição na marca = a ficha fica como está.
const CORTE_DE_LUGAR_2611 = /,\s*(?:at|in|on|inside|outside|near|by|under|beside|behind|during|while|from|with|on\s+top\s+of|\p{L}+ing)(?![\p{L}])/iu
export function descricoesDasMarcas2611(marcas: ReadonlyArray<string | null | undefined>, nomes: ReadonlyArray<string>): Map<string, string> {
  const fora = new Map<string, string>()
  for (const nome of nomes) {
    const n = String(nome ?? '').trim()
    if (!n || fora.has(n)) continue
    const re = new RegExp('(?<![\\p{L}\\p{N}])' + escapa(n) + ',\\s+((?:(?:a|an|the)\\s|\\d)[^\\]\\[]*)', 'iu') // o artigo inteiro ("Then we…" não é "the")
    for (const marca of marcas) {
      const m = re.exec(String(marca ?? ''))
      if (!m) continue
      const corte = CORTE_DE_LUGAR_2611.exec(m[1])
      const desc = (corte ? m[1].slice(0, corte.index) : m[1]).replace(/[\s,;.:]+$/u, '').trim()
      if (desc.split(/\s+/u).length >= 2) { fora.set(n, n + ', ' + desc); break }
    }
  }
  return fora
}
