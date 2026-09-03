#!/usr/bin/env node
// ═══ KINEO-ROTEIRO-DE-CINEMA-2026-09-03 (sprint-assinaturas #3 / B2) ═══════
//
// Este teste COMPILA lib/scriptParser.ts com o tsc do próprio repositório e
// EXECUTA o parser real contra os roteiros REAIS que 22 pessoas colaram no
// Studio nos últimos 60 dias (`videos.topic`, contas externas, lidos do banco
// em 03/09). Nada de regex no fonte: o que se mede aqui é o que o narrador
// falaria em voz alta.
//
// A PERGUNTA QUE ELE RESPONDE, roteiro por roteiro:
//   "o TTS lê 'Visual:', 'Camera:', '0:00–0:04' ou o preâmbulo do ChatGPT?"
//
// Rodar:  node scripts/test-roteiro-de-cinema.mjs
// Sem rede, sem banco, sem chave de API, sem custo.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const saida = mkdtempSync(join(tmpdir(), 'kineo-roteiro-'))
const requerer = createRequire(join(saida, 'x.cjs'))

execFileSync(
  process.execPath,
  [
    join(raiz, 'node_modules', 'typescript', 'bin', 'tsc'),
    join(raiz, 'lib', 'scriptParser.ts'),
    '--outDir', saida,
    '--module', 'commonjs',
    '--target', 'es2022',
    '--moduleResolution', 'node',
    '--skipLibCheck',
  ],
  { stdio: 'pipe' },
)
writeFileSync(join(saida, 'package.json'), JSON.stringify({ type: 'commonjs' }))

const {
  parseUserScript, stripScriptMarkers, salvageScriptNarration,
  screenplaySpeechOnly, stripAssistantPreamble,
} = requerer(join(saida, 'scriptParser.js'))

let falhas = 0
let total = 0
function checa(nome, condicao, detalhe = '') {
  total += 1
  if (condicao) { console.log(`  ok   ${nome}`) }
  else { falhas += 1; console.log(`  FALHOU ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}
function secao(t) { console.log(`\n── ${t}`) }

// ═══ OS ROTEIROS REAIS ════════════════════════════════════════════════════
// Colados no Studio por clientes externos. Recortados em 500 chars pela
// própria coluna `videos.topic`; nenhuma palavra foi alterada.

const R = {}

R.godInEveryCountry = [
  '# God in Every Country on Earth 🌍🙏',
  '',
  '**Style:** Emotional, cinematic, inspirational',
  '',
  '### 🎬 Scene 1 — One Earth | 0–7 sec',
  '',
  '**Visual:** Earth slowly rotating in space, sunrise appearing across different continents.',
  '',
  '**Voice-over:**',
  '',
  '“Across this beautiful Earth, people speak different languages, follow different traditions, and worship in different ways…”',
  '',
  '**On-screen text:**',
  '',
  '---',
  '',
  '### 🎬 Scene 2 — Around the World | 7–17 sec',
  '',
  '**Visual:** Quick cinematic shots of people in India, Japan, Africa, Brazil.',
  '',
  '**Voice-over:**',
  '',
  '“And yet, in every country, in every language, people look up and ask the same question.”',
].join('\n')

R.butterChicken = [
  '### Clip 1 — Ingredients & Setup | 0:00–0:04',
  '',
  '**Visual:** Full shot of the blue-haired anime chef in his cozy kitchen. All ingredients are arranged neatly on the counter.',
  '',
  '**Action:** He places boneless chicken, yogurt, ginger-garlic paste, spices, tomatoes, onion, butter, cream, cashews, kasuri methi, and coriander within reach.',
  '',
  '**Voiceover:** “Today, we’re making rich, creamy North Indian Butter Chicken.”',
  '',
  '---',
  '',
  '### Clip 2 — Marinate the Chicken | 0:04–0:08',
  '',
  '**Visual:** Close-up of his hands in a large bowl.',
  '',
  '**Voiceover:** “First, marinate the chicken in yogurt and spices.”',
].join('\n')

R.madLabs = [
  '🎙️ New 60-second MadLabs advertisement script',
  '',
  '0–8 sec — INTRO',
  '',
  'Voiceover:',
  '',
  '“Got a business idea but no website that truly represents it? That’s where MadLabs comes in.”',
  '',
  'Screen:',
  '',
  'MadLabs logo → glowing animation →',
  '',
  '8–18 sec — THE PROBLEM',
  '',
  'Voiceover:',
  '',
  '“Your website is more than just a digital address. It’s where potential customers discover your brand, understand what you offer, and decide whether they can trust you.”',
  '',
  'Screen:',
  '',
  'Different website mockups → mobile + laptop animations.',
].join('\n')

R.nurseryPreambulo = [
  'Absolutely. Below is a **complete content package of 10 original one-minute nursery rhyme YouTube Shorts** designed for AI generation.',
  '',
  'Each concept includes: **hook, 10 scenes with timing, lyrics, AI visual direction, title, and hashtags**.',
  '',
  '---',
  '',
  '**Theme:** Interactive dance',
  '',
  '**Duration:** 60 seconds',
  '',
  '### Scene 1 (0–6s) — Hook',
  '',
  'Cute baby penguin slides toward the camera.',
].join('\n')

R.whaleCity = [
  'Scene 1 — The Giant Beneath the Sea',
  '',
  'Visual: A fisherman sails alone beneath a giant full moon. Something enormous moves beneath his boat.',
  '',
  'Narration: “Every full moon, fishermen whispered about a whale so enormous… it carried a city on its back.”',
  '',
  'Scene 2 — The Rising City',
  '',
  'Visual: A gigantic glowing whale rises from the ocean, revealing ancient towers and bridges glowing on its back.',
  '',
  'Narration: “One night, he followed it—and watched an entire forgotten city rise from the darkness.”',
].join('\n')

R.ransomwarePT = [
  'Cena 1: A Ameaça (00:00 - 00:10)',
  '',
  'Visual: O avatar aparece no centro da tela. Ao fundo, uma tela de computador com efeito sutil de aviso/alerta vermelho piscando e o ícone de um cadeado fechando.',
  '',
  'Texto em tela: Seus dados estão seguros?',
  '',
  'Narração: "Imagine chegar para trabalhar hoje e descobrir que todos os arquivos da sua empresa foram sequestrados. O ransomware não é um risco do futuro — ele acontece agora."',
  '',
  'Cena 2: A Solução (00:10 - 00:25)',
  '',
  'Visual: O fundo muda para um ambiente corporativo',
  '',
  'Narração: "A Kineo protege sua empresa antes do ataque acontecer."',
].join('\n')

R.internet1900ES = [
  '### ESCENA 1 — EL GANCHO (0-5 s)',
  '',
  '**Visual:** Una calle de Nueva York en 1900. Carruajes, gente con sombreros, edificios antiguos.',
  '',
  '**Narrador:**',
  '',
  '> “¿Te imaginas que Internet hubiera existido en el año 1900?”',
  '',
  'Texto en pantalla:',
  '',
  '---',
  '',
  '### ESCENA 2 — EL PRIMER SMARTPHONE (5-12 s)',
  '',
  '**Visual:** Un joven de 1900 mira una pantalla luminosa escondida dentro de un libro.',
  '',
  '**Narrador:**',
  '',
  '> “Un dispositivo de metal y madera que lo cambiaba todo.”',
].join('\n')

R.devanshiAd = [
  'Style: Luxury festive ad, warm golden cinematic lighting, marble/stone textured background with engraved paisley patterns, slow elegant camera movement, soft particle/dust glow in the air.',
  '',
  '0:00–0:04',
  '',
  'Camera slowly pushes in on an ornate carved stone wall. Golden light rays sweep across the surface.',
  '',
  '0:04–0:08',
  '',
  'The "Devanshi" logo text illuminates.',
].join('\n')

R.quadrilateral = [
  'Create a short, clean, child-friendly animated educational video titled **“How to Draw a Quadrilateral”** for students of Grade 5–7.',
  '',
  '**Visual style:** 2D educational animation, white/light classroom background, colorful but simple graphics, smooth hand-drawing animation, no human face.',
  '',
  '**Scene 1 – Introduction (0–4 sec)**',
  '',
  'Show the title:',
  '',
  'Voiceover:',
  '',
  '“A quadrilateral is a closed shape with four straight sides.”',
  '',
  '**Scene 2 – The four sides (4–10 sec)**',
  '',
  'Voiceover:',
  '',
  '“Every quadrilateral has four corners, and their angles always add up to 360 degrees.”',
].join('\n')

// Roteiro de PROSA LIMPA — o caso que NUNCA pode mudar (a esmagadora maioria).
R.prosaLimpa = [
  'Five shocking facts about money that nobody tells you.',
  '',
  'The first paper money was invented in China more than a thousand years ago.',
  'Ninety-two percent of the world’s currency exists only as numbers on a screen.',
  'A single dollar bill lasts about six years before it falls apart.',
].join('\n')

// Roteiro no formato DA CASA — marcadores [Pexels: …]. Tem de sair idêntico.
R.formatoDaCasa = [
  'speed: 1.05',
  '[Pexels: rocket launch night] Every rocket that ever left this planet started as a drawing.',
  '[Pexels: engineer blueprint] Someone had to believe the drawing before anyone believed the rocket.',
].join('\n')

// ═══ 1. A REGRA QUE VALE DINHEIRO: fala rotulada vira o filme ═════════════
secao('1. Roteiro de cinema — o narrador fala SÓ o que a pessoa marcou como fala')

const proibidasEN = ['visual:', 'voice-over:', 'voiceover:', 'on-screen text:', 'action:', 'camera:', 'screen:', 'narration:', 'narrator:']
function falaDe(txt) { return stripScriptMarkers(txt) }
function contem(hay, needle) { return hay.toLowerCase().includes(needle.toLowerCase()) }

{
  const fala = falaDe(R.godInEveryCountry)
  checa('god/country — o narrador NÃO lê "Visual:"', !contem(fala, 'visual:'), fala.slice(0, 120))
  checa('god/country — o narrador NÃO lê "Voice-over"', !contem(fala, 'voice-over'), fala.slice(0, 120))
  checa('god/country — o narrador NÃO lê "On-screen text"', !contem(fala, 'on-screen'), fala.slice(0, 120))
  checa('god/country — o narrador NÃO lê "Style: Emotional"', !contem(fala, 'emotional, cinematic'), fala.slice(0, 120))
  checa('god/country — o narrador NÃO lê "Earth slowly rotating" (direção de arte)', !contem(fala, 'slowly rotating'), fala.slice(0, 160))
  checa('god/country — a fala 1 SOBREVIVE', contem(fala, 'Across this beautiful Earth'), fala.slice(0, 160))
  checa('god/country — a fala 2 SOBREVIVE', contem(fala, 'look up and ask the same question'), fala.slice(-160))
}

{
  const fala = falaDe(R.butterChicken)
  checa('butter chicken — sem "Visual:"', !contem(fala, 'visual:'))
  checa('butter chicken — sem "Action:"', !contem(fala, 'action:'))
  checa('butter chicken — sem "Clip 1"', !contem(fala, 'clip 1'))
  checa('butter chicken — sem marcação de tempo "0:00"', !contem(fala, '0:00'))
  checa('butter chicken — sem a lista de ingredientes (era direção de arte)', !contem(fala, 'kasuri methi'))
  checa('butter chicken — as DUAS falas sobrevivem',
    contem(fala, 'creamy North Indian Butter Chicken') && contem(fala, 'marinate the chicken in yogurt'))
}

{
  const fala = falaDe(R.madLabs)
  checa('madlabs — sem "Screen:"', !contem(fala, 'screen:'))
  checa('madlabs — sem "MadLabs logo"', !contem(fala, 'logo'))
  checa('madlabs — sem "0–8 sec"', !contem(fala, '8 sec'))
  checa('madlabs — sem o título do arquivo ("60-second MadLabs advertisement script")',
    !contem(fala, 'advertisement script'), fala.slice(0, 120))
  checa('madlabs — as duas falas sobrevivem',
    contem(fala, 'no website that truly represents it') && contem(fala, 'decide whether they can trust you'))
}

{
  const fala = falaDe(R.whaleCity)
  checa('whale city — sem "Visual:"', !contem(fala, 'visual:'))
  checa('whale city — sem "Scene 1"', !contem(fala, 'scene 1'))
  checa('whale city — sem "fisherman sails alone" (direção de arte)', !contem(fala, 'sails alone'))
  checa('whale city — as duas narrações sobrevivem',
    contem(fala, 'carried a city on its back') && contem(fala, 'forgotten city rise from the darkness'))
}

{
  const fala = falaDe(R.ransomwarePT)
  checa('ransomware PT — sem "Visual:"', !contem(fala, 'visual:'))
  checa('ransomware PT — sem "Texto em tela"', !contem(fala, 'texto em tela'))
  checa('ransomware PT — sem "Cena 1"', !contem(fala, 'cena 1'))
  checa('ransomware PT — sem "Narração:"', !contem(fala, 'narração:'))
  checa('ransomware PT — as duas falas sobrevivem',
    contem(fala, 'todos os arquivos da sua empresa foram sequestrados') && contem(fala, 'antes do ataque acontecer'))
}

{
  const fala = falaDe(R.internet1900ES)
  checa('internet 1900 ES — sem "Visual:"', !contem(fala, 'visual:'))
  checa('internet 1900 ES — sem "Texto en pantalla"', !contem(fala, 'texto en pantalla'))
  checa('internet 1900 ES — sem "ESCENA 1"', !contem(fala, 'escena 1'))
  checa('internet 1900 ES — sem "Carruajes" (direção de arte)', !contem(fala, 'carruajes'))
  checa('internet 1900 ES — as duas falas sobrevivem',
    contem(fala, 'Internet hubiera existido en el año 1900') && contem(fala, 'metal y madera'))
}

{
  const fala = falaDe(R.quadrilateral)
  checa('quadrilátero — sem a INSTRUÇÃO "Create a short, clean, child-friendly"', !contem(fala, 'child-friendly'), fala.slice(0, 140))
  checa('quadrilátero — sem "Visual style"', !contem(fala, 'visual style'))
  checa('quadrilátero — as duas falas sobrevivem',
    contem(fala, 'closed shape with four straight sides') && contem(fala, 'add up to 360 degrees'))
}

// ═══ 2. Sem rótulo de fala: as regras 1-4 ainda limpam o que nunca é fala ══
secao('2. Sem rótulo de fala — direção, tempo e preâmbulo continuam saindo')

{
  const fala = falaDe(R.devanshiAd)
  checa('devanshi — "Style:" com maiúscula inicial sai (antes só `style:` saía)', !contem(fala, 'luxury festive ad'), fala.slice(0, 140))
  checa('devanshi — a marcação "0:00–0:04" não é falada', !contem(fala, '0:04'), fala.slice(0, 140))
  checa('devanshi — o que sobra é a descrição de cena, não a ficha técnica',
    contem(fala, 'Camera slowly pushes in') || contem(fala, 'logo text illuminates'), fala.slice(0, 140))
}

{
  const fala = falaDe(R.nurseryPreambulo)
  checa('nursery — o preâmbulo "Absolutely. Below is a complete content package" SAI',
    !contem(fala, 'complete content package'), fala.slice(0, 160))
  checa('nursery — a segunda linha de preâmbulo também sai', !contem(fala, 'Each concept includes'), fala.slice(0, 160))
  checa('nursery — "Theme:" e "Duration:" saem', !contem(fala, 'interactive dance') && !contem(fala, '60 seconds'))
  checa('nursery — "Scene 1 (0–6s)" sai', !contem(fala, 'scene 1'))
  checa('nursery — o conteúdo de verdade fica', contem(fala, 'baby penguin slides toward the camera'), fala.slice(0, 160))
}

// ═══ 3. O QUE NÃO PODE MUDAR (regressão) ══════════════════════════════════
secao('3. Regressão — prosa limpa e formato da casa saem byte a byte iguais')

{
  const fala = falaDe(R.prosaLimpa)
  checa('prosa limpa — nenhuma palavra some',
    contem(fala, 'Five shocking facts about money') &&
    contem(fala, 'invented in China') &&
    contem(fala, 'numbers on a screen') &&
    contem(fala, 'six years before it falls apart'), fala)
  checa('prosa limpa — nenhum rótulo inventado', !contem(fala, ':'), fala)
}

{
  const p = parseUserScript(R.formatoDaCasa)
  checa('formato da casa — 2 segmentos com marcador', p.hasMarkers && p.segments.length === 2)
  checa('formato da casa — query 1 intacta', p.segments[0].pexelsQuery === 'rocket launch night')
  checa('formato da casa — fala 1 intacta', p.segments[0].voiceover === 'Every rocket that ever left this planet started as a drawing.')
  checa('formato da casa — fala 2 intacta', p.segments[1].voiceover === 'Someone had to believe the drawing before anyone believed the rocket.')
  checa('formato da casa — speed continua sendo lido', p.speed === 1.05)
  checa('formato da casa — "speed: 1.05" não é falado', !contem(p.narration, 'speed'))
}

// ═══ 4. A TRAVA DE SEGURANÇA (o erro de 13/08 não pode voltar) ════════════
secao('4. Trava — regra nova nunca devolve string vazia onde a antiga salvava')

{
  // Roteiro que é 100% rótulo de produção: se as regras novas mandassem, a
  // narração seria vazia — e /api/compose responderia "voiceover_script is
  // required" na cara do cliente, depois de todo o custo.
  const soDirecao = ['Visual: a man walks', 'Camera: slow push in', 'Music: tense drone'].join('\n')
  const fala = falaDe(soDirecao)
  checa('só direção de arte — NÃO devolve vazio (cai no comportamento antigo)', fala.length > 0, JSON.stringify(fala))
  checa('só direção de arte — o modo tolerante também não devolve vazio', salvageScriptNarration(soDirecao).length > 0)
}

{
  // Um único rótulo de fala é FICHA DE VOZ, não roteiro: regra 5 não entra.
  const fichaDeVoz = [
    'Target length: 40 seconds',
    'Narration: Natural male American English voice, 20s–30s, controlled and serious',
    'Every night at exactly three in the morning, the lights in that house turn on by themselves.',
  ].join('\n')
  checa('1 rótulo de fala só → regra 5 NÃO entra', screenplaySpeechOnly(fichaDeVoz) === null)
  checa('ficha de voz — a narração de verdade sobrevive',
    contem(falaDe(fichaDeVoz), 'lights in that house turn on by themselves'))
  checa('ficha de voz — "Target length" sai', !contem(falaDe(fichaDeVoz), '40 seconds'))
}

checa('texto vazio não explode', stripScriptMarkers('') === '' && screenplaySpeechOnly('') === null)
checa('null não explode', stripScriptMarkers(null) === '' && stripAssistantPreamble(null) === '')

// ═══ 5. O preâmbulo é cirúrgico (não come narração de verdade) ════════════
secao('5. Preâmbulo — só come meta-comentário, nunca uma frase da história')

checa('"Sure, he said, and walked away." NÃO é preâmbulo',
  stripAssistantPreamble('Sure, he said, and walked away.\nThe door closed behind him.').startsWith('Sure, he said'))
checa('"Perfect timing for a robbery" NÃO é preâmbulo',
  stripAssistantPreamble('Perfect timing for a robbery, he thought.').startsWith('Perfect timing'))
checa('"Here is the script you asked for" É preâmbulo',
  stripAssistantPreamble('Here is the script you asked for:\nThe ocean is deeper than you think.').trim().startsWith('The ocean'))
checa('preâmbulo para no máximo 3 linhas',
  stripAssistantPreamble(['Sure, here is your script', 'Below is the video concept', 'Here is the short version',
    'Of course, this is the final script', 'Real narration.'].join('\n')).includes('Of course, this is the final script'))

// ═══ 6. A régua do #1 passa a medir a FALA, não a direção de arte ═════════
secao('6. Interação com o degrau de narração (#1 de hoje)')

{
  const antes = R.godInEveryCountry.split(/\s+/).filter(Boolean).length
  const depois = parseUserScript(R.godInEveryCountry).narration.split(/\s+/).filter(Boolean).length
  checa('god/country — a régua deixa de contar a direção de arte como fala',
    depois < antes * 0.6, `${antes} palavras no texto colado → ${depois} de fala real`)
  checa('god/country — a fala real ainda tem palavras para medir', depois >= 20, `${depois} palavras`)
}

console.log(`\n${total - falhas}/${total} verificações passaram.`)
if (falhas) { console.log(`${falhas} FALHA(S).`); process.exit(1) }
console.log('Nenhuma falha.\n')
