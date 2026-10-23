// KINEO-UGC-AJUSTES-2010 — guardião dos AJUSTES DO UGC de 20/10 no Studio Ads (Ads, fora da TRAVA 8.2).
// Roda com `node scripts/test-ugc-ajustes-2010.mjs` da raiz do repo, sem rede, sem banco, sem fornecedor: os módulos são transpilados pelo typescript do
// repo (lib pura direto; o resto pelo carregador offline da casa, com dublês só onde haveria banco/sessão).
//
// O que prova (1 seção por item):
//   A  LISTA APROVADA: a revalidação de 20/10 (docs/REVALIDACAO-8-APRESENTADORES-2026-10-20.md) pôs Jade e Robert — cliente vê e recebe 6 (sofia, amara,
//      rahul, kenji, jade, robert); os outros 6 seguem "em teste"; a trava do servidor não troca mais Jade/Robert e troca os ocultos por um aprovado do mesmo gênero;
//   V  AMOSTRA DE VOZ PT: o mp3 da tela é a frase neutra de 20/10 (sha256 cravado), MP3 de verdade, tamanho sensato, e é o que a tabela aponta;
//   S  SUB-TETO: 10 amostras COM A PESSOA por dia UTC (constante única, dentro do teto geral de 30, que fica); contado no servidor como o teto geral
//      (EXECUTADO com banco dublê: chave 'adssample-', started_at do dia, plan->>sample_format = 'presenter'; erro = atingido); passou dele, o /plan
//      NÃO recusa — a entrada UGC cai no Close real com sample_fallback (aviso honesto em 16 línguas na tela); o /start confere de novo antes da trava;
//   P  SAMPLE_PROBE: só 'internal' com ?sample_probe=1 vira 'none' (EXECUTADO nas duas rotas com dublês: interna+1 → 'none'; interna sem/0 → 'internal';
//      assinante/parceiro/none com 1 → o acesso deles); a tela só repassa com o page.tsx dizendo (conta interna);
//   F  FAIXA DO ROTEIRO: o pedido continua 19–21; a régua aceita até 23 (EXECUTADA: 22 e 23 passam, 24 e 18 não; sem a folga, 22 continua recusado);
//      só o apresentador v2 ganha a folga; a edição da tela aceita o texto aceito;
//   D  desfaz exato + marca em toda linha + encadeamento (as cabeças das cadeias tiram esta camada primeiro) + novos;
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semUgcAjustes2010, UGC_AJUSTES_2010_ARQUIVOS, UGC_AJUSTES_2010_NOVOS, UGC_AJUSTES_2010_BASE, UGC_AJUSTES_2010_BINARIOS, MARCA_UGC_AJUSTES_2010, ACRESCIMOS_UGC_AJUSTES_2010, TROCAS_UGC_AJUSTES_2010 } from './test-support/desfaz-ugc-ajustes-2010.mjs'
import { semKitBfVenda2010 } from './test-support/desfaz-kit-bf-venda-2010.mjs'
import { semFilmesF1F3Publico2010 } from './test-support/desfaz-filmes-f1f3-publico-2010.mjs'
import { semApresentadorOlhos1910 } from './test-support/desfaz-apresentador-olhos-1910.mjs'
import { semHomeCardsBotoes2010 } from './test-support/desfaz-home-cards-botoes-2010.mjs'
import { semAdsBola2110 } from './test-support/desfaz-ads-bola-2110.mjs' // KINEO-ADS-QUALIDADE-2110 — reancorado: a bola (que tira a qualidade primeiro) veio depois

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-UGC-AJUSTES-2010'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const B = UGC_AJUSTES_2010_BASE
const base = (p) => { try { return lf(git('show', `${B}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }
const vermelho = async (fn) => { try { return !(await fn()) } catch (e) { if (/^mutante /.test(String(e && e.message))) throw e; return true } } // mutante que não aplicou NUNCA conta como vermelho (a checagem falha)

const F = {
  v2: 'lib/ads/v2PresenterV2.ts', entry: 'lib/ads/sampleEntry.ts', sample: 'lib/ads/sample.ts', access: 'lib/ads/serverAccess.ts', brief: 'lib/ads/v2Brief.ts',
  plan: 'lib/ads/v2PlanCore.ts', start: 'lib/ads/v2StartCore.ts', planRoute: 'app/api/ads/v2/plan/route.ts', startRoute: 'app/api/ads/v2/start/route.ts',
  page: 'app/(dashboard)/ads/v2/page.tsx', client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx', simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  presenter: 'lib/ads/v2Presenter.ts', mp3: 'public/ads/presenters/voice-pt-confidentwoman.mp3',
}
function loadPure(text) {
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  new Function('module', 'exports', 'require', js)(module, module.exports, (s) => { throw new Error('import inesperado: ' + s) })
  return module.exports
}
/** Carrega `rel` pelo carregador offline; `over` = { arquivo: texto } (mutantes); `mocks` = dublês. */
const loadVia = (rel, mocks = {}, over = {}) => createOfflineLoader({ mocks, source: (r, text) => (over[r] !== undefined ? over[r] : text) })(rel)

const V2 = loadPure(semAdsBola2110(rd(F.v2), F.v2)) // KINEO-ADS-QUALIDADE-2110 — reancorado: a faixa e a régua desta entrega são provadas sem o anúncio da bola e a qualidade (21/10, entregas de depois, desfaz próprio)
const LIB = createOfflineLoader({})(F.presenter).ADS_V2_PRESENTER_LIBRARY

// ═══ A. a lista aprovada ═════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nA. lista aprovada: Jade e Robert entram (6 para clientes); os outros 6 seguem "em teste"; a trava do servidor confere')
const SEIS = ['amara', 'jade', 'kenji', 'rahul', 'robert', 'sofia']
const provaLista = (v2 = V2) => {
  const ids = LIB.map((p) => p.id)
  const cliente = ids.filter((id) => v2.adsV2PresenterV2Visible(id, false)).sort()
  const teste = ids.filter((id) => v2.adsV2PresenterV2Testing(id)).sort()
  const g = (presenterId, person, internal) => v2.adsV2PresenterV2GatePick({ presenterId, person, internal, library: LIB })
  const idx = (id) => LIB.findIndex((p) => p.id === id)
  const gender = (id) => LIB[idx(id)].gender
  const ficam = SEIS.every((id) => !g(id, idx(id), false).swapped)
  const ocultos = ['clara', 'hannah', 'chloe', 'lucia', 'yasmin', 'marcus'].every((id) => { const r = g(id, idx(id), false); return r.swapped && SEIS.includes(r.presenterId) && gender(r.presenterId) === gender(id) })
  return JSON.stringify([...v2.ADS_V2_PRESENTER_V2_APPROVED].sort()) === JSON.stringify(SEIS) && JSON.stringify(cliente) === JSON.stringify(SEIS) &&
    teste.length === 6 && !teste.some((id) => SEIS.includes(id)) && ids.length === 12 && SEIS.every((id) => ids.includes(id)) && ficam && ocultos &&
    v2.ADS_V2_PRESENTER_V2_APPROVED_ONLY === true && LIB.find((p) => p.id === 'jade').gender === 'woman' && LIB.find((p) => p.id === 'robert').gender === 'man'
}
await check('A1 cliente vê e recebe sofia, amara, rahul, kenji, jade, robert; os 6 outros "em teste"; Jade/Robert não são trocados; oculto vira aprovado do mesmo gênero', () => provaLista())

// ═══ V. a amostra de voz PT ══════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nV. amostra de voz PT: a frase neutra de 20/10, mesma voz')
const provaMp3 = (sha = UGC_AJUSTES_2010_BINARIOS[F.mp3], v2 = V2) => {
  const b = existsSync(join(ROOT, F.mp3)) ? readFileSync(join(ROOT, F.mp3)) : null
  const mp3 = !!b && (b.subarray(0, 3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) && b.length <= 120 * 1024 && b.length >= 8000
  return mp3 && createHash('sha256').update(b).digest('hex') === sha && sha === '89154f00cc4c5246e0e4891401b32c248a9d50bb718e6cf3d3eeb11175d91ac7' &&
    v2.ADS_V2_PRESENTER_V2_VOICE_SAMPLES.Portuguese_ConfidentWoman === '/ads/presenters/voice-pt-confidentwoman.mp3'
}
await check('V1 public/ads/presenters/voice-pt-confidentwoman.mp3 = sha256 89154f00…91ac7 (86.964 bytes, MP3), o arquivo que a tabela da ConfidentWoman aponta', () => provaMp3())

// ═══ S. o sub-teto da amostra com a pessoa ═══════════════════════════════════════════════════════════════════════════════
console.log('\nS. sub-teto: 10/dia com a pessoa dentro dos 30; contado no servidor; passou = Close real com aviso; o /start confere')
const ENTRY = (text = rd(F.entry)) => loadPure(text)
const SAMPLE = loadPure(rd(F.sample).replace(/^import type .*$/gm, ''))
const provaConst = (e = ENTRY(), s = SAMPLE) => e.ADS_SAMPLE_PRESENTER_DAILY_CAP === 10 && s.ADS_SAMPLE_DAILY_CAP === 30 && e.ADS_SAMPLE_PRESENTER_DAILY_CAP < s.ADS_SAMPLE_DAILY_CAP &&
  e.ADS_SAMPLE_PRESENTER_FALLBACK === 'presenter_cap' && e.ADS_SAMPLE_PRESENTER_CAP_CODE === 'sample_presenter_cap' &&
  (rd(F.entry).match(/ADS_SAMPLE_PRESENTER_DAILY_CAP = /g) || []).length === 1 && !/\b10\b/.test(rd(F.access).split('\n').filter((l) => l.includes('ADS_SAMPLE_PRESENTER_DAILY_CAP')).join('\n').replace(/KINEO-UGC-AJUSTES-2010/g, ''))
await check('S1 constante ÚNICA ADS_SAMPLE_PRESENTER_DAILY_CAP = 10 (lib/ads/sampleEntry.ts), abaixo do teto geral ADS_SAMPLE_DAILY_CAP = 30 (intocado); a porta usa a constante', () => provaConst())

/** Banco dublê da contagem: registra os filtros e devolve `count` (ou erro). */
function fakeAdmin(count, error = null) {
  const calls = []
  const q = { calls, from(t) { calls.push(['from', t]); return q }, select(c, o) { calls.push(['select', c, JSON.stringify(o)]); return q },
    like(c, v) { calls.push(['like', c, v]); return q }, gte(c, v) { calls.push(['gte', c, v]); return q }, eq(c, v) { calls.push(['eq', c, v]); return q },
    then(res) { return Promise.resolve({ count, error }).then(res) } }
  return q
}
const ACCESS_MOCKS = {
  '@/lib/userFootage': { footageAdminClient: () => { throw new Error('sem banco') } },
  '@/lib/ads/access': { adsAccessReason: () => 'none', ADS_ACCESS_SELECT: 'id, plan' },
  '@/lib/ads/offer': { adsPassLive: () => true },
  '@/lib/partnerAccess': { isActivePartner: async () => false },
  '@/lib/ads/workspace': { personalWorkspace: () => ({}), resolveAdsWorkspace: async () => ({}) },
  '@/lib/emailValidation': { isDisposableEmail: () => false },
}
const provaContagem = async (over = {}) => {
  const A = loadVia(F.access, ACCESS_MOCKS, over)
  const now = new Date('2026-10-20T15:30:00Z')
  const a9 = fakeAdmin(9), a10 = fakeAdmin(10), aErr = fakeAdmin(null, { message: 'x' })
  const r9 = await A.adsSamplePresenterCapReached(a9, now), r10 = await A.adsSamplePresenterCapReached(a10, now), rErr = await A.adsSamplePresenterCapReached(aErr, now)
  const filtros = JSON.stringify(a9.calls)
  const geral = fakeAdmin(29)
  const g29 = await A.adsSampleCapReached(geral, now)
  return r9 === false && r10 === true && rErr === true && g29 === false &&
    filtros === JSON.stringify([['from', 'ads_v2_orders'], ['select', 'id', JSON.stringify({ count: 'exact', head: true })], ['like', 'billing_ref', 'adssample-%'], ['gte', 'started_at', '2026-10-20T00:00:00.000Z'], ['eq', 'plan->>sample_format', 'presenter']]) &&
    !JSON.stringify(geral.calls).includes('sample_format')
}
await check('S2 EXECUTADO (banco dublê): 9 com a pessoa hoje = livre; 10 = atingido; erro de leitura = atingido; filtros = ads_v2_orders, adssample-%, started_at ≥ 00:00 UTC, plan->>sample_format = presenter; o teto geral (29 < 30) segue contando as duas', () => provaContagem())

const provaPlano = (plan = rd(F.plan)) => {
  const L = plan.split('\n')
  const iCap = L.findIndex((l) => l.startsWith('    const samplePresenterCapped = gate !== \'ok\' && sample && adsSampleFormatFor(input.sample_entry === \'ugc\' ? \'ugc\' : \'product\', ADS_V2_PRESENTER_PUBLIC) === \'presenter\' && await adsSamplePresenterCapReached(admin)'))
  const iDel = L.findIndex((l) => l.startsWith('    if (samplePresenterCapped) delete input.sample_entry'))
  const iFmt = L.findIndex((l) => l.startsWith("    const sampleFormat = gate !== 'ok' && sample ? adsSampleFormatFor(input.sample_entry === 'ugc' ? 'ugc' : 'product', ADS_V2_PRESENTER_PUBLIC) : null"))
  const iClose = L.findIndex((l) => l.startsWith('    const closeRealAsked = ADS_V2_CLOSE_REAL_LIVE && (input.close_real === true || (gate !== \'ok\' && sample && sampleFormat !== \'presenter\'))'))
  return iCap > 0 && iDel === iCap + 1 && iFmt === iDel + 1 && iClose > iFmt &&
    plan.includes("      ...(samplePresenterCapped ? { sample_fallback: ADS_SAMPLE_PRESENTER_FALLBACK } : {}),") &&
    plan.includes('    if (samplePresenterCapped) Object.assign(modeTag, { sample_fallback: ADS_SAMPLE_PRESENTER_FALLBACK })') &&
    !/samplePresenterCapped[^\n]*v2Fail\(/.test(plan)
}
await check('S3 o /plan: sub-teto lido ANTES do formato da amostra; atingido = tira a entrada UGC (a amostra vira o Close real pela regra de sempre), nunca v2Fail; resposta e evento levam sample_fallback', () => provaPlano())
const provaStart = (start = rd(F.start)) => {
  const iCap = start.indexOf("      if (await adsSampleCapReached(admin)) return v2Fail('sample_cap', 429)")
  const iSub = start.indexOf('      if (samplePresenter && await adsSamplePresenterCapReached(admin)) return v2Fail(ADS_SAMPLE_PRESENTER_CAP_CODE, 429)')
  const iLock = start.indexOf(".update({ status: 'generating'")
  const iDry = start.indexOf('    if (dryRun) {')
  return iCap > 0 && iSub > iCap && iLock > iSub && iDry > 0 && iDry < iCap && /const samplePresenter = sampleRun && adsSamplePresenterPlanOk\(plan\)/.test(start)
}
await check('S4 o /start: o plano com a pessoa que chegou depois do sub-teto = 429 sample_presenter_cap ANTES da trava (sem débito, sem fal), depois do teto geral e do ensaio', () => provaStart())
const provaAviso = (e = ENTRY(), simple = rd(F.simple)) => {
  const langs = Object.keys(e.ADS_SAMPLE_PRESENTER_NOTE)
  const n = e.ADS_SAMPLE_PRESENTER_CAP_NOTE
  return langs.length === 16 && JSON.stringify(Object.keys(n).sort()) === JSON.stringify([...langs].sort()) &&
    langs.every((l) => typeof n[l] === 'string' && n[l].length > 40 && /15/.test(n[l]) && (l === 'en' || n[l] !== n.en)) && e.adsSamplePresenterCapNote('xx') === n.en && e.adsSamplePresenterCapNote('pt') === n.pt &&
    simple.includes('      setPresenterCapNote(r.data.sample_fallback === ADS_SAMPLE_PRESENTER_FALLBACK)') &&
    simple.includes('        if (r.code === ADS_SAMPLE_PRESENTER_CAP_CODE) { setPlan(null); setPlanError(null); setPresenterCapNote(true) }') &&
    simple.includes('{sample && presenterCapNote ? <p className="adsw-hint" role="status" data-kineo="ads-sample-presenter-cap">{adsSamplePresenterCapNote(lang)}</p> : null}')
}
await check('S5 o aviso honesto em 16 línguas (nenhuma cai no inglês, todas dizem 15 s); a tela mostra quando o /plan caiu no Close real e quando o /start devolve o sub-teto (o plano é refeito)', () => provaAviso())

// ═══ P. o sample_probe ═══════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nP. sample_probe: só a conta interna com ?sample_probe=1 vira "none"')
const provaProbePura = (e = ENTRY()) => e.ADS_SAMPLE_PROBE_PARAM === 'sample_probe' && e.adsSampleProbeOn('internal', '1') === true &&
  ['0', 'true', '', null, undefined, ' 1'].every((v) => e.adsSampleProbeOn('internal', v) === false) &&
  ['subscriber', 'partner', 'pass', 'none', null, undefined].every((r) => e.adsSampleProbeOn(r, '1') === false) &&
  e.adsSampleProbeUrl('/api/ads/v2/plan', true) === '/api/ads/v2/plan?sample_probe=1' && e.adsSampleProbeUrl('/api/ads/v2/start', false) === '/api/ads/v2/start'
await check('P1 regra pura: internal + "1" = sim; qualquer outro valor ou outra conta (assinante, parceiro, passe, none) = não; a URL só ganha ?sample_probe=1 com probe', () => provaProbePura())
const rotaReason = async (rel, reason, qs, over = {}) => {
  let visto = null
  const R = loadVia(rel, {
    'next/server': {},
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'casa@x.test' } } }) } }) },
    '@/lib/ads/serverAccess': { loadAdsAccess: async () => ({ admin: {}, reason, ownerId: null }) },
    '@/lib/ads/v2Server': { v2Fail: (code, status) => ({ code, status }) },
    '@/lib/ads/v2PlanCore': { adsV2PlanFor: async (_u, access) => { visto = access.reason; return { status: 200 } } },
    '@/lib/ads/v2StartCore': { adsV2StartFor: async (_u, access) => { visto = access.reason; return { status: 202 } } },
  }, over)
  await R.POST({ json: async () => ({}), nextUrl: { searchParams: new URLSearchParams(qs) } })
  return visto
}
const provaRotas = async (over = {}) => {
  for (const rel of [F.planRoute, F.startRoute]) {
    if ((await rotaReason(rel, 'internal', 'sample_probe=1', over)) !== 'none') return false
    if ((await rotaReason(rel, 'internal', '', over)) !== 'internal') return false
    if ((await rotaReason(rel, 'internal', 'sample_probe=0', over)) !== 'internal') return false
    for (const r of ['subscriber', 'partner', 'none']) if ((await rotaReason(rel, r, 'sample_probe=1', over)) !== r) return false
  }
  return true
}
await check('P2 EXECUTADO nas duas rotas (/plan e /start, dublês de sessão e acesso): interna + ?sample_probe=1 chega ao núcleo como "none"; interna sem ou com 0 = "internal"; assinante/parceiro/none com 1 = o acesso deles', () => provaRotas())
const provaTela = (page = rd(F.page), client = rd(F.client), simple = rd(F.simple)) =>
  page.includes('  const sampleProbe = adsSampleProbeOn(reasonOwn, Array.isArray(rawProbe) ? rawProbe[0] : rawProbe)') && page.includes("  const reason = sampleProbe ? 'none' : reasonOwn") &&
  page.indexOf("  const reason = sampleProbe ? 'none' : reasonOwn") < page.indexOf('  const gate = adsGate(reason)') && page.includes('sampleProbe={sampleProbe} entry={entry} escolhaInternal={cenaEnabled(isAdsInternalEmail(user.email)) && !sampleProbe} escolhaOwnerKey={`${user.id}:${uid}`} />') /* KINEO-ADS-ESCOLHA-2310 — keep the complete legacy probe contract and require the new internal UI to stay off in probe mode. */ &&
  page.includes('<AdsPresenterAllProvider all={isAdsInternalEmail(user.email) && !sampleProbe}>') &&
  (client.match(/adsV2ProbeUrl\('\/api\/ads\/v2\/(plan|start)', sampleProbe\)/g) || []).length === 3 && (simple.match(/adsSampleProbeUrl\('\/api\/ads\/v2\/(plan|start)', sampleProbe\)/g) || []).length === 2 &&
  !/api<[^>]+>\('\/api\/ads\/v2\/(plan|start)'/.test(client.split('\n').filter((l) => !l.includes('era:')).join('\n')) && !/api<[^>]+>\('\/api\/ads\/v2\/(plan|start)'/.test(simple.split('\n').filter((l) => !l.includes('era:')).join('\n')) &&
  client.includes('function adsV2ProbeUrl(url: string, probe: boolean): string { return probe ? `${url}?sample_probe=1` : url }')
await check('P3 a tela: o page.tsx decide pelo reason do SERVIDOR (só interna), entra pela amostra com a lista dos aprovados de cliente e passa sampleProbe; o /plan e o /start da tela (completo 3×, simples 2×) levam ?sample_probe=1 só com ele', () => provaTela())

// ═══ F. a faixa do roteiro do apresentador ═══════════════════════════════════════════════════════════════════════════════
console.log('\nF. faixa do roteiro: pede 19–21, aceita até 23 (piso 19)')
const JSONS = Object.fromEntries(['lib/ui/refinementCopy.json'].map((rel) => ['@/' + rel, JSON.parse(rd(rel))]))
const BR = (over = {}) => createOfflineLoader({ mocks: { '@/lib/openai': { openai: {} }, ...JSONS }, source: (rel, text) => (over[rel] !== undefined ? over[rel] : semAdsBola2110(text, rel)) })(F.brief) // KINEO-ADS-QUALIDADE-2110 — reancorado: a faixa e a régua desta entrega são provadas sem o anúncio da bola e a qualidade (21/10, entregas de depois, desfaz próprio)
const BRIEF_LUME = { business: 'Perfume LUME', offer: null, contact: null, extra: {} }
const PAL = 'Este é o Perfume LUME feito para o dia a dia com notas leves que acompanham você do trabalho ao jantar sem pesar nem cansar e garanta o seu hoje mesmo agora sim'.split(' ')
const fala = (n) => { const w = PAL.slice(0, n); return w.join(' ') + '.' }
const provaFaixa = (b = BR(), v2 = V2) => {
  const raw = (n) => JSON.stringify({ narration: fala(n), overlays: ['Perfume LUME', 'Para o dia a dia'], sector: 'store' })
  const opt = (accept) => ({ maxWords: 21, narration: true, speechMin: 19, ...(accept ? { acceptMaxWords: accept } : {}) })
  const r = (n, a) => b.checkV2Copy(raw(n), BRIEF_LUME, opt(a))
  const c24 = r(24, 23)
  return PAL.length >= 24 && r(22, 23).ok === true && r(23, 23).ok === true && r(21, 23).ok === true && r(19, 23).ok === true &&
    c24.ok === false && c24.why.some((w) => w === 'narration: write 19 to 21 words (you wrote 24).') && r(18, 23).ok === false &&
    r(22).ok === false && r(22, 21).ok === false &&
    v2.ADS_V2_PRESENTER_V2_MIN_WORDS === 19 && v2.ADS_V2_PRESENTER_V2_MAX_WORDS === 21 && v2.ADS_V2_PRESENTER_V2_ACCEPT_MAX_WORDS === 23 &&
    v2.adsV2PresenterV2AcceptMax(21) === 23 && v2.adsV2PresenterV2AcceptMax(15) === 17 && v2.adsV2PresenterV2AcceptMax(22) === 23 && v2.adsV2PresenterV2AcceptMax(30) === 30 && v2.adsV2PresenterV2AcceptMax(NaN) === 23 &&
    JSON.stringify(v2.adsV2PresenterV2Words(30)) === JSON.stringify({ min: 19, max: 21 })
}
await check('F1 EXECUTADO na régua (checkV2Copy): com a folga 23, 19/21/22/23 palavras passam; 24 e 18 não (o motivo segue pedindo "19 to 21"); sem a folga, 22 continua recusado; o pedido segue 19–21', () => provaFaixa())
const provaFaixaRota = (plan = rd(F.plan), brief = rd(F.brief)) =>
  plan.includes("    const acceptMaxWords = v2Words && presenterV2Early && typeof presenterV2Early.adsV2PresenterV2AcceptMax === 'function' ? presenterV2Early.adsV2PresenterV2AcceptMax(v2Words.max) : maxWords // KINEO-UGC-AJUSTES-2010") &&
  plan.includes('      ...(acceptMaxWords > maxWords ? { acceptMaxWords } : {}),') &&
  plan.includes('      ...(acceptMaxWords > maxWords ? { edit_limits: { narration_words: acceptMaxWords, overlay_chars: ADS_V2_OVERLAY_MAX_CHARS } } : {}),') &&
  plan.indexOf('      edit_limits: { narration_words: maxWords, overlay_chars: ADS_V2_OVERLAY_MAX_CHARS },') < plan.indexOf('{ edit_limits: { narration_words: acceptMaxWords') &&
  brief.includes("  if (typeof args.acceptMaxWords === 'number' && Number.isFinite(args.acceptMaxWords) && args.acceptMaxWords > args.maxWords) Object.assign(opts, { acceptMaxWords: Math.floor(args.acceptMaxWords) })") &&
  brief.indexOf('Object.assign(opts, { acceptMaxWords') < brief.indexOf('const copyMsgs = adsV2KitBfCopyMessages(buildV2CopyMessages(brief, args.languageName, opts), args.kitBf)')
await check('F2 só o apresentador v2 ganha a folga (sem v2Words, acceptMaxWords = maxWords e nada muda); a edição da tela aceita o texto aceito; nenhuma chamada a mais ao modelo', () => provaFaixaRota())

// ═══ D. desfaz, marca, encadeamento ══════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, marca, encadeamento, novos')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-ugc-ajustes-2010.mjs), é EXATAMENTE a base ${B.slice(0, 9)}; os novos existem e não existiam; o mp3 existia`, () =>
  UGC_AJUSTES_2010_ARQUIVOS.length >= 11 && UGC_AJUSTES_2010_ARQUIVOS.every((f) => base(f) !== null && semUgcAjustes2010(rd(f), f) === base(f) && !semUgcAjustes2010(rd(f), f).includes(MARCA)) &&
  MARCA_UGC_AJUSTES_2010 === MARCA && UGC_AJUSTES_2010_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && base(F.mp3) !== null)
await check('D2 toda linha nova traz a marca; o diff contra a base só toca os arquivos da lista, os novos e o mp3; a marca não contém a de outra camada; nada de cobrança, motor ou preço', () => {
  const tocados = git('diff', '--name-only', B, git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, '-1', 'HEAD').trim() || 'HEAD').trim().split('\n').filter(Boolean) // reancorado KINEO-MENU-UGC-2010 — mede da base até o último commit DESTA entrega (o menu do topo veio depois, na mesma fila, e toca outros arquivos)
  const permitidos = new Set([...UGC_AJUSTES_2010_ARQUIVOS, ...UGC_AJUSTES_2010_NOVOS, F.mp3])
  const linhas = UGC_AJUSTES_2010_ARQUIVOS.every((f) => git('diff', '-U0', '--no-color', B, '--', f).replace(/\r/g, '').split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++') && !l.includes('KINEO-ADS-NOTA9-2110') && !l.includes('KINEO-ADS-BOLA-2110') && !l.includes('KINEO-ADS-QUALIDADE-2110')).every((l) => l.includes(MARCA))) // reancorado KINEO-ADS-NOTA9-2110 — as linhas da tela foco (21/10, camada mais nova) não contam como desta entrega // KINEO-ADS-QUALIDADE-2110 — reancorado: as linhas da bola e da qualidade levam a marca delas
  const trocasOk = UGC_AJUSTES_2010_ARQUIVOS.every((f) => (TROCAS_UGC_AJUSTES_2010[f] ?? []).every(([nova, velha]) => nova.includes(MARCA) && !velha.includes(MARCA)))
  return tocados.length > 0 && tocados.every((f) => permitidos.has(f)) && linhas && trocasOk && !/KINEO-(KIT|HOME|APRESENTADOR|FILMES|CLOSE)/.test(MARCA) &&
    ['lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/ads/v2Advance.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/sample.ts', 'lib/compose.ts'].every((f) => !tocados.includes(f)) &&
    Object.values(ACRESCIMOS_UGC_AJUSTES_2010).every((n) => Number.isInteger(n) && n >= 0)
})
await check('D3 encadeamento: desfaz-paginas-ugc-2010 (a cabeça que semKitBfVenda2010 chama primeiro), desfaz-filmes-f1f3-publico-2010 (e por elas os olhos do apresentador e os botões dos cards) tiram esta camada PRIMEIRO; texto sem a marca e null passam igual', () =>
  UGC_AJUSTES_2010_ARQUIVOS.every((f) => {
    const vivo = rd(f), semEste = semUgcAjustes2010(vivo, f)
    return semKitBfVenda2010(vivo, f) === semKitBfVenda2010(semEste, f) && semFilmesF1F3Publico2010(vivo, f) === semFilmesF1F3Publico2010(semEste, f) &&
      semApresentadorOlhos1910(vivo, f) === semApresentadorOlhos1910(semEste, f) && semHomeCardsBotoes2010(vivo, f) === semHomeCardsBotoes2010(semEste, f) && semUgcAjustes2010(semEste, f) === semEste
  }) && semUgcAjustes2010(null, F.v2) === null && semUgcAjustes2010('x', 'nao/existe.ts') === 'x' &&
  rd('scripts/test-support/desfaz-paginas-ugc-2010.mjs').includes('export function semPaginasUgc2010(texto, p) {\n  texto = semUgcAjustes2010(texto, p) // KINEO-UGC-AJUSTES-2010') &&
  rd('scripts/test-support/desfaz-kit-bf-venda-2010.mjs').includes('export function semKitBfVenda2010(texto, p) {\n  texto = semPaginasUgc2010(texto, p)') &&
  /  texto = semUgcAjustes2010\(texto, p\) \/\/ KINEO-UGC-AJUSTES-2010/.test(rd('scripts/test-support/desfaz-filmes-f1f3-publico-2010.mjs')))
await check('D4 as libs puras continuam puras (v2PresenterV2 e sampleEntry só com import type)', () => [F.v2, F.entry].every((f) => rd(f).split('\n').filter((l) => /^import /.test(l)).every((l) => /^import type /.test(l))))

// ═══ M. mutantes ═════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const mV2 = (a, b) => loadPure(trocar(rd(F.v2), a, b))
await check('M1 a Jade sai da lista → A1 vermelho', () => vermelho(() => provaLista(mV2("'kenji', 'jade', 'robert']", "'kenji', 'robert']"))))
await check('M2 o Robert sai da lista → A1 vermelho', () => vermelho(() => provaLista(mV2("'jade', 'robert']", "'jade']"))))
await check('M3 o sub-teto vira 30 → S1 vermelho', () => vermelho(() => provaConst(ENTRY(trocar(rd(F.entry), 'export const ADS_SAMPLE_PRESENTER_DAILY_CAP = 10', 'export const ADS_SAMPLE_PRESENTER_DAILY_CAP = 30')))))
await check('M4 a contagem perde o filtro da pessoa (conta as duas) → S2 vermelho', () => vermelho(() => provaContagem({ [F.access]: trocar(rd(F.access), "      .eq('plan->>sample_format', ADS_SAMPLE_PRESENTER_MARK)", '') })))
await check('M5 erro de leitura do sub-teto vira "livre" → S2 vermelho', () => vermelho(() => provaContagem({ [F.access]: trocar(rd(F.access), "    if (error || typeof count !== 'number') return true // KINEO-UGC-AJUSTES-2010", "    if (error || typeof count !== 'number') return false // KINEO-UGC-AJUSTES-2010") })))
await check('M6 o /plan esquece de tirar a entrada UGC (o apresentador sai mesmo assim) → S3 vermelho', () => vermelho(() => provaPlano(trocar(rd(F.plan), '    if (samplePresenterCapped) delete input.sample_entry', '    if (false) delete input.sample_entry'))))
await check('M7 o /start sem a conferência do sub-teto → S4 vermelho', () => vermelho(() => provaStart(trocar(rd(F.start), '      if (samplePresenter && await adsSamplePresenterCapReached(admin)) return v2Fail(ADS_SAMPLE_PRESENTER_CAP_CODE, 429)', '      if (false) return v2Fail(ADS_SAMPLE_PRESENTER_CAP_CODE, 429)'))))
await check('M8 o aviso em pt cai no inglês → S5 vermelho', () => { const e = ENTRY(); const n = { ...e, ADS_SAMPLE_PRESENTER_CAP_NOTE: { ...e.ADS_SAMPLE_PRESENTER_CAP_NOTE, pt: e.ADS_SAMPLE_PRESENTER_CAP_NOTE.en } }; return vermelho(() => provaAviso(n)) })
await check('M9 o probe vale para qualquer conta → P1 vermelho', () => vermelho(() => provaProbePura(ENTRY(trocar(rd(F.entry), "  return reason === 'internal' && param === '1' // KINEO-UGC-AJUSTES-2010", "  return param === '1' // KINEO-UGC-AJUSTES-2010")))))
await check('M10 a rota do /start não aplica o probe → P2 vermelho', () => vermelho(() => provaRotas({ [F.startRoute]: trocar(rd(F.startRoute), "access.reason = 'none'", 'void 0') })))
await check('M11 a rota do /plan aplica o probe a quem não é interna (assinante vira none) → P2 vermelho', () => vermelho(() => provaRotas({ [F.planRoute]: trocar(rd(F.planRoute), 'if (adsSampleProbeOn(access.reason, ', "if ((access.reason === 'subscriber' && req.nextUrl?.searchParams?.get('sample_probe') === '1') || adsSampleProbeOn(access.reason, ") })))
await check('M12 a tela manda o probe sem o page.tsx decidir (sempre) → P3 vermelho', () => vermelho(() => provaTela(rd(F.page), trocar(rd(F.client), 'function adsV2ProbeUrl(url: string, probe: boolean): string { return probe ? `${url}?sample_probe=1` : url }', 'function adsV2ProbeUrl(url: string, probe: boolean): string { return `${url}?sample_probe=1` }'))))
await check('M13 a régua volta ao teto de sempre (21) → F1 vermelho', () => vermelho(() => provaFaixa(BR({ [F.brief]: trocar(rd(F.brief), 'if (words < min || words > acceptTop) why.push', 'if (words < min || words > opts.maxWords) why.push') }))))
await check('M14 a folga vira 25 → F1 vermelho', () => vermelho(() => provaFaixa(BR(), mV2('export const ADS_V2_PRESENTER_V2_ACCEPT_MAX_WORDS = 23', 'export const ADS_V2_PRESENTER_V2_ACCEPT_MAX_WORDS = 25'))))
await check('M15 o piso de 19 cai para 17 → F1 vermelho', () => vermelho(() => provaFaixa(BR(), mV2('export const ADS_V2_PRESENTER_V2_MIN_WORDS = 19', 'export const ADS_V2_PRESENTER_V2_MIN_WORDS = 17'))))
await check('M16 o /plan passa a folga a todo anúncio (não só o apresentador) → F2 vermelho', () => vermelho(() => provaFaixaRota(trocar(rd(F.plan), "typeof presenterV2Early.adsV2PresenterV2AcceptMax === 'function' ? presenterV2Early.adsV2PresenterV2AcceptMax(v2Words.max) : maxWords", "typeof presenterV2Early.adsV2PresenterV2AcceptMax === 'function' ? presenterV2Early.adsV2PresenterV2AcceptMax(v2Words.max) : maxWords + 2"))))
await check('M17 o sha do mp3 cravado errado → V1 vermelho', () => vermelho(() => provaMp3('221760905185e7bd48c6ff20987a386c54717905b88c177d97fc15374be07e33')))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
