// KINEO-PROXIMO-EPISODIO-0111 — guardião do botão "Next episode" (vai do fundador 01/11 "vai tudo").
// Prova, com as funções REAIS e a rota nova executada offline (Supabase e escritor falsos, zero rede):
//   (1) a ficha do personagem é preservada palavra por palavra ("Roland Pernicus Oznard, a gruff old man with shoulder-length
//       gray-brown hair"; "BRO, a muscular grey city pigeon"; "MILO, a tiny cute blue milk carton…") e chega ao escritor do
//       episódio 2 (linha MAIN CHARACTER do prompt) e à ideia do Studio ("Main character: …");
//   (2) o assunto não desvia: episódio escrito que larga o personagem (o caso "little girl, named Mia" de 29/10) ou o tema
//       (janela de avião → mel) NÃO entra na ideia — o Studio recebe só a ficha + a história até aqui;
//   (3) a URL é a que o Studio lê: /studio?engine=&duration=&script_mode=ai&language=&prompt= (+ series_parent uuid);
//   (4) nada de preço/crédito literal na ideia nem na copy dos arquivos novos.
// Rodar: npx tsx scripts/test-proximo-episodio-0111.mts
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fichasExplicitas, blocoDeContinuidade, comFichaDoPedido } from '../lib/episodeContinuity'
import * as studioLib from '../lib/proximoEpisodioStudio'
import * as linkLib from '../lib/proximoEpisodioLink'
import * as textLanguage from '../lib/textLanguage'
import { deriveExplicitCharacter } from '../lib/cinematic/sceneStyle'

const { fichasDoFilme, episodioFicaNoAssunto, ideiaDoProximoEpisodio, linguaPelaEscrita, ganchoDoEpisodio } = studioLib
const { linkDoProximoEpisodio, filmeDeOrigemDoLink, motorDoStudio, duracaoDoStudio, ideiaDeReserva, NEXT_EPISODE_SOURCE, SERIES_PARENT_PARAM } = linkLib

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const ROLAND = 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair, shuffles to his mailbox every morning. Today the box is warm. Roland opens it and finds a letter with no stamp.'
const BRO = 'BRO, a muscular grey city pigeon, rules the rooftop of the old bakery. Every morning BRO fights the seagulls for the crumbs.'
const MILO = 'Generate a continuous visual story with CONSISTENT characters.\n\nA tiny cute blue milk carton named MILO.\n\nHe has small arms and legs, huge expressive brown eyes, tiny white sneakers, and a slightly crushed corner on the top of his carton.'
const JANELA = 'Two tragic crashes exposed a critical design flaw in the square airplane windows used in the aircraft construction. Round airplane windows spread the cabin pressure evenly.'

console.log('(1) a ficha é preservada')
ok(fichasExplicitas(ROLAND)[0] === 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair', `(1) Roland, verbatim: ${fichasExplicitas(ROLAND)[0]}`)
ok(fichasExplicitas(BRO)[0] === 'BRO, a muscular grey city pigeon', `(1) BRO, verbatim: ${fichasExplicitas(BRO)[0]}`)
ok(/^MILO, a tiny cute blue milk carton\b/.test(fichasExplicitas(MILO)[0] ?? '') && /huge expressive brown eyes/.test(fichasExplicitas(MILO)[0] ?? ''), `(1) "a … named MILO" + a aparência da frase seguinte: ${fichasExplicitas(MILO)[0]}`)
ok(fichasExplicitas(JANELA).length === 0, '(1) filme factual sem personagem: nenhuma ficha inventada')
ok(fichasExplicitas('In 1950, a C-54 Skymaster disappeared over the Yukon. Tehran, a city of 9 million, never sleeps.').length === 0, '(1) "In 1950, a C-54…" / "Tehran, a city…" não viram personagem')
ok(fichasDoFilme(ROLAND)[0] === 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair', '(1) fichasDoFilme prefere a ficha do autor')
const robo = fichasDoFilme('A tiny discarded robot collects broken toys and repairs them for lonely children. One day, the robot shuts down.')
ok(robo.length >= 1 && /robot/i.test(robo[0]) && !/hair|jacket|t-shirt|eyes/i.test(robo[0]), `(1) sem ficha escrita: o elenco do roteiro, só papel/espécie, sem aparência sorteada (${robo[0] ?? '-'})`)
const kali = fichasDoFilme('Kali and Kameron are ready to play! Kali swoops her toy plane high above the play table. Kameron points to the toy boat. Kali laughs.')
ok(kali.some((f) => /^Kali\b/.test(f)) && !kali.some((f) => /hair|wearing|t-shirt/i.test(f)), `(1) nomes do roteiro sem cara inventada (${kali.join(' | ')})`)

console.log('(1b) a ficha chega ao escritor do episódio 2 (lib/episodeContinuity → /api/next-episode)')
const bloco = blocoDeContinuidade({ anterior: ROLAND, narracaoOrigem: null })
ok(/^MAIN CHARACTER \(keep exactly[^\n]*\): Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair$/m.test(bloco), '(1b) linha MAIN CHARACTER com a ficha verbatim')
ok(/^SUBJECT TO CONTINUE \(stay on it\): /m.test(bloco) && /^FORMAT: /m.test(bloco), '(1b) as linhas de assunto e formato de 13/10 continuam')
const blocoPedido = blocoDeContinuidade({ anterior: 'Nobody wanted Milo, as he stood all alone on the bottom shelf.', narracaoOrigem: null, pedidoOrigem: MILO })
ok(/^MAIN CHARACTER [^\n]*: MILO, a tiny cute blue milk carton/m.test(blocoPedido), '(1b) a ficha escrita no PEDIDO (videos.topic) também chega, mesmo quando o EPISODE 1 é a narração')
const blocoRota = comFichaDoPedido(blocoDeContinuidade({ anterior: 'Nobody wanted Milo, as he stood all alone on the bottom shelf.', narracaoOrigem: null }), MILO)
ok(blocoRota === blocoPedido, '(1b) comFichaDoPedido (o caminho da rota) = o mesmo bloco')
ok(comFichaDoPedido('', MILO) === '' && comFichaDoPedido(bloco, MILO) === bloco, '(1b) bloco vazio fica vazio; bloco que já tem ficha não ganha outra')
const rotaFonte = rd('app/api/next-episode/route.ts')
ok(rotaFonte.includes('comFichaDoPedido(blocoDeContinuidade({ anterior, narracaoOrigem: memoria.narracaoOrigem }), memoria.topicOrigem)'), '(1b) a rota do escritor cola a ficha do pedido (videos.topic)')
ok(!/MAIN CHARACTER/.test(blocoDeContinuidade({ anterior: JANELA })), '(1b) filme factual: sem linha de personagem (o prompt de 13/10 fica igual)')
ok(blocoDeContinuidade({ anterior: 'ok' }) === '', '(1b) sem âncora: bloco vazio (o prompt de antes, byte a byte)')

console.log('(2) o assunto não desvia')
const epBom = { title: 'The Letter With No Stamp', script: 'HOOK\nRoland never expected the letter to answer back.\nMICRO REWARD\nThe paper was warm. Roland read the first line twice. It was written in his own handwriting.\nESCALATION\nMore letters came.\nPAYOFF\nThe last one was dated tomorrow.' }
const epMia = { title: 'A Gift Beyond Time', script: 'HOOK\nWhat happens when a forgotten toy comes to life?\nMICRO REWARD\nThe little girl, named Mia, hugs her glowing teddy bear.\nESCALATION\nShe runs.\nPAYOFF\nShe smiles.' }
ok(episodioFicaNoAssunto(epBom, { fichas: fichasDoFilme(ROLAND), assunto: '' }), '(2) episódio que cita o Roland: no assunto')
ok(!episodioFicaNoAssunto(epMia, { fichas: fichasDoFilme(ROLAND), assunto: '' }), '(2) episódio que troca o protagonista por "Mia": fora')
ok(!episodioFicaNoAssunto({ title: "The Secret of Honey's Longevity", script: 'HOOK\nHoney never spoils.\nMICRO REWARD\nArchaeologists found edible honey in tombs.' }, { fichas: [], assunto: JANELA }), '(2) factual: janela de avião → mel = fora')
ok(episodioFicaNoAssunto({ title: 'Why Windows Got Rounder', script: 'HOOK\nThe round airplane windows hide one more secret.\nMICRO REWARD\nThe windows have a tiny breather hole that balances cabin pressure.' }, { fichas: [], assunto: JANELA }), '(2) factual: próximo ângulo das janelas = no assunto')
const ideiaBoa = ideiaDoProximoEpisodio({ titulo: 'The Mailbox', pedido: ROLAND, narracao: ROLAND, episodio: epBom, episodeNumber: 3 })
ok(ideiaBoa.ideia.startsWith('Episode 3 of my series "The Mailbox".'), '(2) a ideia abre com o número do episódio e a série')
ok(ideiaBoa.ideia.includes('Main character: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair.'), '(2) a ideia carrega a ficha verbatim no rótulo "Main character:"')
ok(deriveExplicitCharacter(ideiaBoa.ideia) === 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair', '(2) o leitor de ficha da casa (sceneStyle deriveExplicitCharacter) reconhece a ficha na ideia')
ok(ideiaBoa.usouEpisodio && ideiaBoa.ideia.includes('This episode: The Letter With No Stamp. Roland never expected the letter to answer back.'), '(2) episódio no assunto: título + gancho novo entram')
ok(/do not repeat what already happened/.test(ideiaBoa.ideia), '(2) a ordem de não repetir os fatos')
const ideiaMia = ideiaDoProximoEpisodio({ titulo: 'The Mailbox', pedido: ROLAND, narracao: ROLAND, episodio: epMia, episodeNumber: 2 })
ok(ideiaMia.episodioFora && !ideiaMia.usouEpisodio && !/Mia|teddy/i.test(ideiaMia.ideia), '(2) episódio fora do assunto: descartado, nada de "Mia" na ideia')
ok(ideiaMia.ideia.includes('Main character: Roland Pernicus Oznard') && /Story so far: /.test(ideiaMia.ideia), '(2) sem o episódio, a ideia ainda leva ficha + história até aqui')
const ideiaFactual = ideiaDoProximoEpisodio({ titulo: 'Why airplane windows are round', pedido: 'Explore why airplane windows are round.', narracao: JANELA, episodio: null })
ok(!/Main character/.test(ideiaFactual.ideia) && /Stay on the same subject/.test(ideiaFactual.ideia) && /airplane windows/i.test(ideiaFactual.ideia), '(2) factual: sem personagem inventado, mesmo assunto, próximo ângulo')
const ep3 = ideiaDoProximoEpisodio({ titulo: 'Episode 2 of my series "The Mailbox". Main charac', pedido: ideiaBoa.ideia.replace('Episode 3', 'Episode 2'), narracao: 'Roland opened the second letter at dawn.', episodio: null })
ok(ep3.numero === 3 && ep3.ideia.startsWith('Episode 3 of my series "The Mailbox".') && ep3.ideia.includes('Main character: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair.'), '(2) episódio 3 nasce do 2: número da série, nome da série e a MESMA ficha (rótulo "Main character:" relido)')
ok(fichasExplicitas('Meet Pip, a brave little mouse with a red scarf, and Luna, an old owl.').join(' | ') === 'Pip, a brave little mouse with a red scarf | Luna, an old owl', '(1) dois personagens no mesmo parágrafo, "Meet" fora do nome')
ok(ganchoDoEpisodio(epBom.script) === 'Roland never expected the letter to answer back. The paper was warm. Roland read the first line twice.', '(2) gancho = HOOK + 2 frases do MICRO REWARD, sem rótulos')

console.log('(3) a URL é a que o Studio lê')
const PAI = '0b8f2c1e-5d3a-4c7b-9e21-7a6f5d4c3b2a'
const motor = motorDoStudio('cinematic_ai')
const dur = duracaoDoStudio(motor, 19)
ok(motor === 'seedance' && dur === '15', `(3) Seedance 1.5 de 19 s volta no Seedance a 15 s (${motor}/${dur})`)
ok(motorDoStudio('cinematic_hollywood') === 'hollywood' && duracaoDoStudio('hollywood', 64) === '60', '(3) Kling 3 de 64 s → hollywood 60')
ok(motorDoStudio('seedance') === 'seedance' && motorDoStudio('???') === null, '(3) chave do Studio passa; desconhecido = null (Studio no padrão)')
const href = linkDoProximoEpisodio({ prompt: ideiaBoa.ideia, engine: motor, duration: dur, language: 'pt', parentVideoId: PAI })!
ok(typeof href === 'string' && href.startsWith('/studio?'), '(3) começa em /studio?')
const u = new URL(href, 'https://www.usekineo.com')
ok(u.pathname === '/studio', '(3) caminho /studio')
ok(u.searchParams.get('engine') === 'seedance' && u.searchParams.get('duration') === '15' && u.searchParams.get('script_mode') === 'ai' && u.searchParams.get('language') === 'pt', '(3) engine, duration, script_mode=ai e language')
ok(u.searchParams.get('prompt') === ideiaBoa.ideia, '(3) prompt decodifica igual à ideia (quebras de linha e aspas incluídas)')
ok(u.searchParams.get('series') === '1' && u.searchParams.get('continuation_source') === NEXT_EPISODE_SOURCE && u.searchParams.get(SERIES_PARENT_PARAM) === PAI, '(3) atribuição: series=1, continuation_source, series_parent')
ok(filmeDeOrigemDoLink(u.searchParams) === PAI, '(3) o Studio lê o filme de origem de volta')
ok(!new URL(linkDoProximoEpisodio({ prompt: ideiaBoa.ideia, parentVideoId: 'x; drop table' })!, 'https://a.b').searchParams.has(SERIES_PARENT_PARAM), '(3) series_parent inválido não entra')
ok(new URL(linkDoProximoEpisodio({ prompt: ideiaBoa.ideia, language: '../evil' })!, 'https://a.b').searchParams.get('language') === 'en', '(3) língua inválida cai em en')
ok(linkDoProximoEpisodio({ prompt: 'oi' }) === null, '(3) sem ideia utilizável: null (nunca um /studio que pareça episódio)')
ok(ideiaDeReserva('Roland and the Mailbox').includes('"Roland and the Mailbox"') && ideiaDeReserva('') === '', '(3) ideia de reserva só com o título que a tela tem')
const ehStudio = rd('app/(dashboard)/studio/StudioClient.tsx')
ok(/sp\.get\('engine'\)/.test(ehStudio) && /sp\.get\('prompt'\)/.test(ehStudio) && /sp\.get\('language'\)/.test(ehStudio) && /sp\.get\('script_mode'\)/.test(ehStudio) && /Number\(sp\.get\('duration'\)\)/.test(ehStudio), '(3) o Studio lê exatamente estes parâmetros')
ok(linguaPelaEscrita('جريمة هزت ألمانيا عام ١٩٢٢... مقتل هينتركايڤك الغامض. آثار أقدام غامضة تقود من الغابة') === 'ar' && linguaPelaEscrita(JANELA) === null, '(3) língua pela escrita: árabe = ar; latino = null (o detector da casa decide)')

console.log('(3b) a rota nova, executada offline')
{
  const ts = createRequire(import.meta.url)('typescript')
  const fonte = rd('app/api/next-episode/studio/route.ts')
  const out = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const VID = '11111111-2222-4333-8444-555555555555'
  const linha = { id: VID, user_id: 'u1', title: 'The Mailbox', topic: ROLAND, script: ROLAND, quality_mode: 'cinematic_kling', duration: 38, duration_seconds: null }
  let eqs: Array<[string, unknown]> = []
  const supabase = { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: () => { eqs = []; const q: any = { select: () => q, eq: (c: string, v: unknown) => { eqs.push([c, v]); return q }, maybeSingle: async () => ({ data: eqs.every(([c, v]) => (linha as any)[c] === v) ? linha : null, error: null }) }; return q } }
  let pedidoAoEscritor: any = null
  let respostaDoEscritor: any = { status: 200, body: { title: epBom.title, script: epBom.script, episodeNumber: 2 } }
  class FakeReq { url: string; init: any; constructor(url: any, init: any) { this.url = String(url); this.init = init } async json() { return JSON.parse(this.init.body) } }
  const NextResponse = { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, ok: (init?.status ?? 200) < 400, body, json: async () => body }) }
  const mocks: Record<string, unknown> = {
    'next/server': { NextRequest: FakeReq, NextResponse },
    '@/lib/supabase/server': { createClient: () => supabase },
    '@/app/api/next-episode/route': { POST: async (r: any) => { pedidoAoEscritor = await r.json(); const s = respostaDoEscritor.status; return { status: s, ok: s < 400, json: async () => respostaDoEscritor.body } } },
    '@/lib/proximoEpisodioStudio': studioLib,
    '@/lib/proximoEpisodioLink': linkLib,
    '@/lib/textLanguage': textLanguage,
  }
  const mod: any = { exports: {} }
  new Function('require', 'module', 'exports', out)((id: string) => { if (id in mocks) return mocks[id]; throw new Error('import inesperado ' + id) }, mod, mod.exports)
  const chamar = (body: unknown) => mod.exports.POST({ json: async () => body, nextUrl: { origin: 'https://www.usekineo.com' } })
  const r1 = await chamar({ fromVideoId: VID })
  const u1 = new URL(r1.body.studioHref, 'https://x.y')
  ok(r1.status === 200 && u1.searchParams.get('engine') === 'kling' && u1.searchParams.get('duration') === '35' && u1.searchParams.get('language') === 'en', `(3b) motor e duração do filme de origem (Kling 2.5, 38 s → 35): ${u1.search.slice(0, 80)}`)
  ok(u1.searchParams.get('prompt')!.includes('Main character: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair.') && r1.body.usedEpisode === true, '(3b) a rota devolve a ideia com a ficha e o episódio escrito')
  ok(pedidoAoEscritor?.fromVideoId === VID && pedidoAoEscritor?.previousTopic === ROLAND && pedidoAoEscritor?.language === 'en', '(3b) o escritor de sempre recebe o filme, a narração real e a língua')
  ok(eqs.some(([c, v]) => c === 'user_id' && v === 'u1'), '(3b) leitura restrita ao dono (user_id)')
  respostaDoEscritor = { status: 429, body: { error: 'Too soon.' } }
  const r2 = await chamar({ fromVideoId: VID, language: 'es', engine: 'fast' })
  const u2 = new URL(r2.body.studioHref, 'https://x.y')
  ok(r2.status === 200 && r2.body.wroteEpisode === false && u2.searchParams.get('prompt')!.includes('Main character: Roland') && u2.searchParams.get('engine') === 'fast' && u2.searchParams.get('language') === 'es', '(3b) escritor em cooldown (429): o link sai com ficha + história, e o motor/língua que a tela pediu')
  respostaDoEscritor = { status: 200, body: epMia }
  const r3 = await chamar({ fromVideoId: VID })
  ok(r3.body.episodeOffTopic === true && !/Mia/.test(new URL(r3.body.studioHref, 'https://x.y').searchParams.get('prompt')!), '(3b) escritor fora do assunto: descartado da ideia')
  ok((await chamar({ fromVideoId: '00000000-0000-4000-8000-000000000000' })).status === 404, '(3b) filme de outra pessoa / inexistente: 404')
  ok((await chamar({ fromVideoId: 'nope' })).status === 400, '(3b) id inválido: 400')
}

console.log('(4) nada de preço literal')
const PRECO = /\$\s?\d|US\$|R\$|\b\d+\s?(?:credits?|cr)\b|\bcredits?\b/i
ok(!PRECO.test(ideiaBoa.ideia) && !PRECO.test(ideiaMia.ideia) && !PRECO.test(ideiaFactual.ideia) && !PRECO.test(ideiaDeReserva('X film')), '(4) a ideia não fala de preço nem de crédito')
for (const f of ['lib/proximoEpisodioLink.ts', 'lib/proximoEpisodioStudio.ts', 'lib/proximoEpisodioCliente.ts', 'app/api/next-episode/studio/route.ts']) {
  const codigo = rd(f).split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n')
  ok(!/\$\s?\d|US\$|R\$|\b\d+\s?(?:credits?|cr)\b/i.test(codigo), `(4) ${f}: sem número de preço/crédito no código`)
  ok(rd(f).includes('KINEO-PROXIMO-EPISODIO-0111'), `(4) ${f}: carrega o marcador`)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok, ${fail} falhas`)
if (fail) process.exit(1)
