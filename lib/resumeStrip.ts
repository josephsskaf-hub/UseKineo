// KINEO-FAIXA-CONTINUAR-2026-09-01 — sprint v1->v4, rodada #13.
//
// Titulo legivel a partir do campo `topic` do video. E a MESMA regra que o
// /history ja usa (extractTitle em HistoryClient.tsx:159) — copiada para um
// modulo server-safe porque o pouso (app/page.tsx) e Server Component e nao
// pode importar de um arquivo 'use client'.
//
// DIFERENCA DE PROPOSITO (de proposito): o /history devolve 'Untitled Short'
// quando nao consegue ler. Aqui devolve STRING VAZIA — a faixa some sozinha em
// vez de convidar a pessoa a fazer o "episodio 2" de um titulo que nao existe.
// Falha invisivel, mesmo padrao do NextShortsSection.

const MAX_TITULO = 90

export function extractShortTitle(topic: string | null | undefined): string {
  if (!topic) return ''
  // "HOOK (0-2s): [Pexels: ...] texto do gancho"
  const hook = topic.match(/HOOK[^:]*:\s*(?:\[Pexels:[^\]]*\]\s*)?(.+?)(?:\n|$)/)
  if (hook) {
    const t = hook[1].replace(/\[Pexels:[^\]]*\]/g, '').trim()
    if (t) return t.length > MAX_TITULO ? t.slice(0, MAX_TITULO - 3) + '…' : t
  }
  const linhas = topic
    .split('\n')
    .map((l) => l.trim().replace(/\[Pexels:[^\]]*\]/gi, '').trim())
    .filter(
      (l) =>
        l.length > 15 &&
        !l.startsWith('YouTube Short') &&
        !l.startsWith('HOOK') &&
        !l.startsWith('MICRO'),
    )
  if (linhas[0]) return linhas[0].slice(0, MAX_TITULO)
  return ''
}

export type ResumeStripData = {
  title: string
  episode: number
  videoId: string
}
