import type { WallVideo } from '@/lib/engineWall'
import { FOUNDER_SHOWCASE, ENGINE_PAGE_LEAD } from '@/lib/publicExamples'

// Founder explicitly selected these nine renders by screenshot on 2026-09-24.
// Library IDs were matched to his account, engine and output duration.
// Only bounded, repository-owned previews are exposed; no customer query or URL.
const selectedOmniIds = ['1b8e12f9-83e5-411c-8fda-0b277d289934', '36a04f7b-65f7-42d9-a2ab-198b5a7f115e']
const omni: WallVideo[] = selectedOmniIds.map(id => {
  const video = FOUNDER_SHOWCASE.find(v => v.id === id)!
  const asset = id === selectedOmniIds[0] ? 'tunguska-globe' : 'robot-collision'
  return { id, title: video.title, engine: video.engine, badge: 'OMNI FLASH',
    videoUrl: `/previews/examples-hd-sep24/${asset}.mp4`, previewUrl: `/previews/examples-hd-sep24/${asset}.mp4`,
    posterUrl: `/posters/examples-hd-sep24/${asset}.webp`,
    focalPoint: id === selectedOmniIds[0] ? '50% 44%' : '50% 47%',
    href: '/studio?engine=omni&intent_campaign=examples_showcase', publicSource: 'founder_owned_engine_example' }
})

const selectedVideos: readonly WallVideo[] = [
  ...[
    { id: 'b5434412-62b9-48f5-9a10-c36e2e725c9f', title: "The lighthouse keeper's notebook", asset: 'lighthouse-selected', engine: 'cinematic_ai', badge: 'SEEDANCE 1.5', route: 'seedance' },
    { id: 'ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb', title: 'The night train and the red suitcase', asset: 'train-selected', engine: 'cinematic_kling', badge: 'KLING 2.5', route: 'kling' },
    { id: '6b9b363c-3185-4db7-a877-46b77e334f06', title: 'The volcano watcher', asset: 'volcano-selected', engine: 'cinematic_veo', badge: 'VEO 3.1', route: 'veo' },
  ].map(v => ({ id: v.id, title: v.title, engine: v.engine, badge: v.badge,
    focalPoint: v.asset === 'lighthouse-selected' ? '50% 25%' : '50% 50%',
    videoUrl: `/previews/examples-hd-sep24/${v.asset}.mp4`, previewUrl: `/previews/examples-hd-sep24/${v.asset}.mp4`,
    posterUrl: `/posters/examples-hd-sep24/${v.asset}.webp`,
    href: `/studio?engine=${v.route}&intent_campaign=examples_showcase`, publicSource: 'founder_owned_engine_example' as const })),
  ...omni,
  ...[
    { id: '0ebba562-2599-40e2-ae46-b03e67dd3a28', title: 'Tunguska: the fireball over Siberia', asset: 'tunguska-h3', engine: 'cinematic_h3', badge: 'MINIMAX H3', route: 'h3' },
    { id: '48f1007c-d9be-4702-91c6-c9f1e0c3db38', title: 'The lost plane of 1942', asset: 'plane-1942', engine: 'cinematic_ai', badge: 'SEEDANCE 1.5', route: 'seedance' },
    { id: '19e317fe-6838-4edc-9fbf-d830d62be140', title: 'Lituya Bay: the tallest wave', asset: 'lituya-h3', engine: 'cinematic_h3', badge: 'MINIMAX H3', route: 'h3' },
  ].map(v => ({ id: v.id, title: v.title, engine: v.engine, badge: v.badge,
    videoUrl: `/previews/examples-hd-sep24/${v.asset}.mp4`, previewUrl: `/previews/examples-hd-sep24/${v.asset}.mp4`,
    posterUrl: `/posters/examples-hd-sep24/${v.asset}.webp`,
    href: `/studio?engine=${v.route}&intent_campaign=examples_showcase`, publicSource: 'founder_owned_engine_example' as const })),
  ...ENGINE_PAGE_LEAD.filter(v => v.id === '90bd8367-60c6-4811-8fdd-3a5b0200eec6').map(v => ({
    id: v.id, title: v.title, engine: v.engine, badge: 'SEEDANCE 1.5',
    videoUrl: '/previews/examples-hd-sep24/castle.mp4', previewUrl: '/previews/examples-hd-sep24/castle.mp4', posterUrl: '/posters/examples-hd-sep24/castle.webp',
    href: '/studio?engine=seedance&intent_campaign=examples_showcase', publicSource: 'founder_owned_engine_example' as const,
  })),
]

// Final founder revision: robots lead, with Omni Tunguska and H3 Lituya beside them.
const featuredIds = [
  '36a04f7b-65f7-42d9-a2ab-198b5a7f115e',
  '1b8e12f9-83e5-411c-8fda-0b277d289934',
  '19e317fe-6838-4edc-9fbf-d830d62be140',
]
export const EXAMPLES_SELECTION_SEP24: readonly WallVideo[] = [
  ...featuredIds.map(id => selectedVideos.find(video => video.id === id)!),
  ...selectedVideos.filter(video => !featuredIds.includes(video.id)),
]
