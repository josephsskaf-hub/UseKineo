// KINEO-VOZ-NA-BOCA-2026-09-11 — guardião de "a voz nossa na boca do avatar".
//
// Ordem do fundador (11/09): "a gente vai colocar a voz na boca do avatar, pra
// ficar bom". O caminho host (TTS + lipsync no retrato) existia desde 13/07 e
// estava desligado desde 16/08 porque a voz era escolhida por palavras-chave
// do roteiro e um homem falava com voz de mulher. Agora: (1) a ficha do
// personagem decide gênero e idade da voz; (2) o lipsync é o padrão (flag só
// desliga com 'off'); (3) a voz escolhida viaja no claim assinado e o compose
// narra o b-roll com a MESMA voz em vez de re-resolver.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }
const roda = (src) => { const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText; const exp = {}; vm.runInNewContext(js, { exports: exp }); return exp }

console.log('== a lib, executada ==')
const libSrc = rd('lib/hollywood/characterVoice.ts')
checa('módulo puro (sem import)', !/^import /m.test(libSrc))
const m = roda(libSrc)
const casos = [
  ['homem 45 (Flannan Isles)', 'A 45-year-old Scottish man with a weathered face, short gray-streaked beard, dark wool coat and a lighthouse keeper cap', 'male', 'adult', 'onyx'],
  ['mulher jovem', 'A 24-year-old Brazilian woman with long curly black hair, denim jacket and a small backpack', 'female', 'young', 'nova'],
  ['senhora idosa', 'An elderly Japanese woman in her 70s with silver hair in a bun, a beige cardigan and round glasses', 'female', 'elderly', 'shimmer'],
  ['menino', 'A little boy, about 8 years old, with messy blond hair, a red t-shirt and sneakers', 'child', 'child', 'shimmer'],
  ['homem velho', 'An old man with white hair and wrinkled hands, wearing a brown tweed jacket', 'male', 'elderly', 'onyx'],
  ['rapaz', 'A young man in his twenties with a buzz cut and a gray hoodie', 'male', 'young', 'echo'],
]
for (const [nome, sheet, g, a, voz] of casos) {
  const r = m.resolveCharacterVoice(sheet)
  checa(`${nome}: gênero ${g}`, r && r.gender === g)
  checa(`${nome}: idade ${a}`, r && r.age === a)
  checa(`${nome}: voz ${voz}`, r && r.voice === voz)
}
checa('ficha sem gênero → null (mantém o persona antigo, não inventa)', m.resolveCharacterVoice('A weathered figure in a long coat walking through fog') === null)
checa('ficha vazia → null', m.resolveCharacterVoice('') === null && m.resolveCharacterVoice(undefined) === null)
checa('empate homem/mulher → null', m.resolveCharacterVoice('a man and a woman standing together') === null)
checa('a ficha inteira decide, não a primeira palavra: "his daughter" com sujeito mulher', m.resolveCharacterVoice('A woman in her 30s, brown hair, holding her daughter; she wears a green dress') ?.gender === 'female')
checa('determinístico: mesma ficha, mesma voz', JSON.stringify(m.resolveCharacterVoice(casos[0][1])) === JSON.stringify(m.resolveCharacterVoice(casos[0][1])))
checa('personaId carrega gênero e idade', m.resolveCharacterVoice(casos[0][1]).personaId === 'character:male:adult')
checa('isCharacterVoiceName aceita só as 6 vozes', m.isCharacterVoiceName('onyx') && !m.isCharacterVoiceName('rachel') && !m.isCharacterVoiceName(null))
checa('velocidade fica dentro do que synthesizeHostSpeech aceita (0.7–1.3)', casos.every(([, s]) => { const r = m.resolveCharacterVoice(s); return r.speed >= 0.7 && r.speed <= 1.3 }))

console.log('== hostVoice: a ficha manda, o claim carrega ==')
const hv = rd('lib/hollywood/hostVoice.ts')
checa('resolveHollywoodVoice aceita characterSheet e prefere a ficha', /characterSheet\?: string \| null,\n\): HollywoodVoice/.test(hv) && /const fromSheet = characterSheet \? resolveCharacterVoice\(characterSheet\) : null\n  if \(fromSheet\) return \{ personaId: fromSheet\.personaId, voice: fromSheet\.voice, defaultSpeed: fromSheet\.speed \}/.test(hv))
checa('sem ficha (ou ficha muda) → persona de sempre (comportamento antigo preservado)', /return \{ personaId: persona\.id, voice: persona\.voice, defaultSpeed: persona\.defaultSpeed \}/.test(hv))
checa('hollywoodVoiceFromClaim valida a voz e limita a velocidade', /export function hollywoodVoiceFromClaim\(value: unknown\): HollywoodVoice \| null/.test(hv) && /if \(!isCharacterVoiceName\(v\.voice\)\) return null/.test(hv) && /Math\.max\(0\.7, Math\.min\(1\.3, speed\)\)/.test(hv))

console.log('== rota: lipsync ligado por padrão, voz pela ficha, voz no claim ==')
const rt = rd('app/api/generate-video-cinematic/route.ts')
checa('a ficha do personagem entra na resolução da voz', /hostVoice = resolveHollywoodVoice\(hVoiceoverScript, hollywoodLanguage, hollywoodVertical, plan\.characterSheet\)/.test(rt))
checa("ligado por padrão: só 'off' desliga", /const hostTtsEnabled = process\.env\.KINEO_HOLLYWOOD_HOST_TTS !== 'off'/.test(rt))
checa("o gate do host usa hostTtsEnabled (e não mais === 'on')", /if \(hostTtsEnabled && anchors && hostVoice && hs\.type === 'dialogue' && hs\.dialogueLine && hs\.dialogueLine\.trim\(\)\) \{/.test(rt) && !/KINEO_HOLLYWOOD_HOST_TTS === 'on'/.test(rt))
checa('cena host: TTS com a voz pinada, lipsync no retrato, engine host', /synthesizeHostSpeech\(\{\n\s+text: hs\.dialogueLine,\n\s+voice: hostVoice\.voice,/.test(rt) && /submitAvatarJob\(\{\n\s+imageUrl: anchors\.portraitUrl,\n\s+audioUrl,\n\s+engine: 'presenter',/.test(rt) && /sceneEngine = 'host'/.test(rt))
checa('a voz viaja no claim assinado (host_voice)', /host_voice: hostVoice \? \{ persona_id: hostVoice\.personaId, voice: hostVoice\.voice, speed: hostVoice\.defaultSpeed \} : null,/.test(rt))
checa('a duração da cena host segue o áudio real (não o bloco planejado)', /hs\.seconds = Math\.max\(2, Math\.round\(audioDur \* 10\) \/ 10\)/.test(rt))

console.log('== compose: a mesma voz, vinda do claim ==')
const cp = rd('app/api/compose/route.ts')
checa('compose importa hollywoodVoiceFromClaim', /import \{ hollywoodVoiceFromClaim, resolveHollywoodVoice, synthesizeHostSpeech, type HollywoodVoice \} from '@\/lib\/hollywood\/hostVoice'/.test(cp))
checa('compose prefere host_voice do claim e só depois re-resolve', /hollywoodPinnedVoice = hollywoodVoiceFromClaim\(cinematicBirthClaim\?\.response\?\.host_voice\)\n\s+\?\? resolveHollywoodVoice\(voiceoverScript, language, vertical\)/.test(cp))
checa('compose mantém a fala nativa/host verificada por ASR antes de narrar', /if \(\(c\.engine === 'dialogue' \|\| c\.engine === 'host'\) && c\.url\) \{/.test(cp) && /verifyObservedSpeech\(c\.dialogueLine, words\)/.test(cp))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗', f)
process.exit(falhas.length ? 1 : 0)
