// KINEO-IDIOMAS-15-2026-09-17 — guardião da narração em 16 línguas (inglês + 15).
// Fundador: "Você tem meu vai pro 6 idiomas… acredito que 15 idiomas esteja ok". Sem rede, sem banco.
// Carrega lib/textLanguage.ts cru (transpilado, sem alias) como os guardiões vizinhos.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
function roda(src) { const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText; const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, require); return m.exports }
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

const T = roda(rd('lib/textLanguage.ts'))
console.log('1) o catálogo')
checa('16 códigos, inglês primeiro, sem japonês/coreano (a régua conta palavras)', T.NARRATION_LANGUAGE_CODES.length === 16 && T.NARRATION_LANGUAGE_CODES[0] === 'en' && !T.NARRATION_LANGUAGE_CODES.includes('ja') && !T.NARRATION_LANGUAGE_CODES.includes('ko'))
checa('os 15 do fundador: pt es hi fr de it nl pl tr ru uk ar ur id vi', ['pt', 'es', 'hi', 'fr', 'de', 'it', 'nl', 'pl', 'tr', 'ru', 'uk', 'ar', 'ur', 'id', 'vi'].every((c) => T.NARRATION_LANGUAGE_CODES.includes(c)))
checa('narrationLanguage aceita só o catálogo (maiúscula tolerada) e devolve null fora dele', T.narrationLanguage('HI') === 'hi' && T.narrationLanguage('pt') === 'pt' && T.narrationLanguage('ja') === null && T.narrationLanguage('') === null && T.narrationLanguage(undefined) === null)
checa('LANGUAGE_NAMES cobre os 16 e mantém os nomes antigos de pt/es', Object.keys(T.LANGUAGE_NAMES).length === 16 && T.LANGUAGE_NAMES.pt === 'Brazilian Portuguese (pt-BR)' && T.LANGUAGE_NAMES.es === 'Spanish (es-419, Latin American)' && T.LANGUAGE_NAMES.hi.startsWith('Hindi'))
checa('fonte das legendas: devanágari para hindi, árabe para árabe/urdu, Montserrat para o resto', T.captionFontFor('hi') === 'Noto Sans Devanagari' && T.captionFontFor('ar') === 'Noto Sans Arabic' && T.captionFontFor('ur') === 'Noto Sans Arabic' && T.captionFontFor('ru') === 'Montserrat' && T.captionFontFor('xx') === 'Montserrat' && T.captionFontFor(undefined) === 'Montserrat')
checa('voz própria (hollywood) só en/pt/es', T.isHollywoodLanguage('en') && T.isHollywoodLanguage('pt') && T.isHollywoodLanguage('es') && !T.isHollywoodLanguage('hi') && !T.isHollywoodLanguage(''))
checa('resolveNarrationLanguage honra a escolha explícita de qualquer língua do catálogo', T.resolveNarrationLanguage('hi', 'The story of a lighthouse keeper who saw the sea rise in 1958 and told no one').language === 'hi' && T.resolveNarrationLanguage('de', 'x').switched === false)
checa('o detector (en/pt/es + fr/de/it desde 21/09) cede ao texto quando o pedido é "en"', T.resolveNarrationLanguage('en', 'La historia del tsunami de Lituya Bay en 1958: la ola más alta jamás registrada, con 524 metros, fue causada por un deslizamiento en Alaska').language === 'es')
checa('código fora do catálogo cai em inglês (e não em erro)', T.resolveNarrationLanguage('ja', 'short').language === 'en')

console.log('2) os roteiristas e as rotas leem o catálogo, não três literais')
const gs = rd('app/api/generate-script/route.ts'), ai = rd('app/api/analyze-idea/route.ts'), ad = rd('app/api/ad-script/route.ts'), ap = rd('app/api/apply-suggestion/route.ts'), ne = rd('app/api/next-episode/route.ts')
checa('generate-script: instrução genérica com LANGUAGE_NAMES e narrowing pelo catálogo', gs.includes('Write all voiceover sentences in ${LANGUAGE_NAMES[language]}') && gs.includes("const language: Language = narrationLanguage(body.language) ?? 'en'") && !gs.includes("body.language === 'pt' ? 'pt' : body.language === 'es' ? 'es' : 'en'"))
checa('analyze-idea idem', ai.includes('captions in ${LANGUAGE_NAMES[language]}') && ai.includes("narrationLanguage(body.language) ?? 'en'") && !ai.includes("body.language === 'pt' ? 'pt'"))
checa('ad-script, apply-suggestion e next-episode idem', ad.includes('${LANGUAGE_NAMES[language]}') && ap.includes('return LANGUAGE_NAMES[l]') && ne.includes("LANGUAGE_NAMES[narrationLanguage(body.language) ?? 'en']"))
const fast = rd('app/api/generate-video-fast/route.ts'), cin = rd('app/api/generate-video-cinematic/route.ts'), comp = rd('app/api/compose/route.ts'), lib = rd('lib/compose.ts')
checa('fast: sem cast para três literais', !fast.includes("as 'en' | 'pt' | 'es'"))
checa('cinematic: hollywood recusa língua sem prova ANTES do débito, com 422 e evento', /const hollywoodPath = wantsHollywood \|\| wantsH3 \|\| wantsOmni \|\| wantsS25\n[\s\S]{0,700}if \(hollywoodPath && !isHollywoodLanguage\(narrationLanguage\.language\)\) \{[\s\S]{0,900}reason: 'language_not_supported_by_engine'[\s\S]{0,200}\{ status: 422 \}/.test(cin) && cin.includes("name: 'narration_language_engine_refused'") && cin.indexOf("reason: 'language_not_supported_by_engine'") < cin.indexOf('cinematicRequestFingerprint({'))
checa('cinematic: hollywoodLanguage vem do portão (HollywoodLanguage), fingerprint pelo catálogo', cin.includes("const hollywoodLanguage: HollywoodLanguage = isHollywoodLanguage(narrationLanguage.language) ? narrationLanguage.language : 'en'") && cin.includes("language: narrationLanguageCode(body.language) ?? 'en',"))
checa('compose: fonte das legendas por idioma, setada na rota antes dos DOIS montadores', lib.includes('font_family: ACTIVE_CAPTION_FONT,') && lib.includes('export function setActiveCaptionFont(language?: unknown): string') && (comp.match(/setActiveCaptionFont\(language\)/g) || []).length === 2 && comp.includes("const language = narrationLanguage(body.language) ?? 'en'"))
checa('compose: a marca d’água continua Montserrat (texto latino)', (lib.match(/font_family: 'Montserrat'/g) || []).length === 2)
checa('generateTTS e resolveTtsVoiceIdentity aceitam o catálogo', lib.includes("language: NarrationLanguage = 'en', // KINEO-IDIOMAS-15") && lib.includes('language: NarrationLanguage, // KINEO-IDIOMAS-15'))
checa('persona/hostVoice/handoff: tipos do catálogo', !rd('lib/narration/niche-mapping.ts').includes("language: 'en' | 'pt' | 'es'") && !rd('lib/hollywood/hostVoice.ts').includes("language: 'en' | 'pt' | 'es'") && rd('lib/creationHandoff.ts').includes('export type CreationLanguage = NarrationLanguage'))

console.log('3) as telas')
const st = rd('app/(dashboard)/studio/StudioClient.tsx'), gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('Studio: seletor com as 16 línguas, lê ?language=, manda ?language= (só quando ≠ en) e guarda no go', st.includes('id="studio-narration-language"') && st.includes('{NARRATION_LANGUAGES.map((l) => (') && st.includes("const requestedLanguage = narrationLanguage(sp.get('language'))") && st.includes("if (language !== 'en') q.set('language', language)") && st.includes("prompt: finalPrompt, language }"))
checa('Studio: aviso honesto quando a língua não tem prova nos motores de voz própria', st.includes('{!isHollywoodLanguage(language) && (') && st.includes('Kling 3, H3, Omni and Seedance 2.5: English, Portuguese, Spanish only.'))
checa('Generate: estado e URL pelo catálogo', gc.includes('useState<NarrationLanguage>(initialLanguage)') && gc.includes("const initialLanguage: NarrationLanguage = narrationLanguage(requestedLanguage) ?? 'en'") && gc.includes("const language = narrationLanguage(input.language) ?? 'en'"))

console.log('4) as páginas de idioma do Projeto 1 entregam o que prometem')
const ip = rd('lib/seo/intentPages.ts'), pg = rd('app/ai-video-generator/for/[slug]/page.tsx')
checa('15 sementes com code do catálogo; japonês/coreano fora; urdu/ucraniano dentro', (ip.match(/\{ name: '[A-Za-z]+', code: '[a-z]{2}', prompt:/g) || []).length === 15 && !ip.includes("name: 'Japanese'") && !ip.includes("name: 'Korean'") && ip.includes("name: 'Urdu', code: 'ur'") && ip.includes("name: 'Ukrainian', code: 'uk'"))
checa('todo code das sementes existe no catálogo', [...ip.matchAll(/\{ name: '[A-Za-z]+', code: '([a-z]{2})', prompt:/g)].every((m) => T.NARRATION_LANGUAGE_CODES.includes(m[1])))
checa('a página manda ?language= para o Studio', pg.includes("if (language) studio.set('language', language)") && pg.includes('studioHref(p.slug, p.examplePrompt, p.engine, p.language)') && ip.includes('language: l.code,'))

// KINEO-SELECT-LEGIVEL-2026-09-21 — a lista de línguas abria branca com texto quase branco (parecia desabilitada).
console.log('5) seletor de língua legível')
{
  const st = rd('app/(dashboard)/studio/StudioClient.tsx')
  const ini = st.indexOf('id="studio-narration-language"')
  const sel = st.slice(ini, st.indexOf('</select>', ini))
  checa('select de língua com colorScheme dark (popup nativo não nasce branco)', sel.includes("colorScheme: 'dark'"))
  checa('cada option com cor e fundo explícitos', sel.includes("<option key={l.code} value={l.code} style={{ color: '#f5f5f7', background: '#131316' }}>"))
}

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
