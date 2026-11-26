import { createHash } from 'node:crypto'
import { geminiDoKling4, GEMINI_OMNI_REF_USD_PER_S_720P, type EntradaDoGemini } from './geminiNaEsteira2511'

export const GEMINI_BLOCOS_2611: 'off' | 'internal' = 'internal'
export const blocosInternosLigados = (modo: string) => modo === 'internal'
export const BLOCK_UNITS = Math.round(15 * GEMINI_OMNI_REF_USD_PER_S_720P * 10000)

type Plan = { id: string; blocks: EntradaDoGemini[] }
export function probeUuid(text: string): string {
  const h = createHash('sha256').update('kineo/gemini-blocos/1/' + text).digest('hex')
  return [h.slice(0,8), h.slice(8,12), '8'+h.slice(13,16), '8'+h.slice(17,20), h.slice(20,32)].join('-')
}
const object = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
// Only the two canonical @Image markers are converted downstream. Reject lookalikes and raw provider tags
// here so malformed or missing references cannot survive as directions to the paid model.
function referenciasDoBlocoValidas(text: string, folhas: number): boolean {
  const sobra = text.replace(/(?<![\p{L}\p{N}_@])@Image([12])(?![\p{L}\p{N}_]|[./-]\d)/gu,
    (token, indice: string) => Number(indice) <= folhas ? '' : token)
  return !/@\s*image|<\s*image[\s_-]*ref/iu.test(sobra.normalize('NFKC'))
}

export function prepararBlocos2611(body: unknown, imageAllowed: (s: string) => boolean): Plan | null {
  if (!object(body) || (body.duration !== 15 && body.duration !== 30 && body.duration !== 60)) return null
  if (!Array.isArray(body.cast) || body.cast.length < 1 || body.cast.length > 2 || !Array.isArray(body.blocks) || body.blocks.length !== body.duration / 15) return null
  const names: string[] = [], images: string[] = []
  for (const person of body.cast) {
    if (!object(person) || typeof person.name !== 'string' || !person.name.trim() || person.name.length > 80 || !referenciasDoBlocoValidas(person.name, 0) || typeof person.image_url !== 'string' || !imageAllowed(person.image_url)) return null
    names.push(person.name.trim()); images.push(person.image_url)
  }
  if (new Set(images).size !== images.length || new Set(names.map(n => n.toLowerCase())).size !== names.length) return null
  const blocks: EntradaDoGemini[] = []
  for (const shots of body.blocks) {
    if (!Array.isArray(shots) || !shots.every(shot => object(shot) && typeof shot.prompt === 'string' && shot.prompt.length <= 512 && referenciasDoBlocoValidas(shot.prompt, images.length) && !/[\u0000-\u001F]/u.test(shot.prompt))) return null
    const input = geminiDoKling4({ image_urls: images, multi_prompt: shots, duration: 15, resolution:'720p', aspect_ratio:'9:16' }, names)
    if (!input) return null
    blocks.push(input)
  }
  return { id: probeUuid(JSON.stringify(blocks)), blocks }
}

export type BlockReceipt = { block: number; id: string }
export type BlockLedger = {
  read: (key: string) => Promise<{ state: string; request_id?: string } | null>
  spent: () => Promise<number | null>
  reserve: (key: string, index: number, units: number) => Promise<boolean>
  submit: (input: EntradaDoGemini) => Promise<string>
  store: (key: string, id: string) => Promise<boolean>
}
export async function executarBlocos2611(plan: Plan, capUnits: number, ledger: BlockLedger, canStartAnother: () => boolean = () => true) {
  const receipts: BlockReceipt[] = []
  const failed = (error: string, status: number) => ({ error, status, receipts })
  for (const [i, input] of plan.blocks.entries()) {
    const key = probeUuid(plan.id + '/' + i)
    const prior = await ledger.read(key)
    if (prior) {
      if (prior.state !== 'accepted' || !prior.request_id) return failed('reconcile_block',409)
      receipts.push({block:i + 1,id:prior.request_id}); continue
    }
    if (!canStartAnother()) return {status:202, resume:true, receipts}
    const spent = await ledger.spent()
    if (spent === null) return failed('spend_unreadable',503)
    if (spent + (plan.blocks.length - i) * BLOCK_UNITS > capUnits) return failed('daily_cap',429)
    if (!await ledger.reserve(key, i, BLOCK_UNITS)) return failed('reservation_conflict',409)
    try {
      const id = await ledger.submit(input)
      if (!id || !await ledger.store(key,id)) return failed('reconcile_block',409)
      receipts.push({block:i+1,id})
    } catch {
      // A response may be lost AFTER the provider accepted the POST. Keep the reservation and require reconciliation.
      return failed('reconcile_block',409)
    }
  }
  return { status:200, receipts }
}
