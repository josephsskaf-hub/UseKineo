// ═══ KINEO-FICHA-REPROVADA-1911 [dono 19/11 20:2x: "pode fechar o furo da ficha"; CEO 19/11, prova paga] ═══════════════════════════════════════
// Prova paga 8e83778f (Natal): o leitor do elenco falhou por prazo, a ficha do Daniel ficou a do molde literal ("exactly as the author wrote: 'photos
// show Daniel'") com as ÂNCORAS lidas da folha (uma imagem que nós geramos: "20-30, long wavy brown, clean-shaven, light skin, wearing white tank top,
// blue jeans") e a ORIGEM "an American woman" — e foi assim a todo plano. O juiz do plano reprovou "a_ficha" (nota 75, planos 1-3) antes e depois, e
// nada segurou: o passo de antes das imagens (fichaAntesDoRender1311) só tira a ORDEM "The only person in this shot…" (refeitos: sem_ordem/nada), a
// revisão do A2 não reescreve ficha (reescrever a descrição não conserta o elenco) e o juiz final está em 'observe'.
// Aqui, com o interruptor: ficha reprovada pelo juiz (a_ficha) não vai ao motor.
//   1. Reescreve UMA vez: saem da ficha as partes que NÓS acrescentamos e que o texto do cliente não escreve — as âncoras lidas da folha
//      ("appearance anchors: …") e a origem ("origin: …"). O trecho do autor e o nome ficam. O juiz lê de novo (prazo do A2).
//   2. Continua reprovada (ou o juiz não respondeu): a ficha sai dos planos inteira (Identity:/Visible:, a cláusula "The same main character appears…",
//      a ordem "The only person in this shot…"). O plano fica com a ação; é o caminho sem ficha, mais seguro que mandar a ficha que o juiz reprovou.
// Nunca derruba o filme: erro em qualquer passo = o passo seguinte (sem ficha) ou, se nem isso, os planos como estavam. 'off' = byte a byte.
// LIMITE [9ª passada]: a ficha sai do TEXTO. A imagem-chave e a referência do personagem fixo foram desenhadas com ela e vão ao motor (63 de 77 envios
// reais têm imagem inicial). O evento conta quantas (limiteDaImagem); a proposta para a imagem está em docs/plano-da-fala-1911/FICHA-REPROVADA-LIMITE-DA-IMAGEM.md.
export type ModoFichaReprovada1911 = 'off' | 'internal' | 'public'
export const FICHA_REPROVADA_1911: ModoFichaReprovada1911 = 'internal' // CEO 19/11: 'internal' = só a conta exata do ensaio; 'public' só com revisor independente + prova paga + sim do dono
export const fichaReprovadaLigada = (modo: ModoFichaReprovada1911, contaDoEnsaio: boolean): boolean => modo === 'public' || (modo === 'internal' && contaDoEnsaio)
// KINEO-FICHA-REPROVADA-NO-HOJE-2011 [CEO 20/11, prova C filme 3 (1c770cb7)] — o passo só rodava dentro da revisão do A2: o filme que caía no caminho de
// hoje (descrição que não coube) levava ao motor a ficha que o juiz de ANTES das imagens já tinha reprovado (juiz_plano_ficha_antes, a_ficha, nota 75).
// Agora, fora do A2, o mesmo passo roda com o veredito desse juiz. Interruptor próprio: 'internal' = só a conta exata do ensaio.
export const FICHA_REPROVADA_NO_HOJE_2011: ModoFichaReprovada1911 = 'internal' // CEO 20/11: 'internal'; 'public' só com revisor + prova paga + sim do dono
export const FICHA_REPROVADA_VERSAO = 'ficha_reprovada_1911_v2' // v2 [revisor 19/11, 9ª passada]: corte só nos trechos da ficha, ORDEM cortada, feições, referência e limite da imagem
export const FICHA_REPROVADA_EVENTO = 'kling4_ficha_reprovada'

type VereditoDaFicha = { status?: string; falhas?: readonly string[] } | null | undefined
/** O juiz julgou e reprovou a ficha (a acusação já passou pela conferência de citação dele). */
export const fichaReprovada = (v: VereditoDaFicha): boolean => !!v && v.status === 'JUDGED' && (v.falhas ?? []).includes('a_ficha')

// ── [revisor 19/11, 9ª passada] o corte age só nos TRECHOS da ficha, nunca no plano inteiro ─────────────────────────────────────────────────────
// (1) O trecho citado pelo autor ("…") fica mascarado: um ";", um "origin:" ou reticências dentro dele não são a ficha e voltam byte a byte.
// (2) O valor da âncora e da origem termina em ";", em ponto final de frase (não no "1.80" nem no "Dr."), num ")" que fecha a ORDEM, ou antes da
//     proteção do fim. (3) A ORDEM cortada pelo teto de 512 (sem o ")" de fechar: deb1ec95 planos 1-3, a ficha inteira do pai) sai até a proteção do
//     fim. (4) Só a junta de cada corte é arrumada: a limpeza no plano inteiro fazia ".," (21007cc3, f7656858, 42bcd59f) e cortava o trecho do autor.
// (5) As feições ("Everyone shown has the natural features of X people.", 29 planos) são a origem repetida: saem com a origem.
const ABREVIACAO = String.raw`(?<!\b(?:Dr|Mr|Mrs|Ms|Mx|St|Jr|Sr|Prof|Mt|Sgt|Capt|Gen|Lt|Col|Rev|Fr|Sra|Dra|vs))`
const PONTO_FINAL = ABREVIACAO + String.raw`\.(?=\s|$)`
const PROTECAO_DO_FIM = String.raw`,?\s*(?:no readable text|no legible words|Mouth closed, no speaking)`
const ORDEM_ABRE = 'The only person in this shot is the same main character ('
const ORDEM_FECHADA_RE = /The only person in this shot is the same main character \((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\); any other person described below is replaced by this same character\.\s*/gu
const CLAUSULA_RE = new RegExp('The same main character appears in this scene, consistent design: .+?(?:' + PONTO_FINAL + '|(?=' + PROTECAO_DO_FIM + ')|$)', 'gu')
const LINHA_RE = new RegExp('(?:Visible(?:, seen from behind)?|Identity): .+?(?:' + PONTO_FINAL + '|(?=' + PROTECAO_DO_FIM + ')|$)', 'gu')
const FEICOES_RE = /(?:Everyone shown has|(?:The main person, if one is shown in this shot, is|The [a-z' -]+ in this shot (?:is|are)) [^.]+?) the natural features of [^.]+? people\./gu
const PROTECAO_RE = new RegExp(PROTECAO_DO_FIM, 'u')
const PROTECAO_AQUI_RE = new RegExp('^' + PROTECAO_DO_FIM, 'u')
const SEM_ABREVIACAO_NO_FIM_RE = new RegExp(ABREVIACAO + '$', 'u')
const MARCA_DO_VALOR_RE = /[;,]\s*(?:appearance anchors|origin):/gu

/** O trecho citado pelo autor vira um marcador opaco e volta no fim, byte a byte. Aspas sem fechar (o corte do elenco: 698974cc '"l; appearance
 *  anchors: 5-7') vão até a nossa marca seguinte ("; appearance anchors:", "; origin:") ou a proteção do fim. */
const ASPAS_RE = new RegExp('"[^"]*"|"(?:(?!;\\s*(?:appearance anchors|origin):|' + PROTECAO_DO_FIM + ')[^"])*', 'gu')
function mascarar(t: string): { m: string; volta: (s: string) => string } {
  if (/[\u0001\u0002]/u.test(t)) return { m: t, volta: (s) => s }
  const q: string[] = []
  const m = t.replace(ASPAS_RE, (x) => { q.push(x); return `\u0001${q.length - 1}\u0002` })
  return { m, volta: (s) => s.replace(/\u0001(\d+)\u0002/gu, (_x, i: string) => q[Number(i)]) }
}
type Trecho = [number, number]
const achados = (m: string, re: RegExp): Trecho[] => [...m.matchAll(re)].map((x) => [x.index ?? 0, (x.index ?? 0) + x[0].length] as Trecho)
/** Os trechos da ficha no plano (mascarado): a ORDEM (fechada, ou cortada pelo teto até a proteção do fim), a cláusula da ficha travada e Identity:/Visible:. */
function trechosDaFicha(m: string): Trecho[] {
  const t = achados(m, ORDEM_FECHADA_RE)
  for (let i = m.indexOf(ORDEM_ABRE); i >= 0; i = m.indexOf(ORDEM_ABRE, i + 1)) {
    if (t.some(([a, b]) => i >= a && i < b)) continue
    const resto = m.slice(i), fim = PROTECAO_RE.exec(resto)
    t.push([i, i + (fim ? fim.index : resto.length)])
  }
  return [...t, ...achados(m, CLAUSULA_RE), ...achados(m, LINHA_RE)]
}
/** Onde termina o valor de "appearance anchors:"/"origin:" que começa em `i`, sem passar de `fim`. */
function fimDoValor(m: string, i: number, fim: number): number {
  let fundo = 0
  for (let k = i; k < fim; k++) {
    const c = m[k]
    if (c === '(') fundo++
    else if (c === ')') { if (fundo === 0) return k; fundo-- }
    else if (fundo > 0) continue
    else if (c === ';') return k
    else if (c === '.' && (k + 1 >= m.length || /[\s,]/u.test(m[k + 1])) && SEM_ABREVIACAO_NO_FIM_RE.test(m.slice(0, k))) return k
    else if (c === ',' && PROTECAO_AQUI_RE.test(m.slice(k))) return k
  }
  return fim
}
/** A junta de um corte: um espaço, ou nada antes de pontuação; a vírgula órfã depois de ponto sai. Só a junta muda. */
function juntar(esq: string, dir: string): string {
  let l = esq.replace(/\s+$/u, ''), r = dir.replace(/^\s+/u, '')
  if (!l) return r
  if (!r) return l
  if (/[.!?]$/u.test(l) && /^[,;]/u.test(r)) r = r.replace(/^[,;]+\s*/u, '')
  if (/[,;:]$/u.test(l) && /^\./u.test(r)) l = l.replace(/[,;:]+$/u, '')
  return /^[,;.)]/u.test(r) ? l + r : `${l} ${r}`
}
function cortar(m: string, trechos: readonly Trecho[]): string {
  const partes: string[] = []
  let pos = 0
  for (const [a, b] of [...trechos].sort((x, y) => x[0] - y[0])) { if (b <= pos) continue; partes.push(m.slice(pos, Math.max(pos, a))); pos = b }
  partes.push(m.slice(pos))
  return partes.reduce((acc, p, i) => (i === 0 ? p : juntar(acc, p)), '')
}

/** A ficha sem o que NÓS acrescentamos: as âncoras lidas da folha, a origem e as feições da origem. Só dentro da ficha; o trecho do autor e o nome ficam. */
export function semAncorasDaFolha(plano: string): string {
  const t = String(plano ?? '')
  const { m, volta } = mascarar(t)
  const cortes: Trecho[] = []
  for (const [a, b] of trechosDaFicha(m)) for (const x of m.slice(a, b).matchAll(MARCA_DO_VALOR_RE)) { const i = a + (x.index ?? 0); cortes.push([i, fimDoValor(m, i + x[0].length, b)]) }
  cortes.push(...achados(m, FEICOES_RE))
  return cortes.length ? volta(cortar(m, cortes)) : t
}
/** O plano sem a ficha: a ORDEM "The only person in this shot…" (inteira ou cortada pelo teto), a cláusula da ficha travada, Identity:/Visible: e as
 *  feições da origem. A ação e a proteção do fim ficam. */
export function semFicha(plano: string): string {
  const t = String(plano ?? '')
  const { m, volta } = mascarar(t)
  const cortes = [...trechosDaFicha(m), ...achados(m, FEICOES_RE)]
  return cortes.length ? volta(cortar(m, cortes)) : t
}
// KINEO-FICHA-POR-PLANO-2011 [CEO 20/11, (ii) "a ficha antes da imagem, com o corte por plano"] — o elenco nomeado da CENA ("Named character in this
// shot: … — clearly visible in frame…"), que o compactador do Kling 4 vira "Visible:" (lib/cinematic/filmQuality.ts promptCurtoDoFilmeKling4).
const ELENCO_DA_CENA_RE = /(?:Named )?[Cc]haracters? in this shot: .+? — clearly visible in frame(?:, seen from behind or in profile, face not readable)?\.?/gu
/** O plano sem a SUA ficha (a ordem, a cláusula da ficha travada, Identity:/Visible: e o elenco nomeado da cena). Diferente de semFicha, as feições da
 *  origem ("Everyone shown has the natural features of X people.") FICAM: podem vir do pedido e não são a ficha que o juiz apontou neste plano. */
export function semFichaDoPlano(plano: string): string {
  const t = String(plano ?? '')
  const { m, volta } = mascarar(t)
  const cortes = [...trechosDaFicha(m), ...achados(m, ELENCO_DA_CENA_RE)]
  return cortes.length ? volta(cortar(m, cortes)) : t
}
/** Sem a ficha, a referência do personagem fixo (lib/kling4Trial.ts, a frase de continuidade de kling4PersonagemFixo) perde o que vem da ficha: "Keep the
 *  face and outfit of @Image1." e a roupa lida da canônica. Fica só a época e o cenário ("Use 1997 clothing…" ou "Match the clothing and setting of the
 *  story.", e o ambiente). A imagem fica (o limite). Nunca vazia: kling4Trial.ts (preso pelo recibo do test-k4-despacho-0211) não muda. */
const ERA_DA_CONTINUIDADE_RE = /(?:Use [^.]+ clothing, architecture and props\.|Match the clothing and setting of the story\.)/u
export const referenciaSemFicha = <T extends { continuity: string }>(r: T | undefined): T | undefined => {
  if (!r) return r
  const i = r.continuity.search(ERA_DA_CONTINUIDADE_RE)
  return { ...r, continuity: i >= 0 ? r.continuity.slice(i) : 'Match the clothing and setting of the story.' }
}
/** O limite honesto, no evento: a ficha reprovada sai do TEXTO; a imagem-chave e a referência do personagem foram desenhadas com ela e vão ao motor. */
export function limiteDaImagem(a: { acao: 'nada' | 'sem_ancoras' | 'sem_ficha'; imagens: readonly (string | null | undefined)[] | null; referencia: boolean }) {
  const mexeu = a.acao !== 'nada', desenhadas = a.imagens ? a.imagens.filter(Boolean).length : null
  return { imagens_com_a_ficha: mexeu ? desenhadas : 0, referencia_com_a_ficha: mexeu && a.referencia, ficha_so_saiu_do_texto: mexeu && ((desenhadas ?? 0) > 0 || a.referencia) }
}

export interface RelatoFichaReprovada { versao: string; acao: 'nada' | 'sem_ancoras' | 'sem_ficha'; reprovada_antes: boolean; reprovada_depois: boolean | null; ms: number }
/**
 * A ficha que vai ao motor. `veredito` = o juiz sobre os planos de agora; `julgarDeNovo` lê os planos com a ficha sem âncoras (o prazo é de quem chama).
 * Pura fora do juiz; nunca lança.
 */
export async function fichaQueVaiAoMotor(a: { veredito: VereditoDaFicha; prompts: readonly string[]; julgarDeNovo: (prompts: string[]) => Promise<VereditoDaFicha> }): Promise<{ prompts: string[]; relato: RelatoFichaReprovada }> {
  const t0 = Date.now()
  const base = [...a.prompts]
  const relato: RelatoFichaReprovada = { versao: FICHA_REPROVADA_VERSAO, acao: 'nada', reprovada_antes: fichaReprovada(a.veredito), reprovada_depois: null, ms: 0 }
  if (!relato.reprovada_antes) return { prompts: base, relato }
  try {
    const p1 = base.map(semAncorasDaFolha)
    if (p1.some((p, i) => p !== base[i])) {
      let v2: VereditoDaFicha = null
      try { v2 = await a.julgarDeNovo(p1) } catch { v2 = null }
      relato.reprovada_depois = v2 && v2.status === 'JUDGED' ? fichaReprovada(v2) : null
      if (relato.reprovada_depois === false) { relato.acao = 'sem_ancoras'; relato.ms = Date.now() - t0; return { prompts: p1, relato } }
    }
    relato.acao = 'sem_ficha'; relato.ms = Date.now() - t0
    return { prompts: base.map(semFicha), relato }
  } catch {
    relato.ms = Date.now() - t0
    return { prompts: base, relato }
  }
}
