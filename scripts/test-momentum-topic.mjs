// sprint-assinaturas #6 — 02/09/2026 — o e-mail de momentum tem que citar o
// filme da pessoa e levar o tema no botao. Prova com os 23 roteiros REAIS dos
// elegiveis do 1o disparo (10:30 BRT de 02/09), lidos do banco em 02/09 00:05:
// (a) o portao antigo (>90 chars = null) rejeitava 100% deles;
// (b) o portao novo devolve o gancho para os roteiros de verdade;
// (c) roteiro que e INSTRUCAO ao modelo nao vira anchor;
// (d) a rota usa o modulo novo, nao o cleanTopic antigo, e tem o tripwire.
// Transpila os .ts com o proprio typescript do repo (sem tsx/ts-node aqui).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(R, 'package.json'))
const ts = require('typescript')
const out = mkdtempSync(join(tmpdir(), 'momentum-'))
for (const f of ['resumeStrip', 'momentumTopic']) {
  const js = ts.transpileModule(readFileSync(join(R, `lib/${f}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText.replace(/from '\.\/resumeStrip'/, "from './resumeStrip.mjs'")
  writeFileSync(join(out, `${f}.mjs`), js)
}
const { pickMomentumTopic, momentumAnchor } = await import(pathToFileURL(join(out, 'momentumTopic.mjs')).href)

let ok = 0, bad = 0
const t = (name, cond) => { if (cond) { ok++; console.log('  ✓', name) } else { bad++; console.log('  ✗', name) } }
const oldClean = (raw) => { // o cleanTopic que a rota tinha ate o #5
  if (!raw) return null
  const x = raw.replace(/\b(HOOK|MICRO REWARD|ESCALATION|PAYOFF|RHYTHM)\b:?/gi, '').replace(/[<>]/g, '').trim()
  return x.length < 8 || x.length > 90 ? null : x
}

// Roteiros reais (primeiros 260 chars, como no banco) — 19 filmes de verdade.
const reais = [
  ['"At 3:00 AM, a mysterious door appears... in my hallway."\n\n"This door was never part of the house\'s original design."', 'At 3:00 AM, a mysterious door appears... in my hallway.'],
  ['What mysterious voice haunts this magical house at night?\n\nEvery night, Milo, a tiny ghost with big eyes, hears whispers.', 'What mysterious voice haunts this magical house at night?'],
  ["Think you know push-ups? Here's the perfect form — revealed.\n\nStart with your hands slightly wider than shoulder width.", "Think you know push-ups? Here's the perfect form — revealed."],
  ["You're wasting hours doing things AI can do in seconds.\n\nHere are three AI tools you should know in 2026.", "You're wasting hours doing things AI can do in seconds."],
  ['In a Pakistani kitchen, the potato is about to rule!\n\nThe potato declares, "Whoever is most useful becomes the king!"', 'In a Pakistani kitchen, the potato is about to rule!'],
  ['This image hides two faces — can you see both?\n\nMost viewers only catch one face first... the young woman.', 'This image hides two faces — can you see both?'],
  ['Imagine a place drowning in rain—every single day!\n\nWelcome to Mawsynram, India, where they receive 467 inches of rain a year.', 'Imagine a place drowning in rain—every single day!'],
  ['Ever seen a poster that makes you double-take?\n\nThis design concept is called "negative space" in graphic design.', 'Ever seen a poster that makes you double-take?'],
  ["The secret behind football's craziest goals? It’s not what you think.\n\nIn 2019, Liverpool used a never-before-seen 4-2-4 formation.", "The secret behind football's craziest goals? It’s not what you think."],
  ['A 2,000-year-old computer... discovered in the deep sea.\n\nIn 1901, divers found the Antikythera mechanism in a Greek shipwreck.', 'A 2,000-year-old computer... discovered in the deep sea.'],
  ["GTA 5 vs GTA 6... Which one truly raises the bar?\n\nIn 2013, GTA 5's Los Santos wowed us with its detailed cityscapes.", 'GTA 5 vs GTA 6... Which one truly raises the bar?'],
  ['Ever heard of an island where no one can survive?\n\nIt’s called North Sentinel Island, located in the Bay of Bengal.', 'Ever heard of an island where no one can survive?'],
  ['These fruits cost more than a luxury car!\n\nThe Japanese Yuzu — a citrus fruit that can cost $20 each.', 'These fruits cost more than a luxury car!'],
  ['Five hundred years ago, people set fire to leaves... through water.\n\nThe first hookah? A coconut shell with a pipe stuck through it.', 'Five hundred years ago, people set fire to leaves... through water.'],
  ["What’s the secret behind billionaires' private jet interiors?\n\nSome private jets feature watches worth over $100,000.", "What’s the secret behind billionaires' private jet interiors?"],
  ['Did you know... snakes can mimic human behavior?\n\nSome snakes form bonds with their owners, just like pets do.', 'Did you know... snakes can mimic human behavior?'],
  ['A haunting text... from his own phone number.\n\nAlone in his dimly lit apartment, a chilling message appears on his phone: "Don\'t turn around."', 'A haunting text... from his own phone number.'],
  ['Ever wondered why TikTok dances go viral?\n\nTikTok\'s algorithm boosts videos based on engagement, not just views.', 'Ever wondered why TikTok dances go viral?'],
  ['Já imaginou caminhar em uma cidade futurista, onde tudo é possível?\n\nEsses arranha-céus são mais do que estruturas — são assistentes pessoais.', 'Já imaginou caminhar em uma cidade futurista, onde tudo é possível?'],
]
// Roteiros que sao INSTRUCAO/colagem — 4 casos reais do mesmo lote.
const instrucoes = [
  'Create a 40-second Shorts video titled "What Would Happen If There Were No Internet for 24 Hours?" It should have an English voiceover, subtitles, and animation.',
  'Absolutely. Below is a **complete content package of 10 original one-minute nursery rhyme YouTube Shorts** designed for AI generation.\n\nEach concept includes: **hook, 10 scenes**',
  'All spoken dialogue must be in FRENCH ONLY.\n\nEvery character speaks natural native French from France.\n\nNo English speech.',
  'STYLE: Bright, colourful, cute high-quality 3D animation. Fast-paced, funny, magical and exciting. NOT horror.\n\nMAIN CHARACTER: Dino, an adorable little green baby dragon',
]

console.log('(a) portao antigo rejeitava TODOS os roteiros reais')
const antigoRejeita = [...reais.map(([r]) => r), ...instrucoes].filter((r) => oldClean(r.padEnd(161, ' x')) === null).length
t(`cleanTopic antigo: ${antigoRejeita}/${reais.length + instrucoes.length} → null (com_tema=0)`, antigoRejeita === reais.length + instrucoes.length)

console.log('(b) portao novo devolve o gancho dos filmes de verdade')
for (const [raw, esperado] of reais) t(`"${esperado.slice(0, 50)}"`, pickMomentumTopic(raw) === esperado)

console.log('(c) instrucao ao modelo NAO vira anchor')
for (const raw of instrucoes) t(`rejeita "${raw.slice(0, 44)}…"`, pickMomentumTopic(raw) === null)
t('vazio/null → null', pickMomentumTopic(null) === null && pickMomentumTopic('   ') === null)
t('gancho com <b> perde os sinais', !/[<>]/.test(pickMomentumTopic('Ever heard of <b>this</b> island where no one survives?\n\ncorpo') ?? '<'))
t('gancho > 90 chars → null (nao inventa titulo cortado no e-mail)', pickMomentumTopic('x'.repeat(120) + '\n\ncorpo') === null)
t('gancho "Here\'s why…" (comum em Shorts) e ACEITO', pickMomentumTopic("Here's why billionaires never buy new cars.\n\ncorpo") === "Here's why billionaires never buy new cars.")
t('formato HOOK: marcador e Pexels tambem passam pela regua da casa', pickMomentumTopic('HOOK (0-2s): [Pexels: storm] The city that floods every night.\nMICRO REWARD: ...') === 'The city that floods every night.')

console.log('(d) anchor e rota')
t('anchor com tema vem entre aspas (gancho termina em ? ou !)', momentumAnchor('Ever heard of an island where no one can survive?', 1) === 'Your film “Ever heard of an island where no one can survive?” is sitting in your library.')
t('anchor sem tema, 1 video = frase neutra de antes', momentumAnchor(null, 1) === 'You made your first film with Kineo.')
t('anchor sem tema, 3 videos', momentumAnchor(null, 3) === 'You made 3 films with Kineo.')
const rota = readFileSync(join(R, 'app/api/cron/send-momentum-nudge/route.ts'), 'utf8')
t('rota importa pickMomentumTopic e momentumAnchor', /import \{ pickMomentumTopic, momentumAnchor \} from '@\/lib\/momentumTopic'/.test(rota))
t('rota usa pickMomentumTopic no alvo', /topic: pickMomentumTopic\(agg\.topic\)/.test(rota))
t('rota nao define mais cleanTopic', !/function cleanTopic/.test(rota))
t('anchor da rota vem do modulo', /const anchor = momentumAnchor\(topic, videosMade\)/.test(rota))
t('tema segue viajando no botao (buildSeriesContinuationEmailUrl com topic)', /buildSeriesContinuationEmailUrl\(APP_URL, topic, 'momentum_email'/.test(rota))
const iTrip = rota.indexOf('>= VIDEOS_TRIPWIRE')
t('tripwire de truncamento: >=1000 linhas → 500 e zero envio', /VIDEOS_TRIPWIRE = 1000/.test(rota) && iTrip > 0 && /status: 500/.test(rota.slice(iTrip, iTrip + 500)))
t('tripwire vem ANTES da agregacao por pessoa', iTrip < rota.indexOf('const byUser = new Map'))
const corpo = rota.slice(rota.indexOf('function buildEmail'), rota.indexOf('export async function GET'))
t('copy nao nomeia motor nem preco', !/kling|veo|seedance|minimax|omni|\$\d/i.test(corpo))

console.log(`\n${ok} ok · ${bad} falhas`)
process.exit(bad ? 1 : 0)
