import { EXAMPLES_SELECTION_SEP24 } from './examplesSelectionSep24'

// Founder-approved home composition, 24 September: robots lead, then these
// three films. These are film previews, not promises of engine availability.
const HOME_FILM_IDS = [
  '36a04f7b-65f7-42d9-a2ab-198b5a7f115e',
  '1b8e12f9-83e5-411c-8fda-0b277d289934',
  '19e317fe-6838-4edc-9fbf-d830d62be140',
  '6b9b363c-3185-4db7-a877-46b77e334f06',
]

export const HOME_FEATURED_FILMS = HOME_FILM_IDS.map(id => {
  const video = EXAMPLES_SELECTION_SEP24.find(item => item.id === id)
  if (!video) throw new Error(`Missing approved home film: ${id}`)
  return { ...video, href: '/studio' }
})
