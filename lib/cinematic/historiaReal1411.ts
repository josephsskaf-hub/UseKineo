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

// As regras 2 e 3 e o interruptor moram em lib/cinematic/elencoEpoca.ts (quem as usa; os guardiões antigos carregam esse arquivo com
// carregadores próprios, sem import novo). Este módulo reexporta e guarda a regra 1 (a ficha do objeto real, usada pela rota).
export { HISTORIA_REAL_1411, historiaRealLigada, HISTORIA_REAL_VERSAO, comAnosPorExtenso, papelEhONomeado, type ModoHistoriaReal } from '@/lib/cinematic/elencoEpoca'

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
