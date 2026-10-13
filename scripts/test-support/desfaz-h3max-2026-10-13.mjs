// KINEO-H3MAX-2026-10-13 — desfaz, EM MEMÓRIA, a entrada do motor MiniMax H3 Max (fundador 13/10: "vai H3 Max") num arquivo,
// para os guardiões "byte a byte igual à base" continuarem provando o que provavam: nada MAIS mudou nesses arquivos.
// A mudança é de dois tipos, e só destes dois:
//   (a) linhas ACRESCENTADAS, todas com a marca KINEO-H3MAX-2026-10-13 — saem;
//   (b) linhas da base TROCADAS de propósito (o H3 Max ao lado do H3 numa lista, num ternário, numa frase) — cada linha nova
//       (marcada) volta a ser a linha exata da base, pelos pares de scripts/test-support/h3max-2026-10-13-trocas.json.
// Se uma linha trocada for editada depois, o par para de casar e a função devolve o texto INTOCADO: o guardião que a usa fica
// vermelho — de propósito (falha fechada, o mesmo desenho de desfaz-cobertura-15s.mjs). Guardião da mudança:
// scripts/test-h3max-motor-2026-10-13.mjs.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const MARCA_H3MAX = 'KINEO-H3MAX-2026-10-13'
const TROCAS = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'h3max-2026-10-13-trocas.json'), 'utf8'))

/** O arquivo `p` (caminho relativo à raiz, com barras '/') sem a entrada do H3 Max; null/undefined passam direto. */
export function desfazH3max(p, s) {
  if (s == null) return s
  const crlf = s.includes('\r\n')
  let linhas = (crlf ? s.replace(/\r\n/g, '\n') : s).split('\n')
  for (const [novo, velho] of TROCAS[p] ?? []) {
    const i = linhas.indexOf(novo)
    if (i < 0) return s
    linhas[i] = velho
  }
  linhas = linhas.filter((l) => !l.includes(MARCA_H3MAX))
  const t = linhas.join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** As linhas EXATAS da base que a entrada do H3 Max trocou no arquivo `p` (para guardiões que leem o `git diff` e só aceitam acréscimos). */
export function linhasTrocadasH3max(p) {
  return (TROCAS[p] ?? []).map(([, velho]) => velho)
}

/** Os arquivos em que a entrada do H3 Max trocou linhas da base (o resto só ganhou linhas marcadas). */
export const ARQUIVOS_COM_TROCA_H3MAX = Object.keys(TROCAS)
