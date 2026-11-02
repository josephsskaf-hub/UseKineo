// KINEO-PROTAGONISTA-SEEDANCE-0111 [TRAVA 8.2] — guardião do ELENCO SEMÂNTICO (lib/cinematic/elencoSemantico.ts).
// Offline: usa as respostas REAIS do gpt-4o-mini gravadas na calibração (docs/calibracao/protagonista-seedance-0111.json) como mock.
//   1. Calibração: as respostas gravadas, relidas pela conferência de hoje, dão 0 erro grave e ≥ 90% de acerto.
//   2. Falha segura: sem chave, erro de rede, HTTP 500, JSON inválido, prazo estourado → null e a rota fica com o elenco de sempre.
//   3. Caminho REAL do filme de 15 s da rota com BRO, Mila, Max (renders de 01/11) e controles: um pombo só, Mila gente, Max gente.
//   4. Conferência contra o texto (mutantes de resposta): nome fora do texto, espécie fora do texto, aparência inventada, lugar.
//   12. Rodada 12 (substitui as seções de regex de idade das rodadas 10/11): age_text/role_text são TRECHOS LITERAIS copiados pelo modelo;
//       o código só os aceita se existem no texto a até ~12 palavras do nome. Todos os casos das revisões 10, 11 e 12 (Leo "The story of",
//       Ana/Lucía "de olhos azuis/ojos verdes", Lily "She is seven", Pablo/abuela Carmen, Kai, "Leo, grandson of a 78-year-old fisherman",
//       o Roland do Rick) pelo caminho real de 15 s, com as respostas reais da API.
//   14. Rodada 14 (NÃO INTERPRETAR IDADE NEM GÊNERO): a ficha do trecho aceito é só "<Nome>, <trecho>, exactly as the author wrote";
//       os casos da revisão da rodada 13 (Ivy, Mae, Theo 1,5 ano + Maya irmã, Zoe 6yo, Grandma Rose, Grandma June, Laura, Martina, Ezra,
//       Ben/Ruth, Seu Antônio/Pedrinho, Lucía) e os de antes (Leo inventor, Leo neto do pescador, Pablo/Carmen, Roland) pelo caminho real
//       de 15 s: o trecho literal chega ao motor e nenhuma faixa/pessoa nossa contraditória.
//   15. Rodada 15: o caminho15 roda o CASTING da folha (como a rota em todo 15 s) com uma resposta que reescreve todo personagem; a ficha
//       do trecho do autor (origem 'autor') chega igual ao motor em todos os casos com ficha esperada; os 12 casos da revisão da rodada 14
//       (com os visuais do revisor); com duas pessoas no elenco semântico, a cena com gente sem nome não é forçada.
// Rodar: npx tsx scripts/test-protagonista-seedance-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { lerElencoSemantico, pedirElencoSemantico, aplicarElencoSemantico, fichaLiteralConferida, conferirFichaLiteral, aceitaPapelDasCenas, trechoPerto, trechoDaPessoa, nucleoDoPapel, ELENCO_SEMANTICO_ORCAMENTO_MS, ELENCO_SEMANTICO_USD, type ElencoSemantico } from '../lib/cinematic/elencoSemantico'
import { elencoDoRoteiro, ajustarPromptsDoElenco, lerCastingAjuste, elencoComCastingAjuste, visualMostraAlguem } from '../lib/cinematic/personagemAjuste'
import { elencoComFichaLiteral, trocarFichaNoPrompt } from '../lib/cinematic/juizFicha'
import { elencoDoFilme15, protagonistaEmTodaCena, cenaCitaElenco, ORDEM_DO_PROTAGONISTA } from '../lib/filmes/filme15Elenco'
import { prepararQualidadeDoFilme } from '../lib/cinematic/filmQuality'
import { aplicarElencoEEpoca, mesmoPersonagem } from '../lib/cinematic/elencoEpoca'
import { deriveStyleAnchor } from '../lib/cinematic/sceneStyle'
import type { FichaDePersonagem } from '../lib/cinematic/folhaDePersonagem'
import { avaliar, fichaDoTrecho, nossaParte, PESSOA_OU_FAIXA, type Caso } from './test-support/avaliar-protagonista-seedance-0111.mts'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const calib = JSON.parse(fs.readFileSync(path.join(raiz, 'docs/calibracao/protagonista-seedance-0111.json'), 'utf8')) as { resumo: { casos: number }; casos: Array<Caso & { resposta: { raw: string | null; status: string } }> }
const porId = new Map(calib.casos.map((c) => [c.id, c]))
const gravado = (id: string): ElencoSemantico | null => { const c = porId.get(id); return c && c.resposta.raw ? lerElencoSemantico(c.resposta.raw, c.texto) : null }

console.log('== 1. Calibração gravada (respostas reais do gpt-4o-mini, conferência de hoje) ==')
{
  let acertos = 0
  const graves: string[] = []
  for (const c of calib.casos) {
    const e = c.resposta.raw ? lerElencoSemantico(c.resposta.raw, c.texto) : null
    const n = avaliar(c, e)
    if (n.acerto) acertos++
    if (n.graves.length) graves.push(`${c.id}: ${n.graves.join(',')}`)
  }
  const fontes = new Set(calib.casos.map((c) => c.fonte))
  ok(calib.casos.length >= 50, `conjunto rotulado com ${calib.casos.length} casos (≥ 50)`)
  ok(calib.casos.filter((c) => c.fonte === 'banco').length >= 15, `${calib.casos.filter((c) => c.fonte === 'banco').length} roteiros reais do banco (≥ 15)`)
  ok(fontes.has('producao') && fontes.has('revisao'), 'os 3 renders de 01/11 e os exemplos das revisões estão no conjunto')
  ok(graves.length === 0, `0 erro grave (${graves.join(' | ') || 'nenhum'})`)
  ok(acertos / calib.casos.length >= 0.9, `acerto ${acertos}/${calib.casos.length} = ${Math.round((acertos / calib.casos.length) * 1000) / 10}% (≥ 90%)`)
  for (const id of ['rev-025', 'rev-026', 'rev-027', 'rev-042', 'rev-043', 'rev-057', 'rev-052']) {
    const e = gravado(id)
    ok(!e?.protagonist || e.protagonist.kind === 'human', `${id}: lugar com nome de bicho não faz da pessoa um bicho (${e?.protagonist?.name ?? '-'} ${e?.protagonist?.kind ?? '-'})`)
  }
  for (const id of ['rev-imagine-dragon', 'rev-imagine-caps', 'rev-watch-bear', 'rev-later-soldier', 'rev-finally-hero', 'rev-meanwhile-fox', 'rev-074', 'rev-105', 'rev-096']) {
    const e = gravado(id)
    ok(!e?.protagonist?.name, `${id}: palavra de abertura não vira personagem nomeado (${e?.protagonist?.name ?? e?.protagonist?.role ?? 'sem protagonista'})`)
  }
}

// ═══ 2. Falha segura ═══════════════════════════════════════════════════════════════════════════════════════════════
console.log('== 2. Falha segura: qualquer falha = elenco de sempre ==')
{
  const MAX = porId.get('prod-max')!
  const resposta = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const okBody = { choices: [{ message: { content: MAX.resposta.raw } }] }
  let chamadas = 0
  const semChave = await pedirElencoSemantico(MAX.texto, { apiKey: '', fetchImpl: async () => { chamadas++; return resposta(okBody) } })
  ok(semChave.elenco === null && semChave.status === 'sem_chave' && chamadas === 0, 'sem chave: nenhuma chamada, null')
  chamadas = 0
  const rede = await pedirElencoSemantico(MAX.texto, { apiKey: 'k', fetchImpl: async () => { chamadas++; throw new Error('ECONNRESET') } })
  ok(rede.elenco === null && rede.status === 'falhou' && chamadas === 2, `erro de rede: 1 tentativa extra (${chamadas} chamadas), null`)
  chamadas = 0
  const reprovada = await pedirElencoSemantico(MAX.texto, { apiKey: 'k', fetchImpl: async () => { chamadas++; return resposta({ choices: [{ message: { content: '{"protagonist":{"name":"Rex","kind":"human"},"supporting":[],"places_and_orgs":[]}' } }] }) } })
  ok(reprovada.elenco === null && reprovada.status === 'json_invalido' && chamadas === 1, `resposta reprovada na conferência: sem 2ª chamada a temperature 0 (${chamadas} chamada)`)
  const http = await pedirElencoSemantico(MAX.texto, { apiKey: 'k', fetchImpl: async () => resposta({ error: 'x' }, 500) })
  ok(http.elenco === null && http.status === 'falhou', 'HTTP 500 nas 2 tentativas: null')
  const lixo = await pedirElencoSemantico(MAX.texto, { apiKey: 'k', fetchImpl: async () => resposta({ choices: [{ message: { content: 'not json {' } }] }) })
  ok(lixo.elenco === null && lixo.status === 'json_invalido', 'JSON inválido: null')
  const formato = await pedirElencoSemantico(MAX.texto, { apiKey: 'k', fetchImpl: async () => resposta({ choices: [{ message: { content: '{"cast":[]}' } }] }) })
  ok(formato.elenco === null, 'JSON fora do formato (sem "protagonist"): null')
  const t0 = Date.now()
  const prazo = await pedirElencoSemantico(MAX.texto, { apiKey: 'k', timeoutMs: 60, fetchImpl: (_u, init) => new Promise((_res, rej) => { (init as RequestInit).signal?.addEventListener('abort', () => rej(new Error('abort'))) }) })
  ok(prazo.elenco === null && prazo.status === 'falhou' && Date.now() - t0 < 1500, `prazo estourado nas 2 tentativas: null em ${Date.now() - t0} ms`)
  chamadas = 0
  const segunda = await pedirElencoSemantico(MAX.texto, { apiKey: 'k', fetchImpl: async () => (++chamadas === 1 ? resposta({}, 503) : resposta(okBody)) })
  ok(segunda.elenco?.protagonist?.name === 'Max' && segunda.tentativas === 2, 'a 1ª falha e a tentativa extra responde: vale a 2ª')
  // a rota: aplicarElencoSemantico(base, null) = null → elencoDoPedido = elencoDoRoteiro(prompt), o mesmo objeto de sempre
  const base = elencoDoRoteiro(MAX.texto)
  ok(aplicarElencoSemantico(base, null, MAX.texto) === null, 'sem resposta válida: o elenco do pedido é o determinístico (nada é tocado)')
  ok(aplicarElencoSemantico(base, gravado('rev-074'), porId.get('rev-074')!.texto) === null, 'protagonista sem nome ("Picture a dragon…"): o elenco de sempre')
  const prompts = ['Max on a bench in the rain.', 'Max reads a note.', 'Max holds a puppy.']
  const falas = ['Max wakes on the same city bench.', 'Lena is gone.', 'Max picks it up.']
  const a = aplicarElencoEEpoca({ prompts, falas, contextoOriginal: MAX.texto, contextoFiltro: MAX.texto, modo: 'character_story', tagFaceless: false })
  const b = aplicarElencoEEpoca({ prompts, falas, contextoOriginal: MAX.texto, contextoFiltro: MAX.texto, modo: 'character_story', tagFaceless: false, elencoSemantico: null })
  ok(JSON.stringify(a) === JSON.stringify(b), 'elencoEpoca sem elenco semântico: saída idêntica à de sempre')
}

// ═══ 3. O caminho REAL do filme de 15 s (route.ts) ═════════════════════════════════════════════════════════════════
const MAIN = 'The same main character appears in this scene, consistent design:'
const PROD: Record<string, { falas: string[]; prompts: string[] }> = {
  'prod-bro': {
    falas: ['BRO the muscular pigeon is back, and still bald. Today he marches into a fancy wig shop with exactly five dollars.', 'The only wig he can afford is a bright pink unicorn mane.', 'He puts it on, flexes in the mirror, and whispers one word: Bro.'],
    prompts: ['BRO the muscular pigeon strides confidently into a lavish wig shop, his bald head gleaming under the bright lights, clutching five dollars tightly.', "A vibrant bright pink unicorn mane wig hangs prominently on a display, shimmering under the shop's elegant lighting, beckoning BRO's attention.", "BRO dons the bright pink unicorn mane, flexing his muscular wings in front of a mirror, whispering 'Bro' with a proud glint in his eye."],
  },
  'prod-mila': {
    falas: ['Mila, with her turquoise hair and star-shaped backpack, returns to Rainbow Valley. But Skoczuś is missing!', 'A trail of glowing footprints leads to a giant singing flower.', 'Mila hums along, the petals slowly open, and there is Skoczuś, fast asleep, snoring tiny rainbow bubbles.'],
    prompts: ['Mila, with her vibrant turquoise hair and star-shaped backpack, walks through the colorful landscape of Rainbow Valley, looking concerned for Skoczuś.', 'A close-up of glowing footprints illuminating the grass, leading towards a giant, vibrant flower that sways gently, invitingly singing in the sunlight.', 'Mila stands near the giant flower, humming softly as its petals unfurl, revealing Skoczuś nestled inside, peacefully snoring out tiny rainbow bubbles.'],
  },
  'prod-max': {
    falas: ['Max wakes on the same city bench. The glowing timer above his head now reads one minute.', 'Lena is gone. A note in his pocket says: help someone who can never repay you.', 'A stray puppy shivers in the rain. Max picks it up. The timer turns gold.'],
    prompts: ['Max stirs awake on a weathered city bench, the timer above his head glowing ominously with a bright red one minute, rain softly falling.', 'Max sits on the bench, a look of despair on his face, with a crumpled note partially visible in his hand, rain falling around him.', 'A small, drenched puppy shivers on the wet pavement, Max gently scooping it into his arms, the timer above transforming to a warm gold hue.'],
  },
  // rodada 8: o render REAL 49b015e8 (achrafiadadi4, 01/11 18:10 BRT) — falas e visuais lidos do cinematic_submission_claim
  'real-tommy': {
    falas: ['Meet Tommy—a boy with a sandwich and a big adventure.', "Suddenly, a mischievous pup leaps and grabs Tommy's snack! Tommy chases, but the pup's got moves—like a true performer!", "And then... the pup dances on Tommy's head. Laughter erupts!"],
    prompts: ['A young boy named Tommy, wearing a bright red cap and blue shorts, strolls through a sunlit park, clutching a sandwich in hand, excitement in his eyes.', "A playful dog, mid-air with its fluffy fur catching the sunlight, snatches the sandwich from Tommy's hand as he looks on in surprise; Tommy immediately starts running after it.", "The mischievous pup balances on Tommy's head, performing a silly dance, while Tommy laughs joyfully, surrounded by the vibrant park backdrop."],
  },
}
// rodada 15: os 12 casos da revisão da rodada 14 com os visuais que o revisor usou (o escritor de cenas cita o coadjuvante só pelo papel:
// "A baby in a stroller", "A young man helps his grandmother", "An old man in the armchair"); as falas são as frases do texto
const VISUAIS_R15: Record<string, string[]> = {
  'rev15-hazel-ninety': ['An elderly woman with silver hair pedals a vintage bicycle down a cobblestone street at sunrise.', 'A baker in a white apron hides a candlelit cake behind the counter of a cozy bakery.', 'Hazel laughs as the baker reveals the cake, warm light filling the shop.'],
  'rev15-otto-barely-two': ['A toddler in blue overalls wobbles across a sunlit garden lawn.', 'A small hedgehog peeks out from under a rosebush.', 'The hedgehog sniffs a tiny sneaker while the little boy giggles.'],
  'rev15-edith-103': ['A very old woman ties the laces of her running shoes on a misty Welsh hillside at dawn.', 'A young boy holds a silver stopwatch, grinning.', 'Edith crosses the finish line as the crowd cheers.'],
  'rev15-nell-bea-twelve': ['Two girls climb into a dusty attic full of old trunks.', 'An old yellowed map unfolds in the beam of a flashlight.', 'One girl reads the map aloud while the other aims a flashlight into the dark.'],
  'pt-rev15-dona-zuleide': ['An elderly woman in a floral dress sits on the porch of a small town house.', 'A young man helps his grandmother out of an old car near the beach.', 'The grandmother stands barefoot on the sand, staring at the ocean for the first time.'],
  'es-rev15-iker-ocho-meses': ['A baby crawls across a wooden living room floor.', 'A small brown dog wags its tail excitedly.', 'The baby laughs as the dog licks his hand.'],
  'rev15-bean-martha': ['A boy solders wires on a cluttered workbench in a garage.', 'A homemade radio made of scrap parts crackles to life.', 'An old woman turns the dial of the radio and smiles.'],
  'rev15-rosa-delgado': ['A woman at the wheel of a fishing boat in a raging storm.', 'A teenage girl ties down nets on the deck as waves crash.', 'Rosa shouts orders while lightning splits the sky.'],
  'rev15-old-tom-nineteen': ['A young man rows a small wooden boat out of a harbor before sunrise.', 'Seagulls circle above the boat in the pink dawn light.', 'Tom sings with his head tilted back as the gulls follow.'],
  'rev15-lorna-avo-95': ['A girl sits beside an armchair holding a large newspaper.', 'An old man in the armchair laughs with his eyes closed.', 'Lorna acts out a headline with a funny voice.'],
  'rev15-sam-nurse-pirate': ['A person walks out of an animal shelter holding a cat carrier.', 'A three-legged black cat hops along a sidewalk.', 'Sam stands in line at the post office with Pirate at their feet.'],
  'rev15-wren-kit': ['A little girl presses her hands against a big airport window.', 'A baby in a stroller looks up at the planes.', 'The girl points at a landing plane while the baby kicks happily.'],
}
for (const [id, prompts] of Object.entries(VISUAIS_R15)) PROD[id] = { falas: porId.get(id)!.texto.split(/(?<=[.!?])\s+/).concat(['', '']).slice(0, 3), prompts }
const emTres = (texto: string) => { const fr = texto.split(/(?<=[.!?])\s+|\n+/).filter(Boolean); const falas = ['', '', '']; fr.forEach((x, i) => { const k = Math.min(2, Math.floor((i * 3) / fr.length)); falas[k] = `${falas[k]} ${x}`.trim() }); return { falas, prompts: falas.slice() } }
/**
 * Rodada 15: o CASTING da folha que a rota roda em todo 15 s (FILME15_ROSTO_FIXO_PUBLIC → gerarFolha → elencoComCastingAjuste, route.ts)
 * — sem rede: a leitura REAL (lerCastingAjuste) de uma resposta do modelo que reescreve TODO personagem listado com faixa, gênero e
 * aparência inventados (o que o gpt-4o-mini fez em 24 de 30 fichas na revisão da rodada 14). A marca CASTREWRITE mostra quem foi reescrito.
 */
const MARCA_CASTING = 'CASTREWRITE'
function castingQueReescreve(script: string, elenco: ReadonlyArray<FichaDePersonagem>): FichaDePersonagem[] {
  if (elenco.length === 0 || elenco.every((e) => (e.origem as string) === 'mitica' || e.origem === 'autor')) return elenco.map((e) => ({ ...e })) // 'fixo' (sem chamada)
  const characters = elenco.map((e) => ({ name: e.nome, description: e.tipo === 'humano'
    ? `a seventy-two-year-old human woman in her early thirties ${MARCA_CASTING} with short grey hair, round glasses, a red cardigan over a white blouse, blue jeans and white sneakers, smiling warmly`
    : `a ${e.nucleo} ${MARCA_CASTING} with glowing green eyes, soft purple fur, a long curled tail and tiny round paws, no clothes, sitting calmly in soft light` }))
  return lerCastingAjuste(JSON.stringify({ characters }), elenco, script)
}
/** route.ts: elencoDoRoteiro → elenco semântico → CASTING (rodada 15) → elencoComFichaLiteral conferida (fichaLiteralConferida) → elencoDoFilme15 → protagonistaEmTodaCena → ajustarPromptsDoElenco → ORDEM → prepararQualidadeDoFilme (com os nomes do semântico) → ficha literal. */
function caminho15(id: string, sem: ElencoSemantico | null) {
  const c = porId.get(id)!
  const { falas, prompts } = PROD[id] ?? emTres(c.texto)
  const base = elencoDoRoteiro(c.texto)
  const aplicado = aplicarElencoSemantico(base, sem, c.texto)
  let pedido: FichaDePersonagem[] = castingQueReescreve(c.texto, aplicado ? aplicado.elenco : base)
  const lit = fichaLiteralConferida(c.texto, pedido, aplicado)
  if (lit.literais.length > 0) pedido = lit.elenco
  const e15 = elencoDoFilme15({ elencoDoPedido: pedido, visuals: prompts, extrair: elencoDoRoteiro, completar: aplicado ? aceitaPapelDasCenas(c.texto) : true })
  const elenco = e15.elenco.length > 0 ? e15.elenco : pedido
  const p15 = e15.elenco.length > 0 ? protagonistaEmTodaCena({ visuals: prompts, elenco: e15.elenco, porNome: !!aplicado, mostraGente: visualMostraAlguem }) : null
  const aj = ajustarPromptsDoElenco({ prompts, visuals: p15 ? p15.visuals : prompts, falas, elenco })
  const out = aj.prompts.slice()
  const pp = elenco.find((f) => f.protagonista) ?? elenco[0]
  if (p15 && pp) for (const i of p15.forcadas) out[i] = ORDEM_DO_PROTAGONISTA(pp.canonica) + out[i]
  const ctx = `${c.texto} ${falas.join(' ')}`
  const q = prepararQualidadeDoFilme({ prompts: out, falas, contextoOriginal: ctx, contextoFiltro: ctx, modo: 'character_story', tagFaceless: false, style: deriveStyleAnchor(c.texto), elenco, aplicarContrato: false, elencoSemantico: aplicado ? { nomes: aplicado.nomes, protagonista: aplicado.protagonista, leitura: aplicado.leitura } : null })
  let fin = q.prompts
  const lit2 = fichaLiteralConferida(c.texto, elenco, aplicado)
  if (lit2.trocas.length > 0) fin = fin.map((p) => trocarFichaNoPrompt(p, lit2.trocas))
  return { aplicado, elenco, forcadas: p15?.forcadas ?? [], fin, relato: q.relato }
}
const clausulas = (p: string) => p.split(MAIN).slice(1).map((s) => s.trim())
const ASSUSTADOR = /\b(?:giant|towering|ogre|troll|monster|horns?|fangs?|claws?|weathered|enormous)\b/i

console.log('== 3. Caminho real do filme de 15 s ==')
{
  const bro = caminho15('prod-bro', gravado('prod-bro'))
  const p = bro.elenco.find((f) => f.protagonista)
  ok(p?.nome === 'BRO' && p.tipo !== 'humano', `BRO é o protagonista e não é gente (${p?.nome} ${p?.tipo}: ${p?.canonica})`)
  ok(!!p && /pigeon/i.test(p.canonica) && !/unicorn/i.test(p.canonica), 'a ficha do BRO diz pombo, nunca unicórnio')
  ok(bro.elenco.every((f) => !/unicorn/i.test(f.nome)), `"unicorn mane" é a peruca: nenhum unicórnio no elenco (${bro.elenco.map((f) => f.nome).join(', ')})`)
  ok(bro.elenco.filter((f) => /pigeon/i.test(f.canonica) || /pigeon/i.test(f.nome)).length === 1, 'um pombo só no elenco (sem "the muscular pigeon" coadjuvante)')
  ok(bro.fin.every((q) => clausulas(q).every((s) => s.startsWith('BRO'))) && !bro.fin.some((q) => /Recurring characters[^.]*pigeon/i.test(q)), 'nenhuma cena traz um segundo pombo')
  ok(bro.fin.every((q) => !/main character \([^)]*unicorn/i.test(q)), 'nenhuma cena diz que o protagonista é o unicórnio')

  const mila = caminho15('prod-mila', gravado('prod-mila'))
  const pm = mila.elenco.find((f) => f.protagonista)
  const sk = mila.elenco.find((f) => /Skocz/.test(f.nome))
  ok(pm?.nome === 'Mila' && pm.tipo === 'humano', `Mila é a protagonista e é gente (${pm?.canonica})`)
  ok(!!pm && /turquoise hair/.test(pm.canonica), 'a ficha da Mila leva as palavras do texto ("turquoise hair")')
  ok(!sk || !ASSUSTADOR.test(sk.canonica), `o Skoczuś não vira gigante/ogro (${sk?.canonica ?? 'fora do elenco'})`)
  ok(mila.fin.every((q) => !clausulas(q).some((s) => ASSUSTADOR.test(s.split(/[;.]/)[0]))), 'nenhuma ficha de cena é de gigante')

  const max = caminho15('prod-max', gravado('prod-max'))
  const px = max.elenco.find((f) => f.protagonista)
  ok(px?.nome === 'Max' && px.tipo === 'humano' && !/puppy/i.test(px.canonica), `Max é o protagonista, gente, e não o filhote (${px?.canonica})`)
  ok(max.fin.every((q) => !/Lena[^.]{0,80}clearly visible/i.test(q)), '"Lena is gone": a Lena não é inserida "clearly visible" em cena nenhuma')
  ok(max.relato.elenco.every((e) => e.nome !== 'Lena' || e.cenas_inseridas.length === 0), 'a camada elencoEpoca não insere a Lena')
  ok(max.fin.some((q) => /puppy/i.test(q)) && max.elenco.filter((f) => f.protagonista).length === 1, 'o filhote continua na cena dele, como coadjuvante')

  for (const [id, nome, humano] of [['banco-roland', 'Roland', true], ['banco-leon', 'Leon', true], ['rev-captain-ahab', 'Ahab', true], ['rev-whiskers-farm', '', true], ['rev-biscuit-kai', '', true], ['rev-025', 'Sarah', true], ['rev-075', 'Whiskers', false], ['rev-oliver-fox', 'Oliver', true]] as const) {
    const r = caminho15(id, gravado(id))
    const pr = r.elenco.find((f) => f.protagonista)
    const nomeOk = nome ? !!pr && pr.nome.includes(nome) : !!pr
    ok(nomeOk && (humano ? (pr!.tipo === 'humano' || (id === 'rev-whiskers-farm' || id === 'rev-biscuit-kai')) : pr!.tipo !== 'humano'), `${id}: protagonista ${pr?.nome} (${pr?.tipo})`)
    ok(r.elenco.every((f) => f.tipo === 'humano' || !/^(?:Tom|Kai|Sarah|Roland|Leon|Ahab|Captain Ahab|Oliver)$/.test(f.nome)), `${id}: nenhuma pessoa vira bicho`)
    ok(r.fin.every((q) => clausulas(q).length <= 2), `${id}: no máximo uma ficha por personagem em cena`)
  }
  const pf = caminho15('rev-025', gravado('rev-025'))
  ok(pf.elenco.every((f) => !/pigeon/i.test(f.canonica)), 'Pigeon Forge não faz da Sarah Collins um pombo em cena nenhuma')
  ok(pf.fin.every((q) => !/Pigeon Forge[^.]{0,40}clearly visible/i.test(q)), 'Pigeon Forge não é inserido como personagem')
}

// ═══ 4. A conferência contra o texto ═══════════════════════════════════════════════════════════════════════════════
console.log('== 4. Conferência da resposta contra o texto (mutantes de resposta) ==')
{
  const T = 'Dino was playing in the park when he found a tiny lost mitten. Dino asked a squirrel.'
  const j = (p: unknown, extra: Record<string, unknown> = {}) => JSON.stringify({ protagonist: p, supporting: [], places_and_orgs: [], ...extra })
  const ser = (o: Record<string, unknown>) => ({ name: null, role: null, kind: 'human', species: 'human', appearance_from_text: '', gender_if_stated: null, age_if_stated: null, ...o })
  ok(lerElencoSemantico(j(ser({ name: 'Rex' })), T) === null, 'M1 nome que o texto não escreve: resposta inteira descartada')
  ok(lerElencoSemantico(j(ser({ name: 'Dino', kind: 'creature', species: 'dinosaur' })), T) === null, 'M2 espécie que o texto não escreve ("dinosaur" para o Dino): descartada (o determinístico cuida)')
  const inventada = lerElencoSemantico(j(ser({ name: 'Dino', appearance_from_text: 'red cape and golden boots', appearance_en: 'red cape and golden boots' })), T)
  const apInventada = inventada ? aplicarElencoSemantico(elencoDoRoteiro(T), inventada, T) : null
  ok(!!inventada?.protagonist && !('appearance_from_text' in inventada.protagonist) && !/red cape|golden boots/.test(JSON.stringify(apInventada)), 'M3 (rodada 8) a aparência do modelo nunca é lida: nem no elenco lido nem na ficha')
  const wolf = lerElencoSemantico(j(ser({ name: 'the old wolf', kind: 'animal', species: 'wolf' })), 'The old wolf falls behind. The wolf howls.')
  ok(wolf?.protagonist?.name === null && wolf?.protagonist?.role === 'old wolf', 'M4 descrição no campo do nome ("the old wolf") vira papel, nunca nome')
  ok(lerElencoSemantico(j(ser({ name: 'Pigeon Forge', kind: 'animal', species: 'pigeon' }), { places_and_orgs: ['Pigeon Forge'] }), 'Sarah drove to Pigeon Forge. Sarah vanished.') === null, 'M5 protagonista que o próprio modelo listou como lugar: descartado')
  ok(lerElencoSemantico(j(ser({ name: 'Sarah', kind: 'giraffe' })), 'Sarah vanished.') === null, 'M6 kind fora do contrato: descartado')
  const sup = lerElencoSemantico(JSON.stringify({ protagonist: ser({ name: 'Kai' }), supporting: [ser({ name: 'Biscuit', kind: 'animal', species: 'wolf' }), ser({ name: 'Biscuit', kind: 'animal', species: 'dog' })], places_and_orgs: [] }), 'Kai and his dog Biscuit walk. Biscuit swims.')
  ok(sup?.supporting.length === 1 && sup.supporting[0].species === 'dog', 'M7 coadjuvante com espécie fora do texto sai; o certo fica')
}

// ═══ 5. Português e espanhol (revisão 01/11: a espécie no idioma do texto entrava no molde em inglês) ═══════════════
console.log('== 5. Português e espanhol: conferência no idioma do texto, ficha em inglês ==')
{
  const fontes = calib.casos.filter((c) => c.fonte === 'pt-es')
  ok(fontes.length >= 20, `${fontes.length} roteiros em português/espanhol na calibração (≥ 20)`)
  let acertosPt = 0
  for (const c of fontes) if (avaliar(c, gravado(c.id)).acerto) acertosPt++
  ok(acertosPt / fontes.length >= 0.9, `PT/ES: acerto ${acertosPt}/${fontes.length} (≥ 90%)`)
  const pt = (id: string) => { const c = porId.get(id)!; return aplicarElencoSemantico(elencoDoRoteiro(c.texto), gravado(id), c.texto) }
  const fichaP = (id: string) => pt(id)?.elenco.find((f) => f.protagonista)
  const thor = fichaP('pt-thor')
  ok(!!thor && thor.tipo === 'animal' && /\bdog\b/.test(thor.canonica) && !/vira-lata (?:with|anatomy)|a vira-lata\b/i.test(thor.canonica), `Thor: a ficha diz cachorro em inglês (${thor?.canonica})`)
  const luna = fichaP('pt-luna')
  ok(!!luna && /\bcat\b/.test(luna.canonica) && !/a gata\b/.test(luna.canonica) && !/in English:/.test(luna.canonica), `Luna: gato em inglês; a aparência traduzida pelo modelo não entra mais (rodada 8) (${luna?.canonica})`)
  const faisca = fichaP('pt-faisca')
  ok(!!faisca && /\bdragon\b/.test(faisca.canonica) && !/dragao|dragão/.test(faisca.canonica.split('"')[0]), `Faísca: dragão em inglês (${faisca?.canonica})`)
  const bro = pt('pt-bro')
  ok(!!bro && bro.elenco[0].nome === 'BRO' && /pigeon/.test(bro.elenco[0].canonica) && bro.elenco.every((f) => !/unic/i.test(f.nome)), `BRO em português: aplicado, pombo, sem unicórnio (${bro?.elenco.map((f) => f.canonica).join(' | ')})`)
  const mila = pt('pt-mila')
  // rodada 9: o texto não diz o que a Mila é (nem papel nem idade) e o determinístico não a tem → o elenco de sempre (null), sem ficha inventada
  ok(gravado('pt-mila')?.protagonist?.kind === 'human' && (!mila || mila.elenco[0].nome === 'Mila' && mila.elenco[0].tipo === 'humano') && (mila?.elenco ?? []).every((f) => !/flower|flor|giant/i.test(f.canonica.split('"')[0])), `Mila em português: gente; o Skoczuś não vira a "flor gigante" da outra frase (${mila?.elenco.map((f) => f.nome).join(', ')})`)
  ok(!mila || !/\ba woman\b|an adult|thirties/.test(mila.elenco[0].canonica), `Mila sem idade no texto: nenhuma ficha de adulto inventada (${mila?.elenco[0].canonica ?? 'determinístico'})`)
  const ana = pt('pt-ana-avo')
  ok(!!ana && ana.elenco[0].nome === 'Ana' && ana.elenco.some((f) => f.nome === 'the grandfather' && f.nucleo === 'grandfather'), `Ana: o avô entra pelo papel em inglês, que casa com os visuais (${ana?.elenco.map((f) => `${f.nome}/${f.nucleo}`).join(', ')})`)
  const sofia = fichaP('es-sofia')
  ok(!sofia || (sofia.tipo === 'humano' && !/sixteen|thirties/.test(sofia.canonica) && !/age as the author wrote/.test(sofia.canonica)), `Sofía (diecinueve años): nenhuma idade inventada — sem papel no texto e fora do determinístico, o elenco de sempre (rodada 9) (${sofia?.canonica ?? 'determinístico'})`)
  const lucas = pt('pt-lucas-leao')
  ok(!!lucas && lucas.elenco[0].nome === 'Lucas' && lucas.elenco[0].tipo === 'humano' && lucas.elenco.some((f) => f.nome === 'Simba' && /\blion\b/.test(f.canonica)), `Lucas é gente; Simba é o leão (${lucas?.elenco.map((f) => `${f.nome}/${f.tipo}`).join(', ')})`)
  // mutante: o modelo traduz o campo original num texto em português e o inglês também não está no texto → descartado (o determinístico cuida)
  const PT = 'BRO, o pombo musculoso, entra numa loja de perucas.'
  const j = (o: Record<string, unknown>) => JSON.stringify({ protagonist: { name: 'BRO', role: null, kind: 'animal', species: 'pigeon', species_en: 'pigeon', appearance_from_text: '', gender_if_stated: null, age_if_stated: null, ...o }, supporting: [], places_and_orgs: [] })
  ok(lerElencoSemantico(j({}), PT) === null, 'espécie traduzida que o texto não escreve: descartada')
  ok(lerElencoSemantico(j({ species: 'pombo', species_en: 'pigeon' }), PT)?.protagonist?.species === 'pigeon', 'espécie original no texto + inglês: a ficha usa o inglês')
  ok(lerElencoSemantico(j({ species: 'pombo', species_en: 'pigeon!!<x>' }), PT)?.protagonist?.species === 'pombo', 'inglês fora do formato (≤ 4 palavras, só letras): fica a palavra original')
  // texto em inglês e o modelo pôs o campo original em português ("gata"): vale o inglês que o texto escreve
  const EN = 'Meet Biscuit, a grumpy orange cat. Biscuit demands tuna.'
  ok(lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Biscuit', kind: 'animal', species: 'gata', species_en: 'cat', appearance_from_text: '' }, supporting: [], places_and_orgs: [] }), EN)?.protagonist?.species === 'cat', 'texto em inglês com o campo original traduzido: ancora no inglês do texto')
}

// ═══ 6. A ficha literal do juiz não apaga a ficha semântica com lixo ═══════════════════════════════════════════════
console.log('== 6. Ficha literal conferida: "night Pip", "morning Toast", "and Emma" não entram ==')
{
  const pip = caminho15('fa-pip', gravado('fa-pip'))
  const pp = pip.elenco.find((f) => f.protagonista)
  ok(!!pp && pp.nome === 'Pip' && /hedgehog/.test(pp.canonica) && !/"night Pip"/.test(pp.canonica), `Pip continua ouriço (${pp?.canonica})`)
  ok(pip.fin.every((q) => !/night Pip"/.test(q)), 'nenhuma cena leva "night Pip"')
  const toast = caminho15('fa-toast', gravado('fa-toast'))
  const pt = toast.elenco.find((f) => f.protagonista)
  ok(!!pt && pt.nome === 'Toast' && /toast/.test(pt.canonica.replace(/^Toast/, '')) && !/morning Toast/.test(pt.canonica), `Toast continua o pão que age (${pt?.canonica})`)
  ok(toast.fin.every((q) => !/morning Toast"/.test(q)), 'nenhuma cena leva "morning Toast"')
  // o Toast da revisão ("One morning Toast…"): sem aparência, a ficha semântica é determinística; o mutante (juiz puro) a troca
  const TOAST = 'One morning Toast jumped out of the toaster. Toast ran across the kitchen. Toast hid behind the kettle.'
  const apT = aplicarElencoSemantico(elencoDoRoteiro(TOAST), lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Toast', role: null, kind: 'object', species: 'toast', species_en: 'toast', appearance_from_text: '', gender_if_stated: null, age_if_stated: null }, supporting: [], places_and_orgs: [] }), TOAST), TOAST)!
  const mutT = elencoComFichaLiteral(TOAST, apT.elenco).elenco[0].canonica
  const confT = fichaLiteralConferida(TOAST, apT.elenco, apT).elenco[0].canonica
  ok(mutT !== apT.elenco[0].canonica ? confT === apT.elenco[0].canonica : confT === mutT, `"One morning Toast": a conferida mantém o pão que age (juiz puro: ${JSON.stringify(mutT.slice(0, 70))})`)
  // o caso da revisão: ouriço SEM aparência no texto (a ficha é determinística, alvo da ficha literal). O mutante (juiz sem a conferência)
  // prova que o defeito existe: ele troca a ficha por "night Pip"; a conferida mantém o ouriço.
  const PIP = 'One night Pip, a hedgehog, wandered out of the garden. Pip followed the smell of apples. An owl watched Pip from a branch. Pip curled into a ball.'
  const semPip = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Pip', role: null, kind: 'animal', species: 'hedgehog', species_en: 'hedgehog', appearance_from_text: '', appearance_en: '', gender_if_stated: null, age_if_stated: null, age_evidence: '', on_screen: true }, supporting: [], places_and_orgs: [] }), PIP)
  const apPip = aplicarElencoSemantico(elencoDoRoteiro(PIP), semPip, PIP)!
  ok(apPip.elenco[0].origem !== 'autor' && /hedgehog/.test(apPip.elenco[0].canonica), `Pip sem aparência: ficha semântica determinística de ouriço (${apPip.elenco[0].canonica.slice(0, 80)}…)`)
  const mutante = elencoComFichaLiteral(PIP, apPip.elenco)
  ok(/"night Pip"/.test(mutante.elenco[0].canonica), `mutante (juiz puro): a ficha vira ${JSON.stringify(mutante.elenco[0].canonica)}`)
  const conferida = fichaLiteralConferida(PIP, apPip.elenco, apPip)
  ok(conferida.elenco[0].canonica === apPip.elenco[0].canonica && conferida.trocas.length === 0, 'conferida: o ouriço fica e nenhum prompt é trocado')
  const q = prepararQualidadeDoFilme({ prompts: ['Pip walks out of the garden at night.', 'Pip sniffs apples.', 'Pip curls into a ball under an owl.'], falas: PIP.split(/(?<=\.)\s+/).slice(0, 3), contextoOriginal: PIP, contextoFiltro: PIP, modo: 'character_story', tagFaceless: false, style: deriveStyleAnchor(PIP), elenco: apPip.elenco, aplicarContrato: false, elencoSemantico: { nomes: apPip.nomes, protagonista: apPip.protagonista, leitura: apPip.leitura } })
  ok(q.prompts.every((p) => !/night Pip"/.test(p)) && q.prompts.some((p) => /hedgehog/.test(p)), 'a camada filmQuality (que também chama o juiz) não reintroduz "night Pip"')
  const hope = caminho15('fa-hope', gravado('fa-hope'))
  const ph = hope.elenco.find((f) => f.protagonista)
  ok(!!ph && ph.nome === 'Hope' && ph.tipo === 'humano' && /\b(?:girl|child)\b/.test(ph.canonica), `Hope (rodada 8): gente e criança; sem aparência do modelo, a ficha é a do caminho determinístico (${ph?.canonica})`)
  // unidade: o literal com palavra da leitura entra; sem nenhuma, a ficha de antes fica; sem elenco semântico = o juiz puro
  const ficha = (nome: string, canonica: string): FichaDePersonagem => ({ nome, nucleo: nome, tipo: 'humano', canonica, origem: 'deterministica', protagonista: false, genero: null })
  const antes = [ficha('Emma', 'Emma, a woman in their early thirties with short hair')]
  const lixo = { elenco: [{ ...antes[0], canonica: 'Emma, exactly as the author wrote: "and Emma"', origem: 'autor' as const }], literais: ['Emma'], trocas: [[antes[0].canonica, 'Emma, exactly as the author wrote: "and Emma"'] as [string, string]], natureza: null }
  const leitura = [{ nome: 'Emma', nomeProprio: true, aceita: ['tall', 'nurse', 'scrubs'] }]
  const r1 = conferirFichaLiteral(lixo, antes, { leitura })
  ok(r1.elenco[0].canonica === antes[0].canonica && r1.literais.length === 0 && r1.trocas.length === 0, '"and Emma": a ficha de antes fica, sem troca nos prompts')
  const bom = { ...lixo, elenco: [{ ...lixo.elenco[0], canonica: 'Emma, exactly as the author wrote: "a tall nurse in scrubs"' }], trocas: [[antes[0].canonica, 'Emma, exactly as the author wrote: "a tall nurse in scrubs"'] as [string, string]] }
  ok(conferirFichaLiteral(bom, antes, { leitura }).elenco[0].canonica.includes('tall nurse'), 'literal com palavras da leitura ("tall nurse in scrubs"): entra')
  ok(conferirFichaLiteral(lixo, antes, null) === lixo, 'sem elenco semântico: exatamente o resultado do juiz')
  const mitica = [{ ...antes[0], nome: 'Krishna', origem: 'mitica' as unknown as FichaDePersonagem['origem'] }]
  ok(conferirFichaLiteral({ ...lixo, elenco: [{ ...lixo.elenco[0], nome: 'Krishna' }] }, mitica, { leitura: [{ nome: 'Krishna', nomeProprio: true, aceita: [] }] }).elenco[0].canonica.includes('and Emma'), 'figura mítica: o juiz decide como sempre')
}

// ═══ 7. O 15 s completa pelos visuais só com gente que o texto não escreve ═════════════════════════════════════════
console.log('== 7. Completar pelos visuais com o elenco semântico ==')
{
  const fai = porId.get('pt-faisca')!
  const ap = aplicarElencoSemantico(elencoDoRoteiro(fai.texto), gravado('pt-faisca'), fai.texto)!
  ok(ap.elenco.length === 1, `Faísca: o elenco semântico tem só o dragão (${ap.elenco.map((f) => f.nome).join(', ')})`)
  const visuais = ['Faísca the small dragon tries to breathe fire while a young girl laughs nearby.', 'A young girl and Faísca walk through the frozen village.', 'Faísca melts the ice as a giant unicorn statue glows.']
  const e = elencoDoFilme15({ elencoDoPedido: ap.elenco, visuals: visuais, extrair: elencoDoRoteiro, completar: aceitaPapelDasCenas(fai.texto) })
  ok(e.elenco[0].nome === 'Faísca' && e.elenco.some((f) => /girl/.test(f.nucleo)), `gente dos visuais que o texto (PT) não escreve entra: ${e.elenco.map((f) => f.nome).join(', ')}`)
  ok(e.elenco.every((f) => !/unicorn/.test(f.nome + f.nucleo)), 'bicho/criatura dos visuais fora do texto não entra')
  const bro = porId.get('pt-bro')!
  const apb = aplicarElencoSemantico(elencoDoRoteiro(bro.texto), gravado('pt-bro'), bro.texto)!
  const vb = ['BRO the muscular pigeon strides into a lavish wig shop.', 'A bright pink unicorn mane wig hangs on a display.', 'BRO dons the bright pink unicorn mane in front of a mirror.']
  const eb = elencoDoFilme15({ elencoDoPedido: apb.elenco, visuals: vb, extrair: elencoDoRoteiro, completar: aceitaPapelDasCenas(bro.texto) })
  ok(eb.elenco.length === 1 && eb.elenco[0].nome === 'BRO', `BRO em português: a "unicorn mane" dos visuais não vira coadjuvante (${eb.elenco.map((f) => f.nome).join(', ')})`)
  const en = porId.get('prod-bro')!
  ok(aceitaPapelDasCenas(en.texto)({ tipo: 'humano' }, 'pigeon') === false, 'palavra que o texto escreve e a leitura não chamou de personagem: não entra')
}

// ═══ 8. Revisão de 01/11 (rodada 6): os 3 defeitos e os menores ═══════════════════════════════════════════════════
console.log('== 8. Rodada 6: aparência por palavra inteira, nome inteiro, falha segura byte a byte, campos _en, espécie no nome ==')
{
  const j = (p: Record<string, unknown>, extra: Record<string, unknown> = {}) => JSON.stringify({ protagonist: { name: null, role: null, kind: 'human', species: 'human', appearance_from_text: '', gender_if_stated: null, age_if_stated: null, ...p }, supporting: [], places_and_orgs: [], ...extra })
  // (1) aparência — rodada 8: o modelo não fornece mais aparência nenhuma; a roupa inventada não chega à ficha
  const LEO = 'Leo was tired, but that night he walked to the harbor anyway. Leo was scared of the dark water.'
  const apLeo = aplicarElencoSemantico(elencoDoRoteiro(LEO), lerElencoSemantico(j({ name: 'Leo', appearance_from_text: 'red hat' }), LEO), LEO)
  ok(!!apLeo && apLeo.elenco[0].origem !== 'autor' && !/red hat/.test(apLeo.elenco[0].canonica), `D1 a roupa inventada não vira ficha do autor (${apLeo?.elenco[0].canonica.slice(0, 70)}…)`)

  // (2) mesmoPersonagem: nome inteiro; sobrenome só quando o primeiro nome bate ou não existe
  ok(!mesmoPersonagem('Emma Collins', 'Jack Collins'), 'D2 "Emma Collins" ≠ "Jack Collins" (sobrenome em comum)')
  ok(!mesmoPersonagem('Captain Ahab', 'Captain Nemo'), 'D2 "Captain Ahab" ≠ "Captain Nemo" (título em comum)')
  ok(!mesmoPersonagem('Old Tom', 'Old Mary') && !mesmoPersonagem('Emma Collins', 'Emma Stone'), 'D2 "Old Tom" ≠ "Old Mary"; "Emma Collins" ≠ "Emma Stone"')
  ok(mesmoPersonagem('Captain Ahab', 'Ahab') && mesmoPersonagem('Roland', 'Roland Pernicus Oznard') && mesmoPersonagem('Roland Oznard', 'Roland Pernicus Oznard') && mesmoPersonagem('Collins', 'Emma Collins') && mesmoPersonagem('Rocío', 'rocio'), 'D2 "Ahab" = "Captain Ahab"; "Roland" = "Roland Pernicus Oznard"; "Collins" sozinho = "Emma Collins"; acento/caixa não importam')
  const COL = porId.get('rev-collins') ?? { texto: 'Emma Collins walks into the empty house. Her husband Jack Collins vanished in 1999. Emma finds his watch under the floorboards.' }
  const colPrompts = ['Emma Collins walks into an empty house at dusk.', 'A faded wedding photo on the wall.', 'Emma kneels and finds a watch under the floorboards.']
  const colFalas = ['Emma Collins walks into the empty house.', 'Her husband Jack Collins vanished in 1999.', 'Emma finds his watch under the floorboards.']
  const rc = aplicarElencoEEpoca({ prompts: colPrompts, falas: colFalas, contextoOriginal: COL.texto, contextoFiltro: COL.texto, modo: 'character_story', tagFaceless: false, elencoSemantico: { nomes: ['Emma Collins'], protagonista: 'Emma Collins' } })
  ok(rc.prompts.every((q) => !/Jack Collins[^.]{0,120}clearly visible/i.test(q)) && rc.relato.elenco.every((e) => !/Jack/.test(e.nome) || e.cenas_inseridas.length === 0), `D2 o Jack Collins ausente não entra em cena (${rc.relato.elenco.map((e) => `${e.nome}:${e.cenas_inseridas.join(',') || '-'}`).join(' ')})`)
  ok(rc.relato.elenco.filter((e) => e.protagonista).every((e) => /Emma/.test(e.nome)), `D2 só a Emma é protagonista (${rc.relato.elenco.filter((e) => e.protagonista).map((e) => e.nome).join(', ') || 'nenhum'})`)
  const AHAB = 'Captain Ahab hunts the white whale. Captain Nemo watches from his submarine. Ahab never rests.'
  const ra = aplicarElencoEEpoca({ prompts: ['Captain Ahab on the deck.', 'A submarine under the waves.', 'Ahab at the wheel in the storm.'], falas: AHAB.split(/(?<=\.)\s+/), contextoOriginal: AHAB, contextoFiltro: AHAB, modo: 'character_story', tagFaceless: false, elencoSemantico: { nomes: ['Captain Ahab'], protagonista: 'Captain Ahab' } })
  ok(ra.relato.elenco.every((e) => !/Nemo/.test(e.nome) || (!e.protagonista && e.cenas_inseridas.length === 0)), `D2 "Captain Nemo" não herda o lugar do "Captain Ahab" (${ra.relato.elenco.map((e) => `${e.nome}${e.protagonista ? '/P' : ''}`).join(' ')})`)

  // (3) sem elenco semântico: o 15 s é byte a byte a base (2359bf434) — diferencial contra o código da base
  const baseSrc = execFileSync('git', ['show', '2359bf434:lib/filmes/filme15Elenco.ts'], { cwd: raiz, encoding: 'utf8', maxBuffer: 16 << 20 })
  const tmp = path.join(os.tmpdir(), `filme15Elenco-base-${process.pid}.ts`)
  fs.writeFileSync(tmp, baseSrc)
  const BASE = (await import(pathToFileURL(tmp).href)) as typeof import('../lib/filmes/filme15Elenco')
  fs.rmSync(tmp, { force: true })
  const ficha = (nome: string, nucleo: string, protagonista = true): FichaDePersonagem => ({ nome, nucleo, tipo: 'humano', canonica: `${nome}, a person`, origem: 'deterministica', protagonista, genero: null })
  const elencos: FichaDePersonagem[][] = [[ficha('Old Tom', 'Tom')], [ficha('Captain Ahab', 'Ahab')], [ficha('Emma Collins', 'Collins'), ficha('the young girl', 'girl', false)], [ficha('BRO', 'pigeon')], [ficha('the tired young man', 'man')]]
  const visuaisDif = ['An old woman by the window, morning light.', 'The ship captain shouts at the crew.', 'Ahab stands at the wheel.', 'BRO dons a pink wig.', 'Jack Collins opens the door.', 'Collins opens the door.', 'A woman by an open window.', 'The young man by the window.', 'A stormy sea at night.', 'Tom fixes the radio.', 'uma menina e o avô no jardim', '']
  let iguais = 0, total = 0
  for (const el of elencos) {
    total++
    const a = protagonistaEmTodaCena({ visuals: visuaisDif, elenco: el })
    const b = BASE.protagonistaEmTodaCena({ visuals: visuaisDif, elenco: el })
    if (JSON.stringify(a) === JSON.stringify(b)) iguais++
    for (const v of visuaisDif) { total++; if (cenaCitaElenco(v, el) === BASE.cenaCitaElenco(v, el)) iguais++ }
  }
  ok(iguais === total, `D3 sem elenco semântico: protagonistaEmTodaCena e cenaCitaElenco idênticos à base em ${iguais}/${total} casos`)
  ok(protagonistaEmTodaCena({ visuals: ['An old woman by the window.'], elenco: [ficha('Old Tom', 'Tom')] }).forcadas.length === 1, 'D3 base: "Old Tom" × "an old woman by the window" → a cena é forçada (o casador de sempre)')
  ok(protagonistaEmTodaCena({ visuals: ['The ship captain shouts.'], elenco: [ficha('Captain Ahab', 'Ahab')] }).forcadas.length === 1, 'D3 base: "Captain Ahab" × "the ship captain" → a cena é forçada')
  ok(fs.readFileSync(path.join(raiz, 'lib/filmes/filme15Elenco.ts'), 'utf8').replace(/\r\n/g, '\n').includes('export function cenaCitaElenco(visual: string, elenco: ReadonlyArray<FichaDePersonagem>): boolean {\n  return elenco.some((f) => citaPalavra(visual, nucleoDe(f)))\n}'), 'D3 cenaCitaElenco voltou ao texto exato da base')
  // com o elenco semântico (porNome): o nome próprio cita; título/adjetivo/sobrenome alheio, não
  const comNome = (v: string, el: FichaDePersonagem[]) => protagonistaEmTodaCena({ visuals: [v], elenco: el, porNome: true }).forcadas.length === 0
  ok(comNome('BRO dons a pink wig.', [ficha('BRO', 'pigeon')]) && comNome('Ahab stands at the wheel.', [ficha('Captain Ahab', 'Ahab')]) && comNome("Emma Collins's hands tremble.", [ficha('Emma Collins', 'Emma')]), 'D3 porNome: "BRO dons…", "Ahab stands…", "Emma Collins\'s hands" citam o elenco')
  ok(!comNome('An old woman by the window.', [ficha('Old Tom', 'Tom')]) && !comNome('The ship captain shouts.', [ficha('Captain Ahab', 'Ahab')]) && !comNome('Captain Nemo waves.', [ficha('Captain Ahab', 'Ahab')]), 'D3 porNome: "an old woman", "the ship captain", "Captain Nemo" não citam "Old Tom"/"Captain Ahab"')
  // rodada 7: "Collins" sozinho no COMEÇO da frase ficou ambíguo (maiúscula de abertura) → forçado, como a base; no meio da frase cita
  ok(!comNome('Jack Collins opens the door.', [ficha('Emma Collins', 'Emma')]) && comNome('At dawn, Collins opens the door.', [ficha('Emma Collins', 'Emma')]) && !comNome('He drives at max speed.', [ficha('Max', 'boy')]), 'D3 porNome: "Jack Collins" não cita a Emma; "Collins" sozinho no meio da frase cita; "max speed" (minúscula) não cita o Max')
  const rotaSrc = fs.readFileSync(path.join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
  ok(rotaSrc.includes('protagonistaEmTodaCena({ visuals: visuaisDoPlano15, elenco: elencoFilme15.elenco, porNome: !!elencoSemantico'), 'D3 a rota só liga o casador por nome com o elenco semântico aplicado')

  // (5) campos _en num texto em inglês
  const BROEN = 'BRO the muscular pigeon is back, and still bald. BRO marches into a wig shop.'
  // rodada 8 (sem detector de língua): appearance_en nunca entra; species_en que o texto TAMBÉM escreve como outro ser não é tradução
  const comAparencia = lerElencoSemantico(j({ name: 'BRO', kind: 'animal', species: 'pigeon', species_en: 'pigeon', appearance_from_text: 'muscular, bald', appearance_en: 'blonde hair, red dress, carrying a rifle' }), BROEN)
  const apAparencia = aplicarElencoSemantico(elencoDoRoteiro(BROEN), comAparencia, BROEN)
  ok(!!apAparencia && /pigeon/.test(apAparencia.elenco[0].canonica) && !/blonde|rifle|red dress/i.test(apAparencia.elenco[0].canonica), `M5 appearance_en inventado não entra na ficha (${apAparencia?.elenco[0].canonica})`)
  const AGUIA = 'BRO the pigeon fights an eagle on the roof. BRO wins.'
  ok(lerElencoSemantico(j({ name: 'BRO', kind: 'animal', species: 'pigeon', species_en: 'eagle' }), AGUIA)?.protagonist?.species === 'pigeon', 'M5 species_en que o texto escreve como OUTRO ser ("an eagle") não traduz "pigeon"')
  const nurse = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Kai', kind: 'human', species: 'human' }, supporting: [{ name: null, role: 'velho pescador', role_en: 'old fisherman', kind: 'human', species: 'pescador', species_en: 'fisherman' }], places_and_orgs: [] }), 'Kai acorda no barco. O velho pescador traz água. Kai agradece ao velho pescador.')
  ok(nurse?.supporting[0]?.role === 'old fisherman', `M5 papel original no texto: o role_en o traduz ("velho pescador" → ${nurse?.supporting[0]?.role})`)
  ok(lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Kai', kind: 'human', species: 'human' }, supporting: [{ name: null, role: 'young doctor', role_en: 'young doctor', kind: 'human', species: 'doctor' }], places_and_orgs: [] }), 'Kai wakes in the ward. The old nurse brings him water.')?.supporting.length === 0, 'M5 papel que o texto não escreve (nem o original nem o inglês): fora')
  ok(lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Thor', kind: 'animal', species: 'cachorro', species_en: 'dog', appearance_from_text: 'caramelo', appearance_en: 'caramel-colored' }, supporting: [], places_and_orgs: [] }), porId.get('pt-thor')!.texto)?.protagonist?.species === 'dog', 'M5 texto em português: species_en continua traduzindo ("cachorro" → "dog")')

  // (6) espécie dentro do próprio nome ou de um lugar listado
  ok(lerElencoSemantico(j({ name: 'Duck', kind: 'animal', species: 'duck' }), 'Meet Duck, a retired boxer. Duck trains kids in an old gym.') === null, 'M6 "Meet Duck, a retired boxer": a espécie só no nome não faz dele um pato (descartado → determinístico)')
  ok(lerElencoSemantico(j({ name: 'Duck', kind: 'animal', species: 'duck' }), 'Duck the duck waddles to the pond. Duck quacks.')?.protagonist?.species === 'duck', 'M6 "Duck the duck": a espécie escrita fora do nome continua valendo')
  ok(lerElencoSemantico(j({ name: 'Cara', kind: 'animal', species: 'bear' }, { places_and_orgs: ['Bear Lake'] }), 'Cara grew up in Bear Lake. Cara left at nineteen.') === null, 'M6 "Cara grew up in Bear Lake": a espécie só no lugar listado não faz dela um urso')

  // menor: teto total de tempo (as 2 tentativas juntas)
  let chamadas = 0
  const t0 = Date.now()
  const lento = await pedirElencoSemantico(LEO, { apiKey: 'k', timeoutMs: 150, orcamentoMs: 200, fetchImpl: (_u, init) => { chamadas++; return new Promise((_res, rej) => { (init as RequestInit).signal?.addEventListener('abort', () => rej(new Error('abort'))) }) } })
  ok(lento.elenco === null && chamadas === 1 && Date.now() - t0 < 600, `teto total: a 1ª tentativa estourou o prazo e não sobra tempo útil → sem 2ª chamada (${chamadas} chamada, ${Date.now() - t0} ms)`)
  ok(ELENCO_SEMANTICO_ORCAMENTO_MS === 6_000 && ELENCO_SEMANTICO_USD === 0.0005, 'teto padrão 6 s (era ~8 s no pior caso) e custo de log US$ 0,0005')

  // casos novos (PT/ES fora da amostra do prompt + defeitos da revisão) com respostas MOCKADAS — não é medição: a API estava sem crédito
  const mocks = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-mocks.json'), 'utf8')) as { respostas: Record<string, string> }
  const casos = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-casos.json'), 'utf8')) as Caso[]
  const novos = casos.filter((c) => c.id in mocks.respostas)
  ok(novos.length === Object.keys(mocks.respostas).length && novos.filter((c) => c.fonte === 'pt-es-fora').length >= 8, `${novos.length} casos novos no arquivo de casos (o calibrador os mede quando houver crédito), ${novos.filter((c) => c.fonte === 'pt-es-fora').length} PT/ES fora da amostra`)
  const PROMPT_PARES = ['negra de olhos verdes', 'vira-lata', 'pombo', 'gata', 'dragão', 'de oito anos', 'Imagina', 'Imagínate', 'velho pescador', 'brócolis']
  ok(novos.filter((c) => c.fonte === 'pt-es-fora').every((c) => PROMPT_PARES.every((p) => !c.texto.includes(p))), 'os PT/ES novos não usam nenhum par que o prompt ensina (fora da amostra de verdade)')
  // rodada 8: a chave voltou a ter crédito — os casos que só tinham mock agora têm resposta REAL gravada; a régua é a resposta real
  const reais = novos.map((c) => ({ c, r: porId.get(c.id) }))
  ok(reais.every(({ r }) => !!r && typeof r.resposta.raw === 'string'), `os ${novos.length} casos antes só mockados têm resposta real na calibração (${reais.filter(({ r }) => !r?.resposta.raw).map(({ c }) => c.id).join(', ') || 'todos'})`)
  const notas = novos.map((c) => ({ c, n: avaliar(c, gravado(c.id)) }))
  ok(notas.every(({ n }) => n.graves.length === 0), `ex-mocks, resposta real: 0 erro grave (${notas.filter(({ n }) => n.graves.length).map(({ c, n }) => `${c.id}:${n.graves.join(',')}`).join(' | ') || 'nenhum'})`)
  const lince = casos.find((c) => c.id === 'es-fora-lince')!
  const apLince = aplicarElencoSemantico(elencoDoRoteiro(lince.texto), gravado('es-fora-lince'), lince.texto)
  ok(!apLince || (apLince.elenco[0].tipo === 'humano' && !/lynx/i.test(apLince.elenco[0].canonica)), `real es-fora-lince: o menino chamado Lince é gente (${apLince?.elenco[0].canonica.slice(0, 60) ?? 'determinístico'}…)`)
  const flecha = casos.find((c) => c.id === 'pt-fora-flecha')!
  const apFlecha = aplicarElencoSemantico(elencoDoRoteiro(flecha.texto), gravado('pt-fora-flecha'), flecha.texto)
  // rodada 9: a troca de protagonista por contagem de frases saiu (invertia Lily/Oreo, Emma/Liam, Jack/Will). Aqui Flecha e Seu Jorge são
  // leitura defensável; o que não pode é o Seu Jorge virar tartaruga ou a Flecha virar gente
  ok(!apFlecha || apFlecha.elenco.every((f) => (f.nome === 'Flecha') === (f.tipo === 'animal') && (f.nome !== 'Flecha' || (/\bturtle\b/.test(f.canonica) && !/tartaruga (?:with|anatomy)|a tartaruga\b/.test(f.canonica)))), `real pt-fora-flecha: a Flecha é tartaruga (turtle em inglês) e o Seu Jorge é gente (${apFlecha?.elenco.map((f) => `${f.nome}/${f.tipo}`).join(', ') ?? 'determinístico'})`)
}

// ═══ 9. Revisão de 01/11 (rodada 7): aparência sem palavra inventada, trava _en em roteiro curto, nome no começo da frase ═══
console.log('== 9. Rodada 7 (o que segue valendo na rodada 8): aparência inventada fora da ficha, roteiro curto, nome no começo da frase ==')
{
  const j = (p: Record<string, unknown>, extra: Record<string, unknown> = {}) => JSON.stringify({ protagonist: { name: null, role: null, kind: 'human', species: 'human', appearance_from_text: '', gender_if_stated: null, age_if_stated: null, ...p }, supporting: [], places_and_orgs: [], ...extra })
  // (1) rodada 8: a aparência do modelo não é mais lida — as recombinações da rodada 7 ("blue eyes", "a BLUE dress") nem chegam à ficha
  const NORA = 'Nora wore a blue dress, and her eyes were green. Nora waited.'
  const apNora = aplicarElencoSemantico(elencoDoRoteiro(NORA), lerElencoSemantico(j({ name: 'Nora', appearance_from_text: 'blue eyes', appearance_en: 'blue eyes' }), NORA), NORA)
  ok(!!apNora && !/blue eyes/.test(apNora.elenco[0].canonica), `R7-1 a recombinação "blue eyes" não vira ficha (${apNora?.elenco[0].canonica.slice(0, 70)}…)`)
  const LILA = 'Lila, with long red hair and a dress, walks to school. Lila smiles.'
  const apLila = aplicarElencoSemantico(elencoDoRoteiro(LILA), lerElencoSemantico(j({ name: 'Lila', appearance_from_text: 'long red hair and a blue dress' }), LILA), LILA)
  ok(!!apLila && !/blue dress/.test(apLila.elenco[0].canonica), `R7-1 a cor inventada ("a BLUE dress") não vira ficha (${apLila?.elenco[0].canonica.slice(0, 70)}…)`)

  // (2) roteiro curto: as respostas REAIS (rodada 8, API com crédito) dos roteiros que a revisão usou
  const casos = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-casos.json'), 'utf8')) as Caso[]
  ok(gravado('rev-002')?.protagonist?.species === 'cat' || gravado('rev-002') === null, `R7-2 rev-002 (Biscuit), resposta real: gato (${gravado('rev-002')?.protagonist?.species ?? 'determinístico'})`)
  ok(gravado('rev-081')?.protagonist?.species === 'cat', `R7-2 rev-081 (Tom the cat), resposta real: gato (${gravado('rev-081')?.protagonist?.species})`)
  ok(gravado('rev8-bro-sol')?.protagonist?.species === 'pigeon', `R7-2 "BRO, a muscular pigeon, lifts weights as the sun rises", resposta real: pombo (${gravado('rev8-bro-sol')?.protagonist?.species})`)
  ok(lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Bob', kind: 'animal', species: 'pombo', species_en: 'pigeon' }, supporting: [], places_and_orgs: [] }), 'Bob, um pombo musculoso, levanta pesos o dia todo.')?.protagonist?.species === 'pigeon', 'R7-2 frase curta em português continua traduzindo ("pombo" → "pigeon")')
  ok(lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Lía', kind: 'animal', species: 'gaviota', species_en: 'seagull' }, supporting: [], places_and_orgs: [] }), 'Lía, gaviota valiente, vuela hacia ríos lejanos.')?.protagonist?.species === 'seagull', 'R7-2 frase curta em espanhol: "gaviota" → "seagull"')

  // (3) nome no começo da frase com maiúscula de abertura (núcleo da ficha = espécie)
  const fichaBicho = (nome: string, nucleo: string): FichaDePersonagem => ({ nome, nucleo, tipo: 'animal', canonica: `${nome}, a ${nucleo}`, origem: 'deterministica', protagonista: true, genero: null })
  const SUNNY = [fichaBicho('Sunny', 'retriever')]
  const p15 = (v: string, el: FichaDePersonagem[]) => protagonistaEmTodaCena({ visuals: [v], elenco: el, porNome: true }).forcadas.length === 1
  ok(p15('Sunny morning light floods an empty kitchen.', SUNNY), 'R7-3 "Sunny morning light floods an empty kitchen": a cena é forçada com o protagonista (como a base)')
  ok(p15('Misty hills at dawn.', [fichaBicho('Misty', 'cat')]) && p15('Rocky cliffs over the sea.', [fichaBicho('Rocky', 'dog')]) && p15('A wide shot. Shadow falls across the yard.', [fichaBicho('Shadow', 'cat')]), 'R7-3 "Misty hills", "Rocky cliffs", "…. Shadow falls" (abertura de frase): forçadas')
  ok(!p15('Sunny, the golden retriever, chases a ball.', SUNNY) && !p15("Sunny's tail wags by the door.", SUNNY) && !p15('Sunny the retriever sleeps.', SUNNY) && !p15('In the park, Sunny chases a ball.', SUNNY), 'R7-3 o nome sem dúvida cita: vírgula, possessivo, aposto, ou no meio da frase')
  ok(!p15('BRO dons a pink wig.', [fichaBicho('BRO', 'pigeon')]), 'R7-3 nome em maiúsculas ("BRO") no começo da frase continua citando')
  // o que a base fazia nestas cenas é o mesmo: forçada
  const baseSrc = execFileSync('git', ['show', '2359bf434:lib/filmes/filme15Elenco.ts'], { cwd: raiz, encoding: 'utf8', maxBuffer: 16 << 20 })
  const tmp = path.join(os.tmpdir(), `filme15Elenco-base7-${process.pid}.ts`)
  fs.writeFileSync(tmp, baseSrc)
  const BASE = (await import(pathToFileURL(tmp).href)) as typeof import('../lib/filmes/filme15Elenco')
  fs.rmSync(tmp, { force: true })
  ok(BASE.protagonistaEmTodaCena({ visuals: ['Sunny morning light floods an empty kitchen.'], elenco: SUNNY }).forcadas.length === 1, 'R7-3 a base forçava a cena "Sunny morning…" — agora com o elenco semântico também')

  // os 9 casos da rodada 7 (rev-0111c): rodada 8 — agora com resposta REAL da API
  const r7 = casos.filter((c) => c.fonte === 'rev-0111c')
  const notas7 = r7.map((c) => avaliar(c, gravado(c.id)))
  ok(r7.length === 9 && r7.every((c) => !!porId.get(c.id)?.resposta.raw) && notas7.every((n) => n.graves.length === 0), `R7 os 9 casos rev-0111c medidos na API: 0 grave, ${notas7.filter((n) => n.acerto).length}/9 acerto`)
  const bisR = gravado('rev7-biscuit-curto')?.protagonist, broR = gravado('rev7-bro-uma-linha')?.protagonist
  ok((!bisR || bisR.species === 'cat') && (!broR || broR.species === 'pigeon'), `R7 roteiro inglês curto, resposta real: Biscuit ${bisR?.species ?? 'determinístico'}, BRO ${broR?.species ?? 'determinístico'}`)
  ok(gravado('pt-curto-nino')?.protagonist?.species === 'frog' && gravado('es-curto-lia')?.protagonist?.species === 'seagull', `R7 frase curta PT/ES, resposta real: ${gravado('pt-curto-nino')?.protagonist?.species} / ${gravado('es-curto-lia')?.protagonist?.species}`)
}

// ═══ 10. Rodada 8: a superfície reduzida ════════════════════════════════════════════════════════════════════════════
console.log('== 10. Rodada 8: o modelo só diz quem/kind/species; sem detector de língua; lugar no meio da frase; o Tommy real ==')
{
  // (a) aparência, gênero e idade do modelo não existem no elenco lido
  const SNOW = porId.get('rev8-snow-fox')!.texto
  const snow = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Snow', kind: 'animal', species: 'fox', species_en: 'fox', appearance_from_text: 'white eyes', appearance_en: 'white eyes', gender_if_stated: 'female', age_if_stated: 'child', age_evidence: 'Snow' }, supporting: [], places_and_orgs: [] }), SNOW)
  ok(!!snow?.protagonist && Object.keys(snow.protagonist).sort().join(',') === 'age_text,gender,kind,name,role,role_text,species,species_text' && snow.protagonist.age_text === null, `a leitura só guarda quem/kind/species/papel/gênero e a idade como TRECHO LITERAL conferido (rodada 12) — nada de aparência; age_if_stated/age_evidence antigos não entram (${Object.keys(snow?.protagonist ?? {}).join(',')})`)
  const apSnow = aplicarElencoSemantico(elencoDoRoteiro(SNOW), snow, SNOW)!
  const litSnow = fichaLiteralConferida(SNOW, apSnow.elenco, apSnow)
  ok(/fox/.test(litSnow.elenco[0].canonica) && !/white eyes/.test(litSnow.elenco[0].canonica) && !/age as the author wrote/.test(litSnow.elenco[0].canonica), `"Her fur was white, her eyes gold" + resposta "white eyes": a ficha final não diz olhos brancos (${litSnow.elenco[0].canonica.slice(0, 90)})`)

  // (b) espécie = a palavra do texto, em qualquer língua; o species_en só traduz a original que está no texto
  const L = (txt: string, name: string, sp: string, en: string) => lerElencoSemantico(JSON.stringify({ protagonist: { name, kind: 'animal', species: sp, species_en: en }, supporting: [], places_and_orgs: [] }), txt)?.protagonist?.species ?? null
  ok(L('Luna, gata preta, persegue borboletas.', 'Luna', 'gata', 'cat') === 'cat' && L('Thor, vira-lata caramelo, late alto.', 'Thor', 'vira-lata', 'mixed-breed dog') === 'mixed-breed dog' && L('Lola, perrita blanca, baila salsa.', 'Lola', 'perrita', 'little dog') === 'little dog', 'PT/ES curto sem palavra de função traduz (na rodada 7 saía "Luna, a gata", "Thor, a vira-lata", "Lola, a perrita")')
  ok(L('Tom the cat naps in a café.', 'Tom', 'cat', 'cat') === 'cat' && L('Max, a golden retriever, surfs in Los Angeles.', 'Max', 'golden retriever', 'golden retriever') === 'golden retriever' && L('Biscuit the corgi wins big in Las Vegas.', 'Biscuit', 'corgi', 'corgi') === 'corgi', 'inglês com "café", "Los", "Las": a espécie é a palavra do texto (sem detector, nada a errar)')
  ok(L('My cat Luna knocked my coffee off the table. Luna stared at me.', 'Luna', 'gata', 'cat') === 'cat', 'roteiro inglês com a species em português ("gata", vício do modelo medido na API): vale o "cat" que o texto escreve')
  ok(L('Luna knocked my coffee off the table. Luna stared at me.', 'Luna', 'gata', 'cat') === null, 'nenhuma das duas palavras no texto: nada (resposta descartada → o determinístico)')
  ok(L('Chispa es un pequeño dragón. Chispa sueña con volar.', 'Chispa', 'dragón', 'dragon') === 'dragon', 'o species_en que é a mesma palavra sem acento ("dragón"/"dragon") traduz, não é "outro ser"')
  // medido na API (217 casos): em roteiro inglês, toda species_en diferente da species é tradução de palavra PT/ES ou pup→puppy — nenhuma
  // troca de uma espécie inglesa por outra ("pigeon" → "eagle"), que é o que o detector de língua barrava
  const trocas = ((calib as unknown as { resumo: { species_en_troca_em_ingles?: Array<{ id: string; species: string; species_en: string }> } }).resumo.species_en_troca_em_ingles) ?? null
  const PT_ES = /^(?:gato|gata|lobo|cachorro|raposa|vira-lata|retriever dourado|r[ãa]s|sapos|abacate|morango|melancia|uva|cavalo|galinha|le[ãa]o|drag[ãa]o|elefante|elefante-beb[êe]|p[áa]ssaro|br[óo]colis|tubar[ãa]o[- ]branco|galinheiro|cachorrinho|gatinho|gatinha|perro|perrita|urso|esquilo|coelho|foca|pinguim|papagaio|cabra)$/
  ok(Array.isArray(trocas) && trocas.every((t) => PT_ES.test(t.species) || t.species_en.startsWith(t.species)), `respostas reais, roteiro inglês: ${trocas?.length ?? '?'} species_en ≠ species, todas tradução de PT/ES ou plural/diminutivo (${(trocas ?? []).filter((t) => !PT_ES.test(t.species) && !t.species_en.startsWith(t.species)).map((t) => `${t.id}:${t.species}>${t.species_en}`).join(' | ') || 'nenhuma troca inglês→inglês'})`)

  // (c) 15 s: nome de lugar com a grafia do protagonista no MEIO da frase → a cena é forçada, como na base
  const fichaBicho = (nome: string, nucleo: string): FichaDePersonagem => ({ nome, nucleo, tipo: 'animal', canonica: `${nome}, a ${nucleo}`, origem: 'deterministica', protagonista: true, genero: null })
  const baseSrc = execFileSync('git', ['show', '2359bf434:lib/filmes/filme15Elenco.ts'], { cwd: raiz, encoding: 'utf8', maxBuffer: 16 << 20 })
  const tmp = path.join(os.tmpdir(), `filme15Elenco-base8-${process.pid}.ts`)
  fs.writeFileSync(tmp, baseSrc)
  const BASE = (await import(pathToFileURL(tmp).href)) as typeof import('../lib/filmes/filme15Elenco')
  fs.rmSync(tmp, { force: true })
  const forca = (v: string, el: FichaDePersonagem[]) => protagonistaEmTodaCena({ visuals: [v], elenco: el, porNome: true }).forcadas.length === 1
  const LUGARES: Array<[string, string, string]> = [['Rocky', 'husky', 'A snowy cabin in the Rocky Mountains at sunset.'], ['Sydney', 'cat', 'Fireworks over the Sydney Opera House at dawn.'], ['Aurora', 'fox', 'The Aurora Borealis ripples over the frozen lake.'], ['Hope', 'dog', 'A storm rolls past the Cape of Good Hope.'], ['Paris', 'cat', 'Rain falls on the rooftops of Paris at night.']]
  for (const [nome, esp, v] of LUGARES) ok(forca(v, [fichaBicho(nome, esp)]) && BASE.protagonistaEmTodaCena({ visuals: [v], elenco: [fichaBicho(nome, esp)] }).forcadas.length === 1, `lugar "${v.slice(0, 40)}…" não cita o ${nome}: forçada (a base também)`)
  ok(!forca('The camera follows Rocky as he pulls the sled.', [fichaBicho('Rocky', 'husky')]) && !forca("Rocky's paws sink into the snow.", [fichaBicho('Rocky', 'husky')]) && !forca('At dawn, Paris stretches on the windowsill.', [fichaBicho('Paris', 'cat')]), 'o nome que de fato cita (objeto do verbo, possessivo, sujeito depois da vírgula) continua citando')

  // (d) a ficha literal do juiz (a única fonte de aparência agora), conferida: complemento depois do nome entra; o que vem antes sem a espécie, não
  const MILA = porId.get('prod-mila')!.texto
  const apMila = aplicarElencoSemantico(elencoDoRoteiro(MILA), gravado('prod-mila'), MILA)!
  ok(/turquoise hair/.test(fichaLiteralConferida(MILA, apMila.elenco, apMila).elenco[0].canonica), 'Mila: "with her turquoise hair and star-shaped backpack" (depois do nome) entra pela ficha literal do juiz')

  // (e) o caso REAL de 01/11 18:10 (achrafiadadi4, render 49b015e8, Seedance 15 s): o Tommy virou o filhote ("mischievous pup leaps and grabs
  // Tommy") + "the boy" à parte + "Laughter, a man in his thirties" — no vídeo, o menino de boné vermelho virou um homem adulto e depois outro
  const TOMMY = porId.get('real-tommy')!
  const semTommy = gravado('real-tommy')
  ok(semTommy?.protagonist?.name === 'Tommy' && semTommy.protagonist.kind === 'human', `Tommy, resposta real: gente (${semTommy?.protagonist?.name} ${semTommy?.protagonist?.kind}/${semTommy?.protagonist?.species})`)
  const base = caminho15('real-tommy', null)
  const pb = base.elenco.find((f) => f.protagonista)
  ok(!!pb && (pb.tipo !== 'humano' || /pup/.test(pb.canonica) || base.fin.some((q) => /Laughter|thirties/.test(q))), `mutante (sem o elenco semântico) reproduz o defeito do render: ${pb?.nome}/${pb?.tipo} "${pb?.canonica.slice(0, 60)}"`)
  const t = caminho15('real-tommy', semTommy)
  const pt = t.elenco.find((f) => f.protagonista)
  ok(!!pt && pt.nome === 'Tommy' && pt.tipo === 'humano' && /\bboy\b/.test(pt.canonica) && !/pup|mischievous|thirties|adult/.test(pt.canonica), `a ficha do Tommy é de menino (${pt?.canonica})`)
  ok(t.elenco.filter((f) => f.tipo === 'humano').length === 1 && t.elenco.every((f) => !/Laughter|^the boy$/.test(f.nome)), `um humano só no elenco: sem "the boy" à parte, sem "Laughter" (${t.elenco.map((f) => `${f.nome}/${f.tipo}`).join(', ')})`)
  ok(t.fin.every((q) => q.includes(pt!.canonica)), 'o menino (a mesma ficha) está em TODA cena do 15 s')
  ok(t.fin.every((q) => !/Laughter|thirties|\badult\b|grown man/.test(q)), 'nenhuma cena leva homem adulto, "Laughter" ou outro homem')
  void TOMMY
}

// ═══ 11. Rodada 9: menos lógica — sem troca por contagem; nomeado sem papel e fora da base = elenco de sempre; papel + gênero ═══
console.log('== 11. Rodada 9: protagonista do modelo, sem ficha inventada, papel e gênero do nomeado (10 casos da revisão, API real) ==')
{
  const VIS = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-visuais-rev9.json'), 'utf8')) as Record<string, { falas: string[]; prompts: string[] }>
  Object.assign(PROD, VIS)
  const ids = Object.keys(VIS)
  ok(ids.length === 10 && ids.every((id) => porId.has(id) && typeof porId.get(id)!.resposta.raw === 'string'), `os 10 casos da revisão têm resposta real gravada (${ids.filter((id) => !porId.get(id)?.resposta.raw).join(', ') || 'todos'})`)
  const ADULTO = /\b(?:thirties|twenties|forties|adult|grown)\b/
  const corre = (id: string) => ({ r: caminho15(id, gravado(id)), b: caminho15(id, null) })
  // (a) a troca por contagem saiu: o protagonista é o que o modelo leu (mutante com a resposta de antes, em que o Jack era o protagonista)
  const JW = porId.get('rev9-jack-will')!.texto
  const jw = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Jack', role: 'boy', kind: 'human', species: 'human', gender_if_stated: 'male' }, supporting: [{ name: 'Will', role: 'grandpa', kind: 'human', species: 'human', gender_if_stated: 'male', on_screen: true }], places_and_orgs: [] }), JW)
  ok(jw?.protagonist?.name === 'Jack' && jw.supporting[0]?.name === 'Will', 'o verbo "will" não faz do avô Will o protagonista (a leitura do modelo fica)')
  const LO = porId.get('rev9-lily-oreo')!.texto
  const lo = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Lily', role: 'young baker', kind: 'human', species: 'human', gender_if_stated: 'female' }, supporting: [{ name: 'Oreo', kind: 'animal', species: 'cat', on_screen: true }], places_and_orgs: [] }), LO)
  ok(lo?.protagonist?.name === 'Lily', 'protagonista narrada por "she" e o gato pelo nome: a Lily fica na frente')
  // (b) cada caso pelo caminho real do 15 s, com os visuais da revisão
  for (const id of ['rev9-emma-liam', 'rev9-jack-will', 'pt-rev9-lince', 'es-rev9-sofia']) {
    const { r, b } = corre(id)
    const sem = gravado(id)
    const semPapel = !!sem?.protagonist?.name && sem.protagonist.kind === 'human' && !sem.protagonist.role && !sem.protagonist.age_text // rodada 12: a idade escrita aceita ("Lince tem oito anos") dá ficha
    ok(!semPapel || (!r.aplicado && JSON.stringify(r.fin) === JSON.stringify(b.fin)), `${id}: nomeado sem papel no texto e fora do determinístico → o 15 s é o de sempre, byte a byte (${r.aplicado ? 'aplicado' : 'determinístico'})`)
    ok(r.fin.every((q) => !ADULTO.test(q.split(MAIN)[0].match(/The only person in this shot is the same main character \(([^)]*)\)/)?.[1] ?? '')), `${id}: nenhuma cena forçada com um adulto inventado`)
  }
  {
    const { r } = corre('rev9-lily-oreo')
    const p = r.elenco.find((f) => f.protagonista)
    ok(!!p && p.nome === 'Lily' && p.tipo === 'humano' && p.canonica === 'Lily, a young baker, exactly as the author wrote', `Lily: protagonista; rodada 14: o papel "young baker" como o autor escreveu, sem faixa nem gênero nossos (${p?.canonica.slice(0, 60)})`)
    ok(r.elenco.some((f) => f.nome === 'Oreo' && f.tipo === 'animal'), 'Oreo segue o gato, coadjuvante')
  }
  {
    const { r } = corre('rev9-rosa-theo')
    const theo = r.elenco.find((f) => f.nome === 'Theo')
    const rosa = r.elenco.find((f) => /Rosa/.test(f.nome))
    ok(!!theo && /\bgrandson\b/.test(theo.canonica) && !/\bgirl\b/.test(theo.canonica), `Theo: o papel "grandson" como o autor escreveu (o neto não vira menina) (${theo?.canonica.slice(0, 60)})`)
    ok(!rosa || (/Grandma/.test(rosa.canonica) && rosa.genero === 'woman' && !/\bman\b/.test(rosa.canonica.replace(/woman/g, ''))), `Grandma Rosa é mulher pela palavra escrita ("Grandma") (${rosa?.canonica.slice(0, 60) ?? '-'} / ${rosa?.genero ?? '-'})`)
    ok(r.fin.every((q) => !/Rosa, a elderly man|Rosa, an elderly man/.test(q)), 'nenhuma cena diz "Grandma Rosa, a elderly man"')
  }
  {
    const { r } = corre('rev9-fox-girl')
    const p = r.elenco.find((f) => f.protagonista)
    ok(!!p && p.nome === 'Fox' && p.tipo === 'humano' && /\bgirl\b/.test(p.canonica), `Fox (a ten-year-old girl) segue menina (${p?.canonica.slice(0, 50)})`)
    const s = corre('rev9-sam-firefighter').r.elenco.find((f) => f.protagonista)
    ok(!!s && s.nome === 'Sam' && /firefighter/.test(s.canonica) && !/\bman\b/.test(s.canonica) && s.genero !== 'man', `Sam, a firefighter ("She hears"): rodada 14: o pronome não vira palavra nossa — o papel do autor, nunca "a man" (${s?.canonica.slice(0, 60)} / ${s?.genero ?? 'null'})`)
    const pk = corre('rev9-pickles-hedgehog').r.elenco.find((f) => f.protagonista)
    ok(!!pk && pk.nome === 'Pickles' && /hedgehog/.test(pk.canonica), 'Pickles segue ouriço')
  }
}

// ═══ 12. Rodada 12: idade e papel = TRECHO LITERAL copiado pelo modelo e conferido pelo código (sem regex de idade) ═══
// Rodada 14 (NÃO INTERPRETAR IDADE NEM GÊNERO): a ficha do trecho aceito é "<Nome>, <trecho>, exactly as the author wrote" — nada nosso
// depois (nem "a boy", nem "an elderly woman", nem "early thirties", nem a aparência do gerador). O gênero só de palavra escrita no trecho.
console.log('== 12. Rodada 12/14: o modelo copia age_text/role_text, o código confere; a ficha é só o trecho do autor ==')
const MARCA14 = ', exactly as the author wrote'
/** a cláusula do protagonista forçado numa cena do 15 s (o que o motor recebe como "o mesmo personagem") */
const forcada = (q: string) => q.split(MAIN)[0].match(/The only person in this shot is the same main character \(([^)]*)\)/)?.[1] ?? ''
/** o que o motor recebe de uma ficha de gente, fora das palavras do autor, nunca pode ter pessoa/faixa nossa */
const limpaDoAutor = (f: Pick<FichaDePersonagem, 'nome' | 'canonica'>) => !fichaDoTrecho(f.canonica) || !PESSOA_OU_FAIXA.test(nossaParte(f))
{
  const VIS10 = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-visuais-rev10.json'), 'utf8')) as Record<string, { falas: string[]; prompts: string[] }>
  Object.assign(PROD, VIS10)
  // (a) a conferência do trecho: literal, palavra inteira, perto do nome, na grafia do TEXTO
  const LEO = 'The story of Leo, a 9-year-old inventor, starts in a garage. Leo builds a robot dog named Bolt.'
  ok(trechoPerto(LEO, '9-year-old', 'Leo')?.t === '9-year-old', 'trecho que existe no texto perto do nome: aceito')
  ok(trechoPerto('Seven-Year-Old Mia finds a kitten.', 'seven-year-old', 'Mia')?.t === 'Seven-Year-Old', 'o trecho aceito sai na grafia do texto ("Seven-Year-Old"), não na do modelo')
  ok(trechoPerto(LEO, 'nine-year-old', 'Leo') === null && trechoPerto(LEO, '9 years old', 'Leo') === null, 'trecho reescrito pelo modelo ("nine-year-old" para "a 9-year-old"): recusado')
  ok(trechoPerto('Leo, grandson of a 78-year-old fisherman, dreams of the sea.', 'neto de um pescador de 78 anos', 'Leo') === null, 'trecho traduzido pelo modelo (roteiro inglês, role_text em português): recusado')
  ok(trechoPerto('Tom turned sixty last spring.', 'six', 'Tom') === null, 'pedaço de palavra ("six" em "sixty"): recusado')
  const longe = 'Mia walks to the old red barn behind the quiet farmhouse at the end of the long dusty road with her dog, who is seven.'
  ok(trechoPerto(longe, 'seven', 'Mia') === null, `trecho a mais de ~12 palavras do nome: recusado`)
  ok(trechoPerto('Pablo tiene nueve años.', 'nueve años', 'Carmen') === null, 'sem a âncora no texto: recusado')
  ok(trechoPerto('Zoe (6yo) loses her first tooth.', '6yo', 'Zoe')?.t === '6yo' && trechoPerto('Ivy is a month old.', 'a month old', 'Ivy')?.t === 'a month old', 'rodada 14: "6yo" e "a month old" são aceitos como o autor escreveu')
  // (b) rodada 14: o código NÃO interpreta o trecho (idadeDoTrecho saiu do módulo)
  const mod = (await import('../lib/cinematic/elencoSemantico')) as Record<string, unknown>
  ok(!('idadeDoTrecho' in mod) && !('faixaDaFicha' in mod), 'rodada 14: idadeDoTrecho/faixaDaFicha não existem mais (nenhuma tradução de trecho em faixa)')
  const fonte = fs.readFileSync(path.join(raiz, 'lib/cinematic/elencoSemantico.ts'), 'utf8')
  ok(!/early thirties|PESSOA_POR_FAIXA|NUM_PT_ES|UNIDADE_MENOR|FAIXA_PALAVRAS|idadeDoTrecho/.test(fonte.replace(/^\s*\/\/.*$/gmu, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'rodada 14: o módulo não tem mais faixa, pessoa por faixa, número por extenso nem unidade de idade no código')
  // (c) o trecho do autor na ficha: contínuo quando colado, com o artigo; separado quando o nome está no meio
  ok(trechoDaPessoa({ name: 'Leo', role_text: 'inventor', age_text: '9-year-old' }, LEO) === 'a 9-year-old inventor', `"a 9-year-old inventor" (${trechoDaPessoa({ name: 'Leo', role_text: 'inventor', age_text: '9-year-old' }, LEO)})`)
  ok(trechoDaPessoa({ name: 'Lucas', role_text: 'um menino', age_text: 'de sete anos' }, 'Lucas, um menino de sete anos, mora com o avô Zé.') === 'um menino de sete anos', '"um menino de sete anos"')
  ok(trechoDaPessoa({ name: 'Ramón', role_text: 'abuelo', age_text: 'de 82 años' }, 'Su abuelo Ramón, de 82 años, le construye unas alas.') === 'abuelo, de 82 años', `"abuelo, de 82 años" (${trechoDaPessoa({ name: 'Ramón', role_text: 'abuelo', age_text: 'de 82 años' }, 'Su abuelo Ramón, de 82 años, le construye unas alas.')})`)
  ok(trechoDaPessoa({ name: 'Leo', role_text: 'curious boy', age_text: '80-year-old' }, "Meet Leo, a curious boy. Every Sunday, Leo's 80-year-old grandma Rose cooks.") !== null, '(limite documentado) idade alheia que o MODELO atribui à pessoa e que está perto do nome passa na conferência — ler de quem é a idade é trabalho do modelo; a calibração mede')
  ok(nucleoDoPapel('boy of nine') === 'boy' && nucleoDoPapel('whose dad is a fisherman') === '' && nucleoDoPapel('grandson of a 78-year-old fisherman') === 'grandson', 'núcleo do papel (gênero): "boy of nine" → boy; "whose dad…" → nada; "grandson of…" → grandson')
  // (d) mocks: recusado ou null = a base; aceito = SÓ o trecho do autor, gênero só da palavra escrita
  const P = (name: string | null, role_text: string | null, g: string | null, age_text: string | null, extra: Record<string, unknown> = {}) => ({ name, role_text, role_en: role_text, kind: 'human', species: 'human', species_en: 'human', appearance_from_text: '', appearance_en: '', gender_if_stated: g, age_text, on_screen: true, ...extra })
  const ap1 = (texto: string, prot: Record<string, unknown>, sup: Array<Record<string, unknown>> = []) => aplicarElencoSemantico(elencoDoRoteiro(texto), lerElencoSemantico(JSON.stringify({ protagonist: prot, supporting: sup, places_and_orgs: [] }), texto), texto)
  {
    const ap = ap1(LEO, P('Leo', 'inventor', 'male', '9-year-old'))
    ok(ap?.elenco[0].canonica === 'Leo, a 9-year-old inventor, exactly as the author wrote' && ap.elenco[0].genero === null, `"The story of Leo, a 9-year-old inventor": só o trecho, sem pessoa nossa; o "male" do modelo sem palavra escrita não entra (${ap?.elenco[0].canonica} / ${ap?.elenco[0].genero})`)
    const rec = ap1(LEO, P('Leo', 'inventor', 'male', 'nine years old'))
    ok(rec?.elenco[0].canonica === 'Leo, inventor, exactly as the author wrote', `idade reescrita pelo modelo: recusada, só o papel conferido entra (${rec?.elenco[0].canonica})`)
    const emma = lerElencoSemantico(JSON.stringify({ protagonist: P('Emma', 'Emma', null, 'Emma'), supporting: [], places_and_orgs: [] }), 'Meet Emma. She moves to a new school.')
    ok(!!emma?.protagonist && emma.protagonist.role === null && emma.protagonist.role_text === null && emma.protagonist.age_text === null, 'role_text/age_text que é só o próprio nome ("Meet Emma." → "Emma"): recusado (não vira papel nem ficha inventada)')
    const nulo = ap1('Meet Leo. Leo builds a robot. He laughs when it beeps.', P('Leo', null, 'male', null))
    ok(nulo === null || nulo.elenco.every((f) => !f.canonica.includes(MARCA14)), 'nomeado sem papel e sem idade aceitos: nenhum trecho do autor inventado na ficha (a base)')
  }
  for (const [texto, prot, esperada, genero] of [
    ['Ana, uma menina de oito anos de olhos azuis, ama gatos. Ana encontra um gatinho na chuva.', P('Ana', 'uma menina', 'female', 'de oito anos', { role_en: 'girl' }), 'Ana, uma menina de oito anos, exactly as the author wrote', 'woman'],
    ['Lucía, una niña de ocho años de ojos verdes, sueña con volar. Lucía salta desde el granero.', P('Lucía', 'una niña', 'female', 'de ocho años', { role_en: 'girl' }), 'Lucía, una niña de ocho años, exactly as the author wrote', 'woman'],
    ['Tom, a boy of nine, finds a dragon egg in the barn. Tom hides it under his bed.', P('Tom', 'a boy of nine', 'male', 'nine'), 'Tom, a boy of nine, exactly as the author wrote', 'man'],
    ['Meet Lily, a girl who adores her grandma. She is seven. Every Saturday they bake cookies, and Lily burns the first batch.', P('Lily', 'a girl', 'female', 'seven'), 'Lily, a girl, seven, exactly as the author wrote', 'woman'],
    ['Kai, the youngest of five brothers, is six. Kai wants to win the family soccer game. His brothers laugh.', P('Kai', 'the youngest of five brothers', 'male', 'six'), 'Kai, the youngest of five brothers, is six, exactly as the author wrote', null],
    ['Pablo tiene nueve años y vive con su abuela Carmen. Pablo quema la tortilla y los dos se ríen.', P('Pablo', null, 'male', 'nueve años'), 'Pablo, nueve años, exactly as the author wrote', null],
    ['Riley, a little girl with pigtails, lives on a farm. Riley feeds the goats.', P('Riley', 'a little girl', 'female', 'a little girl'), 'Riley, a little girl, exactly as the author wrote', 'woman'],
    ['Zoe (6yo) loses her first tooth at the dinner table. Zoe hides it under her pillow.', P('Zoe', '6yo', 'female', '6yo'), 'Zoe, 6yo, exactly as the author wrote', null],
    ['Ivy is a month old and has never seen snow. Her mom carries Ivy to the window.', P('Ivy', 'a month old', null, 'a month old'), 'Ivy, a month old, exactly as the author wrote', null],
    ['Grandma Rose, seven decades young, enters her first skateboarding contest. Rose wobbles, then lands a kickflip.', P('Grandma Rose', 'Grandma', 'female', 'seven decades young'), 'Grandma Rose, seven decades young, exactly as the author wrote', 'woman'],
  ] as const) {
    const f = ap1(texto, prot)?.elenco[0]
    ok(f?.canonica === esperada && f.genero === genero, `ficha = só o trecho do autor; gênero só de palavra escrita: ${f?.canonica ?? 'sem ficha'} / ${f?.genero ?? 'null'}`)
  }
  {
    // irmã com papel que o modelo NÃO copiou ("10") e pronome "his" do irmão: sem gênero, nunca "a boy"; com o papel copiado, mulher
    const T = 'Theo is a year and a half old and refuses to wear shoes. Theo runs barefoot through the puddles while his big sister Maya, 10, chases him with boots.'
    const ap = ap1(T, P('Theo', null, 'male', 'a year and a half old'), [P('Maya', '10', 'female', '10')])
    const maya = ap?.elenco.find((f) => f.nome === 'Maya')
    ok(maya?.canonica === 'Maya, 10, exactly as the author wrote' && maya.genero === null, `Maya ("his big sister Maya, 10", role_text "10"): sem pessoa nem gênero inventados (${maya?.canonica} / ${maya?.genero})`)
    const ap2 = ap1(T, P('Theo', null, 'male', 'a year and a half old'), [P('Maya', 'big sister', 'female', '10')])
    const maya2 = ap2?.elenco.find((f) => f.nome === 'Maya')
    ok(maya2?.canonica === 'Maya, big sister, 10, exactly as the author wrote' && maya2.genero === 'woman', `Maya com o papel copiado ("big sister"): o gênero vem da palavra escrita (${maya2?.canonica} / ${maya2?.genero})`)
    ok(ap?.elenco[0].canonica === 'Theo, a year and a half old, exactly as the author wrote' && ap.elenco[0].genero === null, `Theo, um ano e meio: o trecho, nunca "an elderly man" (${ap?.elenco[0].canonica})`)
  }
  // a ficha "do autor" da base que não traz nenhum trecho conferido é de outra pessoa (o pescador de 78); a que traz um deles fica
  {
    const G = 'Leo, grandson of a 78-year-old fisherman, dreams of the sea. Every evening Leo waits on the dock and counts the boats coming home.'
    ok(elencoDoRoteiro(G).some((f) => f.nome === 'Leo' && f.origem === 'autor' && /78-year-old fisherman/.test(f.canonica)), '(controle) a base dava "Leo, a 78-year-old fisherman" (origem autor)')
    const ap = ap1(G, P('Leo', 'grandson of a 78-year-old fisherman', 'male', null))
    const f = ap?.elenco[0]
    ok(f?.canonica === 'Leo, grandson of a 78-year-old fisherman, exactly as the author wrote' && f.genero === 'man', `Leo, neto do pescador de 78: o trecho como o autor escreveu, gênero do "grandson" (${f?.canonica} / ${f?.genero})`)
    const ap2 = ap1(G, P('Leo', 'grandson', 'male', null))
    ok(ap2?.elenco[0].canonica === 'Leo, grandson, exactly as the author wrote', `papel "grandson" conferido vence a ficha da base do pescador (${ap2?.elenco[0].canonica})`)
    const autor: FichaDePersonagem = { nome: 'Roland', nucleo: 'Roland', tipo: 'humano', canonica: 'Roland, a gruff old man with shoulder-length gray-brown hair', origem: 'autor', protagonista: true, genero: 'man' }
    const R = 'Roland, a gruff old man with shoulder-length gray-brown hair, has a new enemy: the smart fridge. Roland unplugs it.'
    const ap3 = aplicarElencoSemantico([autor], lerElencoSemantico(JSON.stringify({ protagonist: P('Roland', 'gruff old man', 'male', null), supporting: [], places_and_orgs: [] }), R), R)
    ok(ap3?.elenco[0].canonica === autor.canonica, 'a ficha do autor que traz o trecho conferido ("gruff old man … gray-brown hair") nunca é trocada')
  }
  // (e) o caminho REAL do 15 s com as respostas REAIS (API) de todos os casos com ficha esperada
  const casosFicha = calib.casos.filter((c) => c.fichas)
  ok(casosFicha.length >= 57, `${casosFicha.length} casos com a ficha esperada (revisões 10 a 14) na calibração`)
  const leves: string[] = []
  for (const c of casosFicha) {
    const sem = gravado(c.id)
    const n = avaliar(c, sem)
    if (n.graves.length) ok(false, `${c.id} (API): erro grave ${n.graves.join(',')}`)
    if (!n.acerto) leves.push(`${c.id}:${n.erros.join(',')}`)
    const r = caminho15(c.id, sem)
    const sujas = r.elenco.filter((f) => f.tipo === 'humano' && !limpaDoAutor(f))
    ok(sujas.length === 0, `${c.id} (API, 15 s): nenhuma ficha do trecho do autor com pessoa/faixa nossa ${sujas.map((f) => f.canonica).join(' | ')}`)
    const forcadas = r.fin.map(forcada).filter(Boolean)
    const pp = r.elenco.find((f) => f.protagonista)
    ok(!pp || forcadas.every((x) => limpaDoAutor({ nome: pp.nome, canonica: x })), `${c.id} (API, 15 s): nenhuma cena forçada com pessoa/faixa nossa`)
  }
  ok(leves.length <= 3, `casos de ficha com erro leve na resposta real: ${leves.length} (≤ 3) ${leves.join(' | ')}`)
  // os exemplos que as revisões apontaram, um a um (resposta real)
  const R12 = (id: string) => caminho15(id, gravado(id))
  {
    const leo = R12('rev12-story-of-leo').aplicado?.elenco.find((f) => f.nome === 'Leo')
    ok(!!leo && /^Leo, a 9-year-old inventor, exactly as the author wrote(?:;|$)/.test(leo.canonica), `"The story of Leo, a 9-year-old inventor" (API): ${leo?.canonica ?? 'sem ficha'}`)
  }
  {
    const r = R12('es-rev12-pablo-carmen')
    const pablo = r.elenco.find((f) => f.nome === 'Pablo')
    ok(!!r.aplicado && r.aplicado.protagonista === 'Pablo' && !!pablo && /nueve años/.test(pablo.canonica) && limpaDoAutor(pablo), `Pablo (API): protagonista, "nueve años" na ficha, nada nosso (${pablo?.canonica ?? 'sem ficha'})`)
    ok(r.fin.every((q) => !/grandmother|abuela|Carmen/.test(forcada(q))), 'Pablo (API, 15 s): nenhuma cena forçada com a avó no lugar do Pablo')
    ok(r.fin.every((q) => !/No people/.test(q.split(MAIN)[0]) || !/Pablo/.test(q)), 'Pablo (API, 15 s): a cena do Pablo não sai "No people"')
  }
  {
    const kai = R12('rev12-kai-youngest').elenco.find((f) => f.nome === 'Kai')
    ok(!!kai && /six/.test(kai.canonica) && limpaDoAutor(kai), `Kai, the youngest of five brothers, is six (API): ${kai?.canonica ?? 'sem ficha'}`)
  }
  {
    const r = R12('rev11-leo-grandson-of')
    const leo = r.elenco.find((f) => f.nome === 'Leo')
    ok(!!leo && !leo.canonica.startsWith('Leo, a 78-year-old') && /grandson/.test(leo.canonica) && limpaDoAutor(leo), `"Leo, grandson of a 78-year-old fisherman" (API): o trecho com "grandson", sem pessoa nossa (${leo?.canonica ?? 'sem ficha'})`)
    ok(r.fin.every((q) => !/Leo, an? 78-year-old/.test(q) && !/elderly/.test(forcada(q))), 'Leo (API, 15 s): nenhuma cena diz que o Leo tem 78 anos')
  }
  {
    const r = R12('rev12-roland-rick')
    const ro = r.elenco.find((f) => /Roland/.test(f.nome))
    ok(!!ro && ro.tipo === 'humano' && /\bold man\b/.test(ro.canonica) && !/\b(?:young|twenties|thirties|boy|teen)\b/.test(ro.canonica.split(' with ')[0]), `o Roland do Rick ("a gruff old man with shoulder-length gray-brown hair", API): ${ro?.canonica.slice(0, 110) ?? 'sem ficha'}`)
    ok(r.fin.every((q) => !/Roland[^.()]{0,40}\b(?:young|twenties|thirties)\b/.test(q)), 'Roland (API, 15 s): nenhuma cena com o Roland jovem (FILA-DEFEITOS 01/11: "vira rapaz jovem")')
  }
  for (const [id, nome, lit] of [['pt-rev12-ana-olhos-azuis', 'Ana', 'oito anos'], ['es-rev12-lucia-abuelo', 'Lucía', 'ocho años'], ['pt-rev12-historia-de-lucas', 'Lucas', 'sete anos'], ['rev12-lily-grandma-seven', 'Lily', 'seven'], ['rev12-tom-boy-of-nine', 'Tom', 'nine'], ['rev12-mia-peanut', 'Mia', '6']] as const) {
    const f = R12(id).aplicado?.elenco.find((x) => x.nome === nome)
    ok(!!f && f.canonica.includes(lit) && limpaDoAutor(f), `${id} (API): a idade escrita "${lit}" chega à ficha, nada nosso (${f?.canonica ?? 'sem ficha'})`)
  }
  // anos de trabalho/moradia não são idade: a ficha do Joaquim/Ernesto/Ana não diz "50"/"dez anos" como idade
  for (const [id, alheia] of [['pt-rev11-joaquim-50-anos', '50'], ['es-rev11-ernesto-50-anos', '50'], ['pt-rev10-ana-ha-dez-anos', 'dez anos']] as const) {
    const r = R12(id)
    ok(r.elenco.every((f) => !nossaParte(f).includes(alheia) && limpaDoAutor(f)) && r.elenco.every((f) => fichaDoTrecho(f.canonica) || !/\b(?:boy|girl|child|baby|toddler)\b/.test(f.canonica.split(' with ')[0])), `${id} (API): "${alheia}" de trabalho/moradia não vira idade`)
  }
}

// ═══ 13. Rodada 13: bebê em meses/semanas; a ficha do juiz não apaga o trecho do autor (rodada 14: sem tradução) ═══
console.log('== 13. Rodada 13/14: bebê em meses/semanas vai como o autor escreveu; o juiz literal não apaga o trecho ==')
{
  const P = (name: string, role_text: string | null, g: string | null, age_text: string | null) => ({ name, role_text, role_en: role_text, kind: 'human', species: 'human', species_en: 'human', appearance_from_text: '', appearance_en: '', gender_if_stated: g, age_text, on_screen: true })
  const ap1 = (texto: string, prot: Record<string, unknown>, sup: Array<Record<string, unknown>> = []) => aplicarElencoSemantico(elencoDoRoteiro(texto), lerElencoSemantico(JSON.stringify({ protagonist: prot, supporting: sup, places_and_orgs: [] }), texto), texto)
  for (const [texto, prot, esperada] of [
    ['Lucas is 18 months old and just learned to walk. Lucas wobbles across the kitchen toward his mom, who opens her arms.', P('Lucas', null, 'male', '18 months old'), 'Lucas, 18 months old, exactly as the author wrote'],
    ['Sofía tiene dieciocho meses y descubre la arena por primera vez. Sofía se ríe y la tira al aire.', P('Sofía', null, null, 'dieciocho meses'), 'Sofía, dieciocho meses, exactly as the author wrote'],
    ["Theo is only 10 months old and has just discovered the dog's water bowl. Theo crawls over, splashes, and giggles.", P('Theo', null, null, '10 months old'), 'Theo, 10 months old, exactly as the author wrote'],
    ['Baby Nora is six weeks old. Nora sleeps in a laundry basket.', P('Nora', null, 'female', 'six weeks old'), 'Nora, six weeks old, exactly as the author wrote'],
    ['O Davi tem 3 meses e acorda a casa inteira às três da manhã. Davi chora e o pai canta.', P('Davi', null, null, '3 meses'), 'Davi, 3 meses, exactly as the author wrote'],
    ['Baby Mae is just a few months old. Mae stares at the ceiling fan.', P('Mae', 'Baby', 'female', 'a few months old'), 'Mae, Baby, a few months old, exactly as the author wrote'],
  ] as const) {
    const f = ap1(texto, prot)?.elenco[0]
    ok(f?.canonica === esperada && f.genero === null, `idade em meses/semanas: o trecho como o autor escreveu, sem faixa nem gênero nossos (${f?.canonica ?? 'sem ficha'} / ${f?.genero ?? 'null'})`)
  }
  // rodada 15: a ficha do trecho do autor tem origem 'autor' — o juiz literal não a toca (Arjun: "6"; Valentina: "de once años"); a junção
  // "autor; juiz" das rodadas 13/14 saiu
  {
    const T = 'Fifteen-year-old Priya builds a drone in her bedroom. Her little brother Arjun, 6, wants to fly it. Priya lets him, and the drone crashes into the cake.'
    const ap = ap1(T, P('Priya', null, 'female', 'Fifteen-year-old'), [P('Arjun', 'little brother', 'male', '6')])!
    const lit = fichaLiteralConferida(T, ap.elenco, ap)
    const arjun = lit.elenco.find((f) => f.nome === 'Arjun')!
    const priya = lit.elenco.find((f) => f.nome === 'Priya')!
    ok(arjun.canonica === 'Arjun, little brother, 6, exactly as the author wrote' && arjun.origem === 'autor' && arjun.genero === 'man', `Arjun: o 6 fica, o juiz não reescreve a ficha do autor; gênero do "brother" (${arjun.canonica} / ${arjun.genero})`)
    ok(/^Priya, Fifteen-year-old, exactly as the author wrote(?:;|$)/.test(priya.canonica) && priya.genero === null, `Priya: "Fifteen-year-old" como o autor escreveu, sem "a teenage girl" (${priya.canonica})`)
    ok(lit.trocas.every(([x]) => x !== arjun.canonica), 'nenhuma troca de prompt mexe na ficha do autor')
    const i = ap.elenco.findIndex((f) => f.nome === 'Arjun')
    ok(fichaLiteralConferida(T, lit.elenco, ap).elenco[i].canonica === arjun.canonica, 'idempotente: a ficha do autor não muda na 2ª passada (o 15 s confere duas vezes)')
  }
  {
    const T = 'Valentina, de once años, cuida a su perro Canelo. Un día Canelo desaparece y Valentina lo busca por todo el pueblo hasta encontrarlo dormido en la panadería.'
    const ap = ap1(T, P('Valentina', null, 'female', 'de once años'))!
    const v = fichaLiteralConferida(T, ap.elenco, ap).elenco[0].canonica
    ok(v === 'Valentina, de once años, exactly as the author wrote', `Valentina: só o trecho do autor, o juiz não o reescreve (${v})`)
  }
  {
    // "Grandma June": o trecho do juiz ("door every day for Grandma June") não apaga o papel conferido ("Grandma")
    const T = 'Biscuit, a 12-year-old golden retriever, waits at the door every day for Grandma June. Today June comes home with a tiny kitten named Pip.'
    const prot = { name: 'Biscuit', role_text: 'a 12-year-old golden retriever', role_en: 'a 12-year-old golden retriever', kind: 'animal', species: 'golden retriever', species_en: 'golden retriever', appearance_from_text: '', appearance_en: '', gender_if_stated: null, age_text: '12-year-old', on_screen: true }
    const ap = ap1(T, prot, [P('June', 'Grandma', 'female', null)])!
    const june = fichaLiteralConferida(T, ap.elenco, ap).elenco.find((f) => f.nome === 'June')!
    ok(/^June, Grandma, exactly as the author wrote(?:;|$)/.test(june.canonica) && june.genero === 'woman', `Grandma June: o papel conferido fica na frente (${june.canonica} / ${june.genero})`)
  }
  {
    // só papel, sem idade: o trecho do autor também fica na frente do juiz (rodada 14: não há mais cabeça do gerador)
    const T = 'Mila, an inventor with turquoise hair and a star-shaped backpack, returns to Rainbow Valley. Mila finds a glowing trail.'
    const ap = ap1(T, P('Mila', 'inventor', 'female', null))!
    const m = fichaLiteralConferida(T, ap.elenco, ap).elenco[0].canonica
    ok(m === 'Mila, an inventor, exactly as the author wrote', `só papel, juiz sem trecho ("Mila, an inventor with…" não é complemento colado ao nome): só o trecho do autor, sem a aparência do gerador que brigaria com o "turquoise hair" da cena (${m.slice(0, 140)})`)
  }
  // a resposta REAL (API) dos 16 casos da revisão da rodada 12, pelo caminho real de 15 s
  const R13 = (id: string) => caminho15(id, gravado(id))
  const casos13 = calib.casos.filter((c) => c.fonte === 'rev-0211b')
  ok(casos13.length === 16, `16 casos 'rev-0211b' na calibração (${casos13.length})`)
  for (const c of casos13) {
    const n = avaliar(c, gravado(c.id))
    ok(n.graves.length === 0, `${c.id} (API): 0 erro grave ${n.graves.join(',')}`)
  }
  for (const [id, nome, lit] of [
    ['rev13-baby-theo-months', 'Theo', '10 months old'], ['rev13-lucas-18-months', 'Lucas', '18 months old'], ['es-rev13-sofia-18-meses', 'Sofía', 'dieciocho meses'],
    ['rev13-nora-six-weeks', 'Nora', 'six weeks old'], ['pt-rev13-davi-3-meses', 'Davi', '3 meses'],
  ] as const) {
    const r = R13(id)
    const f = r.elenco.find((x) => x.nome.includes(nome))
    ok(!!f && f.canonica.includes(lit) && limpaDoAutor(f), `${id} (API, 15 s): "${lit}" chega ao motor como o autor escreveu, sem faixa nossa (${f?.canonica.slice(0, 120) ?? 'sem ficha'})`)
    ok(r.fin.every((q) => !/\b(?:man|woman|person) in (?:his|her|their) (?:early|mid|late)|\belderly\b/.test(forcada(q))), `${id} (API, 15 s): nenhuma cena forçada com adulto/idoso`)
  }
  {
    const arjun = R13('rev13-priya-arjun').elenco.find((f) => f.nome === 'Arjun')
    ok(!!arjun && /\b6\b/.test(arjun.canonica) && limpaDoAutor(arjun) && arjun.genero !== 'woman', `Arjun (API, 15 s): o 6 chega ao motor, nada nosso (${arjun?.canonica.slice(0, 120) ?? 'sem ficha'})`)
  }
  {
    const v = R13('es-rev13-valentina-canelo').elenco.find((f) => f.nome === 'Valentina')
    ok(!!v && /once años/.test(v.canonica) && limpaDoAutor(v), `Valentina (API, 15 s): "once años" chega ao motor (${v?.canonica.slice(0, 120) ?? 'sem ficha'})`)
  }
  for (const [id, nome, alheia] of [['rev13-ollie-grandpa', 'Ollie', '84'], ['rev13-noah-sister-16', 'Noah', '16'], ['pt-rev13-joaozinho-avo', 'Joãozinho', '80']] as const) {
    const f = R13(id).elenco.find((x) => x.nome.includes(nome))
    ok(!!f && !nossaParte(f).includes(alheia) && !(fichaDoTrecho(f.canonica) ? f.canonica.split(MARCA14)[0] : f.canonica.split(' with ')[0]).includes(alheia) && limpaDoAutor(f), `${id} (API, 15 s): a idade de outra pessoa (${alheia}) não vai para ${nome} (${f?.canonica.slice(0, 110) ?? 'sem ficha'})`)
  }
}

// ═══ 14. Rodada 14: TODOS os casos das revisões pelo caminho real de 15 s — o trecho literal chega ao motor, nunca uma faixa contraditória ═══
console.log('== 14. Rodada 14: os casos das revisões (API real) pelo caminho de 15 s: trecho literal no motor, nenhuma faixa contraditória ==')
{
  const MENOR_NOSSA = /\b(?:early|mid|late) (?:twenties|thirties|forties|fifties|sixties|seventies)\b|\belderly\b|\b(?:a|an) (?:man|woman|person)\b/
  const CRIANCA_NOSSA = /\b(?:a|an) (?:boy|girl|child|baby|toddler|teenager|teenage (?:boy|girl))\b/
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const casos14 = calib.casos.filter((c) => c.fonte === 'rev-0211c')
  ok(casos14.length === 12, `12 casos 'rev-0211c' (a revisão da rodada 13) na calibração (${casos14.length})`)
  const ids = [...casos14.map((c) => c.id), 'rev12-story-of-leo', 'rev11-leo-grandson-of', 'es-rev12-pablo-carmen', 'rev12-roland-rick']
  for (const id of ids) {
    const c = porId.get(id)!
    const sem = gravado(id)
    const n = avaliar(c, sem)
    ok(n.graves.length === 0, `${id} (API): 0 erro grave ${n.graves.join(',')}`)
    const r = caminho15(id, sem)
    for (const [nome, esp] of Object.entries(c.fichas ?? {})) {
      const f = r.elenco.find((x) => x.nome.includes(nome))
      if (!f) continue
      const faixas = esp.faixa ? (Array.isArray(esp.faixa) ? esp.faixa : [esp.faixa]) : []
      const menor = faixas.length > 0 && faixas.every((x) => x !== 'adult' && x !== 'elderly')
      const maior = faixas.length > 0 && faixas.every((x) => x === 'adult' || x === 'elderly')
      // o que o motor recebe desta pessoa: cada prompt final sem as palavras do autor (fichas do trecho, trechos do juiz entre aspas)
      const fichasDoAutor = r.elenco.filter((x) => fichaDoTrecho(x.canonica)).map((x) => x.canonica.split(';')[0])
      const doMotor = r.fin.map((q) => fichasDoAutor.reduce((s, a) => s.split(a).join(' '), q).replace(/exactly as the author wrote: "[^"]*"/g, ' '))
      const fichaNoMotor = new RegExp(`${escape(f.nome)}, ([^;()]{0,80})`, 'u')
      const contradicoes = doMotor.flatMap((q) => [...q.matchAll(new RegExp(fichaNoMotor.source, 'gu'))].map((m) => m[1])).filter((t) => (menor && MENOR_NOSSA.test(t)) || (maior && CRIANCA_NOSSA.test(t)))
      ok(contradicoes.length === 0, `${id} (15 s): ${nome} nunca chega ao motor com faixa contraditória ${contradicoes.join(' | ')}`)
      if (fichaDoTrecho(f.canonica)) {
        ok(limpaDoAutor(f), `${id} (15 s): ${nome} = só o trecho do autor (${f.canonica.slice(0, 120)})`)
        if (esp.literal) ok(f.canonica.toLowerCase().includes(esp.literal.toLowerCase()) && r.fin.some((q) => q.toLowerCase().includes(esp.literal!.toLowerCase())), `${id} (15 s): o trecho "${esp.literal}" de ${nome} chega ao motor`)
        const g = f.genero === 'woman' ? 'female' : f.genero === 'man' ? 'male' : null
        ok(!esp.genero || !g || g === esp.genero, `${id} (15 s): o gênero de ${nome} nunca contradiz o texto (${g ?? 'nenhum'})`)
      }
    }
    const pp = r.elenco.find((f) => f.protagonista)
    ok(!pp || r.fin.map(forcada).filter(Boolean).every((x) => limpaDoAutor({ nome: pp.nome, canonica: x })), `${id} (15 s): a cena forçada leva a ficha do autor sem nada nosso`)
  }
  // os defeitos graves da revisão da rodada 13, nominalmente (o que vai ao motor)
  const R14 = (id: string) => caminho15(id, gravado(id))
  const ficha = (id: string, nome: string) => R14(id).elenco.find((f) => f.nome.includes(nome))
  for (const [id, nome, lit, proibido] of [
    ['rev14-ivy-month-old', 'Ivy', 'a month old', /elderly|\bold (?:man|woman)\b|\bwoman\b/],
    ['rev14-mae-few-months', 'Mae', 'a few months old', /elderly|\bwoman\b/],
    ['rev14-theo-year-half', 'Theo', 'a year and a half old', /elderly|\bman\b/],
    ['rev14-zoe-6yo', 'Zoe', '6yo', /thirties|\bwoman\b/],
    ['rev14-rose-decades', 'Rose', 'seven decades young', /\bgirl\b|\bchild\b/],
    ['rev14-theo-year-half', 'Maya', '10', /\bboy\b|\bman\b/],
    ['pt-rev14-laura-ano-e-meio', 'Laura', 'um ano e meio', /\b(?:woman|man|elderly)\b/],
    ['es-rev14-martina-ramon', 'Martina', 'siete años', /\b(?:woman|man|elderly)\b/],
  ] as const) {
    const f = ficha(id, nome)
    ok(!!f && f.canonica.includes(lit) && !proibido.test(nossaParte(f)) && limpaDoAutor(f), `${id}: ${nome} vai ao motor com "${lit}" e nada nosso (${f?.canonica.slice(0, 120) ?? 'sem ficha'})`)
  }
  {
    const f = ficha('rev14-theo-year-half', 'Maya')
    ok(!!f && f.genero !== 'man', `Maya (irmã, "his big sister Maya, 10"): nunca menino (${f?.canonica} / ${f?.genero ?? 'null'})`)
    const june = ficha('rev14-biscuit-june', 'June')
    ok(!!june && /Grandma/.test(june.canonica) && june.genero !== 'man' && limpaDoAutor(june), `Grandma June: "Grandma" chega ao motor (${june?.canonica.slice(0, 120) ?? 'sem ficha'})`)
    const rose = ficha('rev14-rose-decades', 'Rose')
    ok(!!rose && rose.genero !== 'man', `Grandma Rose: nunca homem (${rose?.genero ?? 'null'})`)
  }
}

// ═══ 15. Rodada 15: o casting do 15 s e a cena forçada ═════════════════════════════════════════════════════════════
console.log('== 15. Rodada 15: o casting do 15 s não reescreve a ficha do autor; a cena forçada não apaga o coadjuvante ==')
{
  const rotaSrc = fs.readFileSync(path.join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
  const P = (name: string | null, role_text: string | null, g: string | null, age_text: string | null) => ({ name, role_text, role_en: role_text, kind: 'human', species: 'human', species_en: 'human', appearance_from_text: '', appearance_en: '', gender_if_stated: g, age_text, on_screen: true })
  const ap1 = (texto: string, prot: Record<string, unknown>, sup: Array<Record<string, unknown>> = []) => aplicarElencoSemantico(elencoDoRoteiro(texto), lerElencoSemantico(JSON.stringify({ protagonist: prot, supporting: sup, places_and_orgs: [] }), texto), texto)
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // (a) a rota roda o casting em todo 15 s (FILME15_ROSTO_FIXO_PUBLIC → gerarFolha → elencoComCastingAjuste) sobre o elenco do pedido
  ok(rotaSrc.includes('await elencoComCastingAjuste(prompt, elencoDoPedido)'), '(controle) a rota passa o elenco semântico ao casting da folha')
  ok(/protagonistaEmTodaCena\(\{ visuals: visuaisDoPlano15, elenco: elencoFilme15\.elenco, porNome: !!elencoSemantico [^\n]*mostraGente: visualMostraAlguem/.test(rotaSrc) && rotaSrc.includes("import { visualMostraAlguem } from '@/lib/cinematic/personagemAjuste'"), 'a rota passa o detector de gente ao 15 s (a cena com gente sem nome não é forçada com duas pessoas)')
  // (b) a função REAL de rede: elenco todo do autor = 'fixo', nenhuma chamada; elenco misto = a ficha do autor volta igual
  {
    const T = 'Sam, a retired nurse of seventy-two, adopts a three-legged cat named Pirate. Pirate follows Sam everywhere, even to the post office.'
    const ap = ap1(T, P('Sam', 'retired nurse', null, 'seventy-two'))!
    const sam = ap.elenco[0]
    ok(sam.origem === 'autor' && sam.canonica === 'Sam, a retired nurse of seventy-two, exactly as the author wrote' && sam.genero === null, `Sam: ficha do autor com origem 'autor', sem gênero (${sam.canonica} / ${sam.genero})`)
    let chamadas = 0
    const resposta = (els: ReadonlyArray<FichaDePersonagem>) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ characters: els.map((e) => ({ name: e.nome, description: e.tipo === 'humano' ? `a seventy-two-year-old human woman ${MARCA_CASTING} with short grey hair, round glasses, a red cardigan, blue jeans and white sneakers, smiling warmly` : `a black cat ${MARCA_CASTING} with three legs, green eyes, a white chest and a long tail, no clothes, sitting calmly` })) }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    const fixo = await elencoComCastingAjuste(T, [sam], { apiKey: 'k', fetchImpl: async () => { chamadas++; return resposta([sam]) } })
    ok(fixo.casting === 'fixo' && chamadas === 0 && fixo.elenco[0].canonica === sam.canonica, `elenco só do autor: casting 'fixo', ${chamadas} chamada(s), ficha intacta`)
    const bicho: FichaDePersonagem = { nome: 'Pirate', nucleo: 'cat', tipo: 'animal', canonica: 'Pirate, a cat', origem: 'deterministica', protagonista: false, genero: null }
    const misto = await elencoComCastingAjuste(T, [sam, bicho], { apiKey: 'k', fetchImpl: async () => { chamadas++; return resposta([sam, bicho]) } })
    ok(misto.elenco[0].canonica === sam.canonica && misto.elenco[0].genero === null && misto.elenco[1].canonica.includes(MARCA_CASTING), `elenco misto: o casting reescreve o Pirate e nunca a Sam ("a seventy-two-year-old human woman" não entra) (${misto.elenco[0].canonica})`)
  }
  // (c) todos os casos com ficha esperada (revisões 10 a 15, resposta REAL da API), pelo caminho real de 15 s COM o casting que reescreve
  //     tudo: a ficha do trecho do autor chega ao motor igual (a idade escrita não some: Arjun 6, Finn 8, Wren 7, Bean 9, Pia 16)
  let autores = 0
  for (const c of calib.casos.filter((x) => x.fichas)) {
    const sem = gravado(c.id)
    const ap = aplicarElencoSemantico(elencoDoRoteiro(c.texto), sem, c.texto)
    if (!ap) continue
    const r = caminho15(c.id, sem)
    for (const f of ap.elenco.filter((x) => fichaDoTrecho(x.canonica))) {
      autores++
      const fim = r.elenco.find((x) => x.nome === f.nome)
      ok(!!fim && fim.canonica === f.canonica && fim.origem === 'autor', `${c.id}: ${f.nome} chega ao motor como o autor escreveu, depois do casting e do juiz (${fim?.canonica.slice(0, 110) ?? 'sumiu do elenco'})`)
      ok(r.fin.every((q) => !new RegExp(`${esc(f.nome)}, [^;.]*${MARCA_CASTING}`).test(q)), `${c.id}: nenhum prompt leva a ficha de ${f.nome} reescrita pelo casting`)
      if (f.protagonista) ok(r.fin.some((q) => q.includes(f.canonica)), `${c.id}: o trecho do protagonista ${f.nome} está no que vai ao motor`)
    }
  }
  ok(autores >= 80, `${autores} fichas do trecho do autor conferidas pelo caminho real de 15 s com casting (≥ 80)`)
  // (d) os 12 casos da revisão da rodada 14, nominalmente (resposta real): o trecho literal e nada contraditório
  const R15 = (id: string) => caminho15(id, gravado(id))
  for (const [id, nome, lit] of [
    ['rev15-hazel-ninety', 'Hazel', 'ninety'], ['rev15-otto-barely-two', 'Otto', 'barely two'], ['rev15-edith-103', 'Edith', '103'], ['rev15-edith-103', 'Finn', '8'],
    ['rev15-nell-bea-twelve', 'Nell', 'twelve'], ['rev15-nell-bea-twelve', 'Bea', 'twelve'], ['pt-rev15-dona-zuleide', 'Zuleide', 'noventa e um anos'], ['pt-rev15-dona-zuleide', 'Rafael', 'vinte'],
    ['es-rev15-iker-ocho-meses', 'Íker', 'ocho meses'], ['rev15-bean-martha', 'Bean', 'nine'], ['rev15-bean-martha', 'Martha', '70'], ['rev15-rosa-delgado', 'Rosa', '45'], ['rev15-rosa-delgado', 'Pia', 'sixteen'],
    ['rev15-old-tom-nineteen', 'Tom', 'nineteen'], ['rev15-lorna-avo-95', 'Lorna', 'eleven'], ['rev15-sam-nurse-pirate', 'Sam', 'seventy-two'], ['rev15-wren-kit', 'Wren', '7'], ['rev15-wren-kit', 'Kit', '4 months old'],
  ] as const) {
    const f = R15(id).elenco.find((x) => x.nome.includes(nome))
    ok(!!f && f.canonica.includes(lit) && limpaDoAutor(f) && !f.canonica.includes(MARCA_CASTING), `${id}: ${nome} vai ao motor com "${lit}", sem faixa/pessoa nossa (${f?.canonica.slice(0, 110) ?? 'sem ficha'})`)
  }
  {
    const sam = R15('rev15-sam-nurse-pirate').elenco.find((x) => x.nome === 'Sam')
    ok(!!sam && sam.genero === null && !/\b(?:woman|man)\b/.test(sam.canonica), `Sam (o texto não diz o gênero): sem gênero (${sam?.canonica} / ${sam?.genero ?? 'null'})`)
    const lorna = R15('rev15-lorna-avo-95').elenco.find((x) => x.nome === 'Lorna')
    ok(!!lorna && !lorna.canonica.includes('95'), `Lorna: o 95 é do avô, nunca dela (${lorna?.canonica})`)
  }
  // (e) a cena forçada não apaga o coadjuvante descrito só pelo papel (elenco semântico com duas pessoas)
  for (const [id, cena, quem] of [
    ['rev15-wren-kit', 1, 'A baby in a stroller'], ['pt-rev15-dona-zuleide', 1, 'A young man helps his grandmother'], ['rev15-lorna-avo-95', 1, 'An old man in the armchair'],
    ['rev15-edith-103', 1, 'A young boy holds a silver stopwatch'], ['rev15-bean-martha', 2, 'An old woman turns the dial'], ['rev15-rosa-delgado', 1, 'A teenage girl ties down nets'],
  ] as const) {
    const r = R15(id)
    ok(r.elenco.filter((f) => f.tipo === 'humano').length >= 2 && !r.forcadas.includes(cena) && !r.fin[cena].startsWith('The only person in this shot'), `${id}: "${quem}" não vira o protagonista (forçadas=${r.forcadas.join(',') || '-'})`)
  }
  {
    const pessoa = (nome: string, protagonista: boolean): FichaDePersonagem => ({ nome, nucleo: nome, tipo: 'humano', canonica: `${nome}, x`, origem: 'autor', protagonista, genero: null })
    const bicho: FichaDePersonagem = { nome: 'the hedgehog', nucleo: 'hedgehog', tipo: 'animal', canonica: 'the hedgehog, x', origem: 'deterministica', protagonista: false, genero: null }
    const forca = (v: string, el: FichaDePersonagem[], porNome = true) => protagonistaEmTodaCena({ visuals: [v], elenco: el, porNome, mostraGente: visualMostraAlguem }).forcadas.length === 1
    ok(!forca('A baby in a stroller looks up at the planes.', [pessoa('Wren', true), pessoa('Kit', false)]), 'duas pessoas (semântico): a cena com gente sem nome fica como o escritor de cenas a descreveu')
    ok(forca('An old yellowed map unfolds in the beam of a flashlight.', [pessoa('Nell', true), pessoa('Bea', false)]), 'duas pessoas: a cena sem ninguém ainda ganha o protagonista (como a base)')
    ok(forca('A woman stands by the window.', [pessoa('Max', true)]) && forca('A toddler wobbles across the lawn.', [pessoa('Otto', true), bicho]), 'uma pessoa só (com ou sem bicho): a cena com gente sem nome continua forçada (o conserto de 26/10)')
    ok(forca('A baby in a stroller looks up at the planes.', [pessoa('Wren', true), pessoa('Kit', false)], false), 'sem o elenco semântico (porNome ausente): o casador de sempre, byte a byte')
  }
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
