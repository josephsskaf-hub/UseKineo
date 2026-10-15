// KINEO-ADS-FIEL-LIGA-1510 — guardião do LIGA da trava do produto do Studio Ads v2 para TODOS os clientes (fundador 15/10, "liga já", depois
// do reteste 4: rostos livres, nada boiando, lado alternado; falta pousar no tampo — KINEO-ADS-FIEL-5-1510 em andamento). Fora da TRAVA 8.2.
// Roda com `node scripts/test-ads-fiel-liga-1510.mjs`, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript do
// repo e rodados com stubs. BASE = o pai do PRIMEIRO commit com a marca (sem commit ainda = HEAD, o diff é o da árvore). Integrado à fiel-5
// (merge 15/10): o texto sem o liga é o da fiel-5; desfeita também a fiel-5 (semFiel5_1510), cada arquivo é EXATAMENTE a base.
//
// O que prova:
//   L  o interruptor: o arquivo VIVO traz ADS_V2_PRODUCT_LOCK_MODE = 'all' (uma vez); o módulo carregado devolve 'all'; o servidor REAL
//      (adsV2ProductLockEnabled) liga para a casa, para QUALQUER conta de cliente, para e-mail vazio e até com o auth fora do ar — sem ler
//      o auth; o ramo 'internal' (lista exata da casa) e o 'off' continuam no código, intocados;
//   P  preço e cobrança: adsV2Credits de cada nível × duração igual ao pai; v2Tiers, v2Billing, v2StartCore, /start, débito, estorno,
//      acesso, o servidor da trava e o motor de avanço byte a byte iguais ao pai e fora do diff; nada da trava debita (custo da casa);
//      nenhuma tela/copy (app/, components/) muda;
//   V  desfaz exato (scripts/test-support/desfaz-ads-fiel-liga-1510.mjs) + ida exata + marca em todo bloco novo; só v2ShotLists.ts muda
//      no produto; os guardiões antigos da trava leem o texto SEM este liga (encadeado colado no readFileSync);
//   M  mutantes (todos aplicados e vermelhos): modo volta a 'internal', vira 'off', o servidor perde o atalho do 'all', preço muda.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semFielLiga1510, comLiga1510, FIEL_LIGA_1510_ARQUIVOS, FIEL_LIGA_1510_NOVOS, FIEL_LIGA_1510_BASE, MARCA_FIEL_LIGA_1510 } from './test-support/desfaz-ads-fiel-liga-1510.mjs'
import { semFiel5_1510 } from './test-support/desfaz-ads-fiel-5-1510.mjs' // integrado à fiel-5 (merge 15/10): o texto sem o liga ainda traz a fiel-5; desfeita ela também, é a base c56e121ee

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const MARCA = 'KINEO-ADS-FIEL-LIGA-1510'
const rd = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
let BASE = 'HEAD'
let ULTIMO = null
try {
  const shas = git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)
  if (shas.length) { ULTIMO = shas[0]; BASE = git('rev-parse', `${shas[shas.length - 1]}~1`).trim() }
} catch { BASE = 'HEAD' }
/** arquivos rastreados com o texto (git grep -l; sem achado = lista vazia, não erro). */
const gitGrepL = (pat, ...paths) => { try { return git('grep', '-l', '-F', pat, '--', ...paths).trim().split('\n').filter(Boolean) } catch { return [] } }
const base = (p) => { try { return git('show', `${BASE}:${p}`).replace(/\r\n/g, '\n') } catch { return null } }
// o diff do conserto: BASE → último commit da marca + o que não foi commitado (numa árvore integrada, as irmãs não entram)
const diffDoConserto = (opts, paths = []) => (ULTIMO ? git('diff', ...opts, BASE, ULTIMO, '--', ...paths) + git('diff', ...opts, 'HEAD', '--', ...paths) : git('diff', ...opts, BASE, '--', ...paths)).replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const tenta = async (fn) => { try { return !!(await fn()) } catch { return false } }
let naoAplicou = null
const trocar = (src, de, para) => { if (src.split(de).length !== 2) { naoAplicou = 'sem âncora única: ' + de.slice(0, 80); throw new Error('mutante ' + naoAplicou) } const out = src.split(de).join(para); if (out === src || !out.includes(para)) { naoAplicou = 'texto igual'; throw new Error('mutante ' + naoAplicou) } return out }

const F = { shotLists: 'lib/ads/v2ShotLists.ts', server: 'lib/ads/v2ProductLockServer.ts', advance: 'lib/ads/v2Advance.ts', tiers: 'lib/ads/v2Tiers.ts' }
const LINHA_ALL = "export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'all' // KINEO-ADS-FIEL-1510 · KINEO-ADS-FIEL-LIGA-1510"
const LINHA_INTERNAL = "export const ADS_V2_PRODUCT_LOCK_MODE: 'off' | 'internal' | 'all' = 'internal' // KINEO-ADS-FIEL-1510"

// ── carregador: transpila TS → CJS, resolve '@/' com stubs (o resto real); `over` = fonte mutante ─────────────────────────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const over = opts.over ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const text = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && existsSync(join(ROOT, target))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    new Function('exports', 'require', 'module', js)(module.exports, req, module)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const pure = (over = {}) => makeLoader({}, { over })

// ── servidor REAL com auth falso (conta da casa, cliente, e-mail vazio, auth fora do ar) ───────────────────────────────────
let authEmail = 'josephsskaf@gmail.com'
let authThrows = false
let authReads = 0
const srvStubs = {
  '@fal-ai/client': { fal: { config() {}, subscribe: async () => ({ data: { image: { url: 'https://fal.media/cut.png' } } }), queue: { cancel: async () => {} } } },
  '@/lib/userFootage': { footageAdminClient: () => ({
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: (path) => ({ data: { publicUrl: `https://sb.co/${path}` } }) }) },
    auth: { admin: { getUserById: async () => { authReads++; if (authThrows) throw new Error('auth down'); return { data: { user: { email: authEmail } } } } } },
  }) },
  '@/lib/ads/v2Shots': { adsV2ShotRenderId: (o, i, a) => `adsv2-${o}-p${i}-a${a}` },
}
const loadSrv = (over = {}) => makeLoader(srvStubs, { over })(F.server)
const USER = '00000000-0000-4000-8000-000000000009'
const CONTAS = ['josephsskaf@gmail.com', 'cliente@exemplo.com', 'loja.qualquer@hotmail.com', 'agencia@empresa.com.br', '']
/** o interruptor de um servidor carregado: [liga?] para cada conta + com o auth fora do ar, e quantas leituras do auth fez. */
const interruptor = async (S) => {
  authReads = 0
  const r = []
  for (const e of CONTAS) { authEmail = e; r.push(await S.adsV2ProductLockEnabled(USER)) }
  authThrows = true; r.push(await S.adsV2ProductLockEnabled(USER)); authThrows = false; authEmail = 'josephsskaf@gmail.com'
  return { liga: r, reads: authReads }
}
const todasLigadas = (x) => x.liga.length === CONTAS.length + 1 && x.liga.every((v) => v === true) && x.reads === 0

// ═══ L. o interruptor ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nL. o interruptor: a trava liga para TODO pedido')
const SLsrc = rd(F.shotLists)
const l1 = (src = SLsrc) => src.split(LINHA_ALL).length === 2 && !src.includes(LINHA_INTERNAL) && (src.match(/export const ADS_V2_PRODUCT_LOCK_MODE\b/g) || []).length === 1 && pure({ [F.shotLists]: src })(F.shotLists).ADS_V2_PRODUCT_LOCK_MODE === 'all'
await check("L1 o arquivo vivo traz ADS_V2_PRODUCT_LOCK_MODE = 'all' (uma vez, com a marca) e o módulo carregado devolve 'all'", () => l1())
const l2 = async (over = {}) => todasLigadas(await interruptor(loadSrv(over)))
await check('L2 servidor REAL: adsV2ProductLockEnabled liga para a casa, para QUALQUER cliente, e-mail vazio e auth fora do ar — sem ler o auth', () => l2())
await check("L3 o ramo 'internal' (lista EXATA da casa) e o 'off' continuam no código: com o texto desfeito, só a casa liga; com 'off', ninguém", async () => {
  const interno = await interruptor(loadSrv({ [F.shotLists]: semFielLiga1510(F.shotLists, SLsrc) }))
  const off = await interruptor(loadSrv({ [F.shotLists]: SLsrc.split(LINHA_ALL).join(LINHA_ALL.replace("= 'all'", "= 'off'")) }))
  const [casa, ...resto] = interno.liga
  return casa === true && resto.every((v) => v === false) && interno.reads === CONTAS.length + 1 && off.liga.every((v) => v === false) && off.reads === 0
})
await check('L4 o ÚNICO leitor do modo é adsV2ProductLockEnabled (lib/ads/v2ProductLockServer.ts), e o motor de avanço só o consulta pelo servidor (3 pontos, erro = desligado)', () => {
  const leitores = gitGrepL('ADS_V2_PRODUCT_LOCK_MODE', 'app', 'lib', 'components').sort()
  const srv = rd(F.server)
  const adv = rd(F.advance)
  return JSON.stringify(leitores) === JSON.stringify([F.server, F.shotLists].sort()) &&
    srv.includes("  if (ADS_V2_PRODUCT_LOCK_MODE === 'all') return true\n  if (ADS_V2_PRODUCT_LOCK_MODE !== 'internal') return false\n") &&
    (adv.match(/srv\.adsV2ProductLockEnabled\(order\.user_id\)\.catch\(\(\) => false\)/g) || []).length === 3 &&
    gitGrepL('adsV2ProductLockEnabled', 'app', 'components').length === 0 && JSON.stringify(gitGrepL('adsV2ProductLockEnabled', 'lib').sort()) === JSON.stringify([F.advance, F.server].sort())
})

// ═══ P. preço e cobrança ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nP. preço e cobrança: o cliente paga o MESMO preço do nível; o custo extra da trava é da casa')
const tabela = (T) => T.ADS_V2_TIER_IDS.flatMap((t) => T.ADS_V2_SECONDS.map((s) => `${t}/${s}=${T.adsV2Credits(t, s)}`)).join(' ')
// o preço público do nível (lib/ads/v2Tiers.ts: 15 s = 34/41/51; 20 s = 46/55/68; 30 s = 68/82/102)
const PRECO_DO_NIVEL = 'photo_motion/15=34 photo_motion/20=46 photo_motion/30=68 commercial/15=41 commercial/20=55 commercial/30=82 cinema/15=51 cinema/20=68 cinema/30=102'
const p1 = (over = {}) => {
  const vivo = tabela(pure(over)(F.tiers))
  const pai = base(F.tiers)
  return pai !== null && vivo === tabela(pure({ [F.tiers]: pai })(F.tiers)) && vivo === PRECO_DO_NIVEL
}
await check('P1 preço por nível: adsV2Credits de cada nível × duração (3 × 3) igual ao do pai do commit e ao preço público (34/41/51 · 46/55/68 · 68/82/102)', () => p1())
const DINHEIRO = ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2StartCore.ts', 'app/api/ads/v2/start/route.ts', 'lib/credits/debit.ts', 'lib/credits/refund.ts', 'lib/ads/access.ts', 'lib/ads/serverAccess.ts', F.server, F.advance, 'lib/ads/v2Png.ts', 'lib/ads/v2LockVision.ts']
await check('P2 dinheiro, acesso e o caminho da trava intocados: v2Tiers, v2Billing, v2StartCore, /start, débito, estorno, acesso, servidor da trava, avanço, PNG e visão byte a byte iguais ao pai e fora do diff', () => {
  const nomes = diffDoConserto(['--name-only']).split('\n')
  return DINHEIRO.every((p) => base(p) !== null && semFiel5_1510(p, semFielLiga1510(p, rd(p))) === base(p) && semFielLiga1510(p, rd(p)) === rd(p) && !nomes.includes(p))
})
await check('P3 nada da trava debita: o servidor da trava e a visão não importam crédito/débito/estorno; o avanço só confirma o débito FIXO do /start (credits_charged) e as refações da trava saem com charged:false', () => {
  const srv = rd(F.server)
  const vis = rd('lib/ads/v2LockVision.ts')
  const adv = rd(F.advance)
  const semCobranca = (s) => !/from '@\/lib\/credits\//.test(s) && !/confirmAdsV2Debit|failAdsV2Order|debitCredits|refundCredits/.test(s)
  return semCobranca(srv) && semCobranca(vis) && srv.includes('Nada aqui cobra crédito, debita ou estorna.') &&
    (adv.match(/confirmAdsV2Debit\(/g) || []).length === 1 && adv.includes('cost: order.credits_charged })') && !/charged: true/.test(adv)
})
await check('P4 nenhuma tela, copy ou rota muda: o diff do conserto não toca app/ nem components/ (o seletor de nível e o preço na tela são os de antes)', () => {
  const nomes = diffDoConserto(['--name-only']).split('\n').filter(Boolean)
  return nomes.length > 0 && !nomes.some((n) => n.startsWith('app/') || n.startsWith('components/'))
})

// ═══ V. desfaz, ida, marca, guardiões antigos ═══════════════════════════════════════════════════════════════════════════
console.log('\nV. desfaz, ida, marca e guardiões antigos encadeados')
const ANTIGOS = ['scripts/test-ads-fiel-1510.mjs', 'scripts/test-ads-fiel-2-1510.mjs', 'scripts/test-ads-fiel-3-1510.mjs', 'scripts/test-ads-fiel-4-1510.mjs', 'scripts/test-ads-lista-1510.mjs', 'scripts/test-ads-refacao-ator-1410.mjs', 'scripts/test-ads-demo-universo-1410.mjs', 'scripts/test-ads-fiel-5-1510.mjs']
await check('V1 desfeito (scripts/test-support/desfaz-ads-fiel-liga-1510.mjs) e depois a fiel-5, cada arquivo tocado (o modo + os 7 guardiões antigos) é EXATAMENTE o pai do commit; sem o liga não sobra nada dele; a ida devolve o arquivo vivo; a base do desfaz é esse pai', () =>
  FIEL_LIGA_1510_ARQUIVOS.length === 8 && FIEL_LIGA_1510_ARQUIVOS[0] === F.shotLists && JSON.stringify(FIEL_LIGA_1510_ARQUIVOS.slice(1).sort()) === JSON.stringify(ANTIGOS.filter((f) => f !== 'scripts/test-ads-fiel-5-1510.mjs').sort()) &&
  FIEL_LIGA_1510_NOVOS.length === 0 && MARCA_FIEL_LIGA_1510 === MARCA &&
  FIEL_LIGA_1510_ARQUIVOS.every((f) => { const sem = semFielLiga1510(f, rd(f)); return semFiel5_1510(f, sem) === base(f) && !sem.includes(MARCA) && comLiga1510(f, sem) === rd(f) }) && (BASE === 'HEAD' || FIEL_LIGA_1510_BASE === BASE))
await check('V2 o desfaz é estrito: o modo mexido dentro do bloco (ou o bloco repetido) = lança; a ida sem o texto de antes = lança', () => {
  const lanca = (fn) => { try { fn(); return false } catch { return true } }
  return lanca(() => semFielLiga1510(F.shotLists, SLsrc.replace("= 'all' // KINEO-ADS-FIEL-1510 ·", "= 'off' // KINEO-ADS-FIEL-1510 ·"))) &&
    lanca(() => semFielLiga1510(F.shotLists, SLsrc + '\n' + SLsrc)) && lanca(() => comLiga1510(F.shotLists, SLsrc))
})
await check('V3 só lib/ads/v2ShotLists.ts muda no produto; todo bloco novo traz a marca KINEO-ADS-FIEL-LIGA-1510 em TODA linha; nenhuma linha some além da do modo', () => {
  const d = diffDoConserto(['-U0', '--no-color'], ['lib', 'app', 'components'])
  const arquivos = [...d.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1])
  const mais = d.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
  const menos = d.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'))
  return JSON.stringify(arquivos) === JSON.stringify([F.shotLists]) && mais.length === 4 && mais.every((l) => l.includes(MARCA)) && mais.includes('+' + LINHA_ALL) &&
    menos.length === 1 && menos[0] === '-' + LINHA_INTERNAL
})
await check('V4 os guardiões antigos da trava leem os arquivos SEM este liga (desfaz colado no readFileSync, byte a byte): fiel-1510, fiel-2, fiel-3, fiel-4, fiel-5, lista, refação do ator, demo Universo', () =>
  ANTIGOS.every((f) => { const s = rd(f); return s.includes("import { semFielLiga1510") && s.includes("from './test-support/desfaz-ads-fiel-liga-1510.mjs'") && /semFielLiga1510\((p|rel|f), (fs\.)?readFileSync\(/.test(s) }))
await check("V5 os guardiões antigos que cravavam 'internal' foram reancorados para exigir 'all' no arquivo vivo (fiel-1510 S1, fiel-3 V4, fiel-4 V4, fiel-5 V4)", () =>
  ['scripts/test-ads-fiel-1510.mjs', 'scripts/test-ads-fiel-3-1510.mjs', 'scripts/test-ads-fiel-4-1510.mjs', 'scripts/test-ads-fiel-5-1510.mjs'].every((f) => { const s = rd(f); return s.includes('reancorado KINEO-ADS-FIEL-LIGA-1510 — fundador ligou para todos em 15/10') && s.includes("ADS_V2_PRODUCT_LOCK_MODE === 'all'") }))

// ═══ M. mutantes ════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um tem de ficar VERMELHO)')
const mut = async (nome, fn) => { naoAplicou = null; const verde = await tenta(fn); if (naoAplicou) { ok(false, `M ${nome} — mutante NÃO aplicou (${naoAplicou})`); return } ok(!verde, `M ${nome}`) }
const SRVsrc = rd(F.server)
const TIERSsrc = rd(F.tiers)
await mut("o modo volta a 'internal' (só a casa) — L1", () => l1(trocar(SLsrc, "= 'all' // KINEO-ADS-FIEL-1510 ·", "= 'internal' // KINEO-ADS-FIEL-1510 ·")))
await mut("o modo volta a 'internal' (só a casa) — L2 servidor", () => l2({ [F.shotLists]: trocar(SLsrc, "= 'all' // KINEO-ADS-FIEL-1510 ·", "= 'internal' // KINEO-ADS-FIEL-1510 ·") }))
await mut("o modo vira 'off' — L1", () => l1(trocar(SLsrc, "= 'all' // KINEO-ADS-FIEL-1510 ·", "= 'off' // KINEO-ADS-FIEL-1510 ·")))
await mut("o modo vira 'off' — L2 servidor", () => l2({ [F.shotLists]: trocar(SLsrc, "= 'all' // KINEO-ADS-FIEL-1510 ·", "= 'off' // KINEO-ADS-FIEL-1510 ·") }))
await mut("o servidor perde o atalho do 'all' (volta a ler o auth e só a casa liga)", () => l2({ [F.server]: trocar(SRVsrc, "  if (ADS_V2_PRODUCT_LOCK_MODE === 'all') return true\n", '') }))
await mut('o servidor desliga quando o auth cai, mesmo em "all"', () => l2({ [F.server]: trocar(SRVsrc, "  if (ADS_V2_PRODUCT_LOCK_MODE === 'all') return true\n", "  if (ADS_V2_PRODUCT_LOCK_MODE === 'all') { const r = await footageAdminClient().auth.admin.getUserById(userId).catch(() => null); return !!r }\n") }))
await mut('o preço de um nível muda junto (photo_motion custa +1 crédito)', () => p1({ [F.tiers]: trocar(TIERSsrc, 'export function adsV2Credits(tier: AdsV2Tier, seconds: AdsV2Seconds): number {\n', 'export function adsV2Credits(tier: AdsV2Tier, seconds: AdsV2Seconds): number {\n  if (tier === \'photo_motion\') return 1 + adsV2CreditsBase(tier, seconds)\n  return adsV2CreditsBase(tier, seconds)\n}\nfunction adsV2CreditsBase(tier: AdsV2Tier, seconds: AdsV2Seconds): number {\n') }))

console.log(`\n${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
