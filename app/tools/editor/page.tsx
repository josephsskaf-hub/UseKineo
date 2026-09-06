import type { Metadata } from 'next'
import VideoEditor from './VideoEditor'
import { editingTool } from '@/lib/videoEditing/settings'

export const metadata: Metadata = {
  title: 'Trim, Resize, Speed, Mute & Add Text to Video | Kineo',
  description: 'Five local video editing tools. Edit your own file in your browser and download a copy. No upload or generation credits. Up to 100 MB and 3 minutes.',
  alternates: { canonical: 'https://www.usekineo.com/tools/editor' },
}

export default function EditorPage({ searchParams }: { searchParams: { tool?: string | string[] } }) {
  return <VideoEditor initialTool={editingTool(searchParams.tool)} />
}
