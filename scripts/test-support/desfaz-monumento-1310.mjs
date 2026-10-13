// KINEO-MONUMENTO-2026-10-13 — reancoragem dos guardiões que comparam a rota do cinematic com a base, byte a byte.
//
// O conserto do monumento (lib/cinematic/monumentoReal.ts; prova: scripts/test-monumento-real-1310.mjs) entrou na rota
// com linhas NOVAS marcadas KINEO-MONUMENTO-2026-10-13 e trocou de propósito CINCO linhas da base — o contexto dos
// filtros anti-invenção (fala clássica, varredura final do hollywood, história do scrub de cenário e do supervisor)
// passou a ser comVocabularioDoLugar(...). Cada linha trocada também leva a marca.
//
// `semMonumento(texto)` tira, em memória, as linhas marcadas (lado da rota nova) e as cinco linhas exatas da base
// que elas substituíram (lado da base). Aplicado aos DOIS lados, o resto continua comparado byte a byte. Nada além
// dessas linhas é descontado: qualquer outra mudança na rota segue vermelha.
// 13/10 (parte 2, "KINEO-MONUMENTO-2026-10-13 (duração)"): o bloco do Seedance 35/60/90 que cobre a fala com imagem
// (lib/cinematic/seedanceCobreAFala.ts; prova: scripts/test-monumento-duracao-1310.mjs) entrou SÓ com linhas novas que levam a
// mesma marca — nenhuma linha da base trocada; a lista abaixo continua com as cinco.
export const MARCA_MONUMENTO = 'KINEO-MONUMENTO-2026-10-13'

export const TROCADAS_MONUMENTO = [
  '          const r = removerDatasInventadas(sc.voiceover, prompt)',
  '          const r2 = scrubInventedSetting(r.texto, prompt)',
  '        const contextoDatas = prompt',
  "      const historia = `${prompt} ${scenes.map((s) => s.voiceover ?? '').join(' ')}`",
  "        const historiaAlinhada = `${prompt} ${scenes.map((sc) => sc.voiceover ?? '').join(' ')}`",
]

/** A linha é da leva do monumento (nova/trocada marcada, ou a linha exata da base que ela substituiu)? */
export function linhaDoMonumento(linha) {
  const l = String(linha ?? '').replace(/\r$/, '')
  return l.includes(MARCA_MONUMENTO) || TROCADAS_MONUMENTO.includes(l)
}

/** O texto sem as linhas da leva do monumento (aplicar aos DOIS lados da comparação). null passa direto. */
export function semMonumento(texto) {
  if (texto == null) return texto
  return String(texto).replace(/\r\n/g, '\n').split('\n').filter((l) => !linhaDoMonumento(l)).join('\n')
}
