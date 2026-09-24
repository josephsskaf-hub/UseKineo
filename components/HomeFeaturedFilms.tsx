import ExamplesGallery from '@/app/examples/ExamplesGallery'
import { HOME_FEATURED_FILMS } from '@/lib/ui/homeFeaturedFilms'

export default function HomeFeaturedFilms() {
  return <ExamplesGallery videos={HOME_FEATURED_FILMS} heroOnly featuredCount={4} previewActionLabel="Open Studio" />
}
