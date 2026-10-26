import { MadeWithKineoGallery, showcaseMetadata, showcasePageNumber } from '@/components/MadeWithKineo'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const metadata = showcaseMetadata('pt')

export default function Page({ searchParams }: { searchParams: { page?: string | string[] } }) {
  return <MadeWithKineoGallery locale="pt" page={showcasePageNumber(searchParams.page)} />
}
