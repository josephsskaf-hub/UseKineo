import { MadeWithKineoGallery, showcaseMetadata, showcasePageNumber } from '@/components/MadeWithKineo'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const metadata = showcaseMetadata('es')

export default function Page({ searchParams }: { searchParams: { page?: string | string[] } }) {
  return <MadeWithKineoGallery locale="es" page={showcasePageNumber(searchParams.page)} />
}
