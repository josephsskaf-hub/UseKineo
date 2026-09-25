// KINEO-MODERACAO-2026-09-25 — guardião da moderação de /images, /animate, upload do /footage (e Studio Ads) e brief do /api/ads.
// O caso: pedidos graves envolvendo menores foram gerados e guardados em /images por 2 contas (03/09 e 17/09; suspensas em
// 25/09). Só schnell/dev ligavam o checker do fal, e um pedido passou pelo dev mesmo assim.
// Prova: (1) a régua pura (lib/safety/moderationPolicy.ts) com notas sintéticas; (2) a porta (lib/safety/contentModeration.ts)
// RODANDO contra um omni-moderation falso — barra, registra, falha fechada; (3) cada rota chama a porta ANTES de cobrar,
// enviar ou gravar, amarrado à variável que decide; (4) a varredura admin não devolve texto nem escreve.
// Calibração real (25/09, fora deste arquivo): 0 de 14 textos legítimos e 0 de 36 fotos legítimas (crianças em escola,
// praia, balé; as fotos da padaria) barrados; 2 de 2 controles adultos explícitos barrados.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }
const transpila = (p) => ts.transpileModule(rd(p), { compilerOptions: { module: 1, target: 9 } }).outputText
function roda(p, mocks = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(transpila(p), {
    module: mod, exports: mod.exports, console: { log() {}, warn() {}, error() {} }, Number, String, RegExp, Object, Array, Math, JSON, Error, Promise, Map, Set,
    require: (s) => { if (s in mocks) return mocks[s]; throw new Error('import inesperado em ' + p + ': ' + s) },
  })
  return mod.exports
}

// ── 1. a régua ─────────────────────────────────────────────────────────────────────────────────────────
const P = roda('lib/safety/moderationPolicy.ts')
const dec = (cats, scores, text) => P.decideModeration({ categories: cats, category_scores: scores }, text)
ok(dec({ 'sexual/minors': true }, {}).block && dec({ 'sexual/minors': true }, {}).minors, '1a. sexual/minors marcado barra e conta como menor')
ok(dec({}, { 'sexual/minors': P.MINORS_SCORE }).block && !dec({}, { 'sexual/minors': P.MINORS_SCORE - 0.001 }).block, `1b. nota de sexual/minors barra a partir de ${P.MINORS_SCORE} (e não abaixo, sem outro motivo)`)
ok(P.MINORS_SCORE <= 0.05, '1c. o limiar de sexual/minors é baixo (≤ 0,05)')
ok(dec({ sexual: true }, {}).block && !dec({ sexual: true }, {}).minors && dec({}, { sexual: P.SEXUAL_SCORE }).block, '1d. sexual marcado (ou nota ≥ SEXUAL_SCORE) barra, sem contar como menor')
ok(dec({}, { sexual: P.MINOR_TERM_SEXUAL_SCORE }, 'a teen girl').block && dec({}, { sexual: P.MINOR_TERM_SEXUAL_SCORE }, 'a teen girl').minors, '1e. termo de menor + nota sexual ≥ MINOR_TERM_SEXUAL_SCORE barra como menor')
ok(!dec({}, { sexual: P.MINOR_TERM_SEXUAL_SCORE - 0.01 }, 'a teen girl').block && !dec({}, { sexual: 0.3 }, 'a woman on the beach').block, '1f. termo de menor com nota baixa passa; nota média sem termo de menor passa')
ok(!dec({}, { violence: 0.99, 'violence/graphic': 0.99 }, 'Battle of Stalingrad').block, '1g. violência NÃO barra (a casa faz filme de guerra e história)')
const MENOR = ['kids playing', 'crianças no parque', 'niños jugando', 'Mädchen', 'a 15yo', 'a 12 year old', 'menina de 6 anos', 'toddlers', 'schoolgirls', 'teenagers']
const NAO = ['kidney beans', 'Nina Simone concert', 'a 25 years old woman', 'minority report poster', 'Stalingrad 1942']
ok(MENOR.every((t) => P.mentionsMinor(t)), `1h. mentionsMinor reconhece ${MENOR.length} formas (acentos, plurais, idade 1-17)`)
ok(NAO.every((t) => !P.mentionsMinor(t)), `1i. mentionsMinor não casa ${NAO.join(' / ')}`)
ok(!/\bNothing was charged\b/.test(P.MODERATION_UPLOAD_BLOCKED_MESSAGE) && /Nothing was charged/.test(P.MODERATION_BLOCKED_MESSAGE) && !/minor|child|sexual/i.test(P.MODERATION_BLOCKED_MESSAGE + P.MODERATION_UPLOAD_BLOCKED_MESSAGE), '1j. mensagens: upload não fala em cobrança; nenhuma explica a regra')

// ── 2. a porta, rodando ────────────────────────────────────────────────────────────────────────────────
let chamadas = []
let resposta = () => ({ results: [{ flagged: false, categories: {}, category_scores: {} }] })
const eventos = []
const G = roda('lib/safety/contentModeration.ts', {
  '@/lib/openai': { openai: { moderations: { create: async (body, opts) => { chamadas.push({ body, opts }); return resposta(body) } } } },
  '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
  './moderationPolicy': P,
})
const U = '11111111-2222-4333-8444-555555555555'
chamadas = []; eventos.length = 0
let v = await G.moderateContent({ surface: 'images', stage: 'input', userId: U, text: 'a castle at dawn' })
ok(v.ok === true && chamadas.length === 1 && chamadas[0].body.model === 'omni-moderation-latest' && eventos.length === 0, '2a. texto benigno: 1 chamada ao omni-moderation-latest, passa, nenhum evento')
ok(chamadas[0].opts?.timeout > 0 && chamadas[0].opts.timeout <= 15000, '2b. a chamada tem teto de tempo (≤ 15 s)')
resposta = () => ({ results: [{ flagged: true, categories: { 'sexual/minors': true }, category_scores: { 'sexual/minors': 0.9 } }] })
chamadas = []; eventos.length = 0
v = await G.moderateContent({ surface: 'images', stage: 'output', userId: U, text: 'x'.repeat(900), imageUrls: ['https://a/1.png'], meta: { model: 'dev' } })
ok(v.ok === false && v.reason === 'blocked' && v.decision.minors === true, '2c. sexual/minors → bloqueado, marcado como menor')
const ev = eventos[0]
ok(eventos.length === 1 && ev.name === 'content_moderation_blocked' && ev.userId === U && ev.metadata.surface === 'images' && ev.metadata.stage === 'output' && ev.metadata.minors === true && ev.metadata.model === 'dev' && ev.metadata.text.length === 500,
  '2d. bloqueio grava content_moderation_blocked (conta, superfície, etapa, menor, meta) com o texto truncado em 500')
resposta = () => { throw new Error('upstream 500') }
chamadas = []; eventos.length = 0
v = await G.moderateContent({ surface: 'footage', stage: 'upload', userId: U, imageUrls: ['https://a/1.png'] })
ok(v.ok === false && v.reason === 'unavailable' && eventos.length === 0, '2e. FALHA FECHADA: moderação fora do ar → unavailable (a rota não gera, não cobra, não grava)')
resposta = () => ({ results: [{ flagged: false, categories: {}, category_scores: {} }] })
chamadas = []
await G.moderateContent({ surface: 'animate', stage: 'input', userId: U, text: 'move slowly', imageUrls: ['https://a/1.png', 'https://a/2.png'] })
const partes = chamadas.map((c) => c.body.input.map((p) => p.type).join('+'))
ok(chamadas.length === 2 && partes[0] === 'text+image_url' && partes[1] === 'image_url', `2f. texto vai junto da 1ª imagem e cada imagem extra noutra chamada (${partes.join(' | ')})`)
chamadas = []
v = await G.moderateContent({ surface: 'images', stage: 'input', userId: U, text: '   ' })
ok(v.ok === true && chamadas.length === 0, '2g. nada para conferir → nenhuma chamada')

// ── 3. cada rota chama a porta ANTES do que custa ou grava ─────────────────────────────────────────────
const idx = (s, t) => s.indexOf(t)
const img = rd('app/api/images/generate/route.ts')
const iIn = idx(img, "const inputCheck = await moderateContent({ surface: 'images', stage: 'input'")
const iInIf = idx(img, 'if (!inputCheck.ok) {')
const iDebit = idx(img, 'const debit = await debitVideoCredits(')
const iUrl = idx(img, "if (!url) throw new Error('no image url in provider response')")
const iOut = idx(img, "const outputCheck = await moderateContent({ surface: 'images', stage: 'output'")
const iPersist = idx(img, 'const stored = await persistImage(')
ok(iIn > 0 && iInIf > iIn && iDebit > iInIf, '3a. /images: o texto é conferido e o 422/503 sai ANTES do débito — para TODOS os modelos (a porta não depende de modelKey)')
ok(iOut > iUrl && iPersist > iOut && /if \(!outputCheck\.ok\) \{\n\s*await refundRenderCredits\(renderId\)/.test(img), '3b. /images: a imagem pronta é conferida antes de ir ao bucket; barrada, estorna e não guarda')
ok(/imageUrls: \[url\]/.test(img.slice(iOut, iPersist)), '3c. /images: a porta de saída recebe a URL da imagem gerada')
const svc = rd('lib/animate/service.ts')
const fn = svc.slice(idx(svc, 'export async function startAnimateJob('))
const iMod = idx(fn, "const safety = await moderateContent({ surface: 'animate'")
ok(iMod > 0 && iMod < idx(fn, 'confirmAnimateDebit(') && iMod < idx(fn, 'reserveAnimateCredits(') && iMod < idx(fn, 'submitAnimateJob('), '3d. /animate: startAnimateJob confere texto e foto antes de confirmar/reservar débito e antes do fornecedor')
ok(/text: args\.prompt, imageUrls: \[imageUrl\]/.test(fn) && /new AnimateServiceError\(MODERATION_BLOCKED_MESSAGE, 422, \{ retrySafe: true/.test(fn) && /new AnimateServiceError\(MODERATION_UNAVAILABLE_MESSAGE, 503, \{ retrySafe: true/.test(fn), '3e. /animate: barrado = 422 retrySafe (a rota estorna e fecha); indisponível = 503 retrySafe')
const chamadoresAnim = ['app/api/animate/route.ts', 'app/api/animate-image/route.ts'].filter((p) => rd(p).includes('startAnimateJob({'))
ok(chamadoresAnim.length === 2, '3f. as duas rotas de Animate passam pelo startAnimateJob (ponto único)')
const foot = rd('app/api/footage/route.ts')
const conf = foot.slice(idx(foot, "if (body.action === 'confirm') {"))
const iFootMod = idx(conf, "moderateContent({ surface: 'footage', stage: 'upload'")
ok(iFootMod > 0 && iFootMod < idx(conf, '.insert({ user_id: user.id, url, kind, size_bytes: sizeBytes })') && /if \(kind === 'image'\) \{\n\s*const safety = await moderateContent/.test(conf), '3g. /footage: foto conferida ANTES de virar linha de user_footage (o Studio Ads só usa linhas)')
const ads = rd('app/api/ads/script/route.ts')
const iAdsMod = idx(ads, "moderateContent({ surface: 'ads_brief'")
ok(iAdsMod > 0 && iAdsMod < idx(ads, 'openai.chat.completions.create(') && /Object\.values\(b\.extra \?\? \{\}\)/.test(ads), '3h. /api/ads/script: o brief (inclusive os campos extras) é conferido antes do modelo')

// Cada porta decide pela própria variável e SAI (return/throw) no ramo barrado — um "if (false)" no lugar fica vermelho.
ok(/if \(!inputCheck\.ok\) \{\n\s*return inputCheck\.reason === 'blocked'/.test(img) && /if \(!outputCheck\.ok\) \{\n\s*await refundRenderCredits\(renderId\)\.catch\(\(\) => \{\}\)\n\s*return outputCheck\.reason === 'blocked'/.test(img), '3i. /images: as duas portas saem pela própria variável (inputCheck/outputCheck)')
ok(/if \(!safety\.ok\) \{\n\s*throw safety\.reason === 'blocked'/.test(fn), '3j. /animate: a porta lança pela variável safety')
ok(/if \(!safety\.ok\) \{\n\s*return safety\.reason === 'blocked'/.test(conf.slice(iFootMod)), '3k. /footage: a porta devolve pela variável safety antes do insert')
ok(/if \(!safety\.ok\) \{\n\s*return safety\.reason === 'blocked'/.test(ads.slice(iAdsMod)), '3l. /api/ads/script: a porta devolve pela variável safety antes do modelo')

// ── 4. varredura admin e fronteira servidor ────────────────────────────────────────────────────────────
const scan = rd('app/api/admin/moderation-scan/route.ts')
ok(idx(scan, 'isAdminEmail(user.email)') > 0 && idx(scan, 'isAdminEmail(user.email)') < idx(scan, 'serviceClient()'), '4a. varredura: admin conferido antes da chave de serviço')
ok(!/\.(insert|update|upsert|delete)\(/.test(scan) && !/prompt: row\.prompt|prompt,\n/.test(scan) && !/text:/.test(scan.slice(idx(scan, 'flagged.push({'))), '4b. varredura: só leitura e nunca devolve o texto do pedido')
function arquivos(dir) { return readdirSync(join(RAIZ, dir)).flatMap((f) => { const p = `${dir}/${f}`; return statSync(join(RAIZ, p)).isDirectory() ? (f === 'node_modules' ? [] : arquivos(p)) : /\.(tsx?)$/.test(f) ? [p] : [] }) }
const importadores = ['app', 'lib', 'components'].flatMap(arquivos).filter((p) => /from '@\/lib\/safety\/contentModeration'|from '\.\/contentModeration'/.test(rd(p)))
const clientes = importadores.filter((p) => /^\s*['"]use client['"]/.test(rd(p)))
ok(importadores.length === 4 && clientes.length === 0, `4c. a porta (usa a chave da OpenAI) só é importada por código de servidor (${importadores.length} importadores, ${clientes.length} de cliente)`)

console.log(`test-moderacao-2026-09-25: ${passou} ok · ${falhas.length} falhas`)
for (const x of falhas) console.log('  FAIL ' + x)
process.exit(falhas.length ? 1 : 0)
