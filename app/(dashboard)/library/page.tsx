// KINEO-LIBRARY-2026-08-17 — hub de assets do usuario (fundador: "a pessoa
// ver os projetos que ela tem — videos, imagens, audios — num menu so").
import LibraryClient from './LibraryClient'

export const metadata = { title: 'Library — Kineo' }

export default function LibraryPage() {
  return <LibraryClient />
}
