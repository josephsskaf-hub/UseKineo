// ═══ KINEO-LINK-RASTREAVEL-2026-09-21 — o link do perfil nas redes passa a dizer de onde veio ═══
//
// Plano da semana (T4, docs/PLANO-SEMANA-50-ASSINANTES-2026-09-21.md): o TikTok subiu 30% com a série "cidades
// submersas", mas NENHUM cadastro é atribuível a TikTok/YouTube/Instagram — o link é "usekineo.com" digitado, sem utm.
// Estas rotas são a única coisa que vai no perfil e nas descrições: /s/tiktok → home com utm_source=tiktok. O
// restante da atribuição (utm → intent_campaign → cadastro) já existe e fica intacto. Só canais da lista redirecionam;
// qualquer outro slug cai na home limpa (nunca um 404 num link de perfil).
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CHANNELS: Record<string, { source: string; medium: string }> = {
  tiktok: { source: 'tiktok', medium: 'social' },
  youtube: { source: 'youtube', medium: 'social' },
  instagram: { source: 'instagram', medium: 'social' },
  x: { source: 'x', medium: 'social' },
}
// Fundador (21/09): "link de bio é permanente, campanha é temporária" — o /s/<rede> é o link de PERFIL e leva
// utm_campaign=bio; os links de descrição/comentário dos vídeos da série passam ?c=<campanha> (ex.: serie_submersa)
// e assim bio × vídeo ficam separados na leitura. `c` só aceita [a-z0-9_-] (até 40) — qualquer outra coisa vira bio.
export const SOCIAL_LINK_DEFAULT_CAMPAIGN = 'bio'
const CAMPAIGN_RE = /^[a-z0-9_-]{1,40}$/

export function socialLinkDestination(channel: string, origin: string, campaign?: string | null): string {
  const key = (channel || '').toLowerCase().trim()
  const ch = CHANNELS[key]
  if (!ch) return `${origin}/`
  const c = (campaign ?? '').toLowerCase().trim()
  const q = new URLSearchParams({ utm_source: ch.source, utm_medium: ch.medium, utm_campaign: CAMPAIGN_RE.test(c) ? c : SOCIAL_LINK_DEFAULT_CAMPAIGN })
  return `${origin}/?${q.toString()}`
}

export async function GET(req: NextRequest, { params }: { params: { channel: string } }) {
  // Sempre o host canônico com www: o apex (usekineo.com) recebe um 308 da própria Vercel ANTES de chegar aqui,
  // então o link de perfil deve nascer com www para o navegador embutido do TikTok/Instagram fazer um salto só.
  const origin = 'https://www.usekineo.com'
  return NextResponse.redirect(socialLinkDestination(params.channel, origin, req.nextUrl.searchParams.get('c')), 302)
}
