/** One navigation model; legacy history URLs remain valid project detail links. */
// KINEO-NAV-4-ITENS-2026-09-25 — decisao do fundador (24/09): o app mostra 4 portas
// (Studio, Biblioteca, Anuncios, Precos) e o resto vai para "More". 14 dias: video
// 172 pessoas, Animate 11, Viral Now/roteiros 10, Imagem 4, Audio 0; os 9 pagantes
// de 45 dias so usaram video. Home saiu: o logo ja leva a /.
export const WORKSPACE_NAV = [
  { href: '/studio', label: 'Studio', icon: 'generate' },
  { href: '/library', label: 'Library', icon: 'videos' },
  { href: '/ads', label: 'Ads', icon: 'ads' },
  { href: '/pricing', label: 'Pricing', icon: 'pricing' },
] as const
/** Public "More" links shared by Sidebar and MobileNav; each shell appends its signed-in account links. */
export const MORE_NAV = [
  { href: '/viral-now', label: 'Viral Now', icon: 'viral' },
  { href: '/scripts', label: 'Scripts', icon: 'scripts' },
  { href: '/animate', label: 'Animate', icon: 'animate' },
  { href: '/images', label: 'Images', icon: 'images' },
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
  return matches(href)
}
