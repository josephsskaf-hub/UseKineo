// KINEO-DESCRITOR-FORTE-1911 · a volta do 2º ENSAIO A2 [CEO 19/11: 41 pedidos por dry_run, ~US$ 1,32; "aerial" 34/47 → 1/34; 21 melhores, 0 piores na cena].
// Node puro, sem rede: replay OFFLINE do 2º ensaio (docs/plano-da-fala-1911/ensaio-a2-2-replay.json, tirado de docs/decisoes-1911/tres-defeitos/ENSAIO-A2-2.json).
//   N · o portão de nome derrubou 6 filmes e 5 eram errados: só derruba obra/título, personagem de terceiro, marca de terceiro ou pessoa real que o texto NOVO
//       acrescenta (na AÇÃO do plano, ausente do texto de hoje). Roblox (224c4659) e Aaron (c92b352b) da linha de identidade, Mount Meru (b1ffe3ad, lugar),
//       Léo/Pen/Flamino (193e4465, do cliente), MIARA (98063aa2, marca do cliente) não derrubam; Amy Rose (ac9bb8f8, nova no texto) derruba.
//   S · o injetor colou "a shark" no plano do polvo (b9ddb528, 3 fatos): o sujeito só é exigido quando é do FILME (a 1ª ou a última fala o cita) e, se for coisa,
//       quando o último plano não traz a ficha de um personagem (b4de7d59: "a golden door" tirava o menino do fim).
//   R · 7 reprovações do juiz sem reescrita: por sujeito (4) a guarda do sujeito concreto barrava; por ficha (3) a_ficha não reescrevia. Agora: sujeito sem plano
//       apontado reescreve a última (o do juiz, pedido em forma concreta); a ficha em PARTE dos planos reescreve esses; a reescrita da última mantém o desfecho.
// Mutantes no fim.
import fs from 'node:fs'
import ts from 'typescript'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const ROTA = 'app/api/generate-video-cinematic/route.ts', LIB = 'lib/kling4PlanoDaFala1911.ts', SUJ = 'lib/cinematic/sujeitoObrigatorio.ts'
const R2 = JSON.parse(read('docs/plano-da-fala-1911/ensaio-a2-2-replay.json')).filmes
const g = (gen) => R2.find((f) => f.gen === gen)
const planoCom = (f, re) => f.revisto.findIndex((p) => re.test(p))
/** Extrai e executa um trecho da rota (do início da linha de `inicio` até o fim de `fim`) com o escopo dado; devolve `nome`. */
function daRota(rota, inicio, fim, nome, escopo) {
  const a = rota.lastIndexOf('\n', rota.indexOf(inicio)) + 1, b = rota.indexOf(fim, a)
  if (a <= 0 || b < 0) throw new Error(`trecho ${nome} não achado`)
  return Function(...Object.keys(escopo), ts.transpile(rota.slice(a, b + fim.length) + `\nreturn ${nome}`, { target: ts.ScriptTarget.ES2022 }))(...Object.values(escopo))
}

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  const load = createOfflineLoader({ globals: { Response, setTimeout, clearTimeout, AbortController }, source: (rel, src) => over[rel] ?? src })
  let L, S, Q
  try { L = load('@/' + LIB); S = load('@/' + SUJ); Q = load('@/lib/kling4QuatroPlanos') } catch (e) { return [`libs não carregam: ${e.message}`] }
  const rota = over[ROTA] ?? read(ROTA)

  // ── N · o portão de nome ──
  const n = (gen, nome, tipo, re) => { const f = g(gen), i = planoCom(f, re ?? new RegExp(nome, 'i')); return i < 0 ? null : L.nomeQueDerruba(nome, tipo, f.revisto[i], f.hoje) }
  no(n('224c4659', 'Roblox', 'third_party_brand') !== false, 'N1 224c4659: "Roblox" só na linha de identidade (do montador) e já no texto de hoje: não derruba')
  no(L.nomeQueDerruba('Roblox', 'third_party_brand', 'Photoreal film. Identity: the boy, a blocky Roblox boy. The boy runs home.', []) || !L.nomeQueDerruba('Roblox', 'third_party_brand', 'Photoreal film. A Roblox-style boy runs home.', []), 'N1b a ficha (Identity:) não conta; o nome na ação conta')
  no(n('b1ffe3ad', 'Mount Meru', 'place') !== false || n('b1ffe3ad', 'Mount Meru', 'work_or_title') !== false, 'N2 b1ffe3ad: "Mount Meru" é lugar (e está no Setting: e no texto de hoje): não derruba')
  no(n('c92b352b', 'Aaron', 'invented_by_customer') !== false || n('c92b352b', 'Léon', 'invented_by_customer') !== false, 'N3 c92b352b: Aaron e Léon são do cliente: não derrubam')
  no(n('193e4465', 'Flamino', 'invented_by_customer') !== false, 'N4 193e4465: Flamino (inventado pelo cliente) não derruba')
  no(n('98063aa2', 'MIARA', 'customer_own_brand') !== false, 'N5 98063aa2: MIARA é a marca do próprio cliente: não derruba')
  no(n('ac9bb8f8', 'Amy Rose', 'third_party_character') !== true, 'N6 ac9bb8f8: Amy Rose (personagem de terceiro) é NOVA no texto (hoje não tem) e está na ação: derruba')
  no(n('ac9bb8f8', 'Metal Sonic', 'third_party_character') !== false, 'N7 ac9bb8f8: Metal Sonic já está no texto de hoje: o novo não fica pior que hoje, não derruba por ele')
  { const f = g('ac9bb8f8'), chamadas = []
    const fetchImpl = async (u, i) => { chamadas.push(JSON.parse(i.body)); return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ achados: [
      { plano: 1, nome: 'Green Hills', tipo: 'place' }, { plano: 2, nome: 'Metal Sonic', tipo: 'third_party_character' }, { plano: 3, nome: 'Amy Rose', tipo: 'third_party_character' }, { plano: 4, nome: 'Amy Rose', tipo: 'third_party_character' }] }) } }] }), { status: 200 }) }
    const r = await L.planosComNomeProprio(f.revisto, { apiKey: 'x', fetchImpl, hoje: f.hoje, pedido: 'Sonic and Amy Rose race through time' })
    no(JSON.stringify(r) !== '[2,3]' || !/<<<Sonic and Amy Rose race through time>>>/.test(chamadas[0]?.messages?.[1]?.content ?? '') || !/invented_by_customer/.test(chamadas[0]?.messages?.[0]?.content ?? ''), `N8 o portão só aponta os planos com o nome de terceiro NOVO (${JSON.stringify(r)}); o pedido vai cercado como dado e a pergunta tem o tipo`) }
  no(!rota.includes("nomes: (p) => planosComNomeProprio(p, { hoje: hoje.planos, pedido:") || !rota.includes("nomes: (planos) => planosComNomeProprio(planos, { hoje: hojeDoNome1911(), pedido:"), 'N9 o eco e o envio passam o texto de hoje e o pedido ao portão de nome')

  // [revisor 19/11, 6ª passada] o texto de hoje do envio = os planos que hoje iriam ao motor: a pista de uma seção que não vira plano NÃO conta; a pista que vira
  // metade do molde de sempre (cena fundida) conta
  { const cenas = ['Photoreal film. A hedgehog runs through green hills at dawn.', 'Photoreal film. Two friends race toward a glowing portal.', 'Photoreal film. They cross the finish line together.']
    const hojeCom = (segs, falas) => { try { return daRota(rota, '    const hojeDoNome1911 = ', '}\n', 'hojeDoNome1911', { verbatim: true, kling4PlanoVariado: true, kling4PlanoPorSecao: true, kling4PromptsDasCenas1911: cenas, kling4ApprovedStills: [null, null, null], scenes: falas.map((v) => ({ voiceover: v })), planosPorSecao: Q.planosPorSecao, parsedScript: { segments: segs } })() } catch (e) { p.push(`N10 hojeDoNome1911 não executa: ${e.message}`); return [] } }
    const sozinhas = hojeCom([{ voiceover: 'A hedgehog runs.', pexelsQuery: 'hills' }, { voiceover: 'They race.', pexelsQuery: 'Amy Rose race portal' }, { voiceover: 'They win.', pexelsQuery: 'finish line' }], ['A hedgehog runs.', 'They race.', 'They win.'])
    no(sozinhas.length !== 3 || sozinhas.some((x) => /Amy Rose/.test(x)), 'N10 cena de uma seção só: a pista [Pexels: Amy Rose …] não vai ao motor hoje e não conta como "já estava hoje"')
    const fundidas = hojeCom([{ voiceover: 'A hedgehog runs.', pexelsQuery: 'hills' }, { voiceover: 'They race.', pexelsQuery: 'portal race' }, { voiceover: 'They meet Amy.', pexelsQuery: 'Amy Rose waving' }, { voiceover: 'They win.', pexelsQuery: 'finish line' }], ['A hedgehog runs.', 'They race. They meet Amy.', 'They win.'])
    no(fundidas.length !== 4 || !fundidas.some((x) => /Amy Rose/.test(x)), `N11 cena fundida: a metade do molde de sempre leva a pista ao motor hoje, então ela conta (${JSON.stringify(fundidas).slice(0, 200)})`) }
  // ── S · o sujeito exigido ──
  const ler = (o) => S.avaliarSujeito({ leitura: { ok: true, valor: { word_use: 'literal', reasoning: '', request_language: 'en', descartado: null, appearance: null, has_human: false, real_person: false, ...o }, ms: 1, model: 'x', tentativas: 1 } }).sujeito
  const tubarao = ler({ subject: 'sharks', subject_visual: 'a shark swimming in the ocean', head_noun: 'shark', kind: 'creature', mention_words: ['sharks'] })
  const porta = ler({ subject: 'a golden door with a wish', subject_visual: 'a golden door', head_noun: 'door', kind: 'object', mention_words: ['Tür'] })
  const trilheiros = ler({ subject: 'hikers', subject_visual: 'a group of hikers', head_noun: 'hikers', kind: 'person_generic', has_human: true, mention_words: ['hikers'] })
  no(!tubarao || !porta || !trilheiros, 'S0 os sujeitos de teste nascem do avaliador real')
  if (tubarao && porta && trilheiros) {
    no(S.sujeitoDoFilme(g('b9ddb528').falas, tubarao) || S.sujeitoExigidoNoUltimo(g('b9ddb528').falas, tubarao, 'Photoreal film. Octopus hearts.'), 'S1 b9ddb528: "sharks" só na 2ª fala de um vídeo de 3 fatos não é o sujeito do filme (nada exigido, nada injetado)')
    const ultimoB4 = g('b4de7d59').revisto[3]
    no(!/Visible: the young boy/.test(ultimoB4) || S.sujeitoExigidoNoUltimo(g('b4de7d59').falas, porta, ultimoB4), 'S2 b4de7d59: o último plano traz a ficha do menino: a porta (coisa) não é exigida e o desfecho não é trocado')
    no(!S.sujeitoExigidoNoUltimo(g('3505835b').falas, trilheiros, g('3505835b').revisto[3]), 'S3 3505835b: os caminhantes (gente) são exigidos no último plano mesmo com a ficha do homem')
  }
  no(!rota.includes("sujeito: (pl) => (atual.obrigatorio && sujeitoExigidoNoUltimo(parsedScript.segments.map((x) => x.voiceover), atual.obrigatorio, pl[pl.length - 1] ?? '') ? {") || !rota.includes("sujeito: (pl) => (sujeitoA2 && sujeitoExigidoNoUltimo(parsedScript.segments.map((x) => x.voiceover), sujeitoA2") || !rota.includes("&& !promptMostraOSujeito(r.prompts[k], s1911) && sujeitoExigidoNoUltimo(parsedScript.segments.map((x) => x.voiceover), s1911, r.prompts[k])) r.prompts[k] = comSujeitoNaCena(") || !rota.includes('const sujeitoA21911 = sujeitoDoFilme(parsedScript.segments.map((x) => x.voiceover), sujeitoLido1911) ? sujeitoLido1911 : null'), 'S4 a revisão (eco e envio) e o injetor do último plano usam a mesma regra do sujeito exigido')

  no(!/Keep in every item the visual style the request asks for/.test(L.REGRA_DO_PLANO_DA_FALA), 'S5 80d9a38d: o estilo que o pedido escreve (low-poly/PS1) fica em todo item')
  // ── R · a reescrita ──
  const sel = (gen) => { const f = g(gen); return L.secoesAReescrever(f.juiz, f.revisto.length, f.revisto.length, { planos: f.revisto }).map((x) => x + 1) }
  no(JSON.stringify(sel('876487b4')) !== '[3]' || JSON.stringify(sel('44d02f20')) !== '[4]' || JSON.stringify(sel('bf8989ad')) !== '[4]', `R1 as 3 reprovações por sujeito sem plano apontado e sem sujeito do leitor passam a reescrever a última (${sel('876487b4')} ${sel('44d02f20')} ${sel('bf8989ad')})`)
  no(JSON.stringify(sel('f133c184')) !== '[]', 'R2 f133c184: o juiz se contradiz (o Vesúvio está na ação): nada')
  no(JSON.stringify(sel('de85d652')) !== '[4]' || JSON.stringify(sel('3505835b')) !== '[4]' || JSON.stringify(sel('1c770cb7')) !== '[]', `R3 ficha reprovada em PARTE (de85d652, 3505835b: o plano 4) reescreve esse; em TODO plano (1c770cb7) é a ficha do elenco, nada (${sel('de85d652')} ${sel('3505835b')} ${sel('1c770cb7')})`)
  { const notas = []
    await L.revisarPlanosA2({ planos: () => g('b4de7d59').revisto, falas: () => g('b4de7d59').falas.concat(['x']).slice(0, 4), nSecoes: 4, rejulgar: false,
      julgar: async () => ({ status: 'JUDGED', falhas: ['e_final'], cenas_reescreveria: [], d_sujeito: 'ein Junge' }), nomes: async () => [], reescrever: async (alvo, nota) => { notas.push(nota) } })
    no(!/The LAST shot keeps the outcome its own narration line tells, never an earlier moment of the story: <<<x>>>/.test(notas[0] ?? ''), `R4 a reescrita da última mantém o desfecho da SUA fala, cercada como dado (b4de7d59 voltou à porta no beco) (${(notas[0] ?? '').slice(-200)})`)
    const nota = L.notaDaReescrita({ status: 'JUDGED', falhas: ['d_sujeito'], d_sujeito: 'alcohol sales in Saudi Arabia' }, {})
    no(!/alcohol sales in Saudi Arabia \(show it concretely/.test(nota), 'R5 sem sujeito do leitor, o do juiz vai pedido em forma concreta')
    no(/show it concretely/.test(L.notaDaReescrita({ status: 'JUDGED', falhas: ['d_sujeito'], d_sujeito: 'x' }, { sujeito: 'a small plane' })), 'R6 com o sujeito do leitor, ele vai como é') }
  return p
}

const MUT = [
  ['portão: nome inventado derruba', LIB, (s) => s.replace("export const TIPOS_DE_NOME_QUE_DERRUBAM: readonly string[] = ['work_or_title', 'third_party_character', 'third_party_brand', 'real_person']", "export const TIPOS_DE_NOME_QUE_DERRUBAM: readonly string[] = ['work_or_title', 'third_party_character', 'third_party_brand', 'real_person', 'invented_by_customer', 'customer_own_brand', 'place']")],
  ['portão: sem o texto de hoje', LIB, (s) => s.replace('  return !(hoje ?? []).some((h) => re.test(String(h ?? \'\')))\n', '  return true\n')],
  ['portão: o plano inteiro', LIB, (s) => s.replace('  if (!re.test(acaoDoPlano(plano))) return false\n', '  if (!re.test(plano)) return false\n')],
  ['portão: sem o pedido', LIB, (s) => s.replace("    user: `${opts.pedido ? `REQUEST: <<<${String(opts.pedido).slice(0, 1500)}>>>\\n\\n` : ''}", '    user: `')],
  ['rota: eco sem o hoje', ROTA, (s) => s.replace("nomes: (p) => planosComNomeProprio(p, { hoje: hoje.planos, pedido:", "nomes: (p) => planosComNomeProprio(p, { pedido:")],
  ['rota: envio sem o hoje', ROTA, (s) => s.replace("planosComNomeProprio(planos, { hoje: hojeDoNome1911(), pedido:", "planosComNomeProprio(planos, { pedido:")],
  ['rota: a pista do cliente conta como hoje', ROTA, (s) => s.replace('return q ? q.prompts : [...kling4PromptsDasCenas1911] }', 'return [...(q ? q.prompts : kling4PromptsDasCenas1911), ...parsedScript.segments.map((x) => x.pexelsQuery)] }')],
  ['rota: hoje sem as metades do molde', ROTA, (s) => s.replace('return q ? q.prompts : [...kling4PromptsDasCenas1911] }', 'return [...kling4PromptsDasCenas1911] }')],
  ['sujeito de qualquer fala', SUJ, (s) => s.replace("  return !!s && falas.length > 0 && (falaCita(falas[0] ?? '', s) || falaCita(falas[falas.length - 1] ?? '', s))", '  return !!s && falas.some((f) => falaCita(f, s))')],
  ['coisa exigida com ficha', SUJ, (s) => s.replace(" && (s.tipo === 'pessoa' || !FICHA_NO_PLANO_RE.test(String(ultimoPlano ?? '')))", '')],
  ['gente não exigida com ficha', SUJ, (s) => s.replace("(s.tipo === 'pessoa' || !FICHA_NO_PLANO_RE.test(String(ultimoPlano ?? '')))", "!FICHA_NO_PLANO_RE.test(String(ultimoPlano ?? ''))")],
  ['rota: injetor sem a regra', ROTA, (s) => s.replace(' && sujeitoExigidoNoUltimo(parsedScript.segments.map((x) => x.voiceover), s1911, r.prompts[k])) r.prompts[k] = comSujeitoNaCena(', ') r.prompts[k] = comSujeitoNaCena(')],
  ['rota: envio sem o sujeito do filme', ROTA, (s) => s.replace('const sujeitoA21911 = sujeitoDoFilme(parsedScript.segments.map((x) => x.voiceover), sujeitoLido1911) ? sujeitoLido1911 : null', 'const sujeitoA21911 = sujeitoLido1911')],
  ['sujeito sem sujeito do leitor não reescreve', LIB, (s) => s.replace(" && norm(v.d_sujeito).length >= 3) alvo.add(nSecoes - 1)", ' && false) alvo.add(nSecoes - 1)')],
  ['ficha não reescreve', LIB, (s) => s.replace("export const FALHAS_QUE_REESCREVEM: readonly string[] = ['a_ficha', 'c_criatura', 'd_sujeito', 'e_final']", "export const FALHAS_QUE_REESCREVEM: readonly string[] = ['c_criatura', 'd_sujeito', 'e_final']")],
  ['nota sem o desfecho', LIB, (s) => s.replace("${extra.ultimaNoAlvo && falaFinal ? ` The LAST shot keeps the outcome its own narration line tells, never an earlier moment of the story: <<<${falaFinal}>>>.` : ''}", '')],
  ['regra sem o estilo do pedido', LIB, (s) => s.replace("'\\n- Keep in every item the visual style the request asks for (for example low-poly, pixel art, claymation, anime, retro video game).'", "''")],
  ['nota sem a forma concreta', LIB, (s) => s.replace("${doLeitor ? '' : ' (show it concretely: the character, object, place or event that stands for it)'}", '')],
]
const p0 = await prova()
if (p0.length) { console.error('FAIL test-a2-ensaio2-volta-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await prova({ [arq]: m })).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-a2-ensaio2-volta-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-a2-ensaio2-volta-1911 (replay do 2º ensaio: portão de nome só pelo terceiro NOVO na ação — 5 derrubadas erradas viram 0, ac9bb8f8 segue; sujeito exigido só do filme e sem tirar a ficha do fim; 7 reprovações sem reescrita → 6 reescrevem, f133c184 contraditório; ${MUT.length} mutantes mortos)`)
