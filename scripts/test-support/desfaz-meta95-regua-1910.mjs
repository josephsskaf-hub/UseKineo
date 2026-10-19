// KINEO-META95-REGUA-1910 — DESFAZ, em memória, o rastro da régua 95 no roteirista (app/api/generate-script/route.ts), para os
// guardiões que conferem a rota BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-).
//
// O conserto tocou a rota em UM lugar: 3 linhas de comentário (a 1ª com a marca e o selo [TRAVA 8.2]) acima do `metadata:` do
// evento script_written, e o começo desse `metadata:` ganhou `original_idea` e `script_head`. Desfaz: tira as 3 linhas e devolve
// o `metadata:` à forma de antes. Marca presente sem a forma exata = lança (o guardião fica vermelho). Sem a marca, ou outro
// arquivo, devolve o texto igual (idempotente sobre a base). Preserva CRLF.
// ENCADEAMENTO: é a camada MAIS NOVA da rota. semModeracao1410 (desfaz-moderacao-1410.mjs) chama esta PRIMEIRO, então toda a
// cadeia de sempre — semMotor15s1510(semRegua35a90_1410(semModeracao1410(texto, 'script')), 'route') — volta à base sem tocar
// nos guardiões que a usam (test-moderacao-1410, test-motor-15s-1510, test-primeiro-filme-1310, test-regua-35-60-90-1410).
export const MARCA_META95_REGUA_1910 = 'KINEO-META95-REGUA-1910'
export const ROTA_META95_REGUA_1910 = 'app/api/generate-script/route.ts'

const COMENTARIOS = [
  '      // [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-META95-REGUA-1910 — só RASTRO (nada muda na resposta): a IDEIA',
  '      // ORIGINAL que a pessoa digitou, antes da IA escrever o roteiro, e o começo do roteiro que saiu (para o juiz coherence_v2',
  '      // casar este evento com o nascimento do filme e julgar a fidelidade à ideia, não ao roteiro que a própria IA escreveu).',
]
const DEPOIS = '      metadata: { original_idea: topic.slice(0, 4000), script_head: script.slice(0, 200), engine: '
const ANTES = '      metadata: { engine: '

/** O texto da rota sem o rastro da régua 95. `rel` = caminho do arquivo (padrão: a rota do roteirista). */
export function semMeta95Regua1910(texto, rel = ROTA_META95_REGUA_1910) {
  if (typeof texto !== 'string' || rel !== ROTA_META95_REGUA_1910 || !texto.includes(MARCA_META95_REGUA_1910)) return texto
  const crlf = texto.includes('\r\n')
  const linhas = texto.replace(/\r\n/g, '\n').split('\n')
  const i = linhas.indexOf(COMENTARIOS[0])
  if (i < 0 || linhas[i + 1] !== COMENTARIOS[1] || linhas[i + 2] !== COMENTARIOS[2] || !linhas[i + 3]?.startsWith(DEPOIS)) {
    throw new Error('desfaz-meta95-regua-1910: a marca está na rota mas a forma exata não (conserto mudou ou ficou pela metade)')
  }
  const out = [...linhas.slice(0, i), ANTES + linhas[i + 3].slice(DEPOIS.length), ...linhas.slice(i + 4)].join('\n')
  if (out.includes(MARCA_META95_REGUA_1910)) throw new Error('desfaz-meta95-regua-1910: sobrou linha com a marca na rota')
  return crlf ? out.replace(/\n/g, '\r\n') : out
}
