// KINEO-CLOSE-REAL-AJUSTE-1910 — guardião do AJUSTE pós-canário do formato "Close do produto real" do Studio Ads (canário de1c0d72, 19/10:
// docs/RESULTADO-CANARIO-CLOSE-REAL-2026-10-19.md). Roda com `node scripts/test-close-real-ajuste-1910.mjs` na raiz do repo, sem rede, sem banco, sem
// fornecedor: os módulos são transpilados pelo typescript do repo (scripts/test-support/offline-ts-loader.mjs) com stubs, e a MONTAGEM é executada de verdade.
//
// O que prova (1 seção por conserto do pedido):
//   L  LEGENDAS em sincronia: 1 frase por plano (gancho + 3 = 4), cada uma entrando quando a voz a diz; nenhum plano (nem instante) sem frase;
//   G  TAMANHO de anúncio: fonte ≥ 4% da altura, ≤ 5 palavras por linha, zona segura 14–65%, acima do produto; a marca-d'água não encosta nelas;
//   T  TRAVESSÃO: "Perfume LUME - Fragrâncias Exclusivas" vira "Perfume LUME · Fragrâncias Exclusivas" (o texto do /plan e a montagem), nunca colado;
//   N  NARRAÇÃO: a marca no máximo 2 vezes; o fecho automático não cola "Agora, <marca>." (executado: extractAdsV2Brief com a OpenAI falsa);
//   Z  GANCHO: zoom 100→112% com ease, a partir do topo do produto, só escala (os pixels do produto são os do recorte);
//   C  CARTÃO: o gradiente na cor da embalagem + o produto pequeno (pixel a pixel) + o nome + a chamada nas 16 línguas; recorte falhou = o cartão do pedido;
//   O  ORDEM das fotos: gancho A → B → C → A (2 fotos: B → A → B), nunca a mesma foto do gancho logo no 1º plano;
//   I  MEDIÇÃO: ads_v2_plan_served sem in_hand no Close real;
//   S  TETO da amostra: 30 por dia (fundador 19/10);
//   R  O RESTO intocado: Apresentador e o Ads de sempre (o fecho com nome, o acabamento das frases) iguais quando o pedido não é Close real;
//   D  desfaz exato + novos + marca + encadeamento (os guardiões byte a byte tiram esta camada PRIMEIRO);
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import zlib from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semCloseRealAjuste1910, CLOSE_REAL_AJUSTE_1910_ARQUIVOS, CLOSE_REAL_AJUSTE_1910_NOVOS, CLOSE_REAL_AJUSTE_1910_BASE, MARCA_CLOSE_REAL_AJUSTE_1910, TROCAS_CLOSE_REAL_AJUSTE_1910 } from './test-support/desfaz-close-real-ajuste-1910.mjs'
import { semFilmesF1F3Ajuste1910 } from './test-support/desfaz-filmes-f1f3-ajuste-1910.mjs' // KINEO-FILMES-F1F3-AJUSTE-1910 — reancorado: a camada mais nova sai primeiro
import { semCloseRealV3_1910 } from './test-support/desfaz-close-real-v3-1910.mjs' // KINEO-CLOSE-REAL-V3-1910 — a rodada 3 sai antes (este guardião prova o ajuste)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-CLOSE-REAL-AJUSTE-1910'
const lf = (s) => String(s).split('\r\n').join('\n')
const rd = (p) => lf(semFilmesF1F3Ajuste1910(semCloseRealV3_1910(readFileSync(join(ROOT, p), 'utf8'), p), p)) // KINEO-CLOSE-REAL-V3-1910 — reancorado: este guardião lê o texto SEM a rodada 3 (provada em scripts/test-close-real-v3-1910.mjs) e depois sem o ajuste do Faceless 15 s
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${CLOSE_REAL_AJUSTE_1910_BASE}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = {
  cr: 'lib/ads/v2CloseReal.ts', srv: 'lib/ads/v2CloseRealServer.ts', montage: 'lib/ads/adV2Montage.ts', png: 'lib/ads/v2Png.ts', plan: 'lib/ads/v2PlanCore.ts',
  advance: 'lib/ads/v2Advance.ts', brief: 'lib/ads/v2Brief.ts', fit: 'lib/ads/v2CopyFit.ts', sample: 'lib/ads/sample.ts', access: 'lib/ads/serverAccess.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))
const carregar = (over = {}, mocks = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...mocks }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : semCloseRealV3_1910(text, rel)) }) // KINEO-CLOSE-REAL-V3-1910 — reancorado: executa o formato na régua do ajuste (antes da rodada 3)
const CR = (over = {}) => carregar(over)(F.cr)
const H = (n) => `https://cdn.test/${n}`
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e
const r3 = (n) => Math.round(n * 1000) / 1000

// O canário de1c0d72 (PT, "Perfume LUME"): voz de 14,904 s, 4 frases faladas, o título com hífen e 3 fotos do mesmo conjunto.
const NARR = 'Descubra o Perfume LUME, fragrâncias exclusivas para você. Sinta a essência única que dura o dia inteiro. Notas suaves e marcantes em cada borrifada. Experimente hoje mesmo.'
const VOZ = 14.904
const FOTOS = [H('frasco.jpg'), H('estudio.jpg'), H('cetim.jpg')]
const BUILD = { width: 1080, height: 1920, heroUrl: H('hero.png'), heroFallbackUrl: H('frasco.jpg'), photos: FOTOS, phrases: ['Perfume LUME - Fragrâncias Exclusivas', 'Sinta a essência única'], fontFamily: 'Montserrat', cardUrl: H('card-azul.png'), cardSeconds: 2.5, musicUrl: H('music.mp3'), musicTrimStart: 0, voiceUrl: H('voz.mp3'), voiceSeconds: VOZ, watermark: null, narration: NARR, closeCard: { url: H('card-close.png'), name: 'Perfume LUME', cta: 'Compre agora' } }
const textos = (src, track) => src.elements.filter((e) => e.type === 'text' && e.track === track)

// ── as provas, como funções de (fontes) → boolean, para os mutantes reusarem ───────────────────────────────────────
const provaLegendas = (over = {}) => {
  const cr = CR(over)
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const t = cr.adsV2CloseRealTimeline({ voiceSeconds: VOZ })
  const caps = textos(src, cr.ADS_V2_CLOSE_REAL_TRACKS.text).sort((a, b) => a.time - b.time)
  const planos = [[0, t.hook], ...t.starts.map((s, k) => [s, r3(s + t.shots[k])])]
  // sem buraco: a 1ª no quadro 0, cada uma começa onde a anterior termina, a última vai até o cartão
  const contiguo = caps.length > 0 && caps[0].time === 0 && caps.every((c, i) => i === 0 || near(c.time, r3(caps[i - 1].time + caps[i - 1].duration), 2e-3)) && near(r3(caps[caps.length - 1].time + caps[caps.length - 1].duration), t.content, 2e-3)
  // nenhum plano sem frase: amostrando a cada 0,05 s dentro de cada plano, sempre há legenda na tela
  const semVazio = planos.every(([a, b]) => { for (let x = a; x < b; x += 0.05) if (!caps.some((c) => c.time <= x + 1e-9 && x < c.time + c.duration - 1e-9)) return false; return true })
  // 1 por plano: 4 legendas distintas, e cada plano de foto tem a SUA (uma legenda que começa dentro dele)
  const umaPorPlano = caps.length === 4 && new Set(caps.map((c) => c.text)).size === 4 && planos.slice(1).every(([a, b]) => caps.some((c) => c.time >= a - cr.ADS_V2_CLOSE_REAL_CAPTION_SNAP && c.time < b))
  // em sincronia: cada legenda (menos o título do gancho) entra a ≤ 0,35 s de quando a voz começa a dizê-la, e diz o que a voz diz
  const cap = cr.adsV2CloseRealCaptions({ narration: NARR, voiceSeconds: VOZ, headline: BUILD.phrases[0], overlays: BUILD.phrases, timeline: t })
  const fala = (s) => s.toLowerCase().replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim()
  // a referência INDEPENDENTE do tempo da fala: a fração de caracteres da narração antes da 1ª palavra da legenda × a voz medida, a partir de 0,3 s
  const quando = (txt) => { const i = NARR.indexOf(txt.split(' ')[0] + ' ' + (txt.split(' ')[1] ?? '')); return i < 0 ? -99 : 0.3 + (VOZ * i) / NARR.length }
  const sync = cap.length === 4 && cap.slice(1).every((c) => c.spokenAt !== null && Math.abs(c.start - c.spokenAt) <= cr.ADS_V2_CLOSE_REAL_CAPTION_SNAP + 1e-9 && Math.abs(c.start - quando(c.text)) <= 0.6 && fala(NARR).includes(fala(c.text))) && cap[0].start === 0
  // a frase falada aos ~5 s aparece aos ~5 s (no canário a 2ª frase entrou 8 s depois da fala)
  const sinta = cap.find((c) => /^Sinta/.test(c.text))
  // sem voz: as frases de tela repartidas pelos planos, sem buraco; frase de 1 palavra só não nasce da fala
  const semVoz = cr.adsV2CloseRealCaptions({ narration: null, voiceSeconds: null, headline: null, overlays: BUILD.phrases, timeline: cr.adsV2CloseRealTimeline({}) })
  const semVozOk = semVoz.length === 2 && semVoz[0].start === 0 && near(semVoz[0].end, semVoz[1].start) && near(semVoz[1].end, 12.5)
  // voz longa (os planos esticam) e fala curta (3 palavras): continua sem buraco, sem frase de 1 palavra
  const longa = cr.buildAdV2CloseRealSource({ ...BUILD, voiceSeconds: 15.8 })
  const lc = textos(longa, cr.ADS_V2_CLOSE_REAL_TRACKS.text).sort((a, b) => a.time - b.time)
  const longaOk = lc.length === 4 && near(r3(lc[3].time + lc[3].duration), cr.adsV2CloseRealTimeline({ voiceSeconds: 15.8 }).content, 2e-3)
  const curta = cr.adsV2CloseRealCaptions({ narration: 'Perfume LUME chegou.', voiceSeconds: 2, headline: null, overlays: [], timeline: cr.adsV2CloseRealTimeline({ voiceSeconds: 2 }) })
  const curtaOk = curta.length === 1 && curta[0].start === 0 && near(curta[0].end, 12.5)
  return contiguo && semVazio && umaPorPlano && sync && !!sinta && sinta.start > 3 && sinta.start < 7 && semVozOk && longaOk && curtaOk
}
const provaTamanho = (over = {}) => {
  const cr = CR(over)
  const M = carregar(over)(F.montage)
  const frases = ['Oi', 'Sinta a essência única que dura o dia inteiro', 'Perfume LUME · Fragrâncias Exclusivas', 'Notas suaves e marcantes em cada borrifada do dia', 'Supercalifragilisticexpialidocious fragrance']
  const geos = frases.flatMap((t) => [[720, 1280], [1080, 1920]].map(([w, h]) => ({ t, w, h, g: cr.adsV2CloseRealCaptionGeometry(t, w, h) })))
  const grande = geos.filter(({ t }) => t !== 'Supercalifragilisticexpialidocious fragrance').every(({ g, h }) => g.font_size >= Math.round(0.04 * h)) // ~4,5% (o canário: 2,5%)
  const zona = geos.every(({ g }) => g.box.top >= M.ADS_V2_SAFE_TOP && g.box.bottom <= M.ADS_V2_SAFE_BOTTOM && g.box.bottom <= cr.ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0 - 0.005)
  const cinco = geos.every(({ t, w, g }) => cr.adsV2CloseRealCaptionLines(t, g.font_size, w).every((l) => l.split(' ').length <= 5))
  // o pior caso da fala (30 palavras compridas, ~9 letras cada): a fala divide em mais frases, toda legenda fica acima do produto, e nenhuma palavra some
  const pior = 'Inesquecíveis fragrâncias sofisticadas acompanham elegantemente qualquer momento especial. Delicadíssimas notas amadeiradas permanecem intensamente marcantes durante extraordinárias celebrações noturnas. Experimente imediatamente essa sensação inesquecível, verdadeiramente exclusiva, cuidadosamente desenvolvida, absolutamente surpreendente, maravilhosamente equilibrada, profundamente envolvente.'
  const tp = cr.adsV2CloseRealTimeline({ voiceSeconds: 15.8 })
  const cp = cr.adsV2CloseRealCaptions({ narration: pior, voiceSeconds: 15.8, headline: null, overlays: [], timeline: tp })
  const piorOk = cp.length >= 4 && cp.every((c) => { const g = cr.adsV2CloseRealCaptionGeometry(c.text, 1080, 1920); const g7 = cr.adsV2CloseRealCaptionGeometry(c.text, 720, 1280); return g.box.bottom <= cr.ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0 && g7.box.bottom <= cr.ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0 && cr.adsV2CloseRealCaptionLines(c.text, g.font_size, 1080).join(' ') === c.text }) &&
    cp.map((c) => c.text).join(' ').replace(/[.,]/g, '') === pior.replace(/[.,]/g, '')
  // a montagem usa essa geometria, presa pela base e centrada; a marca-d'água (amostra) fica entre 14% e o topo das legendas
  const src = cr.buildAdV2CloseRealSource({ ...BUILD, watermark: cr.ADS_V2_CLOSE_REAL_WATERMARK })
  const caps = textos(src, cr.ADS_V2_CLOSE_REAL_TRACKS.text)
  const capOk = caps.every((e) => e.y_anchor === '100%' && e.x_alignment === '50%' && e.font_size >= Math.round(0.04 * 1920) && e.font_weight === '800' && /rgba\(0,0,0,0\.\d+\)/.test(e.background_color))
  const wm = src.elements.find((e) => e.type === 'text' && e.text === cr.ADS_V2_CLOSE_REAL_WATERMARK)
  const wmTop = parseFloat(wm.y) / 100
  const wmBottom = wmTop + (wm.font_size * 1.1) / 1920 + 0.012
  const wmOk = wm.y_anchor === '0%' && wmTop >= M.ADS_V2_SAFE_TOP - 1e-9 && wmBottom <= cr.ADS_V2_CLOSE_REAL_CAPTION_TOP && wm.time === 0 && wm.duration === src.duration
  return grande && zona && cinco && piorOk && capOk && wmOk
}
const provaTravessao = (over = {}) => {
  const cr = CR(over)
  const d = cr.adsV2CloseRealDash
  const libOk = d('Perfume LUME - Fragrâncias Exclusivas') === 'Perfume LUME · Fragrâncias Exclusivas' && d('Perfume LUME — Fragrâncias') === 'Perfume LUME · Fragrâncias' && d('Aberto 9 - 18h') === 'Aberto 9 - 18h'
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const hook = textos(src, cr.ADS_V2_CLOSE_REAL_TRACKS.text).find((e) => e.time === 0)
  // o texto que JÁ veio colado de um plano antigo não é inventado de volta; o que veio com hífen sai com " · "
  return libOk && hook.text === 'Perfume LUME · Fragrâncias Exclusivas' && !/Perfume LUME Fragrâncias/.test(JSON.stringify(src))
}
// N/T (texto do /plan) — EXECUTADO: lib/ads/v2Brief.ts de verdade com uma OpenAI falsa (900 = brief, 700 = texto/correção).
const JSONS = { '@/lib/ui/refinementCopy.json': JSON.parse(rd('lib/ui/refinementCopy.json')) }
function openaiFalsa({ brief, copies = [] }) {
  const fila = copies.slice()
  const create = async (params) => { const r = params.max_tokens === 900 ? brief : fila.shift(); return { choices: [{ message: { content: typeof r === 'string' ? r : JSON.stringify(r ?? {}) } }] } }
  return { openai: { chat: { completions: { create } } } }
}
const FRASE = 'Perfume LUME, fragrâncias exclusivas, frasco dourado'
const BRIEF_LUME = { business: 'Perfume LUME — fragrâncias exclusivas', offer: '', cta: 'visit', contact: '', audience: '', tone: 'warm', extra: {}, model_hint: '' }
const COPY_LUME = { narration: 'Descubra o Perfume LUME. Uma fragrância delicada no frasco dourado. Perfume LUME, notas suaves.', overlays: ['Perfume LUME - Fragrâncias Exclusivas', 'Notas suaves'], sector: 'store' }
const texto = async (closeReal, over = {}) => {
  const oa = openaiFalsa({ brief: BRIEF_LUME, copies: [COPY_LUME, COPY_LUME] })
  const L = createOfflineLoader({ mocks: { '@/lib/openai': { openai: oa.openai }, ...JSONS }, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
  return L(F.brief).extractAdsV2Brief({ text: FRASE, language: 'pt', languageName: 'Brazilian Portuguese (pt-BR)', maxWords: 30, narration: true, overlays: true, facts: [], sentence: FRASE, productPhoto: true, scripts: false, ...(closeReal ? { closeReal: true } : {}) })
}
const lumes = (s) => (String(s).match(/\bLUME\b/g) || []).length
const provaNarracao = async (over = {}) => {
  const r = await texto(true, over)
  const frases = String(r.copy?.narration ?? '').split(/(?<=[.!?…])\s+/u)
  const ultimaNomeada = frases.findIndex((f, i) => i > 0 && /LUME/.test(f) && /LUME/.test(frases[i - 1]))
  return r.ok === true && !r.speechShort && lumes(r.copy.narration) <= 2 && !/Agora, Perfume LUME\./.test(r.copy.narration) && ultimaNomeada === -1 &&
    String(r.copy.narration).split(/\s+/).length >= 27 && r.copy.overlays[0] === 'Perfume LUME · Fragrâncias Exclusivas' && !(r.honestyFixes ?? []).includes('overlay_dash') && !(r.honestyFixes ?? []).includes('speech_close_name')
}
// a conta das menções e a última frase com o nome, direto na régua (adsV2CompleteSpeech)
const provaFecho = (over = {}) => {
  const C = carregar(over)(F.fit)
  const close = (extra = {}) => ({ name: 'Perfume LUME', brand: true, used: new Set(), ...extra })
  const duas = C.adsV2CompleteSpeech('Descubra o Perfume LUME. Uma fragrância delicada no frasco dourado. Perfume LUME, notas suaves.', { min: 27, max: 30, language: 'pt', close: close({ nameMax: 2 }) })
  const umaNoFim = C.adsV2CompleteSpeech('Uma fragrância delicada no frasco dourado para o seu dia. Este é o LUME.', { min: 27, max: 30, language: 'pt', close: close({ nameMax: 2 }) })
  const s1 = String(umaNoFim.text).split(/(?<=[.!?…])\s+/u)
  return lumes(duas.text) === 2 && !duas.fixes.includes('speech_close_name') && duas.text.split(/\s+/).length >= 27 &&
    lumes(umaNoFim.text) <= 2 && !/LUME/.test(s1[2] ?? '') // a frase logo depois da que já diz o nome nunca é um fecho com o nome
}
const provaGancho = (over = {}) => {
  const cr = CR(over)
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const hero = src.elements.find((e) => e.type === 'image' && e.source === BUILD.heroUrl)
  const a = hero.animations[0]
  return a.type === 'scale' && a.start_scale === '100%' && parseFloat(a.end_scale) >= 110 && /ease/.test(a.easing) && a.y_anchor === `${cr.ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0 * 100}%` &&
    hero.animations.length === 1 && hero.time === 0 && !hero.enter_transition && !('color_filter' in hero) && !('playback_rate' in hero) && !('blur_radius' in hero)
}
const provaCartao = (over = {}) => {
  const cr = CR(over)
  const src = cr.buildAdV2CloseRealSource({ ...BUILD })
  const T = cr.ADS_V2_CLOSE_REAL_TRACKS, CT = cr.ADS_V2_CLOSE_REAL_CARD_TRACKS
  const card = src.elements.find((e) => e.type === 'image' && e.track === T.card)
  const name = src.elements.find((e) => e.type === 'text' && e.track === CT.name)
  const cta = src.elements.find((e) => e.type === 'text' && e.track === CT.cta)
  const t = cr.adsV2CloseRealTimeline({ voiceSeconds: VOZ })
  const naZona = (e) => parseFloat(e.y) / 100 > 0.14 && parseFloat(e.y) / 100 < 0.65
  const cartaoOk = card.source === BUILD.closeCard.url && card.time === t.cardStart && name?.text === 'Perfume LUME' && cta?.text === 'Compre agora' && name.time === t.cardStart && cta.time === t.cardStart &&
    naZona(name) && naZona(cta) && parseFloat(name.y) / 100 > cr.ADS_V2_CLOSE_REAL_CARD_PRODUCT_BOX.y1 && parseFloat(cta.y) > parseFloat(name.y) && !src.elements.some((e) => e.source === BUILD.cardUrl)
  // sem o cartão do formato (o recorte falhou) = o cartão do pedido, sem nome nem chamada por cima
  const sem = cr.buildAdV2CloseRealSource({ ...BUILD, closeCard: null })
  const semOk = sem.elements.find((e) => e.type === 'image' && e.track === T.card).source === BUILD.cardUrl && !sem.elements.some((e) => e.track === CT.name || e.track === CT.cta)
  // a chamada nas 16 línguas da interface (as mesmas do seletor de formato); desconhecida = inglês
  const langs = Object.keys(cr.ADS_V2_AD_FORMAT_COPY)
  const ctaOk = langs.length === 16 && langs.every((l) => typeof cr.ADS_V2_CLOSE_REAL_CTA[l] === 'string' && cr.ADS_V2_CLOSE_REAL_CTA[l].length >= 4 && cr.adsV2CloseRealCta(l) === cr.ADS_V2_CLOSE_REAL_CTA[l]) &&
    cr.adsV2CloseRealCta('pt') === 'Compre agora' && cr.adsV2CloseRealCta('en') === 'Shop now' && cr.adsV2CloseRealCta('xx') === 'Shop now' && cr.adsV2CloseRealCta('pt-BR') === 'Compre agora'
  const nomeOk = cr.adsV2CloseRealCardName('Perfume LUME — fragrâncias exclusivas') === 'Perfume LUME' && cr.adsV2CloseRealCardName(null) === ''
  return cartaoOk && semOk && ctaOk && nomeOk
}
// o fundo do cartão: o MESMO gradiente do gancho (mesma paleta) com o produto pequeno colado pixel a pixel na caixa do cartão
const corte = () => { const W = 60, Hh = 140, data = new Uint8Array(W * Hh * 4); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4; const edge = x === 0 || y === 0 || x === W - 1 || y === Hh - 1; data[o] = 214; data[o + 1] = 170 + (y % 7); data[o + 2] = 90; data[o + 3] = edge ? 128 : 255 } return { width: W, height: Hh, data } }
const provaFundoCartao = (over = {}) => {
  const L = carregar(over, { '@/lib/userFootage': { footageAdminClient: () => null }, '@/lib/ads/v2ProductLockServer': { adsV2CutoutFor: async () => { throw new Error('offline') } } })
  const srv = L(F.srv), png = L(F.png), cr = L(F.cr)
  const cut = corte()
  const hero = srv.adsV2CloseRealHeroRgba(cut, 270, 480)
  const card = srv.adsV2CloseRealHeroRgba(cut, 270, 480, cr.ADS_V2_CLOSE_REAL_CARD_PRODUCT_BOX)
  const r = card.rect, B = cr.ADS_V2_CLOSE_REAL_CARD_PRODUCT_BOX
  const piece = png.resampleRgba(cut, r.w, r.h)
  let same = 0, total = 0
  for (let y = 1; y < r.h - 1; y++) for (let x = 1; x < r.w - 1; x++) { const p = (y * r.w + x) * 4; if (piece.data[p + 3] !== 255) continue; total++; const o = ((r.y + y) * 270 + (r.x + x)) * 4; if (card.img.data[o] === piece.data[p] && card.img.data[o + 1] === piece.data[p + 1] && card.img.data[o + 2] === piece.data[p + 2]) same++ }
  const menor = r.h < hero.rect.h && r.w < hero.rect.w
  const naCaixa = r.y >= Math.floor(B.y0 * 480) - 1 && r.y + r.h <= Math.round(B.y1 * 480) + 1 && r.x >= Math.floor(B.x0 * 270) - 1 && r.x + r.w <= Math.round(B.x1 * 270) + 1
  return total > 30 && same === total && menor && naCaixa && JSON.stringify(card.palette) === JSON.stringify(hero.palette) && card.img.data[0] === hero.img.data[0] && card.img.data[2] === hero.img.data[2]
}
// adsV2CloseRealHero EXECUTADO com o recorte e o bucket falsos: grava o gancho E o cartão; o cartão falhou = cardUrl null e o gancho segue
const provaServidorCartao = async (over = {}, falhaCartao = false) => {
  const ups = []
  const admin = { storage: { from: () => ({ upload: async (p) => { ups.push(p); return { error: falhaCartao && /-closereal-card\.png$/.test(p) ? { message: 'x' } : null } }, getPublicUrl: (p) => ({ data: { publicUrl: H(p) } }) }) } }
  const L = carregar(over, { '@/lib/userFootage': { footageAdminClient: () => admin }, '@/lib/ads/v2ProductLockServer': { adsV2CutoutFor: async () => corte() } })
  const srv = L(F.srv)
  const r = await srv.adsV2CloseRealHero({ userId: 'u1', orderId: 'o-1', product: { footageId: 'f1', url: H('frasco.jpg') } })
  return { r, ups }
}
const provaServidor = async (over = {}) => {
  const a = await provaServidorCartao(over)
  const b = await provaServidorCartao(over, true)
  return a.r && a.r.url === H('u1/adsv2-o-1-closereal-hero.png') && a.r.cardUrl === H('u1/adsv2-o-1-closereal-card.png') && a.ups.length === 2 &&
    b.r && b.r.url === H('u1/adsv2-o-1-closereal-hero.png') && b.r.cardUrl === null &&
    SRC.advance.includes('closeCard: hero?.cardUrl && adsV2CloseRealCardName(order.brief?.business) ? { url: hero.cardUrl, name: adsV2CloseRealCardName(order.brief?.business), cta: adsV2CloseRealCta(language) } : null') &&
    SRC.advance.includes('narration, closeCard:')
}
const provaOrdem = (over = {}) => {
  const cr = CR(over)
  const ordem = (fotos) => { const src = cr.buildAdV2CloseRealSource({ ...BUILD, photos: fotos }); return src.elements.filter((e) => e.type === 'image' && e.enter_transition && fotos.includes(e.source)).map((e) => e.source) }
  const tres = ordem(FOTOS), duas = ordem(FOTOS.slice(0, 2)), uma = ordem(FOTOS.slice(0, 1))
  return JSON.stringify(tres) === JSON.stringify([FOTOS[1], FOTOS[2], FOTOS[0]]) && JSON.stringify(duas) === JSON.stringify([FOTOS[1], FOTOS[0], FOTOS[1]]) && uma.every((u) => u === FOTOS[0]) && uma.length === 3 &&
    JSON.stringify(cr.adsV2CloseRealShotPhotos(['a', 'b', 'c', 'd'])) === '["b","c","d","a"]'
}
const provaMedicao = (over = {}) => {
  const plan = Object.hasOwn(over, F.plan) ? over[F.plan] : SRC.plan
  const del = "    if (closeReal) { delete (modeTag as { in_hand?: unknown }).in_hand; delete (modeTag as { in_hand_pair?: unknown }).in_hand_pair }"
  const iDel = plan.indexOf(del), iSet = plan.indexOf('    if (inHand) Object.assign(modeTag, { in_hand_pair: inHandPair })'), iServed = plan.indexOf('    await served(true, {')
  return iDel > 0 && iSet > 0 && iServed > 0 && iSet < iDel && iDel < iServed && plan.includes('      ...(closeRealAsked ? { closeReal: true } : {}),')
}
const provaTeto = (over = {}) => {
  const S = carregar(over)(F.sample)
  return S.ADS_SAMPLE_DAILY_CAP === 30 && SRC.access.includes('return count >= ADS_SAMPLE_DAILY_CAP') && !/count >= 10\b/.test(SRC.access)
}
// R — o resto intocado: sem closeReal, o texto do /plan é o de sempre (o fecho com nome e o hífen viram o que viravam)
const provaResto = async (over = {}) => {
  const r = await texto(false, over)
  const C = carregar(over)(F.fit)
  const semTeto = C.adsV2CompleteSpeech('Descubra o Perfume LUME. Uma fragrância delicada no frasco dourado. Perfume LUME, notas suaves.', { min: 27, max: 30, language: 'pt', close: { name: 'Perfume LUME', brand: true, used: new Set() } })
  return r.ok === true && r.copy.overlays[0] === 'Perfume LUME Fragrâncias Exclusivas' && (r.honestyFixes ?? []).includes('overlay_dash') && (r.honestyFixes ?? []).includes('speech_close_name') && semTeto.fixes.includes('speech_close_name')
}

// ═══ L ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nL. legendas em sincronia com a voz')
await check('L1 EXECUTADO (montagem do canário de1c0d72): 4 legendas, 1 por plano, cada uma a ≤ 0,35 s de quando a voz a diz ("Sinta…" entre 3 e 7 s, não 8 s depois); sem buraco de 0 até o cartão (nenhum plano sem frase); sem voz = as frases de tela repartidas; voz longa e fala curta continuam sem buraco', () => provaLegendas())
// ═══ G ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nG. tamanho de anúncio, zona segura')
await check('G1 fonte ≥ 4% da altura (era 2,5%), negrito 800 em pílula escura, ≤ 5 palavras por linha, entre 14% e 65% e acima do produto do gancho (720 e 1080; o pior caso de 10 palavras compridas sem perder palavra); a marca-d\'água da amostra fica entre 14% e o topo das legendas', () => provaTamanho())
// ═══ T ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nT. o travessão nunca cola dois pedaços')
await check('T1 a montagem: "Perfume LUME - Fragrâncias Exclusivas" → "Perfume LUME · Fragrâncias Exclusivas" no gancho; "9 - 18h" fica', () => provaTravessao())
// ═══ N ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nN. narração sem repetir a marca')
await check('N1 EXECUTADO (extractAdsV2Brief com OpenAI falsa, closeReal): a marca no máximo 2 vezes, nunca "Agora, Perfume LUME.", nunca 2 frases seguidas com a marca, piso de 27 palavras mantido; o título sai "Perfume LUME · Fragrâncias Exclusivas" (sem overlay_dash)', () => provaNarracao())
await check('N2 a régua do fecho (adsV2CompleteSpeech com nameMax 2): conta as menções que o texto já tem e não põe fecho com o nome logo depois de uma frase que já o diz; o piso sai com "Para você."/"Do seu jeito."', () => provaFecho())
// ═══ Z ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nZ. gancho que se mexe')
await check('Z1 o gancho: zoom 100→112% com ease, a partir do topo do produto (36%), só a escala (nada de color_filter/playback_rate/blur), sem fade de entrada', () => provaGancho())
// ═══ C ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. cartão final do formato')
await check('C1 a montagem: o cartão do formato (fundo próprio) + o nome + "Compre agora" no tempo do cartão, na zona segura, abaixo do produto; sem ele = o PNG do pedido; a chamada nas 16 línguas (desconhecida = inglês)', () => provaCartao())
await check('C2 o fundo do cartão = a MESMA paleta do gancho e o produto recortado MENOR, colado pixel a pixel dentro da caixa do cartão', () => provaFundoCartao())
await check('C3 EXECUTADO: adsV2CloseRealHero grava o gancho E o cartão (…-closereal-card.png); cartão falhou = cardUrl null e o gancho segue; o avanço passa a narração e o cartão (nome do brief + chamada na língua do pedido)', () => provaServidor())
// ═══ O ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nO. ordem das fotos')
await check('O1 gancho A → B → C → A; com 2 fotos B → A → B; com 1, ela; a foto do gancho nunca abre os planos quando há outra', () => provaOrdem())
// ═══ I ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nI. medição')
await check('I1 ads_v2_plan_served: no Close real, in_hand/in_hand_pair saem do modeTag DEPOIS de marcados e ANTES do served(true); o /plan manda closeReal ao texto', () => provaMedicao())
// ═══ S ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nS. teto da amostra')
await check('S1 ADS_SAMPLE_DAILY_CAP = 30 (fundador 19/10) e a porta usa a constante', () => provaTeto())
// ═══ R ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nR. o resto intocado')
await check('R1 EXECUTADO sem closeReal: o texto do Ads de sempre (o hífen vira espaço com overlay_dash; o fecho com nome continua valendo)', () => provaResto())
await check('R2 o Apresentador não é tocado: nenhuma linha desta entrega em v2PresenterV2/adV2Montage/v2Presenter; o caminho do Close real é o único que muda no avanço', () => {
  const tocados = git('diff', '--name-only', CLOSE_REAL_AJUSTE_1910_BASE, 'HEAD').trim().split('\n').filter(Boolean).concat(git('diff', '--name-only', 'HEAD').trim().split('\n').filter(Boolean))
  const adv = (TROCAS_CLOSE_REAL_AJUSTE_1910[F.advance] ?? []).map(([n]) => n)
  return ['lib/ads/v2PresenterV2.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/v2Presenter.ts', 'lib/ads/v2Tiers.ts', 'lib/ads/v2Billing.ts', 'lib/compose.ts'].every((f) => !tocados.includes(f)) &&
    adv.length === 1 && adv[0].includes('closeRealSource = buildAdV2CloseRealSource(') && SRC.advance.split('\n').filter((l) => l.includes(MARCA)).every((l) => /CloseReal|closeReal/.test(l))
})

// ═══ D ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, novos, marca, encadeamento')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-close-real-ajuste-1910.mjs), é EXATAMENTE a base ${CLOSE_REAL_AJUSTE_1910_BASE.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  CLOSE_REAL_AJUSTE_1910_ARQUIVOS.length >= 7 && CLOSE_REAL_AJUSTE_1910_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(semCloseRealAjuste1910(rd(f), f)) === b }) &&
  CLOSE_REAL_AJUSTE_1910_NOVOS.length >= 2 && CLOSE_REAL_AJUSTE_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && MARCA_CLOSE_REAL_AJUSTE_1910 === MARCA)
await check('D2 toda linha nova traz a marca (troca listada inteira); a marca não contém a do Close real (KINEO-CLOSE-REAL-1910), para os desfaz não se misturarem', () => {
  const trocas = Object.values(TROCAS_CLOSE_REAL_AJUSTE_1910).flat()
  return trocas.length > 0 && trocas.every(([nova]) => nova.includes(MARCA)) && !MARCA.includes('KINEO-CLOSE-REAL-1910') &&
    CLOSE_REAL_AJUSTE_1910_ARQUIVOS.every((f) => { const b = base(f).split('\n'); const cur = rd(f).split('\n'); const novas = cur.filter((l) => !b.includes(l)); return novas.every((l) => l.includes(MARCA)) })
})
await check('D3 encadeamento: os guardiões reancorados tiram esta camada PRIMEIRO (semCloseRealAjuste1910 colado no readFileSync / na fonte do carregador); texto sem a marca e arquivo fora da lista passam igual', () => {
  const reanc = CLOSE_REAL_AJUSTE_1910_ARQUIVOS.filter((f) => f.startsWith('scripts/'))
  return reanc.length > 0 && reanc.every((f) => rd(f).includes('semCloseRealAjuste1910(')) && semCloseRealAjuste1910('sem marca\nnada', 'lib/x.ts') === 'sem marca\nnada' && semCloseRealAjuste1910(null, 'x') === null
})

// ═══ M ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (aplicados e vermelhos)')
const mut = async (nome, fn) => { let red = false; try { red = !(await fn()) } catch (e) { if (/mutante não aplicou|mutante sem efeito/.test(e.message)) { console.log('       (' + e.message + ')'); red = false } else red = true } ok(red, nome) }
await mut('M1 as legendas ignoram a voz (só as 2 frases de tela) → L vermelho', () => provaLegendas({ [F.cr]: trocar(SRC.cr, '  if (words.length >= 2 && vs > 0) { // KINEO-CLOSE-REAL-AJUSTE-1910', '  if (false) { // KINEO-CLOSE-REAL-AJUSTE-1910') }))
await mut('M2 a legenda entra no corte do plano, não quando a voz a diz → L vermelho', () => provaLegendas({ [F.cr]: trocar(SRC.cr, '    const spoken = bounds.slice(0, K).map((a) => r3(at[a]))', '    const spoken = bounds.slice(0, K).map((a, j) => r3(planStarts[j]))') }))
await mut('M3 a fonte volta aos 2,5% da altura → G vermelho', () => provaTamanho({ [F.cr]: trocar(SRC.cr, 'export const ADS_V2_CLOSE_REAL_CAPTION_FONT = 0.045', 'export const ADS_V2_CLOSE_REAL_CAPTION_FONT = 0.025').split('export const ADS_V2_CLOSE_REAL_CAPTION_FONT_MIN = 0.036').join('export const ADS_V2_CLOSE_REAL_CAPTION_FONT_MIN = 0.02') }))
await mut('M4 a marca-d\'água volta para a base em 31% (no meio das legendas) → G vermelho', () => provaTamanho({ [F.cr]: trocar(SRC.cr, 'export const ADS_V2_CLOSE_REAL_WATERMARK_TOP = 0.14', 'export const ADS_V2_CLOSE_REAL_WATERMARK_TOP = 0.29') }))
await mut('M5 o travessão volta a sumir (espaço) → T vermelho', () => provaTravessao({ [F.cr]: trocar(SRC.cr, "(_all: string, a: string) => a + ' · ').replace(/\\s+/g, ' ').trim()", "(_all: string, a: string) => a + ' ').replace(/\\s+/g, ' ').trim()") }))
await mut('M6 o /plan esquece o travessão do Close real (o acabamento cola os pedaços) → N vermelho', () => provaNarracao({ [F.brief]: trocar(SRC.brief, '  if (args.closeReal === true) { checked = { ...checked, copy: adsV2CloseRealOverlayDash(checked.copy) };', '  if (false) { checked = { ...checked, copy: adsV2CloseRealOverlayDash(checked.copy) };') }))
await mut('M7 o teto de menções é ignorado (o fecho "Agora, Perfume LUME." volta) → N vermelho', () => provaNarracao({ [F.fit]: trocar(SRC.fit, '    const nameCapped = nameMax > 0 && (nameCount(t) >= nameMax ||', '    const nameCapped = false && (nameCount(t) >= nameMax ||') }))
await mut('M8 a régua não conta as menções que o texto já tem → N2 vermelho', () => provaFecho({ [F.fit]: trocar(SRC.fit, '(nameCount(t) >= nameMax || normWords(last)', '(named >= nameMax || normWords(last)') }))
await mut('M9 o gancho volta ao zoom de 106% → Z vermelho', () => provaGancho({ [F.cr]: trocar(SRC.cr, "export const ADS_V2_CLOSE_REAL_HOOK_ZOOM_END = '112%'", "export const ADS_V2_CLOSE_REAL_HOOK_ZOOM_END = '106%'") }))
await mut('M10 o cartão ignora o do formato (volta o PNG azul-marinho) → C vermelho', () => provaCartao({ [F.cr]: trocar(SRC.cr, '  const cc = input.closeCard && isHttps(input.closeCard.url) ? input.closeCard : null', '  const cc = null as AdV2CloseRealInput[\'closeCard\']') }))
await mut('M11 o fundo do cartão perde a caixa pequena (o produto sai grande) → C2 vermelho', () => provaFundoCartao({ [F.srv]: trocar(SRC.srv, '  const rect = adsV2CloseRealProductRect(W, H, cut.width, cut.height, box)', '  const rect = adsV2CloseRealProductRect(W, H, cut.width, cut.height)') }))
await mut('M12 o servidor não grava o cartão → C3 vermelho', () => provaServidor({ [F.srv]: trocar(SRC.srv, '    return { url, rect: hero.rect, cardUrl }', '    return { url, rect: hero.rect, cardUrl: null }') }))
await mut('M13 os planos voltam a abrir com a foto do gancho → O vermelho', () => provaOrdem({ [F.cr]: trocar(SRC.cr, '  return list.length >= 2 ? [...list.slice(1), list[0]] : list', '  return list') }))
await mut('M14 a medição volta a gravar in_hand no Close real → I vermelho', () => provaMedicao({ [F.plan]: trocar(SRC.plan, "    if (closeReal) { delete (modeTag as { in_hand?: unknown }).in_hand; delete (modeTag as { in_hand_pair?: unknown }).in_hand_pair }", '    // (sem a limpeza)') }))
await mut('M15 o teto da amostra volta a 10 → S vermelho', () => provaTeto({ [F.sample]: trocar(SRC.sample, 'export const ADS_SAMPLE_DAILY_CAP = 30', 'export const ADS_SAMPLE_DAILY_CAP = 10') }))
await mut('M16 o teto de menções vale para TODO pedido (não só o Close real) → R vermelho', () => provaResto({ [F.brief]: trocar(SRC.brief, '  if (args.closeReal === true) Object.assign(speechClose, { nameMax: ADS_V2_CLOSE_REAL_NAME_MAX })', '  Object.assign(speechClose, { nameMax: ADS_V2_CLOSE_REAL_NAME_MAX })') }))

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
