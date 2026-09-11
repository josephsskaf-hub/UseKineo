import { resolveMusicDirection, type MusicDirectionInput } from '@/lib/musicDirection'
import { getLyriaMusicUrl } from '@/lib/lyriaMusic'
import { getBackgroundMusicUrl } from '@/lib/pixabayMusic'

/** Shared by classic, Hollywood and clean rebuild. No second paid music attempt. */
export async function selectMusicForScript(input: MusicDirectionInput & {
  seed?: string
  allowGeneration?: boolean
}): Promise<string | null> {
  const direction = resolveMusicDirection(input)
  console.log(`[music] direction source=${direction.source} emotion=${direction.emotion} mood=${direction.mood} enabled=${direction.enabled}`)
  if (!direction.enabled) return null
  let url: string | null = null
  if (input.allowGeneration !== false) {
    url = await getLyriaMusicUrl(null, direction.mood, direction)
  }
  // Current catalog is classified by mood, not valence. Silence is safer than
  // claiming an unauditioned emotional track is specifically sad or joyful.
  if (!url && direction.curatedFallback) url = await getBackgroundMusicUrl(input.seed, direction.mood)
  if (!url) console.log('[music] no compatible score available; preserving narration without music')
  return url
}
