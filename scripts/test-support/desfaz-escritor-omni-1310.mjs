// KINEO-ESCRITOR-MONUMENTO-2026-10-13 · KINEO-OMNI-ETAPA1-2026-10-13 — desfaz, EM MEMÓRIA, as duas mudanças de 13/10 (pauta
// do dia, "tudo sim" do fundador) nos arquivos que os guardiões "byte a byte igual à base" comparam:
//   · lib/runway.ts — UMA linha da base ganhou, no meio, a inserção `${…placeRule…}` e um comentário no fim (ambos saem
//     por string exata) e o campo `placeRule?: string` + o seu comentário entraram marcados (saem);
//   · app/api/compose/route.ts — só linhas NOVAS, todas com KINEO-OMNI-ETAPA1-2026-10-13 (saem);
//   · app/api/generate-video-cinematic/route.ts — só linhas NOVAS, todas com KINEO-ESCRITOR-MONUMENTO-2026-10-13 (saem).
// Se a linha trocada do runway for editada depois, as strings param de casar e o texto volta INTOCADO no que importa: o
// guardião que usa este desfaz fica vermelho — de propósito (falha fechada). Provas das mudanças:
// scripts/test-escritor-monumento-1310.mjs e scripts/test-omni-etapa1-1310.mjs.
import { desfazRomanceAdulto, linhaDoRomanceAdulto } from './desfaz-romance-adulto-1310.mjs' // KINEO-ROMANCE-ADULTO-2026-10-13
export const MARCA_ESCRITOR = 'KINEO-ESCRITOR-MONUMENTO-2026-10-13'
export const MARCA_OMNI_ETAPA1 = 'KINEO-OMNI-ETAPA1-2026-10-13'
const INSERCAO_RUNWAY = "${typeof writerOptions?.placeRule === 'string' ? writerOptions.placeRule : ''}"
const COMENTARIO_RUNWAY = ' · placeRule: KINEO-ESCRITOR-MONUMENTO-2026-10-13 (ausente = texto byte a byte)'

/** O arquivo `p` (caminho relativo à raiz, com '/') sem as mudanças de 13/10 do escritor e do Omni; null/undefined passam direto. */
export function desfazEscritorOmni(p, s) {
  if (s == null) return s
  s = desfazRomanceAdulto(p, s) // KINEO-ROMANCE-ADULTO-2026-10-13 — a leva do romance adulto (13/10, 'tudo sim') também sai, em memória
  const crlf = s.includes('\r\n')
  let t = crlf ? s.replace(/\r\n/g, '\n') : s
  t = desfazEstornoNarracaoLf(p, t) // KINEO-LEVA3-1310 — o conserto da narração (13/10, 'tudo sim nos 3 consertos') também sai
  if (p === 'lib/runway.ts') t = t.split(INSERCAO_RUNWAY).join('').split(COMENTARIO_RUNWAY).join('')
  t = t.split('\n').filter((l) => !l.includes(MARCA_ESCRITOR) && !l.includes(MARCA_OMNI_ETAPA1)).join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/** Linhas da base que a mudança TROCOU (para guardiões que leem o `git diff` e só aceitam acréscimos). */
export function linhaDoEscritorOmni(linha) {
  const l = String(linha ?? '').replace(/\r$/, '')
  return l.includes(MARCA_ESCRITOR) || l.includes(MARCA_OMNI_ETAPA1) || linhaDoRomanceAdulto(l) // KINEO-ROMANCE-ADULTO-2026-10-13
}

// KINEO-LEVA3-1310 [TRAVA 8.2 — vai do fundador 13/10 'tudo sim nos 3 consertos'] — KINEO-ESTORNO-NARRACAO-2026-10-13 em memória:
//   · lib/compose.ts — DUAS linhas da base foram TROCADAS (o import ganhou salvageScriptNarration; o `cleaned` ganhou "|| salvage")
//     e voltam por string exata; as demais linhas marcadas são novas e saem;
//   · app/api/compose/route.ts — só linhas NOVAS marcadas (saem).
// Linha marcada que troque OUTRA linha da base some daqui e a base fica faltando essa linha: o byte a byte fica vermelho
// (falha fechada). Prova da mudança: scripts/test-estorno-narracao-1310.mjs.
export const MARCA_ESTORNO_NARRACAO = 'KINEO-ESTORNO-NARRACAO-2026-10-13'
function desfazEstornoNarracaoLf(p, t) {
  return t.split('\n').flatMap((l) => {
    if (!l.includes(MARCA_ESTORNO_NARRACAO)) return [l]
    if (p === 'lib/compose.ts' && l.startsWith('import { stripScriptMarkers, salvageScriptNarration } from ')) return ["import { stripScriptMarkers } from '@/lib/scriptParser'"]
    if (p === 'lib/compose.ts' && l.startsWith('  const cleaned = stripScriptMarkers(script) || salvageScriptNarration(script) //')) return ['  const cleaned = stripScriptMarkers(script)']
    return []
  }).join('\n')
}
/** O arquivo `p` sem o conserto da narração de 13/10 (só ele); null/undefined passam direto. */
export function desfazEstornoNarracao(p, s) {
  if (s == null) return s
  const crlf = s.includes('\r\n')
  const t = desfazEstornoNarracaoLf(p, crlf ? s.replace(/\r\n/g, '\n') : s)
  return crlf ? t.replace(/\n/g, '\r\n') : t
}
