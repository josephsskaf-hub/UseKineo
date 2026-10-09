// KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — guardião do VÍDEO DO CLIENTE no anúncio v2 (pedido do fundador, 29/09:
// "quero colocar as minhas fotos e VÍDEOS e a AI fazer um vídeo do que eu pedi"). Roda com
// `node scripts/test-ads-video-do-cliente-2026-09-29.mjs`, sem rede e sem banco.
//
// O que fica provado:
//   · vídeo → plano 'user_video' que NUNCA vai à fal (sem motor em tentativa nenhuma; nem uma linha malformada sai);
//   · o nº de planos de cada nível não muda e o vídeo só ocupa vaga de FOTO (nunca de cena criada);
//   · a montagem põe o vídeo MUDO, SEM loop, com trim_start/duração do trecho, recortado em 9:16 (foco no horizontal);
//   · no máximo 2 vídeos (contrato, plano e tela); acima de 50 MB / WebM / < 3 s / ilegível → plano B (quadros viram fotos);
//   · o custo em créditos é o de sempre (34/41/51 por 15 s; o /start debita adsV2Credits(tier, seconds));
//   · refação de plano de vídeo desabilitada com explicação, sem cobrar;
//   · MUTANTES vermelhos: vídeo indo à fal, áudio do cliente ligado, loop ligado, 3º vídeo aceito, preço mudando.
// Módulos TS são transpilados com o typescript do repo (mesmo carregador de test-ads-v2-servidor-2026-09-28.mjs), com
// stubs para o que é de servidor. Um mutante = o MESMO arquivo com 1 trecho trocado, carregado de novo.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(import.meta.url)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n')
let ok = 0
const falhas = []
const check = async (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!(await condicao()) : !!condicao } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}
const ordem = (src, ...marcas) => {
  let pos = -1
  for (const m of marcas) {
    const i = src.indexOf(m, pos + 1)
    if (i < 0 || i <= pos) return false
    pos = i
  }
  return true
}
const trocar = (src, de, para) => {
  if (!src.includes(de)) throw new Error(`mutante sem alvo: ${de.slice(0, 60)}`)
  return src.replace(de, para)
}

// ── carregador: transpila TS → CJS; resolve '@/' e './' por stub, pelo arquivo real (lista) ou por fonte trocada ────
function makeLoader(stubs, opts = {}) {
  const cache = new Map()
  const real = new Set(opts.real ?? [])
  const over = opts.over ?? {}
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const src = Object.prototype.hasOwnProperty.call(over, rel) ? over[rel] : rd(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    cache.set(rel, module.exports)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || spec === 'crypto') return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = `${spec.slice(2)}.ts`
      else if (spec.startsWith('./') || spec.startsWith('../')) target = `${posix.normalize(posix.join(posix.dirname(rel), spec))}.ts`
      if (target && (real.has(target) || Object.prototype.hasOwnProperty.call(over, target))) return load(target)
      throw new Error(`sem stub: ${spec} (em ${rel})`)
    }
    const timers = { setTimeout: (fn) => setImmediate(fn), clearTimeout: (h) => clearImmediate(h) }
    new Function('exports', 'require', 'module', 'setTimeout', 'clearTimeout', js)(module.exports, req, module, timers.setTimeout, timers.clearTimeout)
    cache.set(rel, module.exports)
    return module.exports
  }
  return load
}
const pura = (rel, src) => makeLoader({}, { over: src === undefined ? {} : { [rel]: src } })(rel)

const F = {
  userVideo: 'lib/ads/v2UserVideo.ts',
  contract: 'lib/ads/v2Contract.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  montage: 'lib/ads/adV2Montage.ts',
  advance: 'lib/ads/v2Advance.ts',
  screen: 'lib/ads/v2Screen.ts',
  simpleLib: 'lib/ads/v2Simple.ts',
  frames: 'lib/ads/v2VideoFrames.ts',
  server: 'lib/ads/v2Server.ts',
  planRoute: 'app/api/ads/v2/plan/route.ts',
  startRoute: 'app/api/ads/v2/start/route.ts',
  retakeRoute: 'app/api/ads/v2/retake/route.ts',
  footageRoute: 'app/api/footage/route.ts',
  upload: 'lib/ads/uploadFootage.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  client: 'app/(dashboard)/ads/v2/AdsV2Client.tsx',
  mig: 'migrations_pending/2026-09-29_ads_v2_user_video.sql',
}
for (const p of Object.values(F)) await check(`arquivo existe: ${p}`, existsSync(join(RAIZ, p)))
const SRC = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))

const UV = pura(F.userVideo)
const C = pura(F.contract)
const S = pura(F.shots)
const T = pura(F.tiers)
const M = pura(F.montage)
const SC = pura(F.screen)
const SL = pura(F.simpleLib)
const U = (n) => `${String(n).padStart(8, '0')}-2222-4333-8444-555555555555`
const near = (a, b) => Math.abs(a - b) < 1e-6

// ═══ U. A REGRA DO NAVEGADOR (lib/ads/v2UserVideo.ts) ═════════════════════════════════════════════════════════════════
const MB = 1024 * 1024
// O vídeo do teste do fundador: vertical, 464×832, 12 s, H.264 MP4 (tamanho de celular de WhatsApp).
const IMOVEL = { bytes: 9 * MB, type: 'video/mp4', seconds: 12, width: 464, height: 832, videosAlready: 0 }
const veredito = (L) =>
  L.userVideoVerdict(IMOVEL) === 'video' &&
  L.userVideoVerdict({ ...IMOVEL, type: 'video/quicktime' }) === 'video' &&
  L.userVideoVerdict({ ...IMOVEL, bytes: 60 * MB }) === 'too_big' &&
  L.userVideoVerdict({ ...IMOVEL, bytes: 50 * MB }) === 'video' &&
  L.userVideoVerdict({ ...IMOVEL, type: 'video/webm' }) === 'bad_type' &&
  L.userVideoVerdict({ ...IMOVEL, seconds: null }) === 'unreadable' &&
  L.userVideoVerdict({ ...IMOVEL, width: null }) === 'unreadable' &&
  L.userVideoVerdict({ ...IMOVEL, seconds: 2.5 }) === 'too_short' &&
  L.userVideoVerdict({ ...IMOVEL, videosAlready: 1 }) === 'video' &&
  L.userVideoVerdict({ ...IMOVEL, videosAlready: 2 }) === 'too_many'
await check('U1 vídeo do imóvel (12 s, 464×832, MP4) entra como vídeo; > 50 MB, WebM, ilegível, < 3 s ou 3º vídeo = plano B (fotos)', () => veredito(UV))
await check('U1-mutante: 3º vídeo aceito como vídeo fica vermelho', () => !veredito(pura(F.userVideo, trocar(SRC.userVideo, 'export const ADS_V2_MAX_USER_VIDEOS = 2', 'export const ADS_V2_MAX_USER_VIDEOS = 3'))))
await check('U1-mutante: teto de 50 MB furado (vídeo grande entrando como vídeo) fica vermelho', () => !veredito(pura(F.userVideo, trocar(SRC.userVideo, 'export const ADS_V2_USER_VIDEO_MAX_BYTES = 50 * 1024 * 1024', 'export const ADS_V2_USER_VIDEO_MAX_BYTES = 500 * 1024 * 1024'))))
await check('U2 o teto é o MESMO do caminho de footage do v1: uploadFootage (ADS_UPLOAD_MAX_BYTES) e /api/footage (50 MB)', /export const ADS_UPLOAD_MAX_BYTES = 50 \* 1024 \* 1024/.test(SRC.upload) && /if \(sizeBytes > 50 \* 1024 \* 1024\)/.test(SRC.footageRoute) && UV.ADS_V2_USER_VIDEO_MAX_BYTES === 50 * MB)
await check('U3 trecho mais vivo: a janela com maior diferença entre quadros vence; sem diferença = o meio; sempre cabe no vídeo', () => {
  const times = UV.userVideoSampleTimes(12)
  const diffs = times.slice(1).map((t) => (t > 7 && t <= 9.5 ? 0.3 : 0.01))
  const s = UV.pickLivelyStart(times, diffs, 12)
  const parado = UV.pickLivelyStart(times, times.slice(1).map(() => 0), 12)
  const fim = UV.pickLivelyStart(times, times.slice(1).map((t) => (t > 11 ? 0.9 : 0)), 12)
  const max = 12 - UV.ADS_V2_USER_VIDEO_WINDOW - UV.ADS_V2_USER_VIDEO_MARGIN
  return times.length === UV.ADS_V2_USER_VIDEO_SAMPLES && times[0] === 0 && times.at(-1) <= 11.95 && s >= 6 && s <= 7.5 &&
    near(parado, Math.min(max, 6 - UV.ADS_V2_USER_VIDEO_WINDOW / 2)) && fim <= max + 1e-9 && UV.pickLivelyStart(times, diffs, 12) === s && UV.pickLivelyStart([], [], 0) === 0
})
await check('U4 ESPELHO: início no servidor (adsV2UserVideoStart, v2ShotLists) = clampUserVideoStart (v2UserVideo) em 400 casos; dissolve, folga, máx. 2 e mín. 3 s iguais nos 3 lugares', () => {
  for (const measured of [2.8, 2.95, 3, 4.5, 12, 30]) for (const cut of [2, 2.5]) for (const sug of [null, -1, 0, 0.3, 1.7, 5, 9.4, 11, 50, NaN, 'x']) {
    if (UV.clampUserVideoStart(sug, measured, cut) !== S.adsV2UserVideoStart(sug, measured, cut)) return false
  }
  return UV.ADS_V2_USER_VIDEO_FADE === S.ADS_V2_FADE_SECONDS && UV.ADS_V2_USER_VIDEO_MARGIN === S.ADS_V2_CUT_MARGIN && S.ADS_V2_FADE_SECONDS === M.ADS_V2_MONTAGE_FADE &&
    UV.ADS_V2_MAX_USER_VIDEOS === S.ADS_V2_PLAN_MAX_VIDEOS && UV.ADS_V2_MAX_USER_VIDEOS === C.ADS_V2_CONTRACT_MAX_VIDEOS && UV.ADS_V2_USER_VIDEO_MIN_SECONDS === S.ADS_V2_PLAN_VIDEO_MIN_SECONDS &&
    UV.ADS_V2_USER_VIDEO_WINDOW >= Math.max(...Object.values(S.ADS_V2_TIER_SLOTS).flat().map((x) => x.cut), S.ADS_V2_EXTRA_CUT) + S.ADS_V2_FADE_SECONDS &&
    UV.ADS_V2_USER_VIDEO_MIN_SECONDS >= S.ADS_V2_EXTRA_CUT + S.ADS_V2_FADE_SECONDS + S.ADS_V2_CUT_MARGIN
})

// ═══ C. CONTRATO (lib/ads/v2Contract.ts) ═════════════════════════════════════════════════════════════════════════════
const fotos = (n, base = 10) => Array.from({ length: n }, (_, i) => ({ footage_id: U(base + i), kind: 'place' }))
const vid = (n, extra = {}) => ({ footage_id: U(60 + n), start: 6.3, focus_x: 0.5, focus_y: 0.5, width: 464, height: 832, ...extra })
const plano = (photos, videos, extra = {}) => C.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos, ...(videos ? { videos } : {}), ...extra })
const keys = (o) => Object.keys(o).sort().join(',')
const contrato = (K) => {
  const semVideo = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(3) })
  const umVideo = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(2), videos: [vid(1)] })
  const doisVideos = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(1), videos: [vid(1), vid(2)] })
  const tres = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(3), videos: [vid(1), vid(2), vid(3)] })
  const soVideos = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: [], videos: [vid(1), vid(2)] })
  const oito = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(6), videos: [vid(1), vid(2)] })
  const repetido = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(2), videos: [vid(1, { footage_id: U(10) })] })
  const logo = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(2), videos: [vid(1, { footage_id: U(2) })] })
  const foco = K.sanitizePlanBody({ order_id: U(1), sector: 'real_estate', logo_footage_id: U(2), photos: fotos(2), videos: [vid(1, { focus_x: 1.5 })] })
  const assets = K.sanitizeAssetsBody({ photos: fotos(2), videos: [vid(1)] })
  const assetsSem = K.sanitizeAssetsBody({ photos: fotos(2) })
  return semVideo.ok && keys(semVideo.value) === 'logo_footage_id,order_id,photos,sector' &&
    umVideo.ok && umVideo.value.videos.length === 1 && umVideo.value.videos[0].start === 6.3 && umVideo.value.photos.length === 2 &&
    doisVideos.ok && doisVideos.value.videos.length === 2 &&
    !tres.ok && tres.error === 'too_many_videos' && !soVideos.ok && soVideos.error === 'too_few_photos' && !oito.ok && oito.error === 'too_many_photos' &&
    !repetido.ok && repetido.error === 'duplicate_photo' && !logo.ok && logo.error === 'logo_is_photo' && !foco.ok && foco.error === 'bad_video' &&
    assets.ok && !assetsSem.ok && assetsSem.error === 'too_few_photos'
}
await check('C1 contrato: fotos + vídeos entre 3 e 7, pelo menos 1 foto, até 2 vídeos, sem repetir nem virar logo; sem vídeo = as chaves de antes', () => contrato(C))
await check('C1-mutante: 3 vídeos passando no contrato fica vermelho', () => !contrato(pura(F.contract, trocar(SRC.contract, 'export const ADS_V2_CONTRACT_MAX_VIDEOS = 2', 'export const ADS_V2_CONTRACT_MAX_VIDEOS = 3'))))

// ═══ P. PLANO (lib/ads/v2ShotLists.ts) ═══════════════════════════════════════════════════════════════════════════════
const PHU = 'https://x.supabase.co/storage/v1/object/public/user-footage/u/'
const FOTOS = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ id: `p${i}`, url: `${PHU}p${i}.jpg`, kind: i === 0 ? 'product' : i === 1 ? 'text' : i < 5 ? 'place' : 'people' }))
const VIDEO = (n, extra = {}) => ({ id: `v${n}`, url: `${PHU}v${n}.mp4`, seconds: 12, start: 6.3, focusX: 0.5, focusY: 0.5, width: 464, height: 832, ...extra })
const TIERS = ['photo_motion', 'commercial', 'cinema']
const planoCompara = (SLx) => TIERS.every((tier) => [15, 20, 30].every((seconds) => ['real_estate', 'restaurant', 'store'].every((sector) => {
  const base = SLx.planShots({ sector, tier, photos: FOTOS.slice(0, 5), seconds })
  const um = SLx.planShots({ sector, tier, photos: FOTOS.slice(0, 4), seconds, videos: [VIDEO(1)] })
  const dois = SLx.planShots({ sector, tier, photos: FOTOS.slice(0, 3), seconds, videos: [VIDEO(1), VIDEO(2)] })
  const vids = (p) => p.shots.filter((x) => x.kind === 'user_video')
  const cenas = (p) => p.shots.filter((x) => x.source === 'generated_scene').length
  const bom = (p) => vids(p).every((x) => {
    const antes = base.shots[x.idx]
    return x.source === 'client_photo' && antes.source === 'client_photo' && x.prompt === null && x.scenePrompt === null && x.imageUrl === null &&
      x.videoUrl && x.cutSeconds === antes.cutSeconds && x.cutStart >= 0 && x.cutStart + x.cutSeconds + SLx.ADS_V2_FADE_SECONDS + SLx.ADS_V2_CUT_MARGIN <= x.videoSeconds + 1e-9
  })
  return um.shots.length === base.shots.length && dois.shots.length === base.shots.length && vids(um).length === 1 && vids(dois).length === 2 &&
    cenas(um) === cenas(base) && cenas(dois) === cenas(base) && um.totalSeconds === base.totalSeconds && bom(um) && bom(dois) &&
    base.shots.every((x) => x.kind !== 'user_video')
})))
await check('P1 cada vídeo vira 1 plano user_video na vaga de uma FOTO (nunca de cena criada); nº de planos, de cenas e a duração de cada nível iguais (3 níveis × 15/20/30 s × 3 setores)', () => planoCompara(S))
await check('P1-mutante: vídeo tomando a vaga de uma cena criada fica vermelho', () => !planoCompara(pura(F.shots, trocar(SRC.shots, ".filter((x) => x.s.source === 'client_photo')", '.filter(() => true)'))))
await check('P2 trecho do vídeo: o que o navegador sugeriu, conferido contra a duração MEDIDA; sem sugestão = o meio; o do imóvel (12 s, 6,3 s) fica em 6,3', () => {
  const p = S.planShots({ sector: 'real_estate', tier: 'photo_motion', photos: FOTOS.slice(0, 2), videos: [VIDEO(1)] })
  const v = p.shots.find((x) => x.kind === 'user_video')
  const semSug = S.planShots({ sector: 'real_estate', tier: 'photo_motion', photos: FOTOS.slice(0, 2), videos: [VIDEO(1, { start: null })] }).shots.find((x) => x.kind === 'user_video')
  const longe = S.planShots({ sector: 'real_estate', tier: 'photo_motion', photos: FOTOS.slice(0, 2), videos: [VIDEO(1, { start: 99 })] }).shots.find((x) => x.kind === 'user_video')
  return v.idx === 0 && v.role === 'hook' && v.cutStart === 6.3 && v.videoSeconds === 12 && near(semSug.cutStart, (12 - semSug.cutSeconds) / 2 - 0.125) && near(longe.cutStart, 12 - longe.cutSeconds - 0.35)
})
await check('P3 limite: 3 vídeos no plano = erro; vídeo sem duração medida = erro; vídeo repetido = erro', () => {
  const t = (f) => { try { f(); return false } catch { return true } }
  return t(() => S.planShots({ sector: 'other', tier: 'cinema', photos: FOTOS.slice(0, 3), videos: [VIDEO(1), VIDEO(2), VIDEO(3)] })) &&
    t(() => S.planShots({ sector: 'other', tier: 'cinema', photos: FOTOS.slice(0, 3), videos: [VIDEO(1, { seconds: null })] })) &&
    t(() => S.planShots({ sector: 'other', tier: 'cinema', photos: FOTOS.slice(0, 3), videos: [VIDEO(1), VIDEO(1)] }))
})

// ═══ $. CUSTO (lib/ads/v2Tiers.ts) ═══════════════════════════════════════════════════════════════════════════════════
const custo = (Tx) => TIERS.every((tier) => [1, 2, 3, 4].every((a) => Tx.routeShot('user_video', tier, a) === null)) &&
  Tx.adsV2RetakeCredits('user_video', 'cinema') === 0 && Tx.ADS_V2_NO_AI_KINDS.includes('user_video') &&
  Tx.adsV2Credits('photo_motion', 15) === 34 && Tx.adsV2Credits('commercial', 15) === 41 && Tx.adsV2Credits('cinema', 15) === 51 &&
  (() => {
    const base = S.planShots({ sector: 'real_estate', tier: 'commercial', photos: FOTOS.slice(0, 5) })
    const com = S.planShots({ sector: 'real_estate', tier: 'commercial', photos: FOTOS.slice(0, 4), videos: [VIDEO(1)] })
    const eb = Tx.estimateAdUsd({ tier: 'commercial', shots: base.shots.map((s) => ({ kind: s.kind, source: s.source })) })
    const ec = Tx.estimateAdUsd({ tier: 'commercial', shots: com.shots.map((s) => ({ kind: s.kind, source: s.source })) })
    return ec.sceneImages === eb.sceneImages && ec.videoUsd <= eb.videoUsd && ec.aiShots === com.shots.filter((s) => s.kind !== 'text' && s.kind !== 'user_video').length
  })()
await check('$1 vídeo do cliente: nenhum motor em tentativa nenhuma, refação 0; preço dos níveis 34/41/51 intacto; custo de fornecedor só dos planos de IA', () => custo(T))
await check('$1-mutante: vídeo do cliente roteado a um motor (fal) fica vermelho', () => !custo(pura(F.tiers, trocar(SRC.tiers, "  if (kind === 'user_video') return null\n", ''))))
await check('$2 o /start cobra adsV2Credits(tier, seconds) — o mesmo de sempre, com ou sem vídeo', /const cost = adsV2Credits\(order\.tier, order\.seconds\)/.test(semComentarios(SRC.startRoute)) && !/user_video/.test(semComentarios(SRC.startRoute)))

// ═══ M. MONTAGEM (lib/ads/adV2Montage.ts) ═════════════════════════════════════════════════════════════════════════════
const montar = (Mx, shotExtra = {}) => Mx.buildAdV2Source({
  width: 1080, height: 1920, fontFamily: 'Montserrat', cardUrl: 'https://sb/card.png', musicUrl: 'https://sb/m.mp3', voiceUrl: 'https://sb/v.mp3', voiceSeconds: 3, overlays: [],
  shots: [
    { url: `${PHU}v1.mp4`, kind: 'user_video', cutStart: 6.3, cutSeconds: 2, measuredSeconds: 12, focusX: 0.5, focusY: 0.5, videoWidth: 464, videoHeight: 832, ...shotExtra },
    { url: 'https://sb/renders/p1.mp4', kind: 'place', cutStart: 0.65, cutSeconds: 2, measuredSeconds: 3.04 },
  ],
})
const montagem = (Mx) => {
  const src = montar(Mx)
  const el = src.elements.find((e) => e.source === `${PHU}v1.mp4`)
  const audios = src.elements.filter((e) => e.type === 'audio')
  const ok1 = el && el.type === 'video' && el.volume === '0%' && el.loop === false && el.trim_start === 6.3 && el.duration === 2.25 && el.time === 0 && el.fit === 'cover' &&
    el.x === '50%' && el.y === '50%' && el.width === '100%' && el.height === '100%' && Array.isArray(el.animations) && el.animations[0].type === 'scale' &&
    audios.every((a) => a.source !== `${PHU}v1.mp4`) && audios.length >= 2
  let passou = false
  try { montar(Mx, { cutStart: 10 }) } catch (e) { passou = /trim_past_clip/.test(e.message) }
  let semMedida = false
  try { montar(Mx, { measuredSeconds: null }) } catch (e) { semMedida = /unmeasured/.test(e.message) }
  return ok1 && passou && semMedida
}
await check('M1 vídeo do cliente na montagem: MUDO (volume 0%), SEM loop, trim_start/duração do trecho, fit cover, zoom lento; nunca vira faixa de áudio; trecho além do vídeo medido = recusa', () => montagem(M))
const USER_VIDEO_BRANCH = "source: shot.url.trim(), fit: 'cover', loop: false, trim_start: r3(cutStart),\n        ...userVideoFrame(width, height, shot.videoWidth, shot.videoHeight, shot.focusX, shot.focusY),\n        volume: '0%',"
await check('M1-mutante: áudio do cliente ligado (volume 100%) fica vermelho', () => !montagem(pura(F.montage, trocar(SRC.montage, USER_VIDEO_BRANCH, USER_VIDEO_BRANCH.replace("volume: '0%',", "volume: '100%',")))))
await check('M1-mutante: loop ligado fica vermelho', () => !montagem(pura(F.montage, trocar(SRC.montage, USER_VIDEO_BRANCH, USER_VIDEO_BRANCH.replace('loop: false', 'loop: true')))))
await check('M2 vídeo horizontal: recorte 9:16 no ponto focal que a pessoa arrastou, sempre cobrindo o quadro; foco no canto = encosta na borda; vertical = centro', () => {
  const W = 1080, H = 1920
  const f = (vw, vh, fx, fy) => M.userVideoFrame(W, H, vw, vh, fx, fy)
  const pn = (s) => Number(String(s).replace('%', '')) / 100
  const cobre = (r) => { const x = pn(r.x), y = pn(r.y), w = pn(r.width), h = pn(r.height); return x - w / 2 <= 1e-4 && x + w / 2 >= 1 - 1e-4 && y - h / 2 <= 1e-4 && y + h / 2 >= 1 - 1e-4 }
  const centro = f(1920, 1080, 0.5, 0.5), esq = f(1920, 1080, 0.2, 0.5), canto = f(1920, 1080, 0, 0.5), dir = f(1920, 1080, 1, 0.5)
  const alto = f(1080, 3000, 0.5, 0.1)
  return centro.x === '50%' && pn(centro.width) > 3 && pn(esq.x) > 0.5 && Math.abs(pn(canto.x) - pn(canto.width) / 2) < 1e-4 && Math.abs(pn(dir.x) + pn(dir.width) / 2 - 1) < 1e-4 &&
    [centro, esq, canto, dir, alto].every(cobre) && pn(alto.y) > 0.5 && alto.width === '100%' &&
    JSON.stringify(f(464, 832, 0.9, 0.9)) === JSON.stringify({ x: '50%', y: '50%', width: '100%', height: '100%' }) &&
    JSON.stringify(f(null, null, 0.2, 0.2)) === JSON.stringify({ x: '50%', y: '50%', width: '100%', height: '100%' })
})
await check('M3 nada de propriedade nova no elemento: só type/track/time/duration/source/fit/loop/trim_start/x/y/width/height/volume/enter_transition/animations (as que o compose já usa em vídeo)', () => {
  const el = montar(M, {}).elements.find((e) => e.source === `${PHU}v1.mp4`)
  const permitidas = new Set(['type', 'track', 'time', 'duration', 'source', 'fit', 'loop', 'trim_start', 'x', 'y', 'width', 'height', 'volume', 'enter_transition', 'animations'])
  return Object.keys(el).every((k) => permitidas.has(k))
})

// ═══ A. AVANÇO EXECUTADO (lib/ads/v2Advance.ts com banco e fornecedores falsos) ═════════════════════════════════════
let seq = 0
function fakeDb(tables) {
  const from = (name) => {
    tables[name] ??= []
    const ctx = { name, op: 'select', filters: [], patch: null, rows: null, opts: null }
    const api = {
      select() { return api },
      eq(k, v) { ctx.filters.push((r) => r[k] !== undefined && r[k] !== null && String(r[k]) === String(v)); return api },
      in(k, v) { ctx.filters.push((r) => v.map(String).includes(String(r[k]))); return api },
      is(k, v) { ctx.filters.push((r) => (v === null ? r[k] === null || r[k] === undefined : r[k] === v)); return api },
      order() { return api },
      limit() { return api },
      update(p) { ctx.op = 'update'; ctx.patch = p; return api },
      insert(r) { ctx.op = 'insert'; ctx.rows = Array.isArray(r) ? r : [r]; return api },
      upsert(r, o) { ctx.op = 'upsert'; ctx.rows = Array.isArray(r) ? r : [r]; ctx.opts = o; return api },
      maybeSingle() { return Promise.resolve(run(ctx, true)) },
      then(a, b) { return Promise.resolve(run(ctx, false)).then(a, b) },
    }
    return api
  }
  function run(ctx, single) {
    const t = tables[ctx.name]
    const hit = () => t.filter((r) => ctx.filters.every((f) => f(r)))
    if (ctx.op === 'select') {
      let rows = hit()
      if (ctx.name === 'ads_v2_shots') rows = rows.slice().sort((a, b) => a.idx - b.idx || a.attempt - b.attempt)
      rows = rows.map((r) => ({ ...r }))
      return single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null }
    }
    if (ctx.op === 'update') {
      const rows = hit()
      for (const r of rows) Object.assign(r, ctx.patch, { updated_at: new Date().toISOString() })
      return single ? { data: rows[0] ? { ...rows[0] } : null, error: null } : { data: rows.map((r) => ({ ...r })), error: null }
    }
    const out = []
    for (const row of ctx.rows) {
      if (ctx.name === 'ads_v2_shots' && t.some((x) => x.order_id === row.order_id && x.idx === row.idx && x.attempt === (row.attempt ?? 1))) {
        if (ctx.op === 'upsert' && ctx.opts?.ignoreDuplicates) continue
        return { data: null, error: { code: '23505', message: 'dup' } }
      }
      const iso = new Date().toISOString()
      const base = ctx.name === 'ads_v2_shots'
        ? { attempt: 1, movement_variant: 0, status: 'pending', image_url: null, image_request_id: null, request_id: null, fal_url: null, stored_url: null, measured_seconds: null, reason: null, reason_class: null, image_submit_claimed_at: null, submit_claimed_at: null, submitted_at: null, fal_done_at: null }
        : {}
      const nr = { id: row.id ?? `${ctx.name}-${++seq}`, created_at: iso, updated_at: iso, ...base, ...row }
      t.push(nr)
      out.push({ ...nr })
    }
    return single ? { data: out[0] ?? null, error: null } : { data: out, error: null }
  }
  return { from, rpc: async () => ({ data: null, error: null }), tables }
}

const prov = { submits: [], cmSubmits: [], fails: [] }
let current = null
const advStubs = {
  '@/lib/compose': {
    CreatomateSubmitError: class extends Error {},
    estimateMp3DurationSeconds: () => 9,
    pollCreatomateRender: async () => ({ status: 'rendering', url: null }),
    submitCreatomateRender: async (src) => { prov.cmSubmits.push(src); return 'cm-1' },
    uploadVoiceoverToSupabase: async () => 'https://sb/voiceovers/v.mp3',
  },
  '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => null },
  '@/lib/pixabayMusic': { getBackgroundMusicUrl: async () => 'https://sb/music/m.mp3' },
  '@/lib/ttsFallback': { synthesizeTtsFallback: async () => Buffer.alloc(2000) },
  '@/lib/renderAssets': { persistRenderAssets: async (a) => ({ videoUrl: `https://sb/renders/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 15.2 }) },
  '@/lib/renderProfile': { renderOutputSpecFor: () => ({ output_format: 'mp4', width: 1080, height: 1920, frame_rate: 24 }) },
  '@/lib/textLanguage': { captionFontFor: () => 'Montserrat', narrationLanguage: (x) => (typeof x === 'string' && x ? x : null) },
  '@/lib/ads/speakable': { speakableForTts: (t) => t },
  '@/lib/serverEvents': { writeServerEvent: async () => true },
  '@/lib/ads/v2Billing': {
    ADS_V2_QUALITY: 'ads_v2',
    confirmAdsV2Debit: async () => ({ ok: true, refunded: false }),
    failAdsV2Order: async (db, o, reason) => { prov.fails.push(reason); const r = current.ads_v2_orders.find((x) => x.id === o.id); if (r) r.status = 'failed'; return { won: true } },
  },
  '@/lib/ads/v2Shots': {
    ADS_V2_AMBIGUOUS_MAX_MS: 20 * 60_000, ADS_V2_BATCH_SIZE: 3, ADS_V2_COPY_MAX_MS: 30 * 60_000, ADS_V2_KLING_GAP_MS: 0, ADS_V2_SHOT_STUCK_MS: 20 * 60_000,
    submitShotOnce: async (model, input) => { prov.submits.push({ model, input }); return { kind: 'accepted', requestId: `req-${prov.submits.length}`, posts: 1 } },
    pollFalJob: async () => ({ state: 'done', url: 'https://fal.media/x.mp4' }),
    persistShotClip: async (a) => ({ storedUrl: `https://sb/renders/p${a.idx}.mp4`, measuredSeconds: 3.04 }),
  },
  '@/lib/ads/v2Images': {
    persistAudioCopy: async () => null,
    persistSceneImage: async (a) => `https://sb/renders/${a.orderId}-p${a.idx}-scene.jpg`,
    pollSceneImage: async () => ({ state: 'done', url: 'https://fal.media/img.jpg' }),
    submitSceneImage: async (scene) => { prov.submits.push({ model: 'nano-banana', input: scene }); return { kind: 'accepted', requestId: 'img-1', posts: 1 } },
  },
}
// REANCORADO 30/09 (KINEO-ADS-3-VARIACOES-2026-09-30): o v2Advance importa a lib PURA lib/ads/v2Variations.ts (marca da
// variação e espera pelo still da A); carregada de verdade. Pedido sem marca = caminho de sempre.
// KINEO-ADS-AMOSTRA-2026-10-09 — re-ancorado: v2Billing (failAdsV2Order não estorna chave 'adssample-…') e v2Advance
// (linhas faltando de amostra sem débito para conferir) passaram a importar a lib PURA lib/ads/sample.ts (isAdsSampleRef);
// carregada de verdade, não stub — chave 'adsv2-…' segue o caminho de sempre em tudo que este guardião prova.
const REAL = ['lib/ads/v2Engines.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2ShotLists.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/v2Music.ts', 'lib/ads/v2Variations.ts', 'lib/ads/sample.ts']
const avanco = (src) => makeLoader(advStubs, { real: REAL, over: src === undefined ? {} : { [F.advance]: src } })(F.advance)
const A = avanco()
const ORDER = U(1), USER = U(9)
function cenario(tier = 'commercial', videos = [VIDEO(1)]) {
  const plan = S.planShots({ sector: 'real_estate', tier, photos: FOTOS.slice(2, 5), videos, seconds: 15 })
  const stored = { ...plan, overlays: [], narration: 'Apartamento com varanda, perto do metrô.' }
  const order = {
    id: ORDER, user_id: USER, status: 'generating', tier, seconds: 15, sector: 'real_estate', brief: { business: 'Apartamento' }, language: 'pt', narration: true,
    card_url: 'https://sb/user-footage/u/card.png', plan: stored, music_url: null, voice_url: null, voice_seconds: null, billing_ref: `adsv2-${ORDER}-g`, credits_charged: 41,
    generation_id: 'g', creatomate_render_id: null, video_id: null, error: null, started_at: new Date().toISOString(), assembly_lease_at: null, assembly_submit_at: null,
    parent_order_id: null, retake_idx: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }
  const tables = { ads_v2_orders: [order], ads_v2_shots: [], videos: [], credit_debits: [], profiles: [] }
  current = tables
  prov.submits.length = 0; prov.cmSubmits.length = 0; prov.fails.length = 0
  return { db: fakeDb(tables), tables, plan, order }
}
const DL = () => Date.now() + 60_000
const VURL = `${PHU}v1.mp4`

await check('A1 linha do vídeo nasce DONE: sem motor, sem prompt, sem imagem, custo 0, com o próprio arquivo e a duração MEDIDA', () => {
  const { plan } = cenario()
  const rows = A.buildInitialShotRows(ORDER, 'commercial', plan)
  const v = rows.filter((r) => r.kind === 'user_video')
  return v.length === 1 && v.every((r) => r.status === 'done' && r.engine === null && r.prompt === null && r.image_url === null && r.gen_seconds === null && r.usd === 0 && r.stored_url === VURL && r.measured_seconds === 12 && r.source === 'client_photo') &&
    rows.filter((r) => r.kind !== 'user_video' && r.kind !== 'text').every((r) => r.status === 'pending')
})
const semFal = async (Ax) => {
  const { db, tables, plan, order } = cenario()
  // Linha MALFORMADA de propósito (pendente, com motor e com a URL do vídeo como imagem): nem assim pode sair.
  const rows = Ax.buildInitialShotRows(ORDER, 'commercial', plan).map((r) => (r.kind === 'user_video' ? { ...r, status: 'pending', engine: 'kling_o3', image_url: VURL, prompt: 'Slow push in. Keep everything exactly as in the photo.' } : r))
  await db.from('ads_v2_shots').upsert(rows, { onConflict: 'order_id,idx,attempt', ignoreDuplicates: true })
  await Ax.dispatchAdsV2Shots(db, order, DL())
  // e o avanço inteiro (imagens → vídeos) também não manda o vídeo do cliente
  await Ax.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  await Ax.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  const naFal = prov.submits.some((s) => JSON.stringify(s.input).includes('v1.mp4'))
  const row = tables.ads_v2_shots.find((r) => r.kind === 'user_video')
  return prov.submits.length > 0 && !naFal && !row.request_id && !row.submit_claimed_at
}
await check('A2 O VÍDEO DO CLIENTE NUNCA VAI À FAL: nem uma linha malformada (pendente, com motor) sai; os planos de IA saem', () => semFal(A))
await check('A2-mutante: vídeo indo à fal (neverAi só olhando o text) fica vermelho', async () => !(await semFal(avanco(trocar(SRC.advance, "return r.kind === 'text' || r.kind === 'user_video'", "return r.kind === 'text'")))))
const ateMontagem = async (Ax, tier = 'commercial') => {
  const { db, tables } = cenario(tier)
  await db.from('ads_v2_shots').upsert(Ax.buildInitialShotRows(ORDER, tier, current.ads_v2_orders[0].plan))
  for (let i = 0; i < 6 && tables.ads_v2_orders[0].status === 'generating'; i++) await Ax.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
  return { tables, src: prov.cmSubmits[0] }
}
await check('A3 EXECUTADO até o Creatomate (Comercial): o vídeo entra como elemento de vídeo MUDO, sem loop, com o trim do plano; nenhum POST à fal com ele; nº de planos = o do nível', async () => {
  const { tables, src } = await ateMontagem(A)
  if (!src) return false
  const el = src.elements.find((e) => e.source === VURL)
  const planned = tables.ads_v2_orders[0].plan.shots.find((s) => s.kind === 'user_video')
  const trilhos = src.elements.filter((e) => e.track === 2)
  return tables.ads_v2_orders[0].status === 'assembling' && el && el.type === 'video' && el.volume === '0%' && el.loop === false && el.trim_start === planned.cutStart &&
    near(el.duration, planned.cutSeconds + 0.25) && trilhos.length === T.ADS_V2_TIERS.commercial.shots && !src.elements.some((e) => e.type === 'audio' && e.source === VURL) &&
    !prov.submits.some((s) => JSON.stringify(s.input).includes('v1.mp4')) && prov.fails.length === 0
})
await check('A4 vídeo horizontal: o foco gravado no PLANO chega à montagem (recorte fora do centro)', async () => {
  const { src } = await (async () => {
    const { db, tables } = cenario('photo_motion', [VIDEO(1, { width: 1920, height: 1080, focusX: 0.2 })])
    await db.from('ads_v2_shots').upsert(A.buildInitialShotRows(ORDER, 'photo_motion', current.ads_v2_orders[0].plan))
    for (let i = 0; i < 6 && tables.ads_v2_orders[0].status === 'generating'; i++) await A.advanceAdsV2Order(db, ORDER, { deadlineMs: DL() })
    return { src: prov.cmSubmits[0] }
  })()
  const el = src?.elements.find((e) => e.source === VURL)
  return !!el && Number(el.x.replace('%', '')) > 50 && Number(el.width.replace('%', '')) > 300 && el.height === '100%'
})
await check('A5 a tela vê o plano de vídeo como pronto, com rótulo próprio, sem "Redo" e refação 0', () => {
  const { plan, order } = cenario()
  const rows = A.buildInitialShotRows(ORDER, 'commercial', plan).map((r, i) => ({ ...r, id: `s${i}`, created_at: '', updated_at: '' }))
  const view = A.adsV2View(order, rows)
  const v = view.shots.find((s) => s.kind === 'user_video')
  return v && v.state === 'ready' && v.url === VURL && v.retake_credits === 0 && SC.shotStateLabel(v, 'delivered') === 'Your video' && SC.canRedoShot({ ...v, retake_credits: 5 }, 'delivered') === false &&
    /no AI/.test(SC.describeShot(v)) && /nothing to redo/.test(SC.adsV2ErrorMessage('video_not_retakable'))
})

// ═══ R. ROTAS (leitura) ═══════════════════════════════════════════════════════════════════════════════════════════════
const PLAN = semComentarios(SRC.planRoute)
await check('R1 /plan: vídeo conferido no user_footage do DONO (kind video, MP4/MOV); duração MEDIDA no servidor antes do plano; não mediu / < 3 s = 422 com o id (a tela cai no plano B); nada cobra', () =>
  /const badVideo = videosIn\.find\(\(v\) => !own\.get\(v\.footage_id\)\?\.isVideo\)/.test(PLAN) && /v2Fail\('video_invalid', 400, \{ footage_id: badVideo\.footage_id \}\)/.test(PLAN) &&
  /measureFootageVideo\(own\.get\(v\.footage_id\)!\.url\)/.test(PLAN) && /return measureRefused\('video_unreadable', v\.footage_id, null\)/.test(PLAN) && /return measureRefused\('video_too_short', v\.footage_id, measured\)/.test(PLAN) && /return v2Fail\(code, 422, \{ footage_id: footageId \}\)/.test(PLAN) &&
  ordem(PLAN, "'daily_limit'", 'measureFootageVideo(', 'moderateContent(', 'planShots(') && !/chargeAdsV2|debitVideoCredits|submitShotOnce|dispatchAdsV2Shots/.test(PLAN) &&
  /const isVideo = r\.kind === 'video' && \/\\\.\(mp4\|mov\)/.test(semComentarios(SRC.server)) && ordem(semComentarios(SRC.server), 'const bytes = new Uint8Array(await res.arrayBuffer())', 'if (!isMp4OrMovHead(bytes)) return null', 'probeMp4DurationSeconds(bytes)'))
// R1 REANCORADO (revisão 29/09, motivo): a recusa 422 passou por measureRefused (grava o evento do teto diário antes —
// achado de dinheiro) e a medição confere os primeiros bytes antes do mvhd (achado de segurança). Mesma garantia; V2/V3 provam.
const RETAKE = semComentarios(SRC.retakeRoute)
await check('R2 /retake: plano de vídeo = 400 video_not_retakable ANTES de qualquer preço, pedido novo ou débito', ordem(RETAKE, "if (target.kind === 'user_video') return v2Fail('video_not_retakable', 400)", 'adsV2RetakeCredits(', '.insert(', 'chargeAdsV2('))
await check('R3 migration irmã: tipo user_video aceito e a trava "nunca IA" no banco (sem motor, sem request_id, sem imagem); a original intacta', () => {
  const sql = SRC.mig.replace(/--.*$/gm, '')
  return /check \(kind in \('people', 'place', 'product', 'product_hero', 'text', 'user_video'\)\)/.test(sql) &&
    /check \(kind <> 'user_video' or \(engine is null and request_id is null and image_request_id is null\)\)/.test(sql) && /drop constraint if exists ads_v2_shots_kind_check/.test(sql) &&
    /check \(kind in \('people', 'place', 'product', 'product_hero', 'text'\)\)/.test(rd('migrations_pending/2026-09-29_ads_v2.sql'))
})

// ═══ T. TELAS (leitura) ═══════════════════════════════════════════════════════════════════════════════════════════════
const SIMPLE = semComentarios(SRC.simple)
const CLIENT = semComentarios(SRC.client)
// KINEO-ESTILOS-PRODUTO-2026-10-09 — re-ancorado: o corpo do /plan (simples e completo) ganhou o estilo, só quando escolhido (T1 e T3).
await check('T1 simples: o vídeo que cabe sobe ORIGINAL (uma vez, sem recorte) e vai em `videos` com trecho e foco; o que não cabe vira fotos com o motivo', () =>
  /const file = p\.video \? p\.video\.file : await cropToVertical\(p\)/.test(SIMPLE) && /photos: uploaded, videos, card_footage_id: card\.footageId, facts: chosen, \.\.\.\(style !== 'none' \? \{ style \} : \{\}\) \}/.test(SIMPLE) &&
  /videos\.push\(\{ footage_id: footageId, start: p\.video\.start, focus_x: p\.fx, focus_y: p\.fy, width: p\.video\.width, height: p\.video\.height \}\)/.test(SIMPLE) &&
  /const uploadSig = \(p: Pick<SimpleItem, 'fx' \| 'fy' \| 'video'>\) => \(p\.video \? 'video' : focalSig\(p\)\)/.test(SIMPLE) &&
  /const note = asPhotosNote\(read\.verdict, f\.name\)[\s\S]{0,80}return framesFromVideo\(f, notes\)/.test(SIMPLE) &&
  /userVideoVerdict\(\{ bytes: f\.size, type, seconds: read\?\.seconds \?\? null/.test(SIMPLE) && /VIDEO_TO_PHOTOS_CODES\.includes\(r\.code\)\) void videoBackToFrames\(/.test(SIMPLE))
await check('T2 simples: miniatura + "vai entrar como vídeo" em pt/en/es (tabela do modo simples, nada cravado); avisos de plano B traduzidos', () => {
  const { en, pt, es } = SL.ADS_V2_SIMPLE_COPY
  const ks = ['asVideo', 'asVideoHint', 'videoBigAsPhotos', 'videoTypeAsPhotos', 'videoShortAsPhotos', 'videoManyAsPhotos', 'videoUnreadableAsPhotos', 'videoServerAsPhotos']
  return pt.files.asVideo === 'Vai entrar como vídeo' && es.files.asVideo === 'Entra como video' && en.files.asVideo === 'Goes in as video' &&
    ks.every((k) => [en, pt, es].every((c) => typeof c.files[k] === 'string' && c.files[k].length > 10)) && /\{copy\.files\.asVideo\}/.test(SIMPLE) &&
    ['video_not_retakable', 'video_unreadable', 'video_too_short', 'too_many_videos'].every((c) => ['pt', 'es'].every((l) => { const m = SL.simpleErrorMessage(c, l); return m && m !== SL.ADS_V2_SIMPLE_ERRORS[l].default })) &&
    [pt, es].every((c) => c.labels['Your video'] && c.labels['Your own video, as you filmed it: a short part, muted, no AI'] && c.labels['Your video'] !== 'Your video')
})
await check('T3 completo: aceita vídeo, mesma regra (readVideoForAd) e mesmo envio original; texto em inglês do completo; plano B com quadros', () =>
  /import \{ AdsV2SimpleSession, readVideoForAd, videoFramesForAd \} from '\.\/AdsV2Simple'/.test(SRC.client) && /video\/mp4,video\/quicktime,video\/webm,\.mov/.test(CLIENT) &&
  /const read = await readVideoForAd\(f, videosAlready\)/.test(CLIENT) && /const file = p\.video \? p\.video\.file : await cropToVertical\(p\)/.test(CLIENT) &&
  /photos: uploaded, videos, card_footage_id: cardDone\.footageId, \.\.\.\(style !== 'none' \? \{ style \} : \{\}\) \}/.test(CLIENT) && /Goes in as video\./.test(CLIENT) && /await videoFramesForAd\(f\)/.test(CLIENT))
await check('T4 lib de quadros continua SEM import (a regra pura chega por parâmetro); a amostra é 32×18', !/^\s*import\s/m.test(SRC.frames) && /export async function readUserVideo\(/.test(SRC.frames) && /small\.width = 32/.test(SRC.frames) && /small\.height = 18/.test(SRC.frames) && !/^\s*import\s/m.test(SRC.userVideo))
await check('T5 trava 8.2: nenhum arquivo deste pedido mora em caminho travado', () =>
  Object.values(F).every((p) => !/^(lib\/compose|lib\/hollywood\/|lib\/cinematic\/|lib\/broll\/|lib\/lyriaMusic|lib\/narrationFit|app\/api\/analyze-idea\/|app\/api\/generate-script\/|app\/api\/generate-video-)/.test(p)))

// ═══ V. REVISÃO ADVERSARIAL (29/09) — dinheiro/segurança e montagem ═══════════════════════════════════════════════════
// Os achados confirmados pelas revisões do SHA 26151671, cada um com mutante vermelho.
const FOLDER = 'https://x.supabase.co/storage/v1/object/public/user-footage/'
const servidor = (src) => makeLoader({
  'next/server': { NextResponse: { json: (b, i) => ({ body: b, status: i?.status }) } },
  '@/lib/userFootage': { FOOTAGE_PUBLIC_PREFIX: () => FOLDER },
}, { real: ['lib/mp4Duration.ts'], over: src === undefined ? {} : { [F.server]: src } })(F.server)
const SV = servidor()
const EU = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'
const pasta = (Sv) => {
  const p = `${FOLDER}${EU}/`
  const aceita = [`${p}clip-1.mp4`, `${p}clip-1.mp4?t=1`, `${p}foto.jpg`]
  const recusa = [`${p}../${OUTRO}/clip-9.mp4`, `${p}..%2F${OUTRO}/clip-9.mp4`, `${p}%2e%2e/${OUTRO}/clip-9.mp4`, `${p}%2E%2E/${OUTRO}/x.mp4`,
    `${p}.\\..\\x.mp4`, `${p}./../../renders/x.mp4`, `${p}a/../../${OUTRO}/x.mp4`, `${FOLDER}${OUTRO}/clip-9.mp4`, `http://x.supabase.co/storage/v1/object/public/user-footage/${EU}/c.mp4`, null]
  return aceita.every((u) => Sv.footageUrlInFolder(u, p)) && recusa.every((u) => !Sv.footageUrlInFolder(u, p))
}
// Só o segmento `..` cru (sem código): o que o mutante do segmento precisa pegar sozinho.
const pastaSoPonto = (Sv) => !Sv.footageUrlInFolder(`${FOLDER}${EU}/../${OUTRO}/clip-9.mp4`, `${FOLDER}${EU}/`)
const pastaSoCodigo = (Sv) => !Sv.footageUrlInFolder(`${FOLDER}${EU}/%2e%2e/${OUTRO}/clip-9.mp4`, `${FOLDER}${EU}/`) && !Sv.footageUrlInFolder(`${FOLDER}${EU}/..%2F${OUTRO}/clip-9.mp4`, `${FOLDER}${EU}/`)
const donoRota = async (Sv) => {
  const rows = [
    { id: 'a', url: `${FOLDER}${EU}/clip-1.mp4`, kind: 'video' },
    { id: 'b', url: `${FOLDER}${EU}/../${OUTRO}/clip-9.mp4`, kind: 'video' },
    { id: 'c', url: `${FOLDER}${EU}/%2e%2e/${OUTRO}/foto.jpg`, kind: 'image' },
  ]
  const admin = { from: () => ({ select: () => ({ eq: () => ({ in: async () => ({ data: rows, error: null }) }) }) }) }
  const m = await Sv.ownedFootage(admin, EU, ['a', 'b', 'c'])
  return m.get('a')?.isVideo === true && !m.has('b') && !m.has('c')
}
await check('V1 SEGURANÇA: URL do user_footage com ../ (ou %2e, %2f, \\) apontando para a pasta de OUTRA conta é recusada — foto e vídeo; a legítima passa', () => pasta(SV))
await check('V1b ownedFootage (a rota /plan) descarta a linha com ../ que a própria conta gravou; a legítima continua vídeo', () => donoRota(SV))
const V1_SEG = "  if (rawPath.split('/').some((seg) => seg === '.' || seg === '..')) return false\n"
const V1_COD = "  if (/\\\\|%2e|%2f|%5c/i.test(raw)) return false\n"
// As duas camadas contra `..` (segmento cru recusado + pasta reconferida DEPOIS de normalizar) seguram sozinhas; o mutante
// tira as duas — tirar só uma continua verde de propósito (defesa em profundidade).
const V1_NORM = '  return `${u.origin}${u.pathname}`.startsWith(folder)\n'
await check('V1-mutante: sem a recusa do segmento .. e sem a reconferência normalizada fica vermelho', () => !pastaSoPonto(servidor(trocar(trocar(SRC.server, V1_SEG, ''), V1_NORM, '  return true\n'))))
await check('V1-mutante: sem a recusa do ponto/barra codificados fica vermelho', () => !pastaSoCodigo(servidor(trocar(SRC.server, V1_COD, ''))))
await check('V1-mutante: ownedFootage voltando ao startsWith puro fica vermelho', async () => !(await donoRota(servidor(trocar(SRC.server, '    if (!footageUrlInFolder(r.url, prefix)) continue', "    if (typeof r.url !== 'string' || !r.url.startsWith(prefix) || !/^https:\\/\\//i.test(r.url)) continue")))))

// MP4 mínimo: [primeira caixa] + moov{mvhd v0, timescale 1000, duration 12000} → 12 s.
const caixa = (type, body) => { const b = new Uint8Array(8 + body.length); new DataView(b.buffer).setUint32(0, b.length); for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i); b.set(body, 8); return b }
const junta = (...xs) => { const o = new Uint8Array(xs.reduce((n, x) => n + x.length, 0)); let k = 0; for (const x of xs) { o.set(x, k); k += x.length } return o }
const mvhd = (() => { const b = new Uint8Array(100); const dv = new DataView(b.buffer); dv.setUint32(12, 1000); dv.setUint32(16, 12000); return caixa('mvhd', b) })()
const MP4 = junta(caixa('ftyp', new Uint8Array(8)), caixa('moov', mvhd))
const DISFARCADO = junta(caixa('junk', new Uint8Array(8)), caixa('moov', mvhd)) // mede 12 s, mas não abre como MP4/MOV
const WEBM = junta(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0x1f]), new Uint8Array(64))
const mede = async (Sv, bytes) => {
  const velho = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
  try { return await Sv.measureFootageVideo('https://x/v.mp4') } finally { globalThis.fetch = velho }
}
const tipoPelosBytes = async (Sv) => (await mede(Sv, MP4)) === 12 && (await mede(Sv, DISFARCADO)) === null && (await mede(Sv, WEBM)) === null && Sv.isMp4OrMovHead(MP4) && !Sv.isMp4OrMovHead(WEBM)
await check('V2 o tipo do vídeo vem dos PRIMEIROS BYTES (ftyp/moov/wide…), não da coluna kind: MP4 mede 12 s; WebM e caixa estranha = null (plano B)', () => tipoPelosBytes(SV))
await check('V2-mutante: medição sem conferir os primeiros bytes fica vermelho', async () => !(await tipoPelosBytes(servidor(trocar(SRC.server, '    if (!isMp4OrMovHead(bytes)) return null\n', '')))))

// Teto diário: a recusa da medição (422) grava ads_v2_plan_served ANTES de responder — o mesmo evento que o teto conta.
const tetoMedicao = (src) => {
  const P = semComentarios(src)
  const corpo = P.slice(P.indexOf('const measureRefused'), P.indexOf('for (const [i, measured]'))
  return /\.eq\('name', 'ads_v2_plan_served'\)\.gte\('created_at', since\)/.test(P) && !/\.eq\('ok'|metadata->>ok/.test(P) &&
    ordem(corpo, "await writeServerEvent({ name: 'ads_v2_plan_served'", 'ok: false', "stage: 'video_measure'", 'return v2Fail(code, 422, { footage_id: footageId })') &&
    ['video_unreadable', 'video_too_short', 'video_too_long'].every((c) => new RegExp(`return measureRefused\\('${c}', v\\.footage_id`).test(P)) &&
    !/v2Fail\('video_(unreadable|too_short|too_long)'/.test(P)
}
await check('V3 DINHEIRO: vídeo que o /plan não consegue usar (422) CONTA no teto diário — antes baixava até 2 × 50 MB por chamada, sem limite', () => tetoMedicao(SRC.planRoute))
await check('V3-mutante: recusa da medição sem gravar o evento fica vermelho', () => !tetoMedicao(trocar(SRC.planRoute, "      await writeServerEvent({ name: 'ads_v2_plan_served', userId: user.id, path: '/api/ads/v2/plan', metadata: { order_id: order.id, ok: false, stage: 'video_measure'", "      void ({ name: 'x', userId: user.id, path: '/api/ads/v2/plan', metadata: { order_id: order.id, ok: false, stage: 'video_measure'")))

// Enquadramento: o foco tem o sentido da PRÉVIA (cropRect/focalPosition) — o centro do quadro no render é o centro da
// janela que a pessoa viu, em qualquer foco, horizontal e vertical alto.
const mesmoRecorte = (Mx) => {
  const pn = (s) => Number(String(s).replace('%', '')) / 100
  for (const [vw, vh] of [[1920, 1080], [1280, 720], [1080, 1080], [1080, 3000]]) {
    for (const f of [0, 0.1, 0.2, 0.33, 0.5, 0.75, 0.9, 1]) {
      const r = Mx.userVideoFrame(1080, 1920, vw, vh, f, f)
      const c = SC.cropRect(vw, vh, f, f)
      const alvoX = (c.sx + c.sw / 2) / vw, alvoY = (c.sy + c.sh / 2) / vh
      const x = pn(r.x), w = pn(r.width), y = pn(r.y), h = pn(r.height)
      const renderX = (0.5 - (x - w / 2)) / w, renderY = (0.5 - (y - h / 2)) / h
      if (Math.abs(renderX - alvoX) > 2e-4 || Math.abs(renderY - alvoY) > 2e-4) return false
    }
  }
  return true
}
await check('V4 MONTAGEM: o recorte do vídeo horizontal/alto no render é o MESMO da prévia (cropRect) em 8 focos × 4 formatos — antes errava até 182 px num 1920×1080', () => mesmoRecorte(M))
await check('V4-mutante: foco tratado como centro (a conta de antes) fica vermelho', () => !mesmoRecorte(pura(F.montage, trocar(SRC.montage, '    const cx = clamp01(focusX) * (1 - 1 / ew) + 1 / (2 * ew)\n', '    const cx = Math.min(1 - 1 / (2 * ew), Math.max(1 / (2 * ew), clamp01(focusX)))\n'))))

// Duração máxima: 10 min, igual nos lugares; acima disso nem o navegador nem o plano aceitam (numeric(6,3) no banco).
const teto = (L, Sx) => {
  let recusou = false
  try { Sx.planShots({ sector: 'real_estate', tier: 'commercial', photos: FOTOS.slice(0, 3), seconds: 15, videos: [VIDEO(1, { seconds: 1200 })] }) } catch (e) { recusou = /too_long/.test(e.message) }
  return L.userVideoVerdict({ ...IMOVEL, seconds: 600 }) === 'video' && L.userVideoVerdict({ ...IMOVEL, seconds: 600.5 }) === 'too_long' && L.userVideoVerdict({ ...IMOVEL, seconds: 1000 }) === 'too_long' &&
    L.ADS_V2_USER_VIDEO_MAX_SECONDS === Sx.ADS_V2_PLAN_VIDEO_MAX_SECONDS && L.ADS_V2_USER_VIDEO_MAX_SECONDS === SL.ADS_V2_SIMPLE_VIDEO_MAX_SECONDS && L.ADS_V2_USER_VIDEO_MAX_SECONDS < 1000 && recusou
}
await check('V5 vídeo de mais de 10 min: navegador = too_long, plano recusa, /plan = 422 video_too_long (vira plano B nas duas telas); teto < 1000 s (numeric(6,3))', () =>
  teto(UV, S) && /if \(measured > ADS_V2_PLAN_VIDEO_MAX_SECONDS\) return measureRefused\('video_too_long'/.test(PLAN) &&
  [SIMPLE, CLIENT].every((x) => /const VIDEO_TO_PHOTOS_CODES: readonly string\[\] = \[[^\]]*'video_too_long'/.test(x)) &&
  /seconds: ADS_V2_USER_VIDEO_MIN_SECONDS, width: 1, height: 1, videosAlready/.test(SIMPLE) &&
  ['pt', 'es'].every((l) => SL.simpleErrorMessage('video_too_long', l) !== SL.ADS_V2_SIMPLE_ERRORS[l].default) && /10 minutes/.test(SC.adsV2ErrorMessage('video_too_long')))
await check('V5-mutante: teto de duração furado no navegador fica vermelho', () => !teto(pura(F.userVideo, trocar(SRC.userVideo, 'export const ADS_V2_USER_VIDEO_MAX_SECONDS = 600', 'export const ADS_V2_USER_VIDEO_MAX_SECONDS = 1e9')), S))
await check('V5-mutante: teto de duração furado no plano fica vermelho', () => !teto(UV, pura(F.shots, trocar(SRC.shots, '    if (v.seconds > ADS_V2_PLAN_VIDEO_MAX_SECONDS) throw new Error(`ads_v2_video_too_long:${v.id}`)\n', ''))))

// Modo completo também troca por fotos (buraco do guardião: o T3 só olhava o simples).
const trocaNoCompleto = (src) => /if \(VIDEO_TO_PHOTOS_CODES\.includes\(r\.code\)\) void videoBackToPhotos\(typeof r\.body\.footage_id === 'string' \? r\.body\.footage_id : null\)/.test(semComentarios(src)) &&
  /async function videoBackToPhotos\(footageId: string \| null, byKey\?: string, why\?: string\)/.test(src)
await check('V6 completo: recusa do /plan (422) troca ESSE vídeo por fotos, como no simples', () => trocaNoCompleto(SRC.client))
await check('V6-mutante: completo sem a troca por fotos fica vermelho', () => !trocaNoCompleto(trocar(SRC.client, 'if (VIDEO_TO_PHOTOS_CODES.includes(r.code)) void videoBackToPhotos(', 'if (VIDEO_TO_PHOTOS_CODES.includes(r.code)) void String(')))

// Limite de 2 vídeos com seleções seguidas: uma seleção por vez (a 2ª espera, com aviso), contagem pela referência
// fresca, e o que passar de 2 vira fotos ANTES de subir (e também se o /plan responder too_many_videos).
const umaSelecao = (simple, client) => {
  const S1 = semComentarios(simple), C1 = semComentarios(client)
  return ordem(S1, 'async function addFiles(', 'if (addingRef.current) {', 'setFileNote(copy.files.waitAdding)', 'addingRef.current = true', 'await addFilesNow(list)', 'addingRef.current = false') &&
    /let videosAlready = itemsRef\.current\.filter\(\(p\) => p\.video\)\.length/.test(S1) &&
    ordem(S1, 'async function planAd()', 'if (await videosPastLimitToFrames()) return', 'await ensureItemsUploaded()') && /if \(r\.code === 'too_many_videos'\) void videosPastLimitToFrames\(\)/.test(S1) &&
    /\.filter\(\(p\) => p\.video\)\.slice\(ADS_V2_MAX_USER_VIDEOS\)/.test(S1) &&
    ordem(C1, 'async function addPhotos(', 'if (addingRef.current) {', 'addingRef.current = true', 'await addPhotosNow(list)', 'addingRef.current = false') &&
    /const photos = photosRef\.current\n/.test(C1) && ordem(C1, 'async function planAd()', 'if (await videosPastLimitToPhotos()) return', 'await ensurePhotosUploaded()') &&
    /if \(r\.code === 'too_many_videos'\) void videosPastLimitToPhotos\(\)/.test(C1) && /\.filter\(\(p\) => p\.video\)\.slice\(ADS_V2_PLAN_MAX_VIDEOS\)/.test(C1) &&
    ['en', 'pt', 'es'].every((l) => typeof SL.ADS_V2_SIMPLE_COPY[l].files.waitAdding === 'string' && SL.ADS_V2_SIMPLE_COPY[l].files.waitAdding.length > 20)
}
await check('V7 2 vídeos no máximo mesmo com seleções seguidas: uma seleção por vez, contagem fresca, excesso vira fotos antes de subir (simples e completo)', () => umaSelecao(SRC.simple, SRC.client))
await check('V7-mutante: simples sem a trava de uma seleção por vez fica vermelho', () => !umaSelecao(trocar(SRC.simple, '    if (addingRef.current) {\n      setFileNote(copy.files.waitAdding)', '    if (false) {\n      setFileNote(copy.files.waitAdding)'), SRC.client))
await check('V7-mutante: planejar sem converter o 3º vídeo fica vermelho', () => !umaSelecao(trocar(SRC.simple, '      if (await videosPastLimitToFrames()) return\n', ''), SRC.client))

console.log(`test-ads-video-do-cliente-2026-09-29: ${ok} verdes, ${falhas.length} vermelhos`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
process.exit(0)
