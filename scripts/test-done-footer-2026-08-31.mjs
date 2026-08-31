// KINEO-SPRINT-V1V4-2026-08-31 (#3) — provas do rodape que nao existia.
// O ramo era `null` para: gratuito + nao pagante + render Fast (o maior grupo
// ativado) e para o caso do Plan Fit ocupando o slot comercial. Medido em
// 14 dias: 177 pessoas fizeram o 1o video, 129 pararam nele, ZERO sumiram sem
// voltar, e quem faz o 2o faz na MEDIANA de 19 minutos.
// Roda: node scripts/test-done-footer-2026-08-31.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const gen = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const series = readFileSync(join(root, 'lib/seriesContinuation.ts'), 'utf8')

let ok = 0
let bad = 0
function check(name, cond) {
  if (cond) { ok++; console.log(`  ok  ${name}`) }
  else { bad++; console.log(`  X   ${name}`) }
}

// Recorta o ramo novo para poder afirmar o que ele NAO contem.
const marca = 'KINEO-SPRINT-V1V4-2026-08-31 (#3)'
const ini = gen.indexOf(marca)
const bloco = ini > -1 ? gen.slice(ini, ini + 3200) : ''
// As asserções de "não invade a pista do Codex" olham o CÓDIGO, não o
// comentário: o comentário explica justamente que ali não há upgrade/preço,
// e a palavra dentro da explicação não pode reprovar o próprio bloco.
const codigo = bloco.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')

console.log('\n1) O ramo morto morreu')
check('o ternario do rodape nao termina mais em null', !/\) : null\s*\n\s*\) : \(/.test(gen))
check('o ramo novo existe no arquivo', ini > -1)
check('o UpsellSection segue intacto (pista do Codex)', /<UpsellSection/.test(gen))
check('o NextActionSection segue intacto', /<NextActionSection/.test(gen))
check('o "Start over" dos outros phases segue intacto', /🔄 Start over/.test(gen))

console.log('\n2) O rodape oferece o proximo episodio com o tema pronto')
check('fonte done_footer no union', /\|\s*'done_footer'/.test(series))
check('CTA "Build next episode"', /Build next episode/.test(bloco))
check('usa o handler que ja existe, sem duplicar mecanica', /handleContinueSeries\(analysis\?\.title \?\? prompt, 'done_footer', publicVideoId\)/.test(bloco))
check('segunda saida: comecar algo novo', /Start something new/.test(bloco))
check('a segunda saida usa handleReset', /handleReset\(\)/.test(bloco))
check('promete o que entrega', /the idea comes pre-written/.test(bloco))

console.log('\n3) Nao invade a pista do Codex: e bloco de CRIACAO, nao de oferta')
check('sem preco no bloco', !/\$|price|Price/.test(codigo))
check('sem plano/tier no bloco', !/\b(tier|plan|Plan|Starter|Creator|pricing)\b/.test(codigo))
check('sem upgrade no bloco', !/upgrade|Upgrade/.test(codigo))
check('sem checkout no bloco', !/checkout|Checkout|stripe|Stripe/.test(codigo))

console.log('\n4) Da para medir')
check('emite series_continue_clicked via handleContinueSeries', /trackEvent\('series_continue_clicked'/.test(gen))
check('a segunda saida tambem e medida', /done_footer_start_new_clicked/.test(bloco))
check('o evento carrega o video', /video_id: publicVideoId \?\? null/.test(bloco))

console.log('\n5) O comentario guarda o porque (o numero que mandou fazer)')
check('registra 177/129/zero-sumiram', /177 pessoas/.test(bloco) && /129 pararam/.test(bloco) && /ZERO sumiram/.test(bloco))
check('registra a mediana de 19 minutos', /mediana de 19 minutos/i.test(bloco))
check('registra quem caia no null', /gratuito E nao pagou E/.test(bloco) || /gratuito E n[aã]o pagou/.test(bloco))

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad === 0 ? 0 : 1)
