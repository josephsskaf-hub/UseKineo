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
//   (g) lib/kineo1Access.ts com cliente falso: lê filme 'fast' concluído, payment_success com pack bulk* e o passe do
//       Studio Ads; falha de leitura NÃO vira legado;
//   (h) resolveKineo1Flag, o GET de /api/me/credits e a instrução do /studio/create EXECUTADOS (não mais busca de
//       texto): trial nunca vê nem paga as leituras; pagante que usou vê; pagante novo não; casa vê;
//   (i) o JSON-LD de toda página (components/StructuredData.tsx) sem "Kineo 1";
//   (j) trava A2: nenhum consumidor da flag enquanto a régua exigir uso e a /pricing vender Kineo 1 (decisão do fundador).
// Consertos da revisão E1 (29/09): R1/R4 → (h); R2 → metadata do /arena executado em (e); R3 → passe em (g); R5 →
// mutantes gravados no tmpdir do sistema, nunca na worktree; A1 → (i); A2 → (j).
// Cada bloco tem mutante em memória que precisa ficar VERMELHO.
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { tmpdir } from 'node:os'
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
// Conserto da revisão E1 (R5): as cópias mutantes moram FORA do repositório (tmpdir do sistema). Se o `timeout 180` da
// suíte matar o processo no meio, nenhum lixo fica na worktree. renderPage lê pelo caminho relativo à raiz.
const TMP = mkdtempSync(join(tmpdir(), 'k1-vitrine-'))
const tmpRel = (nome) => relative(RAIZ, join(TMP, nome)).split('\\').join('/')
process.on('exit', () => { try { rmSync(TMP, { recursive: true, force: true }) } catch { /* nada */ } })
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
// engineLaunch real pelo carregador (usado pelos blocos que executam o /arena, a rota e o /studio/create).
const launchReal = createOfflineLoader()('lib/engineLaunch.ts')
// REANCORADO KINEO-S25-ABRE-2026-10-06 — o Seedance 2.5 voltou ao catálogo público marcado "(paid plans)" (S25_PUBLIC=true;
// só plano pago usa — scripts/test-s25-abre-2026-10-06.mjs): "Six", e cada interruptor ligado soma um. A vigilância é a
// mesma: Kineo 1 fora da lista pública, e os interruptores o devolvem por derivação, nunca por número digitado.
const provaA = (M) => M.KINEO1_PUBLIC === false && M.VIDEO_ENGINE_COUNT_WORD === 'Six' && M.VIDEO_ENGINE_COUNT_SENTENCE_START === 'Six' &&
  M.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5 and Seedance 2.5 (paid plans)' && !/Kineo 1|Avatar/.test(M.VIDEO_ENGINE_LIST_COPY)
checa('KINEO1_PUBLIC=false; contagem "Six" e lista pública sem Kineo 1', provaA(L))
{
  const ligaK1 = trocar(launchSrc, 'export const KINEO1_PUBLIC = false', 'export const KINEO1_PUBLIC = true')
  const V = rodaLaunch(ligaK1)
  checa('ligar o Kineo 1 devolve "Seven" e "... Seedance 2.5 (paid plans) and Kineo 1" (derivado, não digitado)', V.VIDEO_ENGINE_COUNT_WORD === 'Seven' && V.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5, Seedance 2.5 (paid plans) and Kineo 1' && V.kineo1Visible(PUBLICO) === true && !provaA(V))
  const ambos = rodaLaunch(trocar(ligaK1, 'export const AVATAR_PUBLIC = false', 'export const AVATAR_PUBLIC = true'))
  checa('ligar os dois devolve "Eight" e "..., Kineo 1 and Avatar"', ambos.VIDEO_ENGINE_COUNT_WORD === 'Eight' && ambos.VIDEO_ENGINE_LIST_COPY === 'Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5, Seedance 2.5 (paid plans), Kineo 1 and Avatar')
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
console.log('== (d) home: visitante sem Kineo 1, casa com as 2 portas ==')
const wall = ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood'].map((engine, i) => ({ id: 'w' + i, title: 'Demo ' + i, videoUrl: '/demo.mp4', engine, badge: engine.toUpperCase() }))
const homeDe = (entry, email) => renderPage(entry, false, {}, { initialEmail: email, engineWall: wall })
const semKineo1 = (html) => !html.includes('Kineo 1') && !html.includes('engine=fast')
{
  const pub = homeDe('app/KineoLanding.tsx', null), logado = homeDe('app/KineoLanding.tsx', PUBLICO), casa = homeDe('app/KineoLanding.tsx', INTERNO)
  checa('home (visitante): 0 "Kineo 1" e 0 link engine=fast', semKineo1(pub))
  checa('home (e-mail público logado): idem', semKineo1(logado))
  // REANCORADO 30/09 — fundador: "tira essa parte" (a grade "Video" com os tiles de motor saiu da home). Some a porta do tile;
  // ficam 2 portas do Kineo 1 para a casa (mega-menu e chip final), ainda atrás de showKineo1.
  // REANCORADO KINEO-S25-ABRE-2026-10-06: "Six ... Seedance 1.5 and Seedance 2.5 (paid plans)".
  checa('home (visitante): sem grade de tiles e FAQ "Six ... and Seedance 2.5 (paid plans)"', conta(pub, 'class="tile') === 0 && pub.includes('Veo 3.1, Kling 3, Kling 2.5, MiniMax H3, Seedance 1.5 and Seedance 2.5 (paid plans)'))
  // KINEO-MENU-VIDEO-LIMPO-2026-10-09 — re-ancorado: o fundador ("2 sim") tirou o Kineo 1 do mega-menu também para a casa; sobra o chip final.
  checa('home (casa): sobra 1 porta do Kineo 1 (chip final); mega-menu e tile sem ele', conta(casa, 'engine=fast&amp;intent_campaign=nav_mega') === 0 && conta(casa, 'engine=fast&amp;intent_campaign=engine_tile') === 0 && conta(casa, 'engine=fast&amp;intent_campaign=final_chip') === 1)
  checa('mutante (predicado aplicado à casa, que vê as portas) → vermelho', !semKineo1(casa))
  const land = rd('app/KineoLanding.tsx')
  checa('a porta que sobrou está atrás de showKineo1 = kineo1Visible(initialEmail)', land.includes('  const showKineo1 = kineo1Visible(initialEmail)\n') && conta(land, '{showKineo1 && <') === 1 && conta(land, 'engine=fast') === 1)
  // Mutante no JSX real: sem a guarda, o visitante volta a ver o Kineo 1.
  const tmp = tmpRel('k1-home-mutante.tsx')
  try {
    writeFileSync(join(RAIZ, tmp), trocar(land, '  const showKineo1 = kineo1Visible(initialEmail)\n', '  const showKineo1 = true\n'))
    checa('mutante (showKineo1 = true) → o visitante volta a ver o Kineo 1', !semKineo1(homeDe(tmp, null)))
  } finally { rmSync(join(RAIZ, tmp), { force: true }) }
  checa('o mutante da home foi gravado fora da worktree', !tmp.startsWith('scripts/') && !tmp.startsWith('app/'))
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
  // Conserto da revisão E1 (R2): o `metadata` não sai no HTML renderizado, e a checagem antiga só ancorava as
  // constantes — voltar o título/descrição de compartilhamento para "seven … Kineo 1" cravado passava verde. Agora o
  // módulo é EXECUTADO (imports trocados por dublês; engineLaunch real) e o objeto `metadata` é lido.
  const metaArena = (src, launch = launchReal) => {
    const js = ts.transpileModule(src, { fileName: 'page.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText
    const mocks = {
      'next/link': { __esModule: true, default: () => null },
      '@/lib/credits/engineCost': { creditCostFor: () => 1 },
      '@/lib/checkoutPricing': { formatCheckoutMoney: () => '$0', getTierPrice: () => 0 },
      '@/lib/freeTierOffer': { TRIAL_GRANT_CREDITS_COPY: '10' },
      '@/lib/publicExamples': { getPublicEngineExample: (id) => pe.getPublicEngineExample(id) },
      '@/lib/engineLaunch': launch,
    }
    const box = { exports: {} }
    vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error('unmocked ' + id) }, React: { createElement: () => null, Fragment: null }, process: { env: {} } })
    return box.exports.metadata
  }
  const provaMeta = (m) => {
    const t = [m?.title, m?.description, m?.openGraph?.title, m?.openGraph?.description].map((x) => String(x ?? ''))
    return t.every((x) => x.length > 0 && !/Kineo 1|seven/i.test(x)) && /\bsix different AI video engines\b/.test(t[1]) && t[2].includes('six engines') && t[3].includes('Kling 2.5 and Seedance 1.5 — side by side')
  }
  checa('/arena metadata EXECUTADO: descrição e openGraph dizem "six", sem "Kineo 1" e sem "seven"', provaMeta(metaArena(arenaSrc)))
  checa('mutante (openGraph.title cravado em "seven") → vermelho', !provaMeta(metaArena(trocar(arenaSrc, 'title: `AI Video Engine Arena — ${ARENA_COUNT} engines, real renders, one pipeline`', "title: 'AI Video Engine Arena — seven engines, real renders, one pipeline'"))))
  checa('mutante (openGraph.description cravada com Kineo 1) → vermelho', !provaMeta(metaArena(trocar(arenaSrc, 'description: `${ARENA_ENGINE_LIST} — side by side, honestly labeled.`', "description: 'Omni Flash (#1, Aug 2026), Veo 3.1, Kling 3, MiniMax H3, Kling 2.5, Seedance 1.5 and Kineo 1 — side by side, honestly labeled.'"))))
  checa('mutante (KINEO1_PUBLIC=true no engineLaunch) → metadata volta a "seven"/Kineo 1 (derivado do interruptor)', !provaMeta(metaArena(arenaSrc, { ...launchReal, KINEO1_PUBLIC: true })))
  const tmp = tmpRel('k1-arena-mutante.tsx')
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
  const offerAds = createOfflineLoader()('lib/ads/offer.ts')
  // Três leituras: filme fast concluído (videos), pacote avulso (events, like bulk%) e passe do Studio Ads (events,
  // eq ADS_PASS_ID — conserto da revisão E1, R3/M5 do cético). O dublê responde cada uma pelo filtro que recebeu.
  const falso = ({ filmes = [], pacotes = [], passes = [], erroFilmes = null, erroPacotes = null, erroPasses = null } = {}) => {
    const filtros = []
    const db = {
      filtros,
      from(tabela) {
        const f = { tabela, eq: {}, like: {} }
        filtros.push(f)
        const resp = () => {
          if (tabela === 'videos') return { data: erroFilmes ? null : filmes, error: erroFilmes }
          if (Object.hasOwn(f.like, 'metadata->>pack')) return { data: erroPacotes ? null : pacotes, error: erroPacotes }
          if (Object.hasOwn(f.eq, 'metadata->>pack')) return { data: erroPasses ? null : passes, error: erroPasses }
          return { data: [{ id: 'filtro-sem-pack' }], error: null } // leitura sem filtro de pacote = qualquer pagamento: deixaria passar todo mundo
        }
        const q = {
          select() { return q }, eq(c, v) { f.eq[c] = v; return q }, like(c, v) { f.like[c] = v; return q },
          limit() { return Promise.resolve(resp()) },
        }
        return q
      },
    }
    return db
  }
  const provaG = async (Mod) => {
    const d1 = falso({ filmes: [{ id: 'v' }] })
    const r1 = await Mod.resolveKineo1Access(d1, 'u-1')
    const fv = d1.filtros.find((f) => f.tabela === 'videos')
    const fe = d1.filtros.find((f) => f.tabela === 'events' && Object.hasOwn(f.like, 'metadata->>pack'))
    const fa = d1.filtros.find((f) => f.tabela === 'events' && Object.hasOwn(f.eq, 'metadata->>pack'))
    const r2 = await Mod.resolveKineo1Access(falso({ pacotes: [{ id: 'e' }] }), 'u-1')
    const r5 = await Mod.resolveKineo1Access(falso({ passes: [{ id: 'p' }] }), 'u-1')
    const r3 = await Mod.resolveKineo1Access(falso({ filmes: [{ id: 'v' }], erroPacotes: { message: 'x' } }), 'u-1')
    const r6 = await Mod.resolveKineo1Access(falso({ erroPasses: { message: 'x' } }), 'u-1')
    const r4 = await Mod.resolveKineo1Access(null, 'u-1')
    return r1.usedFast === true && r1.boughtPack === false && r1.ok === true && d1.filtros.length === 3 &&
      fv.eq.user_id === 'u-1' && fv.eq.quality_mode === 'fast' && fv.eq.status === 'completed' &&
      fe.eq.user_id === 'u-1' && fe.eq.name === 'payment_success' && fe.like['metadata->>pack'] === 'bulk%' &&
      fa && fa.eq.user_id === 'u-1' && fa.eq.name === 'payment_success' && fa.eq['metadata->>pack'] === offerAds.ADS_PASS_ID &&
      r2.usedFast === false && r2.boughtPack === true &&
      r5.usedFast === false && r5.boughtPack === true && r5.ok === true &&
      r3.ok === false && r3.boughtPack === false &&
      r6.ok === false && r6.boughtPack === false &&
      r4.usedFast === false && r4.boughtPack === false && r4.ok === false
  }
  checa('lê filme fast CONCLUÍDO, payment_success com pack bulk* e o passe do Studio Ads; erro de leitura não vira legado', await provaG(A))
  const src = readFileSync(join(RAIZ, 'lib/kineo1Access.ts'), 'utf8').replace(/\r\n/g, '\n')
  const rodaAccess = (mutSrc) => {
    const js = ts.transpileModule(mutSrc, { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}
    const req = (id) => (id === '@/lib/ads/offer' ? offerAds : { createClient: () => { throw new Error('x') } })
    vm.runInNewContext(js, { exports: exp, require: req, console: { warn() {} }, process: { env: {} }, fetch: () => { throw new Error('x') }, Promise, Array })
    return exp
  }
  checa('mutante (sem exigir status completed) → vermelho', !(await provaG(rodaAccess(trocar(src, ".eq('status', 'completed')", '')))))
  checa('mutante (sem a leitura do passe do Studio Ads) → vermelho', !(await provaG(rodaAccess(trocar(src, "        .eq('metadata->>pack', ADS_PASS_ID)\n", '')))))
}

// ── (h) a composição que o servidor entrega, EXECUTADA ─────────────────────────────────────────────────────────────
// Conserto da revisão E1 (R1/R4): antes cada rota montava a régua à mão e o guardião só procurava texto — trocar a
// leitura de has_paid por `true`, ou pôr `kineo1 = true` depois do let, passava VERDE. Agora: (1) resolveKineo1Flag é
// executada; (2) o GET de /api/me/credits é executado com Supabase falso; (3) a instrução do /studio/create é extraída
// do arquivo e executada. Em todos, o trial nunca paga as leituras de legado (só has_paid === true lê).
console.log('== (h) resolveKineo1Flag, GET /api/me/credits e /studio/create executados ==')
{
  const legadoDe = (l) => { const r = { n: 0 }; r.fn = async () => { r.n++; return { usedFast: false, boughtPack: false, ok: true, ...l } }; return r }
  const provaFlag = async (M) => {
    const casos = [
      [INTERNO, false, {}, true, 0],
      [PUBLICO, false, { usedFast: true }, false, 0], // trial que usou a cota semanal
      [PUBLICO, false, { boughtPack: true }, false, 0], // sem has_paid não se lê legado (pacote grava has_paid)
      [PUBLICO, true, { usedFast: true }, true, 1],
      [PUBLICO, true, { boughtPack: true }, true, 1],
      [PUBLICO, true, {}, false, 1],
      [null, null, { usedFast: true }, false, 0],
    ]
    for (const [email, hasPaid, l, esperado, leituras] of casos) {
      const r = legadoDe(l)
      if ((await M.resolveKineo1Flag(email, () => hasPaid, r.fn)) !== esperado || r.n !== leituras) return false
    }
    return true
  }
  checa('resolveKineo1Flag: casa sem leitura; trial nunca (e sem ler); pagante que usou ou comprou pacote/passe sim; pagante sem uso não', await provaFlag(L))
  checa('mutante (lê o legado sem exigir has_paid) → vermelho', !(await provaFlag(rodaLaunch(trocar(launchSrc, '  if ((await lerHasPaid()) !== true) return false\n', '')))))

  // (2) GET /api/me/credits
  const credSrc = rd('app/api/me/credits/route.ts')
  const rodaCredits = async (src, { email, perfil, legado }) => {
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    const r = legadoDe(legado)
    const sb = {
      auth: { getUser: async () => ({ data: { user: { id: 'u-1', email } } }) },
      from: (t) => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: t === 'profiles' ? perfil : null, error: null }) }; return q },
    }
    const mocks = {
      'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } },
      '@/lib/supabase/server': { createClient: () => sb },
      '@/lib/engineLaunch': launchReal,
      '@/lib/kineo1Access': { readKineo1Access: (id) => (id === 'u-1' ? r.fn() : Promise.reject(new Error('id errado'))) },
      // REANCORADO KINEO-S25-ABRE-2026-10-06: a rota ganhou a flag s25Liberado (régua do servidor, lib/s25Access.ts — provada
      // em scripts/test-s25-abre-2026-10-06.mjs). Aqui ela é só um vizinho da flag kineo1: stub fixo.
      '@/lib/s25Access': { s25LiberadoNaTela: () => false },
      // REANCORADO KINEO-PARCEIRO-ABRE-TUDO-2026-10-09: a rota ganhou a flag `parceiro` (parceiro ativo, lib/partnerAccess.ts —
      // provada em scripts/test-parceiro-abre-tudo-2026-10-09.mjs). Aqui ela é só outro vizinho da flag kineo1: stub fixo.
      '@/lib/partnerAccess': { isActivePartner: async () => false },
    }
    const box = { exports: {} }
    vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error('unmocked ' + id) }, Promise })
    const res = await box.exports.GET()
    return { kineo1: res.body.kineo1, leituras: r.n, credits: res.body.credits }
  }
  const provaCredits = async (src) => {
    const trial = await rodaCredits(src, { email: PUBLICO, perfil: { video_credits: 3, plan: 'free', has_paid: false }, legado: { usedFast: true } })
    const pagUsou = await rodaCredits(src, { email: PUBLICO, perfil: { video_credits: 50, plan: 'starter', has_paid: true }, legado: { usedFast: true } })
    const pagNovo = await rodaCredits(src, { email: PUBLICO, perfil: { video_credits: 50, plan: 'starter', has_paid: true }, legado: {} })
    const casa = await rodaCredits(src, { email: INTERNO, perfil: { video_credits: 9, plan: 'pro', has_paid: true }, legado: {} })
    return trial.kineo1 === false && trial.leituras === 0 && trial.credits === 3 &&
      pagUsou.kineo1 === true && pagUsou.leituras === 1 &&
      pagNovo.kineo1 === false && pagNovo.leituras === 1 &&
      casa.kineo1 === true && casa.leituras === 0
  }
  checa('GET /api/me/credits EXECUTADO: trial que usou → false (0 leituras); pagante que usou → true; pagante novo → false; casa → true', await provaCredits(credSrc))
  const HAS_PAID_ROTA = '() => (data as { has_paid?: boolean | null } | null)?.has_paid === true'
  checa('mutante (rota lê has_paid como true) → vermelho', !(await provaCredits(trocar(credSrc, HAS_PAID_ROTA, '() => true'))))
  checa('mutante (resposta com kineo1: true cravado) → vermelho', !(await provaCredits(trocar(credSrc, ' kineo1, plan })', ' kineo1: true, plan })'))))

  // (3) /studio/create: a instrução é extraída do arquivo e executada
  const pg = rd('app/(dashboard)/studio/create/page.tsx')
  const INI = '  const kineo1 = await resolveKineo1Flag(\n'
  // Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b — pendência 5 da E1): falha de leitura deixou de virar "sem legado"
  // (false) e virou null ('não sei'); a tela decide com kineo1NaTela (não esconde de quem paga, não dá a conta nova).
  const FIM = '  ).catch(() => null)'
  const rodaPg = async (src, { email, hasPaid, legado, perfilFalha = false }) => {
    const i = src.indexOf(INI), j = src.indexOf(FIM, i)
    if (i < 0 || j < 0) return null
    const stmt = src.slice(i, j + FIM.length)
    const js = ts.transpileModule(`module.exports = async (user, supabase, resolveKineo1Flag, readKineo1Access) => {\n${stmt}\n  return kineo1\n}`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    const box = { exports: {} }
    vm.runInNewContext(js, { module: box, exports: box.exports, Promise })
    const r = legadoDe(legado)
    const sb = { from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => { if (perfilFalha) throw new Error('banco caiu'); return { data: { has_paid: hasPaid }, error: null } } }; return q } }
    const v = await box.exports({ id: 'u-1', email }, sb, launchReal.resolveKineo1Flag, (id) => (id === 'u-1' ? r.fn() : Promise.reject(new Error('id errado'))))
    return { v, n: r.n }
  }
  const provaPg = async (src) => {
    const a = await rodaPg(src, { email: PUBLICO, hasPaid: false, legado: { usedFast: true } })
    const b = await rodaPg(src, { email: PUBLICO, hasPaid: true, legado: { usedFast: true } })
    const c = await rodaPg(src, { email: PUBLICO, hasPaid: true, legado: {} })
    const d = await rodaPg(src, { email: PUBLICO, hasPaid: true, legado: {}, perfilFalha: true })
    const e = await rodaPg(src, { email: INTERNO, hasPaid: false, legado: {}, perfilFalha: true })
    const f = await rodaPg(src, { email: PUBLICO, hasPaid: true, legado: { usedFast: false, ok: false } }) // leitura do legado falhou
    return !!a && a.v === false && a.n === 0 && b.v === true && c.v === false && d.v === null && e.v === true && f.v === null &&
      src.includes('        kineo1Visible={kineo1}\n') && (src.match(/\bkineo1 =/g) || []).length === 1
  }
  checa("/studio/create EXECUTADO: trial → false sem ler legado; pagante que usou → true; pagante novo → false; falha de banco ou do legado → null ('não sei'); casa → true; prop entregue", await provaPg(pg))
  checa('mutante (página lê has_paid como true) → vermelho', !(await provaPg(trocar(pg, "    async () => ((await supabase.from('profiles').select('has_paid').eq('id', user.id).maybeSingle()).data as { has_paid?: boolean | null } | null)?.has_paid === true,\n", '    async () => true,\n'))))
  checa('mutante (prop cravada em true) → vermelho', !(await provaPg(trocar(pg, '        kineo1Visible={kineo1}\n', '        kineo1Visible={true}\n'))))

  const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
  // Reancorado 29/09 (KINEO-ENTRADA-SEEDANCE15, E2b): a E2b É o consumidor anunciado. A prova passa a ser que ela consome
  // SÓ pela régua kineo1NaTela (entrada nova + flag + 'não sei' de quem paga), nunca a flag crua num if solto.
  checa('GenerateClient consome a prop SÓ pela régua kineo1NaTela (E2b)', gc.includes('  kineo1Visible?: boolean | null\n') && gc.includes('  const kineo1Shown = kineo1NaTela({ entrada15, kineo1: kineo1Visible, hasPaid })\n') && gc.includes('  const kineo1NaMontagem = kineo1NaTela({ entrada15: seedance15Prop === true, kineo1: kineo1Visible, hasPaid: null })\n') && !/if \(!?kineo1Visible\)/.test(gc))
}

// ── (i) JSON-LD de toda página sem Kineo 1 ──────────────────────────────────────────────────────────────────────────
// Conserto da revisão E1 (A1): components/StructuredData.tsx sai em TODA página (app/layout.tsx) e o plano Creator
// dizia "…or N Kineo 1 film". A prova de produção (DECISIONS 29/09) mede o HTML sem os <script> de hidratação mas COM
// o ld+json; este bloco renderiza o componente real.
console.log('== (i) StructuredData renderizado ==')
{
  // renderPage não carrega a árvore de lib que o componente puxa (lib/ads/*), então o componente é EXECUTADO direto:
  // libs reais pelo carregador offline, React dublê que devolve a árvore, e o texto de todo ld+json é lido dela.
  const sd = rd('components/StructuredData.tsx')
  const carregar = createOfflineLoader()
  const jsonLd = (src, launch = launchReal) => {
    const js = ts.transpileModule(src, { fileName: 'StructuredData.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText
    const box = { exports: {} }
    const React = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), Fragment: 'frag' }
    vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => (id === '@/lib/engineLaunch' ? launch : id === 'react' ? React : carregar(id)), React, process: { env: {} }, URL, URLSearchParams })
    const arvore = box.exports.default()
    const textos = []
    const anda = (n) => { if (!n || typeof n !== 'object') { if (typeof n === 'string') textos.push(n); return } if (Array.isArray(n)) return n.forEach(anda); const h = n.props?.dangerouslySetInnerHTML?.__html; if (typeof h === 'string') textos.push(h); (n.children || []).forEach(anda); if (n.props?.children) anda(n.props.children) }
    anda(arvore)
    return textos.join('\n')
  }
  const ld = jsonLd(sd)
  checa(`StructuredData (JSON-LD de toda página, ${ld.length} caracteres): 0 "Kineo 1", plano Creator em filmes Seedance`, ld.length > 1000 && !ld.includes('Kineo 1') && ld.includes('Seedance film'))
  checa('mutante (KINEO1_PUBLIC=true) → "Kineo 1 film" volta ao JSON-LD (a frase segue o interruptor)', jsonLd(sd, { ...launchReal, KINEO1_PUBLIC: true }).includes('Kineo 1 film'))
  checa('mutante (frase do Creator cravada sem o interruptor) → vermelho', jsonLd(trocar(sd, "a month${KINEO1_PUBLIC ? `, or ${formatResultCount(videosPerMonth('basic', 'fast'), 'Kineo 1 film')}` : ''}.", "a month, or ${formatResultCount(videosPerMonth('basic', 'fast'), 'Kineo 1 film')}.")).includes('Kineo 1'))
}

// ── (j) trava da ordem A2 ───────────────────────────────────────────────────────────────────────────────────────────
// Achado A2 da revisão E1 (decisão do FUNDADOR pendente): a /pricing e os modais vendem Kineo 1 a quem assina, e a
// régua exige uso prévio (pagante novo → false). Enquanto nada lê a flag, ninguém perde nada. A trava: a E2b (primeiro
// consumidor da flag no Studio ou no /generate) fica VERMELHA enquanto a régua exigir uso E alguma superfície de venda
// ainda citar "Kineo 1". Sai do vermelho por um de dois caminhos: o fundador manda o pagante novo ver o Kineo 1 (a
// régua muda), ou a E3 tira o Kineo 1 da /pricing e dos modais antes.
console.log('== (j) trava A2: E2b não esconde o Kineo 1 de quem acabou de comprá-lo ==')
{
  const VENDA = ['app/pricing/PricingClient.tsx', 'components/PricingCards.tsx', 'components/UpgradeModal.tsx', 'components/Creator30OfferModal.tsx']
  const vendem = VENDA.filter((f) => rd(f).includes('Kineo 1'))
  const regraExigeUso = (M) => M.kineo1Visible(PUBLICO, { hasPaid: true, usedFast: false, boughtPack: false }) === false
  const consome = (gc, sc) => conta(gc, 'kineo1Visible') > 2 || /\bkineo1\b/.test(sc)
  const gcSrc = rd('app/(dashboard)/generate/GenerateClient.tsx'), scSrc = rd('app/(dashboard)/studio/StudioClient.tsx')
  const trava = (M, gc, sc) => !(regraExigeUso(M) && consome(gc, sc) && vendem.length > 0)
  checa(`nenhum consumidor da flag enquanto a régua exige uso e ${vendem.length} superfícies de venda citam Kineo 1`, trava(L, gcSrc, scSrc))
  checa('mutante (StudioClient passa a ler `kineo1` do /api/me/credits) → vermelho', vendem.length === 0 || !trava(L, gcSrc, scSrc + '\nconst esconder = !d.kineo1\n'))
}

console.log(`\n${ok}/${ok + falhas.length} verificações`)
if (falhas.length) { for (const f of falhas) console.log('FALHOU:', f); process.exit(1) }
console.log('PASS — Kineo 1 fora da vitrine pública; quem paga e usa continua com a régua pronta.')
