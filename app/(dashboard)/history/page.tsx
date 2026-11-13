import VideoCollection from '@/components/library/VideoCollection'
import RecreateShelf from '@/components/library/RecreateShelf' // KINEO-CAMINHOS-DO-VIDEO-1311

export const metadata = { title: 'My Videos — Kineo' }

export default function MyVideosPage() {
  return <><RecreateShelf /><VideoCollection /></> // KINEO-CAMINHOS-DO-VIDEO-1311 — Recreate e clipes prontos no topo, como na Library
}
