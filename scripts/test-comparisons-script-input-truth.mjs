import { readFileSync } from 'node:fs'

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const comparisons = read('lib/comparisons.ts')
const handoff = read('lib/creationHandoff.ts')
const form = read('app/youtube-shorts-from-topic/TopicGeneratorForm.tsx')
const chatgptLanding = read('app/chatgpt-to-youtube-shorts/page.tsx')

const recordStart = comparisons.indexOf("slug: 'kineo-vs-pictory'")
const recordEnd = comparisons.indexOf("slug: 'kineo-vs-submagic'", recordStart)
const record = comparisons.slice(recordStart, recordEnd)

let passed = 0
let failed = 0
const check = (label, condition) => {
  if (condition) {
    passed += 1
    console.log(`  ok  ${label}`)
  } else {
    failed += 1
    console.error(`  FAIL ${label}`)
  }
}

console.log('1 · contrato real de roteiro próprio')
check('o comparativo alvo existe', recordStart >= 0 && recordEnd > recordStart)
check('o handoff limita o texto pelo contrato de 1.000 caracteres', handoff.includes('CREATION_HANDOFF_PROMPT_MAX_CHARS = 1000') && handoff.includes('.slice(0, CREATION_HANDOFF_PROMPT_MAX_CHARS)'))
check('o formulário público bloqueia excesso sem cortar silenciosamente', form.includes('promptLimitState(topic, CREATION_HANDOFF_PROMPT_MAX_CHARS)') && !form.includes('maxLength={1000}'))
check('o contrato aceita modo verbatim', handoff.includes("export type CreationScriptMode = 'ai' | 'verbatim'"))
check('a landing de roteiro usa modo verbatim', chatgptLanding.includes('scriptMode="verbatim"'))
check('a landing preserva o handoff do autenticado', chatgptLanding.includes('preserveHandoffForSignedIn'))

console.log('2 · ficha canônica da Kineo')
check('a categoria cita tópico e roteiro colado', comparisons.includes('Turns one typed topic or a pasted production script'))
check('a ficha não exige footage', comparisons.includes('No footage is required. Start with a topic'))
check('a ficha declara o teto honesto', comparisons.includes('paste up to 1,000 characters of your own production script'))

console.log('3 · resposta visível Kineo vs Pictory')
check('a descrição admite roteiro próprio', record.includes('typed topic or pasted production script'))
check('o veredito distingue roteiro curto de material longo', record.includes('topic or a short production script'))
check('a comparação preserva a vantagem de URL/documento do Pictory', record.includes('does not import a URL or document'))
check('o limite de 1.000 caracteres aparece na decisão', record.includes('production script of up to 1,000 characters'))
check('o caminho de assunto sem roteiro continua descrito', record.includes('generate them from a topic'))
check('o caminho verbatim fica separado', record.includes('preserve the spoken lines of a production script you paste'))
check('a FAQ pergunta literalmente pelo roteiro já pronto', record.includes('I already have a Shorts script. Which one should I use?'))
check('a FAQ responde que ambos aceitam', record.includes("a: 'Both can use it."))
check('a resposta mantém o limite de produto', record.includes('fits its 1,000-character paste handoff'))
check('a resposta mantém a vantagem de edição do Pictory', record.includes('want more editing control'))

console.log('4 · mentiras antigas removidas só do registro alvo')
check('não diz mais “topic sentence and nothing else”', !record.includes('Kineo takes a topic sentence and nothing else'))
check('não diz mais que roteiro pronto torna a Kineo redundante', !record.includes('If you already have scripts you like, that part of the product is redundant'))
check('não diz mais que a Kineo sempre escreve antes de narrar', !record.includes('Kineo writes the text first'))
check('não transforma artigo longo em promessa nova', record.includes('a long article still needs to be condensed first'))

console.log(`\n${passed}/${passed + failed} verificações passaram`)
process.exit(failed ? 1 : 0)
