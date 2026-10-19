// KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — guardião da receita "Faceless 15 s".
// Base: docs/FILMES-COMO-OS-LIDERES-FAZEM-2026-10-19.md (§3 receita, §4 fases). Executa a montagem REAL (lib/compose
// buildCreatomateSource pelo loader offline — sem rede, sem banco, sem fornecedor) num filme de 15 s do Seedance 1.5 e
// prova, fase a fase:
//   A  os arquivos: lib/compose.ts, lib/hookFirstFrame.ts e lib/lyriaMusic.ts são BYTE A BYTE a base (nada no motor);
//      a rota só tem acréscimos marcados (desfeitos = a base), na ordem certa (depois do builder, antes do 1º await);
//   B  o interruptor: fase só entra pública (FACELESS15_PUBLIC, hoje tudo false) ou pedida por CONTA INTERNA
//      (formatFlags); cliente que manda o campo é ignorado; fora do formato (outra duração/motor/quadro/avatar/Ads)
//      nada entra nem para conta interna;
//   C  F0: com o interruptor desligado o JSON do Creatomate é IDÊNTICO byte a byte ao de antes (clientes intocados);
//   D  F1 (legenda): 62 %, ≤5 palavras, 64/80 px, −120 ms, linha inteira amarela só no PAYOFF, karaokê mantido; o
//      resto do source não muda;
//   E  F2 (gancho escrito): no formato entra com a fase e sai sem ela (mesmo de conta interna); fora do formato nada muda;
//   F  F3 (som): música 18 % em dois volumes (10 % sob o payoff) + fade 1,2 s; riser/whoosh/pop nas trilhas certas e nos
//      volumes certos; voz intocada; arquivos SFX no public/ com o hash do catálogo (síntese própria, sem terceiros);
//   G  F4 (planos): 5 planos de 2,4–4,0 s, cortes em fronteira de frase quando cabe, 2º plano do clipe com trim 3,0 s,
//      nenhum plano além do clipe, punch 100→104 % em 0,15 s no reveal; CTA de texto só com 'cta';
//   M  mutantes: cada peça central desfeita em memória deixa a prova dela vermelha.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semFilmesF1F4_1910, MARCA_FILMES_F1F4_1910, ACRESCIMOS_FILMES_F1F4_1910 } from './test-support/desfaz-filmes-f1f4-1910.mjs'

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
const pct = (v) => Number(String(v).replace('%', ''))

// ── base = o pai do 1º commit da entrega (onde quer que a fila o tenha rebaseado); antes do commit, HEAD; senão origin/main
let BASE = null
{
  const git = (args) => execFileSync('git', args, { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  const cands = []
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA_FILMES_F1F4_1910}`, 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) cands.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  cands.push('HEAD', 'origin/main')
  for (const ref of cands) {
    try { if (!git(['show', `${ref}:app/api/compose/route.ts`]).includes(MARCA_FILMES_F1F4_1910)) { BASE = ref; break } } catch { /* próximo */ }
  }
}
const rdBase = (p) => { if (!BASE) return null; try { return lf(execFileSync('git', ['show', `${BASE}:${p}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()) } catch { return null } }
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)

// ═══ A · arquivos ═══════════════════════════════════════════════════════════════════════════════════════════════════
const ROTA = 'app/api/compose/route.ts'
const rota = rd(ROTA)
checa('A1 a base existe e não carrega a marca', Boolean(BASE) && !String(rdBase(ROTA) ?? MARCA_FILMES_F1F4_1910).includes(MARCA_FILMES_F1F4_1910))
for (const p of ['lib/compose.ts', 'lib/hookFirstFrame.ts', 'lib/lyriaMusic.ts']) {
  checa(`A2 ${p} é BYTE A BYTE a base (nada no motor de vídeo)`, rdBase(p) !== null && rd(p) === rdBase(p))
}
checa('A3 a rota, sem as linhas marcadas, é BYTE A BYTE a base (só acréscimos)', (() => { try { return semFilmesF1F4_1910(rota, ROTA) === rdBase(ROTA) } catch { return false } })())
checa('A4 contagem exata de acréscimos na rota', rota.split('\n').filter((l) => l.includes(MARCA_FILMES_F1F4_1910)).length === ACRESCIMOS_FILMES_F1F4_1910[ROTA])
{
  const iBuild = rota.indexOf('source = buildCreatomateSource({')
  const iRes = rota.indexOf('const faceless15 = resolverFaceless15({')
  const iApl = rota.indexOf('const faceless15Relato = aplicarFaceless15(source, faceless15, {')
  const iLogo = rota.indexOf('withBrandLogo(source, await findBrandLogoUrl(authenticatedUserId, composeAdmin))')
  const iAwait = rota.slice(iBuild, iLogo).lastIndexOf('await ')
  const iCatch = rota.indexOf('} catch (err) {', iBuild)
  checa('A5 ordem na rota: builder → resolver → aplicar (síncrono, sem await entre) → logo da marca', iBuild > 0 && iCatch > iBuild && iRes > iCatch && iApl > iRes && iLogo > iApl && (iAwait < 0 || iBuild + iAwait < iCatch))
  checa('A6 a conta interna vem do servidor (isInternalEmail(user.email)); quality/duração/quadro/avatar/Ads entram na decisão', rota.slice(iRes, iApl).includes('interna: isInternalEmail(user.email)') && ['quality, duration', 'aspect: aspectRequested', 'avatar: avatarMode', "studioAds: isServiceFinish && body.narration_source === 'tts'"].every((s) => rota.slice(iRes, iApl).includes(s)))
  checa('A7 o pedido é formatFlags (ou format_flags) do corpo; o Whisper da legenda e os segundos assinados dos clipes entram no contexto', rota.slice(iRes, iApl).includes('.formatFlags ??') && rota.slice(iApl, iLogo).includes('whisperWords: legendaWords ?? null') && rota.slice(iApl, iLogo).includes('signedClipPlan?.seconds ?? null'))
  const iHook = rota.indexOf('{ const g = withHookFirstFrame(source, {')
  const iG2 = rota.indexOf('const g2 = aplicarGanchoFaceless15(source, faceless15, { narration: scaledScript, font: captionFontFor(language) })')
  const iEv = rota.indexOf("if (faceless15.ativo) void writeServerEvent({ name: 'faceless15_fases'")
  const iCap = rota.indexOf('if (body.captions === false) {')
  checa('A8 F2 na rota: logo DEPOIS do gancho da conta interna (withHookFirstFrame) e antes do captions:false; o rastro (evento faceless15_fases) vem junto e não bloqueia', iHook > iLogo && iG2 > iHook && iEv > iG2 && iCap > iEv && rota.slice(iEv, iCap).includes('relato: faceless15Relato'))
}

// ═══ cenário: 15 s do Seedance 1.5, 36 palavras em 4 frases (HOOK · MR1 · MR2 · PAYOFF) a 2,56 pal/s ═══════════════
const FRASES = [
  'Nobody expected this quiet village to vanish by dawn',
  'In 1912 every single house stood empty and silent',
  'The river had moved three miles in one night',
  'Scientists later found the old riverbed beneath the church',
]
const NARRACAO = FRASES.join('. ') + '.'
const WORDS = []
{
  let t = 0
  FRASES.forEach((f, fi) => {
    const ws = f.split(' ')
    ws.forEach((w, wi) => {
      const ultima = wi === ws.length - 1
      WORDS.push({ word: w, start: r3(t), end: r3(t + 0.34), sentenceEnd: ultima })
      t = r3(t + 0.34 + (ultima && fi < FRASES.length - 1 ? 0.3 : 0.05))
    })
  })
}
const FALA = r3(WORDS[WORDS.length - 1].end)
const INICIOS = FRASES.slice(1).map((_, i) => WORDS[FRASES.slice(0, i + 1).reduce((n, f) => n + f.split(' ').length, 0)].start)
const CLIPES = ['https://cdn.test/seedance-a.mp4', 'https://cdn.test/seedance-b.mp4', 'https://cdn.test/seedance-c.mp4']
const MUSICA = 'https://v3.fal.media/lyria/trilha.mp3'
const NARR_WORDS = NARRACAO.split(/\s+/)
const WORD_STARTS = [0, 9, 27]

function carregar(mutante = null) {
  const load = createOfflineLoader({ source: (p, s) => (mutante && p === mutante.arquivo ? mutante.troca(s) : s) })
  const C = load('@/lib/compose')
  const F = load('@/lib/filmes/faceless15')
  const H = load('@/lib/hookFirstFrame')
  const montar = ({ assinado = true, musica = true, whisper = true, watermark = false } = {}) => {
    C.setActiveCaptionFont('en')
    return C.buildCreatomateSource({
      clipUrls: CLIPES,
      voiceoverUrl: 'https://cdn.test/vo.mp3',
      voiceoverScript: NARRACAO,
      sceneCaptions: FRASES,
      duration: 15,
      quality: 'cinematic_ai',
      realAudioDuration: FALA,
      whisperWords: whisper ? clone(WORDS) : undefined,
      musicUrl: musica ? MUSICA : null,
      watermark,
      aspect: '9:16',
      clipSeconds: assinado ? [6, 6, 6] : null,
      clipSpeech: assinado ? { narrationWords: NARR_WORDS, wordStarts: WORD_STARTS } : null,
    })
  }
  return { C, F, H, montar }
}
const interna = (F, pedido, extra = {}) => F.resolverFaceless15({ interna: true, pedido, quality: 'cinematic_ai', duration: 15, aspect: '9:16', avatar: false, studioAds: false, ...extra })
const externa = (F, pedido, extra = {}) => F.resolverFaceless15({ interna: false, pedido, quality: 'cinematic_ai', duration: 15, aspect: '9:16', avatar: false, studioAds: false, ...extra })
const trilha = (src, n, tipo = null) => src.elements.filter((e) => Number(e.track) === n && (tipo == null || e.type === tipo))
const foraDaTrilha = (src, ns) => src.elements.filter((e) => !ns.includes(Number(e.track)))
const palavrasDoTexto = (t) => String(t ?? '').replace(/\[\/?color[^\]]*\]/g, '').trim().split(/\s+/).filter(Boolean).length

/** Todas as provas, para um conjunto de módulos; devolve { nome: boolean }. Os mutantes reutilizam. */
function provas({ C, F, H, montar }) {
  const p = {}
  // ── B · interruptor
  {
    const ext = externa(F, ['f1', 'f2', 'f3', 'f4'])
    p['B1 cliente que manda formatFlags: nada entra (fases vazias, ativo=false, motivo conta_externa)'] = ext.ativo === false && ext.fases.length === 0 && ext.ignoradas.some((i) => i.endsWith(':conta_externa'))
    const i1 = interna(F, ['f1'])
    const i2 = interna(F, ['F2', ' f1 ', 'xyz', 'f1'])
    const i3 = interna(F, 'f3, f4')
    p['B2 conta interna liga fase a fase pelo pedido (lista ou texto; maiúscula/espaço/repetido normalizados; desconhecida ignorada)'] =
      i1.ativo && eqJ(i1.fases, ['f1']) && i2.ativo && eqJ(i2.fases, ['f1', 'f2']) && i2.ignoradas.some((i) => i.startsWith('xyz:')) && i3.ativo && eqJ(i3.fases, ['f3', 'f4'])
    const fora = [
      interna(F, ['f1'], { duration: 35 }), interna(F, ['f1'], { quality: 'fast' }), interna(F, ['f1'], { quality: 'cinematic_kling' }),
      interna(F, ['f1'], { aspect: '16:9' }), interna(F, ['f1'], { avatar: true }), interna(F, ['f1'], { studioAds: true }),
    ]
    p['B3 fora do formato (35 s, Kineo 1, Kling 2.5, 16:9, avatar, Studio Ads) nada entra nem para conta interna'] = fora.every((d) => d.formato === false && d.ativo === false && d.fases.length === 0)
    p['B4 sem quadro no pedido = 9:16 (o padrão de sempre)'] = interna(F, ['f1'], { aspect: undefined }).ativo === true && interna(F, ['f1'], { aspect: '' }).ativo === true
    p['B5 cta exige f4: sozinho é ignorado; com f4 entra'] = !interna(F, ['cta']).fases.includes('cta') && interna(F, ['cta']).ignoradas.includes('cta:exige_f4') && eqJ(interna(F, ['cta', 'f4']).fases, ['f4', 'cta'])
    p['B6 hoje nenhuma fase é pública (FACELESS15_PUBLIC tudo false) e sem pedido nada entra'] = Object.values(F.FACELESS15_PUBLIC).every((v) => v === false) && interna(F, []).ativo === false && externa(F, undefined).ativo === false
  }
  // ── C · F0: desligado = byte a byte
  for (const assinado of [true, false]) {
    const antes = montar({ assinado })
    const foto = JSON.stringify(antes)
    const r1 = F.aplicarFaceless15(antes, externa(F, ['f1', 'f2', 'f3', 'f4']), { whisperWords: WORDS, clipSeconds: [6, 6, 6] })
    const r2 = F.aplicarFaceless15(antes, interna(F, []), { whisperWords: WORDS })
    const r3x = F.aplicarFaceless15(antes, interna(F, ['f1', 'f3', 'f4'], { duration: 35 }), { whisperWords: WORDS })
    p[`C1 ${assinado ? 'claim assinado (3×6 s)' : 'caminho clássico'}: interruptor desligado = JSON do Creatomate IDÊNTICO byte a byte (cliente, interna sem pedido, fora do formato)`] =
      JSON.stringify(antes) === foto && r1.ativo === false && r2.ativo === false && r3x.ativo === false
  }
  // ── D · F1
  {
    const antes = montar()
    const ref = clone(antes)
    const relato = F.aplicarFaceless15(antes, interna(F, ['f1']), { whisperWords: WORDS, clipSeconds: [6, 6, 6] })
    const legs = trilha(antes, 5, 'text')
    const caps = C.buildCaptionsFromWhisperWords(clone(WORDS), FALA, 0, 5)
    const payoff = INICIOS[INICIOS.length - 1]
    const primeiraFraseAcaba = Math.min(6, Math.max(2, WORDS.find((w) => w.sentenceEnd).end))
    p['D1 F1 só mexe na trilha 5: todas as outras trilhas ficam byte a byte'] = relato.ativo && eqJ(foraDaTrilha(antes, [5]), foraDaTrilha(ref, [5])) && relato.f1?.chunker === 'whisper'
    p['D2 legenda a 62 % (borda inferior, âncora 100 %), caixa de 78 %, Montserrat 800 caixa alta, pílula de sempre'] = legs.length > 0 && legs.every((e) => e.y === '62%' && e.y_anchor === '100%' && e.width === '78%' && e.font_family === 'Montserrat' && e.font_weight === '800' && e.background_color === 'rgba(0,0,0,0.60)' && String(e.text).replace(/\[\/?color[^\]]*\]/g, '') === String(e.text).replace(/\[\/?color[^\]]*\]/g, '').toUpperCase())
    p['D3 no máximo 5 palavras por chunk (a base corta em 4) e pelo menos um chunk com 5'] = caps.every((c) => c.words.length <= 5) && caps.some((c) => c.words.length === 5) && legs.every((e) => palavrasDoTexto(e.text) <= 5) && legs.some((e) => palavrasDoTexto(e.text) === 5)
    p['D4 fonte 80 no gancho (1ª frase) e 64 no corpo'] = legs.filter((e) => e.time < primeiraFraseAcaba - 0.12 - 1e-6).every((e) => e.font_size === 80) && legs.filter((e) => e.time >= primeiraFraseAcaba).every((e) => e.font_size === 64) && legs.some((e) => e.font_size === 80) && legs.some((e) => e.font_size === 64)
    const comecos = caps.map((c) => Math.max(0, r3(c.words[0].start - 0.12)))
    const primeiros = legs.filter((e, i) => i === 0 || legs[i - 1].time + legs[i - 1].duration <= e.time + 1e-6).map((e) => e.time)
    p['D5 antecipação de −120 ms: cada chunk entra 0,12 s antes da sua 1ª PALAVRA (a base entra 150 ms depois dela; o 1º fica em 0) e o último termina no fim da fala'] =
      comecos.every((t) => legs.some((e) => Math.abs(e.time - t) < 1e-6)) && legs[0].time === 0 && Math.abs(legs[legs.length - 1].time + legs[legs.length - 1].duration - r3(Math.min(FALA, antes.duration))) < 0.011 && primeiros.length >= caps.length - 1
    p['D6 karaokê mantido (palavra corrente em [color #FFD700]), linha branca fora do payoff'] = legs.filter((e) => e.time < payoff - 0.12 - 1e-6).every((e) => e.fill_color === '#ffffff') && legs.some((e) => String(e.text).includes('[color #FFD700]'))
    p['D7 linha INTEIRA amarela só no PAYOFF (a última frase), do 1º ao último chunk dele'] = legs.filter((e) => e.time >= payoff - 0.12 - 1e-6).every((e) => e.fill_color === '#FFD700') && legs.some((e) => e.fill_color === '#FFD700') && relato.f1?.amarelos === legs.filter((e) => e.fill_color === '#FFD700').length && relato.f1?.payoffEm === payoff
    p['D8 nenhum elemento de legenda se sobrepõe a outro (um por vez na trilha 5)'] = legs.every((e, i) => i === 0 || legs[i - 1].time + legs[i - 1].duration <= e.time + 1e-6)
    // sem Whisper: o fallback proporcional também veste posição/tamanho/cor
    const semW = montar({ whisper: false })
    const rW = F.aplicarFaceless15(semW, interna(F, ['f1']), { whisperWords: null })
    const legsW = trilha(semW, 5, 'text')
    p['D9 sem Whisper (fallback proporcional): posição, tamanho e antecipação valem; os chunks não mudam de contagem'] = rW.f1?.chunker === 'proporcional' && legsW.length === rW.f1.chunks && legsW.every((e) => e.y === '62%' && [64, 80].includes(e.font_size)) && legsW[0].time === 0
    // falha numa fase nunca derruba o filme
    const quebrado = montar()
    const rq = F.aplicarFaceless15(quebrado, interna(F, ['f1']), { whisperWords: [{ word: 'x' }] })
    p['D10 falha numa fase = a fase não entra e o filme sai (voz e clipes intactos)'] = rq.ativo === true && trilha(quebrado, 4).length === 1 && trilha(quebrado, 2).length === trilha(ref, 2).length
  }
  // ── E · F2 (gancho escrito no 1º quadro)
  {
    const T = H.GANCHO_1Q_TRACK
    const s1 = montar()
    H.withHookFirstFrame(s1, { interna: true, narration: NARRACAO, font: 'Montserrat' })
    const n1 = trilha(s1, T, 'text').length
    const r1 = F.aplicarGanchoFaceless15(s1, interna(F, ['f1']), { narration: NARRACAO, font: 'Montserrat' })
    p['E1 formato + f2 desligada: o gancho que a rota já deu à conta interna SAI (uma variável por vez)'] = n1 === 1 && r1.motivo === 'removido_f2_desligada' && trilha(s1, T).length === 0
    const s2 = montar()
    const r2 = F.aplicarGanchoFaceless15(s2, interna(F, ['f2']), { narration: NARRACAO, font: 'Montserrat' })
    const g2 = trilha(s2, T, 'text')
    p["E2 formato + f2 ligada: o gancho entra (≤8 palavras, no topo, 0–2,5 s, trilha 11), medido contra legenda/marca d'água como sempre"] = r2.aplicado === true && r2.motivo === 'ok' && g2.length === 1 && g2[0].time === 0 && g2[0].duration === 2.5 && palavrasDoTexto(g2[0].text) <= 8 && pct(g2[0].y) < 25 && g2[0].y_anchor === '0%'
    const r2b = F.aplicarGanchoFaceless15(s2, interna(F, ['f2']), { narration: NARRACAO, font: 'Montserrat' })
    p['E3 gancho já na tela: não duplica'] = r2b.motivo === 'ja_aplicado' && trilha(s2, T).length === 1
    const s3 = montar()
    F.aplicarFaceless15(s3, interna(F, ['f1', 'f2']), { whisperWords: WORDS })
    const r3b = F.aplicarGanchoFaceless15(s3, interna(F, ['f1', 'f2']), { narration: NARRACAO, font: 'Montserrat' })
    p['E4 com a legenda da F1 (62 %) o gancho ainda cabe acima dela (sem colisão)'] = r3b.aplicado === true && r3b.motivo === 'ok'
    const s4 = montar()
    H.withHookFirstFrame(s4, { interna: true, narration: NARRACAO })
    const foto4 = JSON.stringify(s4)
    const r4 = F.aplicarGanchoFaceless15(s4, interna(F, ['f2'], { duration: 35 }), { narration: NARRACAO })
    p['E5 fora do formato: o source não muda (o gancho da conta interna fica como desde 03/10)'] = r4.motivo === 'formato_inativo' && JSON.stringify(s4) === foto4
    const s5 = montar()
    const r5 = F.aplicarGanchoFaceless15(s5, externa(F, ['f2']), { narration: NARRACAO })
    p['E6 cliente pedindo f2: nada entra; GANCHO_1Q_PUBLIC de lib/hookFirstFrame segue false'] = r5.motivo === 'formato_inativo' && trilha(s5, T).length === 0 && H.GANCHO_1Q_PUBLIC === false
  }
  return p
}

// ═══ pristina ═══════════════════════════════════════════════════════════════════════════════════════════════════════
const P = provas(carregar())
for (const [n, v] of Object.entries(P)) checa(n, v === true)

// ═══ M · mutantes (cada um deixa vermelha a prova que protege) ══════════════════════════════════════════════════════
const F15 = 'lib/filmes/faceless15.ts'
const mut = (nome, arquivo, de, para, provasQueCaem) => {
  const fonte = rd(arquivo)
  if (!fonte.includes(de)) { checa(`M ${nome}: a âncora do mutante existe`, false); return }
  let caiu
  try { caiu = provas(carregar({ arquivo, troca: (s) => s.split(de).join(para) })) } catch (e) { caiu = { erro: e.message } }
  const vermelhas = Object.entries(caiu).filter(([, v]) => v !== true).map(([k]) => k)
  checa(`M ${nome} → fica vermelho: ${provasQueCaem.join(' · ')}`, provasQueCaem.every((pq) => vermelhas.some((v) => v.startsWith(pq))))
}
mut('f1 pública (FACELESS15_PUBLIC.f1 = true)', F15, 'f1: false, f2: false', 'f1: true, f2: false', ['C1 claim', 'C1 caminho', 'B6'])
mut('legenda de volta aos 78 %', F15, "export const FACELESS15_LEGENDA_Y = '62%'", "export const FACELESS15_LEGENDA_Y = '78%'", ['D2'])
mut('4 palavras por chunk (a base)', F15, 'export const FACELESS15_LEGENDA_PALAVRAS = 5', 'export const FACELESS15_LEGENDA_PALAVRAS = 4', ['D3'])
mut('sem antecipação', F15, 'export const FACELESS15_LEGENDA_ANTECIPACAO_S = 0.12', 'export const FACELESS15_LEGENDA_ANTECIPACAO_S = 0', ['D5'])
mut('payoff sem amarelo', F15, "fill_color: amarelo ? FACELESS15_AMARELO : '#ffffff'", "fill_color: '#ffffff'", ['D7'])
mut('conta externa aceita o pedido', F15, 'if (input.interna === true) pedidas.push(...pedidasBrutas)', 'pedidas.push(...pedidasBrutas)', ['B1', 'C1 claim'])
mut('formato ignora a duração', F15, 'if (Number(input.duration) !== FACELESS15_DURATION) foraDoFormato.push', 'if (false) foraDoFormato.push', ['B3'])
mut('f2: gancho entra mesmo com a fase desligada', F15, "if (decisao.fases.includes('f2')) {", 'if (true) {', ['E1'])
mut('f2: gancho da conta interna não sai com a fase desligada', F15, '.filter((e) => !ehTexto(e, GANCHO_1Q_TRACK))', '.filter(() => true)', ['E1'])

console.log(`\n${falhas.length === 0 ? '✅' : '❌'} ${ok} verdes, ${falhas.length} vermelhas`)
if (falhas.length) { console.error('\nFalhas:'); for (const f of falhas) console.error('  · ' + f); process.exit(1) }
