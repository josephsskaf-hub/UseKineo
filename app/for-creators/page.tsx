import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { filmeGratisPermitido, paisDoRequest } from '@/lib/freeFilmPolicy'
import CreatorsPage from './CreatorsPage'
import './creators.css'

export const metadata: Metadata = {
  title: 'Narrated films for faceless channels | Kineo',
  description: 'Turn a channel idea into a narrated film with captions.',
  alternates: { canonical: 'https://www.usekineo.com/for-creators' },
}

export default function Page() {
  return <CreatorsPage freeFilm={filmeGratisPermitido(paisDoRequest(headers()))} />
}
