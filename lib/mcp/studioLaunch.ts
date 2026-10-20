// ═══ KINEO-MCP-STUDIO-2010 — o interruptor e os endereços do conector "Kineo Studio" ════════════════════════════
//
// O fundador (20/10, "vai pra tudo") quer o que a OpenArt vende hoje: a pessoa adiciona a Kineo como CONECTOR
// PERSONALIZADO por URL no Claude (Customize → Connectors → Add custom connector) e o Claude dirige o filme de
// verdade — cobra os créditos da PRÓPRIA conta Kineo da pessoa pelo MESMO caminho do site.
//
// É um servidor SEPARADO do conector do diretório (/api/mcp, KINEO-MCP-CLAUDE-2026-09-29): aquele está em revisão
// no Connectors Directory, que recusa conector que gera vídeo; este vive em /api/mcp/studio, fora do diretório, e só
// quem cola a URL o encontra. /api/mcp fica byte a byte como estava (o guardião prova).
//
// INTERRUPTOR ÚNICO: MCP_STUDIO_LIVE (env da Vercel).
//   ausente / 'false' / 'off' → DESLIGADO: /api/mcp/studio, o OAuth e os .well-known respondem 404 (ninguém descobre);
//   'internal'               → só contas da casa (lib/internalAccounts isInternalEmail) conseguem autorizar e chamar;
//   'true' / 'all' / 'on'    → aberto a toda conta Kineo.
// PURO: zero banco, zero rede. Guardião: scripts/test-mcp-studio-2010.mjs.
import { isInternalEmail } from '@/lib/internalAccounts'

export const MCP_STUDIO_MARK = 'KINEO-MCP-STUDIO-2010'

/** Origem canônica (sempre com www: o redirect do apex derruba cabeçalhos no cliente de conectores). */
export const STUDIO_CANONICAL_ORIGIN = 'https://www.usekineo.com'
export const STUDIO_MCP_PATH = '/api/mcp/studio'
/** A URL que a pessoa cola no Claude e o `resource` (RFC 8707) dos tokens. */
export const STUDIO_MCP_URL = `${STUDIO_CANONICAL_ORIGIN}${STUDIO_MCP_PATH}`
/** O servidor de autorização é o próprio site (issuer sem caminho → metadata em /.well-known/oauth-authorization-server). */
export const STUDIO_OAUTH_ISSUER = STUDIO_CANONICAL_ORIGIN
export const STUDIO_OAUTH_BASE_PATH = `${STUDIO_MCP_PATH}/oauth`
export const STUDIO_SCOPE = 'kineo:studio'
export const STUDIO_SCOPE_OFFLINE = 'offline_access'
export const STUDIO_SCOPES_SUPPORTED = [STUDIO_SCOPE, STUDIO_SCOPE_OFFLINE] as const
/** Caminho RFC 9728 (o cliente do Claude tenta este primeiro, depois a raiz). */
export const STUDIO_RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${STUDIO_MCP_PATH}`
export const STUDIO_RESOURCE_METADATA_URL = `${STUDIO_CANONICAL_ORIGIN}${STUDIO_RESOURCE_METADATA_PATH}`
export const STUDIO_AS_METADATA_PATH = '/.well-known/oauth-authorization-server'

export type StudioLiveMode = 'off' | 'internal' | 'all'

export function studioLiveMode(raw: string | undefined = process.env.MCP_STUDIO_LIVE): StudioLiveMode {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'true' || v === 'all' || v === 'on' || v === '1') return 'all'
  if (v === 'internal' || v === 'house' || v === 'casa') return 'internal'
  return 'off'
}

/** O conector responde a esta conta? 'off' = ninguém; 'internal' = só a casa; 'all' = qualquer conta Kineo. */
export function studioAllowsEmail(mode: StudioLiveMode, email: string | null | undefined): boolean {
  if (mode === 'all') return true
  if (mode === 'internal') return isInternalEmail(email)
  return false
}

/** Origem para o servidor falar de si (links, resource, issuer): produção = canônica; fora dela, a do pedido (dev/preview). */
export function studioPublicOrigin(requestOrigin: string, vercelEnv: string | undefined = process.env.VERCEL_ENV): string {
  return vercelEnv === 'production' ? STUDIO_CANONICAL_ORIGIN : requestOrigin
}
