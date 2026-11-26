import { execFileSync } from 'node:child_process'

export function scenePreviewWithFilmLook(base) {
  if (base === null) return null
  // Only the exact transport additions may differ. Eligibility, limits and provider planning
  // still compare byte for byte with the base, including their consumers.
  return base
    .replace("export const PREVIA_CENAS_PUBLIC", "import type { FilmLook } from '@/lib/cinematic/filmLook2511'\n\nexport const PREVIA_CENAS_PUBLIC")
    .replace("duration?: string | null; language?: string | null }): string {", "duration?: string | null; language?: string | null; look?: FilmLook }): string {")
    .replace("q.set('language', params.language)\n", "q.set('language', params.language)\n  if (params.look) q.set('look', params.look)\n")
    .replace("script: string; language: string }", "script: string; language: string; look?: FilmLook }")
    .replace("q.set('language', r.language)\n", "q.set('language', r.language)\n  if (r.look === 'photoreal' || r.look === 'animated3d' || r.look === 'anime') q.set('look', r.look)\n")
}

export function scenePreviewTransportMatches(base, current, cwd) {
  const withStyle = scenePreviewWithFilmLook(base)
  if (withStyle === current) return true
  const blob = sha => execFileSync('git', ['show', sha + ':lib/scenePreview.ts'], { cwd, encoding: 'utf8' }).replace(/\r\n/g, '\n')
  const beforeVoice = blob('eb07dbd73e281bb3df6ae802fa50726199a8c448')
  // Somente o blob que adiciona o transporte da voz, com o mesmo portão regional.
  return (withStyle === beforeVoice || base === beforeVoice) && ['7543a8bae8034240091e1e6e855316f0cf698c88', 'a5bb4b5eec4d8290e58ac9098f9f04862857ab08', 'd0fa500fd2fcd0c67e9a08b744c4de1ad4b9fdb7'].some(ref => current === blob(ref))
}
