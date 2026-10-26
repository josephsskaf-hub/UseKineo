import { MadeWithKineoFilm, showcaseFilmMetadata } from '@/components/MadeWithKineo'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export function generateMetadata({ params }: { params: { slug: string } }) {
  return showcaseFilmMetadata(params.slug, 'en')
}
export default function Page({ params }: { params: { slug: string } }) {
  return <MadeWithKineoFilm locale="en" slug={params.slug} />
}
