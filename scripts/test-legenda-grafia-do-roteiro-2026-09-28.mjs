// KINEO-LEGENDA-GRAFIA-DO-ROTEIRO-2026-09-28 — guardião da legenda com a grafia do roteiro.
//
//     node scripts/test-legenda-grafia-do-roteiro-2026-09-28.mjs
//
// Sem rede, sem banco, sem OpenAI, sem env: lê arquivos (readFileSync), transpila e roda numa VM.
//
// O DEFEITO: nos 10 anúncios Kineo 1 de 28/09 a legenda mostrou o que o Whisper OUVIU, não o que o roteiro diz —
// 12 aparições de marca erradas em 5 filmes (ADMITIWE/ADMITIWI/ADMITI IN, SHIVSHANKER ×2, SMART TENDER AI UNATI ×2,
// RUUS ×2, ECREDIT NG ×3 com "NG" sozinho numa legenda), "twaalf over vier" como "12 OVER 4" e dois "–" que ninguém
// fala. O CONSERTO: lib/captionScriptSpelling.ts troca só o texto das palavras do Whisper pela grafia do roteiro e
// mantém o tempo; app/api/compose/route.ts (só TTS de scaledScript, nunca avatar, nunca voz gravada) e
// app/api/compose/unlock/route.ts (export limpo pago) ligam a troca antes do montador.
//
// O QUE ESTE ARQUIVO PROVA:
//   0. o código que roda é o REAL: a lib inteira transpilada, e de lib/compose.ts as fatias REAIS de
//      buildCaptionsFromWhisperWords (o chunker da legenda) e sentenceStartTimes (os cortes do montador);
//   1. com as palavras do Whisper REAIS dos 10 anúncios (scripts/test-support/legenda-grafia-2026-09-28.json, copiadas
//      do cache público de voz) contra os roteiros do docs/ANUNCIOS-PRONTOS-11-EMPRESAS-2026-09-26.md: 12/12 marcas
//      certas na legenda montada pelo chunker real, os 2 travessões fora, e o TEMPO — cada palavra do Whisper sai
//      intacta (start, end e sentenceEnd idênticos) ou dentro de um reagrupamento que preserva as pontas e o fim de
//      frase; os cortes (sentenceStartTimes real) e a janela do gancho idênticos nos 10;
//   2. casos sintéticos: "63%" × "sixty three percent" nos dois sentidos, roteiro que não bate (a trava devolve o
//      Whisper), trecho longo, 70%, texto vazio, pontuação que fecha frase, fim de frase enterrado, cauda não falada;
//   3. a ligação: predicado avaliado nas 16 combinações (avatar, voz enviada, modo serviço, narration_source), a
//      ordem (depois do retorno do hollywood), o cache guardando o Whisper bruto, o unlock e o Studio Ads;
//   4. mutantes em memória (cada um provado aplicado): mexer no tempo, tirar a trava de 70%, ligar no avatar, tirar a
//      trava de trecho longo, parar de descartar o '–', desligar o unlock.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(RAIZ, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')

const LIB = rd('lib/captionScriptSpelling.ts')
const compose = rd('lib/compose.ts')
const openai = rd('lib/openai.ts')
const ROUTE = rd('app/api/compose/route.ts')
const UNLOCK = rd('app/api/compose/unlock/route.ts')
const ADS = rd('app/api/ads/render/route.ts')
const FIX = JSON.parse(rd('scripts/test-support/legenda-grafia-2026-09-28.json'))
const DOC = rd('docs/ANUNCIOS-PRONTOS-11-EMPRESAS-2026-09-26.md')

let falhas = 0
let total = 0
function check(rotulo, ok, detalhe = '') {
  total++
  console.log(`  ${ok ? '✅' : '❌'} ${rotulo}${ok ? '' : ` — ${detalhe}`}`)
  if (!ok) falhas++
}

// ── fatias reais ────────────────────────────────────────────────────────────
function fatia(src, abre, fecha, rotulo) {
  const ini = src.indexOf(abre)
  if (ini < 0) throw new Error(`fatia "${rotulo}": abertura não encontrada: ${abre}`)
  const fim = src.indexOf(fecha, ini)
  if (fim < 0) throw new Error(`fatia "${rotulo}": fechamento não encontrado`)
  return src.slice(ini, fim + fecha.length)
}
const F = {
  offset: compose.match(/^const CAPTION_SYNC_OFFSET = [^\n]+$/m)?.[0],
  normalize: fatia(compose, '\nfunction normalizeCaptionWord(w: string): string {', '\n}\n', 'normalizeCaptionWord'),
  round3: fatia(compose, '\nfunction round3(v: number): number {', '\n}\n', 'round3'),
  build: fatia(compose, '\nexport function buildCaptionsFromWhisperWords(', '\n}\n', 'buildCaptionsFromWhisperWords'),
  starts: fatia(compose, '\nexport function sentenceStartTimes(words: WhisperWord[]): number[] {', '\n}\n', 'sentenceStartTimes'),
  candidates: fatia(openai, '\nconst HIGHLIGHT_CANDIDATES = [', '\n]\n', 'HIGHLIGHT_CANDIDATES'),
  stopwords: fatia(openai, '\nconst STOPWORDS = new Set([', '\n])\n', 'STOPWORDS'),
  cleanWord: fatia(openai, '\nfunction cleanWord(w: string): string {', '\n}\n', 'cleanWord'),
  pick: fatia(openai, '\nexport function pickHighlightWord(caption: string): string | null {', '\n}\n', 'pickHighlightWord'),
}
if (!F.offset) throw new Error('CAPTION_SYNC_OFFSET não encontrado em lib/compose.ts')
const CWPC = Number(compose.match(/^const CAPTION_WORDS_PER_CHUNK = (\d+)$/m)?.[1])
const EMPHASIS_LIT = compose.match(/^const FAST_EMPHASIS_RE =\n\s+(\/.+\/[a-z]*)$/m)?.[1]
if (!Number.isFinite(CWPC) || !EMPHASIS_LIT) throw new Error('CAPTION_WORDS_PER_CHUNK/FAST_EMPHASIS_RE não encontrados')
const FAST_EMPHASIS_RE = vm.runInNewContext(`(${EMPHASIS_LIT})`)

function transpila(src, rotulo) {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: () => { throw new Error(`require proibido (${rotulo})`) } })
  return exp
}
const REAL = transpila([F.candidates, F.stopwords, F.cleanWord, F.pick, F.offset, F.normalize, F.round3, F.build, F.starts].join('\n'), 'fatias de lib/compose.ts')
const build = REAL.buildCaptionsFromWhisperWords
const sentenceStartTimes = REAL.sentenceStartTimes
const lib = transpila(LIB, 'lib/captionScriptSpelling.ts')

// ── ferramentas de prova ────────────────────────────────────────────────────
const soPontuacao = (s) => !/[\p{L}\p{N}]/u.test(String(s ?? ''))
const fechaFrase = (w) => w?.sentenceEnd === true
const hookEnd = (ws) => { const w = ws.find((x) => x.sentenceEnd === true); return w ? w.end : null }
const iguais = (a, b) => a.length === b.length && a.every((x, k) => x === b[k])

// Caminhada no tempo, independente da lib: cada palavra do Whisper tem de sair (a) INTACTA — start, end e
// sentenceEnd idênticos —, (b) descartada por ser só pontuação, ou (c) dentro de um REAGRUPAMENTO de até 6×6 que
// começa no start dela, fecha no end de uma palavra do Whisper, não tem fim de frase no meio (de nenhum dos lados),
// herda o sentenceEnd da última e fica inteiro dentro do intervalo, em ordem.
function caminhada(antes, depois) {
  let i = 0
  let j = 0
  let intactas = 0
  let reagrupadas = 0
  let descartadas = 0
  while (i < antes.length) {
    const a = antes[i]
    const d = depois[j]
    if (d && d.start === a.start && d.end === a.end && fechaFrase(d) === fechaFrase(a)) {
      intactas++
      i++
      j++
      continue
    }
    if (soPontuacao(a.word)) {
      descartadas++
      i++
      continue
    }
    if (!d || d.start !== a.start) return { ok: false, erro: `palavra ${i} "${a.word}"@${a.start} → saída ${j} "${d?.word}"@${d?.start}` }
    let fechou = false
    for (let i2 = i; i2 < Math.min(antes.length, i + 6) && !fechou; i2++) {
      for (let j2 = j; j2 < Math.min(depois.length, j + 6) && !fechou; j2++) {
        if ((i2 === i && j2 === j) || antes[i2].end !== depois[j2].end) continue
        const grupo = depois.slice(j, j2 + 1)
        const dentro = grupo.every((w, k) => w.start >= a.start && w.end <= antes[i2].end && w.start <= w.end && (k === 0 || w.start >= grupo[k - 1].start))
        const semFimNoMeio = antes.slice(i, i2).every((w) => !fechaFrase(w)) && grupo.slice(0, -1).every((w) => !fechaFrase(w))
        if (dentro && semFimNoMeio && fechaFrase(depois[j2]) === fechaFrase(antes[i2])) {
          fechou = true
          reagrupadas += i2 - i + 1
          i = i2 + 1
          j = j2 + 1
        }
      }
    }
    if (!fechou) return { ok: false, erro: `palavra ${i} "${a.word}"@${a.start}-${a.end}: nem intacta nem reagrupamento fechado` }
  }
  if (j !== depois.length) return { ok: false, erro: `sobraram ${depois.length - j} palavra(s) na saída sem par no tempo` }
  return { ok: true, intactas, reagrupadas, descartadas }
}

const legenda = (ws, dur) => build(ws, dur, 0, CWPC)
const texto = (caps) => caps.map((c) => c.text).join(' ').toUpperCase()
const conta = (s, re) => (s.match(re) ?? []).length

// Marcas por anúncio: [regex da grafia certa, quantas vezes], e o erro que o Whisper deixava.
const MARCAS = {
  1: { certa: [/\bECREDIT\.NG\b/g, 2], extra: [/\bECREDIT DOT N G\b/g, 1], errada: /\bECREDIT NG\b/g },
  2: { certa: [/\bADMITIY\b/g, 3], errada: /\bADMITI(WE|WI)?\b/g },
  4: { certa: [/\bSMARTTENDER AI UNNATI\b/g, 2], errada: /\bUNATI\b|\bSMART TENDER\b/g },
  // "ruis" também é palavra comum em holandês ("in de vallende ruis" = no ruído que cai) e o Whisper já acertava essa;
  // as 2 aparições do TÍTULO são as que viravam RUUS. base = quantas vezes a grafia certa já saía antes.
  7: { certa: [/\bRUIS\b/g, 3], base: 1, extra: [/\bTWAALF OVER VIER\b/g, 1], errada: /\bRUUS\b|\b12 OVER 4\b/g },
  9: { certa: [/\bSHIVSHANKAR\b/g, 2], errada: /\bSHIVSHANKER\b/g },
}
const CERTOS_ANTES = { 3: /\bAMMAN\b/g, 5: /\bHELP ME TENERIFE\b/g, 6: /\bASCEND AI\b/g, 8: /\bMADLABS\b/g, 10: /\bEQMS\b/g }

// A prova dos 10 como função: roda na lib real e nos mutantes (lista de falhas; vazia = verde).
function provaDosDez(L, { detalhe = false } = {}) {
  const erros = []
  let corrigidas = 0
  for (const a of FIX.anuncios) {
    const r = L.alinharGrafiaDoRoteiro(a.words, a.roteiro)
    const tag = `nº ${a.numero} ${a.empresa}`
    if (r.motivo !== 'aplicada') erros.push(`${tag}: motivo=${r.motivo}`)
    const cam = caminhada(a.words, r.words)
    if (!cam.ok) erros.push(`${tag}: tempo — ${cam.erro}`)
    const cortesAntes = sentenceStartTimes(a.words)
    const cortesDepois = sentenceStartTimes(r.words)
    if (!iguais(cortesAntes, cortesDepois)) erros.push(`${tag}: cortes mudaram (${cortesAntes.length} → ${cortesDepois.length})`)
    if (hookEnd(a.words) !== hookEnd(r.words)) erros.push(`${tag}: janela do gancho mudou`)
    if (r.words.some((w) => /[[\]]/.test(w.word))) erros.push(`${tag}: colchete na palavra (quebra o rich text do karaokê)`)
    const capsAntes = legenda(a.words, a.audioDuration)
    const capsDepois = legenda(r.words, a.audioDuration)
    const antes = texto(capsAntes)
    const depois = texto(capsDepois)
    if (/[–—]/.test(depois)) erros.push(`${tag}: travessão na legenda`)
    const m = MARCAS[a.numero]
    if (m) {
      const [re, n] = m.certa
      const achadas = conta(depois, re)
      if (achadas !== n) erros.push(`${tag}: ${re} ×${achadas} (esperado ×${n})`)
      if (conta(antes, re) !== (m.base ?? 0)) erros.push(`${tag}: a grafia certa aparecia ×${conta(antes, re)} ANTES (esperado ×${m.base ?? 0}) — o fixture não prova o defeito`)
      if (conta(depois, m.errada) !== 0) erros.push(`${tag}: grafia errada sobrou: ${depois.match(m.errada)}`)
      if (conta(antes, m.errada) === 0) erros.push(`${tag}: o erro não aparecia ANTES — o fixture não prova o defeito`)
      corrigidas += achadas - (m.base ?? 0)
      if (m.extra) {
        const [rx, nx] = m.extra
        if (conta(depois, rx) !== nx) erros.push(`${tag}: ${rx} ×${conta(depois, rx)} (esperado ×${nx})`)
        if (rx.source.includes('DOT')) corrigidas += conta(depois, rx)
      }
    } else if (conta(depois, CERTOS_ANTES[a.numero]) < conta(antes, CERTOS_ANTES[a.numero]) || conta(antes, CERTOS_ANTES[a.numero]) === 0) {
      erros.push(`${tag}: a marca que já saía certa (${CERTOS_ANTES[a.numero]}) regrediu`)
    }
    if (detalhe) {
      console.log(`  ℹ ${tag}: âncoras ${r.ancoras}/${r.palavrasDoRoteiro} (${Math.round((100 * r.ancoras) / r.palavrasDoRoteiro)}%) · palavras ${a.words.length}→${r.words.length} · intactas no tempo ${cam.intactas ?? '?'} · reagrupadas ${cam.reagrupadas ?? '?'} · pontuação fora ${cam.descartadas ?? '?'} · cortes ${cortesAntes.length}=${cortesDepois.length}`)
      if (m) {
        const antesErr = antes.match(m.errada) ?? []
        console.log(`      antes: ${[...new Set(antesErr)].join(' | ')}  →  depois: ${(depois.match(m.certa[0]) ?? []).join(' | ')}${m.extra ? ` + ${(depois.match(m.extra[0]) ?? []).join(' | ')}` : ''}`)
      }
      if (a.numero === 1) {
        console.log(`      legenda "NG" sozinha: antes ${capsAntes.filter((c) => c.text.trim().toUpperCase() === 'NG').length} → depois ${capsDepois.filter((c) => c.text.trim().toUpperCase() === 'NG').length}`)
      }
    }
    if (a.numero === 1 && capsDepois.some((c) => c.text.trim().toUpperCase() === 'NG')) erros.push(`${tag}: "NG" sozinho numa legenda`)
    if (a.numero === 1 && !capsAntes.some((c) => c.text.trim().toUpperCase() === 'NG')) erros.push(`${tag}: o "NG" sozinho não aparecia ANTES — o fixture não prova o defeito`)
    if (a.numero === 4 && conta(antes, /–/g) !== 2) erros.push(`${tag}: esperava 2 travessões ANTES, achei ${conta(antes, /–/g)}`)
  }
  return { erros, corrigidas }
}

// ═════════════════════════════════════════════════════════════════════════════
console.log('0. o código que roda é o real\n')
check('lib/captionScriptSpelling.ts é pura: nenhum import/require', !/^\s*import\s|require\(/m.test(LIB), 'import/require na lib')
check('o nome do arquivo não começa com lib/compose (trava 8.2: test-despacho-vazio usa startsWith)', !'lib/captionScriptSpelling.ts'.startsWith('lib/compose'))
check('a lib exporta grafiaDoRoteiro, alinharGrafiaDoRoteiro, grafiaExibida, chaveDaPalavra, iniciosDeFrase',
  ['grafiaDoRoteiro', 'alinharGrafiaDoRoteiro', 'grafiaExibida', 'chaveDaPalavra', 'iniciosDeFrase'].every((k) => typeof lib[k] === 'function'))
check('trava: 70% de âncoras e trecho de até 4', lib.GRAFIA_ANCORAS_MINIMAS === 0.7 && lib.GRAFIA_TRECHO_MAXIMO === 4, `${lib.GRAFIA_ANCORAS_MINIMAS}/${lib.GRAFIA_TRECHO_MAXIMO}`)
{
  const reCompose = F.starts.match(/\/\[\.!\?\][^/]*\$\//)?.[0]
  const reLib = LIB.match(/const FECHA_POR_PONTUACAO = (\/[^\n]+\/)\n/)?.[1]
  check('o espelho do fim de frase por pontuação é o MESMO regex de sentenceStartTimes', !!reCompose && reCompose === reLib, `compose=${reCompose} lib=${reLib}`)
  let difere = 0
  for (const a of FIX.anuncios) {
    const r = lib.alinharGrafiaDoRoteiro(a.words, a.roteiro)
    for (const ws of [a.words, r.words]) if (!iguais(lib.iniciosDeFrase(ws), sentenceStartTimes(ws))) difere++
  }
  check('iniciosDeFrase (lib) = sentenceStartTimes (real) nos 10 anúncios, antes e depois', difere === 0, `${difere} divergência(s)`)
}
{
  const mut = transpila([F.candidates, F.stopwords, F.cleanWord, F.pick, F.offset, F.normalize, F.round3, F.build.replace('const SENTENCE_GAP_SECONDS = 0.28', 'const SENTENCE_GAP_SECONDS = 99'), F.starts].join('\n'), 'mutante do chunker')
  const fx = [{ word: 'a', start: 0, end: 0.1 }, { word: 'b', start: 0.6, end: 0.7 }]
  check('o chunker executado é a fatia extraída (mutante do limiar de pausa muda o resultado)', build(fx, 2, 0, 7).length === 2 && mut.buildCaptionsFromWhisperWords(fx, 2, 0, 7).length === 1)
}
check(`chunker real com CAPTION_WORDS_PER_CHUNK=${CWPC} (o do caminho clássico)`, CWPC === 4, `CWPC=${CWPC}`)
console.log('')

// ═════════════════════════════════════════════════════════════════════════════
console.log('1. os 10 anúncios de 28/09 — palavras REAIS do Whisper × roteiro do doc\n')
{
  check('fixture com 10 anúncios, palavras e roteiro em todos', FIX.anuncios.length === 10 && FIX.anuncios.every((a) => a.words.length >= 100 && a.roteiro.length > 400 && a.audioDuration > 30))
  const blocos = {}
  const re = /^### (\d+)\. [^\n]+\n\n```\n([\s\S]*?)\n```/gm
  let m
  while ((m = re.exec(DOC))) blocos[m[1]] = m[2].replace(/\s+/g, ' ').trim()
  check('o roteiro de cada fixture é o bloco do docs/ANUNCIOS-PRONTOS-11-EMPRESAS-2026-09-26.md (parágrafos unidos)', FIX.anuncios.every((a) => blocos[a.numero] === a.roteiro), FIX.anuncios.filter((a) => blocos[a.numero] !== a.roteiro).map((a) => a.numero).join(','))
  const { erros, corrigidas } = provaDosDez(lib, { detalhe: true })
  for (const e of erros) console.log(`  · ${e}`)
  check('os 10: alinhamento aplicado, tempo intacto ou reagrupado nas pontas, cortes e gancho idênticos, marcas certas', erros.length === 0, `${erros.length} erro(s) acima`)
  check('12/12 aparições de marca certas na legenda (ADMITIY ×3, SHIVSHANKAR ×2, SMARTTENDER AI UNNATI ×2, RUIS ×2, ECREDIT.NG ×2 + ECREDIT DOT N G ×1)', corrigidas === 12, `corrigidas=${corrigidas}`)
  const soTempo = FIX.anuncios.every((a) => {
    const r = lib.alinharGrafiaDoRoteiro(a.words, a.roteiro)
    const byKey = new Map(r.words.map((w) => [`${w.start}|${w.end}`, w]))
    return a.words.every((w) => {
      const o = byKey.get(`${w.start}|${w.end}`)
      return !o || fechaFrase(o) === fechaFrase(w)
    })
  })
  check('toda palavra que manteve o intervalo manteve também o sentenceEnd (nos 10)', soTempo)
  const dezCortes = FIX.anuncios.map((a) => sentenceStartTimes(lib.grafiaDoRoteiro(a.words, a.roteiro)).length)
  console.log(`  ℹ cortes alinhados à fala por anúncio (iguais antes/depois): ${dezCortes.join('/')}`)
}
console.log('')

// ═════════════════════════════════════════════════════════════════════════════
console.log('2. casos sintéticos\n')
const W = (word, start, end, se) => ({ word, start, end, ...(se ? { sentenceEnd: true } : {}) })
function sinteticos(L) {
  const r = {}
  {
    const ws = [W('Prices', 0, 0.4), W('rose', 0.4, 0.7), W('sixty', 0.7, 1.0), W('three', 1.0, 1.3), W('percent', 1.3, 1.8), W('last', 1.9, 2.1), W('year', 2.1, 2.5, true)]
    const o = L.alinharGrafiaDoRoteiro(ws, 'Prices rose 63% last year.')
    const p = o.words.find((w) => w.word === '63%')
    r.pct = o.motivo === 'aplicada' && o.words.map((w) => w.word).join(' ') === 'Prices rose 63% last year' && !!p && p.start === 0.7 && p.end === 1.8 &&
      FAST_EMPHASIS_RE.test(legenda(o.words, 2.5).map((c) => c.text).join(' ')) && iguais(sentenceStartTimes(ws), sentenceStartTimes(o.words))
  }
  {
    // 10 âncoras de 13 (77%): o trecho 'sixty three percent' × '63%' é o único sem âncora.
    const ws = [W('Last', 0, 0.2), W('year', 0.2, 0.4), W('rice', 0.4, 0.55), W('prices', 0.55, 0.7), W('rose', 0.7, 0.9), W('63%', 0.9, 2.0), W('across', 2.1, 2.4), W('the', 2.4, 2.5), W('whole', 2.5, 2.8), W('country', 2.8, 3.3, true)]
    const o = L.alinharGrafiaDoRoteiro(ws, 'Last year, rice prices rose sixty three percent across the whole country.')
    const meio = o.words.slice(5, 8)
    r.porExtenso = o.motivo === 'aplicada' && o.words.map((w) => w.word).join(' ') === 'Last year rice prices rose sixty three percent across the whole country' &&
      meio[0].start === 0.9 && meio[2].end === 2.0 && meio.every((w, k) => w.start <= w.end && (k === 0 || w.start >= meio[k - 1].end - 1e-9)) && caminhada(ws, o.words).ok
  }
  {
    const ws = 'Completely different words spoken here by someone else entirely today'.split(' ').map((w, k) => W(w, k * 0.4, k * 0.4 + 0.35, k === 9))
    const o = L.alinharGrafiaDoRoteiro(ws, 'The quick brown fox jumps over the lazy dog')
    r.naoBate = o.motivo === 'poucas_ancoras' && o.words === ws
  }
  {
    // 50% de âncoras, todos os trechos de 1 palavra: SÓ a trava de 70% segura.
    const ws = 'alpha uno beta dos gamma tres delta cuatro'.split(' ').map((w, k) => W(w, k * 0.5, k * 0.5 + 0.4, k === 7))
    const o = L.alinharGrafiaDoRoteiro(ws, 'alpha one beta two gamma three delta four.')
    r.setenta = o.motivo === 'poucas_ancoras' && o.words === ws
  }
  {
    // 20 âncoras de 26 (77%), mas um trecho de 6 × 6 no meio: SÓ a trava de trecho segura.
    const a = 'one two three four five six seven eight nine ten'.split(' ')
    const b = 'eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ')
    const ditas = [...a, 'red', 'green', 'blue', 'cyan', 'pink', 'gray', ...b]
    const ws = ditas.map((w, k) => W(w, k * 0.3, k * 0.3 + 0.25, k === ditas.length - 1))
    const o = L.alinharGrafiaDoRoteiro(ws, [...a, 'lion', 'tiger', 'bear', 'wolf', 'fox', 'deer', ...b].join(' '))
    r.trechoLongo = o.motivo === 'trecho_longo' && o.words === ws
  }
  {
    const ws = [W('hello', 0, 0.3, true)]
    const v1 = L.alinharGrafiaDoRoteiro(ws, '')
    const v2 = L.alinharGrafiaDoRoteiro(ws, '   —  … ')
    const v3 = L.alinharGrafiaDoRoteiro([], 'hello')
    r.vazio = v1.motivo === 'roteiro_vazio' && v1.words === ws && v2.motivo === 'roteiro_vazio' && v2.words === ws && v3.motivo === 'sem_palavras' && v3.words.length === 0 &&
      L.grafiaDoRoteiro(ws, '') === ws
  }
  {
    // '–' solto sai; '–' que fecha frase fica; '–' logo depois de um fim de frase fica (é início de frase = corte).
    const ws = [W('pass', 0, 0.3), W('–', 0.3, 0.4), W('fail', 0.4, 0.7, true), W('–', 0.8, 0.9), W('review', 0.9, 1.2), W('–', 1.2, 1.3, true), W('done', 1.4, 1.8, true)]
    const o = L.alinharGrafiaDoRoteiro(ws, 'pass, fail. review done.')
    r.pontuacao = o.motivo === 'aplicada' && o.words.map((w) => w.word).join(' ') === 'pass fail – review – done' && iguais(sentenceStartTimes(ws), sentenceStartTimes(o.words))
  }
  {
    // Fim de frase no MEIO do que seria um reagrupamento: o trecho fica com o texto do Whisper (o corte não some).
    const ditas = ['Every', 'single', 'week', 'our', 'team', 'will', 'follow', 'up', 'with', 'every', 'lead', 'today']
    const ws = ditas.map((w, k) => W(w, k * 0.3, k * 0.3 + 0.25, w === 'follow' || k === ditas.length - 1))
    const o = L.alinharGrafiaDoRoteiro(ws, 'Every single week our team will follow-up with every lead today.')
    r.fimEnterrado = o.motivo === 'aplicada' && o.words.map((w) => w.word).join(' ') === ditas.join(' ') && o.trechosMantidos === 1 && iguais(sentenceStartTimes(ws), sentenceStartTimes(o.words))
  }
  {
    // Palavra do Whisper com ponto final conta como fim de frase no montador: fica como está.
    const ws = [W('the', 0, 0.2), W('U.S.', 0.2, 0.6), W('economy', 0.7, 1.2, true)]
    const o = L.alinharGrafiaDoRoteiro(ws, 'the U.S. economy.')
    r.pontoFinal = o.words[1].word === 'U.S.' && iguais(sentenceStartTimes(ws), sentenceStartTimes(o.words))
  }
  {
    // Cauda do roteiro que o TTS não leu (corte de 3.800 caracteres): não é anexada depois da última âncora.
    const ws = 'and so the story of this old town ends right here'.split(' ').map((w, k) => W(w, k * 0.3, k * 0.3 + 0.25, k === 10))
    const o = L.alinharGrafiaDoRoteiro(ws, 'And so the story of this old town ends right here. Zebra quokka narwhal')
    r.cauda = o.motivo === 'aplicada' && o.words.length === ws.length && !o.words.some((w) => /zebra|quokka|narwhal/i.test(w.word))
  }
  {
    // Travessão colado ("results—fast") separa como espaço: as duas palavras ancoram, nenhum "—" na tela.
    const ditas = ['We', 'deliver', 'results', 'fast', 'every', 'single', 'time', 'for', 'your', 'team']
    const ws = ditas.map((w, k) => W(w, k * 0.3, k * 0.3 + 0.25, k === ditas.length - 1))
    const o = L.alinharGrafiaDoRoteiro(ws, 'We deliver results—fast, every single time–for your team.')
    r.travessaoColado = o.motivo === 'aplicada' && o.ancoras === 10 && o.words.map((w) => w.word).join(' ') === ditas.join(' ')
  }
  {
    const ws = [W('Hello', 0, 0.3), W('world', 0.3, 0.6), W('again', 0.6, 1.0, true)]
    const o = L.alinharGrafiaDoRoteiro(ws, 'Hello [world] again.')
    r.colchete = o.motivo === 'aplicada' && o.words.every((w) => !/[[\]]/.test(w.word)) && o.words[1].word === 'world'
  }
  {
    const tab = [['63%,', '63%'], ['$4.2,', '$4.2'], ['₹500.', '₹500'], ['"eCredit.ng."', 'eCredit.ng'], ['follow-up,', 'follow-up'], ["don't", "don't"], ['[color', 'color'], ['ADMITIY.', 'ADMITIY'], ['—', ''], ['#1', '#1'], ['+55', '+55'], ['(Unnati)', 'Unnati']]
    r.exibida = tab.every(([i, o]) => L.grafiaExibida(i) === o)
    r.chave = L.chaveDaPalavra('één') === 'een' && L.chaveDaPalavra('eCredit.ng') === 'ecreditng' && L.chaveDaPalavra('–') === '' && L.chaveDaPalavra('Ünnati') === 'unnati'
  }
  return r
}
{
  const s = sinteticos(lib)
  check("'63%' no roteiro × 'sixty three percent' falado: uma palavra '63%' de 0,7 a 1,8 s, amarela (FAST_EMPHASIS_RE real), cortes iguais", s.pct)
  check("'sixty three percent' no roteiro × '63%' falado: 3 palavras dentro do intervalo de 0,7 a 1,8 s", s.porExtenso)
  check('roteiro que não bate: trava devolve o Whisper (mesmo array)', s.naoBate)
  check('50% de âncoras com trechos curtos: a trava de 70% devolve o Whisper', s.setenta)
  check('trecho sem âncora de 6 palavras: a trava de 4 devolve o Whisper', s.trechoLongo)
  check('texto vazio (e só pontuação) → Whisper intacto; Whisper vazio → []', s.vazio)
  check("'–' solto sai; '–' que fecha ou abre frase fica; cortes iguais", s.pontuacao)
  check('fim de frase enterrado num reagrupamento: o trecho fica com o Whisper', s.fimEnterrado)
  check("palavra do Whisper com ponto final ('U.S.') fica como está (é corte no montador)", s.pontoFinal)
  check('cauda do roteiro que o TTS não leu NÃO é anexada', s.cauda)
  check("'[' e ']' nunca chegam à palavra (rich text do karaokê)", s.colchete)
  check('travessão colado entre palavras separa como espaço (nenhum "—" na tela, as duas palavras ancoram)', s.travessaoColado)
  check('grafia exibida: pontas limpas, símbolos de número/marca mantidos (%, $, ₹, #, +), interno mantido', s.exibida)
  check("chave: sem acento, minúscula, só \\p{L}\\p{N} ('één' → 'een', 'eCredit.ng' → 'ecreditng')", s.chave)
}
console.log('')

// ═════════════════════════════════════════════════════════════════════════════
console.log('3. a ligação (app/api/compose/route.ts, unlock, Studio Ads)\n')
function ligacao(route, unlock, ads) {
  const r = {}
  const pred = route.match(/^    const legendaPelaGrafiaDoRoteiro = ([^\n]+)$/m)?.[1]
  r.pred = false
  if (pred) {
    const erradas = []
    for (const avatarMode of [false, true]) for (const hasUserVoice of [false, true]) for (const isServiceFinish of [false, true]) for (const ns of [undefined, 'tts']) {
      const got = vm.runInNewContext(pred, { avatarMode, hasUserVoice, isServiceFinish, body: { narration_source: ns } })
      const want = !avatarMode && (!hasUserVoice || (isServiceFinish && ns === 'tts'))
      if (got !== want) erradas.push(`avatar=${avatarMode} voz=${hasUserVoice} serviço=${isServiceFinish} ns=${ns}: ${got}`)
    }
    r.pred = erradas.length === 0
    r.predErro = erradas.join(' · ')
  }
  r.import = /^import \{ alinharGrafiaDoRoteiro \} from '@\/lib\/captionScriptSpelling'/m.test(route)
  r.grafia = /^    const grafia = legendaPelaGrafiaDoRoteiro && whisperWords \? alinharGrafiaDoRoteiro\(whisperWords, scaledScript\) : null$/m.test(route)
  r.words = /^    const legendaWords: WhisperWord\[\] \| undefined = grafia \? grafia\.words : whisperWords$/m.test(route)
  const call = route.indexOf('      source = buildCreatomateSource({')
  const callEnd = route.indexOf('\n      })\n', call)
  const bloco = call >= 0 && callEnd > call ? route.slice(call, callEnd) : ''
  r.call = /\n        whisperWords: legendaWords,/.test(bloco) && !/\n        whisperWords,\n/.test(bloco)
  const fimHollywood = route.indexOf('// ── end KINEO-HOLLYWOOD-2026-07-09')
  const retornoHollywood = route.lastIndexOf('        watermark: forced,', fimHollywood)
  const pos = route.indexOf('    const legendaPelaGrafiaDoRoteiro =')
  r.ordem = fimHollywood > 0 && retornoHollywood > 0 && pos > fimHollywood && call > pos
  r.cacheBruto = route.includes('await storeCachedVoiceover(voiceoverCacheKey, audioBuffer, whisperWords ?? [], realAudioDuration)')
  r.ttsFalaScaled = (route.match(/generateTTS\(scaledScript, /g) ?? []).length === 2 && route.includes('synthesizeWithVoice({ voiceId, text: scaledScript, language })') && route.includes('            script: scaledScript,')
  r.body = /\n  narration_source\?: string\n\}/.test(route)
  r.unlock = /^import \{ grafiaDoRoteiro \} from '@\/lib\/captionScriptSpelling'/m.test(unlock) &&
    /\n        whisperWords: whisperWords \? grafiaDoRoteiro\(whisperWords, scaledScript\) : whisperWords,\n/.test(unlock) &&
    unlock.includes('audioBuffer = await generateTTS(scaledScript, ')
  r.ads = /\n      user_voiceover_url: voiceUrl,\n[\s\S]{0,400}\n      narration_source: 'tts',\n/.test(ads) && ads.includes('      voiceover_script: narration,') && ads.includes('input: narration.slice(0, 4000)')
  return r
}
{
  const l = ligacao(ROUTE, UNLOCK, ADS)
  check('predicado avaliado nas 16 combinações: só TTS de scaledScript (nunca avatar; voz enviada só com modo serviço + narration_source tts)', l.pred, l.predErro ?? 'predicado não encontrado')
  check('route importa alinharGrafiaDoRoteiro de lib/captionScriptSpelling', l.import)
  check('a grafia usa o scaledScript (o texto que o TTS leu) e só com o predicado', l.grafia)
  check('legendaWords = palavras alinhadas, ou o Whisper quando o predicado é falso', l.words)
  check('o buildCreatomateSource do compose recebe whisperWords: legendaWords (e não o Whisper cru)', l.call)
  check('(c) a troca fica DEPOIS do retorno do caminho hollywood — Kling 3/H3/Omni/S25 não passam por aqui', l.ordem)
  check('o cache de voz continua guardando o Whisper BRUTO (correção na leitura, sem invalidar cache)', l.cacheBruto)
  check('(a) o TTS fala scaledScript: generateTTS ×2 (1ª e corretiva), voz clonada e chave do cache', l.ttsFalaScaled)
  check('ComposeBody declara narration_source', l.body)
  check('o export limpo pago (/api/compose/unlock) também corrige, com o scaledScript que o TTS dele leu', l.unlock)
  check('(b) Studio Ads: a voz enviada é o TTS de voiceover_script=narration e o pedido declara narration_source tts', l.ads)
}
{
  // (b) no Studio Ads o roteiro do alinhamento é o texto FALADO (speakableForTts real): o site vira "admitiy dot in" na
  // legenda (é o que a voz diz) e a marca sai com a grafia do cliente. Telefone é dito dígito a dígito; se o Whisper
  // escrever os dígitos juntos (SIMULADO abaixo: "+91 98765 43210"), são 13 palavras sem âncora → uma das travas (70% ou
  // trecho > 4) segura e a legenda inteira fica com o Whisper, igual a hoje (sem regressão, sem ganho nesse anúncio).
  const SPEAK = rd('lib/ads/speakable.ts')
  const sp = transpila(SPEAK, 'lib/ads/speakable.ts')
  const puro = !/^\s*import\s|require\(/m.test(SPEAK)
  const beat = 'Every student deserves a fair shot at the right college. See what ADMITIY is building for students across the country, one application at a time. Visit admitiy.in today.'
  const falado = sp.speakableForTts(beat, 'en')
  const toks = falado.split(/\s+/).map((t) => t.replace(/[.,]$/, ''))
  const ws = toks.map((t, k) => W(t === 'ADMITIY' ? 'AdmitiWe' : t === 'admitiy' ? 'admiti' : t, k * 0.35, k * 0.35 + 0.3, k === toks.length - 1)).filter((w) => w.word !== 'dot')
  const o = lib.alinharGrafiaDoRoteiro(ws, falado)
  const txt = texto(legenda(o.words, toks.length * 0.35 + 0.5))
  check('(b) Ads, sem telefone: marca com a grafia do cliente e o site como a voz diz ("ADMITIY DOT IN")', puro && falado.includes('admitiy dot in') && o.motivo === 'aplicada' && conta(txt, /\bADMITIY\b/g) === 2 && /\bADMITIY DOT IN\b/.test(txt), `${o.motivo} · ${txt}`)
  const beatFone = 'Call us today at +91 98765 43210 and ask about ADMITIY, the student-built app for college applications across India.'
  const faladoFone = sp.speakableForTts(beatFone, 'en')
  const dFone = faladoFone.split(/\s+/)
  const ini = dFone.indexOf('plus')
  const fimFone = dFone.findIndex((t, k) => k > ini && t === 'and')
  const ouvidas = [...dFone.slice(0, ini), '+91', '98765', '43210', ...dFone.slice(fimFone)].map((t) => t.replace(/[.,]$/, ''))
  const wsFone = ouvidas.map((t, k) => W(t === 'ADMITIY' ? 'AdmitiWe' : t, k * 0.35, k * 0.35 + 0.3, k === ouvidas.length - 1))
  const oFone = lib.alinharGrafiaDoRoteiro(wsFone, faladoFone)
  check('(b) Ads com telefone falado dígito a dígito e Whisper em algarismos (simulado): uma trava segura → Whisper intacto (como hoje)', /plus nine one/.test(faladoFone) && ['trecho_longo', 'poucas_ancoras'].includes(oFone.motivo) && oFone.words === wsFone, `${oFone.motivo} · ${faladoFone}`)
}
console.log('')

// ═════════════════════════════════════════════════════════════════════════════
console.log('4. mutantes (cada um provado aplicado; todos têm de ficar vermelhos)\n')
function mutaLib(de, para, rotulo) {
  const src = LIB.split(de).join(para)
  check(`mutante "${rotulo}" aplicado`, src !== LIB, 'o texto âncora do mutante não existe mais na lib')
  return transpila(src, rotulo)
}
{
  const mTempo = mutaLib('saida[i] = [{ ...w, word: exibida }]', 'saida[i] = [{ ...w, word: exibida, end: w.end + 0.01 }]', 'mexer no tempo')
  check('mexer no tempo → a prova dos 10 fica vermelha', provaDosDez(mTempo).erros.length > 0)
  const src2 = LIB.split('saida[i] = [{ ...w, word: exibida }]').join('saida[i] = [{ ...w, word: exibida, end: w.end + 0.01 }]')
    .split("if (out.length === 0 || !mesmosCortes || fimDaPrimeiraFrase(words) !== fimDaPrimeiraFrase(out)) {").join('if (false) {')
  check('mutante "mexer no tempo sem a trava dos cortes" aplicado', src2.includes('if (false) {') && src2.includes('end: w.end + 0.01'))
  const m2 = transpila(src2, 'tempo sem trava 3')
  const semTrava = FIX.anuncios.some((a) => !caminhada(a.words, m2.alinharGrafiaDoRoteiro(a.words, a.roteiro).words).ok)
  check('… e a caminhada no tempo sozinha pega o tempo mexido (sem depender da trava dos cortes)', semTrava)
}
{
  const m = mutaLib("if (pares.length < GRAFIA_ANCORAS_MINIMAS * tokens.length) return sem('poucas_ancoras')", '', 'tirar a trava de 70%')
  check('tirar a trava de 70% → o caso de 50% de âncoras fica vermelho', !sinteticos(m).setenta)
}
{
  const src = ROUTE.replace('const legendaPelaGrafiaDoRoteiro = !avatarMode && (', 'const legendaPelaGrafiaDoRoteiro = (')
  check('mutante "ligar também no avatar" aplicado', src !== ROUTE)
  check('ligar também no avatar → o predicado fica vermelho', !ligacao(src, UNLOCK, ADS).pred)
  const src2 = ROUTE.replace('(isServiceFinish && body.narration_source', '(body.narration_source')
  check('mutante "voz enviada sem modo serviço" aplicado', src2 !== ROUTE)
  check('aceitar narration_source sem o modo serviço → o predicado fica vermelho', !ligacao(src2, UNLOCK, ADS).pred)
}
{
  const m = mutaLib("if (trechos.some((t) => Math.max(t.r1 - t.r0, t.f1 - t.f0) > GRAFIA_TRECHO_MAXIMO)) return sem('trecho_longo')", '', 'tirar a trava de trecho longo')
  check('tirar a trava de trecho longo → o caso de 6 × 6 fica vermelho', !sinteticos(m).trechoLongo)
}
{
  const m = mutaLib("if (chaves[i] === '' && saida[i] === undefined && descartavel(i)) {", 'if (false) {', "parar de descartar o '–'")
  check("parar de descartar o '–' → a prova dos 10 fica vermelha (SmartTender)", provaDosDez(m).erros.some((e) => /travessão/.test(e)))
}
{
  const src = UNLOCK.replace('whisperWords: whisperWords ? grafiaDoRoteiro(whisperWords, scaledScript) : whisperWords,', 'whisperWords,')
  check('mutante "desligar o unlock" aplicado', src !== UNLOCK)
  check('desligar o unlock → a ligação fica vermelha', !ligacao(ROUTE, src, ADS).unlock)
}

console.log(`\n${total - falhas}/${total} verificações passaram`)
process.exit(falhas ? 1 : 0)
