// KINEO-ROMANCE-ADULTO-2026-10-13 [TRAVA 8.2 — vai do fundador 13/10 'tudo sim' (romance adulto e realista)] — guardião.
//
// O caso: d.hein.0@web.de, 7 filmes de romance/flerte de 35 s no Seedance 1.5, 3 muito errados, todos os planos gerados:
//   A "no logo animation" ligava o look 3D animado (rosto de criança estilo Pixar com "young couple");
//   B "Resolution: 1080 × 1920" virava o ano 1080 (castelo medieval);
//   C o look também saía do texto do GPT ("illustrated by their body language" → livro ilustrado);
//   D romance caía em documentary_faceless ("Close-up shot of and standing") ou o supervisor escrevia "two individuals";
//   E "clearly adult" chegava a 1 de 35 cenas; F nenhuma trava de saída (adultos, sem menores) nem no still FLUX.
// Este guardião executa as funções PURAS reais, offline (lib/cinematic/romanceGuard, sceneStyle, visualPromptPolicy,
// visualMode, lib/hollywood/anchors.cinematicSceneStillPrompt e o eraLockSuffix recortado da rota), com os 4 pedidos do
// cliente como fixtures (os trechos citados no relatório do caso, completados com o resto típico do pedido), e:
//   (1) romance: fotorreal, sem young/teen/boy/girl/kid/child nas cenas, sufixo de adultos em TODA cena e no still, sem
//       ano 1080, sem "of and", elenco "a man and a woman", character_story; negative de Veo/Kling com os termos de menor;
//   (2) não-romance ("5 facts about the Titanic" e outros controles): prompts, era, formato e still BYTE A BYTE iguais à
//       base (reconstruída em memória por scripts/test-support/desfaz-romance-adulto-1310.mjs);
//   (3) os 3 consertos de bug que valem para todos (negação no look, era × resolução, apagão de pessoa sem fragmento),
//       provados contra a base;
//   (4) a rota: cada fio ligado no lugar certo (texto real da rota) e a moderação antes do ensaio, do still e do POST;
//   (5) mutantes: cada um aplicado (prova por texto) tem de deixar o guardião vermelho.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { desfazRomanceAdulto, MARCA_ROMANCE_ADULTO } from './test-support/desfaz-romance-adulto-1310.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const VERBOSO = process.argv.includes('--antes-depois')

// ── fixtures: os 4 pedidos reais (trechos do caso) ───────────────────────────────────────────────────────────────────
const PEDIDOS_CLIENTE = [
  'Create a 35-second vertical 9:16 cinematic Short featuring two clearly adult people with magnetic attraction meeting on a rooftop bar at night, city lights behind them, slow glances, a hand almost touching. Warm cinematic lighting, shallow depth of field, no text on screen, no logo animation, no watermark. Resolution: 1080 × 1920',
  'Create a 35-second vertical 9:16 romantic Short featuring two clearly adult partners in an intimate setting: a candlelit apartment, soft rain on the window, slow dancing, foreheads touching. Cinematic, warm color grade, no logo animation, no subtitles. Resolution: 1080 × 1920',
  'Create a 35-second vertical 9:16 cinematic Short of two clearly adult people flirting in an elegant setting, a jazz lounge, playful smiles, a shared glance over champagne glasses. Moody lighting, no logo animation. Resolution: 1080 × 1920',
  'Create a 35-second vertical 9:16 cinematic Short featuring two attractive adults with undeniable chemistry at a seaside restaurant at golden hour, laughing, leaning closer. Natural skin tones, no logo animation. Resolution: 1080 × 1920',
]
// O que o GPT escreveu nas cenas (o padrão do caso: "illustrated by their body language", "two individuals", "young couple").
const VISUAIS_ROMANCE = [
  'Close-up shot of a man and a woman standing close on a rooftop at night, their attraction illustrated by their body language',
  'Two individuals exchange a slow glance across the bar, warm city lights glowing behind them',
  'A young couple shares a quiet laugh, a young woman tilting her head as the young man leans closer',
  'Wide shot of the pair walking along the terrace at night, hands almost touching',
]
const FALAS_ROMANCE = ['Some connections are instant.', 'One look across the room.', 'A laugh that pulls you closer.', 'And just like that, the night is theirs.']
const ROMANCE_FX = PEDIDOS_CLIENTE.map((pedido) => ({ pedido, visuais: VISUAIS_ROMANCE, falas: FALAS_ROMANCE }))
// Romance com look desenhado DE VERDADE (não negado): o romance força o fotorreal mesmo assim.
const ROMANCE_DESENHADO = { pedido: 'A romantic 3D animated Pixar style love story of a young couple on their first date in Paris', visuais: ['A young girl and a boy share a kiss under the Eiffel Tower, 3D animated', 'The kids walk hand in hand along the Seine'], falas: ['Their first date.', 'Paris was theirs.'] }
const CONTROLES = [
  { pedido: '5 facts about the Titanic', visuais: ['The grand staircase of the Titanic lit by crystal chandeliers', 'A massive iceberg looming in the dark North Atlantic at night', 'Lifeboats being lowered from the deck as flares light the sky', 'The rusted bow of the wreck resting on the ocean floor', 'Close-up of a pocket watch stopped at 2:20 on a wooden table'], falas: ['In April 1912, the Titanic left Southampton.', 'At 11:40 pm it struck an iceberg.', 'There were lifeboats for only half the people aboard.', 'The wreck was found in 1985.', 'Fact five will surprise you.'] },
  { pedido: 'The mystery of the Flannan Isles lighthouse keepers who vanished in 1900', visuais: ['A lone lighthouse on a storm-battered island at dusk', 'A lighthouse keeper climbs the spiral stairs with a lantern', 'An overturned chair beside a cold kitchen table'], falas: ['In December 1900, three keepers vanished.', 'The lamp was cold.', 'One chair was knocked over.'] },
  { pedido: 'A 3D animated Pixar style story about a brave little fox who finds his way home', visuais: ['A brave little fox in a snowy forest', 'The fox sees the warm light of his den'], falas: ['A little fox was lost.', 'Then he saw home.'] },
  { pedido: 'Why are Boeing 737 engines flat on the bottom? A man walks under the wing.', visuais: ['A man walks under the wing of a Boeing 737 on the tarmac', 'Close-up of the flattened engine nacelle'], falas: ['Look closely at the engine.', 'It is flat on the bottom.'] },
]

// ── carregamento real (base = desfeita em memória) ───────────────────────────────────────────────────────────────────
const mocks = {
  '@fal-ai/client': { fal: { config() {}, queue: {} } },
  '@/lib/falQueue': { FalQueueSubmitError: class extends Error {}, submitFalQueueOnce: async () => { throw new Error('offline') } },
}
function eraDaRota(rotaTexto) {
  const i = rotaTexto.indexOf('const ERA_YEAR_RE')
  const j = rotaTexto.indexOf('\n}\n', rotaTexto.indexOf('function eraLockSuffix'))
  if (i < 0 || j < 0) throw new Error('eraLockSuffix não encontrado na rota')
  const js = ts.transpileModule(rotaTexto.slice(i, j + 3) + '\nexports.eraLockSuffix = eraLockSuffix\nexports.ERA_YEAR_RE = ERA_YEAR_RE\nexports.RESOLUCAO = typeof RESOLUCAO_NO_PEDIDO_RE === "undefined" ? null : RESOLUCAO_NO_PEDIDO_RE', { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp })
  return exp
}
function carregar(transformar) {
  const load = createOfflineLoader({ mocks, source: transformar })
  const rota = transformar(ROTA, rd(ROTA))
  return {
    S: load('@/lib/cinematic/sceneStyle'),
    P: load('@/lib/cinematic/visualPromptPolicy'),
    V: load('@/lib/cinematic/visualMode'),
    R: load('@/lib/cinematic/romanceGuard'),
    A: load('@/lib/hollywood/anchors'),
    E: eraDaRota(rota),
    rota,
  }
}
const semMudanca = (_rel, txt) => txt
const base = (rel, txt) => desfazRomanceAdulto(rel, txt)

// O caminho clássico da rota, cena a cena (generate-video-cinematic: formato → look → modo → era → prompt → romance → still).
// `depois` = a rota deste commit (as linhas marcadas); `antes` = a da base (look de pedido + plano do GPT, sem romance).
function filme(M, fx, depois) {
  const prompt = fx.pedido
  const formato = M.V.decidirFormato(prompt, false)
  const romance = depois ? M.R.decidirRomanceAdulto(prompt) : { ativo: false }
  if (romance.ativo && formato.modo === 'documentary_faceless') Object.assign(formato, { modo: 'character_story' })
  const style = M.S.deriveStyleAnchor(depois ? prompt : `${prompt} ${fx.visuais.join(' ')}`, '')
  if (romance.ativo) Object.assign(style, M.S.forcePhotorealAnchor(style, ''))
  const storyMode = M.P.isStylizedLook(style) || formato.modo === 'character_story'
  const character = storyMode ? M.S.deriveStoryCharacter(prompt) : null
  const mode = formato.modo === 'presenter' ? 'presenter' : storyMode ? 'character_story' : 'documentary_faceless'
  const eraSuffix = M.E.eraLockSuffix(`${prompt} ${fx.falas.join(' ')}`)
  let prompts = fx.visuais.map((v, i) => M.P.buildClassicVisualPrompt(v, { mode, style, character, aspect: '9:16', eraSuffix, opening: i === 0 }))
  if (romance.ativo) prompts = prompts.map((p) => M.R.aplicarRomanceAdulto(p, romance))
  const stills = prompts.map((p) => (M.A.cinematicSceneStillPrompt ? M.A.cinematicSceneStillPrompt({ scenePrompt: p, styleSuffix: '', aspect: '9:16', ...(romance.ativo ? { adultSuffix: M.R.ROMANCE_ADULT_SUFFIX } : {}) }) : null))
  const negativo = M.P.classicVisualNegativePrompt(mode, M.P.isStylizedLook(style))
  return { formato, romance, style, mode, eraSuffix, prompts, stills, negativo: romance.ativo ? M.R.negativoRomanceAdulto(negativo) : negativo }
}

const IDADE_JOVEM = /\b(?:young|teen|teens|teenage|boy|boys|girl|girls|kid|kids|child)\b/i

// ── todas as asserções; devolve a lista de falhas (os mutantes rodam a MESMA lista) ──────────────────────────────────
function avalia(M, MB, log) {
  const falhas = []
  const checa = (n, c) => { if (c) { if (log) console.log('  ok  ', n) } else { falhas.push(n); if (log) console.log('  FALHA', n) } }
  const R = M.R
  const SUF = R.ROMANCE_ADULT_SUFFIX

  if (log) console.log('== (1) os 4 pedidos do cliente: romance adulto e realista ==')
  ROMANCE_FX.forEach((fx, k) => {
    const d = filme(M, fx, true)
    const n = `pedido ${k + 1}`
    checa(`${n}: reconhecido como romance (${d.romance.motivo})`, d.romance.ativo === true)
    checa(`${n}: look fotorreal`, d.style.look === 'photoreal' && !M.P.isStylizedLook(d.style))
    checa(`${n}: character_story (as duas pessoas aparecem)`, d.formato.modo === 'character_story' && d.mode === 'character_story')
    checa(`${n}: nenhuma cena com young/teen/boy/girl/kid/child`, d.prompts.every((p) => !IDADE_JOVEM.test(p)))
    checa(`${n}: sufixo de adultos no FIM de toda cena (${d.prompts.length}/${d.prompts.length})`, d.prompts.every((p) => p.endsWith(SUF)))
    checa(`${n}: sufixo de adultos em todo still FLUX`, d.stills.every((s) => typeof s === 'string' && s.includes(SUF)))
    checa(`${n}: nenhum ano 1080 (era vazia, nenhum "year 1080")`, d.eraSuffix === '' && d.prompts.every((p) => !/1080/.test(p)))
    checa(`${n}: nenhum "of and"`, d.prompts.every((p) => !/\bof and\b/i.test(p)))
    checa(`${n}: elenco "a man and a woman" abre toda cena`, d.prompts.every((p) => p.startsWith('Cast: a man and a woman, both adults.')))
    checa(`${n}: "two individuals" virou o par fixo`, d.prompts.every((p) => !/two individuals/i.test(p)) && d.prompts.some((p) => /a man and a woman exchange/i.test(p)))
    checa(`${n}: negative (Veo/Kling 2.5) com child, teen, minor, schoolkid, cartoon, cute`, ['child', 'teen', 'minor', 'schoolkid', 'cartoon', 'cute'].every((t) => new RegExp(`(?:^|, )${t}(?:,|$)`).test(d.negativo)))
  })
  const dd = filme(M, ROMANCE_DESENHADO, true)
  checa('romance pedido em 3D/Pixar: o look é forçado a fotorreal', dd.romance.ativo && dd.style.look === 'photoreal')
  checa('romance pedido em 3D/Pixar: "girl"/"boy"/"kids" viram adultos', dd.prompts.every((p) => !IDADE_JOVEM.test(p)) && dd.prompts.every((p) => p.endsWith(SUF)))
  checa('negative não duplica "cartoon" (já vinha no negativo fotorreal)', (dd.negativo.match(/(?:^|, )cartoon(?:,|$)/g) || []).length === 1)
  const antes1 = filme(MB, ROMANCE_FX[0], false)
  checa('base (o defeito do caso): pedido 1 nascia 3D animado e com era 1080', antes1.style.look === 'animated3d' && /the year 1080/.test(antes1.eraSuffix))
  checa('base (o defeito do caso): o plano do GPT sozinho ("illustrated by") pedia livro ilustrado', MB.S.deriveStyleAnchor(`a cinematic short ${VISUAIS_ROMANCE[0]}`).look === 'illustration')
  checa('depois: o look ignora o plano do GPT (só o texto do cliente decide)', M.S.deriveStyleAnchor('a cinematic short').look === 'photoreal')

  if (log) console.log('== (1b) elenco explícito e precisão do detector ==')
  const dm = R.decidirRomanceAdulto('A romantic short about two men falling in love in Lisbon')
  const dw = R.decidirRomanceAdulto('A romantic short about two women in love on a summer night')
  checa('pedido de dois homens: elenco "two men, both adults"', dm.ativo && dm.elencoFrase === 'two men, both adults' && R.aplicarRomanceAdulto('Two individuals walk', dm).startsWith('Cast: two men, both adults.'))
  checa('pedido de duas mulheres: elenco "two women, both adults"', dw.ativo && dw.elencoFrase === 'two women, both adults')
  checa('pt/es: "um casal apaixonado, dois adultos" e "una cita romántica" são romance', R.decidirRomanceAdulto('um casal apaixonado, dois adultos num jantar').ativo && R.decidirRomanceAdulto('una cita romántica en Madrid').ativo)
  const naoRomance = ['5 facts about the Titanic', 'The top tourist attraction in Paris', 'Carbon dating of the Shroud of Turin', 'Marie Curie fell in love with physics', 'A couple of facts about volcanoes', 'Two penguins in love, a romantic cartoon']
  checa('não é romance: Titanic, "tourist attraction", "carbon dating", "fell in love with physics", "a couple of", pinguins', naoRomance.every((t) => R.decidirRomanceAdulto(t).ativo === false))
  checa('aplicarRomanceAdulto é idempotente (2 passadas = 1) e não reescreve o próprio sufixo', (() => { const r = R.decidirRomanceAdulto(PEDIDOS_CLIENTE[0]); const um = R.aplicarRomanceAdulto(VISUAIS_ROMANCE[2], r); return R.aplicarRomanceAdulto(um, r) === um && um.includes('no children, no teenagers') })())
  checa('sem romance, aplicarRomanceAdulto devolve o MESMO texto', R.aplicarRomanceAdulto(VISUAIS_ROMANCE[2], R.decidirRomanceAdulto('5 facts about the Titanic')) === VISUAIS_ROMANCE[2])
  checa('moderação lê o texto final SEM o nosso sufixo ("no children" é termo de menor)', (() => { const t = R.textoParaModeracao(filme(M, ROMANCE_FX[1], true).prompts); return !t.includes('no children') && /candlelit|rooftop|glance/.test(t) })())

  if (log) console.log('== (1c) o still FLUX ==')
  const cenaSemCauda = 'Cast: a man and a woman, both adults. Two people share a glance at a jazz bar'
  const st = M.A.cinematicSceneStillPrompt({ scenePrompt: cenaSemCauda, styleSuffix: '', aspect: '9:16', adultSuffix: SUF })
  checa('still garante o sufixo mesmo quando a cena perdeu a cauda', typeof st === 'string' && st.includes(SUF) && st.indexOf(SUF) < st.indexOf('cinematic frame'))
  checa('still sem adultSuffix = o texto da base, byte a byte', CONTROLES.every((fx) => filme(M, fx, true).stills.every((s, i) => s === filme(MB, fx, false).prompts.map((p) => baseStill(MB, p))[i])))

  if (log) console.log('== (2) não-romance: byte a byte igual à base ==')
  for (const fx of CONTROLES) {
    const a = filme(MB, fx, false), d = filme(M, fx, true)
    checa(`"${fx.pedido.slice(0, 40)}": romance inativo`, d.romance.ativo === false)
    checa(`"${fx.pedido.slice(0, 40)}": formato, look, era e prompts idênticos à base`, a.formato.modo === d.formato.modo && a.style.look === d.style.look && a.eraSuffix === d.eraSuffix && a.prompts.length === d.prompts.length && a.prompts.every((p, i) => p === d.prompts[i]))
    checa(`"${fx.pedido.slice(0, 40)}": negative idêntico à base`, a.negativo === d.negativo)
  }
  checa('Titanic: o ano de verdade (1912) segue travando a era', /the year 1912/.test(filme(M, CONTROLES[0], true).eraSuffix))
  checa('fox 3D (pedido desenhado de verdade) segue animated3d', filme(M, CONTROLES[2], true).style.look === 'animated3d')

  if (log) console.log('== (3) os consertos de bug (valem para todos) ==')
  const neg = ['Cinematic short, no logo animation', 'Realistic film, not animated', 'A documentary without cartoon effects', 'Filme realista, sem animação', 'Película real, sin animación', 'A cinematic film, non-animated']
  checa('look: menção NEGADA não liga desenho (6 frases, en/pt/es)', neg.every((t) => M.S.deriveStyleAnchor(t).look === 'photoreal' && !M.S.looksLikeDrawnRequest(t)))
  checa('look: a base ligava desenho nas mesmas frases (o defeito)', neg.filter((t) => MB.S.deriveStyleAnchor(t).look !== 'photoreal').length >= 5)
  checa('look: "no text, 3D animated film" e "not photorealistic but animated" seguem desenho', M.S.deriveStyleAnchor('no text, 3D animated film about a fox').look === 'animated3d' && M.S.looksLikeDrawnRequest('not photorealistic but animated'))
  const res = ['Resolution: 1080 × 1920', 'Format 1080x1920, vertical', 'export at 1920px tall', 'Render in 1080p', 'resolution 1080 by 1920']
  checa('era: lado de resolução não vira ano (5 formas)', res.every((t) => M.E.eraLockSuffix(t) === ''))
  checa('era: a base abria era nessas frases (o defeito)', MB.E.eraLockSuffix('Resolution: 1080 × 1920').includes('the year 1080'))
  checa('era: ERA_YEAR_RE sozinho recusa "1080 × 1920" e "1920 x 1080"', !M.E.ERA_YEAR_RE.test('1080 × 1920') && !M.E.ERA_YEAR_RE.test('size 1920 x 1080') && M.E.ERA_YEAR_RE.test('in 1080 the castle fell'))
  checa('era: a limpeza de resolução sozinha tira "Resolution: 1080" e "1080 by 1920"', M.E.RESOLUCAO !== null && !/1080/.test('Resolution: 1080, and 1080 by 1920'.replace(M.E.RESOLUCAO, ' ')))
  checa('era: anos reais seguem (1066, 1912, 1920)', /the year 1066/.test(M.E.eraLockSuffix('The Battle of Hastings in 1066')) && /the year 1912/.test(M.E.eraLockSuffix('In 1912 the Titanic sank')) && /the year 1920/.test(M.E.eraLockSuffix('In 1920 Prohibition began')))
  const fl = { mode: 'documentary_faceless', style: M.S.deriveStyleAnchor(''), character: null, aspect: '9:16' }
  const flB = { ...fl, style: MB.S.deriveStyleAnchor('') }
  const v1 = 'Close-up shot of a man and a woman standing close on a rooftop'
  checa('faceless: a base deixava "Close-up shot of and standing" (o defeito)', /shot of and standing/.test(MB.P.buildClassicVisualPrompt(v1, flB)))
  checa('faceless: sem "of and" — sujeito neutro (silhuetas de costas)', (() => { const p = M.P.buildClassicVisualPrompt(v1, fl); return !/\bof and\b/.test(p) && /shot of distant silhouetted figures seen from behind standing close/.test(p) })())
  checa('faceless: "a man\'s hands" vira "hands", "A man walks" segue como antes', /close-up of weathered hands/i.test(M.P.buildClassicVisualPrompt("A close-up of a man's weathered hands", fl)) && M.P.buildClassicVisualPrompt('A man walks through the rain', fl) === MB.P.buildClassicVisualPrompt('A man walks through the rain', flB))

  if (log) console.log('== (4) a rota: cada fio no lugar ==')
  const r = M.rota
  const pos = (s) => r.indexOf(s)
  checa('decisão do romance sobre o texto do CLIENTE, logo depois do formato', pos('const romanceAdulto = decidirRomanceAdulto(prompt)') > pos('const formatoVisual = formatoComEstrela(decidirFormato(prompt, tagFacelessPresente)') && pos('const formatoVisual = formatoComEstrela(') > 0)
  checa('romance → character_story (respeita [faceless] e apresentador)', /if \(romanceAdulto\.ativo && !tagFacelessPresente && formatoVisual\.modo === 'documentary_faceless'\) Object\.assign\(formatoVisual, \{ modo: 'character_story'/.test(r))
  checa('look só do texto do cliente', /const styleAnchor = deriveStyleAnchor\(\n\s+prompt, \/\/ KINEO-ROMANCE-ADULTO-2026-10-13/.test(r) && !r.includes("planScenes.map((s) => s.brollPrompt || '').join(' ')}`,"))
  checa('romance força fotorreal ANTES do storyMode', pos('if (romanceAdulto.ativo) Object.assign(styleAnchor, forcePhotorealAnchor(styleAnchor, styleSuffix))') > pos('const styleAnchor = deriveStyleAnchor(') && pos('if (romanceAdulto.ativo) Object.assign(styleAnchor, forcePhotorealAnchor(') < pos('const storyMode = isStylizedLook(styleAnchor)'))
  const iMap = pos('.map((promptDaCena) => (romanceAdulto.ativo ? aplicarRomanceAdulto(promptDaCena, romanceAdulto) : promptDaCena))')
  checa('prompts finais: romance depois do contrato e antes dos eixos Kling/Veo e do still', iMap > pos('return r.promptCorrigido') && iMap < pos('wantsKling ? kling25ApplyShotAxis(promptDaCena, sceneIndex)') && iMap < pos('const url = await generateCinematicSceneStill({'))
  checa('negative de romance no payload (Veo/Kling 2.5), logo depois do buildFalInput clássico', /const input = buildFalInput\(m, promptForAttempt, [^\n]+\n\s+if \(romanceAdulto\.ativo && typeof input\.negative_prompt === 'string'\) input\.negative_prompt = negativoRomanceAdulto\(input\.negative_prompt\)/.test(r))
  checa('still FLUX do caminho clássico recebe o sufixo de adultos', /styleSuffix: '', \/\/ Already applied once in classicScenePrompts\.\n\s+\.\.\.\(romanceAdulto\.ativo \? \{ adultSuffix: ROMANCE_ADULT_SUFFIX \} : \{\}\)/.test(r))
  checa('2ª tentativa "family-safe" também é de adultos', r.includes('safeVisualPrompt: romanceAdulto.ativo && safeVisualPrompt ? aplicarRomanceAdulto(safeVisualPrompt, romanceAdulto) : safeVisualPrompt,'))
  const iMod = pos("const moderacaoRomance = await moderateContent({ surface: 'clip', stage: 'input', userId: user.id, text: textoParaModeracao(classicScenePrompts)")
  checa('moderação do texto final: depois dos prompts, antes do ensaio $0, do still e do 1º POST', iMod > iMap && iMod < pos('const classicReport = classicDryRunReport({') && iMod < pos('if (anchorActive) {') && iMod < pos('const despachoCena = await dispatchOneSceneWithSafeVisualRetry({'))
  checa('moderação barrada/fora do ar devolve o crédito e responde a frase da casa', /if \(!moderacaoRomance\.ok\) \{[^\n]*\n\s+const devolvido = await releaseBirthClaim\(`content_moderation_\$\{moderacaoRomance\.reason\}_no_charge`\)[^\n]*\n\s+return NextResponse\.json\(\{ error: moderationRefusalMessage\(moderacaoRomance\.reason\)/.test(r))
  checa('era: a resolução sai do contexto antes da busca de ano', r.includes("const ctx = (context || '').slice(0, 4000).replace(RESOLUCAO_NO_PEDIDO_RE, ' ')"))
  checa('desfazer em memória: a rota sem a leva não tem a marca e volta ao ERA_YEAR_RE da base', (() => { const u = desfazRomanceAdulto(ROTA, r); return !u.includes(MARCA_ROMANCE_ADULTO) && u.includes('const ERA_YEAR_RE = /\\b1[0-8][0-9]{2}\\b|\\b19[0-3][0-9]\\b/ // years 1000–1939') })())
  return falhas
}
function baseStill(MB, p) {
  // o texto do still da BASE (função de antes, reconstruída em memória): cena + quadro, sem sufixo de adultos
  const a = MB.A
  return a.cinematicSceneStillPrompt ? a.cinematicSceneStillPrompt({ scenePrompt: p, styleSuffix: '', aspect: '9:16' }) : STILL_DA_BASE(p)
}
// A base não exporta a função pura (o texto vivia dentro de generateCinematicSceneStill). Recria-se aqui pelo MESMO texto
// da base, lido do arquivo desfeito — se o template da base mudar, a leitura muda junto.
function STILL_DA_BASE(p) {
  const src = desfazRomanceAdulto('lib/hollywood/anchors.ts', rd('lib/hollywood/anchors.ts'))
  const ini = src.indexOf("    const scene = (args.scenePrompt ?? '')")
  const fim = src.indexOf('    return await generateAnchorImage(prompt, args.seed', ini)
  const corpo = src.slice(ini, fim)
  const regra = (src.match(/const ONE_FRAME_RULE = '([^']+)'/) || [])[1]
  const aspecto = createOfflineLoader({ mocks })('@/lib/aspect')
  const fn = new Function('args', 'aspectSpec', 'ONE_FRAME_RULE', corpo + '\n    return prompt')
  return fn({ scenePrompt: p, styleSuffix: '', aspect: '9:16' }, aspecto.aspectSpec, regra)
}

// ── execução ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const M = carregar(semMudanca)
const MB = carregar(base)
const falhas = avalia(M, MB, true)

if (VERBOSO) {
  for (const k of [0, 1]) {
    const a = filme(MB, ROMANCE_FX[k], false), d = filme(M, ROMANCE_FX[k], true)
    console.log(`\n--- pedido ${k + 1} — ANTES: look=${a.style.look} modo=${a.mode} era=${a.eraSuffix ? 'SIM' : 'não'} | DEPOIS: look=${d.style.look} modo=${d.mode} era=${d.eraSuffix ? 'SIM' : 'não'}`)
    for (const i of [0, 2]) { console.log(`  cena ${i + 1} ANTES : ${a.prompts[i]}`); console.log(`  cena ${i + 1} DEPOIS: ${d.prompts[i]}`) }
  }
}

// ── (5) mutantes: aplicados (prova por texto) e vermelhos ────────────────────────────────────────────────────────────
console.log('== (5) mutantes ==')
const MUTANTES = [
  ['negação ignorada no look', 'lib/cinematic/sceneStyle.ts', 'return src.replace(JANELA_NEGADA_RE, (janela: string) =>', 'return src || src.replace(JANELA_NEGADA_RE, (janela: string) =>'],
  ['romance não força fotorreal', 'lib/cinematic/sceneStyle.ts', "if (anchor.look === 'photoreal' || anchor.look === 'noir') return anchor", 'return anchor'],
  ['sem sufixo de adultos', 'lib/cinematic/romanceGuard.ts', 'if (!p.includes(ROMANCE_ADULT_SUFFIX)) p = ', 'if (false) p = '],
  ['idade jovem não é trocada', 'lib/cinematic/romanceGuard.ts', 'for (const [re, para] of TROCAS_ADULTO) {', 'for (const [re, para] of TROCAS_ADULTO.slice(0, 0)) {'],
  ['detector de romance desligado', 'lib/cinematic/romanceGuard.ts', 'if (!ehRomance) return INATIVO', 'return INATIVO'],
  ['sem elenco fixo', 'lib/cinematic/romanceGuard.ts', 'if (!p.includes(elenco)) p = `${elenco} ${p}`', 'void elenco'],
  ['"two individuals" fica', 'lib/cinematic/romanceGuard.ts', 'p = p.replace(PAR_GENERICO_RE, (m) => maiuscula(m, r.parFrase))', 'void PAR_GENERICO_RE'],
  ['negative sem termos de menor', 'lib/cinematic/romanceGuard.ts', 'if (!faltam.length) return atual', 'return atual'],
  ['moderação lê o nosso sufixo', 'lib/cinematic/romanceGuard.ts', "return prompts.map((p) => (p || '').split(ROMANCE_ADULT_SUFFIX).join('')).join('\\n')", "return prompts.join('\\n')"],
  ['still ignora adultSuffix', 'lib/hollywood/anchors.ts', 'const scene = adulto && !cena.includes(adulto)', 'const scene = false && !cena.includes(adulto)'],
  ['apagão de pessoa volta a deixar "of and"', 'lib/cinematic/visualPromptPolicy.ts', 'if (!texto.includes(PESSOA_APAGADA)) return texto', 'return texto.split(PESSOA_APAGADA).join(\' \')'],
  ['ERA_YEAR_RE da base (resolução vira ano)', ROTA, 'const ERA_YEAR_RE = /(?<![×✕*xX]\\s{0,2})\\b(?:1[0-8][0-9]{2}|19[0-3][0-9])\\b(?!\\s{0,2}(?:[×✕*xX]\\s{0,2}\\d|p\\b|px\\b|pixels?\\b|fps\\b|hz\\b))/', 'const ERA_YEAR_RE = /\\b1[0-8][0-9]{2}\\b|\\b19[0-3][0-9]\\b/'],
  ['limpeza de resolução desligada', ROTA, ".slice(0, 4000).replace(RESOLUCAO_NO_PEDIDO_RE, ' ')", '.slice(0, 4000)'],
  ['rota: romance não vira character_story', ROTA, "if (romanceAdulto.ativo && !tagFacelessPresente && formatoVisual.modo === 'documentary_faceless') Object.assign(formatoVisual, { modo: 'character_story'", "if (false) Object.assign(formatoVisual, { modo: 'character_story'"],
  ['rota: look volta a ler o plano do GPT', ROTA, '      prompt, // KINEO-ROMANCE-ADULTO-2026-10-13 — o look vem SÓ', "      `${prompt} ${planScenes.map((s) => s.brollPrompt || '').join(' ')}`, // KINEO-ROMANCE-ADULTO-2026-10-13 — o look vem SÓ"],
  ['rota: prompts finais sem romance', ROTA, '.map((promptDaCena) => (romanceAdulto.ativo ? aplicarRomanceAdulto(promptDaCena, romanceAdulto) : promptDaCena))', '.map((promptDaCena) => promptDaCena)'],
  ['rota: negative sem romance', ROTA, 'input.negative_prompt = negativoRomanceAdulto(input.negative_prompt)', 'void negativoRomanceAdulto'],
  ['rota: still sem adultSuffix', ROTA, '...(romanceAdulto.ativo ? { adultSuffix: ROMANCE_ADULT_SUFFIX } : {}),', ''],
  ['rota: moderação removida', ROTA, "const moderacaoRomance = await moderateContent({ surface: 'clip'", "const moderacaoRomance = { ok: true } as const; void ({ surface: 'clip'"],
]
let mortos = 0
for (const [nome, arquivo, de, para] of MUTANTES) {
  const original = rd(arquivo)
  const aplicado = original.includes(de) && original.split(de).join(para) !== original
  if (!aplicado) { falhas.push(`mutante NÃO aplicou: ${nome}`); console.log('  FALHA mutante não aplicou:', nome); continue }
  // vermelho = uma ASSERÇÃO falhou (exceção de carregamento não conta como prova: o mutante tem de carregar e rodar)
  let quebras
  try {
    const Mm = carregar((rel, txt) => (rel === arquivo ? txt.split(de).join(para) : txt))
    quebras = avalia(Mm, MB, false)
  } catch (e) { falhas.push(`mutante não carregou: ${nome}`); console.log('  FALHA mutante não carregou:', nome, '-', e instanceof Error ? e.message : e); continue }
  if (quebras.length) { mortos++; console.log(`  ok   mutante vermelho: ${nome} (${quebras.length}; 1ª: ${quebras[0]})`) } else { falhas.push(`mutante sobreviveu: ${nome}`); console.log('  FALHA mutante sobreviveu:', nome) }
}

console.log(`\n${falhas.length ? 'FALHOU' : 'PASSOU'} — ${mortos}/${MUTANTES.length} mutantes vermelhos${falhas.length ? `; falhas: ${falhas.join(' | ')}` : ''}`)
process.exit(falhas.length ? 1 : 0)
