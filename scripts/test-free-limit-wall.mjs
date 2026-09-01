// sprint-v1v4 #43 — o muro do free que se rearmava como convite.
// Le os ARQUIVOS REAIS. Nao ha mock: se a tela mudar, este teste cai.
import { readFileSync } from 'node:fs'

const GC = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
const COMPOSE = readFileSync(new URL('../app/api/compose/route.ts', import.meta.url), 'utf8')

let ok = 0, bad = 0
const t = (nome, cond) => { if (cond) { ok++ } else { bad++; console.error('  FALHOU:', nome) } }

// ── 1. o contrato do servidor que este patch consome ──────────────────────
t('402 do free devolve outOfCredits', /outOfCredits:\s*true/.test(COMPOSE))
t('402 do free devolve free_quota_reset_at', /free_quota_reset_at:/.test(COMPOSE))
t('402 do free devolve error com a frase', /error:\s*mensagem402/.test(COMPOSE))
t('a regra continua no servidor (limite lido de FREE_OFFER)', /limite:\s*FREE_OFFER\.limit/.test(COMPOSE))

// ── 2. a memoria e de aba, nunca persistida ───────────────────────────────
t('estado freeLimitWall existe', /const \[freeLimitWall, setFreeLimitWall\] = useState</.test(GC))
t('memoria NAO vai para localStorage', !/localStorage[^\n]*[Ff]reeLimitWall|freeLimitWall[^\n]*localStorage/.test(GC))

// ── 3. so o servidor arma o muro ──────────────────────────────────────────
const helper = GC.split('function armarMuroDoFree(')[1]?.split('\n  }\n')[0] ?? ''
t('helper armarMuroDoFree existe', helper.length > 0)
t('so arma com outOfCredits === true do servidor', /data\.outOfCredits !== true\) return/.test(helper))
t('sem frase do servidor nao arma nada', /if \(!frase\) return/.test(helper))
t('helper nao inventa copy propria (nenhuma string longa em ingles)', !/'[A-Z][a-z]+ [a-z ]{25,}'/.test(helper))
t('helper nao fala de preco/plano/upgrade', !/(price|pricing|plan|upgrade|\$|USD)/i.test(helper))
t('emite free_limit_wall_shown', /free_limit_wall_shown/.test(helper))
t('mede se a frase da hora da volta veio junto', /has_reset_phrase/.test(helper))

// ── 4. os dois ramos 402 armam o muro E passam o detail que faltava ───────
const ramoDespacho = GC.split("trackGenerationFailure('clips_ready', 'compose_daily_free_limit'")[0].slice(-1200)
t('ramo de despacho arma o muro', /armarMuroDoFree\(data, 'compose_dispatch'\)/.test(ramoDespacho))
t('ramo de retomada arma o muro', /armarMuroDoFree\(data, 'compose_resume'\)/.test(GC))
const depoisDespacho = GC.split("'compose_daily_free_limit', {")[1]?.slice(0, 300) ?? ''
t('compose_daily_free_limit agora leva detail', /detail:\s*typeof data\?\.error === 'string'/.test(depoisDespacho))
const depoisResume = GC.split("'compose_resume_daily_free_limit', {")[1]?.slice(0, 300) ?? ''
t('compose_resume_daily_free_limit agora leva detail', /detail:\s*typeof data\?\.error === 'string'/.test(depoisResume))
t('os dois ramos continuam abrindo o MESMO modal de sempre', (GC.match(/openOutOfCreditsModal\('credits'\)/g) || []).length >= 3)
t('os dois ramos continuam pousando em options', /armarMuroDoFree\(data, 'compose_dispatch'\)[\s\S]{0,900}setPhase\('options'\)/.test(GC))

// ── 5. o bloqueio da segunda viagem ───────────────────────────────────────
const bloco = GC.split('if (freeLimitWall && (credits ?? 0) <= 0) {')[1]?.split('\n    }\n')[0] ?? ''
t('handleGenerate bloqueia a re-submissao', bloco.length > 0)
t('bloqueio exige saldo zero (quem tem credito passa)', /\(credits \?\? 0\) <= 0/.test(GC))
t('bloqueio mostra a frase DO SERVIDOR, nao uma minha', /setError\(freeLimitWall\.message\)/.test(bloco))
t('bloqueio mede a viagem economizada', /free_limit_resubmit_blocked/.test(bloco))
t('bloqueio NAO despacha render', !/generate_started|video_generation_started|fetch\(/.test(bloco))
t('bloqueio nao gasta credito nem toca preco', !/(credit_|debit|charge|price|checkout)/i.test(bloco))
t('bloqueio acontece ANTES do guard de duplo-clique (nao precisa soltar o ref)',
  GC.indexOf('if (freeLimitWall && (credits ?? 0) <= 0) {') < GC.indexOf('generationInFlightRef.current = true'))
t('bloqueio devolve a pessoa para options com o roteiro dela', /setPhase\('options'\)/.test(bloco))

// ── 6. os tres desarmes — ninguem fica preso ──────────────────────────────
t('desarme (a): credito > 0 apaga a memoria', /if \(typeof credits === 'number' && credits > 0\) setFreeLimitWall\(null\)/.test(GC))
t('desarme (a) roda em useEffect de credits', /useEffect\(\(\) => \{\s*\n\s*if \(typeof credits === 'number' && credits > 0\) setFreeLimitWall\(null\)\s*\n\s*\}, \[credits\]\)/.test(GC))
t('desarme (b): botao Try anyway existe', />\s*Try anyway\s*</.test(GC))
t('desarme (b): o botao apaga a memoria', /setFreeLimitWall\(null\)[\s\S]{0,120}free_limit_wall_override/.test(GC))
t('desarme (b): o botao e medido', /free_limit_wall_override/.test(GC))
t('desarme (c): sucesso do compose apaga a memoria', /setFreeLimitWall\(null\)\s*\n\s*const id = typeof data\?\.render_id/.test(GC))
t('escape hatch some enquanto algo esta rodando', /freeLimitWall && \(credits \?\? 0\) <= 0 && !isProcessingPhase\(phase\)/.test(GC))
t('escape hatch promete o que e verdade (roteiro intacto, nada cobrado)',
  /Your script stays exactly as it is\. Nothing was charged\./.test(GC))

// ── 7. fronteira com o Codex — nada de oferta, preco ou plano ─────────────
// Aqui nao vale ler o arquivo inteiro: o que interessa e o que ESTA RODADA
// acrescentou. Lemos as linhas '+' do diff contra o commit anterior.
import { execFileSync } from 'node:child_process'
const raiz = new URL('..', import.meta.url).pathname
let novas = ''
try {
  novas = execFileSync('git', ['diff', 'HEAD', '--unified=0', '--', 'app', 'lib', 'components'], { cwd: raiz, encoding: 'utf8' })
    .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n')
  if (!novas.trim()) {
    novas = execFileSync('git', ['show', 'HEAD', '--unified=0', '--', 'app', 'lib', 'components'], { cwd: raiz, encoding: 'utf8' })
      .split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n')
  }
} catch { novas = '' }
t('consegui ler as linhas novas do diff', novas.trim().length > 0)
t('nenhuma linha nova fala em dolar', !/\$\d|USD|BRL/.test(novas))
t('nenhuma linha nova mexe em plano/SKU/cupom', !/(starter|creator|studio|autopilot|coupon|\bsku\b|stripe)/i.test(novas))
t('nenhuma linha nova altera a copy da oferta', !/FREE_OFFER|limitHitError|freeTierOffer/.test(novas))
t('nenhuma linha nova muda o conteudo do UpgradeModal', !/UpgradeModal|upgradeCopy/.test(novas))
// So o CODIGO conta: o comentario cita o evento real de producao
// ("{ used: 2, limit: 1 }") de proposito, e citar o dado nao e codificar a regra.
const novasCodigo = novas.split('\n').filter((l) => !/^\+\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
t('nenhuma linha nova de CODIGO escreve um numero de cota no cliente', !/\blimit\s*[:=]\s*[0-9]/.test(novasCodigo))
t('o limite so aparece em comentario, citando producao', /\blimit: 1\b/.test(novas) && !/\blimit: 1\b/.test(novasCodigo))
t('nenhuma linha nova toca no servidor da cota', !/app\/api\/compose/.test(
  (() => { try { return execFileSync('git', ['diff', 'HEAD', '--name-only'], { cwd: raiz, encoding: 'utf8' }) } catch { return '' } })()
    .split('\n').filter((f) => f.startsWith('app/api/')).join('\n')))
t('a cota do servidor nao foi tocada', /reservedOrCompleted/.test(COMPOSE) && /FREE_OFFER\.limit/.test(COMPOSE))

// ── 8. a licao registrada (para nao reabrir a investigacao errada) ────────
t('o comentario explica que o EVENTO era cego, nao a tela', /o EVENTO que estava cego/.test(GC))
t('o caso real de 01/09 esta datado no codigo', /17:40:48[\s\S]{0,400}17:43:24/.test(GC))

console.log(`\n${ok} verificacoes passaram, ${bad} falharam`)
process.exit(bad ? 1 : 0)
