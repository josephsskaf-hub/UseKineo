// KINEO-REPETICAO-FREE15-1011 [aval permanente do fundador 01/11 (laço do revisor)] — guardião do eixo de câmera no filme grátis de 15 s.
// Revisor 09/11: 4 de 4 primeiros filmes grátis de 15 s "mostram a mesma coisa" (mão no mapa em 3 quadros; rapaz escrevendo em 4 de 8).
// Prova no banco (cinematic_submission_claim.response, SELECT): os 3 textos de cena JÁ eram diferentes; o que faltava era a CÂMERA.
// O vetor classicScenePrompts — que desenha as 3 imagens-chave FLUX do Kling 4 grátis (mesma seed nas 3) e é o prompt dos 3 clipes da
// reserva Seedance 1.5 — saía com "smooth camera motion" igual nas 3 cenas e nenhum eixo; o rodízio de eixos só rodava no Kling 2.5.
// Este guardião roda o código REAL (sem rede, sem banco, sem fornecedor) com os vetores REAIS gravados no claim dos 2 vídeos e prova:
//   (a) depois do conserto, as 3 cenas têm plano (eixo) distinto e a ação de cada cena continua a mesma (nada cortado, nada trocado);
//   (b) a ficha/personagem é a mesma de antes em toda cena; a última cena continua sendo o desfecho (texto intacto, eixo de detalhe);
//   (c) o texto do clipe do Kling 4 (promptDaCenaKling4) sai BYTE A BYTE igual ao de antes, e confere com o multi_prompt real do claim;
//   (d) a rota: o eixo só entra com kling4TrialCandidate (que exige seedanceShortFilm = 15 s Seedance grátis); 60 s / pagos: vetor igual;
//       e o diff da rota contra a origin/main é só o import e a linha do conserto;
//   (e) mutantes: sem a linha da rota, sem o strip no Kling 4, e com corte por contagem de palavras — ficam vermelhos.
// Rodar: npx tsx scripts/test-repeticao-free15-1011.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import { kling25ShotAxis, KLING25_SHOT_AXES } from '../lib/cinematic/klingShots.ts'
import { promptDaCenaKling4, eixoCurtoKling4, eixoDoFilmeGratis, semEixoDoFilmeGratis } from '../lib/cinematic/cenaKling4.ts'
import { deriveStyleAnchor } from '../lib/cinematic/sceneStyle.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// ── Os vetores reais (cinematic_submission_claim.response.scene_prompts, 09/11) ──────────────────────────────────────────────
const LOCK = 'Film visual medium: photorealistic, ultra-detailed. '
const ERA = ' Period setting: 1963 (1960s). Any person the shot describes wears 1960s dress: slim suits with skinny ties, shift dresses, beehive and bouffant hair, horn-rimmed glasses (do not add people the shot does not mention); a car or carriage, only if the shot describes one, is long boxy 1960s cars with chrome trim (do not add vehicles the shot does not mention; an aircraft, ship or train stays exactly what the shot says); props the shot describes are rotary telephones, transistor radios, black-and-white televisions; absolutely no present-day smartphones, no present-day cars, no hoodies or modern streetwear, no LED screens.'
const MOLDURA_MAPA = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, cinematic_dark, documentary, consistent color grade across all scenes, period piece set strictly in the historical era being narrated, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic'
const LETRA = ', any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers'
const PAGINA = ' Every page shows only aged texture and faint decorative lines.'
// a2738d68 (BR, Kling 4 grátis, nota 6, "mão no mapa em 3 quadros")
const MAPA = {
  nome: 'a2738d68 mapa 1963',
  explicito: 'mysterious, cinematic_dark, documentary, consistent color grade across all scenes',
  cenas: [
    `${LOCK}Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. A close-up of an ancient map, revealing intricate details as a finger traces lost continents, illuminated by soft, eerie light.${MOLDURA_MAPA}${LETRA}, 9:16 vertical framing.${ERA}${PAGINA}`,
    `${LOCK}An underwater scene showing a dark, mysterious ocean with shadows of unknown creatures lurking, hinting at the vast number of undiscovered marine species.${MOLDURA_MAPA}, 9:16 vertical framing.${ERA}`,
    `${LOCK}A scientist in a lab, looking at a large, dark ocean map spread out on a table, pointing at the unexplored areas with a look of astonishment.${MOLDURA_MAPA}${LETRA}, 9:16 vertical framing.${ERA}${PAGINA}`,
  ],
  acoes: ['finger traces lost continents', 'shadows of unknown creatures lurking', 'pointing at the unexplored areas'],
  // o multi_prompt que foi à fal (sem o "Scene N: use … keyframe. ") — o texto do clipe de antes; nenhuma cena com eixo
  enviado: [
    'Photoreal film. Period setting: 1963 (1960s). A close-up of an ancient map, revealing intricate details as a finger traces lost continents, illuminated by soft, eerie light.',
    'Photoreal film. Period setting: 1963 (1960s). An underwater scene showing a dark, mysterious ocean with shadows of unknown creatures lurking, hinting at the vast number of undiscovered marine species.',
    'Photoreal film. Period setting: 1963 (1960s). A scientist in a lab, looking at a large, dark ocean map spread out on a table, pointing at the unexplored areas with a look of astonishment.',
  ],
}
const MOLDURA_NL = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, epic, golden_hour, broadcast, consistent color grade across all scenes, 9:16 vertical framing'
const FICHA_NL = 'a person in their thirties with short reddish hair, freckles and a small nose, wearing a white shirt with rolled sleeves and dark trousers'
// 211b0857 (NL, Kling 4 grátis, nota 7, "rapaz escrevendo em 4 de 8", pediu alta energia)
const ESTUDO = {
  nome: '211b0857 disciplina',
  explicito: 'epic, golden_hour, broadcast, consistent color grade across all scenes',
  cenas: [
    `${LOCK}Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. A vibrant city skyline bathed in golden sunlight, symbolizing a new day and endless possibilities, with soft clouds drifting above.${MOLDURA_NL}`,
    `${LOCK}Named character in this shot: the person, ${FICHA_NL} — clearly visible in frame, seen from behind or in profile, face not readable. A determined athlete performing an intense workout, sweat glistening as they push through exhaustion, captured in a close-up shot of effort and focus.${MOLDURA_NL}`,
    `${LOCK}A focused individual studying late at night, surrounded by books and notes, with a determined expression, symbolizing self-improvement and ambition.${MOLDURA_NL}`,
  ],
  acoes: ['city skyline bathed in golden sunlight', 'performing an intense workout', 'studying late at night'],
  enviado: [
    'Photoreal film. Medium shot, subject centered and clearly readable. A vibrant city skyline bathed in golden sunlight',
    'Photoreal film. seen from behind or in profile, face not readable.',
    'Photoreal film. Extreme close-up on a telling detail of the subject. A focused individual studying late at night',
  ],
}

const eixoDe = (p) => { const corpo = p.startsWith(LOCK) ? p.slice(LOCK.length) : p; return KLING25_SHOT_AXES.find((e) => corpo.startsWith(`${e}. `)) ?? null }
const escala = (e) => (e ?? '').split(',')[0].trim()

for (const filme of [MAPA, ESTUDO]) {
  console.log(`\n── ${filme.nome} ──`)
  const style = deriveStyleAnchor(filme.cenas.join(' '), filme.explicito)
  const antes = filme.cenas
  // (a) ANTES: o vetor que desenhou as imagens-chave não tem eixo nenhum; "smooth camera motion" é a única câmera, igual nas 3.
  ok(antes.every((p) => eixoDe(p) === null), 'antes: nenhuma cena do vetor (imagem-chave / reserva) tem eixo de câmera')
  ok(antes.every((p) => (p.match(/smooth camera motion/g) ?? []).length === 1), 'antes: a única câmera é "smooth camera motion", a mesma nas 3')
  // O conserto, como a rota o aplica (vetor final, depois da trava de estilo).
  const depois = antes.map((p, i) => eixoDoFilmeGratis(p, i))
  const eixos = depois.map(eixoDe)
  ok(eixos.every(Boolean), 'depois: as 3 cenas têm eixo do rodízio')
  ok(new Set(eixos.map(escala)).size === 3, `depois: 3 escalas distintas (${eixos.map(escala).join(' | ')})`)
  ok(eixos.every((e, i) => e === kling25ShotAxis(i)), 'depois: o eixo é o do índice da cena (o mesmo do texto do clipe do Kling 4)')
  ok(eixos.every((e, i) => escala(eixoCurtoKling4(i)) === escala(e)), 'depois: imagem-chave e texto do clipe pedem a MESMA escala por cena')
  ok(depois.every((p) => p.startsWith(LOCK)), 'depois: a trava de estilo continua a 1ª coisa do prompt')
  ok(depois.every((p, i) => p === `${LOCK}${kling25ShotAxis(i)}. ${antes[i].slice(LOCK.length)}`), 'depois: só PREFIXO — o corpo inteiro segue, sem corte nem normalização')
  ok(depois.every((p, i) => p.includes(filme.acoes[i])), 'depois: a ação de cada cena (da fala) continua no prompt')
  ok(new Set(filme.acoes).size === 3 && filme.acoes.every((a, i) => filme.acoes.every((b, j) => i === j || !depois[j].includes(a))), 'depois: as 3 ações são distintas (cada uma só na sua cena)')
  // (b) ficha e desfecho
  const fichas = antes.map((p) => p.includes(FICHA_NL))
  ok(depois.every((p, i) => p.includes(FICHA_NL) === fichas[i]), 'ficha/personagem: a mesma descrição, nas mesmas cenas, de antes')
  ok(depois.at(-1).endsWith(antes.at(-1).slice(LOCK.length)), 'última cena: o desfecho segue inteiro, intacto')
  ok(escala(eixos.at(-1)) !== escala(eixos[0]) && /close-up/i.test(eixos.at(-1)), 'última cena: plano de detalhe, nunca o plano da abertura')
  ok(depois.map((p, i) => eixoDoFilmeGratis(p, i)).every((p, i) => p === depois[i]), 'idempotente: reaplicar não empilha eixo')
  ok(depois.every((p, i) => semEixoDoFilmeGratis(p) === antes[i]), 'strip é o inverso exato')
  ok(antes.every((p) => semEixoDoFilmeGratis(p) === p), 'strip em prompt sem eixo = byte a byte (pagos, 35/60/90)')
  // (c) o texto do clipe do Kling 4: byte a byte o de antes, e igual ao que foi à fal
  const k4Antes = antes.map((p, i) => promptDaCenaKling4(p, style, i))
  const k4Depois = depois.map((p, i) => promptDaCenaKling4(p, style, i))
  ok(k4Depois.every((p, i) => p === k4Antes[i]), 'Kling 4: texto do clipe byte a byte igual ao de antes (o eixo curto continua o mesmo)')
  ok(k4Antes.every((p, i) => p.startsWith(filme.enviado[i])), 'Kling 4: o código reproduz o começo do multi_prompt real do claim')
  ok(k4Depois.every((p) => Array.from(p).length <= 512 && p.endsWith('Mouth closed, no speaking.')), 'Kling 4: ≤ 512 e a cauda "Mouth closed, no speaking." intacta')
  if (filme === MAPA) ok(k4Antes.every((p, i) => !p.includes(escala(eixoCurtoKling4(i)))), 'mapa: o eixo curto do clipe NÃO coube em nenhuma cena (a causa) — a imagem-chave agora carrega o plano')
  console.log('     antes  →', antes.map((p) => p.slice(LOCK.length, LOCK.length + 70)).join('  ||  '))
  console.log('     depois →', depois.map((p) => p.slice(LOCK.length, LOCK.length + 70)).join('  ||  '))
}

// ── (d) a rota ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\n── rota ──')
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const rota = rd(ROTA)
const linha = rota.split('\n').find((l) => l.includes('KINEO-REPETICAO-FREE15-1011 [aval'))
ok(!!linha && /^\s*if \(kling4TrialCandidate\) for \(let i = 0; i < classicScenePrompts\.length; i\+\+\) classicScenePrompts\[i\] = eixoDoFilmeGratis\(classicScenePrompts\[i\], i\)/.test(linha), 'a linha da rota aplica o eixo SÓ com kling4TrialCandidate')
const idxLinha = rota.indexOf(linha)
ok(idxLinha > rota.indexOf('limitarPromptDoFilmeKling25(classicScenePrompts[i], i)') && idxLinha < rota.indexOf('const sceneStills: (string | null)[]') && idxLinha < rota.indexOf('const kling4Prompts = classicScenePrompts.map'), 'a linha vem depois do último toque no vetor e antes das imagens-chave e do texto do Kling 4')
ok(/let kling4TrialCandidate = false\n\s*if \(KLING4_TRIAL_LIVE && seedanceShortFilm && !isPaidUser/.test(rota) && /const seedanceShortFilm = duration === SEEDANCE_SHORT_SECONDS && isSeedance15/.test(rota), 'kling4TrialCandidate exige 15 s Seedance grátis (nunca 35/60/90, nunca pago)')
const rodaLinha = (candidato, prompts) => { const ctx = { kling4TrialCandidate: candidato, classicScenePrompts: [...prompts], eixoDoFilmeGratis }; vm.runInNewContext(linha.split(' // ')[0], ctx); return ctx.classicScenePrompts }
const sessenta = Array.from({ length: 12 }, (_, i) => `${LOCK}Scene ${i + 1} of a 60 s film, a lighthouse keeper climbs the stairs, smooth camera motion, 9:16 vertical framing`)
ok(rodaLinha(false, sessenta).every((p, i) => p === sessenta[i]), 'filme de 60 s (kling4TrialCandidate=false): vetor byte a byte igual')
ok(rodaLinha(false, MAPA.cenas).every((p, i) => p === MAPA.cenas[i]), 'Seedance 15 s pago (candidato=false): vetor byte a byte igual')
ok(rodaLinha(true, MAPA.cenas).every((p, i) => eixoDe(p) === kling25ShotAxis(i)), 'filme grátis (candidato=true): a linha EXECUTADA põe o eixo')
let base = null
try { base = execFileSync('git', ['show', `origin/main:${ROTA}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n') } catch { /* sem origin/main local */ }
if (base) {
  const a = base.split('\n'), b = rota.split('\n')
  const tirados = a.filter((l) => !b.includes(l)), postos = b.filter((l) => !a.includes(l))
  ok(tirados.length === 0 && postos.length === 2 && postos.every((l) => /KINEO-REPETICAO-FREE15-1011/.test(l)), `diff da rota contra a origin/main = só o conserto (${tirados.length} linhas tiradas, ${postos.length} postas: o import em linha própria e a linha do eixo)`)
  // o recibo exato (scripts/test-support/desfaz-repeticao-free15-1011.mjs) devolve a origin/main byte a byte nos 2 arquivos
  const { deltaRepeticaoFree151011Exato } = await import('./test-support/desfaz-repeticao-free15-1011.mjs')
  for (const f of [ROTA, 'lib/cinematic/cenaKling4.ts']) ok(deltaRepeticaoFree151011Exato(readFileSync(f, 'utf8'), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }), f), `recibo exato: ${f} = origin/main + só esta entrega`)
} else console.log('  (sem origin/main: comparação da rota pulada)')

// ── (e) mutantes ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\n── mutantes ──')
const vermelho = (nome, f) => { let r; try { r = f() } catch { r = false } ok(r === false, `mutante "${nome}" fica vermelho`) }
// 1. sem a linha da rota: o vetor do grátis segue sem eixo
vermelho('sem a linha da rota', () => { const v = rodaLinha(false, ESTUDO.cenas); return v.every(eixoDe) })
// 2. sem o strip no Kling 4: o cenaKling4.ts REAL com a linha do strip apagada, importado de um arquivo temporário
{
  const fonte = readFileSync('lib/cinematic/cenaKling4.ts', 'utf8')
  const semStrip = fonte.split(/\r?\n/).filter((l) => !l.includes('prompt = semEixoDoFilmeGratis(prompt)')).join('\n')
  ok(semStrip !== fonte, 'mutante 2 montado (a linha do strip existe e foi apagada)')
  const tmp = 'lib/cinematic/.mutante-repeticao-1011.ts'
  writeFileSync(tmp, semStrip)
  try {
    const m = await import(pathToFileURL(resolve(tmp)).href)
    const style = deriveStyleAnchor(ESTUDO.cenas.join(' '), ESTUDO.explicito)
    vermelho('Kling 4 sem o strip', () => ESTUDO.cenas.every((p, i) => m.promptDaCenaKling4(eixoDoFilmeGratis(p, i), style, i) === promptDaCenaKling4(p, style, i)))
  } finally { unlinkSync(tmp) }
}
// 3. corte por contagem de palavras (a lição do "menino da bolha"): a proibição da cauda é decapitada
vermelho('corte por contagem de palavras', () => {
  const amputa = (p, i) => `${LOCK}${kling25ShotAxis(i)}. ${p.slice(LOCK.length).split(' ').slice(0, 60).join(' ')}`
  return MAPA.cenas.map(amputa).every((p, i) => p.endsWith(MAPA.cenas[i].slice(-80)))
})
// 4. eixo antes da trava de estilo (o jeito do Kling 2.5): a trava deixa de ser a 1ª coisa do prompt
vermelho('eixo antes da trava de estilo', () => MAPA.cenas.map((p, i) => `${kling25ShotAxis(i)}. ${p}`).every((p) => p.startsWith(LOCK)))
// 5. mesmo eixo nas 3 cenas
vermelho('mesmo eixo nas 3', () => new Set(MAPA.cenas.map((p) => eixoDe(eixoDoFilmeGratis(p, 0))).map(escala)).size === 3)

console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
