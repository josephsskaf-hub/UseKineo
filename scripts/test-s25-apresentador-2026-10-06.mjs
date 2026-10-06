// KINEO-S25-APRESENTADOR-2026-10-06 — o filme narrado do Seedance 2.5 sem apresentador fora da história e sem olhar para a lente
// (dentro do "vai nota 95" do fundador, 06/10). O defeito, medido no ensaio de $0 em produção (main 56e40659, Tambora 1815,
// verbatim 35 s, visual_mode=documentary_faceless, hostFits=false): o planejador GPT inventou um historiador-apresentador
// (o roteiro fecha com "historians traced it to a single mountain"); a cena 1 — o gancho — virou ele "looking directly into the
// camera" (o vulcão não aparecia) e a âncora de ambiente virou o escritório dele. O roteador só converte cena 'dialogue'.
// Prova, executando lib/hollywood/s25Cena.ts de verdade (readFileSync + ts.transpileModule, sem alias @/) com os TEXTOS REAIS:
//   (A) o olhar para a lente vira olhar DENTRO da cena em toda cena S25 (núcleo e direção), sem nomear câmera/lente/espectador;
//       forma negada ("never facing the lens", "Nobody addresses the camera") e "looks away from the camera" ficam como estão;
//   (B) apresentador que a fala não cita sai: Tambora cena 1 nasce da fala (o vulcão em erupção) com a época da cena; a fala que
//       cita o papel ("historians…", "historiadores…") mantém a pessoa, sem lente e trabalhando (mapa/livro); pronome ou nome da
//       ficha ("She drilled…") mantém a personagem; caso em pt;
//   (C) a âncora de ambiente: o escritório do apresentador sem lugar da história vira a época/lugar; ambiente da história fica;
//   (D) o relato ganha contagem e motivo por cena, sem quebrar os campos existentes;
//   (E) controles iguais: Londres 1952 e Boston 1919 (e Tambora 1816) saem byte a byte como sem a regra (lib neutralizada);
//   (F) só o S25: s25Cena só é importado pela rota, e toda chamada fica num ramo family === 's25'; as fatias REAIS da rota
//       (ensaio de $0, passada do render pago, âncora de ambiente) entregam a cena e o ambiente consertados — e o H3 não muda;
//   (G) mutantes: cada regra quebrada fica vermelha — e cada mutante prova que aplicou.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
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
const MARCA = 'KINEO-S25-APRESENTADOR-2026-10-06'

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
const fatia = (txt, ini, fim) => { const a = txt.indexOf(ini); const b = a < 0 ? -1 : txt.indexOf(fim, a + ini.length); return a < 0 || b < 0 ? null : txt.slice(a, b) }

// ── os TEXTOS REAIS do ensaio de $0 de 06/10 (Tambora 1815) ──
const FICHA_T = 'A middle-aged historian, Caucasian, with short brown hair, wearing a dark green wool coat and a white shirt, stands against a backdrop of antique bookshelves.'
const AMBIENTE_T = 'A dimly lit historical study room filled with ancient books, a wooden desk, and a large globe in the corner. The atmosphere is scholarly and contemplative.'
const FALA1_T = 'In April 1815, Mount Tambora in Indonesia exploded with a roar heard two thousand kilometers away.'
// o que o ensaio devolveu como prompt da cena 1 (até onde o relato cortou em "…") e como ambiente_ancora (idem)
const ENSAIO_CENA1_T = 'A middle-aged historian, Caucasian, with short brown hair, wearing a dark green wool coat and a white shirt, stands against a backdrop of antique bookshelves, looking directly into the camera. Mount Tambora, Indonesia, 1815: period clothing, vehicles, tools and buildings only, no modern items. Camera upright, level horizon.'
const ENSAIO_AMBIENTE_T = 'A dimly lit historical study room filled with ancient books, a wooden desk, and a large globe in the corner. The atmosphere is scholarly and contemplative. Mount Tambora, Indonesia, 1815: period cloth'
const EPOCA_T = 'Mount Tambora, Indonesia, 1815: period clothing, vehicles, tools and buildings only, no modern items.'
// a direção (resto) no padrão da casa — o ensaio cortou em "…" (o núcleo e a ficha acima são os reais)
const RESTO = 'Subtle handheld camera movement, natural imperfect lighting, light film grain, 9:16 vertical framing Cinematography (match exactly): shot on 35mm, teal-orange grade, soft golden backlight, shallow depth of field, light film grain. No readable text anywhere in the scene: no phone or computer screens, no signs, no billboards, no labels, no subtitles, no watermarks. If a phone appears, its screen is off or blurred.'
const semPonto = (t) => t.replace(/\.$/, '')
// o filme Tambora do ensaio (35 s, frase a frase): cena 1 = o apresentador real; 2-5 = os núcleos reais do GPT para as mesmas
// frases (claim 713564f2 de 06/10); 6 = o apresentador de novo, na frase do legado (o código troca pela montanha de origem)
const TAMBORA = [
  { type: 'cinematic', voiceover: FALA1_T, prompt: `${semPonto(FICHA_T)}, looking directly into the camera. ${RESTO}` },
  { type: 'cinematic', voiceover: 'Its ash rose so high that it spread a thin veil around the entire planet.', prompt: `A sweeping aerial view of the Earth with a thin veil of ash covering the surface, casting a shadow over various landscapes. ${RESTO}` },
  { type: 'support', voiceover: 'The next year, snow fell in New England in June and frosts killed crops in July.', prompt: `A cold June morning in New England, snow covering fields that should be lush with summer growth. Farmers stare at their barren lands. ${RESTO}` },
  { type: 'support', voiceover: 'In Europe, cold rain fell for weeks and wheat rotted in the flooded fields across the continent.', prompt: `Flooded wheat fields in Europe, rain pouring relentlessly as the crops rot in the muddy water. ${RESTO}` },
  { type: 'cinematic', voiceover: 'Thousands of families packed their wagons and headed west in search of warmer land.', prompt: `A long line of wagons heading westward, families seeking warmer lands under gray, overcast skies. ${RESTO}` },
  { type: 'support', voiceover: 'People called 1816 the year without a summer, and historians traced it to a single mountain.', prompt: `${semPonto(FICHA_T)}, looking directly into the camera, holding an old map. ${RESTO}` },
]
const ROTEIRO_T = TAMBORA.map((c) => c.voiceover).join(' ')
// controle do ensaio de Londres 1952 (06/10): personagem da época, NÃO apresentador. O relato veio com "…": o miolo foi completado.
const FICHA_L = 'A middle-aged British male, Caucasian, with short grey hair, wearing a 1950s style brown woolen coat'
const LONDRES_ENSAIO = [
  { type: 'support', voiceover: 'In December 1952, a cold fog settled over London and refused to leave for five days.', prompt: `${FICHA_L}, walks through the thick yellow fog on a London street, a handkerchief pressed to his mouth. He looks away from the camera. ${RESTO}` },
  { type: 'support', voiceover: 'Smoke from millions of coal fires mixed with it into a yellow black smog.', prompt: `Chimneys of terraced houses pour black coal smoke into a yellow sky over London. ${RESTO}` },
]
// caso em pt (fala em português; ficha e prompts em inglês, como o planejador escreve)
const PT = [
  { type: 'cinematic', voiceover: 'Em abril de 1815, o Monte Tambora, na Indonésia, explodiu com um estrondo ouvido a dois mil quilômetros.', prompt: `${semPonto(FICHA_T)}, looking directly into the camera. ${RESTO}` },
  { type: 'support', voiceover: 'No ano seguinte, nevou na Nova Inglaterra em junho e a geada matou as plantações em julho.', prompt: `A cold June morning in New England, snow covering the fields. ${RESTO}` },
  { type: 'support', voiceover: 'Os historiadores ligaram o ano sem verão à erupção do Monte Tambora.', prompt: `${semPonto(FICHA_T)}, looking directly into the camera. ${RESTO}` },
  { type: 'support', voiceover: 'Milhares de famílias partiram para o oeste em busca de terras mais quentes.', prompt: `${semPonto(FICHA_T)}, looking directly into the camera. ${RESTO}` },
]
const OLHAR_LENTE_RE = /\b(?:look\w*|star\w*|gaz\w*|fac(?:e|es|ing))\s+(?:\w+\s+){0,2}(?:into|at|toward|towards)?\s*(?:the\s+)?(?:camera|lens|viewer)\b(?!\s+movement)/i
const PESSOA_ROTA_RE = /\b(?:man|woman|person|people|boy|girl|child|face|hands?|engineer|keeper|sailor|soldier|farmer|scientist|geologist|watchmaker|cartographer|he|she|his|her)\b/i // = s25PessoaEmQuadro da rota

// ── a lib NEUTRALIZADA: a mesma fonte com a regra desligada (sem papel, sem troca de olhar, sem troca de ambiente). Serve para
// provar que nos controles a regra não muda NADA (byte a byte) e que no Tambora ela reproduz o defeito medido no ensaio. ──
const NEUTRO = [
  ['  const papel = papelDeApresentador(ficha) // KINEO-S25-APRESENTADOR-2026-10-06', '  const papel = null as null | { papel: string; re: RegExp } // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['    const olhar = olharNaCena(nu) // KINEO-S25-APRESENTADOR-2026-10-06', '    const olhar = { texto: nu, trocas: 0 } // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['    const olharResto = olharNaCena(resto) //', '    const olharResto = { texto: resto, trocas: 0 } //'],
  ['  if (epoca && e && cenarioDeApresentador(e)) {', '  if (false) {'],
]
function neutraliza(src) {
  let s = src
  const faltou = []
  for (const [de, para] of NEUTRO) { if (s.includes(de)) s = s.replace(de, () => para); else if (!s.includes(para)) faltou.push(de.trim().slice(0, 50)) }
  return { s, faltou }
}

// ── os controles do pré-laço (mesma reconstrução do guardião nota95: o prompt do banco volta ao plano antes do laço) ──
const PREFIXO_ANTIGO = 'Nobody addresses the camera and nobody poses for it: show only the action, places and objects the narration describes; anyone visible is part of that action, mouth closed, never facing the lens. '
const UPRIGHT_ANTIGO = 'Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. '
const BOCA = ' If any person is visible: mouth closed, not speaking, no lip movement, no talking.'
const NITIDEZ = ' Ultra sharp focus, crisp fine detail, photorealistic large-scale spectacle, volumetric light, high dynamic range, no blur.'
const TEXTO_SEGURO = ', any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers'
const TROCA_SEM_TEXTO = ' No readable text or lettering anywhere in the frame; period-accurate clothing and objects only.'
const constanteDoRouter = (router, nome) => { const m = new RegExp(`const ${nome} =\\n\\s*'([^']*)'`).exec(router); return m ? m[1] : null }
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

const arquivosTs = (dir) => {
  const out = []
  const anda = (d) => { for (const n of readdirSync(d)) { if (n === 'node_modules' || n.startsWith('.')) continue; const p = join(d, n); const st = statSync(p); if (st.isDirectory()) anda(p); else if (/\.(?:ts|tsx|mjs|js)$/.test(n)) out.push(p) } }
  try { anda(join(RAIZ, dir)) } catch { /* pasta ausente */ }
  return out
}

/** Todas as verificações como [rótulo, passou]. `over` troca a fonte de um arquivo (mutantes). */
async function verificacoes(over = {}) {
  const V = []
  const v = (rotulo, fn) => { try { V.push([rotulo, Boolean(fn())]) } catch (e) { V.push([`${rotulo} (lançou: ${e.message})`, false]) } }
  const src = (p) => (over[p] ?? rd(p)).replace(/\r\n/g, '\n')
  let S, N, F, neutro
  try {
    S = carrega(src(LIB))
    neutro = neutraliza(src(LIB))
    N = carrega(neutro.s)
    F = carrega(src(FID))
  } catch (e) { return [[`módulos carregam (${e.message})`, false]] }
  v('lib neutralizada: as 4 chaves da regra foram desligadas (prova por grep)', () => neutro.faltou.length === 0 && NEUTRO.every(([, para]) => neutro.s.includes(para)))
  const plano = (M, cenas, ficha, idioma = 'en', roteiro = null) => M.planejarCenasS25({ cenas, roteiro: roteiro ?? cenas.map((c) => c.voiceover ?? '').join(' '), characterSheet: ficha, styleSheet: ESTILO, idioma })

  // ── (A) olhar para a lente → olhar dentro da cena; negação e "looks away" ficam ──
  const OLHARES = [
    ['A fisherman stands on the dock, looking directly into the camera.', 'A fisherman stands on the dock, eyes on the scene in front of them.'],
    ['Looking straight into the camera lens, the man raises his lantern.', 'Eyes on the scene in front of them, the man raises his lantern.'],
    ['The keeper stands looking directly into the camera.', 'The keeper stands looking at the scene in front of them.'],
    ['The woman faces the camera, wind in her hair.', 'The woman faces the scene in front of them, wind in her hair.'],
    ['A narrator addresses the viewer from a dim room.', 'A narrator watches the scene in front of them from a dim room.'],
    ['He speaks to camera about the flood.', 'He watches the scene in front of them.'],
    ['The old sailor breaks the fourth wall.', 'The old sailor stays absorbed in the scene.'],
    ['A girl making eye contact with the lens.', 'A girl keeping their eyes on the scene in front of them.'],
    ['The soldier turns toward the camera.', 'The soldier turns toward the scene in front of them.'],
    ['She stares back at the camera, unblinking.', 'She stares at the scene in front of them, unblinking.'],
  ]
  for (const [de, para] of OLHARES) v(`olhar: "${de}" → "${para}"`, () => { const r = S.olharNaCena(de); return r.texto === para && r.trocas === 1 && !/camera|lens|viewer/i.test(r.texto) })
  const FICAM = ['mouth closed, never facing the lens.', 'The man, not looking at the camera, walks away.', 'Nobody addresses the camera and nobody poses for it.', 'He does not look into the camera.', 'He looks away from the camera.', 'Farmers stare at their barren lands.', 'Interior shot from inside a dim room, looking out through a window at the snow.', S.AVISO_CAMERA_S25.trim()]
  for (const t of FICAM) v(`olhar: fica como está — "${t.slice(0, 60)}"`, () => { const r = S.olharNaCena(t); return r.texto === t && r.trocas === 0 })
  v('olhar: o olhar novo não nomeia câmera, lente nem espectador (sem proibição que desenhe o objeto)', () => !/camera|lens|viewer/i.test(S.OLHAR_NA_CENA))

  // ── papel de apresentador pela cabeça da ficha (en/pt/es); objeto da descrição não vira papel ──
  const PAPEIS = [
    [FICHA_T, 'historian'],
    ['Um historiador de meia-idade, de cabelo castanho curto, casaco de lã verde-escuro, diante de estantes antigas.', 'historian'],
    ['Una historiadora de mediana edad, con abrigo verde y gafas.', 'historian'],
    ['A talk-show host in a grey suit', 'presenter'],
    ['A volcanologist named Elena Ruiz, in her 40s, wearing a red field jacket', 'scientist'],
    ['Um guia turístico de chapéu de palha', 'guide'],
    ['A weathered sailor in his 60s, with an anchor tattoo on his forearm', null],
    [FICHA_L, null],
    ['A middle-aged British man, around 50, Caucasian, with short grey hair, wearing a classic 1950s dark overcoat, a bowler hat, and a solemn expression', null],
    ['A ghost of a young woman in a white dress', null],
    ['', null],
  ]
  for (const [ficha, papel] of PAPEIS) v(`papel da ficha "${ficha.slice(0, 48)}…" = ${papel}`, () => (S.papelDeApresentador(ficha)?.papel ?? null) === papel)

  // ── (B) Tambora 1815 — o ensaio real: a lib neutralizada reproduz o defeito; a lib consertada tira o apresentador ──
  const tN = plano(N, TAMBORA, FICHA_T, 'en', ROTEIRO_T)
  const tR = plano(S, TAMBORA, FICHA_T, 'en', ROTEIRO_T)
  const c1 = tR.cenas[0]
  v('Tambora (sem a regra) reproduz o ensaio de 06/10: cena 1 = historiador olhando para a lente + época', () => tN.cenas[0].prompt.startsWith(ENSAIO_CENA1_T))
  v('Tambora (sem a regra) reproduz o ensaio: âncora de ambiente = escritório + época', () => N.ambienteComEpoca(AMBIENTE_T, N.epocaDoFilmeS25(ROTEIRO_T)).startsWith(ENSAIO_AMBIENTE_T))
  v('Tambora cena 1: o apresentador sai (apresentador = fora; motivo "apresentador fora da história → imagem da fala")', () => c1.apresentador === 'fora' && c1.motivo === 'apresentador fora da história → imagem da fala')
  v('Tambora cena 1: abre com o vulcão da fala ("Wide shot of Mount Tambora in Indonesia erupting, …")', () => c1.prompt.startsWith('Wide shot of Mount Tambora in Indonesia erupting, a towering column of ash and fire rising into the sky.'))
  v('Tambora cena 1: a época da cena logo depois do visual ("Mount Tambora, Indonesia, 1815: period clothing…")', () => c1.epoca === EPOCA_T && c1.prompt.includes(`rising into the sky. ${EPOCA_T}`))
  v('Tambora cena 1: sem historiador, ficha, estantes ou olhar para a lente', () => !/historian|Caucasian|bookshel|backdrop/i.test(c1.prompt) && !OLHAR_LENTE_RE.test(c1.prompt))
  v('Tambora cena 1: núcleo sem pessoa nenhuma (nem o historiador) → a rota manda com still próprio (s25PessoaEmQuadro = false)', () => !PESSOA_ROTA_RE.test(c1.nucleo) && !/historian|Caucasian/i.test(c1.nucleo))
  v('Tambora cena 1: plano aberto (o plano do núcleo refeito, não o do retrato)', () => c1.plano === 'aberto')
  v('Tambora cena 1 montada (montarPromptS25): só o aviso curto de câmera da casa, nenhum olhar para a lente', () => { const p = S.montarPromptS25({ promptCena: c1.prompt, epoca: c1.epoca, eraReserva: '', mouthSuffix: '', spectacleSuffix: '' }); return p.endsWith(S.AVISO_CAMERA_S25) && !OLHAR_LENTE_RE.test(p) })
  v('Tambora cenas 2-5: idênticas às de sem a regra (a regra só tocou a cena do apresentador)', () => [1, 2, 3, 4].every((i) => tR.cenas[i].prompt === tN.cenas[i].prompt))
  v('Tambora cena 6 (legado com o historiador): a montanha de origem do código, apresentador = null, igual à de sem a regra', () => tR.cenas[5].abstrata === 'legado' && tR.cenas[5].apresentador === null && tR.cenas[5].prompt === tN.cenas[5].prompt && tR.cenas[5].nucleo.startsWith('A wide, quiet view of Mount Tambora, Indonesia'))
  v('Tambora: a passada é idempotente (rodar de novo no próprio resultado não muda nada)', () => { const de2 = plano(S, tR.cenas.map((c, i) => ({ type: TAMBORA[i].type, voiceover: TAMBORA[i].voiceover, prompt: c.prompt })), FICHA_T, 'en', ROTEIRO_T); return de2.cenas.every((c, i) => c.prompt === tR.cenas[i].prompt) })
  v('Tambora: cena de diálogo com o apresentador continua intocada (null)', () => { const r = plano(S, [...TAMBORA.slice(0, 2), { type: 'dialogue', voiceover: null, prompt: `${semPonto(FICHA_T)}, looking directly into the camera, says the line.` }], FICHA_T, 'en', ROTEIRO_T); return r.cenas[2] === null && r.relato.cenas_s25 === 2 })

  // ── (C) âncora de ambiente ──
  v('ambiente Tambora: o escritório sem lugar da história vira a época/lugar do filme', () => S.ambienteComEpoca(AMBIENTE_T, S.epocaDoFilmeS25(ROTEIRO_T)) === 'Mount Tambora, Indonesia, 1815: period clothing, vehicles, tools and buildings only, no modern items')
  v('ambiente Londres (rua da história): environmentSheet + época, como antes', () => S.ambienteComEpoca('A foggy London street in December 1952, with dim gas lamps casting a yellow glow and thick smog blanketing the city.', 'London, 1952: period clothing, vehicles, tools and buildings only, no modern items.') === 'A foggy London street in December 1952, with dim gas lamps casting a yellow glow and thick smog blanketing the city. London, 1952: period clothing, vehicles, tools and buildings only, no modern items')
  v('ambiente biblioteca QUE É o lugar da história (Alexandria): fica', () => S.ambienteComEpoca('The great library of Alexandria, towering shelves of papyrus scrolls lit by oil lamps.', 'Alexandria, Egypt, 48 BC: period clothing, vehicles, tools and buildings only, no modern items.').startsWith('The great library of Alexandria'))
  v('ambiente com 1 sinal fraco só ("radio studio" da história): fica', () => S.ambienteComEpoca('A 1930s radio studio with vintage microphones and heavy curtains.', 'New Jersey, 1938: period clothing, vehicles, tools and buildings only, no modern items.').startsWith('A 1930s radio studio'))
  v('ambiente sem época (roteiro sem ano): a environmentSheet volta intacta', () => S.ambienteComEpoca('A dimly lit study room filled with ancient books.', '') === 'A dimly lit study room filled with ancient books.')
  v('ambiente Boston (sem environmentSheet): continua vazio', () => S.ambienteComEpoca('', 'Boston, 1919: period clothing, vehicles, tools and buildings only, no modern items.') === '')
  v('ambiente: escritório + época sem lugar → a própria época como cenário', () => S.ambienteComEpoca('A cozy library with leather armchairs.', '1815: period clothing, vehicles, tools and buildings only, no modern items.') === '1815: period clothing, vehicles, tools and buildings only, no modern items')
  v('lugarDaEpoca: "Mount Tambora, Indonesia, 1815: …" → "Mount Tambora, Indonesia"; sem lugar → null', () => S.lugarDaEpoca(EPOCA_T) === 'Mount Tambora, Indonesia' && S.lugarDaEpoca('London, 1952: x.') === 'London' && S.lugarDaEpoca('1815: x.') === null && S.lugarDaEpoca('The decades after 1919: x.') === null)

  // ── (D) relato ──
  v('relato Tambora: papel_apresentador=historian, apresentador_fora=1, apresentador_na_historia=0, olhar_lente=1', () => tR.relato.papel_apresentador === 'historian' && tR.relato.apresentador_fora === 1 && tR.relato.apresentador_na_historia === 0 && tR.relato.olhar_lente === 1)
  v('relato Tambora por cena: cena 1 = { apresentador: fora, olhar_lente: 1, motivo }', () => { const r = tR.relato.cenas[0]; return r.cena === 1 && r.apresentador === 'fora' && r.olhar_lente === 1 && r.motivo === 'apresentador fora da história → imagem da fala' })
  v('relato: os campos de antes continuam (versao, cenas_s25, epoca_base, lugares, abstratas, trocas, aberturas_distintas, cenas[…])', () => { const r = tR.relato; const c = r.cenas[0]; return typeof r.versao === 'string' && r.cenas_s25 === 6 && r.epoca_base === EPOCA_T && Array.isArray(r.lugares) && r.abstratas === 1 && typeof r.trocas === 'number' && r.aberturas_distintas === true && ['cena', 'plano', 'plano_original', 'abstrata', 'trocou', 'motivo', 'epoca', 'sobreposicao_anterior', 'comuns_anterior', 'abertura'].every((k) => k in c) })

  // ── (B) a fala que cita a pessoa: ela fica (papel → trabalhando; pronome/nome → personagem) ──
  const FALA_HIST = 'Historians later found ash from the eruption in ice cores from Greenland to Antarctica.'
  const k1 = plano(S, [{ type: 'support', voiceover: FALA_HIST, prompt: `${semPonto(FICHA_T)}, looking directly into the camera. ${RESTO}` }], FICHA_T).cenas[0]
  v('fala cita o papel ("Historians…"), pessoa posando para a lente → fica, olhando um mapa do lugar da fala', () => k1.apresentador === 'na_historia' && k1.nucleo === `${semPonto(FICHA_T)}, eyes on an old map of Greenland spread out in front of them.` && !OLHAR_LENTE_RE.test(k1.prompt))
  const k2 = plano(S, [{ type: 'support', voiceover: FALA_HIST, prompt: `The historian stands beside a tall window. ${RESTO}` }], FICHA_T).cenas[0]
  v('fala cita o papel, pessoa só posando (sem lente) → ganha "studying an old map of …"', () => k2.apresentador === 'na_historia' && k2.nucleo === 'The historian stands beside a tall window, studying an old map of Greenland spread out in front of them.')
  const k3 = plano(S, [{ type: 'support', voiceover: FALA_HIST, prompt: `The historian, holding an old ledger, looks straight into the lens. ${RESTO}` }], FICHA_T).cenas[0]
  v('fala cita o papel, pessoa já trabalhando → o olhar vai para o trabalho, sem mapa inventado', () => k3.apresentador === 'na_historia' && k3.nucleo === 'The historian, holding an old ledger, looks at the work in their hands.')
  const FICHA_C = 'A female scientist in her 40s, wearing a white lab coat'
  const k4 = plano(S, [{ type: 'support', voiceover: 'She drilled into the Greenland ice and found the ash layer from 1815.', prompt: `${FICHA_C}, looks straight into the lens while holding an ice core. ${RESTO}` }], FICHA_C).cenas[0]
  v('pronome na fala ("She drilled…"): a cientista é personagem → fica fazendo a ação, só sem lente', () => k4.apresentador === 'na_historia' && k4.motivo === 'pessoa da ficha citada na fala (pronome/nome) → fica, sem lente' && k4.nucleo === `${FICHA_C}, looks at the scene in front of them while holding an ice core.`)
  const FICHA_E = 'A volcanologist named Elena Ruiz, in her 40s, wearing a red field jacket'
  const k5 = plano(S, [{ type: 'support', voiceover: 'Elena Ruiz climbed to the rim of the crater at dawn.', prompt: `${FICHA_E}, looking directly into the camera. ${RESTO}` }], FICHA_E).cenas[0]
  v('nome da ficha na fala ("Elena Ruiz climbed…"): fica, sem lente', () => k5.apresentador === 'na_historia' && k5.nucleo === `${FICHA_E}, eyes on the scene in front of them.`)
  const k6 = plano(S, [0, 1, 2].map(() => ({ type: 'support', voiceover: FALA_HIST, prompt: `${semPonto(FICHA_T)}, looking directly into the camera. ${RESTO}` })), FICHA_T)
  v('troca de plano numa cena do apresentador soma o motivo (não apaga "apresentador citado…")', () => k6.cenas.some((c) => /^apresentador citado na fala \(historian\) → fica, sem lente, trabalhando na cena; mesma composição da cena \d → plano \w+$/.test(c.motivo)))

  // ── apresentador fora com a direção (resto) dele: as frases dele e o enquadramento de retrato saem ──
  const f1 = plano(S, [{ type: 'cinematic', voiceover: FALA1_T, prompt: `${semPonto(FICHA_T)}, looking directly into the camera. Medium close-up, subtle handheld camera movement as the historian gestures toward the bookshelves, natural imperfect lighting. Medium shot, light film grain, candid framing. ${RESTO}` }], FICHA_T).cenas[0]
  v('apresentador fora: a frase dele na direção sai, o "Medium shot" do retrato sai, o look fica', () => f1.apresentador === 'fora' && !/historian|bookshel|Medium/i.test(f1.prompt) && f1.prompt.includes('Light film grain, candid framing.') && f1.prompt.includes('Cinematography (match exactly)') && f1.plano === 'aberto')
  // ── olhar para a lente na direção (resto) de uma cena SEM apresentador ──
  const g1 = plano(S, [{ type: 'support', voiceover: 'Fishermen hauled their nets as the storm rolled in.', prompt: 'A fisherman hauls nets on the dock. Medium shot, subtle handheld camera movement, the fisherman glancing at the camera, natural imperfect lighting.' }], 'A weathered fisherman in his 60s, with a white beard')
  v('olhar na direção (resto) de cena sem apresentador: troca; relato olhar_lente=1, apresentador=null', () => g1.cenas[0].prompt.includes('the fisherman glancing at the scene in front of them') && g1.cenas[0].olharLente === 1 && g1.cenas[0].apresentador === null && g1.relato.olhar_lente === 1 && g1.relato.papel_apresentador === null)

  // ── caso em pt ──
  const pt = plano(S, PT, FICHA_T, 'pt')
  v('pt cena 1 ("explodiu"): apresentador fora → "Wide shot of Monte Tambora erupting, …"', () => pt.cenas[0].apresentador === 'fora' && pt.cenas[0].nucleo === 'Wide shot of Monte Tambora erupting, a towering column of ash and fire rising into the sky.')
  v('pt cena 3 ("Os historiadores…"): fica, com o mapa do Monte Tambora', () => pt.cenas[2].apresentador === 'na_historia' && pt.cenas[2].nucleo.endsWith('eyes on an old map of Monte Tambora spread out in front of them.'))
  v('pt cena 4 (sem lugar nem acontecimento): fora, o cenário das cenas anteriores — nem o escritório nem o vulcão', () => pt.cenas[3].apresentador === 'fora' && pt.cenas[3].nucleo === 'Wide establishing shot of the field, seen from far away.' && !/historian|Tambora/i.test(pt.cenas[3].nucleo))
  v('pt: relato fora=2, na_historia=1, olhar_lente=3; cena 2 (sem ninguém) intocada', () => pt.relato.apresentador_fora === 2 && pt.relato.apresentador_na_historia === 1 && pt.relato.olhar_lente === 3 && pt.cenas[1].apresentador === null && pt.cenas[1].motivo === 'mantida')
  v('pt: idempotente', () => { const de2 = plano(S, pt.cenas.map((c, i) => ({ type: PT[i].type, voiceover: PT[i].voiceover, prompt: c.prompt })), FICHA_T, 'pt', PT.map((c) => c.voiceover).join(' ')); return de2.cenas.every((c, i) => c.prompt === pt.cenas[i].prompt) })
  v('pt: ficha em português também é apresentador (cena refeita da fala)', () => { const fp = 'Um historiador de meia-idade, de cabelo castanho curto, casaco de lã verde-escuro, diante de estantes antigas.'; const r = plano(S, [{ type: 'cinematic', voiceover: PT[0].voiceover, prompt: `${semPonto(fp)}, looking directly into the camera. ${RESTO}` }], fp, 'pt'); return r.cenas[0].apresentador === 'fora' && r.cenas[0].nucleo.startsWith('Wide shot of Monte Tambora erupting') })

  // ── (E) controles: Londres 1952 e Boston 1919 (e Tambora 1816) saem byte a byte como sem a regra ──
  const router = src(ROUTER)
  for (const f of FILMES) {
    const pre = planoPreLaco(f, F, router)
    const roteiro = `${f.roteiro} ${pre.map((s) => s.voiceover).join(' ')}`
    const r = plano(S, pre, f.characterSheet, 'en', roteiro)
    const n = plano(N, pre, f.characterSheet, 'en', roteiro)
    v(`controle ${f.nome} (plano real do banco): prompts idênticos aos de sem a regra; papel null; contagens 0`, () => r.cenas.every((c, i) => c.prompt === n.cenas[i].prompt && c.motivo === n.cenas[i].motivo && c.plano === n.cenas[i].plano) && r.relato.papel_apresentador === null && r.relato.apresentador_fora === 0 && r.relato.apresentador_na_historia === 0 && r.relato.olhar_lente === 0)
    // o prompt ENVIADO (com o prefixo antigo "Nobody addresses the camera… never facing the lens"): negação fica, nada muda
    const cru = f.cenas.map((c) => ({ type: c.type, voiceover: c.voiceover, prompt: c.promptEnviado }))
    const rc = plano(S, cru, f.characterSheet, 'en', roteiro)
    const nc = plano(N, cru, f.characterSheet, 'en', roteiro)
    v(`controle ${f.nome} (prompt enviado, com o prefixo negado antigo): idêntico ao de sem a regra; olhar_lente 0`, () => rc.cenas.every((c, i) => c.prompt === nc.cenas[i].prompt) && rc.relato.olhar_lente === 0)
    v(`controle ${f.nome}: âncora de ambiente igual à de sem a regra`, () => S.ambienteComEpoca(f.environmentSheet, S.epocaDoFilmeS25(roteiro)) === N.ambienteComEpoca(f.environmentSheet, N.epocaDoFilmeS25(roteiro)))
  }
  const lR = plano(S, LONDRES_ENSAIO, FICHA_L)
  const lN = plano(N, LONDRES_ENSAIO, FICHA_L)
  v('controle Londres do ensaio de 06/10: personagem da época fica; "He looks away from the camera." intacto; igual a sem a regra', () => lR.cenas[0].prompt.startsWith(`${FICHA_L}, walks through the thick yellow fog`) && lR.cenas[0].prompt.includes('He looks away from the camera.') && lR.cenas.every((c, i) => c.prompt === lN.cenas[i].prompt) && lR.relato.papel_apresentador === null && lR.relato.apresentador_fora === 0 && lR.relato.olhar_lente === 0)

  // ── (F) só o S25: quem importa a lib, onde a rota chama, e as fatias REAIS da rota ──
  const R = src(ROTA)
  // Reancorado 06/10 na integração com o juiz da foto-base (KINEO-JUIZ-STILL-2026-10-06): lib/hollywood/juizStill.ts CITA s25Cena em
  // comentário (é módulo puro, sem import) — conta só IMPORT de verdade; e a chamada do juiz a ambienteComEpoca fica atrás de
  // juizStillLigado(family), que só vale como ramo do S25 enquanto JUIZ_STILL_FAMILIAS for exatamente ['s25'] (linha inteira conferida).
  v('s25Cena só é importado pela rota generate-video-cinematic (varre app/, lib/, components/)', () => { const quem = ['app', 'lib', 'components'].flatMap(arquivosTs).map((p) => relative(RAIZ, p).replace(/\\/g, '/')).filter((p) => p !== LIB && /from\s+['"][^'"]*\/s25Cena['"]/.test(readFileSync(join(RAIZ, p), 'utf8'))).sort(); return JSON.stringify(quem) === JSON.stringify([ROTA]) })
  v("toda chamada de planejarCenasS25/ambienteComEpoca/epocaDoFilmeS25/montarPromptS25 na rota fica num ramo family === 's25' (até 20 linhas acima; o juiz conta como ramo do S25 só com JUIZ_STILL_FAMILIAS = ['s25'])", () => {
    const L = R.split('\n')
    const juizSoS25 = src('lib/hollywood/juizStill.ts').split('\n').some((x) => x === "export const JUIZ_STILL_FAMILIAS: readonly string[] = ['s25']")
    const chamadas = L.map((l, i) => [l, i]).filter(([l]) => /\b(?:planejarCenasS25|ambienteComEpoca|epocaDoFilmeS25|montarPromptS25)\(/.test(l) && !/^\s*(?:import|\/\/)/.test(l))
    return chamadas.length >= 6 && chamadas.every(([, i]) => L.slice(Math.max(0, i - 20), i + 1).some((x) => x.includes("family === 's25'") || (juizSoS25 && x.includes('juizStillLigado(family)'))))
  })
  const corpoEnsaio = fatia(R, '          let s25Ensaio: Record<string, unknown> | null = null', "          await releaseBirthClaim('dry_run_no_charge')")
  const corpoPre = fatia(R, '      // ═══ KINEO-S25-NOTA95-2026-10-06 — a ÚLTIMA passada no plano visual do Seedance 2.5, antes de still e POST ═══', '      for (const [idx, hs] of plan.scenes.entries()) {')
  const linhaAnc = R.split('\n').find((l) => l.includes("...(family === 's25' ? { environmentSheet: ambienteComEpoca("))
  const exprAnc = linhaAnc ? linhaAnc.trim().replace(/^\.\.\./, '').replace(/,\s*\/\/.*$/, '') : null
  let ensaio = null, pre = null, anc = null
  try {
    if (corpoEnsaio) ensaio = carrega(`export async function ensaio(ctx: any) {\n  const { family, plan, prompt, hollywoodLanguage, alignShotsToSpeech, scrubInventedSetting, planejarCenasS25, ambienteComEpoca, epocaDoFilmeS25, montarPromptS25, garantirAcaoCentral, silenciarFalaNoPrompt, eraSuffix } = ctx\n${corpoEnsaio}\n  return s25Ensaio\n}`).ensaio
    if (corpoPre) pre = carrega(`export async function pre(ctx: any) {\n  const { family, planejarCenasS25, plan, prompt, hollywoodLanguage, console, writeServerEvent, S25_CENA_EVENTO, user, generationId } = ctx\n${corpoPre}\n  return s25Plano\n}`).pre
    if (exprAnc) anc = carrega(`export function anc(ctx: any) {\n  const { family, plan, prompt, hollywoodLanguage, ambienteComEpoca, epocaDoFilmeS25 } = ctx\n  return { environmentSheet: plan.environmentSheet, ...${exprAnc} }\n}`).anc
  } catch (e) { V.push([`fatias da rota transpilam (${e.message})`, false]) }
  v('as 3 fatias reais da rota foram achadas (ensaio de $0, passada do render pago, âncora de ambiente)', () => Boolean(ensaio && pre && anc))
  const planT = () => ({ scenes: TAMBORA.map((s, i) => ({ index: i + 1, seconds: 5, ...s })), characterSheet: FICHA_T, environmentSheet: AMBIENTE_T, styleSheet: ESTILO })
  if (ensaio) {
    const seco = await ensaio({ family: 's25', plan: planT(), prompt: ROTEIRO_T, hollywoodLanguage: 'en', alignShotsToSpeech: async () => null, scrubInventedSetting: (t) => ({ text: t, removed: [] }), planejarCenasS25: S.planejarCenasS25, ambienteComEpoca: S.ambienteComEpoca, epocaDoFilmeS25: S.epocaDoFilmeS25, montarPromptS25: S.montarPromptS25, garantirAcaoCentral: F.garantirAcaoCentral, silenciarFalaNoPrompt: F.silenciarFalaNoPrompt, eraSuffix: '' })
    const p1 = String(seco?.prompts?.[0]?.prompt ?? '')
    v('ensaio de $0 (fatia real da rota) Tambora: cena 1 abre com o vulcão, sem historiador nem olhar para a lente', () => p1.startsWith('Wide shot of Mount Tambora in Indonesia erupting') && !/historian|bookshel/i.test(p1) && !OLHAR_LENTE_RE.test(p1))
    v('ensaio de $0 Tambora: ambiente_ancora = a época/lugar, não o escritório', () => seco?.ambiente_ancora === 'Mount Tambora, Indonesia, 1815: period clothing, vehicles, tools and buildings only, no modern items')
    v('ensaio de $0 Tambora: o relato espalhado traz papel_apresentador=historian e apresentador_fora=1', () => seco?.papel_apresentador === 'historian' && seco?.apresentador_fora === 1 && Array.isArray(seco?.cenas) && seco.cenas[0].apresentador === 'fora')
  }
  if (pre) {
    const plan = planT()
    const eventos = []
    const s25Plano = await pre({ family: 's25', planejarCenasS25: S.planejarCenasS25, plan, prompt: ROTEIRO_T, hollywoodLanguage: 'en', console: silencioso, writeServerEvent: async (e) => { eventos.push(e); return true }, S25_CENA_EVENTO: S.S25_CENA_EVENTO, user: { id: 'u' }, generationId: 'g-tambora' })
    v('render pago (fatia real da passada) Tambora: plan.scenes[0].prompt sem o historiador, abre com o vulcão', () => Boolean(s25Plano) && plan.scenes[0].prompt.startsWith('Wide shot of Mount Tambora in Indonesia erupting') && !/historian/i.test(plan.scenes[0].prompt))
    v('render pago: o evento s25_cena_plano leva apresentador_fora=1 e o motivo da cena 1', () => { const ev = eventos.find((e) => e.name === S.S25_CENA_EVENTO); return Boolean(ev) && ev.metadata.generation_id === 'g-tambora' && ev.metadata.apresentador_fora === 1 && ev.metadata.cenas[0].motivo === 'apresentador fora da história → imagem da fala' })
    const planH3 = planT()
    const h3 = await pre({ family: 'h3', planejarCenasS25: S.planejarCenasS25, plan: planH3, prompt: ROTEIRO_T, hollywoodLanguage: 'en', console: silencioso, writeServerEvent: async () => true, S25_CENA_EVENTO: S.S25_CENA_EVENTO, user: { id: 'u' }, generationId: 'g' })
    v('render pago H3: a passada não roda; o prompt do planejador fica como estava', () => h3 === null && planH3.scenes[0].prompt === TAMBORA[0].prompt)
  }
  if (anc) {
    const ctx = (family) => ({ family, plan: planT(), prompt: ROTEIRO_T, hollywoodLanguage: 'en', ambienteComEpoca: S.ambienteComEpoca, epocaDoFilmeS25: S.epocaDoFilmeS25 })
    v('âncora de ambiente (expressão real da rota) S25 Tambora: a época/lugar', () => anc(ctx('s25')).environmentSheet === 'Mount Tambora, Indonesia, 1815: period clothing, vehicles, tools and buildings only, no modern items')
    v('âncora de ambiente (expressão real da rota) H3/Omni: a environmentSheet do GPT, byte a byte', () => anc(ctx('h3')).environmentSheet === AMBIENTE_T && anc(ctx('omni')).environmentSheet === AMBIENTE_T)
  }
  return V
}

console.log('TESTE S25 apresentador — olhar para a lente, apresentador fora da história, âncora de ambiente — 06/10')
const real = await verificacoes()
for (const [rotulo, passou] of real) ok(passou, rotulo)
{
  // o retrato do Tambora antes × depois, para o relatório (não é verificação)
  const S = carrega(rd(LIB))
  const N = carrega(neutraliza(rd(LIB)).s)
  const a = N.planejarCenasS25({ cenas: TAMBORA, roteiro: ROTEIRO_T, characterSheet: FICHA_T, styleSheet: ESTILO, idioma: 'en' })
  const d = S.planejarCenasS25({ cenas: TAMBORA, roteiro: ROTEIRO_T, characterSheet: FICHA_T, styleSheet: ESTILO, idioma: 'en' })
  console.log(`    · cena 1 antes : ${a.cenas[0].prompt.slice(0, 210)}…`)
  console.log(`    · cena 1 depois: ${d.cenas[0].prompt.slice(0, 210)}…`)
  console.log(`    · ambiente antes : ${N.ambienteComEpoca(AMBIENTE_T, N.epocaDoFilmeS25(ROTEIRO_T)).slice(0, 160)}…`)
  console.log(`    · ambiente depois: ${S.ambienteComEpoca(AMBIENTE_T, S.epocaDoFilmeS25(ROTEIRO_T))}`)
}

// ── (G) mutantes — cada um prova que aplicou (grep) e que derruba o guardião ──
const mutants = [
  ['A1 o olhar para a lente fica (troca desligada)', LIB, '  for (const [re, troca] of FORMAS_OLHAR) { // KINEO-S25-APRESENTADOR-2026-10-06', '  for (const [re, troca] of FORMAS_OLHAR.slice(0, 0)) { // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['A2 a negação deixa de proteger ("never facing the lens" vira frase quebrada)', LIB, "      if (NEGA_NA_ORACAO_RE.test(antes.split(/[,.;:!?]/).pop() ?? '')) return m // KINEO-S25-APRESENTADOR-2026-10-06", '      if (false) return m // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['A3 o olhar para a lente fica na direção (resto)', LIB, '    const olharResto = olharNaCena(resto) //', '    const olharResto = { texto: resto, trocas: 0 } //'],
  ['B1 o papel de apresentador deixa de ser lido na ficha', LIB, '  return PAPEIS_APRESENTADOR.find((p) => p.re.test(cabeca)) ?? null // KINEO-S25-APRESENTADOR-2026-10-06', '  return null as null | { papel: string; re: RegExp } // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['B2 a ficha inteira vira cabeça (o "anchor" da tatuagem vira apresentador)', LIB, ".split(CORTE_CABECA_RE)[0] ?? ''", ".split(/$^/)[0] ?? ''"],
  ['B3 a fala que cita o papel deixa de manter a pessoa', LIB, "  if (papelRe.test(f)) return 'papel' // KINEO-S25-APRESENTADOR-2026-10-06", "  if (false) return 'papel' // KINEO-S25-APRESENTADOR-2026-10-06"],
  ['B4 o pronome deixa de proteger a personagem', LIB, '  return PRONOME_PESSOA_RE.test(f) || nomesDaFicha(ficha)', '  return nomesDaFicha(ficha)'],
  ['B5 o nome da ficha deixa de proteger a personagem', LIB, "PRONOME_PESSOA_RE.test(f) || nomesDaFicha(ficha).some((n) => palavrasDaFala.includes(n)) ? 'pessoa' : null", "PRONOME_PESSOA_RE.test(f) ? 'pessoa' : null"],
  ['B6 o apresentador fica mesmo sem ser citado', LIB, '    if (!papel || abstratas[i] || !pessoaDaFichaNaCena(nu, ficha, papel.re)) { // KINEO-S25-APRESENTADOR-2026-10-06', '    if (true) { // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['B7 o núcleo refeito perde a imagem da fala', LIB, '    const imagem = imagemDaFala({ fala, lugar: lugarDaCena, origem, idioma, variante: refeitas, cenario: cenario(i) }) // KINEO-S25-APRESENTADOR-2026-10-06', "    const imagem = '' // KINEO-S25-APRESENTADOR-2026-10-06"],
  ['B8 o acontecimento da fala some da imagem (sem vulcão em erupção)', LIB, '  if (ev && quem) { // KINEO-S25-APRESENTADOR-2026-10-06', '  if (false && ev && quem) { // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['B9 a pessoa citada que só posa não ganha trabalho', LIB, 'nucleos[i] = jaTrabalha || naHistoria.trocas > 0 ? naHistoria.texto : comTrabalho(', 'nucleos[i] = true ? naHistoria.texto : comTrabalho('],
  ['B10 as frases do apresentador ficam na direção (resto)', LIB, "    if (apresentador[i] === 'fora' && papel) resto = semEnquadramentoDePessoa(", '    if (false && papel) resto = semEnquadramentoDePessoa('],
  ['B11 o enquadramento de retrato ("Medium shot") fica', LIB, "const semEnquadramentoDePessoa = (t: string) => limpa((t ?? '').replace(ENQUADRAMENTO_DE_PESSOA_RE, ' '))", "const semEnquadramentoDePessoa = (t: string) => limpa((t ?? ''))"],
  ['B12 o plano do núcleo refeito volta a vir da direção do retrato', LIB, "abstratas[i] || apresentador[i] === 'fora' ? '' : partes[i].resto", "abstratas[i] ? '' : partes[i].resto"],
  ['B13 o cenário anterior não serve de imagem (cena pt sem lugar volta ao vulcão)', LIB, "  if (a.cenario && a.cenario !== 'place') return `Wide establishing shot of the ${a.cenario}, seen from far away.` // KINEO-S25-APRESENTADOR-2026-10-06\n", ''],
  ['C1 a âncora de ambiente volta a ser o escritório', LIB, '  if (epoca && e && cenarioDeApresentador(e)) {', '  if (false) {'],
  ['C2 a âncora troca até o ambiente que é o lugar da história', LIB, 'if (!lugar || !mencionaLugar(e, lugar)) return semPontoFinal(epoca)', 'return semPontoFinal(epoca)'],
  ['C3 um sinal fraco só já vira escritório ("radio studio")', LIB, '.size >= 3 // KINEO-S25-APRESENTADOR-2026-10-06', '.size >= 1 // KINEO-S25-APRESENTADOR-2026-10-06'],
  ['D1 o relato perde a contagem do apresentador fora', LIB, "      apresentador_fora: ativas.filter((c) => c.apresentador === 'fora').length, //", '      apresentador_fora: 0, //'],
  ['D2 o motivo "apresentador fora da história" some', LIB, "    motivos[i] = 'apresentador fora da história → imagem da fala' //", '    motivos[i] = motivos[i] //'],
  ['D3 a troca de plano apaga o motivo do apresentador', LIB, "motivos[alvo] = `${motivos[alvo] ? `${motivos[alvo]}; ` : ''}mesma composição", 'motivos[alvo] = `mesma composição'],
  ['D4 o olhar_lente por cena some', LIB, '      apresentador: apresentador[i], olharLente: olharLente[i], //', '      apresentador: apresentador[i], olharLente: 0, //'],
]
for (const [label, file, from, to] of mutants) {
  const srcText = rd(file)
  if (!srcText.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  const mutated = srcText.replace(from, () => to)
  // prova por grep: a âncora perdeu exatamente uma ocorrência e o texto novo está lá
  if (mutated === srcText || mutated.split(from).length !== srcText.split(from).length - 1 || (to && !mutated.includes(to))) { ok(false, `(${label}) o mutante não aplicou`); continue }
  let bitten = false
  let porque = ''
  try {
    const vs = await verificacoes({ [file]: mutated })
    const falhas = vs.filter(([, p]) => !p)
    bitten = falhas.length > 0
    porque = falhas[0]?.[0] ?? ''
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho${porque ? ` — ${porque.slice(0, 110)}` : ''}`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
