// Approved media-only changes. Every target is counted; no reset of the historical base.
export const CLIPS_VISIVEL_1711 = [
  ["import { CLIPS_TELA_CSS,", "import VisibleClipVideo from '@/components/clips/VisibleClipVideo'\nimport { CLIPS_TELA_CSS,", 1],
  ['<video src={sc.video} poster={sc.poster} autoPlay muted loop playsInline preload="metadata" style={{ objectPosition: sc.focus }} />', '<VisibleClipVideo src={sc.video} poster={sc.poster} autoPlay muted loop playsInline style={{ objectPosition: sc.focus }} />', 1],
  ['<video src={remix.video} poster={remix.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />', '<VisibleClipVideo src={remix.video} poster={remix.poster} autoPlay muted loop playsInline aria-hidden="true" />', 1],
  ['<video src={tr.preview.video} poster={tr.preview.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />', '<VisibleClipVideo src={tr.preview.video} poster={tr.preview.poster} autoPlay muted loop playsInline aria-hidden="true" />', 1],
  ['<video src={fx.preview!.video} poster={fx.preview!.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />', '<VisibleClipVideo src={fx.preview!.video} poster={fx.preview!.poster} autoPlay muted loop playsInline aria-hidden="true" />', 1],
  ['<video src={rx.video} poster={rx.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />', '<VisibleClipVideo src={rx.video} poster={rx.poster} autoPlay muted loop playsInline aria-hidden="true" />', 1],
  ['<video src={fx.preview.video} poster={fx.preview.poster} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />', '<VisibleClipVideo src={fx.preview.video} poster={fx.preview.poster} autoPlay muted loop playsInline aria-hidden="true" />', 1],
  ['<video src={c.video_url} controls playsInline preload="metadata" />', '<VisibleClipVideo src={c.video_url} controls playsInline style={{ aspectRatio: c.aspect === \'16:9\' ? \'16 / 9\' : c.aspect === \'1:1\' ? \'1 / 1\' : \'9 / 16\', objectFit: \'contain\' }} />', 1],
]
export function comClipsVisivel1711(source) {
  return CLIPS_VISIVEL_1711.reduce((s, [before, after, count]) => {
    if (s.split(before).length - 1 !== count) throw Error('Clips visibility target changed: ' + before.slice(0, 80))
    return s.split(before).join(after)
  }, source)
}
