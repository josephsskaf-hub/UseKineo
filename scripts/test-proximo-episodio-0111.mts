// KINEO-PROXIMO-EPISODIO-0111 — guardião do botão "Next episode" (vai do fundador 01/11 "vai tudo").
// Prova, com as funções REAIS e as rotas executadas offline (Supabase, escritor e OpenAI falsos, zero rede):
//   (S) KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — a ficha sai de UMA leitura semântica (lib/fichaDoEpisodio.ts), não de lista de
//       palavras. A chamada é MOCKADA com as respostas gravadas na calibração real (docs/calibracao/KINEO-PROXIMO-EPISODIO-0111.json,
//       84 casos + 8 episódios): cada caso dá o mesmo veredito offline, 0 falso positivo grave, todos os positivos;
//       falha segura (prazo, 5xx, JSON inválido, nome fora do texto, sem chave) = não mexe em nada; rótulo do autor sem modelo;
//       a mesma pessoa com variações de nome = uma ficha só;
//   (1) a ficha chega ao escritor do episódio 2 (linha MAIN CHARACTER) e à ideia do Studio ("Main character: …");
//   (2) o assunto não desvia: episódio que troca o protagonista NÃO entra na ideia;
//   (3) a URL é a que o Studio lê; a duração é o alvo (tela), o alvo pedido (evento) ou a medida (biblioteca);
//   (4) nada de preço/crédito literal na ideia nem na copy dos arquivos novos.
// Rodar: npx tsx scripts/test-proximo-episodio-0111.mts
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { blocoDeContinuidade, comFichaDoFilme, fichasRotuladas, mesmoSer, type FichaAplicada } from '../lib/episodeContinuity'
import * as ficha from '../lib/fichaDoEpisodio'
import * as studioLib from '../lib/proximoEpisodioStudio'
import * as linkLib from '../lib/proximoEpisodioLink'
import * as textLanguage from '../lib/textLanguage'
import { AI_TEXT_MODELS } from '../lib/aiModels'
import { deriveExplicitCharacter } from '../lib/cinematic/sceneStyle'

const { episodioFicaNoAssunto, ideiaDoProximoEpisodio, linguaPelaEscrita, ganchoDoEpisodio, nomeDaSerie, cortarNaPalavra } = studioLib
const { linkDoProximoEpisodio, filmeDeOrigemDoLink, motorDoStudio, duracaoDoStudio, ideiaDeReserva, NEXT_EPISODE_SOURCE, SERIES_PARENT_PARAM } = linkLib
const { lerFichaDoFilme, protagonistaDoEpisodio, lerRespostaDaFicha, corpoDaChamada, textoParaLeitura } = ficha

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const rd = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

// ── as respostas REAIS da calibração (gravadas por scripts/calibrar-ficha-episodio-0111.mts) ──
interface CasoGravado { id: string; pedido?: string; narracao?: string; protagonista: string[] | null; coadjuvantes?: string[]; opcional?: boolean; pessoas?: string[]; naoSeres?: string[]; umaFicha?: string; resposta_do_modelo: string | null }
interface EpGravado { id: string; titulo: string; script: string; segue: string | null; resposta_do_modelo: string | null }
const CALIB = JSON.parse(rd('docs/calibracao/KINEO-PROXIMO-EPISODIO-0111.json')) as { casos: CasoGravado[]; episodios: EpGravado[]; resultados: Array<{ id: string; obtido: { fichas: string[]; formato: string | null } }>; resumo: Record<string, unknown> }
const resposta = (content: string, status = 200) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { 'content-type': 'application/json' } })
/** fetch falso que responde pelo TEXTO lido: o caso gravado cujo texto está na mensagem do usuário. */
let chamadasFalsas = 0
const fetchGravado: typeof fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
  chamadasFalsas += 1
  const corpo = JSON.parse(String(init?.body ?? '{}'))
  const user = String(corpo?.messages?.[1]?.content ?? '')
  const ep = CALIB.episodios.find((e) => user.includes(e.script))
  if (ep?.resposta_do_modelo) return resposta(ep.resposta_do_modelo)
  const c = [...CALIB.casos].sort((a, b) => (b.narracao ?? b.pedido ?? '').length - (a.narracao ?? a.pedido ?? '').length).find((k) => (k.narracao && user.includes(k.narracao)) || (k.pedido && user.includes(k.pedido)))
  if (c?.resposta_do_modelo) return resposta(c.resposta_do_modelo)
  return resposta('{"format":"factual","protagonist":null,"supporting":[]}')
}) as typeof fetch
const OPC = { fetchImpl: fetchGravado, apiKey: 'test-offline' }
const nomeDe = (f: string) => f.split(',')[0].trim()
const casa = (nm: string, lista?: readonly string[]) => (lista ?? []).some((x) => mesmoSer(x, nm) || x.toLowerCase() === nm.toLowerCase())

const ROLAND = 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair, shuffles to his mailbox every morning. Today the box is warm. Roland opens it and finds a letter with no stamp.'
const MILO = 'Generate a continuous visual story with CONSISTENT characters.\n\nA tiny cute blue milk carton named MILO.\n\nHe has small arms and legs, huge expressive brown eyes, tiny white sneakers, and a slightly crushed corner on the top of his carton.'
const JANELA = 'Two tragic crashes exposed a critical design flaw in the square airplane windows used in the aircraft construction. Round airplane windows spread the cabin pressure evenly.'

console.log('(S) a leitura semântica, com as respostas gravadas da calibração real')
ok(CALIB.casos.length >= 40 && CALIB.casos.filter((c) => c.id.startsWith('banco-')).length >= 20 && CALIB.casos.every((c) => typeof c.resposta_do_modelo === 'string'), `(S) conjunto rotulado ≥ 40 casos (${CALIB.casos.length}), ≥ 20 do banco, todos com a resposta gravada`)
ok(CALIB.resumo.falsos_positivos_graves === 0 && CALIB.resumo.meta_ok === true, `(S) a calibração gravada bateu a meta (${JSON.stringify(CALIB.resumo)})`)
{
  let graves = 0, positivos = 0, acertos = 0, divergentes = 0
  for (const c of CALIB.casos) {
    const r = await lerFichaDoFilme({ pedido: c.pedido, narracao: c.narracao }, OPC)
    const fichas = r.aplicada?.fichas ?? []
    const gravado = CALIB.resultados.find((x) => x.id === c.id)
    if (JSON.stringify(fichas) !== JSON.stringify(gravado?.obtido.fichas ?? null)) { divergentes += 1; console.log('     divergente', c.id, JSON.stringify(fichas)) }
    const aceitos = [...(c.protagonista ?? []), ...(c.coadjuvantes ?? [])]
    for (const nm of fichas.map(nomeDe)) if (casa(nm, c.naoSeres) || (!casa(nm, aceitos))) { graves += 1; console.log('     FP', c.id, nm) }
    if (c.umaFicha && fichas.filter((f) => nomeDe(f).toLowerCase().includes(c.umaFicha!.toLowerCase())).length > 1) graves += 1
    if (c.protagonista && !c.opcional) { positivos += 1; if (r.aplicada?.formato === 'story' && fichas.length && casa(nomeDe(fichas[0]), c.protagonista)) acertos += 1 }
  }
  ok(divergentes === 0, `(S) offline = gravado: as ${CALIB.casos.length} respostas reais dão as mesmas fichas pela função de hoje (${divergentes} divergentes)`)
  ok(graves === 0, `(S) 0 falso positivo: lugar/empresa/moeda/metáfora/abertura nunca viram personagem (${graves})`)
  ok(positivos >= 20 && acertos / positivos >= 0.85, `(S) positivos: ${acertos}/${positivos} (meta ≥ 85%)`)
}
for (const id of ['banco-4b3b7668', 'banco-54fde4c4', 'inflacao-ladra', 'thanks-bitcoin', 'gracas-pix', 'segun-forbes', 'like-apple', 'titanic-olympic', 'kodak-company', 'satoshi', 'banco-e6eccede']) {
  const c = CALIB.casos.find((x) => x.id === id)!
  const r = await lerFichaDoFilme({ pedido: c.pedido, narracao: c.narracao }, OPC)
  ok(r.aplicada && r.aplicada.fichas.length === 0, `(S) revisão 3 / banco: ${id} sem ficha (${r.aplicada?.formato}) — "${(c.narracao ?? '').slice(0, 44)}…"`)
}
{
  const roland = await lerFichaDoFilme({ narracao: ROLAND }, OPC)
  ok(roland.aplicada?.origem === 'modelo' && /^Roland Pernicus Oznard, a gruff old man, with shoulder-length gray-brown hair$/.test(roland.aplicada.fichas[0] ?? ''), `(S) Roland: nome, espécie e aparência do texto (${roland.aplicada?.fichas[0]})`)
  const dup = CALIB.casos.find((x) => x.id === 'roland-duplo')!
  const rd2 = await lerFichaDoFilme({ narracao: dup.narracao }, OPC)
  ok(rd2.aplicada?.fichas.length === 1, `(S) "Roland Pernicus Oznard" + "Roland Oznard" = UMA ficha (${JSON.stringify(rd2.aplicada?.fichas)})`)
  // a mesma pessoa repetida pela leitura também vira uma só (merge em código, não só no prompt)
  const briggs = lerRespostaDaFicha('{"format":"story","protagonist":{"name":"Benjamin Briggs","species":"a man","appearance":""},"supporting":[{"name":"Briggs","species":"a careful sailor","appearance":""},{"name":"Captain Briggs","species":"a captain","appearance":""}]}', 'A man named Benjamin Briggs ran a boat. Briggs, a careful sailor. Captain Briggs smiled.')
  ok(briggs.leitura?.supporting.length === 0 && briggs.leitura?.protagonist?.name === 'Benjamin Briggs' && briggs.leitura?.protagonist?.species === 'a careful sailor', `(S) "Benjamin Briggs" / "Briggs" / "Captain Briggs" = um ser (${JSON.stringify(briggs.leitura)})`)
  const kali = lerRespostaDaFicha('{"format":"story","protagonist":{"name":"Kali Smith","species":"a girl","appearance":""},"supporting":[{"name":"Kameron Smith","species":"a boy","appearance":""}]}', 'Kali Smith and Kameron Smith play.')
  ok(kali.leitura?.supporting.length === 1, '(S) sobrenome em comum ("Kali Smith" / "Kameron Smith") continua sendo duas pessoas')
}
{
  // falha segura: não mexe em nada
  const lento: typeof fetch = ((_u: RequestInfo | URL, init?: RequestInit) => new Promise((_res, rej) => { init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))) })) as typeof fetch
  const t0 = Date.now()
  const r1 = await lerFichaDoFilme({ narracao: ROLAND }, { fetchImpl: lento, apiKey: 'x', prazoMs: 300, prazoTotalMs: 700 })
  ok(r1.aplicada === null && r1.auditoria.origem === 'falha' && r1.auditoria.erro === 'timeout' && Date.now() - t0 < 2_000, `(S) prazo estourado: ficha null, erro timeout, sem segurar a rota (${Date.now() - t0} ms, ${r1.auditoria.tentativas} tentativa)`)
  let n500 = 0
  const r2 = await lerFichaDoFilme({ narracao: ROLAND }, { fetchImpl: (async () => { n500 += 1; return resposta('', 500) }) as typeof fetch, apiKey: 'x' })
  ok(r2.aplicada === null && r2.auditoria.erro === 'http_500' && n500 === 2, `(S) 5xx: no máximo 1 tentativa extra (${n500} chamadas) e ficha null`)
  let n400 = 0
  const r2b = await lerFichaDoFilme({ narracao: ROLAND }, { fetchImpl: (async () => { n400 += 1; return resposta('', 400) }) as typeof fetch, apiKey: 'x' })
  ok(r2b.aplicada === null && n400 === 1, '(S) 400 (pedido ruim) não repete')
  const r3 = await lerFichaDoFilme({ narracao: ROLAND }, { fetchImpl: (async () => resposta('isto não é json')) as typeof fetch, apiKey: 'x' })
  ok(r3.aplicada === null && r3.auditoria.erro === 'json', '(S) JSON inválido: ficha null')
  const r3b = await lerFichaDoFilme({ narracao: ROLAND }, { fetchImpl: (async () => resposta('{"format":"story","protagonist":{"name":"Roland"},"supporting":[]}')) as typeof fetch, apiKey: 'x' })
  ok(r3b.aplicada === null && r3b.auditoria.erro === 'json', '(S) fora do esquema (sem species/appearance): ficha null')
  const r4 = await lerFichaDoFilme({ narracao: ROLAND }, { fetchImpl: (async () => resposta('{"format":"story","protagonist":{"name":"Mia","species":"a little girl","appearance":""},"supporting":[]}')) as typeof fetch, apiKey: 'x' })
  ok(r4.aplicada === null && r4.auditoria.erro === 'nome_fora_do_texto', '(S) nome que o texto não traz ("Mia" inventada): a leitura inteira cai, ficha null')
  const r5 = await lerFichaDoFilme({ narracao: 'The tiny robot fixes toys. You wake up.' }, { fetchImpl: (async () => resposta('{"format":"story","protagonist":{"name":"You","species":"a gladiator","appearance":""},"supporting":[{"name":"The robot","species":"a robot","appearance":""}]}')) as typeof fetch, apiKey: 'x' })
  ok(r5.aplicada?.formato === 'story' && r5.aplicada.fichas.length === 0, '(S) pronome ("You") e papel ("The robot") não são nome: sem ficha, sem derrubar a leitura')
  const semChave = process.env.OPENAI_API_KEY
  delete process.env.OPENAI_API_KEY
  let chamou = false
  const r6 = await lerFichaDoFilme({ narracao: ROLAND }, { fetchImpl: (async () => { chamou = true; return resposta('{}') }) as typeof fetch })
  if (semChave) process.env.OPENAI_API_KEY = semChave
  ok(r6.aplicada === null && r6.auditoria.erro === 'sem_chave' && !chamou, '(S) sem chave: nada é chamado, ficha null')
  const antes = chamadasFalsas
  const r7 = await lerFichaDoFilme({ pedido: 'Episode 2 of my series "The Mailbox".\nMain character: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair.\nAlso in the story: Luna, a curious girl.', narracao: 'Roland opened the second letter.' }, OPC)
  ok(r7.aplicada?.origem === 'autor' && chamadasFalsas === antes && r7.aplicada.fichas[0] === 'Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair' && r7.aplicada.fichas[1] === 'Luna, a curious girl', `(S) rótulo do autor ("Main character:" / "Also in the story:"): verbatim, precedência, sem modelo (${JSON.stringify(r7.aplicada?.fichas)})`)
  ok(fichasRotuladas('Main character: none.').length === 0, '(S) "Main character: none" não é ficha')
  const corpo = corpoDaChamada('x') as { model: string; temperature: number; response_format: { type: string; json_schema: { strict: boolean; schema: { required: string[] } } } }
  ok(corpo.model === AI_TEXT_MODELS.utility && corpo.temperature === 0 && corpo.response_format.type === 'json_schema' && corpo.response_format.json_schema.strict === true && corpo.response_format.json_schema.schema.required.join() === 'format,protagonist,supporting', '(S) gpt-4o-mini do registro, temperatura 0, json_schema estrito {format, protagonist, supporting}')
  ok(ficha.FICHA_PRAZO_MS === 4_000 && /Inflation, a silent thief/.test(ficha.FICHA_SISTEMA) && /proper NAME/.test(ficha.FICHA_SISTEMA) && /ACTS/.test(ficha.FICHA_SISTEMA), '(S) prazo de 4 s; a regra "nome E age; metáfora nunca" está no prompt')
  ok(textoParaLeitura({ pedido: ROLAND, narracao: ROLAND }) === `CREATOR'S REQUEST:\n${ROLAND}`, '(S) pedido e narração iguais = lidos uma vez (a rota do Studio e o escritor em processo dividem a mesma leitura)')
}
{
  console.log('(S2) quem o EPISÓDIO segue (filtro de assunto)')
  for (const e of CALIB.episodios) {
    const lido = await protagonistaDoEpisodio({ title: e.titulo, script: e.script }, OPC)
    ok(typeof lido === 'string' && (e.segue === null ? false : mesmoSer(lido, e.segue)), `(S2) ${e.id}: segue ${lido} (esperado ${e.segue})`)
  }
  const falhou = await protagonistaDoEpisodio({ title: 't', script: 'Roland woke.' }, { fetchImpl: (async () => resposta('lixo')) as typeof fetch, apiKey: 'x', tentativas: 1 })
  ok(falhou === undefined, '(S2) leitura do episódio que falha = undefined (o filtro fica só com a checagem determinística)')
}

console.log('(1) a ficha chega ao escritor do episódio 2 (lib/episodeContinuity → /api/next-episode)')
const FICHA_ROLAND: FichaAplicada = { formato: 'story', fichas: ['Roland Pernicus Oznard, a gruff old man, with shoulder-length gray-brown hair'], origem: 'modelo' }
const bloco = blocoDeContinuidade({ anterior: ROLAND, narracaoOrigem: null })
const comFicha = comFichaDoFilme(bloco, FICHA_ROLAND)
ok(/^MAIN CHARACTER \(keep exactly[^\n]*\): Roland Pernicus Oznard, a gruff old man, with shoulder-length gray-brown hair$/m.test(comFicha), '(1) linha MAIN CHARACTER com a ficha lida')
ok(/^SUBJECT TO CONTINUE \(stay on it\): /m.test(comFicha) && /^FORMAT: a story with characters/m.test(comFicha), '(1) assunto de 13/10 + FORMAT de história pela leitura')
ok(comFichaDoFilme(bloco, null) === bloco && !/MAIN CHARACTER/.test(bloco), '(1) leitura que falhou (null): o bloco de 13/10 sai byte a byte, sem MAIN CHARACTER')
ok(comFichaDoFilme('', FICHA_ROLAND) === '' && blocoDeContinuidade({ anterior: 'ok' }) === '', '(1) sem âncora: bloco vazio (o prompt de antes, byte a byte)')
const HINTER = 'In March 1922, on a secluded farm named Hinterkaifeck in the Bavarian woods, a family reported their house was haunted.'
const blocoHinter = blocoDeContinuidade({ anterior: HINTER })
ok(/FORMAT: a story with characters/.test(blocoHinter), '(1) controle: a linha de 13/10 ("named X") chamava o crime real de história')
const factual: FichaAplicada = { formato: 'factual', fichas: [], origem: 'modelo' }
ok(/FORMAT: same as episode 1/.test(comFichaDoFilme(blocoHinter, factual)) && !/MAIN CHARACTER|a story with characters/.test(comFichaDoFilme(blocoHinter, factual)), '(1) com leitura factual: FORMAT neutro e nenhuma ficha ("Hinterkaifeck, a secluded farm" morreu)')
ok(!/MAIN CHARACTER/.test(comFichaDoFilme(bloco, { formato: 'factual', fichas: ['X, a man'], origem: 'modelo' })), '(1) factual nunca leva MAIN CHARACTER')
const rotaFonte = rd('app/api/next-episode/route.ts')
ok(rotaFonte.includes('const ancoraDoFilme = blocoDeContinuidade({ anterior, narracaoOrigem: memoria.narracaoOrigem })') && rotaFonte.includes('const continuidade = comFichaDoFilme(ancoraDoFilme, fichaLida?.aplicada ?? null)'), '(1) a rota do escritor cola a ficha lida no bloco de 13/10')
ok(/const fichaLida = ancoraDoFilme \? await lerFichaDoFilme\(\{ pedido: memoria\.topicOrigem, narracao: memoria\.narracaoOrigem \|\| anterior \}, \{ prazoTotalMs: 5_000 \}\) : null/.test(rotaFonte), '(1) só lê a ficha quando há âncora, com teto de 5 s')
ok(/AbortSignal\.timeout\(Math\.max\(18_000, 25_000 - gastoFicha\)\)/.test(rotaFonte), '(1) o escritor desconta o tempo da leitura (a rota tem 30 s)')
ok(/metadata: \{ \.\.\.ep, \.\.\.\(ficha \? \{ ficha_semantica: ficha \} : \{\}\) \}/.test(rotaFonte) && /guardarEpisodio\(user\.id, fromVideoId, paraGravar, fichaLida\?\.auditoria \?\? null\)/.test(rotaFonte), '(1) a leitura vai para a auditoria do next_episode_written')
ok(!/fichasExplicitas|APOSTO_RE|nomeadoEhPersonagem|SER_FIGURADO_RE|NOME_PERSONAGEM\.test\(t\) \|\| |elencoDeterministico/.test(rd('lib/episodeContinuity.ts') + rd('lib/proximoEpisodioStudio.ts')), '(1) a dedução por regex/léxico/elenco saiu (APOSTO_RE, nomeadoEhPersonagem, SER_FIGURADO_RE, reserva pelo elenco)')

console.log('(2) o assunto não desvia; a ideia do Studio')
const epBom = { title: 'The Letter With No Stamp', script: 'HOOK\nRoland never expected the letter to answer back.\nMICRO REWARD\nThe paper was warm. Roland read the first line twice. It was written in his own handwriting.\nESCALATION\nMore letters came.\nPAYOFF\nThe last one was dated tomorrow.' }
const epMia = { title: 'A Gift Beyond Time', script: 'HOOK\nWhat happens when a forgotten toy comes to life?\nMICRO REWARD\nThe little girl, named Mia, hugs her glowing teddy bear.\nESCALATION\nShe runs.\nPAYOFF\nShe smiles.' }
const RO = FICHA_ROLAND.fichas
ok(episodioFicaNoAssunto(epBom, { fichas: RO, assunto: '' }), '(2) episódio que cita o Roland: no assunto')
ok(!episodioFicaNoAssunto(epMia, { fichas: RO, assunto: '' }), '(2) episódio que troca o protagonista por "Mia": fora')
ok(!episodioFicaNoAssunto({ title: "The Secret of Honey's Longevity", script: 'HOOK\nHoney never spoils.\nMICRO REWARD\nArchaeologists found edible honey in tombs.' }, { fichas: [], assunto: JANELA }), '(2) factual: janela de avião → mel = fora')
ok(episodioFicaNoAssunto({ title: 'Why Windows Got Rounder', script: 'HOOK\nThe round airplane windows hide one more secret.\nMICRO REWARD\nThe windows have a tiny breather hole that balances cabin pressure.' }, { fichas: [], assunto: JANELA }), '(2) factual: próximo ângulo das janelas = no assunto')
const SLEPT = { title: 'The Mailbox at Night', script: 'HOOK\nWhile Roland slept, Mia opened the mailbox.\nMICRO REWARD\nMia read the letter. Mia ran to the forest.\nPAYOFF\nMia never came back.' }
ok(episodioFicaNoAssunto(SLEPT, { fichas: RO, assunto: '' }), '(2) controle: sem a leitura do episódio, "While Roland slept, Mia…" passava (Roland na 1ª frase)')
ok(!episodioFicaNoAssunto(SLEPT, { fichas: RO, assunto: '', protagonistaDoEpisodio: 'Mia' }) && episodioFicaNoAssunto(epBom, { fichas: RO, assunto: '', protagonistaDoEpisodio: 'Roland' }) && episodioFicaNoAssunto(epBom, { fichas: RO, assunto: '', protagonistaDoEpisodio: undefined }), '(2) a leitura do episódio diz quem ele segue: Mia = fora; Roland = no assunto; não lida = checagem de sempre')
const ideiaBoa = ideiaDoProximoEpisodio({ titulo: 'The Mailbox', pedido: ROLAND, narracao: ROLAND, episodio: epBom, episodeNumber: 3, ficha: FICHA_ROLAND, protagonistaDoEpisodio: 'Roland' })
ok(ideiaBoa.ideia.startsWith('Episode 3 of my series "The Mailbox".'), '(2) a ideia abre com o número do episódio e a série')
ok(ideiaBoa.ideia.includes('Main character: Roland Pernicus Oznard, a gruff old man, with shoulder-length gray-brown hair.') && ideiaBoa.modo === 'modelo', '(2) a ideia carrega a ficha lida no rótulo "Main character:"')
ok(deriveExplicitCharacter(ideiaBoa.ideia) === 'Roland Pernicus Oznard, a gruff old man, with shoulder-length gray-brown hair', '(2) o leitor de ficha da casa (sceneStyle deriveExplicitCharacter) reconhece a ficha na ideia')
ok(ideiaBoa.usouEpisodio && ideiaBoa.ideia.includes('This episode: The Letter With No Stamp. Roland never expected the letter to answer back.'), '(2) episódio no assunto: título + gancho novo entram')
ok(/Keep the same characters/.test(ideiaBoa.ideia) && /do not repeat what already happened/.test(ideiaBoa.ideia), '(2) com ficha: "Keep the same characters" e a ordem de não repetir')
const ideiaMia = ideiaDoProximoEpisodio({ titulo: 'The Mailbox', pedido: ROLAND, narracao: ROLAND, episodio: SLEPT, episodeNumber: 2, ficha: FICHA_ROLAND, protagonistaDoEpisodio: 'Mia' })
ok(ideiaMia.episodioFora && !ideiaMia.usouEpisodio && !/Mia/.test(ideiaMia.ideia) && ideiaMia.ideia.includes('Main character: Roland Pernicus Oznard') && /Story so far: /.test(ideiaMia.ideia), '(2) episódio que segue outro ser: descartado; a ideia leva ficha + história até aqui')
const ideiaFactual = ideiaDoProximoEpisodio({ titulo: 'Why airplane windows are round', pedido: 'Explore why airplane windows are round.', narracao: JANELA, episodio: null, ficha: factual })
ok(!/Main character|Keep the same characters/.test(ideiaFactual.ideia) && /Stay on the same subject and take the next angle/.test(ideiaFactual.ideia) && /airplane windows/i.test(ideiaFactual.ideia), '(2) factual: sem personagem, mesmo assunto, "Stay on the same subject"')
const ideiaFalhou = ideiaDoProximoEpisodio({ titulo: 'The Mailbox', pedido: ROLAND, narracao: ROLAND, episodio: null, ficha: null })
ok(!/Main character|Keep the same characters/.test(ideiaFalhou.ideia) && /Stay on the same subject/.test(ideiaFalhou.ideia) && ideiaFalhou.modo === 'nenhum', '(2) leitura que falhou: nada inventado, "Stay on the same subject"')
const ideiaHistSemNome = ideiaDoProximoEpisodio({ narracao: 'A tiny discarded robot collects broken toys. One day, the robot shuts down.', ficha: { formato: 'story', fichas: [], origem: 'modelo' } })
ok(ideiaHistSemNome.modo === 'historia_sem_ficha' && /^Stay on the same subject: if it is a story, keep the same characters/m.test(ideiaHistSemNome.ideia), '(2) história sem ninguém nomeado (o robô sem nome): sem ficha, linha do meio-termo')
const ep3 = ideiaDoProximoEpisodio({ titulo: 'Episode 2 of my series "The Mailbox". Main charac', pedido: ideiaBoa.ideia.replace('Episode 3', 'Episode 2'), narracao: 'Roland opened the second letter at dawn.', episodio: null, ficha: null })
ok(ep3.numero === 3 && ep3.ideia.startsWith('Episode 3 of my series "The Mailbox".') && ep3.ideia.includes('Main character: Roland Pernicus Oznard, a gruff old man, with shoulder-length gray-brown hair.') && ep3.modo === 'autor', '(2) episódio 3 nasce do 2: o rótulo "Main character:" relido vence mesmo sem leitura')
ok(ganchoDoEpisodio(epBom.script) === 'Roland never expected the letter to answer back. The paper was warm. Roland read the first line twice.', '(2) gancho = HOOK + 2 frases do MICRO REWARD, sem rótulos')
{
  const longo = 'In March 1922, on a secluded farm named Hinterkaifeck in the Bavarian woods, a family reported their house was haunted'
  const n90 = cortarNaPalavra(longo, studioLib.NOME_DA_SERIE_MAX_CHARS)
  ok(n90.length <= 90 && longo.startsWith(n90) && /\s/.test(longo[n90.length] ?? ' ') && !/repo$/.test(n90), `(2) nome da série cortado em fronteira de palavra ("…${n90.slice(-24)}")`)
  const ideiaH = ideiaDoProximoEpisodio({ titulo: longo, narracao: 'x '.repeat(10), ficha: factual })
  ok(!/a family repo"/.test(ideiaH.ideia), '(2) filme 4b3b7668: a ideia não sai com "…a family repo"')
}

// (5.3) episodioFicaNoAssunto com fronteira de palavra e protagonista no centro
const noAss = (t: string, sc: string, f: readonly string[], lido?: string | null) => episodioFicaNoAssunto({ title: t, script: sc }, { fichas: f, assunto: '', protagonistaDoEpisodio: lido })
ok(!noAss('Because of it', 'HOOK\nBecause nobody knew, the box stayed closed.', ['Use']), '(5.3) "Use" não casa com "because"')
ok(!noAss('Often', 'HOOK\nIt happens often.', ['Ten']), '(5.3) "Ten" não casa com "often"')
ok(!noAss('Season two', 'HOOK\nThe season began.', ['Son']), '(5.3) "Son" não casa com "season"')
ok(!noAss('Moonlight', 'HOOK\nMoonlight fell on the lake.', ['Moon']), '(5.3) "Moon" não casa com "Moonlight"')
const LUNA = 'HOOK\nLuna, a curious girl, finds Roland’s old mailbox.\nMICRO REWARD\nLuna opens it. Luna reads the letter aloud.\nPAYOFF\nLuna smiles.'
ok(!noAss('The Girl Who Found the Box', LUNA, RO, 'Luna'), '(5.3) protagonista rebaixado a coadjuvante (Luna no centro) = fora')
ok(noAss('The Letter', 'HOOK\nRoland never expected the letter to answer back.\nMICRO REWARD\nLuna, a curious girl, waves at him.', RO, 'Roland'), '(5.3) protagonista sujeito da 1ª frase, coadjuvante novo de passagem = no assunto')
ok(!noAss('A Gift Beyond Time', 'HOOK\nWhat if a forgotten toy came to life?\nMICRO REWARD\nA teddy bear named Tofu wakes up. Tofu hugs the robot. Tofu runs away.', ['the tiny discarded robot'], 'Tofu'), '(5.3) o urso renomeado "Tofu" no centro e o robô de coadjuvante = fora')
ok(noAss('A New Friend', 'HOOK\nThe tiny robot woke up early.', ['the tiny discarded robot']) && noAss('Vega returns', 'HOOK\nDr. Vega looked up at the sky.', ['Dr. Vega, a scientist'], 'Dr. Vega'), '(5.3) papel ("The tiny robot") e título ("Dr. Vega") como sujeito = no assunto')
ok(noAss('The Second Letter', 'HOOK\nThe letter came back.\nMICRO REWARD\nThis time, Roland did not wait. He tore it open.', RO, 'Roland') && noAss('A segunda carta', 'HOOK\nA carta voltou.\nMICRO REWARD\nNaquela noite, Roland abriu a carta.', RO, 'Roland'), '(6.5) "This time, Roland…" / "Naquela noite, Roland…" = no assunto')
ok(noAss('Roland returns', 'HOOK\nRoland Oznard came back.', RO, 'Roland Oznard'), '(5.3) a leitura com o nome curto ("Roland Oznard") é o mesmo ser')

// (5.4) espera com indicador, botão desativado, nenhum clique engolido; o episódio do cartão vai junto
const cliente = rd('lib/proximoEpisodioCliente.ts')
ok(/export function useProximoEpisodioEmVoo\(\)/.test(cliente) && /useSyncExternalStore\(/.test(cliente) && /mudouEmVoo\(\)\s*\n\s*if \(p\.navegar\)/.test(cliente), '(5.4) o cliente avisa a tela ao começar e ao terminar a espera')
const gerar = rd('app/(dashboard)/generate/GenerateClient.tsx')
ok((gerar.match(/disabled=\{proximoEpisodioEsperando\}/g) ?? []).length === 2 && (gerar.match(/proximoEpisodioEsperando \? ROTULO_ESPERANDO : 'Next episode →'/g) ?? []).length === 2, '(5.4) tela de pronto: os dois botões do topo desativam e mostram "Writing the next episode…"')
ok(/durationSeconds: duration,\s*\n\s*durationIsTarget: true,/.test(gerar) && /episodio: nextEpisode,/.test(gerar), '(5.4/5.5) a tela de pronto manda o ALVO de duração (marcado como alvo) e o episódio que o cartão já mostra')
ok(/durationIsTarget: p\.durationIsTarget === true \? true : undefined,/.test(cliente) && /character_source: d\.characterSource \?\? null, character_reading: d\.characterReading \?\? null, duration_source: d\.durationSource \?\? null/.test(cliente), '(5.4) o cliente repassa o alvo e grava a auditoria da ficha no next_episode_link_ready')
const hist = rd('app/(dashboard)/history/HistoryClient.tsx')
ok(/aria-disabled=\{proximoEpisodioEmVoo \? true : undefined\}/.test(hist) && /proximoEpisodioEmVoo === video\.id \? ROTULO_ESPERANDO : 'Next episode →'/.test(hist), '(5.4) biblioteca: cartões desativados e o indicador no filme em espera')

// (5.5) duração = a que o filme mirou; (5.6) evento próprio e nome de série limpo
ok(duracaoDoStudio('hollywood', 78) === '60' && duracaoDoStudio('hollywood', 95) === '90' && duracaoDoStudio('fast', 33) === '35', '(5.5) hollywood de 60 s que saiu com 78 s abre em 60 (não 90); 33 s abre em 35')
ok(duracaoDoStudio('hollywood', 54) === '60' && duracaoDoStudio('kling', 54) === '60' && duracaoDoStudio('seedance', 32) === '35', '(5.5) revisão 3: filme de 60 s que saiu com 54 s (piso de 90%) abre em 60, não 35; Seedance de 35 s com 32 s abre em 35')
ok(linkLib.NEXT_EPISODE_CLICKED_EVENT === 'next_episode_button_clicked', '(5.6) evento do botão separado do next_episode_clicked do cartão')
ok(nomeDaSerie('HOOK:  Meet Tommy—the boy who', null) === 'Meet Tommy—the boy who' && nomeDaSerie('Create a 2D animated horror story inspired', null) === '' && nomeDaSerie('The Mailbox. Part one', null) === 'The Mailbox', '(5.6) nome da série sem rótulo, sem ordem de produção, sem ponto final')
ok(!/Same story and characters/.test(gerar), '(5.6) a copy do botão não promete personagens a filme factual')
ok(duracaoDoStudio('hollywood', 30) === '30' && duracaoDoStudio('kling', 15) === '15' && duracaoDoStudio('veo', 15) === '15' && duracaoDoStudio('h3', 15) === '15', '(6.6) hollywood 30 s abre em 30; Kling 2.5/Veo/H3 de 15 s abrem em 15')
ok(duracaoDoStudio('fast', 15) === '35' && duracaoDoStudio('seedance', 15) === '15' && duracaoDoStudio('hollywood', 60) === '60', '(6.6) Kineo 1 sem curta (35); Seedance 15; alvo exato cai no próprio botão')
ok(/if \(proximoEpisodioOcupado\(\) && !\(e\.metaKey[^\n]*\{ e\.preventDefault\(\); return \}\s*\n\s*void trackEvent\('series_continue_clicked'/.test(hist), '(6.7) biblioteca: clique durante a espera não grava series_continue_clicked')
ok(/if \(proximoEpisodioOcupado\(\)\) return\s*\n\s*const nextPrompt = buildSeriesContinuationPrompt\(seed\)/.test(gerar), '(6.7) tela de pronto: clique durante a espera não grava nem navega')

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
  const linha = { id: VID, user_id: 'u1', title: 'The Mailbox', topic: ROLAND, script: ROLAND, quality_mode: 'cinematic_kling', duration: 38, duration_seconds: null, render_id: 'r-123' }
  let eqs: Array<[string, unknown]> = []
  const supabase = { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: () => { eqs = []; const q: any = { select: () => q, eq: (c: string, v: unknown) => { eqs.push([c, v]); return q }, maybeSingle: async () => ({ data: eqs.every(([c, v]) => (linha as any)[c] === v) ? linha : null, error: null }) }; return q } }
  let pedidoAoEscritor: any = null
  let respostaDoEscritor: any = { status: 200, body: { title: epBom.title, script: epBom.script, episodeNumber: 2 } }
  // serviço (events): só existe com env; devolve o generate_completed do render_id
  let consultasEventos = 0
  let eventosEq: Array<[string, unknown]> = []
  const servico = { createClient: () => { const q: any = { from: () => q, select: () => q, order: () => q, eq: (c: string, v: unknown) => { eventosEq.push([c, v]); return q }, limit: async () => { consultasEventos += 1; return { data: [{ metadata: { duration: 15, render_id: 'r-123' } }], error: null } } }; return q } }
  // a leitura da ficha: o módulo REAL, com o fetch das respostas gravadas
  let leituras = 0
  const fichaMock = {
    lerFichaDoFilme: (f: any, o: any) => { leituras += 1; return ficha.lerFichaDoFilme(f, { ...o, ...OPC }) },
    protagonistaDoEpisodio: (e: any, o: any) => ficha.protagonistaDoEpisodio(e, { ...o, ...OPC }),
  }
  class FakeReq { url: string; init: any; constructor(url: any, init: any) { this.url = String(url); this.init = init } async json() { return JSON.parse(this.init.body) } }
  const NextResponse = { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, ok: (init?.status ?? 200) < 400, body, json: async () => body }) }
  const mocks: Record<string, unknown> = {
    'next/server': { NextRequest: FakeReq, NextResponse },
    '@supabase/supabase-js': servico,
    '@/lib/supabase/server': { createClient: () => supabase },
    '@/app/api/next-episode/route': { POST: async (r: any) => { pedidoAoEscritor = await r.json(); const s = respostaDoEscritor.status; return { status: s, ok: s < 400, json: async () => respostaDoEscritor.body } } },
    '@/lib/proximoEpisodioStudio': studioLib,
    '@/lib/proximoEpisodioLink': linkLib,
    '@/lib/textLanguage': textLanguage,
    '@/lib/fichaDoEpisodio': fichaMock,
  }
  const mod: any = { exports: {} }
  new Function('require', 'module', 'exports', out)((id: string) => { if (id in mocks) return mocks[id]; throw new Error('import inesperado ' + id) }, mod, mod.exports)
  const chamar = (body: unknown) => mod.exports.POST({ json: async () => body, nextUrl: { origin: 'https://www.usekineo.com' } })
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  const r1 = await chamar({ fromVideoId: VID })
  const u1 = new URL(r1.body.studioHref, 'https://x.y')
  ok(r1.status === 200 && u1.searchParams.get('engine') === 'kling' && u1.searchParams.get('duration') === '35' && u1.searchParams.get('language') === 'en' && r1.body.durationSource === 'measured' && consultasEventos === 0, `(3b) sem chave de serviço: motor e duração medida do filme (Kling 2.5, 38 s → 35): ${u1.search.slice(0, 80)}`)
  ok(u1.searchParams.get('prompt')!.includes('Main character: Roland Pernicus Oznard, a gruff old man, with shoulder-length gray-brown hair.') && r1.body.usedEpisode === true && r1.body.characterSource === 'modelo', '(3b) a rota devolve a ideia com a ficha LIDA e o episódio escrito')
  ok(r1.body.characterReading?.origem === 'modelo' && r1.body.characterReading?.protagonista === 'Roland Pernicus Oznard' && r1.body.characterReading?.protagonista_do_episodio === 'Roland' && r1.body.characterReading?.versao === ficha.FICHA_SEMANTICA_VERSAO, '(3b) a auditoria da leitura volta na resposta (o cliente grava no next_episode_link_ready)')
  ok(pedidoAoEscritor?.fromVideoId === VID && pedidoAoEscritor?.previousTopic === ROLAND && pedidoAoEscritor?.language === 'en', '(3b) o escritor de sempre recebe o filme, a narração real e a língua')
  ok(eqs.some(([c, v]) => c === 'user_id' && v === 'u1'), '(3b) leitura restrita ao dono (user_id)')
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://offline.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'offline-test'
  eventosEq = []
  const rReq = await chamar({ fromVideoId: VID, durationSeconds: 38 })
  ok(new URL(rReq.body.studioHref, 'https://x.y').searchParams.get('duration') === '15' && rReq.body.durationSource === 'requested' && eventosEq.some(([c, v]) => c === 'metadata->>render_id' && v === 'r-123') && eventosEq.some(([c, v]) => c === 'user_id' && v === 'u1'), '(3b) biblioteca (medida 38 s): o alvo que o filme PEDIU (generate_completed do render_id, do dono) vence — 15')
  const antesConsultas = consultasEventos
  const rAlvo = await chamar({ fromVideoId: VID, durationSeconds: 60, durationIsTarget: true })
  ok(new URL(rAlvo.body.studioHref, 'https://x.y').searchParams.get('duration') === '60' && rAlvo.body.durationSource === 'target' && consultasEventos === antesConsultas, '(3b) tela de pronto (alvo 60): o alvo da tela, sem consultar eventos')
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  respostaDoEscritor = { status: 429, body: { error: 'Too soon.' } }
  const r2 = await chamar({ fromVideoId: VID, language: 'es', engine: 'fast' })
  const u2 = new URL(r2.body.studioHref, 'https://x.y')
  ok(r2.status === 200 && r2.body.wroteEpisode === false && u2.searchParams.get('prompt')!.includes('Main character: Roland') && u2.searchParams.get('engine') === 'fast' && u2.searchParams.get('language') === 'es', '(3b) escritor em cooldown (429): o link sai com ficha + história, e o motor/língua que a tela pediu')
  respostaDoEscritor = { status: 200, body: epMia }
  const r3 = await chamar({ fromVideoId: VID })
  ok(r3.body.episodeOffTopic === true && !/Mia/.test(new URL(r3.body.studioHref, 'https://x.y').searchParams.get('prompt')!), '(3b) escritor fora do assunto: descartado da ideia')
  ok((await chamar({ fromVideoId: '00000000-0000-4000-8000-000000000000' })).status === 404, '(3b) filme de outra pessoa / inexistente: 404')
  ok((await chamar({ fromVideoId: 'nope' })).status === 400, '(3b) id inválido: 400')
  pedidoAoEscritor = null
  const r5 = await chamar({ fromVideoId: VID, episode: { title: epBom.title, script: epBom.script } })
  ok(pedidoAoEscritor === null && r5.body.usedEpisode === true && r5.body.writerStatus === 'tela' && new URL(r5.body.studioHref, 'https://x.y').searchParams.get('prompt')!.includes('This episode: The Letter With No Stamp.'), '(5.4) episódio que a tela já mostra: o Studio recebe o MESMO texto e nenhum 2º escritor roda')
  const r6 = await chamar({ fromVideoId: VID, episode: SLEPT })
  ok(pedidoAoEscritor === null && r6.body.episodeOffTopic === true && r6.body.characterReading?.protagonista_do_episodio === 'Mia', '(S2) "While Roland slept, Mia…" na tela: a leitura do episódio diz Mia → fora da ideia')
  // falha segura na rota: a leitura não veio → sem ficha, "Stay on the same subject", nada quebra
  fichaMock.lerFichaDoFilme = (f: any, o: any) => ficha.lerFichaDoFilme(f, { ...o, apiKey: 'x', fetchImpl: (async () => resposta('', 503)) as typeof fetch })
  const r7 = await chamar({ fromVideoId: VID, episode: { title: epBom.title, script: epBom.script } })
  const p7 = new URL(r7.body.studioHref, 'https://x.y').searchParams.get('prompt')!
  ok(r7.status === 200 && !/Main character|Keep the same characters/.test(p7) && /Stay on the same subject/.test(p7) && r7.body.characterReading?.origem === 'falha' && r7.body.characterReading?.protagonista_do_episodio === 'nao_lido', '(S) rota com a leitura fora do ar (503): sem ficha, "Stay on the same subject", link sai igual')
  // rótulo do autor: a rota não depende do modelo
  const linhaRot = { ...linha, topic: 'Episode 2 of my series "The Mailbox".\nMain character: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair.', script: 'Roland opened the second letter.' }
  Object.assign(linha, linhaRot)
  const r8 = await chamar({ fromVideoId: VID, episode: { title: epBom.title, script: epBom.script } })
  ok(r8.body.characterSource === 'autor' && new URL(r8.body.studioHref, 'https://x.y').searchParams.get('prompt')!.includes('Main character: Roland Pernicus Oznard, a gruff old man with shoulder-length gray-brown hair.') && r8.body.episodeNumber === 3, '(S) rótulo do autor na rota: verbatim, sem depender da leitura (que está fora do ar), episódio 3')
  ok(leituras >= 1, `(3b) a rota usa lerFichaDoFilme (${leituras} leituras)`)
}

console.log('(4) nada de preço literal')
const PRECO = /\$\s?\d|US\$|R\$|\b\d+\s?(?:credits?|cr)\b|\bcredits?\b/i
ok(!PRECO.test(ideiaBoa.ideia) && !PRECO.test(ideiaMia.ideia) && !PRECO.test(ideiaFactual.ideia) && !PRECO.test(ideiaDeReserva('X film')), '(4) a ideia não fala de preço nem de crédito')
for (const f of ['lib/proximoEpisodioLink.ts', 'lib/proximoEpisodioStudio.ts', 'lib/proximoEpisodioCliente.ts', 'app/api/next-episode/studio/route.ts', 'lib/fichaDoEpisodio.ts']) {
  const codigo = rd(f).split('\n').filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l)).join('\n')
  ok(!/\$\s?\d|US\$|R\$|\b\d+\s?(?:credits?|cr)\b/i.test(codigo), `(4) ${f}: sem número de preço/crédito no código`)
  ok(rd(f).includes('KINEO-PROXIMO-EPISODIO-0111'), `(4) ${f}: carrega o marcador`)
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} ok, ${fail} falhas`)
if (fail) process.exit(1)
