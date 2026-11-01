// KINEO-PROTAGONISTA-SEEDANCE-0111 [TRAVA 8.2] — guardião do ELENCO SEMÂNTICO (lib/cinematic/elencoSemantico.ts).
// Offline: usa as respostas REAIS do gpt-4o-mini gravadas na calibração (docs/calibracao/protagonista-seedance-0111.json) como mock.
//   1. Calibração: as respostas gravadas, relidas pela conferência de hoje, dão 0 erro grave e ≥ 90% de acerto.
//   2. Falha segura: sem chave, erro de rede, HTTP 500, JSON inválido, prazo estourado → null e a rota fica com o elenco de sempre.
//   3. Caminho REAL do filme de 15 s da rota com BRO, Mila, Max (renders de 01/11) e controles: um pombo só, Mila gente, Max gente.
//   4. Conferência contra o texto (mutantes de resposta): nome fora do texto, espécie fora do texto, aparência inventada, lugar.
// Rodar: npx tsx scripts/test-protagonista-seedance-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import { lerElencoSemantico, pedirElencoSemantico, aplicarElencoSemantico, type ElencoSemantico } from '../lib/cinematic/elencoSemantico'
import { elencoDoRoteiro, ajustarPromptsDoElenco } from '../lib/cinematic/personagemAjuste'
import { elencoComFichaLiteral, trocarFichaNoPrompt } from '../lib/cinematic/juizFicha'
import { elencoDoFilme15, protagonistaEmTodaCena, ORDEM_DO_PROTAGONISTA } from '../lib/filmes/filme15Elenco'
import { prepararQualidadeDoFilme } from '../lib/cinematic/filmQuality'
import { aplicarElencoEEpoca } from '../lib/cinematic/elencoEpoca'
import { deriveStyleAnchor } from '../lib/cinematic/sceneStyle'
import type { FichaDePersonagem } from '../lib/cinematic/folhaDePersonagem'
import { avaliar, type Caso } from './test-support/avaliar-protagonista-seedance-0111.mts'

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
}
const emTres = (texto: string) => { const fr = texto.split(/(?<=[.!?])\s+|\n+/).filter(Boolean); const falas = ['', '', '']; fr.forEach((x, i) => { const k = Math.min(2, Math.floor((i * 3) / fr.length)); falas[k] = `${falas[k]} ${x}`.trim() }); return { falas, prompts: falas.slice() } }
/** route.ts: elencoDoRoteiro → elenco semântico → elencoComFichaLiteral → elencoDoFilme15 → protagonistaEmTodaCena → ajustarPromptsDoElenco → ORDEM → prepararQualidadeDoFilme (com os nomes do semântico) → ficha literal. */
function caminho15(id: string, sem: ElencoSemantico | null) {
  const c = porId.get(id)!
  const { falas, prompts } = PROD[id] ?? emTres(c.texto)
  const base = elencoDoRoteiro(c.texto)
  const aplicado = aplicarElencoSemantico(base, sem, c.texto)
  let pedido: FichaDePersonagem[] = aplicado ? aplicado.elenco : base
  const lit = elencoComFichaLiteral(c.texto, pedido)
  if (lit.literais.length > 0) pedido = lit.elenco
  const e15 = elencoDoFilme15({ elencoDoPedido: pedido, visuals: prompts, extrair: elencoDoRoteiro, completar: !aplicado })
  const elenco = e15.elenco.length > 0 ? e15.elenco : pedido
  const p15 = e15.elenco.length > 0 ? protagonistaEmTodaCena({ visuals: prompts, elenco: e15.elenco }) : null
  const aj = ajustarPromptsDoElenco({ prompts, visuals: p15 ? p15.visuals : prompts, falas, elenco })
  const out = aj.prompts.slice()
  const pp = elenco.find((f) => f.protagonista) ?? elenco[0]
  if (p15 && pp) for (const i of p15.forcadas) out[i] = ORDEM_DO_PROTAGONISTA(pp.canonica) + out[i]
  const ctx = `${c.texto} ${falas.join(' ')}`
  const q = prepararQualidadeDoFilme({ prompts: out, falas, contextoOriginal: ctx, contextoFiltro: ctx, modo: 'character_story', tagFaceless: false, style: deriveStyleAnchor(c.texto), elenco, aplicarContrato: false, elencoSemantico: aplicado ? { nomes: aplicado.nomes, protagonista: aplicado.protagonista } : null })
  let fin = q.prompts
  const lit2 = elencoComFichaLiteral(c.texto, elenco)
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
  const inventada = lerElencoSemantico(j(ser({ name: 'Dino', appearance_from_text: 'red cape and golden boots' })), T)
  ok(inventada?.protagonist?.appearance_from_text === '', 'M3 aparência que o texto não diz: apagada')
  const wolf = lerElencoSemantico(j(ser({ name: 'the old wolf', kind: 'animal', species: 'wolf' })), 'The old wolf falls behind. The wolf howls.')
  ok(wolf?.protagonist?.name === null && wolf?.protagonist?.role === 'old wolf', 'M4 descrição no campo do nome ("the old wolf") vira papel, nunca nome')
  ok(lerElencoSemantico(j(ser({ name: 'Pigeon Forge', kind: 'animal', species: 'pigeon' }), { places_and_orgs: ['Pigeon Forge'] }), 'Sarah drove to Pigeon Forge. Sarah vanished.') === null, 'M5 protagonista que o próprio modelo listou como lugar: descartado')
  ok(lerElencoSemantico(j(ser({ name: 'Sarah', kind: 'giraffe' })), 'Sarah vanished.') === null, 'M6 kind fora do contrato: descartado')
  const sup = lerElencoSemantico(JSON.stringify({ protagonist: ser({ name: 'Kai' }), supporting: [ser({ name: 'Biscuit', kind: 'animal', species: 'wolf' }), ser({ name: 'Biscuit', kind: 'animal', species: 'dog' })], places_and_orgs: [] }), 'Kai and his dog Biscuit walk. Biscuit swims.')
  ok(sup?.supporting.length === 1 && sup.supporting[0].species === 'dog', 'M7 coadjuvante com espécie fora do texto sai; o certo fica')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
