// KINEO-META95-REFAZER-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — a ÚNICA escrita da refação grátis
// dentro do /api/compose: depois de o render ser aceito (e do claim/intent da montagem já gravados), o RenderScript
// EXATO que foi ao Creatomate é guardado, assinado, para a refação de uma cena remontar o filme depois sem refazer voz,
// legenda nem música. Só motores clássicos (lib/freeRedo/core.ts FREE_REDO_FILM_QUALITIES). Nunca lança e nunca muda
// a resposta do compose: se não gravar, o filme sai igual — só não ganha o botão de refação.
import { writeServerEvent } from '@/lib/serverEvents'
import { FILM_SOURCE_EVENT, filmSourceMetadata } from '@/lib/freeRedo/core'

export async function guardarFonteDoFilme(a: {
  userId: string
  generationId: string | null
  renderId: string
  quality: string | null
  source: Record<string, unknown>
}): Promise<boolean> {
  try {
    const metadata = filmSourceMetadata({ secret: process.env.SUPABASE_SERVICE_ROLE_KEY, ...a })
    if (!metadata) return false
    return await writeServerEvent({ name: FILM_SOURCE_EVENT, userId: a.userId, path: '/api/compose', sessionId: a.generationId, metadata })
  } catch {
    return false
  }
}
