// KINEO-ADS-V2-2026-09-28 — plano do anúncio v2 (especificação, seção 5, passo 2). SEM COBRAR e sem chamar a fal.
//
// Recebe setor, logo, 1 a 7 fotos (KINEO-ADS-1FOTO-LINK-2026-10-10: eram 3 a 7) JÁ recortadas em 9:16 no navegador (cada uma com o tipo marcado) e, se quiser, o
// cartão final. Extrai o brief da frase (ou do link) com gpt-4o-mini (lib/ads/v2Brief.ts), monta a lista de planos
// pelo molde do setor (lib/ads/v2ShotLists.ts planShots, determinístico), passa os validadores anti-invenção pela
// narração, pelas frases de tela E por cada prompt de movimento/cena, e devolve o custo em créditos e em US$
// estimado. O pedido vira 'planned'. Teto diário de planos por pessoa (evento ads_v2_plan_served) ANTES do modelo.
//
// KINEO-SHOPIFY-2026-10-13 (etapa 2) — o CORPO desta rota mora aqui, numa função que recebe quem age (user) e o acesso JÁ
// resolvido (loadAdsAccess), em vez de ler o cookie do Supabase. A rota /api/ads/v2/plan só lê o cookie e chama esta função
// (comportamento idêntico); o app da Shopify (/api/shopify/ads) chama a MESMA função com a conta da loja. Nenhum caminho
// paralelo: moderação, teto do dia, amostra, posse das fotos e a régua anti-invenção são estas linhas, copiadas da rota.
// O guardião scripts/test-shopify-app-1310.mjs desfaz a extração e confere a impressão digital do corpo de antes.
import type { NextResponse } from 'next/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { LANGUAGE_NAMES, narrationLanguage, resolveNarrationLanguage } from '@/lib/textLanguage'
import { adsGate, isMissingAdsTable, type AdsAccessLoad } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { sanitizeAssetsBody, sanitizePlanBody } from '@/lib/ads/v2Contract'
import { adsV2Credits, estimateAdUsd } from '@/lib/ads/v2Tiers'
import { ADS_V2_PLAN_VIDEO_MAX_SECONDS, ADS_V2_PLAN_VIDEO_MIN_SECONDS, adsV2NarrationMaxWords, planShots, type AdsV2Video } from '@/lib/ads/v2ShotLists'
import { ADS_V2_OVERLAY_MAX_CHARS } from '@/lib/ads/v2ShotLists' // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o limite da edição do texto
import { ADS_V2_PLAN_DAILY_CAP, checkV2Prompts, extractAdsV2Brief } from '@/lib/ads/v2Brief'
import { adsV2LinkText } from '@/lib/ads/v2Link'
import { researchState, storedResearchFacts } from '@/lib/ads/v2Research'
import { adsV2PageTextForBrief } from '@/lib/ads/v2Research' // KINEO-ADS-FIEL-2-1510 — a página do link só entra com o que a pessoa marcou (nada de franquia nos roteiros)
import { adsV2PlanDailyCapFor, adsV2PlansLeft } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-2-1510 — teto por conta (casa sem teto, Business 60) e o contador
// KINEO-ESTILOS-PRODUTO-2026-10-09 — interruptor único dos estilos de produto (false = o campo `style` é ignorado aqui).
import { ADS_V2_STYLES_PUBLIC } from '@/lib/ads/v2Styles'
// KINEO-ATOR-ANUNCIO-2026-10-09 — o ator de IA (interruptor único + o plano dele: foto do produto, pessoa e prompt).
import { ADS_V2_PRESENTER_PUBLIC, planAdsV2Presenter } from '@/lib/ads/v2Presenter'
import { adsV2PresenterById } from '@/lib/ads/v2Presenter' // KINEO-ADS-REFACAO-ATOR-1410 — a entrada da biblioteca (retrato, descrição, pronome)
import { ADS_V2_PRESENTER_LIBRARY, ADS_V2_PRESENTER_PERFORMANCE_PROMPT } from '@/lib/ads/v2Presenter' // KINEO-APRESENTADOR-V2-1710 — a biblioteca (o sorteio = as 6 primeiras) e a atuação aprovada (a mão livre gesticula)
import { ADS_V2_PRESENTER_HOLDS, adsV2PresenterHoldsShots } from '@/lib/ads/v2PresenterHolds' // KINEO-ADS-REFACAO-ATOR-1410 — pessoa de IA segurando o produto (interruptor desligado)
import { presenterTalkMarks } from '@/lib/ads/v2Brief' // KINEO-APRESENTADOR-OLHOS-1910 — a fala sensorial que sobrou no roteiro do apresentador v2 (evento)
import { adsV2ActorPrompt } from '@/lib/ads/v2Presenter' // KINEO-APRESENTADOR-OLHOS-1910 — o prompt do sorteio quando a trava dos aprovados troca a pessoa sorteada
import { loadAdsV2Order, type AdsV2StoredPlan } from '@/lib/ads/v2Advance'
import { measureFootageVideo, ownedFootage, v2Fail, v2Json } from '@/lib/ads/v2Server'
// KINEO-ADS-AMOSTRA-2026-10-09 — a amostra grátis abre o plano (sem custo de fal) para a conta free/trial que ainda não usou a dela.
import { adsSampleLevelOk, adsSampleOpen } from '@/lib/ads/serverAccess'
import { adsV2IsProductOrder, adsV2SceneSetting, adsV2SceneShots } from '@/lib/ads/v2Scene' // KINEO-ADS-CENA-2026-10-13 — a cena da pessoa no prompt das cenas criadas (só Comercial/Premium)
import { ADS_V2_BRIEF_TIMEOUT_WHY, ADS_V2_PLAN_MODEL_DEADLINE_MS } from '@/lib/ads/v2Brief' // KINEO-ADS-CENA-2026-10-13 — prazo do modelo amarrado ao maxDuration e timeout que não vira 502 cru
import { adsV2SentenceForCopy } from '@/lib/ads/v2Scene' // KINEO-ADS-CONSERTOS-1410 — produto sem a cena da frase
import { adsV2KindWithProductPhoto } from '@/lib/ads/v2Scene' // KINEO-ADS-BOLA-2110 — "lugar" num texto-instrução com foto de produto volta a produto
import { adsV2InstructionNarrationFits, adsV2ReadInstruction, simpleInstructionTitle } from '@/lib/ads/v2Simple' // KINEO-ADS-BOLA-2110 — o texto-instrução (produto + narração entre aspas)
import { adsV2LinkFromSentence, adsV2NeutralProductText, adsV2StripUrls } from '@/lib/ads/v2Simple' // KINEO-ADS-FONTE-LINK-2810 — o link colado na FRASE vira o link (nunca o nome)
import { ADS_V2_PRODUCT_PHOTO_MIN_SIDE, ADS_V2_SMALL_PHOTO_CONFIRM_REQUIRED, adsV2MeasureImage, adsV2ProductPhotoSmall, adsV2ProductPhotoSmallText } from '@/lib/ads/v2BolaFix' // KINEO-ADS-BOLA-2110 — a foto do produto pequena
import { ADS_V2_LIFESTYLE_CONFIRM_REQUIRED, adsV2LifestylePhoto, adsV2LifestylePhotoText } from '@/lib/ads/v2LifestylePhoto' // KINEO-ADS-QUALIDADE-2110 — a foto de estilo de vida (mão/pessoa domina, produto pequeno): aviso suave com 1 visão barata
import { adsV2PackshotShots } from '@/lib/ads/v2ShotLists' // KINEO-ADS-MELHORIAS-1410 — o packshot: um plano de IA vira a foto REAL do produto (mesmos créditos)
import { adsV2FormatBlock, adsV2FormatShots, normalizeAdsV2Format } from '@/lib/ads/v2ShotLists' // KINEO-ADS-MELHORIAS-1410 — formatos 4:5 e 1:1 (só onde o pipeline inteiro aceita)
import { adsV2BuildScripts } from '@/lib/ads/v2Scripts' // KINEO-ADS-ROTEIROS-2026-10-13 — 2 a 3 roteiros para escolher (o 1º = o texto de sempre); troca em /api/ads/v2/plan/choose
import { ADS_SAMPLE_PRESENTER_MARK, adsSampleFormatFor } from '@/lib/ads/sampleEntry' // KINEO-HOME-3-CARDS-1910 — a amostra com a pessoa, só pela entrada UGC
import { ADS_SAMPLE_PRESENTER_FALLBACK } from '@/lib/ads/sampleEntry' // KINEO-UGC-AJUSTES-2010 — a entrada UGC que caiu no Close real pelo sub-teto (o código que a tela lê)
import { adsSamplePresenterCapReached } from '@/lib/ads/serverAccess' // KINEO-UGC-AJUSTES-2010 — o sub-teto do dia da amostra com a pessoa (contado no banco, como o teto geral)
import { ADS_V2_CLOSE_REAL_LIVE, ADS_V2_CLOSE_REAL_SECONDS, adsV2CloseRealShots, adsV2CloseRealUsd, planAdsV2CloseReal } from '@/lib/ads/v2CloseReal' // KINEO-CLOSE-REAL-1910 — o formato "Close do produto real" (zero IA de vídeo; a amostra grátis sai SEMPRE nele)
import { adsV2KitBfFromBody, adsV2KitBfPhotoOrder, adsV2KitBfStored, adsV2KitBfTextWithOffer } from '@/lib/ads/v2KitBf' // KINEO-KIT-BF-1910 — o Kit Black Friday no Close real: oferta opcional e o ângulo/ordem das fotos de cada variação do lote (lib pura)

/** Quem age: o id do auth (moderação e rastro) e o e-mail VERIFICADO dele (adsV2Visible). */
export interface AdsV2Caller {
  id: string
  email?: string | null
}

/** O plano do anúncio v2 para `user`, com o acesso `access` já resolvido. `readBody` lê o corpo só depois das portas. */
export async function adsV2PlanFor(user: AdsV2Caller, access: AdsAccessLoad, readBody: () => Promise<unknown>, started: number = Date.now()): Promise<NextResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) return v2Fail('unavailable', 503)
    const { admin, reason, ...ws } = access
    const uid: string = ws.ownerId ?? user.id // KINEO-EQUIPE-BUSINESS-2026-10-10 — workspace: membro do Business age na conta do DONO (stub/chamador antigo = pessoal)
    const gate = adsGate(reason)
    const sample = gate === 'no_access' && await adsSampleOpen(admin, uid, reason) // KINEO-ADS-AMOSTRA-2026-10-09
    if (gate !== 'ok' && !sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/plan', metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const body = await readBody()
    const parsed = sanitizePlanBody(body)
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const assets = sanitizeAssetsBody(body)
    if (!assets.ok) return v2Fail(assets.error, 400)
    const input = parsed.value
    const cardId = assets.value.card_footage_id

    const { order, error } = await loadAdsV2Order(admin, input.order_id, uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('plan_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    const candidate2410 = (await import('./presenterCandidates2410')).presenterCandidateById2410(input.presenter_id) // KINEO-APRESENTADORES-2410
    if (candidate2410) { try { (await import('./presenterVoice2410')).presenterCandidateVoice2410(candidate2410, order.language ?? 'en') } catch { return v2Fail('presenter_language_unsupported', 400) } } // KINEO-APRESENTADORES-2410 — before script/image/TTS spending
    if (order.status !== 'draft' && order.status !== 'planned') return v2Fail('not_editable', 409)
    // KINEO-ADS-AMOSTRA-2026-10-09 — pela amostra, só o pedido no nível e na duração da amostra é planejado.
    if (gate !== 'ok' && sample && !adsSampleLevelOk(order.tier, order.seconds)) return v2Fail('sample_level_only', 403)
    // KINEO-CLOSE-REAL-1910 — o Close real: pedido pela tela (close_real) ou SEMPRE pela amostra grátis (quem decide é o servidor, não o corpo). Nele não
    // KINEO-CLOSE-REAL-1910 — há apresentador, estilo de IA nem outro formato que o 9:16: as chaves saem do corpo aqui, antes de qualquer decisão abaixo.
    // KINEO-HOME-3-CARDS-1910 — o formato da amostra: o Apresentador SÓ pela entrada UGC (o card "AI UGC Ads"; sample_entry validado no contrato), o resto o
    // KINEO-HOME-3-CARDS-1910 — Close real. Com a pessoa, o servidor liga o ator e tira estilo/formato (o apresentador v2 é Comercial 9:16 sem estilo).
    // KINEO-UGC-AJUSTES-2010 — o SUB-TETO da amostra com a pessoa (10/dia, dentro do teto geral de 30): passou dele, a entrada UGC NÃO é recusada — cai no Close real (a linha
    // KINEO-UGC-AJUSTES-2010 — de baixo vê a entrada 'product') e a resposta leva sample_fallback, que a tela mostra como aviso honesto. Leitura que falha = sub-teto atingido.
    const samplePresenterCapped = gate !== 'ok' && sample && adsSampleFormatFor(input.sample_entry === 'ugc' ? 'ugc' : 'product', ADS_V2_PRESENTER_PUBLIC) === 'presenter' && await adsSamplePresenterCapReached(admin) // KINEO-UGC-AJUSTES-2010
    if (samplePresenterCapped) delete input.sample_entry // KINEO-UGC-AJUSTES-2010 — sem a entrada UGC = a amostra de sempre (Close do produto real)
    const sampleFormat = gate !== 'ok' && sample ? adsSampleFormatFor(input.sample_entry === 'ugc' ? 'ugc' : 'product', ADS_V2_PRESENTER_PUBLIC) : null // KINEO-HOME-3-CARDS-1910
    if (sampleFormat === 'presenter') { input.presenter = true; delete input.style; delete input.format; delete input.close_real } // KINEO-HOME-3-CARDS-1910
    if (sampleFormat === 'presenter' && !input.photos.some((p) => p.kind === 'product')) return v2Fail('presenter_needs_voice_and_product', 400) // KINEO-HOME-3-CARDS-1910 — o ator segura O produto: sem foto de produto, não há amostra com a pessoa
    const closeRealAsked = ADS_V2_CLOSE_REAL_LIVE && (input.close_real === true || (gate !== 'ok' && sample && sampleFormat !== 'presenter')) // KINEO-CLOSE-REAL-1910 · KINEO-HOME-3-CARDS-1910 — a amostra pela entrada UGC não é forçada ao Close real; era: (gate !== 'ok' && sample)
    if (closeRealAsked) { delete input.presenter; delete input.presenter_id; delete input.style; delete input.format } // KINEO-CLOSE-REAL-1910
    if (closeRealAsked && order.seconds !== ADS_V2_CLOSE_REAL_SECONDS) return v2Fail('close_real_15s_only', 400) // KINEO-CLOSE-REAL-1910 — a estrutura é de 15 s
    const kitBfIn = adsV2KitBfFromBody(body, { closeReal: closeRealAsked, paid: gate === 'ok' }) // KINEO-KIT-BF-1910 — offer / kit_angle / kit_variant do corpo cru; fora do Close real pago (amostra incluída) = ignorados
    if (!kitBfIn.ok) return v2Fail(kitBfIn.error, 400) // KINEO-KIT-BF-1910 — ANTES do modelo (nada cobrado)
    const kitBf = kitBfIn.value // KINEO-KIT-BF-1910
    // KINEO-ADS-MODO-SIMPLES-2026-09-29 — corpo simples só para pedido nascido no modo simples; enquanto a pesquisa roda,
    // não há plano (nem cobrança): 409 research_running (pesquisa parada há > 90 s conta como falha e libera).
    const brief0 = adsV2KindWithProductPhoto(order.brief ?? {}, input.photos) // KINEO-ADS-BOLA-2110 — era: order.brief ?? {} (o prompt colado com a foto da bola virou "lugar" e a fala saiu de loja)
    const simple = input.mode === 'simple'
    if (simple && brief0.mode !== 'simple') return v2Fail('mode_mismatch', 400)
    if (researchState(brief0.research, Date.now()) === 'running') return v2Fail('research_running', 409)
    // KINEO-ATOR-ANUNCIO-2026-10-09 — o ator fala a NARRAÇÃO: com a voz desligada no pedido, 400 (a foto de produto o
    // contrato já conferiu). Interruptor desligado = o campo é ignorado (o anúncio sai como antes).
    const presenterAsked = ADS_V2_PRESENTER_PUBLIC && input.presenter === true
    if (presenterAsked && order.narration !== true) return v2Fail('presenter_needs_voice_and_product', 400)
    const format = normalizeAdsV2Format(input.format) // KINEO-ADS-MELHORIAS-1410 — '9:16' quando ausente (o pedido de sempre)
    const formatBlock = adsV2FormatBlock({ format, tier: order.tier, style: ADS_V2_STYLES_PUBLIC ? input.style ?? null : null, presenter: presenterAsked }) // KINEO-ADS-MELHORIAS-1410 — estilo e ator só em 9:16; Premium sem 4:5 (o Seedance não tem)
    if (formatBlock) return v2Fail('format_unsupported', 400, { why: formatBlock }) // KINEO-ADS-MELHORIAS-1410 — ANTES do modelo e de qualquer gravação (nada cobrado)
    // Fatos escolhidos: resolvidos pelos ids contra o que o SERVIDOR gravou. Texto de fato vindo do cliente não existe.
    const known = simple ? storedResearchFacts(brief0.research) : []
    const chosenFacts = (input.facts ?? []).map((id) => known.find((f) => f.id === id))
    if (chosenFacts.some((f) => !f)) return v2Fail('bad_fact', 400)
    const factTexts = chosenFacts.map((f) => f!.text)

    // Cada arquivo conferido no user_footage DO DONO; a URL usada é a do banco. Logo só se veio (modo simples: opcional).
    const videosIn = input.videos ?? []
    const own = await ownedFootage(admin, uid, [...(input.logo_footage_id ? [input.logo_footage_id] : []), ...(cardId ? [cardId] : []), ...input.photos.map((p) => p.footage_id), ...input.photos.flatMap((p) => (p.original_footage_id ? [p.original_footage_id] : [])), ...videosIn.map((v) => v.footage_id)]) // KINEO-ADS-FIEL-3-1510 — + a foto inteira do produto
    if (!own) return v2Fail('plan_failed', 502)
    if (input.logo_footage_id && !own.get(input.logo_footage_id)?.isImage) return v2Fail('logo_invalid', 400)
    if (cardId && !own.get(cardId)?.isPng) return v2Fail('card_invalid', 400)
    const photos = input.photos.map((p) => ({ footage_id: p.footage_id, kind: p.kind, url: own.get(p.footage_id)?.isImage ? own.get(p.footage_id)!.url : '' }))
    if (photos.some((p) => !p.url)) return v2Fail('media_not_owned', 400)
    // KINEO-ADS-FIEL-3-1510 — a foto inteira do produto (o recorte sai dela): só se é imagem do DONO; senão fica de fora (o recorte usa a do plano, como antes).
    input.photos.forEach((p, k) => { const o = p.original_footage_id ? own.get(p.original_footage_id) : null; if (o?.isImage) Object.assign(photos[k], { original_footage_id: p.original_footage_id, original_url: o.url }) }) // KINEO-ADS-FIEL-3-1510
    // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — cada vídeo: do DONO, MP4/MOV (kind 'video' no user_footage).
    const badVideo = videosIn.find((v) => !own.get(v.footage_id)?.isVideo)
    if (badVideo) return v2Fail('video_invalid', 400, { footage_id: badVideo.footage_id })
    const productPhoto = photos.find((p) => p.kind === 'product') as { url: string; original_url?: string } | undefined // KINEO-ADS-BOLA-2110 — a foto do produto: mede a INTEIRA (o recorte 9:16 vem ampliado para 1080×1920 e esconde a miniatura)
    const productSizeP = productPhoto ? adsV2MeasureImage(productPhoto.original_url ?? productPhoto.url).catch(() => null) : Promise.resolve(null) // KINEO-ADS-BOLA-2110 — em paralelo com o modelo (só espera antes dele com a trava ligada)
    if (ADS_V2_SMALL_PHOTO_CONFIRM_REQUIRED && (body as { small_photo_ok?: unknown } | null)?.small_photo_ok !== true) { const sz = await productSizeP; if (sz && adsV2ProductPhotoSmall(sz)) return v2Fail('product_photo_small', 422, { width: sz.width, height: sz.height, min: ADS_V2_PRODUCT_PHOTO_MIN_SIDE, ...adsV2ProductPhotoSmallText(order.language, sz) }) } // KINEO-ADS-BOLA-2110 — bloqueio SUAVE (desligado até a tela nova ter o "usar mesmo assim"): nada cobrado
    const lifestyleOk = (body as { lifestyle_photo_ok?: unknown } | null)?.lifestyle_photo_ok === true // KINEO-ADS-QUALIDADE-2110 — a pessoa já disse "continuar assim"
    const lifestyleP: Promise<boolean | null> = productPhoto && !lifestyleOk ? adsV2LifestylePhoto(productPhoto.original_url ?? productPhoto.url).catch(() => null) : Promise.resolve(null) // KINEO-ADS-QUALIDADE-2110 — a foto INTEIRA, em paralelo com o modelo; erro/6 s = null (nunca bloqueia)
    if (ADS_V2_LIFESTYLE_CONFIRM_REQUIRED && !lifestyleOk) { const ls = await lifestyleP; if (ls === true) return v2Fail('product_photo_lifestyle', 422, { ...adsV2LifestylePhotoText(order.language) }) } // KINEO-ADS-QUALIDADE-2110 — bloqueio SUAVE (desligado): nada cobrado

    // Teto diário ANTES do modelo.
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const capFor = adsV2PlanDailyCapFor({ internal: reason === 'internal', plan: ws.ownerPlan, base: ADS_V2_PLAN_DAILY_CAP }) // KINEO-ADS-FIEL-2-1510 — 'internal' = isAdsInternalEmail (a casa decide primeiro em adsAccessReason): sem teto
    const cap = capFor === null ? { error: null, count: 0 } : await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('name', 'ads_v2_plan_served').gte('created_at', since) // KINEO-ADS-FIEL-2-1510
    if (capFor !== null && !cap.error && (cap.count ?? 0) >= capFor) return v2Fail('daily_limit', 429, { plans_left: 0 }) // KINEO-ADS-FIEL-2-1510 — Business 60; as outras contas, os 20 de sempre
    const plansLeft = capFor === null || cap.error ? null : adsV2PlansLeft(capFor, cap.count ?? 0) // KINEO-ADS-FIEL-2-1510 — o contador "N roteiros restantes hoje" (null = sem teto)

    // A duração que manda é a MEDIDA aqui (mvhd do arquivo no bucket), nunca a do navegador. Não mediu ou curto demais =
    // 422 com o id: a tela transforma ESSE vídeo em fotos (plano B) e a pessoa planeja de novo, grátis.
    // Revisão: a recusa da medição também CONTA no teto diário (cada medição baixa até 50 MB); antes só o plano servido
    // contava e um vídeo ilegível podia ser medido sem fim. Longo demais (> 10 min) = numeric(6,3) do banco estouraria.
    const videos: AdsV2Video[] = []
    const measureRefused = async (code: 'video_unreadable' | 'video_too_short' | 'video_too_long', footageId: string, seconds: number | null) => {
      await writeServerEvent({ name: 'ads_v2_plan_served', userId: uid, path: '/api/ads/v2/plan', metadata: { order_id: order.id, ok: false, stage: 'video_measure', why: code, seconds_measured: seconds, videos: videosIn.length, ms: Date.now() - started } })
      return v2Fail(code, 422, { footage_id: footageId })
    }
    for (const [i, measured] of (await Promise.all(videosIn.map((v) => measureFootageVideo(own.get(v.footage_id)!.url)))).entries()) {
      const v = videosIn[i]
      if (measured === null) return measureRefused('video_unreadable', v.footage_id, null)
      if (measured < ADS_V2_PLAN_VIDEO_MIN_SECONDS) return measureRefused('video_too_short', v.footage_id, measured)
      if (measured > ADS_V2_PLAN_VIDEO_MAX_SECONDS) return measureRefused('video_too_long', v.footage_id, measured)
      videos.push({ id: v.footage_id, url: own.get(v.footage_id)!.url, seconds: measured, start: v.start, focusX: v.focus_x, focusY: v.focus_y, width: v.width, height: v.height })
    }

    // O texto do negócio: a frase, ou o que o link diz (só a página; as fotos vêm recortadas do navegador).
    // Modo simples: a frase + o preço e o contato que a PESSOA escreveu nos campos próprios.
    // KINEO-ADS-CONSERTOS-1410 — QA 14/10: "perfume num hotel com chuva" virava a MARCA (brief, 1ª frase de tela e narração).
    // KINEO-ADS-CONSERTOS-1410 — pedido de produto com cena na frase: o texto do negócio é só o produto (a cena vai pelo brief.scene).
    const sentenceFull = typeof brief0.sentence === 'string' ? brief0.sentence.trim() : '' // KINEO-ADS-CONSERTOS-1410 — a frase INTEIRA (moderação)
    const instruction = simple ? adsV2ReadInstruction(sentenceFull) : null // KINEO-ADS-BOLA-2110 — a pessoa colou um PROMPT ("Crie uma propaganda … para a bola de futebol da foto … Narração: “…”")
    const sentenceCopy = adsV2StripUrls(instruction ? instruction.product ?? (simpleInstructionTitle(sentenceFull) || adsV2SentenceForCopy(brief0, input.sector)) : adsV2SentenceForCopy(brief0, input.sector)) // KINEO-ADS-FONTE-LINK-2810 — sem endereço/"https" (pedido 8e8f7ad9: a frase era só o link da Shopee e virou "Conheça a https") // KINEO-ADS-CONSERTOS-1410 — a frase que vira brief, frases de tela e narração · KINEO-ADS-BOLA-2110 — texto-instrução = só o PRODUTO que ela nomeia
    let text = sentenceCopy // KINEO-ADS-CONSERTOS-1410
    const link = typeof brief0.link === 'string' && brief0.link ? brief0.link : simple ? adsV2LinkFromSentence(sentenceFull) : '' // KINEO-ADS-FONTE-LINK-2810 — sem link no campo próprio, o endereço da frase é lido como o link (a página dá o nome do produto)
    if (simple && text) {
      const price = typeof brief0.price === 'string' ? brief0.price.trim() : ''
      const contact = typeof brief0.contact === 'string' ? brief0.contact.trim() : ''
      text = [text, price ? `Price: ${price}` : '', contact ? `Contact: ${contact}` : ''].filter(Boolean).join('\n')
    }
    if (instruction?.narration) text = `${text}\nNarration written by the customer: ${instruction.narration}` // KINEO-ADS-BOLA-2110 — a narração da pessoa é fonte (honestidade: o que ela DIGITOU vale)
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o que a pessoa DIGITOU (frase + preço + contato), antes da página do link: alegação
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — de saúde só vale se estiver aqui (lib/ads/v2Honesty.ts); a página nunca a autoriza.
    if (kitBf.offer) text = adsV2KitBfTextWithOffer(text, kitBf.offer) // KINEO-KIT-BF-1910 — a oferta digitada entra no texto do negócio (o que a pessoa DIGITOU: a régua de honestidade a conhece)
    const typed = text // KINEO-ANUNCIO-CONSERTOS-2026-10-12
    let pageLang: string | null = null
    // KINEO-ADS-1FOTO-LINK-2026-10-10 — modo simples com o link do produto colado (/api/ads/v2/link-import): a frase da
    // pessoa continua mandando; o que a página DIZ (nome, descrição, preço, site) entra embaixo como fonte do roteiro. Página
    // que não abre agora = segue só com a frase (nunca derruba o plano). Sem link, o texto é o de antes.
    if (simple && text && link) { // KINEO-ADS-FONTE-LINK-2810
      const page = await adsV2LinkText(link).catch(() => null) // KINEO-ADS-FONTE-LINK-2810
      if (page) {
        text = `${text}\nFrom the product page: ${adsV2PageTextForBrief(page.text, { factsOffered: known.length > 0 })}` // KINEO-ADS-FIEL-2-1510 — com fatos oferecidos, a descrição da página não entra (só o que foi marcado)
        pageLang = page.lang
      }
    }
    if (!text && link) { // KINEO-ADS-FONTE-LINK-2810
      const read = await adsV2LinkText(link).catch(() => null) // KINEO-ADS-FONTE-LINK-2810
      const neutral = !read && simple && link !== brief0.link && photos.length > 0 ? adsV2NeutralProductText(order.language) : '' // KINEO-ADS-FONTE-LINK-2810 — só o link na frase, página fechada (Shopee só-JS), com foto: texto neutro ("este produto"), nunca o endereço
      if (neutral) { text = neutral } else { // KINEO-ADS-FONTE-LINK-2810
      if (!read) return v2Fail('link_unreachable', 422)
      text = adsV2PageTextForBrief(read.text, { factsOffered: known.length > 0 }) // KINEO-ADS-FIEL-2-1510 — sem frase institucional (franquia, vagas, investidores)
      pageLang = read.lang
      } // KINEO-ADS-FONTE-LINK-2810
    }
    if (!text) return v2Fail('sentence_or_link_required', 400)
    if (kitBf.offer) text = adsV2KitBfTextWithOffer(text, kitBf.offer) // KINEO-KIT-BF-1910 — só o link (sem frase): a oferta entra também (já presente = o mesmo texto)

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: [text, ...(sentenceFull !== sentenceCopy ? [sentenceFull] : []), ...factTexts].join('\n'), meta: { order_id: order.id, v2: true } }) // KINEO-ADS-CONSERTOS-1410 — a frase inteira (com a cena) continua moderada
    if (!safety.ok) {
      return v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, moderationRefusalStatus(safety.reason), { message: moderationRefusalMessage(safety.reason) })
    }

    const language = narrationLanguage(order.language) ?? narrationLanguage(pageLang) ?? resolveNarrationLanguage(undefined, sentenceFull !== sentenceCopy ? `${text}\n${sentenceFull}` : text).language // KINEO-ADS-CONSERTOS-1410 — "perfume" sozinho não diz a língua; a frase inteira diz
    // KINEO-APRESENTADOR-V2-AJUSTE-1710 — o apresentador v2 decidido ANTES do texto (as mesmas travas do plano abaixo + retrato do escolhido): a narração dele nasce
    // KINEO-APRESENTADOR-V2-AJUSTE-1710 — com 17 a 21 palavras (~10 s de voz, anúncio de ~15 s). No T1 o teto de 30 do clássico deu 14,36 s de voz e 18,67 s de anúncio.
    const presenterV2Early = presenterAsked ? await import('@/lib/ads/v2PresenterV2').then((m) => (typeof m.adsV2PresenterV2Words === 'function' ? m : null)).catch(() => null) : null // KINEO-APRESENTADOR-V2-AJUSTE-1710
    const v2Words = presenterV2Early && presenterV2Early.adsV2PresenterV2Eligible({ on: presenterV2Early.adsV2PresenterV2On(reason === 'internal'), tier: order.tier, format, style: ADS_V2_STYLES_PUBLIC ? input.style ?? null : null }) && (input.presenter_id ? !!presenterV2Early.adsV2PresenterV2PortraitUrl(adsV2PresenterById(input.presenter_id)) : true) ? presenterV2Early.adsV2PresenterV2Words(adsV2NarrationMaxWords(order.seconds), { language, gender: (input.presenter_id ? adsV2PresenterById(input.presenter_id)?.gender : null) ?? 'woman' }) : null // KINEO-APRESENTADOR-V2-AJUSTE-1710 — null = a régua de sempre · KINEO-ADS-BOLA-2110 — a régua pelo ritmo MEDIDO da voz do anúncio (PT ConfidentWoman 2,14 pal/s → 22–24)
    const maxWords = v2Words ? v2Words.max : adsV2NarrationMaxWords(order.seconds) // KINEO-APRESENTADOR-V2-AJUSTE-1710 — o teto do v2 (21) só neste caminho
    const acceptMaxWords = v2Words && presenterV2Early && typeof presenterV2Early.adsV2PresenterV2AcceptMax === 'function' ? presenterV2Early.adsV2PresenterV2AcceptMax(v2Words.max) : maxWords // KINEO-UGC-AJUSTES-2010 — o apresentador v2: pede 19–21, aceita até 23 (o /plan da Yasmin, 20/10, caiu em no_copy com 22)
    const verbatimRange = { min: Math.max(5, Math.ceil(maxWords * 0.4)), max: acceptMaxWords + 4 } // KINEO-ADS-BOLA-2110 — a narração da pessoa vai verbatim nesta faixa (a voz medida ainda é ajustada na montagem)
    const narrationVerbatim = order.narration === true && instruction && adsV2InstructionNarrationFits(instruction, verbatimRange) ? instruction.narration : null // KINEO-ADS-BOLA-2110
    const instructionTag = instruction ? { instruction: { product: Boolean(instruction.product), narration: !instruction.narration ? 'none' : narrationVerbatim ? 'verbatim' : instruction.narrationComplete ? 'out_of_range' : 'truncated' } } : null // KINEO-ADS-BOLA-2110 — a medição (ads_v2_plan_served)
    const overlaysOn = brief0.overlays !== false
    // KINEO-ADS-MAO-AJUSTE-3-1610 — o Comercial "produto na mão" decidido ANTES do texto (pelo setor da tela; o plano final confere de novo): a narração pede o
    // KINEO-ADS-MAO-AJUSTE-3-1610 — piso maior e uma frase a mais (cobrir ~13 s dos 15) e, em paralelo com o texto, a visão barata diz se a foto do produto tem o frasco
    // KINEO-ADS-MAO-AJUSTE-3-1610 — E a caixa (um objeto por plano). Sem a lib, sem a visão ou sem resposta = como antes.
    const inHandEarly = await import('@/lib/ads/v2ProductInHand').then((m) => (typeof m.adsV2InHandSpeechMin === 'function' ? m : null)).catch(() => null) // KINEO-ADS-MAO-AJUSTE-3-1610
    const inHandProduct = inHandEarly ? inHandEarly.adsV2InHandEligible({ on: inHandEarly.adsV2InHandOn(reason === 'internal'), tier: order.tier, seconds: order.seconds, photos, productOrder: adsV2IsProductOrder(brief0, input.sector), sector: input.sector, presenter: presenterAsked, style: ADS_V2_STYLES_PUBLIC ? input.style ?? null : null, videos: videos.length }) : null // KINEO-ADS-MAO-AJUSTE-3-1610
    const inHandPairP: Promise<boolean | null> = inHandProduct ? import('@/lib/ads/v2LockVision').then((v) => (typeof v.adsV2InHandPhotoPair === 'function' ? v.adsV2InHandPhotoPair(typeof inHandProduct.original_url === 'string' && inHandProduct.original_url ? inHandProduct.original_url : inHandProduct.url) : null)).catch(() => null) : Promise.resolve(null) // KINEO-ADS-MAO-AJUSTE-3-1610 — a foto inteira (o recorte pode cortar a caixa)
    const extracted = await extractAdsV2Brief({
      benefitRule: true, // KINEO-ADS-QUALIDADE-2110 — Product Ads: todo benefício digitado na fala, sem frase genérica
      text,
      language,
      languageName: LANGUAGE_NAMES[language],
      maxWords,
      narration: order.narration,
      // KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — a frase exata (sem preço/contato): dela saem os nomes que a narração cita.
      ...(simple ? { overlays: overlaysOn, facts: factTexts, sentence: sentenceCopy } : {}), // KINEO-ADS-CONSERTOS-1410 — sem a cena: os nomes citados e o 'nome comum' saem só do produto
      // KINEO-ATOR-AJUSTES-2026-10-09 — canário 7112d56c ("LUME eau de parfum…", ator ligado) saiu com voz de LOJA ("At LUME,
      // we offer a captivating selection…"). Modo simples: há foto marcada como produto? (a extração decide se é anúncio de
      // produto pela frase — simpleProductAd). Ator pedido = a narração é a fala dele, em 1ª pessoa. Ausentes = como sempre.
      ...(simple ? { productPhoto: photos.some((ph) => ph.kind === 'product') } : {}),
      ...(presenterAsked ? { presenter: true } : {}),
      typed, // KINEO-ANUNCIO-CONSERTOS-2026-10-12
      deadlineMs: started + ADS_V2_PLAN_MODEL_DEADLINE_MS, // KINEO-ADS-CENA-2026-10-13 — as chamadas ao modelo terminam antes do maxDuration 60
      ...(inHandProduct && inHandEarly ? { speechFloor: inHandEarly.adsV2InHandSpeechMin(maxWords), speechSentences: inHandEarly.ADS_V2_IN_HAND_SPEECH_SENTENCES } : {}), // KINEO-ADS-MAO-AJUSTE-3-1610 — a narração do "produto na mão" cobre ~13 s
      ...(v2Words && presenterV2Early ? { speechMinExact: v2Words.min, speechSentences: presenterV2Early.ADS_V2_PRESENTER_V2_SPEECH_SENTENCES } : {}), // KINEO-APRESENTADOR-V2-AJUSTE-1710 — o piso do v2 (17; a régua de sempre daria 19 em 21) e 2–3 frases curtas
      ...(v2Words ? { presenterTalk: true } : {}), // KINEO-APRESENTADOR-OLHOS-1910 — o apresentador v2 fala como apresentador (benefício, para quem é, por que comprar), sem verbos sensoriais
      ...(acceptMaxWords > maxWords ? { acceptMaxWords } : {}), // KINEO-UGC-AJUSTES-2010 — só o apresentador v2; ausente = a régua de sempre, byte a byte
      scripts: (body as { scripts?: unknown } | null)?.scripts !== false, scene: adsV2SceneSetting(brief0, order.tier), // KINEO-ADS-ROTEIROS-2026-10-13 — +2 versões em outros tons, em paralelo e no MESMO prazo (a cena dá o clima da "story"); corpo com scripts:false (ex.: o lote) = só o texto de sempre
      ...(closeRealAsked ? { closeReal: true } : {}), // KINEO-CLOSE-REAL-AJUSTE-1910 — o Close real: a marca no máximo 2 vezes na fala (o fecho automático não cola "Agora, <marca>.") e o travessão do título vira " · "
      ...(kitBf.offer || kitBf.angle ? { kitBf: { offer: kitBf.offer, angle: kitBf.angle } } : {}), // KINEO-KIT-BF-1910 — a oferta 1× na fala e o ângulo da variação (sem kit = o pedido de sempre)
      ...(narrationVerbatim ? { narrationVerbatim } : {}), // KINEO-ADS-BOLA-2110 — "Narração: “…”" inteira e na faixa = o roteiro principal fala o que a pessoa escreveu
    })
    const modeTag = { mode: simple ? 'simple' : 'full', facts_selected: factTexts.length, overlays: overlaysOn }
    Object.assign(modeTag, { photos: photos.length, product_photos: photos.filter((p) => p.kind === 'product').length, ...(instructionTag ?? {}), ...((brief0 as { kind_fixed?: unknown }).kind_fixed ? { kind_fixed: true } : {}) }) // KINEO-ADS-BOLA-2110 — as fotos REAIS (o ads_v2_order_created grava photos ANTES do upload: 0 em 100% do modo simples) + o texto-instrução + o tipo consertado
    if (extracted.ok && extracted.honestyFixes) Object.assign(modeTag, { honesty_fixes: extracted.honestyFixes }) // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — o que a régua consertou em código
    if (extracted.ok && extracted.ad?.talk === true) { const tl = presenterTalkMarks(extracted.copy.narration); if (tl.length) Object.assign(modeTag, { presenter_talk_left: tl.slice(0, 6) }) } // KINEO-APRESENTADOR-OLHOS-1910 — a correção não tirou tudo: conta no ads_v2_plan_served
    if (extracted.ok && extracted.variantsInfo) Object.assign(modeTag, { scripts: 1 + extracted.variantsInfo.kept, scripts_dropped: extracted.variantsInfo.dropped, ...(extracted.variantsInfo.why ? { scripts_why: extracted.variantsInfo.why } : {}) }) // KINEO-ADS-ROTEIROS-2026-10-13 — quantos roteiros saíram e por que faltou
    const served = async (ok: boolean, extra: Record<string, unknown>) =>
      writeServerEvent({ name: 'ads_v2_plan_served', userId: uid, path: '/api/ads/v2/plan', metadata: { order_id: order.id, ok, tier: order.tier, seconds: order.seconds, sector: input.sector, language, ms: Date.now() - started, ...modeTag, ...extra } })
    if (extracted.timeoutRetries) Object.assign(modeTag, { timeout_retries: extracted.timeoutRetries }) // KINEO-ADS-CENA-2026-10-13 — o plano saiu na 2ª tentativa (timeout na 1ª)
    if (!extracted.ok && extracted.stage === 'timeout') { await served(false, { stage: 'timeout', why: extracted.why, timeout_retries: extracted.timeoutRetries ?? 0 }); return v2Fail('unavailable', 503, { why: ADS_V2_BRIEF_TIMEOUT_WHY }) } // KINEO-ADS-CENA-2026-10-13 — modelo lento: 503 "nada foi cobrado, tente em um minuto", com evento (era plan_failed 502 mudo)
    if (!extracted.ok) {
      await served(false, { stage: extracted.stage, why: extracted.why.slice(0, 4), attempts: extracted.attempts })
      return extracted.stage === 'brief'
        ? v2Fail('brief_needs_business', 422, { hint: 'Write the business name in your sentence.' })
        : v2Fail('no_copy', 502, { why: extracted.why.slice(0, 4) })
    }

    const productSize = await productSizeP // KINEO-ADS-BOLA-2110 — o tamanho real da foto do produto (null = não mediu)
    if (productSize) Object.assign(modeTag, { product_photo_side: Math.min(productSize.width, productSize.height), product_photo_small: adsV2ProductPhotoSmall(productSize) }) // KINEO-ADS-BOLA-2110
    const productLifestyle = await lifestyleP // KINEO-ADS-QUALIDADE-2110 — true/false; null = não conferiu (sem foto de produto, erro, prazo, ou já confirmada)
    Object.assign(modeTag, { product_photo_lifestyle: productLifestyle, ...(lifestyleOk ? { lifestyle_photo_ok: true } : {}) }) // KINEO-ADS-QUALIDADE-2110 — a medição (ads_v2_plan_served)
    // Modo simples: o setor veio do texto (palavras-chave na tela). Só quando deu 'other' o palpite do modelo entra;
    // o palpite nunca troca um setor que as palavras já decidiram.
    const sector = simple && input.sector === 'other' && extracted.copy.sectorHint ? extracted.copy.sectorHint : input.sector

    // Lista de planos (determinística) e a régua anti-invenção também sobre cada prompt de movimento/cena.
    // KINEO-ESTILOS-PRODUTO-2026-10-09 — estilo pedido (já validado pelo contrato): só o plano-herói do produto ganha o
    // efeito; sem foto de produto, planShots ignora e o plano sai como antes. O preço em créditos não muda.
    const styleAsked = ADS_V2_STYLES_PUBLIC ? input.style ?? null : null
    const plan = planShots({ sector, tier: order.tier, photos: photos.map((p) => ({ id: p.footage_id, url: p.url, kind: p.kind })), seconds: order.seconds, ...(videos.length ? { videos } : {}), ...(styleAsked ? { style: styleAsked } : {}) })
    const sceneSetting = adsV2SceneSetting(brief0, order.tier) // KINEO-ADS-CENA-2026-10-13 — brief.scene limpa de novo; null no Normal ou sem cena
    plan.shots = adsV2SceneShots(plan.shots, { setting: sceneSetting, sector, product: adsV2IsProductOrder(brief0, sector), photos }) // KINEO-ADS-CENA-2026-10-13 — só o scenePrompt das cenas criadas muda ("Setting: …"); sem cena = o mesmo array
    plan.shots = adsV2PackshotShots(plan.shots, { photos: photos.map((p) => ({ id: p.footage_id, url: p.url, kind: p.kind })), productOrder: adsV2IsProductOrder(brief0, sector) }) // KINEO-ADS-MELHORIAS-1410 — troca UM plano de IA (o fecho; senão o 2º) pela foto real do produto: nº de planos, duração e créditos iguais
    const inHandPair = await inHandPairP // KINEO-ADS-MAO-AJUSTE-3-1610 — frasco + caixa na foto do produto? (null = não sei: nada muda)
    const inHandLib = await import('@/lib/ads/v2ProductInHand').then((m) => (typeof m.adsV2InHandPlan === 'function' ? m : null)).catch(() => null) // KINEO-ADS-PRODUTO-NA-MAO-1610 — pessoa segurando o produto REAL no Comercial (só contas internas); import dinâmico: sem a lib = o plano de antes
    const inHand = ((ih) => (ih && ih.shotsSeconds === plan.shotsSeconds ? ih : null))(inHandLib ? inHandLib.adsV2InHandPlan({ on: inHandLib.adsV2InHandOn(reason === 'internal'), tier: order.tier, seconds: order.seconds, photos, productOrder: adsV2IsProductOrder(brief0, sector), sector, presenter: presenterAsked, style: plan.style ?? null, videos: videos.length, settingLine: inHandLib.adsV2InHandSettingLine(sceneSetting), format, productText: `${sentenceCopy} ${extracted.brief.business ?? ''}`, pair: inHandPair }) : null) // KINEO-ADS-PRODUTO-NA-MAO-1610 — Comercial 15 s com foto de produto, conta interna: gancho com gente, 2 usos, close na cena, packshot real (a duração dos planos é a mesma) · KINEO-ADS-MAO-AJUSTE-1610 — + productText (a frase SEM a cena + o negócio): a categoria escolhe a ação de cada plano · KINEO-ADS-MAO-AJUSTE-3-1610 — + pair (frasco + caixa: um objeto por plano)
    if (inHand) plan.shots = inHand.shots // KINEO-ADS-PRODUTO-NA-MAO-1610 — a régua anti-invenção abaixo confere os prompts novos também
    plan.shots = adsV2FormatShots(plan.shots, format) // KINEO-ADS-MELHORIAS-1410 — a cena criada pedida no formato ("portrait"/"square", sem números); 9:16 = o mesmo array
    const closeReal = closeRealAsked ? planAdsV2CloseReal(photos) : null // KINEO-CLOSE-REAL-1910 — a foto do produto (o recorte do gancho) e as fotos dos planos
    if (closeRealAsked && !closeReal) return v2Fail('close_real_needs_photo', 400) // KINEO-CLOSE-REAL-1910
    if (closeReal) plan.shots = adsV2CloseRealShots(plan.shots, photos) // KINEO-CLOSE-REAL-1910 — toda vaga vira a FOTO REAL parada ('skipped_text': nunca vai à fal)
    if (closeReal && kitBf.variant > 0) closeReal.photos = adsV2KitBfPhotoOrder(closeReal.photos, kitBf.variant) // KINEO-KIT-BF-1910 — a variação k do lote: a foto do produto (o gancho) fica, as outras mudam de ordem
    const promptIssues = checkV2Prompts(plan.shots.flatMap((s) => [s.prompt, s.scenePrompt].filter((x): x is string => !!x)), extracted.brief)
    if (promptIssues.length) {
      await served(false, { stage: 'prompts', why: promptIssues.slice(0, 4) })
      return v2Fail('plan_prompts_invalid', 502, { why: promptIssues.slice(0, 4) })
    }
    // Frases desligadas no modo simples = nenhuma frase na tela (a montagem aceita [] — adV2Montage/v2Advance).
    const overlays = !overlaysOn
      ? []
      : plan.overlays
          .map((slot, i) => ({ role: slot.role, start: slot.start, end: slot.end, text: extracted.copy.overlays[i] ?? '' }))
          .filter((o) => o.text)
    // KINEO-ATOR-ANUNCIO-2026-10-09 — o ator: a 1ª foto marcada como produto, a pessoa pela semente do pedido. Sem texto de
    // narração (o modelo não escreveu) não há o que falar: o plano sai sem ator e a tela diz por quê (presenter_asked).
    const presenter = presenterAsked && extracted.copy.narration ? planAdsV2Presenter({ sector, photos, seedKey: order.id, presenterId: input.presenter_id ?? null }) : null
    plan.shots = adsV2PresenterHoldsShots(plan.shots, { on: ADS_V2_PRESENTER_HOLDS, actor: presenter, entry: adsV2PresenterById(presenter?.presenterId), sector }) // KINEO-ADS-REFACAO-ATOR-1410 — desligado por padrão; ligado: o apresentador ESCOLHIDO segura o produto em UMA vaga trocada (créditos iguais)
    const presenterV2Lib = presenter ? await import('@/lib/ads/v2PresenterV2').then((m) => (typeof m.planAdsV2PresenterV2 === 'function' ? m : null)).catch(() => null) : null // KINEO-APRESENTADOR-V2-1710 — o apresentador v2 (só conta interna, Comercial 9:16); import dinâmico: sem a lib = o ator de antes
    if (presenter && presenterV2Lib && v2Words && presenterV2Lib.adsV2PresenterV2Eligible({ on: presenterV2Lib.adsV2PresenterV2On(reason === 'internal'), tier: order.tier, format, style: plan.style ?? null })) { // KINEO-APRESENTADOR-V2-1710 · KINEO-APRESENTADOR-V2-AJUSTE-1710 — + v2Words: o v2 só com a narração escrita na régua dele
      const gate = presenterV2Lib.adsV2PresenterV2GatePick({ presenterId: presenter.presenterId ?? null, person: presenter.person, internal: reason === 'internal', library: ADS_V2_PRESENTER_LIBRARY }) // KINEO-APRESENTADOR-OLHOS-1910 — cliente só recebe os aprovados da validação de 19/10 (a tela já só mostra eles); interna = qualquer um
      if (gate.swapped) { const from = presenter.presenterId ?? ADS_V2_PRESENTER_LIBRARY[presenter.person]?.id ?? null; if (gate.presenterId) { const np = planAdsV2Presenter({ sector, photos, seedKey: order.id, presenterId: gate.presenterId }); if (np) Object.assign(presenter, np) } else Object.assign(presenter, { person: gate.person, actorPrompt: adsV2ActorPrompt(sector, gate.person) }); Object.assign(modeTag, { presenter_gate: { from, to: gate.presenterId ?? ADS_V2_PRESENTER_LIBRARY[gate.person]?.id ?? null } }) } // KINEO-APRESENTADOR-OLHOS-1910
      const v2Entry = adsV2PresenterById(presenter.presenterId) ?? (presenter.presenterId ? null : ADS_V2_PRESENTER_LIBRARY[presenter.person] ?? null) // KINEO-APRESENTADOR-V2-1710 — o sorteio usa as 6 primeiras pessoas da biblioteca (mesma ordem e texto)
      const v2 = presenterV2Lib.planAdsV2PresenterV2({ entry: v2Entry, sector, setting: sceneSetting, performancePrompt: ADS_V2_PRESENTER_PERFORMANCE_PROMPT, product: `${sentenceCopy} ${extracted.brief.business ?? ''}` }) // KINEO-ADS-QUALIDADE-2110 — + o produto (a escala real na pose) · KINEO-APRESENTADOR-V2-1710 — 2 referências, boca neutra, só o produto, o lugar do cliente
      if (v2 && checkV2Prompts([v2.prompt], extracted.brief).length === 0) { presenter.v2 = v2; plan.shots = presenterV2Lib.adsV2PresenterV2Shots(plan.shots, photos) } // KINEO-APRESENTADOR-V2-1710 — o lugar do cliente passa pela régua anti-invenção; os planos de IA viram as fotos dele paradas (a montagem nova não os usa; créditos iguais)
    } // KINEO-APRESENTADOR-V2-1710
    const scripts = adsV2BuildScripts([{ tone: 'benefit', narration: extracted.copy.narration, overlays: extracted.copy.overlays }, ...(extracted.variants ?? []).map((v) => ({ tone: v.tone, narration: v.copy.narration, overlays: v.copy.overlays }))], plan.overlays, overlaysOn) // KINEO-ADS-ROTEIROS-2026-10-13 — o 1º é o texto de sempre (= narration/overlays abaixo)
    const stored: AdsV2StoredPlan = { ...plan, overlays, narration: extracted.copy.narration, ...(presenter ? { presenter } : {}) }
    Object.assign(stored, { scripts, script_id: scripts[0]?.id ?? 'a' }) // KINEO-ADS-ROTEIROS-2026-10-13 — os roteiros ficam NO plano do pedido; o /choose só copia daqui (preço intocado)
    if (format !== '9:16') Object.assign(stored, { format }) // KINEO-ADS-MELHORIAS-1410 — o formato mora no plano gravado (montagem, motores, refação e variações o leem dali); 9:16 = sem a chave
    if (inHand) Object.assign(stored, { productInHand: true }) // KINEO-ADS-PRODUTO-NA-MAO-1610 — a marca do plano novo (o avanço lê cada plano; o dry-run mostra os prompts)
    if (closeReal) { Object.assign(stored, { closeReal }); delete (stored as { productInHand?: unknown }).productInHand } // KINEO-CLOSE-REAL-1910 — a marca do formato (a montagem do avanço lê daqui); o produto na mão não vale aqui
    if (closeReal) Object.assign(modeTag, { close_real: true, sample: gate !== 'ok' }) // KINEO-CLOSE-REAL-1910 — a medição (ads_v2_plan_served)
    const kitBfStored = closeReal ? adsV2KitBfStored(kitBf) : null // KINEO-KIT-BF-1910
    if (kitBfStored) { Object.assign(stored, { kitBf: kitBfStored }); Object.assign(modeTag, { kit_bf: { offer: !!kitBfStored.offer, angle: kitBfStored.angle, variant: kitBfStored.variant } }) } // KINEO-KIT-BF-1910 — a montagem lê a oferta daqui; a medição (ads_v2_plan_served) diz se veio oferta e qual ângulo
    if (sampleFormat === 'presenter' && presenter) { Object.assign(stored, { sample_format: ADS_SAMPLE_PRESENTER_MARK }); Object.assign(modeTag, { sample: true, sample_format: 'presenter' }) } // KINEO-HOME-3-CARDS-1910 — a marca que o /start confere (só o servidor a grava) e a medição
    if (samplePresenterCapped) Object.assign(modeTag, { sample_fallback: ADS_SAMPLE_PRESENTER_FALLBACK }) // KINEO-UGC-AJUSTES-2010 — a medição (ads_v2_plan_served): a entrada UGC saiu no Close real pelo sub-teto
    const credits = adsV2Credits(order.tier, order.seconds)
    const usd = estimateAdUsd({ tier: order.tier, shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds: plan.totalSeconds, presenter: !!presenter })
    if (inHand) Object.assign(modeTag, { in_hand: true }) // KINEO-ADS-PRODUTO-NA-MAO-1610
    if (inHand) Object.assign(modeTag, { in_hand_pair: inHandPair }) // KINEO-ADS-MAO-AJUSTE-3-1610 — a medição: frasco + caixa na foto (true), um objeto (false), não sei (null)
    if (closeReal) { delete (modeTag as { in_hand?: unknown }).in_hand; delete (modeTag as { in_hand_pair?: unknown }).in_hand_pair } // KINEO-CLOSE-REAL-AJUSTE-1910 — a medição: o Close real apaga o produto na mão do plano (canário de1c0d72 gravava in_hand:true)
    if (presenter?.v2) Object.assign(modeTag, { presenter_v2: true }) // KINEO-APRESENTADOR-V2-1710

    const upd = await admin
      .from('ads_v2_orders')
      .update({
        status: 'planned',
        sector,
        language,
        brief: {
          ...brief0,
          extracted: extracted.brief,
          copy: extracted.copy,
          dropped: extracted.dropped,
          business: extracted.brief.business,
          ...(simple && brief0.research && typeof brief0.research === 'object' ? { research: { ...(brief0.research as Record<string, unknown>), selected: input.facts ?? [] } } : {}),
        },
        plan: stored,
        logo_footage_id: input.logo_footage_id ?? null,
        photos,
        ...(cardId ? { card_footage_id: cardId, card_url: own.get(cardId)!.url } : {}),
      })
      .eq('id', order.id)
      .eq('user_id', uid)
      .in('status', ['draft', 'planned'])
      .select('id, card_url')
      .maybeSingle()
    if (upd.error || !upd.data) return v2Fail('not_editable', 409)
    await served(true, { sector, shots: plan.shots.length, text_shots: plan.shots.filter((s) => s.kind === 'text').length, video_shots: plan.shots.filter((s) => s.kind === 'user_video').length, scenes: plan.shots.filter((s) => s.source === 'generated_scene').length, credits, usd: usd.totalUsd, attempts: extracted.attempts, sector_hint: extracted.copy.sectorHint, style_asked: styleAsked, style: plan.style ?? null, presenter_asked: presenterAsked, presenter: !!presenter, product_ad: extracted.ad?.product === true, ...(extracted.voice ? { names_required: extracted.voice.names.length, names_missing: extracted.voice.namesMissing.length, common_noun: extracted.voice.commonNoun !== null } : {}) })
    if (presenter) await writeServerEvent({ name: 'ads_presenter_selected', userId: uid, path: '/api/ads/v2/plan', metadata: { order_id: order.id, presenter_id: presenter.presenterId ?? 'auto', picked: !!presenter.presenterId, person: presenter.person, mode: simple ? 'simple' : 'full', language } }) // KINEO-ATORES-IA-2026-10-13 — medição: o apresentador escolhido, ou 'auto' (o sorteio de sempre)
    return v2Json({
      order_id: order.id,
      status: 'planned',
      sector,
      sector_hint: extracted.copy.sectorHint,
      language,
      credits,
      usd_estimate: usd,
      narration: extracted.copy.narration,
      overlays,
      edit_limits: { narration_words: maxWords, overlay_chars: ADS_V2_OVERLAY_MAX_CHARS }, // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a tela edita o texto antes de gerar
      ...(acceptMaxWords > maxWords ? { edit_limits: { narration_words: acceptMaxWords, overlay_chars: ADS_V2_OVERLAY_MAX_CHARS } } : {}), // KINEO-UGC-AJUSTES-2010 — o texto aceito com 22–23 palavras não nasce "longo demais" na edição da tela
      ...(samplePresenterCapped ? { sample_fallback: ADS_SAMPLE_PRESENTER_FALLBACK } : {}), // KINEO-UGC-AJUSTES-2010 — a tela mostra o aviso honesto (amostra com a pessoa esgotada hoje → Close real)
      total_seconds: plan.totalSeconds,
      ...(productSize && adsV2ProductPhotoSmall(productSize) ? { product_photo_small: { width: productSize.width, height: productSize.height, min: ADS_V2_PRODUCT_PHOTO_MIN_SIDE, ...adsV2ProductPhotoSmallText(language, productSize) } } : {}), // KINEO-ADS-BOLA-2110 — a tela nova mostra o aviso (título, texto, "usar mesmo assim", "enviar maior")
      ...(productLifestyle === true ? { product_photo_lifestyle: adsV2LifestylePhotoText(language) } : {}), // KINEO-ADS-QUALIDADE-2110 — a tela mostra o aviso (título, texto, "Trocar a foto", "Continuar assim")
      ...(instructionTag ? instructionTag : {}), // KINEO-ADS-BOLA-2110 — a tela sabe que leu um texto-instrução (produto achado? narração verbatim/cortada?)
      card_ready: Boolean((upd.data as { card_url: string | null }).card_url),
      photo_requests: plan.photoRequests,
      // KINEO-ESTILOS-PRODUTO-2026-10-09 — o estilo pedido e o APLICADO (null = sem foto de produto, sai sem efeito).
      style_asked: styleAsked,
      style: plan.style ?? null,
      // KINEO-ATOR-ANUNCIO-2026-10-09 — o ator pedido e o APLICADO (false com pedido = sem texto de narração).
      presenter_asked: presenterAsked,
      presenter: !!presenter,
      ...(presenter?.presenterId ? { presenter_id: presenter.presenterId } : {}), // KINEO-ATORES-IA-2026-10-13 — quem foi escolhido
      scene: sceneSetting, // KINEO-ADS-CENA-2026-10-13 — a cena que entrou no plano (a tela mostra antes de pagar)
      ad_kind: adsV2IsProductOrder(brief0, sector) ? 'product' : 'place', // KINEO-ADS-CENA-2026-10-13 — rótulos do plano (produto: nada de "Your place")
      scripts, // KINEO-ADS-ROTEIROS-2026-10-13 — [{ id, tone, label, narration, overlays, words }], 1 a 3 (contrato em lib/ads/v2Scripts.ts)
      script_id: scripts[0]?.id ?? 'a', // KINEO-ADS-ROTEIROS-2026-10-13 — o roteiro que está no plano
      plans_left: plansLeft, // KINEO-ADS-FIEL-2-1510 — roteiros que ainda cabem hoje (null = conta da casa, sem teto)
      ...(closeReal ? { close_real: { usd: adsV2CloseRealUsd() } } : {}), // KINEO-CLOSE-REAL-1910 — o formato aplicado e o custo dele (≈ US$ 0,26: nenhum motor de vídeo)
      ...(kitBfStored ? { kit_bf: { offer: kitBfStored.offer, angle: kitBfStored.angle, variant: kitBfStored.variant } } : {}), // KINEO-KIT-BF-1910 — a oferta e o ângulo aplicados (a tela mostra)
      shots: plan.shots.map((s) => ({ idx: s.idx, role: s.role, beat: s.beat, kind: s.kind, source: s.source, cut_seconds: s.cutSeconds, photo: s.sourceFootageId, ...(s.effect ? { effect: s.effect } : {}) })),
      ...(inHand && inHandLib ? { in_hand: { shots: inHandLib.adsV2InHandSummary(plan.shots), usd: inHandLib.adsV2InHandUsd(usd, plan.shots) } } : {}), // KINEO-ADS-PRODUTO-NA-MAO-1610 — os planos novos e o custo com o juiz e uma refação de foto (usd_estimate fica o de sempre, igual ao dry-run)
      ...(presenter?.v2 && presenterV2Lib ? { presenter_v2: { options: presenterV2Lib.ADS_V2_PRESENTER_V2_OPTIONS, usd: presenterV2Lib.adsV2PresenterV2UsdPro(usd, order.seconds), words: v2Words } } : {}), // KINEO-APRESENTADOR-V2-1710 — 4 fotos + 4 checagens por cima do usd_estimate de sempre · KINEO-APRESENTADOR-V2-AJUSTE-1710 — + 4 checagens das mãos, o avatar PRO no alvo da voz e a régua de palavras
    })
  } catch (e) {
    console.warn('[ads/v2/plan] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('plan_failed', 502)
  }
}
