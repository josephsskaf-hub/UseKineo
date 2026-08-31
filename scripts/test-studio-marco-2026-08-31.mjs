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
check('o /studio usa o MESMO helper do /history', /buildSeriesContinuationHref/.test(studio) && /buildSeriesContinuationHref/.test(history))
check('import do helper no StudioClient', /from '@\/lib\/seriesContinuation'/.test(studio))
check('nenhuma logica de tema nova foi inventada no /studio', !/next episode in the same Short series/.test(studio))

console.log('\n2) O marco aparece no /studio, e so para quem ja tem video')
check('bloco gated por myVids.length > 0', /myVids\.length > 0 && \(/.test(studio))
check('CTA "Build next episode"', /Build next episode/.test(studio))
check('o CTA leva o tema do video mais recente', /buildSeriesContinuationHref\(myVids\[0\]\?\.title, 'studio_milestone'\)/.test(studio))
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
check('StudioClient nao importa nada de growth/checkout novo', !/from '@\/lib\/checkoutPricing'/.test(studio))

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
