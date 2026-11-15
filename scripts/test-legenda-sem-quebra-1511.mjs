#!/usr/bin/env node
// KINEO-LEGENDA-SEM-QUEBRA-1511 — guardião da legenda sem frase partida (fundador 15/11, prints da vitrine: Mary Celeste
// "NO ONE AT THE" | "WHEEL." e "THE AZORES, SAILS TORN,"). Usa os roteiros REAIS dos 3 filmes narrados da vitrine (09/11).
//   P · plano B (sem Whisper): lib/compose segmentosSemQuebra sobre buildCaptionSegments — nenhuma palavra sozinha, nenhum
//       pedaço do meio da frase terminando em palavra-função, nome próprio inteiro, todas as palavras na ordem.
//   W · com Whisper (35/60/90 s e Hollywood): a última palavra da frase não fica sozinha; duas palavras-função seguidas descem juntas.
//   I · intocados: frase que cabe no teto, escrita sem espaço e o uso como tokenizador (maxWords 1) saem iguais.
//   M · mutante: lib/compose.ts de BASE (sem o conserto) reprova os casos P e W.
// Offline, sem rede, sem custo. Rodar: node scripts/test-legenda-sem-quebra-1511.mjs
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const BASE = '831caecf9' // origin/main antes do conserto
const MARY = 'December 1872. A ship drifts near the Azores, sails torn, no one at the wheel. The lifeboat is gone. The cargo is untouched. Ten people, never seen again. This is the Mary Celeste.'
const ANTI = 'In 1901, divers pulled a lump of bronze from a Greek shipwreck. Inside were dozens of gears, two thousand years old. It tracked the Sun, the Moon and eclipses. The oldest known analogue computer.'
const PORTA = "For decades, a crater in Turkmenistan's desert burned day and night. They called it the Door to Hell. Now its fire is fading: three quarters weaker in three years. The gate is closing."
const FUNCAO = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'and', 'or', 'but', 'from', 'by', 'into', 'near'])
const limpa = (p) => p.toLowerCase().replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')
const palavras = (t) => t.split(/\s+/).filter(Boolean)
const fechaFrase = (t) => /[.!?]["'”’]*$/.test(t.trim())

// Whisper sintético e determinístico: palavras com a pontuação, fim de frase marcado, pausa de vírgula abaixo de 0,28 s.
function whisper(txt) {
  const out = []; let t = 0
  for (const raw of txt.split(/\s+/)) {
    const d = 0.12 + raw.length * 0.045, fim = /[.!?]$/.test(raw)
    out.push({ word: raw, start: +t.toFixed(3), end: +(t + d).toFixed(3), sentenceEnd: fim })
    t += d + (fim ? 0.35 : /,$/.test(raw) ? 0.18 : 0.04)
  }
  return out
}

function defeitos(pedacos) {
  const d = []
  pedacos.forEach((p, i) => {
    const ws = palavras(p)
    if (ws.length === 1 && fechaFrase(p) && i > 0 && !fechaFrase(pedacos[i - 1]) && !/[,;:]$/.test(pedacos[i - 1].trim())) d.push(`órfã "${p}"`)
    if (!fechaFrase(p) && !/[,;:]$/.test(p.trim()) && FUNCAO.has(limpa(ws.at(-1)))) d.push(`termina em "${ws.at(-1)}"`)
  })
  return d
}

function rodar(mutante) {
  const base = mutante ? execFileSync('git', ['show', `${BASE}:lib/compose.ts`], { encoding: 'utf8' }) : null
  const load = createOfflineLoader({ env: { OPENAI_API_KEY: 'offline' }, source: (p, s) => (mutante && p.replace(/\\/g, '/').endsWith('lib/compose.ts') ? base : s) })
  const C = load('lib/compose.ts'), O = load('lib/openai.ts')
  const planoB = (t) => {
    const segs = O.buildCaptionSegments(t, 4)
    return (typeof C.segmentosSemQuebra === 'function' ? C.segmentosSemQuebra(segs, 4) : segs).map((s) => s.text)
  }
  const comVoz = (t) => { const W = whisper(t); return C.buildCaptionsFromWhisperWords(W, W.at(-1).end + 0.3, 0, 4).map((c) => c.text) }
  const casos = []
  const caso = (nome, ok, extra = '') => casos.push({ nome, ok: !!ok, extra })
  for (const [nome, t] of [['Mary Celeste', MARY], ['Anticítera', ANTI], ['Porta do Inferno', PORTA]]) {
    const b = planoB(t)
    caso(`P ${nome}: sem órfã nem palavra fraca no fim`, defeitos(b).length === 0, defeitos(b).join('; '))
    caso(`P ${nome}: todas as palavras, na ordem`, b.join(' ') === palavras(t).join(' '))
    caso(`P ${nome}: pedaços de até 4 palavras`, b.every((p) => palavras(p).length <= 4))
    const v = comVoz(t)
    caso(`W ${nome}: com voz, sem órfã nem palavra fraca no fim`, defeitos(v).length === 0, defeitos(v).join('; '))
  }
  const ww = planoB('He stopped World War 3 by doing nothing at all that night in 1983.')
  caso('P nome próprio + número inteiro ("World War 3")', ww.some((p) => /World War 3/.test(p)), ww.join(' | '))
  // INTOCADOS
  const curta = O.buildCaptionSegments('The gate is closing.', 4)
  caso('I frase que cabe no teto: o MESMO array', typeof C.segmentosSemQuebra !== 'function' || C.segmentosSemQuebra(curta, 4) === curta)
  const cjk = O.buildCaptionSegments('这艘船在海上漂流了很多天，没有人知道船员去了哪里。', 4)
  caso('I escrita sem espaço: o MESMO array', typeof C.segmentosSemQuebra !== 'function' || C.segmentosSemQuebra(cjk, 4) === cjk)
  const W = whisper(MARY)
  caso('I tokenizador (maxWords 1): uma palavra por pedaço', C.buildCaptionsFromWhisperWords(W, W.at(-1).end + 0.3, 0, 1).length === W.length)
  return casos
}

const novo = rodar(false), mut = rodar(true)
let falhas = 0
for (const c of novo) { console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.nome}${c.ok || !c.extra ? '' : ` — ${c.extra}`}`); if (!c.ok) falhas++ }
const reprovados = mut.filter((c) => /^[PW] /.test(c.nome) && !c.ok).length
const intocados = mut.filter((c) => c.nome.startsWith('I ')).every((c) => c.ok)
console.log(`  ${reprovados >= 4 ? 'ok  ' : 'FAIL'} M mutante (compose de ${BASE}) reprova ${reprovados} casos P/W`)
console.log(`  ${intocados ? 'ok  ' : 'FAIL'} M intocados já passavam na base`)
if (reprovados < 4) falhas++
if (!intocados) falhas++
console.log(`${novo.length + 2 - falhas} ok, ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
