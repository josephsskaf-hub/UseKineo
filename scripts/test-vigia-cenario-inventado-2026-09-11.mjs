// KINEO-VIGIA-CENARIO — 2026-09-11 (vigia dos motores, rotação 17:30)
//
// A metade DETERMINÍSTICA do VISUAL-DRIFT-11. Dois filmes reais de conta
// externa na mesma tarde, ambos Seedance, ambos com a camada visual do GPT
// inventando lugar e época que a história não diz:
//
//   597f8237 (17:54 UTC): "vintage security camera at the entrance of the
//   Amityville House… infamous paranormal events" para "police searched his
//   apartment".
//   c636e7a0 (19:33 UTC, conto de terror em PT-BR, telefone que recebe
//   MENSAGEM): "vintage black rotary phone from the 1960s", "1970s black
//   Bakelite rotary phone… abandoned Victorian home", "vintage Nokia 3310",
//   "Winchester Mystery House in San Jose, California", "1910 New England
//   farmhouse", "Western Electric Model 500 rotary phone… 1970s motel".
//
// A regra no prompt do descritor (rotação 16:30) é pedido. Isto é garantia:
// lib/cinematic/visualPromptPolicy.ts#scrubInventedSetting remove nome
// próprio, ano/década e adjetivo de época ausentes das palavras da história
// (tema + fala); a rota aplica nas 3 fontes de visual ANTES de qualquer still
// ou clipe pago e grava `setting_scrubbed` no cinematic_dispatch_result.
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

const pol = rd('lib/cinematic/visualPromptPolicy.ts')
const rt = rd('app/api/generate-video-cinematic/route.ts')

// ── executa a função de verdade (transpila só o bloco, sem @/) ──────────
const exp = {}
{
  const i = pol.indexOf('const SETTING_ALLOW')
  const j = pol.indexOf('\n}\n', pol.indexOf('export function scrubInventedSetting'))
  const src = pol.slice(i, j + 3)
  const js = ts.transpileModule(src, { compilerOptions: { module: 1, target: 9 } }).outputText
  vm.runInNewContext(js, { exports: exp })
}
const scrub = exp.scrubInventedSetting
checa('scrubInventedSetting existe e é executável', typeof scrub === 'function')

// história real do c636e7a0 (PT-BR, sem época, telefone que recebe mensagem)
const LUCAS = 'Eram exatamente 3h17 da madrugada quando o telefone de Lucas começou a tocar. Número desconhecido. Ele ignorou. O telefone tocou de novo. Dessa vez, apareceu uma mensagem: Não atenda. Três batidas na porta. Ele olhou pelo olho mágico. Um vulto de casaco escuro.'
// história real do 597f8237 (EN, Daniel, apartamento)
const DANIEL = 'Daniel lived alone in his apartment. He installed a security camera above the front door. Police searched his apartment and found a hidden room covered in photos.'

console.log('== 1. os casos reais de hoje ==')
{
  const r = scrub('A close-up of a vintage black rotary phone from the 1960s, resting on a wooden table in a dimly lit room', LUCAS)
  checa('c636e7a0 cena 1: "vintage" e "1960s" saem, o resto fica', !/vintage|1960/.test(r.text) && /rotary phone/.test(r.text) && /wooden table/.test(r.text))
  checa('c636e7a0 cena 1: removed lista os dois', r.removed.includes('1960s') && r.removed.some((x) => /vintage/i.test(x)))
}
{
  const r = scrub('A close-up of a 1970s black Bakelite rotary phone sitting on a cracked marble countertop in a dimly lit, abandoned Victorian home, with sunlight filtering through broken stained glass windows', LUCAS)
  checa('c636e7a0 cena 2: 1970s, Bakelite e Victorian saem', !/1970|Bakelite|Victorian/.test(r.text) && /black rotary phone/.test(r.text) && /abandoned home/.test(r.text))
}
{
  const r = scrub("Close-up of a vintage Nokia 3310 phone on a weathered coffee table in a dimly lit, abandoned cabin in the woods. The screen lights up with the chilling message 'Não atenda.' as the wind howls outside", LUCAS)
  checa('c636e7a0 cena 3: "Nokia 3310" sai junto (número colado ao nome)', !/Nokia|3310|vintage/.test(r.text) && /phone on a weathered coffee table/.test(r.text))
  checa('c636e7a0 cena 3: a mensagem da história ("Não atenda") fica intacta', /Não atenda/.test(r.text))
}
{
  const r = scrub('A close-up of an ornate, peeling Victorian-era door in a dimly lit, abandoned mansion', LUCAS)
  checa('c636e7a0 cena 4: "Victorian-era" sai inteiro (sem deixar "-era")', !/Victorian|-era/.test(r.text) && /peeling door/.test(r.text))
}
{
  const r = scrub('A close-up of a heavy, iron-studded door from the Winchester Mystery House in San Jose, California, as three deliberate knocks reverberate. The camera captures a spider’s web in the corner', LUCAS)
  checa('c636e7a0 cena 5: Winchester Mystery House / San Jose / California saem, sem preposição pendurada', !/Winchester|Mystery|House|San Jose|California/.test(r.text) && !/door from(?:\s+the)?[,.]/.test(r.text) && /iron-studded door/.test(r.text) && /three deliberate knocks reverberate/.test(r.text))
  checa('c636e7a0 cena 5: "The camera" no início de frase fica (só capitalizado, não nome)', /The camera captures/.test(r.text))
}
{
  const r = scrub('A close-up of a tarnished brass peephole on a rustic door of a 1910 New England farmhouse, with autumn leaves swirling outside', LUCAS)
  checa('c636e7a0 cena 6: "1910" e "New England" saem; "farmhouse" fica', !/1910|New England/.test(r.text) && /farmhouse/.test(r.text) && /peephole/.test(r.text))
}
{
  const r = scrub('A close-up of a vintage Western Electric Model 500 rotary phone on a weathered wooden table in an abandoned 1970s motel room', LUCAS)
  checa('c636e7a0 cena 7: "Western Electric Model 500" e "1970s" saem; "motel room" fica', !/Western|Electric|Model|500|1970/.test(r.text) && /rotary phone/.test(r.text) && /abandoned motel room/.test(r.text))
}
{
  const r = scrub('A close-up shot of a vintage security camera installed at the entrance of the Amityville House, capturing grainy black-and-white footage of the empty front porch where infamous paranormal events occurred', DANIEL)
  checa('597f8237 cena 3: "Amityville House" sai; "security camera"/"front porch" ficam', !/Amityville|House/.test(r.text) && /security camera/.test(r.text) && /front porch/.test(r.text))
  checa('597f8237 cena 3: sem "of the," pendurado', !/entrance of the[,.]/.test(r.text) && !/entrance of[,.]/.test(r.text))
}
{
  const r = scrub("Aerial footage of a suburban neighborhood featuring a single-family home, focusing on a security camera mounted above the front door, emphasizing Daniel's isolation and precaution", DANIEL)
  checa('597f8237 cena 2: "Daniel\'s" (nome DA história) fica; nada removido', r.removed.length === 0 && /Daniel's isolation/.test(r.text))
}

console.log('== 2. o que a história cita, fica ==')
{
  const r = scrub('An aerial drone shot capturing Luffy dodging falling magma while moving purposefully towards Akainu', 'Luffy rapidly dodges magma fists as he charges toward Akainu')
  checa('Luffy e Akainu (no roteiro) ficam intactos', r.removed.length === 0 && /Luffy dodging/.test(r.text) && /towards Akainu/.test(r.text))
}
{
  const r = scrub('Wide shot of Napoleon on horseback crossing the snowy Alps in 1805, soldiers behind him', 'In 1805, Napoleon crossed the Alps with his army.')
  checa('Napoleon, Alps e 1805 (no roteiro) ficam', r.removed.length === 0 && /Napoleon on horseback/.test(r.text) && /1805/.test(r.text))
}
{
  const r = scrub('Slow push-in on a medieval castle gate at dawn, torches flickering', 'Long ago, a medieval king ruled from a castle on the hill.')
  checa('"medieval" citado pela história fica', r.removed.length === 0 && /medieval castle/.test(r.text))
}
{
  const r = scrub('Slow push-in on the Eiffel Tower at night, rain on the pavement', 'She waited under the Eiffel Tower in the rain.')
  checa('Eiffel Tower (na história) fica', r.removed.length === 0 && /Eiffel Tower/.test(r.text))
}
{
  const r = scrub('Tracking shot through Times Square at night, neon signs reflecting on wet asphalt', LUCAS)
  checa('lugar inventado entre duas preposições: nenhuma fica pendurada', r.text === 'Tracking shot at night, neon signs reflecting on wet asphalt' && r.removed.join(' ') === 'Times Square')
}
{
  const r = scrub('', LUCAS)
  checa('descrição vazia devolve vazia, sem removed', r.text === '' && r.removed.length === 0)
}
{
  const r = scrub('Rain falls. Wind howls. The camera pans across the empty street', LUCAS)
  checa('frases curtas com inicial maiúscula não perdem nada', r.removed.length === 0 && r.text === 'Rain falls. Wind howls. The camera pans across the empty street')
}

console.log('== 3. a rota aplica antes do still pago e grava o que removeu ==')
checa('import de scrubInventedSetting na rota', /import \{[^}]*scrubInventedSetting[^}]*\} from '@\/lib\/cinematic\/visualPromptPolicy'/.test(rt))
const iScrub = rt.indexOf('KINEO-VIGIA-CENARIO-2026-09-11 — antes de qualquer still')
const iPrepare = rt.indexOf('// Prepare ONCE, before any paid still')
const iHollywoodEnd = rt.indexOf('// ── end KINEO-HOLLYWOOD-2026-07-09')
checa('o bloco existe, DEPOIS do fim do caminho hollywood e ANTES do "Prepare ONCE" (still pago)', iScrub > iHollywoodEnd && iScrub < iPrepare && iPrepare > 0)
const iContrato = rt.indexOf('const contratoRelatoClassico: Array<{')
checa('o bloco fica ANTES de contratoRelatoClassico: o guardião do Codex (test-visual-contract) fatia a rota a partir dali e não conhece a variável prompt', iScrub < iContrato && iContrato > 0)
checa('a história = tema + fala (voiceover), nunca aiPrompt/description', /const historia = `\$\{prompt\} \$\{scenes\.map\(\(s\) => s\.voiceover \?\? ''\)\.join\(' '\)\}`/.test(rt))
checa('as três fontes passam pelo filtro: aiPrompt, stockSearchQuery, description', /scrubInventedSetting\(s\.aiPrompt, historia\)/.test(rt) && /scrubInventedSetting\(s\.stockSearchQuery, historia\)/.test(rt) && /scrubInventedSetting\(s\.description, historia\)/.test(rt))
checa('o texto filtrado SUBSTITUI o original em scenes (não só loga)', /\.\.\.\(aiPrompt \? \{ aiPrompt: aiPrompt\.text \} : \{\}\)/.test(rt) && /scenes = scenes\.map\(\(s, i\) => \{/.test(rt.slice(iScrub, iPrepare)))
checa('a narração (voiceover) não é reescrita pelo bloco', !/voiceover:\s*[a-zA-Z]+\.text/.test(rt.slice(iScrub, iPrepare)))
checa('o contexto de despacho recebe cenarioRemovido', /ctxDespacho\(\)\.cenarioRemovido = cenarioRemovido/.test(rt) && /cenarioRemovido: string\[\]\n\s*\/\*\* Ja registrou\?/.test(rt) && /cenarioRemovido: \[\],/.test(rt))
checa('cinematic_dispatch_result grava setting_scrubbed (medível na próxima rotação)', /setting_scrubbed: ctx\.cenarioRemovido\.map\(\(x\) => x\.slice\(0, 160\)\),/.test(rt))
checa('log de aviso quando algo foi removido', /cenario-scrub: lugar\/epoca fora da historia removidos/.test(rt))

console.log(`\n${ok} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
