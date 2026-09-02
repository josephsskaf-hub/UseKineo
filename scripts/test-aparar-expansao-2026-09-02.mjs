// KINEO-APARAR-2026-09-02 — prova da tesoura do expansor (caso adrianwells).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c) => { c ? ok++ : bad++; console.log(`  ${c ? '✓' : '✗'} ${n}`) }
const pol = readFileSync(join(R, 'lib/expandPolicy.ts'), 'utf8')
const rota = readFileSync(join(R, 'app/api/expand-script/route.ts'), 'utf8')
chk('tesoura existe e preserva frases do autor (Set de authorSentences)', pol.includes('export function trimCandidateToBudget') && pol.includes('const autor = new Set(authorSentences(falaOriginal))'))
chk('rota apara ANTES de recusar por growth_limit', rota.indexOf('trimCandidateToBudget(expandido') < rota.indexOf("outcome: 'growth_limit'"))
chk('so apara quando o candidato ENCHE o alvo (depois.ok)', rota.includes('if (!withinGrowthLimit(speechBase, depois.speech) && depois.ok) {'))
chk('depois de aparar exige: teto ok + alvo ok + autor preservado + marcadores intactos', rota.includes('authorPreserved(falaOriginal, falaCortada).ok') && rota.includes('lostMarkers(original, cortado).length === 0'))
chk('orcamento = min(teto, palavras do alvo + 8) — nunca acima do teto', rota.includes('Math.min(palavrasTeto, Math.ceil(target * WORDS_PER_SECOND) + 8)'))
chk('resposta de sucesso carrega trimmed', rota.includes('trimmed: aparado'))
// simulacao pura da tesoura (copia da logica, sem TS): 62 palavras do autor + 130 da IA, orcamento 89
const norm = (t) => t.normalize('NFC').toLowerCase().replace(/\[[^\]]*\]/gu,' ').replace(/[^\p{L}\p{N}\p{M}\s]/gu,' ').replace(/\s+/gu,' ').trim()
const autorTxt = 'In 1942 the city woke to sirens. Guns fired at the sky for an hour. Nobody knew what it was.'
const ia = autorTxt + ' Searchlights swept the coast. Shells burst over rooftops. Cars crashed in the blackout. Five people died that night. Newspapers printed the photos. Radar had tracked something fast. The Navy later admitted there was no attack at all. A balloon and nerves had started it. Every gun answered a ghost.'
const autor = new Set(autorTxt.split(/(?<=[.!?…。！？])\s+|\n+/u).map(norm).filter(Boolean))
let usado = 0; const mant = []
for (const f of ia.split(/(?<=[.!?…。！？])\s+/u)) { const n = norm(f); const c = n.split(' ').filter(Boolean).length; if (autor.has(n) || usado + c <= 30) { mant.push(f); usado += c } }
const saida = mant.join(' ')
chk('simulacao: todas as 3 frases do autor sobrevivem', [...autor].every((a) => saida.split(/(?<=[.!?])\s+/u).map(norm).includes(a)))
chk('simulacao: cortou o excesso da IA (menos frases que a entrada)', mant.length < ia.split(/(?<=[.!?])\s+/u).length && mant.length > 3)
console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══`); process.exit(bad ? 1 : 0)
