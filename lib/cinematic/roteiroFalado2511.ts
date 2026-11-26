// KINEO-FALA-DOS-PERSONAGENS-2511 [CEO 25/11 20:xx: "a exceção própria do FALADO nos dois portões que hoje aplicam o piso do filme narrado"] — o roteiro FALADO
// visto ANTES do elenco existir (os portões do tamanho: pisoDoPortao/avaliarRoteiroEscrito no escritor do servidor e a cobertura narrationFitAt da rota). O piso
// do filme narrado (~35 palavras para cobrir 15 s de voz) não vale aqui: no falado a voz é do motor e o tempo dos planos sai das palavras (duracoesDaFala2511).
// Sem import nenhum (os dois portões o leem sem puxar a régua de pessoa). A constante é reexportada por lib/cinematic/falaDosPersonagens2511.ts.

/** O piso do filme FALADO: 12 palavras ditas no filme (3 a 4 falas de 3 a 6 palavras); o teto é o do leitor (45). */
export const PALAVRAS_MIN_NO_FILME_FALADO_2511 = 12
export const PALAVRAS_MAX_NO_FILME_FALADO_2511 = 45
/** KINEO-FALA-PARA-CLIENTE-2611 [CEO 26/11, decisão A: "sem erros"] o piso do CLIENTE: 29 palavras ditas, o piso do narrado do filme grátis de 15 s em inglês
 *  (pisoDoPortao). Assim a queda para o narrado nunca sai curta (fala e depois música = filme ruim já pago). Abaixo disso, o 422 do narrado, antes de
 *  despachar. A casa fica em 12. O teto é o mesmo (45). */
export const PALAVRAS_MIN_NO_FILME_FALADO_CLIENTE_2611 = 29
/** Rótulos que nunca são falante (estrutura, direção, meta). */
const NAO_E_FALANTE = /^(?:pexels|camera|music|scene|shot|caption|captions|sfx|note|notes|title|hook|payoff|narrator|narration|voice|voiceover|visual|visuals|footage|transition|text|cut|fade|micro reward(?:\s+\d+)?|escalation|rhythm)$/iu
const ROTULO_RE = /(^|[.!?…"”'’]\s*|\n\s*)(\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*){0,2})\s*:/gu
const palavras = (t: string) => String(t ?? '').trim().split(/\s+/u).filter(Boolean).length
const limpa = (t: string) => String(t ?? '').replace(/\s+/gu, ' ').trim().replace(/^["“”'‘’]+|["“”'‘’]+$/gu, '').trim()

/** As falas do roteiro, sem o elenco: cada seção com texto é feita SÓ de "Nome: fala" (nome com maiúscula, 1 a 3 palavras, nunca rótulo de estrutura), no máximo
 *  2 nomes no filme, pelo menos uma fala. Devolve as palavras ditas e quantos falam; fora disso, null (o portão de sempre vale). */
export function falasDoRoteiroSemElenco2511(secoes: ReadonlyArray<string>): { palavras: number; falantes: number } | null {
  if (!Array.isArray(secoes) || !secoes.length) return null
  const nomes = new Set<string>()
  let total = 0, linhas = 0
  for (const s of secoes) {
    const texto = String(s ?? '').trim()
    if (!texto) continue
    const marcas = [...texto.matchAll(ROTULO_RE)]
    if (!marcas.length) return null
    if (texto.slice(0, (marcas[0].index ?? 0) + marcas[0][1].length).trim()) return null
    for (let j = 0; j < marcas.length; j++) {
      const m = marcas[j], nome = m[2].trim()
      if (NAO_E_FALANTE.test(nome)) return null
      const ini = (m.index ?? 0) + m[0].length, fim = j + 1 < marcas.length ? (marcas[j + 1].index ?? texto.length) + marcas[j + 1][1].length : texto.length
      const fala = limpa(texto.slice(ini, fim))
      if (!fala) return null
      nomes.add(nome.toLowerCase()); total += palavras(fala); linhas++
    }
  }
  if (!linhas || nomes.size > 2) return null
  return { palavras: total, falantes: nomes.size }
}

/** O portão de tamanho deixa o roteiro FALADO passar com o piso próprio: o corpo pediu voice_mode 'characters', a chave da fala está ligada para a conta, a
 *  narração é em inglês e as falas estão no formato, com 12 a 45 palavras. Qualquer outra coisa = false (o portão de sempre, byte a byte). */
export function roteiroFaladoNoPortao2511(a: { voiceMode: unknown; ligada: boolean; ingles: boolean; secoes: ReadonlyArray<string>; piso?: number /* KINEO-FALA-PARA-CLIENTE-2611: o do cliente; sem = 12 */ }): boolean {
  if (a.voiceMode !== 'characters' || a.ligada !== true || a.ingles !== true) return false
  const f = falasDoRoteiroSemElenco2511(a.secoes)
  return !!f && f.palavras >= (typeof a.piso === 'number' ? a.piso : PALAVRAS_MIN_NO_FILME_FALADO_2511) && f.palavras <= PALAVRAS_MAX_NO_FILME_FALADO_2511
}
