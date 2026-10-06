// KINEO-S25-NOTA95-2026-10-06 — o filme narrado do Seedance 2.5 sem repetição e sem anacronismo (fundador: "vai nota 95").
// Roda os 3 roteiros de 06/10 (Tambora 1816 = 80, Boston 1919 = 78, Londres 1952 = 72 na folha de contato) pelo pedaço
// DETERMINÍSTICO, sem rede: o prompt real de cada cena (claim de 06/10, md5 conferido com o banco — fixture
// scripts/s25-nota95-filmes-2026-10-06.mjs) volta ao plano pré-laço → a passada REAL da rota (const s25Plano …) →
// lib/hollywood/s25Cena → a fatia REAL da escolha de âncora + montagem (const envSig … submittedPrompt = scenePrompt).
// Prova:
//   (1) o prefixo idêntico não abre mais as cenas (antes: 41-45 palavras iguais no começo; depois: ≤ 3);
//   (2) nenhuma cena seguida com a mesma composição (Londres 2×3 colidiam: "street scene with buses… men with flares");
//   (3) frase abstrata vira imagem concreta (estimativa → enfermaria; "four years later" → a mesma rua em 1956, céu limpo;
//       legado → a montanha de origem; "for decades" → a rua décadas depois, num dia quente de verão);
//   (4) época em TODA cena, logo depois do visual, também no still FLUX e na âncora de ambiente; sem "no tanks"/"phone";
//   (5) a foto de ambiente semeia UMA cena por filme (Londres 1, 5 e 6 animavam a mesma foto);
//   (6) H3 e Omni ficam como estavam (prefixo de silêncio na frente, âncora de ambiente como antes);
//   (7) o ensaio de $0 mostra o prompt que o render pago monta (mesma abertura), passando pelo supervisor fala×imagem;
//   (8) mutantes: cada âncora quebrada fica vermelha — e cada mutante prova que aplicou.
// Estilo readFileSync + ts.transpileModule, sem alias @/ (molde scripts/test-assinante-sobe-2026-10-06.mjs).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { FILMES, ESTILO } from './s25-nota95-filmes-2026-10-06.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(RAIZ, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/hollywood/s25Cena.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const ROUTER = 'lib/hollywood/router.ts'
const FID = 'lib/hollywood/fidelidade.ts'
const TRUTH = 'lib/cinematic/sceneTruth.ts'
const VMODE = 'lib/cinematic/visualMode.ts'
const STYLE = 'lib/cinematic/sceneStyle.ts'

let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const silencioso = { log() {}, warn() {}, error() {} }

/** Módulo TS puro → exports (qualquer import em runtime = erro: o módulo precisa ser puro). */
function carrega(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (n) => { throw new Error(`import inesperado ${n} (módulo precisa ser puro)`) })
  return mod.exports
}
const fatia = (txt, ini, fim, incluiFim) => {
  const a = txt.indexOf(ini)
  const b = a < 0 ? -1 : txt.indexOf(fim, a + ini.length)
  return a < 0 || b < 0 ? null : txt.slice(a, incluiFim ? b + fim.length : b)
}
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex')
const palavras = (p) => p.toLowerCase().split(/\s+/).filter(Boolean)
const lcp = (a, b) => { const x = palavras(a); const y = palavras(b); let k = 0; while (k < x.length && k < y.length && x[k] === y[k]) k++; return k }
const maiorLcp = (ps) => { let m = 0; for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) m = Math.max(m, lcp(ps[i], ps[j])); return m }

// O que o laço de 06/10 acrescentava ao prompt do plano (para voltar ao plano pré-laço a partir do prompt enviado).
const PREFIXO_ANTIGO = 'Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. '
const UPRIGHT_ANTIGO = 'Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. '
const BOCA = ' If any person is visible: mouth closed, not speaking, no lip movement, no talking.'
const NITIDEZ = ' Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.'
const TEXTO_SEGURO = ', any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers'
const TROCA_SEM_TEXTO = ' No readable text or lettering anywhere in the frame; period-accurate clothing and objects only.'
const EPOCA_RE = /: (?:period clothing|clothing), vehicles, tools and buildings/

function constanteDoRouter(router, nome) {
  const m = new RegExp(`const ${nome} =\\n\\s*'([^']*)'`).exec(router)
  return m ? m[1] : null
}
function planoPreLaco(f, F, router) {
  const NO_TEXT = constanteDoRouter(router, 'NO_TEXT_SUFFIX')
  return f.cenas.map((c, i) => {
    let p = c.promptEnviado
    if (p.startsWith(PREFIXO_ANTIGO)) p = p.slice(PREFIXO_ANTIGO.length)
    if (p.startsWith(UPRIGHT_ANTIGO)) p = p.slice(UPRIGHT_ANTIGO.length)
    const fid = `Shows exactly this moment, as the narration describes it: ${F.primeiraFrase(c.voiceover).replace(/["“”]/g, '')} `
    if (p.startsWith(fid)) p = p.slice(fid.length)
    if (p.endsWith(TEXTO_SEGURO)) p = p.slice(0, -TEXTO_SEGURO.length)
    if (p.endsWith(NITIDEZ)) p = p.slice(0, -NITIDEZ.length)
    if (p.endsWith(BOCA)) p = p.slice(0, -BOCA.length)
    if (f.eraSuffix && p.endsWith(f.eraSuffix)) p = p.slice(0, -f.eraSuffix.length)
    p = p.split(TROCA_SEM_TEXTO).join(NO_TEXT).split('crystal-clear and skin texture').join('crystal-clear facial detail and skin texture')
    return { index: i + 1, type: c.type, voiceover: c.voiceover, prompt: p, seconds: 8 }
  })
}

// Expectativas por filme (fatos dos roteiros de 06/10).
const ESPERADO = {
  'Tambora 1816': { anos: ['1815', '1815', '1815', '1816', '1816', '1816', '1816'], abstratas: { 6: 'legado' }, concreto: { 6: ['Mount Tambora'] }, saiu: { 6: ['signpost'] }, lugar: { 3: 'New England, 1816:', 4: 'Europe, 1816:' } },
  'Boston 1919': { anos: ['1919', '1919', '1919', '1919', '1919', 'the decades after 1919'], abstratas: { 5: 'anos_depois' }, concreto: { 5: ['decades later', 'hot summer day'] }, saiu: { 5: ['people enjoying the warmth'] }, lugar: { 0: 'Boston, 1919:' } },
  'Londres 1952': { anos: ['1952', '1952', '1952', '1952', '1952', '1956'], abstratas: { 4: 'estatistica', 5: 'anos_depois' }, concreto: { 4: ['hospital beds'], 5: ['clear blue sky', 'London, 1956:'] }, saiu: { 4: ['dim gas lamps'], 5: ['foggy London street', 'some smiling'] }, lugar: { 0: 'London, 1952:' }, troca: 1 },
}

const CASOS_ABSTRATOS = [
  ['Officials later estimated that thousands of Londoners died in those few days.', 'estatistica'],
  ['Four years later, Britain passed the Clean Air Act, and the city slowly learned to breathe again.', 'anos_depois'],
  ['People called 1816 the year without a summer, and historians traced it to a single mountain.', 'legado'],
  ['For decades, people in the North End said the streets smelled sweet on hot summer days.', 'anos_depois'],
  ['The treaty was signed in Versailles in June 1919.', 'lei'],
  ['Twenty one people died and rescuers waded waist deep in the sticky flood for days.', null],
  ['Two years later, the volcano erupted again, burying the town under ash.', null],
  ['Years later, she returned to the lighthouse and found the door still open.', null],
  ['The lake, known as Lake Natron, turns animals to stone.', null],
  ['When the water rose, they called for help from the roof.', null],
  ['The next year, snow fell in New England in June and frosts killed crops in July.', null],
  ['Scientists estimate the lake holds fifty billion tons of water.', null],
  ['Officials estimated that two thousand people died when the dam broke.', null],
]
/** As unidades da lib como [rótulo, prova] — o topo as mostra uma a uma; problems() as exige todas. */
function unidades(S) {
  const out = CASOS_ABSTRATOS.map(([frase, tipo]) => [`tipoAbstrato("${frase.slice(0, 48)}…") = ${tipo}`, S.tipoAbstrato(frase) === tipo])
  // dois "anos depois" no mesmo filme não repetem o molde (a 2ª usa a variante)
  const r = S.planejarCenasS25({ roteiro: 'In 1883, Krakatoa exploded in Indonesia.', idioma: 'en', cenas: [
    { type: 'support', voiceover: 'In 1883, Krakatoa exploded and the sky over the town turned black.', prompt: 'A wide shot of a coastal town under a black ash sky.' },
    { type: 'support', voiceover: 'Years later, the town was rebuilt on higher ground.', prompt: 'The rebuilt town.' },
    { type: 'support', voiceover: 'Years later still, tourists came to see the volcano.', prompt: 'Tourists by the sea.' },
  ] })
  const [, a, b] = r.cenas
  // a 2ª já nasce na variante (sem precisar da troca de plano, que é a 2ª rede e mascararia a falta da variante)
  out.push(['dois "anos depois" no mesmo filme: a 2ª nasce na variante (outro plano), sem precisar da troca', a.abstrata === 'anos_depois' && b.abstrata === 'anos_depois' && !b.trocou && b.nucleo.startsWith('Close-up detail of the same') && a.plano !== b.plano])
  out.push(['número de quarto/voo/preço não vira ano', JSON.stringify(S.anosDoTexto('Room 1408 was haunted. The ticket cost $1500. Flight 1549 landed in 2009.').map((x) => x.ano)) === '[2009]'])
  out.push(['lugar: "Mount Tambora in Indonesia" → "Mount Tambora, Indonesia" (o mês não é lugar)', S.lugaresDoTexto('In April 1815, Mount Tambora in Indonesia exploded')[0] === 'Mount Tambora, Indonesia'])
  out.push(['época: 79 AD', S.epocaDoFilmeS25('In 79 AD, Mount Vesuvius buried Pompeii under ash.') === 'Mount Vesuvius, 79 AD: period clothing, vehicles, tools and buildings only, no modern items.'])
  out.push(['roteiro sem ano nem era: nenhuma trava de época inventada', S.epocaDoFilmeS25('A boy finds a strange key in his grandmother\'s attic.') === ''])
  out.push(['ano recente: sem "no modern items"', S.epocaDoFilmeS25('In 2011, a tsunami hit the coast.') === '2011: clothing, vehicles, tools and buildings exactly as they were in 2011.'])
  out.push(['âncora de ambiente: environmentSheet + época do filme', S.ambienteComEpoca('A foggy London street in December 1952, with dim gas lamps.', 'London, 1952: period clothing, vehicles, tools and buildings only, no modern items.') === 'A foggy London street in December 1952, with dim gas lamps. London, 1952: period clothing, vehicles, tools and buildings only, no modern items'])
  return out
}

async function problems(over = {}) {
  const P = []
  const src = (p) => (over[p] ?? rd(p)).replace(/\r\n/g, '\n')
  let S, F, ST, VMO, SS
  try { S = carrega(src(LIB)); F = carrega(src(FID)); ST = carrega(src(TRUTH)); VMO = carrega(src(VMODE)); SS = carrega(src(STYLE)) } catch (e) { return [`módulo não carrega: ${e.message}`] }
  try { for (const [rotulo, prova] of unidades(S)) if (!prova) P.push(`unidade: ${rotulo}`) } catch (e) { P.push(`unidade lançou: ${e.message}`) }
  const R = src(ROTA)
  const router = src(ROUTER)

  // ── a rota: import, ordem, âncora com época, ensaio ──
  if (!R.includes("import { planejarCenasS25, montarPromptS25, ambienteComEpoca, epocaDoFilmeS25, S25_CENA_EVENTO } from '@/lib/hollywood/s25Cena' // KINEO-S25-NOTA95-2026-10-06")) P.push('rota: import da lib s25Cena')
  const iEstrela = R.indexOf('const estrelaHollywood: (string | null)[]')
  const iPre = R.indexOf('      let s25Plano: ReturnType<typeof planejarCenasS25> | null = null')
  const iLaco = R.indexOf('      for (const [idx, hs] of plan.scenes.entries()) {')
  if (!(iEstrela > 0 && iPre > iEstrela && iLaco > iPre)) P.push('rota: a passada do S25 não está entre o supervisor/estrela e o laço')
  // a âncora de ambiente: a linha da base fica; o S25 sobrescreve a chave numa linha só dele (dentro da chamada das âncoras)
  const chamadaAncoras = fatia(R, '        anchors = await generateHollywoodAnchors({', '        })', true) ?? ''
  if (!chamadaAncoras.includes('          environmentSheet: plan.environmentSheet,\n') || !chamadaAncoras.includes("          ...(family === 's25' ? { environmentSheet: ambienteComEpoca(plan.environmentSheet, epocaDoFilmeS25(`${prompt} ${plan.scenes.map((s) => s.voiceover ?? '').join(' ')}`, hollywoodLanguage)) } : {}),")) P.push('rota: a âncora de ambiente do S25 não leva a época do filme')
  const iDry = R.indexOf('dispatch_preview: dispatchPreview,')
  const iSeca = R.indexOf('...(s25Ensaio ? { s25_cenas: s25Ensaio } : {}), // KINEO-S25-NOTA95-2026-10-06')
  if (!(iDry > 0 && iSeca > iDry && iSeca < R.indexOf('verdict: muteSeconds', iDry))) P.push('rota: o ensaio de $0 não devolve s25_cenas')
  if (!R.includes("            if (family === 's25') hs.prompt = garantirAcaoCentral(silenciarFalaNoPrompt(promptS25AntesDaFidelidade), hs.voiceover ?? '', plan.characterSheet ?? '', 'fim').prompt")) P.push("rota: no S25 a frase da narração não foi para o fim ('fim')")

  // ── espelhos: o "sem texto" que a lib troca é o do roteador, e a troca é a mesma da rota ──
  if (S.SEM_TEXTO_ROTEADOR !== constanteDoRouter(router, 'NO_TEXT_SUFFIX')) P.push('espelho: SEM_TEXTO_ROTEADOR difere do NO_TEXT_SUFFIX do roteador')
  if (S.SEM_TEXTO_S25 !== TROCA_SEM_TEXTO || !R.includes(`'${TROCA_SEM_TEXTO}',`)) P.push('espelho: SEM_TEXTO_S25 difere da troca que a rota faz')

  // ── as fatias reais da rota ──
  // começa no cabeçalho do bloco (não na linha da condição): um mutante na condição precisa RODAR para ser pego pelo comportamento
  const corpoPre = fatia(R, '      // ═══ KINEO-S25-NOTA95-2026-10-06 — a ÚLTIMA passada no plano visual do Seedance 2.5, antes de still e POST ═══', '      for (const [idx, hs] of plan.scenes.entries()) {', false)
  const corpoCena = fatia(R, "          const envSig = (plan.environmentSheet ?? '').trim().toLowerCase().slice(0, 24)", '          submittedPrompt = scenePrompt', true)
  const corpoEnsaio = fatia(R, '          let s25Ensaio: Record<string, unknown> | null = null', "          await releaseBirthClaim('dry_run_no_charge')", false)
  if (!corpoPre || !corpoCena || !corpoEnsaio) { P.push(`rota: fatia ausente (pre=${!!corpoPre} cena=${!!corpoCena} ensaio=${!!corpoEnsaio})`); return P }
  let pre, cena, ensaio
  try {
    pre = carrega(`export async function pre(ctx: any) {\n  const { family, planejarCenasS25, plan, prompt, hollywoodLanguage, console, writeServerEvent, S25_CENA_EVENTO, user, generationId } = ctx\n${corpoPre}\n  return s25Plano\n}`).pre
    // Reancorado KINEO-JUIZ-STILL-2026-10-06 [TRAVA 8.2 — vai do fundador 06/10 'vai juiz']: a fatia da cena ganhou as linhas marcadas do juiz da
    // foto-base (foto de ambiente e still), que só trocam a FOTO quando o juiz recusa. Este guardião prova o PLANO (prompt, época, âncora) com o
    // juiz desligado (juizStillCena = null, como no H3/Omni); o juiz na mesma fatia é provado em scripts/test-juiz-still-2026-10-06.mjs.
    cena = carrega(`export async function cena(ctx: any) {\n  const { hs, idx, plan, family, anchors, hSceneAnchors, estrelaHollywood, generateCinematicSceneStill, generationSeed, OMNI_STILL_RETRY_BUDGET_MS, cinematicSceneModel, writeServerEvent, user, generationId, eraSuffix, fidelidadeRelato, garantirAcaoCentral, silenciarFalaNoPrompt, s25Plano, montarPromptS25, montarContrato, aplicarContrato, severidadeDe, proibidosPorModo, formatoVisual, contratoRelato, textSafetySuffix, console, juizStillCena = null } = ctx\n  let omniStillRetryMs = 0\n  let sceneModel = ''\n  let submittedPrompt = ''\n${corpoCena}\n  return { submittedPrompt, ancora: hSceneAnchors[idx] }\n}`).cena
    ensaio = carrega(`export async function ensaio(ctx: any) {\n  const { family, plan, prompt, hollywoodLanguage, alignShotsToSpeech, scrubInventedSetting, planejarCenasS25, ambienteComEpoca, epocaDoFilmeS25, montarPromptS25, garantirAcaoCentral, silenciarFalaNoPrompt, eraSuffix } = ctx\n${corpoEnsaio}\n  return s25Ensaio\n}`).ensaio
  } catch (e) { P.push(`rota: fatia não transpila: ${e.message}`); return P }

  // semPassada = a fatia da âncora/montagem no plano REAL de 06/10 (sem a passada do S25): é onde a regra "foto de ambiente
  // uma vez" é exercida — com a passada, as cenas 5 e 6 de Londres nem pedem mais a foto.
  const rodaFilme = async (f, family, plano, semPassada = false) => {
    const plan = { scenes: plano.map((s) => ({ ...s })), characterSheet: f.characterSheet, environmentSheet: f.environmentSheet, styleSheet: ESTILO }
    const eventos = []
    const s25Plano = semPassada ? null : await pre({ family, planejarCenasS25: S.planejarCenasS25, plan, prompt: f.roteiro, hollywoodLanguage: 'en', console: silencioso, writeServerEvent: async (e) => { eventos.push(e); return true }, S25_CENA_EVENTO: S.S25_CENA_EVENTO, user: { id: 'u' }, generationId: f.generationId })
    const stills = []
    const enviados = []
    const ancoras = []
    const hSceneAnchors = []
    for (const [idx, hs] of plan.scenes.entries()) {
      const r = await cena({
        hs, idx, plan, family, anchors: { portraitUrl: 'RETRATO', environmentUrl: 'AMBIENTE' }, hSceneAnchors, estrelaHollywood: plan.scenes.map(() => null),
        generateCinematicSceneStill: async (a) => { stills[idx] = a.scenePrompt; return `still://${idx + 1}` }, generationSeed: 1, OMNI_STILL_RETRY_BUDGET_MS: 45000,
        cinematicSceneModel: (fam, t, a) => `${fam}/${a ? 'i2v' : 't2v'}`, writeServerEvent: async () => true, user: { id: 'u' }, generationId: 'g', eraSuffix: f.eraSuffix,
        fidelidadeRelato: [], garantirAcaoCentral: F.garantirAcaoCentral, silenciarFalaNoPrompt: F.silenciarFalaNoPrompt, s25Plano, montarPromptS25: S.montarPromptS25,
        montarContrato: ST.montarContrato, aplicarContrato: ST.aplicarContrato, severidadeDe: ST.severidadeDe, proibidosPorModo: VMO.proibidosPorModo,
        formatoVisual: { modo: 'documentary_faceless' }, contratoRelato: [], textSafetySuffix: SS.textSafetySuffix, console: silencioso,
      })
      enviados.push(r.submittedPrompt)
      ancoras.push(r.ancora)
    }
    return { s25Plano, eventos, stills, enviados, ancoras }
  }

  // falha aberta: a passada que lança não derruba o render pago — as cenas seguem como o planejador escreveu
  try {
    const quebra = await pre({ family: 's25', planejarCenasS25: () => { throw new Error('quebrou de propósito') }, plan: { scenes: [{ type: 'support', prompt: 'p', voiceover: 'v' }] }, prompt: 'x', hollywoodLanguage: 'en', console: silencioso, writeServerEvent: async () => true, S25_CENA_EVENTO: S.S25_CENA_EVENTO, user: { id: 'u' }, generationId: 'g' })
    if (quebra !== null) P.push('rota: a passada que lança devolveu plano')
  } catch { P.push('rota: a passada do S25 não falha aberta (um erro na lib derrubaria o render pago)') }

  for (const f of FILMES) {
    const E = ESPERADO[f.nome]
    const n = f.cenas.length
    if (!f.cenas.every((c) => md5(c.promptEnviado) === c.md5Banco)) P.push(`${f.nome}: a fixture não é mais o prompt do banco (md5)`)
    const plano = planoPreLaco(f, F, router)
    let r
    try { r = await rodaFilme(f, 's25', plano) } catch (e) { P.push(`${f.nome}: a fatia da rota lançou: ${e.message}`); continue }
    const { s25Plano, eventos, stills, enviados, ancoras } = r
    if (!s25Plano || s25Plano.cenas.length !== n) { P.push(`${f.nome}: a passada do S25 não rodou`); continue }
    // (1) prefixo idêntico
    if (maiorLcp(f.cenas.map((c) => c.promptEnviado)) < 35) P.push(`${f.nome}: a fixture não reproduz o defeito (prefixo comum < 35 palavras)`)
    const lcpDepois = maiorLcp(enviados)
    if (lcpDepois > 3) P.push(`${f.nome}: ${lcpDepois} palavras iguais no começo de duas cenas`)
    enviados.forEach((p, i) => {
      if (p.startsWith('Nobody addresses') || p.startsWith('Shows exactly') || p.startsWith('Vertical 9:16')) P.push(`${f.nome} cena ${i + 1}: abre com o prefixo antigo`)
      const c = s25Plano.cenas[i]
      if (!c || !p.startsWith(c.nucleo.slice(0, 40))) P.push(`${f.nome} cena ${i + 1}: não abre com o visual único da cena`)
    })
    // (2) composição: nenhuma cena seguida igual
    for (let i = 1; i < n; i++) {
      const a = s25Plano.cenas[i - 1]
      const b = s25Plano.cenas[i]
      if (S.colidem(a.plano, S.termosDe(a.nucleo, f.characterSheet), b.plano, S.termosDe(b.nucleo, f.characterSheet)).colide) P.push(`${f.nome}: cenas ${i} e ${i + 1} com a mesma composição`)
    }
    if (typeof E.troca === 'number') {
      const t = s25Plano.cenas[E.troca]
      const antes = S.separarNucleo(plano[E.troca].prompt).nucleo
      const depoisDe = S.separarNucleo(plano[E.troca + 1].prompt).nucleo
      if (!S.colidem(S.planoDe(antes), S.termosDe(antes), S.planoDe(depoisDe), S.termosDe(depoisDe)).colide) P.push(`${f.nome}: o par ${E.troca + 1}×${E.troca + 2} do plano real deveria colidir (defeito de 06/10)`)
      if (!t.trocou || /\bbuses\b|\bflares\b/i.test(t.nucleo)) P.push(`${f.nome} cena ${E.troca + 1}: deveria trocar de plano e largar o conteúdo da vizinha`)
    }
    // (3) frase abstrata → imagem concreta
    s25Plano.cenas.forEach((c, i) => {
      const esperada = E.abstratas[i] ?? null
      if ((c.abstrata ?? null) !== esperada) P.push(`${f.nome} cena ${i + 1}: abstrata=${c.abstrata} (esperado ${esperada})`)
    })
    for (const [i, termos] of Object.entries(E.concreto)) for (const t of termos) if (!enviados[i].includes(t)) P.push(`${f.nome} cena ${Number(i) + 1}: falta a imagem concreta "${t}"`)
    for (const [i, termos] of Object.entries(E.saiu)) for (const t of termos) if (enviados[i].includes(t)) P.push(`${f.nome} cena ${Number(i) + 1}: a cena-padrão "${t}" continua`)
    // (4) época em toda cena, logo depois do visual, no still e sem lista de substantivos
    enviados.forEach((p, i) => {
      const m = EPOCA_RE.exec(p)
      const iEp = m ? m.index : -1
      if (iEp < 0 || !p.slice(0, iEp).endsWith(E.anos[i])) P.push(`${f.nome} cena ${i + 1}: sem época ${E.anos[i]} (${p.slice(Math.max(0, iEp - 40), iEp + 12)})`)
      const iCine = p.indexOf('Cinematography (match exactly)')
      if (iEp >= 0 && iCine >= 0 && iEp > iCine) P.push(`${f.nome} cena ${i + 1}: a época vem depois da câmera/look`)
      if (iEp >= 0 && palavras(p.slice(0, iEp)).length > 90) P.push(`${f.nome} cena ${i + 1}: a época chega depois de 90 palavras`)
      if (/no tanks|phone|no people|Nobody addresses/i.test(p)) P.push(`${f.nome} cena ${i + 1}: substantivo proibido no prompt (no tanks/phone/no people/prefixo)`)
      if (!p.includes(S.AVISO_CAMERA_S25.trim()) || p.indexOf(S.AVISO_CAMERA_S25.trim()) < iEp) P.push(`${f.nome} cena ${i + 1}: aviso curto de câmera ausente ou antes da época`)
      if (!p.includes(BOCA.trim())) P.push(`${f.nome} cena ${i + 1}: perdeu o sufixo de boca fechada`)
    })
    for (const [i, t] of Object.entries(E.lugar)) if (!enviados[i].includes(t)) P.push(`${f.nome} cena ${Number(i) + 1}: época sem o lugar "${t}"`)
    stills.forEach((s, i) => {
      if (s === undefined) return
      if (!EPOCA_RE.test(s)) P.push(`${f.nome} cena ${i + 1}: o still FLUX nasce sem a época`)
      if (/phone|no people/i.test(s)) P.push(`${f.nome} cena ${i + 1}: o still FLUX leva "phone"/"no people"`)
    })
    // (5) a foto de ambiente semeia uma cena só (com a passada e também sem ela, no plano real de 06/10)
    if (ancoras.filter((a) => a === 'AMBIENTE').length > 1) P.push(`${f.nome}: a foto de ambiente semeou ${ancoras.filter((a) => a === 'AMBIENTE').length} cenas`)
    if (f.environmentSheet) {
      const semPassada = await rodaFilme(f, 's25', plano, true)
      const comAmbienteNoPlano = plano.filter((s) => s.prompt.toLowerCase().includes(f.environmentSheet.toLowerCase().slice(0, 24))).length
      if (comAmbienteNoPlano < 3) P.push(`${f.nome}: o plano real deveria pedir a foto de ambiente em 3 cenas (defeito de 06/10)`)
      const h3 = await rodaFilme(f, 'h3', plano)
      if (h3.ancoras.filter((a) => a === 'AMBIENTE').length !== comAmbienteNoPlano) P.push(`${f.nome}: H3 mudou a escolha de âncora (devia ficar como antes)`)
      if (semPassada.ancoras.filter((a) => a === 'AMBIENTE').length > 1) P.push(`${f.nome}: S25 repete a foto de ambiente quando o plano a pede de novo`)
      if (ancoras[0] !== 'AMBIENTE') P.push(`${f.nome}: a 1ª cena no mundo do narrador perdeu a foto de ambiente`)
    }
    if (f.nome === 'Boston 1919' && !String(ancoras[1] ?? '').startsWith('still://')) P.push('Boston cena 2 (rebites, sem ninguém): devia ganhar still próprio — o "no people" do supervisor a mandava para t2v')
    // (6) H3 e Omni como estavam
    for (const fam of ['h3', 'omni']) {
      const o = await rodaFilme(f, fam, plano)
      if (o.s25Plano !== null) P.push(`${f.nome}: a passada do S25 rodou na família ${fam}`)
      if (!o.enviados.every((p) => p.startsWith(PREFIXO_ANTIGO))) P.push(`${f.nome}: ${fam} perdeu o prefixo de silêncio`)
      if (o.enviados.some((p) => EPOCA_RE.test(p))) P.push(`${f.nome}: ${fam} ganhou a frase de época do S25`)
    }
    // medida: o evento do plano e a idempotência
    const ev = eventos.find((e) => e.name === S.S25_CENA_EVENTO)
    if (!ev || ev.metadata.generation_id !== f.generationId || ev.metadata.cenas.length !== n || ev.metadata.aberturas_distintas !== true) P.push(`${f.nome}: evento ${S.S25_CENA_EVENTO} ausente ou incompleto`)
    const de2 = S.planejarCenasS25({ cenas: s25Plano.cenas.map((c, i) => ({ prompt: c.prompt, voiceover: plano[i].voiceover, type: plano[i].type })), roteiro: `${f.roteiro} ${plano.map((s) => s.voiceover).join(' ')}`, characterSheet: f.characterSheet, styleSheet: ESTILO, idioma: 'en' })
    if (!de2.cenas.every((c, i) => c && c.prompt === s25Plano.cenas[i].prompt)) P.push(`${f.nome}: a passada não é idempotente`)
    // (7) o ensaio de $0: mesma abertura do render pago; passa pelo supervisor fala×imagem
    const ctxEnsaio = (alinha) => ({ family: 's25', plan: { scenes: plano.map((s) => ({ ...s })), characterSheet: f.characterSheet, environmentSheet: f.environmentSheet, styleSheet: ESTILO }, prompt: f.roteiro, hollywoodLanguage: 'en', alignShotsToSpeech: alinha, scrubInventedSetting: (t) => ({ text: t, removed: [] }), planejarCenasS25: S.planejarCenasS25, ambienteComEpoca: S.ambienteComEpoca, epocaDoFilmeS25: S.epocaDoFilmeS25, montarPromptS25: S.montarPromptS25, garantirAcaoCentral: F.garantirAcaoCentral, silenciarFalaNoPrompt: F.silenciarFalaNoPrompt, eraSuffix: f.eraSuffix })
    const seco = await ensaio(ctxEnsaio(async () => null))
    if (!seco || !Array.isArray(seco.prompts) || seco.prompts.length !== n) P.push(`${f.nome}: o ensaio de $0 não trouxe os prompts do S25`)
    else seco.prompts.forEach((q, i) => { if (q.prompt.slice(0, 120) !== enviados[i].slice(0, 120)) P.push(`${f.nome} cena ${i + 1}: o ensaio mostra outra abertura que o render pago`) })
    const reescrito = 'Close-up of a single brass lantern glowing on a wet cobblestone, nothing else in the frame.'
    const seco2 = await ensaio(ctxEnsaio(async () => ({ rewritten: [{ index: 0, shot: reescrito }], relato: {}, states: [] })))
    if (!seco2 || !String(seco2.prompts?.[0]?.prompt ?? '').startsWith(reescrito)) P.push(`${f.nome}: o ensaio de $0 não passa pelo supervisor fala×imagem`)
  }
  return P
}

console.log('TESTE S25 nota 95 — prefixo, variedade, frase abstrata, época, âncora de ambiente, ensaio de $0 — 06/10')

// ── unidades: frases reais e controles negativos (também rodam dentro de problems(), para os mutantes da lib) ──
for (const [rotulo, prova] of unidades(carrega(rd(LIB)))) ok(prova, rotulo)

const real = await problems()
ok(real.length === 0, '(1–7) os 3 filmes de 06/10 pelo pedaço determinístico: prefixo, variedade, abstrata, época, âncora, H3/Omni intactos, ensaio de $0' + (real.length ? ' → ' + real.join(' | ') : ''))
{
  // o retrato antes × depois, para o relatório (não é verificação)
  const S = carrega(rd(LIB))
  const F = carrega(rd(FID))
  for (const f of FILMES) {
    const plano = planoPreLaco(f, F, rd(ROUTER))
    const r = S.planejarCenasS25({ cenas: plano, roteiro: `${f.roteiro} ${plano.map((s) => s.voiceover).join(' ')}`, characterSheet: f.characterSheet, styleSheet: ESTILO, idioma: 'en' })
    console.log(`    · ${f.nome}: prefixo comum ${maiorLcp(f.cenas.map((c) => c.promptEnviado))} → ${maiorLcp(r.cenas.filter(Boolean).map((c) => c.prompt))} palavras; abstratas ${r.relato.abstratas}; trocas de plano ${r.relato.trocas}; época "${r.relato.epoca_base}"`)
  }
}

// ── (8) mutantes — cada um prova que aplicou e que derruba o guardião ──
const mutants = [
  ['L1 a época sai do prompt', LIB, 'const prompt = limpa(`${/[.!?]$/.test(nucleoFinal) ? nucleoFinal : `${nucleoFinal}.`} ${epoca} ${EIXO_S25} ${resto}`)', 'const prompt = limpa(`${/[.!?]$/.test(nucleoFinal) ? nucleoFinal : `${nucleoFinal}.`} ${EIXO_S25} ${resto}`)'],
  ['L2 frase abstrata deixa de ser detectada', LIB, '  if (!anosDepois && !lei && !estat && !legado) return null', '  if (anosDepois || lei || estat || legado || !anosDepois) return null'],
  ['L3 variedade desligada', LIB, '    if (!colidem(planos[i - 1], termos[i - 1], planos[i], termos[i]).colide) continue', '    continue'],
  ['L4 "four years later" não anda o relógio', LIB, "    else if (salto && 'anos' in salto && ano !== null) { ano = ano + salto.anos; decada = false }", "    else if (salto && 'anos' in salto && ano !== null) { decada = false }"],
  ['L5 o "sem texto" com telefone volta ao still', LIB, '    resto = resto.split(SEM_TEXTO_ROTEADOR.trim()).join(SEM_TEXTO_S25.trim()).replace(SEM_EXTRAS_RE, SEM_EXTRAS_S25)', '    resto = resto.replace(SEM_EXTRAS_RE, SEM_EXTRAS_S25)'],
  ['L6 o "no people" do supervisor volta', LIB, '    resto = resto.split(SEM_TEXTO_ROTEADOR.trim()).join(SEM_TEXTO_S25.trim()).replace(SEM_EXTRAS_RE, SEM_EXTRAS_S25)', '    resto = resto.split(SEM_TEXTO_ROTEADOR.trim()).join(SEM_TEXTO_S25.trim())'],
  ['L7 um prefixo comum volta a abrir as cenas', LIB, 'const prompt = limpa(`${/[.!?]$/.test(nucleoFinal)', 'const prompt = limpa(`Documentary shot of a historical event, period accurate. ${/[.!?]$/.test(nucleoFinal)'],
  ['L8 o aviso de câmera volta para a frente', LIB, "  return `${limpa(a.promptCena)}${reserva}${AVISO_CAMERA_S25}${a.mouthSuffix ?? ''}${a.spectacleSuffix ?? ''}`", "  return `${AVISO_CAMERA_S25.trim()} ${limpa(a.promptCena)}${reserva}${a.mouthSuffix ?? ''}${a.spectacleSuffix ?? ''}`"],
  ['L9 o eraSuffix longo ("no tanks…") volta', LIB, "  const reserva = a.epoca ? '' : (a.eraReserva ?? '')", "  const reserva = a.eraReserva ?? ''"],
  ['T1 a montagem do S25 desligada na rota', ROTA, "          const s25Montagem = family === 's25' && hs.type !== 'dialogue' ? s25Plano?.cenas[idx] ?? null : null", '          const s25Montagem = null as null | { epoca: string }'],
  ['T2 a passada não grava no plano (still sem época)', ROTA, '        for (const c of s25Plano.cenas) if (c) plan.scenes[c.indice].prompt = c.prompt', '        for (const c of s25Plano.cenas) if (c) void c.prompt'],
  ["T3 a frase da narração volta a abrir ('inicio')", ROTA, "            if (family === 's25') hs.prompt = garantirAcaoCentral(silenciarFalaNoPrompt(promptS25AntesDaFidelidade)", "            if (family === 'nenhuma') hs.prompt = garantirAcaoCentral(silenciarFalaNoPrompt(promptS25AntesDaFidelidade)"],
  ['T4 a foto de ambiente volta a semear várias cenas', ROTA, '          const inNarratorWorld = envSig.length > 8 && hs.prompt.toLowerCase().includes(envSig) && !s25AmbienteJaUsado', '          const inNarratorWorld = envSig.length > 8 && hs.prompt.toLowerCase().includes(envSig)'],
  ['T5 a âncora de ambiente sem época', ROTA, "          ...(family === 's25' ? { environmentSheet: ambienteComEpoca(", "          ...(family === 'nenhuma' ? { environmentSheet: ambienteComEpoca("],
  ['T6 o ensaio de $0 sem o S25', ROTA, '            ...(s25Ensaio ? { s25_cenas: s25Ensaio } : {}), // KINEO-S25-NOTA95-2026-10-06\n', ''],
  ['T7 a passada roda na família errada', ROTA, "      if (family === 's25') { // KINEO-S25-NOTA95-2026-10-06\n        try { // KINEO-S25-NOTA95-2026-10-06\n          s25Plano = planejarCenasS25(", "      if (family === 'h3') { // KINEO-S25-NOTA95-2026-10-06\n        try { // KINEO-S25-NOTA95-2026-10-06\n          s25Plano = planejarCenasS25("],
  ['T10 a passada deixa de falhar aberta', ROTA, "          console.warn('[cinematic] KINEO-S25-NOTA95: a passada do S25 falhou — as cenas seguem como o planejador escreveu:', e instanceof Error ? e.message : String(e)) // KINEO-S25-NOTA95-2026-10-06", '          throw e'],
  ['L10 estimativa sobre coisa física vira arquivo', LIB, "  if (estat && SUJEITO_FISICO_RE.test(t) && !MORTE_RE.test(t)) return legado ? 'legado' : null\n", ''],
  ['L11 o 2º molde do mesmo tipo repete o 1º', LIB, '  const escolhe = (opcoes: string[]) => opcoes[a.variante % opcoes.length]', '  const escolhe = (opcoes: string[]) => opcoes[0]'],
  ['T8 o evento de medida some', ROTA, '        await writeServerEvent({ name: S25_CENA_EVENTO,', '        void ({ name: S25_CENA_EVENTO,'],
  ['T9 o ensaio pula o supervisor fala×imagem', ROTA, '              const alinhadoE = idxs.length > 0 ? await alignShotsToSpeech(', '              const alinhadoE = idxs.length < 0 ? await alignShotsToSpeech('],
]
for (const [label, file, from, to] of mutants) {
  const srcText = rd(file)
  if (!srcText.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  const mutated = srcText.replace(from, () => to)
  if (mutated === srcText || (to && !mutated.includes(to))) { ok(false, `(${label}) o mutante não aplicou`); continue }
  let bitten = false
  let porque = ''
  try {
    const pr = await problems({ [file]: mutated })
    bitten = pr.length > 0
    porque = pr[0] ?? ''
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho${porque ? ` — ${porque.slice(0, 110)}` : ''}`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
