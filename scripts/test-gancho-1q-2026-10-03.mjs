// KINEO-GANCHO-1Q-2026-10-03 — guardião do "gancho escrito no primeiro quadro" (diagnóstico TikTok de 02/10: a maior
// parte do público sai em 0:02). A 1ª frase da narração (até 8 palavras) entra como texto no topo do quadro de 0 a 2,5 s,
// só para contas internas enquanto GANCHO_1Q_PUBLIC=false, injetada DEPOIS de montado (como o logo da marca) — lib/compose
// (trava 8.2) não muda.
// Prova: (1) interruptor; (2) a frase do gancho (1ª frase, abreviações, decimais, corte em vírgula, reticências); (3) o
// elemento: trilha 11, 0→2,5 s, frame 0 sem transição, só propriedades já exercitadas em produção; (4) posição MEDIDA
// contra marca d'água/barra de cinema/logo e legenda (com colisão = não entra); (5) quadros largos; (6) hollywood
// (bloco de narração do começo); (7) injeção nas rotas (dois caminhos do compose + unlock, depois do logo, antes do
// envio, linhas marcadas) e rota = base fora das linhas marcadas; lib/compose intacto; (8) mutantes.
// Estilo readFileSync + transpile do módulo puro.
//
// De onde vem a narração/1ª frase no compose (documentado):
//   · clássico (Kineo 1/Seedance/Kling 2.5/Veo) e unlock: `scaledScript` — voiceover_script → stripScriptMarkers
//     (→ salvage → legendas de cena → topic) → scaleVoiceoverScript (ou verbatim/voz do usuário/avatar: o texto como veio).
//     É o texto que o TTS lê; a legenda é o Whisper desse áudio com a grafia desse texto.
//   · hollywood: narrationBlocks[i].text (um mp3 por cena); o bloco que começa até 1 s; senão voiceoverScript.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function load(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()

const MARCA = 'KINEO-GANCHO-1Q-2026-10-03'
const LIB = 'lib/hookFirstFrame.ts'
const SRC = read(LIB)
const COMPOSE_LIB = read('lib/compose.ts')
const ADS_V2 = read('lib/ads/adV2Montage.ts')

// Propriedades de texto que lib/compose.ts (legenda/marca d'água) e lib/ads/adV2Montage.ts já mandam ao Creatomate.
const EXERCITADAS = ['type', 'track', 'time', 'duration', 'text', 'x', 'y', 'x_anchor', 'y_anchor', 'width', 'font_family', 'font_size', 'font_weight', 'line_height', 'fill_color', 'background_color', 'background_x_padding', 'background_y_padding', 'border_radius']

// Um source montado como o do compose em 9:16: clipe, letterbox do Kineo 1 (6), legenda do gancho (5), marca d'água (9).
function source916({ logo = false, captionY = '78%', duration = 40, watermark = true, letterbox = true, W = 1080, H = 1920 } = {}) {
  const els = [
    { type: 'shape', track: 1, time: 0, duration, x: '50%', y: '50%', width: '100%', height: '100%', fill_color: '#000000' },
    { type: 'video', track: 2, time: 0, duration: 4, source: 'https://x/c1.mp4', enter_transition: { type: 'fade', duration: 0.5 } },
    { type: 'audio', track: 4, time: 0, duration, source: 'https://x/vo.mp3' },
    { type: 'text', track: 5, time: 0, duration: 1.2, text: 'STOP SCROLLING', x: '50%', y: captionY, y_anchor: '100%', width: '78%', font_size: 76, line_height: '105%', background_y_padding: '2%' },
    { type: 'text', track: 5, time: 1.2, duration: 1.4, text: 'THIS CHANGES', x: '50%', y: captionY, y_anchor: '100%', width: '78%', font_size: 62, line_height: '105%', background_y_padding: '2%' },
  ]
  if (letterbox) for (const yTop of [0, 94]) els.push({ type: 'shape', track: 6, time: 0, duration, x: '50%', y: `${yTop + 3}%`, width: '100%', height: '6%', fill_color: '#000000' })
  if (watermark) els.push({ type: 'text', track: 9, time: 0, duration, text: 'usekineo.com/free', x: '50%', y: '5%', width: '80%', font_size: 40 })
  if (logo) els.push({ type: 'image', track: 10, time: 0, duration, source: 'https://x/logo.png', x: '14%', y: '15%', width: '20%', height: '8%', fit: 'contain' })
  return { output_format: 'mp4', width: W, height: H, frame_rate: 30, duration, elements: els }
}
const pct = (v) => Number(String(v).replace('%', ''))

function problems(M) {
  const p = []
  // (1) interruptor
  if (M.GANCHO_1Q_PUBLIC !== false) p.push('GANCHO_1Q_PUBLIC não está false')
  if (M.ganchoLiberado(false) !== false || M.ganchoLiberado(true) !== true) p.push('ganchoLiberado não segue a conta interna')
  // (2) a frase do gancho
  const casos = [
    ['Stop scrolling. This changes everything about money.', 'Stop scrolling'],
    ['Why do cats purr? Science finally knows.', 'Why do cats purr?'],
    ['The U.S. Navy hid this for 40 years. Then it leaked.', 'The U.S. Navy hid this for 40 years'],
    ['He paid $4.5 million for a single coin. Nobody knows why.', 'He paid $4.5 million for a single coin'],
    ['This man, a janitor from Ohio, became a billionaire overnight.', 'This man, a janitor from Ohio'],
    ['In 1912 a ship vanished without a trace in the middle of the Atlantic.', 'In 1912 a ship vanished without a trace…'],
    ['Ninguém sabe por que o faraó escondeu a tumba durante séculos.', 'Ninguém sabe por que o faraó escondeu…'],
    ['Mr. Smith lost everything in one night. Here is how.', 'Mr. Smith lost everything in one night'],
    ['Nobody expected this\nThe second line is not the hook.', 'Nobody expected this'],
    ['"This is the end," he said. Then silence.', '"This is the end," he said'],
    ['He whispered "run before they find us all tonight in the dark" and vanished.', 'He whispered run before they find us all…'],
  ]
  for (const [inp, esperado] of casos) {
    const got = M.hookPhrase(inp)
    if (got !== esperado) p.push(`hookPhrase(${JSON.stringify(inp.slice(0, 30))}) = ${JSON.stringify(got)} ≠ ${JSON.stringify(esperado)}`)
  }
  for (const vazio of ['', null, undefined, 'Wow.', '   ']) if (M.hookPhrase(vazio) !== null) p.push(`frase vazia/curta virou gancho: ${JSON.stringify(vazio)}`)
  for (const t of ['A b c d e f g h i j k l m n o p.', 'In 1912 a ship vanished without a trace in the middle of the Atlantic.']) {
    const n = (M.hookPhrase(t) ?? '').replace(/…$/, '').split(/\s+/).filter(Boolean).length
    if (n > M.GANCHO_1Q_MAX_WORDS || M.GANCHO_1Q_MAX_WORDS !== 8) p.push('o gancho passou de 8 palavras')
  }
  // (3) o elemento em 9:16 com marca d'água e barra de cinema
  const s = source916()
  const antes = s.elements.length
  const r = M.withHookFirstFrame(s, { interna: true, narration: 'Stop scrolling. This changes everything.', font: 'Montserrat' })
  const el = s.elements[s.elements.length - 1]
  if (!r.applied || s.elements.length !== antes + 1) return [...p, `conta interna não recebeu o gancho (${r.reason})`]
  if (el.type !== 'text' || el.text !== 'Stop scrolling') p.push('o texto não é a frase do gancho')
  if (el.track !== 11 || M.GANCHO_1Q_TRACK !== 11) p.push('fora da trilha 11 (acima do logo 10 e de tudo do compose 1–9)')
  if (!(el.track > Math.max(...s.elements.filter((e) => e !== el).map((e) => e.track)))) p.push('o gancho não está por cima de tudo')
  if (el.time !== 0 || el.duration !== 2.5) p.push(`janela ${el.time}→${el.time + el.duration} ≠ 0→2,5 s`)
  if ('enter_transition' in el || 'exit_transition' in el || 'animations' in el) p.push('transição no gancho: ele precisa estar no frame 0 (e exit_transition nunca foi exercitada)')
  const chaves = Object.keys(el)
  const fora = chaves.filter((k) => !EXERCITADAS.includes(k))
  if (fora.length) p.push('propriedade nunca exercitada: ' + fora.join(','))
  for (const k of chaves) if (!COMPOSE_LIB.includes(`${k}:`) && !ADS_V2.includes(`${k}:`)) p.push(`"${k}" não aparece em lib/compose nem no Ads V2`)
  if (el.y_anchor !== '0%' || el.x !== '50%' || el.x_anchor !== '50%') p.push('âncora errada (o topo preso: a quebra cresce para baixo, longe da marca d\'água)')
  if (el.width !== '78%') p.push('largura ≠ 78% (a mesma caixa provada da legenda)')
  if (!(el.font_size >= 60) || el.font_weight !== '800') p.push('fonte pequena/fina demais para o celular')
  if (el.fill_color === '#ffffff' && /rgba\(0,0,0/.test(el.background_color)) p.push('igual à legenda (branco em pílula escura) — leria como 2ª legenda (#277)')
  // (4) posição medida: abaixo da marca d'água (5% · fonte 40 → 137 px) + respiro, acima da legenda
  const H = 1920
  const yPx = (pct(el.y) / 100) * H
  const pad = (pct(el.background_y_padding) / 100) * H
  const pillTop = yPx - pad
  if (!(pillTop >= 96 + 1.023 * 40)) p.push(`pílula (${pillTop.toFixed(0)} px) sobe na marca d'água (até 137 px)`)
  if (!(pillTop >= 0.07 * H)) p.push('pílula dentro da faixa das abas do TikTok (7%)')
  if (!(pct(el.y) < 12)) p.push(`sem logo o gancho devia morar no alto (y ${el.y})`)
  const lines = M.estimateLines(el.text, 842.4)
  const pillBottom = yPx + lines * el.font_size * 1.1 + pad
  const captionTop = 0.78 * H - 3 * 76 * 1.05 - 0.02 * H
  if (!(pillBottom < captionTop)) p.push('o gancho encosta na legenda')
  // pior caso: 3 linhas ainda terminam acima do rosto típico (≤ 23% sem logo)
  const pior = yPx + 3 * el.font_size * 1.1 + pad
  if (!(pior / H < 0.23)) p.push(`3 linhas descem até ${(pior / H * 100).toFixed(1)}% (faixa do rosto)`)
  // com logo da marca: desce para baixo dele (11–19%)
  const sl = source916({ logo: true })
  M.withHookFirstFrame(sl, { interna: true, narration: 'Stop scrolling. This changes everything.' })
  const ell = sl.elements[sl.elements.length - 1]
  if (ell.track !== 11 || !((pct(ell.y) / 100) * H - (pct(ell.background_y_padding) / 100) * H >= 0.19 * H)) p.push(`com logo o gancho não desceu para baixo dele (y ${ell.y})`)
  // colisão com a legenda = não entra (source intacto)
  const sc = source916({ captionY: '25%' })
  const n0 = sc.elements.length
  const rc = M.withHookFirstFrame(sc, { interna: true, narration: 'Stop scrolling. This changes everything.' })
  if (rc.applied || rc.reason !== 'colide_legenda' || sc.elements.length !== n0) p.push('legenda alta não barrou o gancho')
  // filme mais curto que 2,5 s
  const sh = source916({ duration: 2 })
  M.withHookFirstFrame(sh, { interna: true, narration: 'Stop scrolling now. Then more.' })
  if (sh.elements[sh.elements.length - 1].duration !== 2) p.push('gancho passou do fim de um filme de 2 s')
  // frase longa demais para 3 linhas encolhe
  const longa = M.fitPhrase('Extraordinarily incomprehensible internationalization overcomplicated misunderstandings everywhere', 842.4)
  if (!longa || M.estimateLines(longa, 842.4) > 3) p.push('frase de palavras longas não coube em 3 linhas')
  // (5) quadro largo (16:9): caixa não vira faixa e continua abaixo da marca d'água
  const sw = source916({ W: 1920, H: 1080, letterbox: false, captionY: '88%' })
  sw.elements.find((e) => e.track === 9).y = '6%'
  for (const e of sw.elements) if (e.track === 5) e.font_size = 58
  const rw = M.withHookFirstFrame(sw, { interna: true, narration: 'Stop scrolling. This changes everything.' })
  const elw = sw.elements[sw.elements.length - 1]
  if (!rw.applied || Math.abs(pct(elw.width) - 43.88) > 0.01) p.push(`16:9: largura ${elw.width} ≠ 43.88% (842,4 px)`)
  if (rw.applied && !((pct(elw.y) / 100) * 1080 - (pct(elw.background_y_padding) / 100) * 1920 >= 0.06 * 1080 + 1.023 * 40)) p.push('16:9: gancho sobe na marca d\'água')
  // fonte por língua
  const sf = source916()
  M.withHookFirstFrame(sf, { interna: true, narration: 'यह कहानी किसी ने नहीं सुनी। फिर।', font: 'Noto Sans Devanagari' })
  if (sf.elements[sf.elements.length - 1].font_family !== 'Noto Sans Devanagari') p.push('a fonte da língua não chegou ao gancho')
  // portão
  const sx = source916(); const nx = sx.elements.length
  const rx = M.withHookFirstFrame(sx, { interna: false, narration: 'Stop scrolling. This changes everything.' })
  if (rx.applied || rx.reason !== 'fechado' || sx.elements.length !== nx) p.push('conta de cliente recebeu o gancho com GANCHO_1Q_PUBLIC=false')
  const sk = source916(); const nk = sk.elements.length
  const rk = M.withHookFirstFrame(sk, { interna: true, narration: 'Stop scrolling. This changes everything.', skip: true })
  if (rk.applied || rk.reason !== 'pulado' || sk.elements.length !== nk) p.push('skip (avatar/Ads) não pulou')
  const sv = source916(); const nv = sv.elements.length
  if (M.withHookFirstFrame(sv, { interna: true, narration: '' }).applied || sv.elements.length !== nv) p.push('narração vazia criou texto')
  // (6) hollywood: o bloco do começo, senão o roteiro
  if (M.hookNarration([{ time: 3.1, text: 'Second block.' }, { time: 0, text: 'First words here. More.' }], 'Script x.') !== 'First words here. More.') p.push('hollywood não pegou o bloco que abre o filme')
  if (M.hookNarration([{ time: 4.2, text: 'Late narration.' }], 'The script opens here. Then.') !== 'The script opens here. Then.') p.push('hollywood com fala nativa na abertura não caiu no roteiro')
  if (M.hookNarration(null, 'Only script.') !== 'Only script.') p.push('hollywood sem blocos não caiu no roteiro')
  return p
}

console.log('1-6) lib puro')
const M = load(SRC)
const base = problems(M)
for (const b of base) console.log('     · ' + b)
ok(base.length === 0, `regras do gancho escrito (${base.length} problema(s))`)

console.log('7) Injeção nas rotas')
const ROTA = 'app/api/compose/route.ts'
const UNLOCK = 'app/api/compose/unlock/route.ts'
function rotaProblems(rota, unlock) {
  const p = []
  const linhas = rota.split('\n').filter((l) => l.includes('withHookFirstFrame') || l.includes("from '@/lib/hookFirstFrame'"))
  if (linhas.length !== 3) p.push(`compose: esperadas 3 linhas com o gancho (import + 2 chamadas), há ${linhas.length}`)
  if (linhas.some((l) => !l.includes(MARCA))) p.push('compose: linha do gancho sem o marcador')
  const iHw = rota.indexOf('withHookFirstFrame(hollywoodSource,')
  const iHwLogo = rota.indexOf('withBrandLogo(hollywoodSource,')
  const iHwSubmit = rota.indexOf('submitCreatomateOnce(hollywoodSource')
  if (!(iHw > iHwLogo && iHwLogo > 0 && iHw < iHwSubmit)) p.push('hollywood: gancho fora de "depois do logo, antes do envio"')
  const iCl = rota.indexOf('withHookFirstFrame(source,')
  const iClLogo = rota.indexOf('withBrandLogo(source,')
  const iClBuild = rota.indexOf('      source = buildCreatomateSource({')
  const iClSubmit = rota.indexOf('submitCreatomateOnce(source')
  if (!(iCl > iClLogo && iClLogo > iClBuild && iClBuild > 0 && (iClSubmit < 0 || iCl < iClSubmit))) p.push('clássico: gancho fora de "depois do logo, antes do envio"')
  const hw = rota.slice(iHw, rota.indexOf('\n', iHw))
  const cl = rota.slice(iCl, rota.indexOf('\n', iCl))
  if (!hw.includes('interna: isInternalEmail(user.email)') || !cl.includes('interna: isInternalEmail(user.email)')) p.push('compose: o portão não é isInternalEmail(user.email)')
  if (!hw.includes('narration: hookNarration(narrationBlocks, voiceoverScript)')) p.push('hollywood: narração não vem dos blocos/roteiro')
  if (!cl.includes('narration: scaledScript')) p.push('clássico: narração não é o scaledScript (o texto que o TTS leu)')
  if (!cl.includes('skip: avatarMode || (isServiceFinish && body.narration_source === \'tts\')')) p.push('clássico: avatar/Ads não ficam de fora')
  if (!hw.includes('font: captionFontFor(language)') || !cl.includes('font: captionFontFor(language)')) p.push('compose: fonte da língua não passa')
  const ul = unlock.split('\n').filter((l) => l.includes('withHookFirstFrame') || l.includes("from '@/lib/hookFirstFrame'"))
  if (ul.length !== 2 || ul.some((l) => !l.includes(MARCA))) p.push('unlock: import + 1 chamada marcados')
  const iU = unlock.indexOf('withHookFirstFrame(source, { interna: isInternalEmail(user.email), narration: scaledScript, font: captionFontFor(language) })')
  if (!(iU > unlock.indexOf('withBrandLogo(source,') && iU < unlock.indexOf('await submitUnlockOnce(source'))) p.push('unlock: gancho fora de "depois do logo, antes do envio"')
  return p
}
const rota = read(ROTA)
const unlock = read(UNLOCK)
const rp = rotaProblems(rota, unlock)
for (const b of rp) console.log('     · ' + b)
ok(rp.length === 0, `rotas com a injeção marcada (${rp.length} problema(s))`)

// Base = pai do commit mais antigo com o marcador; antes do commit, HEAD. Tirando as linhas marcadas, rota = base.
let BASE = null
{
  const cands = []
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) cands.push(shas[shas.length - 1] + '^') } catch { /* sem commit */ }
  cands.push('HEAD')
  for (const ref of cands) { try { if (!git(['show', `${ref}:${ROTA}`]).includes(MARCA)) { BASE = ref; break } } catch { /* próximo */ } }
}
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
const semMarca = (s) => s.split('\n').filter((l) => !l.includes(MARCA)).join('\n')
const rdBase = (p) => { try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
ok(Boolean(BASE), 'a base (antes do gancho) está disponível')
if (BASE) {
  ok(semMarca(rota) === rdBase(ROTA), 'compose: fora das linhas marcadas, byte a byte a base')
  ok(semMarca(unlock) === rdBase(UNLOCK), 'unlock: fora das linhas marcadas, byte a byte a base')
  ok(COMPOSE_LIB === rdBase('lib/compose.ts'), 'lib/compose.ts byte a byte a base (trava 8.2)')
}
// O "fade de abertura" do Kineo 1 (lib/compose.ts) escurece o frame 0: o gancho (trilha 11, sem transição) fica por cima.
ok(/const FAST_OPENING_FADE_SECONDS = 0\.5/.test(COMPOSE_LIB) && /isFastStock && i === 0 && reuseIndex === 0\s*\n\s*\? \{ enter_transition: \{ type: 'fade', duration: FAST_OPENING_FADE_SECONDS \} \}/.test(COMPOSE_LIB),
  'fato medido: o Kineo 1 abre do preto em 0,5 s (só o 1º corte) — o gancho é o que se lê no frame 0')

console.log('8) Mutantes')
const mut = (nome, de, para, alvo = 'lib') => {
  if (alvo === 'lib') {
    if (!SRC.includes(de)) { ok(false, `mutante "${nome}": trecho não encontrado`); return }
    let ms
    try { ms = problems(load(SRC.split(de).join(para))) } catch (e) { ms = ['quebrou: ' + e.message] }
    ok(ms.length > 0, `mutante (${nome}) → vermelho (${ms.length})`)
  } else {
    const r = alvo === 'rota' ? rota : unlock
    if (!r.includes(de)) { ok(false, `mutante "${nome}": trecho não encontrado`); return }
    const m = r.split(de).join(para)
    const ms = alvo === 'rota' ? rotaProblems(m, unlock) : rotaProblems(rota, m)
    ok(ms.length > 0, `mutante (${nome}) → vermelho (${ms.length})`)
  }
}
mut('aberto para todos', 'export const GANCHO_1Q_PUBLIC = false', 'export const GANCHO_1Q_PUBLIC = true')
mut('fica o filme inteiro', 'export const GANCHO_1Q_SECONDS = 2.5', 'export const GANCHO_1Q_SECONDS = 60')
mut('trilha do logo', 'export const GANCHO_1Q_TRACK = 11', 'export const GANCHO_1Q_TRACK = 10')
mut('posição chumbada no topo (não mede)', 'const pillTop = topBandBottomPx(els as El[], H) + gap', 'const pillTop = 0')
mut('ignora o logo', "(track === 10 && e.type === 'image')", '(false)')
mut('sem conferência da legenda', "if (pillBottom + gap > captionTopPx(els as El[], H, duration)) return", 'if (false) return')
mut('decimal corta a frase', "if (next.length > 0 && !/^\\s/.test(next)) { i = j; continue }", '')
mut('abreviação corta a frase', "if (tok.includes('.') || bare.length === 1 || ABREV.has(bare)) { i = j; continue }", '')
mut('sem corte em vírgula', "if (CLAUSE_END.test(words[k - 1]) || DASH.test(words[k] ?? '')) { cut = k; break }", '')
mut('12 palavras', 'export const GANCHO_1Q_MAX_WORDS = 8', 'export const GANCHO_1Q_MAX_WORDS = 12')
mut('entra com fade', "border_radius: 10,\n  }", "border_radius: 10,\n    enter_transition: { type: 'fade', duration: 0.3 },\n  }")
mut('estilo da legenda', "fill_color: '#0b0b0f',\n    background_color: 'rgba(255,255,255,0.94)',", "fill_color: '#ffffff',\n    background_color: 'rgba(0,0,0,0.60)',")
mut('skip ignorado', "if (opts.skip) return { applied: false, reason: 'pulado', phrase: null, y: null }", '')
mut('hollywood sempre o 1º bloco', 'if (first && Number(first.time) <= 1) return String(first.text)', 'if (first) return String(first.text)')
mut('compose: portão vira true', "withHookFirstFrame(source, { interna: isInternalEmail(user.email),", 'withHookFirstFrame(source, { interna: true,', 'rota')
mut('compose: avatar recebe', "skip: avatarMode || (isServiceFinish && body.narration_source === 'tts')", 'skip: false', 'rota')
mut('unlock: sem gancho', "    withHookFirstFrame(source, { interna: isInternalEmail(user.email), narration: scaledScript, font: captionFontFor(language) }) // KINEO-GANCHO-1Q-2026-10-03\n", '', 'unlock')

console.log(`\n${pass} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
