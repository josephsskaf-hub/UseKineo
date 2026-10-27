// KINEO-EM-ALTA-2610 — guardião da vitrine "Em alta esta semana" (tela de Clipes).
//   A. catálogo: cada tendência tem prévia e pôster que EXISTEM em public/, motor de texto, 5 s, 9:16, "No text" no prompt;
//   B. nada de pessoa real: nenhum nome de jogador/artista/marca no prompt; o colchão de gelatina saiu (olho, 26/10);
//   C. a tela: o botão só PREENCHE (applyTrend chama setPrompt/setEngineKey e nunca a geração), ?trend= aplica uma vez;
//   D. telas e eventos fora do escopo intocados (sem evento novo em app/api/events);
//   E. mutantes.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(fs.readFileSync(p, 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

const cat = rd('lib/clips/clipTrends.ts')
const keys = [...cat.matchAll(/key: '([a-z_]+)'/g)].map((m) => m[1])
checa('A1 cinco tendências', keys.length === 5)
for (const k of keys) {
  checa(`A2 prévia e pôster existem (${k})`, fs.existsSync(`public/previews/em-alta-${k}.mp4`) && fs.existsSync(`public/posters/em-alta-${k}.webp`) && cat.includes(`/previews/em-alta-${k}.mp4`))
}
const blocos = cat.split("    key: '").slice(1)
const semTexto = /const N = ' No text, no logos, no watermark\.'/.test(cat)
checa('A3 todo prompt pede sem texto e sem marca d\'água', blocos.every((b) => (semTexto && /\+ N,/.test(b)) || (/No text, no logos/.test(b) && /no watermark/.test(b))))
checa('A4 motor Kling 3 (hollywood), 5 s, 9:16 em todas', blocos.every((b) => /engine: 'hollywood'/.test(b) && /seconds: 5,/.test(b) && /aspect: '9:16'/.test(b)))
checa('B1 sem nome de pessoa/marca real nos prompts', !/Messi|Yamal|Ozil|Özil|Ronaldo|Neymar|Ferrari|Porsche|Lamborghini|Gangnam/i.test(cat.replace(/^\/\/.*$/gm, '')))
checa('B2 colchão de gelatina fora da vitrine', !keys.includes('jelly_mattress'))

const ui = rd('app/(dashboard)/clips/ClipsClient.tsx')
const apply = ui.slice(ui.indexOf('function applyTrend('), ui.indexOf('const trendFromUrlRef'))
checa('C1 applyTrend preenche motor, duração, formato e ideia', ['setEngineKey(target.key)', 'setSeconds(trend.seconds)', 'setAspect(trend.aspect)', 'setPrompt(trend.prompt)'].every((s) => apply.includes(s)))
checa('C2 applyTrend nunca gera nem chama a API', !/generate|fetch\(|\/api\/clips/.test(apply))
checa('C3 limpa efeito e foto antes (clipe por texto)', apply.includes('setEffectKey(null)') && apply.includes('setPhotoUrl(null)'))
checa('C4 ?trend= aplica uma vez só', /trendFromUrlRef\.current = true/.test(ui) && /get\('trend'\)/.test(ui))
checa('C5 card só aparece se a conta tem motor que serve', /const target = trendTarget\(tr, engines\)\s*\n\s*if \(!target\) return null/.test(ui))
checa('C6 vitrine vem antes da galeria de efeitos', ui.indexOf('clip-trends-title') > 0 && ui.indexOf('clip-trends-title') < ui.indexOf('aria-labelledby="clip-effects-title"'))

const base = lf(execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { encoding: 'utf8' })).trim()
const mudou = lf(execFileSync('git', ['diff', '--name-only', base], { encoding: 'utf8' })).trim().split('\n').filter(Boolean)
checa('D1 nenhum evento novo nem rota mexida', !mudou.some((f) => f.startsWith('app/api/')))

const mut = apply.replace('setPrompt(trend.prompt)', '')
checa('M1 mutante (sem preencher a ideia) seria vermelho em C1', !['setPrompt(trend.prompt)'].every((s) => mut.includes(s)))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
