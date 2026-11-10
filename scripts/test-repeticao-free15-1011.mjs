// KINEO-REPETICAO-FREE15-1011 [aval permanente do fundador 01/11 (laço do revisor)] — guardião do plano de câmera no filme grátis de 15 s (v2).
// Revisor 09/11: 4 de 4 primeiros filmes grátis de 15 s "mostram a mesma coisa" (mão no mapa em 3 quadros; rapaz escrevendo em 4 de 8).
// Prova no banco (cinematic_submission_claim.response, SELECT): o vetor classicScenePrompts — que desenha as 3 imagens-chave FLUX do
// Kling 4 grátis (mesma seed) e é o prompt dos 3 clipes da reserva Seedance 1.5 — só tinha plano quando o descritor escreveu um; nas
// outras cenas a única câmera era o "smooth camera motion" da moldura.
// v2 (revisão adversária 10/11): (a) cena que JÁ diz plano fica intocada; (b) a última nunca recebe close nem "subject small";
// (c) nenhuma cena recebe plano de família que o filme já tem; 3 cenas com plano = nada muda. O juiz de coerência lê sem o plano.
// TODA verificação roda sobre o código de PRODUÇÃO (lib/cinematic/cenaKling4.ts importado; as linhas da rota EXECUTADAS a partir do
// arquivo real). Cada mutante altera o arquivo de produção em memória (cópia temporária importada / linha da rota mutada) e a mesma
// bateria tem de ficar vermelha. Sem rede, sem banco, sem fornecedor.
// Rodar: npx tsx scripts/test-repeticao-free15-1011.mjs
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import { deriveStyleAnchor } from '../lib/cinematic/sceneStyle.ts'
import { cinematicSceneStillPrompt } from '../lib/hollywood/anchors.ts'

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok   ', m) } else { fail++; console.log('  FALHA', m) } }
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const CENA = 'lib/cinematic/cenaKling4.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'

// ── Os vetores reais (cinematic_submission_claim.response.scene_prompts, 09/11) ──────────────────────────────────────────────
const LOCK = 'Film visual medium: photorealistic, ultra-detailed. '
const ABERTURA = 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. '
const ERA = ' Period setting: 1963 (1960s). Any person the shot describes wears 1960s dress: slim suits with skinny ties, shift dresses, beehive and bouffant hair, horn-rimmed glasses (do not add people the shot does not mention); a car or carriage, only if the shot describes one, is long boxy 1960s cars with chrome trim (do not add vehicles the shot does not mention; an aircraft, ship or train stays exactly what the shot says); props the shot describes are rotary telephones, transistor radios, black-and-white televisions; absolutely no present-day smartphones, no present-day cars, no hoodies or modern streetwear, no LED screens.'
const MOLDURA_MAPA = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, mysterious, cinematic_dark, documentary, consistent color grade across all scenes, period piece set strictly in the historical era being narrated, only historically accurate clothing, weapons, vehicles and architecture from that exact time, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles, no modern weapons, no modern uniforms, no power lines, no asphalt, no plastic'
const LETRA = ', any writing on it is intentionally out of focus and unreadable, no legible words, no letters, no numbers'
const PAGINA = ' Every page shows only aged texture and faint decorative lines.'
const MAPA = { // a2738d68 (BR, Kling 4 grátis, nota 6)
  nome: 'a2738d68 mapa 1963', explicito: 'mysterious, cinematic_dark, documentary, consistent color grade across all scenes',
  cenas: [
    `${LOCK}${ABERTURA}A close-up of an ancient map, revealing intricate details as a finger traces lost continents, illuminated by soft, eerie light.${MOLDURA_MAPA}${LETRA}, 9:16 vertical framing.${ERA}${PAGINA}`,
    `${LOCK}An underwater scene showing a dark, mysterious ocean with shadows of unknown creatures lurking, hinting at the vast number of undiscovered marine species.${MOLDURA_MAPA}, 9:16 vertical framing.${ERA}`,
    `${LOCK}A scientist in a lab, looking at a large, dark ocean map spread out on a table, pointing at the unexplored areas with a look of astonishment.${MOLDURA_MAPA}${LETRA}, 9:16 vertical framing.${ERA}${PAGINA}`,
  ],
  acoes: ['finger traces lost continents', 'shadows of unknown creatures lurking', 'pointing at the unexplored areas'],
  esperado: ['proprio', 'medio', 'final'],
}
const MOLDURA_NL = ', faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, epic, golden_hour, broadcast, consistent color grade across all scenes, 9:16 vertical framing'
const FICHA_NL = 'a person in their thirties with short reddish hair, freckles and a small nose, wearing a white shirt with rolled sleeves and dark trousers'
const ESTUDO = { // 211b0857 (NL, Kling 4 grátis, nota 7, pediu alta energia)
  nome: '211b0857 disciplina', explicito: 'epic, golden_hour, broadcast, consistent color grade across all scenes',
  cenas: [
    `${LOCK}${ABERTURA}A vibrant city skyline bathed in golden sunlight, symbolizing a new day and endless possibilities, with soft clouds drifting above.${MOLDURA_NL}`,
    `${LOCK}Named character in this shot: the person, ${FICHA_NL} — clearly visible in frame, seen from behind or in profile, face not readable. A determined athlete performing an intense workout, sweat glistening as they push through exhaustion, captured in a close-up shot of effort and focus.${MOLDURA_NL}`,
    `${LOCK}A focused individual studying late at night, surrounded by books and notes, with a determined expression, symbolizing self-improvement and ambition.${MOLDURA_NL}`,
  ],
  acoes: ['city skyline bathed in golden sunlight', 'performing an intense workout', 'studying late at night'],
  esperado: ['medio', 'proprio', 'final'],
}
// As 4 entradas da revisão adversária (achado 1) — cada uma já diz o plano e tem de sair INTOCADA.
const cenaNL = (desc) => `${LOCK}${desc}${MOLDURA_NL}`
const ADVERSARIAS = [
  ['mapa, cena 1 ("A close-up of an ancient map")', MAPA.cenas, 0],
  ['disciplina, cena 2 (personagem nomeado + "captured in a close-up shot")', ESTUDO.cenas, 1],
  ['cena 3 "Wide shot of the boy hugging his mother"', [ESTUDO.cenas[0], ESTUDO.cenas[2], cenaNL('Wide shot of the boy hugging his mother at the airport gate, tears of relief, warm light.')], 2],
  ['cena 3 "Aerial view of the rocket lifting off"', [ESTUDO.cenas[0], ESTUDO.cenas[2], cenaNL('Aerial view of the rocket lifting off the launch pad in a column of fire and smoke.')], 2],
]
const TRES_COM_PLANO = [cenaNL('Medium shot of a baker kneading dough at dawn.'), cenaNL('Extreme close-up of flour falling through sunlight.'), cenaNL('Wide shot of the bakery opening its doors to the street.')]
const TRES_SEM_PLANO = [cenaNL('A young woman laces her running shoes in a dark bedroom before dawn.'), cenaNL('The young woman runs up a steep city staircase, breath steaming in the cold air.'), cenaNL('The young woman reaches the top and raises her arms as the sun rises over the city.')]
// revisão 2: cena 2 com plano próprio — o clipe não pode receber o rodízio antigo ("Wide establishing shot, subject small")
const REVISAO2 = [cenaNL('A woman opens an old wooden mailbox at dusk.'), cenaNL('Extreme close-up of her trembling hands holding a letter.'), cenaNL('She sits on the porch steps reading the letter as the sun sets.')]
// falsos positivos: objeto, não câmera — a cena tem de RECEBER plano
const OBJETOS = ['A cook flipping pancakes in a cast-iron pan.', 'A satellite drifting in orbit above the blue planet.', 'A tired man on a Zoom call at his kitchen table.', 'A delivery drone carrying a parcel over the suburbs.', 'A white crane bird wading through the misty marsh.', 'A grandfather holding an old camera in his workshop.']
// falsos negativos: construção de câmera — conta como plano próprio
const CAMERAS = ['The city streets seen from above at night.', 'An overhead view of the chessboard mid-game.', "A bird's-eye view of the maze garden.", 'Over the shoulder of the pilot as the runway appears.', 'A tracking shot of the runner along the beach.']
// desfecho em objeto pequeno: o plano final não pode encolher o objeto ("full shot")
const ANEL = [cenaNL('A nervous man walks into a candlelit restaurant.'), cenaNL('He kneels beside the table as the room falls silent.'), cenaNL('A diamond ring glinting in an open velvet box.')]
const SESSENTA =Array.from({ length: 12 }, (_, i) => `${LOCK}Scene ${i + 1}: a lighthouse keeper climbs the stairs, smooth camera motion, 9:16 vertical framing`)

const PLANO_RE = /^(Medium shot|Close-up on a telling detail|Clear well-lit shot of the final moment|Tracking shot gliding|Low-angle shot|High-angle shot)/
const familia = (corpo) => ({ 'Medium shot': 'medio', 'Close-up on a telling detail': 'close', 'Clear well-lit shot of the final moment': 'final', 'Tracking shot gliding': 'lateral', 'Low-angle shot': 'baixo', 'High-angle shot': 'alto' })[PLANO_RE.exec(corpo)?.[1]] ?? null

// ── A bateria: devolve as falhas (vazia = verde). Recebe o módulo de produção (ou o mutante) e as linhas da rota (ou mutantes). ──
const linhasDaRota = (rota) => {
  const L = lf(rota).split('\n')
  const ache = (marca) => L.find((l) => l.includes(marca)) ?? ''
  return {
    aplica: ache('KINEO-REPETICAO-FREE15-1011 [aval'),
    juizK4: ache('c.submittedPrompts = [classicScenePrompts'),
    juizReserva: ache('if (kling4TrialCandidate) c.submittedPrompts.splice'),
    k4: ache('    const kling4Prompts = classicScenePrompts.map((p, i) => promptDaCenaKling4(p, styleAnchor, i))'),
    k4Gratis: ache('if (kling4TrialCandidate) for (let i = 0; i < kling4Prompts.length; i++) kling4Prompts[i] = promptDaCenaKling4('),
  }
}
const rodaAplica = (linha, candidato, prompts, m, style) => {
  const ctx = { kling4TrialCandidate: candidato, classicScenePrompts: [...prompts], eixosDoFilmeGratis: m.eixosDoFilmeGratis, styleAnchor: style }
  vm.runInNewContext(linha.split(' // ')[0], ctx); return ctx.classicScenePrompts
}
const rodaK4 = (L, candidato, prompts, m, style) => { const ctx = { kling4TrialCandidate: candidato, classicScenePrompts: prompts, styleAnchor: style, promptDaCenaKling4: m.promptDaCenaKling4 }; vm.runInNewContext(`${L.k4.split(' // ')[0]}\n${L.k4Gratis.split(' // ')[0]}\nthis.r = kling4Prompts`, ctx); return ctx.r }
const rodaJuizK4 = (linha, prompts, m) => { const ctx = { c: {}, classicScenePrompts: prompts, semEixoDoFilmeGratis: m.semEixoDoFilmeGratis }; vm.runInNewContext(linha.split(' // ')[0], ctx); return ctx.c.submittedPrompts[0] }
const rodaJuizReserva = (linha, cinematic, m) => { const ctx = { c: { submittedPrompts: ['x'] }, sceneIndex: 0, kling4TrialCandidate: true, cinematic, semEixoDoFilmeGratis: m.semEixoDoFilmeGratis }; vm.runInNewContext(linha.split(' // ')[0], ctx); return ctx.c.submittedPrompts[0] }

function bateria(m, rota, log = false) {
  const falhas = []
  const gerados = []
  const f = (c, msg) => { if (!c) falhas.push(msg); if (log) ok(c, msg) }
  const L = linhasDaRota(rota)
  f(!!L.aplica && /^\s*if \(kling4TrialCandidate\) /.test(L.aplica), 'rota: a linha do plano só roda com kling4TrialCandidate')
  for (const filme of [MAPA, ESTUDO]) {
    const style = deriveStyleAnchor(filme.cenas.join(' '), filme.explicito)
    const antes = filme.cenas
    let depois = []
    try { depois = rodaAplica(L.aplica, true, antes, m, style) } catch { depois = antes }
    const corpos = depois.map((p) => p.startsWith(LOCK) ? p.slice(LOCK.length) : p)
    const fams = corpos.map(familia)
    f(depois.every((p) => p.startsWith(LOCK)), `${filme.nome}: a trava de estilo continua a 1ª coisa do prompt`)
    filme.esperado.forEach((esp, i) => {
      if (esp === 'proprio') f(depois[i] === antes[i], `${filme.nome}: cena ${i + 1} já diz plano → INTOCADA`)
      else f(fams[i] === esp && depois[i] === `${LOCK}${corpos[i].slice(0, corpos[i].indexOf('. ') + 2)}${antes[i].slice(LOCK.length)}`, `${filme.nome}: cena ${i + 1} sem plano → ganha "${esp}" só como prefixo (corpo inteiro, nada cortado)`)
    })
    f(depois.every((p, i) => p.includes(filme.acoes[i])), `${filme.nome}: a ação de cada cena continua no prompt`)
    f(depois.every((p, i) => p.includes(FICHA_NL) === antes[i].includes(FICHA_NL)), `${filme.nome}: a ficha do personagem nas mesmas cenas de antes`)
    f(!depois.some((p) => /subject small/i.test(p)), `${filme.nome}: nenhuma cena recebe "subject small"`)
    f(!/close-up on a telling detail/i.test(corpos.at(-1)) && depois.at(-1).endsWith(antes.at(-1).slice(LOCK.length)), `${filme.nome}: a última cena não vira detalhe e o desfecho segue inteiro`)
    const proprios = antes.map((p) => m.planoQueACenaJaTem(p, style))
    const todas = fams.map((x, i) => x ?? proprios[i])
    f(new Set(todas).size === todas.length, `${filme.nome}: 3 planos de famílias distintas (${todas.join(' | ')})`)
    f(depois.every((p, i) => m.semEixoDoFilmeGratis(p) === antes[i]), `${filme.nome}: o inverso devolve o vetor de antes, exato`)
    f(rodaAplica(L.aplica, true, depois, m, style).every((p, i) => p === depois[i]), `${filme.nome}: reaplicar não empilha plano`)
    // Kling 4: a cena intocada sai byte a byte; a cena com plano do grátis leva ESSE plano no texto do clipe (não o rodízio antigo)
    const k4Antes = antes.map((p, i) => m.promptDaCenaKling4(p, style, i))
    let k4Depois = depois.map(() => '')
    try { k4Depois = rodaK4(L, true, depois, m, style) } catch { /* vermelho abaixo */ }
    gerados.push(...depois, ...k4Depois)
    filme.esperado.forEach((esp, i) => {
      if (esp === 'proprio') f(!m.PLANOS_DO_FILME_GRATIS.some(([, fr]) => k4Depois[i].includes(fr.split(', ')[0])) && !k4Depois[i].includes(m.eixoCurtoKling4(i)), `${filme.nome}: Kling 4 cena ${i + 1} (plano próprio): o clipe não recebe plano nenhum`)
      else {
        const curto = m.eixoCurtoDoFilmeGratis(depois[i])
        const velho = m.eixoCurtoKling4(i)
        f(!!curto && k4Depois[i].split(curto).length <= 2 && (curto === velho || !k4Depois[i].includes(velho)), `${filme.nome}: Kling 4 cena ${i + 1}: o clipe nunca pede outro plano que não o da imagem-chave (no máximo uma vez)`)
        f(k4Depois[i].includes(curto) || !k4Antes[i].includes(velho), `${filme.nome}: Kling 4 cena ${i + 1}: onde o eixo antigo cabia, o plano da imagem-chave cabe`)
        f(!k4Depois[i].includes(velho) || curto === velho, `${filme.nome}: Kling 4 cena ${i + 1}: o rodízio antigo nunca entra no grátis`)
      }
      f(Array.from(k4Depois[i]).length <= 512 && k4Depois[i].endsWith('Mouth closed, no speaking.'), `${filme.nome}: Kling 4 cena ${i + 1} ≤ 512 com a cauda intacta`)
    })
    // juiz de coerência: lê SEM o plano (Kling 4 grátis e reserva Seedance)
    let jK4 = '', jRes = ''
    try { jK4 = rodaJuizK4(L.juizK4, depois, m) } catch { /* vermelho abaixo */ }
    f(jK4 === antes.join(' ').slice(0, 240), `${filme.nome}: juiz (Kling 4) grava os 240 chars de ANTES, sem o plano`)
    try { jRes = depois.map((p) => rodaJuizReserva(L.juizReserva, p, m)) } catch { jRes = [] }
    f(Array.isArray(jRes) && jRes.every((s, i) => s === antes[i].slice(0, 240)), `${filme.nome}: juiz (reserva Seedance) grava cada cena sem o plano`)
  }
  // revisão 2: cena 2 com plano próprio — vetor intocado e o clipe sem eixo nenhum (nunca "subject small")
  {
    const st = deriveStyleAnchor(REVISAO2.join(' '), ESTUDO.explicito)
    let v = REVISAO2, k = ['', '', '']
    try { v = rodaAplica(L.aplica, true, REVISAO2, m, st); k = rodaK4(L, true, v, m, st) } catch { /* vermelho */ }
    gerados.push(...v, ...k)
    f(v[1] === REVISAO2[1], 'revisão 2: cena 2 ("Extreme close-up of her trembling hands") intocada no vetor')
    f(!/subject small|Wide establishing|Medium shot|Close-up on a telling|Clear well-lit/i.test(k[1]) && k[1].includes('Extreme close-up of her trembling hands'), 'revisão 2: o clipe da cena 2 não recebe plano nenhum (só o da própria cena)')
    f(k.every((x, i) => i === 1 || x.includes(m.eixoCurtoDoFilmeGratis(v[i]) ?? '\u0000')), 'revisão 2: cenas 1 e 3 levam ao clipe o plano da imagem-chave')
  }
  // objetos que não são câmera → recebem plano; construção de câmera → plano próprio
  for (const frase of OBJETOS) f(m.planoQueACenaJaTem(cenaNL(frase)) === null, `objeto não é plano: "${frase.slice(0, 40)}" recebe plano`)
  f(m.planoQueACenaJaTem(`${cenaNL('A quiet street at dawn.')}, extreme close-up`, { suffix: ', extreme close-up' }) === null, 'estilo do cliente ("extreme close-up" em todas as cenas) não é plano da cena')
  for (const frase of CAMERAS) f(m.planoQueACenaJaTem(cenaNL(frase)) !== null, `câmera conta como plano próprio: "${frase.slice(0, 40)}"`)
  // desfecho em objeto pequeno: o plano final não diz "full shot" nem encolhe o anel
  {
    let v = []
    try { v = rodaAplica(L.aplica, true, ANEL, m, deriveStyleAnchor(ANEL.join(' '), ESTUDO.explicito)) } catch { /* vermelho */ }
    gerados.push(...v)
    f(v.length === 3 && familia(v[2].slice(LOCK.length)) === 'final' && !/full shot|subject small|whole subject/i.test(v[2]), 'anel: a última cena pede o momento final reconhecível, sem "full shot"')
  }
  // achado 1: as 4 entradas adversárias e "3 cenas com plano = igual"
  for (const [nome, cenas, i] of ADVERSARIAS) {
    let saida = cenas
    try { saida = rodaAplica(L.aplica, true, cenas, m, deriveStyleAnchor(cenas.join(' '), ESTUDO.explicito)) } catch { saida = [] }
    f(saida[i] === cenas[i], `adversária: ${nome} → intocada`)
    f(!saida.some((p) => /subject small/i.test(p ?? '')), `adversária: ${nome} → ninguém vira "subject small"`)
  }
  // filme sem plano nenhum: abertura médio, meio detalhe, FECHO o sujeito inteiro (nunca close, nunca "subject small")
  let sem = []
  try { sem = rodaAplica(L.aplica, true, TRES_SEM_PLANO, m, deriveStyleAnchor(TRES_SEM_PLANO.join(' '), ESTUDO.explicito)) } catch { /* vermelho */ }
  const famSem = sem.map((p) => familia(p.slice(LOCK.length)))
  f(famSem.join('|') === 'medio|close|final', `3 cenas sem plano → médio | detalhe | momento final reconhecível (${famSem.join(' | ')})`)
  let tres = []
  try { tres = rodaAplica(L.aplica, true, TRES_COM_PLANO, m, deriveStyleAnchor(TRES_COM_PLANO.join(' '), ESTUDO.explicito)) } catch { /* vermelho */ }
  f(tres.length === 3 && tres.every((p, i) => p === TRES_COM_PLANO[i]), '3 cenas que já têm plano → saída = entrada')
  // nenhum texto gerado para o grátis (imagem-chave ou clipe) diz "subject small"
  const pequenos = gerados.filter((x) => /subject small/i.test(String(x))).length
  f(gerados.length > 0 && pequenos === 0, `"subject small" em ${pequenos} de ${gerados.length} textos gerados para o grátis`)
  if (log) console.log(`   (contagem de "subject small" nos textos do grátis: ${pequenos} de ${gerados.length})`)
  // Kling 4 PAGO: a rota com candidato=false e o promptDaCenaKling4 sem a flag saem byte a byte iguais à origin/main
  if (mainCena) for (const [nome, v] of [['mapa', MAPA.cenas], ['disciplina', ESTUDO.cenas], ['revisão 2', REVISAO2]]) {
    const st = deriveStyleAnchor(v.join(' '), ESTUDO.explicito)
    let pago = []
    try { pago = rodaK4(L, false, v, m, st) } catch { /* vermelho */ }
    f(pago.length === v.length && pago.every((x, i) => x === mainCena.promptDaCenaKling4(v[i], st, i)), `Kling 4 pago (${nome}): texto do clipe byte a byte o da origin/main`)
  }
  // pagos / 60 s: candidato=false → vetor igual; e o texto do clipe pago (sem plano do grátis) igual ao de antes
  let sess = []
  try { sess = rodaAplica(L.aplica, false, SESSENTA, m, null) } catch { /* vermelho */ }
  f(sess.length === 12 && sess.every((p, i) => p === SESSENTA[i]), 'filme de 60 s / pago (candidato=false): vetor byte a byte igual')
  f(SESSENTA.every((p) => m.semEixoDoFilmeGratis(p) === p), 'prompt sem plano do grátis passa intocado pelo inverso (Kling 4 pago)')
  return falhas
}

let mainCena = null
try {
  const tmpMain = 'lib/cinematic/.main-cenaKling4-1011.ts'
  writeFileSync(tmpMain, execFileSync('git', ['show', `origin/main:${CENA}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  try { mainCena = await import(pathToFileURL(resolve(tmpMain)).href) } finally { unlinkSync(tmpMain) }
} catch { console.log('  (sem origin/main: prova do pago pulada)') }

// ── 1. o código de produção ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log('── produção ──')
const prod = await import('../lib/cinematic/cenaKling4.ts')
const rotaReal = readFileSync(ROTA, 'utf8')
const falhasProd = bateria(prod, rotaReal, true)

// antes/depois e tamanho do still (o gerador de imagem recebe cinematicSceneStillPrompt do vetor)
for (const filme of [MAPA, ESTUDO]) {
  const style = deriveStyleAnchor(filme.cenas.join(' '), filme.explicito)
  const depois = rodaAplica(linhasDaRota(rotaReal).aplica, true, filme.cenas, prod, style)
  console.log(`\n   ${filme.nome}`)
  depois.forEach((p, i) => {
    const still = cinematicSceneStillPrompt({ scenePrompt: p, styleSuffix: '', aspect: '9:16' })
    const stillAntes = cinematicSceneStillPrompt({ scenePrompt: filme.cenas[i], styleSuffix: '', aspect: '9:16' })
    console.log(`   cena ${i + 1}: ${p === filme.cenas[i] ? '(intocada)' : p.slice(LOCK.length, p.indexOf('. ', LOCK.length) + 1)}  · still ${stillAntes.length} → ${still.length} chars`)
  })
}

// ── 2. a rota contra a origin/main ────────────────────────────────────────────────────────────────────────────────────────────
console.log('\n── rota ──')
let base = null
try { base = execFileSync('git', ['show', `origin/main:${ROTA}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) } catch { /* sem origin/main */ }
if (base) {
  const { deltaRepeticaoFree151011Exato } = await import('./test-support/desfaz-repeticao-free15-1011.mjs')
  for (const f of [ROTA, CENA]) ok(deltaRepeticaoFree151011Exato(readFileSync(f, 'utf8'), execFileSync('git', ['show', `origin/main:${f}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }), f), `recibo exato: ${f} = origin/main + só esta entrega`)
} else console.log('  (sem origin/main: recibo pulado)')

// ── 3. mutantes: o arquivo de produção mutado em memória; a mesma bateria tem de ficar vermelha ────────────────────────────────
console.log('\n── mutantes ──')
const fonteCena = lf(readFileSync(CENA, 'utf8'))
const muta = (texto0, de, para, nome) => { const texto = lf(texto0); de = lf(de); para = lf(para); if (texto.split(de).length !== 2) throw new Error(`mutante "${nome}": trecho de produção ausente/ambíguo`); return texto.replace(de, () => para) }
let n = 0
async function mutanteDaLib(nome, de, para) {
  const tmp = `lib/cinematic/.mutante-repeticao-1011-${++n}.ts`
  writeFileSync(tmp, muta(fonteCena, de, para, nome))
  try {
    const m = await import(pathToFileURL(resolve(tmp)).href)
    const r = bateria(m, rotaReal)
    ok(r.length > 0, `mutante "${nome}" fica vermelho (${r.length} falha(s): ${r[0] ?? '-'})`)
  } finally { unlinkSync(tmp) }
}
function mutanteDaRota(nome, de, para) {
  const r = bateria(prod, muta(rotaReal, de, para, nome))
  ok(r.length > 0, `mutante "${nome}" fica vermelho (${r.length} falha(s): ${r[0] ?? '-'})`)
}
await mutanteDaLib('(a) cena com plano próprio também ganha prefixo', '    if (proprio[i]) return p\n', '    if (planoGratisDe(corpoDoPrompt(p).corpo)) return p\n')
await mutanteDaLib('(b) a última cena perde a regra do fecho', 'n > 1 && i === n - 1 ? PREFERENCIA.fecho', 'n > 1 && i === n - 1 ? PREFERENCIA.meio')
await mutanteDaLib('(b) volta o "subject small"', "['medio', 'Medium shot, subject centered and clearly readable, slow push-in'],", "['medio', 'Wide establishing shot, subject small against a vast environment, slow push-in'],")
await mutanteDaLib('(c) sem desempate de família', 'const familia = lista.find((f) => !usadas.has(f)) ?? lista[0]', 'const familia = lista[0]')
await mutanteDaLib('estilo do cliente conta como plano', "  if (style?.suffix) t = t.split(style.suffix).join(' ')", '  if (false) t = t')
await mutanteDaLib('corte por contagem de palavras', 'return `${trava}${FRASE[familia]}. ${corpo}`', "return `${trava}${FRASE[familia]}. ${corpo.split(' ').slice(0, 60).join(' ')}`")
await mutanteDaLib('plano antes da trava de estilo', 'return `${trava}${FRASE[familia]}. ${corpo}`', 'return `${FRASE[familia]}. ${trava}${corpo}`')
await mutanteDaLib('Kling 4 sem tirar o plano do vetor', '  if (gratis) prompt = semEixoDoFilmeGratis(prompt) // KINEO-REPETICAO-FREE15-1011\n', '')
await mutanteDaLib('recoloca o eixo antigo no clipe do grátis', 'const eixo = gratis ? eixoGratis : eixoCurtoKling4(index)', 'const eixo = gratis ? (eixoGratis ?? eixoCurtoKling4(index)) : eixoCurtoKling4(index)')
await mutanteDaLib('pago perde o eixo de sempre', 'const eixo = gratis ? eixoGratis : eixoCurtoKling4(index)', 'const eixo = eixoGratis')
await mutanteDaLib('regex conta objeto como câmera (pan/orbit/zoom/drone/crane/camera)', 'pan(?:ning)?\\s+shot|', 'pan|orbit|zoom|drone|crane|camera|pan(?:ning)?\\s+shot|')
await mutanteDaLib('plano final volta a ser "full shot"', "['final', 'Clear well-lit shot of the final moment with the subject fully recognizable, slow pull-back'],", "['final', 'Full shot showing the whole subject clearly in the final action, slow pull-back'],")
mutanteDaRota('rota sem a linha do plano', linhasDaRota(rotaReal).aplica, '    if (kling4TrialCandidate) {}')
mutanteDaRota('rota aplica em todo filme (60 s/pago)', 'if (kling4TrialCandidate) classicScenePrompts.splice', 'if (true) classicScenePrompts.splice')
mutanteDaRota('juiz do Kling 4 lê com o plano', 'classicScenePrompts.map(semEixoDoFilmeGratis).join', 'classicScenePrompts.join')
mutanteDaRota('rota sem a linha do clipe do grátis', linhasDaRota(rotaReal).k4Gratis, '    if (kling4TrialCandidate) {}')
mutanteDaRota('juiz da reserva lê com o plano', 'semEixoDoFilmeGratis(cinematic).slice(0, 240)', 'cinematic.slice(0, 240)')

ok(falhasProd.length === 0, `produção: bateria inteira verde (${falhasProd.length} falha(s))`)
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
