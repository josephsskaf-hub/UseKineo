// KINEO-HOME-3-CARDS-1910 — guardião dos 3 cards de produto da home e da amostra grátis pela entrada do card (fundador 19/10,
// "pode ser as 3"; pesquisa em docs/PESQUISA-3-CARDS-PRODUTOS-2026-10-19.md).
//
// O QUE ELE PROVA (lendo os arquivos reais e EXECUTANDO as libs puras num vm):
//   (1) lib dos cards (lib/ui/homeThreeCards.ts): pura; interruptor HOME_3_CARDS_LIVE=false por padrão e a casa vê a prévia;
//       ordem Filmes · Anúncios de Produto · Anúncios UGC; nomes e frases do fundador; destinos (filme → Studio Seedance;
//       Produto → /ads/v2?entry=product; UGC → /ads/v2?entry=ugc; visitante passa pelo cadastro e volta ao MESMO destino);
//       clique com metadados fechados (sem texto traduzido);
//   (2) mídia: prévias reais existentes, ≤ 1,5 MB, faststart, mudas, com pôster; o Close real em PT para quem lê em português;
//   (3) componente: clique medido pela lib, vídeo mudo/playsInline/pôster/preload none/sem autoPlay, toca só visível e
//       respeita reduced-motion, NENHUM preço (nem $, nem "credits");
//   (4) home: KineoLanding troca as 2 portas pelos 3 cards SÓ com home3CardsOn(HOME_3_CARDS_LIVE, isInternalEmail(...)), na
//       1ª dobra (antes do hero de filmes); engineWall.ts e homeVideoCuration.ts não sabem dos cards; menu do topo intocado;
//   (5) frases novas nas 16 línguas;
//   (6) lib da entrada da amostra (lib/ads/sampleEntry.ts): só 'product'|'ugc'; presenter SÓ por 'ugc' com o interruptor e o
//       ator no ar; marca do plano; marca-d'água acrescentada numa trilha nova do 0 ao fim, sem mutar a entrada; 16 línguas;
//   (7) contrato do /plan: sample_entry 'ugc' passa, 'product'/ausente = sem a chave, qualquer outra coisa = 400;
//   (8) servidor: o /plan escolhe o formato da amostra pela entrada (presenter só por 'ugc'), o Close real continua forçado no
//       resto, a marca só com o apresentador planejado; o /start aceita a amostra no Close real OU com a marca; as travas de
//       sempre (1 por conta no total, antifarm, teto diário de 30 contando os 2 formatos) intocadas; marca-d'água na montagem
//       de toda amostra fora do Close real; não-pagante sem amostra vai à porta que explica e vende (nunca 403 cru na página);
//   (9) tela: /ads/v2 valida ?entry e o devolve no login; a sessão simples manda sample_entry SÓ na amostra com a pessoa e o
//       seletor só abre o formato da entrada;
//   (M) mutantes: cada regra acima fica vermelha quando a quebramos de propósito.
import fs from 'node:fs'
import { semPaginasIaClaras2110 } from './test-support/desfaz-paginas-ia-claras-2110.mjs' // KINEO-PAGINAS-IA-CLARAS-2110 [TRAVA 8.2 — vai do fundador 21/10 "a preta está muito longe do que é o site"]
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { semBebeQueFala2010 } from './test-support/desfaz-bebe-que-fala-2010.mjs' // reancorado KINEO-BEBE-QUE-FALA-2010 — o 4º card (kidsCard) veio depois
import { semApresentadorOlhos1910 } from './test-support/desfaz-apresentador-olhos-1910.mjs' // reancorado KINEO-APRESENTADOR-OLHOS-1910: a cabeça da corrente do Close real é lida sem a camada dos olhos abertos (a mais nova, que sai antes desta)
import { semAfiliado50_2610 } from './test-support/desfaz-afiliado50-2610.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(import.meta.dirname, '..')
const affiliateRaw = (file, source) => { const projected = semAfiliado50_2610(file, source); return source.includes('\r\n') ? projected.replace(/\n/g, '\r\n') : projected }
const read = (rel) => semPaginasIaClaras2110(affiliateRaw(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')), rel).replace(/\r\n/g, '\n') // KINEO-PAGINAS-IA-CLARAS-2110 — retirar a ordem por origem antes das asserções e dos mutantes históricos.
let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) }
}
function roda(code, nome) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const box = { exports: {} }
  vm.runInNewContext(js, { module: box, exports: box.exports, require: (id) => { throw Error(`${nome} não pode importar: ${id}`) } })
  return box.exports
}
const semComentario = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

const LIB = read('lib/ui/homeThreeCards.ts')
const COMP = read('components/home/HomeThreeCards.tsx')
const LAND = semBebeQueFala2010(read('app/KineoLanding.tsx'), 'app/KineoLanding.tsx') // reancorado KINEO-BEBE-QUE-FALA-2010 — a landing sem o 4º card = a de antes (o kidsCard pelo interruptor é provado em scripts/test-bebe-que-fala-2010.mjs)
const DICT = JSON.parse(read('lib/ui/refinementCopy.json'))
const WALL = read('lib/engineWall.ts')
const CURA = read('lib/homeVideoCuration.ts')
const ENTRY = read('lib/ads/sampleEntry.ts')
const CONTRACT = read('lib/ads/v2Contract.ts')
const PLAN = read('lib/ads/v2PlanCore.ts')
const START = read('lib/ads/v2StartCore.ts')
const ADV = read('lib/ads/v2Advance.ts')
const SACCESS = read('lib/ads/serverAccess.ts')
const SAMPLE = read('lib/ads/sample.ts')
const PAYWALL = read('lib/ads/paywall.ts')
const PAGE = read('app/(dashboard)/ads/v2/page.tsx')
const CLIENT = read('app/(dashboard)/ads/v2/AdsV2Client.tsx')
const SIMPLE = read('app/(dashboard)/ads/v2/AdsV2Simple.tsx')
const LANGS = ['en', 'pt', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'hi', 'id', 'vi']

// ─── (1) a lib dos cards ─────────────────────────────────────────────────────
function libProblems(src) {
  const probs = []
  if (/^\s*import\s/m.test(src) || /\brequire\(/.test(src)) probs.push('lib com import (tem de ser pura)')
  let M
  try { M = roda(src, 'lib dos cards') } catch (e) { return [`lib não roda: ${e.message}`] }
  if (M.HOME_3_CARDS_LIVE !== true) probs.push('interruptor HOME_3_CARDS_LIVE não está true (ok do fundador na prévia em 19/10: "podemos deixar assim")')
  if (M.home3CardsOn?.(false, false) !== false) probs.push('visitante vê os cards com o interruptor fechado')
  if (M.home3CardsOn?.(false, true) !== true) probs.push('a casa não vê a prévia')
  if (M.home3CardsOn?.(true, false) !== true) probs.push('interruptor aberto não abre para todos')
  if (JSON.stringify(M.HOME_CARD_ORDER) !== JSON.stringify(['films', 'product_ads', 'ugc_ads'])) probs.push(`ordem ${JSON.stringify(M.HOME_CARD_ORDER)}`)
  const want = {
    films: ['AI Faceless Videos', 'Type an idea. Get a narrated Short in minutes.'],
    product_ads: ['AI Product Ads', 'Your real product photos become a ready-to-run ad.'],
    ugc_ads: ['AI UGC Ads', 'An AI person holds your product and tells why to buy.'],
  }
  for (const [id, [title, line]] of Object.entries(want)) {
    if (M.HOME_CARD_COPY?.[id]?.title !== title) probs.push(`título de ${id} = ${M.HOME_CARD_COPY?.[id]?.title}`)
    if (M.HOME_CARD_COPY?.[id]?.line !== line) probs.push(`frase de ${id} = ${M.HOME_CARD_COPY?.[id]?.line}`)
  }
  const dest = {
    films: '/studio?engine=seedance&intent_campaign=home_card',
    product_ads: '/ads/v2?entry=product&utm_source=home_card',
    ugc_ads: '/ads/v2?entry=ugc&utm_source=home_card',
  }
  for (const [id, d] of Object.entries(dest)) {
    if (M.homeCardHref?.(id, true) !== d) probs.push(`${id} logado → ${M.homeCardHref?.(id, true)}`)
    if (M.homeCardHref?.(id, false) !== `/signup?redirect=${encodeURIComponent(d)}`) probs.push(`${id} visitante → ${M.homeCardHref?.(id, false)}`)
  }
  if (M.HOME_CARD_EVENT !== 'home_card_clicked') probs.push('evento ≠ home_card_clicked')
  if (!(M.HOME_CARD_TELEMETRY_VERSION >= 1)) probs.push('card_v ausente')
  ;['films', 'product_ads', 'ugc_ads'].forEach((id, i) => {
    for (const signed of [true, false]) {
      const m = M.homeCardClickMetadata?.(id, signed)
      const keys = m ? Object.keys(m).sort().join(',') : ''
      if (keys !== 'card,card_v,href,position,signed_in,surface') probs.push(`metadados de ${id} não fechados: ${keys}`)
      else if (m.card !== id || m.position !== i + 1 || m.href !== M.homeCardHref(id, signed) || m.signed_in !== signed || m.surface !== 'home' || m.card_v !== M.HOME_CARD_TELEMETRY_VERSION) probs.push(`metadados de ${id} errados`)
    }
  })
  for (const id of ['films', 'product_ads', 'ugc_ads']) {
    const b = M.HOME_CARD_BADGE?.[id]
    if (typeof b !== 'string' || !b.trim()) probs.push(`selo de ${id} vazio`)
    else if (/\$|\d+\s*(cr|credits?)\b|free|grátis/i.test(b)) probs.push(`selo de ${id} com preço/oferta: ${b}`)
  }
  if (M.HOME_CARD_BADGE?.films !== 'SEEDANCE 1.5') probs.push('selo do filme ≠ motor real do vídeo (Seedance 1.5)')
  return probs
}

// ─── (2) a mídia ─────────────────────────────────────────────────────────────
function mediaProblems(src) {
  const probs = []
  const M = roda(src, 'lib dos cards')
  const clips = []
  for (const id of ['films', 'product_ads', 'ugc_ads']) {
    const c = M.HOME_CARD_CLIPS?.[id]
    if (!c?.default) { probs.push(`${id} sem vídeo`); continue }
    clips.push(c.default); if (c.pt) clips.push(c.pt)
  }
  for (const clip of clips) {
    for (const rel of [clip.src, clip.poster]) {
      const p = path.join(ROOT, 'public', rel)
      if (!fs.existsSync(p)) { probs.push(`${rel} não existe`); continue }
      const size = fs.statSync(p).size
      if (size > 1.5 * 1024 * 1024) probs.push(`${rel} pesado (${(size / 1048576).toFixed(2)} MB)`)
      if (size < 1024) probs.push(`${rel} vazio`)
    }
    const mp4 = path.join(ROOT, 'public', clip.src)
    if (fs.existsSync(mp4)) {
      const b = fs.readFileSync(mp4)
      const moov = b.indexOf('moov'); const mdat = b.indexOf('mdat')
      if (!(moov > 0 && mdat > 0 && moov < mdat)) probs.push(`${clip.src} sem faststart`)
      if (b.includes(Buffer.from('soun'))) probs.push(`${clip.src} com áudio`)
    }
  }
  if (M.homeCardClip?.('product_ads', 'pt')?.src !== '/previews/home-card-close-real-pt.mp4') probs.push('português não vê o Close real em PT')
  if (M.homeCardClip?.('product_ads', 'en')?.src !== '/previews/home-card-close-real-en.mp4') probs.push('inglês não vê o Close real em EN')
  if (M.homeCardClip?.('product_ads', 'es')?.src !== '/previews/home-card-close-real-en.mp4') probs.push('língua sem versão não cai no padrão')
  if (M.homeCardClip?.('films', 'pt')?.src !== '/previews/home-card-film-flannan.mp4') probs.push('filme do card ≠ o farol de Flannan (Seedance 1.5, 970d03e6, sem a marca usekineo.com/free)')
  if (!/970d03e6/.test(src) || !/Seedance 1\.5/.test(src)) probs.push('origem do filme do card (970d03e6, Seedance 1.5) não está documentada na lib')
  return probs
}

// ─── (3) o componente ────────────────────────────────────────────────────────
function componentProblems(src) {
  const probs = []
  const code = semComentario(src)
  if (!/^'use client'/.test(src)) probs.push("componente sem 'use client'")
  if (!src.includes("import { trackEvent } from '@/lib/analytics'")) probs.push('trackEvent não importado')
  if (!/void trackEvent\(HOME_CARD_EVENT, homeCardClickMetadata\(card, signedIn\)\)/.test(code)) probs.push('clique não grava HOME_CARD_EVENT com os metadados da lib')
  if (/home_card_clicked/.test(code)) probs.push('nome do evento digitado no componente')
  if (!/<Link key=\{card\} href=\{homeCardHref\(card, signedIn\)\}[^>]*data-home-card=\{card\}[^>]*onClick=\{\(\) => track\(card\)\}>/.test(code)) probs.push('card sem destino da lib + clique medido')
  if (!/HOME_CARD_ORDER\.map\(/.test(code)) probs.push('cards fora da ordem da lib')
  const videos = code.match(/<video[\s\S]*?\/>/g) || []
  if (videos.length !== 1) probs.push(`vídeos no componente: ${videos.length}`)
  for (const v of videos) {
    if (!/\bmuted\b/.test(v)) probs.push('vídeo sem muted')
    if (!/\bplaysInline\b/.test(v)) probs.push('vídeo sem playsInline')
    if (!/poster=\{clip\.poster\}/.test(v)) probs.push('vídeo sem pôster')
    if (!/preload="none"/.test(v) || /autoPlay/.test(v)) probs.push('vídeo com autoPlay/preload pesado')
  }
  if (!/new IntersectionObserver\(/.test(code)) probs.push('vídeo não espera ficar visível')
  if (!/if \(visible && !reduce\)/.test(code) || !code.includes("'(prefers-reduced-motion: reduce)'")) probs.push('vídeo ignora reduced-motion')
  if (/\$\s?\d|US\$|\bcredits?\b|créditos|\/month|\/mo\b/i.test(code.replace(/HOME_THREE_CARDS_CSS = `[\s\S]*?`/, ''))) probs.push('preço/crédito digitado no componente (cartão = motor + nome)')
  if (!code.includes('const adsCta = (card: HomeCardId) => homeCardAdsCta(card, language, ADS_SAMPLE_LIVE)')) probs.push('botão do anúncio promete "grátis" sem a amostra no ar') // KINEO-HOME-CARDS-BOTOES-2010
  return probs
}

// ─── (4) a home ──────────────────────────────────────────────────────────────
const THREE_TAG = "      {showThreeCards ? <HomeThreeCards signedIn={isSignedIn} /> : ( // KINEO-HOME-3-CARDS-1910"
const DOORS_TAG = '<HomeTwoDoors signedIn={isSignedIn} filmOffer={filmDoorOffer} adsOffer={adsDoorOffer} />'
const NAV_ITEMS_ORIGIN = 21 // data-nav-item= na KineoLanding da origin/main 9ddb24c7e (o menu do topo nunca encolhe)
function homeProblems(src) {
  const probs = []
  if (!src.includes("  const showThreeCards = home3CardsOn(HOME_3_CARDS_LIVE, isInternalEmail(initialEmail)) // KINEO-HOME-3-CARDS-1910\n")) probs.push('decisão dos cards fora do interruptor único + conta da casa')
  if (!src.includes("import { HOME_3_CARDS_LIVE, home3CardsOn } from '@/lib/ui/homeThreeCards'")) probs.push('interruptor não importado da lib')
  if (!src.includes("import { isInternalEmail } from '@/lib/internalAccounts'")) probs.push('isInternalEmail fora da fonte única')
  const three = src.indexOf(THREE_TAG)
  const doors = src.indexOf(DOORS_TAG)
  const hero = src.indexOf('<header className="hero">')
  if (three < 0) probs.push('3 cards ausentes da home')
  if (src.split('<HomeThreeCards ').length !== 2) probs.push('3 cards repetidos')
  if (doors < 0 || src.split(DOORS_TAG).length !== 2) probs.push('as 2 portas sumiram (visitante tem de ver a home de hoje)')
  if (!(three > 0 && doors > three && hero > doors)) probs.push('3 cards fora da 1ª dobra (antes das portas/hero)')
  if (three > 0 && src.slice(three, doors).replace(THREE_TAG, '').trim() !== '') probs.push('a troca cards ↔ portas não é a do interruptor')
  const navCount = (src.match(/data-nav-item=/g) || []).length
  if (navCount !== NAV_ITEMS_ORIGIN + 2 - 10 + 4) probs.push(`menu mexido: ${navCount} itens (era ${NAV_ITEMS_ORIGIN} + 2 do "AI UGC Ads" − 10 do "More tools" + 4 de "AI Cartoon Videos"/"Claude & ChatGPT")`) // KINEO-HOME-REMODELA-2010 — reancorado 20/10 (fundador 20/10: "esses vão ser os quatro principais, e ao lado vai ser o MCP do Claude e do GPT… more tools a gente vai cancelar"): saíram os 10 itens do "More tools" (topo 4, celular 6) e entraram 2 em cada menu; a ordem nova é provada em scripts/test-home-remodela-2010.mjs
  if (/homeThreeCards|HomeThreeCards|home_card|HOME_3_CARDS/.test(WALL)) probs.push('lib/engineWall.ts sabe dos cards')
  if (/homeThreeCards|HomeThreeCards|home_card|HOME_3_CARDS/.test(CURA)) probs.push('lib/homeVideoCuration.ts sabe dos cards')
  return probs
}

// ─── (5) as frases nas 16 línguas ────────────────────────────────────────────
const NEW_COPY = ['AI Faceless Videos', 'Type an idea. Get a narrated Short in minutes.', 'AI Product Ads', 'Your real product photos become a ready-to-run ad.', 'AI UGC Ads', 'An AI person holds your product and tells why to buy.']
function copyProblems(dict) {
  const probs = []
  for (const lang of LANGS) {
    const d = dict[lang]
    if (!d) { probs.push(`sem a língua ${lang}`); continue }
    for (const k of NEW_COPY) {
      const v = d[k]
      if (typeof v !== 'string' || !v.trim()) { probs.push(`${lang}: sem "${k}"`); continue }
      if (lang !== 'en' && v === k) probs.push(`${lang}: "${k}" ficou em inglês`)
      if (k.includes('UGC') && !v.includes('UGC')) probs.push(`${lang}: perdeu "UGC"`)
      if (k.includes('Short') && !v.includes('Short')) probs.push(`${lang}: perdeu "Short"`)
    }
  }
  if (dict.pt?.['AI Faceless Videos'] !== 'Vídeos Faceless com IA') probs.push('nome PT do card 1 ≠ o do fundador')
  if (dict.pt?.['AI Product Ads'] !== 'Anúncios de Produto com IA') probs.push('nome PT do card 2 ≠ o do fundador')
  if (dict.pt?.['AI UGC Ads'] !== 'Anúncios UGC com IA') probs.push('nome PT do card 3 ≠ o do fundador')
  return probs
}

// ─── (6) a lib da entrada da amostra ─────────────────────────────────────────
function entryProblems(src) {
  const probs = []
  if (/^\s*import\s(?!type\s)/m.test(src) || /\brequire\(/.test(src)) probs.push('lib da entrada com import de valor (tem de ser pura)')
  let M
  try { M = roda(src, 'lib da entrada') } catch (e) { return [`lib da entrada não roda: ${e.message}`] }
  if (M.ADS_SAMPLE_PRESENTER_LIVE !== true) probs.push('amostra com a pessoa desligada (decisão do fundador: ligada)')
  if (M.adsSampleEntryOf?.('ugc') !== 'ugc' || M.adsSampleEntryOf?.('product') !== 'product') probs.push('entrada válida recusada')
  for (const bad of ['UGC', 'presenter', '', null, undefined, 1, 'ugc ', {}]) if (M.adsSampleEntryOf?.(bad) !== null) probs.push(`entrada inválida aceita: ${JSON.stringify(bad)}`)
  if (M.adsSampleFormatFor?.('ugc', true) !== 'presenter') probs.push('card UGC não dá a amostra com a pessoa')
  for (const e of ['product', null, undefined, 'x']) if (M.adsSampleFormatFor?.(e, true) !== 'close_real') probs.push(`entrada ${e} dá a pessoa (só o card UGC dá)`)
  if (M.adsSampleFormatFor?.('ugc', false) !== 'close_real') probs.push('sem o ator no ar, a amostra UGC ainda promete a pessoa')
  if (M.adsSampleFormatFor?.('ugc', true, false) !== 'close_real') probs.push('interruptor desligado não volta ao Close real')
  if (M.adsSamplePresenterPlanOk?.({ sample_format: 'presenter', presenter: { person: 0 } }) !== true) probs.push('plano marcado com a pessoa recusado')
  for (const p of [null, {}, { sample_format: 'presenter' }, { presenter: { person: 0 } }, { sample_format: 'close_real', presenter: {} }, { sample_format: 'presenter', presenter: true }]) if (M.adsSamplePresenterPlanOk?.(p) !== false) probs.push(`plano sem a marca do /plan aceito: ${JSON.stringify(p)}`)
  const src0 = { output_format: 'mp4', width: 1080, height: 1920, duration: 15, elements: [{ type: 'video', track: 2 }, { type: 'text', track: 7 }, { type: 'audio', track: 6 }] }
  const snap = JSON.stringify(src0)
  const out = M.adsSampleWatermarkSource?.(src0, { text: 'Made with Kineo · usekineo.com', fontFamily: 'Montserrat', width: 1080 })
  if (JSON.stringify(src0) !== snap) probs.push('marca-d\'água mutou a fonte de entrada')
  const mark = out?.elements?.[3]
  if (!out || out.elements.length !== 4 || !mark) probs.push('marca-d\'água não acrescentada')
  else {
    if (mark.type !== 'text' || mark.text !== 'Made with Kineo · usekineo.com') probs.push('marca-d\'água com outro texto')
    if (mark.track !== 8) probs.push(`marca-d'água fora de uma trilha nova (trilha ${mark.track})`)
    if (mark.time !== 0 || mark.duration !== 15) probs.push('marca-d\'água não cobre o anúncio inteiro')
  }
  if (M.adsSampleWatermarkSource?.({ duration: 15 }, { text: 'x', fontFamily: 'f', width: 1080 })?.elements !== undefined) probs.push('fonte sem elements foi inventada')
  for (const lang of LANGS) {
    const n = M.ADS_SAMPLE_PRESENTER_NOTE?.[lang]
    if (typeof n !== 'string' || !n.trim()) probs.push(`linha da amostra com a pessoa sem ${lang}`)
    else if (!/15/.test(n)) probs.push(`linha ${lang} perdeu os 15 s`)
    if (lang !== 'en' && n === M.ADS_SAMPLE_PRESENTER_NOTE?.en) probs.push(`linha ${lang} em inglês`)
  }
  return probs
}

// ─── (7) o contrato do /plan ─────────────────────────────────────────────────
function contractProblems(src) {
  const probs = []
  let M
  try { M = roda(src, 'contrato') } catch (e) { return [`contrato não roda: ${e.message}`] }
  const id = () => '11111111-2222-4333-8444-' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0')
  const base = () => ({ mode: 'simple', order_id: id(), sector: 'store', logo_footage_id: null, photos: [{ footage_id: id(), kind: 'product' }], facts: [], card_footage_id: id() })
  const r0 = M.sanitizePlanBody?.(base())
  if (!r0?.ok) return [`corpo base recusado: ${r0?.error}`]
  if ('sample_entry' in r0.value) probs.push('corpo sem entrada ganhou a chave')
  const ru = M.sanitizePlanBody({ ...base(), sample_entry: 'ugc' })
  if (!ru?.ok || ru.value.sample_entry !== 'ugc') probs.push(`entrada ugc: ${JSON.stringify(ru)}`)
  for (const v of ['product', null]) { const r = M.sanitizePlanBody({ ...base(), sample_entry: v }); if (!r?.ok || 'sample_entry' in r.value) probs.push(`entrada ${v} não vira "sem a chave"`) }
  for (const v of ['presenter', 'UGC', 1, true, {}]) { const r = M.sanitizePlanBody({ ...base(), sample_entry: v }); if (r?.ok || r?.error !== 'bad_sample_entry') probs.push(`entrada ${JSON.stringify(v)} não deu 400 bad_sample_entry`) }
  return probs
}

// ─── (8) o servidor ──────────────────────────────────────────────────────────
function planProblems(src) {
  const probs = []
  const c = semComentario(src)
  if (!c.includes("const sampleFormat = gate !== 'ok' && sample ? adsSampleFormatFor(input.sample_entry === 'ugc' ? 'ugc' : 'product', ADS_V2_PRESENTER_PUBLIC) : null")) probs.push('formato da amostra não sai da entrada validada (só amostra)')
  if (!c.includes("if (sampleFormat === 'presenter') { input.presenter = true; delete input.style; delete input.format; delete input.close_real }")) probs.push('amostra com a pessoa não liga o ator no servidor')
  if (!c.includes("const closeRealAsked = ADS_V2_CLOSE_REAL_LIVE && (input.close_real === true || (gate !== 'ok' && sample && sampleFormat !== 'presenter'))")) probs.push('o resto das amostras deixou de ser forçado ao Close real')
  if (!c.includes("if (sampleFormat === 'presenter' && presenter) { Object.assign(stored, { sample_format: ADS_SAMPLE_PRESENTER_MARK })")) probs.push('marca do plano sem conferir o apresentador planejado')
  if ((c.match(/sample_format: ADS_SAMPLE_PRESENTER_MARK/g) || []).length !== 1) probs.push('marca do plano gravada fora do ponto único')
  if (!c.includes('const sample = gate === \'no_access\' && await adsSampleOpen(admin, uid, reason)')) probs.push('/plan perdeu a porta da amostra (1 por conta + antifarm)')
  if (!c.includes("if (gate !== 'ok' && sample && !adsSampleLevelOk(order.tier, order.seconds)) return v2Fail('sample_level_only', 403)")) probs.push('/plan perdeu o nível/duração da amostra')
  return probs
}
function startProblems(src) {
  const probs = []
  const c = semComentario(src)
  if (!c.includes('const samplePresenter = sampleRun && adsSamplePresenterPlanOk(plan)')) probs.push('/start não lê a marca do plano')
  if (!c.includes("if (sampleRun && !adsV2CloseRealOf(plan) && !samplePresenter) return v2Fail('sample_level_only', 403)")) probs.push('/start aceita amostra fora do Close real sem a marca')
  if (!c.includes("if (sampleRun && !adsSampleLevelOk(order.tier, order.seconds)) return v2Fail('sample_level_only', 403)")) probs.push('/start perdeu o nível da amostra')
  if (!/if \(sampleRun\) \{[\s\S]{0,400}if \(await adsSampleCapReached\(admin\)\) return v2Fail\('sample_cap', 429\)/.test(c)) probs.push('/start perdeu o teto diário antes da trava')
  if (!c.includes("const billingRef = sampleRun ? adsSampleRef(orderId, generationId) : adsV2BillingRef(orderId, generationId)")) probs.push('amostra fora da chave adssample- (marca-d\'água e "1 por conta" dependem dela)')
  if (!c.includes("format: samplePresenter ? 'presenter' : 'close_real', watermark: true")) probs.push('evento da amostra sem o formato')
  return probs
}
function travasProblems(sacc, sample, paywall) {
  const probs = []
  const c = semComentario(sacc)
  if (!/export async function adsSampleOpen[\s\S]*?\.like\('billing_ref', `\$\{ADS_SAMPLE_PREFIX\}%`\)\s*\.in\('status', \['generating', 'assembling', 'delivered'\]\)\s*\.limit\(1\)/.test(c)) probs.push('"1 por conta" deixou de contar toda amostra (qualquer formato)')
  if (!/export async function adsSampleOpen[\s\S]*?adsSampleAccountOk\(admin, userId\)/.test(c)) probs.push('antifarm saiu da porta da amostra')
  if (!/export async function adsSampleCapReached[\s\S]*?\.like\('billing_ref', `\$\{ADS_SAMPLE_PREFIX\}%`\)[\s\S]*?count >= ADS_SAMPLE_DAILY_CAP/.test(c)) probs.push('teto diário deixou de contar as duas amostras juntas')
  if (/sample_format|close_?real|closeReal|presenter|format/i.test(c.slice(c.indexOf('export async function adsSampleOpen'), c.indexOf('export async function adsSampleAccountOk')))) probs.push('a porta da amostra passou a separar por formato (uma de cada)')
  if (!/export const ADS_SAMPLE_DAILY_CAP = 30\b/.test(sample)) probs.push('teto diário ≠ 30')
  if (!/export const ADS_PAYWALL_DOORS: readonly string\[\] = \[[^\]]*'v2'/.test(paywall)) probs.push('a porta /ads?from=v2 deixou de mostrar a oferta (seria parede crua)')
  return probs
}
function advanceProblems(src) {
  const probs = []
  const c = semComentario(src)
  const line = "  if (isAdsSampleRef(order.billing_ref) && !closeRealSource) source = adsSampleWatermarkSource(source, { text: ADS_V2_CLOSE_REAL_WATERMARK, fontFamily: captionFontFor(language), width: Number(source.width) || out.width })"
  const at = c.indexOf(line)
  if (at < 0) probs.push('amostra fora do Close real sai sem marca-d\'água')
  const built = c.indexOf('source = closeRealSource ?? presenterSource ?? buildAdV2Source(')
  const post = c.indexOf('renderId = await submitCreatomateRender(source)')
  if (!(built > 0 && at > built && post > at)) probs.push('marca-d\'água fora do intervalo montagem → envio')
  if (!c.includes('watermark: isAdsSampleRef(order.billing_ref) ? ADS_V2_CLOSE_REAL_WATERMARK : null')) probs.push('Close real da amostra perdeu a marca-d\'água')
  return probs
}
function pageProblems(page) {
  const probs = []
  const c = semComentario(page)
  if (!c.includes('const entry: AdsSampleEntry | null = adsSampleEntryOf(Array.isArray(rawEntry) ? rawEntry[0] : rawEntry)')) probs.push('/ads/v2 não valida ?entry pela lib')
  if (!c.includes("if (!user) redirect(`/login?redirect=${encodeURIComponent(entry ? `/ads/v2?entry=${entry}` : '/ads/v2')}`)")) probs.push('login perde a entrada do card')
  if (!/if \(!sample\) \{[\s\S]{0,400}redirect\('\/ads\?from=v2'\)/.test(c)) probs.push('não-pagante sem amostra não vai à porta que explica e vende')
  if (/v2Fail\(|status: 403|new Response\([^)]*403/.test(c)) probs.push('página devolve 403 cru')
  if (!/entry=\{entry\} \/>/.test(c)) probs.push('entrada não chega à tela')
  return probs
}
function clientProblems(client, simple) {
  const probs = []
  const cs = semComentario(simple)
  if (!/entry=\{entry\}/.test(semComentario(client).replace(/\s+/g, ' '))) probs.push('AdsV2Client não passa a entrada à sessão simples')
  if (!cs.includes("const sampleFormat: AdsV2AdFormat = adsSampleFormatFor(entry, ADS_V2_PRESENTER_PUBLIC)")) probs.push('tela não usa a MESMA regra do servidor')
  if (!cs.includes("const samplePresenter = sample && sampleFormat === 'presenter'")) probs.push('amostra com a pessoa sem depender da amostra')
  if (!cs.includes("...(samplePresenter ? { sample_entry: 'ugc' } : {})")) probs.push('/plan não recebe a entrada UGC da amostra')
  if ((cs.match(/sample_entry/g) || []).length !== 1) probs.push('sample_entry mandado fora do ponto único')
  if (!cs.includes('const off = sample && f !== sampleFormat;')) probs.push('seletor da amostra abre formato fora da entrada')
  if (!cs.includes("const adFormat: AdsV2AdFormat = samplePresenter ? 'presenter' : adsV2EffectiveAdFormat(adFormatChoice, sample)")) probs.push('amostra do card UGC não abre no Apresentador')
  return probs
}

// ─── o real ──────────────────────────────────────────────────────────────────
console.log('KINEO-HOME-3-CARDS-1910')
const lp = libProblems(LIB); ok(lp.length === 0, `(1) lib: interruptor, ordem, nomes, destinos e metadados fechados (${lp.join('; ') || 'ok'})`)
const mp = mediaProblems(LIB); ok(mp.length === 0, `(2) mídia: prévias reais, leves, faststart, mudas; PT vê o PT (${mp.join('; ') || 'ok'})`)
const cp = componentProblems(COMP); ok(cp.length === 0, `(3) componente: clique medido, vídeo seguro, sem preço (${cp.join('; ') || 'ok'})`)
const hp = homeProblems(LAND); ok(hp.length === 0, `(4) home: cards só pelo interruptor, 1ª dobra, curadoria e menu intocados (${hp.join('; ') || 'ok'})`)
const tp = copyProblems(DICT); ok(tp.length === 0, `(5) frases nas 16 línguas (${tp.slice(0, 4).join('; ') || 'ok'})`)
const ep = entryProblems(ENTRY); ok(ep.length === 0, `(6) entrada da amostra: só ugc dá a pessoa, marca, marca-d'água, 16 línguas (${ep.join('; ') || 'ok'})`)
const kp = contractProblems(CONTRACT); ok(kp.length === 0, `(7) contrato: sample_entry ugc | sem a chave | 400 (${kp.join('; ') || 'ok'})`)
const pp = planProblems(PLAN); ok(pp.length === 0, `(8a) /plan decide o formato da amostra pela entrada (${pp.join('; ') || 'ok'})`)
const sp = startProblems(START); ok(sp.length === 0, `(8b) /start: Close real ou a marca; teto e chave de sempre (${sp.join('; ') || 'ok'})`)
const vp = travasProblems(SACCESS, SAMPLE, PAYWALL); ok(vp.length === 0, `(8c) travas: 1 por conta no total, antifarm, teto 30 dos dois formatos, porta que vende (${vp.join('; ') || 'ok'})`)
const ap = advanceProblems(ADV); ok(ap.length === 0, `(8d) marca-d'água em toda amostra (${ap.join('; ') || 'ok'})`)
const gp = pageProblems(PAGE); ok(gp.length === 0, `(9a) /ads/v2: entrada validada, login a devolve, sem 403 cru (${gp.join('; ') || 'ok'})`)
const qp = clientProblems(CLIENT, SIMPLE); ok(qp.length === 0, `(9b) tela: entrada UGC só na amostra com a pessoa (${qp.join('; ') || 'ok'})`)

// ─── (10) o desfaz encadeado: desfeita esta camada, cada arquivo tocado é EXATAMENTE a base ─────────────────────
{
  const { execFileSync } = await import('node:child_process')
  const D = await import('./test-support/desfaz-home-3-cards-1910.mjs')
  const lf = (s) => s.replace(/\r\n/g, '\n')
  const difs = []
  let semBase = false
  for (const p of D.HOME_3_CARDS_1910_ARQUIVOS) {
    let base
    try { base = execFileSync('git', ['-C', ROOT, 'show', `${D.HOME_3_CARDS_1910_BASE}:${p}`], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }) } catch { semBase = true; break }
    let out
    try { out = D.semHome3Cards1910(read(p), p) } catch (e) { difs.push(`${p}: ${e.message}`); continue }
    if (lf(out) !== lf(base)) difs.push(p)
  }
  if (semBase) console.log('  (10) base', D.HOME_3_CARDS_1910_BASE.slice(0, 9), 'fora deste clone — prova pulada')
  else ok(difs.length === 0, `(10) desfaz: ${D.HOME_3_CARDS_1910_ARQUIVOS.length} arquivos voltam à base exata (${difs.slice(0, 3).join('; ') || 'ok'})`)
  const corte = semApresentadorOlhos1910(read('scripts/test-support/desfaz-close-real-legenda-corte-1910.mjs'), 'scripts/test-support/desfaz-close-real-legenda-corte-1910.mjs') // reancorado KINEO-APRESENTADOR-OLHOS-1910: era read(...) direto
  ok(/export function semCloseRealLegendaCorte1910\(texto, p\) \{\n  texto = semHome3Cards1910\(texto, p\)/.test(corte), '(10b) encadeado: a cabeça da corrente do Close real tira esta camada PRIMEIRO')
  ok(D.semHome3Cards1910('sem marca nenhuma', 'lib/ads/v2PlanCore.ts') === 'sem marca nenhuma' && D.semHome3Cards1910(read('lib/ads/v2PlanCore.ts'), 'outro/arquivo.ts') === read('lib/ads/v2PlanCore.ts'), '(10c) desfaz idempotente fora da lista / sem a marca')
  let lancou = false
  try { D.semHome3Cards1910(read('lib/ads/v2PlanCore.ts') + '\n// linha nova KINEO-HOME-3-CARDS-1910', 'lib/ads/v2PlanCore.ts') } catch { lancou = true }
  ok(lancou, '(M41) linha marcada a mais (conserto fora da conta) faz o desfaz lançar → vermelho')
}

// ─── mutantes (cada um PRECISA aplicar e ficar vermelho) ──────────────────────
function mut(src, from, to, check, label) {
  const applied = src.includes(from)
  ok(applied && check(src.split(from).join(to)).length > 0, `${label}${applied ? '' : ' (MUTANTE NÃO APLICOU)'}`)
}
mut(LIB, 'export const HOME_3_CARDS_LIVE = true', 'export const HOME_3_CARDS_LIVE = false', libProblems, '(M1) cards fechados de novo depois do ok do fundador → vermelho')
mut(LIB, '  return live === true || internal === true', '  return live === true', libProblems, '(M2) a casa perde a prévia → vermelho')
mut(LIB, "['films', 'product_ads', 'ugc_ads']", "['product_ads', 'films', 'ugc_ads']", libProblems, '(M3) ordem trocada → vermelho')
mut(LIB, "product_ads: 'product', ugc_ads: 'ugc'", "product_ads: 'product', ugc_ads: 'product'", libProblems, '(M4) card UGC leva à entrada do Close → vermelho')
mut(LIB, '  return signedIn ? dest : `/signup?redirect=${encodeURIComponent(dest)}`', "  return signedIn ? dest : '/ads'", libProblems, '(M5) visitante cai na porta sem voltar ao card → vermelho')
mut(LIB, '    signed_in: signedIn,\n', "    signed_in: signedIn,\n    label: 'AI UGC Ads',\n", libProblems, '(M6) texto vazando nos metadados → vermelho')
mut(LIB, "  ugc_ads: { title: 'AI UGC Ads',", "  ugc_ads: { title: 'AI Avatar',", libProblems, '(M7) nome do card 3 trocado → vermelho')
mut(LIB, "  films: 'SEEDANCE 1.5',", "  films: 'VEO 3.1',", libProblems, '(M8) selo do filme mente o motor → vermelho')
mut(LIB, "  product_ads: 'STUDIO ADS',", "  product_ads: 'FREE · 0 credits',", libProblems, '(M9) preço/oferta no selo do cartão → vermelho')
mut(LIB, "pt: preview('home-card-close-real-pt')", "pt: preview('home-card-close-real-xx')", mediaProblems, '(M10) prévia inexistente → vermelho')
mut(LIB, "  return (language === 'pt' && c.pt) || c.default", '  return c.default', mediaProblems, '(M11) português perde o vídeo em PT → vermelho')
mut(COMP, 'onClick={() => track(card)}', '', componentProblems, '(M12) card sem medição → vermelho')
mut(COMP, '        preload="none"\n', '        preload="auto"\n        autoPlay\n', componentProblems, '(M13) vídeo com autoPlay pesado → vermelho')
mut(COMP, 'if (visible && !reduce)', 'if (visible)', componentProblems, '(M14) vídeo ignora reduced-motion → vermelho')
mut(COMP, '<p className="k3c-sub">{copy(HOME_CARD_COPY[card].line)}</p>', '<p className="k3c-sub">{copy(HOME_CARD_COPY[card].line)} · 41 credits</p>', componentProblems, '(M15) preço digitado no cartão → vermelho')
mut(COMP, 'const adsCta = (card: HomeCardId) => homeCardAdsCta(card, language, ADS_SAMPLE_LIVE)', 'const adsCta = (card: HomeCardId) => homeCardAdsCta(card, language, true)', componentProblems, '(M16) "grátis" sem a amostra no ar → vermelho') // KINEO-HOME-CARDS-BOTOES-2010
mut(LAND, "  const showThreeCards = home3CardsOn(HOME_3_CARDS_LIVE, isInternalEmail(initialEmail)) // KINEO-HOME-3-CARDS-1910\n", '  const showThreeCards = true // KINEO-HOME-3-CARDS-1910\n', homeProblems, '(M17) cards fora do interruptor → vermelho')
mut(LAND, `${THREE_TAG}\n`, "      {false ? null : ( // KINEO-HOME-3-CARDS-1910\n", homeProblems, '(M18) cards apagados da home → vermelho')
mut(LAND, '<Link href="/pricing" data-nav-item="pricing"><UiLabel>Pricing</UiLabel></Link>', '<Link href="/pricing"><UiLabel>Pricing</UiLabel></Link>', homeProblems, '(M19) menu do topo encolhe → vermelho')
{
  const d = JSON.parse(JSON.stringify(DICT)); delete d.ar['AI UGC Ads']
  ok(copyProblems(d).length > 0, '(M20) frase sem tradução em ar → vermelho')
  const e = JSON.parse(JSON.stringify(DICT)); e.pt['AI Product Ads'] = 'AI Product Ads'
  ok(copyProblems(e).length > 0, '(M21) frase em inglês no PT → vermelho')
}
mut(ENTRY, "  return entry === 'ugc' && live === true && presenterPublic === true ? 'presenter' : 'close_real'", "  return entry ? 'presenter' : 'close_real'", entryProblems, '(M22) card de Produto dá a pessoa → vermelho')
mut(ENTRY, "  return p.sample_format === ADS_SAMPLE_PRESENTER_MARK && !!p.presenter && typeof p.presenter === 'object'", '  return p.sample_format === ADS_SAMPLE_PRESENTER_MARK', entryProblems, '(M23) marca sem apresentador planejado aceita → vermelho')
mut(ENTRY, '  return { ...source, elements: [...elements, mark] }', '  return source', entryProblems, "(M24) marca-d'água some → vermelho")
mut(ENTRY, "  return typeof raw === 'string' && (ADS_SAMPLE_ENTRIES as readonly string[]).includes(raw) ? (raw as AdsSampleEntry) : null", "  return typeof raw === 'string' ? (raw as AdsSampleEntry) : null", entryProblems, '(M25) entrada sem validação → vermelho')
mut(CONTRACT, "if (b.sample_entry !== 'ugc') return fail('bad_sample_entry'); sampleEntryUgc = true", 'sampleEntryUgc = true', contractProblems, '(M26) contrato aceita entrada inventada → vermelho')
mut(PLAN, "(gate !== 'ok' && sample && sampleFormat !== 'presenter')", "(gate !== 'ok' && sample && false)", planProblems, '(M27) amostra comum deixa de ser Close real → vermelho')
mut(PLAN, "adsSampleFormatFor(input.sample_entry === 'ugc' ? 'ugc' : 'product', ADS_V2_PRESENTER_PUBLIC)", "adsSampleFormatFor('ugc', ADS_V2_PRESENTER_PUBLIC)", planProblems, '(M28) toda amostra vira a pessoa (US$ 3) → vermelho')
mut(PLAN, "if (sampleFormat === 'presenter' && presenter) { Object.assign(stored,", "if (sampleFormat === 'presenter') { Object.assign(stored,", planProblems, '(M29) marca sem o apresentador planejado → vermelho')
mut(START, '!adsV2CloseRealOf(plan) && !samplePresenter)', '!adsV2CloseRealOf(plan) && false)', startProblems, '(M30) /start trava a amostra com a pessoa → vermelho')
mut(START, 'const samplePresenter = sampleRun && adsSamplePresenterPlanOk(plan)', 'const samplePresenter = sampleRun', startProblems, '(M31) /start aceita amostra sem a marca → vermelho')
mut(START, "      if (await adsSampleCapReached(admin)) return v2Fail('sample_cap', 429)", '', startProblems, '(M32) teto diário some → vermelho')
mut(SACCESS, ".in('status', ['generating', 'assembling', 'delivered'])\n      .limit(1)", ".in('status', ['generating', 'assembling', 'delivered'])\n      .contains('plan', { closeReal: true })\n      .limit(1)", (s) => travasProblems(s, SAMPLE, PAYWALL), '(M33) "1 por conta" vira uma de cada formato → vermelho')
mut(SAMPLE, 'export const ADS_SAMPLE_DAILY_CAP = 30', 'export const ADS_SAMPLE_DAILY_CAP = 300', (s) => travasProblems(SACCESS, s, PAYWALL), '(M34) teto diário estourado → vermelho')
mut(PAYWALL, "['v2', 'new', 'producao', 'studio']", "['new', 'producao', 'studio']", (s) => travasProblems(SACCESS, SAMPLE, s), '(M35) /ads?from=v2 vira parede crua → vermelho')
mut(ADV, '  if (isAdsSampleRef(order.billing_ref) && !closeRealSource) source = adsSampleWatermarkSource(', '  if (false) source = adsSampleWatermarkSource(', advanceProblems, "(M36) amostra com a pessoa sem marca-d'água → vermelho")
mut(PAGE, "encodeURIComponent(entry ? `/ads/v2?entry=${entry}` : '/ads/v2')", "encodeURIComponent('/ads/v2')", pageProblems, '(M37) login perde o card → vermelho')
mut(PAGE, "      redirect('/ads?from=v2')\n", "      return new Response('access denied', { status: 403 })\n", pageProblems, '(M38) não-pagante leva 403 cru → vermelho')
mut(SIMPLE, "...(samplePresenter ? { sample_entry: 'ugc' } : {})", "...(sample ? { sample_entry: 'ugc' } : {})", (s) => clientProblems(CLIENT, s), '(M39) toda amostra pede a pessoa → vermelho')
mut(SIMPLE, 'const off = sample && f !== sampleFormat;', "const off = sample && f !== 'close_real';", (s) => clientProblems(CLIENT, s), '(M40) seletor tranca o Apresentador do card UGC → vermelho')

console.log(`\n${pass} verificações ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
