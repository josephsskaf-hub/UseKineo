// KINEO-SEO-COMPARE-2026-07-11 — redirect pro sistema programático indexado.
// #290 — 307 → 308 (ver a nota completa em compare/heygen-alternative).
import { permanentRedirect } from 'next/navigation'

export default function CompareInVideoRedirect() {
  permanentRedirect('/alternatives/invideo')
}
