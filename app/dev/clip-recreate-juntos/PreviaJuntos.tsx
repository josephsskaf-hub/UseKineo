'use client'
// KINEO-CLIP-RECREATE-JUNTOS-1511 — prévia de desenvolvimento: a MESMA ClipRecreateJuntos da tela real, com props de visitante. Só troca o tema para a foto.
import { useEffect } from 'react'
import ClipRecreateJuntos, { type RecreateProps } from '@/components/create/ClipRecreateJuntos'

export default function PreviaJuntos({ tema, recreate }: { tema: 'light' | 'dark' | null; recreate: RecreateProps }) {
  useEffect(() => { if (tema) document.documentElement.dataset.theme = tema }, [tema]) // fotos em claro e escuro sem mexer na preferência guardada
  return <ClipRecreateJuntos recreate={recreate} />
}
