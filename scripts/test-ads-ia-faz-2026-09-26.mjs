// KINEO-ADS-IA-FAZ-2026-09-26 — guardião do modo "a IA faz o anúncio".
// Prova: (1) extração não inventa — número e contato só se estiverem no texto; (2) escolha de modelo só entre os que a
// mídia libera, com preferência pelos campos preenchidos; (3) a rota passa pelo interruptor, acesso, dono/rascunho,
// teto e moderação ANTES do modelo, e não grava o pedido; (4) a tela reaproveita roteiro/cartão/render de sempre e só
// aparece com o interruptor; (5) mutantes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const cache = {}
function load(rel, srcOverride) {
  const key = rel + (srcOverride ? ':m' : '')
  if (!srcOverride && cache[key]) return cache[key]
  const src = srcOverride ?? rd(rel)
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('module', 'exports', 'require', js)(m, m.exports, (n) => {
    const map = { './models': 'lib/ads/models.ts', './scriptPrompt': 'lib/ads/scriptPrompt.ts', './orderContract': 'lib/ads/orderContract.ts', './types': null }
    if (n in map) return map[n] ? load(map[n]) : {}
    throw new Error('import ' + n)
  })
  if (!srcOverride) cache[key] = m.exports
  return m.exports
}
const SRC = rd('lib/ads/autoBrief.ts')
const TEXT = 'Padaria Pão Dourado em Pinheiros. Pão francês a R$1 até sexta. Peça pelo WhatsApp +55 11 98765-4321.'
function provas(A) {
  const good = JSON.stringify({ business: 'Padaria Pão Dourado — pão francês', offer: 'Pão francês a R$1 até sexta', cta: 'whatsapp', contact: '+55 11 98765-4321', audience: '', tone: 'warm', extra: { deadline: 'até sexta', address: 'Pinheiros', rating: '4.9' }, model_hint: 'oferta_relampago' })
  const r = A.parseAutoBrief(good, TEXT, 'pt')
  const fake = A.parseAutoBrief(JSON.stringify({ business: 'Padaria', offer: '50% off', contact: '+55 11 90000-0000', cta: 'call' }), TEXT, 'pt')
  const have6 = { photos: 6, videos: 0, logo: true }
  const have3 = { photos: 3, videos: 0, logo: true }
  const noLogo = A.chooseAutoModel(r.brief, { photos: 6, videos: 0, logo: false }, null)
  const c3 = A.chooseAutoModel(r.brief, have3, 'oferta_relampago')
  const c6plain = A.chooseAutoModel({ ...r.brief, offer: '', extra: { hours: '7h às 19h', address: 'Pinheiros' } }, have6, null)
  const depo = A.chooseAutoModel({ ...r.brief, offer: '', extra: {} }, have6, 'depoimento_cartao')
  return [
    ['extração: nome, oferta e contato copiados', r.brief.business.startsWith('Padaria Pão Dourado') && r.brief.offer.includes('R$1') && r.brief.contact === '+55 11 98765-4321'],
    ['extração: número que o texto não diz é apagado (nota 4.9)', !('rating' in r.brief.extra) && r.dropped.includes('extra.rating')],
    ['extração: campos com texto real ficam', r.brief.extra.deadline === 'até sexta' && r.brief.extra.address === 'Pinheiros'],
    ['extração: oferta inventada (50%) é apagada', fake.brief.offer === '' && fake.dropped.includes('offer')],
    ['extração: contato que não está no texto é apagado e vira pergunta', fake.brief.contact === '' && fake.needs.includes('contact')],
    ['extração: JSON quebrado não lança e pede nome e contato', (() => { const x = A.parseAutoBrief('{oops', TEXT, 'pt'); return x.needs.includes('business') && x.needs.includes('contact') })()],
    ['modelo: sem logo nenhum formato abre e diz o que falta', noLogo.model === null && noLogo.missing.includes('logo')],
    // KINEO-ADS-IA-1FOTO-1VIDEO-2026-09-26 — fundador: "ajusta pra funcionar com 1 foto + 1 vídeo".
    ['1 foto + 1 vídeo + logo abre formato (Flash offer com oferta e prazo)', A.chooseAutoModel(r.brief, { photos: 1, videos: 1, logo: true }, 'oferta_relampago').model?.id === 'oferta_relampago'],
    ['1 foto + 1 vídeo nunca vira vitrine de fotos nem história do fundador', A.chooseAutoModel({ ...r.brief, offer: '', extra: { hours: '7h', address: 'Pinheiros' } }, { photos: 1, videos: 1, logo: true }, 'vitrine_fotos').eligible.every((id) => !['vitrine_fotos', 'historia_fundador'].includes(id))],
    ['só 1 item não abre nada e diz o que falta', (() => { const c = A.chooseAutoModel(r.brief, { photos: 1, videos: 0, logo: true }, null); return c.model === null && c.missing.some((x) => /photo\(s\) or video/.test(x)) })()],
    ['2 vídeos sem foto também abrem', A.chooseAutoModel(r.brief, { photos: 0, videos: 2, logo: true }, null).model !== null],
    ['modelo: 3 fotos nunca escolhe formato que pede 6', c3.model !== null && c3.model.inputs.minPhotos <= 3 && c3.eligible.every((id) => !['vitrine_fotos', 'historia_fundador'].includes(id))],
    ['modelo: oferta + prazo leva ao Flash offer', c3.model?.id === 'oferta_relampago'],
    ['modelo: sem oferta, com horário e endereço e 6 fotos → vitrine', c6plain.model?.id === 'vitrine_fotos'],
    ['modelo: palpite do GPT não força depoimento sem depoimento', depo.model?.id !== 'depoimento_cartao'],
    ['contagem de mídia: logo não conta como foto', (() => { const h = A.countAdsMedia([{ kind: 'image', isLogo: true }, { kind: 'image' }, { kind: 'video' }]); return h.photos === 1 && h.videos === 1 && h.logo })()],
    ['contato por telefone reconhecido sem o +55', A.contactFromText('(11) 98765-4321', TEXT)],
  ]
}
for (const [n, c] of provas(load('lib/ads/autoBrief.ts'))) checa(n, c)

const ROUTE = rd('app/api/ads/auto-brief/route.ts')
const pos = (s) => ROUTE.indexOf(s)
checa('rota: login antes de tudo', pos('auth.getUser()') > 0 && pos('auth.getUser()') < pos('loadAdsAccess('))
checa('rota: interruptor antes do acesso', pos('adsAutoVisible(reason)') > 0 && pos('adsAutoVisible(reason)') < pos('adsGate(reason)'))
checa('rota: pedido do dono e em rascunho', /\.eq\('user_id', user\.id\)/.test(ROUTE) && /order\.status !== 'draft'/.test(ROUTE))
checa('rota: teto diário e moderação ANTES do modelo', pos('ADS_AUTO_DAILY_CAP') < pos('openai.chat.completions.create') && pos('moderateContent(') < pos('openai.chat.completions.create'))
checa('rota: não grava o pedido (quem grava é o PATCH depois da confirmação)', !/from\('ads_orders'\)\.(update|insert|upsert)/.test(ROUTE))
checa('rota: grava o evento com order_id', /name: ADS_AUTO_SERVED_EVENT/.test(ROUTE) && /order_id: orderId/.test(ROUTE))
checa('interruptor nasce só-internas', /export const ADS_AUTO_MODE: 'off' \| 'internal' \| 'all' = 'internal'/.test(SRC))

const W = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const panel = W.slice(W.indexOf('function AdsAutoPanel('), W.indexOf('// ─── passo 1: brief'))
checa('tela: modo só com o interruptor', /const autoOn = boot\.kind === 'ready' && adsAutoVisible\(access\)/.test(W))
checa('tela: confirma nome, oferta e contato antes de gastar', /Check the facts, then we make it/.test(panel) && panel.indexOf("patchOrder(o.id, { brief, template: model.id })") > 0)
checa('tela: usa o roteiro, o cartão e o render de sempre', panel.includes("'/api/ads/script'") && panel.includes('drawEndCard(canvas') && panel.includes("'/api/ads/render'") && panel.includes('defaultStoryboard(model, m)'))
checa('tela: consentimento pedido e gravado', panel.includes('consent: true') && panel.includes('I own these photos and videos'))
checa('tela: sem crédito mostra quanto falta, não erro genérico', /r\.status === 402 \|\| r\.code === 'out_of_credits'/.test(panel))
// KINEO-ADS-IA-UPLOAD-2026-09-26 — o defeito do Cowork: lista de arquivos lida depois de um await, com o input já zerado.
checca_up(panel)
checa('tela: saída para o passo a passo', panel.includes('onSteps') && W.includes('onSteps={toSteps}'))
checa('eventos novos na lista fechada', ['ads_auto_started', 'ads_auto_brief_served', 'ads_auto_confirmed'].every((e) => rd('lib/ads/events.ts').includes(`'${e}'`)))

function checca_up(p) {
  checa('upload: o onChange copia os arquivos ANTES de zerar o input (logo e mídia)', p.split("const picked = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(picked, ").length - 1 === 2)
  checa('upload: addFiles recebe File[] (nunca a FileList viva)', p.includes('async function addFiles(files: File[], isLogo: boolean)') && !p.includes('addFiles(e.target.files'))
  checa('upload: lista vazia vira mensagem, não silêncio', p.includes('if (!files.length) return setError('))
  checa('rascunho antigo: a tela avisa e oferece começar do zero', /Continuing your unfinished ad from/.test(p) && /Start a new ad instead/.test(p))
}
function mutante(nome, de, para) {
  if (SRC.split(de).length !== 2) { checa(`mutante "${nome}" aplicou`, false); return }
  const m = SRC.replace(de, para); checa(`mutante "${nome}" aplicou`, m.includes(para))
  let cai = false; try { cai = provas(load('lib/ads/autoBrief.ts', m)).some(([, c]) => !c) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
mutante('aceita número inventado', 'if (numbersNotInText(value, text).length > 0) { dropped.push(name); return \'\' }', '')
mutante('aceita contato de fora do texto', "if (contact && !contactFromText(contact, text)) { dropped.push('contact'); contact = '' }", '')
mutante('ignora a mídia na escolha', 'const open = ADS_MODELS.filter((m) => autoMissingInputs(m, have).length === 0)', 'const open = ADS_MODELS.slice()')
mutante('vídeo volta a não contar', 'const items = have.photos + have.videos', 'const items = have.photos')
mutante('vitrine liberada com 2 itens', "const AUTO_KEEPS_MODEL_MIN: readonly AdsModelId[] = ['vitrine_fotos', 'historia_fundador']", 'const AUTO_KEEPS_MODEL_MIN: readonly AdsModelId[] = []')

console.log(`test-ads-ia-faz-2026-09-26: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
