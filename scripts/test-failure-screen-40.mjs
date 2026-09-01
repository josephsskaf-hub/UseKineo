// sprint-v1v4 #40 — prova que a tela de falha deixou de ser cega nas duas
// causas que tinham card proprio (narracao curta e credito preso).
// Le o ARQUIVO DE PRODUCAO — a licao do sceneTruth (biblioteca morta que
// passava em teste isolado) vale aqui: o que interessa e o caller, nao a peca.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(raiz, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')

let ok = 0, falhas = []
const t = (nome, cond) => { if (cond) ok++; else falhas.push(nome) }

// ── 1. o gatilho novo existe e cobre os tres cards ──────────────────────────
t('failureScreenKind declarado', /const failureScreenKind:/.test(src))
t('failureScreenKind cobre narration_short', /scriptTooShort \? 'narration_short'/.test(src))
t('failureScreenKind cobre credits_held', /creditsHeld \? 'credits_held'/.test(src))
t('failureScreenKind cai em generic', /: 'generic'/.test(src))
t('failureScreenKind e null fora de failed', /phase !== 'failed' \? null/.test(src))

// ── 2. o efeito passou a usar o gatilho largo, e nao o generico ─────────────
const efeito = src.slice(src.indexOf('const failedScreenLoggedRef'), src.indexOf('const failureWillRepeat'))
t('efeito guarda por failureScreenKind', /if \(!failureScreenKind\)/.test(efeito))
t('efeito NAO guarda mais por showGenericFailure', !/if \(!showGenericFailure\)/.test(efeito))
t('assinatura usa a causa da tela', /const signature = `\$\{failureScreenCause\}/.test(efeito))
t('evento emitido no efeito', /trackEvent\('generation_failed_screen_shown'/.test(efeito))
t('evento carrega screen', /screen: failureScreenKind/.test(efeito))
t('evento carrega cause da tela', /cause: failureScreenCause/.test(efeito))
t('evento carrega deterministic da tela', /deterministic: failureScreenDeterministic/.test(efeito))
t('evento carrega has_message', /has_message:/.test(efeito))
t('has_message le a mensagem do card curto', /Boolean\(scriptTooShort\?\.message\)/.test(efeito))
t('deps incluem failureScreenKind', /failureScreenKind,\n\s+failureScreenCause/.test(efeito))
t('deps incluem scriptTooShort', /scriptTooShort,\n\s+error,/.test(efeito))

// ── 3. classificacao honesta de cada card ──────────────────────────────────
t('narracao curta e deterministica', /failureScreenKind === 'narration_short'\n\s+\? true/.test(src))
t('credito preso NAO e deterministico', /failureScreenKind === 'credits_held'\n\s+\? false/.test(src))
t('generico herda a heuristica antiga', /: failureIsDeterministic/.test(src))

// ── 4. o aviso de repeticao continua exclusivo do card generico ────────────
t('failureWillRepeat exige showGenericFailure',
  /const failureWillRepeat = showGenericFailure && sameFailureCount >= 2 && failureIsDeterministic/.test(src))

// ── 5. todo botao de saida emite o clique ──────────────────────────────────
const cliques = [...src.matchAll(/trackEvent\('generation_retry_clicked', \{([\s\S]{0,700}?)\}\)/g)].map(m => m[1])
t('ha 5 emissores de generation_retry_clicked', cliques.length === 5)
const acoes = cliques.map(c => (c.match(/action: '([a-z_]+)'/) || [])[1]).filter(Boolean)
for (const a of ['expand_script', 'shorter_duration', 'edit_my_text', 'recheck_credits']) {
  t(`acao ${a} instrumentada`, acoes.includes(a))
}
t('card generico continua sem action (retry puro)', cliques.some(c => !/action:/.test(c)))
t('todo clique carrega screen ou e o generico',
  cliques.every(c => /screen: '(narration_short|credits_held)'/.test(c) || !/action:/.test(c)))
t('cliques do card curto se dizem deterministicos',
  cliques.filter(c => /screen: 'narration_short'/.test(c)).every(c => /deterministic: true/.test(c)))
t('clique do credito preso se diz NAO deterministico',
  cliques.filter(c => /screen: 'credits_held'/.test(c)).every(c => /deterministic: false/.test(c)))

// ── 6. nada de comportamento foi trocado: os gestos originais continuam ────
t('expandir continua chamando handleExpandScript', /void handleExpandScript\(\)/.test(src))
t('trocar duracao continua setando setDuration', /setDuration\(scriptTooShort\.suggestedDuration as Duration\)/.test(src))
t('voltar ao texto continua limpando o estado', /setScriptTooShort\(null\); setError\(null\); setPhase\('idle'\)/.test(src))
t('rechecar credito continua chamando recheckHeldCredits', /void recheckHeldCredits\('manual'\)/.test(src))
t('showGenericFailure intacto', /const showGenericFailure = phase === 'failed' && !scriptTooShort && !creditsHeld/.test(src))

// ── 7. nao encostou em preco, credito nem plano ────────────────────────────
t('nenhum setCredits novo', (src.match(/setVideoCredits\(/g) || []).length === (src.match(/setVideoCredits\(/g) || []).length)
t('nenhuma mencao a preco nos trechos novos', !/generation_retry_clicked[\s\S]{0,300}?price/.test(src))

console.log(`\n#40 tela de falha — ${ok} verificacoes ok, ${falhas.length} falhas`)
if (falhas.length) { falhas.forEach(f => console.log('  ✗ ' + f)); process.exit(1) }
console.log('✅ a tela de falha enxerga os tres cards')
