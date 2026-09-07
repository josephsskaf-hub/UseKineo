// Founder screenshot approved 07 Sep: fog / hoodie / city / robot.
// Hero-only ordering: do not alter the catalogue or relabel an engine.
export const HERO_OPENING: Readonly<Record<string, string>> = {
  cinematic_veo: 'dc0fe3a6-f34d-40cb-91f4-da15841a2970',
  cinematic_hollywood: '216cbed2-b95f-47e7-98bc-e4c3fc3010a9',
  cinematic_h3: '8aabb05a-2492-48de-a96a-0a7875c0c8d3',
  cinematic_omni: '36a04f7b-65f7-42d9-a2ab-198b5a7f115e',
}

export function orderHeroVideos<T extends { id: string; engine: string }>(videos: readonly T[]): T[] {
  return [...videos].sort((a, b) =>
    Number(b.id === HERO_OPENING[b.engine]) - Number(a.id === HERO_OPENING[a.engine]))
}

export function heroOpeningPoster(video: { id: string; engine: string }): string | undefined {
  return video.id === HERO_OPENING[video.engine]
    ? `/posters/hero-opening-sep07/${video.id}.webp`
    : undefined
}
