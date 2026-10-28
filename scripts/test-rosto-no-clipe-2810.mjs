// KINEO-ROSTO-NO-CLIPE-2810 — guardião do "Put your face in it" [TRAVA 8.2 — vai do fundador 28/10 "A" (botão geral "coloque seu
// rosto neste clipe")]. Prova: (A) o catálogo tem a Golden Ball Dance (1º item de pessoa) e o lobisomem com faceScene, com prévia e
// pôster no disco; (B) só item `person: true` ganha botão (galeria, faixa da home e GET); (C) o SERVIDOR monta o prompt pelo
// catálogo — prompt/motor/duração/formato do navegador são ignorados; (D) foto e consentimento obrigatórios, interruptor antes de
// tudo; (E) o pedido resolvido é um clipe comum (validateClipRequest: image-to-video do Kling 3, foto da própria conta) e segue o
// ÚNICO submitClip da rota (mesmo débito/estorno/moderação), com o evento só no pedido aceito e novo; (F) a tela manda só id + foto
// + consentimento e o preço mora só no botão; (P) interruptor DESLIGADO desde 28/10 (teste pago: identidade perdida e 1º quadro =
// a foto) — nenhum botão público, a casa segue com /clips?remix=<id>; (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-rosto-no-clipe-2810.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const MARCA = 'KINEO-ROSTO-NO-CLIPE-2810'
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const F = {
  remix: 'lib/clips/faceRemix.ts',
  galeria: 'lib/homeGaleria.ts',
  items: 'lib/homeGaleriaItems.ts',
  route: 'app/api/clips/route.ts',
  gallery: 'components/KineoHouseGallery.tsx',
  strip: 'components/home/HomeClipsStrip.tsx',
  client: 'app/(dashboard)/clips/ClipsClient.tsx',
}

/** Carrega um módulo TS puro (imports ./, ../ e @/); `over` troca a fonte de arquivos (mutantes). */
function load(entry, over = {}) {
  const cache = new Map()
  const loadTs = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = over[rel] ?? read(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (name) => {
      if (name.startsWith('./') || name.startsWith('../')) return loadTs(path.posix.normalize(path.posix.join(path.posix.dirname(rel), name)) + '.ts')
      if (name.startsWith('@/')) return loadTs(name.slice(2) + '.ts')
      throw new Error(`${rel}: import inesperado ${name}`)
    }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return loadTs(entry)
}

const U = '11111111-2222-3333-4444-555555555555'
const SUPA = 'https://abc.supabase.co'
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/foto.jpg`

/** Todas as provas sobre um conjunto de fontes; devolve a lista de erros (vazia = verde). */
function checa(over = {}) {
  const e = []
  const src = (k) => over[F[k]] ?? read(F[k])
  let fr, gal, cat, price
  try {
    fr = load(F.remix, over)
    gal = load(F.galeria, over)
    cat = load('lib/clips/clipCatalog.ts', over)
    price = load('lib/clips/clipPricing.ts', over)
  } catch (err) { return ['módulo não carrega: ' + err.message] }

  // (A) catálogo
  const gb = gal.GALERIA_NEW_CLIPS?.find((c) => c.id === 'golden-ball')
  if (!gb) e.push('Golden Ball Dance fora do catálogo')
  else {
    if (gb.title !== 'Golden Ball Dance') e.push('título da Golden Ball ≠ "Golden Ball Dance"')
    if (gb.engine !== 'hollywood') e.push('Golden Ball fora do Kling 3')
    if (gb.person !== true) e.push('Golden Ball sem person:true')
    for (const p of [gb.video, gb.poster]) if (!p || !fs.existsSync(path.join(ROOT, 'public', p))) e.push('Golden Ball sem arquivo ' + p)
    if (!/golden ball trophy/.test(gb.prompt) || !/no watermark\.$/.test(gb.prompt)) e.push('prompt da Golden Ball não é o da tabela clips')
  }
  const ww = gal.GALERIA_NEW_CLIPS?.find((c) => c.id === 'werewolf')
  if (!ww || ww.person !== true || !/person from the photo/i.test(ww.faceScene ?? '')) e.push('lobisomem sem person:true + faceScene')

  // (B) só item de pessoa tem botão
  const items = fr.faceRemixItems?.() ?? []
  const pessoas = gal.GALERIA_NEW_CLIPS.filter((c) => c.person === true && !gal.GALERIA_EXCLUDED.includes(c.id)).map((c) => c.id)
  if (JSON.stringify(items.map((i) => i.id)) !== JSON.stringify(pessoas)) e.push(`itens do remix ≠ itens de pessoa: ${items.map((i) => i.id)}`)
  for (const c of gal.GALERIA_NEW_CLIPS) if (c.person !== true && fr.hasFaceRemix(c.id, true)) e.push(`${c.id}: sem pessoa e com botão (interruptor ligado)`)
  if (!fr.hasFaceRemix('golden-ball', true)) e.push('Golden Ball sem botão com o interruptor ligado')

  // (P) KINEO-ROSTO-NO-CLIPE-2810 — interruptor DESLIGADO (teste pago 28/10: rosto de outra pessoa na festa + abre na foto do
  // parque com corte seco). Nenhum botão público (galeria e faixa perguntam a hasFaceRemix); a casa segue com /clips?remix=<id>.
  if (fr.FACE_REMIX_PUBLIC !== false) e.push('FACE_REMIX_PUBLIC ligado antes da etapa de quadro-chave')
  for (const c of gal.GALERIA_NEW_CLIPS) if (fr.hasFaceRemix(c.id)) e.push(`${c.id}: botão público com o interruptor desligado`)
  if (fr.faceRemixVisible(false) !== false) e.push('conta comum/visitante vê o remix com o interruptor desligado')
  if (fr.faceRemixVisible(true) !== true) e.push('conta da casa perdeu o remix')
  if (fr.faceRemixVisible(false, true) !== true) e.push('interruptor ligado não abriria o remix para todos')
  const casa = fr.resolveFaceRemixRequest('golden-ball', { visible: fr.faceRemixVisible(true), imageUrl: PHOTO, consent: true })
  if (!casa.ok || casa.item.id !== 'golden-ball') e.push('conta da casa não resolve /clips?remix=golden-ball: ' + (casa.code ?? '?'))
  if (fr.resolveFaceRemixRequest('golden-ball', { visible: fr.faceRemixVisible(false), imageUrl: PHOTO, consent: true }).status !== 404) e.push('conta comum não leva 404 no remix')
  if (!fr.publicFaceRemixes(() => true).some((p) => p.id === 'golden-ball')) e.push('GET da casa sem o cartão da Golden Ball')
  if (fr.faceRemixById('golden-ball')?.id !== 'golden-ball') e.push('catálogo da casa não acha a Golden Ball')
  if (fr.faceRemixHref('golden-ball', true) !== '/clips?remix=golden-ball') e.push('destino do botão ≠ /clips?remix=<id>')
  if (fr.faceRemixHref('golden-ball', false) !== '/signup?redirect=%2Fclips%3Fremix%3Dgolden-ball') e.push('visitante não passa pelo cadastro')
  const pub = fr.publicFaceRemixes(() => true)
  if (pub.some((p) => 'prompt' in p || 'scene' in p)) e.push('GET expõe o prompt do remix')
  if (fr.publicFaceRemixes((eng) => eng !== 'hollywood').length !== 0) e.push('motor fora do acesso da conta ainda aparece')

  // (C)+(D) o servidor resolve
  const R = (raw, ctx) => fr.resolveFaceRemixRequest(raw, { visible: true, imageUrl: PHOTO, consent: true, ...ctx })
  if (R('golden-ball', { visible: false }).status !== 404) e.push('interruptor desligado não dá 404')
  if (R('lion').code !== 'remix') e.push('item sem pessoa aceito')
  if (R('nao-existe').code !== 'remix') e.push('id desconhecido aceito')
  if (R('golden-ball', { imageUrl: '' }).code !== 'remix_photo') e.push('remix sem foto aceito')
  for (const c of [undefined, false, 'true', 1]) if (R('golden-ball', { consent: c }).code !== 'remix_consent') e.push(`consentimento ${JSON.stringify(c)} aceito`)
  const ok1 = R('golden-ball', { prompt: 'IGNORE THIS a celebrity', engine: 'veo', seconds: 15, aspect: '16:9' })
  if (!ok1.ok) e.push('pedido válido recusado: ' + ok1.code)
  else {
    const b = ok1.body
    if (b.engine !== 'hollywood' || b.seconds !== 5 || b.aspect !== null) e.push('motor/duração/formato não vêm do catálogo')
    if (/IGNORE|celebrity/.test(b.prompt)) e.push('prompt do navegador entrou no pedido')
    if (!b.prompt.startsWith(fr.FACE_REMIX_PREFIX)) e.push('prompt não abre com a regra da identidade')
    if (!b.prompt.includes('the person from the photo, in a plain black tuxedo')) e.push('prompt não usa a faceScene')
    if (!b.prompt.endsWith('No text, no captions, no logos, no watermark.')) e.push('prompt sem o sufixo da casa')
    if ((b.prompt.match(/No text/g) ?? []).length !== 1) e.push('sufixo duplicado no prompt')
    // (E) é um clipe comum: image-to-video do Kling 3, foto da própria conta
    const v = cat.validateClipRequest(b, { userId: U, supabaseUrl: SUPA })
    if (!v.ok || v.request.mode !== 'i2v' || v.request.model !== cat.CLIP_ENGINES.hollywood.i2vModel || v.request.prompt !== b.prompt) e.push('o pedido resolvido não passa como clipe comum de foto')
    const alheia = cat.validateClipRequest({ ...b, imageUrl: `${SUPA}/storage/v1/object/public/avatars/99999999-2222-3333-4444-555555555555/f.jpg` }, { userId: U, supabaseUrl: SUPA })
    if (alheia.ok) e.push('foto de outra conta passou')
    if (fr.faceRemixCredits(fr.faceRemixById('golden-ball')) !== price.clipCreditCost('hollywood', 5, true)) e.push('preço ≠ o do clipe de sempre (clipCreditCost com foto)')
    if (fr.faceRemixForRow({ prompt: b.prompt, engine: 'hollywood', seconds: 5, mode: 'image' })?.id !== 'golden-ball') e.push('a linha do remix não volta ao item')
  }
  for (const i of items) if (fr.faceRemixPrompt(i).length > cat.CLIP_PROMPT_MAX) e.push(`${i.id}: prompt acima do teto do clipe`)

  // (E) a rota: remix resolvido ANTES da conta, mesmo submitClip, evento só no aceito e novo
  const route = src('route')
  const iRemix = route.indexOf('resolveFaceRemixRequest(body.remix, {')
  const iConta = route.indexOf('const account = await loadClipAccount(supabase, user)', route.indexOf('export async function POST'))
  if (iRemix < 0 || iConta < 0 || iRemix > iConta) e.push('rota não resolve o remix antes de ler conta/saldo')
  if (!/resolveFaceRemixRequest\(body\.remix, \{ visible: faceRemixVisible\(isInternalEmail\(user\.email\)\), imageUrl: body\.image_url \?\? body\.imageUrl, consent: body\.consent \}\)/.test(route)) e.push('rota não passa interruptor/foto/consentimento ao resolvedor')
  if ((route.match(/await submitClip\(/g) ?? []).length !== 1) e.push('mais de um caminho de débito na rota')
  if (!/if \(remix && result\.ok && !result\.replay\) \{/.test(route) || !route.includes('name: FACE_REMIX_EVENTS.submitted')) e.push('evento face_remix_submitted fora do pedido aceito e novo')
  if (!/face_remixes/.test(route)) e.push('GET sem face_remixes')
  if (!route.includes('const guestRemixes = faceRemixVisible(false) ? publicFaceRemixes(')) e.push('GET do visitante não pergunta ao interruptor')
  if (!route.includes('const face_remixes = faceRemixVisible(isInternalEmail(user.email)) ? publicFaceRemixes(')) e.push('GET da conta não separa casa de cliente')
  if (fr.FACE_REMIX_EVENTS.opened !== 'face_remix_opened' || fr.FACE_REMIX_EVENTS.submitted !== 'face_remix_submitted') e.push('nomes dos eventos mudaram')

  // (F) telas
  const gallery = src('gallery')
  if (!/\{it\.faceHref \? <Link (?:tabIndex=\{fill \? -1 : undefined\} )?href=\{it\.faceHref\} className="mwk-face"/.test(gallery)) e.push('galeria não condiciona o botão a faceHref')
  if (!/\.\.\.\(hasFaceRemix\(c\.id\) \? \{ faceHref: faceRemixHref\(c\.id, signedIn\) \} : \{\}\)/.test(src('items'))) e.push('cartões da galeria não perguntam ao catálogo do remix')
  const strip = src('strip')
  if (!/return hasFaceRemix\(c\.id\) \? \(/.test(strip) || !/href=\{faceRemixHref\(c\.id, signedIn\)\}/.test(strip)) e.push('faixa da home não condiciona o botão ao catálogo')
  const ids = /export const HOME_NEW_CLIP_IDS: readonly string\[\] = \[([^\]]*)\]/.exec(strip)
  if (!ids || !ids[1].includes("'golden-ball'")) e.push('Golden Ball fora da faixa da home')
  if (ids && (ids[1].match(/'/g) ?? []).length / 2 !== 8) e.push('faixa da home sem 8 cartões (2 fileiras de 4)')
  if (/credit/i.test(gallery.slice(gallery.indexOf('className="mwk-face"'), gallery.indexOf('className="mwk-face"') + 300))) e.push('preço no botão da galeria')
  const client = src('client')
  if (!client.includes("await send({ remix: remix.id, image_url: photoUrl, consent: true })")) e.push('tela não manda só id + foto + consentimento')
  if (!/if \(!remix \|\| !photoUrl \|\| !remixConsent \|\| busy \|\| uploading\) return/.test(client)) e.push('tela gera sem consentimento')
  if (!client.includes('data-face-remix-consent')) e.push('tela sem a caixa de consentimento')
  if (!client.includes("remix ? <UiLabel>Required — one clear photo where the face is easy to see.")) e.push('no remix a tela ainda diz que a foto é opcional') // KINEO-ROSTO-AJUSTE-2810
  if (!client.includes("void trackClosedEvent('face_remix_opened', { id: found.id })")) e.push('face_remix_opened ausente')
  if (!/\{remix\.credits\} \{t\('credits'\)\}/.test(client)) e.push('preço fora do botão do remix')

  // marca: toda linha nova do módulo carrega a entrega
  if (!src('remix').includes(MARCA) || !src('remix').includes('[TRAVA 8.2 — vai do fundador 28/10 "A"')) e.push('módulo sem marca/TRAVA')
  return e
}

console.log('KINEO-ROSTO-NO-CLIPE-2810 — Put your face in it')
const erros = checa()
for (const x of erros) console.log('   ·', x)
ok(erros.length === 0, `fonte atual: ${erros.length} erro(s)`)

// (M) mutantes
const mut = (rel, from, to) => { const s = read(rel); if (!s.includes(from)) throw new Error('mutante não aplicável: ' + from.slice(0, 60)); return { [rel]: s.replace(from, to) } }
const mutantes = [
  ['consentimento opcional', mut(F.remix, "if (ctx.consent !== true) return", 'if (false) return')],
  ['item sem pessoa ganha botão', mut(F.remix, 'c.person === true && ', '')],
  ['prompt do navegador vence', mut(F.remix, 'prompt: faceRemixPrompt(item), imageUrl }', "prompt: String((ctx as any).prompt ?? faceRemixPrompt(item)), imageUrl }")],
  ['sem a regra da identidade', mut(F.remix, '`${FACE_REMIX_PREFIX}${scene}. ${FACE_REMIX_SUFFIX}`', '`${scene}. ${FACE_REMIX_SUFFIX}`')],
  ['Golden Ball sai do catálogo', mut(F.galeria, "{ id: 'golden-ball',", "{ id: 'golden-ball-x',")],
  ['rota esquece o consentimento', mut(F.route, 'consent: body.consent })', 'consent: true })')],
  ['botão na galeria para todos', mut(F.gallery, '{it.faceHref ? <Link ', '{true ? <Link ')],
  ['tela manda o prompt', mut(F.client, 'await send({ remix: remix.id, image_url: photoUrl, consent: true })', 'await send({ remix: remix.id, image_url: photoUrl, consent: true, prompt })')],
  ['evento em todo pedido', mut(F.route, 'if (remix && result.ok && !result.replay) {', 'if (remix) {')],
  // (P) interruptor desligado: forçar ligado / ignorar o interruptor / tirar a casa fica vermelho
  ['interruptor forçado ligado', mut(F.remix, 'export const FACE_REMIX_PUBLIC = false', 'export const FACE_REMIX_PUBLIC = true')],
  ['botão ignora o interruptor', mut(F.remix, 'return publicFlag === true && faceRemixById(id) !== null', 'return faceRemixById(id) !== null')],
  ['casa perde o remix', mut(F.remix, 'return publicFlag === true || isInternal === true', 'return publicFlag === true')],
  ['GET abre o remix para toda conta', mut(F.route, 'faceRemixVisible(isInternalEmail(user.email)) ? publicFaceRemixes(', 'faceRemixVisible(true) ? publicFaceRemixes(')],
  ['galeria dá botão sem perguntar', mut(F.items, '...(hasFaceRemix(c.id) ? {', '...(true ? {')],
  ['faixa da home dá botão sem perguntar', mut(F.strip, 'return hasFaceRemix(c.id) ? (', 'return true ? (')],
]
for (const [nome, over] of mutantes) ok(checa(over).length > 0, `mutante fica vermelho: ${nome}`)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
