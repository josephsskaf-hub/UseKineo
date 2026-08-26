// KINEO-HOLLYWOOD-RETRY-2026-08-16 — re-submete UMA cena Hollywood que falhou
// no fornecedor (fal). Parte do conserto "34s em vez de 60s" flagrado pelo
// fundador: cenas dropadas em silêncio agora ganham UMA segunda chance antes
// de o vídeo compor curto. Sem cobrança extra: a falha é do fornecedor, o
// retry é cortesia da casa (o render já foi pago).
// Chamado pelo GenerateClient quando o polling termina com cenas 'failed'.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'
import { looksExhausted, alertFalExhausted } from '@/lib/falAlert'
import { retargetCinematicRequestId, validCinematicGenerationId } from '@/lib/cinematic/claim'

import { HOLLYWOOD_MODELS, KLING3_I2V_MODEL, H3_MODELS, H3_I2V_MODEL, H3_RESOLUTION, OMNI_I2V_MODEL } from '@/lib/hollywood/router'
import { openai } from '@/lib/openai'

// ═══ KINEO-CENA-SUAVIZADA-2026-08-25 (decisão do fundador: "quando a pessoa
// escreve palavras que não podem, nosso sistema precisa arrumar e entregar um
// vídeo próximo ao que está escrito") ════════════════════════════════════════
// O caso medido HOJE (15:34): duas cenas do filme dos robôs levaram 422
// invalid_request da moderação do fal ("Could not generate a video with the
// given inputs") e o retry re-enviou o MESMO prompt — mesma recusa, cena morta.
// Agora a 2ª rodada de retry chega com sanitize:true e ESTA função reescreve o
// prompt VISUAL numa versão que passa na moderação preservando o máximo:
// mesmo sujeito, mesmo cenário, mesma câmera/cinematografia. A NARRAÇÃO do
// cliente nunca passa por aqui — ela é TTS, palavras dele intactas (C1).
// Falhou a reescrita? Devolve o original: o retry segue valendo como antes.
async function softenPromptForModeration(prompt: string): Promise<string> {
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content:
            'A video-generation provider rejected the following SCENE PROMPT for content-policy reasons. Rewrite it so it passes moderation while staying AS CLOSE AS POSSIBLE to the original scene. Rules: keep the same subject, setting, era, mood, camera directions and cinematography lines VERBATIM where they are not the problem. Soften or replace only what typically trips moderation: graphic violence/injury (imply aftermath instead), weapons pointed at people (holstered/lowered), gore/blood (remove), destruction of people (make it property/landscape), real people/brands (make generic), anything sexual (remove). Never add new story elements. Output ONLY the rewritten prompt, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
    })
    const out = (r.choices[0]?.message?.content ?? '').trim()
    // Sanidade: reescrita vazia ou desproporcional = fica o original. O teto
    // de 6000 espelha a validação de prompt da rota (nunca devolver algo que
    // a própria rota rejeitaria na linha seguinte).
    if (out.length >= 20 && out.length <= Math.min(prompt.length * 1.5, 6000)) return out
    return prompt
  } catch {
    return prompt
  }
}

// Fonte única de modelos: o router do Hollywood.
const KLING3_I2V = KLING3_I2V_MODEL
const KLING3_T2V = HOLLYWOOD_MODELS.dialogue
// KINEO-H3-RETRY-2026-08-20 (auditoria pós-estreia) — esta rota nasceu antes
// do H3 e não o conhecia: um retry de cena H3 caía no fallback Kling — clipe
// de OUTRO motor no meio do filme, e pior, com generate_audio:true, ou seja,
// a VOZ FANTASMA que acabamos de matar voltava pela porta dos fundos do retry.
const H3_SET = new Set<string>([H3_MODELS.dialogue, H3_MODELS.cinematic, H3_MODELS.support, H3_I2V_MODEL])
// ⚠️ KINEO-OMNI-RETRY-2026-08-25 (auditoria de motores, mesmo buraco do H3 em
// 20/08): esta rota não conhecia o Omni. Uma cena Omni que falhasse caía no
// `anchorUrl ? KLING3_I2V` e voltava como CLIPE DE KLING 3 no meio de um filme
// vendido como Omni Flash — selo desonesto (a regra nº1 da vitrine), custo
// nosso maior ($0.168/s vs $0.13/s) e schema errado (duration string em vez de
// inteiro 3-10). A família do pedido manda, sempre.
const OMNI_SET = new Set<string>([OMNI_I2V_MODEL])
const ALLOWED = new Set<string>([KLING3_I2V, HOLLYWOOD_MODELS.dialogue, HOLLYWOOD_MODELS.cinematic, HOLLYWOOD_MODELS.support, ...H3_SET, ...OMNI_SET])

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY
  if (!falKey) return NextResponse.json({ error: 'Provider not configured' }, { status: 500 })
  fal.config({ credentials: falKey })

  let body: { prompt?: string; anchorUrl?: string | null; seconds?: number; model?: string; generationId?: string; oldRequestId?: string | null; sceneIndex?: number; sanitize?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  let prompt = String(body.prompt ?? '').trim()
  // KINEO-CENA-SUAVIZADA-2026-08-25 — 2ª rodada de retry: o prompt original
  // já falhou DUAS vezes no fornecedor; suaviza antes de re-submeter.
  if (body.sanitize === true && prompt.length >= 20) {
    const softened = await softenPromptForModeration(prompt)
    if (softened !== prompt) {
      console.log(`[retry-hollywood-scene] prompt suavizado p/ moderação (${prompt.length}→${softened.length} chars)`)
      prompt = softened
    }
  }
  // 4000→6000: o prompt agora é o SUBMETIDO completo (upright+era+mouth+spectacle+sharp), maior que o cru.
  if (prompt.length < 20 || prompt.length > 6000) {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  }
  const anchorUrl = typeof body.anchorUrl === 'string' && body.anchorUrl.startsWith('https://') ? body.anchorUrl : null
  const seconds = Math.max(3, Math.min(15, Math.round(Number(body.seconds) || 10)))
  // KINEO-H3-RETRY-2026-08-20 — a FAMÍLIA do pedido manda: se o modelo que
  // falhou era H3, o retry fica no H3 (i2v se tem âncora). O `anchorUrl ?
  // KLING3_I2V` antigo sequestrava até âncora H3 pro Kling.
  const requestedIsH3 = H3_SET.has(String(body.model))
  // KINEO-OMNI-RETRY-2026-08-25 — o Omni só existe em i2v no fal; sem âncora
  // não há retry honesto possível nesta família (cai no Kling do hollywood,
  // que é o comportamento herdado — mas COM âncora, que é o caso real de todo
  // clipe Omni, ele volta no próprio motor).
  const requestedIsOmni = OMNI_SET.has(String(body.model))
  const model = requestedIsOmni && anchorUrl
    ? OMNI_I2V_MODEL
    : requestedIsH3
    ? (anchorUrl ? H3_I2V_MODEL : (ALLOWED.has(String(body.model)) ? String(body.model) : H3_MODELS.cinematic))
    : anchorUrl ? KLING3_I2V : (ALLOWED.has(String(body.model)) ? String(body.model) : KLING3_T2V)

  // Input idêntico ao buildFalInput dos branches correspondentes do route
  // principal. H3: duration INTEIRO 5-15, resolution 768P, generate_audio
  // SEMPRE false (o H3 ignora e manda áudio mesmo assim — o compose muta —
  // mas o parâmetro fica pelo dia em que o modelo passar a respeitá-lo).
  // KINEO-OMNI-RETRY-2026-08-25 — schema OFICIAL do Omni (fal, lido 25/08):
  // image_url* + prompt* + aspect_ratio ('9:16' EXPLÍCITO — o default do
  // fornecedor é 16:9 e sem isto o clipe re-tentado voltaria DEITADO no meio
  // do filme vertical) + duration INTEIRO 3-10 (o teto do motor; string ou
  // 12s = 422 na cara do cliente). Espelha buildFalInput do route principal.
  const input: Record<string, unknown> = model === OMNI_I2V_MODEL
    ? {
        image_url: anchorUrl,
        prompt,
        aspect_ratio: '9:16',
        duration: Math.max(3, Math.min(10, Math.round(seconds))),
      }
    : requestedIsH3
    ? {
        ...(anchorUrl ? { image_url: anchorUrl } : { aspect_ratio: '9:16' }),
        prompt,
        duration: Math.max(5, Math.min(15, seconds)),
        resolution: H3_RESOLUTION,
        generate_audio: false,
      }
    : anchorUrl
    ? { image_url: anchorUrl, prompt, duration: String(seconds), generate_audio: true }
    : {
        // KINEO-KLING3-AUDIT-2026-08-20 — dois desvios do route principal:
        // 1) duration era o snap velho 5|10 que o MOTORMAX matou (recriava
        //    dead-air/fala cortada exatamente na cena re-tentada);
        // 2) negative_prompt estava uma geração atrás (sem rotated frame/
        //    tilted horizon/soft focus). Agora espelha o branch KLING3_MODEL.
        prompt:
          // cena t2v sem âncora precisa da ordem de composição vertical como
          // PREFIXO (KINEO-UPRIGHT-B); o prompt guardado pode vir de um submit
          // i2v (still travava o quadro) e não tê-la.
          prompt.startsWith('Vertical 9:16') ? prompt : `Vertical 9:16 composition, camera upright, horizon perfectly LEVEL and horizontal across the frame. ${prompt}`,
        duration: String(seconds),
        aspect_ratio: '9:16',
        generate_audio: true,
        cfg_scale: 0.6,
        negative_prompt:
          'cartoon, anime, illustration, 3d render, blur, distort, low quality, watermark, text, logo, caption, chinese text, foreign text, on-screen text, readable signs, subtitles, captions, phone screen with text, rotated frame, sideways composition, vertical horizon, tilted horizon, soft focus, out of focus',
      }

  // KINEO-H3-AUDIT2-2026-08-20 — O RETRY MORRIA EM 404 DEPOIS DE FUNCIONAR.
  // Esta rota devolvia um request id novo, mas o claim assinado continuava
  // com o id VELHO — e o poller (cinematic-clip-status) exige que os ids do
  // poll batam 1:1 com o claim. O poll seguinte ao retry respondia 404
  // "Generation not found" e a geração inteira era dada como morta, mesmo com
  // as cenas boas prontas. Agora o claim é RETARGETADO junto (mesmo dono,
  // mesmo modelo no slot, slot sem URL autorizada). Sem generationId/
  // oldRequestId (client antigo em cache) o comportamento é o legado.
  const generationId = typeof body.generationId === 'string' && validCinematicGenerationId(body.generationId) ? body.generationId : null
  const oldRequestId = typeof body.oldRequestId === 'string' && body.oldRequestId.length > 0 ? body.oldRequestId : null
  const sceneIndex = Number.isInteger(body.sceneIndex) && (body.sceneIndex as number) >= 0 ? (body.sceneIndex as number) : null

  try {
    const { request_id } = await fal.queue.submit(model, { input })
    if (!request_id) throw new Error('no request id')
    if (generationId && sceneIndex !== null) {
      const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (adminUrl && secret) {
        const admin = createAdminClient(adminUrl, secret, { auth: { autoRefreshToken: false, persistSession: false } })
        const retargeted = await retargetCinematicRequestId({
          db: admin,
          secret,
          userId: user.id,
          generationId,
          index: sceneIndex,
          oldRequestId,
          newRequestId: request_id,
          model,
        })
        if (!retargeted.ok) {
          // Falhou o retarget = o poller vai rejeitar o id novo. Melhor avisar
          // o client pra NÃO trocar o id (cena segue dropada, filme compõe com
          // o que tem) do que entregar um id que mata a geração inteira em 404.
          console.error(`[retry-hollywood-scene] claim retarget failed (${retargeted.error}) — retry discarded`)
          return NextResponse.json({ error: 'Retry could not be authorized.' }, { status: 409 })
        }
        console.log(`[retry-hollywood-scene] claim retargeted idx=${sceneIndex} ${oldRequestId ? oldRequestId.slice(0, 8) : 'null'}→${request_id.slice(0, 8)}`)
      }
    }
    console.log(`[retry-hollywood-scene] user=${user.id.slice(0, 8)} model=${model} resubmitted → ${request_id}`)
    return NextResponse.json({ requestId: request_id, model })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[retry-hollywood-scene] submit failed:', msg)
    // KINEO-FAILFAST-2026-08-17 — na noite do saldo estourado esta rota
    // devolveu seis 502 "Forbidden" em silencio. Se a cara do erro e saldo,
    // o fundador e alertado por email na hora (throttle de 30min na lib).
    if (looksExhausted({ status: (e as { status?: number })?.status, message: msg })) {
      await alertFalExhausted(`retry-hollywood-scene user=${user.id.slice(0, 8)} model=${model}`)
    }
    return NextResponse.json({ error: 'Retry submit failed' }, { status: 502 })
  }
}
