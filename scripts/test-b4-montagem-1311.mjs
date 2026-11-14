// KINEO-B4-MONTAGEM-1311 [CEO 13/11, fila b4: "a montagem do prompt em que nome vira ficha de pessoa e plano sai sem ação"] — guardião.
// Prova OFFLINE com os prompts REAIS dos 3 filmes grátis do Kling 4 da fila (scripts/test-support/b4-prompts-1311.json, tirados do claim):
//   (A) nome que não é gente não vira ficha de pessoa ("Argentinosaurus", "Fiery"): o elenco determinístico de hoje não os põe
//       (KINEO-ESPECIE-NAO-E-GENTE-1111 + KINEO-ELENCO-PROVA-DE-GENTE-1211, ligado para todos);
//   (B) a ação inteira cabe no plano do Kling 4 (o texto que vai à fal, 512 code points): os planos 2 e 3 do argentinossauro e o plano 3
//       de Pompeia (ru) levam a ação inteira, sem corte no meio da palavra ("falling fr") — KINEO-K4-ACAO-INTEIRA-1111 / KINEO-PLANO-COM-ACAO-1111;
//   (C) HOJE: nome em outra escrita não vira assunto obrigatório ("Помпеях clearly visible as the subject of this shot"); nome latino segue;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const FQ = 'lib/cinematic/filmQuality.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === FQ ? mutar(text) : text) })
const { filmes } = JSON.parse(fs.readFileSync('scripts/test-support/b4-prompts-1311.json', 'utf8'))

function provas(L) {
  const erros = []
  const fq = L(FQ), c = L('lib/cinematic/cenaKling4.ts'), st = L('lib/cinematic/sceneStyle.ts'), ee = L('lib/cinematic/elencoEpoca.ts')
  // (A) o elenco de hoje, com a prova de gente ligada
  const dino = 'A close-up shot of a dinosaur fossil being excavated, with paleontologists working around it. A realistic depiction of an Argentinosaurus standing in a prehistoric landscape. Argentinosaurus weighed up to 100 tons, like 10 school buses.'
  const pompeia = 'A wide shot of the Pompeii arena, filled with excited spectators. A view of Mount Vesuvius erupting. Fiery projectiles fly, striking the arena. Stones collapse, the arena crumbles, spectators flee in panic.'
  for (const [nome, t] of [['dino', dino], ['pompeia', pompeia]]) {
    const elenco = ee.personagensNomeados(t, null, false, true).map((p) => p.nome)
    if (elenco.some((n) => /argentinosaurus|fiery/i.test(n))) erros.push(`A ${nome}: nome que não é gente virou ficha: ${elenco}`)
  }
  // (B) a ação inteira no plano do Kling 4
  const plano = (id, i, look) => c.promptDaCenaKling4(filmes[id][i], st.deriveStyleAnchor(look), i, true)
  const acoes = [
    ['76b00b37', 1, 'stylized 3D animated film', 'measuring tape alongside it showing 35 meters'],
    ['76b00b37', 2, 'stylized 3D animated film', 'ten yellow school buses lined up beside it'],
    ['42bcd59f', 2, 'photorealistic documentary', "crumbling stones falling from the arena's structure, as terrified spectators flee in all directions"],
    ['f133c184', 2, 'photorealistic documentary', 'the amphitheater collapses under a torrent of volcanic debris'],
  ]
  for (const [id, i, look, acao] of acoes) {
    const p = plano(id, i, look)
    if (!p.includes(acao)) erros.push(`B ${id} plano ${i + 1} sem a ação inteira: ${p.slice(0, 160)}`)
    if (Array.from('Scene 8: use middle keyframe 7. ' + p).length > 512) erros.push(`B ${id} plano ${i + 1} passa do teto com o prefixo da imagem-chave`)
    if (/\b\p{L}{1,3}$/u.test(p.replace(/ Mouth closed, no speaking\.$/, '').replace(/[,.\s]+$/, '')) && !/signage$/.test(p.replace(/ Mouth closed, no speaking\.$/, ''))) erros.push(`B ${id} plano ${i + 1} termina cortado`)
  }
  // (C) o assunto obrigatório só em letra latina
  if (fq.sujeitosDaFala('Арену в Помпеях, 79 год н.э., заполняют зрители.').length) erros.push('C "Помпеях" virou assunto obrigatório')
  if (fq.comSujeitoDaFala('A wide shot of the Pompeii arena.', 'Арену в Помпеях, 79 год н.э., заполняют зрители.', []) !== 'A wide shot of the Pompeii arena.') erros.push('C o plano ganhou o assunto em cirílico')
  if (fq.sujeitosDaFala('Η έκρηξη στην Πομπηία, 79 μ.Χ.').length) erros.push('C nome grego virou assunto')
  // C7 (revisão da CEO): o nome em cirílico CONTA como citado; o latino solto não sai sozinho como assunto
  if (fq.sujeitosDaFala('В Помпеях жил гладиатор Marcus.').length) erros.push('C7 numa fala russa com outro nome, o latino saiu sozinho: ' + fq.sujeitosDaFala('В Помпеях жил гладиатор Marcus.'))
  if (fq.sujeitosDaFala('Clouds of sulfuric acid cover the sky on Venus.').join() !== 'Venus') erros.push('C nome latino (Venus) deixou de ser assunto: ' + fq.sujeitosDaFala('Clouds of sulfuric acid cover the sky on Venus.'))
  if (fq.sujeitosDaFala('Le volcan a détruit Pompéi.').join() !== 'Pompéi') erros.push('C nome latino com acento (Pompéi) deixou de ser assunto')
  return erros
}

const base = provas(carrega())
checa(`A, B e C verdes nos prompts reais dos 3 filmes${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
const MUTANTES = [
  ['C7: o cirílico deixa de contar como citado', (s) => s.replace('    citadas.add(m[0])', "    if (!/^\\p{Script=Latin}/u.test(m[0])) continue; citadas.add(m[0])")],
  ['nome em cirílico volta a ser assunto', (s) => s.replace("if (regrasDeLinguaLigadas() && !/^\\p{Script=Latin}[\\p{Script=Latin}\\p{N}'’]*$/u.test(m[0])) continue // KINEO-B4-MONTAGEM-1311", '')],
  ['nome latino também sai', (s) => s.replace("if (regrasDeLinguaLigadas() && !/^\\p{Script=Latin}[\\p{Script=Latin}\\p{N}'’]*$/u.test(m[0])) continue // KINEO-B4-MONTAGEM-1311", 'if (regrasDeLinguaLigadas()) continue')],
  ['a ação volta a ser cortada (sem o fim da ficha de costas)', (s) => s.replace('— clearly visible in frame(, seen from behind or in profile, face not readable)?\\.?/i', '— clearly visible in frame.?/i')],
]
const src = lf(fs.readFileSync(FQ, 'utf8'))
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
