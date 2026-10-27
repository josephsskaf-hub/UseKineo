import { narrationWordCount } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
// KINEO-BEBE-QUE-FALA-2010 — POST /api/kids-cartoon/story: escreve a HISTÓRIA do "AI Kids Cartoon Stories" (template de 1 clique).
//
// Não cobra nada e não gera vídeo: valida o pedido no servidor (personagem/língua/duração/ideia da lista fechada de
// lib/kidsCartoon/kidsCartoon.ts), passa a ideia pela moderação da casa (moderateTopic + moderateContent) e pela regra extra
// "conteúdo inocente para criança", escreve a narração (gpt-4o, régua do Seedance 1.5 = lib/scriptWriterRate, a MESMA do
// /api/generate-script), confere a saída de novo (tamanho, nome do personagem, regra infantil, moderação) e devolve o link do
// fluxo de filme de sempre: /generate no Seedance 1.5 com o roteiro "como está" e `kids_cartoon=<personagem>` — a rota do filme
// trava o estilo 3D e o personagem em TODA cena. O preço aparece só no botão de gerar de lá (o do Seedance para a duração).
//
// Interruptor: KIDS_CARTOON_LIVE=false → só as contas da casa (isInternalEmail); o resto recebe 404.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isInternalEmail } from '@/lib/internalAccounts'
import { openai, OPENAI_SCRIPT_TIMEOUT_MS } from '@/lib/openai'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateTopic } from '@/lib/safety/topicModeration'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { minWordsFor, maxWordsFor, writerRateFor } from '@/lib/scriptWriterRate'
import { maxWordsForShortFilm, SEEDANCE_SHORT_SECONDS } from '@/lib/durationByEngine'
import {
  KIDS_CARTOON_LIVE,
  KIDS_REFUSAL_MESSAGE,
  kidsCartoonGenerateHref,
  kidsCartoonOn,
  kidsContentRefusal,
  kidsPostCaption,
  kidsStoryCheck,
  kidsStoryWriterPrompt,
  validateKidsCartoonRequest,
} from '@/lib/kidsCartoon/kidsCartoon'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const PATH = '/api/kids-cartoon/story'

/** A faixa de palavras do Seedance 1.5 na duração e na língua (a mesma conta do /api/generate-script para 'cinematic_ai'). */
function kidsStoryWordBand(duration: number, language: string, idea: string): { min: number; max: number; aceita: number } { // KINEO-DESENHO-15S-ACEITA-2710
  const regua = writerRateFor('cinematic_ai', idea, language)
  const idioma = duration === SEEDANCE_SHORT_SECONDS ? language : undefined
  const min = minWordsFor(duration, regua.wordsPerSecond, regua.coverage, idioma)
  const teto = maxWordsFor(duration, regua.wordsPerSecond, regua.coverage, idioma)
  const max = duration === SEEDANCE_SHORT_SECONDS ? Math.min(teto, maxWordsForShortFilm(duration, language)) : teto
  // o pedido ao escritor segue min–max; a conferência aceita até o teto que o cinematic aceita no 15 s (56 em inglês) — passar do alvo é bom, recusar a história não é // KINEO-DESENHO-15S-ACEITA-2710 [TRAVA 8.2 — fundador 27/10 "puxa o sha": 3 das 5 amostras e 5 pedidos de 22/10 morreram em writer_too_long com 36–41]
  const aceita = duration === SEEDANCE_SHORT_SECONDS ? Math.max(max, maxWordsForShortFilm(duration, language)) : max // KINEO-DESENHO-15S-ACEITA-2710
  return { min: Math.min(min, max), max, aceita } // KINEO-DESENHO-15S-ACEITA-2710
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  if (!kidsCartoonOn(KIDS_CARTOON_LIVE, isInternalEmail(user.email))) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  const v = validateKidsCartoonRequest(raw)
  if (!v.ok) return NextResponse.json({ error: v.error, field: v.field }, { status: 400 })
  const request = v.value
  const lang = request.language === 'pt' ? 'pt' : 'en'
  const recusa = async (status: number, error: string, reason: string, extra: Record<string, unknown> = {}) => {
    await writeServerEvent({ name: 'kids_cartoon_story_refused', userId: user.id, path: PATH, metadata: { reason, character: request.character, language: request.language, duration: request.duration, idea_id: request.ideaId, charged: false, ...extra } }).catch(() => false)
    return NextResponse.json({ error, reason, charged: false }, { status })
  }

  // 1. a regra extra para criança e a moderação da casa, ANTES do escritor
  const regraInfantil = kidsContentRefusal(request.idea)
  if (regraInfantil) return recusa(422, KIDS_REFUSAL_MESSAGE[lang], 'kids_rule', { category: regraInfantil })
  const tema = await moderateTopic({ entry: 'generate-script', userId: user.id, text: request.idea, language: request.language, meta: { product: 'kids_cartoon' } })
  if (!tema.ok) return recusa(tema.status, tema.message, 'topic_moderation', { category: tema.category })
  const entrada = await moderateContent({ surface: 'script', stage: 'input', userId: user.id, text: request.idea, meta: { route: PATH, product: 'kids_cartoon' } })
  if (!entrada.ok) return recusa(moderationRefusalStatus(entrada.reason), moderationRefusalMessage(entrada.reason), `moderation_${entrada.reason}`)

  // 2. o escritor (uma nova tentativa só quando o tamanho ou o nome falham; nunca quando a regra infantil falha)
  const band = kidsStoryWordBand(request.duration, request.language, request.idea)
  const { system, user: userMsg } = kidsStoryWriterPrompt({ request, minWords: band.min, maxWords: band.max })
  let script = ''
  let motivo = ''
  for (let tentativa = 0; tentativa < 2 && !script; tentativa++) {
    let texto = ''
    try {
      const completion = await openai.chat.completions.create(
        {
          model: AI_TEXT_MODELS.writer, // o escritor de roteiro da casa (gpt-4o hoje; a migração troca num lugar só)
          temperature: 0.8,
          max_tokens: 600,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: tentativa === 0 ? userMsg : `${userMsg}\n\nThe previous version was ${motivo.replace('_', ' ')}. Write it again: exactly between ${band.min} and ${band.max} words, and name the main character.` },
          ],
        },
        { timeout: OPENAI_SCRIPT_TIMEOUT_MS, maxRetries: 0 },
      )
      texto = completion.choices[0]?.message?.content?.trim() ?? ''
    } catch (err) {
      console.warn('[kids-cartoon/story] escritor falhou:', err instanceof Error ? err.message : String(err))
      return recusa(503, lang === 'pt' ? 'O escritor está ocupado agora. Nada foi cobrado — tente de novo em um minuto.' : 'The story writer is busy right now. Nothing was charged — try again in a minute.', 'writer_unavailable')
    }
    const conferida = kidsStoryCheck(texto, { character: request.character, minWords: band.min, maxWords: band.aceita }) // KINEO-DESENHO-15S-ACEITA-2710
    if (conferida.ok) { script = conferida.script; break }
    motivo = conferida.reason
    if (conferida.reason === 'not_innocent' || conferida.reason === 'empty') break
  }
  if (!script) return recusa(motivo === 'not_innocent' ? 422 : 502, motivo === 'not_innocent' ? KIDS_REFUSAL_MESSAGE[lang] : (lang === 'pt' ? 'Não saiu uma história boa desta vez. Nada foi cobrado — tente de novo.' : 'The story did not come out right this time. Nothing was charged — please try again.'), `writer_${motivo || 'failed'}`)

  // 3. a saída passa pela moderação de novo (falha fechada, como toda porta da casa)
  const saida = await moderateContent({ surface: 'script', stage: 'output', userId: user.id, text: script, meta: { route: PATH, product: 'kids_cartoon' } })
  if (!saida.ok) return recusa(moderationRefusalStatus(saida.reason), moderationRefusalMessage(saida.reason), `output_moderation_${saida.reason}`)

  const href = kidsCartoonGenerateHref({ script, request })
  if (!href) return recusa(502, lang === 'pt' ? 'A história saiu longa demais. Nada foi cobrado — tente de novo.' : 'The story came out too long. Nothing was charged — please try again.', 'handoff_too_long')
  await writeServerEvent({ name: 'kids_cartoon_story_written', userId: user.id, path: PATH, metadata: { character: request.character, language: request.language, duration: request.duration, idea_id: request.ideaId, words: narrationWordCount(script, request.language), band, charged: false } }).catch(() => false)
  return NextResponse.json({ script, href, caption: kidsPostCaption(request.language, request.character), band })
}
