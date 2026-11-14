// ═══ KINEO-HISTORIA-REAL-1411 [CEO 13-14/11, item 3.3: "pessoa real com nome e época" + "objeto famoso com ficha de estilo", todo motor] ═══
// Três filmes de história real (H3 Max Turbo e Seedance, pago e da casa), lidos no claim:
//   (a) fc6c1ffb, Mona Lisa 1911 (PAGO, nota 5): o elenco semântico leu o quadro como personagem do tipo "object" e a ficha de objeto da casa é
//       a do objeto QUE FALA — "Mona Lisa, an anthropomorphic painting character: a painting with big expressive cartoon eyes, eyebrows and a
//       mouth, small arms and legs…". Num filme fotorreal o motor obedeceu: boneco de olhos enormes com braços saindo da moldura em 5 de 8 planos.
//   (b) o mesmo filme: "The thief was Vincenzo Peruggia" virou DUAS fichas da mesma pessoa — "the thief, a man in his thirties with neatly
//       combed hair…" (papel sem nome) e "Vincenzo Peruggia" (autor) — e o ladrão trocou de rosto entre o armário e Florença.
//   (c) b590f7b3, Ed Freeman 1965 (casa): "November fourteenth, nineteen sixty-five" — o ano por extenso (as falas da casa escrevem assim para
//       a voz) não era lido como época: farda camuflada atual e relógio digital em 1965. Idem "December, nineteen hundred" (faroleiros).
// AS REGRAS (código, sem GPT, sem lista de obras ou de pessoas):
//   1. objetoRealNoElenco — em filme NÃO desenhado, a ficha de objeto antropomórfico vira a do objeto de verdade: inanimado, realista, o mesmo
//      em toda cena (pintura: óleo realista em moldura). Filme desenhado ou comida que fala: fica como está.
//   2. papelEhONomeado — "The thief was Vincenzo Peruggia" / "Vincenzo Peruggia, the thief": o papel sem nome É a pessoa nomeada; não ganha
//      ficha própria (a do nomeado vale).
//   3. comAnosPorExtenso — "nineteen sixty-five", "nineteen hundred", "eighteen oh five", "two thousand and one", "mil novecentos e sessenta e
//      cinco" viram dígitos ANTES da leitura da época; a camada de época de sempre trava roupa, veículos e objetos da década.
// Valem em todo motor da estrada clássica (o elenco e a época alimentam H3, Kling 4, Seedance, Kling 2.5 e Veo). Interruptor HISTORIA_REAL_1411:
// 'off' = byte a byte o de antes. Guardião: scripts/test-historia-real-1411.mjs.

export type ModoHistoriaReal = 'off' | 'all'
export const HISTORIA_REAL_1411: ModoHistoriaReal = 'all'
export const historiaRealLigada = (modo: ModoHistoriaReal = HISTORIA_REAL_1411) => modo === 'all'
export const HISTORIA_REAL_VERSAO = 'historia_real_1411_v1'

// ── 3. ano por extenso ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const U: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 }
const TEEN: Record<string, number> = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 }
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
const SECULO: Record<string, number> = { sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 }
const u = Object.keys(U).join('|'), te = Object.keys(TEEN).join('|'), tn = Object.keys(TENS).join('|')
const EN_RE = new RegExp(`\\b(sixteen|seventeen|eighteen|nineteen)[\\s-]+(?:(hundred)|(?:(${te})|(${tn})(?:[\\s-]+(${u}))?|oh[\\s-]+(${u})))\\b`, 'gi')
const EN2000_RE = new RegExp(`\\btwo thousand(?:(?:\\s+and)?[\\s-]+(?:(${te})|(${tn})(?:[\\s-]+(${u}))?|(${u}))\\b|(?=\\s*[.,;!?]|\\s*$))`, 'gi')
const PU: Record<string, number> = { um: 1, dois: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9 }
const PTEEN: Record<string, number> = { dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 }
const PTENS: Record<string, number> = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 }
const PCENT: Record<string, number> = { seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 }
const pu = Object.keys(PU).join('|'), pte = Object.keys(PTEEN).join('|'), ptn = Object.keys(PTENS).join('|'), pc = Object.keys(PCENT).join('|')
const PT_RE = new RegExp(`\\bmil\\s+(${pc})(?:\\s+e\\s+(?:(${pte})|(${ptn})(?:\\s+e\\s+(${pu}))?|(${pu})))?(?![\\p{L}])`, 'giu')
const PT2000_RE = new RegExp(`\\bdois\\s+mil(?:\\s+e\\s+(?:(${pte})|(${ptn})(?:\\s+e\\s+(${pu}))?|(${pu}))(?![\\p{L}])|(?=\\s*[.,;!?]|\\s*$))`, 'giu')
const low = (s: unknown) => String(s ?? '').toLowerCase()

/** O texto com os anos por extenso em dígitos ("nineteen sixty-five" → "1965"). "She was nineteen, sixty miles away" e "two thousand soldiers" ficam. Pura. */
export function comAnosPorExtenso(texto: string | null | undefined): string {
  return String(texto ?? '')
    .replace(EN_RE, (_m, sec, hundred, teen, tens, un, oh) => String(SECULO[low(sec)] * 100 + (hundred ? 0 : teen ? TEEN[low(teen)] : tens ? TENS[low(tens)] + (un ? U[low(un)] : 0) : U[low(oh)])))
    .replace(EN2000_RE, (_m, teen, tens, un, so) => String(2000 + (teen ? TEEN[low(teen)] : tens ? TENS[low(tens)] + (un ? U[low(un)] : 0) : so ? U[low(so)] : 0)))
    .replace(PT_RE, (_m, c, teen, tens, un, so) => String(1000 + PCENT[low(c)] + (teen ? PTEEN[low(teen)] : tens ? PTENS[low(tens)] + (un ? PU[low(un)] : 0) : so ? PU[low(so)] : 0)))
    .replace(PT2000_RE, (_m, teen, tens, un, so) => String(2000 + (teen ? PTEEN[low(teen)] : tens ? PTENS[low(tens)] + (un ? PU[low(un)] : 0) : so ? PU[low(so)] : 0)))
}

// ── 2. o papel sem nome é a pessoa nomeada ───────────────────────────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NOME = String.raw`\p{Lu}[\p{L}'’.-]+(?:\s+\p{Lu}[\p{L}'’.-]+){0,3}`
/** "The thief was Vincenzo Peruggia" · "the pilot, Captain Ed Freeman," · "Vincenzo Peruggia, the thief" · "Ed Freeman was the pilot". Pura. */
export function papelEhONomeado(texto: string | null | undefined, nucleo: string | null | undefined): boolean {
  const t = String(texto ?? ''), n = esc(String(nucleo ?? '').trim())
  if (!t || !n) return false
  const papel = String.raw`(?:[Tt]he|[Oo]ur|[Tt]his)\s+(?:[\p{Ll}-]+\s+){0,3}${n}`
  return [
    new RegExp(String.raw`\b${papel}\s+(?:was|is|turned out to be|would be)\s+(?:(?:a|an|the)\s+)?(?:[\p{L}-]+\s+){0,2}?${NOME}`, 'u'),
    new RegExp(String.raw`\b${papel},\s+${NOME},`, 'u'),
    new RegExp(String.raw`${NOME},\s+(?:the|a|an)\s+(?:[\p{Ll}-]+\s+){0,3}${n}\b`, 'u'),
    new RegExp(String.raw`${NOME}\s+(?:was|is)\s+the\s+(?:[\p{Ll}-]+\s+){0,3}${n}\b`, 'u'),
  ].some((re) => re.test(t))
}

// ── 1. o objeto de verdade ───────────────────────────────────────────────────────────────────────────────────────────────────────
const ANTROPO_RE = /^(.+?), an anthropomorphic (.+?) character: a .+? with big expressive cartoon eyes/
const PINTURA_RE = /\b(?:painting|portrait|canvas|fresco|mural)\b/i
/** A ficha do objeto real: inanimado, realista, o mesmo em toda cena; pintura = óleo realista em moldura. Frases positivas (o motor não tem negativo). */
export function fichaDoObjetoReal(nome: string, especie: string): string {
  const esp = String(especie ?? '').trim().toLowerCase() || 'object'
  const pintura = PINTURA_RE.test(esp) ? ', a realistic oil painting on a flat canvas in a carved wooden frame' : ''
  return `${nome}, the real ${esp}: an ordinary inanimate ${esp}${pintura}, looking exactly like the real ${nome}, a lifeless object that people hold, carry and look at, photographed realistically, the same ${esp} in every scene`
}
/** No filme não desenhado, a ficha de objeto antropomórfico vira a do objeto real. `personificados` (comida que fala) e filme desenhado: intacto. */
export function objetoRealNoElenco<T extends { nome: string; canonica: string }>(elenco: ReadonlyArray<T>, o: { estilizado: boolean; personificados?: ReadonlySet<string> }): { elenco: T[]; trocados: string[] } {
  const trocados: string[] = []
  if (o.estilizado) return { elenco: [...elenco], trocados }
  const novo = elenco.map((f) => {
    const m = ANTROPO_RE.exec(String(f.canonica ?? ''))
    if (!m || o.personificados?.has(String(f.nome).trim().toLowerCase().replace(/^the\s+/, ''))) return f
    trocados.push(f.nome)
    return { ...f, canonica: fichaDoObjetoReal(m[1], m[2]) }
  })
  return { elenco: novo, trocados }
}
