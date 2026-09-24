import { EXAMPLES_SELECTION_SEP24 } from './examplesSelectionSep24'
import type { WallVideo } from '@/lib/engineWall'

// Founder-approved home composition, 24 September: robots lead, then these
// three films. These are film previews, not promises of engine availability.
const HOME_FILM_IDS = [
  '36a04f7b-65f7-42d9-a2ab-198b5a7f115e',
  '1b8e12f9-83e5-411c-8fda-0b277d289934',
  '19e317fe-6838-4edc-9fbf-d830d62be140',
  '6b9b363c-3185-4db7-a877-46b77e334f06',
]

function selectedFilm(id: string, asset?: string, focalPoint?: string): WallVideo {
  const video = EXAMPLES_SELECTION_SEP24.find(item => item.id === id)
  if (!video) throw new Error(`Missing approved home film: ${id}`)
  return { ...video, href: '/studio', ...(focalPoint ? { focalPoint } : {}), ...(asset ? {
    videoUrl: `/previews/home-films-sep24/${asset}.mp4`,
    previewUrl: `/previews/home-films-sep24/${asset}.mp4`,
    posterUrl: `/posters/home-films-sep24/${asset}.webp`,
  } : {}) }
}

const robot: WallVideo = { ...selectedFilm(HOME_FILM_IDS[0], 'robot-action', '50% 47%'), previewOpening: { seconds: 3, focalPoint: '50% 15%' } }
const hoodie: WallVideo = {
  id: '216cbed2-b95f-47e7-98bc-e4c3fc3010a9', title: 'The face that looks real', engine: 'cinematic_hollywood', badge: 'KLING 3',
  videoUrl: '/previews/home-films-sep24/hoodie-scene.mp4', previewUrl: '/previews/home-films-sep24/hoodie-scene.mp4',
    posterUrl: '/posters/home-films-sep24/hoodie-scene.webp', focalPoint: '50% 48%', previewPortrait: true, href: '/studio', publicSource: 'founder_owned_engine_example',
}

// Keep the four approved openers. Add strong shots from the previous home and
// the founder's collection, without repeating a film across simultaneous cards.
export const HOME_FEATURED_PLAYLISTS: WallVideo[][] = [
  [robot, selectedFilm('48f1007c-d9be-4702-91c6-c9f1e0c3db38', 'plane-scene', '50% 35%'), selectedFilm('90bd8367-60c6-4811-8fdd-3a5b0200eec6')],
  [selectedFilm(HOME_FILM_IDS[1]), hoodie],
  [selectedFilm(HOME_FILM_IDS[2]), { ...selectedFilm('b5434412-62b9-48f5-9a10-c36e2e725c9f', 'lighthouse-scene', '50% 25%'), previewPortrait: true }],
  [selectedFilm(HOME_FILM_IDS[3], 'volcano-scene'), { ...selectedFilm('ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb', 'train-scene', '50% 24%'), previewPortrait: true }],
]
export const HOME_FEATURED_FILMS = HOME_FEATURED_PLAYLISTS.map(playlist => playlist[0])
