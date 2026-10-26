// [TRAVA 8.2 — vai do fundador 26/10 "o ads de 15 está horrível… arrumasse para mim o mais rápido possível"] KINEO-FILME15-FIEL-2610
// Guardião do "filme de 15 s fiel". Prova, sem rede e sem render, com o código REAL:
//   A. decidirFormato (lib/cinematic/visualMode.ts): "Uma arqueóloga…", "Uma menina… o avô", "An archaeologist…" → character_story;
//      documentário sem pessoa, "a música da sala", tag [faceless] e "No presenter" → documentary_faceless; 1ª pessoa → presenter.
//   B. modoDoCriticoDoStill (lib/cinematic/criticoStill.ts): sem env, o padrão pedido vale ('enforce' para o 15 s); env explícita manda.
//   C. decidirTranscricaoDoFilme / transcreverNoIdiomaCom (lib/whisperNaEscrita.ts): pt → Whisper com idioma; en/vazio → padrão;
//      escrita que diz o idioma → caminho da escrita; vazio/erro → padrão.
//   D. compose: idioma do filme = resolveNarrationLanguage(body.language, voiceoverScript) (texto > interface) e Whisper com o idioma.
//   E. rota: o filme grátis de 15 s pede 'enforce' ao crítico do still.
//   F. desfaz exato: tirada a camada, os 5 arquivos são byte a byte a base; mutantes (cada um APLICADO e VERMELHO na regra certa).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import ts from 'typescript'
import { semFilme15Fiel2610, FILME15_FIEL_2610, FILME15_FIEL_2610_ARQUIVOS, FILME15_FIEL_2610_BASE, MARCA_FILME15_FIEL_2610 as MARCA } from './test-support/desfaz-filme15-fiel-2610.mjs'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', a, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 << 20 })
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

/** Transpila TS → CJS e roda no vm com um `require` que entrega módulos já carregados (ou stubs). */
const roda = (src, mods = {}) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  const req = (id) => { if (id in mods) return mods[id]; return new Proxy({}, { get: () => () => undefined }) }
  vm.runInNewContext(js, { exports: exp, module: { exports: exp }, require: req, console, process: { env: {} }, Intl, Blob }, { filename: 'mod.js' })
  return exp
}
const BASE_ARQ = { 'app/api/compose/route.ts': 'compose', 'app/api/generate-video-cinematic/route.ts': 'rota', 'lib/cinematic/visualMode.ts': 'visualMode', 'lib/cinematic/criticoStill.ts': 'criticoStill', 'lib/whisperNaEscrita.ts': 'whisper' }
checa('a camada cobre exatamente os 5 arquivos', JSON.stringify([...FILME15_FIEL_2610_ARQUIVOS].sort()) === JSON.stringify(Object.keys(BASE_ARQ).sort()))

const atual = Object.fromEntries(Object.keys(BASE_ARQ).map((f) => [f, rd(f)]))
const semCamada = Object.fromEntries(Object.keys(BASE_ARQ).map((f) => [f, semFilme15Fiel2610(atual[f], f)]))

/** Carrega os módulos a partir de um conjunto de fontes (atual ou sem a camada). */
function carregar(fontes) {
  const textLanguage = roda(rd('lib/textLanguage.ts'))
  const escrita = roda(rd('lib/escritaDaLegenda.ts'))
  const visual = roda(fontes['lib/cinematic/visualMode.ts'])
  const critico = roda(fontes['lib/cinematic/criticoStill.ts'], { '@/lib/hollywood/juizStill': { JUIZ_STILL_MODELO: 'gpt-4o-mini' } })
  const whisper = roda(fontes['lib/whisperNaEscrita.ts'], { '@/lib/escritaDaLegenda': escrita, '@/lib/compose': { markSentenceEnds: (w) => w, transcribeTTSWithTimestamps: async () => [] }, '@/lib/openai': {}, '@/lib/aiModels': { AI_TRANSCRIPTION_MODEL: 'whisper-1' }, openai: { toFile: async () => ({}) } })
  return { textLanguage, visual, critico, whisper }
}

const PENA = '[Idea: Uma arqueóloga abre uma caixa de madeira num templo antigo e encontra uma pena dourada. Ela segura a pena; a sala se ilumina e uma porta secreta se abre. Sem objetos modernos.]'
const CHAVE = 'Uma menina encontra uma chave azul escondida no jardim. Ela entrega a chave ao avô, que observa curioso. O avô abre um portão antigo com a chave.'
const ARQUEO_EN = 'An archaeologist opens a wooden box in an ancient temple and finds a golden feather. The room lights up and a secret door opens.'
const CIDADES = 'Três cidades antigas escondem segredos incríveis! Roma tinha um sistema de aquedutos que fornecia água limpa para milhões. Atenas realizava assembleias com até 6.000 cidadãos.'
const MUSICA = 'A música da sala antiga ecoa pelas paredes de pedra enquanto a luz do sol atravessa as janelas.'
const SEM_APRESENTADOR = 'No presenter. Show only the city at night, drone shots over the river and the old bridge.'
const PRIMEIRA = 'I grew up in a small fishing village. My father taught me to read the tide before I could read a book. I never forgot it.'

function provaA(V, rotulo, esperaNovo) {
  const modo = (t) => V.decidirFormato(t, V.TAG_FACELESS.test(t)).modo
  if (esperaNovo) {
    checa(`${rotulo} A1 "Uma arqueóloga…" → character_story`, modo(PENA) === 'character_story')
    checa(`${rotulo} A2 "Uma menina… o avô" → character_story`, modo(CHAVE) === 'character_story')
    checa(`${rotulo} A3 "An archaeologist…" → character_story`, modo(ARQUEO_EN) === 'character_story')
    checa(`${rotulo} A3b "sem apresentador" + "o avô" → character_story (personagem mudo)`, modo('Sem apresentador. ' + CHAVE) === 'character_story')
  } else {
    checa(`${rotulo} A1' base: "Uma arqueóloga…" caía em documentary_faceless (o defeito)`, modo(PENA) === 'documentary_faceless')
    checa(`${rotulo} A2' base: "Uma menina… o avô" caía em documentary_faceless`, modo(CHAVE) === 'documentary_faceless')
    checa(`${rotulo} A3' base: "An archaeologist…" caía em documentary_faceless`, modo(ARQUEO_EN) === 'documentary_faceless')
  }
  checa(`${rotulo} A4 documentário sem pessoa segue documentary_faceless`, modo(CIDADES) === 'documentary_faceless')
  checa(`${rotulo} A5 "a música da sala" NÃO é pessoa → documentary_faceless`, modo(MUSICA) === 'documentary_faceless')
  checa(`${rotulo} A6 tag [faceless] vence a pessoa`, modo('[faceless] ' + CHAVE) === 'documentary_faceless')
  checa(`${rotulo} A7 "No presenter. Show only the city." segue documentary_faceless`, modo(SEM_APRESENTADOR) === 'documentary_faceless')
  checa(`${rotulo} A8 primeira pessoa segue presenter`, modo(PRIMEIRA) === 'presenter')
}
function provaB(C, rotulo, esperaNovo) {
  const m = C.modoDoCriticoDoStill
  checa(`${rotulo} B1 sem env, sem padrão pedido → log_only (byte a byte o de antes)`, m(null) === 'log_only' && m('') === 'log_only')
  checa(`${rotulo} B2 env 'off' / 'enforce' / 'log_only' mandam`, m('off') === 'off' && m('enforce') === 'enforce' && m('log_only') === 'log_only')
  if (esperaNovo) {
    checa(`${rotulo} B3 sem env, padrão 'enforce' pedido → enforce (o 15 s)`, m(null, 'enforce') === 'enforce' && m('', 'enforce') === 'enforce')
    checa(`${rotulo} B4 env explícita 'log_only' vence o padrão 'enforce'`, m('log_only', 'enforce') === 'log_only' && m('off', 'enforce') === 'off')
  } else {
    checa(`${rotulo} B3' base: o padrão pedido era ignorado (sempre log_only)`, m(null, 'enforce') === 'log_only')
  }
}
async function provaC(W, rotulo, esperaNovo) {
  if (!esperaNovo) { checa(`${rotulo} C0' base: não existe transcreverNoIdiomaDoFilme`, typeof W.transcreverNoIdiomaDoFilme !== 'function' && typeof W.decidirTranscricaoDoFilme !== 'function'); return }
  const d = W.decidirTranscricaoDoFilme
  checa(`${rotulo} C1 roteiro latino + pt → idioma_do_filme pt`, JSON.stringify(d(PENA, 'pt')) === JSON.stringify({ decisao: 'idioma_do_filme', idioma: 'pt' }))
  checa(`${rotulo} C2 roteiro latino + en/vazio/null → padrao`, d(ARQUEO_EN, 'en').decisao === 'padrao' && d(ARQUEO_EN, '').decisao === 'padrao' && d(ARQUEO_EN, null).decisao === 'padrao')
  checa(`${rotulo} C3 escrita que diz o idioma (devanágari) → escrita, mesmo com pt pedido`, d('यह एक प्राचीन मंदिर की कहानी है जिसमें एक सुनहरा पंख मिलता है', 'pt').decisao === 'escrita')
  const chamadas = []
  const t = { padrao: async () => { chamadas.push('padrao'); return [{ word: 'p' }] }, comIdioma: async (i) => { chamadas.push('idioma:' + i); return [{ word: 'i' }] } }
  const r1 = await W.transcreverNoIdiomaCom(PENA, 'pt', t)
  checa(`${rotulo} C4 pt → chama Whisper com language=pt e devolve as palavras dele`, r1[0].word === 'i' && chamadas.join(',') === 'idioma:pt')
  chamadas.length = 0
  const r2 = await W.transcreverNoIdiomaCom(ARQUEO_EN, 'en', t)
  checa(`${rotulo} C5 en → só o padrão, nunca chama com idioma`, r2[0].word === 'p' && chamadas.join(',') === 'padrao')
  chamadas.length = 0
  const r3 = await W.transcreverNoIdiomaCom(PENA, 'es', { ...t, comIdioma: async () => [] })
  checa(`${rotulo} C6 com idioma vazio → cai no padrão`, r3[0].word === 'p' && chamadas.join(',') === 'padrao')
  chamadas.length = 0
  const r4 = await W.transcreverNoIdiomaCom(PENA, 'es', { ...t, comIdioma: async () => { throw new Error('x') } })
  checa(`${rotulo} C7 com idioma lançou → cai no padrão`, r4[0].word === 'p' && chamadas.join(',') === 'padrao')
}
function provaD(fontes, T, rotulo, esperaNovo) {
  const c = fontes['app/api/compose/route.ts']
  const novo = c.includes("const idiomaDoFilme = resolveNarrationLanguage(body.language, voiceoverScript)") && c.includes('let language = idiomaDoFilme.language') && c.includes('transcreverNoIdiomaDoFilme(audioBuffer, scaledScript, language)') && c.includes("import { narrationLanguage, resolveNarrationLanguage } from '@/lib/textLanguage'")
  const velho = c.includes("const language = narrationLanguage(body.language) ?? 'en' // KINEO-IDIOMAS-15: qualquer código do catálogo") && c.includes('transcreverNaEscritaDoRoteiro(audioBuffer, scaledScript) // KINEO-META95-ESCRITA-2010')
  checa(`${rotulo} D1 compose ${esperaNovo ? 'resolve o idioma pelo roteiro e manda ao Whisper' : "(base) usava só body.language e Whisper sem idioma"}`, esperaNovo ? novo && !velho : velho && !novo)
  const idx = c.indexOf('const idiomaDoFilme = resolveNarrationLanguage(body.language, voiceoverScript)')
  if (esperaNovo) checa(`${rotulo} D2 voiceoverScript já está resolvido antes do idioma (declarado acima, recuperações incluídas)`, idx > 0 && c.lastIndexOf('let voiceoverScript = stripScriptMarkers(rawVoiceover)', idx) > 0 && c.lastIndexOf('voiceoverScript = fromTopic', idx) > 0)
  const r = T.resolveNarrationLanguage
  checa(`${rotulo} D3 regra real: interface en + roteiro pt claro → pt (trocou)`, r('en', CHAVE).language === 'pt' && r('en', CHAVE).switched === true)
  checa(`${rotulo} D4 regra real: escolha explícita pt + roteiro en → pt; en + en → en`, r('pt', ARQUEO_EN).language === 'pt' && r('en', ARQUEO_EN).language === 'en')
  // O detector NÃO decide a pena dourada (40 palavras, poucas marcas exclusivas): por isso o idioma resolvido pela ROTA viaja no claim.
  checa(`${rotulo} D5 o detector sozinho não salva a pena dourada (prova de que o claim é necessário)`, r('en', PENA).language === 'en')
  const claimNovo = c.includes("const idiomaDoClaim = narrationLanguage((cinematicBirthClaim?.response as { language?: unknown } | undefined)?.language)") && c.includes('language = idiomaDoClaim // KINEO-FILME15-FIEL-2610') && c.includes('let language = idiomaDoFilme.language')
  const posClaim = c.indexOf('const idiomaDoClaim = narrationLanguage(')
  checa(`${rotulo} D6 compose ${esperaNovo ? 'adota o idioma do claim assinado, depois de carregar o claim' : '(base) não lia idioma do claim'}`, esperaNovo ? claimNovo && posClaim > c.indexOf('cinematicBirthClaim = cinematicClaimLoad.claim') && posClaim > idx : !claimNovo)
}
function provaE(fontes, rotulo, esperaNovo) {
  const r = fontes['app/api/generate-video-cinematic/route.ts']
  const novo = r.includes("const criticoModo = modoDoCriticoDoStill(undefined, seedanceShortFilm ? 'enforce' : 'log_only')")
  const velho = r.includes('const criticoModo = modoDoCriticoDoStill() // KINEO-JUIZ-STILL-1410')
  checa(`${rotulo} E1 rota ${esperaNovo ? "pede 'enforce' para o filme grátis de 15 s" : '(base) usava só a env'}`, esperaNovo ? novo && !velho : velho && !novo)
  const langNoClaim = (r.match(/\n\s+language: narrationLanguage\.language, \/\/ KINEO-FILME15-FIEL-2610/g) || []).length
  checa(`${rotulo} E3 rota ${esperaNovo ? 'grava o idioma resolvido nos 2 claims (clássico e hollywood)' : '(base) não gravava idioma no claim'}`, esperaNovo ? langNoClaim === 2 : langNoClaim === 0)
  if (esperaNovo) {
    const i = r.indexOf("const criticoModo = modoDoCriticoDoStill(undefined, seedanceShortFilm")
    const decl = r.lastIndexOf('const seedanceShortFilm = duration === SEEDANCE_SHORT_SECONDS && isSeedance15(', i)
    checa(`${rotulo} E2 seedanceShortFilm é declarado antes e no mesmo nível da função`, decl > 0 && /\n    const seedanceShortFilm = /.test(r.slice(decl - 5, decl + 40)))
  }
}

console.log('== atual ==')
{
  const M = carregar(atual)
  provaA(M.visual, 'atual', true); provaB(M.critico, 'atual', true); await provaC(M.whisper, 'atual', true); provaD(atual, M.textLanguage, 'atual', true); provaE(atual, 'atual', true)
}
console.log('== F. desfaz exato ==')
{
  const commits = git('log', '--format=%H', `--grep=${MARCA}`).trim().split('\n').filter(Boolean)
  const base = commits.length ? `${commits[commits.length - 1]}^` : 'HEAD'
  const baseSha = git('rev-parse', base).trim()
  checa(`F1 a base registrada na tabela é a base real (${baseSha.slice(0, 9)})`, FILME15_FIEL_2610_BASE === baseSha)
  for (const f of Object.keys(BASE_ARQ)) {
    const baseTxt = lf(git('show', `${baseSha}:${f}`))
    checa(`F2 ${f}: sem a camada = byte a byte a base`, semCamada[f] === baseTxt)
    checa(`F3 ${f}: idempotente e preserva CRLF`, semFilme15Fiel2610(semCamada[f], f) === semCamada[f] && semFilme15Fiel2610(atual[f].replace(/\n/g, '\r\n'), f) === baseTxt.replace(/\n/g, '\r\n'))
    checa(`F4 ${f}: todo trecho novo leva a marca`, FILME15_FIEL_2610.scope[f].hunks.every((h) => h.after.includes(MARCA)))
  }
  let lancou = false
  try { semFilme15Fiel2610(atual['lib/cinematic/visualMode.ts'].replace('PESSOA_DA_HISTORIA_RE.exec(r)?.[0] // KINEO-PERSONAGEM-GENERICO', 'XXX // KINEO-PERSONAGEM-GENERICO'), 'lib/cinematic/visualMode.ts') } catch { lancou = true }
  checa('F5 fonte adulterada → o desfaz LANÇA (não devolve meia camada)', lancou)
  const nada = 'const x = 1 // KINEO-FILME15-FIEL-2610\n'
  checa('F6 arquivo fora da tabela volta intocado', semFilme15Fiel2610(nada, 'lib/outro.ts') === nada)
}
console.log('== mutantes (a camada desfeita = a base): cada regra fica vermelha ==')
{
  const M = carregar(semCamada)
  provaA(M.visual, 'base', false); provaB(M.critico, 'base', false); await provaC(M.whisper, 'base', false); provaD(semCamada, M.textLanguage, 'base', false); provaE(semCamada, 'base', false)
  // mutante pontual: a lista sem "arqueologa" — a pena dourada volta a cair em faceless
  const mut = atual['lib/cinematic/visualMode.ts'].replace('|arqueologo|arqueologa|', '|arqueologo|')
  checa('M1 mutante aplicado (sem "arqueologa" na lista)', mut !== atual['lib/cinematic/visualMode.ts'])
  const V = roda(mut)
  checa('M1 → A1 vermelho: "Uma arqueóloga…" cai em documentary_faceless', V.decidirFormato(PENA, false).modo === 'documentary_faceless')
  const mut2 = atual['lib/cinematic/criticoStill.ts'].replace('return padrao // KINEO-FILME15-FIEL-2610', "return 'log_only' // KINEO-FILME15-FIEL-2610")
  checa('M2 mutante aplicado (padrão ignorado)', mut2 !== atual['lib/cinematic/criticoStill.ts'])
  const C = roda(mut2, { '@/lib/hollywood/juizStill': { JUIZ_STILL_MODELO: 'x' } })
  checa("M2 → B3 vermelho: padrão 'enforce' ignorado", C.modoDoCriticoDoStill(null, 'enforce') === 'log_only')
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log(falhas.map((f) => ' - ' + f).join('\n')); process.exit(1) }
