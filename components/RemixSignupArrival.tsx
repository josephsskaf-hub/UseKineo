'use client'

// KINEO-REMIX-PAGINAS-3110 — chegou no Studio pelo "Make your own version" de um filme compartilhado (/v/<id>): pede
// ao servidor (POST /api/remix/signup) que confira se a conta é NOVA e, se for, grave `remix_signup` com o filme de
// origem — uma vez por conta, decidido lá. Uma chamada por aba; não toca na caixa, não navega, não gasta crédito.
// Montado por components/StudioIdeaArrival.tsx (a chegada do cadastro no Studio). Vale também para o cadastro por
// e-mail com ?redirect, que pousa no Studio sem ?welcome.
import { useEffect } from 'react'
import { remixSourceFromDestination } from '@/lib/remixPaginas3110'

export default function RemixSignupArrival() {
  useEffect(() => {
    let source: string | null = null
    try {
      source = remixSourceFromDestination(new URLSearchParams(window.location.search))
    } catch {
      return
    }
    if (!source) return
    try {
      const marker = `kineo_remix_signup:${source}`
      if (sessionStorage.getItem(marker) === '1') return
      sessionStorage.setItem(marker, '1')
    } catch { /* sem sessionStorage: o servidor deduplica por conta */ }
    void fetch('/api/remix/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceVideoId: source }),
      keepalive: true,
    }).catch(() => {})
  }, [])
  return null
}
