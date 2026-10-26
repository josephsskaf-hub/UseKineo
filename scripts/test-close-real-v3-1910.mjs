// KINEO-CLOSE-REAL-V3-1910 — guardião da RODADA 3 do formato "Close do produto real" do Studio Ads (canário v2 ddb44e546, 19/10:
// docs/RESULTADO-CANARIO-CLOSE-REAL-V2-2026-10-19.md). Roda com `node scripts/test-close-real-v3-1910.mjs` na raiz do repo, sem rede, sem banco, sem
// fornecedor: os módulos são transpilados pelo typescript do repo (scripts/test-support/offline-ts-loader.mjs) com stubs, e a MONTAGEM é executada de verdade.
//
// O que prova (1 seção por ponto do pedido):
//   V  VOZ por língua: o áudio cedo do Close real usa a MESMA voz da montagem (PT-BR = Portuguese_ConfidentWoman; EN = a voz que a tabela manda); o resto, a de sempre;
//   L  LEGENDA = FRASE INTEIRA: nenhuma legenda começa no meio de uma frase (nem em minúscula), nenhuma junta 2 frases, nenhuma termina pendurada, ≤ 2 linhas a ≥ 4%;
//   F  FECHO completo: com a marca no teto, a fala não termina em "Para você." (2 palavras soltas): fecho com verbo e sem a marca;
//   P  PRODUTO livre: a legenda nunca cobre o produto (a caixa do recorte de cada foto, com o zoom do plano): acima dele, ou abaixo até 65% / 80%;
//   T  TÍTULO: o " · " vira quebra de linha (nunca sobra "·" no fim da linha); sem caber, só a 1ª parte;
//   C  CTA = BOTÃO: 4% da altura, folga e canto arredondado com as propriedades já em produção, cor do texto da embalagem, abaixo do nome com respiro;
//   R  O RESTO intocado: Apresentador, v2PresenterV2, adV2Montage, o fecho fora do Close real e a voz cedo dos outros pedidos;
//   D  desfaz exato + novos + marca + encadeamento (os guardiões byte a byte tiram esta camada PRIMEIRO);
//   M  mutantes (todos APLICADOS e VERMELHOS).
import { diffSoHome3Cards1910, semHome3Cards1910 } from './test-support/desfaz-home-3-cards-1910.mjs' // reancorado KINEO-HOME-3-CARDS-1910 — os 3 cards da home (+ amostra pela entrada do card) saem do diff/leitura em memória
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { semKitBf1910, KIT_BF_1910_ARQUIVOS } from './test-support/desfaz-kit-bf-1910.mjs' // reancorado KINEO-KIT-BF-1910 — o Kit Black Friday (19/10) toca v2Brief/v2PlanCore só com linhas marcadas: desfeitas, o arquivo é o de antes
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import zlib from 'node:zlib'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semCloseRealV3_1910, CLOSE_REAL_V3_1910_ARQUIVOS, CLOSE_REAL_V3_1910_NOVOS, CLOSE_REAL_V3_1910_BASE, MARCA_CLOSE_REAL_V3_1910, TROCAS_CLOSE_REAL_V3_1910 } from './test-support/desfaz-close-real-v3-1910.mjs'
import { semFilmesF1Virgula1910 } from './test-support/desfaz-filmes-f1-virgula-1910.mjs' // KINEO-FILMES-F1-VIRGULA-1910 — reancorado: a camada mais nova sai primeiro
import { semCloseRealLegenda1910 } from './test-support/desfaz-close-real-legenda-1910.mjs' // KINEO-CLOSE-REAL-LEGENDA-1910 — reancorado: a legenda menor (a camada mais nova) sai PRIMEIRO
import { semCloseRealAjuste1910 } from './test-support/desfaz-close-real-ajuste-1910.mjs'
import { semCloseReal1910 } from './test-support/desfaz-close-real-1910.mjs'
import { semFilmesF1F3Ajuste1910 } from './test-support/desfaz-filmes-f1f3-ajuste-1910.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const MARCA = 'KINEO-CLOSE-REAL-V3-1910'
const lf = (s) => String(s).split('\r\n').join('\n')
import { semMeta95Assunto1910 } from './test-support/desfaz-meta95-assunto-1910.mjs' // KINEO-META95-ASSUNTO-1910 — reancorado: o assunto traduzido (19/10, a camada mais nova nos guardiões reancorados) sai PRIMEIRO, em memória
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'
const rd = (p) => lf(semFilmesF1Virgula1910(semCloseRealLegenda1910(semMeta95Assunto1910(semAfiliado50_2610(p, readFileSync(join(ROOT, p), 'utf8')), p), p), p)) /* reancorado KINEO-META95-ASSUNTO-1910: a camada do assunto traduzido sai primeiro */ // KINEO-CLOSE-REAL-LEGENDA-1910 — reancorado: a legenda menor do Close real (a mais nova) sai PRIMEIRO; depois a camada do export limpo
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const base = (p) => { try { return lf(git('show', `${CLOSE_REAL_V3_1910_BASE}:${p}`)) } catch { return null } }
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('mutante não aplicou (' + n + 'x): ' + a.slice(0, 70)); const out = src.split(a).join(b); if (out === src) throw new Error('mutante sem efeito'); return out }

const F = { cr: 'lib/ads/v2CloseReal.ts', srv: 'lib/ads/v2CloseRealServer.ts', advance: 'lib/ads/v2Advance.ts', fit: 'lib/ads/v2CopyFit.ts', cedo: 'lib/ads/v2AudioCedo.ts', pv2: 'lib/ads/v2PresenterV2.ts', png: 'lib/ads/v2Png.ts', montage: 'lib/ads/adV2Montage.ts' }
const SRC = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))
const carregar = (over = {}, mocks = {}, globals = {}) => createOfflineLoader({ mocks: { 'node:zlib': zlib, ...mocks }, globals, source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : semCloseRealLegenda1910(text, rel)) }) // KINEO-CLOSE-REAL-LEGENDA-1910 — reancorado: executa o formato na régua da rodada 3 (antes da legenda menor, provada em scripts/test-close-real-legenda-1910.mjs)
const CR = (over = {}) => carregar(over)(F.cr)
const H = (n) => `https://cdn.test/${n}`
const W = 1080, HH = 1920
const r3 = (n) => Math.round(n * 1000) / 1000

// O canário v2 (19/10): as narrações gravadas no pedido (o PT já com o fecho novo), as vozes medidas, o título com " · ".
const NARR_EN = 'Explore the enchanting scents from Perfume LUME. Each fragrance tells a unique story, inviting you to experience something truly special. Find your new favorite scent today and indulge yourself!'
const VOZ_EN = 12.13
const NARR_PT_27 = 'Conheça Perfume LUME. Um aroma envolvente que te transporta a momentos especiais. Experimente a sensação única de Perfume LUME e sinta a fragrância que encanta a todos.'
const NARR_PT = NARR_PT_27 + ' Você merece.'
const VOZ_PT = 12.6
const FOTOS = [H('frasco-pequeno.jpg'), H('frasco-bege.jpg'), H('cetim.jpg')]
const BUILD = (lang) => ({ width: W, height: HH, heroUrl: H('hero.png'), heroFallbackUrl: FOTOS[0], photos: FOTOS, phrases: [lang === 'pt' ? 'Perfume LUME - Fragrâncias Únicas' : 'Perfume LUME - Unique Fragrances', 'x'], fontFamily: 'Montserrat', cardUrl: H('card.png'), cardSeconds: 2.5, musicUrl: H('m.mp3'), musicTrimStart: 0, voiceUrl: H('v.mp3'), voiceSeconds: lang === 'pt' ? VOZ_PT : VOZ_EN, watermark: null, narration: lang === 'pt' ? NARR_PT : NARR_EN, closeCard: { url: H('cc.png'), name: 'Perfume LUME', cta: lang === 'pt' ? 'Compre agora' : 'Shop now', ink: '#2a1d10' } })
const legendas = (cr, src) => src.elements.filter((e) => e.type === 'text' && e.track === cr.ADS_V2_CLOSE_REAL_TRACKS.text).sort((a, b) => a.time - b.time)
const frases = (t) => t.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean)
const palavras = (s) => String(s).toLocaleLowerCase().replace(/[^\p{L}\p{N}\s'’-]/gu, ' ').split(/\s+/).filter(Boolean)
const FRACAS = new Set(['a', 'an', 'the', 'of', 'to', 'from', 'with', 'and', 'or', 'but', 'that', 'de', 'do', 'da', 'e', 'o', 'que', 'para', 'com', 'um', 'uma', 'em', 'te'])

// ── V: a voz ────────────────────────────────────────────────────────────────────────────────────────────────────────
const cedoCom = (over = {}) => {
  const calls = []
  const L = carregar(over, {
    '@/lib/compose': { estimateMp3DurationSeconds: () => 12.5, uploadVoiceoverToSupabase: async () => 'https://vo/v.mp3' },
    '@/lib/lyriaMusic': { getLyriaMusicUrl: async () => null },
    '@/lib/ttsFallback': { synthesizeTtsFallback: async (txt) => { calls.push('padrao:' + txt); return Buffer.from('mp3') } },
    '@/lib/ads/v2Images': { persistAudioCopy: async () => null },
    '@/lib/ads/v2Advance': { adsV2PresenterPlanOf: (plan) => (plan && plan.presenter ? plan.presenter : null), adsV2CloseRealNarrationVoice: async (order, txt) => { calls.push('close:' + order.language + ':' + txt); return Buffer.from('mp3') } },
    '@/lib/serverEvents': { writeServerEvent: async () => true },
    '@/lib/cronLease': { tomarVezDoCron: async () => ({ ok: true }) },
  })
  return { AC: L(F.cedo), calls }
}
const banco = () => { const ups = []; const q = { update: (d) => { ups.push(d); return q }, eq: () => q, is: () => Promise.resolve({ data: null, error: null }) }; return { db: { from: () => q }, ups } }
const PEDIDO = (lang, closeReal) => ({ id: 'o-1', user_id: 'u-1', generation_id: 'g', status: 'generating', sector: 'store', language: lang, brief: {}, narration: true, music_url: 'https://m/x.mp3', voice_url: null, voice_seconds: null, plan: { narration: lang === 'pt' ? NARR_PT : NARR_EN, ...(closeReal ? { closeReal: { v: 1, product: { footageId: 'f1', url: FOTOS[0] }, photos: FOTOS } } : {}) } })
const provaVoz = async (over = {}) => {
  const a = cedoCom(over), b = cedoCom(over), c = cedoCom(over)
  const ra = await a.AC.adsV2AudioCedo(banco().db, PEDIDO('pt', true))
  const rb = await b.AC.adsV2AudioCedo(banco().db, PEDIDO('en', true))
  const rc = await c.AC.adsV2AudioCedo(banco().db, PEDIDO('pt', false))
  // a voz que a montagem do Close real escolhe (adsV2NarrationVoice → adsV2PresenterV2VoiceFor(língua, 'woman')): PT = ConfidentWoman na speech-2.8-hd; EN = a de sempre
  const pv = carregar(over)(F.pv2)
  const pt = pv.adsV2PresenterV2VoiceFor('pt', 'woman'), en = pv.adsV2PresenterV2VoiceFor('en', 'woman')
  const adv = Object.hasOwn(over, F.advance) ? over[F.advance] : SRC.advance
  const ramo = adv.slice(adv.indexOf('async function adsV2NarrationVoice('), adv.indexOf('const pv = await presenterV2Of(order)', adv.indexOf('async function adsV2NarrationVoice(')))
  return ra.voz === 'pronta' && a.calls.length === 1 && a.calls[0].startsWith('close:pt:Conheça Perfume LUME.') &&
    rb.voz === 'pronta' && b.calls.length === 1 && b.calls[0].startsWith('close:en:Explore') &&
    rc.voz === 'pronta' && c.calls.length === 1 && c.calls[0].startsWith('padrao:Conheça') &&
    pt.engine === 'minimax' && pt.voiceId === 'Portuguese_ConfidentWoman' && /speech-2\.8-hd/.test(pt.model) && en.engine !== 'minimax' &&
    adv.includes('export function adsV2CloseRealNarrationVoice(order: AdsV2OrderRow, text: string): Promise<Buffer> { return adsV2NarrationVoice(order, text, true) }') &&
    ramo.includes("lib.adsV2PresenterV2VoiceFor(narrationLanguage(order.language) ?? 'en', 'woman')") && ramo.includes('vm.synthesizeWithVoice({ voiceId: cv.voiceId')
}

// ── L: legenda = frase inteira ──────────────────────────────────────────────────────────────────────────────────────
const provaFrases = (over = {}) => {
  const cr = CR(over)
  const linhas = (txt, px) => cr.adsV2CloseRealCaptionLines2(txt, px, W)
  return ['en', 'pt'].every((lang) => {
    const b = BUILD(lang)
    const src = cr.buildAdV2CloseRealSource(b)
    const t = cr.adsV2CloseRealTimeline({ voiceSeconds: b.voiceSeconds })
    const els = legendas(cr, src)
    const textos = [...new Set(els.map((e) => e.text))]
    const fs = frases(b.narration)
    const faladas = textos.slice(1) // a 1ª é o título do gancho
    // cada legenda falada = o COMEÇO de UMA frase (começa na 1ª palavra dela, maiúscula), nunca 2 frases juntas, nunca termina em palavra fraca
    const inteira = faladas.length >= 2 && faladas.every((txt) => { const w = palavras(txt); const f = fs.find((s) => palavras(s).slice(0, w.length).join(' ') === w.join(' ')); return !!f && /^\p{Lu}/u.test(txt) && !/[.!?…]\s/u.test(txt) && !FRACAS.has(w[w.length - 1]) })
    // ≤ 2 linhas na fonte em que a montagem a pôs, e essa fonte ≥ 4% da altura (o título pode descer até 3,6%)
    const duas = els.every((e) => linhas(e.text, e.font_size).length <= 2 && (e.text === textos[0] || e.font_size >= Math.round(0.04 * HH)))
    // sem buraco: de 0 até o cartão sempre há legenda
    let semBuraco = true
    for (let x = 0; x < t.content - 1e-6; x += 0.05) if (!els.some((e) => e.time <= x + 1e-9 && x < e.time + e.duration - 1e-9)) semBuraco = false
    // no tempo da voz: cada legenda falada entra a ≤ 0,75 s de quando a voz começa a frase dela (a fração de caracteres × a voz medida)
    const quando = (txt) => { const i = b.narration.indexOf(txt.split(' ').slice(0, 2).join(' ')); return 0.3 + (b.voiceSeconds * i) / b.narration.length }
    const sync = faladas.every((txt) => Math.abs(els.find((e) => e.text === txt).time - quando(txt)) <= 0.75)
    // os pedaços do canário NÃO voltam
    const pedacos = !textos.some((x) => /e sinta$|^a fragrância|^inviting|Para você/i.test(x))
    return inteira && duas && semBuraco && sync && pedacos && els[0].time === 0
  })
}
const provaEncurta = (over = {}) => {
  const cr = CR(over)
  const enc = (s) => cr.adsV2CloseRealCaptionWords(s.split(' '), W, HH).join(' ')
  return enc('Find your new favorite scent today and indulge yourself!') === 'Find your new favorite scent today' &&
    enc('Each fragrance tells a unique story, inviting you to experience something truly special.') === 'Each fragrance tells a unique story,' &&
    enc('Experimente a sensação única de Perfume LUME e sinta a fragrância que encanta a todos.') === 'Experimente a sensação única' &&
    enc('Um aroma envolvente que te transporta a momentos especiais.') === 'Um aroma envolvente que te transporta' &&
    enc('Você vai amar.') === 'Você vai amar.' && cr.ADS_V2_CLOSE_REAL_CAPTION_LINES_MAX === 2 && cr.ADS_V2_CLOSE_REAL_CAPTION_FONT_FLOOR === 0.04
}

// ── F: o fecho ──────────────────────────────────────────────────────────────────────────────────────────────────────
const provaFecho = (over = {}) => {
  const C = carregar(over)(F.fit)
  const close = (lang) => ({ name: 'Perfume LUME', brand: true, used: new Set(), nameMax: 2 })
  const ult = (t) => frases(t).slice(-1)[0]
  const lista = (lang) => (C.ADS_V2_CLOSE_REAL_FULL_CLOSES[lang] ?? []).map((c) => c.t)
  const pt = C.adsV2CompleteSpeech(NARR_PT_27, { min: 29, max: 30, language: 'pt', close: close('pt') })
  const en = C.adsV2CompleteSpeech('Explore the scents from Perfume LUME. Each fragrance tells a unique story. Find your new favorite scent and indulge yourself with Perfume LUME!', { min: 29, max: 30, language: 'en', close: close('en') })
  const lumes = (s) => (String(s).match(/\bLUME\b/g) || []).length
  const velhos = ['Para você.', 'Do seu jeito.', 'Agora.', 'For you.', 'Your way.', 'Now.']
  const completo = (lang) => ['en', 'pt', 'es', 'fr', 'it', 'de'].every((l) => lista(l).length === 3 && C.ADS_V2_CLOSE_REAL_FULL_CLOSES[l].filter((c) => c.cta).length === 1 && lista(l).every((s) => !/LUME|\{name\}/.test(s) && /[.!?]$/.test(s)))
  return pt.fixes.includes('speech_close') && lista('pt').includes(ult(pt.text)) && !velhos.includes(ult(pt.text)) && lumes(pt.text) === 2 && pt.text.split(/\s+/).length <= 29 &&
    en.fixes.includes('speech_close') && lista('en').includes(ult(en.text)) && lumes(en.text) === 2 && completo()
}

// ── P: a legenda fora do produto ────────────────────────────────────────────────────────────────────────────────────
// a conta INDEPENDENTE de onde o produto aparece: foto em cover no quadro e escalada em torno de (xa, 50%) por cada zoom do plano
const spanAMao = (b, zooms, xa) => {
  const s = Math.max(W / b.w, HH / b.h), dw = b.w * s, dh = b.h * s, ox = (W - dw) / 2, oy = (HH - dh) / 2
  const ys = zooms.flatMap((z) => [0.5 * HH + (oy + b.y0 * dh - 0.5 * HH) * z, 0.5 * HH + (oy + b.y1 * dh - 0.5 * HH) * z])
  const xs = zooms.flatMap((z) => [xa * W + (ox + b.x0 * dw - xa * W) * z, xa * W + (ox + b.x1 * dw - xa * W) * z])
  return { y0: Math.max(0, Math.min(...ys) / HH), y1: Math.min(1, Math.max(...ys) / HH), x0: Math.max(0, Math.min(...xs) / W), x1: Math.min(1, Math.max(...xs) / W) }
}
// fotos do conjunto: B = o frasco grande com a TAMPA no alto (10–45%), C = o produto que desce no quadro (32–80%: só o zoom o leva às legendas), A = o frasco que enche a foto
const CAIXAS = { [FOTOS[1]]: { w: 1080, h: 1920, x0: 0.3, x1: 0.7, y0: 0.1, y1: 0.45 }, [FOTOS[2]]: { w: 1080, h: 1920, x0: 0.32, x1: 0.68, y0: 0.32, y1: 0.8 }, [FOTOS[0]]: { w: 1080, h: 1350, x0: 0.3, x1: 0.7, y0: 0.08, y1: 0.95 } }
const provaProduto = (over = {}) => {
  const cr = CR(over)
  const b = { ...BUILD('pt'), photoBoxes: CAIXAS }
  const src = cr.buildAdV2CloseRealSource(b)
  const t = cr.adsV2CloseRealTimeline({ voiceSeconds: b.voiceSeconds })
  const kb = cr.ADS_V2_CLOSE_REAL_KEN_BURNS, pct = (s) => parseFloat(s) / 100
  const ordem = [FOTOS[1], FOTOS[2], FOTOS[0]] // gancho A → B → C → A
  const planos = t.starts.map((s, k) => ({ a: s, b: s + t.shots[k], span: spanAMao(CAIXAS[ordem[k]], [kb[k].from, kb[k].to, cr.ADS_V2_CLOSE_REAL_PUNCH_FROM, cr.ADS_V2_CLOSE_REAL_PUNCH_TO].map(pct), pct(kb[k].xAnchor)) }))
  const pilula = (e) => { const n = cr.adsV2CloseRealCaptionLines2(e.text, e.font_size, W).length; const yb = pct(e.y); return { top: yb - (n * e.font_size * 1.1) / HH - 0.012, bottom: yb + 0.012 } }
  const els = legendas(cr, src)
  let livres = 0, cheias = 0, bad = []
  for (const e of els) {
    const p = pilula(e)
    if (p.top < 0.14 - 1e-6 || p.bottom > 0.8 + 1e-3) bad.push('fora da faixa ' + e.text)
    for (const pl of planos) {
      if (!(e.time < pl.b - 1e-6 && e.time + e.duration > pl.a + 1e-6)) continue
      const h = p.bottom - p.top
      const enche = !(pl.span.y0 - 0.015 - h >= 0.14 - 1e-6) && !(pl.span.y1 + 0.015 + h <= 0.8 + 1e-6) // nenhum lugar livre (nem acima até 14%, sem marca-d'água, nem abaixo até 80%)
      const toca = p.bottom + 0.0149 > pl.span.y0 && p.top - 0.0149 < pl.span.y1
      if (enche) { cheias++; const ov = (a, b) => Math.max(0, Math.min(b, pl.span.y1) - Math.max(a, pl.span.y0)); if (Math.abs(p.bottom - 0.8) > 2e-3 || ov(p.top, p.bottom) > ov(0.14, 0.14 + h) + 1e-3) bad.push('cheio sem descer ' + e.text) } // empate = embaixo (a base, nunca a tampa)
      else if (toca) bad.push('cobre o produto ' + e.text + ' @' + r3(e.time))
      else livres++
    }
  }
  // a legenda do plano B (tampa no alto) está ABAIXO do produto
  const emB = els.filter((e) => e.time < planos[0].b - 1e-6 && e.time + e.duration > planos[0].a + 1e-6)
  const abaixo = emB.length > 0 && emB.every((e) => pilula(e).top >= planos[0].span.y1)
  // o gancho recortado: a legenda fica no topo (acima do produto, que mora de 36% para baixo)
  const gancho = els.filter((e) => e.time < 3 - 1e-6).every((e) => pilula(e).bottom <= cr.ADS_V2_CLOSE_REAL_PRODUCT_BOX.y0)
  // sem caixa (o servidor não mediu) = a regra fixa de antes (topo em 17,5%)
  const semCaixa = legendas(cr, cr.buildAdV2CloseRealSource(BUILD('pt'))).every((e) => Math.abs(pilula(e).top - 0.175) < 2e-3)
  if (bad.length || process.env.DBG) console.log('       ' + bad.join(' | '), JSON.stringify({ livres, cheias, abaixo, gancho, semCaixa }))
  const emC = els.filter((e) => e.time < planos[1].b - 1e-6 && e.time + e.duration > planos[1].a + 1e-6)
  const acimaEmC = emC.length > 0 && emC.every((e) => pilula(e).bottom <= planos[1].span.y0 && pilula(e).top >= 0.14 - 1e-6) // o punch-in sobe o produto até as legendas: a legenda sobe junto (até 14%, sem marca-d'água)
  const comMarca = legendas(cr, cr.buildAdV2CloseRealSource({ ...b, watermark: cr.ADS_V2_CLOSE_REAL_WATERMARK })).every((e) => pilula(e).top >= 0.175 - 1e-3) // a amostra: a marca-d'água mora entre 14% e 17,5%; a legenda nunca sobe nela
  return bad.length === 0 && livres >= 2 && cheias >= 1 && abaixo && acimaEmC && gancho && semCaixa && comMarca
}
const provaSpan = (over = {}) => {
  const cr = CR(over)
  const s1 = cr.adsV2CloseRealProductSpan({ w: 1080, h: 1920, x0: 0.25, x1: 0.75, y0: 0.2, y1: 0.6 }, W, HH, [1], 0.5, 0.5)
  const s2 = cr.adsV2CloseRealProductSpan({ w: 1080, h: 1920, x0: 0.25, x1: 0.75, y0: 0.2, y1: 0.6 }, W, HH, [1, 1.18], 0.5, 0.5)
  const s3 = cr.adsV2CloseRealProductSpan({ w: 1000, h: 1000, x0: 0, x1: 1, y0: 0.4, y1: 0.6 }, W, HH, [1], 0.5, 0.5) // quadrada em cover: corta os lados, altura inteira
  return s1.y0 === 0.2 && s1.y1 === 0.6 && s1.x0 === 0.25 && s2.y0 === r3(0.5 - 0.3 * 1.18) && Math.abs(s2.y1 - (0.5 + 0.1 * 1.18)) < 1e-4 && s3.y0 === 0.4 && s3.x0 === 0 && s3.x1 === 1 && cr.adsV2CloseRealProductSpan(null, W, HH, [1]) === null
}
// o servidor: a caixa do recorte SEM aparar, do cache por foto; sem cache, o recorte (adsV2CutoutFor) e de novo o cache; prazo; nunca lança
const provaServidor = async (over = {}) => {
  const pngMod = carregar(over)(F.png)
  const raw = (() => { const w = 40, h = 80, data = new Uint8Array(w * h * 4); for (let y = 8; y < 36; y++) for (let x = 12; x < 28; x++) { const o = (y * w + x) * 4; data[o] = 200; data[o + 3] = 255 } return { width: w, height: h, data } })()
  const bytes = pngMod.encodePng(raw, { alpha: true })
  const cache = new Map([['u1/adsv2-cutout-fB.png', bytes]])
  const cortes = []
  const admin = { storage: { from: () => ({ getPublicUrl: (p) => ({ data: { publicUrl: 'https://bucket/' + p } }) }) } }
  const L = carregar(over, { '@/lib/userFootage': { footageAdminClient: () => admin }, '@/lib/ads/v2ProductLockServer': { adsV2CutoutFor: async (uid, lock) => { cortes.push(lock.footageId); if (lock.footageId === 'fC') cache.set('u1/adsv2-cutout-fC.png', bytes); else throw new Error('cutout_not_a_product') } } }, { setTimeout, clearTimeout, AbortSignal, fetch: async (url) => { const k = String(url).replace('https://bucket/', ''); const b = cache.get(k); return b ? { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) } : { ok: false } } })
  const srv = L(F.srv)
  const boxes = await srv.adsV2CloseRealPhotoBoxes({ userId: 'u1', photos: [{ footageId: 'fB', url: FOTOS[1] }, { footageId: 'fC', url: FOTOS[2] }, { footageId: 'fX', url: FOTOS[0] }, { footageId: 'fB', url: FOTOS[1] }] })
  const want = { w: 40, h: 80, x0: 0.3, y0: 0.1, x1: 0.7, y1: 0.45 }
  const igual = (a) => a && Object.keys(want).every((k) => Math.abs(a[k] - want[k]) < 1e-9)
  const adv = Object.hasOwn(over, F.advance) ? over[F.advance] : SRC.advance
  const iP = adv.indexOf('const crBoxesP = crServer ? crServer.adsV2CloseRealPhotoBoxes('), iH = adv.indexOf('const hero = crServer ? await crServer.adsV2CloseRealHero('), iA = adv.indexOf('const crBoxes = await crBoxesP')
  return igual(boxes[FOTOS[1]]) && igual(boxes[FOTOS[2]]) && boxes[FOTOS[0]] === null && JSON.stringify(cortes) === '["fC","fX"]' &&
    srv.adsV2CloseRealBoxOf({ width: 100, height: 100, data: new Uint8Array(100 * 100 * 4) }) === null && srv.adsV2CloseRealHex([42, 29, 16]) === '#2a1d10' &&
    iP > 0 && iP < iH && iH < iA && adv.includes('ph.url.trim() === u)?.footage_id') && adv.includes(', ink: hero.ink } : null, photoBoxes: crBoxes })')
}

// ── T: o título ─────────────────────────────────────────────────────────────────────────────────────────────────────
const provaTitulo = (over = {}) => {
  const cr = CR(over)
  const en = cr.adsV2CloseRealHeadline('Perfume LUME - Unique Fragrances', W, HH), pt = cr.adsV2CloseRealHeadline('Perfume LUME · Fragrâncias Únicas', W, HH)
  const longo = cr.adsV2CloseRealHeadline('Perfume LUME · Fragrâncias exclusivas feitas à mão para cada momento do seu dia', W, HH)
  const sem = cr.adsV2CloseRealHeadline('Perfume LUME', W, HH)
  const noFilme = ['en', 'pt'].every((lang) => { const els = legendas(cr, cr.buildAdV2CloseRealSource(BUILD(lang))); const t0 = els[0].text; return t0.includes('\n') && !t0.includes('·') && cr.adsV2CloseRealCaptionLines2(t0, els[0].font_size, W).every((l) => !/·\s*$/.test(l)) })
  return en === 'Perfume LUME\nUnique Fragrances' && pt === 'Perfume LUME\nFragrâncias Únicas' && longo === 'Perfume LUME' && sem === 'Perfume LUME' && noFilme
}

// ── C: o botão ──────────────────────────────────────────────────────────────────────────────────────────────────────
const provaBotao = (over = {}) => {
  const cr = CR(over)
  const card = (lang, ink, name = 'Perfume LUME') => { const src = cr.buildAdV2CloseRealSource({ ...BUILD(lang), closeCard: { url: H('cc.png'), name, cta: lang === 'pt' ? 'Compre agora' : 'Shop now', ink } }); return { cta: src.elements.find((e) => e.track === cr.ADS_V2_CLOSE_REAL_CARD_TRACKS.cta), nome: src.elements.find((e) => e.track === cr.ADS_V2_CLOSE_REAL_CARD_TRACKS.name) } }
  const a = card('pt', '#2a1d10'), b = card('en', '#f0e0c0'), c = card('pt', null, 'Perfumaria Artesanal Lume do Brasil Fragrâncias')
  const pctOf = (s) => parseFloat(s) / 100
  const geo = (e) => { const half = (e.font_size * (1.1 + 2 * 0.32)) / HH / 2; return { top: pctOf(e.y) - half, bottom: pctOf(e.y) + half } }
  const nomeBase = (n) => { const ls = carregar(over)(F.montage).adsV2OverlayLines(n.text, n.font_size, W).length; return pctOf(n.y) + (ls * n.font_size * 1.1) / HH / 2 }
  const botao = (x) => x.cta && x.cta.font_size === Math.round(0.04 * HH) && x.cta.background_border_radius === '45%' && x.cta.background_x_padding === '60%' && x.cta.background_y_padding === '32%' && /^rgba\(255,255,255,0\.9/.test(x.cta.background_color) && !('width' in x.cta) && !('border_radius' in x.cta) && x.cta.font_weight === '800'
  const respiro = (x, min = 0.035) => geo(x.cta).top - nomeBase(x.nome) >= min && geo(x.cta).bottom <= 0.65 + 1e-6 && x.cta.x === '50%' && x.cta.x_anchor === '50%' // nome de 3 linhas: o botão encosta nos 65% e o respiro diminui (nunca some)
  // as propriedades do botão são as da marca do clipe grátis (no ar desde 06/10): nenhuma inventada
  const wm = rd('lib/clips/freeClipWatermark.ts')
  const exercitadas = ['background_border_radius:', 'background_x_padding:', 'background_y_padding:', 'background_color:'].every((k) => wm.includes(k)) && /FREE_CLIP_WATERMARK_LIVE = true/.test(wm)
  return botao(a) && botao(b) && respiro(a) && respiro(b) && respiro(c, 0.02) && a.cta.fill_color === '#2a1d10' && b.cta.fill_color === '#111111' && exercitadas
}

// ── R: o resto ──────────────────────────────────────────────────────────────────────────────────────────────────────
const provaResto = () => {
  const tocados = git('diff', '--name-only', CLOSE_REAL_V3_1910_BASE, git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean)[0] || 'HEAD').trim().split('\n').concat(git('diff', '--name-only', 'HEAD').trim().split('\n')).filter(Boolean).filter((f) => !diffSoHome3Cards1910(git('diff', '-U0', '--no-color', CLOSE_REAL_V3_1910_BASE, '--', f), f)) // reancorado KINEO-HOME-3-CARDS-1910 — arquivo cujo diff (base até a árvore) é só desta entrega (todo bloco com a marca) fora da lista · reancorado KINEO-APRESENTADOR-OLHOS-1910: mede até o último commit desta entrega (era ..'HEAD'; os olhos abertos do apresentador v2 vieram depois, com guardião próprio)
  tocados.splice(0, tocados.length, ...tocados.filter((f) => !(KIT_BF_1910_ARQUIVOS.includes(f) && lf(semKitBf1910(semHome3Cards1910(readFileSync(join(ROOT, f), 'utf8'), f), f)) === base(f)))) // reancorado KINEO-KIT-BF-1910 — arquivo tocado SÓ pelo kit (desfeito = a base desta entrega) não conta como tocado aqui · reancorado KINEO-HOME-3-CARDS-1910 — a camada dos 3 cards (mais nova, por cima do kit) sai primeiro
  const intocados = ['lib/ads/v2PresenterV2.ts', 'lib/ads/adV2Montage.ts', 'lib/ads/v2Presenter.ts', 'lib/ads/v2Brief.ts', 'lib/ads/v2PlanCore.ts', 'lib/compose.ts', 'lib/ttsFallback.ts', 'lib/avatar/voice.ts'].every((f) => !tocados.includes(f))
  // no avanço: o corpo de adsV2NarrationVoice é o MESMO da base (a voz do Apresentador não mudou); só o invólucro do Close real e o bloco da montagem dele
  const corpo = (s) => s.slice(s.indexOf('async function adsV2NarrationVoice('), s.indexOf('\n}\n', s.indexOf('async function adsV2NarrationVoice(')))
  const adv = SRC.advance.split('\n').filter((l) => l.includes(MARCA))
  return intocados && corpo(SRC.advance) === corpo(base(F.advance)) && adv.length === 5 && adv.every((l) => /CloseReal|Close real|crBoxes|crServer/.test(l))
}
// o fecho fora do Close real (sem nameMax) e as legendas do Ads de sempre continuam exatamente os de antes (a base executada lado a lado)
const provaRestoExec = async () => {
  const B = carregar({ [F.fit]: base(F.fit) })(F.fit), A = carregar()(F.fit)
  const casos = [['Descubra o Perfume LUME. Uma fragrância delicada no frasco dourado. Perfume LUME, notas suaves.', 'pt'], ['A delicate scent in a golden bottle. Soft notes all day.', 'en'], ['Uma fragrância delicada.', 'pt']]
  const iguais = casos.every(([t, l]) => JSON.stringify(A.adsV2CompleteSpeech(t, { min: 27, max: 30, language: l, close: { name: 'Perfume LUME', brand: true, used: new Set() } })) === JSON.stringify(B.adsV2CompleteSpeech(t, { min: 27, max: 30, language: l, close: { name: 'Perfume LUME', brand: true, used: new Set() } })))
  const v = await provaVoz()
  return iguais && v
}

// ═══ V ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nV. voz por língua')
await check('V1 EXECUTADO (lib/ads/v2AudioCedo): o áudio cedo do Close real sintetiza pela MESMA voz da montagem (PT-BR → Portuguese_ConfidentWoman na speech-2.8-hd; EN → a voz que a tabela manda); pedido sem Close real = synthesizeTtsFallback de sempre', () => provaVoz())
// ═══ L ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nL. legenda = frase inteira')
await check('L1 EXECUTADO (montagem do canário v2, EN e PT): toda legenda falada é o COMEÇO de uma frase (maiúscula, nunca 2 frases, nunca termina em "a/de/the"), ≤ 2 linhas a ≥ 4%, sem buraco até o cartão, no tempo da voz; "…e sinta" / "a fragrância…" / "inviting…" não voltam', () => provaFrases())
await check('L2 o encurtamento: corta antes da conjunção ("…scent today | and…", "…sensação única | de…"), depois da vírgula ("…unique story, | inviting"), e nunca numa palavra fraca', () => provaEncurta())
// ═══ F ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nF. fecho completo')
await check('F1 EXECUTADO (adsV2CompleteSpeech com a marca no teto, PT do canário e EN): a fala termina num fecho COMPLETO com verbo e sem a marca ("Você merece." / um da lista), nunca "Para você."; a marca fica em 2', () => provaFecho())
// ═══ P ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nP. a legenda nunca cobre o produto')
await check('P1 a conta da caixa no quadro: foto em cover + o zoom do plano em torno da âncora (a união das caixas)', () => provaSpan())
await check('P2 EXECUTADO (montagem com as caixas das fotos): nenhuma legenda toca o produto do plano (tampa no alto = a legenda desce para baixo dele; o zoom que leva o produto às legendas conta); produto que enche o quadro = encostada nos 80% (a base, nunca a tampa); no gancho, acima do recorte; sem caixa = o topo de sempre', () => provaProduto())
await check('P3 EXECUTADO (adsV2CloseRealPhotoBoxes com bucket e recorte falsos): a caixa do recorte SEM aparar, do cache por foto; sem cache = recorta e lê o cache de novo; falhou = null; o avanço pede as caixas ANTES de esperar o gancho (em paralelo) e passa a cor do botão', () => provaServidor())
// ═══ T ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nT. o título')
await check('T1 "Perfume LUME · Unique Fragrances" → "Perfume LUME\\nUnique Fragrances" (nenhuma linha termina em "·"); a 2ª parte que não cabe sai; na montagem do gancho também', () => provaTitulo())
// ═══ C ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nC. a chamada vira botão')
await check('C1 EXECUTADO: o botão com fonte de 4% da altura, folga 60%/32% da fonte, background_border_radius (as propriedades da marca do clipe grátis no ar), fundo branco, texto no tom da embalagem (claro demais = #111111), abaixo do nome com respiro e dentro dos 65%', () => provaBotao())
// ═══ R ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nR. o resto intocado')
await check('R1 nenhuma linha desta entrega em v2PresenterV2/adV2Montage/v2Presenter/v2Brief/v2PlanCore/compose/ttsFallback/avatar; o corpo de adsV2NarrationVoice (a voz do Apresentador) é o da base; no avanço só o invólucro e o bloco do Close real', () => provaResto())
await check('R2 EXECUTADO lado a lado com a base: o fecho fora do Close real (sem nameMax) é o mesmo de antes; a voz cedo dos pedidos sem Close real é a de sempre', () => provaRestoExec())

// ═══ D ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nD. desfaz exato, novos, marca, encadeamento')
await check(`D1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-close-real-v3-1910.mjs), é EXATAMENTE a base ${CLOSE_REAL_V3_1910_BASE.slice(0, 9)}; os novos existem e não existiam lá`, () =>
  CLOSE_REAL_V3_1910_ARQUIVOS.length >= 7 && CLOSE_REAL_V3_1910_ARQUIVOS.every((f) => { const b = base(f); return b !== null && lf(semCloseRealV3_1910(rd(f), f)) === b }) &&
  CLOSE_REAL_V3_1910_NOVOS.length === 2 && CLOSE_REAL_V3_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && MARCA_CLOSE_REAL_V3_1910 === MARCA)
await check('D2 toda linha nova traz a marca (troca listada inteira); a marca não contém as do Close real nem do ajuste, para os desfaz não se misturarem', () => {
  const trocas = Object.values(TROCAS_CLOSE_REAL_V3_1910).flat()
  return trocas.length > 0 && trocas.every(([nova]) => nova.includes(MARCA)) && !MARCA.includes('KINEO-CLOSE-REAL-1910') && !MARCA.includes('KINEO-CLOSE-REAL-AJUSTE-1910') &&
    CLOSE_REAL_V3_1910_ARQUIVOS.every((f) => { const b = new Set(base(f).split('\n')); return rd(f).split('\n').filter((l) => !b.has(l)).every((l) => l.includes(MARCA)) })
})
await check('D3 encadeamento: semCloseRealAjuste1910 e semCloseReal1910 tiram esta camada PRIMEIRO (a linha só desta camada some); o guardião do ajuste lê sem ela; texto sem a marca passa igual', () => {
  const so = `x\nconst a = 1 // ${MARCA}\ny`
  const aj = rd('scripts/test-close-real-ajuste-1910.mjs')
  const ajCru = rd('scripts/test-close-real-ajuste-1910.mjs')
  return semCloseRealAjuste1910(so, 'lib/x.ts') === 'x\ny' && semCloseReal1910(so, 'lib/x.ts') === 'x\ny' && semCloseRealV3_1910('sem marca\nnada', 'lib/x.ts') === 'sem marca\nnada' && semCloseRealV3_1910(null, 'x') === null &&
    aj.includes("const rd = (p) => lf(semFilmesF1F3Ajuste1910(semCloseRealV3_1910(readFileSync(join(ROOT, p), 'utf8'), p), p))") && aj.includes('semCloseRealV3_1910(text, rel)') &&
    lf(semFilmesF1F3Ajuste1910(ajCru, 'scripts/test-close-real-ajuste-1910.mjs')) === lf(semFilmesF1F3Ajuste1910(semCloseRealV3_1910(ajCru, 'scripts/test-close-real-ajuste-1910.mjs'), 'scripts/test-close-real-ajuste-1910.mjs')) // o ajuste do Faceless 15 s (mesclado antes) também tira esta camada primeiro
})

// ═══ M ════════════════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nM. mutantes (aplicados e vermelhos)')
const mut = async (nome, fn) => { let red = false; try { red = !(await fn()) } catch (e) { if (/mutante não aplicou|mutante sem efeito/.test(e.message)) { console.log('       (' + e.message + ')'); red = false } else red = true } ok(red, nome) }
await mut('M1 o áudio cedo volta à voz padrão no Close real → V vermelho', () => provaVoz({ [F.cedo]: trocar(SRC.cedo, 'const buf = adsV2CloseRealOf(order.plan) ? await', 'const buf = false ? await') }))
await mut('M2 a voz cedo do Close real vale para TODO pedido (o resto deixaria a voz de sempre) → V vermelho', () => provaVoz({ [F.cedo]: trocar(SRC.cedo, 'const buf = adsV2CloseRealOf(order.plan) ? await', 'const buf = true ? await') }))
await mut('M3 a legenda volta a ser cortada por plano (a régua do ajuste) → L1 vermelho', () => provaFrases({ [F.cr]: trocar(SRC.cr, '  const captions = adsV2CloseRealCaptionsV3({', '  const captions = adsV2CloseRealCaptions({') }))
await mut('M4 a frase longa não é encurtada (3 linhas) → L vermelho', () => provaFrases({ [F.cr]: trocar(SRC.cr, '  if (ws.length === 0 || fits(ws.length)) return ws', '  if (true) return ws') }))
await mut('M5 a vírgula vira fim de frase (a legenda começa em "inviting…") → L1 vermelho', () => provaFrases({ [F.cr]: trocar(SRC.cr, "if (/[.!?…][\"'”’»)]*$/u.test(words[k]) || k === words.length - 1)", "if (/[.!?…,][\"'”’»)]*$/u.test(words[k]) || k === words.length - 1)") }))
await mut('M6 o encurtamento pode terminar em palavra fraca ("…transporta a") → L2 vermelho', () => provaEncurta({ [F.cr]: trocar(SRC.cr, '  const weak = (k: number): boolean => CLOSE_REAL_WEAK_END.has(closeRealNormWord(ws[k - 1]))', '  const weak = (k: number): boolean => false') }))
await mut('M7 o fecho volta ao pedaço "Para você." → F vermelho', () => provaFecho({ [F.fit]: trocar(SRC.fit, '  if (nameMax > 0) cands.push(...(ADS_V2_CLOSE_REAL_FULL_CLOSES[lang] ?? [])', "  if (nameMax > 0) cands.push(...([{ t: 'Para você.', cta: false }, { t: 'For you.', cta: false }])") }))
await mut('M8 a legenda ignora o produto (sempre no topo) → P2 vermelho', () => provaProduto({ [F.cr]: trocar(SRC.cr, '  if (span && hits(b)) {', '  if (false) {') }))
await mut('M9 a caixa ignora o zoom do plano (o punch-in leva o produto às legendas) → P2 vermelho', () => provaProduto({ [F.cr]: trocar(SRC.cr, '[kb.from, kb.to, ADS_V2_CLOSE_REAL_PUNCH_FROM, ADS_V2_CLOSE_REAL_PUNCH_TO].map(closeRealPct)', '[1]') }))
await mut('M10 empate de produto que enche o quadro vai para o topo (cobre a tampa) → P2 vermelho', () => provaProduto({ [F.cr]: trocar(SRC.cr, 'b = ov(low) <= ov(high) + 1e-6 ? low : high;', 'b = ov(low) < ov(high) - 1e-6 ? low : high;') }))
await mut('M11 o servidor lê o recorte APARADO (a caixa vira a foto inteira) → P3 vermelho', () => provaServidor({ [F.srv]: trocar(SRC.srv, '  const b = alphaBox(raw) // KINEO-CLOSE-REAL-V3-1910', '  const b = { x: 0, y: 0, w: raw.width, h: raw.height } // KINEO-CLOSE-REAL-V3-1910') }))
await mut('M12 o avanço não manda as caixas à montagem → P3 vermelho', () => provaServidor({ [F.advance]: trocar(SRC.advance, ', ink: hero.ink } : null, photoBoxes: crBoxes })', ', ink: hero.ink } : null, photoBoxes: null })') }))
await mut('M13 o título volta a manter o " · " → T vermelho', () => provaTitulo({ [F.cr]: trocar(SRC.cr, '  if (parts.length < 2) return parts[0] ?? \'\'', '  if (true) return clean') }))
await mut('M14 o botão perde o canto arredondado de verdade (volta o border_radius do ajuste) → C vermelho', () => provaBotao({ [F.cr]: trocar(SRC.cr, 'background_border_radius: ADS_V2_CLOSE_REAL_CTA_RADIUS,', 'border_radius: 40,') }))
await mut('M15 a chamada volta aos 3% da altura → C vermelho', () => provaBotao({ [F.cr]: trocar(SRC.cr, 'export const ADS_V2_CLOSE_REAL_CTA_FONT = 0.04', 'export const ADS_V2_CLOSE_REAL_CTA_FONT = 0.03') }))
await mut('M16 o texto do botão ignora o contraste (cor clara da embalagem sobre o branco) → C vermelho', () => provaBotao({ [F.cr]: trocar(SRC.cr, "  return lum <= 0.3 ? `#${m[1].toLowerCase()}` : ADS_V2_CLOSE_REAL_CTA_INK", '  return `#${m[1].toLowerCase()}`') }))
await mut('M17 a legenda não pode subir dos 17,5% sem a marca-d\'água (o produto que o punch-in aproximou fica coberto) → P2 vermelho', () => provaProduto({ [F.cr]: trocar(SRC.cr, '  const top0 = Math.min(ADS_V2_CLOSE_REAL_CAPTION_TOP, Math.max(ADS_V2_SAFE_TOP, minTop))', '  const top0 = ADS_V2_CLOSE_REAL_CAPTION_TOP') }))
await mut('M18 na amostra a legenda sobe na marca-d\'água (ignora os 17,5%) → P2 vermelho', () => provaProduto({ [F.cr]: trocar(SRC.cr, "  const capMinTop = typeof input.watermark === 'string' && input.watermark.trim() ? ADS_V2_CLOSE_REAL_CAPTION_TOP : ADS_V2_SAFE_TOP", '  const capMinTop = ADS_V2_SAFE_TOP') }))

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail === 0 ? 0 : 1)
