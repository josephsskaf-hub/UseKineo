/** One navigation model; legacy history URLs remain valid project detail links. */
export const WORKSPACE_NAV = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/studio', label: 'Video', icon: 'generate' },
  { href: '/images', label: 'Images', icon: 'images' },
  { href: '/audio', label: 'Audio', icon: 'audio' },
  { href: '/library', label: 'Library', icon: 'videos' },
] as const
export const GROW_NAV = [
  { href: '/autopilot', label: 'Autopilot', icon: 'autopilot' },
  { href: '/viral-now', label: 'Viral Now', icon: 'viral' },
  { href: '/channel', label: 'Channel Builder', icon: 'channel' },
] as const
export function workspaceNavActive(pathname: string, href: string): boolean {
  const matches = (path: string) => pathname === path || pathname.startsWith(path + '/')
  if (href === '/') return pathname === '/'
  if (href === '/library') return ['/library', '/history', '/my-videos'].some(matches)
  if (href === '/studio') return ['/studio', '/generate', '/avatar', '/animate'].some(matches)
  return matches(href)
}
