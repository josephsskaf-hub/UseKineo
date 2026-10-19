// KINEO-FILMES-F1F3-AJUSTE-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — guardião do ajuste das fases
// F1 (legenda sem palavra órfã) e F3 (música num elemento só) do "Faceless 15 s", achados na escada de produção de 19/10
// (docs/RESULTADO-ESCADA-F1-F4-2026-10-19.md). Executa a montagem REAL (lib/compose buildCreatomateSource pelo loader
// offline — sem rede, sem banco, sem fornecedor) com o roteiro EXATO da escada (Evento Carrington, 43 palavras) e prova:
//   A  arquivos: lib/compose.ts, lib/hookFirstFrame.ts, lib/lyriaMusic.ts e app/api/compose/route.ts BYTE A BYTE a base
//      (pai do 1º commit do ajuste); o guardião reancorado (test-filmes-f1f4-1910), desfeita esta camada, é a base;
//      nenhum volume por keyframe (propriedade nunca exercitada pela casa);
//   L  F1: nenhum bloco de 1 palavra no meio de frase, nenhum bloco atravessa fim de frase, nenhum termina em
//      preposição/artigo/conjunção, ≤5 palavras, todas as palavras na ordem, payoff inteiro amarelo, −120 ms;
//   S  F3: UM elemento de música na trilha 8, 14 % fixos, do 0 ao FIM do filme (a cauda nunca muda, com ou sem CTA),
//      loop, fades de sempre, sem trim_start; SFX como estavam; voz intocada;
//   M  mutantes APLICADOS (a troca existe uma vez e muda a fonte) e vermelhos.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semFilmesF1F3Ajuste1910, MARCA_FILMES_F1F3_AJUSTE_1910, TROCAS_FILMES_F1F3_AJUSTE_1910 } from './test-support/desfaz-filmes-f1f3-ajuste-1910.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const clone = (v) => JSON.parse(JSON.stringify(v))
const r3 = (v) => Math.round(v * 1000) / 1000
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

// ── base = o pai do 1º commit do ajuste (onde quer que a fila o tenha rebaseado); antes do commit, HEAD; senão origin/main
const F15 = 'lib/filmes/faceless15.ts'
let BASE = null
{
  const cands = []
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA_FILMES_F1F3_AJUSTE_1910}`, 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) cands.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  cands.push('HEAD', 'origin/main')
  for (const ref of cands) {
    try { if (!git(['show', `${ref}:${F15}`]).includes(MARCA_FILMES_F1F3_AJUSTE_1910)) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return lf(git(['show', `${BASE}:${p}`])) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)

// ═══ A · arquivos ═══════════════════════════════════════════════════════════════════════════════════════════════════
checa('A1 a base existe e o módulo da receita nela ainda não carrega a marca do ajuste', Boolean(BASE) && rdBase(F15) !== null && !rdBase(F15).includes(MARCA_FILMES_F1F3_AJUSTE_1910))
for (const p of ['lib/compose.ts', 'lib/hookFirstFrame.ts', 'lib/lyriaMusic.ts', 'app/api/compose/route.ts']) {
  // nenhum commit do ajuste (fora os merges da fila) toca o arquivo, e o vivo é BYTE A BYTE a última versão alheia dele (quem
  // vier depois e mexer nele não deixa este guardião vermelho; o ajuste mexendo nele, sim)
  const meus = (() => { try { return git(['log', '--no-merges', '--format=%H', `--grep=${MARCA_FILMES_F1F3_AJUSTE_1910}`, 'HEAD', '--', p]).trim() } catch { return 'erro' } })()
  const alheio = (() => { try { const sha = git(['log', '-1', '--format=%H', '--invert-grep', `--grep=${MARCA_FILMES_F1F3_AJUSTE_1910}`, 'HEAD', '--', p]).trim(); return sha ? lf(git(['show', `${sha}:${p}`])) : null } catch { return null } })()
  checa(`A2 ${p}: nenhum commit do ajuste o toca e é BYTE A BYTE a última versão alheia e a base (nada no motor de vídeo nem na rota)`, meus === '' && alheio !== null && rd(p) === alheio && rdBase(p) !== null)
}
{
  // A referência do guardião reancorado é a ÚLTIMA versão dele deixada por OUTRA sessão (o último commit que o tocou sem a
  // marca do ajuste): o Close real (KINEO-CLOSE-REAL-AJUSTE-1910) reancorou o mesmo guardião no topo, mesclado depois do meu
  // 1º commit — a regra "pai do 1º commit" não enxergaria a camada dele.
  const rdAlheio = (p) => { try { const sha = git(['log', '-1', '--format=%H', '--invert-grep', `--grep=${MARCA_FILMES_F1F3_AJUSTE_1910}`, 'HEAD', '--', p]).trim(); return sha ? lf(git(['show', `${sha}:${p}`])) : null } catch { return null } }
  const ruins = []
  for (const [p, trocas] of Object.entries(TROCAS_FILMES_F1F3_AJUSTE_1910)) {
    const vivo = rd(p)
    const base = rdAlheio(p)
    if (base === null) { ruins.push(p); continue }
    const lv = vivo.split('\n')
    const lb = base.split('\n')
    if (!trocas.every(([nova, antiga]) => lv.includes(nova) && lb.includes(antiga) && nova.includes(MARCA_FILMES_F1F3_AJUSTE_1910) && !antiga.includes(MARCA_FILMES_F1F3_AJUSTE_1910))) { ruins.push(p); continue }
    try { if (semFilmesF1F3Ajuste1910(vivo, p) !== base) ruins.push(p) } catch { ruins.push(p) }
  }
  checa(`A3 guardião reancorado (${Object.keys(TROCAS_FILMES_F1F3_AJUSTE_1910).join(', ')}): cada troca está no vivo e na última versão alheia; desfeita a camada = essa versão byte a byte`, Object.keys(TROCAS_FILMES_F1F3_AJUSTE_1910).length === 1 && ruins.length === 0)
  checa('A4 o desfaz é idempotente, não toca linha sem a marca e recusa linha marcada fora da tabela', semFilmesF1F3Ajuste1910('a\nb', 'x') === 'a\nb' && (() => { try { semFilmesF1F3Ajuste1910(`a // ${MARCA_FILMES_F1F3_AJUSTE_1910}`, 'x'); return false } catch { return true } })())
}
{
  const f15 = rd(F15)
  checa('A5 nenhum volume por keyframe no módulo (propriedade nunca exercitada pela casa) e nenhum resto do ducking em 3 pedaços', !/volume:\s*\[/.test(f15) && !f15.includes('FACELESS15_MUSICA_DUCK') && !f15.includes('FACELESS15_MUSICA_JUNCAO_S') && !/trim_start:\s*r3\(p\)/.test(f15))
}

// ═══ cenário: o roteiro EXATO da escada de 19/10 (Evento Carrington, 43 palavras, 5 frases, 1 vírgula forte por frase) ═
const NARRACAO = 'In 1859, the sun fired a storm straight at Earth. Telegraph wires sparked and shocked their operators. Some lines kept sending messages with the batteries unplugged. Auroras lit the sky over Cuba. Today, the same storm could knock out power grids for months.'
const FRASES = NARRACAO.split(/(?<=\.)\s+/)
// o Whisper de palavra NÃO traz pontuação (lib/compose WhisperWord): o fim de frase vem em sentenceEnd; a vírgula, como pausa
const WORDS = []
{
  let t = 0
  FRASES.forEach((f, fi) => {
    const ws = f.split(' ')
    ws.forEach((w, wi) => {
      const ultima = wi === ws.length - 1
      WORDS.push({ word: w.replace(/[.,]/g, ''), start: r3(t), end: r3(t + 0.29), sentenceEnd: ultima })
      t = r3(t + 0.29 + (ultima && fi < FRASES.length - 1 ? 0.4 : /,$/.test(w) ? 0.2 : 0.05))
    })
  })
}
const FALA = r3(WORDS[WORDS.length - 1].end)
const FRASE_DE = (() => { const m = []; FRASES.forEach((f, fi) => f.split(' ').forEach(() => m.push(fi))); return m })()
const INICIO_PAYOFF = WORDS[FRASE_DE.indexOf(FRASES.length - 1)].start
const CLIPES = ['https://cdn.test/seedance-a.mp4', 'https://cdn.test/seedance-b.mp4', 'https://cdn.test/seedance-c.mp4']
const MUSICA = 'https://v3.fal.media/lyria/trilha.mp3'
const NAO_FECHA = ['over', 'of', 'the', 'a', 'an', 'in', 'to', 'on', 'at', 'for', 'and', 'or', 'with', 'their']

function carregar(mutante = null) {
  const load = createOfflineLoader({ source: (p, s) => (mutante && p === mutante.arquivo ? mutante.troca(s) : s) })
  const C = load('@/lib/compose')
  const F = load('@/lib/filmes/faceless15')
  const montar = ({ musica = true } = {}) => {
    C.setActiveCaptionFont('en')
    return C.buildCreatomateSource({
      clipUrls: CLIPES, voiceoverUrl: 'https://cdn.test/vo.mp3', voiceoverScript: NARRACAO, sceneCaptions: FRASES,
      duration: 15, quality: 'cinematic_ai', realAudioDuration: FALA, whisperWords: clone(WORDS), musicUrl: musica ? MUSICA : null,
      watermark: false, aspect: '9:16', clipSeconds: [6, 6, 6],
      clipSpeech: { narrationWords: NARRACAO.split(/\s+/), wordStarts: [0, 17, 31] },
    })
  }
  return { C, F, montar }
}
const interna = (F, pedido) => F.resolverFaceless15({ interna: true, pedido, quality: 'cinematic_ai', duration: 15, aspect: '9:16', avatar: false, studioAds: false })
const trilha = (src, n, tipo = null) => src.elements.filter((e) => Number(e.track) === n && (tipo == null || e.type === tipo))
const semCor = (t) => String(t ?? '').replace(/\[\/?color[^\]]*\]/g, '').trim()
/** Os blocos como aparecem na tela: elementos consecutivos do karaokê com o mesmo texto = um bloco. */
const blocosDaTela = (legs) => {
  const out = []
  for (const e of legs) {
    const txt = semCor(e.text)
    const ult = out[out.length - 1]
    if (ult && ult.text === txt && Math.abs(ult.fim - e.time) < 1e-6) { ult.fim = r3(e.time + e.duration); ult.els.push(e); continue }
    out.push({ text: txt, time: e.time, fim: r3(e.time + e.duration), els: [e] })
  }
  return out
}

function provas({ C, F, montar }) {
  const p = {}
  // ── L · F1 na montagem real com o roteiro da escada
  {
    const s = montar()
    const relato = F.aplicarFaceless15(s, interna(F, ['f1']), { whisperWords: clone(WORDS), clipSeconds: [6, 6, 6] })
    const legs = trilha(s, 5, 'text')
    const tela = blocosDaTela(legs)
    const palavras = tela.map((b) => b.text.split(/\s+/))
    // índice global de cada palavra da tela (a ordem do Whisper)
    let k = 0
    const idx = palavras.map((ws) => ws.map(() => k++))
    const seq = palavras.flat().join(' ')
    p['L1 todas as palavras do Whisper na tela, na ordem, nenhuma repetida nem perdida'] = relato.f1?.chunker === 'whisper' && seq === WORDS.map((w) => w.word.toUpperCase()).join(' ')
    p['L2 nenhum bloco de 1 palavra (o roteiro não tem frase de 1 palavra) — "CUBA" e "MONTHS" nunca sozinhos'] = tela.length > 0 && palavras.every((ws) => ws.length >= 2) && !tela.some((b) => b.text === 'CUBA' || b.text === 'MONTHS' || b.text === 'THEIR OPERATORS')
    p['L3 nenhum bloco atravessa fim de frase'] = idx.every((ids) => ids.every((i) => FRASE_DE[i] === FRASE_DE[ids[0]]))
    p['L4 nenhum bloco termina em preposição/artigo/conjunção no meio da frase ("…SKY OVER" nunca)'] = idx.every((ids, b) => WORDS[ids[ids.length - 1]].sentenceEnd === true || !NAO_FECHA.includes(palavras[b][palavras[b].length - 1].toLowerCase()))
    p['L5 no máximo 5 palavras por bloco'] = palavras.every((ws) => ws.length <= 5) && palavras.some((ws) => ws.length >= 4)
    const amarelos = tela.filter((b) => b.els.every((e) => e.fill_color === '#FFD700'))
    const daPayoff = tela.filter((_, b) => FRASE_DE[idx[b][0]] === FRASES.length - 1)
    p['L6 payoff INTEIRO amarelo (todas as palavras da última frase, e só elas, em linha amarela)'] = amarelos.length > 0 && eqJ(amarelos.map((b) => b.text), daPayoff.map((b) => b.text)) && daPayoff.map((b) => b.text).join(' ') === FRASES[FRASES.length - 1].replace(/[.,]/g, '').toUpperCase() && relato.f1.payoffEm === INICIO_PAYOFF
    p['L7 tempos −120 ms sobre a 1ª palavra de cada bloco (o 1º em 0), um elemento por vez, o último até o fim da fala'] =
      tela.every((b, i) => Math.abs(b.time - Math.max(0, r3(WORDS[idx[i][0]].start - 0.12))) < 1e-6) && legs.every((e, i) => i === 0 || legs[i - 1].time + legs[i - 1].duration <= e.time + 1e-6) && Math.abs(tela[tela.length - 1].fim - r3(Math.min(FALA, s.duration))) < 0.011
    p['L8 legenda na posição da F1 (62 %) e só a trilha 5 mudou de quem é a F1'] = legs.every((e) => e.y === '62%')
  }
  // ── L · regras do agrupador, casos à mão
  {
    const W = (frases, { pontuacao = true, pausas = {} } = {}) => {
      const out = []
      let t = 0
      frases.forEach((f, fi) => f.split(' ').forEach((w, wi, ws) => {
        const ult = wi === ws.length - 1
        out.push({ word: w, start: r3(t), end: r3(t + 0.3), ...(pontuacao ? { sentenceEnd: ult } : {}) })
        t = r3(t + 0.3 + (pausas[out.length - 1] ?? (ult && fi < frases.length - 1 ? 0.4 : 0.05)))
      }))
      return out
    }
    const tx = (bs) => bs.map((b) => b.text)
    const seis = F.agruparLegendaFaceless15(W(['Some quiet towns simply vanished overnight']), 99)
    p['L9 frase de 6 palavras sem vírgula: 3+3 (nunca 5+1)'] = eqJ(seis.map((b) => b.words.length), [3, 3])
    p['L10 "4+1 → 3+2": frase de 5 com teto 4 sai 3+2 (partirFrase)'] = eqJ(F.partirFraseFaceless15(5, [false, false, false, false, false], [0, 0, 0, 0, 0], 4), [3, 2]) && eqJ(F.partirFraseFaceless15(6, new Array(6).fill(false), new Array(6).fill(0), 5), [3, 3])
    const aur = F.agruparLegendaFaceless15(W(['Auroras lit the sky over Cuba']), 99)
    p['L11 "Auroras lit the sky over Cuba": nenhum bloco termina em "the"/"over"'] = aur.length === 2 && aur.every((b, i) => i === aur.length - 1 || !['the', 'over'].includes(b.words[b.words.length - 1].word.toLowerCase()))
    const pt = F.agruparLegendaFaceless15(W(['A tempestade atingiu o centro da cidade inteira']), 99)
    p['L12 PT: "A tempestade atingiu o centro da cidade inteira" não fecha bloco em "o"/"da"'] = pt.length === 2 && !['o', 'da', 'de', 'a'].includes(pt[0].words[pt[0].words.length - 1].word.toLowerCase())
    const es = F.agruparLegendaFaceless15(W(['La lluvia cayó sobre la ciudad del norte']), 99)
    p['L13 ES: não fecha bloco em "la"/"del"'] = es.length === 2 && !['la', 'del', 'sobre'].includes(es[0].words[es[0].words.length - 1].word.toLowerCase())
    const gone = F.agruparLegendaFaceless15(W(['The lights went out across the city', 'Gone']), 99)
    p['L14 frase de UMA palavra ("Gone.") fica sozinha porque é frase inteira (não é órfã), e não cola na anterior'] = eqJ(tx(gone).slice(-1), ['Gone']) && gone[gone.length - 1].fraseInteira === true && gone.slice(0, -1).every((b) => b.words.length >= 2)
    const semPont = F.agruparLegendaFaceless15(W(['Today', 'the same storm could knock out power grids'], { pontuacao: false, pausas: { 0: 0.35 } }), 99)
    p['L15 sem pontuação do Whisper: a pausa longa depois de UMA palavra ("Today…") não deixa "Today" sozinho'] = semPont.length >= 2 && semPont.every((b) => b.words.length >= 2) && semPont[0].text.startsWith('Today ')
    const virg = F.agruparLegendaFaceless15(W(['In the end the storm passed slowly and the sky cleared'], { pausas: { 2: 0.2 } }), 99)
    p['L16 vírgula/pausa forte ajuda: "In the end, …" parte depois de "end"'] = virg[0].text === 'In the end'
  }
  // ── S · F3: música num elemento só
  for (const caso of ['f3', 'f3+f4+cta']) {
    const s = montar()
    const ref = clone(s)
    const fases = caso === 'f3' ? ['f3'] : ['f3', 'f4', 'cta']
    const relato = F.aplicarFaceless15(s, interna(F, fases), { whisperWords: clone(WORDS), clipSeconds: [6, 6, 6], font: 'Montserrat' })
    const T = s.duration
    const mus = trilha(s, 8)
    const m = mus[0]
    p[`S1 ${caso}: UM só elemento na trilha 8 (nunca pedaços somando/cortando), áudio, mesma faixa, loop`] = mus.length === 1 && m.type === 'audio' && m.source === MUSICA && m.loop === true && relato.f3?.musica === 'unica'
    p[`S2 ${caso}: 14 % FIXOS (string, sem keyframe), sem ducking, sem trim_start`] = m?.volume === '14%' && typeof m.volume === 'string' && !('trim_start' in m) && relato.f3.volume === '14%' && !('duck' in relato.f3)
    p[`S3 ${caso}: do 0 ao FIM do filme (${caso === 'f3' ? 'total' : 'total + 1 s do CTA'}) — a cauda depois da fala tem música`] = m?.time === 0 && r3(m.duration) === r3(T) && FALA < T && eqJ(relato.f3.cobre, [0, T]) && (caso === 'f3' ? T === ref.duration : T === r3(ref.duration + 1))
    p[`S4 ${caso}: os fades de sempre de lib/compose (0,8 s de entrada, 1,2 s de saída) — o F0 com cauda audível em produção`] = m?.audio_fade_in === 0.8 && m.audio_fade_out === 1.2
    const sfx = trilha(s, 12, 'audio')
    const CAT = F.SFX_FACELESS15
    const nWhoosh = (relato.f4?.aplicado ? relato.f4.cortes : trilha(ref, 2, 'video').map((e) => e.time).filter((t) => t > 0)).length
    p[`S5 ${caso}: SFX como estavam — riser 0 s 20 %, um whoosh 25 % por corte, pop 30 % no reveal (trilha 12)`] =
      sfx.filter((e) => e.source === CAT.riser.url && e.time === 0 && e.volume === '20%').length === 1 &&
      sfx.filter((e) => e.source === CAT.whoosh.url && e.volume === '25%').length === nWhoosh && nWhoosh >= 2 &&
      sfx.filter((e) => e.source === CAT.pop.url && e.volume === '30%' && e.time === INICIO_PAYOFF).length === 1
    p[`S6 ${caso}: voz (trilha 4) byte a byte`] = eqJ(trilha(s, 4), trilha(ref, 4))
  }
  {
    const s = montar({ musica: false })
    const r = F.aplicarFaceless15(s, interna(F, ['f3']), { whisperWords: clone(WORDS), clipSeconds: [6, 6, 6] })
    p['S7 sem trilha (Lyria e catálogo falharam): nenhuma música inventada, SFX entram'] = r.f3?.musica === 'sem_trilha' && trilha(s, 8).length === 0 && trilha(s, 12).length >= 3
  }
  return p
}

// ═══ pristina ═══════════════════════════════════════════════════════════════════════════════════════════════════════
const P = provas(carregar())
for (const [n, v] of Object.entries(P)) checa(n, v === true)

// ═══ M · mutantes APLICADOS (a âncora existe uma única vez e a troca muda a fonte) — cada um deixa vermelha a prova ═══
const mut = (nome, de, para, provasQueCaem) => {
  const fonte = rd(F15)
  const n = fonte.split(de).length - 1
  if (n !== 1 || de === para) { checa(`M ${nome}: a âncora do mutante existe uma única vez e a troca muda a fonte (achou ${n})`, false); return }
  let caiu
  try { caiu = provas(carregar({ arquivo: F15, troca: (s) => { const t = s.split(de).join(para); if (t === s) throw new Error('mutante não aplicou'); return t } })) } catch (e) { caiu = { erro: e.message } }
  const vermelhas = Object.entries(caiu).filter(([, v]) => v !== true).map(([k]) => k)
  checa(`M ${nome} → fica vermelho: ${provasQueCaem.join(' · ')}`, provasQueCaem.every((pq) => vermelhas.some((v) => v.startsWith(pq))))
}
mut('corte cego de volta (≤5 sem olhar a frase: "…SKY OVER" / "CUBA")',
  'const caps = agruparLegendaFaceless15(whisperWords, fimJanela)',
  'const caps = buildCaptionsFromWhisperWords(whisperWords as WhisperWord[], fimJanela, 0, FACELESS15_LEGENDA_PALAVRAS)',
  ['L2', 'L4'])
mut('bloco de 1 palavra (frase de 1 palavra nascida de pausa não junta à vizinha)',
  'if (f.fim - f.ini !== 1 || (f.real && temPontuacao)) continue',
  'continue',
  ['L15'])
mut('bloco atravessando ponto (fim de frase ignorado)',
  'const real = toks[i].sentenceEnd === true',
  'const real = false',
  ['L3'])
mut('preposição/artigo pode fechar bloco',
  '(meio && naoFecha[ultima] ? 100 : 0)',
  '0',
  ['L4', 'L11'])
mut('5+1 permitido (bloco de 1 palavra no meio da frase vale)',
  'if (n <= max) return [n]',
  'if (n <= max) return [n]; if (n === max + 1) return [max, 1]',
  ['L2', 'L9'])
mut('sem antecipação de −120 ms',
  'export const FACELESS15_LEGENDA_ANTECIPACAO_S = 0.12',
  'export const FACELESS15_LEGENDA_ANTECIPACAO_S = 0',
  ['L7'])
mut('payoff sem amarelo',
  'const ehPayoff = (t: number): boolean => payoff != null && t >= payoff - 0.05',
  'const ehPayoff = (t: number): boolean => false && payoff != null && t >= payoff - 0.05',
  ['L6'])
mut('música em mais de 1 elemento (a música da base fica e a nova soma por cima)',
  'const semMusica = saida.filter((e) => !ehAudio(e, 8))',
  'const semMusica = [...saida]',
  ['S1 f3:', 'S1 f3+f4+cta:'])
mut('cauda sem música (música acaba no fim da fala)',
  "const unica: El = { type: 'audio', track: 8, time: 0, duration: T,",
  "const unica: El = { type: 'audio', track: 8, time: 0, duration: r3(quadro.falaFim),",
  ['S3 f3:', 'S3 f3+f4+cta:'])
mut('ducking de volta (volume 18 % e não 14 %)',
  "export const FACELESS15_MUSICA_VOLUME = '14%'",
  "export const FACELESS15_MUSICA_VOLUME = '18%'",
  ['S2 f3:'])
mut('música sem loop',
  'volume: FACELESS15_MUSICA_VOLUME, loop: true, audio_fade_in',
  'volume: FACELESS15_MUSICA_VOLUME, audio_fade_in',
  ['S1 f3:'])

console.log(`\n${falhas.length === 0 ? '✅' : '❌'} ${ok} verdes, ${falhas.length} vermelhas`)
if (falhas.length) { console.error('\nFalhas:'); for (const f of falhas) console.error('  · ' + f); process.exit(1) }
