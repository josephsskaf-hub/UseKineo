import { MadeWithKineoFilm, showcaseFilmMetadata } from '@/components/MadeWithKineo'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export function generateMetadata({ params }: { params: { slug: string } }) {
  return showcaseFilmMetadata(params.slug, 'pt')
}
export default function Page({ params }: { params: { slug: string } }) {
  return <MadeWithKineoFilm locale="pt" slug={params.slug} />
}
