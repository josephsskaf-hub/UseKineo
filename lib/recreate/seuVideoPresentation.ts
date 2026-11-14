import 'server-only'
import { KLING4_LIMITES, SEU_VIDEO_LIMITES, SEU_VIDEO_MOTOR, SEU_VIDEO_SOM_ORIGINAL, promptDoSeuVideo } from './seuVideo'
import type { SeuVideoPresentation } from './seuVideoRules'

/** Server-selected public facts. Never send model identifiers or supplier costs. */
export function seuVideoPresentation(): SeuVideoPresentation {
  const current = SEU_VIDEO_MOTOR === 'kling4'
  return Object.freeze({
    defaultPrompts: Object.freeze({
      1: promptDoSeuVideo(SEU_VIDEO_MOTOR, 1),
      2: promptDoSeuVideo(SEU_VIDEO_MOTOR, 2, ['on the left', 'on the right']),
      3: promptDoSeuVideo(SEU_VIDEO_MOTOR, 3, ['on the left', 'in the center', 'on the right']),
    }),
    resolution: current ? '720p' : '480p',
    audio: SEU_VIDEO_SOM_ORIGINAL ? 'original' : 'silent',
    waitLabel: current ? 'About 2 minutes' : 'About 3–4 minutes',
    minSeconds: current ? KLING4_LIMITES.minSegundos : SEU_VIDEO_LIMITES.minSegundos,
    maxSeconds: SEU_VIDEO_LIMITES.maxSegundos,
    minSide: current ? KLING4_LIMITES.minLado : 0,
    maxBytes: SEU_VIDEO_LIMITES.maxBytes,
    minFps: SEU_VIDEO_LIMITES.minFps,
    maxFps: SEU_VIDEO_LIMITES.maxFps,
  })
}
