import ScriptToSeedanceBridge from '@/components/ScriptToSeedanceBridge'
import { ENGINE_PAGE_LEAD } from '@/lib/publicExamples'

// Resolve the founder's existing curation on the server. Pass only this approved
// sample to the client, without changing the home/gallery order or its media.
export default function PaidSeedanceBridge({ from, compact = false }: { from: string; compact?: boolean }) {
  const example = ENGINE_PAGE_LEAD.find((item) => item.engine === 'cinematic_ai'
    && item.ownershipEvidence === 'founder_confirmed_owned')
  return <ScriptToSeedanceBridge from={from} compact={compact} proof={example ? {
    id: example.id, title: example.title, src: example.previewPath, poster: example.posterPath,
  } : undefined} />
}
