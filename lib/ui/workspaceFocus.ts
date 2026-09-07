/** Suppress secondary promotions while creating or managing work, never errors/payments. */
const FOCUSED_PATHS = ['/studio', '/generate', '/create', '/library', '/history', '/my-videos', '/images', '/audio', '/avatar', '/animate', '/thumbnail-generator']
export function isFocusedWorkspace(pathname: string): boolean {
  return FOCUSED_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))
}
