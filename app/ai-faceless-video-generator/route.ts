// KINEO-SAASHUB-404-2026-10-08 — a ficha da Kineo no SaaSHub (e o envio de agosto ao Faceless Directory) aponta para
// /ai-faceless-video-generator, que nunca existiu: o SaaSHub leu o 404 e pôs a Kineo como "Discontinued" no
// "Product Graveyard". A página real é /faceless-video-generator. O 301 mora numa rota, e não no next.config.js, porque o
// next.config.js está congelado pelo guardião crítico do CI (scripts/test-five-improvements.mjs) até a correção entre pistas.
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const DESTINATION = '/faceless-video-generator'

function permanentRedirect(req: NextRequest) {
  const url = new URL(DESTINATION, req.url)
  url.search = req.nextUrl.search
  return NextResponse.redirect(url, 301)
}

export function GET(req: NextRequest) {
  return permanentRedirect(req)
}

export function HEAD(req: NextRequest) {
  return permanentRedirect(req)
}
