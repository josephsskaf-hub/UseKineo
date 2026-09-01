// ═══ sprint-v1v4 #30 — PROVA DO CAMINHO REAL, lendo os arquivos de producao ══
// Fricção medida: 13 pessoas bateram na parede de narração em 14 dias, TODAS
// com zero vídeo antes. O caso souzadelima135 (01/09 14:21) mostra o beco:
// expansor dispara sozinho -> modelo escreve texto que ENCHE o alvo ->
// growth_limit joga fora -> tela sem UM botão (21s não cabe em 35/60/90) ->
// pessoa vai embora com 0 vídeos.
import { readFileSync } from 'node:fs'

const rota = readFileSync(new URL('../app/api/expand-script/route.ts', import.meta.url), 'utf8')
const tela = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')

let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('  ✗', nome) } }

// ── SERVIDOR ────────────────────────────────────────────────────────────────
const blocoGL = rota.slice(rota.indexOf("outcome: 'growth_limit'"), rota.indexOf("outcome: 'growth_limit'") + 2200)
t('growth_limit devolve candidate', /candidate: expandido/.test(blocoGL))
t('growth_limit devolve candidateSeconds', /candidateSeconds: Math\.round\(depois\.speech\)/.test(blocoGL))
t('growth_limit devolve candidateFits', /candidateFits: depois\.ok/.test(blocoGL))
t('candidateFits vem de depois.ok (regua do guard, nao do texto cru)',
  /const depois = narrationFit\(falaExpandida, target\)/.test(rota))
t('o teto de 2,5x NAO foi afrouxado', /export const MAX_GROWTH_FACTOR = 2\.5/.test(
  readFileSync(new URL('../lib/expandPolicy.ts', import.meta.url), 'utf8')))
t('growth_limit continua 422 (nada renderiza)', /status: 422/.test(blocoGL))
t('a resposta segue recusando (outcome growth_limit intacto)', /outcome: 'growth_limit' as ExpandOutcome/.test(rota))

// ── TIPO DO ESTADO ──────────────────────────────────────────────────────────
t('estado growth_limit tem candidate: string | null',
  /kind: 'growth_limit'; suggestedDuration: number \| null; candidate: string \| null; candidateSeconds: number/.test(tela))

// ── PORTAO DO CLIENTE ───────────────────────────────────────────────────────
const gate = tela.slice(tela.indexOf('const candidatoGL ='), tela.indexOf('const candidatoGL =') + 500)
t('so oferece se outcome for growth_limit', /data\.outcome === 'growth_limit'/.test(gate))
t('so oferece se o texto existir', /data\.candidate\.trim\(\)\.length > 0/.test(gate))
t('so oferece se o servidor disser que ENCHE (candidateFits)', /data\?\.candidateFits === true/.test(gate))
t('sem candidato, o estado nasce null (tela de hoje)', /\? \(data\.candidate as string\)\s*\n\s*: null/.test(gate))
t('os outros outcomes seguem no formato antigo', /kind: data\.outcome,/.test(tela))

// ── BOTAO ───────────────────────────────────────────────────────────────────
const iBtn = tela.indexOf("Read the writer&apos;s version")
t('o botao existe', iBtn > 0)
const bloco = tela.slice(Math.max(0, iBtn - 1400), iBtn + 120)
t('o botao so aparece com candidato', /expandState\.kind === 'growth_limit' && expandState\.candidate &&/.test(bloco))
t('o botao NAO renderiza: so abre o painel de leitura', /setExpandedScript\(texto\)/.test(bloco))
t('o botao NAO chama nenhum gerador', !/handleGenerate|submitToFal|generate-video/.test(bloco))
t('o botao marca a origem como reescrita', /setExpandedIsRewrite\(true\)/.test(bloco))
t('o botao emite evento de abertura', /script_growth_candidate_opened/.test(bloco))
t('a oferta emite evento proprio', /script_growth_candidate_offered/.test(tela))

// ── HONESTIDADE DA COPY ─────────────────────────────────────────────────────
t('painel diz que e a versao do escritor', /The writer's version — read it before we render/.test(tela))
t('a frase "suas frases estao intactas" NAO e dita para reescrita',
  /expandedIsRewrite\s*\n?\s*\? 'This is a new script, not your text finished/.test(tela))
t('a marca de reescrita e limpa em toda saida do painel',
  (tela.match(/setExpandedIsRewrite\(false\)/g) || []).length >= 5)
t('a mensagem antiga sobrevive quando NAO ha candidato',
  /expandState\.candidate \? \(/.test(tela) && /We kept yours\.<\/>/.test(tela))
t('segue dizendo que nada foi renderizado', /Nothing was rendered and no credits were used/.test(tela))

// ── NAO INVADIR A PISTA DO CODEX ────────────────────────────────────────────
const meuDiff = bloco + gate
t('nada de preco/plano/checkout no que eu escrevi',
  !/(stripe|checkout|upgrade|price|plan_|SKU|coupon)/i.test(meuDiff))

console.log(`\n${ok} passaram, ${fail} falharam`)
process.exit(fail === 0 ? 0 : 1)
