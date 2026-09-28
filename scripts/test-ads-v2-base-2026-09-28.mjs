// KINEO-ADS-V2-2026-09-28 — guardião da BASE do anúncio v2 (etapa 1: módulos puros + migration).
// Especificação: docs/ESPEC-ANUNCIO-V2-2026-09-28.md. Roda com `node scripts/test-ads-v2-base-2026-09-28.mjs`.
// Os módulos são puros (nenhum import) e o Node 24 importa .ts direto pelo caminho; o que depende de alias '@/'
// (router.ts, compose.ts, renderProfile.ts) é lido por readFileSync para os guardiões de espelho.
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const imp = (p) => import(pathToFileURL(join(RAIZ, p)).href)
let ok = 0
const falhas = []
const check = (nome, condicao) => {
  let v = false
  try { v = typeof condicao === 'function' ? !!condicao() : !!condicao } catch (e) { falhas.push(`${nome} (lançou: ${e.message})`); return }
  if (v) ok++; else falhas.push(nome)
}
const throws = (fn, re) => { try { fn() } catch (e) { return re ? re.test(String(e.message)) : true } return false }
const eqSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps
const semComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n')

const MOD = {
  tiers: 'lib/ads/v2Tiers.ts',
  engines: 'lib/ads/v2Engines.ts',
  shots: 'lib/ads/v2ShotLists.ts',
  montage: 'lib/ads/adV2Montage.ts',
  contract: 'lib/ads/v2Contract.ts',
}
const T = await imp(MOD.tiers)
const E = await imp(MOD.engines)
const S = await imp(MOD.shots)
const M = await imp(MOD.montage)
const C = await imp(MOD.contract)

// ── 0. pureza e trava 8.2 ───────────────────────────────────────────────────────────────────────
for (const [nome, p] of Object.entries(MOD)) {
  check(`${p} é puro (nenhum import/require)`, !/^\s*import\s/m.test(rd(p)) && !/\brequire\(/.test(semComentarios(rd(p))))
  check(`${nome}: caminho fora da trava 8.2 (nunca lib/compose, lib/hollywood/, lib/cinematic/…)`, !/^(lib\/compose|lib\/hollywood\/|lib\/cinematic\/|lib\/broll\/|lib\/lyriaMusic|lib\/narrationFit|app\/api\/analyze-idea\/|app\/api\/generate-script\/|app\/api\/generate-video-)/.test(p))
}

// ── 1. v2Tiers ──────────────────────────────────────────────────────────────────────────────────
const tiersSrc = rd(MOD.tiers)
const TIERS = ['photo_motion', 'commercial', 'cinema']
// REANCORADO 29/09 (KINEO-ADS-V2-VIRADA-2026-09-29): a virada pública foi ordem do fundador ("deixa os motores já acionados");
// a intenção segue — o interruptor é UM literal e o valor importado bate com ele. O guardião da virada
// (scripts/test-ads-v2-virada-2026-09-29.mjs) prova o resto (redirect do /ads/new e copy pública).
check('T1 interruptor ADS_V2_PUBLIC = true desde a virada de 29/09 (literal e valor)', T.ADS_V2_PUBLIC === true && /export const ADS_V2_PUBLIC = true\b/.test(tiersSrc) && (tiersSrc.match(/export const ADS_V2_PUBLIC\b/g) || []).length === 1)
check('T2 créditos 34/41/51 por 15 s · planos 6/6/7 · cenas criadas 0/3/4 · closes-herói 0/0/2', () => {
  const t = T.ADS_V2_TIERS
  return t.photo_motion.credits15 === 34 && t.commercial.credits15 === 41 && t.cinema.credits15 === 51 &&
    t.photo_motion.shots === 6 && t.commercial.shots === 6 && t.cinema.shots === 7 &&
    t.photo_motion.generatedScenes === 0 && t.commercial.generatedScenes === 3 && t.cinema.generatedScenes === 4 &&
    t.photo_motion.heroCloseups === 0 && t.commercial.heroCloseups === 0 && t.cinema.heroCloseups === 2
})
check('T3 adsV2Credits = ceil(base × s/15): 15 s 34/41/51 · 20 s 46/55/68 · 30 s 68/82/102', () =>
  [[15, [34, 41, 51]], [20, [46, 55, 68]], [30, [68, 82, 102]]].every(([s, exp]) => TIERS.every((t, i) => T.adsV2Credits(t, s) === exp[i])))
check('T4 adsV2Credits recusa 35 s e nível desconhecido', throws(() => T.adsV2Credits('cinema', 35)) && throws(() => T.adsV2Credits('gold', 15)))
check('T5 people/place/product → Kling O3 em todos os níveis, tentativas 1 e 2', ['people', 'place', 'product'].every((k) => TIERS.every((t) => T.routeShot(k, t, 1) === 'kling_o3' && T.routeShot(k, t, 2) === 'kling_o3')))
check('T6 product_hero → Seedance 2.0 SÓ no Cinema; fora dele cai no Kling O3', T.routeShot('product_hero', 'cinema', 1) === 'seedance_20_fast' && T.routeShot('product_hero', 'cinema', 2) === 'seedance_20_fast' && T.routeShot('product_hero', 'commercial', 1) === 'kling_o3' && T.routeShot('product_hero', 'photo_motion', 1) === 'kling_o3')
check('T7 TEXTO NUNCA VAI A IA: text → null em todo nível e em TODA tentativa (1..8)', TIERS.every((t) => [1, 2, 3, 4, 5, 6, 7, 8].every((a) => T.routeShot('text', t, a) === null)))
check('T8 2ª falha → reserva H3 (tentativa 3+), para todo tipo com IA; tentativa 0 recusada', ['people', 'place', 'product', 'product_hero'].every((k) => TIERS.every((t) => T.routeShot(k, t, 3) === 'h3' && T.routeShot(k, t, 5) === 'h3')) && throws(() => T.routeShot('people', 'cinema', 0)) && T.ADS_V2_FALLBACK_FROM_ATTEMPT === 3)
check('T9 refação 5 cr (Kling/H3) e 12 cr (Seedance 2.0), marcada provisória; text não tem refação', T.ADS_V2_RETAKE_CREDITS.kling_o3 === 5 && T.ADS_V2_RETAKE_CREDITS.h3 === 5 && T.ADS_V2_RETAKE_CREDITS.seedance_20_fast === 12 && T.ADS_V2_RETAKE_PROVISIONAL === true && T.adsV2RetakeCredits('product_hero', 'cinema') === 12 && T.adsV2RetakeCredits('people', 'commercial') === 5 && T.adsV2RetakeCredits('text', 'cinema') === 0)
check('T10 catálogo: Kling 3 s × 0,112 = 0,336 · Seedance 4 s × 0,2419 ≈ 0,968 · H3 5 s × 0,06 = 0,30 · Nano Banana 0,15 · fixos 0,25', () => {
  const e = T.ADS_V2_ENGINES
  return near(e.kling_o3.usdPerSecond * e.kling_o3.genSeconds, 0.336) && near(e.seedance_20_fast.usdPerSecond * e.seedance_20_fast.genSeconds, 0.9676) &&
    near(e.h3.usdPerSecond * e.h3.genSeconds, 0.3) && T.ADS_V2_SCENE_IMAGE_USD === 0.15 && T.ADS_V2_FIXED_USD === 0.25 &&
    near(Object.values(T.ADS_V2_FIXED_USD_PARTS).reduce((s, x) => s + x, 0), 0.25) && e.h3.audioAlwaysOn === true && e.kling_o3.audioAlwaysOn === false
})
const routerSrc = rd('lib/hollywood/router.ts')
const routerConst = (name) => (routerSrc.match(new RegExp(`export const ${name}\\s*=\\s*'([^']+)'`)) || [])[1]
check('T11 ESPELHO: slugs Kling O3 i2v e H3 i2v iguais aos de lib/hollywood/router.ts', T.ADS_V2_ENGINES.kling_o3.slug === routerConst('KLING3_I2V_MODEL') && T.ADS_V2_ENGINES.h3.slug === routerConst('H3_I2V_MODEL') && !!routerConst('KLING3_I2V_MODEL'))
check('T12 ESPELHO: H3 a US$ 0,06/s e 768P iguais ao router (H3_USD_PER_SECOND, H3_RESOLUTION)', /export const H3_USD_PER_SECOND = 0\.06\b/.test(routerSrc) && /export const H3_RESOLUTION = '768P'/.test(routerSrc) && T.ADS_V2_ENGINES.h3.usdPerSecond === 0.06)
check('T13 Seedance 2.0 Fast i2v com o slug conferido no schema da fal (sem prefixo fal-ai/)', T.ADS_V2_ENGINES.seedance_20_fast.slug === 'bytedance/seedance-2.0/fast/image-to-video' && T.ADS_V2_SCENE_IMAGE_SLUG === 'fal-ai/nano-banana-pro/edit')

// ── 2. v2ShotLists (usado também por T14) ───────────────────────────────────────────────────────
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const url = (n) => `https://x.supabase.co/storage/v1/object/public/user-footage/u/${n}.jpg`
const FULL = [
  { id: U(1), url: url(1), kind: 'product' },
  { id: U(2), url: url(2), kind: 'place' },
  { id: U(3), url: url(3), kind: 'people' },
  { id: U(4), url: url(4), kind: 'product' },
  { id: U(5), url: url(5), kind: 'place' },
]
const SECTORS = ['restaurant', 'clinic', 'real_estate', 'gym', 'salon', 'store', 'app_service', 'other']
const cuts = (p) => p.shots.map((s) => s.cutSeconds)

check('T14 estimateAdUsd reproduz a tabela da especificação (15 s): 2,266 · 2,716 · 4,465', () => {
  const est = (tier) => T.estimateAdUsd({ tier, shots: S.planShots({ sector: 'restaurant', tier, photos: FULL }).shots })
  const a = est('photo_motion'); const b = est('commercial'); const c = est('cinema')
  return near(a.totalUsd, 2.266, 0.001) && near(b.totalUsd, 2.716, 0.001) && near(c.totalUsd, 4.465, 0.001) && a.sceneImages === 0 && b.sceneImages === 3 && c.sceneImages === 4 && c.aiShots === 7
})
check('T15 plano text custa zero em estimateAdUsd (melhora a margem)', () => {
  const r = T.estimateAdUsd({ tier: 'photo_motion', shots: [{ kind: 'text', source: 'client_photo' }, { kind: 'people', source: 'client_photo' }] })
  return r.aiShots === 1 && near(r.videoUsd, 0.336) && near(r.totalUsd, 0.586)
})
check('T16 fixos crescem com a duração (Creatomate por segundo, voz por caractere): 15 s 0,25 · 30 s 0,41; Foto em movimento 30 s = 12 × 0,336 + 0,41', () => {
  const p30 = S.planShots({ sector: 'restaurant', tier: 'photo_motion', photos: FULL, seconds: 30 })
  const e30 = T.estimateAdUsd({ tier: 'photo_motion', shots: p30.shots, seconds: 30 })
  return near(T.adsV2FixedUsd(15), 0.25) && near(T.adsV2FixedUsd(), 0.25) && near(T.adsV2FixedUsd(30), 0.41) && near(T.adsV2FixedUsd(20), 0.303) &&
    near(e30.fixedUsd, 0.41) && near(e30.totalUsd, 12 * 0.336 + 0.41, 0.001) && throws(() => T.adsV2FixedUsd(0))
})

check('S1 8 setores exatos, cada um com 3 pedidos de foto em inglês ("Your best-selling dish, close up") e 4 cenas', S.ADS_V2_SECTOR_SPECS.restaurant.photoRequests[0] === 'Your best-selling dish, close up' && eqSet(S.ADS_V2_SECTORS, SECTORS) && SECTORS.every((s) => {
  const sp = S.ADS_V2_SECTOR_SPECS[s]
  return sp.photoRequests.length === 3 && sp.photoRequests.every((r) => /^[\x20-\x7E]{8,80}$/.test(r) && /^(Your|A|The) /.test(r)) && sp.sceneActions.length === 4
}))
check('S2 todos os setores × níveis (15 s): nº de planos 6/6/7, cenas criadas 0/3/4, closes-herói 0/0/2', SECTORS.every((sector) => TIERS.every((tier) => {
  const p = S.planShots({ sector, tier, photos: FULL })
  const spec = T.ADS_V2_TIERS[tier]
  return p.shots.length === spec.shots && p.shots.filter((x) => x.source === 'generated_scene').length === spec.generatedScenes && p.shots.filter((x) => x.kind === 'product_hero').length === spec.heroCloseups
})))
check('S3 cortes de 15 s = 2,0/2,0/2,5/2,0/2,0/2,0 (12,5 s) + cartão 2,5 = 15 s', ['photo_motion', 'commercial'].every((tier) => SECTORS.every((sector) => {
  const p = S.planShots({ sector, tier, photos: FULL })
  return JSON.stringify(cuts(p)) === JSON.stringify([2, 2, 2.5, 2, 2, 2]) && p.shotsSeconds === 12.5 && p.cardSeconds === 2.5 && p.totalSeconds === 15
})))
check('S4 Cinema: 7 planos de 2,0 s + cartão = 16,5 s', SECTORS.every((sector) => {
  const p = S.planShots({ sector, tier: 'cinema', photos: FULL })
  return p.shots.length === 7 && p.shots.every((x) => x.cutSeconds === 2) && p.totalSeconds === 16.5
}))
check('S5 20 s e 30 s: total 20/30 (Cinema 21,5/31,5), extras de 2,5 s tirados das fotos do cliente', SECTORS.every((sector) => {
  const t = (tier, s) => S.planShots({ sector, tier, photos: FULL, seconds: s })
  return t('photo_motion', 20).totalSeconds === 20 && t('commercial', 20).totalSeconds === 20 && t('cinema', 20).totalSeconds === 21.5 &&
    t('photo_motion', 30).totalSeconds === 30 && t('commercial', 30).totalSeconds === 30 && t('cinema', 30).totalSeconds === 31.5 &&
    t('commercial', 30).shots.filter((x) => x.source === 'generated_scene').length === 3 && t('photo_motion', 30).shots.length === 12
}) && throws(() => S.planShots({ sector: 'gym', tier: 'cinema', photos: FULL, seconds: 35 })))
check('S6 ordem fixa GANCHO → DESEJO → USO E EMOÇÃO → LUGAR/PRODUTO em todo setor × nível × duração', () => {
  const rank = { hook: 0, desire: 1, use_emotion: 2, place_product: 3 }
  return SECTORS.every((sector) => TIERS.every((tier) => [15, 20, 30].every((seconds) => {
    const b = S.planShots({ sector, tier, photos: FULL, seconds }).shots.map((x) => rank[x.beat])
    return b[0] === 0 && b[1] === 1 && b[b.length - 1] === 3 && b.every((v, i) => i === 0 || v >= b[i - 1])
  })))
})
check('S7 foto marcada text vira plano text: sem prompt, sem cena criada, nunca IA — até com TODAS as fotos de texto', () => {
  const onlyText = [1, 2, 3].map((n) => ({ id: U(n), url: url(n), kind: 'text' }))
  return TIERS.every((tier) => {
    const p = S.planShots({ sector: 'app_service', tier, photos: onlyText })
    return p.shots.every((x) => x.kind === 'text' && x.prompt === null && x.source === 'client_photo' && T.routeShot(x.kind, tier, 1) === null && x.cutStart === 0)
  }) && SECTORS.every((sector) => TIERS.every((tier) => S.planShots({ sector, tier, photos: [...FULL, { id: U(9), url: url(9), kind: 'text' }] }).shots.every((x) => x.kind !== 'text' || x.prompt === null)))
})
check('S8 falta de foto (3 fotos, 6 vagas): todas as vagas preenchidas e a foto repetida ganha OUTRO movimento', () => {
  const three = FULL.slice(0, 3)
  return SECTORS.every((sector) => {
    const p = S.planShots({ sector, tier: 'photo_motion', photos: three })
    const byPhoto = new Map()
    for (const x of p.shots) { if (!byPhoto.has(x.sourceFootageId)) byPhoto.set(x.sourceFootageId, []); byPhoto.get(x.sourceFootageId).push(x.prompt) }
    return p.shots.length === 6 && p.shots.every((x) => x.sourceFootageId && x.imageUrl) && byPhoto.size === 3 && [...byPhoto.values()].every((ps) => new Set(ps).size === ps.length)
  })
})
check('S9 todo prompt de movimento é de 1 frase de movimento e termina em "Keep everything exactly as in the photo."', SECTORS.every((sector) => TIERS.every((tier) => S.planShots({ sector, tier, photos: FULL }).shots.every((x) => x.prompt === null || (x.prompt.endsWith('Keep everything exactly as in the photo.') && x.prompt.split('. ').length === 2)))))
check('S10 cena criada: referência = fotos do cliente SEM as de texto; pedido proíbe acrescentar prato/decoração e escrever texto', () => {
  const withText = [...FULL, { id: U(8), url: url(8), kind: 'text' }]
  return SECTORS.every((sector) => {
    const g = S.planShots({ sector, tier: 'cinema', photos: withText }).shots.filter((x) => x.source === 'generated_scene')
    return g.length === 4 && g.every((x) => x.referenceUrls.length === 5 && !x.referenceUrls.includes(url(8)) && x.imageUrl === null && x.kind === 'people' &&
      /Do not add dishes, products, decoration, furniture, structures or views/.test(x.scenePrompt) && /No text, no logos/.test(x.scenePrompt) && /attached photos of this business/.test(x.scenePrompt))
  })
})
check('S11 herói do Cinema só com foto de PRODUTO (a mesma foto repetida com outro movimento); sem produto não há herói', () => {
  const oneProduct = [{ id: U(1), url: url(1), kind: 'product' }, { id: U(2), url: url(2), kind: 'place' }, { id: U(3), url: url(3), kind: 'place' }]
  const p = S.planShots({ sector: 'restaurant', tier: 'cinema', photos: oneProduct })
  const h = p.shots.filter((x) => x.kind === 'product_hero')
  const noProduct = S.planShots({ sector: 'restaurant', tier: 'cinema', photos: [{ id: U(2), url: url(2), kind: 'place' }, { id: U(3), url: url(3), kind: 'people' }, { id: U(4), url: url(4), kind: 'place' }] })
  return h.length === 2 && h.every((x) => x.sourceFootageId === U(1)) && h[0].prompt !== h[1].prompt && noProduct.shots.every((x) => x.kind !== 'product_hero') &&
    TIERS.filter((t) => t !== 'cinema').every((tier) => S.planShots({ sector: 'store', tier, photos: FULL }).shots.every((x) => x.kind !== 'product_hero'))
})
check('S18 SEM foto de produto a cena criada não pede o prato/produto "das fotos" (senão o Nano Banana inventa); com produto, mantém', () => {
  const noProd = [{ id: U(2), url: url(2), kind: 'place' }, { id: U(3), url: url(3), kind: 'people' }, { id: U(5), url: url(5), kind: 'place' }]
  const citaProduto = /(food|product|equipment|plate|dish|dishes)[^.]*from the photos|passing a plate|finishing a client's hair|new look/i
  const semProduto = SECTORS.every((sector) => ['commercial', 'cinema'].every((tier) => S.planShots({ sector, tier, photos: noProd }).shots
    .filter((x) => x.source === 'generated_scene').every((x) => !citaProduto.test(x.scenePrompt.split('. ')[1]))))
  const regra = S.planShots({ sector: 'restaurant', tier: 'commercial', photos: noProd }).shots.filter((x) => x.source === 'generated_scene')
    .every((x) => /no food and no plates appear/.test(x.scenePrompt))
  const comProduto = S.planShots({ sector: 'restaurant', tier: 'cinema', photos: FULL }).shots.filter((x) => x.source === 'generated_scene')
  return semProduto && regra && /sharing the food from the photos/.test(comProduto[0].scenePrompt) && !/no food and no plates/.test(comProduto[0].scenePrompt) &&
    S.sceneImagePrompt('clinic', 0, false) === S.sceneImagePrompt('clinic', 0, true)
})
check('S12 determinístico: mesma entrada → mesmo plano', SECTORS.every((sector) => TIERS.every((tier) => JSON.stringify(S.planShots({ sector, tier, photos: FULL })) === JSON.stringify(S.planShots({ sector, tier, photos: FULL })))))
check('S13 narração: até 30 palavras em 15 s (40 em 20 s, 60 em 30 s)', S.planShots({ sector: 'gym', tier: 'commercial', photos: FULL }).narrationMaxWords === 30 && S.adsV2NarrationMaxWords(20) === 40 && S.adsV2NarrationMaxWords(30) === 60)
check('S14 2-3 frases de tela: marca nos primeiros 5 s, todas dentro dos planos (nunca no cartão), 2 obrigatórias', SECTORS.every((sector) => TIERS.every((tier) => {
  const p = S.planShots({ sector, tier, photos: FULL })
  return p.overlays.length === 3 && p.overlays[0].role === 'brand' && p.overlays[0].start < 5 && p.overlays.every((o) => o.start >= 0 && o.end > o.start && o.end <= p.shotsSeconds) && p.overlays.filter((o) => o.required).length === 2
})))
check('S15 trecho usado cabe no menor clipe (Kling 3 s) com o dissolve: cutStart + corte + fade ≤ 2,9 s', SECTORS.every((sector) => TIERS.every((tier) => [15, 20, 30].every((seconds) => S.planShots({ sector, tier, photos: FULL, seconds }).shots.every((x) => x.kind === 'text' || x.cutStart + x.cutSeconds + S.ADS_V2_FADE_SECONDS <= T.ADS_V2_ENGINES.kling_o3.genSeconds - 0.1 + 1e-9)))))
check('S16 ESPELHO de enums: tipos de plano = v2Tiers; dissolve = montador; setores/tipos de foto = contrato', eqSet([...S.ADS_V2_PHOTO_KINDS, 'product_hero'], T.ADS_V2_SHOT_KINDS) && S.ADS_V2_FADE_SECONDS === M.ADS_V2_MONTAGE_FADE && eqSet(S.ADS_V2_SECTORS, C.ADS_V2_CONTRACT_SECTORS) && eqSet(S.ADS_V2_PHOTO_KINDS, C.ADS_V2_CONTRACT_PHOTO_KINDS) && eqSet(S.ADS_V2_PLAN_TIERS, T.ADS_V2_TIER_IDS) && S.ADS_V2_MIN_GEN_SECONDS === T.ADS_V2_ENGINES.kling_o3.genSeconds)
check('S17 recusa setor desconhecido e foto sem tipo válido', throws(() => S.planShots({ sector: 'bakery', tier: 'cinema', photos: FULL })) && throws(() => S.planShots({ sector: 'gym', tier: 'cinema', photos: [{ id: U(1), url: url(1), kind: 'logo' }] })))

// ── 3. v2Engines ────────────────────────────────────────────────────────────────────────────────
const IMG = 'https://x.supabase.co/storage/v1/object/public/renders/u/a.jpg'
const PR = 'Slow push-in toward the product. Keep everything exactly as in the photo.'
const keys = (o) => Object.keys(o).sort().join(',')
check('E1 Kling O3 Pro i2v: exatamente prompt/image_url/duration/generate_audio · duration "3" (string) · áudio false', () => {
  const i = E.buildShotInput('kling_o3', { imageUrl: IMG, prompt: PR })
  return keys(i) === 'duration,generate_audio,image_url,prompt' && i.duration === '3' && i.generate_audio === false && i.image_url === IMG && i.prompt === PR
})
check('E2 Seedance 2.0 Fast i2v: duration "4" · 720p · aspect 9:16 · áudio false · nada além disso', () => {
  const i = E.buildShotInput('seedance_20_fast', { imageUrl: IMG, prompt: PR })
  return keys(i) === 'aspect_ratio,duration,generate_audio,image_url,prompt,resolution' && i.duration === '4' && i.resolution === '720p' && i.aspect_ratio === '9:16' && i.generate_audio === false
})
check('E3 H3 i2v: duration 5 NÚMERO (schema pede integer) · resolution 768P · prompt_expansion_mode disabled', () => {
  const i = E.buildShotInput('h3', { imageUrl: IMG, prompt: PR })
  return keys(i) === 'duration,image_url,prompt,prompt_expansion_mode,resolution' && i.duration === 5 && typeof i.duration === 'number' && i.resolution === '768P' && i.prompt_expansion_mode === 'disabled'
})
check('E4 NUNCA end_image_url/tail_image_url/multi_prompt, mesmo com o objeto de entrada carregando esses campos', T.ADS_V2_ENGINE_IDS.every((e) => {
  const i = E.buildShotInput(e, { imageUrl: IMG, prompt: PR, end_image_url: IMG, tail_image_url: IMG, multi_prompt: [{ prompt: 'x' }], generate_audio: true })
  return !('end_image_url' in i) && !('tail_image_url' in i) && !('multi_prompt' in i) && i.generate_audio !== true
}))
check('E5 código sem espalhar objeto (nenhum "..." fora de comentário) e sem os campos proibidos', !/\.\.\./.test(semComentarios(rd(MOD.engines))) && !/end_image_url|tail_image_url/.test(semComentarios(rd(MOD.engines))))
check('E6 recusa URL não-https, prompt vazio, prompt > 2500 e motor desconhecido', throws(() => E.buildShotInput('kling_o3', { imageUrl: 'http://a/b.jpg', prompt: PR })) && throws(() => E.buildShotInput('kling_o3', { imageUrl: IMG, prompt: ' ' })) && throws(() => E.buildShotInput('h3', { imageUrl: IMG, prompt: 'x'.repeat(2501) })) && throws(() => E.buildShotInput('veo', { imageUrl: IMG, prompt: PR })))
check('E7 Nano Banana Pro edit: prompt/image_urls/9:16/num_images 1/2K (a mais barata ≥ 1080 de largura)/jpeg', () => {
  const i = E.buildSceneImageInput({ prompt: 'A scene', referenceUrls: [IMG, IMG.replace('a.jpg', 'b.jpg')], extra: 1 })
  return keys(i) === 'aspect_ratio,image_urls,num_images,output_format,prompt,resolution' && i.aspect_ratio === '9:16' && i.num_images === 1 && i.resolution === '2K' && i.image_urls.length === 2 && i.output_format === 'jpeg'
})
check('E8 cena criada sem referência ou com mais de 14 referências é recusada', throws(() => E.buildSceneImageInput({ prompt: 'A scene', referenceUrls: [] })) && throws(() => E.buildSceneImageInput({ prompt: 'A scene', referenceUrls: Array(15).fill(IMG) })))
check('E9 cada motor do catálogo (v2Tiers) tem builder; texto não tem (routeShot null nunca chega aqui)', T.ADS_V2_ENGINE_IDS.every((e) => !!E.buildShotInput(e, { imageUrl: IMG, prompt: PR })) && eqSet(T.ADS_V2_ENGINE_IDS, ['kling_o3', 'seedance_20_fast', 'h3']))

// ── 4. adV2Montage ──────────────────────────────────────────────────────────────────────────────
const montageSrc = rd(MOD.montage)
const clip = (n) => `https://x.supabase.co/storage/v1/object/public/renders/u/adsv2-p${n}.mp4`
const CARD = 'https://x.supabase.co/storage/v1/object/public/user-footage/u/card.png'
const MUSIC = 'https://x.supabase.co/storage/v1/object/public/music/u/m.mp3'
const VOICE = 'https://x.supabase.co/storage/v1/object/public/voiceovers/u/v.mp3'
const fromPlan = (plan, measured = 3.0) => plan.shots.map((x, i) => ({ url: x.kind === 'text' ? url(i) : clip(i), kind: x.kind, cutStart: x.cutStart, cutSeconds: x.cutSeconds, measuredSeconds: x.kind === 'text' ? null : measured }))
const plan15 = S.planShots({ sector: 'restaurant', tier: 'commercial', photos: FULL })
const plan16 = S.planShots({ sector: 'restaurant', tier: 'cinema', photos: FULL })
const ov = (p) => p.overlays.slice(0, 2).map((o, i) => ({ text: ['Casa Amman', 'Charcoal grill · fresh bread'][i], start: o.start, end: o.end }))
const build = (over = {}) => M.buildAdV2Source({ width: 1080, height: 1920, shots: fromPlan(plan15), overlays: ov(plan15), fontFamily: 'Montserrat', cardUrl: CARD, cardSeconds: 2.5, musicUrl: MUSIC, voiceUrl: VOICE, voiceSeconds: 11.2, ...over })
const els = (src, type, track) => src.elements.filter((e) => e.type === type && (track === undefined || e.track === track))

check('M1 duração = soma EXATA dos cortes + cartão: 15 s (6 planos) e 16,5 s (Cinema)', () => {
  const a = build(); const b = M.buildAdV2Source({ width: 1080, height: 1920, shots: fromPlan(plan16), overlays: ov(plan16), fontFamily: 'Montserrat', cardUrl: CARD, musicUrl: MUSIC })
  return a.duration === 15 && b.duration === 16.5
})
check('M2 formato do compose: mp4 1080×1920 · frame_rate 24 · snapshot_time 1 · fundo shape com RECT_PATH', () => {
  const s = build(); const bg = els(s, 'shape')[0]
  return s.output_format === 'mp4' && s.width === 1080 && s.height === 1920 && s.frame_rate === 24 && s.snapshot_time === 1 && bg.path === M.ADS_V2_RECT_PATH && bg.duration === 15
})
check('M3 cada plano de vídeo: trim_start + duração ≤ duração medida · volume 0% · sem loop · fit cover', () => {
  const s = build(); const v = els(s, 'video')
  return v.length === 6 && v.every((e) => e.trim_start + e.duration <= 3.0 + 1e-9 && e.volume === '0%' && e.loop === false && e.fit === 'cover')
})
check('M4 RECUSA plano cujo trim passa do clipe medido (2,6 s medidos para corte de 2,5 s)', throws(() => build({ shots: fromPlan(plan15, 2.6) }), /trim_past_clip/) && throws(() => build({ shots: fromPlan(plan15).map((x, i) => (i === 0 ? { ...x, cutStart: 1.0 } : x)) }), /trim_past_clip/))
check('M5 RECUSA clipe sem duração medida e URL que não é https', throws(() => build({ shots: fromPlan(plan15).map((x) => ({ ...x, measuredSeconds: null })) }), /unmeasured/) && throws(() => build({ shots: fromPlan(plan15).map((x, i) => (i === 1 ? { ...x, url: 'http://fal.media/x.mp4' } : x)) }), /bad_url/))
check('M6 plano text = IMAGEM parada com zoom lento 100% → 108%, sem trim e sem vídeo', () => {
  const shots = fromPlan(plan15); shots[1] = { url: url(7), kind: 'text', cutStart: 0, cutSeconds: 2, measuredSeconds: null }
  const s = build({ shots }); const img = els(s, 'image', 2)
  return img.length === 1 && img[0].source === url(7) && !('trim_start' in img[0]) && img[0].animations[0].type === 'scale' && img[0].animations[0].start_scale === '100%' && img[0].animations[0].end_scale === '108%' && els(s, 'video').length === 5
})
check('M7 frases no terço do meio: caixa entre 14% e 65% da altura, fonte do idioma, só sobre os planos', () => {
  const s = build({ fontFamily: 'Noto Sans Arabic' }); const t = els(s, 'text')
  const y = parseFloat(t[0].y) / 100; const h = parseFloat(t[0].height) / 100
  return t.length === 2 && t.every((e) => e.font_family === 'Noto Sans Arabic' && e.y_anchor === '50%' && e.time + e.duration <= 12.5 + 1e-9) &&
    y - h / 2 >= M.ADS_V2_SAFE_TOP && y + h / 2 <= M.ADS_V2_SAFE_BOTTOM && M.ADS_V2_SAFE_TOP === 0.14 && M.ADS_V2_SAFE_BOTTOM === 0.65
})
check('M8 RECUSA frase sobre o cartão, frase vazia e mais de 3 frases', throws(() => build({ overlays: [{ text: 'x', start: 11, end: 13 }] }), /overlay_window/) && throws(() => build({ overlays: [{ text: ' ', start: 1, end: 2 }] }), /empty_overlay/) && throws(() => build({ overlays: [1, 2, 3, 4].map((n) => ({ text: 'a', start: n, end: n + 0.5 })) }), /too_many/))
check('M9 voz a partir de 0,3 s; música 25% sob a voz e 70% depois dela (29/09: sobe quando a voz acaba) e 70% sem voz; voz que passa do fim é recusada', () => {
  const a = build(); const b = build({ voiceUrl: null, voiceSeconds: null })
  const voice = els(a, 'audio', 5)[0]; const musA = els(a, 'audio', 6)[0]; const musB = els(b, 'audio', 6)[0]
  return voice.time === 0.3 && voice.duration === 11.2 && musA.volume === '25%' && musB.volume === '70%' && els(b, 'audio', 5).length === 0 && musA.duration === 11.7 && els(a, 'audio', 6).length === 2 && els(a, 'audio', 6)[1].time === 11.7 && els(a, 'audio', 6)[1].volume === '70%' && els(b, 'audio', 6).length === 1 && musB.duration === 15 && !('trim_start' in musA) && musA.loop === true && !('loop' in els(a, 'audio', 6)[1]) && els(a, 'audio', 6)[1].trim_start === 11.7 &&
    throws(() => build({ voiceSeconds: 14.8 }), /voice_too_long/) && throws(() => build({ voiceSeconds: null }), /voice_unmeasured/)
})
check('M10 cartão final: imagem de 2,5 s que começa no fim dos planos e fecha exatamente no fim do anúncio', () => {
  const s = build(); const card = els(s, 'image', 3)[0]
  return card.source === CARD && card.time === 12.5 && card.duration === 2.5 && card.time + card.duration === s.duration && card.enter_transition.type === 'fade'
})
check('M11 dissolve curto: 1º plano sem transição; os seguintes entram com fade de 0,25 s sobre o anterior', () => {
  const v = els(build(), 'video')
  return !('enter_transition' in v[0]) && v.slice(1).every((e) => e.enter_transition.type === 'fade' && e.enter_transition.duration === 0.25) && v.every((e, i) => i === 0 || e.time === +(v[i - 1].time + v[i - 1].duration - 0.25).toFixed(3))
})
check('M12 sem marca d\'água e sem legenda palavra por palavra: os únicos textos são as frases pedidas', () => els(build(), 'text').length === 2 && !/usekineo|watermark/i.test(JSON.stringify(build())))
check('M13 ESPELHO: RECT_PATH = lib/compose.ts; frame rate 24 = DEFAULT_RENDER_PROFILE.fps de lib/renderProfile.ts', () => {
  const compose = readFileSync(join(RAIZ, 'lib/compose.ts'), 'latin1')
  const rect = (compose.match(/export const RECT_PATH = '([^']+)'/) || [])[1]
  const fps = (rd('lib/renderProfile.ts').match(/DEFAULT_RENDER_PROFILE: RenderProfile = \{[^}]*fps:\s*(\d+)/) || [])[1]
  return rect === M.ADS_V2_RECT_PATH && Number(fps) === M.ADS_V2_FRAME_RATE
})
check('M14 montador não importa nem cita o /api/compose como dependência (nome e código fora de lib/compose)', () => !/from ['"]@?\/?lib\/compose/.test(montageSrc) && existsSync(join(RAIZ, MOD.montage)) && !existsSync(join(RAIZ, 'lib/composeAd.ts')))

// ── 5. v2Contract ───────────────────────────────────────────────────────────────────────────────
const contractSrc = rd(MOD.contract)
check('C1 criar pedido: padrão 15 s e narração LIGADA; chave desconhecida ignorada', () => {
  const r = C.sanitizeCreateOrderBody({ tier: 'commercial', sentence: '  Grill   house in Amman ', hacker: 1, credits_charged: 0 })
  return r.ok && r.value.seconds === 15 && r.value.narration === true && r.value.sentence === 'Grill house in Amman' && keys(r.value) === 'language,link,narration,seconds,sector,sentence,tier'
})
check('C2 criar pedido: recusa nível fora do enum, 35 s, frase > 400 e pedido sem frase nem link', !C.sanitizeCreateOrderBody({ tier: 'gold', sentence: 'x' }).ok && C.sanitizeCreateOrderBody({ tier: 'cinema', seconds: 35, sentence: 'x' }).error === 'bad_seconds' && C.sanitizeCreateOrderBody({ tier: 'cinema', sentence: 'x'.repeat(401) }).error === 'sentence_too_long' && C.sanitizeCreateOrderBody({ tier: 'cinema', sentence: 'x'.repeat(400) }).ok && C.sanitizeCreateOrderBody({ tier: 'cinema' }).error === 'sentence_or_link_required')
check('C3 criar pedido: link só http(s); setor e idioma validados', C.sanitizeCreateOrderBody({ tier: 'cinema', link: 'javascript:alert(1)' }).error === 'bad_link' && C.sanitizeCreateOrderBody({ tier: 'cinema', link: 'https://casa.jo' }).ok && C.sanitizeCreateOrderBody({ tier: 'cinema', sentence: 'x', sector: 'bakery' }).error === 'bad_sector' && C.sanitizeCreateOrderBody({ tier: 'cinema', sentence: 'x', language: 'english' }).error === 'bad_language')
const photos = (n, kind = 'place') => Array.from({ length: n }, (_, i) => ({ footage_id: U(10 + i), kind }))
check('C4 planejar: 3 a 7 fotos (2 e 8 recusadas), cada uma com id uuid e tipo do enum', () => {
  const base = { order_id: U(1), sector: 'restaurant', logo_footage_id: U(2) }
  return C.sanitizePlanBody({ ...base, photos: photos(3) }).ok && C.sanitizePlanBody({ ...base, photos: photos(7) }).ok &&
    C.sanitizePlanBody({ ...base, photos: photos(2) }).error === 'too_few_photos' && C.sanitizePlanBody({ ...base, photos: photos(8) }).error === 'too_many_photos' &&
    C.sanitizePlanBody({ ...base, photos: [...photos(2), { footage_id: 'abc', kind: 'place' }] }).error === 'bad_photo_id' &&
    C.sanitizePlanBody({ ...base, photos: [...photos(2), { footage_id: U(30), kind: 'logo' }] }).error === 'bad_photo_kind'
})
check('C5 planejar: recusa foto repetida, logo como foto, pedido e logo sem uuid', () => {
  const base = { order_id: U(1), sector: 'restaurant', logo_footage_id: U(2) }
  return C.sanitizePlanBody({ ...base, photos: [...photos(2), { footage_id: U(10), kind: 'text' }] }).error === 'duplicate_photo' &&
    C.sanitizePlanBody({ ...base, photos: [...photos(2), { footage_id: U(2), kind: 'text' }] }).error === 'logo_is_photo' &&
    C.sanitizePlanBody({ ...base, order_id: '1', photos: photos(3) }).error === 'bad_order_id' && C.sanitizePlanBody({ ...base, logo_footage_id: null, photos: photos(3) }).error === 'bad_logo_footage_id'
})
check('C6 iniciar: dry_run padrão false, só booleano; order_id uuid', C.sanitizeStartBody({ order_id: U(1) }).value.dry_run === false && C.sanitizeStartBody({ order_id: U(1), dry_run: true }).value.dry_run === true && C.sanitizeStartBody({ order_id: U(1), dry_run: 'yes' }).error === 'bad_dry_run' && C.sanitizeStartBody({ order_id: 'x' }).error === 'bad_order_id')
check('C7 refazer: idx inteiro 0..15 e o preço que a tela mostrou (inteiro 1..50)', C.sanitizeRetakeBody({ order_id: U(1), idx: 0, expected_credits: 5 }).ok && C.sanitizeRetakeBody({ order_id: U(1), idx: 12, expected_credits: 12 }).ok && C.sanitizeRetakeBody({ order_id: U(1), idx: -1, expected_credits: 5 }).error === 'bad_idx' && C.sanitizeRetakeBody({ order_id: U(1), idx: 1.5, expected_credits: 5 }).error === 'bad_idx' && C.sanitizeRetakeBody({ order_id: U(1), idx: 1 }).error === 'bad_expected_credits' && C.sanitizeRetakeBody({ order_id: U(1), idx: 1, expected_credits: 0 }).error === 'bad_expected_credits')
check('C8 corpo não-objeto recusado em todos (null, array, string)', [C.sanitizeCreateOrderBody, C.sanitizePlanBody, C.sanitizeStartBody, C.sanitizeRetakeBody].every((f) => [null, [], 'x', 3].every((b) => f(b).ok === false && f(b).error === 'bad_body')))
check('C9 ESPELHO: níveis e segundos do contrato = v2Tiers; o maior índice de plano (Cinema 30 s) cabe no teto de idx', eqSet(C.ADS_V2_CONTRACT_TIERS, T.ADS_V2_TIER_IDS) && eqSet(C.ADS_V2_CONTRACT_SECONDS.map(String), T.ADS_V2_SECONDS.map(String)) && S.planShots({ sector: 'other', tier: 'cinema', photos: FULL, seconds: 30 }).shots.length - 1 <= C.ADS_V2_MAX_SHOT_IDX && C.ADS_V2_CONTRACT_MIN_PHOTOS === S.ADS_V2_MIN_PHOTOS && C.ADS_V2_CONTRACT_MAX_PHOTOS === S.ADS_V2_MAX_PHOTOS)
check('C10 o contrato não espalha o corpo recebido', !/\.\.\.\s*(b|raw|body|p)\b/.test(semComentarios(contractSrc)))

// ── 6. migration ────────────────────────────────────────────────────────────────────────────────
const MIG = 'migrations_pending/2026-09-29_ads_v2.sql'
const sql = existsSync(join(RAIZ, MIG)) ? rd(MIG) : ''
const code = sql.replace(/--.*$/gm, '')
const [ordersSql = '', shotsSql = ''] = code.split(/create table if not exists public\.ads_v2_shots/)
const enumIn = (block, col) => {
  const m = block.match(new RegExp(`check \\((?:${col} is null or )?${col} in \\(([^)]*)\\)\\)`))
  return m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')) : []
}
check('G1 migration nova existe e as duas tabelas nascem com create table if not exists', sql.length > 0 && /create table if not exists public\.ads_v2_orders/.test(code) && /create table if not exists public\.ads_v2_shots/.test(code))
check('G2 RLS LIGADO nas duas tabelas, NENHUMA policy, anon/authenticated sem privilégio', /alter table public\.ads_v2_orders enable row level security/.test(code) && /alter table public\.ads_v2_shots enable row level security/.test(code) && !/create policy|grant /i.test(code) && /revoke all on table public\.ads_v2_orders from anon, authenticated/.test(code) && /revoke all on table public\.ads_v2_shots from anon, authenticated/.test(code))
check('G3 pedido: status/tier/seconds/setor nos enums da especificação e do código', eqSet(enumIn(ordersSql, 'status'), ['draft', 'planned', 'generating', 'assembling', 'delivered', 'failed', 'cancelled']) && eqSet(enumIn(ordersSql, 'tier'), T.ADS_V2_TIER_IDS) && eqSet(enumIn(ordersSql, 'seconds'), T.ADS_V2_SECONDS.map(String)) && eqSet(enumIn(ordersSql, 'sector'), S.ADS_V2_SECTORS))
check('G4 pedido: billing_ref unique, credits_charged ≥ 0, colunas que o código vai ler', /billing_ref text unique/.test(ordersSql) && /credits_charged integer not null default 0 check \(credits_charged >= 0\)/.test(ordersSql) && ['brief jsonb', 'language text', 'narration boolean', 'logo_footage_id text', 'card_url text', 'plan jsonb', 'music_url text', 'voice_url text', 'generation_id text', 'creatomate_render_id text', 'video_id uuid', 'error text'].every((c) => ordersSql.includes(c)))
check('G5 plano: kind/source/status/engine nos enums; unique(order_id, idx, attempt)', eqSet(enumIn(shotsSql, 'kind'), T.ADS_V2_SHOT_KINDS) && eqSet(enumIn(shotsSql, 'source'), ['client_photo', 'generated_scene']) && eqSet(enumIn(shotsSql, 'status'), ['pending', 'image_submitted', 'image_done', 'submitted', 'ambiguous', 'done', 'failed', 'stuck', 'skipped_text']) && eqSet(enumIn(shotsSql, 'engine'), T.ADS_V2_ENGINE_IDS) && /unique \(order_id, idx, attempt\)/.test(shotsSql))
check('G6 TEXTO NUNCA VAI A IA também no banco: plano text sem motor e sem pedido na fal', /check \(kind <> 'text' or \(engine is null and request_id is null and image_request_id is null\)\)/.test(shotsSql))
check('G7 UM pedido ativo por conta: índice único parcial (user_id) em generating/assembling + índices do cron', /create unique index if not exists ads_v2_orders_one_active_per_user\s+on public\.ads_v2_orders \(user_id\)\s+where status in \('generating', 'assembling'\)/.test(code) && /ads_v2_orders_active_status_idx/.test(code) && /ads_v2_shots_pending_status_idx/.test(code))
check('G8 idempotente: todo create table/index com if not exists e todo trigger precedido de drop trigger if exists', !/create (unique )?index (?!if not exists)/.test(code) && !/create table (?!if not exists)/.test(code) && (code.match(/create trigger (\w+)/g) || []).every((t) => code.includes(`drop trigger if exists ${t.split(' ')[2]}`)))
check('G9 a migration antiga do Studio Ads segue intacta (seconds 35/60) e a nova não toca em ads_orders', /check \(seconds is null or seconds in \(35, 60\)\)/.test(rd('migrations_pending/2026-09-25_studio_ads.sql')) && !/public\.ads_orders\b/.test(code))

console.log(`${ok} verdes, ${falhas.length} vermelhos`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
