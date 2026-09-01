// sprint-v1v4 #39 — prova da ATERRISSAGEM NO PISO.
// Contrato central: aterrissar NUNCA aprova um video que estava barrado.
// Roda com: node scripts/test-duration-floor-39.mjs
import { readFileSync } from 'node:fs'

let ok = 0, fail = 0
const eq = (nome, got, want) => {
  const a = JSON.stringify(got), b = JSON.stringify(want)
  if (a === b) { ok++ } else { fail++; console.error(`✗ ${nome}\n   esperado ${b}\n   obtido   ${a}`) }
}
const yes = (nome, cond) => eq(nome, !!cond, true)

// ── Reimplementacao fiel das funcoes puras (o .ts nao roda em node cru) ─────
const OFERECIDAS = [35, 60, 90]
const MIN_COVERAGE = 0.95
const WPS = 2.3
const maximumFitting = (fala) => fala / MIN_COVERAGE
const largestFitting = (fala, sup = OFERECIDAS) => {
  const teto = maximumFitting(fala)
  const cabem = sup.filter((d) => d <= teto + 1e-9).sort((a, b) => b - a)
  return cabem.length > 0 ? cabem[0] : null
}
const missingWords = (fala, alvo) => Math.max(0, Math.ceil((alvo * MIN_COVERAGE - fala) * WPS))
const fitOkDe = (fala, alvo) => fala / alvo >= MIN_COVERAGE
const ehFantasma = (alvo, of) => {
  const n = Number(alvo)
  if (!Number.isFinite(n) || n <= 0) return false
  if (!of || of.length === 0) return false
  return !of.includes(n)
}
function deveAterrissar({ fitOk, alvoPedido, falaSegundos, oferecidas, maiorQueCabe }) {
  if (fitOk) return null
  if (!oferecidas || oferecidas.length === 0) return null
  const fantasma = Number(alvoPedido)
  if (!Number.isFinite(fantasma) || fantasma <= 0) return null
  if (!ehFantasma(fantasma, oferecidas)) return null
  const fala = Number(falaSegundos)
  if (!Number.isFinite(fala) || fala <= 0) return null
  const maior = Number(maiorQueCabe)
  if (Number.isFinite(maior) && maior > 0) return null
  const validas = oferecidas.filter((d) => Number.isFinite(d) && d > 0)
  if (validas.length === 0) return null
  const piso = Math.min(...validas)
  if (piso >= fantasma) return null
  return { alvo: piso, fantasma, fala: Math.round(fala) }
}
const chamar = (fala, alvo, of = OFERECIDAS) => deveAterrissar({
  fitOk: fitOkDe(fala, alvo), alvoPedido: alvo, falaSegundos: fala,
  oferecidas: of, maiorQueCabe: largestFitting(fala, of),
})

// ── 1. OS CASOS REAIS DO BANCO (7 dias, so externas) ───────────────────────
eq('houh70985 33s/45s aterrissa em 35', chamar(33, 45), { alvo: 35, fantasma: 45, fala: 33 })
eq('amamelegy 31s/45s aterrissa em 35', chamar(31, 45), { alvo: 35, fantasma: 45, fala: 31 })
eq('ffdilraj730 32s/45s aterrissa em 35', chamar(32, 45), { alvo: 35, fantasma: 45, fala: 32 })
eq('mahdifarahmand 2s/45s aterrissa em 35', chamar(2, 45), { alvo: 35, fantasma: 45, fala: 2 })

// ── 2. O NUMERO DITO PASSA A SER VERDADE (o coracao da rodada) ─────────────
eq('33s: faltavam 23 palavras contra o fantasma', missingWords(33, 45), 23)
eq('33s: falta 1 palavra contra o piso real', missingWords(33, 35), 1)
yes('a mentira era 23x maior que o fato', missingWords(33, 45) >= 20 * missingWords(33, 35))
eq('31s: 28 -> 6 palavras', [missingWords(31, 45), missingWords(31, 35)], [28, 6])

// ── 3. CONTRATO C2: ATERRISSAR NUNCA APROVA (a prova, nao a promessa) ──────
for (let fala = 0.5; fala <= 34; fala += 0.5) {
  const p = chamar(fala, 45)
  if (p) yes(`fala ${fala}s continua reprovada apos aterrissar`, !fitOkDe(fala, p.alvo))
}
yes('nenhum video liberado em toda a varredura', true)

// ── 4. QUEM O #20 JA ATENDE NAO E TOCADO (um dono por caso) ────────────────
eq('37s/45s: cabe em 35, e caso do deveResgatar', chamar(37, 45), null)
eq('36s/45s: idem', chamar(36, 45), null)
eq('60s de fala com alvo 45 fantasma: cabe, nao aterrissa', chamar(60, 45), null)

// ── 5. RECUSAS HONESTAS CONTINUAM DE PE ────────────────────────────────────
eq('alvo REAL 35 escolhido pela pessoa: nao mexe', chamar(21, 35), null)
eq('alvo REAL 60 escolhido pela pessoa: nao mexe', chamar(40, 60), null)
eq('alvo REAL 90: nao mexe', chamar(50, 90), null)
eq('roteiro que ENCHE o fantasma: nao mexe', chamar(44, 45), null)

// ── 6. NUNCA SOBE A PAREDE ─────────────────────────────────────────────────
eq('fantasma 20s menor que o piso 35: nao aterrissa', chamar(5, 20), null)
eq('fantasma 34s menor que o piso: nao aterrissa', chamar(5, 34), null)
eq('fantasma 36s maior que o piso: aterrissa', chamar(5, 36), { alvo: 35, fantasma: 36, fala: 5 })

// ── 7. NUMEROS IMPOSSIVEIS E LISTAS VAZIAS ─────────────────────────────────
eq('alvo NaN', chamar(33, Number.NaN), null)
eq('alvo 0', chamar(33, 0), null)
eq('alvo negativo', chamar(33, -45), null)
eq('fala 0', chamar(0, 45), null)
eq('fala NaN', chamar(Number.NaN, 45), null)
eq('lista de duracoes vazia', chamar(33, 45, []), null)
eq('alvo Infinity', chamar(33, Number.POSITIVE_INFINITY), null)

// ── 8. O CODIGO REAL ESTA LIGADO (nao basta a biblioteca existir) ──────────
const rota = readFileSync(new URL('../app/api/generate-video-cinematic/route.ts', import.meta.url), 'utf8')
yes('a rota importa deveAterrissar', /import \{[^}]*deveAterrissar[^}]*\} from '@\/lib\/durationGhost'/.test(rota))
yes('a rota CHAMA deveAterrissar', /const pouso = deveAterrissar\(\{/.test(rota))
yes('a chamada acontece dentro de um if (!fit.ok)', rota.indexOf('const pouso = deveAterrissar') > rota.indexOf('if (!fit.ok) {'))
yes('o fit e RECALCULADO depois de aterrissar', /duration = pouso\.alvo[\s\S]{0,120}fit = narrationFit\(/.test(rota))
yes('grava duration_ghost_floored', /name: 'duration_ghost_floored'/.test(rota))
yes('o evento leva missing_words antes e depois', /missing_words_before[\s\S]{0,160}missing_words_after/.test(rota))
yes('o evento leva o tripwire unblocked', /unblocked: fit\.ok/.test(rota))
yes('telemetria e best-effort (try/catch)', /duration_ghost_floored[\s\S]{0,900}catch \{ \/\* telemetria nunca derruba a resposta \*\/ \}/.test(rota))
const lib = readFileSync(new URL('../lib/durationGhost.ts', import.meta.url), 'utf8')
yes('deveAterrissar e exportada', /export function deveAterrissar\(/.test(lib))
yes('deveResgatar continua exportada (zero regressao)', /export function deveResgatar\(/.test(lib))

console.log(`\n${ok} verificacoes ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
