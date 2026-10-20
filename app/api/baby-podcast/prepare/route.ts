// KINEO-BEBE-QUE-FALA-2010 — POST /api/baby-podcast/prepare: prepara o "AI Baby Podcast" (o 2º modo) SEM cobrar nada.
//
// Valida o pedido no servidor (bebê com retrato aprovado, língua, tema/texto — lib/kidsCartoon/babyPodcast.ts), passa o tema pela
// moderação da casa (moderateTopic + moderateContent) e pela regra infantil, escreve 30–45 palavras inocentes (ou confere o texto
// colado), modera a fala de novo e copia o retrato FIXO da casa para avatars/<uid>/baby-podcast-<bebê>.png — o /api/generate-avatar só
// aceita foto da pasta do próprio usuário, e o nome fixo faz o MESMO bebê voltar numa série. Devolve o corpo pronto do
// /api/generate-avatar (presenter, verbatim, sem B-roll, voz MiniMax da língua). O débito (70 cr do 'presenter') é do generate-avatar.
// Interruptor: BABY_PODCAST_LIVE=false → só as contas da casa (isInternalEmail); o resto recebe 404.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isInternalEmail } from '@/lib/internalAccounts'
import { openai, OPENAI_SCRIPT_TIMEOUT_MS } from '@/lib/openai'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateTopic } from '@/lib/safety/topicModeration'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { KIDS_REFUSAL_MESSAGE, kidsContentRefusal } from '@/lib/kidsCartoon/kidsCartoon'
import {
  BABY_PODCAST_LIVE,
  babyAvatarObjectPath,
  babyById,
  babyPortraitUrl,
  babyPodcastOn,
  babyPostCaption,
  babyScriptCheck,
  babyScriptWriterPrompt,
  validateBabyPodcastRequest,
} from '@/lib/kidsCartoon/babyPodcast'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const PATH = '/api/baby-podcast/prepare'
const MAX_PORTRAIT_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  if (!babyPodcastOn(BABY_PODCAST_LIVE, isInternalEmail(user.email))) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  const v = validateBabyPodcastRequest(raw)
  if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 })
  const request = v.value
  const recusa = async (status: number, error: string, reason: string) => {
    await writeServerEvent({ name: 'baby_podcast_refused', userId: user.id, path: PATH, metadata: { reason, baby: request.baby, language: request.language, mode: request.mode, charged: false } }).catch(() => false)
    return NextResponse.json({ error, reason, charged: false }, { status })
  }

  // 1. regra infantil + moderação da casa, ANTES do escritor
  if (kidsContentRefusal(request.topic)) return recusa(422, KIDS_REFUSAL_MESSAGE[request.language], 'kids_rule')
  const tema = await moderateTopic({ entry: 'generate-script', userId: user.id, text: request.topic, language: request.language, meta: { product: 'baby_podcast' } })
  if (!tema.ok) return recusa(tema.status, tema.message, 'topic_moderation')
  const entrada = await moderateContent({ surface: 'script', stage: 'input', userId: user.id, text: request.topic, meta: { route: PATH, product: 'baby_podcast' } })
  if (!entrada.ok) return recusa(moderationRefusalStatus(entrada.reason), moderationRefusalMessage(entrada.reason), `moderation_${entrada.reason}`)

  // 2. a fala: o texto colado (já no tamanho) ou o escritor (uma nova tentativa só por tamanho)
  let script = ''
  if (request.mode === 'verbatim') {
    const c = babyScriptCheck(request.topic, kidsContentRefusal)
    if (!c.ok) return recusa(422, KIDS_REFUSAL_MESSAGE[request.language], `verbatim_${c.reason}`)
    script = c.script
  } else {
    const { system, user: userMsg } = babyScriptWriterPrompt(request)
    let motivo = ''
    for (let t = 0; t < 2 && !script; t++) {
      let texto = ''
      try {
        const completion = await openai.chat.completions.create(
          { model: AI_TEXT_MODELS.writer, temperature: 0.9, max_tokens: 300, messages: [{ role: 'system', content: system }, { role: 'user', content: t === 0 ? userMsg : `${userMsg}\n\nThe previous version was ${motivo.replace('_', ' ')}. Write it again with 30 to 45 words.` }] },
          { timeout: OPENAI_SCRIPT_TIMEOUT_MS, maxRetries: 0 },
        )
        texto = completion.choices[0]?.message?.content?.trim() ?? ''
      } catch (err) {
        console.warn('[baby-podcast/prepare] escritor falhou:', err instanceof Error ? err.message : String(err))
        return recusa(503, request.language === 'pt' ? 'O escritor está ocupado agora. Nada foi cobrado — tente de novo em um minuto.' : 'The writer is busy right now. Nothing was charged — try again in a minute.', 'writer_unavailable')
      }
      const c = babyScriptCheck(texto, kidsContentRefusal)
      if (c.ok) { script = c.script; break }
      motivo = c.reason
      if (c.reason === 'not_innocent' || c.reason === 'empty') break
    }
    if (!script) return recusa(motivo === 'not_innocent' ? 422 : 502, motivo === 'not_innocent' ? KIDS_REFUSAL_MESSAGE[request.language] : (request.language === 'pt' ? 'Não saiu um roteiro bom desta vez. Nada foi cobrado — tente de novo.' : 'The script did not come out right this time. Nothing was charged — please try again.'), `writer_${motivo || 'failed'}`)
  }
  const saida = await moderateContent({ surface: 'script', stage: 'output', userId: user.id, text: script, meta: { route: PATH, product: 'baby_podcast' } })
  if (!saida.ok) return recusa(moderationRefusalStatus(saida.reason), moderationRefusalMessage(saida.reason), `output_moderation_${saida.reason}`)

  // 3. o retrato FIXO da casa vai para a pasta do usuário (nome fixo = o mesmo bebê numa série)
  const baby = babyById(request.baby)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!baby?.portrait || !supabaseUrl || !serviceKey) return recusa(503, 'This baby is not ready yet. Nothing was charged.', 'portrait_unavailable')
  let avatarImageUrl = ''
  try {
    const fonte = babyPortraitUrl(baby.portrait)
    if (!fonte) throw new Error('retrato fora da lista')
    const res = await fetch(fonte, { cache: 'no-store' })
    const tipo = res.headers.get('content-type') ?? ''
    if (!res.ok || !/^image\/(png|jpeg)/.test(tipo)) throw new Error(`retrato ${res.status} ${tipo}`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PORTRAIT_BYTES) throw new Error(`retrato com ${bytes.byteLength} bytes`)
    const admin = createAdminClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const objeto = babyAvatarObjectPath(user.id, request.baby)
    const { error } = await admin.storage.from('avatars').upload(objeto, bytes, { contentType: tipo.startsWith('image/png') ? 'image/png' : 'image/jpeg', cacheControl: '3600', upsert: true })
    if (error) throw new Error(error.message)
    avatarImageUrl = admin.storage.from('avatars').getPublicUrl(objeto).data.publicUrl
  } catch (err) {
    console.warn('[baby-podcast/prepare] retrato não copiado:', err instanceof Error ? err.message : String(err))
    return recusa(503, request.language === 'pt' ? 'Não deu para preparar o bebê agora. Nada foi cobrado — tente de novo.' : 'Could not prepare the baby right now. Nothing was charged — please try again.', 'portrait_copy_failed')
  }

  await writeServerEvent({ name: 'baby_podcast_prepared', userId: user.id, path: PATH, metadata: { baby: request.baby, language: request.language, mode: request.mode, words: script.split(/\s+/).length, charged: false } }).catch(() => false)
  return NextResponse.json({ script, avatarImageUrl, language: request.language, caption: babyPostCaption(request.language) })
}
