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
import { semCloseRealAjuste1910 } from './test-support/desfaz-close-real-ajuste-1910.mjs' // KINEO-CLOSE-REAL-AJUSTE-1910 — reancorado: o ajuste pós-canário do Close real (mesclado depois) sai primeiro, em memória
import { semFilmesF1Virgula1910 } from './test-support/desfaz-filmes-f1-virgula-1910.mjs' // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a camada mais nova (Faceless 15 s no export limpo) sai primeiro
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semFilmesF1F4_1910, MARCA_FILMES_F1F4_1910, ACRESCIMOS_FILMES_F1F4_1910, TROCAS_FILMES_F1F4_1910 } from './test-support/desfaz-filmes-f1f4-1910.mjs'
import { sintetizarSfxFaceless15, sha256, SFX_FACELESS15_ARQUIVOS } from './gerar-sfx-faceless15-1910.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(semCloseRealAjuste1910(semFilmesF1Virgula1910(readFileSync(join(RAIZ, p), 'utf8'), p), p)) // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: lê o texto SEM o Faceless 15 s no export limpo (a mais nova) e SEM o ajuste do Close real
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
  // os guardiões reancorados: cada troca da tabela existe no arquivo vivo, e o arquivo desfeito é EXATAMENTE a base
  // A referência de cada guardião reancorado é a ÚLTIMA versão dele deixada por outra sessão (o último commit que o tocou sem a
  // minha marca): o merge de 19/10 (liberação do apresentador v2) reancorou test-filme-rapido-1710 na mesma linha que eu e criou
  // um guardião novo que também precisou do meu desfaz; a regra "pai do 1º commit" não enxergaria nenhum dos dois.
  const rdAlheio = (p) => { try { const sha = execFileSync('git', ['log', '-1', '--format=%H', '--invert-grep', `--grep=${MARCA_FILMES_F1F4_1910}`, '--grep=KINEO-CLOSE-REAL-AJUSTE-1910', '--grep=KINEO-FILMES-F1-VIRGULA-1910', '--', p], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); return sha ? lf(execFileSync('git', ['show', `${sha}:${p}`], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()) : null } catch { return null } } // KINEO-CLOSE-REAL-AJUSTE-1910 — reancorado: a versão 'alheia' pula também os commits do ajuste do Close real // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: pula também os commits do export limpo
  const ruins = []
  for (const [p, trocas] of Object.entries(TROCAS_FILMES_F1F4_1910)) {
    const vivo = rd(p)
    const base = rdAlheio(p)
    const linhas = vivo.split('\n')
    if (base === null || !trocas.every(([nova, antiga]) => linhas.includes(nova) && base.split('\n').includes(antiga) && nova.includes(MARCA_FILMES_F1F4_1910) && !antiga.includes(MARCA_FILMES_F1F4_1910))) { ruins.push(p); continue }
    try { if (semFilmesF1F4_1910(vivo, p) !== base) ruins.push(p) } catch { ruins.push(p) }
  }
  checa(`A4b ${Object.keys(TROCAS_FILMES_F1F4_1910).length} guardiões reancorados: cada troca da tabela está no arquivo vivo e na base; desfeitos (trocas + import marcado) = base byte a byte`, Object.keys(TROCAS_FILMES_F1F4_1910).length >= 9 && ruins.length === 0)
  checa('A4c o desfaz é idempotente e nunca toca linha sem a marca', semFilmesF1F4_1910('a\nb', 'x') === 'a\nb' && semFilmesF1F4_1910(`a\nb // ${MARCA_FILMES_F1F4_1910}\nc`, 'x') === 'a\nc')
}
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
  const CAT = F.SFX_FACELESS15
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
  // ── F · F3 (som)
  {
    const antes = montar()
    const ref = clone(antes)
    const relato = F.aplicarFaceless15(antes, interna(F, ['f3']), { whisperWords: WORDS, clipSeconds: [6, 6, 6] })
    const T = antes.duration
    const payoff = r3(INICIOS[INICIOS.length - 1])
    const mus = trilha(antes, 8, 'audio')
    const sfx = trilha(antes, 12, 'audio')
    p['F1 F3 só mexe nas trilhas 8 (música) e 12 (SFX): voz (4), clipes (2), legenda (5) e o resto ficam byte a byte'] = relato.f3?.musica === 'unica' && eqJ(foraDaTrilha(antes, [8, 12]), foraDaTrilha(ref, [8, 12])) && eqJ(trilha(antes, 4), trilha(ref, 4)) // KINEO-FILMES-F1F3-AJUSTE-1910
    p['F2 música num elemento SÓ (o ducking em 3 caiu ~20 dB sob o payoff na escada de 19/10): 14 % fixos do 0 ao fim do filme, fades 0,8/1,2 s de sempre, loop, mesma faixa, sem trim_start'] = // KINEO-FILMES-F1F3-AJUSTE-1910
      mus.length === 1 && mus[0].time === 0 && mus[0].volume === '14%' && r3(mus[0].duration) === r3(T) && mus[0].audio_fade_in === 0.8 && // KINEO-FILMES-F1F3-AJUSTE-1910
      mus[0].audio_fade_out === 1.2 && !('trim_start' in mus[0]) && eqJ(relato.f3.cobre, [0, T]) && relato.f3.volume === '14%' && // KINEO-FILMES-F1F3-AJUSTE-1910
      trilha(antes, 8).length === 1 && trilha(ref, 8).length === 1 && // KINEO-FILMES-F1F3-AJUSTE-1910
      mus.every((m) => m.loop === true && m.source === MUSICA && m.track === 8) && !('duck' in relato.f3) // KINEO-FILMES-F1F3-AJUSTE-1910
    p['F3 sem junção: nenhum pedaço de música, nenhum fade curto de 0,3 s, a cauda (depois do fim da fala) coberta pela mesma música'] = mus.every((m) => m.audio_fade_in !== 0.3 && m.audio_fade_out !== 0.3) && mus.some((m) => m.time <= FALA && r3(m.time + m.duration) >= r3(T)) // KINEO-FILMES-F1F3-AJUSTE-1910
    const cortes = trilha(ref, 2, 'video').map((e) => e.time).filter((t) => t > 0)
    const ris = sfx.filter((e) => e.source === CAT.riser.url)
    const who = sfx.filter((e) => e.source === CAT.whoosh.url)
    const pop = sfx.filter((e) => e.source === CAT.pop.url)
    p['F4 riser 0–1,2 s a −14 dB (20 %); whoosh de 0,25 s a −12 dB (25 %) em cada corte (0,1 s antes dele); pop a −10 dB (30 %) no reveal — trilha 12, URL estável do site'] =
      cortes.length >= 2 && ris.length === 1 && ris[0].time === 0 && ris[0].duration === 1.2 && ris[0].volume === '20%' &&
      who.length === cortes.length && cortes.every((t) => who.some((w) => w.time === r3(t - 0.1) && w.duration === 0.25 && w.volume === '25%')) &&
      pop.length === 1 && pop[0].time === payoff && pop[0].duration === 0.3 && pop[0].volume === '30%' &&
      sfx.every((e) => e.track === 12 && String(e.source).startsWith('https://www.usekineo.com/sfx/')) && eqJ(relato.f3.sfx, { riser: true, whoosh: cortes.length, pop: true })
    const semMus = montar({ musica: false })
    const rSem = F.aplicarFaceless15(semMus, interna(F, ['f3']), { whisperWords: WORDS })
    p['F5 sem trilha (Lyria e catálogo falharam): nada de música inventada, SFX entram, voz intacta — nunca sai sem som'] = rSem.f3?.musica === 'sem_trilha' && trilha(semMus, 8).length === 0 && trilha(semMus, 12).length >= 3 && eqJ(trilha(semMus, 4), trilha(ref, 4))
    const semW = montar({ whisper: false })
    const rW = F.aplicarFaceless15(semW, interna(F, ['f3']), { whisperWords: null })
    const musW = trilha(semW, 8, 'audio')
    p['F6 sem Whisper (sem payoff): música a 14 % num elemento só com os fades de sempre; sem pop; whoosh nos cortes'] = rW.f3?.musica === 'unica' && musW.length === 1 && musW[0].volume === '14%' && musW[0].audio_fade_in === 0.8 && musW[0].audio_fade_out === 1.2 && musW[0].duration === semW.duration && !trilha(semW, 12).some((e) => e.source === CAT.pop.url) && rW.f3.sfx.pop === false && rW.f3.sfx.whoosh >= 2 // KINEO-FILMES-F1F3-AJUSTE-1910
    const vazio = montar()
    const cat = clone(CAT)
    for (const k of Object.keys(cat)) cat[k].url = null
    const rV = F.aplicarFaceless15(vazio, interna(F, ['f3']), { whisperWords: WORDS, sfx: cat })
    p['F7 catálogo sem URL = slot vazio: nenhum SFX entra, a música da receita entra, o relato diz slot_vazio'] = rV.f3?.sfx === 'slot_vazio' && trilha(vazio, 12).length === 0 && trilha(vazio, 8).length === 1 // KINEO-FILMES-F1F3-AJUSTE-1910
    const f13 = montar()
    const r13 = F.aplicarFaceless15(f13, interna(F, ['f1', 'f3']), { whisperWords: WORDS })
    p['F8 F1+F3 juntas: legenda da F1 e som da F3, cada uma na sua trilha'] = r13.f1?.chunker === 'whisper' && r13.f3?.musica === 'unica' && trilha(f13, 5).every((e) => e.y === '62%') && trilha(f13, 8).length === 1 && trilha(f13, 12).length >= 4 // KINEO-FILMES-F1F3-AJUSTE-1910
  }
  // ── G · F4 (5 planos de 3 clipes)
  const ZOOM = (de, para) => [{ type: 'scale', fade: false, start_scale: de, end_scale: para, easing: 'ease-out' }]
  for (const assinado of [true, false]) {
    const tag = assinado ? 'claim assinado (3×6 s)' : 'caminho clássico (loop, sem segundos)'
    const antes = montar({ assinado })
    const ref = clone(antes)
    const relato = F.aplicarFaceless15(antes, interna(F, ['f4']), { whisperWords: WORDS, clipSeconds: assinado ? [6, 6, 6] : null })
    const T = ref.duration
    const payoff = r3(INICIOS[INICIOS.length - 1])
    const pl = trilha(antes, 2, 'video')
    const f4 = relato.f4
    p[`G1 ${tag}: F4 só mexe na trilha 2; voz, legenda, música e o resto ficam byte a byte; o total não muda`] = f4?.aplicado === true && eqJ(foraDaTrilha(antes, [2]), foraDaTrilha(ref, [2])) && antes.duration === T && trilha(ref, 2).length >= 3 && new Set(trilha(ref, 2).map((e) => e.source)).size === 3
    p[`G2 ${tag}: 5 planos de 2,4–4,0 s (3 clipes → 5), contíguos do 0 ao fim do filme (sobreposição de 0,06 s do #256)`] = f4.planos === 5 && f4.trechos.length === 5 && f4.trechos.every(([, , len]) => len >= 2.4 - 1e-9 && len <= 4.0 + 1e-9) && r3(f4.trechos.reduce((s, [, , l]) => s + l, 0)) === r3(T) && pl[0].time === 0 && pl.every((e, i) => i === 0 || r3(pl[i - 1].time + pl[i - 1].duration - 0.06) === e.time) && r3(pl[pl.length - 1].time + pl[pl.length - 1].duration - 0.06) === r3(T)
    p[`G3 ${tag}: ordem A A B B C — o 2º plano de um clipe é o MESMO clipe com trim_start 3,0 s; o 1º plano de cada clipe entra na cabeça (0,1 s)`] = eqJ(f4.trechos.map(([c]) => c), [0, 0, 1, 1, 2]) && eqJ(f4.trechos.map(([, trim]) => trim), [0.1, 3, 0.1, 3, 0.1]) && pl.filter((e) => e.source === CLIPES[0]).length >= 2 && pl.filter((e) => e.source === CLIPES[1]).length >= 2 && pl.filter((e) => e.source === CLIPES[2]).length >= 1
    p[`G4 ${tag}: nenhum plano passa do clipe (trim + duração + 0,06 ≤ 6 s), sem loop por falta; ${assinado ? 'loop desligado (segundos assinados)' : 'loop como na base'}`] = f4.trechos.every(([, trim, len]) => trim + len + 0.06 <= 6 + 1e-9) && f4.loopPorFalta === 0 && (assinado ? pl.every((e) => e.loop === false) : pl.every((e) => e.loop === true))
    p[`G5 ${tag}: o reveal (início do PAYOFF) é um corte e o 1º corte cai no fim do HOOK (fronteiras de frase do Whisper)`] = f4.cortes.includes(payoff) && f4.cortes[0] === r3(INICIOS[0]) && f4.emFrase >= 2 && f4.punchEm === payoff && f4.cortes.length === 4
    const cab = pl.find((e) => e.time === payoff)
    const resto = pl.find((e) => e.time === r3(payoff + 0.15))
    p[`G6 ${tag}: punch 100→104 % em 0,15 s no reveal, seguido do zoom 104→108 % no mesmo clipe (trecho contínuo), ease-out`] = !!cab && !!resto && cab.duration === r3(0.15 + 0.06) && eqJ(cab.animations, ZOOM('100%', '104%')) && eqJ(resto.animations, ZOOM('104%', '108%')) && resto.trim_start === r3(cab.trim_start + 0.15) && resto.source === cab.source && pl.length === 6
    const comuns = pl.filter((e) => e.time !== payoff && e.time !== r3(payoff + 0.15))
    p[`G7 ${tag}: zoom alternado 100→108 / 108→100 nos outros planos; cover 100 %, centro, mudo em todos`] = pl.every((e) => e.fit === 'cover' && e.width === '100%' && e.height === '100%' && e.volume === '0%' && e.x === '50%' && e.y === '50%' && e.track === 2) && comuns.length === 4 && comuns.every((e, i) => eqJ(e.animations, i % 2 === 0 ? ZOOM('100%', '108%') : ZOOM('108%', '100%')))
    const f34 = montar({ assinado })
    const r34 = F.aplicarFaceless15(f34, interna(F, ['f3', 'f4']), { whisperWords: WORDS, clipSeconds: assinado ? [6, 6, 6] : null })
    p[`G8 ${tag}: F3+F4 — um whoosh por corte da F4 (4), no instante do corte; o pop cai no corte do punch`] = r34.f4.cortes.length === 4 && eqJ(r34.f3.cortes, r34.f4.cortes) && trilha(f34, 12).filter((e) => e.source === CAT.whoosh.url).length === 4 && trilha(f34, 12).find((e) => e.source === CAT.pop.url)?.time === r34.f4.punchEm
  }
  {
    const s = montar()
    const ref = clone(s)
    const T = ref.duration
    const r = F.aplicarFaceless15(s, interna(F, ['f4', 'cta']), { whisperWords: WORDS, clipSeconds: [6, 6, 6], font: 'Montserrat' })
    const cta = trilha(s, 13, 'text')
    p['G9 CTA só com a fase cta: "Follow for part 2 →" 48 px Montserrat 700 no centro, 1 s depois do fim da fala; o filme cresce 1 s; fundo/véu cobrem o total novo; a voz não muda'] =
      r.f4?.cta === true && s.duration === r3(T + 1) && cta.length === 1 && cta[0].time === r3(T) && cta[0].duration === 1 && cta[0].text === 'Follow for part 2 →' && cta[0].font_size === 48 && cta[0].font_weight === '700' && cta[0].font_family === 'Montserrat' && cta[0].y === '50%' &&
      s.elements.filter((e) => e.type === 'shape' && e.time === 0).every((e) => e.duration === r3(T + 1)) && eqJ(trilha(s, 4), trilha(ref, 4)) && r3(r.f4.trechos.reduce((a, [, , l]) => a + l, 0)) === r3(T + 1)
    const s2 = montar()
    const r2 = F.aplicarFaceless15(s2, interna(F, ['f4']), { whisperWords: WORDS, clipSeconds: [6, 6, 6] })
    p['G10 sem a fase cta: nenhum cartão, o filme termina no payoff (sem "outro", como o mercado manda)'] = trilha(s2, 13).length === 0 && s2.duration === T && r2.f4?.cta === false
    const s4 = montar()
    const r4 = F.aplicarFaceless15(s4, interna(F, ['f1', 'f2', 'f3', 'f4']), { whisperWords: WORDS, clipSeconds: [6, 6, 6] })
    const g4 = F.aplicarGanchoFaceless15(s4, interna(F, ['f1', 'f2', 'f3', 'f4']), { narration: NARRACAO, font: 'Montserrat' })
    p['G11 as quatro juntas: legenda 62 %, gancho no topo, música num elemento só + SFX, 5 planos — e a voz byte a byte, sem erro'] = !!r4.f1 && r4.f3?.musica === 'unica' && r4.f4?.planos === 5 && g4.aplicado === true && trilha(s4, 5).every((e) => e.y === '62%') && trilha(s4, 8).length === 1 && trilha(s4, 11).length === 1 && trilha(s4, 2).length === 6 && eqJ(trilha(s4, 4), trilha(ref, 4)) && !r4.erros // KINEO-FILMES-F1F3-AJUSTE-1910
    const s5 = montar({ whisper: false })
    const r5 = F.aplicarFaceless15(s5, interna(F, ['f4']), { whisperWords: null, clipSeconds: [6, 6, 6] })
    p['G12 sem Whisper: planos pelo relógio (2,4–4,0 s), sem punch (não há reveal medido), nada quebra'] = r5.f4?.aplicado === true && r5.f4.planos >= 4 && r5.f4.punchEm === null && r5.f4.trechos.every(([, , l]) => l >= 2.4 - 1e-9 && l <= 4 + 1e-9)
    const s6 = montar()
    const r6 = F.aplicarFaceless15(s6, interna(F, ['f4']), { whisperWords: WORDS, clipSeconds: [5, 5, 5] })
    p['G13 clipes curtos (5 s assinados): o 2º plano recua o trim para caber (trim + duração + 0,06 ≤ 5), sem loop por falta, sem quadro preto'] = r6.f4?.aplicado === true && r6.f4.trechos.every(([, trim, len]) => trim + len + 0.06 <= 5 + 1e-9 && trim >= 0.1) && r6.f4.loopPorFalta === 0 && r6.f4.trechos.some(([, trim]) => trim > 0.1 && trim < 3)
    const s7 = montar()
    const r7 = F.aplicarFaceless15(s7, interna(F, ['f4']), { whisperWords: WORDS, clipSeconds: [2.5, 2.5, 2.5] })
    p['G14 clipe menor que o plano (2,5 s assinados): loop por falta em vez de quadro preto, e o relato conta'] = r7.f4?.aplicado === true && r7.f4.loopPorFalta > 0 && trilha(s7, 2).some((e) => e.loop === true) && trilha(s7, 2).filter((e) => e.loop === true).length >= r7.f4.loopPorFalta
  }
  return p
}

// ═══ pristina ═══════════════════════════════════════════════════════════════════════════════════════════════════════
const P = provas(carregar())
for (const [n, v] of Object.entries(P)) checa(n, v === true)

// ═══ F0 · os arquivos SFX: síntese própria, determinística, hash do catálogo = disco = regenerado ═══════════════════
{
  const F0 = carregar().F
  const sons = sintetizarSfxFaceless15()
  for (const k of ['riser', 'whoosh', 'pop']) {
    const cat = F0.SFX_FACELESS15[k]
    const caminho = join(RAIZ, 'public', 'sfx', cat.arquivo)
    const disco = existsSync(caminho) ? readFileSync(caminho) : null
    checa(`F0 ${k}: public/sfx/${cat.arquivo} com o hash do catálogo, regenerado em memória byte a byte igual (síntese própria, sem terceiro), URL estável, WAV 44,1 kHz mono 16 bits de ${cat.segundos} s`,
      !!disco && sha256(disco) === cat.sha256 && sha256(sons[k]) === cat.sha256 && cat.url === 'https://www.usekineo.com/sfx/' + cat.arquivo && cat.arquivo === SFX_FACELESS15_ARQUIVOS[k] &&
      disco.toString('latin1', 0, 4) === 'RIFF' && disco.readUInt32LE(24) === 44100 && disco.readUInt16LE(22) === 1 && disco.readUInt16LE(34) === 16 && Math.abs(disco.readUInt32LE(40) / 88200 - cat.segundos) < 0.001 && cat.licenca.includes('síntese própria'))
  }
  checa('F0 volumes do catálogo = −14/−12/−10 dB (20/25/30 % de amplitude)', F0.SFX_FACELESS15.riser.volume === '20%' && F0.SFX_FACELESS15.whoosh.volume === '25%' && F0.SFX_FACELESS15.pop.volume === '30%')
}

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
mut('f3: música de volta aos 18 % (14 % fixos)', F15, "export const FACELESS15_MUSICA_VOLUME = '14%'", "export const FACELESS15_MUSICA_VOLUME = '18%'", ['F2']) // KINEO-FILMES-F1F3-AJUSTE-1910
mut('f3: música sem loop (silêncio se a faixa for curta)', F15, 'volume: FACELESS15_MUSICA_VOLUME, loop: true, audio_fade_in', 'volume: FACELESS15_MUSICA_VOLUME, audio_fade_in', ['F2']) // KINEO-FILMES-F1F3-AJUSTE-1910
mut('f3: riser alto demais (20 % → 50 %)', F15, "segundos: 1.2, volume: '20%'", "segundos: 1.2, volume: '50%'", ['F4'])
mut('f3: sem pop no reveal', F15, 'const pop = quadro.payoff != null ? som(sfx.pop, quadro.payoff) : null', 'const pop = null', ['F4'])
mut('f3: whoosh fora do corte', F15, 'export const FACELESS15_WHOOSH_ANTES_S = 0.1', 'export const FACELESS15_WHOOSH_ANTES_S = 0.6', ['F4'])
mut('f4: 2º plano sem o trim de 3,0 s (o mesmo quadro duas vezes)', F15, 'export const FACELESS15_TRIM_2O_PLANO_S = 3.0', 'export const FACELESS15_TRIM_2O_PLANO_S = 0', ['G3'])
mut('f4: plano pode passar do clipe (sem a trava do trim)', F15, 'if (trim + len + SOBREPOSICAO_S > segundos[c] + 1e-9) {\n      trim = r3(', 'if (false) {\n      trim = r3(', ['G13'])
mut('f4: o reveal deixa de ser corte fixo', F15, 'if (p != null && planosPara(p) >= 1 && planosPara(T - p) >= 1) {', 'if (false) {', ['G5'])
mut('f4: sem punch no reveal', F15, 'Math.abs(ini - punchEm) < 1e-6 && len - FACELESS15_PUNCH_S >= 1', 'false', ['G6'])
mut('f4: planos de 6 s em vez de ~3 s (o 3×6 de hoje)', F15, 'export const FACELESS15_PLANO_ALVO_S = 3.0', 'export const FACELESS15_PLANO_ALVO_S = 6.0', ['G2'])
mut('f4: CTA ligado sem a fase', F15, "const ctaOn = opts.cta === true", 'const ctaOn = true', ['G10'])

console.log(`\n${falhas.length === 0 ? '✅' : '❌'} ${ok} verdes, ${falhas.length} vermelhas`)
if (falhas.length) { console.error('\nFalhas:'); for (const f of falhas) console.error('  · ' + f); process.exit(1) }
