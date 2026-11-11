// KINEO-PLANO-PRIMEIRO-FILME-1111 [CEO 11/11, missão "média dos motores", item 7 — regra do dono: o 1º filme nunca recusa]
// O caso (11/11 01:17 UTC, /studio/create, veio do ChatGPT, conta sem filme): 348 caracteres com linguagem de câmera, modo
// "as is" → 422 "This looks like a shot plan". O conserto automático do 1º filme (KINEO-MURO-PRIMEIRO-FILME-0311) existe NA
// TELA antiga; a tela nova registrou o refusal_auto_fixed e não reenviou. Aqui o servidor faz a mesma escolha do muro, sem
// depender da tela: conta SEM filme entregue + plano de câmera → o pedido vira filme narrado no modo IA (a narradora nunca lê
// o plano; as linhas "chave: valor" viram uma linha de direção visual, como no KINEO-MONUMENTO-2026-10-13).
// Conta que já tem filme: a recusa de sempre, com o botão. Lib PURA. Guardião: scripts/test-plano-primeiro-filme-1111.mjs.

/** Linha "chave: valor" de um plano (camera: slow push-in · style: dark · "duration": 8). */
const LINHA_DE_PLANO = /^\s*["'“]?([A-Za-z][A-Za-z _-]{1,23})["'”]?\s*[:=]\s*(.+?)\s*,?\s*$/

/** O texto do plano como pedido de filme narrado: o corpo vira a ideia, as linhas de plano viram direção visual. */
export function pedidoDeFilmeDoPlano(texto: string): string {
  const direcao: string[] = []
  const corpo: string[] = []
  for (const linha of String(texto ?? '').split(/\r?\n/)) {
    const t = linha.trim()
    if (!t || /^[{}[\],]+$/.test(t)) continue
    const m = t.match(LINHA_DE_PLANO)
    if (m && !/^(clip|shot|duration|seconds|length|fps|resolution|aspect[ _-]?ratio)$/i.test(m[1].trim())) {
      const chave = m[1].trim().toLowerCase().replace(/[_-]/g, ' ')
      const valor = m[2].trim().replace(/^["'“”]+|["'“”,]+$/g, '')
      if (/^(prompt|scene|description|action|subject|story|idea|text)$/i.test(chave)) corpo.push(valor)
      else if (valor) direcao.push(`${chave} ${valor}`)
    } else if (!m) corpo.push(t)
  }
  const ideia = corpo.join(' ').replace(/\s+/g, ' ').trim()
  const visual = direcao.length ? `\nVisual direction (never read aloud) — ${direcao.join('; ')}.` : ''
  return `A short narrated film that tells this idea as a story; the narration describes what happens, never the camera.\n${ideia}${visual}`.trim()
}

/** Contagem de filmes entregues → é o 1º filme? Leitura que falha (null) = NÃO é (a recusa de sempre; nunca adivinha). */
export function ehPrimeiroFilme(filmesEntregues: number | null | undefined): boolean {
  return filmesEntregues === 0
}
