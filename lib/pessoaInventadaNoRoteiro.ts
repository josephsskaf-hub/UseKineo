// KINEO-SEM-PERSONAGEM-INVENTADO-1111 [CEO 11/11, filme 657ad797] — o roteiro de 15 s inventou um homem: o pedido era só "a beautiful 26-year-old
// South African woman … sits alone at a stylish Johannesburg coffee shop" e o roteiro terminou em "Suddenly, a smile breaks — he's finally
// here." O planejador de cenas obedeceu ("she sees a man walking towards her"), o elenco tirou "the man" dos visuais e o filme ganhou um
// homem de casaco cinza que ninguém pediu. A regra no prompt do roteirista (app/api/generate-script) diz para não fazer isso; este leitor
// PURO mede quando acontece mesmo assim (vai no evento script_written), sem mudar o roteiro.
// Regra estreita, em inglês (os dois textos): o roteiro fala de uma pessoa de um GÊNERO que o pedido não cita, num pedido que cita pessoas.
// Pedido sem ninguém (assunto, fato, lugar) = null — lá o roteiro pode contar a história de quem quiser. Guardião:
// scripts/test-sem-personagem-inventado-1111.mjs.
export const MARCA_SEM_PERSONAGEM_INVENTADO = 'KINEO-SEM-PERSONAGEM-INVENTADO-1111'
export const SEM_PERSONAGEM_INVENTADO_VERSAO = 'sem_personagem_inventado_1111_v1'

const MASCULINO_RE = /(?<![\p{L}'’])(?:he|him|his|himself|he's|man|men|boy|boys|guy|husband|boyfriend|father|dad|brother|son|gentleman|groom)(?![\p{L}'’])/giu
const FEMININO_RE = /(?<![\p{L}'’])(?:she|her|hers|herself|she's|woman|women|girl|girls|lady|wife|girlfriend|mother|mom|sister|daughter|bride)(?![\p{L}'’])/giu
/** O texto é inglês o bastante para ler pronome (palavras de função comuns). */
const INGLES_RE = /(?<![\p{L}])(?:the|and|of|to|with|is|at|in|a)(?![\p{L}])/giu
const contar = (re: RegExp, t: string) => (t.match(re) ?? []).length
const semMarcadores = (t: string) => String(t ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/^\s*(?:HOOK|MICRO REWARD \d|ESCALATION|RHYTHM|PAYOFF)[^:\n]*:/gimu, ' ')

export type PessoaInventada = { genero: 'masculino' | 'feminino'; palavras: string[] }

/** A pessoa que o roteiro trouxe e o pedido não tem (por gênero). null = nada inventado, ou não dá para dizer. Determinístico. */
export function pessoaInventadaNoRoteiro(pedido: unknown, roteiro: unknown): PessoaInventada | null {
  const p = semMarcadores(String(pedido ?? '')), r = semMarcadores(String(roteiro ?? ''))
  if (!p.trim() || !r.trim() || contar(INGLES_RE, p) < 3 || contar(INGLES_RE, r) < 2) return null
  const pm = contar(MASCULINO_RE, p), pf = contar(FEMININO_RE, p)
  if (pm + pf === 0) return null // o pedido não cita ninguém: não há o que inventar
  for (const [genero, re, noPedido] of [['masculino', MASCULINO_RE, pm], ['feminino', FEMININO_RE, pf]] as const) {
    if (noPedido > 0) continue
    const palavras = [...new Set((r.match(re) ?? []).map((w) => w.toLowerCase()))]
    if (palavras.length) return { genero, palavras }
  }
  return null
}
