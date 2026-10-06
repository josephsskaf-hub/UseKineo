// KINEO-SEM-LEGENDA-2026-10-06 — o lado servidor do "filme só com a voz" (ver o cabeçalho de lib/semLegenda.ts).
//
// Duas escritas, só para conta interna (decisao.versao !== null), DEPOIS de o render ser aceito e de o claim/intent da
// montagem já estarem gravados — nada aqui atrasa ou derruba a entrega:
//   · EVENTO_VERSAO   — "esta versão do teste foi gerada" (variant A ou B, render_id; video_id nasce no status);
//   · EVENTO_FONTE_B  — o RenderScript da versão B (sem legenda e sem gancho), para a rota de versão B remontar depois
//     sem refazer cena, sem TTS e sem crédito.
// writeServerEvent nunca lança; um RenderScript grande demais vira só o carimbo com motivo, sem o corpo.

import { writeServerEvent } from '@/lib/serverEvents'
import {
  EVENTO_FONTE_B,
  EVENTO_IGNORADO,
  EVENTO_VERSAO,
  SEM_LEGENDA_MARCA,
  fonteVersaoB,
  metadadosFonteB,
  metadadosVersao,
  type DecisaoLegenda,
} from '@/lib/semLegenda'

/** Conta interna: grava a versão gerada e o RenderScript da versão B. Cliente (versao null): não grava nada. */
export async function registrarVersaoDaCasa(a: {
  userId: string
  generationId: string | null
  renderId: string
  quality: string | null
  decisao: DecisaoLegenda
  source: Record<string, unknown>
}): Promise<{ versao: boolean; fonte: boolean; motivo: string }> {
  if (a.decisao.versao === null) return { versao: false, fonte: false, motivo: 'cliente' }
  try {
    const versao = await writeServerEvent({
      name: EVENTO_VERSAO,
      userId: a.userId,
      path: '/api/compose',
      sessionId: a.generationId,
      metadata: metadadosVersao({ variant: a.decisao.versao, videoId: null, original: null, renderId: a.renderId, generationId: a.generationId, via: 'compose', quality: a.quality }),
    })
    const b = fonteVersaoB(a.source)
    const fonte = await writeServerEvent({
      name: EVENTO_FONTE_B,
      userId: a.userId,
      path: '/api/compose',
      sessionId: a.generationId,
      metadata: metadadosFonteB({ renderId: a.renderId, generationId: a.generationId, quality: a.quality, decisao: a.decisao, fonteB: b }),
    })
    if (b.motivo !== 'ok') console.warn(`[compose] ${SEM_LEGENDA_MARCA}: RenderScript da versão B não guardado (${b.motivo}, ${b.chars} chars) render=${a.renderId}`)
    return { versao, fonte: fonte && b.motivo === 'ok', motivo: b.motivo }
  } catch (err) {
    console.warn(`[compose] ${SEM_LEGENDA_MARCA}: registro da versão falhou (ignorado):`, err instanceof Error ? err.message : String(err))
    return { versao: false, fonte: false, motivo: 'erro' }
  }
}

/** Cliente pediu captions:false: o filme segue como hoje (com legenda) e o servidor deixa o rastro. */
export async function registrarSemLegendaIgnorado(a: { userId: string; generationId: string | null; quality: string | null }): Promise<boolean> {
  return writeServerEvent({
    name: EVENTO_IGNORADO,
    userId: a.userId,
    path: '/api/compose',
    sessionId: a.generationId,
    metadata: { marca: SEM_LEGENDA_MARCA, generation_id: a.generationId, quality: a.quality, motivo: 'conta_nao_interna' },
  })
}
