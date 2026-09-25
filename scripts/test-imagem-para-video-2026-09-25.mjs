// KINEO-FLUXO-NOVO-2026-09-25 — peça B do fluxo novo: /images "Turn into video" → /animate?from_image=<id>.
// node scripts/test-imagem-para-video-2026-09-25.mjs
//
// O que este guardião prova (sem rede, sem banco, sem crédito):
//  1. EXECUTA runImageHandoff (extraída do AnimateClient pela AST e rodada num vm com
//     fetch/upload/replaceState falsos): o parâmetro sai da barra antes de qualquer rede,
//     um envio guardado bloqueia a imagem nova, id que não é UUID nunca vira fetch, a única
//     rede é /api/images + a URL que a PRÓPRIA linha devolveu, webp/grande é regravado,
//     e cada desfecho vira um animate_handoff_loaded com o outcome certo.
//  2. Amarra a fiação à variável que decide: o 1º argumento da chamada é `restoring`, e
//     `restoring` nasce de `stored` (readStoredSubmission) no MESMO efeito de montagem.
//  3. O link do /images é montado de `it.id`, nunca de `it.url`/`it.upscaled`, usa o mesmo
//     nome de parâmetro que o Animate lê, e mede o clique.
//  4. Nada alargou a posse do Animate (avatars/<uid>/ só), nenhum evento novo virou
//     server-only, e /api/images devolve 503 (não galeria vazia) quando o banco falha.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ✓', msg) } else { fail++; console.log('  ✗', msg) } }
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')
const squash = (s) => s.replace(/\s+/g, '')

const ANIMATE = 'app/(dashboard)/animate/AnimateClient.tsx'
const IMAGES = 'app/(dashboard)/images/ImagesClient.tsx'
const animateSrc = read(ANIMATE)
const imagesSrc = read(IMAGES)
const animateSf = ts.createSourceFile(ANIMATE, animateSrc, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const imagesSf = ts.createSourceFile(IMAGES, imagesSrc, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const walk = (node, visit) => { visit(node); ts.forEachChild(node, (child) => walk(child, visit)) }

// ─── 1. runImageHandoff executada ──────────────────────────────────────────
console.log('1) runImageHandoff executada com dependências falsas')
const WANTED = new Set(['IMAGE_HANDOFF_PARAM', 'IMAGE_HANDOFF_ID', 'HANDOFF_UPLOAD_TYPES', 'HANDOFF_REENCODE_FROM_BYTES'])
const pieces = []
for (const st of animateSf.statements) {
  if (ts.isVariableStatement(st) && st.declarationList.declarations.some((d) => WANTED.has(d.name.getText(animateSf)))) pieces.push(st.getText(animateSf))
  if (ts.isFunctionDeclaration(st) && st.name?.text === 'runImageHandoff') pieces.push(st.getText(animateSf))
  if (ts.isTypeAliasDeclaration(st) && /^ImageHandoff/.test(st.name.text)) pieces.push(st.getText(animateSf))
}
ok(pieces.length === 7, `módulo do handoff fora do componente (4 constantes + 2 tipos + função; achei ${pieces.length})`)
const js = ts.transpileModule(pieces.join('\n') + '\n;({ runImageHandoff, IMAGE_HANDOFF_PARAM })', {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 },
}).outputText
let runImageHandoff = null, PARAM = null
try {
  const out = vm.runInNewContext(js, { URL, File, Blob, Error, String })
  runImageHandoff = out.runImageHandoff
  PARAM = out.IMAGE_HANDOFF_PARAM
} catch (e) { console.log('    (vm)', e instanceof Error ? e.message : e) }
ok(typeof runImageHandoff === 'function', 'runImageHandoff extraída e executável')
ok(PARAM === 'from_image', `parâmetro lido pelo Animate = "${PARAM}"`)

const ID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const OTHER = '11111111-2222-4333-8444-555555555555'
const STORE = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/uid/'
const MB = 1024 * 1024
function harness({ href, restoring = false, rows = [{ id: ID, url: STORE + 'a.jpg', upscaled_url: null }], imagesStatus = 200,
  blob = new Blob([new Uint8Array(1000)], { type: 'image/jpeg' }), blobStatus = 200, reencodeTo = 'image/jpeg',
  uploadResult = { ok: true, status: 200 }, cancelled = false } = {}) {
  const log = { fetches: [], replaced: [], reencoded: [], uploads: [], events: [], fails: [], started: 0 }
  const deps = {
    href: href ?? `https://www.usekineo.com/animate?${PARAM}=${ID}`,
    replaceUrl: (u) => log.replaced.push(u),
    fetch: async (input, init) => {
      log.fetches.push({ input, init })
      if (input === '/api/images') return { ok: imagesStatus < 400, status: imagesStatus, json: async () => ({ images: imagesStatus < 400 ? rows : [] }) }
      return { ok: blobStatus < 400, status: blobStatus, blob: async () => blob }
    },
    reencode: async (file) => { log.reencoded.push(file); return reencodeTo ? new File([new Uint8Array(500)], 'photo.jpg', { type: reencodeTo }) : file },
    upload: async (file) => { log.uploads.push(file); return uploadResult },
    isCancelled: () => cancelled,
    onStart: () => { log.started++ },
    onFail: (m) => log.fails.push(m),
    track: (name, meta) => log.events.push({ name, ...meta }),
  }
  return { deps, log, run: () => runImageHandoff(restoring, deps) }
}
async function scenario(opts) { const h = harness(opts); const outcome = await h.run(); return { outcome, ...h.log } }

if (typeof runImageHandoff === 'function') {
  let r = await scenario({ href: 'https://www.usekineo.com/animate' })
  ok(r.outcome === null && r.fetches.length === 0 && r.replaced.length === 0 && r.events.length === 0, 'sem parâmetro: não faz nada (nem evento)')

  r = await scenario({ restoring: true })
  ok(r.outcome === 'skipped_restore', 'envio guardado em andamento: outcome skipped_restore')
  ok(r.fetches.length === 0 && r.uploads.length === 0 && r.started === 0, 'envio guardado: zero rede, zero upload, fase intocada')
  ok(r.replaced.length === 1 && !r.replaced[0].includes(PARAM), 'envio guardado: o parâmetro sai da barra mesmo assim')

  r = await scenario({ href: `https://www.usekineo.com/animate?${PARAM}=${encodeURIComponent('https://evil.example/x.png')}&keep=1` })
  ok(r.outcome === 'invalid_id' && r.fetches.length === 0, 'id que não é UUID (uma URL): nenhuma rede')
  ok(r.events[0]?.image_id === null, 'id inválido não é gravado no evento')
  ok(r.replaced[0] === '/animate?keep=1', `parâmetro removido e os outros preservados ("${r.replaced[0]}")`)

  r = await scenario({ href: `https://www.usekineo.com/animate?${PARAM}=${ID}&utm_source=x#top` })
  ok(r.outcome === 'ready', 'jpeg pequeno: ready')
  ok(r.replaced.length === 1 && r.replaced[0] === '/animate?utm_source=x#top', `replaceState tira só ${PARAM} ("${r.replaced[0]}")`)
  ok(r.fetches[0]?.input === '/api/images' && r.fetches[0]?.init?.cache === 'no-store', '1ª rede = /api/images sem cache (RLS = só as linhas da pessoa)')
  ok(r.fetches.length === 2 && r.fetches[1].input === STORE + 'a.jpg', 'a imagem baixada é a URL que a própria linha devolveu')
  ok(r.reencoded.length === 0 && r.uploads.length === 1 && r.uploads[0].type === 'image/jpeg', 'jpeg pequeno sobe sem regravar')
  const ready = r.events.find((e) => e.name === 'animate_handoff_loaded')
  ok(r.events.length === 1 && ready?.outcome === 'ready' && ready.image_id === ID && ready.transcoded === false && ready.bytes === 1000, 'evento animate_handoff_loaded{ready, image_id, transcoded, bytes}')
  ok(r.started === 1 && r.fails.length === 0, 'pronto: fase de upload ligada uma vez, sem erro na tela')

  r = await scenario({ href: `https://www.usekineo.com/animate?${PARAM}=${ID}&src=${encodeURIComponent('https://evil.example/x.png')}` })
  ok(r.fetches.every((f) => !String(f.input).includes('evil')), 'nenhuma URL da barra de endereço vira fetch')

  r = await scenario({ rows: [{ id: ID, url: STORE + 'a.jpg', upscaled_url: STORE + 'a-2x.png' }] })
  ok(r.fetches[1]?.input === STORE + 'a-2x.png' && r.events[0]?.upscaled === true, 'com upscale: usa upscaled_url')

  r = await scenario({ blob: new Blob([new Uint8Array(1000)], { type: 'image/webp' }) })
  ok(r.reencoded.length === 1 && r.uploads[0]?.type === 'image/jpeg' && r.events[0]?.transcoded === true && r.outcome === 'ready', 'webp: regravado em JPEG antes do upload')

  r = await scenario({ blob: new Blob([new Uint8Array(3 * MB)], { type: 'image/png' }) })
  ok(r.reencoded.length === 1 && r.outcome === 'ready', 'png grande (≥2MB): regravado')

  r = await scenario({ blob: new Blob([new Uint8Array(1000)], { type: 'image/webp' }), reencodeTo: null })
  ok(r.outcome === 'transcode_failed' && r.uploads.length === 0 && r.fails.length === 1, 'regravação falhou: não sobe webp que o upload recusaria')

  r = await scenario({ imagesStatus: 503 })
  ok(r.outcome === 'lookup_failed' && r.fetches.length === 1 && r.uploads.length === 0 && r.fails.length === 1, '/api/images 503: lookup_failed com erro na tela')

  r = await scenario({ rows: [{ id: OTHER, url: STORE + 'b.jpg', upscaled_url: null }] })
  ok(r.outcome === 'not_found' && r.fetches.length === 1 && r.uploads.length === 0, 'id fora das linhas da pessoa: not_found, nenhuma imagem baixada')

  r = await scenario({ blobStatus: 404 })
  ok(r.outcome === 'fetch_failed' && r.uploads.length === 0 && r.fails.length === 1, 'storage 404: fetch_failed')

  r = await scenario({ uploadResult: { ok: false, status: 422 } })
  ok(r.outcome === 'upload_refused' && r.events[0]?.http_status === 422, 'upload/moderação recusou: upload_refused com o status')

  r = await scenario({ cancelled: true })
  ok(r.outcome === 'cancelled' && r.uploads.length === 0, 'saiu da página antes do upload: nenhuma cópia órfã')
}

// ─── 2. fiação no componente, amarrada à variável que decide ───────────────
console.log('2) AnimateClient: a imagem só entra quando não há envio guardado')
const component = animateSf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === 'AnimateClient')
const calls = []
if (component) walk(component, (n) => { if (ts.isCallExpression(n) && n.expression.getText(animateSf) === 'runImageHandoff') calls.push(n) })
ok(calls.length === 1, `uma chamada de runImageHandoff no componente (achei ${calls.length})`)
const call = calls[0]
let effectFn = call
while (effectFn && !(ts.isArrowFunction(effectFn) && ts.isCallExpression(effectFn.parent) && effectFn.parent.expression.getText(animateSf) === 'useEffect')) effectFn = effectFn.parent
ok(!!effectFn && squash(effectFn.parent.arguments[1]?.getText(animateSf) ?? '') === '[isLoggedIn,userId]', 'chamada mora no efeito de montagem [isLoggedIn, userId]')
const decls = {}
if (effectFn) walk(effectFn.body, (n) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) decls[n.name.text] = n })
ok(call && ts.isIdentifier(call.arguments[0]) && call.arguments[0].text === 'restoring', '1º argumento é a variável `restoring`')
ok(decls.restoring && squash(decls.restoring.initializer.getText(animateSf)) === '!!stored&&stored.userId===userId', '`restoring` = !!stored && stored.userId === userId')
ok(decls.stored && squash(decls.stored.initializer.getText(animateSf)) === 'readStoredSubmission(userId)', '`stored` = readStoredSubmission(userId) no mesmo efeito')
const effectText = effectFn ? effectFn.body.getText(animateSf) : ''
ok(effectText.indexOf('if (!isLoggedIn || !userId) return') > -1 && effectText.indexOf('if (!isLoggedIn || !userId) return') < effectText.indexOf('runImageHandoff('), 'só roda logado (depois do return de quem não está)')
ok(effectText.includes('} else if (stored) {') && effectText.indexOf('} else if (stored) {') < effectText.indexOf('runImageHandoff('), 'o ramo de restauração continua antes do handoff')
const depsObj = call?.arguments[1]
const prop = {}
if (depsObj && ts.isObjectLiteralExpression(depsObj)) for (const p of depsObj.properties) if (ts.isPropertyAssignment(p)) prop[p.name.getText(animateSf)] = squash(p.initializer.getText(animateSf))
ok(prop.upload === '(file)=>handleFile(file)', 'upload = o MESMO handleFile do botão (moderado)')
ok(prop.reencode === '(file)=>compressPhoto(file,true)', 'regravação = compressPhoto forçado')
ok((prop.replaceUrl ?? '').includes('window.history.replaceState('), 'replaceUrl = history.replaceState')
ok(prop.href === 'window.location.href' && prop.isCancelled === '()=>cancelledRef.current', 'lê a barra real e respeita a desmontagem')
ok((prop.track ?? '').includes('trackEvent(eventName,metadata)'), 'eventos pelo trackEvent (lib/analytics)')
const fnText = (name) => { let t = ''; if (component) walk(component, (n) => { if (ts.isFunctionDeclaration(n) && n.name?.text === name) t = n.getText(animateSf) }); return t }
const handleFileText = fnText('handleFile')
ok(handleFileText.includes("fetch('/api/avatar/upload', { method: 'POST', body: fd })") && handleFileText.includes("fd.append('purpose', 'animate')") && handleFileText.includes('await compressPhoto(raw)'), 'handleFile sobe por /api/avatar/upload purpose=animate')
ok((handleFileText.match(/return \{ ok: true/g) ?? []).length === 1 && handleFileText.indexOf('return { ok: true') > handleFileText.indexOf('setPhotoUrl(data.url)'), 'handleFile só diz ok depois de setPhotoUrl (a imagem vira a referência)')
let compress = null
if (component) walk(component, (n) => { if (ts.isFunctionDeclaration(n) && n.name?.text === 'compressPhoto') compress = n })
const firstIf = compress?.body?.statements[0]
ok(!!compress && compress.parameters.some((p) => p.name.getText(animateSf) === 'force') && firstIf && ts.isIfStatement(firstIf) && squash(firstIf.expression.getText(animateSf)).startsWith('!force&&'), 'compressPhoto: `force` pula o atalho de "<2MB volta igual"')
ok(!!compress && compress.getText(animateSf).includes("canvas.toBlob(resolve, 'image/jpeg', 0.9)") && compress.getText(animateSf).includes('const maxSide = 1600'), 'compressPhoto regrava em JPEG ≤1600px')
const handoffFn = pieces.find((p) => p.startsWith('async function runImageHandoff')) ?? ''
ok((handoffFn.match(/deps\.fetch\(/g) ?? []).length === 2 && handoffFn.includes("deps.fetch('/api/images'") && handoffFn.includes('deps.fetch(source,'), 'handoff só busca /api/images e a URL da linha')

// ─── 3. o link do /images ──────────────────────────────────────────────────
console.log('3) /images: o link carrega o id, nunca a URL')
const hrefs = []
walk(imagesSf, (n) => { if (ts.isJsxAttribute(n) && n.name.getText(imagesSf) === 'href' && n.initializer?.getText(imagesSf).includes('from_image=')) hrefs.push(n) })
ok(hrefs.length === 1, `um link com from_image (achei ${hrefs.length})`)
const hrefText = hrefs[0]?.initializer.getText(imagesSf) ?? ''
ok(/encodeURIComponent\(it\.id\)/.test(hrefText) && !/it\.(url|upscaled)/.test(hrefText), 'href montado de encodeURIComponent(it.id), nunca de it.url/it.upscaled')
ok((hrefText.match(/\?([a-z_]+)=\$\{/) ?? [])[1] === PARAM, 'o /images escreve o mesmo parâmetro que o Animate lê')
const opening = hrefs[0]?.parent?.parent
const onClickAttr = opening && ts.isJsxOpeningElement(opening) ? opening.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(imagesSf) === 'onClick') : null
ok(!!onClickAttr && squash(onClickAttr.getText(imagesSf)).includes("trackEvent('image_to_video_clicked',{image_id:it.id"), 'clique emite image_to_video_clicked com image_id')
let cond = opening
while (cond && !ts.isConditionalExpression(cond)) cond = cond.parent
ok(!!cond && cond.condition.getText(imagesSf) === 'it.id', 'o link com id só existe quando a imagem tem linha no banco (senão, /animate genérico)')
const label = opening?.parent && ts.isJsxElement(opening.parent) ? opening.parent.children.map((c) => c.getText(imagesSf)).join('') : ''
const labelText = (label.match(/<UiLabel>([^<]+)<\/UiLabel>/) ?? [])[1] ?? ''
ok(labelText === '🎬 Turn into video', `rótulo = "${labelText}"`)
ok(labelText && !/\d/.test(labelText) && !/film/i.test(labelText), 'rótulo não digita crédito nem promete filme')
ok(imagesSrc.includes("import { trackEvent } from '@/lib/analytics'"), 'ImagesClient importa trackEvent')
const dict = (file, name) => { const box = { exports: {} }; vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: box.exports }); return box.exports[name] }
const es = dict('lib/ui/interfaceLabels.ts', 'INTERFACE_ES')['🎬 Turn into video']
const hi = dict('lib/ui/interfaceHindi.ts', 'INTERFACE_HI')['🎬 Turn into video']
ok(typeof es === 'string' && es.trim() && !/\d/.test(es) && !/pel[ií]cula/i.test(es), `es: "${es}"`)
ok(typeof hi === 'string' && hi.trim() && !/\d/.test(hi), `hi: "${hi}"`)

// ─── 4. o que NÃO pode ter mudado ───────────────────────────────────────────
console.log('4) sem posse alargada, sem evento server-only, sem galeria vazia mentirosa')
const service = read('lib/animate/service.ts')
const ownedFn = service.slice(service.indexOf('export function assertOwnedAnimateImageUrl'), service.indexOf('function assertAnimateBillingReference'))
ok(ownedFn.includes('const ownedPath = `/storage/v1/object/public/avatars/${userId}/`') && !/renders|images\//.test(ownedFn), 'assertOwnedAnimateImageUrl segue só com avatars/<uid>/')
// Comentário que cita o parâmetro não é rota que o lê.
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const apiFiles = []
const scan = (dir) => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) { const p = `${dir}/${e.name}`; if (e.isDirectory()) scan(p); else if (/\.tsx?$/.test(e.name)) apiFiles.push(p) } }
scan('app/api')
ok(apiFiles.length > 50 && apiFiles.every((f) => !noComments(read(f)).includes('from_image')), `nenhuma rota de API conhece from_image (${apiFiles.length} arquivos varridos)`)
const events = read('app/api/events/route.ts')
const open = events.indexOf('[', events.indexOf('const SERVER_ONLY_EVENTS = new Set(['))
const literal = events.slice(open, events.indexOf('])', open) + 1).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
let serverOnly = null
try { serverOnly = new Set(Function(`"use strict"; return (${literal})`)()) } catch {}
ok(serverOnly && serverOnly.size > 10 && serverOnly.has('animate_job_submitted'), `SERVER_ONLY_EVENTS lido (${serverOnly?.size ?? 0} nomes)`)
ok(serverOnly && !serverOnly.has('image_to_video_clicked') && !serverOnly.has('animate_handoff_loaded'), 'os 2 eventos novos são de navegador (não estão na denylist)')

const routeJs = ts.transpileModule(read('app/api/images/route.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
async function callRoute({ user, data, error }) {
  const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: async () => ({ data, error }) }
  const fake = { auth: { getUser: async () => ({ data: { user } }) }, from: () => chain }
  const box = { exports: {} }
  const req = (id) => {
    if (id === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } }
    if (id === '@/lib/supabase/server') return { createClient: () => fake }
    throw new Error('import inesperado: ' + id)
  }
  vm.runInNewContext(routeJs, { exports: box.exports, require: req, console: { warn: () => {}, log: () => {}, error: () => {} } })
  return box.exports.GET()
}
let res = await callRoute({ user: { id: 'u' }, data: null, error: { message: 'JWT issued at future' } })
ok(res.status === 503, `/api/images com erro de banco → ${res.status} (não 200 vazio)`)
res = await callRoute({ user: { id: 'u' }, data: [{ id: ID }], error: null })
ok(res.status === 200 && res.body.images.length === 1, '/api/images normal → 200 com as linhas')
res = await callRoute({ user: null, data: null, error: null })
ok(res.status === 200 && Array.isArray(res.body.images) && res.body.images.length === 0, '/api/images deslogado → inalterado (200 vazio)')

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
