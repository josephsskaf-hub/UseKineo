/** One navigation model; legacy history URLs remain valid project detail links. */
// KINEO-NAV-4-ITENS-2026-09-25 — decisao do fundador (24/09): o app mostra 4 portas
// (Studio, Biblioteca, Anuncios, Precos) e o resto vai para "More". 14 dias: video
// 172 pessoas, Animate 11, Viral Now/roteiros 10, Imagem 4, Audio 0; os 9 pagantes
// de 45 dias so usaram video. Home saiu: o logo ja leva a /.
export const WORKSPACE_NAV = [
  { href: '/studio', label: 'Studio', icon: 'generate' },
  // KINEO-MENU-4-VIDEO-IMAGEM-2026-09-25 — Imagem é porta do topo (fundador 25/09); espelha na lateral e no mobile.
  { href: '/images', label: 'Images', icon: 'images' },
  { href: '/ads/new', label: 'Ads', icon: 'ads' },
  { href: '/library', label: 'Library', icon: 'videos' },
  { href: '/pricing', label: 'Pricing', icon: 'pricing' },
] as const
/** Public "More" links shared by Sidebar and MobileNav; each shell appends its signed-in account links. */
export const MORE_NAV = [
  { href: '/viral-now', label: 'Viral Now', icon: 'viral' },
  { href: '/scripts', label: 'Scripts', icon: 'scripts' },
  { href: '/animate', label: 'Animate', icon: 'animate' },
  { href: '/audio', label: 'Audio', icon: 'audio' },
  // Autopilot e Channel Builder moravam no grupo Grow; seguem alcancaveis aqui.
  { href: '/autopilot', label: 'Autopilot', icon: 'autopilot' },
  { href: '/channel', label: 'Channel Builder', icon: 'channel' },
] as const
export function workspaceNavActive(pathname: string, href: string): boolean {
  const matches = (path: string) => pathname === path || pathname.startsWith(path + '/')
  if (href === '/') return pathname === '/'
  if (href === '/library') return ['/library', '/history', '/my-videos'].some(matches)
  // Animate virou item proprio do "More" (KINEO-NAV-4-ITENS-2026-09-25).
  if (href === '/studio') return ['/studio', '/generate', '/avatar'].some(matches)
  if (href === '/ads/new') return matches('/ads')
  return matches(href)
}

// KINEO-MENU-4-VIDEO-IMAGEM-2026-09-25 — id de medição (nav_item_clicked) por destino, para a lateral e o mobile do app
// marcarem `data-nav-item` sem ninguém digitar id à mão. Ids fixos do contrato em lib/navTelemetry (NAV_ITEM_IDS);
// o resto vira `more:<slug>`.
const NAV_ITEM_BY_HREF: Record<string, string> = {
  '/studio': 'video',
  '/images': 'image',
  '/ads': 'ads',
  '/ads/new': 'ads',
  '/library': 'library',
  '/pricing': 'pricing',
  '/examples': 'examples',
  '/business-video-ads': 'business',
  '/login': 'login',
  '/viral-now': 'more:viral',
  '/scripts': 'more:scripts',
  '/animate': 'more:animate',
  '/audio': 'more:audio',
  '/autopilot': 'more:autopilot',
  '/channel': 'more:channel',
  '/referral': 'more:invite',
  '/affiliate': 'more:affiliates',
  '/account': 'more:account',
}
export function navItemIdFor(href: string): string {
  const path = href.split('?')[0].split('#')[0]
  if (NAV_ITEM_BY_HREF[path]) return NAV_ITEM_BY_HREF[path]
  const slug = path.replace(/^\//, '').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase().slice(0, 24) || 'root'
  return 'more:' + slug
}
