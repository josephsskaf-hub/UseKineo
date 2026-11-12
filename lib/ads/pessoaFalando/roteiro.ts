// KINEO-ADS-PESSOA-FALANDO-1111 — passo A da spec: o escritor (gpt-4o-mini) devolve { fala, gestos: [{ palavra, gesto }] } e o CÓDIGO confere
// (contagem 22–31, gancho na 1ª frase, nenhum clichê, nada de "not sponsored", nenhum número que o cliente não deu, 1 detalhe concreto dele quando
// ele deu um, 2–3 gestos amarrados a palavras que EXISTEM na fala). Reprovou = reescreve até 2 vezes com os motivos. Puro: `pedir` faz a chamada.
import { apresentador, formato, type ApresentadorId, type FormatoId } from './formatos'

export interface Gesto { palavra: string; gesto: string }
export interface Roteiro { fala: string; gestos: Gesto[] }
export interface EntradaRoteiro { produto: string; frase: string; apresentadorId: ApresentadorId; formatoId: FormatoId }

export const CLICHES = ['game-changer', 'game changer', 'must-have', 'must have', 'revolutionary', 'life-changing', 'life changing', 'holy grail', 'next level', 'next-level', 'not sponsored', 'not an ad', "i'm not paid", 'i am not paid', 'unpaid review', 'trust me bro'] as const
const NUMERO_POR_EXTENSO: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000 }
const norm = (t: unknown) => String(t ?? '').replace(/\s+/gu, ' ').trim()
const palavras = (t: string) => norm(t).split(' ').filter((w) => /[\p{L}\p{N}]/u.test(w))
/** Os números da fala (algarismos e por extenso). "One pump" conta; "one thing" também — a régua é: só número que o cliente deu. */
export function numerosDe(texto: string): number[] {
  const t = norm(texto).toLowerCase()
  const dig = [...t.matchAll(/\d+(?:[.,]\d+)?/gu)].map((m) => Number(m[0].replace(',', '.')))
  const ext = [...t.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/gu)].map((m) => NUMERO_POR_EXTENSO[m[1]])
  return [...dig, ...ext]
}

/** A régua do roteiro, em código. [] = aprovado. */
export function validarRoteiro(r: Roteiro | null | undefined, entrada: Pick<EntradaRoteiro, 'frase' | 'produto'>): string[] {
  const m: string[] = []
  if (!r || typeof r.fala !== 'string' || !Array.isArray(r.gestos)) return ['formato_invalido']
  const fala = norm(r.fala), n = palavras(fala).length
  if (n < 22 || n > 31) m.push(`palavras_${n}_fora_de_22_31`) // KINEO-ADS-PESSOA-FALANDO-REGUA-1211 [CEO 12/11]: a Veil aprovada tem 31
  const primeira = fala.split(/(?<=[.!?])\s+/u)[0] ?? ''
  if (palavras(primeira).length > 16) m.push('gancho_longo') // o gancho aprovado do Halo tem 15
  const baixo = fala.toLowerCase()
  for (const c of CLICHES) if (baixo.includes(c)) m.push(`cliche_${c}`)
  // nenhum número que o cliente não deu ("one" como artigo — "one thing", "one pump" — é tolerado só se o cliente não deu número nenhum e for o número 1)
  const doCliente = new Set(numerosDe(`${entrada.frase} ${entrada.produto}`))
  for (const x of numerosDe(fala)) if (!doCliente.has(x) && !(x === 1)) m.push(`numero_inventado_${x}`)
  const fortes = [...doCliente].filter((x) => x !== 1) // "one pump" é jeito de falar, não detalhe
  if (fortes.length > 0 && !numerosDe(fala).some((x) => fortes.includes(x))) m.push('sem_detalhe_do_cliente')
  if (r.gestos.length < 2 || r.gestos.length > 3) m.push(`gestos_${r.gestos.length}`)
  for (const g of r.gestos) {
    const p = norm(g?.palavra).toLowerCase().replace(/[^\p{L}\p{N}' -]/gu, '')
    if (!p || !new RegExp(`(?<![\\p{L}\\p{N}])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu').test(fala)) m.push(`gesto_sem_palavra_${p || 'vazio'}`)
    if (!norm(g?.gesto) || norm(g?.gesto).length > 140) m.push('gesto_vazio_ou_longo')
  }
  return m
}

/** O motivo do código em instrução que o escritor entende ("palavras_16_fora_de_22_30" não fazia ele escrever mais). */
function explicar(m: string): string {
  const p = /^palavras_(d+)_/.exec(m)
  if (p) return Number(p[1]) < 22 ? `The line had ${p[1]} words; it MUST have 22 to 31 — add one more short sentence with another real detail the customer gave.` : `The line had ${p[1]} words; it MUST have 22 to 31 — cut it down.`
  if (m === 'gancho_longo') return 'The first sentence was too long; make the hook 15 words or fewer.'
  if (m === 'sem_detalhe_do_cliente') return 'Use one of the numbers the customer gave (a time, a price, a quantity).'
  if (m.startsWith('numero_inventado_')) return `You used the number ${m.slice(17)}, which the customer never gave; remove it.`
  if (m.startsWith('cliche_')) return `Remove the cliché "${m.slice(7)}".`
  if (m.startsWith('gesto_sem_palavra_')) return `The gesture word "${m.slice(18)}" is not in the line; tie each gesture to a word that IS in the line.`
  if (m.startsWith('gestos_')) return 'Give 2 or 3 gestures.'
  return m
}
/** A mensagem do escritor. */
export function mensagemDoEscritor(e: EntradaRoteiro, motivosAnteriores: string[] = []): string {
  const a = apresentador(e.apresentadorId), f = formato(e.formatoId)
  if (!a || !f) throw new Error('pessoa_falando_entrada_invalida')
  return [
    `Write the spoken line for a 10–12 second vertical UGC ad. ${a.nome} (${a.pronome}) holds the product and talks straight to the camera, ${f.cenario}.`,
    `Product: ${norm(e.produto)}. What the customer says it does: ${norm(e.frase)}.`,
    'Rules: 22 to 31 words in total (aim for about 26 words, usually three short sentences), casual spoken English, contractions welcome. The FIRST sentence is a hook of at most 15 words.',
    'Use ONE concrete detail the customer gave (a time, a price, a number, a feature). Never invent a number, a price, a study, an award or a time the customer did not give.',
    `Never use clichés (${CLICHES.slice(0, 8).join(', ')}) and never say it is not sponsored or not paid.`,
    `Add 2 or 3 gestures; each one is tied to ONE word that appears in the line, and describes what ${a.pronome} does with the product or ${a.possessivo} face on that word (short, under 15 words, e.g. "tilts the cup toward the lens to show the ice"). Never point at a price tag, a label, a sticker or any text.`,
    motivosAnteriores.length ? `Your previous answer was rejected: ${motivosAnteriores.map(explicar).join(' ')} Fix exactly that.` : '',
    'Return JSON only: {"fala": "...", "gestos": [{"palavra": "...", "gesto": "..."}]}',
  ].filter(Boolean).join('\n')
}

/** Escreve e confere; até 2 reescritas. roteiro null = não passou: a rota ABRE a fala para o cliente editar (CEO 12/11), com o último rascunho e os motivos. */
export async function escreverRoteiro(e: EntradaRoteiro, pedir: (mensagem: string) => Promise<string>): Promise<{ roteiro: Roteiro | null; rascunho: Roteiro | null; tentativas: number; motivos: string[] }> {
  let motivos: string[] = [], rascunho: Roteiro | null = null
  for (let t = 1; t <= 3; t++) {
    let r: Roteiro | null = null
    try { r = JSON.parse(await pedir(mensagemDoEscritor(e, motivos))) as Roteiro } catch { motivos = ['json_invalido']; continue }
    motivos = validarRoteiro(r, e)
    const limpo = r && typeof r.fala === 'string' && Array.isArray(r.gestos) ? { fala: norm(r.fala), gestos: r.gestos.map((g) => ({ palavra: norm(g?.palavra), gesto: norm(g?.gesto) })) } : null
    if (limpo) rascunho = limpo
    if (!motivos.length && limpo) return { roteiro: limpo, rascunho: limpo, tentativas: t, motivos: [] }
  }
  return { roteiro: null, rascunho, tentativas: 3, motivos } // KINEO-ADS-PESSOA-FALANDO-REGUA-1211 — a rota mostra o rascunho para o cliente editar (nunca recusa sem deixar editar)
}
