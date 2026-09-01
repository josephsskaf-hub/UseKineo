// ═══════════════════════════════════════════════════════════════════════════
// sprint-v1v4 #45 — o bloco de notas da espera pedia invencao e nao media nada
//
// O QUE ESTE TESTE PROVA, lendo os ARQUIVOS REAIS e o DIFF (nunca uma copia):
//   1. o cartao da espera passou a ter impressao (montagem + visibilidade real)
//   2. o atalho de um toque existe, salva DIRETO e vem marcado como 'chip'
//   3. a semente do atalho e a MESMA do botao de serie da tela de video pronto
//   4. nada de preco/plano/credito/cupom/checkout entrou no diff
//   5. nenhum render dispara daqui (a trava do #14 continua de pe)
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

let ok = 0
const falhas = []
function v(nome, cond) {
  if (cond) ok++
  else falhas.push(nome)
}

const GC = 'app/(dashboard)/generate/GenerateClient.tsx'
const src = readFileSync(GC, 'utf8')
const fila = readFileSync('lib/proximoEpisodioFila.ts', 'utf8')
const diff = execSync(`git diff -- "${GC}"`, { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 })
const mais = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))
const menos = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'))

// ── 1. o diff existe e e pequeno ──────────────────────────────────────────
v('diff nao vazio', mais.length > 0)
v('diff cabe numa leitura humana (<200 linhas +)', mais.length < 200)
// Um unico arquivo de PRODUTO. `docs/` (o diario) e `scripts/` (este teste)
// nao sao produto e nao contam — o que nao pode acontecer e a rodada espalhar
// mudanca por telas que ninguem pediu.
const tocados = execSync('git status --porcelain', { encoding: 'utf8' })
  .split('\n').map((l) => l.slice(3).trim()).filter(Boolean)
const produto = tocados.filter((f) => !f.startsWith('docs/') && !f.startsWith('scripts/'))
v('um arquivo so de produto mexido', produto.length === 1 && produto[0].includes('GenerateClient.tsx'))

// ── 2. impressao ──────────────────────────────────────────────────────────
v('evento next_idea_wait_shown existe', src.includes("trackEvent('next_idea_wait_shown'"))
v('evento sai do call site do cartao', /NextIdeaDuringWait[\s\S]{0,900}next_idea_wait_shown/.test(src))
v('impressao carrega o estagio', /next_idea_wait_shown'[\s\S]{0,240}stage: phase/.test(src))
v('impressao carrega o modo', /next_idea_wait_shown'[\s\S]{0,240}mode,/.test(src))
v('impressao diz se havia sugestao', /next_idea_wait_shown'[\s\S]{0,260}com_sugestao/.test(src))
v('prop onShown declarada', /onShown\?: \(visivel: boolean\) => void/.test(src))
v('visibilidade real por IntersectionObserver', src.includes('new IntersectionObserver') && /threshold: 0\.5/.test(src))
v('observer so no cartao da espera', (src.match(/cartaoRef/g) || []).length >= 3)
v('observer desliga depois da 1a vista', /vistoRef\.current = true[\s\S]{0,120}obs\.disconnect\(\)/.test(src))
v('montagem manda visivel:false', /impressaoRef\.current = true\s*\n\s*onShown\?\.\(false\)/.test(src))
v('vista manda visivel:true', /onShown\?\.\(true\)/.test(src))
v('impressao dispara uma vez so (latch de montagem)', /if \(impressaoRef\.current\) return/.test(src))
v('nao mede quem ja guardou ideia', (src.match(/if \(jaTem\) return/g) || []).length >= 2)
v('IntersectionObserver protegido em ambiente sem DOM', src.includes("typeof IntersectionObserver === 'undefined'"))

// ── 3. o atalho ───────────────────────────────────────────────────────────
v('atalho renderiza um botao', /onSave\(atalho, 'chip'\)/.test(src))
v('atalho salva DIRETO (nao preenche o campo)', !/setTexto\(atalho\)/.test(src))
v('atalho so aparece com semente', /\{atalho \? \(/.test(src))
v('sem semente o cartao nao ganha botao novo', /\) : null\}\s*<\/div>\s*\)\s*\}/.test(src))
v('rotulo do atalho fala de serie', src.includes('Or keep the series going'))
const rotuloAtalho = (src.match(/Or keep the series going[\s\S]{0,220}?\u2192\n/) || [''])[0]
v('rotulo do atalho existe para ser lido', rotuloAtalho.length > 20)
v('rotulo do atalho nao fala de preco/credito/plano', !/(credit|price|\$\d|plan|upgrade|free)/i.test(rotuloAtalho))
v('atalho corta rotulo longo', /atalho\.length > 64/.test(src))

// ── 4. a semente e a mesma do botao de serie do done ──────────────────────
v('call site usa analysis?.title ?? prompt', /sugestao=\{analysis\?\.title \?\? prompt\}/.test(src))
v('done_screen usa a MESMA expressao', /handleContinueSeries\(analysis\?\.title \?\? prompt, 'done_screen'/.test(src))
v('atalho passa pela regua da fila', /normalizarIdeia\(cru\)/.test(src))
v('atalho recusa texto de varias linhas', /cru\.includes\('\\n'\)/.test(src))
v('regua da fila e a unica (import, nao copia)', /normalizarIdeia,?/.test(src.slice(0, 12000)) && fila.includes('export function normalizarIdeia'))

// ── 5. o evento separa digitado de atalho ─────────────────────────────────
v("handler aceita origem", /origem: 'typed' \| 'chip' = 'typed'/.test(src))
v('next_idea_queued carrega source', /next_idea_queued'[\s\S]{0,260}source: origem/.test(src))
v('assinatura do onSave acompanha', /onSave: \(texto: string, origem\?: 'typed' \| 'chip'\) => boolean/.test(src))
v('digitar continua sem passar origem (default typed)', /if \(onSave\(texto\)\) setTexto\(''\)/.test(src))
v('serie historica intacta: next_idea_queued nao foi renomeado', src.includes("trackEvent('next_idea_queued'"))
v('next_idea_started intacto', src.includes("trackEvent('next_idea_started'"))
v('next_idea_cleared intacto', src.includes("trackEvent('next_idea_cleared'"))

// ── 6. a trava do #14: a espera NAO gera ──────────────────────────────────
v('nenhum fetch novo no diff', !mais.some((l) => /fetch\(/.test(l)))
v('nenhum router.push novo no diff', !mais.some((l) => /router\.push/.test(l)))
v('nenhuma chamada de geracao no diff', !mais.some((l) => /generate-video|\/api\/compose|handleGenerate|submitTo/.test(l)))
v('o cartao continua so escrevendo no localStorage', /salvarIdeiaNaFila\(texto, phase\)/.test(src))

// ── 7. fronteira com o Codex ─────────────────────────────────────────────
const proibidas = /(stripe|checkout|price|pricing|credits?|cupom|coupon|plan(o)?s?\b|upgrade|SKU|trial|paywall)/i
// Comentario nao e comportamento: a linha que DESCREVE a fronteira nao pode
// ser lida como se a atravessasse. So codigo entra na peneira.
const soCodigo = (l) => !/^\+\s*(\/\/|\*|\/\*)/.test(l)
const suspeitas = mais.filter((l) => soCodigo(l) && proibidas.test(l))
v('nenhuma linha + toca preco/plano/credito/checkout', suspeitas.length === 0)
v('nenhuma linha - removida da pista do Codex', menos.filter((l) => !/^-\s*(\/\/|\*|\/\*)/.test(l) && proibidas.test(l)).length === 0)
v('nenhum arquivo do Codex no diff', !execSync('git diff --name-only', { encoding: 'utf8' }).match(/stripe|checkoutPricing|marketingPrice|growth\/|Offer|Upgrade/i))
v('vitrine de motores intocada', !execSync('git diff --name-only', { encoding: 'utf8' }).match(/engineWall|EngineCycleCard|previews/i))

// ── 8. o que NAO podia mudar ─────────────────────────────────────────────
v('WaitingShowcase segue antes do cartao', src.indexOf('<WaitingShowcase />') < src.indexOf('<NextIdeaDuringWait'))
v('estado "ja guardado" intacto', src.includes('Video #2 is lined up'))
v('copy do campo intacta', src.includes("Type it now and it&apos;ll be waiting the second this video is ready."))
v('botao Line it up intacto', src.includes('Line it up'))
v('placeholder intacto', src.includes('e.g. Why the Titanic wreck is disappearing'))
v('teto de 180 do campo intacto', /maxLength=\{180\}/.test(src))

console.log(`\n${ok} verificacoes OK, ${falhas.length} falhas`)
if (falhas.length) {
  for (const f of falhas) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('sprint-v1v4 #45 — o cartao da espera agora e medido e tem atalho de um toque.\n')
