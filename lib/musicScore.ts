import { resolveMusicDirection, type MusicDirectionInput } from '@/lib/musicDirection'
import { getLyriaMusicUrl, lyriaPromptFor } from '@/lib/lyriaMusic'
import { getBackgroundMusicUrl } from '@/lib/pixabayMusic'

/** Shared by classic, Hollywood and clean rebuild. No second paid music attempt. */
export async function selectMusicForScript(input: MusicDirectionInput & {
  seed?: string
  allowGeneration?: boolean
  /**
   * KINEO-FILME-RAPIDO-1710 — a trilha que o clique em gerar já pediu (lib/audioNoClique: musicaAquecida), consultada
   * com o prompt EXATO que esta função mandaria ao Lyria. string = a faixa pronta (não gera outra); null = o aquecimento
   * existia, foi esperado no orçamento de sempre e não entregou (não gera OUTRA: cai no catálogo, como no estouro de
   * hoje); undefined = sem aquecimento útil (gera como sempre). Erro dentro do gancho = undefined.
   */
  lyriaPronta?: (prompt: string) => Promise<string | null | undefined>
}): Promise<string | null> {
  const direction = resolveMusicDirection(input)
  console.log(`[music] direction source=${direction.source} emotion=${direction.emotion} mood=${direction.mood} enabled=${direction.enabled}`)
  if (!direction.enabled) return null
  let url: string | null = null
  if (input.allowGeneration !== false) {
    let aquecida: string | null | undefined
    if (input.lyriaPronta) {
      try { aquecida = await input.lyriaPronta(lyriaPromptFor(direction.mood, direction)) } catch { aquecida = undefined }
    }
    if (typeof aquecida === 'string' && aquecida) {
      console.log('[music] trilha do clique reaproveitada (KINEO-FILME-RAPIDO-1710)')
      url = aquecida
    } else if (aquecida === undefined) {
      url = await getLyriaMusicUrl(null, direction.mood, direction)
    }
  }
  // Current catalog is classified by mood, not valence. Silence is safer than
  // claiming an unauditioned emotional track is specifically sad or joyful.
  if (!url && direction.curatedFallback) url = await getBackgroundMusicUrl(input.seed, direction.mood)
  if (!url) console.log('[music] no compatible score available; preserving narration without music')
  return url
}
