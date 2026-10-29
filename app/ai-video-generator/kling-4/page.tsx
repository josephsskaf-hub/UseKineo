import type { Metadata } from 'next'
import Kling4PaidEnginePage from '@/components/Kling4PaidEnginePage'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Try Kling 4.0 — AI films and ads | Kineo',
  description: 'Create Kling 4.0 films and ads in Kineo with your narration, captions and music. Check current access, credits and subscriber promotion limits.',
  alternates: { canonical: 'https://www.usekineo.com/ai-video-generator/kling-4' },
  openGraph: { title: 'Try Kling 4.0 | Kineo', url: 'https://www.usekineo.com/ai-video-generator/kling-4', type: 'website' },
}

export default function Kling4Page() {
  return <><Kling4PaidEnginePage /><Footer /></>
}
