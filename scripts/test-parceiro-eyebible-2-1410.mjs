#!/usr/bin/env node
// ═══ KINEO-PARCEIRO-EYEBIBLE-2-1410 [TRAVA 8.2 — vai do fundador 14/10 "consertar urgente"] ═══════════════════════════════
//
// 2ª leva do filme do parceiro Robert/EyeBible (Seedance 1.5, 16:9, render c9844e94, claim ae790777, 14/10 14:08 UTC). A 1ª
// leva (3476f1a8) consertou rótulo de fala, trilha de guerra, legenda 16:9, formato de drama, corte na frase e duração do
// compose. Ficaram abertos, e este guardião prova os consertos com o roteiro REAL dele:
//   1. NICHO POR PREFIXO — detectNiche casava "\bbroke" em "broken stone wall" → nicho money → voz finance-authority e trilha
//      hustle. Medido em 30 d (337 filmes de contas externas): 90 com acerto só de prefixo, 49 (14,5%) com o nicho TROCADO
//      (ai→air 15, app→appear/approach 30+, illuminati→illuminating 7, broke→broken 5, invest→investigation 6).
//   2. "energetic" EM TODA CENA DE GUERRA — o globalStyle.mood do plano de b-roll (o cliente pede sempre 'energetic') ia
//      para o styleSuffix de todos os prompts. Tom grave (guerra/luto/mistério, o classificador da trilha) troca o adjetivo.
//   3. CAPITÃO COM OUTRO ROSTO A CADA CENA — sem ficha do autor, nenhuma continuidade. Elenco fixo dos papéis que falam.
//   4. EXPORT LIMPO com a duração do seletor (60) e não a assinada (35) — /api/compose/unlock lê o claim do nascimento.
// Executa os módulos reais (transpilados, sem rede, sem custo) e prova que, desfeito o conserto
// (scripts/test-support/desfaz-parceiro-eyebible-2-1410.mjs), cada arquivo é EXATAMENTE o pai do commit (3476f1a8).
// Rodar: node scripts/test-parceiro-eyebible-2-1410.mjs

import { readFileSync } from 'node:fs'
import { desfazAncoraLegenda1410 } from './test-support/desfaz-ancora-legenda-1410.mjs' // reancorado KINEO-ANCORA-LEGENDA-1410 [TRAVA 8.2 — vai do fundador 14/10]: Seedance com still em todas as cenas + legenda 9:16 centralizada saem em memória antes do byte a byte
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semParceiroEyebible2_1410, ARQUIVOS_PARCEIRO_EYEBIBLE_2_1410, FORMA_PARCEIRO_EYEBIBLE_2_1410, MARCA_PARCEIRO_EYEBIBLE_2_1410 } from './test-support/desfaz-parceiro-eyebible-2-1410.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = '3476f1a80a2ec69524fb7bc442f970830127fb40' // pai do primeiro commit marcado (origin/main de 14/10, 1ª leva do Robert)
process.chdir(RAIZ)

const lf = (s) => String(s).replace(/\r\n/g, '\n')
const lerDisco = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))

// O roteiro REAL do Robert (história de ficção, sem dado pessoal) — o mesmo de scripts/test-parceiro-eyebible-1410.mjs.
const ROBERT = [
  'Two soldiers hide behind a broken stone wall. Arrows strike the ground around them.', '',
  'Across the battlefield, their wounded friend lies beside a fallen shield.', '',
  'YOUNG SOLDIER: “He’s still alive!”', '',
  'The captain looks over the wall. Enemy soldiers are getting closer.', '',
  'CAPTAIN: “Help me carry him.”', '',
  'They run to their friend and lift him between them.', '',
  'WOUNDED SOLDIER: “I can’t walk.”', '',
  'CAPTAIN: “We’ve got you.”', '',
  'An arrow strikes the captain’s shield. They keep moving.', '',
  'Their men pull them behind the wall. All three fall to the ground, breathing hard.', '',
  'YOUNG SOLDIER: “That was a terrible plan.”', '',
  'The captain looks at their friend, safe beside them.', '',
  'CAPTAIN: “It worked.”',
].join('\n')
// As 7 descrições de cena que a camada visual (GPT) escreveu para o filme dele — `scene_prompts` do claim ae790777, sem o sufixo.
const VISUAIS = [
  'A close-up shot of two soldiers crouched behind a crumbling stone wall, their faces showing determination and fear as they peer over the edge, scanning the battlefield for danger.',
  'A medium shot shows the wounded soldier lying beside a fallen shield on the battlefield, arrows striking the ground nearby, evoking urgency and chaos.',
  'A close-up shot of the captain looking over the broken stone wall, his expression tense as enemy soldiers advance in the background.',
  'A medium shot shows the young soldier and captain running towards the wounded soldier, lifting him between them as they struggle to move.',
  "A close-up shot of the captain's shield as an arrow strikes it, the captain and young soldier visible in the background, continuing to move.",
  'A medium shot shows all three soldiers collapsing behind the broken stone wall, breathing hard, with expressions of exhaustion and relief.',
  'A medium shot captures the captain looking at the wounded soldier beside them, both safe behind the wall, as the young soldier expresses concern.',
]
const MOOD_DO_CLIENTE = { mood: 'energetic', lighting: 'natural', cameraStyle: 'documentary' } // o globalStyle que o /generate mandou

/** Roda TODAS as verificações de comportamento sobre a árvore transformada por `mutar(caminho, texto)`; devolve as falhas. */
function avaliar(mutar, verboso) {
  let falhas = 0
  let total = 0
  const checa = (nome, cond, detalhe = '') => {
    total++
    let ok = false
    try { ok = typeof cond === 'function' ? !!cond() : !!cond } catch (e) { detalhe = `lançou: ${e.message}` }
    if (!ok) falhas++
    if (verboso) console.log(ok ? `  ok   ${nome}` : `  FALHOU ${nome}${detalhe ? ' — ' + detalhe : ''}`)
  }
  const secao = (t) => { if (verboso) console.log(`\n── ${t}`) }
  const ler = (p) => mutar(p, lerDisco(p))
  let load
  try { load = createOfflineLoader({ env: { OPENAI_API_KEY: 'offline' }, source: (p, s) => mutar(p, s) }) } catch (e) { return { falhas: 1, total: 1 } }
  const L = (p) => { try { return load(p) } catch (e) { if (verboso) console.log(`  (não carregou ${p}: ${e.message})`); return null } }
  const NM = L('lib/narration/niche-mapping.ts')
  const MD = L('lib/musicDirection.ts')
  const TOM = L('lib/cinematic/tomDaCena.ts')
  const EL = L('lib/cinematic/elencoDaHistoria.ts')
  const VP = L('lib/cinematic/visualPromptPolicy.ts')
  const SS = L('lib/cinematic/sceneStyle.ts')
  const PA = L('lib/scriptParser.ts')
  const FI = L('lib/cinematic/duracaoDoFilme.ts')
  const narr = PA ? PA.parseUserScript(ROBERT).narration : ''

  secao('1 · nicho por PALAVRA, não por prefixo (voz e trilha de tema)')
  checa('"broken stone wall" NÃO é o nicho money', () => NM.detectNiche('Two soldiers hide behind a broken stone wall.') !== 'money')
  checa('o roteiro do Robert (narração) não cai em money nem finance', () => !['money', 'finance', 'billionaire'].includes(NM.detectNiche(narr)), NM ? NM.detectNiche(narr) : '')
  checa('a voz do filme do Robert deixa de ser finance-authority', () => NM.selectPersonaForScript(narr, undefined, 'cinematic').id !== 'luxury-narrator' && NM.selectPersonaForScript(narr, undefined, 'premium').id !== 'finance-authority')
  checa('o defeito reproduz no prefixo de antes: \\bbroke casa "broken"', () => new RegExp('\\bbroke').test('broken stone wall') && !NM.padraoDaPalavraChave('broke').test('broken stone wall'))
  for (const [txt, nicho] of [
    ['He went broke at 30 and could not afford rent.', 'money'],
    ['How to stop being broke: 5 money habits that build wealth and passive income.', 'money'],
    ['The wealthiest people earn passive income while their salary stays flat.', 'money'],
    ['Investing early beats investing late. Investors love compound interest.', 'finance'],
    ['Cryptocurrency and bitcoin crashed while inflation climbed.', 'finance'],
    ['Archaeologists found ancient Roman coins from the empire.', 'history'],
    ['New technology from a startup changes how software is built.', 'technology'],
  ]) checa(`dinheiro/tema de verdade continua: "${txt.slice(0, 48)}…" → ${nicho}`, () => NM.detectNiche(txt) === nicho, NM ? NM.detectNiche(txt) : '')
  for (const [txt, nao] of [
    ['The investigation took detectives three years to close.', 'finance'],
    ['The air grew cold as the aircraft approached the island.', 'ai'],
    ['A strange light appeared, approaching the apple orchard.', 'technology'],
    ['The illuminating truth about the old lighthouse.', 'conspiracy'],
  ]) checa(`falso de prefixo some: "${txt.slice(0, 48)}…" ≠ ${nao}`, () => NM.detectNiche(txt) !== nao, NM ? NM.detectNiche(txt) : '')
  checa('plural e flexão continuam valendo (facts, investors, explored, wealthy, broker)', () => ['facts', 'investors', 'explored', 'wealthy', 'broker'].every((w, i) => NM.padraoDaPalavraChave(['fact', 'invest', 'explore', 'wealth', 'broke'][i]).test(w)))
  checa('o casamento novo é SUBCONJUNTO do antigo (nenhum roteiro ganha acerto que não tinha)', () => ['broken', 'brokers', 'apps', 'apple', 'air', 'ai', 'ais', 'factory', 'facts', 'investigation', 'investment', 'explored', 'exploring', 'technology', 'wealthiest'].every((w) => ['broke', 'app', 'ai', 'fact', 'invest', 'explore', 'tech', 'wealth'].every((k) => !NM.padraoDaPalavraChave(k).test(w) || new RegExp('\\b' + k).test(w))))

  secao('2 · tom grave tira o "energetic" das cenas')
  checa('o roteiro do Robert tem tom de guerra (o MESMO classificador da trilha)', () => MD.tomDoRoteiro(ROBERT) === 'conflict' && MD.resolveMusicDirection({ script: narr, rawScript: ROBERT }).emotion === 'conflict')
  checa('energetic + guerra → "tense, grave"', () => TOM.moodDoTom('energetic', 'conflict') === 'tense, grave')
  checa('upbeat/cheerful + luto e mistério também saem', () => !/upbeat|cheerful/.test(TOM.moodDoTom('upbeat and cheerful', 'grief')) && /somber/.test(TOM.moodDoTom('upbeat and cheerful', 'grief')) && /suspenseful/.test(TOM.moodDoTom('cheerful, warm', 'tension')))
  checa('mood alegre em roteiro alegre/neutro fica byte a byte', () => TOM.moodDoTom('energetic', 'celebration') === 'energetic' && TOM.moodDoTom('energetic', null) === 'energetic' && TOM.moodDoTom('energetic', MD.tomDoRoteiro('5 money habits that build wealth.')) === 'energetic')
  checa('mood que não é alegre fica byte a byte, mesmo na guerra', () => TOM.moodDoTom('dark, moody', 'conflict') === 'dark, moody' && TOM.moodDoTom(undefined, 'conflict') === undefined)
  const rota = ler('app/api/generate-video-cinematic/route.ts')
  checa('rota: o mood da cena passa pelo tom do roteiro', rota.includes('    const moodDaCena = moodDoTom(gStyle?.mood, tomDoRoteiro(prompt)) // KINEO-PARCEIRO-EYEBIBLE-2-1410'))
  checa('rota: o styleSuffix usa o mood da cena, não o cru do cliente', rota.includes('[moodDaCena, gStyle.lighting, gStyle.cameraStyle].filter(Boolean)') && !rota.includes('[gStyle.mood, gStyle.lighting, gStyle.cameraStyle]'))
  const sufixo = (mood) => `, ${[mood, MOOD_DO_CLIENTE.lighting, MOOD_DO_CLIENTE.cameraStyle].filter(Boolean).join(', ')}, consistent color grade across all scenes`
  const anchor = SS ? SS.deriveStyleAnchor(ROBERT, sufixo(TOM ? TOM.moodDoTom(MOOD_DO_CLIENTE.mood, MD ? MD.tomDoRoteiro(ROBERT) : null) : 'energetic')) : null
  const elenco = EL ? EL.derivarElenco(ROBERT) : []
  const prompts = VP && anchor ? VISUAIS.map((v, i) => VP.buildClassicVisualPrompt(v, { mode: 'character_story', style: anchor, character: null, elenco, aspect: '16:9', opening: i === 0 })) : []
  checa('as 7 cenas do Robert NÃO levam "energetic" (antes: as 7 levavam)', () => prompts.length === 7 && prompts.every((p) => !/energetic/i.test(p) && /tense, grave/.test(p)))

  secao('3 · elenco fixo: o capitão é o mesmo homem em toda cena que o cita')
  checa('3 papéis que falam, na ordem da 1ª fala', () => JSON.stringify(elenco.map((e) => e.papel)) === JSON.stringify(['young soldier', 'captain', 'wounded soldier']), JSON.stringify(elenco))
  checa('fichas distintas entre os papéis e determinísticas (mesmo roteiro → mesmo elenco)', () => new Set(elenco.map((e) => e.ficha)).size === 3 && JSON.stringify(EL.derivarElenco(ROBERT)) === JSON.stringify(elenco))
  const seis = EL ? EL.derivarElenco(['GUARD', 'MERCHANT', 'PRIEST', 'FARMER', 'SAILOR', 'BAKER'].map((r) => `${r}: “We hold the gate!”`).join('\n')) : []
  checa('6 papéis: nenhum par com o mesmo porte nem o mesmo rosto (traço nunca se repete no elenco)', () => seis.length === 6 && new Set(seis.map((e) => e.ficha.split(', ')[1])).size === 6 && new Set(seis.map((e) => e.ficha.split(', ').slice(-2, -1)[0])).size === 6, JSON.stringify(seis.map((e) => e.ficha)))
  checa('idade pelo papel: jovem nos vinte, capitão nos quarenta', () => /early twenties/.test(elenco[0].ficha) && /forties/.test(elenco[1].ficha))
  checa('figurino de guerra com arco e escudo = armadura (a época vem do roteiro)', () => elenco.every((e) => /battle-worn armor and a helmet/.test(e.ficha)))
  const comPapel = { 'young soldier': [3, 4, 6], captain: [2, 3, 4, 6], 'wounded soldier': [1, 3, 6] }
  for (const e of elenco) {
    const esperadas = comPapel[e.papel] ?? []
    checa(`"${e.papel}": a MESMA ficha nas cenas ${esperadas.map((i) => i + 1).join(', ')} e em nenhuma outra`, () => prompts.every((p, i) => p.includes(`the ${e.papel} is ${e.ficha}`) === esperadas.includes(i)))
  }
  const semElenco = VP && anchor ? VISUAIS.map((v, i) => VP.buildClassicVisualPrompt(v, { mode: 'character_story', style: anchor, character: null, aspect: '16:9', opening: i === 0 })) : []
  checa('cena sem papel nomeado ("two soldiers", "all three soldiers") fica byte a byte igual', () => prompts[0] === semElenco[0] && prompts[5] === semElenco[5])
  checa('a ficha entra ANTES da moldura e dentro do teto da fal (2.500)', () => prompts.every((p) => p.length < 2500) && prompts[2].indexOf('Recurring characters') < prompts[2].indexOf('subject framed in the upper two-thirds'))
  checa('"soldiers" no plural não é o papel; "the soldier" com dois papéis-soldado é ambíguo e não ganha ficha', () => SS.papeisNaCena('enemy soldiers advance', elenco).length === 0 && SS.papeisNaCena('the soldier falls', elenco).length === 0)
  checa('roteiro sem fala de personagem → elenco vazio (nada muda)', () => EL.derivarElenco('The Great Wall stretches 21,000 km. It took centuries to build.').length === 0)
  checa('papel feminino pelo rótulo e pelos pronomes', () => /a woman/.test(EL.derivarElenco('NURSE: “Hold still!”\nThe nurse wraps her hands.\nNURSE: “You will live.”')[0]?.ficha ?? '') && /a woman/.test(EL.derivarElenco('QUEEN: “Close the gates!”\nKING: “Not yet!”')[0]?.ficha ?? ''))
  checa('drama moderno sem guerra não ganha armadura', () => EL.derivarElenco('DETECTIVE: “Where were you?”\nSUSPECT: “At home!”\nThe detective leans in.').every((e) => /the same outfit/.test(e.ficha)))
  checa('rota: elenco só sem ficha do autor e sem estrela, na política clássica', rota.includes('    if (!estrelaFicha && storyMode && !storyCharacter) { const elenco = derivarElenco(prompt); if (elenco.length > 0) classicVisualPolicy.elenco = elenco } // KINEO-PARCEIRO-EYEBIBLE-2-1410'))
  checa('papeisQueFalam usa a mesma regra da voz (o rótulo que some da narração)', () => JSON.stringify(PA.papeisQueFalam(ROBERT)) === JSON.stringify(['YOUNG SOLDIER', 'CAPTAIN', 'WOUNDED SOLDIER']) && !narr.includes('CAPTAIN'))

  secao('4 · o export limpo (/api/compose/unlock) monta com a duração ASSINADA')
  const unlock = ler('app/api/compose/unlock/route.ts')
  checa('unlock lê o claim verificado do nascimento pelo generation_id', unlock.includes('const nascimento = await loadVerifiedCinematicClaim({ db: admin, secret: serviceRoleKey, userId: user.id, generationId: geracaoDoFilme }).catch(() => null)'))
  checa('unlock troca a duração do corpo pela assinada (claim settled)', unlock.includes("if (nascimento?.ok && nascimento.claim && nascimento.claim.status === 'settled') {") && unlock.includes('duration = duracaoDoFilmeAssinada({ pedida: duration, quality: nascimento.claim.quality, claimResponse: nascimento.claim.response })'))
  checa('a duração assinada entra ANTES do TTS e do builder (a reescala e o Creatomate leem a nova)', unlock.indexOf('duration = duracaoDoFilmeAssinada(') > 0 && unlock.indexOf('duration = duracaoDoFilmeAssinada(') < unlock.indexOf('scaleVoiceoverScript(voiceoverScript, targetWordCount(duration))') && unlock.indexOf('duration = duracaoDoFilmeAssinada(') < unlock.indexOf('source = buildCreatomateSource({'))
  checa('o caso do Robert: pediu 60, assinou 35 → o export limpo monta 35', () => FI.duracaoDoFilmeAssinada({ pedida: 60, quality: 'cinematic_ai', claimResponse: { verbatim: true, duration: 35 } }) === 35)
  const cliente = ler('app/(dashboard)/generate/GenerateClient.tsx')
  checa('o /generate guarda o generationId do filme de IA nas entradas do export limpo', cliente.includes('lastFastRenderRef.current = { ...lastFastRenderRef.current, generation_id: composeGenerationId } // KINEO-PARCEIRO-EYEBIBLE-2-1410') && cliente.includes('{ generation_id: input.generation_id } : {}), // KINEO-PARCEIRO-EYEBIBLE-2-1410'))

  return { falhas, total }
}

const identidade = (_p, s) => s
console.log('KINEO-PARCEIRO-EYEBIBLE-2-1410 — comportamento real (roteiro do Robert)')
const r = avaliar(identidade, true)
let falhas = r.falhas
let total = r.total
const checa = (nome, cond, detalhe = '') => {
  total++
  if (cond) console.log(`  ok   ${nome}`)
  else { falhas++; console.log(`  FALHOU ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}

console.log('\n── 5 · desfeito o conserto, cada arquivo é EXATAMENTE o pai do commit')
for (const p of ARQUIVOS_PARCEIRO_EYEBIBLE_2_1410) {
  const atual = lerDisco(p)
  const base = lf(execFileSync('git', ['show', `${BASE}:${p}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  let desfeito = null
  try { desfeito = semParceiroEyebible2_1410(p, desfazAncoraLegenda1410(p, atual)) /* KINEO-ANCORA-LEGENDA-1410 */ } catch (e) { desfeito = `ERRO ${e.message}` }
  checa(`${p}: desfeito = base ${BASE.slice(0, 8)}`, desfeito === base, typeof desfeito === 'string' && desfeito.startsWith('ERRO') ? desfeito : '')
  const marcadas = atual.split('\n').filter((l) => l.includes(MARCA_PARCEIRO_EYEBIBLE_2_1410)).length
  const f = FORMA_PARCEIRO_EYEBIBLE_2_1410[p]
  checa(`${p}: ${f.trocas} troca(s) + ${f.acrescimos} acréscimo(s) marcados`, marcadas === f.trocas + f.acrescimos, String(marcadas))
}
checa('o desfaz é idempotente (sem linha marcada, devolve igual)', semParceiroEyebible2_1410('lib/musicDirection.ts', 'x\ny') === 'x\ny')
checa('o desfaz recusa conserto pela metade', (() => { try { semParceiroEyebible2_1410('lib/musicDirection.ts', `a // ${MARCA_PARCEIRO_EYEBIBLE_2_1410}`); return false } catch { return true } })())
// A trava mede os COMMITS do conserto (não-merge, com a marca no assunto) — nunca a árvore contra a base (merge da main traria o
// trabalho dos outros).
let tocados = []
try {
  const shas = execFileSync('git', ['log', '--no-merges', '--format=%H', `--grep=${MARCA_PARCEIRO_EYEBIBLE_2_1410}`, `${BASE}..HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean)
  checa('existe ao menos um commit do conserto depois da base', shas.length > 0 || execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0)
  tocados = [...new Set(shas.flatMap((h) => execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', h], { encoding: 'utf8' }).split('\n').filter(Boolean)))]
  tocados.push(...execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).split('\n').filter(Boolean))
} catch { /* sem git: a seção acima já cobre */ }
const permitidos = new Set([...ARQUIVOS_PARCEIRO_EYEBIBLE_2_1410, 'lib/cinematic/elencoDaHistoria.ts', 'lib/cinematic/tomDaCena.ts'])
const fora = tocados.filter((p) => !permitidos.has(p) && !p.startsWith('scripts/'))
checa('o conserto não toca preços, créditos, motores, engineWall, homeVideoCuration nem ads', !tocados.some((p) => /engineCost|pricing|lib\/credits\//.test(p) || p === 'lib/engineWall.ts' || p === 'lib/homeVideoCuration.ts' || p.startsWith('lib/ads/') || p.includes('/ads/')), tocados.join(', '))
checa('fora de scripts/, só os arquivos declarados', fora.length === 0, fora.join(', '))

console.log('\n── 6 · mutantes (cada um provado aplicado; cada um tem de ficar VERMELHO)')
const MUTANTES = [
  ['nicho volta ao prefixo solto', 'lib/narration/niche-mapping.ts', "  const fim = RADICAIS_DE_PREFIXO.has(k) ?", "  const fim = true ? '' : RADICAIS_DE_PREFIXO.has(k) ?"],
  ['tom do roteiro some (null)', 'lib/musicDirection.ts', '  return emotionOf(texto) // KINEO-PARCEIRO-EYEBIBLE-2-1410', '  return null // KINEO-PARCEIRO-EYEBIBLE-2-1410'],
  ['guerra sem palavra própria (energetic volta)', 'lib/cinematic/tomDaCena.ts', "  conflict: 'tense, grave', // KINEO-PARCEIRO-EYEBIBLE-2-1410", ''],
  ['rota volta a colar o mood cru do cliente', 'app/api/generate-video-cinematic/route.ts', '[moodDaCena, gStyle.lighting, gStyle.cameraStyle]', '[gStyle.mood, gStyle.lighting, gStyle.cameraStyle]'],
  ['política esquece o elenco', 'lib/cinematic/visualPromptPolicy.ts', '    if (policy.elenco && policy.elenco.length > 0) prompt = comElencoNaCena(prompt, visual, policy.elenco)', '    if (false) prompt = comElencoNaCena(prompt, visual, policy.elenco)'],
  ['papel em toda cena (até nas sem ele)', 'lib/cinematic/sceneStyle.ts', '  return lista.filter((p) => { // KINEO-PARCEIRO-EYEBIBLE-2-1410', '  return lista.filter((p) => { if (lista) return true // KINEO-PARCEIRO-EYEBIBLE-2-1410'],
  ['dois papéis com o mesmo traço (sem a lista de usados)', 'lib/cinematic/elencoDaHistoria.ts', '    if (!usados.has(op)) { usados.add(op); return op }', '    return op'],
  ['rota não liga o elenco', 'app/api/generate-video-cinematic/route.ts', 'if (elenco.length > 0) classicVisualPolicy.elenco = elenco }', 'if (elenco.length < 0) classicVisualPolicy.elenco = elenco }'],
  ['unlock volta à duração do corpo', 'app/api/compose/unlock/route.ts', '        duration = duracaoDoFilmeAssinada({', '        void ({'],
  ['o /generate não guarda o generationId', 'app/(dashboard)/generate/GenerateClient.tsx', 'lastFastRenderRef.current = { ...lastFastRenderRef.current, generation_id: composeGenerationId }', 'void 0'],
]
for (const [nome, alvo, de, para] of MUTANTES) {
  let aplicou = false
  const mutar = (p, s) => {
    if (p !== alvo) return s
    if (!s.includes(de)) return s
    aplicou = true
    return s.split(de).join(para)
  }
  const m = avaliar(mutar, false)
  checa(`mutante "${nome}": aplicado e VERMELHO (${m.falhas} falha(s))`, aplicou && m.falhas > 0, aplicou ? '' : 'NÃO APLICOU')
}

console.log(`\n${total - falhas}/${total} verificações — ${falhas ? 'VERMELHO' : 'VERDE'}`)
process.exit(falhas ? 1 : 0)
