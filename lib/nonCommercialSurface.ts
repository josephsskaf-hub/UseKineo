/** Shared script and support surfaces must not inherit checkout overlays. */
export function isNonCommercialSurface(pathname: string): boolean {
  return ['/go', '/support', '/contact', '/privacy', '/terms'].some(path => pathname === path || pathname.startsWith(path + '/'))
}
