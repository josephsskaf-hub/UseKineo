// KINEO-ROMANCE-ADULTO-2026-10-13 [TRAVA 8.2 — vai do fundador 13/10 'tudo sim' (romance adulto e realista)] — desfaz, EM
// MEMÓRIA, o conserto do romance adulto nos arquivos que ele tocou, para os guardiões "byte a byte igual à base" e para o
// próprio guardião (scripts/test-romance-adulto-1310.mjs) reconstruírem a base sem git:
//   · toda linha NOVA leva a marca KINEO-ROMANCE-ADULTO-2026-10-13 e sai;
//   · as linhas da base TROCADAS (abaixo, uma a uma) voltam por prefixo exato da linha nova → texto exato da base.
// Se uma linha trocada for editada depois, o prefixo para de casar, a linha some e a base fica faltando: o byte a byte
// fica vermelho (falha fechada). Conferido em 13/10: desfazRomanceAdulto(arquivo deste commit) === origin/main, nos 4.
export const MARCA_ROMANCE_ADULTO = 'KINEO-ROMANCE-ADULTO-2026-10-13'

const ROTA = 'app/api/generate-video-cinematic/route.ts'
// [arquivo, início exato da linha nova, linhas da base que ela substituiu]
export const TROCADAS_ROMANCE_ADULTO = [
  [ROTA, 'const ERA_YEAR_RE = /(?<![×✕*xX]\\s{0,2})\\b(?:1[0-8][0-9]{2}|19[0-3][0-9])\\b', ['const ERA_YEAR_RE = /\\b1[0-8][0-9]{2}\\b|\\b19[0-3][0-9]\\b/ // years 1000–1939']],
  [ROTA, "  const ctx = (context || '').slice(0, 4000).replace(RESOLUCAO_NO_PEDIDO_RE, ' ') //", ["  const ctx = (context || '').slice(0, 4000)"]],
  [ROTA, '      prompt, // KINEO-ROMANCE-ADULTO-2026-10-13 — o look vem SÓ do texto do cliente', ["      `${prompt} ${planScenes.map((s) => s.brollPrompt || '').join(' ')}`,"]],
  [ROTA, '        safeVisualPrompt: romanceAdulto.ativo && safeVisualPrompt ? ', ['        safeVisualPrompt,']],
  ['lib/cinematic/sceneStyle.ts', '  const t = semEstiloNegado(text).trim() //', ["  const t = (text ?? '').trim()"]],
  ['lib/cinematic/sceneStyle.ts', "  const t = semEstiloNegado((scriptAndVisuals || '').slice(0, 8000)) //", ["  const t = (scriptAndVisuals || '').slice(0, 8000)"]],
  ['lib/cinematic/sceneStyle.ts', "  const explicit = semEstiloNegado(explicitStyleSuffix || '') //", ["  const explicit = explicitStyleSuffix || ''"]],
  ['lib/cinematic/visualPromptPolicy.ts', "    const subject = semPessoaSemFragmento((visual || '') //", ["    const subject = (visual || '')"]],
  ['lib/cinematic/visualPromptPolicy.ts', '      .replace(PERSON_NOUN_RE, PESSOA_APAGADA)) //', ["      .replace(PERSON_NOUN_RE, ' ')"]],
  ['lib/hollywood/anchors.ts', '    const prompt = cinematicSceneStillPrompt(args) //', [
    "    const scene = (args.scenePrompt ?? '').replace(/\\s+/g, ' ').trim()",
    '    if (scene.length < 3) return null',
    "    const style = (args.styleSuffix ?? '').replace(/\\s+/g, ' ').replace(/^[,\\s]+/, '').trim()",
    '    const prompt =',
    "      `${scene}${style ? `. Consistent look across all scenes: ${style}` : ''}. ` +",
    '      `${aspectSpec(args.aspect).promptFraming}, cinematic frame, ` +',
    '      `sharp focus, ${ONE_FRAME_RULE}, no text, no letters, no watermark, no logo`',
  ]],
]

/** O arquivo `p` (caminho relativo à raiz, com '/') sem o conserto do romance adulto; null/undefined passam direto. */
export function desfazRomanceAdulto(p, s) {
  if (s == null) return s
  const crlf = s.includes('\r\n')
  const trocas = TROCADAS_ROMANCE_ADULTO.filter(([arq]) => arq === p)
  const t = (crlf ? s.replace(/\r\n/g, '\n') : s).split('\n').flatMap((l) => {
    if (!l.includes(MARCA_ROMANCE_ADULTO)) return [l]
    const troca = trocas.find(([, inicio]) => l.startsWith(inicio))
    return troca ? troca[2] : []
  }).join('\n')
  return crlf ? t.replace(/\n/g, '\r\n') : t
}

/**
 * Linha da leva do romance adulto (nova/trocada marcada, ou a linha exata da base que ela substituiu)? Para guardiões que
 * leem o `git diff` da ROTA do cinematic (só as linhas da base da rota contam: as das libs são genéricas demais).
 */
export function linhaDoRomanceAdulto(linha) {
  const l = String(linha ?? '').replace(/\r$/, '')
  return l.includes(MARCA_ROMANCE_ADULTO) || TROCADAS_ROMANCE_ADULTO.some(([arq, , base]) => arq === ROTA && base.includes(l))
}
