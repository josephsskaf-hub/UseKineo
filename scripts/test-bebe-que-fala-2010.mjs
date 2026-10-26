import { semPaginasIaClaras2110 } from './test-support/desfaz-paginas-ia-claras-2110.mjs' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import { semRoteiroCurto2210 } from './test-support/desfaz-roteiro-curto-2210.mjs' // KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22 — undo only this task in memory before legacy contracts
// KINEO-BEBE-QUE-FALA-2010 — guardião do "AI Kids Cartoon Stories" / "Histórias infantis em desenho 3D com IA" (fundador 20/10: "começa
// hoje"; nota 10 ao curta de teste 4f6c8a40) e do 4º card da home. O 2º modo (bebê-podcast) só tem interruptor e decisão anotada.
//
// O QUE ELE PROVA (lendo os arquivos reais, EXECUTANDO as libs puras num vm, renderizando a faixa dos cards e comparando com a base no git):
//   A. interruptores DESLIGADOS (produto, páginas, 4º card, bebê) e a régua de quem vê (live || casa);
//   B. o template valida a entrada (personagem/língua/duração da lista, ideia limpa, sem link, ideia pronta na língua);
//   C. a regra infantil (sexual, violência, humilhação, produto adulto) barra o que deve e deixa passar história legítima;
//   D. a rota do filme: `kids_cartoon` ausente = nada muda; produto fechado = 404; personagem/motor/duração/texto errados = recusa; ok = estilo
//      3D fixo + ficha do personagem em TODA cena (comPersonagemInfantil idempotente); a fiação na rota vem ANTES do custo e do claim;
//   E. a rota da história: login, interruptor, validação, regra infantil e moderação ANTES do escritor, saída conferida e moderada de novo,
//      nada de débito; a passagem para o /generate (Seedance 1.5, verbatim, kids_cartoon, ≤ teto do handoff da casa);
//   F. o template (/kids-cartoon) só com login e produto aberto, nunca indexado; o /generate só repassa id da lista e só no Seedance;
//   G. a home: SEM o 4º card a faixa renderiza IGUAL à da base (mesma marcação); COM o card: grade de 4, o card com destino, selo honesto, 16
//      línguas e nenhum preço; a KineoLanding decide pelo interruptor;
//   H. páginas: 404 + noindex desligadas; sitemap e /llms.txt vazios desligados e com as 2 URLs ligados; FAQ honesta (made for kids, selo de IA,
//      sem promessa de renda) nas duas línguas;
//   K. desfaz exato (cada arquivo tocado, desfeito, é a base), encadeado como camada mais nova (semMenuUgc2010 chama este primeiro), toda linha
//      nova com a marca, o diff só toca a lista e os novos, todo commit com a marca no assunto;
//   M. mutantes: cada regra acima fica vermelha quando a quebramos de propósito (aplicação provada antes de medir).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  semBebeQueFala2010, desfazBebeQueFala2010, MARCA_BEBE_QUE_FALA_2010, BEBE_QUE_FALA_2010_BASE, BEBE_QUE_FALA_2010_ARQUIVOS,
  BEBE_QUE_FALA_2010_NOVOS, ACRESCIMOS_BEBE_QUE_FALA_2010, TROCAS_BEBE_QUE_FALA_2010,
} from './test-support/desfaz-bebe-que-fala-2010.mjs'
import { semMenuUgc2010 } from './test-support/desfaz-menu-ugc-2010.mjs'
import { semUgcAjustes2010 } from './test-support/desfaz-ugc-ajustes-2010.mjs'
import { semHomeCardsClaros2010 } from './test-support/desfaz-home-cards-claros-2010.mjs' // KINEO-HOME-CARDS-CLAROS-2010 — reâncora: o véu dos cards ficou mais claro depois (fundador 20/10 23:30: "a parte de baixo dos vídeos tá bem escura, arruma isso pra hoje"); a faixa e as linhas são conferidas sem aquela camada
import { semDesenhoSom2110 } from './test-support/desfaz-desenho-som-2110.mjs' // KINEO-DESENHO-SOM-2110 — reâncora: o som do desenho infantil (21/10) mexe na rota do filme, só com desenhoInfantil.ativo
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ROOT = path.resolve(import.meta.dirname, '..')
const MARCA = 'KINEO-BEBE-QUE-FALA-2010'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const affiliateRaw = (file, source) => { const projected = semAfiliado50_2610(file, source); return source.includes('\r\n') ? projected.replace(/\n/g, '\r\n') : projected }
const rd = (rel) => lf(semRoteiroCurto2210(semPaginasIaClaras2110(affiliateRaw(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')), rel), rel))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (rel) => { try { return lf(git('show', `${BEBE_QUE_FALA_2010_BASE}:${rel}`)) } catch { return null } }
let pass = 0
let fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`exceção: ${e.message}`] } }

const F = {
  lib: 'lib/kidsCartoon/kidsCartoon.ts',
  baby: 'lib/kidsCartoon/babyPodcast.ts',
  card: 'lib/ui/homeKidsCard.ts',
  seo: 'lib/seo/paginasKidsCartoon2010.ts',
  rota: 'app/api/generate-video-cinematic/route.ts',
  story: 'app/api/kids-cartoon/story/route.ts',
  tpl: 'app/(dashboard)/kids-cartoon/page.tsx',
  tplComp: 'components/kidsCartoon/KidsCartoonTemplate.tsx',
  gen: 'app/(dashboard)/generate/GenerateClient.tsx',
  three: 'components/home/HomeThreeCards.tsx',
  kidsComp: 'components/home/HomeKidsCard.tsx',
  land: 'app/KineoLanding.tsx',
  pageEn: 'app/ai-kids-cartoon-videos/page.tsx',
  pagePt: 'app/desenho-infantil-3d-com-ia/page.tsx',
  pages: 'components/kidsCartoon/KidsCartoonPages.tsx',
  sitemap: 'app/sitemap.ts',
  llms: 'app/llms.txt/route.ts',
  handoff: 'lib/creationHandoff.ts',
}
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']
const transpila = (code) => ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
function puro(src, nome) {
  const box = { exports: {} }
  vm.runInNewContext(transpila(src), { module: box, exports: box.exports, URLSearchParams, require: (id) => { throw Error(`${nome} não pode importar: ${id}`) } })
  return box.exports
}

// ─── A. interruptores ─────────────────────────────────────────────────────────
function switchProblems(libSrc = rd(F.lib), cardSrc = rd(F.card), babySrc = rd(F.baby)) {
  const p = []
  const L = puro(libSrc, 'kidsCartoon'), C = puro(cardSrc, 'homeKidsCard'), B = puro(babySrc, 'babyPodcast')
  if (L.KIDS_CARTOON_LIVE !== true) p.push('KIDS_CARTOON_LIVE desligado (ligado 20/10 noite, ordem do fundador)')
  if (L.KIDS_CARTOON_PAGES_LIVE !== true) p.push('KIDS_CARTOON_PAGES_LIVE desligado (o menu do topo aponta para a página)')
  if (C.HOME_4TH_CARD_LIVE !== true) p.push('HOME_4TH_CARD_LIVE desligado (os 4 cards no ar, fundador 20:45)')
  if (B.BABY_PODCAST_LIVE !== false) p.push('BABY_PODCAST_LIVE ligado')
  if (B.BABY_PODCAST_PAGES_LIVE !== false) p.push('BABY_PODCAST_PAGES_LIVE ligado')
  if (B.babyPodcastOn(false, false) !== false || B.babyPodcastOn(false, true) !== true) p.push('babyPodcastOn fora da régua')
  if (L.kidsCartoonOn(false, false) !== false || L.kidsCartoonOn(false, true) !== true || L.kidsCartoonOn(true, false) !== true) p.push('kidsCartoonOn fora da régua live || casa')
  if (C.home4thCardOn(false, false) !== false || C.home4thCardOn(false, true) !== true || C.home4thCardOn(true, false) !== true) p.push('home4thCardOn fora da régua')
  if (L.KIDS_CARTOON_MARK !== MARCA || C.HOME_KIDS_CARD_MARK !== MARCA) p.push('marca das libs')
  return p
}
console.log('A. interruptores')
{
  const p = tenta(() => switchProblems())
  ok(p.length === 0, `A1 desenho infantil LIGADO (produto, páginas, 4º card — ordem do fundador 20/10 noite), bebê-podcast DESLIGADO; quem vê = live || casa (${p.join('; ') || 'ok'})`)
  const L = puro(rd(F.lib), 'kidsCartoon')
  const ids = L.KIDS_CHARACTERS.map((c) => c.id)
  const fichas = L.KIDS_CHARACTERS.every((c) => c.sheet.startsWith(`${c.name}, `) && c.sheet.length > 60 && c.kind.en && c.kind.pt && c.kind.es && c.portrait === `/kids-cartoon/${c.id}.webp`) // KINEO-DESENHO-NOTA9-2110 — reâncora: os 6 retratos existem (public/kids-cartoon/<id>.webp); era: c.portrait === ''
  ok(ids.length === 6 && new Set(ids).size === 6 && fichas, 'A2 6 personagens fixos, ficha canônica começando pelo nome (a cena reconhece), tipo em EN/PT/ES')
  ok(L.KIDS_IDEAS.length === 6 && L.KIDS_IDEAS.every((i) => i.en && i.pt && i.es), 'A3 6 ideias prontas nas 3 línguas (variedade)')
  ok(JSON.stringify(L.KIDS_CARTOON_DURATIONS) === '[15,35]' && ['en', 'pt'].every((l) => L.KIDS_CARTOON_LANGUAGES.includes(l)) && L.KIDS_CARTOON_ENGINE === 'seedance', 'A4 Seedance 1.5, 15/35 s, EN e PT no mínimo')
}

// ─── B. validação do template ─────────────────────────────────────────────────
function validProblems(libSrc = rd(F.lib)) {
  const p = []
  const L = puro(libSrc, 'kidsCartoon')
  const v = (r) => L.validateKidsCartoonRequest(r)
  const bom = v({ character: 'leo', language: 'pt', duration: 35, idea: 'aprende a dividir os brinquedos' })
  if (!bom.ok || bom.value.idea !== 'aprende a dividir os brinquedos' || bom.value.ideaId !== null) p.push('pedido bom recusado')
  const pronto = v({ character: 'mia', language: 'en', duration: 15, ideaId: 'seed' })
  if (!pronto.ok || pronto.value.idea !== L.KIDS_IDEAS.find((i) => i.id === 'seed').en || pronto.value.ideaId !== 'seed') p.push('ideia pronta não vira o texto da língua')
  const recusas = [
    { character: 'elsa', language: 'en', duration: 35, idea: 'a long enough idea' },
    { character: 'leo', language: 'fr', duration: 35, idea: 'a long enough idea' },
    { character: 'leo', language: 'en', duration: 60, idea: 'a long enough idea' },
    { character: 'leo', language: 'en', duration: 35, idea: 'see https://x.com/a' },
    { character: 'leo', language: 'en', duration: 35, idea: 'short' },
    { character: 'leo', language: 'en', duration: 35, idea: 'x'.repeat(301) },
    { character: 'leo', language: 'en', duration: 35, ideaId: 'unknown' },
    null,
  ]
  recusas.forEach((r, i) => { if (v(r).ok) p.push(`recusa ${i} passou`) })
  const sujo = v({ character: 'leo', language: 'en', duration: '35', idea: '  learns\u0000  to​ share  ' })
  if (!sujo.ok || sujo.value.idea !== 'learns to share' || sujo.value.duration !== 35) p.push('limpeza de controle/espaço ou duração em texto')
  return p
}
console.log('\nB. validação do template')
{ const p = tenta(() => validProblems()); ok(p.length === 0, `B1 lista fechada, ideia limpa, sem link, ideia pronta na língua (${p.join('; ') || 'ok'})`) }

// ─── C. regra infantil ────────────────────────────────────────────────────────
const BARRA = [['Leo finds a gun', 'violence'], ['Mia and Leo kiss on the lips', 'sexual'], ['a sexy dance', 'sexual'], ['uma história de guerra', 'violence'], ['o Dino com uma faca', 'violence'], ['they make fun of Pip', 'humiliation'], ['os amigos humilham a Bibi', 'humiliation'], ['Pip drinks beer', 'adult_products'], ['Ollie no cassino', 'adult_products'], ['Mia fuma cigarros', 'adult_products'], ['Leo está pelado', 'sexual'], ['sangre en el parque', 'violence']]
const PASSA = ['Leo learns to share toys', 'a shooting star in the sky', 'Mia pulls a weed in the garden', 'a história do patinho feio', 'el niño vino a casa feliz', 'Dino passeia na mata', 'Leo was embarrassed but then laughed', 'Bibi bakes a carrot cake', 'Ollie warms up by the fire']
function ruleProblems(libSrc = rd(F.lib)) {
  const L = puro(libSrc, 'kidsCartoon')
  const p = []
  for (const [t, cat] of BARRA) if (L.kidsContentRefusal(t) !== cat) p.push(`"${t}" → ${L.kidsContentRefusal(t)} (esperava ${cat})`)
  for (const t of PASSA) if (L.kidsContentRefusal(t) !== null) p.push(`"${t}" barrado (${L.kidsContentRefusal(t)})`)
  if (L.kidsContentRefusal('') !== null || L.kidsContentRefusal(null) !== null) p.push('vazio barrado')
  return p
}
console.log('\nC. regra infantil')
{ const p = tenta(() => ruleProblems()); ok(p.length === 0, `C1 ${BARRA.length} barrados na categoria certa, ${PASSA.length} histórias legítimas passam (${p.join('; ') || 'ok'})`) }

// ─── D. a rota do filme ───────────────────────────────────────────────────────
function gateProblems(libSrc = rd(F.lib)) {
  const L = puro(libSrc, 'kidsCartoon')
  const p = []
  const g = (o) => L.desenhoInfantilDoPedido({ raw: 'leo', engine: 'seedance', duration: 35, aberto: true, texto: 'Leo helps a duck', ...o })
  for (const raw of [undefined, null, '']) { const r = g({ raw }); if (r.ativo || r.recusa) p.push(`ausente (${String(raw)}) não é inativo`) }
  const casos = [[{ aberto: false }, 404, 'kids_cartoon_off'], [{ raw: 'elsa' }, 400, 'kids_cartoon_unknown_character'], [{ engine: 'kling' }, 422, 'kids_cartoon_engine'], [{ duration: 60 }, 422, 'kids_cartoon_duration'], [{ texto: 'Leo finds a gun' }, 422, 'kids_cartoon_content']]
  for (const [o, st, reason] of casos) { const r = g(o); if (r.ativo || r.recusa?.status !== st || r.recusa?.reason !== reason || !/Nothing was charged/.test(r.recusa?.error ?? '')) p.push(`recusa ${reason}`) }
  const okr = g({ engine: undefined })
  const leo = L.KIDS_CHARACTERS[0]
  if (!okr.ativo || okr.ficha !== leo.sheet || okr.estilo.look !== 'animated3d' || !/3D animated cartoon/.test(okr.estilo.lookPhrase) || !/never mix with live-action/.test(okr.estilo.suffix)) p.push('pedido bom sem estilo 3D/ficha')
  const cena = '3D look. Leo walks in the park, 9:16 vertical'
  const com = L.comPersonagemInfantil(cena, leo.sheet)
  if (!com.includes(leo.sheet) || !com.includes(L.KIDS_SAFE_SCENE_SUFFIX) || L.comPersonagemInfantil(com, leo.sheet) !== com) p.push('ficha/trava infantil fora da cena ou não idempotente')
  const jaTem = `${cena}. ${leo.sheet}.`
  if ((L.comPersonagemInfantil(jaTem, leo.sheet).split(leo.sheet).length - 1) !== 1) p.push('ficha duplicada quando a cena já a traz')
  return p
}
function wiringProblems(rota0 = rd(F.rota)) { const rota = semDesenhoSom2110(rota0, F.rota) // KINEO-DESENHO-SOM-2110 — reâncora: as 5 linhas do som do desenho (vertical infantil e claim) saem antes da conferência da fiação; era: function wiringProblems(rota = rd(F.rota)) {
  const p = []
  const linhas = rota.split('\n')
  const i = (s) => linhas.findIndex((l) => !l.trimStart().startsWith('//') && l.includes(s))
  const imp = i("from '@/lib/kidsCartoon/kidsCartoon' // KINEO-BEBE-QUE-FALA-2010 [TRAVA 8.2")
  const gate = i('const desenhoInfantil = desenhoInfantilDoPedido({ raw: (body as { kids_cartoon?: unknown }).kids_cartoon, engine: body.engine, duration, aberto: kidsCartoonOn(KIDS_CARTOON_LIVE, isInternalEmail(user.email)), texto: prompt })')
  const rec = i('if (desenhoInfantil.recusa) {')
  const fam = i('const family: CinematicFamily =')
  const custo = i('const cost = creditCostForDuration(')
  const romance = i('if (romanceAdulto.ativo) Object.assign(styleAnchor, forcePhotorealAnchor(')
  const estilo = i('if (desenhoInfantil.ativo) Object.assign(styleAnchor, desenhoInfantil.estilo)')
  const story = i('const storyMode = isStylizedLook(styleAnchor)')
  const estrela = i('if (estrelaFicha) classicVisualPolicy.character = estrelaFicha')
  const ficha = i('if (desenhoInfantil.ativo) classicVisualPolicy.character = desenhoInfantil.ficha')
  const mapa = i('.map((promptDaCena) => (desenhoInfantil.ativo ? comPersonagemInfantil(promptDaCena, desenhoInfantil.ficha) : promptDaCena))')
  const romMap = i('.map((promptDaCena) => (romanceAdulto.ativo ? aplicarRomanceAdulto(promptDaCena, romanceAdulto) : promptDaCena))')
  if (imp < 0) p.push('import com a trava 8.2 ausente')
  if (gate < 0 || rec !== gate + 1) p.push('gate/recusa fora do lugar')
  if (!(gate > 0 && fam === rec + 1 && custo > rec)) p.push('recusa não vem antes do custo/claim')
  if (!linhas[rec]?.includes('return NextResponse.json({ error: desenhoInfantil.recusa.error') || !linhas[rec]?.includes('status: desenhoInfantil.recusa.status')) p.push('recusa sem resposta')
  if (!(estilo === romance + 1 && story > estilo)) p.push('estilo 3D não vence o texto antes da decisão de história')
  if (ficha !== estrela + 1) p.push('ficha do personagem fora da política')
  if (!(mapa === romMap + 1)) p.push('personagem em toda cena fora do vetor final')
  const usos = linhas.filter((l) => !l.trimStart().startsWith('//') && /\bdesenhoInfantil\b/.test(l)).length
  if (usos !== 5) p.push(`desenhoInfantil em ${usos} linhas de código (esperava 5: gate, recusa, estilo, ficha, vetor)`)
  return p
}
console.log('\nD. rota do filme')
{
  const p = tenta(() => gateProblems()); ok(p.length === 0, `D1 ausente = inativo; 404/400/422 antes de cobrar; ok = estilo 3D + ficha em toda cena (${p.join('; ') || 'ok'})`)
  const w = tenta(() => wiringProblems()); ok(w.length === 0, `D2 fiação na rota: [TRAVA 8.2], recusa ANTES do custo/claim, estilo antes da decisão de história, ficha na política, personagem no vetor final (${w.join('; ') || 'ok'})`)
}

// ─── E. a rota da história e a passagem ───────────────────────────────────────
function storyProblems(src = rd(F.story)) {
  const p = []
  const code = src.replace(/^\s*\/\/.*$/gm, '')
  const pos = (s) => code.indexOf(s)
  const ordem = [
    "if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })",
    'if (!kidsCartoonOn(KIDS_CARTOON_LIVE, isInternalEmail(user.email))) return NextResponse.json',
    'const v = validateKidsCartoonRequest(raw)',
    'const regraInfantil = kidsContentRefusal(request.idea)',
    'const tema = await moderateTopic(',
    'const entrada = await moderateContent(',
    'openai.chat.completions.create(',
    'const conferida = kidsStoryCheck(texto',
    'const saida = await moderateContent(',
    'const href = kidsCartoonGenerateHref({ script, request })',
  ]
  const ps = ordem.map(pos)
  ps.forEach((x, k) => { if (x < 0) p.push(`ausente: ${ordem[k].slice(0, 50)}`) })
  if (ps.every((x) => x >= 0) && !ps.every((x, k) => k === 0 || x > ps[k - 1])) p.push('ordem errada (porta → validação → regra infantil → moderação → escritor → conferência → moderação da saída → passagem)')
  if (!code.includes("if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 })")) p.push('validação não recusa')
  if (!code.includes('if (regraInfantil) return recusa(422')) p.push('regra infantil não recusa')
  if (/debit|video_credits|creditCost|deduct/i.test(code)) p.push('cobrança na rota da história')
  if (!code.includes("writerRateFor('cinematic_ai'") || !code.includes('maxWordsForShortFilm(')) p.push('régua fora da do Seedance 1.5')
  return p
}
function handoffProblems(libSrc = rd(F.lib), handoffSrc = rd(F.handoff)) {
  const p = []
  const L = puro(libSrc, 'kidsCartoon')
  const req = { character: 'pip', language: 'pt', duration: 15, idea: 'x', ideaId: null }
  const href = L.kidsCartoonGenerateHref({ script: 'Pip ajuda um passarinho.', request: req })
  const u = new URL(href, 'https://www.usekineo.com')
  if (u.pathname !== '/generate' || u.searchParams.get('engine') !== 'seedance' || u.searchParams.get('script_mode') !== 'verbatim' || u.searchParams.get('kids_cartoon') !== 'pip' || u.searchParams.get('duration') !== '15' || u.searchParams.get('language') !== 'pt' || u.searchParams.get('prompt') !== 'Pip ajuda um passarinho.') p.push(`passagem errada: ${href}`)
  const teto = Number(handoffSrc.match(/export const CREATION_HANDOFF_PROMPT_MAX_CHARS = (\d+)/)?.[1])
  if (L.KIDS_HANDOFF_PROMPT_MAX_CHARS !== teto) p.push(`teto ${L.KIDS_HANDOFF_PROMPT_MAX_CHARS} ≠ handoff da casa ${teto}`)
  if (L.kidsCartoonGenerateHref({ script: 'a'.repeat(teto + 1), request: req }) !== null || L.kidsCartoonGenerateHref({ script: '  ', request: req }) !== null) p.push('texto grande/vazio passa')
  const chk = L.kidsStoryCheck('Leo ' + 'plays '.repeat(40), { character: 'leo', minWords: 36, maxWords: 41 })
  if (!chk.ok) p.push('história boa reprovada')
  if (L.kidsStoryCheck('Mia ' + 'plays '.repeat(40), { character: 'leo', minWords: 36, maxWords: 41 }).reason !== 'no_character') p.push('sem o personagem passa')
  if (L.kidsStoryCheck('Leo plays', { character: 'leo', minWords: 36, maxWords: 41 }).reason !== 'too_short') p.push('curta passa')
  if (L.kidsStoryCheck('Leo finds a gun ' + 'and plays '.repeat(17), { character: 'leo', minWords: 36, maxWords: 41 }).reason !== 'not_innocent') p.push('saída não inocente passa')
  const cap = L.kidsPostCaption('en', 'leo') + L.kidsPostCaption('pt', 'leo')
  if (!/Made with AI/.test(cap) || !/Feito com IA/.test(cap) || !/usekineo\.com/.test(cap)) p.push('legenda sem o selo de IA')
  return p
}
console.log('\nE. rota da história e passagem')
{
  const p = tenta(() => storyProblems()); ok(p.length === 0, `E1 login → interruptor → validação → regra infantil → moderação → escritor → conferência → moderação da saída → passagem; sem cobrança; régua do Seedance (${p.join('; ') || 'ok'})`)
  const h = tenta(() => handoffProblems()); ok(h.length === 0, `E2 /generate no Seedance 1.5, verbatim, kids_cartoon, teto do handoff da casa; conferência da história; legenda "Made with AI" (${h.join('; ') || 'ok'})`)
}

// ─── F. template e /generate ──────────────────────────────────────────────────
function tplProblems(page = rd(F.tpl), comp = rd(F.tplComp), gen = rd(F.gen)) {
  const p = []
  const u = page.indexOf('if (!user) redirect(`/login?redirect=${encodeURIComponent(KIDS_CARTOON_TEMPLATE_PATH)}`)')
  const n = page.indexOf('if (!kidsCartoonOn(KIDS_CARTOON_LIVE, isInternalEmail(user.email))) notFound()')
  if (u < 0 || n < 0 || n < u) p.push('portas do template (login, depois produto aberto)')
  if (!page.includes('robots: { index: false, follow: false }')) p.push('template indexável')
  const code = comp.replace(/^\s*\/\/.*$/gm, '')
  if (/\$\s?\d|\b\d+\s*(?:credits?|cr)\b/i.test(code)) p.push('preço na tela do template')
  if (!code.includes("fetch('/api/kids-cartoon/story'")) p.push('template não passa pelo servidor')
  if (!gen.includes("const kidsCartoonId = isKidsCharacterId(searchParams.get('kids_cartoon')) ? searchParams.get('kids_cartoon') : null")) p.push('/generate lê kids_cartoon sem a lista')
  if (!gen.includes("...(kidsCartoonId && aiEngine === 'seedance' ? { kids_cartoon: kidsCartoonId } : {}),")) p.push('/generate manda kids_cartoon fora do Seedance')
  if ((gen.match(/kids_cartoon/g) || []).length !== 4) p.push(`kids_cartoon ${(gen.match(/kids_cartoon/g) || []).length}× no /generate`)
  return p
}
console.log('\nF. template e /generate')
{ const p = tenta(() => tplProblems()); ok(p.length === 0, `F1 /kids-cartoon: login → produto aberto → tela; noindex; sem preço; /generate só repassa id da lista e só no Seedance (${p.join('; ') || 'ok'})`) }

// ─── G. a home ────────────────────────────────────────────────────────────────
function renderFaixa(threeSrc, props, { lang = 'en', kidsCardSrc = rd(F.card) } = {}) {
  const cache = new Map()
  const stubs = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { __esModule: true, default: ({ children, ...pr }) => React.createElement('a', pr, children) },
    '@/components/InterfaceLanguage': { UiLabel: ({ children }) => children, useUiCopy: () => (v) => v, useInterfaceLanguage: () => lang },
    '@/lib/analytics': { trackEvent: async () => true },
    '@/lib/ads/sample': { ADS_SAMPLE_LIVE: true },
  }
  const srcOf = { 'components/home/HomeThreeCards.tsx': threeSrc, 'lib/ui/homeKidsCard.ts': kidsCardSrc }
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const req = (id) => {
      if (stubs[id]) return stubs[id]
      const b = id.startsWith('@/') ? id.slice(2) : path.posix.join(path.posix.dirname(file), id)
      const t = [b, `${b}.ts`, `${b}.tsx`].find((f) => srcOf[f] !== undefined || fs.existsSync(path.join(ROOT, f)) && fs.statSync(path.join(ROOT, f)).isFile())
      if (!t) throw Error(`dependência inesperada: ${id}`)
      return load(t)
    }
    vm.runInNewContext(transpila(srcOf[file] ?? rd(file)), { module: mod, exports: mod.exports, require: req, URLSearchParams, console })
    return mod.exports
  }
  const C = load('components/home/HomeThreeCards.tsx').default
  return renderToStaticMarkup(React.createElement(C, props))
}
function homeProblems(threeSrc0 = rd(F.three), land = rd(F.land), cardSrc = rd(F.card)) { const threeSrc = semHomeCardsClaros2010(threeSrc0, F.three) // KINEO-HOME-CARDS-CLAROS-2010 — reâncora: a faixa comparada à base sem o véu mais claro de 20/10 23:30; era: function homeProblems(threeSrc = rd(F.three), land = rd(F.land), cardSrc = rd(F.card)) {
  const p = []
  const baseThree = base(F.three)
  const C0 = puro(cardSrc, 'homeKidsCard')
  if (!/video:not\(\[data-trio\]\)\{object-position:50% 92%\}/.test(C0.HOME_CARDS_AJUSTE_CSS) || !/ugc_ads"\] \.k3c-media video\{object-position:50% 70%/.test(C0.HOME_CARDS_AJUSTE_CSS)) p.push('enquadramento dos cards (letreiro fora da borda) ausente')
  for (const signedIn of [false, true]) {
    const antes = renderFaixa(baseThree, { signedIn })
    const tira = (h) => h.split(`<style>${C0.HOME_CARDS_AJUSTE_CSS}</style>`).join('') // o enquadramento (sempre) é a única diferença permitida sem o 4º card
    if (tira(renderFaixa(threeSrc, { signedIn }, { kidsCardSrc: cardSrc })) !== antes) p.push(`sem a prop (signedIn=${signedIn}) a faixa mudou`)
    if (tira(renderFaixa(threeSrc, { signedIn, kidsCard: false }, { kidsCardSrc: cardSrc })) !== antes) p.push(`kidsCard=false (signedIn=${signedIn}) a faixa mudou`)
  }
  const C = puro(cardSrc, 'homeKidsCard')
  const com = renderFaixa(threeSrc, { signedIn: false, kidsCard: true }, { kidsCardSrc: cardSrc })
  if (!com.includes('data-k3c-cols="4"') || (com.match(/class="k3c-card"/g) || []).length !== 4 || !com.includes('data-home-card="kids_cartoon"')) p.push('com o card: grade de 4 e 4 cards')
  if (!com.includes(C.HOME_KIDS_CARD_CSS.slice(0, 40).replace(/"/g, '&quot;')) && !com.includes('data-k3c-cols=\\"4\\"') && !com.includes('k3c-kids-art{')) p.push('com o card: CSS da grade de 4 ausente')
  if (!com.includes(`href="${C.homeKidsCardHref(false).replace(/&/g, '&amp;')}"`) || !C.homeKidsCardHref(false).startsWith('/signup?redirect=%2Fkids-cartoon') || C.homeKidsCardHref(true) !== '/kids-cartoon?utm_source=home_card') p.push('destino do card')
  const kids = com.slice(com.lastIndexOf('data-home-card="kids_cartoon"'))
  const kidsTxt = kids.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  if (/\$\s?\d|\b\d+\s*(?:credits?|cr)\b|\bfree\b|grátis/i.test(kidsTxt)) p.push(`preço/oferta no card: ${kidsTxt.slice(0, 160)}`)
  if (kids.includes('SEEDANCE 1.5') || !C.HOME_KIDS_CARD_BADGE.startsWith('SEEDANCE 1.5')) p.push('selo do motor de volta no card / rótulo honesto sumiu da lib') // KINEO-HOME-CARDS-CLAROS-2010 — reâncora: o card não mostra mais o motor (fundador 21/10: "pode tirar o motor de todos os cards desses 4 primeiros"); o rótulo real segue na lib; era: if (!kids.includes('SEEDANCE 1.5')) p.push('selo sem o motor real')
  if (!kids.includes('AI Cartoon Videos') || !kids.includes('Make my cartoon') || !kids.includes('3D kids cartoon')) p.push('textos EN do card (nome do mercado "AI Cartoon Videos", kids/3D na frase)')
  const reel = com.slice(com.indexOf('data-home-card="product_ads">'), com.indexOf('data-home-card="ugc_ads">'))
  if (!reel.includes('data-home-ads-reel="1"') || (reel.match(/<video/g) || []).length !== 4 || (reel.match(/data-trio=""/g) || []).length !== 3 || !reel.includes('/previews/home-card-close-real-en.mp4') || !['1', '2', '3'].every((n) => reel.includes(`/previews/promo-ads-3var-${n}.mp4`))) p.push('card de produto sem o reel Lume + 3 trios no modo 4 cards')
  const pt = renderFaixa(threeSrc, { signedIn: true, kidsCard: true }, { lang: 'pt', kidsCardSrc: cardSrc })
  if (!pt.includes('Vídeos de desenho com IA') || !pt.includes('Fazer meu desenho')) p.push('textos PT do card')
  if (!pt.includes('/previews/home-card-close-real-pt.mp4')) p.push('reel em PT sem o Close real em português')
  const copy = C.HOME_KIDS_CARD_COPY
  if (JSON.stringify(Object.keys(copy)) !== JSON.stringify(LANGS)) p.push(`línguas do card = ${Object.keys(copy).join(',')}`)
  for (const l of LANGS.filter((x) => x !== 'en')) if (copy[l][2] === copy.en[2] || copy[l][0] === copy.en[0]) p.push(`${l} em inglês cru`)
  if (!C.HOME_KIDS_CARD_CLIP || !fs.existsSync(path.join(ROOT, 'public', C.HOME_KIDS_CARD_CLIP.src)) || !fs.existsSync(path.join(ROOT, 'public', C.HOME_KIDS_CARD_CLIP.poster)) || fs.statSync(path.join(ROOT, 'public', C.HOME_KIDS_CARD_CLIP.src)).size > 1.5 * 1024 * 1024) p.push('vídeo do card (prévia ≤ 1,5 MB + pôster)')
  if (!land.includes('  const showKidsCard = home4thCardOn(HOME_4TH_CARD_LIVE, isInternalEmail(initialEmail))') || !land.includes('<HomeThreeCards signedIn={isSignedIn} kidsCard={showKidsCard} />')) p.push('KineoLanding não decide pelo interruptor')
  return p
}
console.log('\nG. home')
{ const p = tenta(() => homeProblems()); ok(p.length === 0, `G1 sem o card = faixa IGUAL à base (2 estados); com o card: grade de 4, destino, selo Seedance, 16 línguas, sem preço; landing pelo interruptor (${p.join('; ') || 'ok'})`) }

// ─── H. páginas ───────────────────────────────────────────────────────────────
function pagesProblems(seoSrc = rd(F.seo), en = rd(F.pageEn), pt = rd(F.pagePt), pages = rd(F.pages), sitemap = rd(F.sitemap), llms = rd(F.llms)) {
  const p = []
  const S = puro(seoSrc, 'paginasKidsCartoon2010')
  if (S.paginasKidsSitemapPaths(false).length !== 0 || JSON.stringify(S.paginasKidsSitemapPaths(true)) !== JSON.stringify(['/ai-kids-cartoon-videos', '/desenho-infantil-3d-com-ia'])) p.push('sitemap fora do interruptor')
  if (S.paginasKidsLlmsSection('https://x', false) !== '' || !S.paginasKidsLlmsSection('https://x', true).includes('/ai-kids-cartoon-videos')) p.push('/llms.txt fora do interruptor')
  if (S.paginasKidsRobots(false).index !== false || S.paginasKidsRobots(true).index !== true) p.push('robots fora do interruptor')
  const alt = S.paginasKidsAlternates('/desenho-infantil-3d-com-ia')
  if (alt.languages['pt-BR'] !== 'https://www.usekineo.com/desenho-infantil-3d-com-ia' || alt.languages['x-default'] !== 'https://www.usekineo.com/ai-kids-cartoon-videos') p.push('hreflang')
  for (const [nome, src, lang] of [['EN', en, 'en'], ['PT', pt, 'pt']]) {
    if (!src.includes('  if (!KIDS_CARTOON_PAGES_LIVE) notFound()') || !src.includes(`kidsPageMetadata('${lang}')`)) p.push(`página ${nome} sem 404 pelo interruptor`)
  }
  if (!pages.includes('robots: paginasKidsRobots(KIDS_CARTOON_PAGES_LIVE)')) p.push('metadata sem robots do interruptor')
  if (!/made for kids/i.test(pages) || !/conteúdo para crianças/i.test(pages) || !/We do not promise income/.test(pages) || !/Não prometemos renda/.test(pages) || !/AI label/.test(pages) || !/rótulo de IA/.test(pages) || !/repetitive/.test(pages) || !/repetitivo/.test(pages)) p.push('FAQ sem a honestidade (made for kids, selo de IA, sem renda, repetitivo) nas 2 línguas')
  if (!sitemap.includes('...paginasKidsSitemapPaths(KIDS_CARTOON_PAGES_LIVE).map((path) =>')) p.push('sitemap.ts não passa pelo interruptor')
  if (!llms.includes('paginasKidsLlmsSection(BASE, KIDS_CARTOON_PAGES_LIVE)}${babyPagesLlmsSection(BASE, BABY_PODCAST_PAGES_LIVE)}## Videos from an idea or a script')) p.push('/llms.txt não passa pelo interruptor (ou mudou a linha seguinte)')
  return p
}
console.log('\nH. páginas')
{ const p = tenta(() => pagesProblems()); ok(p.length === 0, `H1 404 + noindex desligadas; sitemap/llms.txt vazios desligados, 2 URLs ligados (IndexNow pelo cron); hreflang; FAQ honesta nas 2 línguas (${p.join('; ') || 'ok'})`) }

// ─── P. bebê-podcast (o 2º modo) ─────────────────────────────────────────────
F.babyRoute = 'app/api/baby-podcast/prepare/route.ts'
F.babyTpl = 'app/(dashboard)/baby-podcast/page.tsx'
F.babyComp = 'components/kidsCartoon/BabyPodcastTemplate.tsx'
F.babyPages = 'components/kidsCartoon/BabyPodcastPages.tsx'
F.avatar = 'app/api/generate-avatar/route.ts'
function babyLibProblems(src = rd(F.baby)) {
  const p = []
  const B = puro(src, 'babyPodcast')
  const ready = B.babiesReady().map((b) => b.id)
  if (ready.length < 3 || ready.length > 4) p.push(`bebês com retrato = ${ready.length} (3–4)`)
  if (!B.BABY_PODCAST_BABIES.every((b) => B.babyPortraitUrl(b.portrait) === null || b.portrait.startsWith(B.BABY_PORTRAITS_BUCKET))) p.push('retrato fora do nosso bucket')
  if (B.babyPortraitUrl('https://evil.example/a.png') !== null || B.babyPortraitUrl(`${B.BABY_PORTRAITS_BUCKET}../x.png`) !== null) p.push('retrato de fora aceito')
  const ok1 = B.validateBabyPodcastRequest({ baby: ready[0], language: 'pt', topic: 'por que soneca é superestimada' })
  if (!ok1.ok || ok1.value.mode !== 'write') p.push('pedido bom recusado')
  for (const r of [{ baby: 'robot', language: 'en', topic: 'naps are great fun' }, { baby: ready[0], language: 'es', topic: 'naps are great fun' }, { baby: ready[0], language: 'en', topic: 'hi' }, { baby: ready[0], language: 'en', topic: 'see www.x.com now' }, { baby: ready[0], language: 'en', topic: 'too short to paste here', mode: 'verbatim' }]) if (B.validateBabyPodcastRequest(r).ok) p.push(`recusa passou: ${JSON.stringify(r).slice(0, 50)}`)
  const pl = B.babyAvatarPayload({ generationId: 'abc12345', script: 'x', language: 'en', avatarImageUrl: 'u' })
  if (pl.engine !== 'presenter' || pl.scriptMode !== 'verbatim' || pl.noBroll !== true || pl.voiceId !== 'English_PlayfulGirl' || pl.duration !== 15) p.push('corpo do generate-avatar fora do caminho do teste (presenter, verbatim, sem B-roll, PlayfulGirl)')
  if (JSON.stringify(B.BABY_PODCAST_WORDS) !== '{"min":30,"max":45}') p.push('faixa de palavras ≠ 30–45')
  const refusal = (t) => (/gun|beer/.test(t) ? 'x' : null)
  if (B.babyScriptCheck('word '.repeat(29), refusal).reason !== 'too_short' || B.babyScriptCheck('word '.repeat(46), refusal).reason !== 'too_long' || B.babyScriptCheck('beer ' + 'word '.repeat(35), refusal).reason !== 'not_innocent' || !B.babyScriptCheck('word '.repeat(35), refusal).ok) p.push('conferência da fala')
  if (!B.isBabyPodcastAvatarUrl('https://x.supabase.co/storage/v1/object/public/avatars/u1/baby-podcast-studio.png', 'u1') || B.isBabyPodcastAvatarUrl('https://x.supabase.co/storage/v1/object/public/avatars/u1/face-1.png', 'u1') || B.babyAvatarObjectPath('u1', 'car') !== 'u1/baby-podcast-car.png') p.push('reconhecimento do retrato do bebê')
  if (!/AI-generated/.test(B.babyPostCaption('en')) || !/Gerado por IA|gerado por IA/.test(B.babyPostCaption('pt'))) p.push('legenda sem o selo AI-generated')
  if (B.babyPagesSitemapPaths(false).length !== 0 || B.babyPagesSitemapPaths(true).length !== 2 || B.babyPagesLlmsSection('x', false) !== '') p.push('páginas fora do interruptor')
  return p
}
function babyRouteProblems(src = rd(F.babyRoute), avatar = rd(F.avatar), tpl = rd(F.babyTpl), comp = rd(F.babyComp)) {
  const p = []
  const code = src.replace(/^\s*\/\/.*$/gm, '')
  const ordem = ["if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })", 'if (!babyPodcastOn(BABY_PODCAST_LIVE, isInternalEmail(user.email))) return', 'const v = validateBabyPodcastRequest(raw)', 'if (kidsContentRefusal(request.topic)) return recusa(422', 'const tema = await moderateTopic(', 'const entrada = await moderateContent(', 'openai.chat.completions.create(', 'const saida = await moderateContent(', 'const fonte = babyPortraitUrl(baby.portrait)', "admin.storage.from('avatars').upload(objeto"]
  const ps = ordem.map((s) => code.indexOf(s))
  ps.forEach((x, k) => { if (x < 0) p.push(`ausente: ${ordem[k].slice(0, 50)}`) })
  if (ps.every((x) => x >= 0) && !ps.every((x, k) => k === 0 || x > ps[k - 1])) p.push('ordem errada na rota de preparo')
  if (/debit|video_credits|creditCost|deduct/i.test(code)) p.push('cobrança na rota de preparo')
  const al = avatar.split('\n')
  const regra = al.findIndex((l) => l.includes('if (!dryRun && !videoMode && isBabyPodcastAvatarUrl(avatarImageUrl, userId) && kidsContentRefusal(prompt)) { await releaseAvatarSubmission(); return NextResponse.json({ error: KIDS_REFUSAL_MESSAGE.en'))
  const seguranca = al.findIndex((l) => l.includes('const avatarSafety = await moderateContent({'))
  const tts = al.findIndex((l) => l.includes('audioBuffer = await synthesizeWithVoice({ voiceId: cloneVoiceId'))
  const debito = al.findIndex((l) => /debitVideoCredits\(/.test(l) && !l.trimStart().startsWith('//') && !l.trimStart().startsWith('import'))
  if (!(regra > seguranca && seguranca > 0 && regra < tts && (debito < 0 || regra < debito))) p.push('regra infantil do generate-avatar fora do lugar (depois da moderação, antes do TTS e do débito)')
  if (!avatar.includes("[TRAVA 8.2 — vai do fundador 20/10 \"começa hoje\"]")) p.push('generate-avatar sem o selo da trava 8.2')
  if (!tpl.includes('if (!user) redirect(`/login?redirect=${encodeURIComponent(BABY_PODCAST_TEMPLATE_PATH)}`)') || !tpl.includes('if (!babyPodcastOn(BABY_PODCAST_LIVE, isInternalEmail(user.email))) notFound()') || !tpl.includes('robots: { index: false, follow: false }')) p.push('portas da tela do bebê')
  const cc = comp.replace(/^\s*\/\/.*$/gm, '')
  if (!cc.includes("postJson('/api/generate-avatar', babyAvatarPayload(") || !cc.includes('quality: BABY_PODCAST_QUALITY') || !cc.includes('`/api/avatar-status?request_id=${encodeURIComponent(requestId)}&engine=${BABY_PODCAST_ENGINE}`')) p.push('tela fora do caminho do /avatar')
  if ((cc.match(/\{price\} credits/g) || []).length !== 1 || /\b\d+\s*credits\b/.test(cc)) p.push('preço fora do botão de gerar (ou digitado)')
  return p
}
function babyPagesProblems(pages = rd(F.babyPages), en = rd('app/ai-baby-podcast-videos/page.tsx'), pt = rd('app/videos-bebe-podcast-ia/page.tsx'), sitemap = rd(F.sitemap)) {
  const p = []
  for (const [n, s] of [['EN', en], ['PT', pt]]) if (!s.includes('  if (!BABY_PODCAST_PAGES_LIVE) notFound()')) p.push(`página ${n} sem 404 pelo interruptor`)
  if (!pages.includes('robots: paginasKidsRobots(BABY_PODCAST_PAGES_LIVE)')) p.push('robots fora do interruptor')
  if (!/We do not promise income/.test(pages) || !/Não prometemos renda/.test(pages) || !/AI label/.test(pages) || !/rótulo de IA/.test(pages) || !/reused-content/.test(pages) || !/made for kids/.test(pages)) p.push('FAQ sem a honestidade (renda, rótulo de IA, conteúdo reutilizado, made for kids)')
  if (!sitemap.includes('...babyPagesSitemapPaths(BABY_PODCAST_PAGES_LIVE).map((path) =>')) p.push('sitemap do bebê fora do interruptor')
  return p
}
console.log('\nP. bebê-podcast')
{
  const a = tenta(() => babyLibProblems()); ok(a.length === 0, `P1 4 retratos da casa no nosso bucket, validação, corpo do /avatar (presenter, verbatim, sem B-roll, PlayfulGirl), 30–45 palavras, selo AI-generated, páginas pelo interruptor (${a.join('; ') || 'ok'})`)
  const b = tenta(() => babyRouteProblems()); ok(b.length === 0, `P2 preparo: porta → interruptor → validação → regra infantil → moderação → escritor → moderação da saída → retrato copiado, sem cobrança; generate-avatar barra roteiro não inocente no retrato do bebê ANTES do TTS/débito; tela pelo caminho do /avatar, preço só no botão (${b.join('; ') || 'ok'})`)
  const c = tenta(() => babyPagesProblems()); ok(c.length === 0, `P3 páginas do bebê: 404 + noindex desligadas, FAQ honesta, sitemap pelo interruptor (${c.join('; ') || 'ok'})`)
}

// ─── K. desfaz, encadeamento, diff, commits ───────────────────────────────────
console.log('\nK. desfaz exato, encadeamento, diff, commits')
{
  const difs = []
  for (const f of BEBE_QUE_FALA_2010_ARQUIVOS) {
    const b = base(f)
    if (b === null) { difs.push(`${f}: fora da base`); continue }
    let out
    try { out = semBebeQueFala2010(semRoteiroCurto2210(semPaginasIaClaras2110(affiliateRaw(f, fs.readFileSync(path.join(ROOT, f), 'utf8')), f), f), f) } catch (e) { difs.push(`${f}: ${e.message}`); continue }
    if (lf(out) !== b) difs.push(f)
  }
  ok(difs.length === 0, `K1 ${BEBE_QUE_FALA_2010_ARQUIVOS.length} arquivos tocados, desfeitos, = base ${BEBE_QUE_FALA_2010_BASE.slice(0, 9)} (${difs.join('; ') || 'ok'})`)
  ok(BEBE_QUE_FALA_2010_NOVOS.every((f) => fs.existsSync(path.join(ROOT, f)) && base(f) === null), `K2 os ${BEBE_QUE_FALA_2010_NOVOS.length} arquivos novos existem e não existiam na base`)
  const trocasOk = Object.entries(TROCAS_BEBE_QUE_FALA_2010).every(([f, t]) => BEBE_QUE_FALA_2010_ARQUIVOS.includes(f) && t.every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  ok(trocasOk && Object.values(ACRESCIMOS_BEBE_QUE_FALA_2010).every((n) => Number.isInteger(n) && n >= 0), 'K3 trocas: linha nova com a marca, linha da base sem; contagens inteiras')
  const MENU = rd('scripts/test-support/desfaz-menu-ugc-2010.mjs')
  const cadeia = /export function semMenuUgc2010\(texto, p\) \{\n  texto = semBebeQueFala2010\(texto, p\)/.test(MENU)
  const igual = BEBE_QUE_FALA_2010_ARQUIVOS.every((f) => { const raw = semRoteiroCurto2210(semPaginasIaClaras2110(affiliateRaw(f, fs.readFileSync(path.join(ROOT, f), 'utf8')), f), f), semEste = semBebeQueFala2010(raw, f); return semMenuUgc2010(raw, f) === semMenuUgc2010(semEste, f) && semUgcAjustes2010(raw, f) === semUgcAjustes2010(semEste, f) })
  ok(cadeia && igual, 'K4 encadeamento: semMenuUgc2010 (a cabeça das cadeias) tira esta camada PRIMEIRO; ugc-ajustes e as de baixo herdam')
  let lancou = false
  try { semBebeQueFala2010(rd(F.land) + `\n// linha nova ${MARCA}`, F.land) } catch { lancou = true }
  ok(semBebeQueFala2010('sem marca', F.land) === 'sem marca' && semBebeQueFala2010(rd(F.land), 'outro/arquivo.tsx') === rd(F.land) && desfazBebeQueFala2010(F.land, null) === null && lancou, 'K5 idempotente fora da lista / sem a marca / null; acréscimo a mais lança')
  const TOPO = git('log', '--format=%H', `--grep=${MARCA}`, '-1', 'HEAD').trim() || 'HEAD' // o último commit da entrega, merge incluso (a base é a origin/main do último merge)
  const tocados = new Set([...git('diff', '--name-only', BEBE_QUE_FALA_2010_BASE, TOPO).trim().split('\n'), ...git('diff', '--name-only', 'HEAD').trim().split('\n')].filter(Boolean))
  const permitidos = new Set([...BEBE_QUE_FALA_2010_ARQUIVOS, ...BEBE_QUE_FALA_2010_NOVOS])
  const fora = [...tocados].filter((f) => !permitidos.has(f))
  const semMarca = BEBE_QUE_FALA_2010_ARQUIVOS.filter((f) => { const b = new Set((base(f) ?? '').split('\n')); return !semHomeCardsClaros2010(rd(f), f).split('\n').every((l) => b.has(l) || l.includes(MARCA)) }) // KINEO-HOME-CARDS-CLAROS-2010 — reâncora: as linhas do véu mais claro (camada mais nova) saem antes da conferência da marca
  ok(tocados.size > 0 && fora.length === 0 && semMarca.length === 0 && ![...tocados].some((f) => /engineCost|lib\/credits\//.test(f)), `K6 o diff da base só toca a lista e os novos; toda linha nova traz a marca; nenhuma tabela de preço/crédito (${[...fora.map((f) => `fora: ${f}`), ...semMarca.map((f) => `sem marca: ${f}`)].join('; ') || 'ok'})`)
  const assuntos = git('log', '--format=%s', `${BEBE_QUE_FALA_2010_BASE}..${TOPO}`).trim().split('\n').filter(Boolean)
  ok(assuntos.length > 0 && assuntos.every((s) => s.includes(MARCA)), `K7 todo commit da entrega traz a marca no assunto (${assuntos.length})`)
}

// ─── M. mutantes ─────────────────────────────────────────────────────────────
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
function mut(nome, src, de, para, fn) {
  if (!src.includes(de)) { ok(false, `${nome} — âncora do mutante não encontrada`); return }
  const mutado = src.split(de).join(para)
  if (mutado === src) { ok(false, `${nome} — mutante não aplicou`); return }
  const p = tenta(() => fn(mutado))
  ok(p.length > 0, `${nome} → vermelho (${String(p[0] ?? '').slice(0, 90)})`)
}
const LIB = rd(F.lib), CARD = rd(F.card), ROTA = rd(F.rota), STORY = rd(F.story), THREE = rd(F.three), GEN = rd(F.gen), TPL = rd(F.tpl)
mut('M1 produto desligado sem ordem', LIB, 'export const KIDS_CARTOON_LIVE = true', 'export const KIDS_CARTOON_LIVE = false', (s) => switchProblems(s))
mut('M2 4º card desligado sem ordem', CARD, 'export const HOME_4TH_CARD_LIVE = true', 'export const HOME_4TH_CARD_LIVE = false', (s) => switchProblems(undefined, s))
mut('M3 bebê-podcast ligado', rd(F.baby), 'export const BABY_PODCAST_LIVE = false', 'export const BABY_PODCAST_LIVE = true', (s) => switchProblems(undefined, undefined, s))
mut('M4 validação aceita 60 s', LIB, 'export const KIDS_CARTOON_DURATIONS = [15, 35] as const', 'export const KIDS_CARTOON_DURATIONS = [15, 35, 60] as const', (s) => validProblems(s))
mut('M5 validação aceita link', LIB, "if (/https?:\\/\\/|www\\./i.test(typed))", 'if (false)', (s) => validProblems(s))
mut('M6 regra infantil sem armas', LIB, '|guns?|pistols?', '|pistols?', (s) => ruleProblems(s))
mut('M7 regra infantil barra "shooting star"', LIB, '|stab(?:s|bed|bing)?|', '|stab(?:s|bed|bing)?|shooting|', (s) => ruleProblems(s))
mut('M8 rota com produto fechado aceita', LIB, "  if (!i.aberto) return { ativo: false, recusa: { status: 404,", "  if (false) return { ativo: false, recusa: { status: 404,", (s) => gateProblems(s))
mut('M9 cena sem a ficha do personagem', LIB, "  if (!p.includes(sheet)) p = `${p.replace(/[\\s.]+$/, '')}. The same main character appears in this scene, consistent design: ${sheet}.`", '', (s) => gateProblems(s))
mut('M10 recusa da rota DEPOIS do custo', ROTA, ROTA.split('\n').find((l) => l.includes('if (desenhoInfantil.recusa) {')) + '\n', '', (s) => wiringProblems(s.replace('    const cost = creditCostForDuration(', `${ROTA.split('\n').find((l) => l.includes('if (desenhoInfantil.recusa) {'))}\n    const cost = creditCostForDuration(`)))
mut('M11 personagem fora do vetor final', ROTA, ROTA.split('\n').find((l) => l.includes('comPersonagemInfantil(promptDaCena')) + '\n', '', (s) => wiringProblems(s))
mut('M12 história sem a regra infantil', STORY, '  if (regraInfantil) return recusa(422', '  if (false) return recusa(422', (s) => storyProblems(s))
mut('M13 escritor antes da moderação', STORY, '  const tema = await moderateTopic(', '  void openai.chat.completions.create(null as never); const tema = await moderateTopic(', (s) => storyProblems(s))
mut('M14 passagem sem verbatim', LIB, "    script_mode: 'verbatim',", "    script_mode: 'ai',", (s) => handoffProblems(s))
mut('M15 template sem login', TPL, '  if (!user) redirect(`/login?redirect=${encodeURIComponent(KIDS_CARTOON_TEMPLATE_PATH)}`)', '', (s) => tplProblems(s))
mut('M16 /generate manda kids_cartoon em qualquer motor', GEN, "kidsCartoonId && aiEngine === 'seedance' ?", 'kidsCartoonId ?', (s) => tplProblems(undefined, undefined, s))
mut('M17 CSS de 4 colunas sempre emitido', THREE, "      {kidsCard ? <style dangerouslySetInnerHTML={{ __html: HOME_KIDS_CARD_CSS }} /> : null}", "      <style dangerouslySetInnerHTML={{ __html: HOME_KIDS_CARD_CSS }} />", (s) => homeProblems(s))
mut('M18 grade marcada de 4 mesmo desligada', THREE, "data-k3c-cols={kidsCard ? '4' : undefined}", "data-k3c-cols={kidsCard ? '4' : '3'}", (s) => homeProblems(s))
mut('M19 card com preço', rd(F.card), "  en: ['AI Cartoon Videos', '3D kids cartoon stories with the same character, ready to post.', 'Make my cartoon'],", "  en: ['AI Cartoon Videos', '3D kids cartoon stories with the same character, ready to post.', 'Make my cartoon · 15 credits'],", (s) => homeProblems(undefined, undefined, s))
mut('M20 página EN sem 404 desligada', rd(F.pageEn), '  if (!KIDS_CARTOON_PAGES_LIVE) notFound()\n', '', (s) => pagesProblems(undefined, s))
mut('M21 sitemap publica desligado', rd(F.seo), '  return live === true ? PAGINAS_KIDS_PATHS : []', '  return PAGINAS_KIDS_PATHS', (s) => pagesProblems(s))
mut('M22 FAQ promete renda', rd(F.pages), 'We do not promise income.', 'Earn passive income.', (s) => pagesProblems(undefined, undefined, undefined, s))
{
  const quebrado = rd('scripts/test-support/desfaz-menu-ugc-2010.mjs').replace('  texto = semBebeQueFala2010(texto, p) // KINEO-BEBE-QUE-FALA-2010 — a camada mais nova sai primeiro\n', '')
  ok(quebrado !== rd('scripts/test-support/desfaz-menu-ugc-2010.mjs') && !/export function semMenuUgc2010\(texto, p\) \{\n  texto = semBebeQueFala2010\(texto, p\)/.test(quebrado), 'M23 cabeça da cadeia sem chamar esta camada → K4 vermelho')
  let lancou = false
  try { semBebeQueFala2010(rd(F.land).replace(/^.*const showKidsCard = .*\n/m, ''), F.land) } catch { lancou = true }
  ok(lancou, 'M24 desfaz com um acréscimo a menos (linha apagada à mão) lança → K1 vermelho')
}
const BABY = rd(F.baby), BROUTE = rd(F.babyRoute), AVATAR = rd(F.avatar)
mut('M25 bebê-podcast com páginas ligadas', BABY, 'export const BABY_PODCAST_PAGES_LIVE = false', 'export const BABY_PODCAST_PAGES_LIVE = true', (s) => switchProblems(undefined, undefined, s))
mut('M26 retrato de qualquer origem', BABY, "  if (portrait.startsWith(BABY_PORTRAITS_BUCKET) && ", '  if (portrait.startsWith("https://") || ', (s) => babyLibProblems(s))
mut('M27 corpo do /avatar com B-roll', BABY, '    noBroll: true,', '    noBroll: false,', (s) => babyLibProblems(s))
mut('M28 preparo sem a regra infantil', BROUTE, '  if (kidsContentRefusal(request.topic)) return recusa(422', '  if (false) return recusa(422', (s) => babyRouteProblems(s))
mut('M29 generate-avatar sem a regra do bebê', AVATAR, AVATAR.split('\n').find((l) => l.includes('isBabyPodcastAvatarUrl(avatarImageUrl, userId) && kidsContentRefusal(prompt)')) + '\n', '', (s) => babyRouteProblems(undefined, s))
mut('M30 página do bebê sem 404 desligada', rd('app/ai-baby-podcast-videos/page.tsx'), '  if (!BABY_PODCAST_PAGES_LIVE) notFound()\n', '', (s) => babyPagesProblems(undefined, s))

console.log(`\n${fail === 0 ? 'VERDE' : 'VERMELHO'}: ${pass} ok, ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
