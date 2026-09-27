// KINEO-SPRINT-V1V4-2026-08-31 (#2) — provas do marco no /studio.
// Medido: series_continue_clicked 7d por fonte = history_milestone 7,
// done_screen 2, generate_recent_video 1, history_video_card 1. O marco do
// /history e 64% de todo o "proximo episodio" e vive numa tela de 23 pessoas.
// O /studio teve 87 pessoas e nao tinha marco nenhum.
// Roda: node scripts/test-studio-marco-2026-08-31.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const studio = readFileSync(join(root, 'app/(dashboard)/studio/StudioClient.tsx'), 'utf8')
const series = readFileSync(join(root, 'lib/seriesContinuation.ts'), 'utf8')
const history = readFileSync(join(root, 'app/(dashboard)/history/HistoryClient.tsx'), 'utf8')
const events = readFileSync(join(root, 'app/api/events/route.ts'), 'utf8')

let ok = 0
let bad = 0
function check(name, cond) {
  if (cond) { ok++; console.log(`  ok  ${name}`) }
  else { bad++; console.log(`  X   ${name}`) }
}

console.log('\n1) A fonte studio_milestone existe e e a mesma mecanica do vencedor')
check('union tem studio_milestone', /\|\s*'studio_milestone'/.test(series))
// KINEO-REANCORA-MARCO-2026-09-07 — as tres travas exigiam a chamada DIRETA a
// buildSeriesContinuationHref no StudioClient. O commit 9448d2ef (Codex, 05/09)
// passou /studio e /history a chamarem o adaptador buildStudioSeriesReviewHref,
// que por dentro chama a MESMA funcao canonica com a MESMA source. A intencao —
// as duas telas usam o MESMO mecanismo, e o /studio nao inventa logica de tema —
// continua valendo, uma camada acima.
const adaptador = readFileSync(join(root, 'lib/navigation/studioSeriesReview.ts'), 'utf8')
check('o /studio usa o MESMO helper do /history', /buildStudioSeriesReviewHref/.test(studio) && /buildStudioSeriesReviewHref/.test(history))
check('o adaptador deriva do escritor canonico', adaptador.includes('buildSeriesContinuationHref(topic, source'))
check('import do adaptador no StudioClient', /from '@\/lib\/navigation\/studioSeriesReview'/.test(studio))
check('nenhuma logica de tema nova foi inventada no /studio', !/next episode in the same Short series/.test(studio))

console.log('\n2) O marco aparece no /studio, e so para quem ja tem video')
check('bloco gated por myVids.length > 0', /myVids\.length > 0 && \(/.test(studio))
check('CTA "Build next episode"', /Build next episode/.test(studio))
check('o CTA leva o tema do video mais recente', /buildStudioSeriesReviewHref\(myVids\[0\]\?\.title, 'studio_milestone'\)/.test(studio))
check('promete o que entrega: tema pre-escrito', /the idea comes pre-written/.test(studio))
check('o marco vem ANTES da fileira de miniaturas', (() => {
  const marco = studio.indexOf('Build next episode')
  const fileira = studio.indexOf('Your latest videos')
  return marco > -1 && fileira > -1 && marco < fileira
})())

console.log('\n3) Copy honesta: conta o acervo, nao promete resultado')
check('1 video -> "First Short complete"', /First Short complete/.test(studio))
check('1 video -> convite explicito ao episodio 2', /Turn it into episode 2/.test(studio))
check('2-3 videos -> "N of your first 4 Shorts"', /of your first 4 Shorts/.test(studio))
check('4+ usa "+" porque a lista e cortada em 6 (nao mente o total)', /\$\{myVids\.length\}\+ Shorts complete/.test(studio))
check('a barra satura em 4', /Math\.min\(myVids\.length, 4\)/.test(studio))
check('sem promessa de views/receita no bloco', !/\b(views|viral|revenue|earn|subscribers)\b/i.test(studio.slice(studio.indexOf('SPRINT-V1V4-2026-08-31 (#2)'), studio.indexOf('Your latest videos'))))

console.log('\n4) Da para comparar as fontes depois')
check('emite series_continue_clicked', /trackEvent\('series_continue_clicked'/.test(studio))
check('com source studio_milestone', /source: 'studio_milestone'/.test(studio))
check('carrega o tamanho do acervo', /completed_video_count: myVids\.length/.test(studio))
check('fire-and-forget (void)', /void trackEvent\(\{?\s*$|void trackEvent\(/.test(studio))
check('o evento nao e server-only', !/'series_continue_clicked'/.test(events))

console.log('\n5) Nao invadiu a pista do Codex')
check('nada de preco/plano/checkout no bloco novo', (() => {
  const bloco = studio.slice(studio.indexOf('SPRINT-V1V4-2026-08-31 (#2)'), studio.indexOf('Your latest videos'))
  return !/(checkout|stripe|upgrade|plan|price|\bcr\b)/i.test(bloco)
})())
// KINEO-STUDIO-TILE-ADS-2026-09-27 — reancorado: o item U (sprint 16 h, ciclo D) pôs o tile "Business ad" no fim da fileira de
// miniaturas, e o preço do Starter na porta para quem não tem plano NASCE de lib/checkoutPricing (regra da casa: nenhum preço
// digitado). A intenção de 31/08 continua de pé: o BLOCO DO MARCO não fala de preço (check acima) e o único import de checkout
// é o do tile, com exatamente esses dois símbolos, usados UMA vez cada (na constante ADS_TILE_STARTER_PRICE) — nada de upsell no marco.
check('StudioClient nao importa nada de growth/checkout novo (salvo o par do tile Business ad, usado so na constante do tile)', (() => {
  const imports = studio.match(/from '@\/lib\/checkoutPricing'/g) ?? []
  const soOTile = imports.length === 1 && /import \{ formatCheckoutMoney, getTierPrice \} from '@\/lib\/checkoutPricing'/.test(studio)
  const usoUnico = (studio.match(/getTierPrice\(/g) ?? []).length === 1 && (studio.match(/formatCheckoutMoney\(/g) ?? []).length === 1
    && /const ADS_TILE_STARTER_PRICE = formatCheckoutMoney\('usd', getTierPrice\('starter', 'usd', 'standard'\)\)/.test(studio)
  return soOTile && usoUnico
})())

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
