// KINEO-ADS-MAO-JUIZ-1610 — POST /api/admin/ads-judge-calibrate: roda o juiz do "produto na mão" (a MESMA função do avanço:
// lib/ads/v2LockVision.ts adsV2InHandLabelJudge — o juiz em 2 etapas, o mesmo modelo, temperatura 0, o mesmo crop) em fotos reais,
// `repeat` vezes (padrão 3), e devolve o veredito de cada uma com TODAS as chaves. Nada renderiza, nada grava no banco, nada cobra
// (~US$ 0,02 por foto por repetição; o recorte de referência fica em cache no bucket). Só administrador que também é conta interna.
// O núcleo (validação + execução) mora em lib/ads/v2JudgeCalibrate.ts; o gabarito das ~21 fotos e o conferidor em scripts/calibra-juiz-mao.mjs.
//   POST { product_image_url, images: [{ url, object: 'bottle' | 'box' | 'single', label? }], repeat? } → { model, defect_keys, repeat, usd, results }
// KINEO-JUIZ-GRADE-1610 — + `model?` (ADS_V2_CALIBRATE_MODELS, tirada de lib/aiModels.ts; fora da lista = 400) e `variant?` ('A' | 'B'; outra = 400) → a resposta
// KINEO-JUIZ-GRADE-1610 — devolve { model, variant, … }. Só a calibração escolhe: o avanço (lib/ads/v2Advance.ts) segue no modelo do juiz e na variante A.
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '../_shared/db'
import { isInternalEmail } from '@/lib/internalAccounts'
import { adsV2CalibrateParse, adsV2CalibrateRun } from '@/lib/ads/v2JudgeCalibrate'
import { adsV2InHandCropper } from '@/lib/ads/v2ProductInHandCrop'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email) || !isInternalEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const parsed = adsV2CalibrateParse(await req.json().catch(() => null))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'vision_key_missing' }, { status: 503 })
    const cacheKey = 'calib-' + createHash('sha256').update(parsed.input.productUrl).digest('hex').slice(0, 16)
    const crop = adsV2InHandCropper({ userId: user.id, cacheKey, productUrl: parsed.input.productUrl })
    const out = await adsV2CalibrateRun(parsed.input, fetch, crop)
    return NextResponse.json({ ...out, charged: false, rendered: false })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message.slice(0, 200) : 'calibrate_failed' }, { status: 500 })
  }
}
