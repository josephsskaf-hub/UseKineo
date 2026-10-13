// KINEO-MONUMENTO-2026-10-13 — guardião do conserto "monumento real vira lugar genérico".
//
// Caso real: parceiro Logan, 11/10 21:16 UTC, Seedance 1.5, 60 s (render 608449fe, geração 4f78e504). Pedido: "drone
// tour of the Palace of Versailles". O filme saiu com templos asiáticos e skyline moderno. O evento
// cinematic_dispatch_result daquela geração gravou `setting_scrubbed`: "cena 2: Hall", "cena 3: King's | Grand |
// Apartments", "cena 4: Queen's | Apartments", "cena 5: Apollo | Fountain", "cena 6: Orangerie", "cena 7: Grand | Canal"
// — o filtro anti-invenção (scrubInventedSetting, contexto = só o pedido) apagou os sub-lugares VERDADEIROS e a cena 7
// subiu como "Wide establishing shot, reflecting the evening sky, with boats gently floating." (sem lugar nenhum).
// A fala também foi mutilada: "With its 357 mirrors, was the site of the of Versailles, ending I."
//
// Este guardião EXECUTA as libs reais (offline, $0, nenhum fornecedor): monumentoReal, scrubInventedSetting,
// removerDatasInventadas, buildClassicVisualPrompt e detectShotSpec, na ordem do caminho clássico da rota
// (fala → cenas → supervisor → âncora → prompt final → verificação), e prova:
//   (1) 5 monumentos (Versailles, Eiffel, Machu Picchu, Taj Mahal, Cristo Redentor): o nome está no prompt final de
//       TODAS as cenas, com descritor e negativo; os sub-lugares verdadeiros não são mais apagados;
//   (2) mistério sem lugar real: fala e prompts finais IDÊNTICOS (byte a byte) ao caminho de antes;
//   (3) "drone tour"/Style:/Camera: sobre lugar real deixa de ser recusado como plano e vira filme narrado em modo IA;
//       plano de clipe sem lugar segue recusado como antes;
//   (4) a rota está ligada nesses pontos, na ordem certa.
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ', n) } else { falhas.push(n); console.log('  FALHA', n) } }

const load = createOfflineLoader({})
const M = load('@/lib/cinematic/monumentoReal')
const P = load('@/lib/cinematic/visualPromptPolicy')
const F = load('@/lib/hollywood/fidelidade')
const S = load('@/lib/cinematic/sceneStyle')
const SH = load('@/lib/cinematic/shotSpec')

// ── O caminho clássico da rota, na mesma ordem (app/api/generate-video-cinematic/route.ts) ──
// antes = contexto só do pedido e nenhuma âncora (o código de 11/10); depois = o conserto.
function caminhoClassico(pedido, cenas, conserto) {
  const ctx = (t) => (conserto ? M.comVocabularioDoLugar(t) : t)
  // KINEO-FALA-CLASSICA-FIEL: a fala do escritor passa pelas datas e pelo scrub, contexto = o pedido
  const falas = cenas.map((c) => {
    const r = F.removerDatasInventadas(c.fala, ctx(pedido))
    const r2 = P.scrubInventedSetting(r.texto, ctx(pedido))
    return r2.removed.length ? r2.text : r.texto
  })
  // KINEO-VIGIA-CENARIO: os planos passam pelo scrub com a história (pedido + falas)
  const historia = ctx(`${pedido} ${falas.join(' ')}`)
  const removidos = []
  let visuais = cenas.map((c, i) => { const r = P.scrubInventedSetting(c.visual, historia); if (r.removed.length) removidos.push(`cena ${i + 1}: ${r.removed.join(' | ')}`); return r.text })
  // âncora do lugar (só no conserto) — depois do supervisor fala×imagem, antes do prompt final
  const lugar = conserto ? M.lugarPrincipal(pedido) : null
  if (lugar) visuais = visuais.map((v) => M.ancorarLugarNoPrompt(v, lugar))
  const style = S.deriveStyleAnchor(`${pedido} ${falas.join(' ')}`)
  const finais = visuais.map((v, i) => P.buildClassicVisualPrompt(v, { mode: 'documentary_faceless', style, aspect: '9:16', eraSuffix: '', opening: i === 0 }))
  // verificação em código (a mesma da rota): cena sem o nome ganha a âncora de novo
  const reparadas = []
  if (lugar) finais.forEach((p, i) => { if (!M.promptTemOLugar(p, lugar)) { finais[i] = `${M.ancoraDoLugar(lugar)} ${p}`; reparadas.push(i + 1) } })
  return { falas, visuais, finais, removidos, lugar, reparadas }
}

// ═══ (0) o caso do Logan, reconstruído a partir do que a produção gravou ═══
console.log('== (0) caso real 608449fe — Versailles ==')
const PEDIDO_LOGAN = 'Experience a breathtaking drone tour of the Palace of Versailles, soaring through opulent halls and lush gardens, narrated with captivating historical insights that bring the grandeur of this iconic site to life.'
// Falas e planos ANTES do scrub: reconstrução — onde a produção gravou o buraco ("the of Versailles", "Apollo | Fountain"),
// recolocamos o nome que o setting_scrubbed listou. As partes que sobreviveram são as gravadas, palavra por palavra.
const CENAS_LOGAN = [
  { fala: 'The Palace of Versailles, completed in 1710, stands as a symbol of opulence and the absolute monarchy of Louis XIV.', visual: 'A close-up view showcasing the ornate gold detailing and intricate frescoes on the ceiling of the Palace of Versailles, highlighting the opulence and artistry that defines this historical monument.' },
  { fala: 'The Hall of Mirrors, with its 357 mirrors, was the site of the Treaty of Versailles, ending World War I.', visual: 'Aerial drone footage gliding over the Hall of Mirrors, showcasing the 357 mirrors reflecting light and grandeur.' },
  { fala: "Louis XIV's King's Grand Apartments were meticulously designed to impress visitors, with each individual room dedicated to a different deity.", visual: "Medium shot of the King's Grand Apartments, showcasing opulent furnishings and divine-themed decor." },
  { fala: "The Queen's Apartments feature exquisite tapestries that were intricately handwoven during the 17th century.", visual: "Close-up macro of a detailed tapestry in the Queen's Apartments, highlighting the craftsmanship and vibrant colors. Intimate and detailed." },
  { fala: "Inspired by the revered Sun God, the Apollo Fountain reflects Louis XIV's persona as the 'Sun King'.", visual: 'Low angle shot of the Apollo Fountain, water cascading in the sunlight, surrounded by meticulously manicured gardens. Serene and majestic.' },
  { fala: 'Boasting an impressive collection of 1,055 trees, the Orangerie stands as a testament to the horticultural prowess of Versailles.', visual: 'POV shot walking through the Orangerie, lush citrus trees and symmetrical paths under the bright afternoon sun. Inviting and vivid.' },
  { fala: "Stretching an impressive 1,670 meters, the Grand Canal served as the centerpiece of Versailles' gardens.", visual: 'Wide establishing shot of the Grand Canal, reflecting the evening sky, with boats gently floating. Peaceful and reflective.' },
]
{
  const antes = caminhoClassico(PEDIDO_LOGAN, CENAS_LOGAN, false)
  checa('ANTES reproduz o defeito: cena 7 sai sem lugar nenhum (o texto que a produção gravou)', antes.visuais[6] === 'Wide establishing shot, reflecting the evening sky, with boats gently floating. Peaceful and reflective.')
  checa('ANTES reproduz o defeito: setting_scrubbed traz "Apollo | Fountain" e "Grand | Canal"', antes.removidos.some((r) => /Apollo \| Fountain/.test(r)) && antes.removidos.some((r) => /Grand \| Canal/.test(r)))
  checa('ANTES reproduz o defeito: a fala perde "Hall of Mirrors"/"Treaty"/"World War"', !/Treaty/.test(antes.falas[1]) && !/World War/.test(antes.falas[1]))
  checa('ANTES: só 2 de 7 prompts finais dizem Versailles', antes.finais.filter((p) => /versailles/i.test(p)).length <= 3)
  const depois = caminhoClassico(PEDIDO_LOGAN, CENAS_LOGAN, true)
  checa('DEPOIS: lugar curado = the Palace of Versailles', depois.lugar?.id === 'versailles' && depois.lugar.curado === true)
  checa('DEPOIS: a fala fica inteira (Hall of Mirrors, Treaty of Versailles, World War I, 1710, Apollo Fountain, Orangerie, Grand Canal)', depois.falas[1] === CENAS_LOGAN[1].fala && depois.falas[0] === CENAS_LOGAN[0].fala && depois.falas[4] === CENAS_LOGAN[4].fala && depois.falas[5] === CENAS_LOGAN[5].fala && depois.falas[6] === CENAS_LOGAN[6].fala)
  checa('DEPOIS: nenhum sub-lugar verdadeiro é apagado dos planos (setting_scrubbed vazio)', depois.removidos.length === 0)
  checa('DEPOIS: 7 de 7 prompts finais dizem "Palace of Versailles, France"', depois.finais.every((p) => p.includes('Setting: the Palace of Versailles, France')))
  checa('DEPOIS: descritor verdadeiro e negativo em toda cena', depois.finais.every((p) => p.includes('formal geometric French gardens') && p.includes('No Asian temples or pagodas, no modern skyscrapers or city skyline')))
  checa('DEPOIS: a cena 7 mostra o Grand Canal DE Versailles', /Setting: the Palace of Versailles[^]*Grand Canal/.test(depois.finais[6]))
  checa('DEPOIS: a abertura continua sendo a 1ª coisa do prompt da cena 1 (Opening shot: …) e o lugar vem logo depois', depois.finais[0].startsWith('Opening shot:') && depois.finais[0].indexOf('Setting: the Palace of Versailles') < 200)
  checa('DEPOIS: nenhuma cena precisou do reparo da verificação (a âncora sobreviveu ao prompt final)', depois.reparadas.length === 0)
  // os prompts que a PRODUÇÃO mandou (já mutilados) também ganham o lugar
  const enviados = ['Low angle shot, water cascading in the sunlight, surrounded by meticulously manicured gardens. Serene and majestic.', 'Wide establishing shot, reflecting the evening sky, with boats gently floating. Peaceful and reflective.']
  checa('até o plano já mutilado da produção ganha o lugar', enviados.every((v) => M.ancorarLugarNoPrompt(v, depois.lugar).startsWith('Setting: the Palace of Versailles, France (')))
  checa('âncora é idempotente', M.ancorarLugarNoPrompt(M.ancorarLugarNoPrompt('Wide shot.', depois.lugar), depois.lugar) === M.ancorarLugarNoPrompt('Wide shot.', depois.lugar))
}

// ═══ (1) cinco monumentos que o público reconhece ═══
console.log('== (1) cinco monumentos ==')
const CASOS = [
  { id: 'versailles', pedido: 'Drone tour of the Palace of Versailles', chave: 'Palace of Versailles', neg: /no Asian temples/i,
    cenas: [{ fala: 'Louis XIV moved his court here in 1682.', visual: 'Aerial drone shot over the gilded gates at sunrise.' }, { fala: 'The Hall of Mirrors holds 357 mirrors.', visual: 'Slow glide through the Hall of Mirrors.' }, { fala: 'The Apollo Fountain faces the Grand Canal.', visual: 'Low angle of the Apollo Fountain with the Grand Canal behind.' }] },
  { id: 'eiffel', pedido: 'The secret history of the Eiffel Tower', chave: 'Eiffel Tower', neg: /no other tower in its place/i,
    cenas: [{ fala: 'Gustave Eiffel built it for the 1889 World\'s Fair.', visual: 'Wide shot of the iron tower against a pale sky.' }, { fala: 'Parisians hated it at first.', visual: 'Close-up of riveted iron beams.' }, { fala: 'From the Trocadéro it still steals the skyline.', visual: 'Evening view from the Trocadéro gardens.' }] },
  { id: 'machu-picchu', pedido: 'Machu Picchu: how the Incas built a city in the clouds', chave: 'Machu Picchu', neg: /no Egyptian pyramids/i,
    cenas: [{ fala: 'Pachacuti ordered it built around 1450.', visual: 'Drone shot rising over stone terraces in morning mist.' }, { fala: 'Hiram Bingham reached it in 1911.', visual: 'Close-up of precisely fitted granite blocks.' }, { fala: 'Huayna Picchu stands guard above it.', visual: 'Wide shot of Huayna Picchu above the clouds.' }] },
  { id: 'taj-mahal', pedido: 'Why Shah Jahan built the Taj Mahal', chave: 'Taj Mahal', neg: /no Chinese pagodas/i,
    cenas: [{ fala: 'Shah Jahan built it for Mumtaz Mahal in 1632.', visual: 'Symmetrical wide shot of the white dome at dawn.' }, { fala: 'The Yamuna river flows behind it.', visual: 'Side view along the riverbank.' }, { fala: 'Its marble changes color through the day.', visual: 'Close-up of inlaid marble flowers.' }] },
  { id: 'cristo-redentor', pedido: 'Cristo Redentor: a estátua que vigia o Rio de Janeiro', chave: 'Christ the Redeemer', neg: /no other statue in its place/i,
    cenas: [{ fala: 'Paul Landowski sculpted the face in 1926.', visual: 'Aerial shot circling the statue above the clouds.' }, { fala: 'It was inaugurated in 1931 atop Corcovado.', visual: 'Low angle of the outstretched arms at sunset.' }, { fala: 'Below lies Guanabara Bay and Sugarloaf Mountain.', visual: 'Wide view over the bay and the city lights.' }] },
]
for (const c of CASOS) {
  const r = caminhoClassico(c.pedido, c.cenas, true)
  checa(`${c.id}: lugar curado detectado no pedido`, r.lugar?.id === c.id && r.lugar.curado === true)
  checa(`${c.id}: o nome está no prompt final de TODAS as ${c.cenas.length} cenas`, r.finais.length === c.cenas.length && r.finais.every((p) => p.includes(c.chave)))
  checa(`${c.id}: 1–2 descritores visuais e o negativo em toda cena`, r.lugar.descritores.length >= 1 && r.lugar.descritores.length <= 2 && r.finais.every((p) => p.includes(r.lugar.descritores[0]) && c.neg.test(p)))
  checa(`${c.id}: nenhum nome/ano verdadeiro apagado da fala nem dos planos`, r.falas.every((f, i) => f === c.cenas[i].fala) && r.removidos.length === 0)
  checa(`${c.id}: verificação em código não precisou reparar`, r.reparadas.length === 0)
}

// ═══ (2) mistério / atmosfera sem lugar real: NADA muda ═══
console.log('== (2) mistério sem lugar — inalterado ==')
const MISTERIO = 'At 3:17 AM a lighthouse keeper hears three knocks on a door that opens onto the sea. Nobody is ever outside.'
const CENAS_MISTERIO = [
  { fala: 'Every night at 3:17 AM, three knocks.', visual: 'Dark spiral staircase lit by a swinging lantern, fog outside the window.' },
  { fala: 'In 1910 the old keeper vanished, near the Amityville House.', visual: 'A 1910 Victorian farmhouse near the Amityville House, rain on the glass.' },
  { fala: 'Tonight, the knocks come from inside.', visual: 'Close-up of a wooden door trembling, water seeping beneath it.' },
]
{
  const antes = caminhoClassico(MISTERIO, CENAS_MISTERIO, false)
  const depois = caminhoClassico(MISTERIO, CENAS_MISTERIO, true)
  checa('mistério: nenhum lugar real detectado', M.lugarPrincipal(MISTERIO) === null)
  checa('mistério: contexto dos filtros volta a MESMA string', M.comVocabularioDoLugar(MISTERIO) === MISTERIO)
  checa('mistério: âncora devolve o plano intacto', M.ancorarLugarNoPrompt(CENAS_MISTERIO[0].visual, null) === CENAS_MISTERIO[0].visual)
  checa('mistério: falas byte a byte iguais às de antes', JSON.stringify(antes.falas) === JSON.stringify(depois.falas))
  checa('mistério: prompts finais byte a byte iguais aos de antes', JSON.stringify(antes.finais) === JSON.stringify(depois.finais))
  checa('mistério: o filtro anti-invenção segue vivo (Amityville e 1910 inventados continuam saindo)', depois.removidos.length > 0 && !depois.finais.some((p) => /Amityville|1910/.test(p)))
}
// Tratado não é palácio; "pisa" é verbo; Notre Dame time não é catedral; Petra pessoa não é cidade
checa('"Treaty of Versailles" (aula de história) não ancora o palácio', M.lugarPrincipal('How the Treaty of Versailles set the stage for World War II') === null)
checa('"pisa" (verbo em português) não ancora a torre', M.lugarPrincipal('Ela pisa devagar no assoalho da casa abandonada e ouve um sussurro') === null)
checa('Notre Dame (futebol universitário) não ancora a catedral', M.lugarPrincipal('Notre Dame football: the greatest comeback in college history') === null)
checa('Petra (pessoa) não ancora a cidade da Jordânia', M.lugarPrincipal('Petra opened the letter and froze') === null)
checa('lugar fora da lista pelo formato ("Bran Castle") vira âncora só com o nome, sem descritor inventado', (() => { const l = M.lugarPrincipal('Drone tour of Bran Castle in Transylvania'); return l && l.curado === false && l.nome === 'Bran Castle' && l.descritores.length === 0 && M.ancorarLugarNoPrompt('Wide shot at dusk.', l).startsWith('Setting: Bran Castle (the real, recognizable landmark') })())
checa('cenário de conto ("the old castle") não é lugar real', M.lugarPrincipal('A girl finds a key in the old castle library') === null)

// ═══ (3) "drone tour" / plano com Style:/Camera: sobre lugar real vira filme narrado ═══
console.log('== (3) plano sobre lugar real → filme narrado ==')
const PLANO_LOGAN = [
  'Create a 60-second cinematic drone tour of the Palace of Versailles for YouTube Shorts.',
  'Style: cinematic, golden hour, warm baroque tones',
  'Camera: slow FPV drone glides through the Hall of Mirrors and over the gardens',
  'Narrate the history: Louis XIV, the Hall of Mirrors, the Treaty of Versailles, the Grand Canal.',
].join('\n')
{
  const shot = SH.detectShotSpec(PLANO_LOGAN)
  checa('o pedido do Logan (Style:/Camera:) é o que o detector chama de plano (keyed_shot_spec) — reproduz a recusa', shot.isShotSpec && shot.reason === 'keyed_shot_spec' && shot.keys.join(',') === 'style,camera')
  const lugar = M.lugarPrincipal(PLANO_LOGAN)
  const virou = M.pedidoDeTourNarrado(PLANO_LOGAN, lugar)
  checa('reescrito: deixa de ser plano', SH.detectShotSpec(virou).isShotSpec === false)
  checa('reescrito: abre com o lugar real e pede filme narrado', virou.startsWith('The story of the Palace of Versailles, France, told as a narrated cinematic tour of the real place.'))
  checa('reescrito: a direção visual da pessoa fica (sem os dois-pontos de plano)', /Visual direction — style cinematic, golden hour, warm baroque tones; camera slow FPV drone glides/.test(virou) && !/^\s*(?:style|camera)\s*:/im.test(virou))
  checa('reescrito: as instruções de narração da pessoa ficam', virou.includes('Narrate the history: Louis XIV, the Hall of Mirrors, the Treaty of Versailles, the Grand Canal.'))
  const curto = 'Drone shot of the Eiffel Tower at sunset'
  checa('"Drone shot of the Eiffel Tower" (linguagem de câmera) era recusado e passa reescrito', SH.detectShotSpec(curto).isShotSpec && !SH.detectShotSpec(M.pedidoDeTourNarrado(curto, M.lugarPrincipal(curto))).isShotSpec)
  checa('"Drone tour of the Palace of Versailles" nunca foi plano (passa direto, sem reescrita)', SH.detectShotSpec('Drone tour of the Palace of Versailles').isShotSpec === false)
  const semLugar = 'Shot: 10 seconds\nCamera: slow dolly in\nAction: a samurai draws his sword in the rain'
  checa('plano de clipe SEM lugar real segue plano (a rota continua recusando)', SH.detectShotSpec(semLugar).isShotSpec && M.lugarPrincipal(semLugar) === null)
}

// ═══ (4) a rota está ligada ═══
console.log('== (4) rota ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
const MARCA = 'KINEO-MONUMENTO-2026-10-13'
checa('import do módulo', /import \{ ancoraDoLugar, ancorarLugarNoPrompt, comVocabularioDoLugar, lugarPrincipal, pedidoDeTourNarrado, promptTemOLugar \} from '@\/lib\/cinematic\/monumentoReal' \/\/ KINEO-MONUMENTO-2026-10-13/.test(rt))
const iLugar = rt.indexOf('const lugarDoPedido = lugarPrincipal(prompt)')
const iAdmite = rt.indexOf('if (lugarDoPedido && detectShotSpec(prompt).isShotSpec) {')
const iTres = rt.indexOf('// ═══ KINEO-TRES-MODOS-2026-09-11 — PLANO COLADO NÃO VIRA NARRAÇÃO')
checa('lugar do pedido calculado e o plano sobre lugar real reescrito ANTES da recusa de plano', iLugar > 0 && iAdmite > iLugar && iTres > iAdmite)
const blocoAdmite = rt.slice(iAdmite, iTres)
checa('o plano admitido vira modo IA (a narradora nunca lê o plano) e vira evento', blocoAdmite.includes('prompt = pedidoDeTourNarrado(prompt, lugarDoPedido)') && blocoAdmite.includes("body.script_mode = 'ai'") && blocoAdmite.includes("name: 'shot_spec_place_admitted'"))
checa('fala clássica: datas e nomes contra o pedido + vocabulário do lugar', rt.includes(`const contextoFalaClassica = comVocabularioDoLugar(prompt) // ${MARCA}`) && rt.includes(`const r = removerDatasInventadas(sc.voiceover, contextoFalaClassica) // ${MARCA}`) && rt.includes(`const r2 = scrubInventedSetting(r.texto, contextoFalaClassica) // ${MARCA}`))
checa('fala hollywood (varredura final): mesmo vocabulário', rt.includes(`const contextoDatas = comVocabularioDoLugar(prompt) // ${MARCA}`))
checa('planos clássicos: história com vocabulário (scrub e supervisor)', rt.includes(`const historia = comVocabularioDoLugar(\`\${prompt} \${scenes.map((s) => s.voiceover ?? '').join(' ')}\`) // ${MARCA}`) && rt.includes(`const historiaAlinhada = comVocabularioDoLugar(\`\${prompt} \${scenes.map((sc) => sc.voiceover ?? '').join(' ')}\`) // ${MARCA}`))
const iAlinha = rt.indexOf("console.warn('[fala-x-imagem] falhou, planos originais seguem:'")
const iAncora = rt.indexOf('scenes[i].aiPrompt = ancorarLugarNoPrompt(')
const iPrompts = rt.indexOf('const classicScenePrompts = scenes.map((scene, sceneIndex) => {')
checa('âncora entra DEPOIS do supervisor fala×imagem e ANTES do prompt final (still e clipe usam o mesmo vetor)', iAlinha > 0 && iAncora > iAlinha && iPrompts > iAncora)
const iVeo = rt.indexOf('if (wantsVeo) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = veoApplyShotAxis(classicScenePrompts[i], i)')
const iVerif = rt.indexOf('if (!promptTemOLugar(classicScenePrompts[i], lugarDoPedido))')
const iDry = rt.indexOf('// ═══ KINEO-DRYRUN-CLASSICO-2026-09-12')
checa('verificação em código depois do último toque no prompt (eixo do Veo) e antes do dry-run e de qualquer still/POST', iVeo > 0 && iVerif > iVeo && iDry > iVerif)
checa('o dry-run devolve o relato do lugar (cenas com o nome / reparadas)', rt.includes(`...(monumentoRelato ? { monumento: monumentoRelato } : {}), // ${MARCA}`))
checa('o despacho pago grava o relato (cinematic_dispatch_result.monument)', rt.includes(`monument: ctx.monumento ?? null, // ${MARCA}`) && rt.includes(`ctxDespacho().monumento = monumentoRelato // ${MARCA}`))
// ── os trechos da ROTA executados de verdade (extraídos do arquivo, transpilados, rodados com as libs reais) ──
{
  const vm = await import('node:vm')
  const ts = (await import('typescript')).default
  const exec = (src, ctx) => { const js = ts.transpileModule(src, { compilerOptions: { target: 9, module: 99 } }).outputText; vm.runInNewContext(js, ctx); return ctx }
  const linhaAncora = rt.split('\n').find((l) => l.trimStart().startsWith('if (lugarDoPedido) for (let i = 0; i < scenes.length; i++) scenes[i].aiPrompt'))
  const lugarV = M.lugarPrincipal(PEDIDO_LOGAN)
  const cenasR = [{ aiPrompt: 'Wide establishing shot, reflecting the evening sky, with boats gently floating. Peaceful and reflective.' }, { description: 'Close-up macro of a detailed tapestry.' }]
  if (linhaAncora) exec(linhaAncora, { scenes: cenasR, lugarDoPedido: lugarV, ancorarLugarNoPrompt: M.ancorarLugarNoPrompt })
  checa('rota (linha real): toda cena ganha o lugar, inclusive a que só tinha description', Boolean(linhaAncora) && cenasR.every((s) => typeof s.aiPrompt === 'string' && s.aiPrompt.startsWith('Setting: the Palace of Versailles, France')))
  const cenasM = [{ aiPrompt: 'Dark spiral staircase lit by a swinging lantern.' }]
  if (linhaAncora) exec(linhaAncora, { scenes: cenasM, lugarDoPedido: null, ancorarLugarNoPrompt: M.ancorarLugarNoPrompt })
  checa('rota (linha real): sem lugar, o plano fica byte a byte', cenasM[0].aiPrompt === 'Dark spiral staircase lit by a swinging lantern.')
  const iV0 = rt.indexOf('    let monumentoRelato: ')
  const iV1 = rt.indexOf('    } // KINEO-MONUMENTO-2026-10-13\n', iV0)
  const blocoV = iV0 > 0 && iV1 > iV0 ? rt.slice(iV0, iV1 + '    } // KINEO-MONUMENTO-2026-10-13\n'.length) : ''
  const despacho = {}
  const prompts = ['Opening shot: the Palace of Versailles at dawn', 'A gilded hall, soft light']
  if (blocoV) exec(blocoV + '\nglobalThis.__r = monumentoRelato', { classicScenePrompts: prompts, lugarDoPedido: lugarV, promptTemOLugar: M.promptTemOLugar, ancoraDoLugar: M.ancoraDoLugar, ctxDespacho: () => despacho, console: { log() {} }, globalThis: {} })
  checa('rota (bloco real): a verificação repara a cena sem o nome e relata 2/2 com reparada = cena 2', Boolean(blocoV) && prompts[1].startsWith('Setting: the Palace of Versailles') && despacho.monumento?.com_nome === 2 && JSON.stringify(despacho.monumento?.reparadas) === '[2]')
  const iA1 = rt.indexOf('    } // KINEO-MONUMENTO-2026-10-13\n', iAdmite)
  const blocoA = iAdmite > 0 && iA1 > iAdmite ? rt.slice(iAdmite, iA1 + '    } // KINEO-MONUMENTO-2026-10-13\n'.length) : ''
  const eventos = []
  const ctxA = { prompt: PLANO_LOGAN, body: { script_mode: 'verbatim' }, user: { id: 'u' }, lugarDoPedido: M.lugarPrincipal(PLANO_LOGAN), detectShotSpec: SH.detectShotSpec, pedidoDeTourNarrado: M.pedidoDeTourNarrado, writeServerEvent: (e) => { eventos.push(e); return Promise.resolve(true) } }
  if (blocoA) exec(`let prompt = ${JSON.stringify(PLANO_LOGAN)};\n` + blocoA + '\nglobalThis.__p = prompt', Object.assign(ctxA, { globalThis: ctxA }))
  checa('rota (bloco real): o pedido do Logan vira filme narrado em modo IA, sem ser plano, com evento', Boolean(blocoA) && ctxA.__p.startsWith('The story of the Palace of Versailles') && !SH.detectShotSpec(ctxA.__p).isShotSpec && ctxA.body.script_mode === 'ai' && eventos[0]?.name === 'shot_spec_place_admitted')
}
// o resto do arquivo não mudou: toda linha nova/alterada desta leva leva a marca
{
  const linhasMarcadas = rt.split('\n').filter((l) => l.includes(MARCA)).length
  checa('linhas marcadas existem (a leva é auditável por grep)', linhasMarcadas >= 12)
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { for (const f of falhas) console.log(' - ' + f); process.exit(1) }
