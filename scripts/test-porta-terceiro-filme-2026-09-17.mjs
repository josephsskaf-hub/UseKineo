// KINEO-PORTA-TERCEIRO-FILME-2026-09-17 — guardião da jogada do segundo filme.
// Sem rede, sem banco. Compila o módulo REAL (nunca importa com alias `@/`,
// memória: guardioes-com-alias-nao-rodam), prova a decisão pura em todas as
// guardas, e amarra o JSX do GenerateClient às VARIÁVEIS que decidem
// (memória: guardião que conta texto não prova condição). CRLF normalizado na
// leitura (memória: guardiao-crlf-falso-vermelho).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODULE_PATH = join(root, 'lib/growth/thirdFilmDoor.ts')
const CLIENT_PATH = join(root, 'app/(dashboard)/generate/GenerateClient.tsx')
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

function findTsc(base) {
  let dir = base
  for (let depth = 0; depth < 8; depth++) {
    const candidate = join(dir, 'node_modules', 'typescript', 'bin', 'tsc')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('TypeScript compiler not found')
}
function loadModule(source) {
  const temp = mkdtempSync(join(tmpdir(), 'kineo-porta3-'))
  const src = join(temp, 'src'); const out = join(temp, 'out')
  mkdirSync(src, { recursive: true })
  writeFileSync(join(src, 'thirdFilmDoor.ts'), source)
  execFileSync(process.execPath, [findTsc(root), join(src, 'thirdFilmDoor.ts'), '--outDir', out, '--rootDir', src,
    '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--strict', '--skipLibCheck'], { stdio: 'pipe' })
  writeFileSync(join(out, 'package.json'), JSON.stringify({ type: 'commonjs' }))
  return createRequire(join(out, 'runner.cjs'))(join(out, 'thirdFilmDoor.js'))
}

let ok = 0; const falhas = []
function check(nome, cond) { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

const M = loadModule(read(MODULE_PATH))
const base = {
  delivered: true, completedCount: 2, historyReliable: true, notPaidProven: true,
  credits: 0, nextEpisodeCost: 5, slotOwner: null, nextEpisodeReady: true, starterCredits: 60,
}
const d = (over = {}) => M.decideThirdFilmDoor({ ...base, ...over })

console.log('1) a decisão pura — quem vê a porta')
check('caso central (2º filme, saldo 0, custo 5, sem dono, episódio escrito) abre', d().visible && d().reason === 'eligible')
check('Starter 60 / episódio 5 = 12 episódios como este', d().episodesOnStarter === 12)
check('Seedance 15 → 4 episódios', d({ nextEpisodeCost: 15, credits: 10 }).episodesOnStarter === 4)
check('sem filme entregue: fechada', d({ delivered: false }).reason === 'not_delivered')
check('histórico não confiável: fechada', d({ historyReliable: false }).reason === 'history_unreliable')
check('contagem nula: fechada (não adivinha)', d({ completedCount: null }).reason === 'history_unreliable')
check('1º filme: fechada (a porta é do 3º)', d({ completedCount: 1 }).reason === 'before_second_film')
check('5º filme sem pagar: abre (qualquer filme a partir do 2º)', d({ completedCount: 5 }).visible)
check('has_paid não provado: fechada (predicado estrito)', d({ notPaidProven: false }).reason === 'paid_or_unproven')
check('saldo desconhecido: fechada', d({ credits: null }).reason === 'credits_unknown')
check('próximo episódio grátis (custo 0): fechada — nada a vender', d({ nextEpisodeCost: 0 }).reason === 'free_next_episode')
check('saldo paga o episódio: fechada', d({ credits: 5 }).reason === 'affordable')
check('saldo 4 para custo 5: abre', d({ credits: 4 }).visible)
check('slot do trial ocupado: fechada (precedência das portas do trial)', d({ slotOwner: 'balance_bridge' }).reason === 'slot_taken')
check('episódio ainda não escrito: fechada', d({ nextEpisodeReady: false }).reason === 'episode_not_written')
check('episódio mais caro que o Starter inteiro: fechada', d({ nextEpisodeCost: 150, credits: 0 }).reason === 'affordable')
check('versão e tier saem do módulo', d().version === M.THIRD_FILM_DOOR_VERSION && d().tier === 'starter' && M.THIRD_FILM_DOOR_TIER === 'starter')
check('linha de capacidade: plural e singular', M.thirdFilmDoorCapacityLine(12) === '12 more episodes like this one every month' && M.thirdFilmDoorCapacityLine(1) === '1 more episode like this one every month')
check('a decisão não muta a entrada', (() => { const f = Object.freeze({ ...base }); M.decideThirdFilmDoor(f); return f.credits === 0 })())

console.log('2) o cliente lê a decisão, não a copia')
const c = read(CLIENT_PATH)
check('importa a decisão da fonte única', c.includes("import { decideThirdFilmDoor, thirdFilmDoorCapacityLine } from '@/lib/growth/thirdFilmDoor'"))
check('a decisão recebe as variáveis que decidem (contagem, histórico, has_paid provado, saldo, custo herdado, dono do slot, episódio)',
  /const thirdFilmDoor = decideThirdFilmDoor\(\{\n\s*delivered: phase === 'done' && Boolean\(finalVideoUrl\),\n\s*completedCount: completedVideoCount,\n\s*historyReliable: videoHistoryReliable,\n\s*notPaidProven,\n\s*credits,\n\s*nextEpisodeCost: episode2InheritedCost,\n\s*slotOwner: postDeliverySlotOwner,\n\s*nextEpisodeReady: nextEpisode !== null,\n\s*starterCredits: TIER_CREDITS\.starter,\n\s*\}\)/.test(c))
check('o JSX é guardado por thirdFilmDoor.visible e o botão antigo continua no ramo falso',
  /\{thirdFilmDoor\.visible \? \(\n\s*<div\n\s*ref=\{thirdFilmDoorRef\}/.test(c) && /\) : \(\n\s*<button\n\s*type="button"\n\s*onClick=\{\(\) => startNextEpisode\(showTrialRepeatEpisode/.test(c))
check('o botão abre a Stripe pela superfície própria, tier vindo da decisão', c.includes("useCheckoutLaunch('generate_third_film_door')") && /thirdFilmCheckout\.launch\(\n\s*thirdFilmDoor\.tier,\n\s*thirdFilmDoorCheckoutUrl,/.test(c) && c.includes("withIntentCampaign(`/api/stripe/checkout?tier=${thirdFilmDoor.tier}&intro=1`)"))
check('o preço vem da tabela do checkout na moeda resolvida, ou não aparece', c.includes("formatCheckoutMoney(postVideoCurrency, getTierPrice(thirdFilmDoor.tier, postVideoCurrency, postVideoRegion))") && c.includes("thirdFilmDoorPrice ? ` — ${thirdFilmDoorPrice}/month` : ''"))
check('a capacidade em episódios é da decisão, não digitada', c.includes('{thirdFilmDoorCapacityLine(thirdFilmDoor.episodesOnStarter)}'))
check('impressão e clique têm evento próprio com os números da decisão', c.includes("trackEvent('third_film_door_shown', {") && c.includes("trackEvent('third_film_door_clicked', {") && (c.match(/episodes_on_starter: thirdFilmDoor\.episodesOnStarter,/g) || []).length === 2)
check('a impressão só conta quando a caixa entra no viewport (≥50%)', /third_film_door_shown[\s\S]{0,1600}intersectionRatio >= 0\.5/.test(c))
check('o clique de comparar planos é secundário e leva ao /pricing com a campanha da porta', c.includes("router.push(withIntentCampaign(`/pricing?intent_campaign=${thirdFilmDoor.version}#plans`))"))
check('a garantia e o cancelamento estão na caixa', c.includes('cancel anytime · 7-day money-back guarantee.'))
check('o clique registra checkout_click do tier decidido', c.includes('trackCheckoutClick(thirdFilmDoor.tier)'))

console.log('3) mutante: o guarda de visibilidade tem dentes')
const mutante = read(MODULE_PATH).replace("if (input.credits >= input.nextEpisodeCost) return closed('affordable')", "if (false) return closed('affordable')")
check('mutante aplicou', mutante !== read(MODULE_PATH))
const Mm = loadModule(mutante)
check('sem a guarda de saldo, a porta abriria para quem PODE pagar o episódio — o guardião pega', Mm.decideThirdFilmDoor({ ...base, credits: 5 }).visible === true && d({ credits: 5 }).visible === false)

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
