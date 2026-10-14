// KINEO-MODERACAO-1410 — DESFAZ, em memória, a régua completa do texto nas portas de entrada (o roteirista, a análise, o
// rascunho do Studio Ads, os Clipes e o "só este clipe"), para os guardiões que conferem esses arquivos BYTE A BYTE contra
// uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// Toda linha que o conserto tocou carrega a marca KINEO-MODERACAO-1410, e o conserto só ACRESCENTA linhas (nenhuma troca):
// a linha marcada é reconhecida pelo PREFIXO exato e removida. Linha marcada que não casa com nenhum prefixo = lança (o
// guardião fica vermelho). Cada prefixo vale UMA vez por texto. Com `arquivo` e alguma linha marcada, TODOS os prefixos
// daquele arquivo têm de aparecer (conserto pela metade também lança). scripts/test-moderacao-1410.mjs prova que, desfeito
// isto, os cinco arquivos são EXATAMENTE os do pai do 1º commit com a marca.
//
// ENCADEAMENTO no roteirista (app/api/generate-script/route.ts): este conserto veio DEPOIS do KINEO-REGUA-35-60-90-1410 e
// do KINEO-MOTOR-15S-1510 e não toca as linhas deles. Para voltar à base de antes dos três:
//   semMotor15s1510(semRegua35a90_1410(semModeracao1410(texto, 'script')), 'route').
export const MARCA_MODERACAO_1410 = 'KINEO-MODERACAO-1410'

export const ARQUIVOS_MODERACAO_1410 = {
  script: 'app/api/generate-script/route.ts',
  analyze: 'app/api/analyze-idea/route.ts',
  ads: 'app/api/ads/v2/orders/route.ts',
  clips: 'lib/clips/clipServer.ts',
  clip: 'app/api/generate-clip/route.ts',
}

const ACRESCIMOS = {
  script: [
    "import { moderateTopic } from '@/lib/safety/topicModeration' // KINEO-MODERACAO-1410",
    "    const temaModerado = await moderateTopic({ entry: 'generate-script', userId: user.id, text: topic, language }) // KINEO-MODERACAO-1410",
    '    if (!temaModerado.ok) return await recusar(temaModerado.status, { error: temaModerado.message, reason: temaModerado.reason, category: temaModerado.category, retryable: false }',
  ],
  analyze: [
    "import { moderateTopic } from '@/lib/safety/topicModeration' // KINEO-MODERACAO-1410",
    "    const temaModerado = await moderateTopic({ entry: 'analyze-idea', userId: user.id, text: prompt, language, meta: { script_mode: body.scriptMode ?? null } }) // KINEO-MODERACAO-1410",
    '    if (!temaModerado.ok) return await recusarAnalise(temaModerado.status, { error: temaModerado.message, reason: temaModerado.reason, category: temaModerado.category }',
  ],
  ads: [
    "import { moderateTopic } from '@/lib/safety/topicModeration' // KINEO-MODERACAO-1410",
    "    const temaDoAnuncio = await moderateTopic({ entry: 'ads-v2-orders', userId: user.id, text: [o.sentence, typeof cena.fields.scene === 'string' ? cena.fields.scene : null]",
    "    if (!temaDoAnuncio.ok) return v2Fail('moderation', temaDoAnuncio.status, { message: temaDoAnuncio.message, category: temaDoAnuncio.category }) // KINEO-MODERACAO-1410",
  ],
  clips: [
    "import { moderateTopic } from '@/lib/safety/topicModeration' // KINEO-MODERACAO-1410",
    "      if (verdict.ok) { const tema = await moderateTopic({ entry: 'clips', userId: account.userId, text }); if (!tema.ok) return { ok: false, reason: 'blocked', status: tema.status, message: tema.message } } // KINEO-MODERACAO-1410",
  ],
  clip: [
    "import { moderateTopic } from '@/lib/safety/topicModeration' // KINEO-MODERACAO-1410",
    "  const temaDoClipe = await moderateTopic({ entry: 'generate-clip', userId: user.id, text: prompt, meta: { seconds, aspect } }) // KINEO-MODERACAO-1410",
    "  if (!temaDoClipe.ok) return NextResponse.json({ error: temaDoClipe.message, code: 'moderation', category: temaDoClipe.category }, { status: temaDoClipe.status }) // KINEO-MODERACAO-1410",
  ],
}

/** Quantas linhas o conserto acrescentou em cada arquivo — o guardião confere contra o diff real. */
export const FORMA_MODERACAO_1410 = Object.fromEntries(Object.entries(ACRESCIMOS).map(([k, v]) => [k, { acrescimos: v.length }]))

/** O texto de ANTES deste conserto (LF). Idempotente: sem nada marcado, devolve o texto igual (só LF). */
export function semModeracao1410(s, arquivo) {
  const texto = String(s).replace(/\r\n/g, '\n')
  const acrescimos = arquivo ? ACRESCIMOS[arquivo] : Object.values(ACRESCIMOS).flat()
  if (!acrescimos) throw new Error('desfaz-moderacao-1410: arquivo desconhecido: ' + arquivo)
  const usadas = new Set()
  const out = []
  let marcadas = 0
  for (const l of texto.split('\n')) {
    if (!l.includes(MARCA_MODERACAO_1410)) { out.push(l); continue }
    marcadas++
    const a = acrescimos.findIndex((p, i) => l.startsWith(p) && !usadas.has(i))
    if (a < 0) throw new Error('desfaz-moderacao-1410: linha marcada inesperada: ' + l.slice(0, 120))
    usadas.add(a)
  }
  if (arquivo && marcadas > 0 && usadas.size !== acrescimos.length) {
    throw new Error(`desfaz-moderacao-1410: forma inesperada em ${arquivo} (${usadas.size} de ${acrescimos.length} entradas)`)
  }
  return out.join('\n')
}
