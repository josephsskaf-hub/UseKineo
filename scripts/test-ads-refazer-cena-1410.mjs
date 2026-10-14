// KINEO-ADS-MELHORIAS-1410 — guardião do "Refazer esta cena" no MODO SIMPLES do Studio Ads v2 (fundador 14/10, "tudo sim").
// Antes: o anúncio entregue no modo simples (o de todo mundo) só tinha um link "Redo a shot (full mode)"; quem não ia ao modo
// completo achava que uma cena ruim = refazer o anúncio inteiro. A rota e o preço por plano JÁ existiam (não foram tocados):
//   app/api/ads/v2/retake (pedido novo com id determinístico gravado ANTES do débito, débito idempotente 'adsv2redo-<id>', 409
//   'price_changed' se o preço mudou, estorno só da refação se ela falhar) e adsV2RetakeCredits (5 cr Kling O3, 12 cr Seedance).
// Prova:
//   R1 as frases nas 16 línguas (nenhuma cópia do inglês; {c} no botão, {n}/{c} na confirmação);
//   R2 a tela simples: na ENTREGA, a grade com miniatura e "Refazer esta cena · N créditos" — o preço no botão e na confirmação;
//      só fora da amostra; o POST manda o preço MOSTRADO (expected_credits) e só depois da confirmação;
//   R3 quem tem botão: a MESMA regra do modo completo (canRedoShot), EXECUTADA: nada em texto, vídeo do cliente, packshot,
//      anúncio não entregue, cena não pronta ou sem preço;
//   R4 preço por plano EXECUTADO: 5 (Kling O3) e 12 (herói Seedance) — o mesmo número que a vista manda à tela;
//   R5 segurança da rota (não tocada): preço conferido antes de gravar, id determinístico, gravação ANTES do débito, falha =
//      failAdsV2Order (estorno), e no máximo UM pedido ativo por conta (o índice único parcial; a refação não escapa dele);
//   R6 dinheiro intocado: rota da refação, v2Billing, v2Tiers e v2StartCore byte a byte iguais à base (a1f3dbff);
//   M  mutantes.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semRefacaoAtor1410 } from './test-support/desfaz-ads-refacao-ator-1410.mjs' // reancorado KINEO-ADS-REFACAO-ATOR-1410

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const rd = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const check = async (m, fn) => { let v = false; try { v = !!(await fn()) } catch (e) { console.log('       (lançou: ' + (e && e.message) + ')'); v = false } ok(v, m) }
const trocar = (src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem âncora única: ' + de.slice(0, 80)); const out = src.split(de).join(para); if (out === src) throw new Error('mutante não aplicou'); return out }

const F = {
  copy: 'lib/ads/v2Redo.ts',
  screen: 'lib/ads/v2Screen.ts',
  tiers: 'lib/ads/v2Tiers.ts',
  simple: 'app/(dashboard)/ads/v2/AdsV2Simple.tsx',
  retake: 'app/api/ads/v2/retake/route.ts',
  billing: 'lib/ads/v2Billing.ts',
  start: 'lib/ads/v2StartCore.ts',
  advance: 'lib/ads/v2Advance.ts',
}
const SRC = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, semRefacaoAtor1410(v, rd(v))])) // reancorado KINEO-ADS-REFACAO-ATOR-1410 — a 1ª refação grátis sai antes (provada em scripts/test-ads-refacao-ator-1410.mjs); o resto do texto é o de agora
const carregar = (over = {}) => createOfflineLoader({ source: (rel, text) => (Object.hasOwn(over, rel) ? over[rel] : text) })
const mod = (rel, over = {}) => carregar(over)(rel)
const LANGS = ['en', 'es', 'hi', 'pt', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi']
const KEYS = ['title', 'hint', 'button', 'ask', 'yes', 'starting', 'cancel', 'note']

// ═══ R1. frases ══════════════════════════════════════════════════════════════════════════════════════════════════════
const r1 = (copySrc) => {
  const C = mod(F.copy, copySrc ? { [F.copy]: copySrc } : {})
  const T = C.ADS_V2_REDO_COPY
  return Object.keys(T).length === 16 && LANGS.every((l) => T[l] && KEYS.every((k) => typeof T[l][k] === 'string' && T[l][k].trim().length > 0)) &&
    LANGS.filter((l) => l !== 'en').every((l) => ['title', 'hint', 'button', 'ask', 'note'].every((k) => T[l][k] !== T.en[k])) &&
    LANGS.every((l) => T[l].button.includes('{c}') && T[l].ask.includes('{n}') && T[l].ask.includes('{c}') && T[l].note.includes('{n}')) &&
    C.adsV2RedoFill(T.pt.button, { c: 5 }) === 'Refazer esta cena · 5 créditos' && C.adsV2RedoFill(T.en.ask, { n: 3, c: 12 }) === 'Redo scene 3 for 12 credits?' &&
    C.adsV2RedoCopy('xx') === T.en && C.adsV2RedoCopy('pt') === T.pt &&
    !/^\s*import\s(?!type)/m.test(copySrc ?? SRC.copy) // lib pura
}
await check('R1 frases nas 16 línguas (nenhuma cópia do inglês), com o preço {c} no botão e {n}/{c} na confirmação; lib pura', () => r1())

// ═══ R2. a tela simples ══════════════════════════════════════════════════════════════════════════════════════════════
const bloco = (s, inicio) => { const i = s.indexOf(inicio); if (i < 0) return ''; let d = 0, j = s.indexOf('{', i); for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (d === 0) return s.slice(i, k + 1) } } return '' }
const r2 = (src) => {
  const redo = bloco(src, 'async function redoShot(shot: AdsV2ScreenShot)')
  const grade = src.slice(src.indexOf('function SimpleShotGrid('))
  const entrega = src.slice(src.indexOf("{phase === 'delivered' && order ? ("), src.indexOf("{phase === 'failed' && order ? ("))
  return /\{scopy \? null : \(\s*<SimpleShotGrid[\s\S]{0,300}?redo=\{\{ copy: rcopy, ask: redoAsk, busy: redoBusy,/.test(entrega) &&
    !/mode=full&order=/.test(entrega) && // o link para o modo completo saiu da entrega
    /adsV2RedoFill\(redo\.copy\.button, \{ c: s\.retake_credits \}\)/.test(grade) && // o preço NO BOTÃO
    /adsV2RedoFill\(redo\.copy\.ask, \{ n: i \+ 1, c: s\.retake_credits \}\)/.test(grade) && // e na confirmação
    /\{redo && canRedoShot\(s, orderStatus\) \? \(/.test(grade) &&
    /redo\.ask === s\.idx \?/.test(grade) && /onClick=\{\(\) => redo\.onConfirm\(s\)\}/.test(grade) && /onClick=\{\(\) => redo\.onAsk\(s\.idx\)\}/.test(grade) && // 1º clique pergunta, 2º confirma
    /if \(!order \|\| redoBusy \|\| !canRedoShot\(shot, order\.status\)\) return/.test(redo) &&
    /api<StatusView>\('\/api\/ads\/v2\/retake', \{ method: 'POST', body: \{ order_id: parent, idx: shot\.idx, expected_credits: shot\.retake_credits \} \}\)/.test(redo) &&
    /if \(r\.code === 'price_changed'\) void pollOnce\(parent\)/.test(redo) && /adoptOrder\(/.test(redo) && /void onBalance\(\)/.test(redo) &&
    (src.match(/'\/api\/ads\/v2\/retake'/g) ?? []).length === 1 // uma só chamada à rota, a do botão confirmado
}
await check('R2 tela simples: na ENTREGA, a grade com miniaturas e "Refazer esta cena · N créditos" (preço no botão e na confirmação), só fora da amostra; 1º clique pergunta, 2º chama a rota com o preço MOSTRADO; preço mudou = relê; aceita = acompanha a refação', () => r2(SRC.simple))

// ═══ R3. quem tem botão ══════════════════════════════════════════════════════════════════════════════════════════════
const r3 = (screenSrc) => {
  const S = mod(F.screen, screenSrc ? { [F.screen]: screenSrc } : {})
  const pronto = { kind: 'product', status: 'done', state: 'ready', retake_credits: 5 }
  return S.canRedoShot(pronto, 'delivered') === true &&
    S.canRedoShot({ ...pronto, kind: 'text', retake_credits: 0 }, 'delivered') === false && S.canRedoShot({ ...pronto, kind: 'text' }, 'delivered') === false && // texto nunca, nem com preço vazado
    S.canRedoShot({ ...pronto, kind: 'text', packshot: true, retake_credits: 0 }, 'delivered') === false &&
    S.canRedoShot({ ...pronto, kind: 'user_video', retake_credits: 0 }, 'delivered') === false && S.canRedoShot({ ...pronto, kind: 'user_video' }, 'delivered') === false &&
    S.canRedoShot(pronto, 'generating') === false && S.canRedoShot(pronto, 'failed') === false &&
    S.canRedoShot({ ...pronto, state: 'working', status: 'submitted' }, 'delivered') === false &&
    S.canRedoShot({ ...pronto, retake_credits: 0 }, 'delivered') === false
}
await check('R3 o botão segue canRedoShot (a regra do modo completo), EXECUTADA: só cena pronta de anúncio ENTREGUE com preço; nunca texto, vídeo do cliente nem a foto real (packshot)', () => r3())

// ═══ R4. preço por plano ═════════════════════════════════════════════════════════════════════════════════════════════
await check('R4 preço por plano EXECUTADO (adsV2RetakeCredits): 5 no Kling O3 (Foto em movimento, Comercial), 12 no herói Seedance do Premium, 0 no texto — o mesmo que a vista manda à tela (retake_credits)', () => {
  const T = mod(F.tiers)
  return T.adsV2RetakeCredits('product', 'photo_motion') === 5 && T.adsV2RetakeCredits('people', 'commercial') === 5 && T.adsV2RetakeCredits('product_hero', 'cinema') === 12 &&
    T.adsV2RetakeCredits('text', 'commercial') === 0 &&
    /retake_credits: r\.kind === 'text' \|\| r\.kind === 'user_video' \? 0 : adsV2RetakeCredits\(r\.kind, order\.tier\),/.test(SRC.advance) &&
    /const price = adsV2RetakeCredits\(target\.kind, parent\.tier\)/.test(SRC.retake)
})

// ═══ R5. segurança da rota ═══════════════════════════════════════════════════════════════════════════════════════════
const ordem = (s, ...marcas) => { let at = -1; for (const m of marcas) { const i = s.indexOf(m, at + 1); if (i < 0 || i <= at) return false; at = i } return true }
await check('R5 rota da refação: preço conferido (409) ANTES de gravar; id determinístico gravado ANTES do débito; débito idempotente; falha = failAdsV2Order (estorno só da refação); sem variation_slot (cai no índice "1 pedido ativo por conta")', () => {
  const R = SRC.retake
  const sql = rd('migrations_pending/2026-09-30_ads_v2_variacoes.sql')
  const ins = R.slice(R.indexOf('.insert({'), R.indexOf('.select(', R.indexOf('.insert({')))
  return ordem(R, "if (price !== expected) return v2Fail('price_changed', 409", 'const retakeId = deterministicUuid(', '.insert({', 'chargeAdsV2(admin, { userId: uid, billingRef, cost: price })') &&
    /if \(parent\.status !== 'delivered'\) return v2Fail\('not_delivered', 409\)/.test(R) && /failAdsV2Order\(admin, retake, `charge_\$\{charge\.code\}`/.test(R) &&
    /failAdsV2Order\(adminRef, charged, `exception:/.test(R) && /'23505'/.test(R) && !/variation_slot/.test(ins) && /status: 'generating'/.test(ins) &&
    /create unique index if not exists ads_v2_orders_one_active_per_user_slot\s+on public\.ads_v2_orders \(user_id, \(coalesce\(variation_slot, 'A'\)\)\)\s+where status in \('generating', 'assembling'\);/.test(sql)
})

// ═══ R6. dinheiro intocado ═══════════════════════════════════════════════════════════════════════════════════════════
const BASE = {
  'app/api/ads/v2/retake/route.ts': 'e06bd043dce8266fc83a3016378c791b309b56d9946875eea7ec32a4a5d25632',
  'lib/ads/v2Billing.ts': 'b1ba33894c315fbc017b7d5053fa6db78b9098aa8e79aca94a3c72031943d4b9',
  'lib/ads/v2Tiers.ts': '18678aa1573651bc61ee6ff55508187393ae56c093dbc09f8737e65d344219a0',
  'lib/ads/v2StartCore.ts': '4393d6ccf8d02426eecded99df5b3be56c0ee9072d5a74221bef566b474dbbde',
}
await check('R6 rota da refação, v2Billing, v2Tiers e v2StartCore byte a byte iguais à base a1f3dbff (nenhum preço nem débito novo)', () => Object.entries(BASE).every(([f, h]) => sha(semRefacaoAtor1410(f, rd(f))) === h)) /* reancorado KINEO-ADS-REFACAO-ATOR-1410 — a rota da refação ganhou SÓ as linhas marcadas da 1ª grátis */

// ═══ M. mutantes ══════════════════════════════════════════════════════════════════════════════════════════════════════
const vermelho = async (nome, src, de, para, prova) => {
  let mut = null
  try { mut = trocar(src, de, para) } catch (e) { ok(false, `mutante ${nome}: NÃO aplicou (${e.message})`); return }
  let red = false
  try { red = !(await prova(mut)) } catch (e) { console.log('       (mutante lançou: ' + (e && e.message) + ')'); red = true }
  ok(red && mut !== src, `mutante ${nome}: aplicou e fica VERMELHO`)
}
await vermelho('M1 a amostra grátis ganha o botão (sem o portão scopy)', SRC.simple, '            {scopy ? null : (\n              <SimpleShotGrid', '            {(\n              <SimpleShotGrid', (m) => r2(m))
await vermelho('M2 botão sem o preço', SRC.simple, '{adsV2RedoFill(redo.copy.button, { c: s.retake_credits })}', '{redo.copy.title}', (m) => r2(m))
await vermelho('M3 POST sem o preço mostrado (expected_credits)', SRC.simple, 'idx: shot.idx, expected_credits: shot.retake_credits } })', 'idx: shot.idx } })', (m) => r2(m))
await vermelho('M4 um clique só (sem confirmação)', SRC.simple, 'onClick={() => redo.onAsk(s.idx)}', 'onClick={() => redo.onConfirm(s)}', (m) => r2(m))
await vermelho('M5 texto pode ser refeito', SRC.screen, "  if (shot.kind === 'text') return false\n", '', (m) => r3(m))
await vermelho('M6 português copiado do inglês', SRC.copy, "button: 'Refazer esta cena · {c} créditos'", "button: 'Redo this scene · {c} credits'", (m) => r1(m))

console.log(`\ntest-ads-refazer-cena-1410: ${pass} verdes, ${fail} vermelhos`)
process.exit(fail ? 1 : 0)
