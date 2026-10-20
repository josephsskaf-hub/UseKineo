// KINEO-FILMES-F1-VIRGULA-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — guardião do conserto da F1
// nas frases com vírgula e do Faceless 15 s no export limpo.
//
// O defeito (escada v2 de 19/10, docs/RESULTADO-ESCADA-F1-F4-2026-10-19.md §v2): com o Whisper REAL, "In 1859, the sun
// fired a storm straight at Earth." saiu A STORM STRAIGHT AT / EARTH e "Today, …" saiu KNOCK OUT POWER GRIDS FOR / MONTHS
// (12 blocos em vez de 11). Causa: o agrupador casava cada token com a palavra original pelo TEMPO DE FIM; o Whisper dá
// duração ZERO à última palavra da frase (Earth 3,48–3,48 = o fim de "at"; months 16,58–16,58 = o fim de "for"), então o
// fim de frase de "Earth" grudava em "at" e "Earth" virava uma frase de 1 palavra. O guardião offline de antes passou porque
// o Whisper sintético não tinha palavra de duração zero.
//
// Prova, com o Whisper REAL (scripts/test-support/fixture-whisper-carrington-1910.json, o cache de voz da escada), pela
// cadeia da rota (Whisper → grafia do roteiro → buildCreatomateSource → aplicarFaceless15):
//   R  os 11 blocos certos, nenhum de 1 palavra, nenhum atravessa frase, nenhum fecha em preposição, payoff inteiro amarelo;
//   T  casos à mão: palavra de duração zero no fim da frase; AM/PM colados continuam alinhados;
//   U  o export limpo (app/api/compose/unlock/route.ts) aplica a receita: só acréscimos marcados (desfeitos = a base),
//      na ordem certa, conta interna do servidor; desligado = JSON do Creatomate idêntico byte a byte;
//   M  mutantes APLICADOS e vermelhos (inclusive o casamento por tempo de fim de volta).
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semFilmesF1Virgula1910, ACRESCIMOS_FILMES_F1_VIRGULA_1910, TROCAS_FILMES_F1_VIRGULA_1910, ARQUIVOS_FILMES_F1_VIRGULA_1910 } from './test-support/desfaz-filmes-f1-virgula-1910.mjs'
import { semCloseRealLegenda1910 } from './test-support/desfaz-close-real-legenda-1910.mjs' // KINEO-CLOSE-REAL-LEGENDA-1910 — reancorado: a legenda menor do Close real (mesclada depois) sai PRIMEIRO no guardião do Close real que esta entrega reancorou

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const MARCA = 'KINEO-FILMES-F1-VIRGULA-1910'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
import { semMeta95Assunto1910 } from './test-support/desfaz-meta95-assunto-1910.mjs' // KINEO-META95-ASSUNTO-1910 — reancorado: o assunto traduzido (19/10, a camada mais nova nos guardiões reancorados) sai PRIMEIRO, em memória
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else { falhas.push(n); console.log('  FALHOU: ' + n) } }
const eqJ = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const clone = (v) => JSON.parse(JSON.stringify(v))
const r3 = (v) => Math.round(v * 1000) / 1000
const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

const FIX = JSON.parse(rd('scripts/test-support/fixture-whisper-carrington-1910.json'))
const NARRACAO = FIX.narracao
const FRASES = NARRACAO.split(/(?<=\.)\s+/)
const CLIPES = ['https://cdn.test/seedance-a.mp4', 'https://cdn.test/seedance-b.mp4', 'https://cdn.test/seedance-c.mp4']
const MUSICA = 'https://v3.fal.media/lyria/trilha.mp3'
const NAO_FECHA = ['over', 'of', 'the', 'a', 'an', 'in', 'to', 'on', 'at', 'for', 'and', 'or', 'with', 'their']
const ESPERADO = [
  'IN 1859 THE SUN FIRED', 'A STORM STRAIGHT AT EARTH', 'TELEGRAPH WIRES SPARKED', 'AND SHOCKED THEIR OPERATORS',
  'SOME LINES KEPT SENDING MESSAGES', 'WITH THE BATTERIES UNPLUGGED', 'AURORAS LIT THE SKY', 'OVER CUBA',
  'TODAY THE SAME STORM', 'COULD KNOCK OUT POWER', 'GRIDS FOR MONTHS',
]

function carregar(mutante = null) {
  const load = createOfflineLoader({ source: (p, s) => (mutante && p === mutante.arquivo ? mutante.troca(s) : s) })
  const C = load('@/lib/compose')
  const F = load('@/lib/filmes/faceless15')
  const G = load('@/lib/captionScriptSpelling')
  // a cadeia da rota: legendaWords = grafia do roteiro sobre o Whisper (app/api/compose/route.ts, KINEO-LEGENDA-GRAFIA)
  const legendaWords = () => G.alinharGrafiaDoRoteiro(clone(FIX.words), NARRACAO).words
  const montar = ({ watermark = false, endCard = undefined } = {}) => {
    C.setActiveCaptionFont('en')
    return C.buildCreatomateSource({
      clipUrls: CLIPES, voiceoverUrl: 'https://cdn.test/vo.mp3', voiceoverScript: NARRACAO, sceneCaptions: FRASES,
      duration: 15, quality: 'cinematic_ai', realAudioDuration: FIX.audioDuration, whisperWords: legendaWords(), musicUrl: MUSICA,
      watermark, ...(endCard === undefined ? {} : { endCard }), aspect: '9:16', clipSeconds: [6, 6, 6],
    })
  }
  return { C, F, G, legendaWords, montar }
}
const interna = (F, pedido, extra = {}) => F.resolverFaceless15({ interna: true, pedido, quality: 'cinematic_ai', duration: 15, aspect: '9:16', avatar: false, studioAds: false, ...extra })
const externa = (F, pedido) => F.resolverFaceless15({ interna: false, pedido, quality: 'cinematic_ai', duration: 15, aspect: '9:16', avatar: false, studioAds: false })
const trilha = (src, n, tipo = null) => src.elements.filter((e) => Number(e.track) === n && (tipo == null || e.type === tipo))
const semCor = (t) => String(t ?? '').replace(/\[\/?color[^\]]*\]/g, '').trim()
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
const limpa = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function provas({ F, legendaWords, montar }) {
  const p = {}
  // ── R · o Whisper REAL da escada, pela cadeia da rota
  {
    const s = montar()
    const lw = legendaWords()
    const relato = F.aplicarFaceless15(s, interna(F, ['f1']), { whisperWords: lw, clipSeconds: [6, 6, 6] })
    const tela = blocosDaTela(trilha(s, 5, 'text'))
    const textos = tela.map((b) => b.text)
    const palavras = tela.map((b) => b.text.split(/\s+/))
    // a frase de cada palavra da tela, contada pelo Whisper real (sentenceEnd)
    const fraseDe = []
    { let f = 0; for (const w of FIX.words) { fraseDe.push(f); if (w.sentenceEnd) f++ } }
    let k = 0
    const idx = palavras.map((ws) => ws.map(() => k++))
    p['R0 a fixture é o Whisper real da escada: 43 palavras, 5 fins de frase, "Earth" e "months" com duração ZERO grudados no fim da palavra anterior'] =
      FIX.words.length === 43 && FIX.words.filter((w) => w.sentenceEnd).length === 5 &&
      ['Earth', 'months'].every((x) => { const i = FIX.words.findIndex((w) => w.word === x); return i > 0 && FIX.words[i].start === FIX.words[i].end && FIX.words[i].end === FIX.words[i - 1].end && FIX.words[i].sentenceEnd === true })
    p['R1 os 11 blocos certos, na ordem (era 12: "A STORM STRAIGHT AT" / "EARTH" e "KNOCK OUT POWER GRIDS FOR" / "MONTHS")'] = relato.f1?.chunker === 'whisper' && relato.f1.chunks === 11 && eqJ(textos, ESPERADO)
    p['R2 todas as 43 palavras na tela, na ordem do Whisper'] = palavras.flat().map(limpa).join(' ') === FIX.words.map((w) => limpa(w.word)).join(' ')
    p['R3 nenhum bloco de 1 palavra ("EARTH" e "MONTHS" nunca sozinhos)'] = palavras.every((ws) => ws.length >= 2) && !textos.some((t) => /^(EARTH|MONTHS)\.?$/.test(t))
    p['R4 nenhum bloco atravessa fim de frase, e todo fim de frase fecha um bloco'] = idx.every((ids) => ids.every((i) => fraseDe[i] === fraseDe[ids[0]])) && FIX.words.every((w, i) => !w.sentenceEnd || idx.some((ids) => ids[ids.length - 1] === i))
    p['R5 nenhum bloco fecha em preposição/artigo/conjunção no meio da frase ("STRAIGHT AT", "GRIDS FOR" nunca)'] = idx.every((ids, b) => FIX.words[ids[ids.length - 1]].sentenceEnd === true || !NAO_FECHA.includes(limpa(palavras[b][palavras[b].length - 1])))
    const payoff = tela.filter((b) => idx[tela.indexOf(b)].every((i) => fraseDe[i] === 4))
    p['R6 payoff inteiro amarelo (as 3 linhas de "Today, …" e só elas)'] = payoff.length === 3 && tela.every((b, i) => (fraseDe[idx[i][0]] === 4) === b.els.every((e) => e.fill_color === '#FFD700'))
    const earth = tela.find((b) => b.text.includes('EARTH'))
    const storm = FIX.words.find((w) => w.word === 'a' && w.start > 2)
    p['R7 "EARTH" entra com o bloco dele (−120 ms sobre "a", 1,94 s), não na pausa depois de dito (era 3,36 s sozinho)'] = !!earth && Math.abs(earth.time - r3(storm.start - 0.12)) < 1e-6 && earth.time < 3
  }
  // ── T · casos à mão
  {
    const zero = F.agruparLegendaFaceless15([
      { word: 'The', start: 0, end: 0.2 }, { word: 'river', start: 0.2, end: 0.5 }, { word: 'reached', start: 0.5, end: 0.8 }, { word: 'the', start: 0.8, end: 1.0 },
      { word: 'old', start: 1.0, end: 1.2 }, { word: 'town', start: 1.2, end: 1.2, sentenceEnd: true },
      { word: 'Nobody', start: 1.6, end: 1.9 }, { word: 'survived', start: 1.9, end: 2.3, sentenceEnd: true },
    ], 99)
    p['T1 palavra de duração zero no fim da frase (fim = fim da anterior) continua sendo o fim da frase — 6 palavras = 3+3, "Nobody survived" à parte'] = eqJ(zero.map((b) => b.text), ['The river reached', 'the old town', 'Nobody survived'])
    const am = F.agruparLegendaFaceless15([
      { word: 'We', start: 0, end: 0.2 }, { word: 'wake', start: 0.2, end: 0.4 }, { word: 'at', start: 0.4, end: 0.5 }, { word: '5', start: 0.5, end: 0.7 },
      { word: 'A', start: 0.7, end: 0.8 }, { word: 'M', start: 0.8, end: 0.9 }, { word: 'daily', start: 0.9, end: 1.2, sentenceEnd: true },
      { word: 'It', start: 1.25, end: 1.4 }, { word: 'works', start: 1.4, end: 1.7, sentenceEnd: true },
    ], 99)
    p['T2 AM/PM colados por lib/compose ("5 A M" → "5 AM") continuam alinhados: o fim de frase fica em "daily"'] = eqJ(am.map((b) => b.text), ['We wake at 5 AM daily', 'It works'])
  }
  return p
}

// ═══ pristina ═══════════════════════════════════════════════════════════════════════════════════════════════════════
const P = provas(carregar())
for (const [n, v] of Object.entries(P)) checa(n, v === true)

// ═══ M · mutantes APLICADOS ═════════════════════════════════════════════════════════════════════════════════════════
const F15 = 'lib/filmes/faceless15.ts'
const mut = (nome, de, para, provasQueCaem) => {
  const fonte = rd(F15)
  const n = fonte.split(de).length - 1
  if (n !== 1 || de === para) { checa(`M ${nome}: a âncora existe uma única vez e a troca muda a fonte (achou ${n})`, false); return }
  let caiu
  try { caiu = provas(carregar({ arquivo: F15, troca: (s) => { const t = s.split(de).join(para); if (t === s) throw new Error('mutante não aplicou'); return t } })) } catch (e) { caiu = { erro: e.message } }
  const vermelhas = Object.entries(caiu).filter(([, v]) => v !== true).map(([k]) => k)
  checa(`M ${nome} → fica vermelho: ${provasQueCaem.join(' · ')}`, provasQueCaem.every((pq) => vermelhas.some((v) => v.startsWith(pq))))
}
mut('casamento por TEMPO DE FIM de volta (o defeito da escada v2: o ponto de "Earth" gruda em "at")',
  'const casadas = naJanela.slice(j0, j)',
  'const casadas = [...originais].reverse().filter((o) => r3(o.end) === r3(w.end)).slice(0, 1)',
  ['R1', 'R3', 'R5', 'R7', 'T1'])
mut('token colado ("5 AM") consome só uma original (o alinhamento escorrega)',
  'while (j < naJanela.length && acc.length < alvo.length) { acc += chave(naJanela[j].word); j++ }',
  'if (j < naJanela.length) { acc += chave(naJanela[j].word); j++ }',
  ['T2'])

// ═══ U · export limpo (app/api/compose/unlock/route.ts) ═════════════════════════════════════════════════════════════
{
  const UNLOCK = 'app/api/compose/unlock/route.ts'
  // a referência de cada arquivo é a ÚLTIMA versão dele deixada por OUTRA sessão (último commit que o tocou sem a marca)
  const alheio = (p) => { try { const sha = git(['log', '-1', '--format=%H', '--invert-grep', `--grep=${MARCA}`, '--grep=KINEO-CLOSE-REAL-LEGENDA-1910', '--grep=KINEO-META95-ASSUNTO-1910' /* reancorado KINEO-META95-ASSUNTO-1910 */, '--grep=KINEO-KIT-BF-1910' /* reancorado KINEO-KIT-BF-1910: o commit do kit (que reancora o guardião da rodada 3) não é a versão alheia */, '--grep=KINEO-HOME-3-CARDS-1910' /* reancorado KINEO-HOME-3-CARDS-1910: pula os commits dos 3 cards */, '--grep=KINEO-APRESENTADOR-OLHOS-1910' /* reancorado KINEO-APRESENTADOR-OLHOS-1910: pula os commits dos olhos abertos (merge e reâncoras) */, '--grep=KINEO-FILMES-F1F3-PUBLICO-2010' /* reancorado KINEO-FILMES-F1F3-PUBLICO-2010: pula os commits da virada F1+F3 públicas */, 'HEAD', '--', p]).trim(); return sha ? lf(git(['show', `${sha}:${p}`])) : null } catch { return null } } // KINEO-CLOSE-REAL-LEGENDA-1910 — reancorado: a versão 'alheia' pula também os commits da legenda menor do Close real
  const meus = (p) => { try { return git(['log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD', '--', p]).trim() } catch { return 'erro' } }
  for (const p of ['lib/compose.ts', 'lib/hookFirstFrame.ts', 'lib/lyriaMusic.ts', 'app/api/compose/route.ts']) {
    checa(`U0 ${p}: nenhum commit desta entrega o toca e é BYTE A BYTE a última versão alheia`, meus(p) === '' && alheio(p) !== null && rd(p) === alheio(p))
  }
  const provasRota = (u) => {
    const q = {}
    const marcadas = u.split('\n').filter((l) => l.includes(MARCA))
    q['U1 o unlock só ganhou acréscimos marcados (import + 4 linhas)'] = marcadas.length === ACRESCIMOS_FILMES_F1_VIRGULA_1910[UNLOCK]
    const iBuild = u.indexOf('source = buildCreatomateSource({')
    const iCatch = u.indexOf('} catch (err) {', iBuild)
    const iRes = u.indexOf('const faceless15 = resolverFaceless15({')
    const iApl = u.indexOf('const faceless15Relato = aplicarFaceless15(source, faceless15, {')
    const iLogo = u.indexOf('withBrandLogo(source, await findBrandLogoUrl(user.id, admin))')
    const iHook = u.indexOf('withHookFirstFrame(source, { interna: isInternalEmail(user.email), narration: scaledScript, font: captionFontFor(language) })')
    const iG2 = u.indexOf('const g2 = aplicarGanchoFaceless15(source, faceless15, { narration: scaledScript, font: captionFontFor(language) })')
    const iSub = u.indexOf('await submitUnlockOnce(source')
    // no caminho feliz o builder sai do try e cai direto no resolver (o catch só tem a espera de quem já falhou e retornou)
    const iFimCatch = u.indexOf('\n    }\n', iCatch)
    q['U2 ordem: builder → resolver → aplicar (SÍNCRONO: nenhum await entre o fim do catch e o aplicar; a 1ª espera depois do builder é a do logo) → logo → gancho da conta interna → F2 → envio'] =
      iBuild > 0 && iCatch > iBuild && iFimCatch > iCatch && iRes > iFimCatch && iApl > iRes && iLogo > iApl && iHook > iLogo && iG2 > iHook && iSub > iG2 && !u.slice(iFimCatch, iApl).includes('await ')
    const res = iRes > 0 ? u.slice(iRes, u.indexOf('\n', iRes)) : ''
    const apl = iApl > 0 ? u.slice(iApl, u.indexOf('\n', iApl)) : ''
    q['U3 a decisão é a mesma do /api/compose: conta interna do SERVIDOR (isInternalEmail(user.email)), quality do rebuild, duração, quadro, formatFlags do corpo; legenda pelo MESMO Whisper com a grafia do roteiro que o builder recebeu'] =
      ['interna: isInternalEmail(user.email)', '.formatFlags ??', 'quality: rebuildQuality', 'duration,', 'aspect,', 'avatar: false', 'studioAds: false'].every((x) => res.includes(x)) &&
      apl.includes('whisperWords: whisperWords ? grafiaDoRoteiro(whisperWords, scaledScript) : null') && apl.includes('font: captionFontFor(language)') &&
      u.includes('whisperWords: whisperWords ? grafiaDoRoteiro(whisperWords, scaledScript) : whisperWords,')
    return q
  }
  const unlock = rd(UNLOCK)
  for (const [n, v] of Object.entries(provasRota(unlock))) checa(n, v === true)
  // desfeito = a última versão alheia (o unlock e os guardiões reancorados)
  const ruins = []
  for (const p of ARQUIVOS_FILMES_F1_VIRGULA_1910) {
    const vivo = semCloseRealLegenda1910(semMeta95Assunto1910(rd(p), p), p) /* reancorado KINEO-META95-ASSUNTO-1910: a camada do assunto traduzido sai primeiro */ // KINEO-CLOSE-REAL-LEGENDA-1910 — reancorado: sem a camada da legenda menor (mais nova), em memória
    const base = alheio(p)
    const trocas = TROCAS_FILMES_F1_VIRGULA_1910[p] ?? []
    if (base === null || !trocas.every(([nova, antiga]) => vivo.split('\n').includes(nova) && base.split('\n').includes(antiga) && nova.includes(MARCA) && !antiga.includes(MARCA))) { ruins.push(p); continue }
    try { if (semFilmesF1Virgula1910(vivo, p) !== base) ruins.push(p) } catch { ruins.push(p) }
  }
  checa(`U4 ${ARQUIVOS_FILMES_F1_VIRGULA_1910.length} arquivos (unlock + guardiões reancorados): desfeita a entrega = a última versão alheia byte a byte; acréscimos na contagem exata`, ARQUIVOS_FILMES_F1_VIRGULA_1910.length === 10 && ruins.length === 0)
  checa('U5 o desfaz só age nos arquivos declarados e recusa contagem errada', semFilmesF1Virgula1910(`a // ${MARCA}`, 'lib/x.ts') === `a // ${MARCA}` && (() => { try { semFilmesF1Virgula1910(`${unlock}\nx // ${MARCA}`, UNLOCK); return false } catch { return true } })())
  // comportamento: a montagem do export limpo (watermark:false, endCard:false) com a receita
  {
    const { F, legendaWords, montar } = carregar()
    const s = montar({ watermark: false, endCard: false }) // KINEO-FILMES-F1F3-PUBLICO-2010 — o export limpo de um CLIENTE (o unlock: interna do servidor = false, sem formatFlags)
    const prev = montar({ watermark: true }) // KINEO-FILMES-F1F3-PUBLICO-2010 — a prévia do mesmo filme no /api/compose (com marca d'água)
    const r1 = F.aplicarFaceless15(s, externa(F, ['f2', 'f4']), { whisperWords: legendaWords(), clipSeconds: null }) // KINEO-FILMES-F1F3-PUBLICO-2010 — o unlock passa clipSeconds null; o pedido do cliente é ignorado
    const r2 = F.aplicarFaceless15(prev, externa(F, undefined), { whisperWords: legendaWords(), clipSeconds: [6, 6, 6] }) // KINEO-FILMES-F1F3-PUBLICO-2010 — a prévia passa os segundos assinados
    const fora = ['fast', 35].map((v) => { const x = montar({ watermark: false, endCard: false }); const foto = JSON.stringify(x); const r = F.aplicarFaceless15(x, F.resolverFaceless15({ interna: false, pedido: undefined, quality: v === 'fast' ? 'fast' : 'cinematic_ai', duration: v === 35 ? 35 : 15, aspect: '9:16', avatar: false, studioAds: false }), { whisperWords: legendaWords(), clipSeconds: null }); return r.ativo === false && JSON.stringify(x) === foto }) // KINEO-FILMES-F1F3-PUBLICO-2010
    checa('U6 F1+F3 públicas (20/10): o export limpo do CLIENTE acompanha a prévia — mesmas fases (f1, f3), a mesma legenda de 11 blocos, a mesma música e os mesmos SFX; fora do formato (Kineo 1, 35 s) o JSON segue IDÊNTICO byte a byte', r1.ativo === true && eqJ(r1.fases, ['f1', 'f3']) && eqJ(r2.fases, ['f1', 'f3']) && r1.f1?.chunks === 11 && r2.f1?.chunks === 11 && eqJ(trilha(s, 5), trilha(prev, 5)) && eqJ(trilha(s, 8), trilha(prev, 8)) && eqJ(trilha(s, 12), trilha(prev, 12)) && trilha(s, 12).length >= 3 && !r1.f4 && fora.every(Boolean)) // KINEO-FILMES-F1F3-PUBLICO-2010
    const s2 = montar({ watermark: false, endCard: false })
    const r3x = F.aplicarFaceless15(s2, interna(F, ['f1', 'f3']), { whisperWords: legendaWords(), clipSeconds: null })
    checa("U7 export limpo com F1+F3: a mesma legenda de 11 blocos da prévia, música única a 14 % do 0 ao fim, sem marca d'água inventada", r3x.f1?.chunks === 11 && trilha(s2, 5).every((e) => e.y === '62%') && trilha(s2, 8).length === 1 && trilha(s2, 8)[0].volume === '14%' && trilha(s2, 8)[0].duration === s2.duration && trilha(s2, 9).length === 0)
  }
  // mutantes da rota (texto em memória)
  const mutRota = (nome, de, para, cai) => {
    const n = unlock.split(de).length - 1
    if (n !== 1) { checa(`M ${nome}: âncora única (achou ${n})`, false); return }
    const q = provasRota(unlock.split(de).join(para))
    checa(`M ${nome} → fica vermelho: ${cai}`, q[Object.keys(q).find((k) => k.startsWith(cai))] === false)
  }
  mutRota('a receita roda DEPOIS de uma espera (o quadro/fonte podem ser de outra montagem)', '    const faceless15Relato = aplicarFaceless15(source, faceless15, {', '    await Promise.resolve(); const faceless15Relato = aplicarFaceless15(source, faceless15, {', 'U2')
  mutRota('a conta interna vem do corpo', 'resolverFaceless15({ interna: isInternalEmail(user.email),', 'resolverFaceless15({ interna: body.interna === true,', 'U3')
  mutRota('a legenda usa o Whisper cru (sem a grafia do roteiro)', 'whisperWords: whisperWords ? grafiaDoRoteiro(whisperWords, scaledScript) : null', 'whisperWords: whisperWords ?? null', 'U3')
  mutRota('F2 antes do gancho da conta interna', '    withHookFirstFrame(source, { interna: isInternalEmail(user.email), narration: scaledScript, font: captionFontFor(language) }) // KINEO-GANCHO-1Q-2026-10-03\n', '', 'U2')
}

console.log(`\n${falhas.length === 0 ? '✅' : '❌'} ${ok} verdes, ${falhas.length} vermelhas`)
if (falhas.length) { console.error('\nFalhas:'); for (const f of falhas) console.error('  · ' + f); process.exit(1) }
