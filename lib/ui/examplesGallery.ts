import type { WallVideo } from '@/lib/engineWall'
import { APPROVED_HOME_VIDEOS_SEP16 } from '@/lib/homeVideoCuration'
import { ENGINE_PAGE_LEAD } from '@/lib/publicExamples'

const engines: Record<string, { badge: string; route: string }> = {
  cinematic_ai: { badge: 'SEEDANCE 1.5', route: 'seedance' },
  cinematic_kling: { badge: 'KLING 2.5', route: 'kling' },
  cinematic_veo: { badge: 'VEO 3.1', route: 'veo' },
  cinematic_hollywood: { badge: 'KLING 3', route: 'hollywood' },
}

// Explicit founder-owned additions only. This does not change the home order,
// public visibility policy, or query private/customer renders.
export function expandExamples(existing: readonly WallVideo[]): WallVideo[] {
  const additions: WallVideo[] = [
    ...APPROVED_HOME_VIDEOS_SEP16.map(v => ({
      id: v.id, title: v.title, engine: v.engine, videoUrl: v.videoPath,
      previewUrl: v.homePreviewPath, posterUrl: v.posterPath,
      badge: engines[v.engine].badge,
      href: `/studio?engine=${engines[v.engine].route}&intent_campaign=examples_showcase`,
      publicSource: 'founder_owned_engine_example' as const,
    })),
    ...ENGINE_PAGE_LEAD.map(v => ({
      id: v.id, title: v.title, engine: v.engine, videoUrl: v.previewPath,
      posterUrl: v.posterPath, badge: engines[v.engine].badge,
      href: `/studio?engine=${engines[v.engine].route}&intent_campaign=examples_showcase`,
      publicSource: 'founder_owned_engine_example' as const,
    })),
  ]
  return Array.from(new Map([...additions, ...existing].map(v => [v.id, v])).values())
}

export function searchExamples(videos: readonly WallVideo[], query: string, engine: string): WallVideo[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return videos.filter(v => (engine === 'all' || v.engine === engine)
    && terms.every(term => `${v.title} ${v.badge}`.toLocaleLowerCase().includes(term)))
}
