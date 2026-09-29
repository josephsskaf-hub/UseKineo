// KINEO-KINEO1-FORA-2026-09-29 — decisão do fundador (29/09): "quero tirar o kineo 1 do jogo, ele estraga a entrada".
// Objetivo dele: quem chega pelo GPT tem um primeiro filme MUITO bom (Seedance), não o Kineo 1. Esta é a E1 do plano
// E1→E4: o Kineo 1 sai da VITRINE PÚBLICA; quem já paga e usa continua com ele ("deixar dentro do sistema dessas
// contas que já pagam esse motor que eles usam").
//
// O guardião EXECUTA o código real e RENDERIZA o JSX real. Prova:
//   (a) lib/engineLaunch.ts: KINEO1_PUBLIC=false; contagem "Five" e lista pública sem Kineo 1, DERIVADAS dos dois
//       interruptores (ligar o Kineo 1 devolve "Six"; ligar os dois devolve "Seven" e "..., Kineo 1 and Avatar");
//   (b) kineo1Visible: casa vê; pagante que já usou vê; quem comprou pacote vê; trial, pagante sem filme e anônimo não;
//   (c) lib/engineWall.ts: hero e trending da home com 0 clipe 'fast' (curadoria intacta: CURATED e
//       homeVideoCuration seguem com os 3 do fundador);
//   (d) home renderizada: visitante com 0 "Kineo 1" e 0 link engine=fast (mega-menu, bento, chip); casa com os 3;
//   (e) /arena renderizada: sem o card, contagem "six" = número de cards; o dado em lib/publicExamples fica;
//   (f) app/page.tsx sem "or Kineo 1";
//   (g) lib/kineo1Access.ts com cliente falso: lê filme 'fast' concluído e payment_success com pack bulk*, e falha de
//       leitura NÃO vira legado; /api/me/credits e /studio/create entregam a régua pronta (E1 não muda comportamento).
// Cada bloco tem mutante em memória que precisa ficar VERMELHO.
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { renderPage } from './preview-ux-complete.mjs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { let v = false; try { v = typeof c === 'function' ? c() : c } catch { v = false } if (v) ok++; else falhas.push(n) }
const trocar = (src, de, para) => { if (!src.includes(de)) throw new Error('âncora do mutante sumiu: ' + de.slice(0, 80)); return src.split(de).join(para) }
const conta = (html, s) => html.split(s).length - 1
const INTERNO = 'josephsskaf@gmail.com'
const PUBLICO = 'cliente.qualquer@gmail.com'

// ── (a)+(b) engineLaunch executado ─────────────────────────────────────────────────────────────────────────────────
console.log('== (a) contagem e lista derivadas dos interruptores ==')
const internal = createOfflineLoader()('lib/internalAccounts.ts')
const rodaLaunch = (src) => {
  const semImport = src.replace(/import \{ isInternalEmail \} from '@\/lib\/internalAccounts'\n/, '')
  if (semImport === src) throw new Error('engineLaunch mudou o import de internalAccounts — atualizar o guardião')
  const js = ts.transpileModule(semImport, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, isInternalEmail: internal.isInternalEmail })
  return exports
}
const launchSrc = rd('lib/engineLaunch.ts')
const L = rodaLaunch(launchSrc)
const provaA = (M) => M.KINEO1_PUBLIC === false && M.VIDEO_ENGINE_COUNT_WORD === 'Five' && M.VIDEO_ENGINE_COUNT_SENTENCE_START === 'Five' &&
  M.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3 and Seedance 1.5' && !/Kineo 1|Avatar/.test(M.VIDEO_ENGINE_LIST_COPY)
checa('KINEO1_PUBLIC=false; contagem "Five" e lista pública sem Kineo 1', provaA(L))
{
  const ligaK1 = trocar(launchSrc, 'export const KINEO1_PUBLIC = false', 'export const KINEO1_PUBLIC = true')
  const V = rodaLaunch(ligaK1)
  checa('ligar o Kineo 1 devolve "Six" e "... Seedance 1.5 and Kineo 1" (derivado, não digitado)', V.VIDEO_ENGINE_COUNT_WORD === 'Six' && V.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5 and Kineo 1' && V.kineo1Visible(PUBLICO) === true && !provaA(V))
  const ambos = rodaLaunch(trocar(ligaK1, 'export const AVATAR_PUBLIC = false', 'export const AVATAR_PUBLIC = true'))
  checa('ligar os dois devolve "Seven" e "..., Kineo 1 and Avatar"', ambos.VIDEO_ENGINE_COUNT_WORD === 'Seven' && ambos.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5, Kineo 1 and Avatar')
  const cravado = trocar(launchSrc, "...(KINEO1_PUBLIC ? ['Kineo 1'] : []),", "'Kineo 1',")
  checa('mutante (Kineo 1 cravado na lista) → vermelho', !provaA(rodaLaunch(cravado)))
}

console.log('== (b) kineo1Visible: quem continua vendo ==')
const provaB = (M) =>
  M.kineo1Visible(INTERNO) === true &&
  M.kineo1Visible(null) === false && M.kineo1Visible(PUBLICO) === false &&
  M.kineo1Visible(PUBLICO, { hasPaid: true, usedFast: true, boughtPack: false }) === true &&
  M.kineo1Visible(PUBLICO, { hasPaid: false, usedFast: false, boughtPack: true }) === true &&
  M.kineo1Visible(PUBLICO, { hasPaid: true, usedFast: false, boughtPack: false }) === false &&
  M.kineo1Visible(PUBLICO, { hasPaid: false, usedFast: true, boughtPack: false }) === false &&
  M.kineo1Visible(PUBLICO, { hasPaid: null, usedFast: null, boughtPack: null }) === false
checa('casa vê; pagante que já usou vê; quem comprou pacote vê; trial que usou, pagante sem filme e anônimo não', provaB(L))
checa('mutante (sem exigir has_paid: trial que usou a cota vê) → vermelho', !provaB(rodaLaunch(trocar(launchSrc, '(l.hasPaid === true && l.usedFast === true)', '(l.usedFast === true)'))))
checa('mutante (sem o pacote avulso) → vermelho', !provaB(rodaLaunch(trocar(launchSrc, ' || l.boughtPack === true', ''))))
checa('mutante (régua sempre true) → vermelho', !provaB(rodaLaunch(trocar(launchSrc, 'if (KINEO1_PUBLIC || isInternalEmail(email)) return true', 'return true'))))

// ── (c) parede da home executada ────────────────────────────────────────────────────────────────────────────────────
console.log('== (c) engineWall: hero e trending sem Kineo 1, curadoria intacta ==')
function executeTs(file, mocks, srcOverride) {
  const js = ts.transpileModule(srcOverride ?? rd(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const box = { exports: {} }
  vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error('unmocked ' + id) }, process: { env: {} }, Map, Set, Promise, RegExp }, { filename: file })
  return box.exports
}
const pe = executeTs('lib/publicExamples.ts', {})
const cur = executeTs('lib/homeVideoCuration.ts', { '@/lib/publicExamples': { PUBLIC_ENGINE_EXAMPLES: pe.PUBLIC_ENGINE_EXAMPLES } })
const wallMocks = {
  '@/lib/homeVideoCuration': { HOME_ENGINE_EXAMPLES: cur.HOME_ENGINE_EXAMPLES },
  '@supabase/supabase-js': { createClient: () => { throw new Error('banco aberto') } },
  '@/lib/publicVideos': { cleanTitleLine: (v) => String(v ?? '').trim() },
  '@/lib/publicExamples': { PUBLIC_EXAMPLES: pe.PUBLIC_EXAMPLES, PUBLIC_ENGINE_EXAMPLES: pe.PUBLIC_ENGINE_EXAMPLES, posterWebpPath: pe.posterWebpPath },
  '@/lib/publicSurfacePolicy': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
}
const wallSrc = rd('lib/engineWall.ts')
const mede = async (src) => { const W = executeTs('lib/engineWall.ts', wallMocks, src); const h = await W.getEngineHero(); const t = await W.getTrending(); return { heroFast: h.filter((v) => v.engine === 'fast').length, trendFast: t.filter((v) => v.engine === 'fast').length, heroOutros: new Set(h.map((v) => v.engine)).size, trend: t.length } }
{
  const m = await mede(wallSrc)
  checa(`hero e trending com 0 clipe Kineo 1 (hero ${m.heroFast}, trending ${m.trendFast}) e os outros motores seguem (${m.heroOutros} famílias, ${m.trend} no trending)`, m.heroFast === 0 && m.trendFast === 0 && m.heroOutros >= 7 && m.trend >= 18)
  checa('curadoria do fundador intacta: homeVideoCuration ainda tem os 3 Kineo 1', cur.HOME_ENGINE_EXAMPLES.filter((v) => v.engine === 'fast').length === 3)
  checa('os dois caps zerados, cada um com o motivo', (wallSrc.match(/^  fast: 0,$/gm) || []).length === 2 && conta(wallSrc, 'KINEO-KINEO1-FORA-2026-09-29') === 2 && !/^\s*fast: 4,$/m.test(wallSrc))
  const HERO_FIM = ['  presenter: 1,', '}', '', 'export function getEngineHero'].join('\n')
  const volta = await mede(trocar(wallSrc, '  fast: 0,\n' + HERO_FIM, '  fast: 4,\n' + HERO_FIM))
  checa(`mutante (cap do hero de volta a 4) → Kineo 1 reaparece (${volta.heroFast})`, volta.heroFast > 0)
}

// ── (d) home renderizada ────────────────────────────────────────────────────────────────────────────────────────────
console.log('== (d) home: visitante sem Kineo 1, casa com as 3 portas ==')
const wall = ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood'].map((engine, i) => ({ id: 'w' + i, title: 'Demo ' + i, videoUrl: '/demo.mp4', engine, badge: engine.toUpperCase() }))
const homeDe = (entry, email) => renderPage(entry, false, {}, { initialEmail: email, engineWall: wall })
const semKineo1 = (html) => !html.includes('Kineo 1') && !html.includes('engine=fast')
{
  const pub = homeDe('app/KineoLanding.tsx', null), logado = homeDe('app/KineoLanding.tsx', PUBLICO), casa = homeDe('app/KineoLanding.tsx', INTERNO)
  checa('home (visitante): 0 "Kineo 1" e 0 link engine=fast', semKineo1(pub))
  checa('home (e-mail público logado): idem', semKineo1(logado))
  checa('home (visitante): bento com 4 tiles e FAQ "Five ... and Seedance 1.5"', conta(pub, 'class="tile') === 4 && pub.includes('Veo 3.1, Kling 3, Kling 2.5, MiniMax H3 and Seedance 1.5'))
  checa('home (casa): as 3 portas do Kineo 1 continuam (mega-menu, tile, chip)', conta(casa, 'engine=fast&amp;intent_campaign=nav_mega') === 1 && conta(casa, 'engine=fast&amp;intent_campaign=engine_tile') === 1 && conta(casa, 'engine=fast&amp;intent_campaign=final_chip') === 1)
  checa('mutante (predicado aplicado à casa, que vê as portas) → vermelho', !semKineo1(casa))
  const land = rd('app/KineoLanding.tsx')
  checa('as 3 portas estão atrás de showKineo1 = kineo1Visible(initialEmail)', land.includes('  const showKineo1 = kineo1Visible(initialEmail)\n') && conta(land, '{showKineo1 && <') === 3 && conta(land, 'engine=fast') === 3)
  // Mutante no JSX real: sem a guarda, o visitante volta a ver o Kineo 1.
  const tmp = 'scripts/.k1-home-mutante.tsx'
  try {
    writeFileSync(join(RAIZ, tmp), trocar(land, '  const showKineo1 = kineo1Visible(initialEmail)\n', '  const showKineo1 = true\n'))
    checa('mutante (showKineo1 = true) → o visitante volta a ver o Kineo 1', !semKineo1(homeDe(tmp, null)))
  } finally { rmSync(join(RAIZ, tmp), { force: true }) }
}

// ── (e) /arena renderizada ──────────────────────────────────────────────────────────────────────────────────────────
console.log('== (e) /arena: sem o card, contagem = cards ==')
{
  const arenaSrc = rd('app/arena/page.tsx')
  const renderArena = (entry) => renderPage(entry, false, {}, {})
  const html = renderArena('app/arena/page.tsx')
  const cards = conta(html, 'Try this engine →')
  checa(`/arena: sem "KINEO 1", sem engine=fast, ${cards} cards e a página diz "Six"/"six" (nunca "seven")`, !html.includes('KINEO 1') && !html.includes('engine=fast') && cards === 6 && html.includes('Six AI video engines.') && html.includes('All six.') && !/seven/i.test(html))
  checa('/arena: o card continua DECLARADO (dado em publicExamples exigido pela vitrine) e só o filtro o tira', arenaSrc.includes("badge: 'KINEO 1',") && arenaSrc.includes("const FIGHTERS: Fighter[] = FIGHTER_CARDS.filter((f) => f.quality !== 'fast' || KINEO1_PUBLIC)") && pe.PUBLIC_ENGINE_EXAMPLES.some((e) => e.id === '0ab3e871-2c99-4f6e-9f3c-59773208b12e'))
  checa('/arena metadata sem Kineo 1 (contagem pelo interruptor)', arenaSrc.includes("const ARENA_COUNT = KINEO1_PUBLIC ? 'seven' : 'six'") && arenaSrc.includes("(KINEO1_PUBLIC ? ', Seedance 1.5 and Kineo 1' : ' and Seedance 1.5')"))
  const tmp = 'scripts/.k1-arena-mutante.tsx'
  try {
    writeFileSync(join(RAIZ, tmp), trocar(arenaSrc, "import { KINEO1_PUBLIC } from '@/lib/engineLaunch'\n", 'const KINEO1_PUBLIC = true\n'))
    const mut = renderArena(tmp)
    checa('mutante (KINEO1_PUBLIC=true na página) → 7 cards, "Seven" e o card do Kineo 1 de volta', conta(mut, 'Try this engine →') === 7 && mut.includes('Seven AI video engines.') && mut.includes('KINEO 1'))
  } finally { rmSync(join(RAIZ, tmp), { force: true }) }
}

// ── (f) meta da home ────────────────────────────────────────────────────────────────────────────────────────────────
console.log('== (f) meta da home ==')
{
  const page = rd('app/page.tsx')
  const desc = (src) => (src.match(/description:\s*(?:\/\/[^\n]*\n\s*)?'([^']*)'/) || [])[1] ?? ''
  checa('app/page.tsx: description sem "Kineo 1"', desc(page).startsWith('Pick an engine — Veo 3.1, Kling 3, Kling 2.5 or Seedance 1.5') && !/Kineo 1/.test(desc(page)))
  checa('mutante ("or Kineo 1" de volta) → vermelho', /Kineo 1/.test(desc(trocar(page, 'Kling 2.5 or Seedance 1.5', 'Kling 2.5, Seedance 1.5 or Kineo 1'))))
}

// ── (g) leitura do legado ──────────────────────────────────────────────────────────────────────────────────────────
console.log('== (g) lib/kineo1Access.ts com cliente falso ==')
{
  const A = createOfflineLoader()('lib/kineo1Access.ts')
  const falso = ({ filmes = [], pacotes = [], erroFilmes = null, erroPacotes = null } = {}) => {
    const filtros = []
    const db = {
      filtros,
      from(tabela) {
        const f = { tabela, eq: {}, like: {} }
        filtros.push(f)
        const q = {
          select() { return q }, eq(c, v) { f.eq[c] = v; return q }, like(c, v) { f.like[c] = v; return q },
          limit() { return Promise.resolve(tabela === 'videos' ? { data: erroFilmes ? null : filmes, error: erroFilmes } : { data: erroPacotes ? null : pacotes, error: erroPacotes }) },
        }
        return q
      },
    }
    return db
  }
  const provaG = async (Mod) => {
    const d1 = falso({ filmes: [{ id: 'v' }] })
    const r1 = await Mod.resolveKineo1Access(d1, 'u-1')
    const fv = d1.filtros.find((f) => f.tabela === 'videos'), fe = d1.filtros.find((f) => f.tabela === 'events')
    const r2 = await Mod.resolveKineo1Access(falso({ pacotes: [{ id: 'e' }] }), 'u-1')
    const r3 = await Mod.resolveKineo1Access(falso({ filmes: [{ id: 'v' }], erroPacotes: { message: 'x' } }), 'u-1')
    const r4 = await Mod.resolveKineo1Access(null, 'u-1')
    return r1.usedFast === true && r1.boughtPack === false && r1.ok === true &&
      fv.eq.user_id === 'u-1' && fv.eq.quality_mode === 'fast' && fv.eq.status === 'completed' &&
      fe.eq.user_id === 'u-1' && fe.eq.name === 'payment_success' && fe.like['metadata->>pack'] === 'bulk%' &&
      r2.usedFast === false && r2.boughtPack === true &&
      r3.ok === false && r3.boughtPack === false &&
      r4.usedFast === false && r4.boughtPack === false && r4.ok === false
  }
  checa('lê filme fast CONCLUÍDO e payment_success com pack bulk*; erro de leitura não vira legado', await provaG(A))
  const src = readFileSync(join(RAIZ, 'lib/kineo1Access.ts'), 'utf8')
  const mutSrc = trocar(src, ".eq('status', 'completed')", '')
  const js = ts.transpileModule(mutSrc, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(js, { exports: exp, require: () => ({ createClient: () => { throw new Error('x') } }), console: { warn() {} }, process: { env: {} }, fetch: () => { throw new Error('x') }, Promise })
  checa('mutante (sem exigir status completed) → vermelho', !(await provaG(exp)))
  const cred = rd('app/api/me/credits/route.ts')
  checa('/api/me/credits devolve `kineo1` já resolvido por kineo1Visible com has_paid + legado', cred.includes(".select('video_credits, plan, has_paid')") && cred.includes('  let kineo1 = kineo1Visible(user.email)\n') && cred.includes('    const legado = await readKineo1Access(user.id)\n') && /NextResponse\.json\(\{[^\n]*\bkineo1, plan \}\)/.test(cred))
  const pg = rd('app/(dashboard)/studio/create/page.tsx')
  checa('/studio/create passa a prop kineo1Visible ao GenerateClient (E1: ninguém a lê ainda)', pg.includes('        kineo1Visible={kineo1}\n') && pg.includes('  let kineo1 = kineo1Visible(user.email)\n') && pg.includes('        readKineo1Access(user.id),\n'))
  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  checa('GenerateClient só declara a prop (E1 não muda comportamento; a E2b passa a usá-la)', gc.includes('  kineo1Visible?: boolean\n}) {') && conta(gc, 'kineo1Visible') === 2 && !gc.slice(gc.indexOf('export default function GenerateClient({'), gc.indexOf('}: {', gc.indexOf('export default function GenerateClient({'))).includes('kineo1Visible'))
}

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { for (const f of falhas) console.log('FALHOU:', f); process.exit(1) }
console.log('PASS — Kineo 1 fora da vitrine pública; quem paga e usa continua com a régua pronta.')
