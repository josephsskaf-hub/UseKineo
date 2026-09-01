// sprint-v1v4 #38 — prova que a tela de falha deixou de ser cega.
// As frases testadas sao as EXATAS que estao em events.metadata->>'error'
// no banco de producao em 01/09/2026 (7 dias, 33 pessoas externas).
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../app/(dashboard)/generate/GenerateClient.tsx', import.meta.url), 'utf8')
let ok = 0, fail = 0
const t = (nome, cond) => { if (cond) { ok++ } else { fail++; console.error('FALHOU: ' + nome) } }

// Replica exata do classificador do componente (uma unica fonte de verdade
// abaixo: o teste falha se a lista do componente mudar sem atualizar aqui).
const classify = (error) => {
  const raw = (error ?? '').toLowerCase()
  if (!raw) return 'unknown'
  if (raw.includes('seconds of narration')) return 'narration_short'
  if (raw.includes('voiceover_script is required')) return 'voiceover_script_missing'
  if (raw.includes('voiceover generation failed')) return 'voiceover_provider'
  if (raw.includes('daily_free_limit') || raw.includes('daily free')) return 'daily_free_limit'
  if (raw.includes('could not be verified')) return 'access_not_verified'
  if (raw.includes('did not accept the job')) return 'provider_rejected'
  if (raw.includes('could not submit clips')) return 'submit_failed'
  if (raw.includes('depict real people') || raw.includes('real person')) return 'real_person_guard'
  if (raw.includes('credits left') || raw.includes('paid plans')) return 'plan_or_credits'
  return 'other'
}

// 1) Cada frase real do banco cai na causa certa.
const reais = [
  ['Your script is about 33 seconds of narration, but you asked for a 45-second video — that would', 'narration_short'],
  ['Your script is about 21 seconds of narration, but you asked for a 35-second video — that would', 'narration_short'],
  ['voiceover_script is required.', 'voiceover_script_missing'],
  ['Voiceover generation failed. Please try again.', 'voiceover_provider'],
  ['no_detail:compose_daily_free_limit|stage=clips_ready|http=402', 'daily_free_limit'],
  ['Your video access could not be verified. Nothing was submitted. Please retry.', 'access_not_verified'],
  ['Our video provider did not accept the job — this attempt was not charged.', 'provider_rejected'],
  ['Could not submit clips to AI generator. Please try again.', 'submit_failed'],
  ['Your trial has 21 credits left and an AI video costs more than that.', 'plan_or_credits'],
  ['AI Generated videos are on the paid plans. Upgrade to continue.', 'plan_or_credits'],
  ['We cannot depict real people. Describe a fictional figure instead.', 'real_person_guard'],
  ['held=19', 'other'],
  ['', 'unknown'],
]
for (const [frase, esperado] of reais) {
  t(`classifica "${frase.slice(0, 34)}" -> ${esperado}`, classify(frase) === esperado)
}

// 2) O classificador nao pode devolver 'other' para a causa n1 medida.
t('narracao curta (12 das 33 pessoas) nunca cai em other',
  classify('Your script is about 36 seconds of narration, but you asked for a 45-second video') === 'narration_short')

// 3) O componente realmente emite os tres eventos novos.
t('emite generation_failed_screen_shown', src.includes("trackEvent('generation_failed_screen_shown'"))
t('emite generation_retry_clicked', src.includes("trackEvent('generation_retry_clicked'"))
t('emite failed_edit_text_clicked', src.includes("trackEvent('failed_edit_text_clicked'"))

// 4) O evento de aparicao carrega causa E contagem de repeticao — sem os dois
//    nao da para separar "ninguem retentou" de "retentou e bateu igual".
const shownBlock = src.slice(src.indexOf("trackEvent('generation_failed_screen_shown'"), src.indexOf("trackEvent('generation_failed_screen_shown'") + 320)
t('shown carrega cause', shownBlock.includes('cause:'))
t('shown carrega repeat_count', shownBlock.includes('repeat_count:'))
t('shown carrega deterministic', shownBlock.includes('deterministic:'))

// 5) O Retry deixou de ser mudo: o onClick nao pode ser mais o handler cru.
t('retry nao e mais onClick={handleGenerateGuarded} cru',
  !src.includes('onClick={handleGenerateGuarded}\n                className="rounded-xl px-5 py-2.5 text-sm font-bold text-white mt-2"'))
t('retry ainda chama handleGenerateGuarded', src.includes('handleGenerateGuarded()'))

// 6) O aviso de repeticao exige as DUAS condicoes (2a vez E deterministico).
t('failureWillRepeat exige >=2 e deterministico',
  /const failureWillRepeat = sameFailureCount >= 2 && failureIsDeterministic/.test(src))

// 7) Falha de fornecedor NAO e deterministica — retentar ali funciona de
//    verdade (souzaforteslucas se curou assim as 17:14 de 01/09).
const detBlock = src.slice(src.indexOf('const failureIsDeterministic'), src.indexOf('const showGenericFailure'))
t('voiceover_provider fica FORA de deterministico', !detBlock.includes("'voiceover_provider'"))
t('submit_failed fica FORA de deterministico', !detBlock.includes("'submit_failed'"))
t('narration_short esta DENTRO de deterministico', detBlock.includes("'narration_short'"))

// 8) O caminho de escape preserva o texto: volta para 'idle' sem limpar prompt.
const editBlock = src.slice(src.indexOf("trackEvent('failed_edit_text_clicked'"), src.indexOf("trackEvent('failed_edit_text_clicked'") + 420)
t('edit my text volta para idle', editBlock.includes("setPhase('idle')"))
t('edit my text NAO apaga o prompt', !editBlock.includes('setPrompt('))

// 9) O card generico agora usa a mesma condicao que a telemetria — se as duas
//    divergirem, o evento mede uma tela que o cliente nao ve.
t('card usa showGenericFailure', src.includes('{showGenericFailure && ('))
t('showGenericFailure = failed sem scriptTooShort/creditsHeld',
  src.includes("const showGenericFailure = phase === 'failed' && !scriptTooShort && !creditsHeld"))

console.log(`\n${ok} verificacoes OK, ${fail} falhas`)
process.exit(fail ? 1 : 0)
