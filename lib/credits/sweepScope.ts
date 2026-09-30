// ═══ KINEO-ESTORNO-INDEVIDO-2026-09-29 ══════════════════════════════════════
// LIB PURA (sem import): quem a varredura genérica de estorno pode tocar, e com
// que prova de entrega cada produto fora dela é julgado. Os guardiões carregam
// este arquivo direto no node (scripts/test-estorno-indevido-2026-09-29.mjs).
//
// O defeito que isto fecha: sweepStuckRenderDebits (lib/credits/refund.ts)
// julga "entregou" por UMA prova só — linha em `videos` com o mesmo render_id.
// Oito chaves de débito kind='video' nunca gravam essa linha, porque o produto
// delas mora em outra tabela (ou em nenhuma). Resultado medido em 29/09: todo
// sucesso desses produtos era estornado 2-3 h depois pela varredura —
//   image-      32 imagens ENTREGUES estornadas (linha em `images` ≤3 min)
//   audio-      22 de 22 áudios ENTREGUES estornados (linha em `audios` ≤5 min)
//   enhance-/enhance4k-  11 enhances ENTREGUES (videos.enhanced_url gravado)
//   voice-clone- 7 clones ENTREGUES (profiles.voice_clone_id gravado)
//   upscale-    2 de 2 (images.upscaled_url gravado)
//   scene-gen-  2 (sem prova gravada; falha real estorna na própria rota)
// Os estornos em segundos (103 de imagem, 1 de clone) são LEGÍTIMOS: falha do
// fornecedor/moderação, estornada na própria requisição — não mudam.
//
// Regra nova: nenhuma chave cuja entrega não vira linha em `videos` entra na
// varredura genérica. Cada uma é julgada pela prova do próprio produto, ou —
// quando o produto não grava prova — só pelo estorno da própria rota.

/**
 * Padrões LIKE que a varredura genérica (prova = linha em `videos` com o mesmo
 * render_id) NUNCA toca. refund.ts aplica cada um como
 * `.not('render_id', 'like', p)` E filtra de novo em JS com
 * isGenericSweepCandidate — as duas camadas leem ESTA lista.
 */
export const GENERIC_SWEEP_EXCLUDED_PATTERNS: readonly string[] = [
  // ── entregas que nunca foram para `videos` (antes de 29/09) ──
  'animate-%', // Animate: estorno ao vivo em /api/avatar-status
  'legacy-%', // /api/render legado: estorno ao vivo em /api/render/[id]
  'gesture-%', // KINEO-GESTURE-2026-07-10: estorno ao vivo em /api/gesture-clip-status
  'cinematic-%', // rede própria: sweepAbandonedCinematicDebits (claim → compose → videos)
  'avatar-%', // rede própria: sweepAbandonedAvatarDebits
  'adsv2%', // KINEO-ADS-V2-2026-09-28: rede própria sweepAbandonedAdsV2Debits (adsv2-/adsv2redo-)
  // KINEO-CLIPES-2026-09-29: o clipe avulso do /clips mora na tabela `clips`; rede própria em
  // lib/clips/clipServer.ts sweepClipJobs. 'clips-%' NÃO casa com 'clip-%' — o Modo Clipe do
  // Studio (/api/generate-clip, clip-<uuid>) grava linha em `videos` e CONTINUA na varredura.
  'clips-%',
  // ── KINEO-ESTORNO-INDEVIDO-2026-09-29: mídia síncrona (rota de 60-120 s que estorna a
  //    própria falha antes de responder) ──
  'image-%', // /api/images/generate → linha em `images`; rede: sweepAbandonedMediaDebits
  'imgedit-%', // /api/images/edit → linha em `images`; rede: sweepAbandonedMediaDebits
  'audio-%', // /api/audio/generate → linha em `audios`; rede: sweepAbandonedMediaDebits
  'upscale-%', // /api/images/upscale → images.upscaled_url (sem carimbo por débito): só o estorno da rota
  'voice-clone-%', // /api/avatar/voice → profiles.voice_clone_id: só o estorno da rota
  'scene-gen-%', // /api/avatar/scene → devolve URL, não grava linha: só o estorno da rota
  // ── pós-produção assíncrona na linha do PRÓPRIO vídeo (render_id = enhance-<videos.id>) ──
  'enhance%', // enhance-<id> e enhance4k-<id>; rede: sweepAbandonedEnhanceDebits (prova = enhanced_url)
]

/** LIKE do Postgres restrito ao que a lista usa: literal + '%' final. */
function likePrefix(pattern: string, value: string): boolean {
  if (!pattern.endsWith('%') || pattern.slice(0, -1).includes('%') || pattern.includes('_')) {
    // Padrão fora do formato "prefixo%" não é suportado aqui: falha FECHADA (exclui).
    return true
  }
  return value.startsWith(pattern.slice(0, -1))
}

/** true = a varredura genérica pode julgar este débito pela linha em `videos`. */
export function isGenericSweepCandidate(renderId: string | null | undefined): boolean {
  const id = String(renderId ?? '')
  if (!id) return false
  return !GENERIC_SWEEP_EXCLUDED_PATTERNS.some((p) => likePrefix(p, id))
}

/**
 * Mídia síncrona com prova gravada: a rota debita, chama a fal e grava a linha
 * do produto ANTES de responder (maxDuration 60 s). Se não existe linha do
 * mesmo dono dentro da janela depois do débito, a requisição morreu no meio
 * (timeout/queda) sem estornar — aí, e só aí, a rede estorna.
 */
export const SYNC_MEDIA_PRODUCTS: readonly { pattern: string; prefix: string; table: 'images' | 'audios' }[] = [
  { pattern: 'image-%', prefix: 'image-', table: 'images' },
  { pattern: 'imgedit-%', prefix: 'imgedit-', table: 'images' },
  { pattern: 'audio-%', prefix: 'audio-', table: 'audios' },
]

/** Janela da prova: maxDuration (60 s) + folga. Medido 29/09: 54 de 54 entregas caem em ≤3 min. */
export const SYNC_MEDIA_DELIVERY_WINDOW_MS = 3 * 60 * 1000

export function syncMediaProductFor(renderId: string): { pattern: string; prefix: string; table: 'images' | 'audios' } | null {
  return SYNC_MEDIA_PRODUCTS.find((p) => renderId.startsWith(p.prefix)) ?? null
}

/**
 * Há entrega do mesmo dono em [débito, débito + janela]? Em rajada (várias
 * gerações simultâneas) a linha de uma irmã também conta — erra para o lado de
 * NÃO estornar, nunca para o de estornar entrega.
 */
export function hasDeliveryInWindow(
  debit: { user_id: string; created_at: string },
  rows: readonly { user_id: string; created_at: string }[],
  windowMs: number = SYNC_MEDIA_DELIVERY_WINDOW_MS,
): boolean {
  const t0 = Date.parse(debit.created_at)
  if (!Number.isFinite(t0)) return true // sem relógio confiável = sem estorno
  return rows.some((r) => {
    if (r.user_id !== debit.user_id) return false
    const t = Date.parse(r.created_at)
    return Number.isFinite(t) && t >= t0 - 5000 && t <= t0 + windowMs
  })
}

/** enhance-<videoId> | enhance4k-<videoId> → videoId (null se a chave não é de enhance). */
export function enhanceVideoIdFromRenderId(renderId: string): string | null {
  const m = /^enhance(?:4k)?-(.+)$/.exec(renderId)
  return m ? m[1] : null
}

/** A chave de débito do enhance, a MESMA no débito e no estorno. */
export function enhanceBillingKey(videoId: string, is4k: boolean): string {
  return is4k ? `enhance4k-${videoId}` : `enhance-${videoId}`
}

/**
 * As duas chaves possíveis de um vídeo — o GET de /api/enhance não sabe se o
 * job é HD ou 4K. Estornar as duas é seguro: o RPC é idempotente e um vídeo
 * só tem um enhance vivo por vez (enhanced_url gravado encerra o ciclo).
 */
export function enhanceBillingKeys(videoId: string): string[] {
  return [enhanceBillingKey(videoId, false), enhanceBillingKey(videoId, true)]
}

/** Enhance entregue = a linha do vídeo tem enhanced_url. Sem a linha = sem prova: não estorna. */
export function enhanceRefundDecision(video: { enhanced_url: string | null } | null | undefined): 'delivered' | 'no_video_row' | 'refund' {
  if (!video) return 'no_video_row'
  if (typeof video.enhanced_url === 'string' && video.enhanced_url.trim()) return 'delivered'
  return 'refund'
}
