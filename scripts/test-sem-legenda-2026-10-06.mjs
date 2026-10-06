// KINEO-SEM-LEGENDA-2026-10-06 — guardião do "filme só com a voz" (versão B do teste A/B de retenção, fundador 06/10:
// "vai sem legenda, pode montar o teste").
//
// O que prova, EXECUTANDO o código real (readFileSync + ts.transpileModule, sem alias @/; cada import é entregue à mão):
//   1) lib/semLegenda: a decisão (interna + captions:false = B; cliente = ignorado; Studio Ads = como desde 26/09), o
//      corte (sai texto das trilhas 5/7/11; ficam voz, música, clipes, formas, marca d'água 9 e logo 10), o RenderScript
//      guardado, a validação e a avaliação do pedido B (outra conta = recusa).
//   2) /api/compose: as LINHAS REAIS da rota (decisão + logo + gancho + filtro do Studio Ads + corte), recortadas do
//      arquivo e executadas com o gancho real de lib/hookFirstFrame: interna + captions:false → nenhum texto de legenda
//      ou de título no RenderScript; cliente com captions:false → byte a byte o filme de hoje + evento de servidor.
//   3) lib/semLegendaServer: conta interna grava a versão (A/B) e o RenderScript B; cliente não grava nada.
//   4) /api/admin/recompose-sem-legenda: a rota inteira, com banco/Creatomate/armazenamento falsos — recusa vídeo de
//      outra conta, recusa cliente, explica o que falta num filme antigo, envia UMA montagem sem legenda, nunca toca
//      débito/intenção de cobrança e cria a linha B com credits_used 0 e os eventos film_variant A e B.
//   5) Trava 8.2: lib/compose.ts byte a byte a base; /api/compose sem as linhas marcadas = base (só linhas novas, marcadas).
//   6) Mutantes: cada âncora acima derrubada uma a uma fica vermelha.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const nodeCrypto = require('node:crypto')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const MARCA = 'KINEO-SEM-LEGENDA-2026-10-06'

function load(src, deps = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, (p) => {
    if (Object.prototype.hasOwnProperty.call(deps, p)) return deps[p]
    throw new Error('import inesperado: ' + p)
  })
  return mod.exports
}
async function quieto(fn) {
  const { log, warn } = console
  console.log = () => {}
  console.warn = () => {}
  try { return await fn() } finally { console.log = log; console.warn = warn }
}

const SRC_LIB = read('lib/semLegenda.ts')
const SRC_GLUE = read('lib/semLegendaServer.ts')
const ROTA = 'app/api/compose/route.ts'
const SRC_ROTA = read(ROTA)
const ROTA_B = 'app/api/admin/recompose-sem-legenda/route.ts'
const SRC_B = read(ROTA_B)
const H = load(read('lib/hookFirstFrame.ts'))
const I = load(read('lib/internalAccounts.ts'))
const S0 = load(SRC_LIB)

// ── Um RenderScript como o do montador (lib/compose) em 9:16 ──────────────────────────────────────────────────────────
const RECT = 'M 0 0 L 100 0 L 100 100 L 0 100 L 0 0 Z'
const NARRACAO = 'In April 1815, Mount Tambora exploded with a roar heard two thousand kilometers away. The sky went dark for days.'
const VOZ = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/voiceovers/vo-e92d81bf-1759744533000.mp3'
const MUSICA = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/music/tambora.mp3'
const CLIPES = ['https://v3b.fal.media/files/k/c1.mp4', 'https://v3b.fal.media/files/k/c2.mp4', 'https://v3b.fal.media/files/k/c3.mp4']
const LOGO = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/avatars/u/brand-logo.png?v=1'
const legenda = (time, dur, palavras, hook) => palavras.map((_, i) => ({
  type: 'text', track: 5, time: Math.round((time + (dur / palavras.length) * i) * 1000) / 1000, duration: Math.round((dur / palavras.length) * 1000) / 1000,
  text: palavras.map((w, j) => (j === i ? `[color #FFD700]${w}[/color]` : w)).join(' '),
  x: '50%', y: '78%', y_anchor: '100%', width: '78%', font_family: 'Montserrat', font_size: hook ? 76 : 62, font_weight: '800', line_height: '105%',
  fill_color: '#ffffff', stroke_color: 'rgba(0,0,0,0.98)', stroke_width: 3, background_color: 'rgba(0,0,0,0.60)', background_x_padding: '3%', background_y_padding: '2%', border_radius: 10,
  ...(i === 0 ? { enter_transition: { type: 'pop', duration: hook ? 0.25 : 0.08 } } : {}),
}))
function fonteClassica(duration = 40) {
  const forma = (track, fill, extra = {}) => ({ type: 'shape', track, time: 0, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: RECT, fill_color: fill, ...extra })
  return {
    output_format: 'mp4', width: 1080, height: 1920, frame_rate: 30, duration,
    elements: [
      forma(1, '#000000'),
      { type: 'video', track: 2, time: 0, duration: 4.06, source: CLIPES[0], fit: 'cover', trim_start: 0.1, loop: true, enter_transition: { type: 'fade', duration: 0.5 } },
      { type: 'video', track: 2, time: 4, duration: 4.31, source: CLIPES[1], fit: 'cover', trim_start: 0.1, loop: true },
      { type: 'video', track: 2, time: 8, duration: 32.06, source: CLIPES[2], fit: 'cover', trim_start: 0.1, loop: true },
      forma(3, 'rgba(0,0,0,0.14)'),
      forma(3, 'rgba(8,14,40,0.08)', { blend_mode: 'multiply' }),
      { type: 'shape', track: 6, time: 0, duration, x: '50%', y: '3%', width: '100%', height: '6%', path: RECT, fill_color: '#000000' },
      { type: 'shape', track: 6, time: 0, duration, x: '50%', y: '97%', width: '100%', height: '6%', path: RECT, fill_color: '#000000' },
      forma(3, 'rgba(120,150,255,0.05)', { blend_mode: 'screen' }),
      { type: 'audio', track: 4, time: 0, duration, source: VOZ, volume: '100%' },
      ...legenda(0, 1.6, ['IN', 'APRIL', '1815,'], true),
      ...legenda(1.6, 1.9, ['MOUNT', 'TAMBORA', 'EXPLODED'], true),
      ...legenda(3.5, 2.2, ['WITH', 'A', 'ROAR', 'HEARD'], false),
      ...legenda(5.7, 2.4, ['TWO', 'THOUSAND', 'KILOMETERS', 'AWAY.'], false),
      { type: 'audio', track: 8, time: 0, duration, source: MUSICA, volume: '12%', loop: true, audio_fade_in: 0.8, audio_fade_out: 1.2 },
      { type: 'text', track: 9, time: 0, duration, text: 'usekineo.com/free', x: '50%', y: '5%', width: '80%', font_family: 'Montserrat', font_size: 40, font_weight: '700', fill_color: 'rgba(255,255,255,0.92)', stroke_color: 'rgba(0,0,0,0.35)', stroke_width: 1, background_color: 'rgba(13,13,20,0.55)' },
    ],
  }
}
function fonteHollywood(duration = 46) {
  return {
    output_format: 'mp4', width: 1080, height: 1920, frame_rate: 30, duration,
    elements: [
      { type: 'shape', track: 1, time: 0, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: RECT, fill_color: '#000000' },
      ...CLIPES.map((source, i) => ({ type: 'video', track: 2, time: i * 15, duration: i === 2 ? 16.06 : 15.25, source, fit: 'cover', loop: true, x: '50%', y: '50%', width: '100%', height: '100%', volume: '0%', ...(i > 0 ? { enter_transition: { type: 'fade', duration: 0.25 } } : {}) })),
      { type: 'shape', track: 3, time: 0, duration, x: '50%', y: '50%', width: '100%', height: '100%', path: RECT, fill_color: 'rgba(0,0,0,0.14)' },
      { type: 'audio', track: 4, time: 0, duration: 13.2, source: VOZ, volume: '100%' },
      ...legenda(0, 2.4, ['IN', 'APRIL', '1815,', 'MOUNT'], false),
      { type: 'audio', track: 4, time: 15, duration: 12.8, source: VOZ.replace('.mp3', '-2.mp3'), volume: '100%' },
      ...legenda(15, 2.2, ['THE', 'SKY', 'WENT', 'DARK'], false),
      { type: 'audio', track: 8, time: 0, duration, source: MUSICA, volume: '7%', loop: true, audio_fade_in: 1.2, audio_fade_out: 2 },
      { type: 'text', track: 9, time: 0, duration, text: 'usekineo.com/free', x: '50%', y: '5%', width: '80%', font_family: 'Montserrat', font_size: 40, font_weight: '700', fill_color: 'rgba(255,255,255,0.92)', stroke_color: 'rgba(0,0,0,0.35)', stroke_width: 1, background_color: 'rgba(13,13,20,0.55)' },
    ],
  }
}
const logoEl = (duration) => ({ type: 'image', track: 10, time: 0, duration, source: LOGO, x: '14%', y: '15%', width: '20%', height: '8%', fit: 'contain' })
const textos = (s, tracks) => (s?.elements ?? []).filter((e) => e && e.type === 'text' && tracks.includes(Number(e.track))).length
const foraDoTexto = (s) => (s?.elements ?? []).filter((e) => !(e && e.type === 'text' && [5, 7, 11].includes(Number(e.track))))
const J = (x) => JSON.stringify(x)

// ═══ 1) lib/semLegenda ═══════════════════════════════════════════════════════════════════════════════════════════════
function problemasLib(S) {
  const p = []
  const d = (captions, interna, studioAds) => S.decidirLegenda({ captions, interna, studioAds })
  const dB = d(false, true, false)
  if (!(dB.tirarLegenda === true && dB.tirarGancho === true && dB.motivo === 'interna' && dB.versao === 'B')) p.push('interna + captions:false não vira B')
  const dCli = d(false, false, false)
  if (!(dCli.tirarLegenda === false && dCli.tirarGancho === false && dCli.motivo === 'ignorado_cliente' && dCli.versao === null)) p.push('cliente + captions:false não é ignorado')
  const dAds = d(false, false, true)
  if (!(dAds.tirarLegenda === true && dAds.tirarGancho === false && dAds.motivo === 'studio_ads' && dAds.versao === null)) p.push('Studio Ads deixou de tirar a legenda (ou virou versão do teste)')
  const dA = d(undefined, true, false)
  if (!(dA.tirarLegenda === false && dA.tirarGancho === false && dA.motivo === 'nao_pedido' && dA.versao === 'A')) p.push('interna sem pedido não é a versão A')
  const dCliA = d(undefined, false, false)
  if (!(dCliA.tirarLegenda === false && dCliA.tirarGancho === false && dCliA.motivo === 'nao_pedido' && dCliA.versao === null)) p.push('cliente sem pedido mudou')
  for (const v of ['false', 0, null, '', 'no', true]) {
    const x = d(v, true, false)
    if (x.tirarLegenda || x.tirarGancho || x.versao !== 'A') p.push(`captions=${J(v)} virou pedido de "sem legenda"`)
  }

  // o corte, sobre um source com o gancho REAL (lib/hookFirstFrame, conta interna)
  const fonteA = fonteClassica()
  fonteA.elements.push(logoEl(fonteA.duration))
  const g = H.withHookFirstFrame(fonteA, { interna: true, narration: NARRACAO, font: 'Montserrat' })
  if (!g.applied || textos(fonteA, [11]) !== 1) p.push('fixture: o gancho real não entrou na trilha 11')
  const antes = J(fonteA)
  const r = S.tirarLegendaEGancho(fonteA)
  if (J(fonteA) !== antes) p.push('tirarLegendaEGancho mexeu no source recebido')
  if (textos(r.source, [5, 7, 11]) !== 0) p.push('versão B ainda tem legenda/gancho')
  const txtB = (r.source.elements ?? []).filter((e) => e.type === 'text')
  if (!(txtB.length === 1 && Number(txtB[0].track) === 9 && txtB[0].text === 'usekineo.com/free')) p.push("versão B perdeu a marca d'água (ou ficou outro texto)")
  if (!(r.source.elements ?? []).some((e) => e.type === 'image' && Number(e.track) === 10)) p.push('versão B perdeu o logo')
  if (J(foraDoTexto(r.source)) !== J(foraDoTexto(fonteA))) p.push('versão B mudou voz/música/clipes/cortes/formas')
  for (const k of ['output_format', 'width', 'height', 'frame_rate', 'duration']) if (r.source[k] !== fonteA[k]) p.push('versão B mudou ' + k)
  if (r.legendas !== textos(fonteA, [5, 7]) || r.gancho !== 1) p.push(`contagem do corte errada (${r.legendas}/${r.gancho})`)
  const soLeg = S.tirarLegendaEGancho(fonteA, { legenda: true, gancho: false })
  if (textos(soLeg.source, [5, 7]) !== 0 || textos(soLeg.source, [11]) !== 1) p.push('opção "só legenda" tirou o gancho ou deixou legenda')
  const soGan = S.tirarLegendaEGancho(fonteA, { legenda: false, gancho: true })
  if (textos(soGan.source, [5]) === 0 || textos(soGan.source, [11]) !== 0) p.push('opção "só gancho" errada')
  const mix = { duration: 5, elements: [{ type: 'text', track: 7, text: 'X' }, { type: 'image', track: 11, source: 'https://x/a.png' }, { type: 'text', track: 9, text: 'w' }, { type: 'text', track: '5', text: 'Y' }, null] }
  const rm = S.tirarLegendaEGancho(mix)
  if (!(rm.source.elements.length === 3 && rm.source.elements.some((e) => e && e.type === 'image' && e.track === 11) && rm.legendas === 2)) p.push('corte: trilha 7 / trilha "5" em texto / imagem na 11 tratados errado')
  const semEls = { duration: 3 }
  if (S.tirarLegendaEGancho(semEls).source !== semEls) p.push('source sem elements deveria voltar como veio')

  // o RenderScript B guardado
  const fb = S.fonteVersaoB({ ...fonteA, snapshot_time: 2 })
  if (fb.motivo !== 'ok' || !fb.fonte) p.push('fonteVersaoB recusou um source normal')
  else {
    if ('snapshot_time' in fb.fonte) p.push('fonteVersaoB guardou snapshot_time (o envio pede a capa de novo)')
    if (J(fb.fonte.elements) !== J(r.source.elements)) p.push('RenderScript guardado difere da versão B')
    if (!(fb.legendas === r.legendas && fb.gancho === 1 && fb.elementos === r.source.elements.length && fb.chars === J(fb.fonte).length)) p.push('fonteVersaoB: contagens erradas')
  }
  const gordo = { ...fonteA, elements: [...fonteA.elements, { type: 'video', track: 2, time: 0, duration: 1, source: 'https://x/' + 'a'.repeat(S.FONTE_B_MAX_CHARS) }] }
  const fg = S.fonteVersaoB(gordo)
  if (!(fg.fonte === null && fg.motivo === 'grande_demais')) p.push('RenderScript gigante foi aceito')
  if (S.fonteVersaoB({ duration: 3, elements: [{ type: 'text', track: 5, text: 'SÓ LEGENDA' }] }).motivo !== 'sem_elementos') p.push('source só de legenda virou fonte B')

  // validação e avaliação do pedido B
  const v0 = S.validarFonteB(undefined)
  if (v0.ok || v0.falta.length !== S.FALTA_FILME_ANTIGO.length || !v0.falta.some((f) => /RenderScript/.test(f)) || !v0.falta.some((f) => /mp3 da narra/.test(f))) p.push('filme antigo sem a lista do que falta')
  if (fb.fonte) {
    const v1 = S.validarFonteB(fb.fonte)
    if (!v1.ok) p.push('validarFonteB recusou a fonte guardada: ' + v1.falta.join('; '))
    else {
      const esperadas = [...CLIPES, VOZ, MUSICA, LOGO]
      if (!(v1.urls.length === esperadas.length && esperadas.every((u) => v1.urls.includes(u)))) p.push('urlsDaFonte não listou clipes/voz/música/logo sem repetir')
      if (textos(v1.fonte, [5, 7, 11]) !== 0) p.push('validarFonteB devolveu texto de legenda/gancho')
    }
    const suja = S.validarFonteB(fonteA)
    if (!suja.ok || textos(suja.fonte, [5, 7, 11]) !== 0) p.push('validarFonteB não retirou legenda de uma fonte suja')
    const ruins = [
      ['sem elements', { ...fb.fonte, elements: [] }], ['duração 0', { ...fb.fonte, duration: 0 }], ['sem largura', { ...fb.fonte, width: 0 }],
      ['sem clipes', { ...fb.fonte, elements: fb.fonte.elements.filter((e) => e.type !== 'video' && e.type !== 'image') }],
      ['mídia http', { ...fb.fonte, elements: [...fb.fonte.elements, { type: 'audio', track: 4, source: 'http://inseguro/x.mp3' }] }],
      ['texto', 'texto'], ['lista', []],
    ]
    for (const [nome, f] of ruins) if (S.validarFonteB(f).ok) p.push('validarFonteB aceitou fonte ruim: ' + nome)
  }
  const dono = 'u-dono'
  const vid = { id: 'v-1', user_id: dono, status: 'completed', render_id: 'r-1', title: 'Tambora' }
  const av = (o) => S.avaliarPedidoB({ userId: dono, interna: true, video: vid, fonte: fb.fonte, ...o })
  const espera = (nome, r, status, motivo) => { if (r.ok || r.status !== status || r.motivo !== motivo) p.push(`avaliarPedidoB ${nome}: esperado ${status}/${motivo}, veio ${J(r)}`) }
  if (!av({}).ok) p.push('avaliarPedidoB recusou o pedido certo: ' + J(av({})))
  espera('sem login', av({ userId: null }), 401, 'sem_login')
  espera('cliente', av({ interna: false }), 403, 'so_conta_interna')
  espera('cliente com vídeo de outra conta', av({ interna: false, video: { ...vid, user_id: 'outra' } }), 403, 'so_conta_interna')
  espera('vídeo inexistente', av({ video: null }), 404, 'video_nao_encontrado')
  espera('vídeo de outra conta', av({ video: { ...vid, user_id: 'outra' } }), 403, 'video_de_outra_conta')
  espera('vídeo sem dono', av({ video: { ...vid, user_id: null } }), 403, 'video_de_outra_conta')
  espera('vídeo não concluído', av({ video: { ...vid, status: 'rendering' } }), 409, 'video_nao_concluido')
  espera('vídeo sem render', av({ video: { ...vid, render_id: '' } }), 409, 'video_sem_render')
  espera('B de um B', av({ video: { ...vid, title: S.TITULO_B_PREFIXO + 'Tambora' } }), 409, 'ja_e_versao_b')
  const semFonte = av({ fonte: undefined })
  espera('filme antigo', semFonte, 409, 'sem_fonte')
  if (!(semFonte.falta && semFonte.falta.length === S.FALTA_FILME_ANTIGO.length)) p.push('filme antigo: a recusa não diz o que falta')
  if (S.tituloVersaoB('Tambora') !== '[B sem legenda] Tambora') p.push('título B errado')
  if (S.tituloVersaoB('[B sem legenda] Tambora') !== '[B sem legenda] Tambora') p.push('título B dobra o prefixo')
  if (S.tituloVersaoB('') !== '[B sem legenda] Untitled Short' || S.tituloVersaoB('x'.repeat(300)).length !== 140) p.push('título B sem nome ou sem teto')
  const mv = S.metadadosVersao({ variant: 'B', videoId: 'vb', original: 'va', renderId: 'rb', generationId: null, via: 'recompose' })
  if (!(mv.variant === 'B' && mv.video_id === 'vb' && mv.original === 'va' && mv.render_id === 'rb' && mv.marca === MARCA)) p.push('metadadosVersao sem variant/video_id/original/render_id')
  return p
}

// ═══ 2) /api/compose — as linhas REAIS da rota, executadas ═══════════════════════════════════════════════════════════
function harnessRota(rota) {
  const L = rota.split('\n')
  const find = (s, from = 0) => L.findIndex((l, i) => i >= from && l.includes(s))
  const iCtx = find('composeCtx.userId = authenticatedUserId')
  const iKey = find('const submissionKey = `${authenticatedUserId}:${generationId}`', Math.max(iCtx, 0))
  const iClLogo = find('withBrandLogo(source, await findBrandLogoUrl(')
  const iStep5 = find('// Step 5 — Submit to Creatomate', Math.max(iClLogo, 0))
  const iHwLogo = find('withBrandLogo(hollywoodSource, await findBrandLogoUrl(')
  const iHwSubmit = find('// Submit once per authenticated generation', Math.max(iHwLogo, 0))
  if ([iCtx, iKey, iClLogo, iStep5, iHwLogo, iHwSubmit].some((i) => i < 0)) throw new Error('âncora da rota sumiu')
  const decisao = L.slice(iCtx + 1, iKey).join('\n')
  const classico = L.slice(iClLogo, iStep5).join('\n')
  const hollywood = L.slice(iHwLogo, iHwSubmit).join('\n')
  const src = `
export async function classico(d: any, body: any, user: any, isServiceFinish: boolean, fonte: any) {
  const { decidirLegenda, tirarLegendaEGancho, isInternalEmail, registrarSemLegendaIgnorado, registrarVersaoDaCasa, withBrandLogo, findBrandLogoUrl, withHookFirstFrame, captionFontFor, isAdCaptionStyle, captionStyleOverrides, isCaptionElement } = d
  const authenticatedUserId = user.id
  const generationId = 'gen-sem-legenda-classico'
  const quality = 'fast'
  const composeAdmin = null
  const scaledScript = d.narracao
  const avatarMode = false
  const language = 'en'
  let source: Record<string, unknown> = fonte
${decisao}
${classico}
  return { source, body, semLegenda }
}
export async function hollywood(d: any, body: any, user: any, isServiceFinish: boolean, fonte: any) {
  const { decidirLegenda, tirarLegendaEGancho, isInternalEmail, registrarSemLegendaIgnorado, registrarVersaoDaCasa, withBrandLogo, findBrandLogoUrl, withHookFirstFrame, hookNarration, captionFontFor } = d
  const authenticatedUserId = user.id
  const generationId = 'gen-sem-legenda-hollywood'
  const quality = 'cinematic_s25'
  const composeAdmin = null
  const narrationBlocks = d.blocos
  const voiceoverScript = d.narracao
  const language = 'en'
  let hollywoodSource: Record<string, unknown> = fonte
${decisao}
${hollywood}
  return { source: hollywoodSource, body, semLegenda }
}
`
  return load(src)
}
const INTERNA = { id: 'u-casa', email: 'josephsskaf@gmail.com' }
const CLIENTE = { id: 'u-cliente', email: 'maria.cliente@example.com' }
function depsRota(S, spy, logo) {
  return {
    decidirLegenda: S.decidirLegenda,
    tirarLegendaEGancho: S.tirarLegendaEGancho,
    isInternalEmail: I.isInternalEmail,
    registrarSemLegendaIgnorado: async (a) => { spy.push(a); return true },
    registrarVersaoDaCasa: async () => { throw new Error('a gravação da versão não mora no trecho antes do envio') },
    withBrandLogo: (src, url) => { if (url) src.elements.push(logoEl(src.duration)); return src },
    findBrandLogoUrl: async () => logo,
    withHookFirstFrame: H.withHookFirstFrame,
    hookNarration: H.hookNarration,
    captionFontFor: () => 'Montserrat',
    isAdCaptionStyle: (s) => s === 'clean',
    captionStyleOverrides: () => ({ fill_color: '#00ff00' }),
    isCaptionElement: (e) => !!e && e.type === 'text' && [5, 7].includes(Number(e.track)),
    narracao: NARRACAO,
    blocos: [{ time: 0, text: NARRACAO }, { time: 15, text: 'The sky went dark for days.' }],
  }
}
async function problemasRota(rota, S) {
  const p = []
  let R
  try { R = harnessRota(rota) } catch (e) { return ['rota: ' + e.message] }
  const run = async (fn, user, body, isServiceFinish, fixture) => {
    const spy = []
    const out = await quieto(() => R[fn](depsRota(S, spy, LOGO), { ...body }, user, isServiceFinish, fixture()))
    return { ...out, spy }
  }
  try {
    // ── clássico (Kineo 1 / Seedance / Kling 2.5 / Veo) ──
    const cB = await run('classico', INTERNA, { captions: false }, false, fonteClassica)
    if (textos(cB.source, [5, 7, 11]) !== 0) p.push('clássico: interna + captions:false ainda tem legenda/título')
    if (textos(cB.source, [9]) !== 1 || !cB.source.elements.some((e) => e.type === 'image' && e.track === 10)) p.push("clássico B: marca d'água ou logo sumiu")
    if (cB.spy.length !== 0) p.push('clássico B: conta interna caiu no "ignorado"')
    const cA = await run('classico', INTERNA, {}, false, fonteClassica)
    if (textos(cA.source, [5]) !== textos(fonteClassica(), [5]) || textos(cA.source, [11]) !== 1) p.push('clássico A (interna, sem pedido): legenda e gancho deveriam continuar')
    if (J(foraDoTexto(cA.source)) !== J(foraDoTexto(cB.source))) p.push('clássico: A e B diferem fora do texto (voz/música/cortes/logo/marca)')
    const cCliF = await run('classico', CLIENTE, { captions: false }, false, fonteClassica)
    const cCli = await run('classico', CLIENTE, {}, false, fonteClassica)
    const hoje = fonteClassica()
    hoje.elements.push(logoEl(hoje.duration))
    if (J(cCli.source) !== J(hoje)) p.push('clássico: o filme do cliente sem pedido mudou')
    if (J(cCliF.source) !== J(hoje)) p.push('clássico: cliente com captions:false não saiu igual a hoje')
    if (cCliF.spy.length !== 1 || cCliF.spy[0].userId !== CLIENTE.id || cCliF.spy[0].generationId !== 'gen-sem-legenda-classico') p.push('clássico: cliente ignorado sem evento de servidor')
    if ('captions' in cCliF.body) p.push('clássico: o captions:false do cliente seguiu no corpo')
    if (cCli.spy.length !== 0) p.push('clássico: cliente sem pedido gerou evento')
    const cAds = await run('classico', CLIENTE, { captions: false, narration_source: 'tts' }, true, fonteClassica)
    if (textos(cAds.source, [5, 7]) !== 0 || textos(cAds.source, [9]) !== 1 || cAds.spy.length !== 0) p.push('clássico: Studio Ads (modo serviço) deixou de sair sem legenda como desde 26/09')
    const cAdsSemCookie = await run('classico', CLIENTE, { captions: false, narration_source: 'tts' }, false, fonteClassica)
    if (J(cAdsSemCookie.source) !== J(hoje) || cAdsSemCookie.spy.length !== 1) p.push('clássico: narration_source sem o modo serviço furou o portão')
    // ── hollywood (Kling 3 / H3 / Omni / S25) ──
    const hB = await run('hollywood', INTERNA, { captions: false }, false, fonteHollywood)
    if (textos(hB.source, [5, 7, 11]) !== 0) p.push('hollywood: interna + captions:false ainda tem legenda/título')
    if (textos(hB.source, [9]) !== 1 || hB.source.elements.filter((e) => e.type === 'audio' && e.track === 4).length !== 2) p.push("hollywood B: marca d'água ou narração mudou")
    const hA = await run('hollywood', INTERNA, {}, false, fonteHollywood)
    if (textos(hA.source, [5]) === 0 || textos(hA.source, [11]) !== 1) p.push('hollywood A: legenda e gancho deveriam continuar')
    if (J(foraDoTexto(hA.source)) !== J(foraDoTexto(hB.source))) p.push('hollywood: A e B diferem fora do texto')
    const hCliF = await run('hollywood', CLIENTE, { captions: false }, false, fonteHollywood)
    const hCli = await run('hollywood', CLIENTE, {}, false, fonteHollywood)
    const hojeH = fonteHollywood()
    hojeH.elements.push(logoEl(hojeH.duration))
    if (J(hCliF.source) !== J(hojeH) || J(hCli.source) !== J(hojeH)) p.push('hollywood: cliente (com ou sem captions:false) não saiu igual a hoje')
    if (hCliF.spy.length !== 1) p.push('hollywood: cliente ignorado sem evento de servidor')
  } catch (e) {
    p.push('rota: execução quebrou — ' + (e && e.message))
  }
  return p
}
function problemasRotaEstatica(rota) {
  const p = []
  const marcadas = rota.split('\n').filter((l) => l.includes(MARCA))
  if (!marcadas.some((l) => l.includes("from '@/lib/semLegenda'")) || !marcadas.some((l) => l.includes("from '@/lib/semLegendaServer'"))) p.push('rota: imports marcados ausentes')
  const iDec = rota.indexOf('const semLegenda = decidirLegenda({ captions: body.captions, interna: isInternalEmail(user.email), studioAds: isServiceFinish && body.narration_source === \'tts\' })')
  if (iDec < 0) p.push('rota: a decisão não usa captions do corpo + isInternalEmail(user.email) + modo serviço do Studio Ads')
  if (!(iDec > 0 && iDec < rota.indexOf('if (body.captions === false) {') && iDec < rota.indexOf("if (quality === 'cinematic_hollywood' || quality === 'cinematic_h3'"))) p.push('rota: a decisão não vem antes dos dois caminhos')
  const hw = rota.indexOf('await registrarVersaoDaCasa({ userId: authenticatedUserId, generationId, renderId: hollywoodRenderId, quality, decisao: semLegenda, source: hollywoodSource })')
  if (!(hw > rota.indexOf('const hollywoodClaimStored = await completeGenerationClaim(hollywoodRenderId, hollywoodCost)') && hw < rota.indexOf("voiceover_url: narrationBlocks[0]?.url ?? '',"))) p.push('hollywood: a versão/RenderScript B não é gravada depois do claim e antes da resposta')
  const cl = rota.indexOf('await registrarVersaoDaCasa({ userId: authenticatedUserId, generationId, renderId, quality, decisao: semLegenda, source })')
  if (!(cl > rota.indexOf('const claimStored = await completeGenerationClaim(renderId, intendedCost)') && cl < rota.indexOf('await checkCreatomateQuota(composeAdmin)'))) p.push('clássico: a versão/RenderScript B não é gravada depois do claim e antes da resposta')
  const hwStrip = rota.indexOf('tirarLegendaEGancho(hollywoodSource,')
  if (!(hwStrip > rota.indexOf('withHookFirstFrame(hollywoodSource,') && hwStrip < rota.indexOf('submitCreatomateOnce(hollywoodSource'))) p.push('hollywood: o corte não fica entre o gancho e o envio')
  const clStrip = rota.indexOf('tirarLegendaEGancho(source,')
  if (!(clStrip > rota.indexOf('if (body.captions === false) {') && clStrip < rota.indexOf('submitCreatomateOnce(source'))) p.push('clássico: o corte não fica entre o filtro do Studio Ads e o envio')
  for (const proibido of ['debitVideoCredits', 'debit_video_credits']) if (marcadas.some((l) => l.includes(proibido))) p.push('rota: linha marcada mexe em débito')
  return p
}

// ═══ 3) lib/semLegendaServer ═════════════════════════════════════════════════════════════════════════════════════════
async function problemasGlue(src, S) {
  const p = []
  const evs = []
  let G
  try { G = load(src, { '@/lib/serverEvents': { writeServerEvent: async (e) => { evs.push(e); return true } }, '@/lib/semLegenda': S }) } catch (e) { return ['glue: ' + e.message] }
  const fonteA = fonteClassica()
  H.withHookFirstFrame(fonteA, { interna: true, narration: NARRACAO, font: 'Montserrat' })
  try {
    const cli = await quieto(() => G.registrarVersaoDaCasa({ userId: CLIENTE.id, generationId: 'g0', renderId: 'r0', quality: 'fast', decisao: S.decidirLegenda({ captions: undefined, interna: false, studioAds: false }), source: fonteA }))
    if (evs.length !== 0 || cli.versao || cli.fonte) p.push('glue: cliente gravou versão/RenderScript')
    const rA = await quieto(() => G.registrarVersaoDaCasa({ userId: INTERNA.id, generationId: 'g1', renderId: 'r1', quality: 'cinematic_ai', decisao: S.decidirLegenda({ captions: undefined, interna: true, studioAds: false }), source: fonteA }))
    const v = evs.find((e) => e.name === S.EVENTO_VERSAO)
    const f = evs.find((e) => e.name === S.EVENTO_FONTE_B)
    if (!v || v.userId !== INTERNA.id || v.metadata.variant !== 'A' || v.metadata.render_id !== 'r1' || v.metadata.video_id !== null || v.metadata.original !== null || v.sessionId !== 'g1') p.push('glue: evento da versão A errado')
    if (!f || f.userId !== INTERNA.id || f.metadata.render_id !== 'r1' || !f.metadata.source_b || textos(f.metadata.source_b, [5, 7, 11]) !== 0 || textos(f.metadata.source_b, [9]) !== 1) p.push('glue: RenderScript B gravado errado (com texto, sem marca ou sem render)')
    if (!(rA.versao && rA.fonte)) p.push('glue: retorno da versão A errado')
    evs.length = 0
    await quieto(() => G.registrarVersaoDaCasa({ userId: INTERNA.id, generationId: 'g2', renderId: 'r2', quality: 'fast', decisao: S.decidirLegenda({ captions: false, interna: true, studioAds: false }), source: S.tirarLegendaEGancho(fonteA).source }))
    if (evs.find((e) => e.name === S.EVENTO_VERSAO)?.metadata?.variant !== 'B') p.push('glue: evento da versão B errado')
    evs.length = 0
    const gordo = { ...fonteA, elements: [...fonteA.elements, { type: 'video', track: 2, time: 0, duration: 1, source: 'https://x/' + 'a'.repeat(S.FONTE_B_MAX_CHARS) }] }
    const rg = await quieto(() => G.registrarVersaoDaCasa({ userId: INTERNA.id, generationId: 'g3', renderId: 'r3', quality: 'fast', decisao: S.decidirLegenda({ captions: undefined, interna: true, studioAds: false }), source: gordo }))
    const fg = evs.find((e) => e.name === S.EVENTO_FONTE_B)
    if (!fg || fg.metadata.source_b !== null || rg.fonte !== false) p.push('glue: RenderScript gigante foi gravado inteiro')
    evs.length = 0
    await G.registrarSemLegendaIgnorado({ userId: CLIENTE.id, generationId: 'g4', quality: 'fast' })
    if (!(evs.length === 1 && evs[0].name === S.EVENTO_IGNORADO && evs[0].userId === CLIENTE.id && evs[0].metadata.motivo === 'conta_nao_interna' && evs[0].sessionId === 'g4')) p.push('glue: evento do "ignorado" errado')
    const Gx = load(src, { '@/lib/serverEvents': { writeServerEvent: async () => { throw new Error('banco fora') } }, '@/lib/semLegenda': S })
    const rx = await quieto(() => Gx.registrarVersaoDaCasa({ userId: INTERNA.id, generationId: 'g5', renderId: 'r5', quality: 'fast', decisao: S.decidirLegenda({ captions: undefined, interna: true, studioAds: false }), source: fonteA }))
    if (rx.versao || rx.fonte) p.push('glue: falha do banco virou sucesso')
  } catch (e) {
    p.push('glue: lançou exceção — ' + (e && e.message))
  }
  return p
}

// ═══ 4) /api/admin/recompose-sem-legenda — a rota inteira com banco/Creatomate falsos ═══════════════════════════════════
function fakeDb(ctx) {
  let seq = 0
  const get = (r, k) => {
    const m = /^(\w+)->>(\w+)$/.exec(k)
    if (m) { const o = r[m[1]]; const v = o && typeof o === 'object' ? o[m[2]] : undefined; return v === undefined || v === null ? null : String(v) }
    return r[k]
  }
  return {
    from(t) {
      ctx.log.push(['from', t])
      if (!ctx.tables[t]) ctx.tables[t] = []
      const rows = ctx.tables[t]
      const st = { op: 'select', filters: [], order: null, lim: null, single: false }
      const match = (r) => st.filters.every(([k, v]) => { const x = get(r, k); return x === v || (x != null && v != null && String(x) === String(v)) })
      const exec = () => {
        if (st.op === 'insert') {
          const list = Array.isArray(st.row) ? st.row : [st.row]
          for (const r of list) {
            if (r.id && rows.some((x) => x.id === r.id)) return { data: null, error: { code: '23505', message: 'duplicate key value (pkey)' } }
            if (t === 'videos' && r.render_id && rows.some((x) => x.render_id === r.render_id)) return { data: null, error: { code: '23505', message: 'duplicate key value (videos_render_id_unique)' } }
          }
          const ins = list.map((r) => ({ id: r.id ?? `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, created_at: new Date().toISOString(), ...r }))
          rows.push(...ins)
          ctx.log.push(['insert', t, ins.length])
          return { data: st.single ? { id: ins[0].id } : ins, error: null }
        }
        if (st.op === 'update') {
          const hit = rows.filter(match)
          for (const r of hit) Object.assign(r, structuredClone(st.patch))
          ctx.log.push(['update', t, hit.length])
          return { data: st.single ? (hit[0] ? { id: hit[0].id } : null) : hit, error: null }
        }
        let res = rows.filter(match)
        if (st.order) { const [k, o] = st.order; res = [...res].sort((a, b) => (String(a[k]) < String(b[k]) ? -1 : String(a[k]) > String(b[k]) ? 1 : 0) * (o && o.ascending === false ? -1 : 1)) }
        if (st.lim != null) res = res.slice(0, st.lim)
        return { data: st.single ? (res[0] ? structuredClone(res[0]) : null) : structuredClone(res), error: null }
      }
      const b = {
        select() { return b },
        eq(k, v) { st.filters.push([k, v]); return b },
        order(k, o) { st.order = [k, o]; return b },
        limit(n) { st.lim = n; return b },
        insert(r) { st.op = 'insert'; st.row = structuredClone(r); return b },
        update(pt) { st.op = 'update'; st.patch = pt; return b },
        maybeSingle() { st.single = true; return Promise.resolve(exec()) },
        then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
      }
      return b
    },
  }
}
function carregarRotaB(src, S, ctx) {
  class CreatomateSubmitError extends Error { constructor(m, ambiguous) { super(m); this.ambiguous = ambiguous } }
  return load(src, {
    'next/server': { NextResponse: { json: (body, init) => ({ status: (init && init.status) ?? 200, body }) } },
    'node:crypto': nodeCrypto,
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: ctx.user } }) } }) },
    '@supabase/supabase-js': { createClient: () => fakeDb(ctx) },
    '@/lib/internalAccounts': I,
    '@/lib/compose': {
      CreatomateSubmitError,
      submitCreatomateRender: async (source) => { ctx.submits.push(structuredClone(source)); return `render-b-${ctx.submits.length}` },
      pollCreatomateRender: async (id) => ({ status: ctx.poll, progress: ctx.poll === 'succeeded' ? 100 : 40, url: ctx.poll === 'succeeded' ? `https://cdn.creatomate.com/renders/${id}.mp4` : null, snapshotUrl: `https://cdn.creatomate.com/renders/${id}.jpg`, error: null, durationSeconds: 41.2 }),
    },
    '@/lib/renderAssets': { persistRenderAssets: async (a) => { ctx.log.push(['persist', a.renderId]); return { videoUrl: `https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/${a.userId}/${a.renderId}.mp4`, thumbnailUrl: null, measuredSeconds: 41.23, measureMethod: 'mvhd' } } },
    '@/lib/serverEvents': { writeServerEvent: async (e) => { ctx.tables.events.push({ id: `ev-${ctx.tables.events.length + 1}`, user_id: e.userId, name: e.name, session_id: e.sessionId, metadata: e.metadata, created_at: new Date().toISOString() }); ctx.log.push(['event', e.name]); return true } },
    '@/lib/semLegenda': S,
  })
}
async function problemasB(src, S) {
  const p = []
  const VA = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
  const VOUTRA = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'
  const VVELHO = 'cccccccc-3333-4333-8333-cccccccccccc'
  const VBJA = 'dddddddd-4444-4444-8444-dddddddddddd'
  const CASA = { id: 'e92d81bf-0068-4600-8000-000000000001', email: 'josephsskaf@gmail.com' }
  const IRMA = { id: 'e92d81bf-0068-4600-8000-000000000002', email: 'victoriaskaf96@gmail.com' }
  const CLI = { id: 'e92d81bf-0068-4600-8000-000000000003', email: 'maria.cliente@example.com' }
  const fonteA = fonteClassica()
  H.withHookFirstFrame(fonteA, { interna: true, narration: NARRACAO, font: 'Montserrat' })
  const fb = S0.fonteVersaoB(fonteA).fonte
  const mundo = () => ({
    videos: [
      { id: VA, user_id: CASA.id, status: 'completed', render_id: 'render-a-1', title: 'In April 1815, Mount Tambora exploded', topic: 'Tambora', quality_mode: 'cinematic_ai', duration: 40, platform: 'YouTube Shorts', youtube_description: 'desc A' },
      { id: VOUTRA, user_id: IRMA.id, status: 'completed', render_id: 'render-o-1', title: 'Filme da irmã', topic: 'x', quality_mode: 'fast', duration: 35, platform: 'YouTube Shorts', youtube_description: null },
      { id: VVELHO, user_id: CASA.id, status: 'completed', render_id: 'render-velho', title: 'Filme de setembro', topic: 'y', quality_mode: 'fast', duration: 35, platform: 'YouTube Shorts', youtube_description: null },
      { id: VBJA, user_id: CASA.id, status: 'completed', render_id: 'render-bja', title: '[B sem legenda] Já é B', topic: 'z', quality_mode: 'fast', duration: 35, platform: 'YouTube Shorts', youtube_description: null },
    ],
    events: [
      { id: 'e1', user_id: CASA.id, name: S0.EVENTO_FONTE_B, created_at: '2026-10-06T10:00:00Z', metadata: { render_id: 'render-a-1', source_b: fb, captions_removed: 14, hook_removed: 1 } },
      { id: 'e2', user_id: IRMA.id, name: S0.EVENTO_FONTE_B, created_at: '2026-10-06T10:00:00Z', metadata: { render_id: 'render-o-1', source_b: fb } },
      { id: 'e3', user_id: CASA.id, name: S0.EVENTO_FONTE_B, created_at: '2026-10-06T10:00:00Z', metadata: { render_id: 'render-bja', source_b: fb } },
    ],
  })
  const ctx = { tables: mundo(), log: [], submits: [], user: null, poll: 'rendering', dead: new Set() }
  let B
  try { B = carregarRotaB(src, S, ctx) } catch (e) { return ['rota B: ' + e.message] }
  // O cliente admin é falso (fakeDb), mas a rota confere que o servidor tem as chaves antes de criá-lo.
  const envOriginal = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste'
  const fetchOriginal = globalThis.fetch
  globalThis.fetch = async (u, init) => { ctx.log.push(['fetch', init && init.method]); return { status: ctx.dead.has(String(u)) ? 404 : 200 } }
  const req = (qs, body) => ({ nextUrl: new URL('https://www.usekineo.com/api/admin/recompose-sem-legenda' + (qs ? '?' + qs : '')), json: async () => body })
  const reset = () => { ctx.tables = mundo(); ctx.log = []; ctx.submits = []; ctx.poll = 'rendering'; ctx.dead = new Set() }
  const escritas = () => ctx.log.filter((x) => x[0] === 'insert' || x[0] === 'update')
  const tocouCobranca = () => ctx.log.some((x) => x[0] === 'from' && !['videos', 'events'].includes(x[1]))
  try {
    // sem login
    ctx.user = null
    let r = await quieto(() => B.GET(req(`videoId=${VA}&confirm=SEND`)))
    if (r.status !== 401 || ctx.log.length !== 0 || ctx.submits.length !== 0) p.push(`B: sem login devia ser 401 sem tocar em nada (${r.status})`)
    // cliente (não interna)
    reset(); ctx.user = CLI
    r = await quieto(() => B.POST(req('', { videoId: VA })))
    if (r.status !== 403 || r.body.motivo !== 'so_conta_interna' || ctx.log.length !== 0 || ctx.submits.length !== 0) p.push(`B: cliente devia ser 403 sem ler nada (${r.status} ${r.body && r.body.motivo})`)
    // conta interna pedindo o filme de OUTRA conta (a irmã) — recusa, sem ler o RenderScript alheio, sem enviar
    reset(); ctx.user = CASA
    r = await quieto(() => B.POST(req('', { videoId: VOUTRA })))
    if (r.status !== 403 || r.body.motivo !== 'video_de_outra_conta') p.push(`B: vídeo de outra conta devia ser 403 video_de_outra_conta (${r.status} ${r.body && r.body.motivo})`)
    if (ctx.submits.length !== 0 || escritas().length !== 0) p.push('B: vídeo de outra conta foi enviado/gravado')
    if (ctx.log.some((x) => x[0] === 'from' && x[1] === 'events')) p.push('B: leu o RenderScript de outra conta')
    reset(); ctx.user = IRMA
    r = await quieto(() => B.GET(req(`videoId=${VA}&confirm=SEND`)))
    if (r.status !== 403 || r.body.motivo !== 'video_de_outra_conta' || ctx.submits.length !== 0) p.push('B: a irmã remontou o filme do fundador')
    // videoId inválido
    reset(); ctx.user = CASA
    r = await quieto(() => B.POST(req('', { videoId: 'nao-e-uuid' })))
    if (r.status !== 400) p.push('B: videoId inválido devia ser 400')
    // filme antigo (sem RenderScript guardado) — diz exatamente o que falta
    reset(); ctx.user = CASA
    r = await quieto(() => B.POST(req('', { videoId: VVELHO })))
    if (r.status !== 409 || r.body.motivo !== 'sem_fonte' || !Array.isArray(r.body.falta) || r.body.falta.length !== S0.FALTA_FILME_ANTIGO.length || ctx.submits.length !== 0) p.push(`B: filme antigo devia ser 409 sem_fonte com a lista do que falta (${r.status})`)
    // B de um B
    reset(); ctx.user = CASA
    r = await quieto(() => B.POST(req('', { videoId: VBJA })))
    if (r.status !== 409 || r.body.motivo !== 'ja_e_versao_b' || ctx.submits.length !== 0) p.push('B: B de um B devia ser recusado')
    // ensaio (GET sem confirm): nada enviado, nada gravado
    reset(); ctx.user = CASA
    r = await quieto(() => B.GET(req(`videoId=${VA}`)))
    if (r.status !== 200 || r.body.mode !== 'DRY_RUN' || r.body.versao_b.credits !== 0 || !String(r.body.confirmar).includes('confirm=SEND') || ctx.submits.length !== 0 || escritas().length !== 0) p.push('B: o ensaio enviou/gravou algo ou não ofereceu o confirm')
    // envio
    r = await quieto(() => B.POST(req('', { videoId: VA })))
    if (r.status !== 202 || r.body.status !== 'rendering' || r.body.credits !== 0) p.push(`B: envio devia responder 202 rendering (${r.status} ${J(r.body)})`)
    if (ctx.submits.length !== 1) p.push(`B: esperado 1 envio ao Creatomate, houve ${ctx.submits.length}`)
    else {
      const s = ctx.submits[0]
      if (textos(s, [5, 7, 11]) !== 0) p.push('B: a montagem enviada tem legenda/título')
      if (textos(s, [9]) !== 1) p.push("B: a montagem enviada perdeu a marca d'água")
      if (J(foraDoTexto(s)) !== J(foraDoTexto(fonteA))) p.push('B: a montagem enviada mudou voz/música/clipes/cortes')
    }
    const pedido = ctx.tables.events.find((e) => e.name === S0.EVENTO_PEDIDO_B)
    if (!pedido || pedido.user_id !== CASA.id || pedido.metadata.status !== 'submitted' || pedido.metadata.render_id !== 'render-b-1' || pedido.metadata.original_video_id !== VA) p.push('B: a linha-trava do pedido não ficou submitted com o render')
    // clique duplo: não reenvia
    r = await quieto(() => B.POST(req('', { videoId: VA })))
    if (ctx.submits.length !== 1 || r.status !== 202) p.push('B: clique duplo reenviou a montagem')
    // pronto: cria a linha B (0 crédito) + versões A e B
    ctx.poll = 'succeeded'
    r = await quieto(() => B.GET(req(`videoId=${VA}`)))
    const linhasB = ctx.tables.videos.filter((v) => v.render_id === 'render-b-1')
    if (r.status !== 200 || r.body.status !== 'done' || linhasB.length !== 1) p.push(`B: acompanhar devia criar a linha B (${r.status} ${J(r.body)})`)
    else {
      const vb = linhasB[0]
      if (vb.credits_used !== 0) p.push('B: a linha B cobrou crédito')
      if (vb.user_id !== CASA.id || vb.title !== '[B sem legenda] In April 1815, Mount Tambora exploded' || vb.quality_mode !== 'cinematic_ai' || vb.status !== 'completed' || vb.duration !== 41) p.push('B: a linha B nasceu com dono/título/motor/duração errados')
      if (r.body.b_video_id !== vb.id || r.body.original !== VA) p.push('B: a resposta não liga B ao original')
      const versoes = ctx.tables.events.filter((e) => e.name === S0.EVENTO_VERSAO)
      const vB = versoes.find((e) => e.metadata.variant === 'B')
      const vA = versoes.find((e) => e.metadata.variant === 'A')
      if (versoes.length !== 2 || !vB || !vA || vB.metadata.video_id !== vb.id || vB.metadata.original !== VA || vA.metadata.video_id !== VA || vA.metadata.original !== VA || vB.user_id !== CASA.id) p.push('B: eventos film_variant A/B errados')
      if (ctx.tables.events.find((e) => e.name === S0.EVENTO_PEDIDO_B)?.metadata?.status !== 'done') p.push('B: o pedido não fechou como done')
    }
    // de novo: idempotente
    r = await quieto(() => B.GET(req(`videoId=${VA}`)))
    if (r.body.status !== 'done' || ctx.tables.videos.filter((v) => v.render_id === 'render-b-1').length !== 1 || ctx.tables.events.filter((e) => e.name === S0.EVENTO_VERSAO).length !== 2) p.push('B: acompanhar de novo duplicou a linha ou os eventos')
    if (tocouCobranca()) p.push('B: tocou tabela além de videos/events (cobrança?)')
    // arquivo expirado no fornecedor: recusa sem enviar; com o arquivo de volta, retoma
    reset(); ctx.user = CASA; ctx.dead = new Set([CLIPES[1]])
    r = await quieto(() => B.POST(req('', { videoId: VA })))
    if (r.status !== 409 || r.body.motivo !== 'arquivo_expirou' || ctx.submits.length !== 0 || ctx.tables.events.find((e) => e.name === S0.EVENTO_PEDIDO_B)?.metadata?.status !== 'failed') p.push('B: clipe expirado devia recusar sem enviar e marcar failed')
    ctx.dead = new Set()
    r = await quieto(() => B.POST(req('', { videoId: VA })))
    const ped2 = ctx.tables.events.find((e) => e.name === S0.EVENTO_PEDIDO_B)
    if (r.status !== 202 || ctx.submits.length !== 1 || ped2?.metadata?.status !== 'submitted' || ped2?.metadata?.tentativa !== 2) p.push('B: depois da falha a retomada não reenviou (tentativa 2)')
    if (tocouCobranca()) p.push('B: tocou tabela além de videos/events')
  } catch (e) {
    p.push('B: execução quebrou — ' + (e && e.message))
  } finally {
    globalThis.fetch = fetchOriginal
    if (envOriginal.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = envOriginal.url
    if (envOriginal.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = envOriginal.key
  }
  return p
}
function problemasBEstatica(src) {
  const p = []
  // Só o CÓDIGO (sem comentários): o cabeçalho da rota explica de propósito por que ela não toca em render_jobs.
  const codigo = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, removeComments: true } }).outputText
  for (const proibido of ['debitVideoCredits', 'debit_video_credits', 'recordRenderIntent', 'render_jobs', 'creditCost', '.rpc(', 'COMPOSE_CLAIM', 'compose_submission_claim', 'deduct', 'refund']) {
    if (codigo.includes(proibido)) p.push('rota B: o código mexe com cobrança/estorno (' + proibido + ')')
  }
  if (!src.includes('credits_used: 0,')) p.push('rota B: a linha B não nasce com credits_used 0')
  const iAval = src.indexOf('avaliarPedidoB({ userId: user.id, interna, video, fonte })')
  const iSubmit = src.indexOf('await submitCreatomateRender(')
  if (!(iAval > 0 && iSubmit > iAval)) p.push('rota B: o envio não vem depois da avaliação do pedido')
  const iPortao = src.indexOf("if (!interna) return responder({ ok: false, motivo: 'so_conta_interna' }, 403)")
  if (!(iPortao > 0 && iPortao < src.indexOf(".from('videos')"))) p.push('rota B: o portão da conta interna não vem antes de ler o banco')
  return p
}

// ═══ 5) Trava 8.2 ════════════════════════════════════════════════════════════════════════════════════════════════════
const git = (args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
let BASE = null
{
  const cands = []
  try { const shas = git(['log', '--format=%H', `--grep=${MARCA}`, 'HEAD']).trim().split('\n').filter(Boolean); if (shas.length) cands.push(shas[shas.length - 1] + '^') } catch { /* sem commit ainda */ }
  cands.push('HEAD', 'origin/main')
  for (const ref of cands) { try { if (!git(['show', `${ref}:${ROTA}`]).includes(MARCA)) { BASE = ref; break } } catch { /* próximo */ } }
}
const rdBase = (p) => { try { return git(['show', `${BASE}:${p}`]).replace(/\r\n/g, '\n') } catch { return null } }
const semMarca = (s) => s.split('\n').filter((l) => !l.includes(MARCA)).join('\n')
function problemasTrava(rota) {
  if (!BASE) return ['sem base de comparação']
  return semMarca(rota) === rdBase(ROTA) ? [] : ['/api/compose: há linha nova ou alterada sem a marca ' + MARCA]
}

// ═══ execução ═══════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('1) lib/semLegenda — decisão, corte, RenderScript B, pedido B')
{ const pl = problemasLib(S0); for (const x of pl) console.log('     · ' + x); ok(pl.length === 0, `lib/semLegenda executada (${pl.length} problema(s))`) }
console.log('2) /api/compose — as linhas reais da rota, executadas')
{ const pr = await problemasRota(SRC_ROTA, S0); for (const x of pr) console.log('     · ' + x); ok(pr.length === 0, `interna + captions:false = sem legenda/título nos dois caminhos; cliente = igual a hoje + evento (${pr.length} problema(s))`) }
{ const pe = problemasRotaEstatica(SRC_ROTA); for (const x of pe) console.log('     · ' + x); ok(pe.length === 0, `rota: decisão antes dos caminhos, corte antes do envio, versão B gravada depois do claim (${pe.length} problema(s))`) }
console.log('3) lib/semLegendaServer — só a casa grava versão e RenderScript B')
{ const pg = await problemasGlue(SRC_GLUE, S0); for (const x of pg) console.log('     · ' + x); ok(pg.length === 0, `gravação da versão (${pg.length} problema(s))`) }
console.log('4) /api/admin/recompose-sem-legenda — a rota inteira')
{ const pb = await problemasB(SRC_B, S0); for (const x of pb) console.log('     · ' + x); ok(pb.length === 0, `recusa outra conta e cliente, explica filme antigo, envia 1 montagem sem legenda, 0 crédito, versões A/B (${pb.length} problema(s))`) }
{ const ps = problemasBEstatica(SRC_B); for (const x of ps) console.log('     · ' + x); ok(ps.length === 0, `rota B sem débito/intenção/estorno, portão antes do banco (${ps.length} problema(s))`) }
console.log('5) Trava 8.2')
console.log(`   base de comparação: ${BASE ?? '(nenhuma)'}`)
ok(Boolean(BASE), 'a base (antes desta entrega) está disponível')
if (BASE) {
  ok(read('lib/compose.ts') === rdBase('lib/compose.ts'), 'lib/compose.ts byte a byte a base (o montador não muda)')
  const pt = problemasTrava(SRC_ROTA)
  ok(pt.length === 0, '/api/compose: fora das linhas marcadas, byte a byte a base (só linhas novas, todas marcadas)')
}
ok(GANCHO_ESPELHO(), 'espelhos: trilha do gancho = GANCHO_1Q_TRACK; trilhas da legenda = filtro do Studio Ads e isCaptionElement')
function GANCHO_ESPELHO() {
  const hook = read('lib/hookFirstFrame.ts')
  const ads = read('lib/ads/adStyle.ts')
  return /export const GANCHO_1Q_TRACK = 11\n/.test(hook) && S0.GANCHO_TRILHA === 11 && J([...S0.LEGENDA_TRILHAS]) === '[5,7]' &&
    ads.includes("return x.type === 'text' && [5, 7].includes(Number(x.track))") && SRC_ROTA.includes("type === 'text' && [5, 7].includes(Number((e as { track?: unknown }).track))")
}

console.log('6) Mutantes')
async function todosOsProblemas({ lib = SRC_LIB, rota = SRC_ROTA, glue = SRC_GLUE, rotaB = SRC_B } = {}) {
  let S
  try { S = load(lib) } catch (e) { return ['lib quebrou: ' + e.message] }
  return [
    ...problemasLib(S),
    ...(await problemasRota(rota, S)),
    ...problemasRotaEstatica(rota),
    ...(await problemasGlue(glue, S)),
    ...(await problemasB(rotaB, S)),
    ...problemasBEstatica(rotaB),
    ...problemasTrava(rota),
  ]
}
async function mut(nome, alvo, de, para) {
  const fonte = { lib: SRC_LIB, rota: SRC_ROTA, glue: SRC_GLUE, rotaB: SRC_B }[alvo]
  if (!fonte.includes(de)) { ok(false, `mutante "${nome}": trecho não encontrado`); return }
  const ps = await todosOsProblemas({ [alvo]: fonte.split(de).join(para) })
  ok(ps.length > 0, `mutante (${nome}) → vermelho (${ps.length}): ${ps[0] ?? '—'}`)
}
// O mutante só prova algo se o original está limpo: com o código de verdade, zero problemas.
{ const base0 = await todosOsProblemas(); ok(base0.length === 0, `sem mutação: zero problemas (${base0.length})`) }
const linhaCom = (src, s) => src.split('\n').find((l) => l.includes(s)) ?? `<<sem linha com ${s}>>`
// lib/semLegenda
await mut('aberto para o cliente', 'lib', '  if (pediu && casa) return', '  if (pediu) return')
await mut('string "false" vale como pedido', 'lib', 'const pediu = input?.captions === false', "const pediu = input?.captions === false || String(input?.captions) === 'false'")
await mut('gancho fica', 'lib', 'export const GANCHO_TRILHA = 11', 'export const GANCHO_TRILHA = 12')
await mut('legenda da trilha 5 fica', 'lib', 'export const LEGENDA_TRILHAS: readonly number[] = [5, 7]', 'export const LEGENDA_TRILHAS: readonly number[] = [7]')
await mut("marca d'água sai junto", 'lib', "return x.type === 'text' && LEGENDA_TRILHAS.includes(Number(x.track))", "return x.type === 'text' && (LEGENDA_TRILHAS.includes(Number(x.track)) || Number(x.track) === MARCA_DAGUA_TRILHA)")
await mut('corte muda o source recebido', 'lib', '  return { source: { ...source, elements: kept }, legendas, gancho }', '  ;(source as { elements: unknown[] }).elements = kept\n  return { source, legendas, gancho }')
await mut('vídeo de outra conta passa', 'lib', "  if (String(v.user_id ?? '') !== p.userId) return { ok: false, status: 403, motivo: 'video_de_outra_conta' }\n", '')
await mut('cliente pode pedir B', 'lib', "  if (p.interna !== true) return { ok: false, status: 403, motivo: 'so_conta_interna' }\n", '')
await mut('B de um B passa', 'lib', "  if (String(v.title ?? '').startsWith(TITULO_B_PREFIXO)) return { ok: false, status: 409, motivo: 'ja_e_versao_b' }\n", '')
await mut('filme antigo passa', 'lib', '  if (x === undefined || x === null) return { ok: false, falta: [...FALTA_FILME_ANTIGO] }', '  if (x === undefined || x === null) return { ok: true, fonte: {}, urls: [] } as FonteValida')
await mut('capa guardada no RenderScript', 'lib', "if (k !== 'snapshot_time') fonte[k] = v", 'fonte[k] = v')
await mut('Studio Ads perde o "sem legenda"', 'lib', "if (pediu && input?.studioAds === true) return { tirarLegenda: true,", "if (pediu && input?.studioAds === true) return { tirarLegenda: false,")
await mut('versão A some do teste', 'lib', "versao: casa ? 'A' : null }", 'versao: null }')
await mut('título B dobra', 'lib', 'const base = t.startsWith(TITULO_B_PREFIXO) ? t.slice(TITULO_B_PREFIXO.length).trim() : t', 'const base = t')
// /api/compose
await mut('cliente segue com captions:false no corpo', 'rota', '; delete body.captions }', ' }')
await mut('portão vira todo mundo', 'rota', 'decidirLegenda({ captions: body.captions, interna: isInternalEmail(user.email),', 'decidirLegenda({ captions: body.captions, interna: true,')
await mut('cliente ignorado sem evento', 'rota', 'await registrarSemLegendaIgnorado({ userId: authenticatedUserId, generationId, quality }); ', '')
await mut('hollywood não tira a legenda', 'rota', linhaCom(SRC_ROTA, 'tirarLegendaEGancho(hollywoodSource,') + '\n', '')
await mut('clássico não tira o gancho', 'rota', linhaCom(SRC_ROTA, 'tirarLegendaEGancho(source,') + '\n', '')
await mut('hollywood não guarda a versão B', 'rota', linhaCom(SRC_ROTA, 'renderId: hollywoodRenderId, quality, decisao: semLegenda') + '\n', '')
await mut('clássico não guarda a versão B', 'rota', linhaCom(SRC_ROTA, 'generationId, renderId, quality, decisao: semLegenda, source })') + '\n', '')
await mut('linha sem marca na rota', 'rota', '    const submissionKey = `${authenticatedUserId}:${generationId}`', '    const submissionKey = `${authenticatedUserId}:${generationId}` // sem marca')
// lib/semLegendaServer
await mut('cliente grava versão', 'glue', "  if (a.decisao.versao === null) return { versao: false, fonte: false, motivo: 'cliente' }\n", '')
await mut('RenderScript B com legenda', 'glue', '    const b = fonteVersaoB(a.source)', "    const b = { fonte: a.source, legendas: 0, gancho: 0, elementos: 0, chars: 0, motivo: 'ok' as const }")
// /api/admin/recompose-sem-legenda
await mut('sem portão interno', 'rotaB', "  if (!interna) return responder({ ok: false, motivo: 'so_conta_interna' }, 403)\n", '')
await mut('lê o RenderScript de outra conta', 'rotaB', 'if (video && video.user_id === user.id && typeof video.render_id', 'if (video && typeof video.render_id')
await mut('a linha B cobra 1 crédito', 'rotaB', 'credits_used: 0,', 'credits_used: 1,')
await mut('grava intenção de cobrança', 'rotaB', '  let renderId: string\n', "  let renderId: string\n  await admin.from('render_jobs').insert({ render_id: 'x', user_id: user.id, quality: 'fast', cost: 1 })\n")
await mut('envia sem avaliar o pedido', 'rotaB', 'const avaliacao = avaliarPedidoB({ userId: user.id, interna, video, fonte })', 'const avaliacao = { ok: true } as { ok: true }')
await mut('clique duplo reenvia', 'rotaB', "if (pedido && (status === 'submitted' || status === 'done')) {", 'if (false) {')
await mut('título sem o prefixo B', 'rotaB', 'title: tituloVersaoB(video.title),', 'title: video.title,')
await mut('sem evento da versão B', 'rotaB', linhaCom(SRC_B, "metadadosVersao({ variant: 'B'") + '\n', '')
await mut('arquivo expirado não barra', 'rotaB', '  if (mortas.length > 0) {', '  if (false) {')

console.log(`\ntest-sem-legenda-2026-10-06: ${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
