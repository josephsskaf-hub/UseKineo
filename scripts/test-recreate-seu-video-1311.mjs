// KINEO-RECREATE-SEU-VIDEO-1311 [dono 13/11 ~19:55: "recreate pra hoje funcionando em qualquer video que eu quiser"] — guardião.
// Prova OFFLINE (sem rede, sem fal, sem banco), EXECUTANDO o código REAL transpilado de lib/recreate/seuVideo.ts:
//   (A) o leitor de MP4/MOV acha duração, quadros por segundo e tamanho da trilha de VÍDEO (moov no fim ou no começo, mdhd v0 e v1,
//       trilha de áudio antes da de vídeo);
//   (B) a régua antes de cobrar: 2 a 15 s, 24 a 60 fps, até 100 MB, só MP4/MOV; arquivo ilegível = recusa;
//   (C) duração gerada (4 a 15, arredondada), preço da tabela de HOJE (até 10 s = 40; 11 a 15 s = 60), custo fal (enviado + gerado);
//   (D) prompt pronto cita @Video1 e cada foto; o editado é recusado sem @Video1, sem uma foto, com foto que não existe, longo demais;
//   (E) só a pasta do próprio cliente; a entrada da fal é a dos 2 testes aprovados (reference, 480p, duration em texto, sem som);
//   (F) as rotas: interruptor da casa, relê o vídeo antes do submitClip, nenhum débito fora do submitClip, eventos só do servidor;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/recreate/seuVideo.ts'
const carrega = (mutar = null) => createOfflineLoader({ source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })(ARQ)

// ── MP4 sintético (ISO BMFF), só as caixas que o leitor usa ─────────────────────────────────────────────────────────────────────
const be = (n, w = 4) => { const b = Buffer.alloc(w); if (w === 8) b.writeBigUInt64BE(BigInt(n)); else b.writeUInt32BE(n >>> 0); return b }
const caixa = (t, ...partes) => { const corpo = Buffer.concat(partes); return Buffer.concat([be(8 + corpo.length), Buffer.from(t, 'latin1'), corpo]) }
const tkhd = (w, h) => caixa('tkhd', Buffer.alloc(4), Buffer.alloc(72), be(w * 65536), be(h * 65536)) // v0: 4 + 72 + largura + altura = 84
const mdhd = (escala, dur, v1 = false) => v1
  ? caixa('mdhd', Buffer.from([1, 0, 0, 0]), be(0, 8), be(0, 8), be(escala), be(dur, 8), Buffer.alloc(4))
  : caixa('mdhd', Buffer.from([0, 0, 0, 0]), be(0), be(0), be(escala), be(dur), Buffer.alloc(4))
const hdlr = (h) => caixa('hdlr', Buffer.alloc(4), Buffer.alloc(4), Buffer.from(h, 'latin1'), Buffer.alloc(12), Buffer.from([0]))
const stts = (pares) => caixa('stts', Buffer.alloc(4), be(pares.length), ...pares.flatMap(([n, d]) => [be(n), be(d)]))
const trak = ({ h, w = 0, alt = 0, escala, dur, amostras, v1 }) => caixa('trak', tkhd(w, alt), caixa('mdia', mdhd(escala, dur, v1), hdlr(h), caixa('minf', caixa('stbl', stts(amostras)))))
const moov = (...traks) => caixa('moov', caixa('mvhd', Buffer.alloc(100)), ...traks)
const ftyp = caixa('ftyp', Buffer.from('isom', 'latin1'), be(512), Buffer.from('isomiso2mp41', 'latin1'))
const mdat = (n) => caixa('mdat', Buffer.alloc(n))
const ler = (buf) => async (a, b) => new Uint8Array(buf.subarray(a, b + 1))
// 7,5 s a 30 fps, 720×1280; o áudio vem ANTES (o leitor tem de pular a trilha 'soun')
const AUDIO = trak({ h: 'soun', escala: 44100, dur: 44100 * 7.5, amostras: [[323, 1024]] })
const VIDEO = trak({ h: 'vide', w: 720, alt: 1280, escala: 15360, dur: 15360 * 7.5, amostras: [[200, 512], [25, 512]] })
const FIM = Buffer.concat([ftyp, mdat(5000), moov(AUDIO, VIDEO)])
const COMECO = Buffer.concat([ftyp, moov(VIDEO), mdat(5000)])
const V1_60 = Buffer.concat([ftyp, moov(trak({ h: 'vide', w: 1920, alt: 1080, escala: 600, dur: 600 * 3, amostras: [[180, 10]], v1: true })), mdat(100)])
const LENTO = Buffer.concat([ftyp, moov(trak({ h: 'vide', w: 720, alt: 1280, escala: 1000, dur: 5000, amostras: [[75, 66]] })), mdat(10)]) // 15 fps
const LIXO = Buffer.from('isto nao e um video de verdade, so texto para o leitor recusar sem lançar erro nenhum')
const URL_FOTO = (i) => `https://x.supabase.co/storage/v1/object/public/clips/u/${i}.jpg`

async function provas(m) {
  const erros = []
  const perto = (a, b, tol = 0.01) => Math.abs(a - b) <= tol
  // (A)
  const a = await m.lerMetaDoVideo(ler(FIM), FIM.length)
  if (!a || !perto(a.segundos, 7.5) || !perto(a.fps, 30) || a.largura !== 720 || a.altura !== 1280) erros.push('A moov no fim (com áudio antes): ' + JSON.stringify(a))
  const b = await m.lerMetaDoVideo(ler(COMECO), COMECO.length)
  if (!b || !perto(b.segundos, 7.5) || !perto(b.fps, 30)) erros.push('A moov no começo: ' + JSON.stringify(b))
  const c = await m.lerMetaDoVideo(ler(V1_60), V1_60.length)
  if (!c || !perto(c.segundos, 3) || !perto(c.fps, 60) || c.largura !== 1920) erros.push('A mdhd v1 a 60 fps: ' + JSON.stringify(c))
  if ((await m.lerMetaDoVideo(ler(LIXO), LIXO.length)) !== null) erros.push('A arquivo ilegível deveria dar null')
  if ((await m.lerMetaDoVideo(async () => { throw new Error('rede') }, 1000)) !== null) erros.push('A erro de leitura deveria dar null, sem lançar')
  // (B)
  const MB = 1024 * 1024
  if (!m.validarVideo(a, 20 * MB, 'video/mp4').ok) erros.push('B o vídeo bom foi recusado')
  if (!m.validarVideo(c, 20 * MB, 'video/quicktime').ok) erros.push('B o MOV a 60 fps foi recusado')
  const codigo = (meta, bytes, tipo) => { const r = m.validarVideo(meta, bytes, tipo); return r.ok ? 'ok' : r.code }
  if (codigo(a, 20 * MB, 'video/webm') !== 'format') erros.push('B WebM passou')
  if (codigo(null, 20 * MB, 'video/mp4') !== 'format') erros.push('B ilegível passou')
  if (codigo(a, 101 * MB, 'video/mp4') !== 'size') erros.push('B 101 MB passou')
  if (codigo({ ...a, segundos: 1.5 }, MB, 'video/mp4') !== 'duration') erros.push('B 1,5 s passou')
  if (codigo({ ...a, segundos: 16 }, MB, 'video/mp4') !== 'duration') erros.push('B 16 s passou')
  if (codigo(await m.lerMetaDoVideo(ler(LENTO), LENTO.length), MB, 'video/mp4') !== 'fps') erros.push('B 15 fps passou')
  if (codigo({ ...a, fps: 120 }, MB, 'video/mp4') !== 'fps') erros.push('B 120 fps passou')
  if (!/Nothing was charged/.test(m.validarVideo({ ...a, segundos: 20 }, MB, 'video/mp4').error ?? '')) erros.push('B a recusa não diz que nada foi cobrado')
  // (C)
  const g = (s) => m.segundosGerados(s)
  if (g(2.2) !== 4 || g(7.5) !== 8 || g(10.4) !== 10 || g(15.2) !== 15 || g(12.6) !== 13) erros.push(`C duração gerada: ${[g(2.2), g(7.5), g(10.4), g(15.2), g(12.6)]}`)
  const cr = (n) => m.creditosDoSeuVideo(n)
  if (cr(4) !== 40 || cr(8) !== 40 || cr(10) !== 40 || cr(11) !== 60 || cr(15) !== 60) erros.push(`C créditos: ${[cr(4), cr(8), cr(10), cr(11), cr(15)]}`)
  if (!perto(m.custoFalDoSeuVideo(7.5, 8), 15.5 * 0.1323, 0.0001)) erros.push('C custo fal não soma enviado + gerado: ' + m.custoFalDoSeuVideo(7.5, 8))
  if (m.proporcaoDoVideo(720, 1280) !== '9:16' || m.proporcaoDoVideo(1920, 1080) !== '16:9' || m.proporcaoDoVideo(1080, 1080) !== '1:1') erros.push('C proporção')
  // (D)
  const p2 = m.promptPadrao(2)
  if (!p2.includes('@Video1') || !p2.includes('@Image1') || !p2.includes('@Image2') || p2.includes('@Image3')) erros.push('D prompt pronto de 2 fotos: ' + p2)
  if (!/choreography/.test(p2) || !/No logos/.test(p2)) erros.push('D prompt pronto sem coreografia ou sem a proibição de marca')
  const pPos = m.promptPadrao(1, ['on the left <script>'])
  if (!pPos.includes('The person on the left script in @Video1') || pPos.includes('<')) erros.push('D posição não entrou limpa: ' + pPos)
  if (!m.validarPrompt(p2, 2).ok) erros.push('D o prompt pronto não passa na própria validação')
  if (m.validarPrompt(p2.replace(/@Image2/g, 'the photo'), 2).ok) erros.push('D aceitou sem citar a 2ª foto')
  if (m.validarPrompt(p2, 1).ok) erros.push('D aceitou @Image2 com 1 foto só')
  if (m.validarPrompt(p2.replace(/@Video1/g, 'the video'), 2).ok) erros.push('D aceitou sem @Video1')
  if (m.validarPrompt(p2 + ' x'.repeat(500), 2).ok) erros.push('D aceitou mais de 900 caracteres')
  if (m.validarPrompt('   ', 1).ok) erros.push('D aceitou vazio')
  // (E)
  const U = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', OUTRO = 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee', ID = '12345678-1234-4234-8234-123456789abc'
  if (m.caminhoDoCliente(`recreate-uploads/${U}/${ID}.mp4`, U) !== `recreate-uploads/${U}/${ID}.mp4`) erros.push('E o caminho do próprio cliente foi recusado')
  if (m.caminhoDoCliente(`recreate-uploads/${OUTRO}/${ID}.mp4`, U) !== null) erros.push('E aceitou a pasta de outro cliente')
  if (m.caminhoDoCliente(`recreate-uploads/${U}/../${OUTRO}/${ID}.mp4`, U) !== null) erros.push('E aceitou ../')
  if (m.caminhoDoCliente(`recreate-uploads/${U}/${ID}.webm`, U) !== null) erros.push('E aceitou .webm')
  if (m.caminhoDoCliente(`https://evil.example/${ID}.mp4`, U) !== null) erros.push('E aceitou URL de fora')
  const ent = m.entradaSeedance25({ prompt: p2, fotos: [URL_FOTO(1), URL_FOTO(2)], videoUrl: 'https://x/v.mp4', gerados: 8, proporcao: '9:16' })
  if (ent.task !== 'reference' || ent.resolution !== '480p' || ent.duration !== '8' || ent.generate_audio !== false || ent.video_urls?.[0] !== 'https://x/v.mp4' || ent.image_urls?.length !== 2) erros.push('E entrada da fal: ' + JSON.stringify(ent))
  if (m.SEEDANCE25_MODEL !== 'bytedance/seedance-2.5/reference-to-video') erros.push('E modelo errado')
  if (m.SEU_VIDEO_RELEASE !== 'internal') erros.push('E o interruptor não está em só-a-casa')
  // recusa do motor
  const FRASE = 'The engine did not accept this photo. Nothing was charged. Try another photo.' // a frase da CEO, 13/11
  if (m.recusaDoMotor('provider_rejected') !== FRASE || m.recusaDoMotor('provider_failed') !== FRASE) erros.push('E recusa do motor sem a frase da CEO')
  if (m.recusaDoMotor('credits') !== null || m.recusaDoMotor('swap_unchanged') !== null || m.recusaDoMotor('submit_ambiguous') !== null) erros.push('E recusa do motor pegou outro código')
  return erros
}

const base = await provas(carrega())
checa(`A–E todas as provas verdes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)

// (F) as rotas
const r = (f) => lf(fs.readFileSync(f, 'utf8'))
const gera = r('app/api/recreate/seu-video/route.ts'), confere = r('app/api/recreate/seu-video/check/route.ts'), envia = r('app/api/recreate/seu-video/upload/route.ts')
const srv = r('lib/recreate/seuVideoServer.ts'), status = r('app/api/recreate/status/route.ts'), eventos = r('app/api/events/route.ts')
checa('F as 3 rotas abrem só pela sessão do "seu vídeo" (interruptor da casa)', [gera, confere, envia].every((s) => s.includes('await seuVideoSession()') && s.includes("if (!user) return json({ error: 'Not found.' }, 404)")))
checa('F a sessão soma o interruptor próprio ao do Recreate', srv.includes('releaseVisible(s.user.email, SEU_VIDEO_RELEASE)'))
const iLe = gera.indexOf('await lerVideoDoCliente(admin, user.id, raw.video_path)'), iSub = gera.indexOf('await submitClip(')
checa('F o pedido relê o vídeo no servidor ANTES do submitClip', iLe > 0 && iSub > iLe)
checa('F nenhum débito fora do submitClip', ![gera, confere, envia, srv].some((s) => /debitVideoCredits|\.rpc\(|video_credits/.test(s)))
checa('F a conferência não chama motor nem cobra', !/submitClip|queue\.fal|fal\.run/.test(confere))
checa('F 15 s só com plano pago (402 antes de cobrar)', gera.includes("if (v.gerados > 10 && !isPayingPlan(account.plan)) return refuse('plan'") && gera.indexOf("refuse('plan'") < iSub)
checa('F fotos só da própria conta', gera.includes('ownedClipImageUrl(value, user.id, supabaseUrl)'))
checa('F o envio usa URL assinada no bucket público, na pasta do cliente', envia.includes('createSignedUploadUrl(path)') && envia.includes('${SEU_VIDEO_PASTA}/${user.id}/${randomUUID()}'))
checa('F status devolve a recusa do motor só no Seedance 2.5', status.includes('fresh.model === SEEDANCE25_MODEL ? recusaDoMotor(fresh.failure_reason)'))
// essencial da CEO (13/11): conta de fora = 404 · vídeo fora do limite não debita · recusa estorna · preço 40/60 (este último em C)
const acesso = createOfflineLoader()('lib/recreate/access.ts'), casa = createOfflineLoader()('lib/internalAccounts.ts').INTERNAL_EXACT_EMAILS
const relSeu = carrega().SEU_VIDEO_RELEASE
checa('ESSENCIAL conta de fora não vê (404) e a da casa vê', acesso.releaseVisible('cliente.qualquer@example.com', relSeu) === false && acesso.releaseVisible(casa[0], relSeu) === true)
const iFora = gera.indexOf('if (!v.ok) return refuse(v.code, v.error, 422)')
checa('ESSENCIAL vídeo fora do limite sai antes do submitClip (nada debitado)', iFora > iLe && iFora < iSub && gera.indexOf("if (v.creditos === null) return refuse('duration'") < iSub)
const fluxo = r('lib/clips/clipFlow.ts')
const iClose = fluxo.indexOf('const closeWithRefund = async (reason: string'), iRef = fluxo.indexOf('const refunded = await deps.refund(row.billing_reference)', iClose)
checa('ESSENCIAL recusa no envio estorna (provider_rejected → closeWithRefund → deps.refund)', iClose > 0 && iRef > iClose && iRef - iClose < 200 && fluxo.includes("return closeWithRefund(sent.ambiguous ? 'submit_ambiguous' : 'provider_rejected'"))
const iFail = fluxo.indexOf('const fail = async (reason: string'), iRef2 = fluxo.indexOf('const refunded = await deps.refund(row.billing_reference)', iFail)
checa('ESSENCIAL recusa no fim estorna (provider_failed → fail → deps.refund)', iFail > 0 && iRef2 > iFail && iRef2 - iFail < 400 && fluxo.includes("if (state.state === 'failed') return fail('provider_failed'"))
checa('F eventos só do servidor', eventos.includes("'recreate_seu_video_started'") && eventos.includes("'recreate_seu_video_refused'"))
checa('F a trava "não trocou" segue só no Recast', r('lib/recreate/swapCheck.ts').includes('if (row.model !== RECREATE_MODEL) return null'))

// (B) Entrega B: o som ORIGINAL volta pela montagem da casa (Creatomate da marca dos clipes), EXECUTANDO brandFreeClip com deps simuladas
const MARCA = 'lib/clips/freeClipWatermark.ts'
const carregaMarca = (mutar = null) => createOfflineLoader({ source: (rel, text) => (mutar && rel === MARCA ? mutar(text) : text) })(MARCA)
const SUPA = 'https://x.supabase.co', U = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', ID = '12345678-1234-4234-8234-123456789abc'
const ORIGINAL = `${SUPA}/storage/v1/object/public/renders/recreate-uploads/${U}/${ID}.mp4`
const MP4_REAL = fs.readFileSync('lib/recreate/assets/recreate-favorito.mp4')
async function provasB(m, mm) {
  const erros = []
  const fp = (url, model = m.SEEDANCE25_MODEL) => JSON.stringify(['pedido', model, m.entradaSeedance25({ prompt: 'p @Video1 @Image1', fotos: ['f'], videoUrl: url, gerados: 8, proporcao: '9:16' })])
  const linha = (over = {}) => ({ model: m.SEEDANCE25_MODEL, fingerprint: fp(ORIGINAL), user_id: U, seconds: 8, ...over })
  const som = m.somOriginalDaLinha(linha(), SUPA)
  if (!som || som.url !== ORIGINAL || som.seconds !== 8) erros.push('B o som original não foi achado: ' + JSON.stringify(som))
  if (m.somOriginalDaLinha(linha({ user_id: 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee' }), SUPA) !== null) erros.push('B pegou o vídeo de outro dono')
  if (m.somOriginalDaLinha(linha({ fingerprint: fp('https://evil.example/a.mp4') }), SUPA) !== null) erros.push('B pegou URL de fora do bucket')
  if (m.somOriginalDaLinha(linha({ model: 'minimax/h3-max/recast', fingerprint: fp(ORIGINAL, 'minimax/h3-max/recast') }), SUPA) !== null) erros.push('B mexeu no Recreate de catálogo')
  if (m.somOriginalDaLinha(linha(), SUPA, false) !== null) erros.push('B o interruptor desligado não desliga')
  if (m.somOriginalDaLinha(linha({ fingerprint: '{quebrado' }), SUPA) !== null) erros.push('B impressão quebrada não deu null')
  // a fonte do Creatomate
  const info = { width: 720, height: 1280, fps: 24, durationSeconds: 8.041 }
  const antes = mm.buildFreeClipWatermarkSource('https://c/clean.mp4', info)
  if (antes.elements.length !== 2 || antes.elements.some((e) => e.type === 'audio')) erros.push('B a marca sem som mudou')
  const soSom = mm.buildFreeClipWatermarkSource('https://c/clean.mp4', info, { text: false, audio: { url: ORIGINAL, seconds: 8 } })
  const a = soSom.elements.find((e) => e.type === 'audio')
  if (soSom.elements.some((e) => e.type === 'text') || !a || a.source !== ORIGINAL || a.duration !== 8.041 || a.time !== 0) erros.push('B montagem só do som errada: ' + JSON.stringify(soSom.elements))
  const comMarca = mm.buildFreeClipWatermarkSource('https://c/clean.mp4', info, { audio: { url: ORIGINAL, seconds: 8 } })
  if (!comMarca.elements.some((e) => e.type === 'text') || !comMarca.elements.some((e) => e.type === 'audio')) erros.push('B quem não paga perdeu a marca ou o som')
  if (!mm.parseBrandMarker(mm.brandMarker({ phase: 'rendering', reason: 'audio', startedAt: 1763000000000, renderId: 'render-12345678' }))) erros.push('B a trava não lê o motivo audio')
  if (mm.isBrandedClipUrl(`${SUPA}/storage/v1/object/public/clips/clips/${U}/${ID}${mm.AUDIO_CLIP_SUFFIX}`)) erros.push('B o arquivo com som seria trocado pelo limpo (mudo) de quem paga')
  // a máquina de estados de verdade: 1ª passada pede o render; 2ª copia para o caminho do som
  const pedidos = [], copias = []
  let video_url = null
  const deps = {
    now: () => 1763000000000, claim: async (mk) => { video_url = mk; return 'claimed' }, swap: async (de, para) => { if (video_url !== de) return false; video_url = para; return true },
    download: async () => new Uint8Array(MP4_REAL), uploadClean: async () => 'https://c/clean.mp4', cleanUrl: () => 'https://c/clean.mp4',
    submit: async (src) => { pedidos.push(src); return 'render-12345678' }, poll: async () => ({ status: 'succeeded', url: 'https://creatomate/out.mp4' }),
    copyBranded: async (url, why) => { copias.push(why); return why === 'audio' ? 'https://nosso/som.mp4' : 'https://nosso/marca.mp4' }, event: async () => {},
  }
  const row = { id: ID, engine: 'h3', seconds: 8, video_url: null }
  try { await mm.brandFreeClip(deps, { row, providerUrl: 'https://fal/out.mp4', reason: 'audio', ageMs: 1000, expireMs: 7200000, audio: { url: ORIGINAL, seconds: 8 } }); erros.push('B a 1ª passada não esperou o render') } catch (x) { if (!/rendering/.test(String(x?.message ?? x))) erros.push('B 1ª passada: ' + (x?.message ?? x)) }
  const src = pedidos[0]
  if (!src || src.elements.some((e) => e.type === 'text') || !src.elements.some((e) => e.type === 'audio' && e.source === ORIGINAL)) erros.push('B o render pedido não é só o som original: ' + JSON.stringify(src?.elements?.map((e) => e.type)))
  const fim = await mm.brandFreeClip(deps, { row: { ...row, video_url }, providerUrl: 'https://fal/out.mp4', reason: null, ageMs: 2000, expireMs: 7200000, audio: { url: ORIGINAL, seconds: 8 } }).catch((x) => 'lançou ' + x?.message)
  if (fim !== 'https://nosso/som.mp4' || copias[0] !== 'audio') erros.push(`B a 2ª passada não entregou o arquivo com som (${fim}, ${copias})`)
  return erros
}
const bBase = await provasB(carrega(), carregaMarca())
checa(`B som original pela montagem: provas verdes${bBase.length ? ': ' + bBase.join(' · ') : ''}`, bBase.length === 0)
const servMarca = r('lib/clips/freeClipWatermarkServer.ts'), clipSrv = r('lib/clips/clipServer.ts')
checa('B quem paga recebe a montagem só do som; sem som, o caminho de sempre', servMarca.includes("if (!ctx.audio) return null // KINEO-RECREATE-SEU-VIDEO-1311") && servMarca.includes("reason = 'audio'") && servMarca.includes('audio: ctx.audio ?? null'))
checa('B o persist do clipe passa o som e entra na montagem por ele', clipSrv.includes("const audio = somOriginalDaLinha(row, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')") && clipSrv.includes('isFreeClipMarkTestKey(row.idempotency_key)) {') && clipSrv.includes('expireMs: CLIP_EXPIRE_MS, audio,'))
checa('B nada de som gerado (a fal segue com generate_audio false)', carrega().entradaSeedance25({ prompt: '', fotos: [], videoUrl: '', gerados: 4, proporcao: '9:16' }).generate_audio === false)
const MUTANTES_B = [
  ['B som de qualquer dono', ARQ, (s) => s.replace('return u.startsWith(dono) &&', 'return u.includes(`/${SEU_VIDEO_PASTA}/`) &&')],
  ['B som sem o corte na duração', MARCA, (s) => s.replace("...(dur ? { duration: Math.round(dur * 1000) / 1000 } : {}), source: opts.audio.url", 'source: opts.audio.url')],
  ['B só som mas com a marca', MARCA, (s) => s.replace("const elements = opts.text === false ? base.elements.filter((e) => e.type !== 'text') : base.elements", 'const elements = base.elements')],
  ['B render sem o som', MARCA, (s) => s.replace("buildFreeClipWatermarkSource(clean, info, { text: reason !== 'audio', audio: args.audio ?? null })", 'buildFreeClipWatermarkSource(clean, info)')],
  ['B som vai para o caminho da marca', MARCA, (s) => s.replace('const url = await deps.copyBranded(state.url, marker.reason)', 'const url = await deps.copyBranded(state.url)')],
  ['B trava sem o motivo audio', MARCA, (s) => s.replace('(free|courtesy|forced|audio)', '(free|courtesy|forced)')],
]
for (const [nome, arq, fn] of MUTANTES_B) {
  const fonte = lf(fs.readFileSync(arq, 'utf8')), mudou = fn(fonte) !== fonte
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = await provasB(arq === ARQ ? carrega(fn) : carrega(), arq === MARCA ? carregaMarca(fn) : carregaMarca()) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}

// (C) Entrega C: Outfit Morph, Elevator e Dance duo no Seedance 2.5 (planRecreate de verdade); os aprovados seguem no Recast
const PHOTO = `${SUPA}/storage/v1/object/public/avatars/${U}/a.jpg`, PHOTO2 = `${SUPA}/storage/v1/object/public/avatars/${U}/b.jpg`
const GEN = 'lib/recreate/generation.ts'
const planoDe = (mutarSeu = null, mutarGen = null) => createOfflineLoader({ source: (rel, text) => (mutarSeu && rel === ARQ ? mutarSeu(text) : mutarGen && rel === GEN ? mutarGen(text) : text) })(GEN)
function provasC(g) {
  const erros = []
  const plano = (format, photos) => g.planRecreate({ format, seconds: format === 'escolha-o-favorito' ? 8 : 10, photos, consent: true, mode: 'swap' }, { userId: U, supabaseUrl: SUPA, paying: false })
  for (const [id, fotos] of [['outfit-morph', [PHOTO]], ['elevador', [PHOTO]], ['duelo-de-danca', [PHOTO, PHOTO2]]]) {
    const r = plano(id, fotos)
    if (!r.ok) { erros.push(`C ${id} recusado: ${r.error}`); continue }
    const p = r.plan
    if (p.model !== 'bytedance/seedance-2.5/reference-to-video' || p.credits !== 40 || p.input.task !== 'reference' || p.input.resolution !== '480p' || p.input.duration !== '10' || p.input.generate_audio !== false) erros.push(`C ${id} não foi ao Seedance 2.5 com o preço de hoje: ${p.model} ${p.credits} ${JSON.stringify(p.input).slice(0, 120)}`)
    if (!String(p.input.video_urls?.[0] ?? '').endsWith(`/api/recreate/assets/${id}.mp4`)) erros.push(`C ${id} sem o vídeo-base da casa em video_urls`)
    for (let i = 1; i <= fotos.length; i++) if (!p.input.prompt.includes(`@Image${i}`)) erros.push(`C ${id} prompt sem @Image${i}`)
    if (Math.abs(p.falUsd - 20 * 0.1323) > 0.001) erros.push(`C ${id} custo fal ${p.falUsd}`)
  }
  const el = plano('elevador', [PHOTO])
  if (el.ok && (!el.plan.input.prompt.startsWith('Recreate @Video1') || !el.plan.input.prompt.includes('The man in @Video1 is the person from @Image1') || !/every other person/.test(el.plan.input.prompt))) erros.push('C Elevator não troca SÓ o homem: ' + el.plan.input.prompt)
  for (const [id, fotos] of [['passarela', [PHOTO]], ['escolha-o-favorito', [PHOTO, PHOTO2]]]) {
    const r = plano(id, fotos)
    if (!r.ok || r.plan.model !== 'minimax/h3-max/recast') erros.push(`C ${id} (aprovado no Recast) mudou de motor`)
  }
  return erros
}
const cBase = provasC(planoDe())
checa(`C os 3 formatos reprovados no Seedance 2.5, os aprovados no Recast${cBase.length ? ': ' + cBase.join(' · ') : ''}`, cBase.length === 0)
const desligado = planoDe((s) => s.replace('export const CATALOGO_SEEDANCE25_LIGADO = true', 'export const CATALOGO_SEEDANCE25_LIGADO = false')).planRecreate({ format: 'elevador', seconds: 10, photos: [PHOTO], consent: true, mode: 'swap' }, { userId: U, supabaseUrl: SUPA, paying: false })
checa('C interruptor desligado = os 3 voltam ao Recast', desligado.ok && desligado.plan.model === 'minimax/h3-max/recast')
const recSrv = r('lib/recreate/server.ts')
checa('C o envio troca video_urls pelo vídeo-base da casa no bucket (só nos 3)', recSrv.includes('const seedance = model === SEEDANCE25_MODEL && catalogoNoSeedance25(format.id)') && recSrv.includes('seedance ? { ...input, video_urls: [data.publicUrl] } : { ...input, video_url: data.publicUrl }'))
checa('C os 3 continuam só da casa (swapApproved false)', ['outfit-morph', 'elevador', 'duelo-de-danca'].every((id) => new RegExp(`id: '${id}'[^\\n]*swapApproved: false`).test(r('lib/recreate/formats.ts'))))
const MUTANTES_C = [
  ['C sem a Dança', ARQ, (s) => s.replace("new Set(['outfit-morph', 'elevador', 'duelo-de-danca'])", "new Set(['outfit-morph', 'elevador'])")],
  ['C Elevator troca todo mundo', ARQ, (s) => s.replace('if (!swapSubject) return promptPadrao(fotos)', 'return promptPadrao(fotos)')],
  ['C todo o catálogo no motor novo', ARQ, (s) => s.replace('ligado && typeof formatId === \'string\' && CATALOGO_NO_SEEDANCE25.has(formatId)', 'ligado && typeof formatId === \'string\'')],
  ['C motor novo com preço de custo', GEN, (s) => s.replace('model: SEEDANCE25_MODEL, credits, falUsd', 'model: SEEDANCE25_MODEL, credits: credits + 20, falUsd')],
]
for (const [nome, arq, fn] of MUTANTES_C) {
  const fonte = lf(fs.readFileSync(arq, 'utf8')), mudou = fn(fonte) !== fonte
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provasC(arq === ARQ ? planoDe(fn) : planoDe(null, fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}

// (M) mutantes
const MUTANTES = [
  ['sem a régua de fps', (s) => s.replace('if (meta.fps < L.minFps - 0.5 || meta.fps > L.maxFps + 0.5) return', 'if (false) return')],
  ['sem o teto de 15 s', (s) => s.replace('meta.segundos > L.maxSegundos + 0.25', 'false')],
  ['pega a 1ª trilha (áudio)', (s) => s.replace("if (!mdia || !hdlr || tipo(moov, hdlr.ini + 8) !== 'vide') continue", 'if (!mdia || !hdlr) continue')],
  ['mdhd v1 lido como v0', (s) => s.replace('const v1 = moov[mdhd.ini] === 1', 'const v1 = false')],
  ['duração gerada sem o piso de 4', (s) => s.replace('Math.max(4, Math.round(segundosDoVideo))', 'Math.round(segundosDoVideo)')],
  ['tudo na tarifa de 10 s', (s) => s.replace('recreateCreditCost(gerados <= 10 ? 10 : 15)', 'recreateCreditCost(10)')],
  ['custo fal só do gerado', (s) => s.replace('(segundosDoVideo + gerados) * SEEDANCE25_USD_POR_SEGUNDO_480P', 'gerados * SEEDANCE25_USD_POR_SEGUNDO_480P')],
  ['prompt sem conferir cada foto', (s) => s.replace('for (let i = 1; i <= fotos; i++) if (!t.includes(`@Image${i}`)) return', 'for (let i = 1; i <= 0; i++) if (!t.includes(`@Image${i}`)) return')],
  ['caminho de qualquer cliente', (s) => s.replace('`^${SEU_VIDEO_PASTA}/${userId}/[0-9a-f-]{36}', '`^${SEU_VIDEO_PASTA}/[0-9a-f-]{36}/[0-9a-f-]{36}')],
  ['com som e 720p', (s) => s.replace("resolution: '480p', duration: String(a.gerados), aspect_ratio: a.proporcao, generate_audio: false", "resolution: '720p', duration: String(a.gerados), aspect_ratio: a.proporcao, generate_audio: true")],
  ['recusa com outra frase', (s) => s.replace("'The engine did not accept this photo. Nothing was charged. Try another photo.'", "'The engine refused this.'")],
  ['aberto ao público', (s) => s.replace("export const SEU_VIDEO_RELEASE: InternalRelease = 'internal'", "export const SEU_VIDEO_RELEASE: InternalRelease = 'public'")],
]
const src = lf(fs.readFileSync(ARQ, 'utf8'))
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = await provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
