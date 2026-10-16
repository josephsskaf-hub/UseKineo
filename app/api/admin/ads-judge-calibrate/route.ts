// KINEO-ADS-MAO-JUIZ-1610 — POST /api/admin/ads-judge-calibrate: roda o juiz do "produto na mão" (a MESMA função do avanço:
// lib/ads/v2LockVision.ts adsV2InHandLabelJudge — mesma pergunta, mesmo modelo, mesmas chaves) em fotos reais e devolve o veredito de cada
// uma com TODAS as chaves. Nada renderiza, nada grava, nada cobra (~US$ 0,01 por foto). Só administrador que também é conta interna.
// O núcleo (validação + execução) mora em lib/ads/v2JudgeCalibrate.ts; o gabarito do T1 a6144352 e o conferidor em scripts/calibra-juiz-mao.mjs.
//   POST { product_image_url, images: [{ url, object: 'bottle' | 'box' | 'single', label? }] } → { model, defect_keys, usd, results }
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '../_shared/db'
import { isInternalEmail } from '@/lib/internalAccounts'
import { adsV2CalibrateParse, adsV2CalibrateRun } from '@/lib/ads/v2JudgeCalibrate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email) || !isInternalEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const parsed = adsV2CalibrateParse(await req.json().catch(() => null))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'vision_key_missing' }, { status: 503 })
    const out = await adsV2CalibrateRun(parsed.input)
    return NextResponse.json({ ...out, charged: false, rendered: false })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message.slice(0, 200) : 'calibrate_failed' }, { status: 500 })
  }
}
