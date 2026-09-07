// KINEO-HANDOFF-ERROR-VISIVEL-2026-09-06 — guardião do erro do deep link que
// deixou de ser mudo.
//
// O DEFEITO QUE ELE IMPEDE DE VOLTAR: app/make/route.ts valida o link que um
// assistente (ChatGPT, Claude, Perplexity, Gemini) escreveu e, ao reprovar, faz
// 302 para /chatgpt-to-youtube-shorts?handoff_error=<slug>. Em 06/09 o slug era
// calculado, viajava na URL e era JOGADO FORA: nenhum leitor. A pessoa caía
// numa página de marketing muda e o assistente nunca aprendia que errou.
//
// O QUE ELE PROVA (tudo LIDO do texto real com readFileSync, sem alias `@/` —
// 72 testes do repo morrem no resolver antes da 1ª verificação):
//   (1) TODO slug que a rota produz tem frase no mapa da página — extraído da
//       lista HANDOFF_ERROR_SLUGS, dos `return '<slug>'` de errorSlug() e dos
//       `landing(origin, '<slug>')` literais. Slug novo sem frase = vermelho.
//   (2) O mapa é FECHADO: o componente só renderiza depois de
//       hasOwnProperty(messages, requested); o valor cru da URL nunca entra no
//       JSX; sem dangerouslySetInnerHTML.
//   (3) Nenhum número proibido (5000/200/35/60/90) nem nome de motor digitado
//       no bloco do aviso — tudo interpolado de @/lib/gptHandoff e @/lib/aspect,
//       e cada nome importado EXISTE exportado na lib.
//   (4) A âncora vem de HANDOFF_ID (prop handoffId), nunca de string.
//   (5) O evento gpt_handoff_error_shown carrega { slug } e só dispara DEPOIS
//       do guard da lista fechada; o sink /api/events não o recusa.
//   (6) Fronteira servidor/cliente: a página segue force-static; o componente
//       é 'use client', lê window.location (não useSearchParams, que exigiria
//       Suspense em página estática) e NÃO importa @/lib/gptHandoff (node:crypto
//       quebraria o build da Vercel com tsc verde).
//
// CRLF: a árvore de trabalho no Windows tem CRLF; normalizamos na leitura para
// regex de múltiplas linhas não dar falso vermelho (lição registrada).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')

const make = read('app/make/route.ts')
const page = read('app/chatgpt-to-youtube-shorts/page.tsx')
const notice = read('app/chatgpt-to-youtube-shorts/HandoffErrorNotice.tsx')
const handoffLib = read('lib/gptHandoff.ts')
const aspectLib = read('lib/aspect.ts')
const eventsSink = read('app/api/events/route.ts')

let pass = 0
const fails = []
function check(label, cond) {
  if (cond) pass += 1
  else fails.push(label)
}

// ─── (0) Os dois lados falam do MESMO parâmetro e da MESMA página ───────────
const landingMatch = make.match(/const LANDING = '([^']+)'/)
check('(0) a rota declara LANDING', Boolean(landingMatch))
check('(0) LANDING da rota é a página que lê o parâmetro', landingMatch?.[1] === '/chatgpt-to-youtube-shorts')
const paramInRoute = make.match(/\?(handoff_error)=\$\{slug\}/)
check('(0) a rota escreve ?handoff_error=${slug}', Boolean(paramInRoute))
check("(0) o componente lê o MESMO nome de parâmetro (HANDOFF_ERROR_PARAM = 'handoff_error')", /export const HANDOFF_ERROR_PARAM = 'handoff_error'/.test(notice) && paramInRoute?.[1] === 'handoff_error')
check('(0) o componente lê o parâmetro pela constante, não por string solta', /new URLSearchParams\(window\.location\.search\)\.get\(HANDOFF_ERROR_PARAM\)/.test(notice))

// ─── (1) TODO slug da rota tem frase no mapa da página ──────────────────────
const listMatch = make.match(/const HANDOFF_ERROR_SLUGS = \[([\s\S]*?)\] as const/)
check('(1) a rota tem a lista fechada HANDOFF_ERROR_SLUGS', Boolean(listMatch))
const listed = listMatch ? [...listMatch[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : []
const fnMatch = make.match(/function errorSlug\(message: string\): HandoffErrorSlug \{([\s\S]*?)\n\}/)
check('(1) a rota tem errorSlug()', Boolean(fnMatch))
const returned = fnMatch ? [...fnMatch[1].matchAll(/return '([a-z_]+)'/g)].map((m) => m[1]) : []
const literal = [...make.matchAll(/landing\(origin, '([a-z_]+)'\)/g)].map((m) => m[1])
const routeSlugs = [...new Set([...listed, ...returned, ...literal])]
check('(1) a extração dos slugs da rota não veio vazia (a lista tem >= 11)', listed.length >= 11 && routeSlugs.length >= 11)

const mapMatch = page.match(/const HANDOFF_ERROR_MESSAGES: Readonly<Record<string, string>> = \{\n([\s\S]*?)\n\}/)
check('(1) a página tem o mapa HANDOFF_ERROR_MESSAGES', Boolean(mapMatch))
const mapBlock = mapMatch ? mapMatch[1] : ''
const pageKeys = [...mapBlock.matchAll(/^ {2}([a-z_]+): `/gm)].map((m) => m[1])
check('(1) a extração das chaves do mapa não veio vazia', pageKeys.length >= 11)
for (const slug of routeSlugs) {
  check(`(1) slug '${slug}' da rota tem frase no mapa da página`, pageKeys.includes(slug))
}
for (const key of pageKeys) {
  check(`(1) frase '${key}' da página corresponde a um slug que a rota produz (sem copy morta)`, routeSlugs.includes(key))
}
for (const key of pageKeys) {
  const line = mapBlock.match(new RegExp(`^ {2}${key}: \`([^\`]*)\``, 'm'))?.[1] ?? ''
  check(`(1) frase '${key}' aponta o caminho de continuar ("paste … below")`, /paste[^`]*below/i.test(line))
}

// ─── (2) Mapa FECHADO: valor cru nunca vira tela ────────────────────────────
const effectMatch = notice.match(/useEffect\(\(\) => \{([\s\S]*?)\n {2}\}, \[messages\]\)/)
check('(2) o componente tem o useEffect que lê a URL', Boolean(effectMatch))
const effect = effectMatch ? effectMatch[1] : ''
const guard = 'if (!Object.prototype.hasOwnProperty.call(messages, requested)) return'
check('(2) guard da lista fechada por hasOwnProperty (nunca `in`, nunca messages[x] truthy)', effect.includes(guard))
check('(2) `if (!requested) return` antes do guard', effect.indexOf('if (!requested) return') > -1 && effect.indexOf('if (!requested) return') < effect.indexOf(guard))
check('(2) setSlug(requested) só DEPOIS do guard', effect.indexOf(guard) > -1 && effect.indexOf('setSlug(requested)') > effect.indexOf(guard))
const jsxMatch = notice.match(/\n {2}return \(([\s\S]*?)\n {2}\)\n\}/)
check('(2) o componente tem o bloco JSX de retorno', Boolean(jsxMatch))
const jsx = jsxMatch ? jsxMatch[1] : ''
check('(2) o JSX NÃO interpola o valor cru da URL ({requested} / ${requested})', !/\{requested\}|\$\{requested\}/.test(jsx))
check('(2) o JSX NÃO interpola o slug ({slug} / ${slug}) — só a frase escolhida do mapa', !/\{slug\}|\$\{slug\}/.test(jsx))
check('(2) o JSX renderiza {message}, lido de messages[slug]', /\{message\}/.test(jsx) && /const message = messages\[slug\]/.test(notice))
check('(2) o componente não usa dangerouslySetInnerHTML', !/dangerouslySetInnerHTML/.test(notice))
check('(2) o bloco do mapa na página não usa dangerouslySetInnerHTML', !/dangerouslySetInnerHTML/.test(mapBlock))
check('(2) a página passa o mapa fechado ao componente (messages={HANDOFF_ERROR_MESSAGES})', /<HandoffErrorNotice[^>]*messages=\{HANDOFF_ERROR_MESSAGES\}/.test(page))
check('(2) `if (!slug) return null` — sem slug reconhecido, nada na tela', /if \(!slug\) return null/.test(notice))

// ─── (3) Nenhum número nem nome de motor digitado: tudo importado ───────────
const FORBIDDEN_NUMBERS = /\b(5000|200|35|60|90)\b/
const FORBIDDEN_ENGINES = /\b(Kineo 1|Seedance|Kling|Veo|MiniMax|Omni|seedance|kling|veo|hollywood|h3|omni)\b|'fast'/
check('(3) bloco do mapa sem literal 5000/200/35/60/90', !FORBIDDEN_NUMBERS.test(mapBlock))
check('(3) bloco do mapa sem nome de motor digitado', !FORBIDDEN_ENGINES.test(mapBlock))
check('(3) componente sem literal 5000/200/35/60/90', !FORBIDDEN_NUMBERS.test(notice))
check('(3) componente sem nome de motor digitado', !FORBIDDEN_ENGINES.test(notice))
const interpolations = [
  ['${SCRIPT_MAX_CHARS', 'SCRIPT_MAX_CHARS', handoffLib],
  ["${DURATIONS.join(', ')}", 'DURATIONS', handoffLib],
  ["${HANDOFF_ENGINES.join(', ')}", 'HANDOFF_ENGINES', handoffLib],
  ['${TOPIC_MAX_CHARS}', 'TOPIC_MAX_CHARS', handoffLib],
  ['${DEFAULT_LANGUAGE}', 'DEFAULT_LANGUAGE', handoffLib],
  ["${ASPECTS.join(', ')}", 'ASPECTS', aspectLib],
]
const gptImport = page.match(/import \{([^}]+)\} from '@\/lib\/gptHandoff'/)?.[1] ?? ''
const aspectImport = page.match(/import \{([^}]+)\} from '@\/lib\/aspect'/)?.[1] ?? ''
for (const [needle, name, lib] of interpolations) {
  check(`(3) o mapa interpola ${needle}`, mapBlock.includes(needle))
  const from = lib === handoffLib ? gptImport : aspectImport
  check(`(3) a página IMPORTA ${name} da lib certa`, new RegExp(`\\b${name}\\b`).test(from))
  check(`(3) ${name} EXISTE exportado na lib`, new RegExp(`export const ${name}\\b`).test(lib))
}

// ─── (4) A âncora vem de HANDOFF_ID, nunca de string ────────────────────────
check('(4) a página passa handoffId={HANDOFF_ID}', /<HandoffErrorNotice[^>]*handoffId=\{HANDOFF_ID\}/.test(page))
check('(4) o componente monta href={`#${handoffId}`}', /href=\{`#\$\{handoffId\}`\}/.test(notice))
check('(4) o componente foca a seção pela MESMA prop (focusTargetId={handoffId})', /focusTargetId=\{handoffId\}/.test(notice))
check("(4) o componente NÃO digita 'chatgpt-script-handoff'", !/chatgpt-script-handoff/.test(notice))
check('(4) o clique de continuar usa OrganicCtaLink com o evento dos irmãos (organic_handoff_opened)', /<OrganicCtaLink[\s\S]*?analyticsEvent="organic_handoff_opened"/.test(jsx))

// ─── (5) O erro vira EVENTO, só quando o slug é reconhecido ─────────────────
check("(5) HANDOFF_ERROR_SHOWN_EVENT = 'gpt_handoff_error_shown'", /export const HANDOFF_ERROR_SHOWN_EVENT = 'gpt_handoff_error_shown'/.test(notice))
const emit = 'void trackEvent(HANDOFF_ERROR_SHOWN_EVENT, { slug: requested })'
check('(5) emite trackEvent(HANDOFF_ERROR_SHOWN_EVENT, { slug: requested }) — só o slug, nunca a URL', effect.includes(emit))
check('(5) a emissão vem DEPOIS do guard da lista fechada (slug inventado não dispara)', effect.indexOf(guard) > -1 && effect.indexOf(emit) > effect.indexOf(guard))
check('(5) a emissão está DENTRO do useEffect (não no render)', notice.indexOf(emit) > notice.indexOf('useEffect(') && notice.indexOf(emit) < notice.indexOf('if (!slug) return null'))
check('(5) o sink /api/events NÃO recusa o nome (não está em SERVER_ONLY_EVENTS)', !/'gpt_handoff_error_shown'/.test(eventsSink))
check('(5) trackEvent vem de @/lib/analytics (o mesmo sink do ChatGptWelcomeBanner)', /import \{ trackEvent \} from '@\/lib\/analytics'/.test(notice))

// ─── (6) Fronteira servidor/cliente e posição na página ─────────────────────
check("(6) a página continua force-static", /export const dynamic = 'force-static'/.test(page))
check("(6) o componente é 'use client'", notice.startsWith("'use client'"))
check('(6) o componente NÃO importa @/lib/gptHandoff nem gptHandoffStore (node:crypto quebra o build do cliente) — casa o import real, não o comentário', !/from '@\/lib\/gptHandoff(Store)?'/.test(notice))
check('(6) o componente NÃO usa useSearchParams (exigiria Suspense na página estática)', !/useSearchParams/.test(notice))
check('(6) a página importa o componente', /import HandoffErrorNotice from '\.\/HandoffErrorNotice'/.test(page))
check('(6) o aviso é renderizado ANTES do <h1>', page.indexOf('<HandoffErrorNotice') > -1 && page.indexOf('<HandoffErrorNotice') < page.indexOf('<h1'))
check('(6) o aviso reutiliza o vocabulário da página (cardStyle={CARD} accent={ACCENT})', /<HandoffErrorNotice[^>]*cardStyle=\{CARD\}[^>]*accent=\{ACCENT\}/.test(page))

// ─── Veredito ───────────────────────────────────────────────────────────────
if (fails.length) {
  console.error(`\n❌ ${fails.length} REPROVAÇÃO(ÕES):\n`)
  fails.forEach((f) => console.error(`   · ${f}`))
}
console.log(`${pass + fails.length} verificações, ${fails.length} falhas`)
process.exit(fails.length ? 1 : 0)
