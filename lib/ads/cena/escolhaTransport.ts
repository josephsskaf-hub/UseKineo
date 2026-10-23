// KINEO-ADS-ESCOLHA-2310 — transports only; no video or credit operation exists in the preview stage.
import { submitShotOnce, pollFalJob } from '../v2Shots'
import { persistSceneImage } from '../v2Images'
import type { EscolhaEffects } from './internalEscolha'
export function escolhaEffects(userId: string, orderId: string): EscolhaEffects {
  const context = { userId, orderId }
  return {
    submit: async job => {
      const r = await submitShotOnce(job.endpoint, job.input, context)
      // Ambiguous means a possibly paid request; a later stills call must not send it again.
      return r.kind === 'accepted' ? { kind: 'accepted', requestId: r.requestId } : { kind: r.kind }
    },
    poll: job => pollFalJob(job.endpoint, job.requestId!, 'image', context),
    persist: job => persistSceneImage({ ...context, idx: job.index, attempt: job.attempt, falUrl: job.url!, suffix: `-escolha-${job.index}` }),
  }
}
