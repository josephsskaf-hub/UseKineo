/**
 * Temporary, fail-closed privacy policy for customer renders.
 *
 * The current schema has no versioned, auditable publication/visibility field.
 * Until that durable contract exists, a completed render is private and no
 * anonymous surface may look it up or enumerate it. Static founder-owned
 * examples and founder-confirmed owned engine previews live in the two
 * explicit allowlists in `lib/publicExamples.ts`; neither path may
 * enumerate customer rows or infer publication consent from `completed`.
 */
export const CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED = false as const

// ═══ KINEO-CONSENTIMENTO-POR-LINHA-2026-09-07 ═══════════════════════════════
// O #27 (06/09) criou o campo que faltava — `videos.published_at`, carimbado
// só pelo DONO via link HMAC — e o #28 pôs esse link no e-mail de entrega. Mas
// a trava global acima nunca foi ensinada sobre o campo novo: medido ao vivo
// em 06/09 com uma linha realmente publicada, a página /v/<id> respondia 200 e
// a capa (/opengraph-image) 404 de 0 bytes, e o video-sitemap seguia com os 6
// exemplos fixos. A porta abriu sem cartão e sem mapa.
//
// O PRINCÍPIO, que todo caller deve respeitar: a trava global continua
// fechada; o que abre a superfície é o consentimento POR LINHA. Sem
// `published_at`, absolutamente nada muda em relação a antes (falha FECHADA).
// Com a trava global em `true`, o comportamento antigo volta inteiro.
//
// Contrato: `true` quando a trava global estiver aberta OU quando a linha
// carregar um carimbo não vazio. Nada mais — este helper não sabe de status,
// URL de reprodução ou qualidade; isso continua sendo dever de quem chama.
// `as boolean` porque a flag é `false as const` e o `||` faria o TS estreitar
// o tipo (mesmo idioma de app/scripts/[vertical]/page.tsx).
export function publicSurfaceAllowsRow(publishedAt: string | null | undefined): boolean {
  const global = CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED as boolean
  if (global) return true
  return typeof publishedAt === 'string' && publishedAt.trim().length > 0
}
