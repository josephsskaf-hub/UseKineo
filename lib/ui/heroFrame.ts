import type { WallVideo } from '@/lib/engineWall'
import { showcasePoster } from './showcaseGallery'

// The approved Omni presenters are portrait originals. Their wide previews
// contain baked-in blurred side fill; CSS cannot remove that background.
export function heroFrame(video: WallVideo) {
  const natural = video.engine === 'cinematic_omni'
  return {
    natural,
    src: natural ? video.videoUrl : (video.previewUrl ?? video.videoUrl),
    // Robot has a wide original/poster; do not substitute a cropped portrait poster.
    poster: natural && video.id !== '36a04f7b-65f7-42d9-a2ab-198b5a7f115e' ? showcasePoster(video) : video.posterUrl,
  }
}
