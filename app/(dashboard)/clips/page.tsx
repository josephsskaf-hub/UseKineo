// KINEO-CLIPES-2026-09-29 — /clips: um clipe de 5–15 s, uma cena, sem narração, em qualquer motor que a conta pode usar.
import ClipsClient from './ClipsClient'

export const metadata = { title: 'Clips — Kineo' }

export default function ClipsPage() {
  return <ClipsClient />
}
