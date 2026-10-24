// KINEO-CARTOON-CONSISTENCIA-2210 — um edit por cena a partir do catálogo; sem pool FLUX, folha nova ou retry pago escondido.
import { fal } from '@fal-ai/client'
import { submitFalQueueOnce } from '@/lib/falQueue'
import { moderateContent } from '@/lib/safety/contentModeration'
import { cartoonCast, cartoonEditInput, CARTOON_EDIT_MODEL, cartoonVariableCost } from './cartoonConsistency'
import type { KidsCharacterId } from './kidsCartoon'

export async function cartoonReferenceFrames(i: { primary: KidsCharacterId; story: string; duration: number; prompts: string[]; narrations: string[]; seconds: number[]; aspect: unknown; userId: string; seed: number; budgetMs?: number }) {
  const requestIds: string[] = []
  let cost: ReturnType<typeof cartoonVariableCost>
  try { cost = cartoonVariableCost(i.seconds) }
  catch { return { urls: [] as string[], requestIds, submitted: 0, ok: false, reason: 'invalid_plan' } }
  if (i.prompts.length !== i.seconds.length || (i.duration === 15 && !cost.withinCap)) return { urls: [] as string[], requestIds, submitted: 0, ok: false, reason: 'budget' }
  if (!process.env.FAL_KEY) return { urls: [] as string[], requestIds, submitted: 0, ok: false, reason: 'no_key' }
  fal.config({ credentials: process.env.FAL_KEY })
  const urls = new Array<string>(i.prompts.length).fill('')
  let submitted = 0
  let cursor = 0
  let reason = 'reference_failed'
  const deadline = Date.now() + (i.budgetMs ?? 75_000)
  async function worker() {
    while (cursor < urls.length && Date.now() < deadline) {
      const index = cursor++
      // O prompt original de cada cena (sem a ficha anexada do protagonista) permite identificar o elenco secundário corretamente.
      const cast = cartoonCast(i.primary, `${i.story} ${i.narrations[index] ?? ''} ${i.prompts[index]}`)
      const input = cartoonEditInput(i.prompts[index], cast, i.aspect, (i.seed + index) % 2_147_483_647)
      try {
        submitted++ // inclui aceite ambíguo na conta; nunca repetir o POST.
        const requestId = await submitFalQueueOnce(CARTOON_EDIT_MODEL, input)
        requestIds[index] = requestId
        let authFails = 0
        while (Date.now() < deadline) {
          try {
            const status = await fal.queue.status(CARTOON_EDIT_MODEL, { requestId }) as { status?: string }
            if (status.status === 'FAILED') break
            if (status.status === 'COMPLETED') {
              const r = await fal.queue.result(CARTOON_EDIT_MODEL, { requestId }) as { data?: { images?: { url?: string }[] } }
              const url = r.data?.images?.[0]?.url
              if (!url || !/^https:\/\//.test(url)) break
              const check = await moderateContent({ surface: 'images_edit', stage: 'output', userId: i.userId, text: input.prompt, imageUrls: [url], meta: { product: 'kids_cartoon', character: i.primary, scene: index, model: CARTOON_EDIT_MODEL } })
              if (check.ok) urls[index] = url
              else reason = 'moderation_' + check.reason
              break
            }
            authFails = 0
          } catch (err) {
            if ([401, 403].includes((err as { status?: number })?.status ?? 0) && ++authFails >= 3) break
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch { /* sem segundo POST; todas as imagens são necessárias antes de iniciar qualquer clipe */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, urls.length) }, worker))
  return { urls, requestIds, submitted, ok: urls.length > 0 && urls.every(Boolean), reason }
}
