// sprint-v1v4 #33 — a sala de espera do credito preso.
// Prova, lendo o codigo real, que a recusa `credits_held_by_render` deixou de
// cair no painel vermelho de falha (que mentia dizendo "your credits have been
// returned - you can retry safely") e passou a ser uma espera com rechecagem
// que NUNCA inicia um render sozinha.
import { readFileSync } from 'node:fs'

const P = 'app/(dashboard)/generate/GenerateClient.tsx'
const src = readFileSync(new URL(`../${P}`, import.meta.url), 'utf8')
let ok = 0
const t = (nome, cond) => {
  if (!cond) { console.error(`FALHOU: ${nome}`); process.exitCode = 1 } else ok++
}

// ── o estado existe e e o unico dono da tela de espera ────────────────────
t('estado creditsHeld declarado', /const \[creditsHeld, setCreditsHeld\] = useState</.test(src))
t('estado carrega o instante da recusa (mede a espera real)', /since: number/.test(src))
t('estado sabe quando o saldo voltou', /released: boolean/.test(src))

// ── o ramo 402 alimenta o estado ──────────────────────────────────────────
const ramoInicio = src.indexOf("data?.reason === 'credits_held_by_render'")
const ramo = src.slice(ramoInicio, src.indexOf("setPhase('failed'); return", ramoInicio))
t('ramo 402 seta o estado novo', ramo.includes('setCreditsHeld({'))
t('ramo 402 preserva o texto do servidor', ramo.includes("message: typeof data?.error === 'string' ? data.error : ''"))
t('ramo 402 nao abre a caixa de planos', !ramo.includes('openOutOfCreditsModal'))
t('ramo 402 emite o evento de exibicao', ramo.includes("trackEvent('credits_held_notice_shown'"))

// ── o painel vermelho generico nao aparece mais neste caso ────────────────
t('painel de falha exclui o credito preso', src.includes("{phase === 'failed' && !scriptTooShort && !creditsHeld && ("))
t('painel de espera renderiza no phase failed', src.includes("{phase === 'failed' && creditsHeld && ("))

// ── a rechecagem existe, e NAO renderiza sozinha ──────────────────────────
const rech = src.slice(src.indexOf('const recheckHeldCredits'), src.indexOf('const recheckHeldCredits') + 1600)
t('rechecagem le o saldo pela rota de creditos', rech.includes("fetch('/api/credits'"))
t('rechecagem compara com o custo necessario', rech.includes('saldo >= alvo.needed'))
t('rechecagem nunca dispara render', !rech.includes('handleGenerate'))
t('rechecagem nao quebra a tela se a rede cair', rech.includes('catch'))
t('rechecagem emite evento em cada desfecho', rech.includes("'credits_held_released'") && rech.includes("'credits_held_recheck'"))
t('rechecagem automatica a cada 45s', /setInterval\(\(\) => \{ void recheckHeldCredits\('auto'\) \}, 45000\)/.test(src))
t('intervalo e limpo ao desmontar', src.includes('return () => clearInterval(id)'))
t('intervalo para quando o saldo volta', src.includes('if (!creditsHeld || creditsHeld.released) return'))

// ── so a pessoa comeca o render ───────────────────────────────────────────
const painel = src.slice(src.indexOf("{phase === 'failed' && creditsHeld && ("))
const painelFim = painel.slice(0, painel.indexOf('</section>'))
t('botao de gerar so aparece com o saldo de volta', painelFim.includes('creditsHeld.released ? (') && painelFim.includes('Generate now'))
t('botao de gerar limpa o estado antes de disparar', painelFim.includes('setCreditsHeld(null)\n                    handleGenerateGuarded()'))
t('clique de gerar e medido com o tempo de espera', painelFim.includes("trackEvent('credits_held_retry_clicked'"))
t('enquanto esta preso, o botao so recheca', painelFim.includes("recheckHeldCredits('manual')") && painelFim.includes('Check again'))
t('botao de rechecar trava enquanto checa (mata o loop de Retry)', painelFim.includes('disabled={creditsHeld.checking}'))
t('caminho para o video que esta renderizando', painelFim.includes('href="/history"') && painelFim.includes("trackEvent('credits_held_open_history_clicked'"))

// ── a copy nao se contradiz ───────────────────────────────────────────────
t('a espera nao diz "generation failed"', !/Generation failed/.test(painelFim))
t('a espera nao promete credito devolvido', !/returned to your balance/.test(painelFim))
t('a espera nao inventa prazo proprio', !/minutes|within the hour/i.test(painelFim.replace(/creditsHeld\.message/g, '')))
t('a espera nao fala de preco, plano ou upgrade (pista do Codex)', !/( plan |upgrade|checkout|\$\d)/i.test(painelFim))

// ── higiene ───────────────────────────────────────────────────────────────
t('tentativa nova apaga a sala de espera', src.includes('setCreditsHeld(null)\n    if (generationInFlightRef.current'))
t('o painel vermelho antigo continua existindo para as outras falhas', src.includes('Generation failed'))

console.log(`${ok} verificacoes passaram`)
