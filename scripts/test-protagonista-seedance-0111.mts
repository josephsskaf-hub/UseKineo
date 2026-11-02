// KINEO-PROTAGONISTA-SEEDANCE-0111 [TRAVA 8.2] — guardião do ELENCO SEMÂNTICO (lib/cinematic/elencoSemantico.ts).
// Offline: usa as respostas REAIS do gpt-4o-mini gravadas na calibração (docs/calibracao/protagonista-seedance-0111.json) como mock.
//   1. Calibração: as respostas gravadas, relidas pela conferência de hoje, dão 0 erro grave e ≥ 90% de acerto.
//   2. Falha segura: sem chave, erro de rede, HTTP 500, JSON inválido, prazo estourado → null e a rota fica com o elenco de sempre.
//   3. Caminho REAL do filme de 15 s da rota com BRO, Mila, Max (renders de 01/11) e controles: um pombo só, Mila gente, Max gente.
//   4. Conferência contra o texto (mutantes de resposta): nome fora do texto, espécie fora do texto, aparência inventada, lugar.
// Rodar: npx tsx scripts/test-protagonista-seedance-0111.mts
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { lerElencoSemantico, pedirElencoSemantico, aplicarElencoSemantico, fichaLiteralConferida, conferirFichaLiteral, aceitaPapelDasCenas, ELENCO_SEMANTICO_ORCAMENTO_MS, ELENCO_SEMANTICO_USD, type ElencoSemantico } from '../lib/cinematic/elencoSemantico'
import { elencoDoRoteiro, ajustarPromptsDoElenco } from '../lib/cinematic/personagemAjuste'
import { elencoComFichaLiteral, trocarFichaNoPrompt } from '../lib/cinematic/juizFicha'
import { elencoDoFilme15, protagonistaEmTodaCena, cenaCitaElenco, ORDEM_DO_PROTAGONISTA } from '../lib/filmes/filme15Elenco'
import { prepararQualidadeDoFilme } from '../lib/cinematic/filmQuality'
import { aplicarElencoEEpoca, mesmoPersonagem } from '../lib/cinematic/elencoEpoca'
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
}
const emTres = (texto: string) => { const fr = texto.split(/(?<=[.!?])\s+|\n+/).filter(Boolean); const falas = ['', '', '']; fr.forEach((x, i) => { const k = Math.min(2, Math.floor((i * 3) / fr.length)); falas[k] = `${falas[k]} ${x}`.trim() }); return { falas, prompts: falas.slice() } }
/** route.ts: elencoDoRoteiro → elenco semântico → elencoComFichaLiteral conferida (fichaLiteralConferida) → elencoDoFilme15 → protagonistaEmTodaCena → ajustarPromptsDoElenco → ORDEM → prepararQualidadeDoFilme (com os nomes do semântico) → ficha literal. */
function caminho15(id: string, sem: ElencoSemantico | null) {
  const c = porId.get(id)!
  const { falas, prompts } = PROD[id] ?? emTres(c.texto)
  const base = elencoDoRoteiro(c.texto)
  const aplicado = aplicarElencoSemantico(base, sem, c.texto)
  let pedido: FichaDePersonagem[] = aplicado ? aplicado.elenco : base
  const lit = fichaLiteralConferida(c.texto, pedido, aplicado)
  if (lit.literais.length > 0) pedido = lit.elenco
  const e15 = elencoDoFilme15({ elencoDoPedido: pedido, visuals: prompts, extrair: elencoDoRoteiro, completar: aplicado ? aceitaPapelDasCenas(c.texto) : true })
  const elenco = e15.elenco.length > 0 ? e15.elenco : pedido
  const p15 = e15.elenco.length > 0 ? protagonistaEmTodaCena({ visuals: prompts, elenco: e15.elenco, porNome: !!aplicado }) : null
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
  const inventada = lerElencoSemantico(j(ser({ name: 'Dino', appearance_from_text: 'red cape and golden boots' })), T)
  ok(inventada?.protagonist?.appearance_from_text === '', 'M3 aparência que o texto não diz: apagada')
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
  ok(!!luna && /\bcat\b/.test(luna.canonica) && !/a gata\b/.test(luna.canonica) && /in English: black/.test(luna.canonica), `Luna: gato em inglês + a aparência traduzida ao lado das palavras dela (${luna?.canonica})`)
  const faisca = fichaP('pt-faisca')
  ok(!!faisca && /\bdragon\b/.test(faisca.canonica) && !/dragao|dragão/.test(faisca.canonica.split('"')[0]), `Faísca: dragão em inglês (${faisca?.canonica})`)
  const bro = pt('pt-bro')
  ok(!!bro && bro.elenco[0].nome === 'BRO' && /pigeon/.test(bro.elenco[0].canonica) && bro.elenco.every((f) => !/unic/i.test(f.nome)), `BRO em português: aplicado, pombo, sem unicórnio (${bro?.elenco.map((f) => f.canonica).join(' | ')})`)
  const mila = pt('pt-mila')
  ok(!!mila && mila.elenco[0].nome === 'Mila' && mila.elenco[0].tipo === 'humano' && mila.elenco.every((f) => !/flower|flor|giant/i.test(f.canonica.split('"')[0])), `Mila em português: gente; o Skoczuś não vira a "flor gigante" da outra frase (${mila?.elenco.map((f) => f.nome).join(', ')})`)
  ok(!!mila && !/\ba woman\b|an adult/.test(mila.elenco[0].canonica), `Mila sem idade no texto: a ficha não diz "a woman" (${mila?.elenco[0].canonica})`)
  const ana = pt('pt-ana-avo')
  ok(!!ana && ana.elenco[0].nome === 'Ana' && ana.elenco.some((f) => f.nome === 'the grandfather' && f.nucleo === 'grandfather'), `Ana: o avô entra pelo papel em inglês, que casa com os visuais (${ana?.elenco.map((f) => `${f.nome}/${f.nucleo}`).join(', ')})`)
  const sofia = fichaP('es-sofia')
  ok(!!sofia && !/sixteen/.test(sofia.canonica) && /diecinueve/.test(sofia.canonica), `Sofía (diecinueve años): a idade é a do texto, não "about sixteen" (${sofia?.canonica})`)
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
  ok(!!ph && /red scarf/.test(ph.canonica) && /seven-year-old/.test(ph.canonica), `Hope: o "red scarf" e a idade do texto ficam (${ph?.canonica})`)
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
  // (1) aparência: palavra inteira e a sequência real
  const LEO = 'Leo was tired, but that night he walked to the harbor anyway. Leo was scared of the dark water.'
  ok(lerElencoSemantico(j({ name: 'Leo', appearance_from_text: 'red hat' }), LEO)?.protagonist?.appearance_from_text === '', 'D1 "red hat" não passa por "tired"/"that" (pedaço de palavra)')
  ok(lerElencoSemantico(j({ name: 'Leo', appearance_from_text: 'scar' }), LEO)?.protagonist?.appearance_from_text === '', 'D1 "scar" não passa por "scared"')
  ok(lerElencoSemantico(j({ name: 'Leo', appearance_from_text: 'tired, scared' }), LEO)?.protagonist?.appearance_from_text === '', 'D1 palavras inteiras mas soltas em frases distantes ("tired … scared"): não é sequência do texto')
  const HOPE = 'Hope, a seven-year-old in a red scarf, waits at the bus stop. Hope counts the snowflakes.'
  ok(lerElencoSemantico(j({ name: 'Hope', appearance_from_text: 'in a red scarf' }), HOPE)?.protagonist?.appearance_from_text === 'in a red scarf', 'D1 aparência que o texto escreve em sequência: fica ("in a red scarf")')
  ok(lerElencoSemantico(j({ name: 'Hope', appearance_from_text: 'scarf red' }), HOPE)?.protagonist?.appearance_from_text === '', 'D1 ordem trocada ("scarf red"): sai')
  ok(lerElencoSemantico(j({ name: 'Hope', appearance_from_text: 'with a red scarf' }), HOPE)?.protagonist?.appearance_from_text === 'with a red scarf', 'D1 palavra de ligação acrescentada pelo modelo ("with"): não derruba a aparência do texto')
  const MILA = 'Mila, with her turquoise hair and star-shaped backpack, returns to Rainbow Valley.'
  ok(lerElencoSemantico(j({ name: 'Mila', appearance_from_text: 'turquoise hair and star-shaped backpack' }), MILA)?.protagonist?.appearance_from_text === 'turquoise hair and star-shaped backpack', 'D1 hífen ("star-shaped") e plural continuam valendo')
  ok(lerElencoSemantico(j({ name: 'Mila', appearance_from_text: 'turquoise hairs' }), MILA)?.protagonist?.appearance_from_text === 'turquoise hairs', 'D1 plural simples ("hairs" = "hair")')
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
  const eagle = lerElencoSemantico(j({ name: 'BRO', kind: 'animal', species: 'pigeon', species_en: 'eagle', appearance_from_text: 'muscular, bald', appearance_en: 'blonde hair, red dress, carrying a rifle' }), BROEN)
  ok(eagle?.protagonist?.species === 'pigeon', `M5 texto em inglês: species_en "eagle" para "pigeon" não entra (${eagle?.protagonist?.species})`)
  ok(eagle?.protagonist?.appearance_en === '', 'M5 texto em inglês: appearance_en inventado não entra na ficha')
  const apEagle = aplicarElencoSemantico(elencoDoRoteiro(BROEN), eagle, BROEN)
  ok(!!apEagle && !/eagle|blonde|rifle/i.test(apEagle.elenco[0].canonica), `M5 a ficha não diz "a eagle" nem a aparência inventada (${apEagle?.elenco[0].canonica})`)
  const nurse = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Kai', kind: 'human', species: 'human', appearance_from_text: '' }, supporting: [{ name: null, role: 'old nurse', role_en: 'young doctor', kind: 'human', species: 'nurse', species_en: 'nurse', appearance_from_text: '' }], places_and_orgs: [] }), 'Kai wakes in the ward. The old nurse brings him water. Kai thanks the old nurse.')
  ok(nurse?.supporting[0]?.role === 'old nurse', `M5 texto em inglês: role_en que troca o papel ("young doctor") não entra (${nurse?.supporting[0]?.role})`)
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
  const notas = novos.map((c) => ({ c, n: avaliar(c, lerElencoSemantico(mocks.respostas[c.id], c.texto)) }))
  ok(notas.every(({ n }) => n.graves.length === 0), `mocks: 0 erro grave (${notas.filter(({ n }) => n.graves.length).map(({ c, n }) => `${c.id}:${n.graves.join(',')}`).join(' | ') || 'nenhum'})`)
  ok(notas.filter(({ n }) => n.acerto).length === notas.length, `mocks: ${notas.filter(({ n }) => n.acerto).length}/${notas.length} (${notas.filter(({ n }) => !n.acerto).map(({ c, n }) => `${c.id}:${n.erros.join(',')}`).join(' | ') || 'todos'})`)
  const leo = lerElencoSemantico(mocks.respostas['rev-tired-leo'], porId.get('rev-tired-leo')?.texto ?? casos.find((c) => c.id === 'rev-tired-leo')!.texto)
  ok(leo?.protagonist?.appearance_from_text === '', 'mock rev-tired-leo: o estado "tired, scared" no campo da aparência é apagado')
  const lince = casos.find((c) => c.id === 'es-fora-lince')!
  const apLince = aplicarElencoSemantico(elencoDoRoteiro(lince.texto), lerElencoSemantico(mocks.respostas['es-fora-lince'], lince.texto), lince.texto)
  ok(!!apLince && apLince.elenco[0].tipo === 'humano' && !/lynx/i.test(apLince.elenco[0].canonica), `mock es-fora-lince: o menino chamado Lince é gente (${apLince?.elenco[0].canonica.slice(0, 60)}…)`)
  const flecha = casos.find((c) => c.id === 'pt-fora-flecha')!
  const apFlecha = aplicarElencoSemantico(elencoDoRoteiro(flecha.texto), lerElencoSemantico(mocks.respostas['pt-fora-flecha'], flecha.texto), flecha.texto)
  ok(!!apFlecha && /\bturtle\b/.test(apFlecha.elenco[0].canonica) && !/tartaruga (?:with|anatomy)|a tartaruga\b/.test(apFlecha.elenco[0].canonica), `mock pt-fora-flecha: a ficha diz turtle em inglês (${apFlecha?.elenco[0].canonica.slice(0, 70)}…)`)
}

// ═══ 9. Revisão de 01/11 (rodada 7): aparência sem palavra inventada, trava _en em roteiro curto, nome no começo da frase ═══
console.log('== 9. Rodada 7: plural regular, aparência 100% do texto e colada por traço, inglês por padrão, nome no começo da frase ==')
{
  const j = (p: Record<string, unknown>, extra: Record<string, unknown> = {}) => JSON.stringify({ protagonist: { name: null, role: null, kind: 'human', species: 'human', appearance_from_text: '', gender_if_stated: null, age_if_stated: null, ...p }, supporting: [], places_and_orgs: [], ...extra })
  const ap = (texto: string, p: Record<string, unknown>) => lerElencoSemantico(j(p), texto)?.protagonist?.appearance_from_text
  // (1a) plural com "es" só depois de s/x/z/ch/sh
  ok(ap('Red-eyed Leo hates the rain. Leo stays inside.', { name: 'Leo', appearance_from_text: 'red hat' }) === '', 'R7-1 "red hat" não passa por "Red-eyed Leo hates" (hat ≠ hates)')
  ok(ap('The long night scares her. Ana waits for dawn.', { name: 'Ana', appearance_from_text: 'long scar' }) === '', 'R7-1 "long scar" não passa por "the long night scares" (scar ≠ scares)')
  ok(ap('Pim wears a red cap. Pim runs.', { name: 'Pim', appearance_from_text: 'red capes' }) === '', 'R7-1 "red capes" não passa por "a red cap" (cap ≠ capes)')
  ok(ap('Zoe loves her blue dresses. Zoe dances.', { name: 'Zoe', appearance_from_text: 'blue dress' }) === 'blue dress' && ap('Ivy wears ruby earrings and berries in her hair. Ivy sings.', { name: 'Ivy', appearance_from_text: 'berry in her hair' }) === 'berry in her hair', 'R7-1 plural regular continua valendo: dress = dresses, berry = berries')
  ok(ap('Bo wears thick glasses. Bo reads.', { name: 'Bo', appearance_from_text: 'thick glass' }) === 'thick glass', 'R7-1 glass = glasses (plural depois de "s")')
  // (1b) 100% das palavras de conteúdo: nenhuma inventada
  const LILA = 'Lila, with long red hair and a dress, walks to school. Lila smiles.'
  ok(ap(LILA, { name: 'Lila', appearance_from_text: 'long red hair and a blue dress' }) === '', 'R7-1 "long red hair and a BLUE dress" (1 palavra inventada em 5): sai inteira')
  ok(ap(LILA, { name: 'Lila', appearance_from_text: 'long red hair and a dress' }) === 'long red hair and a dress', 'R7-1 a mesma aparência sem a cor inventada: fica')
  // (1c) cada traço colado no texto: não recombina
  const NORA = 'Nora wore a blue dress, and her eyes were green. Nora waited.'
  ok(ap(NORA, { name: 'Nora', appearance_from_text: 'blue eyes' }) === '', 'R7-1 "blue eyes" de "a blue dress, and her eyes were green": recombinação, sai')
  ok(ap(NORA, { name: 'Nora', appearance_from_text: 'blue dress' }) === 'blue dress' && ap(NORA, { name: 'Nora', appearance_from_text: 'a blue dress, green' }) === 'a blue dress, green', 'R7-1 traço do texto ("blue dress") e traços separados por vírgula na ordem do texto: ficam')
  ok(ap(NORA, { name: 'Nora', appearance_from_text: 'green eyes' }) === '', 'R7-1 "green eyes" (ordem do traço trocada: "eyes were green"): sai')
  const apNora = aplicarElencoSemantico(elencoDoRoteiro(NORA), lerElencoSemantico(j({ name: 'Nora', appearance_from_text: 'blue eyes' }), NORA), NORA)
  ok(!!apNora && !/blue eyes/.test(apNora.elenco[0].canonica), `R7-1 a recombinação não vira ficha do autor (${apNora?.elenco[0].canonica.slice(0, 70)}…)`)
  // os exemplos do próprio prompt continuam passando
  ok(ap('BRO the muscular pigeon is bald. BRO lifts.', { name: 'BRO', kind: 'animal', species: 'pigeon', appearance_from_text: 'muscular, bald' }) === 'muscular, bald', 'R7-1 exemplo do prompt "muscular, bald" (traços separados): fica')
  ok(ap('Avocado, wearing sunglasses, surfs. Avocado wins.', { name: 'Avocado', kind: 'object', species: 'avocado', appearance_from_text: 'wearing sunglasses' }) === 'wearing sunglasses', 'R7-1 exemplo do prompt "wearing sunglasses": fica')

  // (2) roteiro inglês curto: a trava dos campos _en vale (era desligada em 28 dos 197 casos)
  const casos = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-casos.json'), 'utf8')) as Caso[]
  const BIS = casos.find((c) => c.id === 'rev-002')!.texto
  const bis = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Biscuit', kind: 'animal', species: 'cat', species_en: 'dog', appearance_from_text: 'grumpy orange', appearance_en: 'grumpy orange with a red collar and blue hat', gender_if_stated: 'male', age_if_stated: null }, supporting: [], places_and_orgs: [] }), BIS)
  const apBis = aplicarElencoSemantico(elencoDoRoteiro(BIS), bis, BIS)
  ok(bis?.protagonist?.species === 'cat' && bis.protagonist.appearance_en === '', `R7-2 rev-002 (Biscuit): species_en "dog" e acessórios inventados não entram (${bis?.protagonist?.species} / "${bis?.protagonist?.appearance_en}")`)
  ok(!!apBis && !/\bdog\b|collar|blue hat/.test(apBis.elenco[0].canonica), `R7-2 a ficha do Biscuit não diz "a dog" nem a coleira inventada (${apBis?.elenco[0].canonica.slice(0, 80)}…)`)
  const TOM = casos.find((c) => c.id === 'rev-081')!.texto
  const tom = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Tom', kind: 'animal', species: 'cat', species_en: 'dog', appearance_from_text: '', appearance_en: '' }, supporting: [], places_and_orgs: [] }), TOM)
  ok(tom?.protagonist?.species === 'cat', `R7-2 rev-081: "Tom the cat" continua gato (${tom?.protagonist?.species})`)
  const BRO1 = 'BRO, a muscular pigeon, lifts weights all day'
  const bro1 = lerElencoSemantico(JSON.stringify({ protagonist: { name: 'BRO', kind: 'animal', species: 'pigeon', species_en: 'eagle', appearance_from_text: 'muscular', appearance_en: 'muscular golden feathers' }, supporting: [], places_and_orgs: [] }), BRO1)
  ok(bro1?.protagonist?.species === 'pigeon' && bro1.protagonist.appearance_en === '', `R7-2 frase de uma linha: "BRO, a eagle" não sai (${bro1?.protagonist?.species})`)
  ok(lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Bob', kind: 'animal', species: 'pombo', species_en: 'pigeon', appearance_from_text: '', appearance_en: '' }, supporting: [], places_and_orgs: [] }), 'Bob, um pombo musculoso, levanta pesos o dia todo.')?.protagonist?.species === 'pigeon', 'R7-2 frase curta em português continua traduzindo ("pombo" → "pigeon")')
  ok(lerElencoSemantico(JSON.stringify({ protagonist: { name: 'Lía', kind: 'animal', species: 'gaviota', species_en: 'seagull', appearance_from_text: '', appearance_en: '' }, supporting: [], places_and_orgs: [] }), 'Lía, gaviota valiente, vuela hacia ríos lejanos.')?.protagonist?.species === 'seagull', 'R7-2 frase curta em espanhol (só acento como prova): "gaviota" → "seagull"')

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

  // os 9 casos novos da rodada 7 (fonte rev-0111c) com resposta MOCKADA: a conferência derruba o que o modelo inventou
  const mocks = JSON.parse(fs.readFileSync(path.join(raiz, 'scripts/test-support/protagonista-seedance-0111-mocks.json'), 'utf8')) as { respostas: Record<string, string> }
  const leMock = (id: string) => lerElencoSemantico(mocks.respostas[id], casos.find((c) => c.id === id)!.texto)
  const r7 = casos.filter((c) => c.fonte === 'rev-0111c')
  ok(r7.length === 9 && r7.every((c) => c.id in mocks.respostas), `R7 ${r7.length} casos rev-0111c no arquivo de casos, todos com mock (o calibrador os mede quando houver crédito)`)
  ok(['rev7-red-eyed-leo', 'rev7-long-night', 'rev7-lila-dress', 'rev7-nora-eyes'].every((id) => leMock(id)?.protagonist?.appearance_from_text === ''), 'R7 mocks: "red hat", "long scar", "…a blue dress", "blue eyes" apagados da aparência')
  const bisM = leMock('rev7-biscuit-curto')?.protagonist, broM = leMock('rev7-bro-uma-linha')?.protagonist
  ok(bisM?.species === 'cat' && bisM.appearance_en === '' && broM?.species === 'pigeon' && broM.appearance_en === '', `R7 mocks: roteiro inglês curto — Biscuit ${bisM?.species}, BRO ${broM?.species}, sem appearance_en inventado`)
  ok(leMock('pt-curto-nino')?.protagonist?.species === 'frog' && leMock('es-curto-lia')?.protagonist?.species === 'seagull', 'R7 mocks: frase curta PT/ES segue traduzindo (sapo → frog, gaviota → seagull)')
}

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
