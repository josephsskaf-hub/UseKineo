export type PreviewIntent = 'auto' | 'play' | 'pause'
export function shouldPlayShowcasePreview(state: {
  visible: boolean; documentVisible: boolean; reducedMotion: boolean; saveData: boolean; intent: PreviewIntent
}): boolean {
  return state.visible && state.documentVisible && state.intent !== 'pause' &&
    (state.intent === 'play' || (!state.reducedMotion && !state.saveData))
}
