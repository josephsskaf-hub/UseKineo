// KINEO-NUVEM-A2-2026-10-02 — "logo da conta em tudo": prova que os TRÊS chamadores novos de lib/brandLogo existem e
// fazem o certo, além do compose de 01/10:
//   (1) Espaços  — app/api/spaces/montage/route.ts: withBrandLogo depois de montar e antes de enviar, com y 19% (o
//                  rótulo ANTES/DEPOIS mora em 6–12%);
//   (2) Ads v2   — lib/ads/v2Advance.ts: logo da conta SÓ durante os planos (`until` = soma dos cortes), nunca por cima
//                  do cartão final, que já mostra o logo da empresa (sem duplicar);
//   (3) Clips    — app/api/clips/brand/route.ts: cópia do clipe pronto com o logo (o clipe não tem montagem), atrás de
//                  CLIPS_BRAND_LOGO_PUBLIC=false, prova de dono por evento só-servidor, 1 envio por clipe.
// E: o elemento sem `place` continua byte a byte o de 01/10 (o compose não muda). readFileSync + transpile.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const transpile = (src) => ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
function load(src) {
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', transpile(src))(mod, mod.exports, (p) => { throw new Error('import inesperado: ' + p) })
  return mod.exports
}
// Só as duas funções puras de lib/brandLogo (o resto importa o supabase-js).
function loadBrand(src) {
  const puro = ['brandLogoElement', 'withBrandLogo'].map((n) => {
    const m = src.match(new RegExp(`export function ${n}[\\s\\S]*?\\n}\\n`))
    return m ? m[0].replace('export ', '') : ''
  }).join('\n')
  return new Function(`${ts.transpileModule(puro, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText}; return { brandLogoElement, withBrandLogo }`)()
}

const BRAND = read('lib/brandLogo.ts')
const SPACES_ROUTE = read('app/api/spaces/montage/route.ts')
const SPACES_LIB = read('lib/spaces/spaces.ts')
const ADV = read('lib/ads/v2Advance.ts')
const CLIP_ROUTE = read('app/api/clips/brand/route.ts')
const CLIP_LIB = read('lib/clips/clipBrand.ts')
const CLIP_UI = read('app/(dashboard)/clips/ClipsClient.tsx')
const EVENTS = read('app/api/events/route.ts')
const URL_OK = 'https://x.supabase.co/storage/v1/object/public/avatars/u/brand-logo.png?v=1'

console.log('0 — lib/brandLogo: `place` opcional, padrão intacto')
const B = loadBrand(BRAND)
const legacy = { type: 'image', track: 10, time: 0, duration: 42, source: URL_OK, x: '14%', y: '15%', width: '20%', height: '8%', fit: 'contain' }
ok(JSON.stringify(B.brandLogoElement(URL_OK, 42)) === JSON.stringify(legacy), 'sem place = o elemento de 01/10, byte a byte')
ok(B.brandLogoElement(URL_OK, 42, { until: 30 }).duration === 30, 'until corta a janela')
ok(B.brandLogoElement(URL_OK, 20, { until: 30 }).duration === 20, 'until nunca passa do fim do vídeo')
ok(B.brandLogoElement(URL_OK, 42, { y: '19%' }).y === '19%' && B.brandLogoElement(URL_OK, 42, { y: 'calc(1px)' }).y === '15%', 'y aceita só porcentagem')
ok(B.brandLogoElement(URL_OK, 42, { until: 0 }) === null && B.brandLogoElement(null, 42, { y: '19%' }) === null, 'janela zero ou sem logo = nada')

function spacesProblems(route, lib) {
  const p = []
  const iBuild = route.indexOf('buildSpacesMontageSource({')
  const iLogo = route.indexOf('withBrandLogo(source, brandLogo, { y: SPACES_BRAND_LOGO_Y })')
  const iSubmit = route.indexOf('submitCreatomateRender(source)')
  if (!/import \{ findBrandLogoUrl, withBrandLogo \} from '@\/lib\/brandLogo'/.test(route)) p.push('rota não importa o logo')
  if (!/const brandLogo = await findBrandLogoUrl\(user\.id\)/.test(route)) p.push('rota não busca o logo DA CONTA logada')
  if (!(iBuild > 0 && iLogo > iBuild && iSubmit > iLogo)) p.push('logo fora da ordem montar → logo → enviar')
  const y = lib.match(/export const SPACES_BRAND_LOGO_Y = '(\d+)%'/)
  const lab = lib.match(/y: '(\d+)%', x_anchor: '50%', y_anchor: '50%', width: '60%', height: '(\d+)%'/)
  if (!y || !lab) p.push('posição do logo ou do rótulo não encontrada')
  else if (Number(y[1]) - 4 < Number(lab[1]) + Number(lab[2]) / 2) p.push(`logo (topo ${Number(y[1]) - 4}%) encosta no rótulo (fim ${Number(lab[1]) + Number(lab[2]) / 2}%)`)
  return p
}
console.log('1 — Espaços')
const sp = spacesProblems(SPACES_ROUTE, SPACES_LIB)
ok(sp.length === 0, 'Espaços chama o logo da conta, depois de montar, abaixo do rótulo' + (sp.length ? ': ' + sp.join('; ') : ''))

function adsProblems(src) {
  const p = []
  if (!/import \{ findBrandLogoUrl, withBrandLogo \} from '@\/lib\/brandLogo'/.test(src)) p.push('v2Advance não importa o logo')
  const call = src.match(/withBrandLogo\(source, await findBrandLogoUrl\(order\.user_id, admin\), \{ until: ([^}]+) \}\)/)
  if (!call) p.push('v2Advance não chama withBrandLogo com until')
  else if (!/shotsSeconds/.test(call[1]) || /cardSeconds/.test(call[1])) p.push('until não é a soma dos planos (logo invadiria o cartão final)')
  const iBuild = src.indexOf('source = buildAdV2Source({'), iLogo = src.indexOf('withBrandLogo(source'), iSubmit = src.indexOf('renderId = await submitCreatomateRender(source)')
  if (!(iBuild > 0 && iLogo > iBuild && iSubmit > iLogo)) p.push('logo fora da ordem montar → logo → enviar')
  return p
}
console.log('2 — Ads v2')
const ad = adsProblems(ADV)
ok(ad.length === 0, 'Ads v2: logo da conta só nos planos, nunca sobre o cartão com logo' + (ad.length ? ': ' + ad.join('; ') : ''))
// Execução: com until = planos, o logo termina exatamente onde o cartão começa.
const adSrc = { duration: 17.5, elements: [{ type: 'image', track: 3, time: 15, duration: 2.5 }] }
B.withBrandLogo(adSrc, URL_OK, { until: 15 })
const logoEl = adSrc.elements.find((e) => e.track === 10)
ok(!!logoEl && logoEl.time + logoEl.duration <= adSrc.elements[0].time, 'executado: o logo acaba antes do cartão final entrar')

function clipProblems(route, lib, ui, events) {
  const p = []
  if (!/export const CLIPS_BRAND_LOGO_PUBLIC = false/.test(lib)) p.push('interruptor não nasce false')
  if (/^import /m.test(lib.replace(/^import type .*$/gm, ''))) p.push('clipBrand deixou de ser módulo puro')
  if (!/clipBrandVisible\(isInternalEmail\(user\.email\)\)/.test(route)) p.push('rota sem o interruptor')
  if (!/withBrandLogo\(buildClipBrandSource\(/.test(route)) p.push('rota não põe o logo no source')
  if (!/findBrandLogoUrl\(user\.id, admin\)/.test(route) || !/fail\('no_logo', 409\)/.test(route)) p.push('sem logo a rota deveria recusar antes de enviar')
  if (!/loadClip\(admin, user\.id, id\)/.test(route)) p.push('o clipe não é lido pela conta (dono)')
  if (!/eq\('metadata->>clip_id', row\.id\)/.test(route) || !/reused: true/.test(route)) p.push('sem a trava de um envio por clipe')
  if (!/eq\('name', EVENT\)\.eq\('metadata->>render_id', renderId\)/.test(route)) p.push('GET sem prova de dono')
  if (!/persistRenderAssets\(/.test(route)) p.push('a cópia não vai para o nosso storage')
  if (/add_video_credits|debit|charge/i.test(route)) p.push('a passada de logo não pode mexer em crédito nesta v1')
  if (!events.includes("'clip_brand_submitted',")) p.push('clip_brand_submitted fora de SERVER_ONLY_EVENTS')
  if (!/fetch\('\/api\/clips\/brand'/.test(ui) || !/brandAvailable &&/.test(ui)) p.push('a tela não pergunta ao servidor antes de mostrar o botão')
  return p
}
console.log('3 — Clips')
const cp = clipProblems(CLIP_ROUTE, CLIP_LIB, CLIP_UI, EVENTS)
ok(cp.length === 0, 'Clips: passada de logo atrás de interruptor, só do dono, 1 por clipe, sem crédito' + (cp.length ? ': ' + cp.join('; ') : ''))
const C = load(CLIP_LIB)
const done = { status: 'done', video_url: 'https://x.supabase.co/storage/v1/object/public/renders/clips/u/c.mp4', aspect: '9:16', seconds: 7 }
ok(C.clipBrandable(done) && !C.clipBrandable({ ...done, aspect: 'image' }) && !C.clipBrandable({ ...done, status: 'processing' }) && !C.clipBrandable({ ...done, video_url: 'http://a/b.mp4' }), 'só clipe pronto, https e de formato conhecido')
const cs = C.buildClipBrandSource(done)
ok(cs.width === 1080 && cs.height === 1920 && cs.duration === 7 && cs.elements.length === 2 && cs.elements[1].source === done.video_url, 'source = o clipe inteiro no formato dele')
B.withBrandLogo(cs, URL_OK)
ok(cs.elements.length === 3 && cs.elements[2].track === 10 && cs.elements[2].duration === 7, 'o logo cobre o clipe inteiro')
ok(C.clipBrandVisible(true) === true && C.clipBrandVisible(false) === C.CLIPS_BRAND_LOGO_PUBLIC, 'casa sempre vê; de fora, só com o interruptor')

console.log('4 — os 3 chamadores + o compose')
const callers = ['app/api/compose/route.ts', 'app/api/spaces/montage/route.ts', 'lib/ads/v2Advance.ts', 'app/api/clips/brand/route.ts'].filter((f) => /withBrandLogo\(/.test(read(f)))
ok(callers.length === 4, `withBrandLogo chamado no compose + Espaços + Ads v2 + Clips (${callers.length}/4)`)

console.log('Mutantes')
const mut = (label, probs) => ok(probs.length > 0, 'mutante pego: ' + label)
mut('Espaços sem logo', spacesProblems(SPACES_ROUTE.replace('withBrandLogo(source, brandLogo, { y: SPACES_BRAND_LOGO_Y })', ''), SPACES_LIB))
mut('Espaços com logo em cima do rótulo', spacesProblems(SPACES_ROUTE, SPACES_LIB.replace("SPACES_BRAND_LOGO_Y = '19%'", "SPACES_BRAND_LOGO_Y = '12%'")))
mut('Ads v2 com logo no cartão', adsProblems(ADV.replace('{ until: Math.round(shotsSeconds * 1000) / 1000 }', '{ until: shotsSeconds + cardSeconds }')))
mut('Ads v2 sem logo', adsProblems(ADV.replace(/withBrandLogo\(source, await findBrandLogoUrl\(order\.user_id, admin\)[^\n]*\n/, '')))
mut('Clips aberto ao público', clipProblems(CLIP_ROUTE, CLIP_LIB.replace('CLIPS_BRAND_LOGO_PUBLIC = false', 'CLIPS_BRAND_LOGO_PUBLIC = true'), CLIP_UI, EVENTS))
mut('Clips sem trava de 1 por clipe', clipProblems(CLIP_ROUTE.replace('reused: true', 'reused: false'), CLIP_LIB, CLIP_UI, EVENTS))
mut('evento forjável', clipProblems(CLIP_ROUTE, CLIP_LIB, CLIP_UI, EVENTS.replace("  'clip_brand_submitted',\n", '')))

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
