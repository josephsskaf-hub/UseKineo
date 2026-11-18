import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { filmeGratisPermitido, paisDoRequest } from '@/lib/freeFilmPolicy'
import { CREATION_HANDOFF_PROMPT_MAX_CHARS } from '@/lib/creationHandoff'
import CreatorsPage from './CreatorsPage'
import './creators.css'

export const metadata: Metadata = {
  title: 'Narrated films for faceless channels | Kineo',
  description: 'Turn a channel idea into a narrated film with captions.',
  alternates: { canonical: 'https://www.usekineo.com/for-creators' },
}

export default function Page({ searchParams }: { searchParams: { prompt?: string | string[] } }) {
  const initialIdea = typeof searchParams.prompt === 'string'
    ? searchParams.prompt.slice(0, CREATION_HANDOFF_PROMPT_MAX_CHARS)
    : ''
  return <CreatorsPage freeFilm={filmeGratisPermitido(paisDoRequest(headers()))} initialIdea={initialIdea} />
}
