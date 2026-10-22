#!/usr/bin/env node
// KINEO-CENA-NEGACAO-1510 [TRAVA 8.2 — vai do fundador 15/10 "vai, vamos fazer isso rápido"] — guardião da NEGAÇÃO no
// Contrato de Cena (lib/cinematic/sceneTruth.ts).
//
// O caso real (lido de `cinematic_submission_claim`, generation a278acc5, render 56d96151, Seedance 15 s, 15/10 19:17 UTC):
// a cena 2 falava "Not a single trace was found — no wreckage, nothing." O contrato achou "wreck" dentro de "wreckage",
// declarou shipwreck ausente (contrato_cena = [{cena:2, antes:'sujeito_ausente', acoes:['injetado: wreck']}]) e PREFIXOU
// "wreck, " no prompt. O filme mostrou um avião destroçado enquanto a voz dizia que não havia destroços; o juiz do still
// deu nota 30 ("crashed plane instead of barren landscape").
//
// Este guardião roda o CÓDIGO REAL do sceneTruth, offline, sem rede e sem custo:
//   (A) o texto REAL do avião: a lib da BASE (conserto desfeito em memória) reproduz a injeção; a lib nova não pede
//       "wreck", devolve o prompt bruto byte a byte e grava negados:['wreckage'];
//   (B) frases afirmativas continuam pedindo o objeto; "no survivors, but the wreckage was found" pede wreckage;
//       um "not" que é de outro verbo ("have not confirmed that either wreck…") não apaga o sujeito;
//   (C) EN / PT / ES, antes e depois do termo ("no sign of", "never found the", "was never found", "nunca foi
//       encontrado", "sin rastro del", "nunca se encontró"), e a ação ("never sank" não vira "sank");
//   (D) cauda protegida: o prompt com "Mouth closed, not speaking" no fim sai intacto; a injeção (quando há) só PREFIXA;
//   (E) a rota grava contrato_cena[].negados nos DOIS caminhos (hollywood e clássico);
//   (F) byte a byte: desfeito o conserto (test-support/desfaz-cena-negacao-1510.mjs), rota e sceneTruth são EXATAMENTE os
//       do pai do 1º commit com a marca (ou o HEAD, antes do commit);
//   (G) mutantes, cada um provado aplicado, cada um tem de ficar VERMELHO.
//
// Rodar: node scripts/test-cena-negacao-1510.mjs
import { readFileSync, mkdtempSync, writeFileSync, rmSync, rmdirSync } from 'node:fs' // KINEO-CARTOON-CONSISTENCIA-2210 — diff histórico em arquivos temporários locais.
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os' // KINEO-CARTOON-CONSISTENCIA-2210
import { semCartoonConsistencia2210 } from './test-support/desfaz-cartoon-consistencia-2210.mjs' // KINEO-CARTOON-CONSISTENCIA-2210
import vm from 'node:vm'
import ts from 'typescript'
import { semCenaNegacao1510, MARCA_CENA_NEGACAO_1510 as MARCA } from './test-support/desfaz-cena-negacao-1510.mjs'
import { semTrilha15s1610 as semTrilha15s1610Puro, linhaDaTrilha15s1610 as linhaDaTrilha15s1610Puro } from './test-support/desfaz-trilha-15s-1610.mjs' // reancorado KINEO-FILME-RAPIDO-1710: os nomes abaixo também desfazem a entrega mais nova (17/10)
import { semFilmeRapido1710, linhaDoFilmeRapido1710, linhasTrocadasFilmeRapido1710 } from './test-support/desfaz-filme-rapido-1710.mjs' // reancorado KINEO-FILME-RAPIDO-1710 [TRAVA 8.2 — vai do fundador 17/10 "vai pra tudo"]
const semTrilha15s1610 = (texto, p) => semTrilha15s1610Puro(semFilmeRapido1710(texto, p), p) // reancorado KINEO-FILME-RAPIDO-1710
const linhaDaTrilha15s1610 = (l) => linhaDaTrilha15s1610Puro(l) || linhaDoFilmeRapido1710(l) // reancorado KINEO-FILME-RAPIDO-1710

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/sceneTruth.ts'
const MODO = 'lib/cinematic/visualMode.ts'
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8')
function diffSemCartoon2210(before, atual, arquivo) { // KINEO-CARTOON-CONSISTENCIA-2210
  const scratch = mkdtempSync(join(tmpdir(), 'kineo-negacao-cartoon-2210-')), a = join(scratch, 'before.ts'), b = join(scratch, 'after.ts') // KINEO-CARTOON-CONSISTENCIA-2210
  try { // KINEO-CARTOON-CONSISTENCIA-2210
    writeFileSync(a, before.replace(/\r\n/g, '\n'), 'utf8') // KINEO-CARTOON-CONSISTENCIA-2210
    writeFileSync(b, semCartoonConsistencia2210(atual, arquivo).replace(/\r\n/g, '\n'), 'utf8') // KINEO-CARTOON-CONSISTENCIA-2210
    try { return execFileSync('git', ['diff', '--no-index', '--no-color', '--', a, b], { encoding: 'utf8', maxBuffer: 1 << 28 }) } // KINEO-CARTOON-CONSISTENCIA-2210
    catch (e) { if (e.status === 1 && typeof e.stdout === 'string') return e.stdout; throw e } // KINEO-CARTOON-CONSISTENCIA-2210
  } finally { // KINEO-CARTOON-CONSISTENCIA-2210
    rmSync(a, { force: true }); rmSync(b, { force: true }); rmdirSync(scratch) // KINEO-CARTOON-CONSISTENCIA-2210
  } // KINEO-CARTOON-CONSISTENCIA-2210
} // KINEO-CARTOON-CONSISTENCIA-2210

function carregar(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, console: { log() {}, warn() {}, error() {} }, JSON, Math, Number, Array, Object, Set, Map, RegExp, String, Error })
  return exp
}

// ── fixture REAL (claim da generation a278acc5) ──────────────────────────────────────────────────────────────────────
const FALA_AVIAO = 'Not a single trace was found — no wreckage, nothing.'
const ROTEIRO_AVIAO = 'A 70-year-old mystery... no one cracked it. In 1953, a flight vanished over the Nevada desert. Not a single trace was found — no wreckage, nothing. But the biggest twist... the flight manifest listed a passenger who never existed.'
const CAUDA_CLASSICA = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, cinematic_dark, documentary, consistent color grade across all scenes, 9:16 vertical framing'
const PROMPT_AVIAO_BRUTO = 'A sweeping drone shot over the desolate Nevada desert, highlighting the barren landscape with sparse vegetation and rugged terrain. The camera captures the vastness and emptiness of the area, evoking a sense of isolation and mystery, fitting for the narrative of a vanished flight.' + CAUDA_CLASSICA
const PROMPT_AVIAO_ENVIADO = 'wreck, ' + PROMPT_AVIAO_BRUTO // o que a produção mandou ao motor (scene_prompts[1] do claim)

const MV = carregar(ler(MODO))
const PROIBIDOS = MV.proibidosPorModo('documentary_faceless')

/** Roda as provas (A)–(E) contra uma lib (texto) e uma rota (texto). Devolve a lista de falhas. */
function provas(srcLib, srcRota) {
  const falhas = []
  const checa = (nome, cond, det = '') => { if (!cond) falhas.push(`${nome}${det ? ` — ${det}` : ''}`) }
  let ST
  try { ST = carregar(srcLib) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const contrato = (fala, prompt, extra = {}) => ST.montarContrato({ indice: 2, falaFinal: fala, promptFinal: prompt, elementosProibidos: PROIBIDOS, palavraInteira: true, ...extra })
  const pede = (fala, sujeito) => (ST.extrairSujeitos(fala) ?? []).includes(sujeito)

  // (A) o avião real
  {
    const c = contrato(FALA_AVIAO, PROMPT_AVIAO_BRUTO)
    const r = ST.aplicarContrato(c)
    checa('A avião: a fala real NÃO pede shipwreck', !c.sujeitoObrigatorio.includes('shipwreck'), JSON.stringify(c.sujeitoObrigatorio))
    checa('A avião: nada injetado — o prompt sai byte a byte', r.promptCorrigido === PROMPT_AVIAO_BRUTO, r.promptCorrigido.slice(0, 80))
    checa('A avião: o prompt NÃO pede "wreck"', !/\bwreck/i.test(r.promptCorrigido))
    checa('A avião: o prompt não é o que a produção mandou', r.promptCorrigido !== PROMPT_AVIAO_ENVIADO)
    checa('A avião: acoes sem "injetado: wreck"', !r.acoes.includes('injetado: wreck'), JSON.stringify(r.acoes))
    checa('A avião: veredito não é mais sujeito_ausente', r.antes.veredicto !== 'sujeito_ausente', r.antes.veredicto)
    checa('A avião: o contrato grava negados:[wreckage]', JSON.stringify(c.negados) === '["wreckage"]', JSON.stringify(c.negados))
    checa('A avião: extrairNegados no roteiro inteiro acha wreckage', typeof ST.extrairNegados === 'function' && ST.extrairNegados(ROTEIRO_AVIAO).includes('wreckage'))
    checa('A avião: "vanished" (afirmado) segue como ação no roteiro inteiro', ST.extrairAcao(ROTEIRO_AVIAO) === 'disappeared', String(ST.extrairAcao(ROTEIRO_AVIAO)))
  }

  // (B) afirmativas continuam pedindo; mistura na mesma frase; "not" de outro verbo
  {
    checa('B afirmativa: "found the wreckage" pede shipwreck', pede('Divers finally found the wreckage on the seabed.', 'shipwreck'))
    checa('B afirmativa: "The shipwreck lies" pede shipwreck', pede('The shipwreck lies forty meters down.', 'shipwreck'))
    checa('B afirmativa: U-boat da NOAA continua pedido', pede('Both were torpedoed in 1942 — a German U-boat sank the Norlindo.', 'u-boat'))
    const mix = contrato('No survivors, but the wreckage was found.', PROMPT_AVIAO_BRUTO)
    checa('B mistura: "no survivors, but the wreckage was found" pede wreckage', mix.sujeitoObrigatorio.includes('shipwreck'), JSON.stringify(mix.sujeitoObrigatorio))
    checa('B mistura: e não grava negados', mix.negados === undefined, JSON.stringify(mix.negados))
    const rmix = ST.aplicarContrato(mix)
    checa('B mistura: a representação entra no início', rmix.promptCorrigido === 'wreck, ' + PROMPT_AVIAO_BRUTO, rmix.promptCorrigido.slice(0, 40))
    checa('B "not" de outro verbo: "have not confirmed that either wreck" segue pedindo', pede('Officials have not confirmed that either wreck is leaking.', 'shipwreck'))
    checa('B "no one knew the shipwreck" segue pedindo', pede('No one knew the shipwreck lay just offshore.', 'shipwreck'))
    checa('B ocorrência afirmada + negada: pede (basta uma afirmada)', pede('There was no wreck at first. Then the wreck surfaced.', 'shipwreck'))
    checa('B pontuação corta: "Nothing — the wreck had moved." pede', pede('Nothing — the wreck had moved.', 'shipwreck'))
    checa('B adversativa corta: "Nothing but the wreck remained." pede', pede('Nothing but the wreck remained.', 'shipwreck'))
    checa('B fala sem o termo não grava negados', contrato('The desert was silent.', PROMPT_AVIAO_BRUTO).negados === undefined)
  }

  // (C) EN / PT / ES
  {
    const negado = (fala, sujeito) => !pede(fala, sujeito) && ST.extrairNegados(fala).length > 0
    checa('C EN "no sign of the submarine"', negado('There was no sign of the submarine.', 'u-boat'))
    checa('C EN "never found the wreck"', negado('They never found the wreck.', 'shipwreck'))
    checa('C EN "the wreck was never found"', negado('The wreck was never found.', 'shipwreck'))
    checa("C EN \"the submarine wasn't found\"", negado("The submarine wasn't found.", 'u-boat'))
    checa('C EN apóstrofo curvo "wasn’t"', negado('The submarine wasn’t found.', 'u-boat'))
    checa('C EN "without a trace of the wreck"', negado('It vanished without a trace of the wreck.', 'shipwreck'))
    checa('C EN neither/nor', negado('Neither the submarine nor the wreck was ever seen.', 'u-boat') && negado('Neither the submarine nor the wreck was ever seen.', 'shipwreck'))
    checa('C PT "nenhum naufrágio"', negado('Não foi encontrado nenhum naufrágio.', 'shipwreck'))
    checa('C PT "o submarino nunca foi encontrado"', negado('O submarino nunca foi encontrado.', 'u-boat'))
    checa('C PT "sem nenhum sinal do satélite"', negado('Sem nenhum sinal do satélite.', 'satellite'))
    checa('C PT afirmativa "o submarino afundou" pede', pede('O submarino afundou perto da costa.', 'u-boat'))
    checa('C PT "não houve naufrágio, mas o submarino apareceu": naufrágio negado, submarino pedido',
      negado('Não houve naufrágio, mas o submarino apareceu.', 'shipwreck') && pede('Não houve naufrágio, mas o submarino apareceu.', 'u-boat'))
    checa('C ES "ningún naufragio"', negado('No hubo ningún naufragio.', 'shipwreck'))
    checa('C ES "el submarino nunca se encontró"', negado('El submarino nunca se encontró.', 'u-boat'))
    checa('C ES "sin rastro del satélite"', negado('Sin rastro del satélite.', 'satellite'))
    checa('C ES afirmativa "el submarino apareció" pede', pede('El submarino apareció en el fondo del mar.', 'u-boat'))
    checa('C ação: "the ship never sank" não vira sank', ST.extrairAcao('The ship never sank.') === null, String(ST.extrairAcao('The ship never sank.')))
    checa('C ação: "the ship sank in 1942" segue sank', ST.extrairAcao('The ship sank in 1942.') === 'sank')
    checa('C ação: "the street was not empty" não vira abandoned', ST.extrairAcao('The street was not empty.') === null)
  }

  // (D) cauda protegida
  {
    const CAUDA_H = ' Static framing, no talking. Mouth closed, not speaking, lips sealed.'
    const promptH = 'Wide shot of an empty ocean at dusk, gentle swells.' + CAUDA_H
    const rNeg = ST.aplicarContrato(ST.montarContrato({ indice: 1, falaFinal: 'There was no wreckage anywhere.', promptFinal: promptH, elementosProibidos: PROIBIDOS }))
    checa('D negada (hollywood): prompt byte a byte, cauda intacta', rNeg.promptCorrigido === promptH && rNeg.promptCorrigido.endsWith(CAUDA_H), rNeg.promptCorrigido)
    const rAf = ST.aplicarContrato(ST.montarContrato({ indice: 1, falaFinal: 'The wreck rests on the bottom.', promptFinal: promptH, elementosProibidos: PROIBIDOS }))
    checa('D afirmada (hollywood): a injeção só PREFIXA, cauda intacta', rAf.promptCorrigido === 'wreck, ' + promptH && rAf.promptCorrigido.endsWith(CAUDA_H), rAf.promptCorrigido)
    const rCl = ST.aplicarContrato(contrato(FALA_AVIAO, PROMPT_AVIAO_BRUTO))
    checa('D clássico: a cauda real "…9:16 vertical framing" intacta', rCl.promptCorrigido.endsWith(CAUDA_CLASSICA))
  }

  // (E) a rota grava negados nos dois caminhos
  {
    const codigo = srcRota.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    const cond = (codigo.match(/if \(severidadeDe\(r\.antes\.veredicto\) !== 'ok' \|\| \(contrato\.negados\?\.length \?\? 0\) > 0\) \{/g) ?? []).length
    checa('E as DUAS chamadas relatam a cena com negados', cond === 2, `achei ${cond}`)
    const push = (codigo.match(/\.\.\.\(contrato\.negados\?\.length \? \{ negados: contrato\.negados \} : \{\}\),/g) ?? []).length
    checa('E os DOIS relatos (hollywood e clássico) gravam negados', push === 2, `achei ${push}`)
    const iH = codigo.indexOf('contratoRelato.push({'), iC = codigo.indexOf('contratoRelatoClassico.push({')
    const iNegH = codigo.indexOf('negados: contrato.negados', iH), iNegC = codigo.indexOf('negados: contrato.negados', iC)
    checa('E negados dentro do push do hollywood', iH > 0 && iNegH > iH && iNegH < iH + 600, `${iH}/${iNegH}`)
    checa('E negados dentro do push do clássico', iC > 0 && iNegC > iC && iNegC < iC + 400, `${iC}/${iNegC}`)
    checa('E o claim segue gravando contrato_cena nos dois caminhos', /contrato_cena: contratoRelato,/.test(codigo) && /contrato_cena: contratoRelatoClassico,/.test(codigo))
  }
  return falhas
}

let total = 0, vermelhos = 0
const relata = (nome, ok, det = '') => { total++; if (!ok) { vermelhos++; console.error(`  x ${nome}${det ? ` — ${det}` : ''}`) } }

console.log('\nKINEO — Contrato de Cena: negação (KINEO-CENA-NEGACAO-1510)\n')
const LIB_ATUAL = ler(LIB)
const ROTA_ATUAL = ler(ROTA)

// (A–E) no código atual
const falhasAtuais = provas(LIB_ATUAL, ROTA_ATUAL)
for (const f of falhasAtuais) console.error(`  x ${f}`)
relata(`provas A–E no código atual (${falhasAtuais.length} falhas)`, falhasAtuais.length === 0)

// (A) o ANTES: a lib da base reproduz o defeito com o texto real
{
  const BASE = carregar(semCenaNegacao1510(LIB_ATUAL, LIB))
  const r = BASE.aplicarContrato(BASE.montarContrato({ indice: 2, falaFinal: FALA_AVIAO, promptFinal: PROMPT_AVIAO_BRUTO, elementosProibidos: PROIBIDOS, palavraInteira: true }))
  relata('ANTES: a lib da base injeta "wreck, " — exatamente o scene_prompts[1] do claim real', r.promptCorrigido === PROMPT_AVIAO_ENVIADO, r.promptCorrigido.slice(0, 60))
  relata('ANTES: a lib da base grava o mesmo relato do claim (sujeito_ausente → aprovada, injetado: wreck)',
    r.antes.veredicto === 'sujeito_ausente' && r.depois.veredicto === 'aprovada' && JSON.stringify(r.acoes) === '["injetado: wreck"]'
    && r.antes.motivo === 'a fala cita shipwreck e a imagem nao mostra nada que represente isso', `${r.antes.veredicto} ${JSON.stringify(r.acoes)}`)
}

// (F) byte a byte contra o pai do 1º commit com a marca (ou o HEAD, antes do commit)
{
  const git = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 })
  const shas = git('log', '--format=%H', '-S', MARCA, '--', LIB, ROTA).trim().split('\n').filter(Boolean)
  const base = shas.length ? shas[shas.length - 1] + '^' : 'HEAD'
  for (const p of [LIB, ROTA]) {
    const atual = ler(p)
    const desfeito = semCenaNegacao1510(semTrilha15s1610(atual, p), p).replace(/\r\n/g, '\n') // reancorado KINEO-TRILHA-15S
    const daBase = git('show', `${base}:${p}`).replace(/\r\n/g, '\n')
    relata(`F byte a byte: ${p} desfeito == ${base}`, desfeito === daBase)
    relata(`F ${p} tem a marca (o conserto está aplicado)`, atual.includes(MARCA))
  }
  const add = [LIB, ROTA].flatMap((p) => diffSemCartoon2210(git('show', `${base}:${p}`), ler(p), p).replace(/\r/g, '').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))) // KINEO-CARTOON-CONSISTENCIA-2210 — a folha exata remove somente a camada posterior, inclusive sua linha vazia contextual.
  add.splice(0, add.length, ...add.filter((l) => !l.includes('KINEO-KIDS-VENDA-2010'))) // KINEO-KIDS-VENDA-2010 — as linhas da venda do Cartoon têm marca e desfaz exato próprios; fora da conta da negação
  relata('F toda linha nova/trocada da rota e do sceneTruth leva a marca', add.length > 0 && add.every((l) => l.includes(MARCA) || linhaDaTrilha15s1610(l) /* reancorado KINEO-TRILHA-15S */ || l.includes('KINEO-META95-ASSUNTO-1910') /* reancorado KINEO-META95-ASSUNTO-1910 */ || l.includes('KINEO-DESENHO-SOM-2110') /* reancorado KINEO-DESENHO-SOM-2110 — o som do desenho infantil (21/10) mexe na rota só com kids_cartoon */ || l.includes('KINEO-BEBE-QUE-FALA-2010') /* reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) também é de depois da base; provado em scripts/test-bebe-que-fala-2010.mjs */), add.filter((l) => !l.includes(MARCA) && !linhaDaTrilha15s1610(l) && !l.includes('KINEO-META95-ASSUNTO-1910') && !l.includes('KINEO-BEBE-QUE-FALA-2010')).slice(0, 2).join(' | '))
}

// (G) mutantes — cada um provado aplicado, cada um tem de ficar VERMELHO
{
  const MUTANTES = [
    ['M1 extrairSujeitos ignora a negação', LIB, '    if (termo && termoAfirmadoNaFala(fala, e.termos)) achados.push(e.termos[0]) // KINEO-CENA-NEGACAO-1510', '    if (termo) achados.push(e.termos[0])'],
    ['M2 extrairAcao ignora a negação', LIB, '    if (termo && termoAfirmadoNaFala(fala, a.termos)) return a.termos[0] // KINEO-CENA-NEGACAO-1510', '    if (termo) return a.termos[0]'],
    ['M3 o negador para trás nunca conta', LIB, '    if (ehNegador1510(t)) return true // KINEO-CENA-NEGACAO-1510', '    if (ehNegador1510(t)) break'],
    ['M4 a negação atravessa qualquer palavra', LIB, '    if (!LIGACAO_ANTES_1510.has(t)) break // KINEO-CENA-NEGACAO-1510', '    if (!LIGACAO_ANTES_1510.has(t)) continue'],
    ['M5 o artigo não liga o negador ao termo', LIB, "  'a', 'an', 'the', 'any', 'single', 'one', 'ever', 'even', 'other', 'more', 'further', 'real', 'actual', 'visible', // KINEO-CENA-NEGACAO-1510", "  'a', 'an', 'any', 'single', 'one', 'ever', 'even', 'other', 'more', 'further', 'real', 'actual', 'visible', // KINEO-CENA-NEGACAO-1510"],
    ['M12 contração "n\'t" não nega', LIB, "  return NEGADORES_1510.has(t) || /[a-z]n't$/.test(t) // KINEO-CENA-NEGACAO-1510 — wasn't, didn't, couldn't", '  return NEGADORES_1510.has(t)'],
    ['M13 apóstrofo curvo não normalizado', LIB, '  const f = normalizar(fala).replace(/[’‘]/g, "\'") // KINEO-CENA-NEGACAO-1510 — mesmo comprimento: as posicoes batem com o includes()', '  const f = normalizar(fala)'],
    ['M14 a negação pula pontuação e "but"', LIB, '    if (!LIGACAO_ANTES_1510.has(t)) break // KINEO-CENA-NEGACAO-1510', "    if (!LIGACAO_ANTES_1510.has(t) && !/^[a-z]/.test(t)) continue; if (t === 'but') continue; if (!LIGACAO_ANTES_1510.has(t)) break"],
    ['M6 sem negadores em português', LIB, "  'nao', 'nenhum', 'nenhuma', 'nenhuns', 'nenhumas', 'sem', 'nunca', 'jamais', 'nada', 'nem', 'ninguem', // PT // KINEO-CENA-NEGACAO-1510", '  // PT // KINEO-CENA-NEGACAO-1510'],
    ['M7 sem negadores em espanhol', LIB, "  'ningun', 'ninguna', 'ninguno', 'sin', 'ni', 'nadie', 'tampoco', // ES // KINEO-CENA-NEGACAO-1510", '  // ES // KINEO-CENA-NEGACAO-1510'],
    ['M8 "was never found" (depois do termo) não conta', LIB, '    if (ACHADO_DEPOIS_1510.test(t)) return viuNegador // KINEO-CENA-NEGACAO-1510', '    if (ACHADO_DEPOIS_1510.test(t)) return false'],
    ['M9 o contrato não grava negados', LIB, '    ...(extrairNegados(args.falaFinal).length > 0 ? { negados: extrairNegados(args.falaFinal) } : {}), // KINEO-CENA-NEGACAO-1510', ''],
    ['M10 a rota clássica não relata negados', ROTA, '            ...(contrato.negados?.length ? { negados: contrato.negados } : {}), // KINEO-CENA-NEGACAO-1510', ''],
    ['M11 a rota hollywood só relata severidade', ROTA, "            if (severidadeDe(r.antes.veredicto) !== 'ok' || (contrato.negados?.length ?? 0) > 0) { // KINEO-CENA-NEGACAO-1510 — cena com objeto negado também vai ao claim", "            if (severidadeDe(r.antes.veredicto) !== 'ok') {"],
  ]
  for (const [nome, arq, de, para] of MUTANTES) {
    const orig = arq === LIB ? LIB_ATUAL : ROTA_ATUAL
    const linhas = orig.replace(/\r\n/g, '\n').split('\n')
    const n = linhas.filter((l) => l === de).length
    const mutado = linhas.map((l) => (l === de ? para : l)).join('\n')
    relata(`${nome}: aplicado (1 linha inteira trocada)`, n === 1 && mutado !== orig.replace(/\r\n/g, '\n'), `casou ${n}`)
    const f = arq === LIB ? provas(mutado, ROTA_ATUAL) : provas(LIB_ATUAL, mutado)
    relata(`${nome}: fica VERMELHO`, f.length > 0)
  }
}

console.log(vermelhos === 0
  ? `${total} VERIFICAÇÕES OK — "no wreckage" não vira mais "wreck" no prompt; afirmativas seguem pedindo; EN/PT/ES; cauda intacta; negados no claim.\n`
  : `\n${vermelhos} FALHAS em ${total} verificações.\n`)
process.exit(vermelhos === 0 ? 0 : 1)
