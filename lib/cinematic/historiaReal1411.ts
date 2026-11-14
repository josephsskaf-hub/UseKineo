// ═══ KINEO-HISTORIA-REAL-1411 [CEO 13-14/11, item 3.3; v2 depois da revisão independente de 14/11] ═══════════════════════════════════════
// Os casos (lidos no claim): fc6c1ffb/b6068711, Mona Lisa 1911 (PAGO, roteiro colado, nota 5) — o leitor do elenco leu o quadro como personagem
// "object" e a ficha de objeto da casa é a do objeto QUE FALA ("an anthropomorphic painting character… big expressive cartoon eyes… small arms
// and legs"): boneco de olhos enormes em 5 de 8 planos; e "The thief was Vincenzo Peruggia" virou DUAS fichas da mesma pessoa ("the thief, a man
// in his thirties…" inventada pela camada de palavras + a do autor). b590f7b3, Ed Freeman 1965: "November fourteenth, nineteen sixty-five"
// não era lido como época.
//
// O QUE A REVISÃO INDEPENDENTE DERRUBOU (14/11) E COMO FICOU:
//   B1  o ano por extenso valia em todo lugar (anúncio, hollywood, herdado, régua) e lia "Two thousand five hundred years ago" como 2005,
//       "only nineteen ninety-five" como 1995. → Só a estrada clássica dentro do escopo pede a leitura, e só numa DATA EXPLÍCITA (mês ou
//       "the year"/"ano de" colado ao número). lib/cinematic/elencoEpoca.ts (comAnosPorExtenso, epocaDaHistoria(ctx, { anoPorExtenso })).
//   C1  a regra de palavra papelEhONomeado tirava a ficha de "the girl" em "Suddenly, the girl hears a voice". → A regra de palavra SAIU. Quem
//       decide é o elenco que o modelo já leu (sem chamada nova): se ele já tem gente com NOME e ficha do autor (genteNomeadaDoAutor), a
//       camada de palavras não inventa um protagonista sem nome.
//   C2  "Toasty wakes up at six. He yawns…" virava "an ordinary inanimate toaster… a lifeless object". → A troca vale só para OBRA DE ARTE
//       (pintura, retrato, tela, afresco, mural, estátua, escultura, busto), só em filme NÃO desenhado e só com a assinatura de história real:
//       a história tem ano/década E o elenco tem gente com nome do autor. Torradeira, carro, mascote, comida: nunca.
//
// ESCOPO: nasceu em 'gratis_ideia' (ordem da CEO 14/11: regra nova nasce no escopo mínimo) e foi aberto para 'all' pela CEO em 14/11 12:40, com ensaio
// no corpus pago e colado de 30 dias (docs/ENSAIO-HISTORIA-REAL-ALL-1411.md). 'gratis_ideia' → só o filme grátis (Kling 4) de ideia
// curta, não colado, não herdado. 'all' = toda a estrada clássica não herdada (o filme pago da Mona Lisa só é coberto aqui: decisão da CEO).
// 'off' = byte a byte o de antes. Guardião: scripts/test-historia-real-1411.mjs. Ensaio no banco real: docs do ensaio de 14/11.
import { HISTORIA_REAL_1411, epocaDaHistoria, type ModoHistoriaReal } from '@/lib/cinematic/elencoEpoca'
export { HISTORIA_REAL_1411, historiaRealLigada, HISTORIA_REAL_VERSAO, comAnosPorExtenso, type ModoHistoriaReal } from '@/lib/cinematic/elencoEpoca'

// ── o escopo ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const HISTORIA_REAL_IDEIA_MAX_PALAVRAS = 60
const palavras = (t: unknown) => String(t ?? '').trim().split(/\s+/u).filter(Boolean).length
/** O filme está dentro do escopo da regra? 'gratis_ideia': filme grátis, não colado, não herdado, pedido de 1 a 60 palavras. 'all': todo filme não herdado. */
export function escopoDaHistoriaReal(a: { gratis: boolean; verbatim: boolean; herdado: boolean; pedido: string | null | undefined }, modo: ModoHistoriaReal = HISTORIA_REAL_1411): boolean {
  if (modo === 'off' || a.herdado) return false
  if (modo === 'all') return true
  const n = palavras(a.pedido)
  return a.gratis === true && a.verbatim !== true && n >= 1 && n <= HISTORIA_REAL_IDEIA_MAX_PALAVRAS
}

/** A história tem época (ano ou década nas palavras; dentro do escopo, também a data explícita com o ano por extenso)? */
export const historiaTemEpoca = (texto: string | null | undefined): boolean => !!epocaDaHistoria(String(texto ?? ''), { anoPorExtenso: true })

// ── a pessoa com nome que o elenco já tem ────────────────────────────────────────────────────────────────────────────────────────
const ARTIGO_RE = /^(?:the|a|an|o|a|os|as|um|uma|el|la|los|las)\s/iu
/** O elenco lido (folha + leitor semântico) tem gente com NOME próprio e ficha do autor? Estrutura do elenco, nenhuma palavra do roteiro. */
export function genteNomeadaDoAutor(elenco: ReadonlyArray<{ nome?: unknown; tipo?: unknown; origem?: unknown }> | null | undefined): boolean {
  return (Array.isArray(elenco) ? elenco : []).some((f) => f?.tipo === 'humano' && f?.origem === 'autor' && String(f?.nome ?? '').trim().length > 1 && !ARTIGO_RE.test(String(f?.nome ?? '').trim()))
}
/** v2 [revisor 14/11, bloqueio 1]: os NOMES dessa gente, para a camada de época só tirar o papel que o texto liga a um deles. */
export function nomesDaGenteNomeadaDoAutor(elenco: ReadonlyArray<{ nome?: unknown; tipo?: unknown; origem?: unknown }> | null | undefined): string[] {
  return (Array.isArray(elenco) ? elenco : []).filter((f) => f?.tipo === 'humano' && f?.origem === 'autor' && String(f?.nome ?? '').trim().length > 1 && !ARTIGO_RE.test(String(f?.nome ?? '').trim())).map((f) => String(f.nome).trim())
}

// ── a obra de arte de verdade ────────────────────────────────────────────────────────────────────────────────────────────────────
const ANTROPO_RE = /^(.+?), an anthropomorphic (.+?) character: a .+? with big expressive cartoon eyes/
// a espécie que o leitor do elenco deu TERMINA no substantivo da obra ("painting", "oil painting", "marble statue"); "painting robot" não é obra
const PINTURA_RE = /(?:^|\s)(?:painting|portrait|canvas)$/i
const PAREDE_RE = /(?:^|\s)(?:fresco|mural)$/i
const ESCULTURA_RE = /(?:^|\s)(?:statue|sculpture|bust)$/i
/** A espécie é obra de arte? */
export function ehObraDeArte(especie: string | null | undefined): boolean {
  const e = String(especie ?? '').trim()
  return PINTURA_RE.test(e) || PAREDE_RE.test(e) || ESCULTURA_RE.test(e)
}
/** A ficha da obra real: inanimada, realista, a mesma em toda cena. Frases positivas (o motor não tem negativo). Espécie que não é obra: null. */
export function fichaDaObraReal(nome: string, especie: string): string | null {
  const esp = String(especie ?? '').trim().toLowerCase()
  const forma = PINTURA_RE.test(esp) ? 'a realistic oil painting on a flat canvas in a carved wooden frame'
    : PAREDE_RE.test(esp) ? `a real ${esp} painted on a flat wall`
    : ESCULTURA_RE.test(esp) ? `a real, solid ${esp} standing motionless on its base`
    : null
  if (!forma) return null
  const n = String(nome ?? '').trim()
  const igual = n && !ARTIGO_RE.test(n) ? `, looking exactly like the real ${n}` : '' // "the painting" (sem nome próprio) não ganha "the real the painting"
  return `${n}, the real ${esp}: ${forma}${igual}, a still work of art that people look at, hang, lift and carry, filmed in photorealistic live action, the same ${esp} in every scene` // "filmed in photorealistic live action": a trava de estilo (elencoTrava LINHA_FOTORREAL_RE) reconhece a ficha como já travada e NÃO acrescenta "a living creature…"
}
/**
 * No filme de HISTÓRIA REAL não desenhado, a ficha de "objeto que fala" de uma obra de arte vira a da obra real. Vale só quando: o filme não é
 * desenhado; a história tem época (ano/década); o elenco tem gente com nome do autor; a espécie é obra de arte; o nome não é comida que fala.
 * Qualquer outra coisa (torradeira, carro, mascote, estátua que ganha vida num conto sem data nem pessoa nomeada): intacta. Nunca lança.
 */
export function obraRealNoElenco<T extends { nome: string; canonica: string; tipo?: unknown; origem?: unknown }>(elenco: ReadonlyArray<T> | null | undefined, o: { estilizado: boolean; temEpoca: boolean; personificados?: ReadonlySet<string> | null }): { elenco: T[]; trocados: string[] } {
  const lista = Array.isArray(elenco) ? [...elenco] : []
  const trocados: string[] = []
  if (o?.estilizado !== false || o?.temEpoca !== true || !genteNomeadaDoAutor(lista)) return { elenco: lista, trocados }
  const novo = lista.map((f) => {
    const m = ANTROPO_RE.exec(String(f?.canonica ?? ''))
    if (!m || o.personificados?.has(String(f.nome ?? '').trim().toLowerCase().replace(/^the\s+/, ''))) return f
    const ficha = fichaDaObraReal(m[1], m[2])
    if (!ficha) return f
    trocados.push(f.nome)
    return { ...f, canonica: ficha }
  })
  return { elenco: novo, trocados }
}
