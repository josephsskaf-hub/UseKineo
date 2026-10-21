// KINEO-META95-PERSONAGEM-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — guardião da FOLHA DE PERSONAGEM (o mesmo
// personagem nas 3 cenas). Prova, sem rede e sem render (fal e OpenAI falsos), EXECUTANDO a lib nova (lib/cinematic/folhaDePersonagem.ts),
// a lib real do crítico (lib/cinematic/criticoStill.ts, a de HOJE e a da BASE, lida do git) e o BLOCO REAL da rota (entre os marcadores
// ">>> … bloco" e "<<< … bloco"), com os roteiros REAIS do Dino (b3732cf0), do Ravan (18d89c1f), da biblioteca (f21beead) e do menino da moto (5a114e02):
//   I.  o interruptor: cliente com formatFlags = nada; conta interna sem o flag = nada; interna + "personagem" + motor clássico = liga; Estrela, Sora,
//       [faceless] e âncora desligada = nada; PERSONAGEM_PUBLIC é false no código;
//   E.  o elenco determinístico: Dino = criatura (dinossauro) nas cenas 2 e 3; Ravan = o menino (protagonista) + Ravan; "young man" é adulto;
//       o menino da moto entra nas 3 cenas pelo pronome; roteiro sem personagem = []; mesmo roteiro → mesma ficha;
//   C.  o casting: o pedido lista os nomes; a resposta boa vira 'modelo'; descrição humana para criatura, curta demais ou com "reference" = fica a
//       determinística; sem chave / 5xx / prazo = a determinística, nunca lança;
//   P.  os prompts: a folha (corpo inteiro, fundo neutro, look do filme), o still com folha (cena + quem está nela + identidade), o corpo do edit
//       = o da Estrela com a folha no image_urls; ANTES × DEPOIS no construtor REAL de cena: o Dino sem descrição → o Dino descrito em 2/2 cenas;
//   J.  o crítico: sem referência, pedido e leitura BYTE A BYTE iguais aos da lib da BASE ("identity" segue ignorado); com referência, 2 imagens,
//       a folha ANTES do still, o critério (5) no sistema, "identity" vira 'identidade', e a instrução positiva de identidade vem primeiro;
//   R.  a rota: toda linha marcada é import, declaração guardada, `if (personagem…)`, o `...(personagem.ativo ? …)` do ensaio ou está dentro do
//       bloco; o bloco EXECUTADO com o interruptor desligado não chama fornecedor nenhum e não toca sceneStills; ligado, faz 1 folha por
//       personagem, 1 edit por cena com personagem, 1 chamada do crítico com 2 imagens por still, refaz o still reprovado UMA vez (com a folha),
//       substitui sceneStills só nas cenas com personagem, grava cinematic_character_sheet e cinematic_still_critic (path_kind 'personagem');
//   D.  desfaz exato (cada arquivo tocado, desfeito, é a base), encadeado (semMeta95Ideia1910 chama este primeiro), o diff da entrega só toca a
//       lista + os novos, todo commit com a marca e o selo da TRAVA 8.2;
//   M.  mutantes: cada regra acima fica vermelha quando a quebramos de propósito (aplicação provada antes de medir).
import { MARCA_AVATAR_PRESO_2010 } from './test-support/desfaz-avatar-preso-2010.mjs' // reancorado KINEO-AVATAR-PRESO-2010 [TRAVA 8.2 — vai do fundador 20/10 "vai pra tudo"]: a camada do avatar preso não é desta entrega
import { MARCA_VERBATIM_INTOCAVEL_2010 } from './test-support/desfaz-verbatim-intocavel-2010.mjs' // reancorado KINEO-VERBATIM-INTOCAVEL-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]: as reâncoras do conserto do verbatim não são desta entrega (o D1 já as tira pela cadeia: desfaz-avatar-preso chama o desfaz do verbatim primeiro)
import { semHomeRemodela2010, HOME_REMODELA_2010_ARQUIVOS, HOME_REMODELA_2010_JSON, MARCA_HOME_REMODELA_2010 } from './test-support/desfaz-home-remodela-2010.mjs' // KINEO-HOME-REMODELA-2010 — a home e o menu remodelados (20/10, entrega de depois, com desfaz próprio) não são desta entrega
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  semMeta95Personagem2010, MARCA_META95_PERSONAGEM_2010, META95_PERSONAGEM_2010_BASE, META95_PERSONAGEM_2010_ARQUIVOS, META95_PERSONAGEM_2010_NOVOS,
  ACRESCIMOS_META95_PERSONAGEM_2010, TROCAS_META95_PERSONAGEM_2010,
} from './test-support/desfaz-meta95-personagem-2010.mjs'
import { semBebeQueFala2010 } from './test-support/desfaz-bebe-que-fala-2010.mjs' // reancorado KINEO-BEBE-QUE-FALA-2010 — o AI Kids Cartoon Stories (20/10) entrou depois e toca a rota, o desfaz do menu e o guardião da trilha: sai em memória antes do D1
import { MARCA_META95_ESCRITA_2010, META95_ESCRITA_2010_ARQUIVOS } from './test-support/desfaz-meta95-escrita-2010.mjs' // KINEO-META95-ESCRITA-2010 — reancorado: a legenda na escrita do roteiro (entrega de depois) mede até HEAD junto; os commits e arquivos dela saem da conta

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MARCA = MARCA_META95_PERSONAGEM_2010
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
// a base de comparação: a origin/main do ÚLTIMO merge desta entrega (2º pai do merge marcado mais novo); sem merge, a base da entrega
const BASE_CMP = (() => { try { const m = git('log', '--format=%H', '--merges', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean); return m.length ? git('rev-parse', `${m[0]}^2`).trim() : META95_PERSONAGEM_2010_BASE } catch { return META95_PERSONAGEM_2010_BASE } })()
const base = (rel) => { try { return lf(git('show', `${BASE_CMP}:${rel}`)) } catch { return null } }
let pass = 0
let fail = 0
function ok(cond, msg) { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg) } }
const tenta = (fn) => { try { return fn() } catch (e) { return [`exceção: ${e.message}`] } }

globalThis.fetch = () => { throw new Error('rede proibida no guardião') }

const F = {
  lib: 'lib/cinematic/folhaDePersonagem.ts',
  critico: 'lib/cinematic/criticoStill.ts',
  rota: 'app/api/generate-video-cinematic/route.ts',
  policy: 'lib/cinematic/visualPromptPolicy.ts',
  estrela: 'lib/estrelaDoFilme.ts',
  ideia: 'scripts/test-support/desfaz-meta95-ideia-1910.mjs',
}

// ─── carregador: módulo TS real → exports (imports resolvidos transpilando os arquivos reais; `over` troca um arquivo pelo texto mutado) ───
function carregador(over = {}, escopo = {}) {
  const cache = new Map()
  const carrega = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const src = over[rel] ?? rd(rel)
    const js = ts.transpileModule(src, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod.exports)
    const req = (n) => {
      if (n.startsWith('@/')) return carrega(`${n.slice(2)}.ts`)
      if (n.startsWith('./') || n.startsWith('../')) {
        const p = (rel.replace(/[^/]+$/, '') + n).split('/').reduce((acc, seg) => { if (seg === '..') acc.pop(); else if (seg !== '.' && seg !== '') acc.push(seg); return acc }, []).join('/')
        return carrega(`${p}.ts`)
      }
      throw new Error(`import inesperado ${n}`)
    }
    const nomes = Object.keys(escopo)
    new Function('module', 'exports', 'require', 'process', ...nomes, js)(mod, mod.exports, req, process, ...nomes.map((k) => escopo[k]))
    return mod.exports
  }
  return carrega
}

// ─── os casos reais (banco cqqukkvjjrguayiyjvhh, só leitura, 19-20/10) ───
const DINO = {
  script: 'HOOK: [Pexels: dark forest night] It was bedtime, but Dino heard a strange noise in the forest!\n\nMICRO REWARD 2: [Pexels: dinosaur blanket window] Dino: "Oh no!\n\nPAYOFF: [Pexels: fireflies glowing] Dino took a deep breath, opened the window... and found fireflies! The noise? Just a twig. The darkness wasn\'t so scary after all. Good night, Dino!',
  visuals: [
    'Close-up shot of rustling leaves and dark shadows in a dense forest at night, creating an eerie atmosphere as if something is lurking in the darkness.',
    'Close-up of Dino\'s worried face, eyes wide, as he, "Oh no!" in a dimly lit room with a dinosaur blanket visible behind him.',
    'Tracking shot of Dino peering out of a window, his face illuminated by the soft glow of fireflies dancing in the night sky, contrasting the earlier tension with a sense of wonder.',
  ],
  falas: ['It was bedtime, but Dino heard a strange noise in the forest!', 'Dino: "Oh no!', 'Dino took a deep breath, opened the window... and found fireflies! The noise? Just a twig.'],
}
const RAVAN = {
  script: 'HOOK (0-2s): [Pexels: colorful cartoon boy] A sad Indian boy stands beside a burnt Ravan effigy.\n\nMICRO REWARD 2: [Pexels: ravan face alive] Ravan\'s face comes alive, looking exhausted and annoyed.\n\nPAYOFF: [Pexels: cartoon boy shock] Ravan: "Bhai, I want to rest in peace... but people won\'t even let me rest in peace!" The boy stares in shock; Ravan rolls his eyes.',
  visuals: [
    'A close-up of a young Indian boy with tears in his eyes, standing beside a charred and burnt effigy of Ravan, the demon king, in a deserted street during dusk.',
    'A close-up of Ravan\'s painted face, looking exhausted and annoyed, with smoke swirling around it.',
    'A tracking shot following the Indian boy\'s face as he stares in shock at the Ravan effigy. The camera captures Ravan\'s eyes rolling in a comical way.',
  ],
}
const BIBLIOTECA = {
  script: 'HOOK: [Pexels: mysterious street at night] A library that only appears at midnight...\n\nMICRO REWARD 1: [Pexels: young man entering library] A young man enters, finding glowing books.\n\nMICRO REWARD 2: [Pexels: book with his name] He opens a book... with his name on it.\n\nPAYOFF: [Pexels: sister holding book] The next morning, his missing sister appears... holding the same book.',
  visuals: [
    'A dimly lit street shrouded in fog, the silhouette of an ornate library materializes as the clock strikes midnight, casting an eerie glow.',
    'A close-up of a young man\'s hands as he opens a dusty, book, the pages illuminated with a soft, ethereal light revealing his name.',
    'A soft morning light filters through a window as a young woman stands in the doorway, clutching the same glowing book, her expression a mix of relief and confusion.',
  ],
}
const MOTO = {
  script: 'Midnight. A boy rode his bike home through a haunted path. He agreed—only to learn... she was buried there three years ago. His bike stopped. Her photo... on a grave. He vanished. Only the sound of a bike remains at midnight.',
  visuals: ['A boy rode his bike home through a haunted path.', 'His bike stopped. Her photo... on a grave.', 'He vanished. Only the sound of a bike remains at midnight.'],
}
const SEM_PERSONAGEM = 'HOOK: [Pexels: deep ocean] The ocean hides three mysteries nobody can explain.\n\nMICRO REWARD 1: [Pexels: sonar screen] A sound recorded in 1997 was louder than any whale.\n\nPAYOFF: [Pexels: dark trench] Ninety percent of the deep sea has never been seen.'

// ═══ a lib real + a lib do crítico de hoje + a lib do crítico da base ═══
const L = carregador()(F.lib)
const S = carregador()('lib/cinematic/sceneStyle.ts')
const V = carregador()(F.policy)
const E = carregador()(F.estrela)

console.log('\nI. o interruptor (decidirPersonagem, executado)')
{
  const d = (o) => L.decidirPersonagem({ interna: true, pedido: ['personagem'], engine: 'seedance', anchorEnabled: true, estrelaAtiva: false, tagFaceless: false, ...o })
  ok(d({ interna: false }).ativo === false && d({ interna: false }).motivo === 'conta_de_fora', 'I1 cliente que manda formatFlags "personagem": nada muda (conta_de_fora)')
  ok(d({ pedido: ['f1', 'f2'] }).ativo === false && d({ pedido: undefined }).ativo === false && d({ pedido: 'f1,f3' }).motivo === 'nao_pedido', 'I2 conta interna sem o flag: nada muda (nao_pedido)')
  ok(d({}).ativo === true && d({ pedido: 'f1,personagem' }).ativo === true && d({ pedido: ['PERSONAGEM'] }).ativo === true && d({ engine: undefined }).ativo === true && d({ engine: 'kling' }).ativo && d({ engine: 'veo' }).ativo, 'I3 interna + "personagem" (lista ou texto, qualquer caixa) + Seedance (padrão) / Kling 2.5 / Veo = LIGA')
  ok(['sora', 'fast', 'hollywood', 'h3', 'omni', 's25'].every((m) => d({ engine: m }).ativo === false && d({ engine: m }).motivo.startsWith('motor_sem_folha')), 'I4 Sora, Kineo 1 e a estrada hollywood (fase 1) ficam de fora')
  ok(d({ anchorEnabled: false }).motivo === 'ancora_desligada' && d({ estrelaAtiva: true }).motivo === 'estrela_ativa' && d({ tagFaceless: true }).motivo === 'tag_faceless', 'I5 âncora desligada, Estrela ativa ou [faceless]: nada muda')
  ok(L.PERSONAGEM_PUBLIC === false && rd(F.lib).includes('export const PERSONAGEM_PUBLIC = false'), 'I6 PERSONAGEM_PUBLIC = false no código (só conta interna, por pedido)')
  ok(L.pedidoDePersonagem(['personagem']) && L.pedidoDePersonagem(' personagem ,f1') && !L.pedidoDePersonagem({ personagem: true }) && !L.pedidoDePersonagem('personagens') && !L.pedidoDePersonagem(null), 'I7 pedidoDePersonagem só aceita lista/texto com o item exato')
}

console.log('\nE. o elenco determinístico (roteiros reais)')
let elencoDino, elencoRavan, elencoBib, elencoMoto
{
  elencoDino = L.elencoDeterministico(DINO.script)
  ok(elencoDino.length === 1 && elencoDino[0].nome === 'Dino' && elencoDino[0].tipo === 'criatura' && /dinosaur/.test(elencoDino[0].canonica) && elencoDino[0].protagonista, `E1 Dino: 1 personagem, criatura "dinosaur", protagonista (${elencoDino[0]?.canonica?.slice(0, 60)}…)`)
  const cd = L.cenasComPersonagem(DINO.visuals, elencoDino)
  ok(JSON.stringify(cd.map((c) => c.nomes)) === JSON.stringify([[], ['Dino'], ['Dino']]), 'E2 Dino está nas cenas 2 e 3 (a floresta da cena 1 fica sem folha)')
  elencoRavan = L.elencoDeterministico(RAVAN.script)
  ok(elencoRavan.length === 2 && elencoRavan[0].nucleo === 'boy' && elencoRavan[0].protagonista && /\bboy\b.*nine years old/.test(elencoRavan[0].canonica) && elencoRavan[1].nome === 'Ravan' && !elencoRavan[1].protagonista && !/\bboy\b/.test(elencoRavan[1].canonica), `E3 Ravan: o menino (sem nome, protagonista, criança) + Ravan (nomeado, adulto) — ${elencoRavan.map((e) => e.nome).join(' / ')}`)
  const cr = L.cenasComPersonagem(RAVAN.visuals, elencoRavan)
  ok(cr[0].nomes.includes(elencoRavan[0].nome) && cr[1].nomes.join() === 'Ravan' && cr[2].nomes.length === 2, 'E4 Ravan: cena 1 = o menino, cena 2 = Ravan, cena 3 = os dois (2 folhas no mesmo edit)')
  elencoBib = L.elencoDeterministico(BIBLIOTECA.script)
  ok(elencoBib.length === 1 && elencoBib[0].nucleo === 'man' && /early twenties/.test(elencoBib[0].canonica) && !/nine years/.test(elencoBib[0].canonica) && elencoBib[0].genero === 'man', 'E5 "a young man" é adulto jovem (não menino)')
  const cb = L.cenasComPersonagem(BIBLIOTECA.visuals, elencoBib)
  ok(JSON.stringify(cb.map((c) => c.nomes.length)) === '[0,1,0]', 'E6 biblioteca: só a cena 2 cita o homem (a irmã da cena 3 não é ele; a rua da cena 1 não tem ninguém)')
  elencoMoto = L.elencoDeterministico(MOTO.script)
  const cm = L.cenasComPersonagem(MOTO.visuals, elencoMoto)
  ok(elencoMoto.length === 1 && elencoMoto[0].nucleo === 'boy' && cm.every((c) => c.nomes.length === 1), 'E7 o menino da moto: nas 3 cenas (cenas 2 e 3 pelo pronome "his/he" que continua a cena 1)')
  ok(L.elencoDeterministico(SEM_PERSONAGEM).length === 0 && L.elencoDeterministico('').length === 0, 'E8 documentário sem pessoa: elenco vazio (nada muda no filme)')
  ok(JSON.stringify(L.elencoDeterministico(DINO.script)) === JSON.stringify(elencoDino) && JSON.stringify(L.elencoDeterministico(RAVAN.script)) === JSON.stringify(elencoRavan), 'E9 determinístico: mesmo roteiro → a mesma ficha, byte a byte')
  const autor = L.elencoDeterministico('Keep the same keeper throughout: a middle-aged man with a short gray beard, a dark yellow raincoat and a black knit cap. The keeper climbs the tower. The keeper lights the lamp.')
  ok(autor.length >= 1 && autor[0].origem === 'autor' && /gray beard/.test(autor[0].canonica), 'E10 a ficha escrita pelo autor vence a determinística (origem "autor")')
  ok(L.cenasComPersonagem(['An empty street, no people, deserted at dawn.', 'He walks away.'], elencoMoto).every((c) => c.nomes.length === 0), 'E11 "no people / deserted" corta o personagem e o pronome não continua depois do corte')
}

console.log('\nC. o casting (gpt-4o-mini só refina; falha = a determinística)')
{
  const msgs = L.mensagensDoCasting(DINO.script, elencoDino)
  ok(msgs.length === 2 && msgs[0].role === 'system' && /JSON/.test(msgs[0].content) && msgs[1].content.includes('- Dino (creature)') && msgs[1].content.includes('SCRIPT:'), 'C1 o pedido lista cada personagem com o tipo e manda o roteiro')
  const bom = L.lerCasting('{"characters":[{"name":"Dino","description":"a small chubby bright-green dinosaur about the size of a child, cream belly, big round black eyes, short tail, tiny arms, a soft friendly face, no clothes, a little yellow star-shaped spot on the forehead"}]}', elencoDino)
  ok(bom[0].origem === 'modelo' && bom[0].canonica.startsWith('Dino, a small chubby bright-green dinosaur') && bom[0].tipo === 'criatura', 'C2 descrição boa → origem "modelo", nome na frente, espécie mantida')
  ok(L.lerCasting('{"characters":[{"name":"Dino","description":"a little boy with brown hair wearing pajamas and holding a dinosaur plush toy in a dark bedroom at night"}]}', elencoDino)[0].origem === 'deterministica', 'C3 descrição HUMANA para a criatura: recusada (o Dino não vira menino pelo casting)')
  ok(L.lerCasting('{"characters":[{"name":"Dino","description":"a green dinosaur"}]}', elencoDino)[0].origem === 'deterministica' && L.lerCasting('{"characters":[{"name":"Dino","description":"the same green dinosaur as in the reference photo with a cream belly and big round eyes and a short tail and tiny arms"}]}', elencoDino)[0].origem === 'deterministica' && L.lerCasting('x{', elencoDino)[0].origem === 'deterministica' && L.lerCasting('{"characters":[{"name":"Rex","description":"a huge grey tyrannosaurus with yellow eyes and a scarred snout and tiny arms and a long tail"}]}', elencoDino)[0].origem === 'deterministica', 'C4 curta, com "reference/same/photo", JSON quebrado ou nome que não é o listado: fica a determinística')
  const autor = L.elencoDeterministico('Keep the same keeper throughout: a middle-aged man with a short gray beard, a dark yellow raincoat and a black knit cap. The keeper climbs the tower.')
  ok(L.lerCasting('{"characters":[{"name":"' + autor[0].nome + '","description":"a young woman in her twenties with long blond hair, blue eyes, a white dress and sandals, smiling softly"}]}', autor)[0].origem === 'autor', 'C5 a ficha do autor não é trocada pelo modelo')
  const fetchOk = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"characters":[{"name":"Dino","description":"a small chubby bright-green dinosaur, cream belly, big round black eyes, short tail, tiny arms, a soft friendly face, no clothes"}]}' } }] }) })
  const fetch500 = async () => ({ ok: false, status: 500, json: async () => ({}) })
  const fetchPendura = (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e) }))
  const r1 = await L.elencoComCasting(DINO.script, elencoDino, { fetchImpl: fetchOk, apiKey: 'k' })
  const r2 = await L.elencoComCasting(DINO.script, elencoDino, { fetchImpl: fetch500, apiKey: 'k' })
  const r3 = await L.elencoComCasting(DINO.script, elencoDino, { fetchImpl: fetchPendura, apiKey: 'k', timeoutMs: 30 })
  const r4 = await L.elencoComCasting(DINO.script, elencoDino, { fetchImpl: fetchOk, apiKey: '' })
  const r5 = await L.elencoComCasting(SEM_PERSONAGEM, [], { fetchImpl: fetchOk, apiKey: 'k' })
  ok(r1.casting === 'modelo' && r1.elenco[0].origem === 'modelo', 'C6 chamada boa → modelo')
  ok(r2.casting === 'falhou' && r2.elenco[0].origem === 'deterministica' && r3.casting === 'falhou' && r3.elenco[0].canonica === elencoDino[0].canonica && r4.casting === 'sem_chave' && r5.casting === 'sem_elenco' && r5.elenco.length === 0, 'C7 5xx, prazo (abort), sem chave, sem elenco: a determinística, nunca lança')
}

console.log('\nP. os prompts (folha, still com folha, edit, ANTES × DEPOIS no construtor real)')
{
  const look = S.deriveStyleAnchor(DINO.script)
  const folha = L.promptDaFolha(elencoDino[0], look)
  ok(folha.startsWith('Character reference sheet, exactly one character, nobody else: ' + elencoDino[0].canonica) && /Full body visible from head to feet/.test(folha) && folha.includes(look.lookPhrase) && /no text/.test(folha) && /plain light grey studio background/.test(folha), 'P1 a folha: a canônica, corpo inteiro de frente, fundo liso, o look do filme, sem texto')
  const still = L.promptDoStillComFolha('X. ' + DINO.visuals[1], elencoDino)
  ok(still.startsWith('X. ' + DINO.visuals[1]) && still.includes('Character in this scene: Dino is a ') && /EXACTLY the character shown in the reference image/.test(still) && /Do not copy the reference pose or background/.test(still) && /no split screen, no collage/.test(still), 'P2 o still com folha: a cena, quem está nela, a identidade pela imagem, um quadro só')
  const dois = L.promptDoStillComFolha('Y.', elencoRavan)
  ok(dois.includes(`${elencoRavan[0].nome} is `) && dois.includes('; Ravan is '), 'P3 dois personagens na cena: os dois nomeados no mesmo pedido')
  const corpo = L.buildPersonagemEditInput('p', 'https://f/folha.jpg', '9:16')
  ok(JSON.stringify(corpo) === JSON.stringify(E.buildEstrelaEditInput('p', ['https://f/folha.jpg'], '9:16')) && corpo.image_urls[0] === 'https://f/folha.jpg' && corpo.num_images === 1 && corpo.resolution === '1K' && L.PERSONAGEM_EDIT_SLUG === E.ESTRELA_EDIT_SLUG && E.ESTRELA_EDIT_SLUG === 'fal-ai/nano-banana-pro/edit', 'P4 o corpo do edit = o da Estrela (nano-banana-pro/edit) com a folha no lugar das fotos')
  // ANTES × DEPOIS: o construtor REAL de cena (lib/cinematic/visualPromptPolicy buildClassicVisualPrompt) com a política de hoje × a da folha
  const antesPol = { mode: 'character_story', style: look, character: S.deriveStoryCharacter(DINO.script), aspect: '9:16' }
  const depoisPol = { mode: 'character_story', style: look, character: L.fichaDoProtagonista(elencoDino), elenco: L.elencoSecundario(elencoDino), aspect: '9:16' }
  const antes = DINO.visuals.map((v, i) => V.buildClassicVisualPrompt(v, { ...antesPol, opening: i === 0 }))
  const depois = DINO.visuals.map((v, i) => V.buildClassicVisualPrompt(v, { ...depoisPol, opening: i === 0 }))
  ok(antesPol.character === null && antes.every((p) => !/dinosaur with/.test(p)) && !antes[1].includes('consistent design'), 'P5 ANTES (hoje): deriveStoryCharacter(Dino) = null → nenhuma das 3 cenas diz o que o Dino é')
  ok(depois[1].includes('consistent design: ' + elencoDino[0].canonica) && depois[2].includes('consistent design: ' + elencoDino[0].canonica) && !depois[0].includes('consistent design') && depois[0] === antes[0], 'P6 DEPOIS: as 2 cenas do Dino levam a canônica (cena 1, sem o Dino, fica byte a byte a de antes)')
  const depoisRavan = RAVAN.visuals.map((v, i) => V.buildClassicVisualPrompt(v, { mode: 'character_story', style: S.deriveStyleAnchor(RAVAN.script), character: L.fichaDoProtagonista(elencoRavan), elenco: L.elencoSecundario(elencoRavan), aspect: '9:16', opening: i === 0 }))
  ok(depoisRavan[1].includes('Recurring characters, identical face, hair and costume in every scene where they appear: the ravan is ') && depoisRavan[0].includes('consistent design: ' + elencoRavan[0].canonica), 'P7 Ravan: o menino pela trilha da ficha (character), o Ravan pela do elenco (Recurring characters) — as duas trilhas que já existem')
  const custo15 = L.custoDoPersonagemUsd({ folhas: 1, stills: 3, criticos: 3, regeracoes: 0 })
  const custo35 = L.custoDoPersonagemUsd({ folhas: 2, stills: 4, criticos: 4, regeracoes: 0 })
  ok(custo15.usd > 0.4 && custo15.usd < 0.45 && custo35.usd > 0.55 && custo35.usd < 0.6 && L.custoDoPersonagemUsd({ folhas: 1, stills: 3, criticos: 3, regeracoes: 3 }).usd < 0.9, `P8 custo extra por filme: 15 s ≈ US$ ${custo15.usd} (3 cenas com folha), 35 s ≈ US$ ${custo35.usd}; pior caso 15 s < US$ 0,90`)
  const ensaio = L.ensaioDoPersonagem({ engine: 'seedance', elenco: elencoDino, casting: 'modelo', visuals: DINO.visuals, look })
  ok(ensaio.cenas_com_personagem === 2 && ensaio.folhas.length === 1 && ensaio.cenas[1].personagens.join() === 'Dino' && ensaio.custo_estimado_usd > 0 && ensaio.custo_pior_caso_usd > ensaio.custo_estimado_usd && ensaio.elenco[0].canonica === elencoDino[0].canonica, 'P9 o ensaio de $0: elenco, folhas, cenas com folha, custo estimado e pior caso (nada é gerado)')
}

console.log('\nJ. o crítico com e sem a folha (lib de hoje × lib da BASE, as duas executadas)')
{
  const criticoBaseSrc = base(F.critico)
  const C = carregador()(F.critico)
  const CB = carregador({ [F.critico]: criticoBaseSrc })(F.critico)
  const e = { indice: 1, url: 'https://f/still.jpg', mostra: DINO.visuals[1], fala: DINO.falas[1], prompt: 'p', seed: 7 }
  ok(criticoBaseSrc !== null && JSON.stringify(C.montarPedidoAoCritico(e, e.url)) === JSON.stringify(CB.montarPedidoAoCritico(e, e.url)), 'J1 sem referência: o pedido ao crítico é BYTE A BYTE o da lib da base (1 imagem, sistema de 4 critérios)')
  ok(JSON.stringify(C.lerRespostaDoCritico('{"verdict":"FAIL","issues":["identity"],"score":20}')) === JSON.stringify(CB.lerRespostaDoCritico('{"verdict":"FAIL","issues":["identity"],"score":20}')) && C.lerRespostaDoCritico('{"verdict":"FAIL","issues":["identity"],"score":20}').veredito === 'PASS', 'J2 sem referência: "identity" na resposta segue ignorado (gosto → PASS), como na base')
  ok(C.instrucaoDoCritico(['artefato', 'sujeito']) === CB.instrucaoDoCritico(['artefato', 'sujeito']) && C.instrucaoDoCritico(['texto']) === CB.instrucaoDoCritico(['texto']), 'J3 sem identidade a instrução da regeração é a da base (mesma ordem, mesmas frases)')
  const ref = { ...e, referencia: { url: 'https://f/folha.jpg', descricao: elencoDino[0].canonica } }
  const pedido = C.montarPedidoAoCritico(ref, ref.url)
  const partes = pedido.messages[1].content
  ok(pedido.imagens === 2 && partes.filter((p) => p.type === 'image_url').length === 2 && partes[1].text.startsWith('CHARACTER REFERENCE') && partes[1].text.includes(elencoDino[0].canonica) && partes[2].image_url.url === 'https://f/folha.jpg' && partes[3].text.startsWith('STILL TO CHECK (shot 2)') && partes[4].image_url.url === 'https://f/still.jpg', 'J4 com referência: 2 imagens, a folha ANTES do still, cada uma rotulada, a canônica no texto')
  ok(pedido.messages[0].content.startsWith(C.STILL_CRITIC_SISTEMA) && /\(5\) IDENTITY/.test(pedido.messages[0].content) && /"identity"/.test(pedido.messages[0].content) && pedido.caracteres > CB.montarPedidoAoCritico(e, e.url).caracteres, 'J5 com referência: o sistema de sempre + o critério (5) IDENTITY; o custo conta os 2 textos')
  const lido = C.lerRespostaDoCritico('{"verdict":"FAIL","issues":["identity","anatomy"],"reason":"a human boy, not a dinosaur","score":25}', true)
  ok(lido.veredito === 'FAIL' && lido.problemas.join() === 'identidade,anatomia' && C.instrucaoDoCritico(['anatomia', 'identidade']).startsWith('The named character exactly as in the reference image'), 'J6 com referência: "identity" vira "identidade", FAIL, e a instrução positiva de identidade vem PRIMEIRO na foto nova')
  ok(C.STILL_CRITIC_MODELO === CB.STILL_CRITIC_MODELO && !/'gpt-/.test(rd(F.critico).replace(/\/\/.*$/gm, '')), 'J7 nenhuma string crua de modelo nova no crítico (o modelo segue o do juiz do s25)')
}

console.log('\nR. a rota (linhas guardadas; o bloco real executado desligado e ligado)')
const rota = rd(F.rota)
function formaDasLinhas(src) {
  const probs = []
  const linhas = src.split('\n')
  const ini = linhas.findIndex((l) => l.includes('// >>> KINEO-META95-PERSONAGEM-2010 bloco'))
  const fim = linhas.findIndex((l) => l.includes('// <<< KINEO-META95-PERSONAGEM-2010 bloco'))
  if (ini < 0 || fim < 0 || fim <= ini) return ['marcadores do bloco ausentes']
  if (!linhas[ini + 1].trim().startsWith('if (personagem.ativo && anchorActive && !estrelaAtiva && personagemElenco.elenco.length > 0) {')) probs.push('o bloco não começa pela porta única')
  if (!linhas[fim - 1].trim().startsWith('} // KINEO-META95-PERSONAGEM-2010')) probs.push('o bloco não fecha a porta')
  const OK_FORA = [
    /^import \{/, /^\s*\/\//, /^\s*const personagemPedido = PERSONAGEM_PUBLIC \|\| \(isInternalEmail\(user\.email\) &&/,
    /^\s*if \(personagemPedido && !tagFacelessPresente && formatoVisual\.modo === 'documentary_faceless' && elencoDeterministico\(prompt\)\.length > 0\)/,
    /^\s*const personagem = decidirPersonagem\(\{ interna: isInternalEmail\(user\.email\), pedido: /, /^\s*if \(personagemPedido\) console\.log/,
    /^\s*let personagemRelatoFinal: RelatoPersonagem \| null = null/, /^\s*if \(personagemRelatoFinal\) response = \{ \.\.\.response, personagem: personagemRelatoFinal \}/,
    /^\s*const personagemElenco: \{ elenco: FichaDePersonagem\[\]; casting: string; ms: number \} = personagem\.ativo \? await elencoComCasting\(prompt, elencoDeterministico\(prompt\)\) : \{ elenco: \[\], casting: 'desligado', ms: 0 \}/,
    /^\s*if \(personagem\.ativo && !estrelaFicha && classicVisualMode === 'character_story' && personagemElenco\.elenco\.length > 0\) \{/,
    /^\s*\.\.\.\(personagem\.ativo \? \{ personagem: ensaioDoPersonagem\(/,
  ]
  linhas.forEach((l, i) => {
    if (!l.includes(MARCA)) return
    if (i > ini && i < fim) return
    if (!OK_FORA.some((re) => re.test(l))) probs.push(`linha marcada fora do bloco sem guarda: ${l.trim().slice(0, 90)}`)
  })
  return probs
}
ok(formaDasLinhas(rota).length === 0, 'R1 toda linha marcada fora do bloco é import, comentário ou está guardada por personagem/personagemPedido/personagemRelatoFinal', formaDasLinhas(rota).join(' | '))
ok(rota.includes("import { gerarStillDaEstrela } from '@/lib/estrelaServer' // KINEO-META95-PERSONAGEM-2010") && rota.includes("from '@/lib/cinematic/folhaDePersonagem' // KINEO-META95-PERSONAGEM-2010"), 'R2 os 2 imports novos são linhas próprias (o import do crítico de 14/10 não foi tocado)')
ok(!rota.includes('promptDaRegeracaoComFolha') && rota.split('\n').filter((l) => l.includes('gerarStillDaEstrela(')).every((l) => l.includes(MARCA)) && !base(F.rota).includes('gerarStillDaEstrela('), 'R3 gerarStillDaEstrela (1 still com referência) só é chamado em linhas desta entrega')

// o bloco REAL, executado com fornecedores falsos
function montaBloco(src, lib, critico, fakes) {
  const linhas = src.split('\n')
  const ini = linhas.findIndex((l) => l.includes('// >>> KINEO-META95-PERSONAGEM-2010 bloco'))
  const fim = linhas.findIndex((l) => l.includes('// <<< KINEO-META95-PERSONAGEM-2010 bloco'))
  const corpo = linhas.slice(ini + 1, fim).join('\n')
  const nomes = ['personagem', 'anchorActive', 'estrelaAtiva', 'personagemElenco', 'scenes', 'classicScenePrompts', 'wantsKling', 'wantsVeo', 'styleAnchor', 'generationSeed', 'aspectRequested', 'user', 'generationId', 'sceneStills', 'providerSubmissionMayExist', 'generateCinematicSceneStill', 'gerarStillDaEstrela', 'writeServerEvent', 'console', 'cenasComPersonagem', 'promptDaFolha', 'promptDoStillComFolha', 'relatoDoPersonagem', 'PERSONAGEM_MAX_STILLS', 'PERSONAGEM_EVENTO', 'novoFilmeDoCritico', 'modoDoCriticoDoStill', 'criticarStill', 'STILL_CRITIC_EVENTO']
  const fonte = `export async function bloco(ctx: any) {\n  let { ${nomes.join(', ')} } = ctx\n  let personagemRelatoFinal: any = null\n${corpo}\n  return { sceneStills, personagemRelatoFinal, providerSubmissionMayExist }\n}\n`
  const js = ts.transpileModule(fonte, { fileName: 'bloco.ts', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, () => { throw new Error('o bloco não importa') })
  return (ctx) => mod.exports.bloco({ ...lib, ...critico, ...fakes, ...ctx })
}
function fakes(respostas = {}) {
  const folhas = []
  const edits = []
  const pedidos = []
  const eventos = []
  let n = 0
  return {
    folhas, edits, pedidos, eventos,
    generateCinematicSceneStill: async (a) => { folhas.push(a); return respostas.folhaFalha ? null : `https://f/folha-${folhas.length}.jpg` },
    gerarStillDaEstrela: async (a) => { edits.push(a); n++; return respostas.editFalha ? { url: null, motivo: 'provider_failed' } : { url: `https://f/edit-${n}.jpg`, motivo: 'ok' } },
    fetch: async (_u, init) => {
      const corpo = JSON.parse(init.body)
      const imgs = corpo.messages[1].content.filter((p) => p.type === 'image_url').map((p) => p.image_url.url)
      pedidos.push({ imgs, sistema: corpo.messages[0].content, texto: corpo.messages[1].content.filter((p) => p.type === 'text').map((p) => p.text).join('\n') })
      const r = respostas[imgs[imgs.length - 1]] ?? { verdict: 'PASS', issues: [], reason: '', score: 85 }
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(r) } }], usage: { prompt_tokens: 6000, completion_tokens: 40 } }) }
    },
    writeServerEvent: async (ev) => { eventos.push(ev); return true },
    console: { log() {}, warn() {}, error() {} },
  }
}
async function rodaBloco(opcoes = {}) {
  const f = fakes(opcoes.respostas)
  const over = opcoes.over ?? {}
  const carrega = carregador(over, { fetch: f.fetch })
  const lib = carrega(F.lib)
  const critico = carrega(F.critico)
  process.env.OPENAI_API_KEY = 'chave-falsa'
  if (opcoes.modo === undefined) delete process.env.STILL_CRITIC_MODE
  else process.env.STILL_CRITIC_MODE = opcoes.modo
  const caso = opcoes.caso ?? DINO
  const elenco = opcoes.elenco ?? lib.elencoDeterministico(caso.script)
  const scenes = caso.visuals.map((v, i) => ({ aiPrompt: v, description: v, voiceover: caso.falas?.[i] ?? '' }))
  const sceneStills = scenes.map((_, i) => `https://f/flux-${i + 1}.jpg`)
  const ctx = {
    personagem: { ativo: opcoes.ativo ?? true, motivo: 'pedido_interno' }, anchorActive: opcoes.anchorActive ?? true, estrelaAtiva: opcoes.estrelaAtiva ?? false,
    personagemElenco: { elenco, casting: 'modelo', ms: 1 }, scenes, classicScenePrompts: scenes.map((s, i) => `${s.aiPrompt} Shot ${i + 1}.`), wantsKling: false, wantsVeo: false,
    styleAnchor: { lookPhrase: 'photorealistic, ultra-detailed' }, generationSeed: 63444935, aspectRequested: '9:16', user: { id: 'u-1' }, generationId: 'gen-1', sceneStills: sceneStills.slice(), providerSubmissionMayExist: false,
  }
  const executa = montaBloco(over[F.rota] ?? rota, lib, critico, f)
  let res
  try { res = await executa(ctx) } catch (e) { res = { erro: e.message } }
  delete process.env.STILL_CRITIC_MODE
  return { ...f, res, antes: sceneStills }
}
{
  const off = await rodaBloco({ ativo: false })
  ok(!off.res.erro && off.folhas.length === 0 && off.edits.length === 0 && off.pedidos.length === 0 && off.eventos.length === 0 && JSON.stringify(off.res.sceneStills) === JSON.stringify(off.antes) && off.res.personagemRelatoFinal === null && off.res.providerSubmissionMayExist === false, 'R4 DESLIGADO: o bloco roda e não chama folha, edit nem crítico; sceneStills intactos; sem evento; sem relato na resposta')
  const semElenco = await rodaBloco({ elenco: [] })
  const semAncora = await rodaBloco({ anchorActive: false })
  const comEstrela = await rodaBloco({ estrelaAtiva: true })
  ok([semElenco, semAncora, comEstrela].every((r) => !r.res.erro && r.folhas.length === 0 && r.edits.length === 0 && JSON.stringify(r.res.sceneStills) === JSON.stringify(r.antes)), 'R5 sem elenco, sem âncora ou com a Estrela: o bloco não faz nada')
  const on = await rodaBloco({})
  ok(!on.res.erro && on.folhas.length === 1 && on.folhas[0].scenePrompt.startsWith('Character reference sheet') && on.folhas[0].seed !== 63444935 && on.folhas[0].aspect === '9:16', `R6 LIGADO (Dino): 1 folha (FLUX), semente derivada da do filme, 9:16 ${on.res.erro ?? ''}`)
  ok(on.edits.length === 2 && on.edits.every((e) => e.imageUrls.length === 1 && e.imageUrls[0] === 'https://f/folha-1.jpg' && e.prompt.includes('Character in this scene: Dino is ') && e.engine === 'personagem:seedance' && e.userId === 'u-1'), 'R7 LIGADO: 1 edit por cena com o Dino (2), com a folha no image_urls e o prompt com identidade')
  ok(on.pedidos.length === 2 && on.pedidos.every((p) => p.imgs.length === 2 && p.imgs[0] === 'https://f/folha-1.jpg' && /\(5\) IDENTITY/.test(p.sistema) && p.texto.includes('CHARACTER REFERENCE')), 'R8 LIGADO: o crítico vê 2 imagens (folha + still) e o critério (5) em cada still com folha')
  ok(JSON.stringify(on.res.sceneStills) === JSON.stringify(['https://f/flux-1.jpg', 'https://f/edit-1.jpg', 'https://f/edit-2.jpg']) && on.res.providerSubmissionMayExist === true, 'R9 LIGADO: as cenas 2 e 3 trocam o FLUX pelo still com folha; a cena 1 fica com o FLUX; o claim fica protegido')
  const ev = on.eventos.find((e) => e.name === 'cinematic_character_sheet')
  ok(ev && ev.sessionId === 'gen-1' && ev.metadata.generation_id === 'gen-1' && ev.metadata.elenco[0].nome === 'Dino' && ev.metadata.cenas_com_personagem === 2 && ev.metadata.stills_ok === 2 && ev.metadata.fallback === 0 && ev.metadata.folhas === 1 && ev.metadata.critico.length === 2 && ev.metadata.extra_usd > 0.25 && JSON.stringify(on.res.personagemRelatoFinal) === JSON.stringify(ev.metadata).replace(/^\{"generation_id":"gen-1",/, '{'), 'R10 LIGADO: o evento cinematic_character_sheet (contagens, vereditos, custo) e o mesmo relato vai à resposta')
  ok(on.eventos.filter((e) => e.name === 'cinematic_still_critic').length === 2 && on.eventos.filter((e) => e.name === 'cinematic_still_critic').every((e) => e.metadata.path_kind === 'personagem' && e.metadata.modo === 'enforce'), 'R11 LIGADO: um cinematic_still_critic por still com folha, path_kind "personagem", modo enforce')
  const fail = await rodaBloco({ respostas: { 'https://f/edit-1.jpg': { verdict: 'FAIL', issues: ['identity'], reason: 'a human boy, not a dinosaur', score: 20 } } })
  ok(fail.edits.length === 3 && /The named character exactly as in the reference image/.test(fail.edits[2].prompt) && fail.edits[2].imageUrls[0] === 'https://f/folha-1.jpg' && fail.res.sceneStills[1] === 'https://f/edit-3.jpg' && fail.pedidos.length === 3 && fail.res.personagemRelatoFinal.critico.find((c) => c.cena === 2).regerou === true, 'R12 LIGADO: still reprovado por IDENTITY → UMA foto nova (edit com a folha + instrução positiva), julgada de novo e escolhida')
  const falha = await rodaBloco({ respostas: { folhaFalha: true } })
  ok(!falha.res.erro && falha.edits.length === 0 && JSON.stringify(falha.res.sceneStills) === JSON.stringify(falha.antes) && falha.res.personagemRelatoFinal.folhas === 0 && falha.res.personagemRelatoFinal.folhas_falhadas === 1 && falha.res.personagemRelatoFinal.stills_ok === 0, 'R13 folha que falha: nenhum edit, as cenas seguem com o FLUX de hoje, o relato conta a falha')
  const editFalha = await rodaBloco({ respostas: { editFalha: true } })
  ok(!editFalha.res.erro && JSON.stringify(editFalha.res.sceneStills) === JSON.stringify(editFalha.antes) && editFalha.res.personagemRelatoFinal.fallback === 2 && editFalha.pedidos.length === 0, 'R14 edit que falha (fornecedor/moderação): a cena volta ao FLUX e o crítico não roda à toa')
  const offCritico = await rodaBloco({ modo: 'off' })
  ok(offCritico.pedidos.length === 0 && offCritico.edits.length === 2 && offCritico.res.sceneStills[1] === 'https://f/edit-1.jpg', 'R15 STILL_CRITIC_MODE=off desliga só o crítico; a folha e o still com folha seguem')
  const ravan = await rodaBloco({ caso: RAVAN })
  ok(ravan.folhas.length === 2 && ravan.edits.length === 3 && ravan.edits.some((e) => e.imageUrls.length === 2) && ravan.pedidos.length === 3, 'R16 Ravan: 2 folhas, 3 edits (a cena 3 com as 2 folhas), 3 julgamentos')
}
ok(rota.includes("...(personagem.ativo ? { personagem: ensaioDoPersonagem({ engine: wantsKling ? 'kling' : wantsVeo ? 'veo' : 'seedance', elenco: personagemElenco.elenco, casting: personagemElenco.casting, visuals: scenes.map((s) => s.aiPrompt || s.stockSearchQuery || s.description), look: styleAnchor }) } : {}), // KINEO-META95-PERSONAGEM-2010"), 'R17 o ensaio de $0 (dry_run) mostra a folha só com o interruptor ligado')
ok(rota.includes("if (personagemPedido && !tagFacelessPresente && formatoVisual.modo === 'documentary_faceless' && elencoDeterministico(prompt).length > 0) Object.assign(formatoVisual, { modo: 'character_story'"), 'R18 com a folha pedida e um roteiro COM personagem, o faceless vira character_story (o mesmo movimento da Estrela e do romance); [faceless] vence')

console.log('\nD. desfaz, encadeamento, diff e commits')
{
  const probs = []
  for (const f of META95_PERSONAGEM_2010_ARQUIVOS) {
    const b = base(f)
    const d = tenta(() => lf(semMeta95Personagem2010(semHomeRemodela2010(semBebeQueFala2010(fs.readFileSync(path.join(ROOT, f), 'utf8'), f), f), f))) // KINEO-HOME-REMODELA-2010 — a home remodelada pôs 1 linha na cabeça da cadeia (desfaz-menu-ugc): sai antes // reancorado KINEO-BEBE-QUE-FALA-2010
    if (b === null) probs.push(`${f}: sem base`)
    else if (Array.isArray(d)) probs.push(`${f}: ${d[0]}`)
    else if (d !== b) probs.push(`${f}: desfeito ≠ base`)
    const marcadas = rd(f).split('\n').filter((l) => l.includes(MARCA)).length
    const esperadas = (ACRESCIMOS_META95_PERSONAGEM_2010[f] ?? 0) + (TROCAS_META95_PERSONAGEM_2010[f]?.length ?? 0)
    if (marcadas !== esperadas) probs.push(`${f}: ${marcadas} linhas marcadas, tabela diz ${esperadas}`)
  }
  ok(probs.length === 0, `D1 desfeita a entrega, cada arquivo tocado (${META95_PERSONAGEM_2010_ARQUIVOS.length}) é EXATAMENTE a base ${META95_PERSONAGEM_2010_BASE.slice(0, 10)}; contagem de marcas = tabela`, probs.join(' | '))
  ok(META95_PERSONAGEM_2010_NOVOS.every((f) => fs.existsSync(path.join(ROOT, f)) && base(f) === null), 'D2 os arquivos novos existem e não existem na base')
  ok(semMeta95Personagem2010('a\nb', F.rota) === 'a\nb' && semMeta95Personagem2010(`a\nb // ${MARCA}\nc`, 'outro.ts') === `a\nb // ${MARCA}\nc` && Array.isArray(tenta(() => semMeta95Personagem2010(`a\nx // ${MARCA}\nc`, F.rota))), 'D3 o desfaz é idempotente, só mexe nos arquivos da lista e lança com a marca fora da contagem')
  const ideia = rd(F.ideia)
  ok(ideia.includes("import { semMeta95Personagem2010 } from './desfaz-meta95-personagem-2010.mjs' // KINEO-META95-PERSONAGEM-2010") && ideia.includes('  texto = semMeta95Personagem2010(texto, rel) // KINEO-META95-PERSONAGEM-2010') && ideia.indexOf('semMeta95Personagem2010(texto, rel)') < ideia.indexOf('semHome3Cards1910(texto, rel)'), 'D4 encadeado: semMeta95Ideia1910 (a cabeça da cadeia da rota) tira ESTA camada primeiro')
  const I = await import(`${new URL('./test-support/desfaz-meta95-ideia-1910.mjs', import.meta.url).href}`)
  ok(!I.semMeta95Ideia1910(rota, F.rota).includes(MARCA) && I.semMeta95Ideia1910(rota, F.rota) === I.semMeta95Ideia1910(semMeta95Personagem2010(rota, F.rota), F.rota), 'D5 pela cadeia, a rota desfeita não tem mais a marca (e dá no mesmo chamar este antes)')
  // os commits DESTA entrega (sem os merges): o que cada um tocou, somado — merges da origin/main trazem arquivos alheios e ficam de fora da conta
  const marcados = (() => { try { return git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean) } catch { return [] } })()
  const tocados = [...new Set(marcados.flatMap((h) => git('diff-tree', '--no-commit-id', '--name-only', '-r', h).trim().split('\n').filter(Boolean)))]
  const permitidos = new Set([...META95_PERSONAGEM_2010_ARQUIVOS, ...META95_PERSONAGEM_2010_NOVOS])
  ok(marcados.length === 0 || tocados.every((f) => permitidos.has(f)), `D6 os commits da entrega só tocam a lista + os novos (${tocados.filter((f) => !permitidos.has(f)).join(', ') || 'ok'})`)
  // todo commit desde a base que toca um arquivo da entrega é desta entrega (marca + selo); os merges da origin/main também levam a marca e o selo
  const desdeABase = (() => { try { return git('log', '--format=%H%x09%s', `${BASE_CMP}..HEAD`).trim().split('\n').filter(Boolean).map((l) => { const [h, ...s] = l.split('\t'); return { h, s: s.join('\t') } }) } catch { return [] } })() // só o que NÃO está na origin/main mesclada: os commits desta entrega e os merges dela
  const commitsDaEntrega = desdeABase.filter(({ s }) => !s.includes('KINEO-BEBE-QUE-FALA-2010')) /* reancorado KINEO-BEBE-QUE-FALA-2010: os commits de 20/10 levam a marca deles */ .filter(({ h, s }) => s.includes(MARCA) || git('diff-tree', '--no-commit-id', '--name-only', '-r', '-m', h).trim().split('\n').some((f) => permitidos.has(f)))
  commitsDaEntrega.splice(0, commitsDaEntrega.length, ...commitsDaEntrega.filter(({ s }) => !s.includes(MARCA_META95_ESCRITA_2010))) // KINEO-META95-ESCRITA-2010 — reancorado: os commits (e o merge) da legenda na escrita do roteiro não são desta entrega
  commitsDaEntrega.splice(0, commitsDaEntrega.length, ...commitsDaEntrega.filter(({ s }) => !s.includes(MARCA_AVATAR_PRESO_2010))) // KINEO-AVATAR-PRESO-2010 — reancorado: os commits (e os merges) do avatar preso não são desta entrega
  commitsDaEntrega.splice(0, commitsDaEntrega.length, ...commitsDaEntrega.filter(({ s }) => !s.includes(MARCA_VERBATIM_INTOCAVEL_2010))) // reancorado KINEO-VERBATIM-INTOCAVEL-2010 — os commits do conserto do verbatim (reâncoras) não são desta entrega
  commitsDaEntrega.splice(0, commitsDaEntrega.length, ...commitsDaEntrega.filter(({ s }) => !s.includes('KINEO-MCP-STUDIO-AJUSTE-2010'))) // KINEO-MCP-STUDIO-AJUSTE-2010 — reancorado: os commits (e o merge da fila) do ajuste do conector não são desta entrega
  commitsDaEntrega.splice(0, commitsDaEntrega.length, ...commitsDaEntrega.filter(({ s }) => !s.includes(MARCA_HOME_REMODELA_2010))) // KINEO-HOME-REMODELA-2010 — reancorado: os commits (e o merge da fila) da home remodelada não são desta entrega
  commitsDaEntrega.splice(0, commitsDaEntrega.length, ...commitsDaEntrega.filter(({ s }) => !s.includes('KINEO-HOME-CARDS-CLAROS-2010'))) // KINEO-HOME-CARDS-CLAROS-2010 — reancorado: os commits do véu mais claro dos cards (fundador 20/10 23:30: "a parte de baixo dos vídeos tá bem escura, arruma isso pra hoje") não são desta entrega
  commitsDaEntrega.splice(0, commitsDaEntrega.length, ...commitsDaEntrega.filter(({ s }) => !s.includes('KINEO-AVATAR-ESTORNO-2010') && !s.includes('KINEO-LEGENDA-BENGALI-2010'))) // KINEO-AVATAR-ESTORNO-2010 — reancorado na integração 21/10: os commits do estorno do avatar abandonado e da legenda bengali (Codex) não são desta entrega
  ok(commitsDaEntrega.length > 0 && commitsDaEntrega.every(({ s }) => s.includes(MARCA) && s.includes('[TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]')), `D7 todo commit da entrega (e todo merge dela) traz a marca e o selo da TRAVA 8.2 (${commitsDaEntrega.length} commit(s); base ${BASE_CMP.slice(0, 10)})`, commitsDaEntrega.filter(({ s }) => !s.includes(MARCA)).map(({ s }) => s.slice(0, 60)).join(' | '))
  ok(fs.existsSync(path.join(ROOT, 'docs/META95-PERSONAGEM-2026-10-20.md')) && /formatFlags/.test(rd('docs/META95-PERSONAGEM-2026-10-20.md')), 'D8 o desenho está em docs/META95-PERSONAGEM-2026-10-20.md, com o jeito de ligar por pedido')
}

console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const libAtual = rd(F.lib)
const criticoAtual = rd(F.critico)
const troca = (txt, de, para) => (txt.includes(de) ? txt.split(de).join(para) : null)
const MUTANTES = [
  ['M1 cliente com o flag liga a folha', F.lib, troca(libAtual, "if (pediu && !args.interna && !PERSONAGEM_PUBLIC) return { ativo: false, motivo: 'conta_de_fora' }", ''), async () => L2().decidirPersonagem({ interna: false, pedido: ['personagem'], engine: 'seedance', anchorEnabled: true, estrelaAtiva: false, tagFaceless: false }).ativo === false],
  ['M2 a folha vira pública', F.lib, troca(libAtual, 'export const PERSONAGEM_PUBLIC = false', 'export const PERSONAGEM_PUBLIC = true'), async () => L2().PERSONAGEM_PUBLIC === false],
  ['M3 Sora ganha folha', F.lib, troca(libAtual, "export const PERSONAGEM_MOTORES = ['seedance', 'kling', 'veo'] as const", "export const PERSONAGEM_MOTORES = ['seedance', 'kling', 'veo', 'sora'] as const"), async () => L2().decidirPersonagem({ interna: true, pedido: ['personagem'], engine: 'sora', anchorEnabled: true, estrelaAtiva: false, tagFaceless: false }).ativo === false],
  ['M4 o Dino vira humano (dinossauro some do léxico de criaturas)', F.lib, troca(libAtual, "const CRIATURAS = 'dinosaur|dino|dragon|", "const CRIATURAS = 'dragon|"), async () => L2().elencoDeterministico(DINO.script)[0].tipo === 'criatura'],
  ['M5 o pronome não continua o personagem', F.lib, troca(libAtual, "    if (nomes.length === 0 && anterior.length > 0) {", '    if (false) {'), async () => L2().cenasComPersonagem(MOTO.visuals, L2().elencoDeterministico(MOTO.script)).every((c) => c.nomes.length === 1)],
  ['M6 o casting aceita descrição humana para a criatura', F.lib, troca(libAtual, " && !humanoNaDescricao", ''), async () => L2().lerCasting('{"characters":[{"name":"Dino","description":"a little boy with brown hair wearing pajamas and holding a dinosaur plush toy in a dark bedroom at night"}]}', L2().elencoDeterministico(DINO.script))[0].origem === 'deterministica'],
  ['M7 o still com folha perde a identidade', F.lib, troca(libAtual, '${PERSONAGEM_IDENTIDADE} ${PERSONAGEM_UM_QUADRO}', '${PERSONAGEM_UM_QUADRO}'), async () => /EXACTLY the character shown in the reference image/.test(L2().promptDoStillComFolha('X.', L2().elencoDeterministico(DINO.script)))],
  ['M8 a folha deixa de ser corpo inteiro', F.lib, troca(libAtual, 'Full body visible from head to feet, standing, facing the camera, ', ''), async () => /Full body visible from head to feet/.test(L2().promptDaFolha(L2().elencoDeterministico(DINO.script)[0], null))],
  ['M9 "identity" conta sem referência', F.critico, troca(criticoAtual, "(comIdentidade ? { ...PROBLEMA_DO_MODELO, ...PROBLEMA_IDENTIDADE } : PROBLEMA_DO_MODELO)", '({ ...PROBLEMA_DO_MODELO, ...PROBLEMA_IDENTIDADE })'), async () => C2().lerRespostaDoCritico('{"verdict":"FAIL","issues":["identity"],"score":20}').veredito === 'PASS'],
  ['M10 a folha não vai ao crítico', F.critico, troca(criticoAtual, "  if (e.referencia) parts.splice(1, 0, ", '  if (false) parts.splice(1, 0, '), async () => C2().montarPedidoAoCritico({ indice: 0, url: 's', mostra: 'm', fala: 'f', prompt: 'p', seed: 1, referencia: { url: 'r', descricao: 'd' } }, 's').messages[1].content.filter((p) => p.type === 'image_url').length === 2],
  ['M11 o sistema não ganha o critério (5)', F.critico, troca(criticoAtual, 'const sistema = e.referencia ? STILL_CRITIC_SISTEMA + STILL_CRITIC_IDENTIDADE : STILL_CRITIC_SISTEMA', 'const sistema = STILL_CRITIC_SISTEMA'), async () => /\(5\) IDENTITY/.test(C2().montarPedidoAoCritico({ indice: 0, url: 's', mostra: 'm', fala: 'f', prompt: 'p', seed: 1, referencia: { url: 'r', descricao: 'd' } }, 's').messages[0].content)],
  ['M12 a rota: o bloco roda desligado', F.rota, troca(rota, 'if (personagem.ativo && anchorActive && !estrelaAtiva && personagemElenco.elenco.length > 0) { // KINEO-META95-PERSONAGEM-2010', 'if (anchorActive && !estrelaAtiva && personagemElenco.elenco.length > 0) { // KINEO-META95-PERSONAGEM-2010'), async (over) => { const r = await rodaBloco({ ativo: false, over }); return r.folhas.length === 0 && r.edits.length === 0 }],
  ['M13 a rota: o still com folha não entra em sceneStills', F.rota, troca(rota, 'for (let i = 0; i < scenes.length; i++) if (stillsP[i]) sceneStills[i] = stillsP[i] // KINEO-META95-PERSONAGEM-2010', 'for (let i = 0; i < scenes.length; i++) if (stillsP[i]) void stillsP[i] // KINEO-META95-PERSONAGEM-2010'), async (over) => { const r = await rodaBloco({ over }); return r.res.sceneStills[1] === 'https://f/edit-1.jpg' }],
  ['M14 a rota: o crítico não recebe a folha', F.rota, troca(rota, 'referencia: { url: folhasDaCena(c)[0], descricao: fichas.map((f) => f.canonica).join(\'; \') } }, {', '}, {'), async (over) => { const r = await rodaBloco({ over }); return r.pedidos.every((p) => p.imgs.length === 2) }],
  ['M15 a rota: a foto nova não usa a folha', F.rota, troca(rota, "gerarStill: async (promptNovo, _seed, pollWindowMs) => (await gerarStillDaEstrela({ prompt: promptNovo, imageUrls: folhasDaCena(c), ", "gerarStill: async (promptNovo, _seed, pollWindowMs) => (await gerarStillDaEstrela({ prompt: promptNovo, imageUrls: [], "), async (over) => { const r = await rodaBloco({ over, respostas: { 'https://f/edit-1.jpg': { verdict: 'FAIL', issues: ['identity'], score: 20 } } }); return r.edits[2]?.imageUrls?.[0] === 'https://f/folha-1.jpg' }],
  ['M16 a rota: o evento da folha não é gravado', F.rota, troca(rota, "void writeServerEvent({ name: PERSONAGEM_EVENTO,", 'void (({ name: PERSONAGEM_EVENTO,'), async (over) => { const r = await rodaBloco({ over }); return r.eventos.some((e) => e.name === 'cinematic_character_sheet') }],
  ['M17 a rota: a Estrela ativa não desliga a folha', F.rota, troca(rota, 'if (personagem.ativo && anchorActive && !estrelaAtiva && personagemElenco.elenco.length > 0) { // KINEO-META95-PERSONAGEM-2010', 'if (personagem.ativo && anchorActive && personagemElenco.elenco.length > 0) { // KINEO-META95-PERSONAGEM-2010'), async (over) => { const r = await rodaBloco({ estrelaAtiva: true, over }); return r.edits.length === 0 }],
  ['M18 o desfaz: uma linha marcada a mais na rota', F.rota, rota.replace('    // <<< KINEO-META95-PERSONAGEM-2010 bloco', '    // <<< KINEO-META95-PERSONAGEM-2010 bloco\n    const x = 1 // KINEO-META95-PERSONAGEM-2010'), async (over) => { try { return lf(semMeta95Personagem2010(over[F.rota], F.rota)) === base(F.rota) } catch { return false } }],
  ['M19 o desfaz: uma troca deixa de ser reconhecida', F.critico, troca(criticoAtual, "const ORDEM: ProblemaStill[] = ['identidade', 'sujeito', 'anatomia', 'texto', 'artefato'] // KINEO-META95-PERSONAGEM-2010", "const ORDEM: ProblemaStill[] = ['identidade', 'sujeito', 'anatomia', 'texto', 'artefato'] // KINEO-META95-PERSONAGEM-2010 x"), async (over) => { try { return lf(semMeta95Personagem2010(over[F.critico], F.critico)) === base(F.critico) } catch { return false } }],
]
let mutLib = {}
const L2 = () => carregador(mutLib)(F.lib)
const C2 = () => carregador(mutLib)(F.critico)
let vermelhos = 0
for (const [nome, arq, txt, prova] of MUTANTES) {
  if (txt === null) { fail++; console.log(`  FALHA mutante ${nome}: âncora não encontrada`); continue }
  const original = arq === F.lib ? libAtual : arq === F.critico ? criticoAtual : rota
  if (txt === original) { fail++; console.log(`  FALHA mutante ${nome}: não aplicou`); continue }
  mutLib = { [arq]: txt }
  let verde
  try { verde = await prova(mutLib) } catch (e) { verde = `lançou: ${e.message}` }
  mutLib = {}
  if (verde === false) { vermelhos++; pass++; console.log(`  ok   mutante ${nome}: aplicou e ficou vermelho`) } else { fail++; console.log(`  FALHA mutante ${nome}: continuou verde (${verde})`) }
}
console.log(`\n${pass} ok · ${fail} falha(s) · ${vermelhos}/${MUTANTES.length} mutantes vermelhos · base ${META95_PERSONAGEM_2010_BASE.slice(0, 10)}`)
process.exit(fail === 0 ? 0 : 1)
