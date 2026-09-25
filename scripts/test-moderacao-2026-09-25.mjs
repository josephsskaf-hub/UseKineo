// KINEO-MODERACAO-2026-09-25 — guardião da moderação de conteúdo em TODA porta de geração e de upload da casa.
// O caso: pedidos graves envolvendo menores foram gerados e guardados em /images por 2 contas (03/09 e 17/09; suspensas em
// 25/09). Só schnell/dev ligavam o checker do fal, e um pedido passou pelo dev mesmo assim. A revisão adversarial de 25/09
// (43 agentes) achou mais 6 rotas por fora da primeira rodada (edição e ampliação de imagem, cena de avatar com troca de
// rosto, gesto, avatar falante, clipe, personagem) e o upload que confiava no `kind` do cliente.
// Prova: (1) a régua pura com notas sintéticas e as formas de "menor" em 7 línguas; (2) a porta RODANDO contra um
// omni-moderation falso — barra, registra com a prova, falha FECHADA (inclusive resposta sem notas), separa 4xx; (3) cada
// rota chama a porta ANTES de cobrar/enviar/guardar e SAI pela variável que decide; (4) VARREDURA: toda rota de app/api que
// chama um gerador ou guarda imagem importa a porta, ou está na lista de exceções COM motivo — rota nova sem porta = vermelho;
// (5) tipo do upload pelos bytes; (6) varredura admin só leitura.
// Calibração real (25/09, fora deste arquivo): 0 de 14 textos e 0 de 36 fotos legítimas barrados (crianças em escola,
// praia, balé; fotos da padaria); 2 de 2 controles adultos explícitos barrados.
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
    module: mod, exports: mod.exports, console: { log() {}, warn() {}, error() {} }, Number, String, RegExp, Object, Array, Math, JSON, Error, Promise, Map, Set, Uint8Array,
    require: (s) => { if (s in mocks) return mocks[s]; throw new Error('import inesperado em ' + p + ': ' + s) },
  })
  return mod.exports
}

// ── 1. a régua ─────────────────────────────────────────────────────────────────────────────────────────
const P = roda('lib/safety/moderationPolicy.ts')
const dec = (cats, scores, text, opts) => P.decideModeration({ categories: cats, category_scores: scores }, text, opts)
ok(dec({ 'sexual/minors': true }, {}).block && dec({ 'sexual/minors': true }, {}).minors, '1a. sexual/minors marcado barra e conta como menor')
ok(dec({}, { 'sexual/minors': P.MINORS_SCORE }).block && !dec({}, { 'sexual/minors': P.MINORS_SCORE - 0.001 }).block, `1b. nota de sexual/minors barra a partir de ${P.MINORS_SCORE}`)
ok(P.MINORS_SCORE <= 0.05, '1c. o limiar de sexual/minors é baixo (≤ 0,05)')
ok(dec({ sexual: true }, {}).block && !dec({ sexual: true }, {}).minors && dec({}, { sexual: P.SEXUAL_SCORE }).block, '1d. sexual marcado (ou nota ≥ SEXUAL_SCORE) barra, sem contar como menor')
ok(P.IMAGE_SEXUAL_SCORE < P.SEXUAL_SCORE && dec({}, { sexual: P.IMAGE_SEXUAL_SCORE }, null, { hasImage: true }).block && !dec({}, { sexual: P.IMAGE_SEXUAL_SCORE }, null, {}).block,
  '1e. com imagem no pedido o limiar sexual é MAIS BAIXO (a foto não produz o sinal de menor)')
ok(dec({}, { sexual: P.MINOR_TERM_SEXUAL_SCORE }, 'a teen girl').minors && !dec({}, { sexual: P.MINOR_TERM_SEXUAL_SCORE - 0.01 }, 'a teen girl').block && !dec({}, { sexual: 0.3 }, 'a woman on the beach').block,
  '1f. termo de menor + nota sexual ≥ 0,1 barra como menor; abaixo passa; nota média sem termo passa')
ok(!dec({}, { violence: 0.99, 'violence/graphic': 0.99 }, 'Battle of Stalingrad').block, '1g. violência NÃO barra (a casa faz filme de guerra e história)')
const MENOR = ['kids playing', 'little girls', 'young boys', 'crianças no parque', 'garotinha', 'menor de idade', 'niña', 'niños jugando', 'colegialas', 'petite fille', 'ados', 'Mädchen', 'Kindern', 'Kleinkind', 'Schulmädchen', 'ragazzina', 'bachchi', 'a 15yo', 'a 12 year old', 'twelve years old', 'doze anos', '12 aninhos', 'aged 12', 'ki' + String.fromCharCode(0x200b) + 'ds']
const NAO = ['kidney beans', 'kindness', 'a 25 years old woman', 'minority report poster', 'Stalingrad 1942', 'mother and baby', 'garota de programa', 'kinderegg']
ok(MENOR.every((t) => P.mentionsMinor(t)), `1h. mentionsMinor reconhece ${MENOR.length} formas em 7 línguas (plural, acento, idade por extenso, caractere invisível) — falhou: ${MENOR.filter((t) => !P.mentionsMinor(t)).join(' / ')}`)
ok(NAO.every((t) => !P.mentionsMinor(t)), `1i. mentionsMinor não casa ${NAO.filter((t) => P.mentionsMinor(t)).join(' / ') || NAO.length + ' falsos amigos'}`)
ok(P.moderationRefusalStatus('blocked') === 422 && P.moderationRefusalStatus('unprocessable') === 422 && P.moderationRefusalStatus('unavailable') === 503, '1j. barrado e sem-como-conferir = 422 (tentar de novo não ajuda); fora do ar = 503')
ok(!/charged/.test(P.moderationRefusalMessage('blocked', 'upload')) && /Nothing was charged/.test(P.moderationRefusalMessage('blocked')) && !/minor|child|sexual/i.test(['blocked', 'unavailable', 'unprocessable'].map((r) => P.moderationRefusalMessage(r) + P.moderationRefusalMessage(r, 'upload')).join(' ')),
  '1k. frases: upload não fala em cobrança; nenhuma explica a regra')

// ── 2. a porta, rodando ────────────────────────────────────────────────────────────────────────────────
let chamadas = []
let resposta = () => ({ results: [{ flagged: false, categories: {}, category_scores: { sexual: 0, 'sexual/minors': 0 } }] })
const eventos = []
const G = roda('lib/safety/contentModeration.ts', {
  '@/lib/openai': { openai: { moderations: { create: async (body, opts) => { chamadas.push({ body, opts }); return resposta(body) } } } },
  '@/lib/serverEvents': { writeServerEvent: async (e) => { eventos.push(e); return true } },
  './moderationPolicy': P,
})
const U = '11111111-2222-4333-8444-555555555555'
const limpa = () => { chamadas = []; eventos.length = 0 }
limpa()
let v = await G.moderateContent({ surface: 'images', stage: 'input', userId: U, text: 'a castle at dawn' })
ok(v.ok === true && chamadas.length === 1 && chamadas[0].body.model === 'omni-moderation-latest' && eventos.length === 0, '2a. texto benigno: 1 chamada ao omni-moderation-latest, passa, nenhum evento')
ok(chamadas[0]?.opts?.timeout > 0 && chamadas[0].opts.timeout <= 10000 && chamadas[0].opts.maxRetries === 0, '2b. UMA tentativa com teto de tempo (≤ 10 s, maxRetries 0): retry dobraria o pior caso e mataria a função depois do débito')
resposta = () => ({ results: [{ flagged: true, categories: { 'sexual/minors': true }, category_scores: { sexual: 0.4, 'sexual/minors': 0.9 } }] })
limpa()
v = await G.moderateContent({ surface: 'images', stage: 'output', userId: U, text: 'x'.repeat(900), imageUrls: ['https://a/1.png'], meta: { model: 'dev' } })
const ev = eventos[0]
ok(v.ok === false && v.reason === 'blocked' && v.decision.minors === true, '2c. sexual/minors → bloqueado, marcado como menor')
ok(eventos.length === 1 && ev.name === 'content_moderation_blocked' && ev.userId === U && ev.metadata.surface === 'images' && ev.metadata.stage === 'output' && ev.metadata.minors === true && ev.metadata.model === 'dev' && ev.metadata.text.length === 500 && JSON.stringify(ev.metadata.evidence) === '["https://a/1.png"]',
  '2d. bloqueio grava content_moderation_blocked com conta, superfície, etapa, menor, meta, texto truncado e a PROVA (URL do arquivo)')
resposta = () => { throw new Error('upstream 500') }
limpa()
v = await G.moderateContent({ surface: 'footage', stage: 'upload', userId: U, imageUrls: ['https://a/1.png'] })
ok(v.ok === false && v.reason === 'unavailable' && eventos.length === 1 && eventos[0].name === 'content_moderation_unavailable', '2e. FALHA FECHADA: fora do ar → unavailable, e a falha vira evento (para a que se repete ser medida)')
resposta = () => ({ results: [{ flagged: false, categories: {}, category_scores: {} }] })
limpa()
v = await G.moderateContent({ surface: 'images', stage: 'input', userId: U, text: 'x' })
ok(v.ok === false && v.reason === 'unavailable', '2f. resposta SEM as notas de sexual e sexual/minors = fora do ar, nunca "limpo"')
resposta = () => { const e = new Error('image too large'); e.status = 400; throw e }
limpa()
v = await G.moderateContent({ surface: 'footage', stage: 'upload', userId: U, imageUrls: ['https://a/big.png'] })
ok(v.ok === false && v.reason === 'unprocessable', '2g. 4xx do endpoint (imagem grande, formato) = unprocessable, com frase própria (não "tente em um minuto")')
resposta = () => { const e = new Error('rate'); e.status = 429; throw e }
limpa()
v = await G.moderateContent({ surface: 'images', stage: 'input', userId: U, text: 'x' })
ok(v.ok === false && v.reason === 'unavailable', '2h. 429 (limite da OpenAI) é temporário: unavailable, não unprocessable')
resposta = () => ({ results: [{ flagged: false, categories: {}, category_scores: { sexual: 0, 'sexual/minors': 0 } }] })
limpa()
await G.moderateContent({ surface: 'animate', stage: 'input', userId: U, text: 'move slowly', imageUrls: ['https://a/1.png', 'https://a/2.png'] })
const partes = chamadas.map((c) => c.body.input.map((p) => p.type).join('+'))
ok(chamadas.length === 2 && partes[0] === 'text+image_url' && partes[1] === 'image_url', `2i. texto vai junto da 1ª imagem e cada imagem extra noutra chamada (${partes.join(' | ')})`)
limpa()
v = await G.moderateContent({ surface: 'images', stage: 'input', userId: U, text: '   ' })
ok(v.ok === true && chamadas.length === 0, '2j. nada para conferir → nenhuma chamada')

// ── 3. cada porta: antes do que custa, envia ou guarda — e sai pela própria variável ───────────────────
const PORTAS = [
  { f: 'app/api/images/generate/route.ts', s: 'images', st: 'input', antes: ['debitVideoCredits(', 'fal.subscribe('] },
  { f: 'app/api/images/generate/route.ts', s: 'images', st: 'output', antes: ['persistImage('], estorno: true },
  { f: 'app/api/images/edit/route.ts', s: 'images_edit', st: 'input', antes: ['debitVideoCredits(', 'fal.subscribe('] },
  { f: 'app/api/images/edit/route.ts', s: 'images_edit', st: 'output', antes: ['persistImage('], estorno: true },
  { f: 'app/api/images/upscale/route.ts', s: 'images_upscale', st: 'input', antes: ['debitVideoCredits(', 'fal.subscribe('] },
  { f: 'app/api/images/upscale/route.ts', s: 'images_upscale', st: 'output', antes: ['persistUpscale('], estorno: true },
  { f: 'app/api/avatar/scene/route.ts', s: 'avatar_scene', st: 'input', antes: ['debitVideoCredits(', 'generateSceneImage('] },
  { f: 'app/api/avatar/scene/route.ts', s: 'avatar_scene', st: 'output', antes: ['uploadAvatarPhoto('], estorno: true },
  { f: 'app/api/gesture-clip/route.ts', s: 'gesture', st: 'input', antes: ['submitAnimateJob(', 'debitVideoCredits('] },
  { f: 'app/api/generate-clip/route.ts', s: 'clip', st: 'input', antes: ['debitVideoCredits(', 'submitFalQueueOnce('] },
  { f: 'app/api/generate-avatar/route.ts', s: 'avatar', st: 'input', antes: ['debitVideoCredits('] },
  { f: 'app/api/characters/route.ts', s: 'character', st: 'upload', antes: ['extractCharacterTraits(', 'saveCharacter('] },
  { f: 'app/api/footage/route.ts', s: 'footage', st: 'upload', antes: ['.insert({ user_id: user.id, url, kind'] },
  { f: 'lib/animate/service.ts', s: 'animate', st: 'input', antes: ['confirmAnimateDebit(', 'reserveAnimateCredits(', 'submitAnimateJob('], corpo: 'export async function startAnimateJob(' },
  { f: 'app/api/ads/script/route.ts', s: 'ads_brief', st: 'input', antes: ['openai.chat.completions.create('] },
  { f: 'app/api/ads/render/route.ts', s: 'ads_render', st: 'input', antes: ["update({ status: 'rendering'", 'openai.audio.speech.create('] },
]
for (const p of PORTAS) {
  const src = rd(p.f)
  const ini = p.corpo ? src.indexOf(p.corpo) : Math.max(0, src.search(/export async function (POST|GET)\(/))
  const corpo = src.slice(ini)
  const m = new RegExp(`const (\\w+) = await moderateContent\\(\\{\\s*surface: '${p.s}',\\s*stage: '${p.st}'`).exec(corpo)
  const iG = m ? m.index : -1
  const saida = m ? new RegExp(`if \\(!${m[1]}\\.ok\\) (?:\\{[\\s\\S]{0,420}?\\b(?:return|throw)\\b|return\\b)`).exec(corpo.slice(iG)) : null
  const tardias = p.antes.filter((a) => { const i = corpo.indexOf(a); return i < 0 || i < iG })
  ok(iG >= 0 && tardias.length === 0 && saida !== null, `3. ${p.f} · ${p.s}/${p.st}: porta antes de ${p.antes.join(', ')} e saída pela variável${iG < 0 ? ' — PORTA AUSENTE' : ''}${tardias.length ? ' — antes da porta: ' + tardias.join(', ') : ''}${m && !saida ? ' — sem return/throw no ramo barrado' : ''}`)
  if (p.estorno && m) ok(/refundRenderCredits\(/.test(corpo.slice(iG, iG + (saida ? saida.index + saida[0].length + 200 : 0))), `3r. ${p.f} · saída barrada ESTORNA o débito`)
}
ok(rd('app/api/images/generate/route.ts').split('persistImage(').length - 1 === 1, '3s. /images: persistImage tem uma chamada só (depois da porta de saída)')
ok(['app/api/animate/route.ts', 'app/api/animate-image/route.ts'].every((p) => rd(p).includes('startAnimateJob({')), '3t. as duas rotas de Animate passam pelo startAnimateJob (ponto único)')
ok(/const moderationBlocked = error instanceof AnimateServiceError && error\.details\?\.moderation === 'blocked'\n\s*if \(importedImageUrl && !moderationBlocked\) \{\n\s*await deleteOwnedAvatarPhoto/.test(rd('app/api/animate/route.ts')), '3u. /api/animate NÃO apaga a foto barrada (é prova)')
const posse = [['app/api/avatar/scene/route.ts', /isOwnAvatarUrl\(imageUrl, user\.id/], ['app/api/gesture-clip/route.ts', /isOwnAvatarUrl\(imageUrl, user\.id/], ['app/api/generate-avatar/route.ts', /isOwnAvatarUrl\(avatarImageUrl, userId/], ['app/api/images/edit/route.ts', /isOwnStoredImage\(/], ['app/api/images/upscale/route.ts', /isOwnStoredImage\(/], ['lib/characters.ts', /isOwnStorageUrl\(/]]
ok(posse.every(([f, re]) => re.test(rd(f))), `3v. origem só da pasta do PRÓPRIO usuário em ${posse.length} rotas (antes: qualquer arquivo público de qualquer conta)`)

// ── 4. VARREDURA: gerador sem porta = vermelho ─────────────────────────────────────────────────────────
function arquivos(dir) { return readdirSync(join(RAIZ, dir)).flatMap((f) => { const p = `${dir}/${f}`; return statSync(join(RAIZ, p)).isDirectory() ? arquivos(p) : /route\.ts$/.test(f) ? [p] : [] }) }
const TRAVA = /^app\/api\/(generate-video-|analyze-idea|generate-script)/
const GERADOR = /fal\.subscribe\(|submitFalQueue\w*\(|submitAnimateJob\(|images\.generate\(|images\.edit\(|persistImage\(|persistUpscale\(|uploadAvatarPhoto\(|fal\.queue\.submit\(|generateSceneImage\(/
const EXCECOES = {
  'app/api/animate/route.ts': 'porta no startAnimateJob (lib/animate/service.ts); uploadAvatarPhoto só copia a foto que a porta confere antes do envio',
  'app/api/audio/generate/route.ts': 'texto para voz, sem imagem — próxima rodada',
  'app/api/compose/status/[renderId]/route.ts': 'só acompanha e guarda render já enviado',
  'app/api/enhance/route.ts': 'amplia vídeo já gerado (o servidor não extrai quadro)',
  'app/api/generate-thumbnail/route.ts': 'OpenAI Images já modera na origem; sem login no texto — dívida anotada ao fundador',
  'app/api/retry-hollywood-scene/route.ts': 'repete cena da esteira travada (8.2) — decisão do fundador',
}
const semPorta = arquivos('app/api').filter((p) => !TRAVA.test(p) && !p.startsWith('app/api/admin/') && GERADOR.test(rd(p)) && !/moderateContent\(/.test(rd(p)))
const novas = semPorta.filter((p) => !(p in EXCECOES))
ok(novas.length === 0, `4a. toda rota que gera ou guarda imagem/vídeo passa pela porta (ou é exceção com motivo) — sem porta: ${novas.join(', ') || 'nenhuma'}`)
const velhas = Object.keys(EXCECOES).filter((p) => !semPorta.includes(p))
ok(velhas.length === 0, `4b. a lista de exceções não guarda rota que já tem porta ou não existe mais: ${velhas.join(', ') || 'nenhuma'}`)
const walk = (dir) => readdirSync(join(RAIZ, dir)).flatMap((f) => { const p = `${dir}/${f}`; return statSync(join(RAIZ, p)).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [] })
const imp = ['app', 'lib', 'components'].flatMap(walk).filter((p) => /from '@\/lib\/safety\/contentModeration'/.test(rd(p)))
// 26/09: +1 importador de servidor, app/api/ads/auto-brief/route.ts (modo "a IA faz o anúncio").
ok(imp.length === 14 && imp.every((p) => !/^\s*['"]use client['"]/.test(rd(p))), `4c. a porta (chave da OpenAI) só é importada por código de servidor (${imp.length} importadores)`)

// ── 5. upload: o tipo pelos bytes ──────────────────────────────────────────────────────────────────────
const K = roda('lib/safety/mediaKind.ts')
const bytes = (...b) => new Uint8Array(b)
const asc = (s) => Array.from(s).map((c) => c.charCodeAt(0))
ok(K.sniffMediaKind(bytes(0xff, 0xd8, 0xff, 0xe0)) === 'image' && K.sniffMediaKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d)) === 'image', '5a. JPEG e PNG = imagem pelos bytes')
ok(K.sniffMediaKind(bytes(0, 0, 0, 0x20, ...asc('ftypisom'))) === 'video' && K.sniffMediaKind(bytes(0, 0, 0, 0x14, ...asc('ftypqt  '))) === 'video' && K.sniffMediaKind(bytes(0x1a, 0x45, 0xdf, 0xa3)) === 'video' && K.sniffMediaKind(bytes(0, 0, 0, 8, ...asc('wide'))) === 'video', '5b. MP4, MOV (novo e antigo) e WebM = vídeo')
ok(K.sniffMediaKind(bytes(...asc('ID3'), 4)) === 'audio' && K.sniffMediaKind(bytes(0, 0, 0, 0x20, ...asc('ftypM4A '))) === 'audio' && K.sniffMediaKind(bytes(...asc('RIFF'), 0, 0, 0, 0, ...asc('WAVE'))) === 'audio', '5c. MP3, M4A e WAV = áudio')
ok(K.sniffMediaKind(bytes(...asc('GIF89a'))) === null && K.sniffMediaKind(bytes(1, 2)) === null, '5d. qualquer outra coisa = null (a rota recusa)')
const foot = rd('app/api/footage/route.ts')
const conf = foot.slice(foot.indexOf("if (body.action === 'confirm') {"), foot.indexOf("Unknown action."))
ok(!/body\.kind/.test(conf) && /sniffMediaKind\(/.test(conf) && /kind = sniffed === 'image' \? 'image'/.test(conf), '5e. /footage confirm: o tipo sai dos bytes; o `kind` do cliente não decide mais nada (foto é foto)')
ok(/await quarantineObject\(admin, \{ bucket: USER_FOOTAGE_BUCKET, path, label: 'footage-bloqueado' \}\)/.test(conf) && !/\.remove\(/.test(conf), '5f. foto barrada vai para o bucket PRIVADO de quarentena (sai do ar), nunca é apagada')
// Quarentena (lib/safety/quarantine.ts): move entre buckets para o PRIVADO, com caminho que não se sobrepõe; nunca apaga.
const Q = roda('lib/safety/quarantine.ts')
let mov = null
const adminFalso = { storage: { from: (b) => ({ move: async (a, d, o) => { mov = { b, a, d, o }; return { error: null } } }) } }
const rq = await Q.quarantineObject(adminFalso, { bucket: 'user-footage', path: 'u1/clip-1.jpg', label: 'footage-bloqueado' })
ok(rq.ok && mov.b === 'user-footage' && mov.a === 'u1/clip-1.jpg' && mov.o?.destinationBucket === 'quarantine' && mov.d === 'footage-bloqueado/user-footage/u1/clip-1.jpg' && Q.QUARANTINE_BUCKET === 'quarantine', '5g. quarentena move para o bucket PRIVADO quarantine, em <etiqueta>/<bucket>/<caminho>')
ok(!/\.remove\(|\.delete\(/.test(rd('lib/safety/quarantine.ts') + rd('app/api/admin/quarantine-media/route.ts')), '5h. nada na quarentena apaga arquivo')
const qm = rd('app/api/admin/quarantine-media/route.ts')
ok(qm.indexOf('isAdminEmail(user.email)') > 0 && qm.indexOf('isAdminEmail(user.email)') < qm.indexOf('serviceClient()') && /const confirm = method === 'POST' && req\.nextUrl\.searchParams\.get\('confirm'\) === 'MOVE'\n\s*if \(!confirm\) return/.test(qm), '5i. rota de quarentena: só admin, e sem POST ?confirm=MOVE é ensaio')
ok((qm.match(/'images\/(52749de6-4394-4f1d-9e3f-16fb32c424a1|b9f49852-60b4-47c6-a7d3-ed50634aa1a7)\/[0-9a-f-]{36}\.(jpg|webp)'/g) || []).length === 9, '5j. a lista do incidente de 25/09 tem as 9 imagens das 2 contas suspensas')

// ── 6. varredura admin ─────────────────────────────────────────────────────────────────────────────────
const scan = rd('app/api/admin/moderation-scan/route.ts')
ok(scan.indexOf('isAdminEmail(user.email)') > 0 && scan.indexOf('isAdminEmail(user.email)') < scan.indexOf('serviceClient()'), '6a. varredura: admin conferido antes da chave de serviço')
ok(!/\.(insert|update|upsert|delete)\(/.test(scan) && !/text:/.test(scan.slice(scan.indexOf('flagged.push({'))), '6b. varredura: só leitura e nunca devolve o texto do pedido')

console.log(`test-moderacao-2026-09-25: ${passou} ok · ${falhas.length} falhas`)
for (const x of falhas) console.log('  FAIL ' + x)
process.exit(falhas.length ? 1 : 0)
