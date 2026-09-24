import ExamplesGallery from '@/app/examples/ExamplesGallery'
import { HOME_FEATURED_FILMS, HOME_FEATURED_PLAYLISTS } from '@/lib/ui/homeFeaturedFilms'

export default function HomeFeaturedFilms() {
  return <ExamplesGallery videos={HOME_FEATURED_FILMS} featuredPlaylists={HOME_FEATURED_PLAYLISTS} heroOnly featuredCount={4} previewActionLabel="Open Studio" />
}
