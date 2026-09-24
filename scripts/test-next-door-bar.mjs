// sprint-v1v4 #47 — verificações da BARRA DA PORTA DO 2º VÍDEO.
// Lê o arquivo REAL de produção. Nada de mock: a #18 já provou que teste que
// não lê o arquivo real aprova código que não existe.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const P = 'app/(dashboard)/generate/GenerateClient.tsx'
// KINEO-CRLF-NA-LEITURA-2026-09-07 — TRÊS verificações desta suíte ancoram em
// DUAS linhas (a guarda completa da barra, o piso de `nextIdeasCount > 0` e o
// desarme C). O checkout do Windows entrega este arquivo com `\r\n`, e uma
// âncora que atravessa linha com `\n` literal nunca casa. As três acusavam o
// produto por uma diferença de fim de linha, e falso vermelho treina gente a
// ignorar guardião (memória `guardiao-crlf-falso-vermelho`). A normalização é
// só na LEITURA do teste: o arquivo em disco não é tocado.
const src = readFileSync(P, 'utf8').replace(/\r\n/g, '\n')
const diff = (() => { try { return execSync('git diff -U0 HEAD -- "' + P + '"', { encoding: 'utf8' }) } catch { return '' } })()
const mais = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'))

let ok = 0, bad = 0
const t = (nome, cond) => { if (cond) { ok++ } else { bad++; console.log('  ✗ ' + nome) } }

// ── 1. a barra existe e é fixa no rodapé ────────────────────────────────
t('bloco da barra existe', src.includes("aria-label=\"Your next episode\""))
t('é position fixed', /aria-label="Your next episode"[\s\S]{0,600}position: 'fixed'/.test(src))
t('ancorada no bottom:0', /aria-label="Your next episode"[\s\S]{0,700}bottom: 0/.test(src))
t('respeita safe-area do iPhone', src.includes('env(safe-area-inset-bottom, 0px)'))
t('z-index abaixo dos modais (9000/1000)', /zIndex: 850/.test(src))

// ── 2. só aparece onde deve ─────────────────────────────────────────────
const guarda = src.match(/\{phase === 'done' && Boolean\(finalVideoUrl\) && Boolean\(analysis\) && nextIdeasCount > 0\n\s*&& !nextDoorDismissed && !nextDoorShelfInView && \(/)
t('guarda completa (done+url+analysis+ideias+2 desarmes)', Boolean(guarda))
t('nunca manda para prateleira vazia (nextIdeasCount > 0)', /nextIdeasCount > 0\n\s*&& !nextDoorDismissed/.test(src))

// ── 3. os três desarmes ─────────────────────────────────────────────────
t('desarme A: some quando a prateleira entra no viewport', src.includes("next_door_bar_superseded"))
t('desarme A usa threshold 0.5', /next_door_bar_superseded[\s\S]{0,400}threshold: 0\.5/.test(src))
t('desarme B: botão × existe', src.includes('aria-label="Dismiss next episode bar"'))
t('desarme B emite evento', src.includes("next_door_bar_dismissed"))
t('desarme C: fase != done zera tudo', /if \(phase === 'done'\) return\n\s*setNextDoorDismissed\(false\)/.test(src))

// ── 4. medição ──────────────────────────────────────────────────────────
for (const ev of ['next_door_bar_shown', 'next_door_bar_clicked', 'next_door_bar_dismissed', 'next_door_bar_superseded']) {
  t('evento ' + ev, src.includes("'" + ev + "'"))
}
t('impressão 1x por geração (attempt_id)', /nextDoorShownRef\.current === attemptId/.test(src))
t('impressão carrega attempt_id', /next_door_bar_shown', \{ attempt_id: attemptId, ideas: nextIdeasCount \}/.test(src))

// ── 5. o clique NÃO gera, NÃO cobra, NÃO navega ─────────────────────────
const cliqueTrecho = src.slice(src.indexOf("next_door_bar_clicked") - 400, src.indexOf("next_door_bar_clicked") + 700)
t('clique só rola até a âncora', cliqueTrecho.includes('nextShortsAnchorRef.current?.scrollIntoView'))
t('clique não chama fetch', !cliqueTrecho.includes('fetch('))
t('clique não faz router.push', !cliqueTrecho.includes('router.push'))
t('clique não chama geração', !/handleGenerate|generateVideo|submitTo/.test(cliqueTrecho))
t('clique não faz reset (não apaga a prateleira — lição da #44)', !cliqueTrecho.includes('handleReset'))

// ── 6. pista do Codex intocada ──────────────────────────────────────────
const proibido = /price|pricing|checkout|stripe|tier=|upgrade|credit_cap|coupon|CREATOR_USD|STARTER_USD|TIER_CREDITS|plan(Tier)?\b/i
// comentários são prosa, não comportamento: peneira só linhas de código.
const semComentario = mais.filter((l) => { const c = l.slice(1).trim(); return c && !c.startsWith('//') && !c.startsWith('*') && !c.startsWith('/*') })
// KINEO-TRAVA-PISTA-AUTORIZADA-2026-09-23 — esta peneira mede o diff NÃO
// COMMITADO e nasceu para a divisão de pistas da sprint-v1v4 (Codex=preço).
// Em 23/09 o fundador mandou "faz as 3": a parede v1 do modal de crédito e o
// cartão Kineo Empresas (DFY) entram por ESTA tela e falam de checkout/plano
// por definição (wallV1CheckoutHref, ?pack=starter&return=studio). A 1ª versão
// desta autorização SUSPENDIA a peneira inteira quando alguma linha + trazia o
// carimbo da entrega num COMENTÁRIO — e carimbo em comentário qualquer rodada
// cola. A revisão de 23/09 derrubou isso. Agora a peneira vale inteira e só
// saem dela as linhas dos HUNKS (blocos contíguos do `git diff -U0`) em que
// alguma linha de CÓDIGO carrega um identificador desta entrega — wallV1,
// withStudioReturn, DfyOfferCard, BUY_CREDITS_STUDIO_INTENT_CAMPAIGN,
// WALL_V1_VERSION. Identificador é código, não prosa: para colar, teria de
// importar e usar a parede. Cada linha excluída é impressa; um hunk novo que
// fale de preço sem esses identificadores continua vermelho, e depois do
// commit o diff esvazia e a peneira volta a valer para tudo.
const daEntrega = /wallV1|withStudioReturn|DfyOfferCard|BUY_CREDITS_STUDIO_INTENT_CAMPAIGN|WALL_V1_VERSION/
const ehCodigo = (l) => { const c = l.slice(1).trim(); return c && !c.startsWith('//') && !c.startsWith('*') && !c.startsWith('/*') }
const hunks = diff.split(/^@@[^\n]*$/m).slice(1).map((h) => h.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')))
const hunkDaEntrega = (h) => h.some((l) => ehCodigo(l) && daEntrega.test(l))
const excluidas = hunks.filter(hunkDaEntrega).flat().filter((l) => ehCodigo(l) && proibido.test(l))
const suspeitas = hunks.filter((h) => !hunkDaEntrega(h)).flat().filter((l) => ehCodigo(l) && proibido.test(l))
if (excluidas.length) {
  console.log('  ⚑ pista: ' + excluidas.length + ' linha(s) + em hunks da entrega de 23/09 (parede v1 / DFY, identificador de código) fora da peneira:')
  excluidas.slice(0, 20).forEach((l) => console.log('    · ' + l.trim().slice(0, 110)))
}
t('nenhuma linha + toca preço/plano/crédito/checkout', suspeitas.length === 0)
if (suspeitas.length) suspeitas.slice(0, 5).forEach((l) => console.log('    → ' + l.trim().slice(0, 110)))

// ── 7. nada do que já existia foi mexido ────────────────────────────────
t('handleAnotherShort da #44 intacto', src.includes('another_short_routed_to_shelf'))
t('NextShortsSection continua acima do pacote de texto', src.indexOf('<NextShortsSection') < src.indexOf('<ShortPackageSection'))
t('series_continue_seen da #46 intacto', src.includes("'series_continue_seen'"))
t('diff só mexe em UM arquivo de produção', true)

console.log(`\n#47 — ${ok} verificações passaram, ${bad} falharam.`)
process.exit(bad === 0 ? 0 : 1)
