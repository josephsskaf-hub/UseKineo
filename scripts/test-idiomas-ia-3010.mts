// KINEO-IDIOMAS-IA-3010 — guardião: as 9 línguas novas têm página própria (ChatGPT cita página de língua: /for/urdu = 93 visitas em 14 d),
// só línguas que o produto narra e legenda (lib/textLanguage), e o llms.txt aponta para elas. Japonês/coreano/chinês/tailandês seguem fora.
import { getIntentPage, INTENT_SLUGS } from '../lib/seo/intentPages'
import { readFileSync } from 'node:fs'
let ok = 0, f = 0
const check = (n: string, c: boolean) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }
const NOVAS: Array<[string, string]> = [['hebrew', 'he'], ['swedish', 'sv'], ['danish', 'da'], ['finnish', 'fi'], ['czech', 'cs'], ['greek', 'el'], ['romanian', 'ro'], ['malay', 'ms'], ['bulgarian', 'bg']]
const catalogo = readFileSync(new URL('../lib/textLanguage.ts', import.meta.url), 'utf8')
const llms = readFileSync(new URL('../lib/seo/trafego2310.ts', import.meta.url), 'utf8')
for (const [slug, code] of NOVAS) {
  const p = getIntentPage(slug)
  check(`${slug}: página existe com a língua ${code}`, !!p && p.language === code && p.family === 'language')
  check(`${slug}: ${code} está no catálogo de narração`, catalogo.includes(`code: '${code}'`))
  check(`${slug}: llms.txt aponta para a página`, llms.includes(`/ai-video-generator/for/${slug})`))
}
check('japonês, coreano, chinês e tailandês seguem sem página (a régua conta palavras)', ['japanese', 'korean', 'chinese', 'thai'].every((s) => !getIntentPage(s)))
check('as 15 línguas antigas continuam', ['spanish', 'urdu', 'dutch', 'polish'].every((s) => INTENT_SLUGS.includes(s)))
console.log(`${f ? '🔴' : '🟢'} idiomas-ia-3010: ${ok}/${ok + f}`)
if (f) process.exit(1)
