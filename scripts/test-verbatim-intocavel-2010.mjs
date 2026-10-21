// [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] KINEO-VERBATIM-INTOCAVEL-2010 — guardião: "Use my script as is"
// volta a ser intocável no filme curto (Seedance 1.5, 15 s).
//
// O defeito (teste de 20/10, docs/RESULTADO-PERSONAGEM-2026-10-20.md item 7, renders c1d621cc/ef40b91f/54da130f): o /generate
// decide se o roteiro colado "cabe" no filme de 15 s com roteiroCabeNoFilmeCurto (lib/growth/entradaSeedance15.ts). Desde a E2b
// (29/09) ela contava o texto CRU — rótulos HOOK (0-2s): / MICRO REWARD 2: / PAYOFF: e pistas [Pexels: ...] contavam como fala.
// Os 3 roteiros do teste (41/44/41 palavras faladas, a guarda do cinematic aceita até 56) mediam 57/62/62 → "não cabe" →
// handleAnalyze(sp, { ..., scriptModeOverride: 'ai' }) → /api/generate-script → o GPT acrescentou/trocou um bloco MICRO REWARD
// (Dino: + `Dino: "What was that?"`; Ravan: "Ravan's face comes alive…" → "The ashes of the effigy scatter…"; moto: + "A
// mysterious girl appeared…"). Evento script_written de 20/10 21:04/21:09/21:13 UTC: original_idea ≠ script_head.
//
// O que ele prova, EXECUTANDO o código real (loader offline) e lendo a LINHA da fonte; cada bloco com mutante que fica vermelho:
//   V. o caso real: os 3 roteiros EXATOS do banco cabem (antes: não cabiam — a fonte sem a entrega, desfeita em memória, é o
//      vermelho de antes);
//   G. a régua do cliente = a guarda da rota (checarFalaDoFilmeCurto sobre parseUserScript(...).narration) para roteiro marcado
//      com pistas, de 30 a 62 palavras faladas; e = o teto do handoff do GPT (validateHandoffInput);
//   T. o teaser em modo IA continua para o roteiro que a guarda recusaria de verdade (57+ palavras faladas; turco 46+);
//   C. os chamadores: o auto-analyze do /generate (a linha real) não força 'ai' no caso real, e a decisão needsStructuring
//      (a expressão real, executada) fica false em verbatim; o /go do GPT abre em script_mode=verbatim;
//   M. mutantes: contagem crua de volta, só sem pistas (rótulos ainda contam), sem a língua — todos vermelhos;
//   D. o desfaz devolve a fonte de antes byte a byte (e recusa fonte alheia).
import { readFileSync } from 'node:fs'
import { semBebeQueFala2010 } from './test-support/desfaz-bebe-que-fala-2010.mjs' // reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) entrou depois e reancorou os mesmos guardiões/desfaz: sai em memória antes de contar e comparar
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { semVerbatimIntocavel2010, semVerbatimIntocavel2010NaCadeia, MARCA_VERBATIM_INTOCAVEL_2010, REANCORAS_VERBATIM_INTOCAVEL_2010, ACRESCIMOS_REANCORA_VERBATIM_INTOCAVEL_2010, TROCAS_REANCORA_VERBATIM_INTOCAVEL_2010 } from './test-support/desfaz-verbatim-intocavel-2010.mjs'
import { semHomeRemodela2010, HOME_REMODELA_2010_ARQUIVOS, HOME_REMODELA_2010_JSON, MARCA_HOME_REMODELA_2010 } from './test-support/desfaz-home-remodela-2010.mjs' // KINEO-HOME-REMODELA-2010 — a home e o menu remodelados (20/10, entrega de depois, com desfaz próprio) não são desta entrega

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(RAIZ)
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; console.log('  ✓ ' + nome); return } falhas.push(nome); console.error('  ✗ ' + nome) }
const L = createOfflineLoader()
const compila = (src) => {
  if (typeof src !== 'string') return {}
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, module: { exports }, require: (n) => L(n), console: { log() {}, warn() {}, error() {} }, URL, URLSearchParams })
  return exports
}
const trocaUma = (src, a, b) => (typeof src === 'string' && src.split(a).length === 2 ? src.split(a).join(b) : null)

const EN_PATH = 'lib/growth/entradaSeedance15.ts'
const EN_SRC = rd(EN_PATH)
const EN = L(EN_PATH)
const EN_ANTES = compila(semVerbatimIntocavel2010(EN_PATH, EN_SRC))
const SP = L('lib/scriptParser.ts')
const D = L('lib/durationByEngine.ts')
const TL = L('lib/textLanguage.ts')
const GH = L('lib/gptHandoff.ts')
const fala = (t) => SP.parseUserScript(t).narration.split(/\s+/).filter(Boolean).length
const crua = (t) => t.split(/\s+/).filter(Boolean).length
/** a guarda de roteiro longo da rota do cinematic (route.ts: checarFalaDoFilmeCurto com parseUserScript(prompt).narration) */
const guardaAceita = (t, lang = 'en') => {
  const idioma = TL.resolveNarrationLanguage(lang, t).language
  const narration = SP.parseUserScript(t).narration
  const base = D.checarFalaDoFilmeCurto({ engine: 'seedance', seconds: 15, verbatim: true, narration }).ok
  const naLingua = D.fatorDoRitmoDoIdioma(idioma) < 1 ? D.checarFalaDoFilmeCurto({ engine: 'seedance', seconds: 15, verbatim: true, narration, language: idioma }).ok : true
  return base && naLingua
}

// Os 3 roteiros EXATOS colados no teste de 20/10 (events.script_written.original_idea, 21:04:48 / 21:09:33 / 21:13:34 UTC).
const CASOS = {
  dino: 'HOOK: [Pexels: dark forest night] It was bedtime, but Dino heard a strange noise in the forest!\n\nMICRO REWARD 2: [Pexels: dinosaur blanket window] Dino: "Oh no!\n\nPAYOFF: [Pexels: fireflies glowing] Dino took a deep breath, opened the window... and found fireflies! The noise? Just a twig. The darkness wasn\'t so scary after all. Good night, Dino!',
  ravan: 'HOOK (0-2s): [Pexels: colorful cartoon boy] A sad Indian boy stands beside a burnt Ravan effigy.\n\nMICRO REWARD 2: [Pexels: ravan face alive] Ravan\'s face comes alive, looking exhausted and annoyed.\n\nPAYOFF: [Pexels: cartoon boy shock] Ravan: "Bhai, I want to rest in peace... but people won\'t even let me rest in peace!" The boy stares in shock; Ravan rolls his eyes.',
  moto: 'HOOK (0-2s): [Pexels: old cemetery at night] Midnight.\n\nMICRO REWARD 1: [Pexels: young man on motorcycle] A boy rode his bike home through a haunted path.\n\nPAYOFF: [Pexels: empty road at night] He agreed—only to learn... she was buried there three years ago. His bike stopped. Her photo... on a grave. He vanished. Only the sound of a bike remains at midnight.',
}
const ESPERADO = { dino: [57, 41], ravan: [62, 44], moto: [62, 41] }

console.log('V) o caso real de 20/10 (Dino, Ravan, menino da moto)')
checa('a fonte carrega a marca da entrega', EN_SRC.includes(MARCA_VERBATIM_INTOCAVEL_2010))
for (const [nome, t] of Object.entries(CASOS)) {
  checa(`${nome}: ${ESPERADO[nome][0]} palavras cruas, ${ESPERADO[nome][1]} faladas (a régua da guarda)`, crua(t) === ESPERADO[nome][0] && fala(t) === ESPERADO[nome][1])
  checa(`${nome}: a guarda do cinematic aceita o roteiro inteiro a 15 s`, guardaAceita(t))
  checa(`${nome}: DEPOIS cabe no filme curto (fica verbatim)`, EN.roteiroCabeNoFilmeCurto(t, 15, 'en') === true)
  checa(`${nome}: ANTES (fonte sem a entrega) não cabia — o vermelho que trocava o verbatim por modo IA`, typeof EN_ANTES.roteiroCabeNoFilmeCurto === 'function' && EN_ANTES.roteiroCabeNoFilmeCurto(t, 15, 'en') === false)
}

console.log('G) a régua do cliente é a da guarda e a do handoff do GPT, para roteiro marcado com pistas')
const PALAVRAS = 'the old lighthouse keeper heard a knock at midnight and nobody was there when he opened the heavy wooden door again'.split(' ')
const marcado = (n) => {
  const w = Array.from({ length: n }, (_, i) => PALAVRAS[i % PALAVRAS.length])
  const q = Math.ceil(n / 4)
  const partes = [w.slice(0, q), w.slice(q, 2 * q), w.slice(2 * q, 3 * q), w.slice(3 * q)]
  const rot = ['HOOK (0-2s): [Pexels: foggy lighthouse at night]', 'MICRO REWARD 1: [Pexels: wooden door close up]', 'MICRO REWARD 2: [Pexels: empty stone stairs]', 'PAYOFF: [Pexels: storm over the sea]']
  return partes.map((p, i) => `${rot[i]} ${p.join(' ')}.`).join('\n\n')
}
{
  let iguais = 0, total = 0, iguaisGH = 0
  for (let n = 30; n <= 62; n++) {
    const t = marcado(n)
    total++
    if (EN.roteiroCabeNoFilmeCurto(t, 15, 'en') === guardaAceita(t)) iguais++
    if (EN.roteiroCabeNoFilmeCurto(t, 15, 'en') === GH.validateHandoffInput({ script: t, durationSec: 15, engineHint: 'seedance', language: 'en' }).ok) iguaisGH++
  }
  checa(`marcado + pistas, 30–62 palavras faladas: ${iguais}/${total} iguais à guarda da rota`, iguais === total)
  checa(`marcado + pistas, 30–62 palavras faladas: ${iguaisGH}/${total} iguais ao teto do handoff do GPT`, iguaisGH === total)
  let antesErra = 0
  for (let n = 30; n <= 62; n++) { const t = marcado(n); if (EN_ANTES.roteiroCabeNoFilmeCurto(t, 15, 'en') !== guardaAceita(t)) antesErra++ }
  checa(`antes da entrega a régua divergia da guarda em ${antesErra} casos (o defeito existia fora do caso real)`, antesErra > 0)
  let prosa = 0, totalProsa = 0
  for (const lang of ['en', 'pt', 'es', 'tr', 'de', undefined]) for (let n = 1; n <= 70; n++) {
    const t = Array.from({ length: n }, () => 'kelime').join(' ')
    totalProsa++; if (EN.roteiroCabeNoFilmeCurto(t, 15, lang) === EN_ANTES.roteiroCabeNoFilmeCurto(t, 15, lang)) prosa++
  }
  checa(`prosa sem rótulo: idêntica à de antes em ${prosa}/${totalProsa} casos (6 línguas × 1–70 palavras)`, prosa === totalProsa)
}

console.log('T) o teaser em modo IA continua só para o que a guarda recusaria')
checa('marcado com 57 palavras faladas (en): não cabe, e a guarda também recusa', EN.roteiroCabeNoFilmeCurto(marcado(57), 15, 'en') === false && guardaAceita(marcado(57)) === false)
checa('marcado com 56 palavras faladas (en): cabe, e a guarda aceita', EN.roteiroCabeNoFilmeCurto(marcado(56), 15, 'en') === true && guardaAceita(marcado(56)) === true)
checa('turco: 46 palavras não cabem; 45 cabem (o teto na língua continua)', EN.roteiroCabeNoFilmeCurto(Array(46).fill('kelime').join(' '), 15, 'tr') === false && EN.roteiroCabeNoFilmeCurto(Array(45).fill('kelime').join(' '), 15, 'tr') === true)
checa('vazio/nulo cabe (sem exceção)', EN.roteiroCabeNoFilmeCurto('', 15, 'en') === true && EN.roteiroCabeNoFilmeCurto(null, 15, 'en') === true && EN.roteiroCabeNoFilmeCurto(undefined) === true)

console.log('C) os chamadores')
const GEN = rd('app/(dashboard)/generate/GenerateClient.tsx')
const LINHA_AUTO = "    if (mode === 'cinematic_ai' && aiEngine === 'seedance' && duration === SEEDANCE_SHORT_SECONDS && !roteiroCabeNoFilmeCurto(sp, SEEDANCE_SHORT_SECONDS, language)) {"
const LINHA_AUTO_IA = "      handleAnalyze(sp, { fromTopic: true, skipPreview: true, structureFirst: true, scriptModeOverride: 'ai' })"
{
  const L_ = GEN.split('\n').map((l) => l.trimEnd())
  const i = L_.indexOf(LINHA_AUTO)
  checa('auto-analyze do /generate: a linha que força modo IA a 15 s lê roteiroCabeNoFilmeCurto (linha inteira)', i >= 0 && L_[i + 1] === LINHA_AUTO_IA)
  const forcaIA = (t) => !EN.roteiroCabeNoFilmeCurto(t, 15, 'en')
  checa('auto-analyze: nos 3 casos reais NÃO força mais o modo IA (antes forçava nos 3)', Object.values(CASOS).every((t) => !forcaIA(t)) && Object.values(CASOS).every((t) => !EN_ANTES.roteiroCabeNoFilmeCurto(t, 15, 'en')))
  // A expressão real de needsStructuring (handleAnalyze), executada: verbatim + skipPreview, sem override = não estrutura.
  const m = /const needsStructuring = isHollywoodRaw\n\s*\? false\n\s*: (.+?) \/\/ KINEO-MOTOR-15S-1510\n/.exec(GEN)
  checa('handleAnalyze: a expressão de needsStructuring foi achada na fonte', Boolean(m))
  const decide = (opts, scriptMode, modoDoTextoNoCurto = null) => vm.runInNewContext(m ? m[1] : 'undefined', { opts, scriptMode, modoDoTextoNoCurto })
  checa('needsStructuring: verbatim, sem override (o caminho dos 3 casos agora) → false (vai verbatim, sem escritor)', decide({ fromTopic: true, skipPreview: true }, 'verbatim') === false)
  checa("needsStructuring: verbatim COM o override 'ai' (o caminho de antes) → true (o escritor reescrevia)", decide({ fromTopic: true, skipPreview: true, structureFirst: true, scriptModeOverride: 'ai' }, 'verbatim') === true)
  checa('os outros chamadores da tela seguem lendo a mesma função (parede ×2, episódio, conta sem subida, auto-start)', GEN.split('roteiroCabeNoFilmeCurto(').length - 1 >= 6)
  // O /go do GPT: o link leva script_mode=verbatim quando o roteiro cabe.
  const url = new URL('https://x' + GH.buildStudioDestination({ script: CASOS.dino, duration_sec: 35, engine_hint: 'seedance', aspect: '9:16', language: 'en' }, { shortSeconds: 15, fitsShort: EN.roteiroCabeNoFilmeCurto(CASOS.dino, 15, 'en') }))
  const urlAntes = new URL('https://x' + GH.buildStudioDestination({ script: CASOS.dino, duration_sec: 35, engine_hint: 'seedance', aspect: '9:16', language: 'en' }, { shortSeconds: 15, fitsShort: EN_ANTES.roteiroCabeNoFilmeCurto(CASOS.dino, 15, 'en') }))
  checa('/go do GPT (saldo só paga 15 s): o Dino abre em script_mode=verbatim (antes: ai)', url.searchParams.get('script_mode') === 'verbatim' && url.searchParams.get('duration') === '15' && urlAntes.searchParams.get('script_mode') === 'ai')
  checa('/go do GPT lê a mesma função (linha real)', rd('app/api/gpt/handoff/go/route.ts').includes("fitsShort: roteiroCabeNoFilmeCurto(row.script, SEEDANCE_SHORT_SECONDS, String(row.language ?? '').slice(0, 2).toLowerCase())"))
}

console.log('M) mutantes')
const LINHA_NOVA = "  const palavras = parseUserScript(String(texto ?? '')).narration.split(/\\s+/).filter(Boolean).length"
{
  const m1src = trocaUma(EN_SRC, LINHA_NOVA, "  const palavras = String(texto ?? '').split(/\\s+/).filter(Boolean).length")
  checa('mutante 1 aplicado (contagem crua de volta)', typeof m1src === 'string' && !m1src.includes(LINHA_NOVA))
  const m1 = compila(m1src)
  checa('mutante 1 → VERMELHO: o Dino volta a "não caber"', typeof m1.roteiroCabeNoFilmeCurto === 'function' && m1.roteiroCabeNoFilmeCurto(CASOS.dino, 15, 'en') === false)
  const m2src = trocaUma(EN_SRC, LINHA_NOVA, "  const palavras = String(texto ?? '').replace(/\\[[^\\]]*\\]/g, ' ').split(/\\s+/).filter(Boolean).length")
  checa('mutante 2 aplicado (tira só as pistas; rótulos ainda contam)', typeof m2src === 'string' && !m2src.includes(LINHA_NOVA))
  const m2 = compila(m2src)
  let diverge = 0
  for (let n = 30; n <= 62; n++) { const t = marcado(n); if (m2.roteiroCabeNoFilmeCurto(t, 15, 'en') !== guardaAceita(t)) diverge++ }
  checa(`mutante 2 → VERMELHO: diverge da guarda em ${diverge} casos marcados`, diverge > 0)
  const m3src = trocaUma(EN_SRC, 'return palavras <= maxWordsForShortFilm(segundos, idioma)', 'return palavras <= maxWordsForShortFilm(segundos)')
  checa('mutante 3 aplicado (sem a língua)', typeof m3src === 'string')
  const m3 = compila(m3src)
  checa('mutante 3 → VERMELHO: 46 palavras turcas "cabem"', m3.roteiroCabeNoFilmeCurto(Array(46).fill('kelime').join(' '), 15, 'tr') === true)
}

console.log('D) o desfaz')
{
  const antes = semVerbatimIntocavel2010(EN_PATH, EN_SRC)
  checa('o desfaz tira a marca, o import novo e devolve a linha crua', typeof antes === 'string' && !antes.includes(MARCA_VERBATIM_INTOCAVEL_2010) && !antes.includes("from '@/lib/scriptParser'") && antes.includes("  const palavras = String(texto ?? '').split(/\\s+/).filter(Boolean).length\n"))
  checa('o desfaz só mexe nas linhas desta entrega (diferença = 1 import + 6 comentários + 1 linha trocada)', typeof antes === 'string' && EN_SRC.split('\n').length - antes.split('\n').length === 7)
  checa('o desfaz recusa fonte alterada por outra mão (par que não casa → null)', semVerbatimIntocavel2010(EN_PATH, EN_SRC.replace(LINHA_NOVA, LINHA_NOVA + ' ')) === null)
  checa('o desfaz devolve intacto o arquivo de fora da entrega', semVerbatimIntocavel2010('lib/outro.ts', 'x KINEO-VERBATIM-INTOCAVEL-2010') === 'x KINEO-VERBATIM-INTOCAVEL-2010')
  checa('o desfaz é idempotente na fonte de antes', semVerbatimIntocavel2010(EN_PATH, antes) === antes)
  // As reâncoras (acréscimos marcados + as 2 trocas do D3 do avatar preso): desfeitas, são a última versão alheia do arquivo
  // (o último commit que o tocou sem a marca desta entrega).
  const gitTxt = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const NL = String.fromCharCode(10)
  for (const rel of REANCORAS_VERBATIM_INTOCAVEL_2010) {
    const atual = semHomeRemodela2010(semBebeQueFala2010(rd(rel), rel), rel) // KINEO-HOME-REMODELA-2010 — reancorado: a reâncora da home remodelada (entrega de depois) sai antes // reancorado KINEO-BEBE-QUE-FALA-2010
    let alheia = null, h = ''
    try { h = gitTxt('log', '-1', '--format=%H', '--invert-grep', `--grep=${MARCA_VERBATIM_INTOCAVEL_2010}`, '--grep=KINEO-BEBE-QUE-FALA-2010', '--grep=KINEO-MCP-STUDIO-AJUSTE-2010', 'HEAD', '--', rel).trim(); alheia = h ? gitTxt('show', `${h}:${rel}`).split(String.fromCharCode(13) + NL).join(NL) : null } catch { alheia = null } // reancorado KINEO-MCP-STUDIO-AJUSTE-2010: os commits do ajuste do conector (camada de depois) também não são "alheios" aqui — o desfaz do verbatim já os tira primeiro
    try { h = gitTxt('log', '-1', '--format=%H', '--invert-grep', `--grep=${MARCA_VERBATIM_INTOCAVEL_2010}`, '--grep=KINEO-BEBE-QUE-FALA-2010', '--grep=KINEO-MCP-STUDIO-AJUSTE-2010', `--grep=${MARCA_HOME_REMODELA_2010}`, '--grep=KINEO-HOME-CARDS-CLAROS-2010', '--grep=KINEO-DESENHO-NOTA9-2110', '--grep=KINEO-DESENHO-SOM-2110', '--grep=KINEO-META95-PERSONAGEM-AJUSTE-2010', 'HEAD', '--', rel).trim(); alheia = h ? gitTxt('show', `${h}:${rel}`).split(String.fromCharCode(13) + NL).join(NL) : null } catch { alheia = null } // KINEO-HOME-REMODELA-2010 — a última versão alheia pula também os commits da home remodelada (os merges da fila e as reâncoras) // KINEO-HOME-CARDS-CLAROS-2010 — reancorado: os commits do véu mais claro dos cards (20/10 23:30) também são de depois // KINEO-DESENHO-SOM-2110 — reancorado: os commits do som do desenho infantil (21/10) também são de depois // reancorado KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — os commits e merges dos consertos da folha (camada de depois, tirada primeiro pela cadeia do bebê) também não são alheios
    try { h = gitTxt('log', '-1', '--format=%H', '--invert-grep', `--grep=${MARCA_VERBATIM_INTOCAVEL_2010}`, '--grep=KINEO-BEBE-QUE-FALA-2010', '--grep=KINEO-MCP-STUDIO-AJUSTE-2010', `--grep=${MARCA_HOME_REMODELA_2010}`, '--grep=KINEO-HOME-CARDS-CLAROS-2010', '--grep=KINEO-DESENHO-NOTA9-2110', '--grep=KINEO-DESENHO-SOM-2110', '--grep=KINEO-META95-PERSONAGEM-AJUSTE-2010', '--grep=KINEO-AVATAR-ESTORNO-2010', '--grep=KINEO-LEGENDA-BENGALI-2010', 'HEAD', '--', rel).trim(); alheia = h ? gitTxt('show', `${h}:${rel}`).split(String.fromCharCode(13) + NL).join(NL) : null } catch { alheia = null } // KINEO-AVATAR-ESTORNO-2010 — reancorado na integração 21/10: os commits do estorno/legenda bengali (Codex, camada mais nova; o desfaz da cadeia já os tira do atual) também não são alheios
    const desfeito = semVerbatimIntocavel2010(rel, atual)
    const marcadas = atual.split(NL).filter((l) => l.includes(MARCA_VERBATIM_INTOCAVEL_2010)).length
    const esperadas = ACRESCIMOS_REANCORA_VERBATIM_INTOCAVEL_2010[rel] + (TROCAS_REANCORA_VERBATIM_INTOCAVEL_2010[rel]?.quantas ?? 0)
    checa(`reâncora ${rel}: ${marcadas} linha(s) marcada(s) = tabela; desfeita, é a última versão alheia (${h.slice(0, 9) || 'nenhuma'})`, marcadas === esperadas && typeof alheia === 'string' && desfeito === alheia)
    const aMais = atual + NL + '// x KINEO-VERBATIM-INTOCAVEL-2010'
    checa(`reâncora ${rel}: uma linha marcada a mais → o desfaz recusa (null) e a cadeia lança`, semVerbatimIntocavel2010(rel, aMais) === null && (() => { try { semVerbatimIntocavel2010NaCadeia(aMais, rel); return false } catch { return true } })())
  }
  const pers = rd('scripts/test-meta95-personagem-2010.mjs')
  const av = semHomeRemodela2010(semBebeQueFala2010(rd('scripts/test-support/desfaz-avatar-preso-2010.mjs'), 'scripts/test-support/desfaz-avatar-preso-2010.mjs'), 'scripts/test-support/desfaz-avatar-preso-2010.mjs') // KINEO-HOME-REMODELA-2010 — a home remodelada (camada de depois) entra antes desta dentro de semAvatarPreso2010; sem ela, esta segue a 1ª // reancorado KINEO-BEBE-QUE-FALA-2010
  checa('encadeado: semAvatarPreso2010 (a camada de antes; a cabeça dos guardiões e o D1/D3 dela passam por ela) chama o desfaz desta camada primeiro', av.includes('export function semAvatarPreso2010(texto, p) {' + NL + '  texto = semVerbatimIntocavel2010NaCadeia(texto, p) // KINEO-VERBATIM-INTOCAVEL-2010'))
  const AVm = await import(new URL('./test-support/desfaz-avatar-preso-2010.mjs', import.meta.url).href)
  checa('pela cadeia (semAvatarPreso2010NosGuardioes), os guardiões reancorados desfeitos não têm mais a marca desta entrega', ['scripts/test-mcp-studio-2010.mjs', 'scripts/test-meta95-personagem-2010.mjs'].every((g) => !AVm.semAvatarPreso2010NosGuardioes(rd(g), g).includes(MARCA_VERBATIM_INTOCAVEL_2010)))
  checa('o guardião da folha de personagem deixa os commits desta fora do D7', pers.includes('commitsDaEntrega.filter(({ s }) => !s.includes(MARCA_VERBATIM_INTOCAVEL_2010)))'))
  checa('o guardião do avatar preso tira esta camada antes da contagem do D3', semBebeQueFala2010(rd('scripts/test-avatar-preso-2010.mjs'), 'scripts/test-avatar-preso-2010.mjs').split('semVerbatimIntocavel2010NaCadeia(rd(rel), rel).split(').length - 1 === 2) // reancorado KINEO-BEBE-QUE-FALA-2010
}

console.log(`\n${ok} verificações ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.error('FALHAS:\n - ' + falhas.join('\n - ')); process.exit(1) }
