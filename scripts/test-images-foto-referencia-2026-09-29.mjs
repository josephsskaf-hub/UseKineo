// KINEO-IMAGENS-FOTO-REFERENCIA-2026-09-29 — guardião da foto de referência no Nano Banana Pro (/images).
//
// Pedido do fundador (29/09): subir a foto de um amigo + "meu amigo lutando na guerra de Troia como Aquiles" e a imagem
// sair com o rosto dele. O que este guardião prova EXECUTANDO as rotas de verdade (transpiladas, com fornecedor, banco,
// crédito e moderação falsos — sem rede, sem crédito real, sem fal):
//   A. /api/images/generate: endpoint /edit SÓ com referência; sem referência, o endpoint de hoje; referência só da pasta
//      da própria conta (nunca URL, nunca outra conta); consentimento exigido PELO SERVIDOR; mesmo custo (5 cr) com e sem
//      foto; estorno em falha do fornecedor e em saída barrada; moderação (com as fotos) antes do débito; evento sem dado
//      pessoal.
//   B. /api/images/reference: consentimento no servidor; tipo pelos bytes; moderação ANTES de guardar; barrada = nada no
//      bucket público (só quarentena) e nenhum caminho devolvido.
//   C. a tela: bloco só no Nano Banana Pro, caixa de autorização, upload para a rota certa, 16 línguas.
//   D. mutantes (dono, consentimento, custo, moderação do upload, estorno, endpoint) ficam vermelhos.
// Sem alias @/ executado: tudo é lido com readFileSync e transpilado aqui.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const nodeCrypto = require('node:crypto')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

function roda(src, req = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', 'process', js)(m, m.exports, (n) => { if (n in req) return req[n]; throw new Error('import inesperado ' + n) }, process)
  return m.exports
}

const U = '11111111-2222-4333-8444-555555555555'
const OUTRO = '99999999-8888-4777-8666-555555555555'
const refPath = (uid, n) => `images/${uid}/refs/${String(n).padStart(8, '0')}-aaaa-4bbb-8ccc-dddddddddddd.jpg`
const SRC = {
  lib: rd('lib/imageReference.ts'),
  gen: rd('app/api/images/generate/route.ts'),
  up: rd('app/api/images/reference/route.ts'),
  policy: rd('lib/safety/moderationPolicy.ts'),
}

// ── mundo falso ─────────────────────────────────────────────────────────────────────────────────────────────
function mundo(opts = {}) {
  const log = []
  const w = { log, debits: [], refunds: [], fal: [], mods: [], events: [], persisted: [], stored: [], quarantined: [], signed: [] }
  const NextResponse = { json: (body, init) => ({ body, status: init?.status ?? 200 }) }
  const supa = { auth: { getUser: async () => ({ data: { user: opts.anon ? null : { id: U } } }) } }
  w.req = (src = SRC) => ({
    'next/server': { NextResponse },
    '@/lib/supabase/server': { createClient: () => supa },
    '@fal-ai/client': { fal: { config() {}, subscribe: async (slug, { input }) => {
      log.push('fal'); w.fal.push({ slug, input })
      if (opts.falThrows) throw new Error('fal 500')
      return { data: { images: [{ url: 'https://v3.fal.media/files/out.png' }] } }
    } } },
    crypto: nodeCrypto,
    '@/lib/credits/debit': { debitVideoCredits: async (_s, a) => { log.push('debit'); w.debits.push(a); return opts.noCredits ? { data: null, error: 'x' } : { data: 100, error: null } } },
    '@/lib/credits/refund': { refundRenderCredits: async (id) => { log.push('refund'); w.refunds.push(id) } },
    '@/lib/imageStore': {
      persistImage: async (a) => { log.push('persist'); w.persisted.push(a); return { id: 'img-1', url: 'https://proj.supabase.co/storage/v1/object/public/renders/images/' + U + '/out.png' } },
      signReferencePhotos: async (paths, secs) => { log.push('sign'); w.signed.push({ paths, secs }); return opts.signFails ? null : paths.map((p) => `https://proj.supabase.co/storage/v1/object/sign/renders/${p}?token=t`) },
      storeReferencePhoto: async (a) => { log.push('store'); w.stored.push(a); return a.path },
      quarantineReferencePhoto: async (a) => { log.push('quarantine'); w.quarantined.push(a); return true },
    },
    '@/lib/imageReference': roda(src.lib),
    '@/lib/serverEvents': { writeServerEvent: async (e) => { w.events.push(e); return true } },
    '@/lib/safety/contentModeration': { moderateContent: async (a) => {
      log.push(`mod:${a.stage}`); w.mods.push(a)
      const v = opts.mod?.[a.stage]
      return v ? { ok: false, reason: v, ...(v === 'blocked' ? { decision: {} } : { error: 'x' }) } : { ok: true }
    } },
    '@/lib/safety/moderationPolicy': roda(src.policy),
    '@/lib/safety/quarantine': { quarantinePath: (label, b, p) => `${label}/${b}/${p}` },
  })
  return w
}

process.env.FAL_KEY = process.env.FAL_KEY || 'teste-sem-rede'
async function gerar(body, opts = {}, src = SRC) {
  const w = mundo(opts)
  const route = roda(src.gen, w.req(src))
  w.res = await route.POST({ json: async () => body })
  return w
}
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, 0, 0x48])
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0])
async function subir(fields, opts = {}, src = SRC) {
  const w = mundo(opts)
  const route = roda(src.up, w.req(src))
  const fd = new FormData()
  if (fields.rights !== undefined) fd.append('rights', fields.rights)
  if (fields.bytes) fd.append('file', new File([fields.bytes], 'foto.jpg', { type: 'image/jpeg' }))
  w.res = await route.POST({ formData: async () => fd })
  return w
}

// cenários reaproveitados pelos mutantes
const COM_REF = { prompt: 'meu amigo lutando na guerra de Troia como Aquiles', model: 'nanobanana', size: 'portrait_16_9', reference_paths: [refPath(U, 1), refPath(U, 2)], reference_consent: true }
const cenario = {
  async dono(src) { const w = await gerar({ ...COM_REF, reference_paths: [refPath(OUTRO, 1)] }, {}, src); return w.res.status === 400 && w.res.body.code === 'reference_owner' && w.debits.length === 0 && w.fal.length === 0 && w.signed.length === 0 },
  async consentimento(src) { const w = await gerar({ ...COM_REF, reference_consent: undefined }, {}, src); return w.res.status === 400 && w.res.body.code === 'reference_consent' && w.debits.length === 0 && w.fal.length === 0 && w.mods.length === 0 },
  async custo(src) { const a = await gerar(COM_REF, {}, src); const b = await gerar({ ...COM_REF, reference_paths: undefined }, {}, src); return a.debits.length === 1 && b.debits.length === 1 && a.debits[0].cost === 5 && b.debits[0].cost === 5 },
  async uploadModerado(src) { const w = await subir({ rights: 'true', bytes: JPEG }, { mod: { upload: 'blocked' } }, src); return w.res.status === 422 && w.stored.length === 0 && w.quarantined.length === 1 && !('path' in w.res.body) },
  async estorno(src) { const w = await gerar(COM_REF, { falThrows: true }, src); return w.res.status === 502 && w.refunds.length === 1 && w.refunds[0] === w.debits[0]?.renderId },
  async endpoint(src) { const a = await gerar(COM_REF, {}, src); const b = await gerar({ ...COM_REF, reference_paths: [] }, {}, src); return a.fal[0]?.slug === 'fal-ai/nano-banana-pro/edit' && b.fal[0]?.slug === 'fal-ai/nano-banana-pro' && !('image_urls' in (b.fal[0]?.input ?? {})) },
}

console.log('A) /api/images/generate')
{
  const w = await gerar({ prompt: 'a castle at dawn', model: 'nanobanana', size: 'square_hd' })
  checa('A1. sem referência, Nano Banana Pro segue no endpoint de hoje (sem image_urls), 5 cr', w.res.status === 200 && w.fal[0].slug === 'fal-ai/nano-banana-pro' && !('image_urls' in w.fal[0].input) && w.fal[0].input.aspect_ratio === '1:1' && w.debits[0].cost === 5 && w.signed.length === 0)
  checa('A1b. sem referência não grava images_reference_used', !w.events.some((e) => e.name === 'images_reference_used'))
}
{
  const w = await gerar({ prompt: 'a castle at dawn', model: 'dev', size: 'portrait_16_9' })
  checa('A2. outro motor sem referência: endpoint e custo de hoje (FLUX Dev, 2 cr)', w.fal[0].slug === 'fal-ai/flux/dev' && w.debits[0].cost === 2)
}
{
  const w = await gerar(COM_REF)
  const f = w.fal[0]
  checa('A3. com referência: fal-ai/nano-banana-pro/edit', f?.slug === 'fal-ai/nano-banana-pro/edit')
  checa('A3b. image_urls = URLs ASSINADAS do nosso storage para os caminhos da conta (nada vindo do navegador)', Array.isArray(f?.input.image_urls) && f.input.image_urls.length === 2 && f.input.image_urls.every((u, i) => u === `https://proj.supabase.co/storage/v1/object/sign/renders/${COM_REF.reference_paths[i]}?token=t`))
  checa('A3c. prompt da pessoa + instrução fixa de identidade em inglês', f?.input.prompt.startsWith(COM_REF.prompt) && f.input.prompt.endsWith('Keep the exact face and identity of the person in the reference photo(s).'))
  checa('A3d. formato escolhido vira aspect_ratio (9:16), 1 imagem, 1K', f?.input.aspect_ratio === '9:16' && f.input.num_images === 1 && f.input.resolution === '1K')
  checa('A3e. URL assinada de curta duração (≤ 15 min)', w.signed[0]?.secs > 0 && w.signed[0].secs <= 900)
  checa('A3f. mesmo custo do Nano Banana Pro de hoje: 5 cr', w.debits.length === 1 && w.debits[0].cost === 5)
  const iMod = w.log.indexOf('mod:input'); const iDeb = w.log.indexOf('debit'); const iFal = w.log.indexOf('fal')
  checa('A3g. moderação de entrada recebe o texto E as fotos, antes do débito e da fal', iMod >= 0 && iMod < iDeb && iDeb < iFal && JSON.stringify(w.mods[0].imageUrls) === JSON.stringify(f.input.image_urls) && w.mods[0].text === COM_REF.prompt)
  checa('A3h. saída moderada antes de guardar; resultado persistido como nanobanana (vai para My Images → Animate)', w.log.indexOf('mod:output') < w.log.indexOf('persist') && w.persisted[0].model === 'nanobanana' && w.res.body.id === 'img-1')
  const ev = w.events.find((e) => e.name === 'images_reference_used')
  checa('A3i. evento images_reference_used {count, model, outcome} — sem prompt, sem URL, sem caminho', ev && ev.metadata.count === 2 && ev.metadata.model === 'nanobanana' && ev.metadata.outcome === 'delivered' && JSON.stringify(Object.keys(ev.metadata).sort()) === '["count","model","outcome"]')
}
checa('A4. sem consentimento: 400 reference_consent ANTES de moderar, assinar, cobrar e chamar a fal', await cenario.consentimento(SRC))
{
  const w = await gerar({ ...COM_REF, reference_consent: 'true' })
  checa('A4b. consentimento é true de verdade (string "true" não vale)', w.res.status === 400 && w.res.body.code === 'reference_consent' && w.debits.length === 0)
}
checa('A5. caminho de OUTRA conta: 400 reference_owner, nada assinado nem cobrado', await cenario.dono(SRC))
for (const [nome, p] of [['URL externa', 'https://evil.example/x.jpg'], ['URL pública do nosso bucket', `https://proj.supabase.co/storage/v1/object/public/renders/${refPath(U, 1)}`], ['../', `images/${U}/refs/../${OUTRO}/refs/00000001-aaaa-4bbb-8ccc-dddddddddddd.jpg`], ['imagem gerada (fora de refs/)', `images/${U}/00000001-aaaa-4bbb-8ccc-dddddddddddd.png`], ['outro bucket', `${U}/face-1.jpg`]]) {
  const w = await gerar({ ...COM_REF, reference_paths: [p] })
  checa(`A5b. recusa ${nome}`, w.res.status === 400 && w.debits.length === 0 && w.fal.length === 0 && w.signed.length === 0)
}
{
  const w = await gerar({ ...COM_REF, model: 'dev' })
  checa('A6. referência em outro motor: 400 reference_model, sem cobrar', w.res.status === 400 && w.res.body.code === 'reference_model' && w.debits.length === 0)
  const w2 = await gerar({ ...COM_REF, reference_paths: [1, 2, 3, 4].map((n) => refPath(U, n)) })
  checa('A6b. mais de 3 fotos: 400', w2.res.status === 400 && w2.debits.length === 0)
  const w3 = await gerar({ ...COM_REF, reference_paths: [refPath(U, 1), refPath(U, 1)] })
  checa('A6c. foto repetida: 400', w3.res.status === 400 && w3.debits.length === 0)
  const w4 = await gerar(COM_REF, { signFails: true })
  checa('A6d. caminho que não assina (arquivo sumiu): 400, sem cobrar', w4.res.status === 400 && w4.res.body.code === 'reference_missing' && w4.debits.length === 0 && w4.fal.length === 0)
}
checa('A7. fornecedor falhou: estorna o MESMO renderId, 502', await cenario.estorno(SRC))
{
  const w = await gerar(COM_REF, { falThrows: true })
  checa('A7b. falha registrada no evento (outcome provider_failed)', w.events.some((e) => e.name === 'images_reference_used' && e.metadata.outcome === 'provider_failed'))
  const b = await gerar(COM_REF, { mod: { output: 'blocked' } })
  checa('A8. saída barrada: estorna, não guarda, 422', b.res.status === 422 && b.refunds.length === 1 && b.persisted.length === 0 && b.events.some((e) => e.name === 'images_reference_used' && e.metadata.outcome === 'moderation_blocked'))
  const c = await gerar(COM_REF, { mod: { input: 'blocked' } })
  checa('A9. entrada (texto+fotos) barrada: nada cobrado nem enviado', c.res.status === 422 && c.debits.length === 0 && c.fal.length === 0)
  const d = await gerar(COM_REF, { anon: true })
  checa('A10. sem login: 401', d.res.status === 401 && d.debits.length === 0)
}

console.log('B) /api/images/reference')
{
  const w = await subir({ bytes: JPEG })
  checa('B1. sem rights=true: 400, nada moderado nem guardado', w.res.status === 400 && w.res.body.code === 'reference_consent' && w.mods.length === 0 && w.stored.length === 0)
  const w1 = await subir({ rights: 'on', bytes: JPEG })
  checa('B1b. rights diferente de "true" também recusa', w1.res.status === 400 && w1.stored.length === 0)
  const ok2 = await subir({ rights: 'true', bytes: JPEG })
  const L = roda(SRC.lib)
  checa('B2. aprovada: moderação (images_reference/upload, data URL — nada público ainda) ANTES de guardar', ok2.res.status === 200 && ok2.log.indexOf('mod:upload') >= 0 && ok2.log.indexOf('mod:upload') < ok2.log.indexOf('store') && ok2.mods[0].surface === 'images_reference' && ok2.mods[0].imageUrls[0].startsWith('data:image/jpeg;base64,'))
  checa('B2b. guarda na pasta da PRÓPRIA conta e devolve só o caminho (que a rota de gerar aceita)', ok2.stored[0].path === ok2.res.body.path && L.isOwnReferencePath(ok2.res.body.path, U) && !L.isOwnReferencePath(ok2.res.body.path, OUTRO) && JSON.stringify(Object.keys(ok2.res.body)) === '["path"]')
  checa('B2c. evento images_reference_uploaded sem dado pessoal (mime, size_kb)', ok2.events.some((e) => e.name === 'images_reference_uploaded' && JSON.stringify(Object.keys(e.metadata).sort()) === '["mime","size_kb"]'))
  checa('B3. barrada: 422, NADA no bucket público, cópia só na quarentena, sem caminho na resposta', await cenario.uploadModerado(SRC))
  const u = await subir({ rights: 'true', bytes: JPEG }, { mod: { upload: 'unavailable' } })
  checa('B4. moderação fora do ar: 503, falha fechada (nada guardado)', u.res.status === 503 && u.stored.length === 0 && u.quarantined.length === 0)
  const g = await subir({ rights: 'true', bytes: GIF })
  checa('B5. tipo pelos bytes: GIF declarado como JPEG é recusado', g.res.status === 400 && g.mods.length === 0 && g.stored.length === 0)
  checa('B6. WEBP e PNG reconhecidos pelos bytes', L.sniffReferenceMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])) === 'image/webp' && L.sniffReferenceMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])) === 'image/png')
  checa('B7. teto de 10 MB no servidor', L.REFERENCE_MAX_BYTES === 10 * 1024 * 1024 && /file\.size > REFERENCE_MAX_BYTES/.test(SRC.up))
}

console.log('C) a tela e o resto')
{
  const ui = rd('app/(dashboard)/images/ImagesClient.tsx')
  checa('C1. bloco da foto só quando o motor é Nano Banana Pro; nos outros, aviso + atalho', /const REF_MODEL: ImgModelKey = 'nanobanana'/.test(ui) && ui.includes('{model === REF_MODEL ? (') && ui.includes('Reference photo · Available on Nano Banana Pro') && ui.includes('onClick={() => setModel(REF_MODEL)}'))
  checa('C2. caixa de autorização; sem ela não sobe foto nem gera com foto', ui.includes('I have permission from the person in the photo to use their image.') && ui.includes('disabled={!refConsent}') && ui.includes('const needsConsent = sendRefs && !refConsent') && ui.includes('!needsConsent'))
  checa('C3. upload vai para /api/images/reference com rights=true; geração manda caminhos + consentimento só com Nano Banana Pro', ui.includes("fetch('/api/images/reference', { method: 'POST', body: form })") && ui.includes("form.append('rights', 'true')") && ui.includes('const sendRefs = model === REF_MODEL && readyRefs.length > 0') && ui.includes('...(sendRefs ? { reference_paths: readyRefs.map((r) => r.path), reference_consent: refConsent } : {})'))
  checa('C4. até 3 fotos, JPG/PNG/WEBP, 10 MB, miniatura com X', ui.includes('const REF_MAX = 3') && ui.includes("const REF_TYPES = ['image/jpeg', 'image/png', 'image/webp']") && ui.includes('const REF_MAX_BYTES = 10 * 1024 * 1024') && ui.includes("aria-label={ui('Remove photo')}"))
  checa('C5. imagem pronta segue para o Animate pelo id (Turn into video)', ui.includes('href={`/animate?from_image=${encodeURIComponent(it.id)}`}'))
  const copy = JSON.parse(rd('lib/ui/refinementCopy.json'))
  const novas = ['Reference photo (optional)', 'The face and look of the person in the photo go into the image.', 'I have permission from the person in the photo to use their image.', 'Add photo', 'Up to 3 photos · JPG, PNG or WEBP · max 10 MB each', 'Check the box above to add a photo.', 'Reference photo · Available on Nano Banana Pro', 'Use Nano Banana Pro', 'Remove photo', 'Uploading photo…', 'Confirm permission for the photo first', 'Only JPG, PNG or WEBP photos.', 'Photo is too large — max 10 MB.']
  checa('C6. as frases novas estão na tela e nas 16 línguas', Object.keys(copy).length === 16 && novas.every((k) => ui.includes(k) && Object.values(copy).every((d) => typeof d[k] === 'string' && d[k].trim().length > 0)))
  checa('C7. português: "Tenho autorização da pessoa da foto para usar a imagem dela."', copy.pt['I have permission from the person in the photo to use their image.'] === 'Tenho autorização da pessoa da foto para usar a imagem dela.')
  const ev = rd('app/api/events/route.ts')
  const lista = ev.slice(ev.indexOf('const SERVER_ONLY_EVENTS = new Set(['), ev.indexOf('])', ev.indexOf('const SERVER_ONLY_EVENTS = new Set([')))
  checa('C8. os dois eventos novos são só-de-servidor', lista.includes("'images_reference_uploaded',") && lista.includes("'images_reference_used',"))
  const eng = rd('lib/imageModels.ts')
  checa('C9. preço público do Nano Banana Pro intacto (5 cr)', /key: 'nanobanana'[^\n]*credits: '5 cr'/.test(eng) && /nanobanana: \{\n\s*slug: 'fal-ai\/nano-banana-pro',\n\s*cost: 5,/.test(SRC.gen))
}

console.log('D) mutantes')
const mut = (campo, de, para) => { if (SRC[campo].split(de).length !== 2) throw new Error('âncora do mutante não achada: ' + de); return { ...SRC, [campo]: SRC[campo].replace(de, para) } }
const MUTANTES = [
  ['sem checagem de dono', 'dono', mut('lib', 'if (!raw.every((p) => isOwnReferencePath(p, userId))) {', 'if (false) {')],
  ['sem consentimento no servidor', 'consentimento', mut('lib', 'if (body.reference_consent !== true) {', 'if (false) {')],
  ['custo diferente com foto', 'custo', mut('gen', 'cost: model.cost })', 'cost: withReference ? model.cost + 1 : model.cost })')],
  ['custo do Nano Banana Pro mudado', 'custo', mut('gen', "slug: 'fal-ai/nano-banana-pro',\n    cost: 5,", "slug: 'fal-ai/nano-banana-pro',\n    cost: 6,")],
  ['upload sem moderação', 'uploadModerado', mut('up', 'if (!safety.ok) {', 'if (false) {')],
  ['falha sem estorno', 'estorno', mut('gen', "    console.error('[images] provider failed — refunding:', e instanceof Error ? e.message : String(e))\n    await refundRenderCredits(renderId).catch(() => {})", "    console.error('[images] provider failed — refunding:', e instanceof Error ? e.message : String(e))")],
  ['/edit sempre', 'endpoint', mut('gen', 'const falSlug = withReference ? NANO_BANANA_EDIT_SLUG : model.slug', 'const falSlug = modelKey === \'nanobanana\' ? NANO_BANANA_EDIT_SLUG : model.slug')],
]
for (const [nome, qual, src] of MUTANTES) {
  let passou
  try { passou = await cenario[qual](src) } catch { passou = false }
  checa(`D. mutante "${nome}" é pego`, passou === false)
}

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
