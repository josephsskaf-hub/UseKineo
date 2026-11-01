// KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — guardião da v5 (chamada semântica), SEM REDE: toda resposta do modelo é a
// resposta CRUA gravada na calibração real (docs/calibracao/KINEO-K4-SUJEITO-0111.json) ou um mock de falha.
// (1) o sujeito do Kling 4 sai de UMA leitura semântica do PEDIDO ORIGINAL (nunca do roteiro com [Pexels]) — validada (inglês, com
//     substantivo comum, ancorada no pedido), com falha segura (erro, prazo, JSON inválido = nada injetado) e no máximo 1 tentativa extra;
// (2) a checagem "já está em cena" e a escolha da cena seguem as da v3 (orçamento, imagem de abertura, imagem-chave do meio);
// (3) o fim: detector estreito (pergunta / quase igual ao HOOK) + juiz semântico só no escritor e só no roteiro da IA; a injeção crua
//     da revelação na última cena (comRevelacaoNoFim) SAIU; "Use my script as is" intocado.
// v5 (revisão do 11db2897c): núcleo do sujeito pelo modelo (head_noun — "a talking parrot", "a shopping cart" não somem mais), uso da
// palavra conferido (word_use: só "literal" vira sujeito — "Jaws" não vira tubarão), língua lida pelo modelo ("da Vinci" passa),
// gente por has_human ("a boy" em pedido adulto nunca), motivo de descarte no relato, 4xx sem 2ª tentativa, chamada só depois da
// reserva; o juiz do fim só cobra resposta de gancho que a DEVE (história, motivacional, infantil e lista passam) e só roda quando
// nenhum outro motivo já pede a nova tentativa; a reescrita só pelo juiz só entra se não piorar. Calibração com conjunto CEGO.
// Rodar: npx tsx scripts/test-k4-sujeito-final-0111.mts
import { readFileSync } from 'node:fs'
import { buildClassicVisualPrompt } from '@/lib/cinematic/visualPromptPolicy'
import { deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'
import { promptDaCenaKling4, KLING4_ORCAMENTO_DA_CAMADA, KLING4_PROMPT_MAX } from '@/lib/cinematic/cenaKling4'
import { buildKling4TrialInput } from '@/lib/kling4Trial'
import * as sujeitoMod from '@/lib/cinematic/sujeitoObrigatorio'
import { sujeitoObrigatorio, avaliarSujeito, exigirSujeitoNoKling4, sujeitoNoKling4, promptMostraOSujeito, comSujeitoNaCena, pedidoOriginalDoSujeito, pedidoCurto, lerSujeitoDoPedido, lerLeituraDoSujeito, chavesDoSujeito, EXEMPLOS_SUJEITO_0111, type ResultadoSemantico, type LeituraDoSujeito } from '@/lib/cinematic/sujeitoObrigatorio'
import * as finalMod from '@/lib/cinematic/finalResposta'
import { finalFracoDoRoteiro, ultimaFraseDoRoteiro, problemaDoFinal, finalTemRespostaConcreta, entradaDoJuizDoFinal, quaseIgualAoGancho, fimSemResposta } from '@/lib/cinematic/finalResposta'
import { ehIdeiaSolta } from '@/lib/meta95/ideiaNoEscritor'
import { parseUserScript } from '@/lib/scriptParser'

// rede proibida: qualquer fetch real derruba o guardião
process.env.OPENAI_API_KEY = ''
globalThis.fetch = (async () => { throw new Error('rede proibida no guardião') }) as typeof fetch

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const len = (s: string) => Array.from(s).length
const rd = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const CAL = JSON.parse(rd('docs/calibracao/KINEO-K4-SUJEITO-0111.json'))

/** fetch falso: devolve o conteúdo dado (como a OpenAI devolve) e conta as chamadas. */
function mock(...respostas: Array<string | number | 'pendura'>) {
  const m = { chamadas: 0, fetch: (async (_u: unknown, init?: RequestInit) => {
    const r = respostas[Math.min(m.chamadas, respostas.length - 1)]
    m.chamadas++
    if (r === 'pendura') return new Promise<Response>((_, rej) => init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
    if (typeof r === 'number') return new Response('{"error":"x"}', { status: r })
    return new Response(JSON.stringify({ choices: [{ message: { content: r } }] }), { status: 200 })
  }) as typeof fetch }
  return m
}
const OPC = { apiKey: 'chave-de-teste' }
const leituraDe = async (pedido: string, cru: string) => lerSujeitoDoPedido(pedido, { ...OPC, fetchImpl: mock(cru).fetch })
const cruDe = (subject: string | null, kind: string, mention: string[] = [], real = false, extra: Record<string, unknown> = {}) => JSON.stringify({ reasoning: 'teste', subject, head_noun: subject ? subject.split(/\s+/).filter((w) => /^\p{Ll}{3,}$/u.test(w) && !['the', 'that', 'with'].includes(w)).pop() ?? null : null, kind, real_person: real, has_human: false, mention_words: mention, word_use: kind === 'none' ? 'none' : 'literal', request_language: 'pt', ...extra })

// ═══ (0) a adivinhação por lista de palavras SAIU ═══
const fonteSujeito = rd('lib/cinematic/sujeitoObrigatorio.ts')
const fonteFinal = rd('lib/cinematic/finalResposta.ts')
ok(!/const LEXICO\b/.test(fonteSujeito) && !/achadosDoLexico|modeloDoVeiculo|CONTEXTO_NAZISTA_RE/.test(fonteSujeito), '(0) sujeitoObrigatorio.ts não tem mais léxico de pedido (LEXICO/achados/contextos)')
ok(!/const CLIMA\b|function (?:fatoAntesDoClima|temFatoNovo|comRevelacaoNoFim|revelacaoDaFala)/.test(fonteFinal), '(0) finalResposta.ts sem lista de bordões e sem injeção crua da revelação')
ok(!('comRevelacaoNoFim' in finalMod) && !('revelacaoDaFala' in finalMod) && !('LEXICO' in sujeitoMod), '(0) exports antigos não existem mais')
ok(/temperature: 0/.test(fonteSujeito) && /json_schema/.test(fonteSujeito) && /strict: true/.test(fonteSujeito), '(0) chamada: temperature 0, json_schema estrito')
ok(/timeoutMs: 4_000, tentativasExtras: 1, prazoTotalMs: 8_500/.test(fonteSujeito), '(0) sujeito: prazo 4 s, no máximo 1 tentativa extra (8,5 s no total)')
ok(/timeoutMs: 4_000, tentativasExtras: 1, prazoTotalMs: 5_500/.test(fonteFinal), '(0) fim: prazo 4 s, a tentativa extra só se couber em 5,5 s (escritor tem teto de 60 s)')
ok(!/CORTE_DO_NUCLEO_RE|\\p\{L\}\+ing/.test(fonteSujeito), '(0) v5: o corte do núcleo por regex em "-ing" SAIU (o núcleo é o head_noun do modelo)')
ok(EXEMPLOS_SUJEITO_0111.length >= 8 && EXEMPLOS_SUJEITO_0111.every((e) => !(CAL.sujeito as Array<{ pedido: string }>).some((c) => e.user.includes(c.pedido))), '(0) v5: os exemplos resolvidos do prompt não estão no conjunto da calibração (o cego não é inflado por cópia)')

// ═══ (1) FALHA SEGURA ═══
const pedidoAviao = 'o avião C-54 que sumiu'
const r500 = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: mock(500, 500).fetch })
ok(!r500.ok && r500.erro === 'http_500' && r500.tentativas === 2, `(1) HTTP 500 duas vezes: { ok: false, http_500 }, 2 tentativas (1 extra, nunca mais)`)
const m401 = mock(401, cruDe('an airplane', 'vehicle', ['avião']))
const r401 = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: m401.fetch })
ok(!r401.ok && r401.erro === 'http_401' && m401.chamadas === 1, '(1) v5: HTTP 401 não ganha 2ª tentativa (não tem como dar certo)')
const m429 = mock(429, cruDe('an airplane', 'vehicle', ['avião']))
const r429 = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: m429.fetch })
ok(!r429.ok && r429.erro === 'http_429' && m429.chamadas === 1, '(1) v5: HTTP 429 também não (só 5xx, 408, rede e prazo)')
const m408 = mock(408, cruDe('an airplane that disappeared', 'vehicle', ['avião']))
ok((await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: m408.fetch })).ok && m408.chamadas === 2, '(1) v5: HTTP 408 ganha a 2ª tentativa')
const m3 = mock(500, 500, 500)
await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: m3.fetch })
ok(m3.chamadas === 2, '(1) no máximo 1 tentativa extra (3 falhas oferecidas, 2 chamadas feitas)')
const mPrazo = mock('pendura', 'pendura')
const rPrazo = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: mPrazo.fetch, timeoutMs: 40, prazoTotalMs: 200 })
ok(!rPrazo.ok && rPrazo.erro === 'prazo' && mPrazo.chamadas === 2, '(1) prazo estourado: abortado, { ok: false, prazo }')
const mPrazoCurto = mock('pendura', cruDe('an airplane', 'vehicle', ['avião']))
const rPrazoCurto = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: mPrazoCurto.fetch, timeoutMs: 40, prazoTotalMs: 60 })
ok(!rPrazoCurto.ok && mPrazoCurto.chamadas === 1, '(1) a tentativa extra não sai se não couber no prazo total')
const rJson = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: mock('isto não é json', '{"subject":').fetch })
ok(!rJson.ok && rJson.erro === 'json_invalido', '(1) JSON inválido: { ok: false }')
const rForma = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: mock('{"subject":"an airplane","kind":"plane"}', '{"foo":1}').fetch })
ok(!rForma.ok && rForma.erro === 'formato_invalido', '(1) JSON fora do formato (kind desconhecido, campos faltando): { ok: false }')
const rRecupera = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: mock(503, cruDe('an airplane that disappeared', 'vehicle', ['avião'])).fetch })
ok(rRecupera.ok && rRecupera.tentativas === 2 && rRecupera.valor.subject === 'an airplane that disappeared', '(1) 1ª tentativa 503, 2ª responde: vale a 2ª')
const rSemChave = await lerSujeitoDoPedido(pedidoAviao, { fetchImpl: mock(cruDe('an airplane', 'vehicle', ['avião'])).fetch })
ok(!rSemChave.ok && rSemChave.erro === 'sem_chave', '(1) sem OPENAI_API_KEY: { ok: false } sem chamar nada')
let lancou = false
try { await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: (async () => { throw new TypeError('fetch failed') }) as typeof fetch }) } catch { lancou = true }
ok(!lancou, '(1) erro de rede nunca lança para a rota')
const rFinalFalha = await finalTemRespostaConcreta('HOOK: x y z?\nPAYOFF: The answer was methane.', { ...OPC, fetchImpl: mock(500, 500).fetch, pedido: 'mars' })
ok(!rFinalFalha.ok, '(1) juiz do fim com erro: { ok: false } (o escritor não pede nova tentativa)')
const rFinalSemPontas = await finalTemRespostaConcreta('só uma frase sem seções', { ...OPC, fetchImpl: mock('{"hook_promises_answer":true,"ends_with_concrete_answer":false}').fetch })
const rFinalVelho = await finalTemRespostaConcreta('HOOK: What NASA never announced about Mars.\nPAYOFF: The truth is out there.', { ...OPC, fetchImpl: mock('{"ends_with_concrete_answer":false}', '{"ends_with_concrete_answer":false}').fetch })
ok(!rFinalVelho.ok && rFinalVelho.erro === 'formato_invalido', '(1) v5: resposta do juiz sem hook_promises_answer = formato inválido (falha segura, nada muda)')
ok(!rFinalSemPontas.ok && rFinalSemPontas.erro === 'sem_hook_ou_payoff', '(1) roteiro sem HOOK/PAYOFF: o juiz nem é chamado')

// ═══ (2) validação da leitura (inglês, substantivo comum, âncora no pedido, pessoa real) ═══
const v = (pedido: string, o: Record<string, unknown>) => lerLeituraDoSujeito({ reasoning: 'teste', subject: null, head_noun: null, kind: 'none', real_person: false, has_human: false, mention_words: [], word_use: 'literal', request_language: 'en', ...o }, pedido)
ok(v('The real story of Billy the Kid', { subject: 'a child', kind: 'person_generic', real_person: true, mention_words: ['Kid'] })?.descartado === 'pessoa_real', '(2) real_person=true: nada a injetar, mesmo com subject')
ok(v('O que Lula disse', { subject: null, kind: 'none' })?.descartado === 'sem_sujeito', '(2) kind none: nada a injetar')
ok(v('cara ou coroa: a matemática da moeda', { subject: 'a moeda', head_noun: 'moeda', kind: 'object', mention_words: ['moeda'], request_language: 'pt' })?.descartado === 'sujeito_sem_traducao', '(2) sujeito copiado sem traduzir ("a moeda", resposta real da calibração): descartado')
ok(v('cara ou coroa: a matemática da moeda', { subject: 'a coin', head_noun: 'coin', kind: 'object', mention_words: ['moeda'], request_language: 'pt' })?.subject === 'a coin', '(2) o mesmo pedido com "a coin": vale')
ok(v("Leonardo da Vinci's flying machine", { subject: "Leonardo da Vinci's flying machine", head_noun: 'machine', kind: 'object', mention_words: ['flying machine'], request_language: 'en' })?.subject === "Leonardo da Vinci's flying machine", '(2) v5: pedido em inglês com "da" não cai mais na checagem de tradução (a língua é a que o modelo leu)')
ok(v('What really happened to Flight 19', { subject: 'Flight 19', head_noun: 'flight', kind: 'vehicle', mention_words: ['Flight 19'] })?.descartado === 'sem_nucleo', '(2) só nome/número ("Flight 19"): o núcleo não está escrito em minúscula no sujeito — descartado, o motor não sabe o que desenhar')
ok(v('the SS St. Louis', { subject: 'the SS St. Louis', head_noun: 'louis', kind: 'vehicle', mention_words: ['the SS St. Louis'] })?.descartado === 'sem_nucleo', '(2) "the SS St. Louis" sem "ship" (núcleo "Louis" é nome, não substantivo comum): descartado')
ok(v('a talking parrot that tells jokes', { subject: 'a talking parrot', head_noun: 'parrot', kind: 'creature', mention_words: ['talking parrot'] })?.subject === 'a talking parrot' && v('x', { subject: 'a talking parrot', head_noun: 'eagle', kind: 'creature' })?.descartado === 'sem_nucleo', '(2) v5: o núcleo tem de ser palavra do próprio sujeito ("parrot" sim, "eagle" não)')
ok(v('Jaws: facts you never knew', { subject: 'a great white shark', head_noun: 'shark', kind: 'creature', mention_words: ['Jaws'], word_use: 'name_or_title' })?.descartado === 'uso_name_or_title', '(2) v5: palavra que é nome/título ("Jaws" → tubarão, resposta vista ao vivo pelo revisor) = descartado pelo word_use')
ok(v('Leverage is a double-edged sword', { subject: 'a sword', head_noun: 'sword', kind: 'object', mention_words: ['sword'], word_use: 'figurative' })?.descartado === 'uso_figurative' && v('How AI trains on your photos', { subject: 'a train', head_noun: 'train', kind: 'vehicle', mention_words: ['trains'], word_use: 'verb' })?.descartado === 'uso_verb', '(2) v5: figurado e verbo = descartados pelo word_use')
ok(v('O que Lula disse sobre a economia', { subject: 'a giant squid', head_noun: 'squid', kind: 'creature', mention_words: ['lula gigante'], request_language: 'pt' })?.descartado === 'sem_ancora_no_pedido', '(2) citação que não está inteira no pedido ("lula gigante") e sujeito fora do texto: descartado — anti-invenção')
ok(v('How to train your brain', { subject: 'a train', head_noun: 'train', kind: 'vehicle', mention_words: ['train'] })?.subject === 'a train', '(2) a âncora e o word_use são do modelo: se ele errar os dois juntos, a validação não pega — por isso a calibração mede o caminho inteiro (resposta real aqui: kind none, seção 3)')
ok(v('um cachorro', { subject: 'a dog: very big', head_noun: 'dog', kind: 'creature', mention_words: ['cachorro'], request_language: 'pt' })?.descartado === 'sujeito_mal_formado', '(2) dois-pontos no sujeito: mal formado (nunca entra texto que possa virar instrução no prompt)')
ok(v('um cachorro', { subject: 'a dog ' + 'very '.repeat(12), head_noun: 'dog', kind: 'creature', mention_words: ['cachorro'], request_language: 'pt' })?.descartado === 'sujeito_mal_formado', '(2) sujeito com mais de 12 palavras: mal formado')
ok(v('um cachorro', { subject: 'собака', kind: 'creature', mention_words: ['cachorro'], request_language: 'pt' })?.descartado === 'sujeito_mal_formado', '(2) sujeito fora do alfabeto latino: mal formado')
ok(v('a dragon guarding a castle', { subject: 'a dragon guarding a castle', head_noun: 'dragon', kind: 'creature', mention_words: ['a dragon guarding a castle'] })?.subject === 'a dragon guarding a castle', '(2) pedido em inglês com o sujeito igual ao pedido: vale (a checagem de tradução só vale para pedido em outra língua)')
ok(v('um gato', { subject: 'null', head_noun: 'null', kind: 'creature', mention_words: ['gato'], request_language: 'pt' })?.descartado === 'sem_sujeito', '(2) "null" escrito como texto (visto na calibração real) é null')
ok(lerLeituraDoSujeito('não é objeto', 'x') === null && lerLeituraDoSujeito({ subject: 1, kind: 'object', real_person: false, mention_words: [] }, 'x') === null && lerLeituraDoSujeito({ subject: 'a cat', kind: 'creature', real_person: false, mention_words: ['cat'] }, 'a cat') === null, '(2) resposta fora do formato (inclusive o formato da v4, sem head_noun/word_use): null (falha segura)')
const meninoAdulto = avaliarSujeito({ leitura: await leituraDe('o menino que encontrou um meteorito', cruDe('a boy who found a meteorite', 'creature', ['menino'], false, { has_human: true })), pessoaPermitida: false })
ok(meninoAdulto.sujeito === null && meninoAdulto.motivo === 'gente_em_pedido_adulto', '(2) v5: "a boy" com kind errado ("creature", visto ao vivo pelo revisor) em pedido adulto: has_human barra, com motivo')
// o núcleo com palavra em "-ing" antes do substantivo (defeito 1 da revisão do 11db2897c)
for (const [frase, nucleo, prova] of [['a talking parrot', 'parrot', 'A colorful parrot perched on a branch'], ['a sleeping dog dreaming of the sea', 'dog', 'Two dogs nap by the window'], ['the invention of a shopping cart', 'cart', 'An empty metal cart in a supermarket aisle'], ['living creatures on the dark ocean floor', 'creatures', 'A strange creature glows in the dark water'], ['a puppy chasing butterflies', 'puppy', 'Three puppies tumble on the grass']] as const) {
  const ch = chavesDoSujeito(frase, nucleo)
  ok(ch.length > 0 && ch.every((re) => re.test(prova)), `(2) v5: "${frase}" tem núcleo "${nucleo}" e prova presença em "${prova}" (singular/plural)`)
}
ok(chavesDoSujeito('a sleeping dog', null).length === 0 && chavesDoSujeito('a Komodo dragon on a beach', 'dragon')[0]?.test('A huge monitor lizard') === true, '(2) v5: sem núcleo e fora das famílias = nada a provar; família conhecida continua valendo (Komodo = lagarto)')
const adulto = sujeitoObrigatorio({ leitura: await leituraDe('crianças brincando no parque', cruDe('children playing in the park', 'creature', ['crianças'], false, { head_noun: 'children' })), pessoaPermitida: false })
ok(adulto === null, '(2) criança com kind errado ("creature", visto na calibração) em pedido adulto: nunca vira sujeito')
ok(sujeitoObrigatorio({ leitura: await leituraDe('crianças brincando no parque', cruDe('children playing in the park', 'creature', ['crianças'], false, { head_noun: 'children' })) })?.tipo === 'pessoa', '(2) criança na frase é gente (tipo pessoa), seja qual for o kind')

// ═══ (3) as respostas GRAVADAS da calibração real, sem rede ═══
let graves = 0, posAcertos = 0, posTotal = 0, iguais = 0, total = 0
for (const c of CAL.sujeito as Array<{ id: string; pedido: string; rotulo: string; aceita?: string; secundario?: string; passadas: Array<{ subject: string | null; cru: string }> }>) {
  const aceita = c.aceita ? new RegExp(c.aceita, 'i') : null
  let pior = 'ok'
  for (const p of c.passadas) {
    const s = sujeitoObrigatorio({ leitura: await leituraDe(c.pedido, p.cru) })
    total++; if ((s?.frase ?? null) === p.subject) iguais++
    const f = s?.frase ?? null
    const vered = c.rotulo === 'neg' ? (f ? 'grave' : 'ok') : !f ? (c.rotulo === 'pos' ? 'perdeu' : 'ok') : aceita!.test(f) ? 'ok' : c.secundario && new RegExp(c.secundario, 'i').test(f) ? 'perdeu' : 'grave'
    if (vered === 'grave') pior = 'grave'; else if (vered === 'perdeu' && pior === 'ok') pior = 'perdeu'
  }
  if (pior === 'grave') { graves++; console.log('    grave:', c.id) }
  if (c.rotulo === 'pos') { posTotal++; if (pior === 'ok') posAcertos++ }
}
ok(iguais === total, `(3) a validação de hoje reproduz o sujeito gravado na calibração (${iguais}/${total})`)
ok(graves === 0, `(3) 0 falso positivo grave nas ${CAL.sujeito.length} respostas gravadas (${CAL.placar.sujeito.origem.revisao} das revisões + ${CAL.placar.sujeito.origem.banco} do banco)`)
ok(posAcertos / posTotal >= 0.85, `(3) positivos: ${posAcertos}/${posTotal} = ${(100 * posAcertos / posTotal).toFixed(1)}% (meta ≥ 85%)`)
ok(CAL.sujeito.length >= 40 && CAL.placar.sujeito.origem.banco >= 20, '(3) conjunto rotulado ≥ 40 casos, ≥ 20 reais do banco')
ok(CAL.placar.sujeito.cego.casos >= 40 && CAL.placar.sujeito.cego.falsos_positivos_graves === 0 && CAL.placar.sujeito.cego.positivos.taxa >= 0.85, `(3) v5: conjunto CEGO (congelado antes da rodada, ${CAL.placar.sujeito.cego.casos} casos): 0 grave e ${CAL.placar.sujeito.cego.positivos.acertos}/${CAL.placar.sujeito.cego.positivos.total} positivos`)
for (const id of ['rv4-parrot', 'rv4-sleeping-dog', 'rv4-shopping-cart', 'rv4-ocean-floor', 'rv4-napoleon-hat', 'rv4-da-vinci']) ok((CAL.sujeito as Array<{ id: string; veredito: string }>).find((c) => c.id === id)?.veredito === 'acerto', `(3) v5: "${id}" (perdido na v4) acerta nas 2 passadas gravadas`)
ok((CAL.sujeito as Array<{ id: string; veredito: string }>).find((c) => c.id === 'rv4-jaws')?.veredito === 'ok', '(3) v5: "Jaws" (tubarão inventado na v4) não injeta nada nas 2 passadas gravadas')
const gravado = (id: string) => (CAL.sujeito as Array<{ id: string; passadas: Array<{ cru: string }> }>).find((c) => c.id === id)!.passadas[0].cru
for (const id of ['rev-robo-siglo', 'rev-planes-jubilarme', 'rev-sword-leverage', 'rev-ai-trains', 'rev-amazon-ships', 'rev-billy-kid', 'rev-el-nino', 'rev-lula-presidente', 'rev-tesouro-direto', 'rev-rocket-man', 'rev-ss-himmler', 'rv4-jaws']) {
  const c = (CAL.sujeito as Array<{ id: string; pedido: string }>).find((x) => x.id === id)!
  ok(sujeitoObrigatorio({ leitura: await leituraDe(c.pedido, gravado(id)) }) === null, `(3) "${c.pedido}" (reprovado nas rodadas 1-3): nada injetado`)
}

// ═══ (4) ponta a ponta no formato real (pedido original + falas + prompts do Kling 4), com a resposta gravada ═══
const k4De = (pedido: string, visuais: string[]) => {
  const style = deriveStyleAnchor(pedido, 'cinematic_ai')
  return visuais.map((vis, i) => promptDaCenaKling4(buildClassicVisualPrompt(vis, { mode: 'documentary_faceless', style, aspect: '9:16', opening: i === 0 } as never), style, i))
}
const pedidoDaRota = (body: { prompt: string; script_mode?: string; original_idea?: string }, falas: string[]) =>
  pedidoOriginalDoSujeito({ prompt: body.prompt, ideiaSolta: ehIdeiaSolta({ prompt: body.prompt, scriptMode: body.script_mode }), scriptMode: body.script_mode, originalIdea: body.original_idea, falas })
const falasDoRoteiro = (roteiro: string) => parseUserScript(roteiro).segments.map((s: { text?: string; voiceover?: string }) => String(s.voiceover ?? s.text ?? ''))
const roteiroAviao = `HOOK (0-2s): [Pexels: snowy mountains aerial] Vanished into thin air—70 years, zero leads.
PAYOFF: [Pexels: old airplane wreckage snow] In 1950, a C-54 Skymaster disappeared over the Yukon with 44 people aboard.`
ok(parseUserScript(roteiroAviao).hasMarkers && !ehIdeiaSolta({ prompt: roteiroAviao, scriptMode: 'ai' }), '(4) o roteiro do formato real tem marcadores: não é ideia solta')
const semIdeia = pedidoDaRota({ prompt: roteiroAviao, script_mode: 'ai' }, falasDoRoteiro(roteiroAviao))
ok(semIdeia.pedido === null && semIdeia.motivo === 'sem_pedido_original', '(4) roteiro SEM original_idea: sem pedido confiável — a chamada semântica nem sai (nunca lê as pistas [Pexels])')
ok(pedidoDaRota({ prompt: roteiroAviao, script_mode: 'verbatim', original_idea: pedidoAviao }, falasDoRoteiro(roteiroAviao)).motivo === 'roteiro_da_pessoa', '(4) "Use my script as is": nada corrigido')
ok(pedidoDaRota({ prompt: roteiroAviao, script_mode: 'ai', original_idea: roteiroAviao }, falasDoRoteiro(roteiroAviao)).motivo === 'ideia_original_invalida', '(4) original_idea que é roteiro: recusada')
ok(pedidoDaRota({ prompt: 'criança com caneta 3D', script_mode: 'ai' }, []).fonte === 'ideia_solta', '(4) ideia crua sem marcadores: é o pedido original')
ok(!pedidoCurto('HOOK: um avião') && !pedidoCurto('[Pexels: plane] o avião') && pedidoCurto(pedidoAviao), '(4) pedidoCurto: sem cabeçalho, sem colchete, ≤ 280 caracteres')

const falasAviao = ['Vanished into thin air—70 years, zero leads. In 1950, a C-54 Skymaster disappeared over the Yukon wilderness.', 'All 44 passengers were never seen again in those icy peaks.', 'The mystery remains unsolved... a ghost flight... swallowed by time and nature.']
const k4Aviao = k4De(pedidoAviao, ['Two men in dark suits study an old map in a dim 1950s office, cigarette smoke curling', 'Snow-covered mountain peaks under a grey sky, slow aerial push-in', 'Two men in suits stand at a window looking out at falling snow, somber mood'])
const leituraAviao = await leituraDe(pedidoAviao, gravado('rev-aviao-c54'))
const sAviao = sujeitoObrigatorio({ leitura: leituraAviao })!
ok(sAviao.tipo === 'veiculo' && /C-54/.test(sAviao.frase) && /airplane/.test(sAviao.frase) && sAviao.tokens.includes('C-54'), `(4) avião C-54 (resposta gravada): "${sAviao.frase}", ficha C-54`)
ok(k4Aviao.every((q) => !promptMostraOSujeito(q, sAviao)), '(4) caso real: nenhum dos 3 prompts mostrava o avião (2 homens de terno)')
const stillsAviao = ['https://x/s1.png', 'https://x/s2.png', 'https://x/s3.png']
const ped = pedidoDaRota({ prompt: pedidoAviao, script_mode: 'ai' }, falasAviao)
const corr = exigirSujeitoNoKling4({ pedido: ped, leitura: leituraAviao, falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
ok(corr.relato.corrigido && corr.relato.cena === 3, `(4) corrigido na cena ${corr.relato.cena}: a cena 1 cita o avião mas tem imagem de abertura (nunca sai); vai para a última`)
ok(corr.prompts[2].includes(`Main subject clearly visible in frame: ${sAviao.frase}.`), '(4) a cena leva "Main subject clearly visible in frame: …"')
ok(corr.stills[0] === stillsAviao[0] && corr.stills[1] === stillsAviao[1] && corr.stills[2] === null && corr.relato.keyframe_removido, '(4) abertura intacta; a imagem-chave do meio desenhada sem o avião sai')
ok(corr.prompts.every((q) => len(q) <= KLING4_ORCAMENTO_DA_CAMADA) && corr.prompts.every((q) => q.endsWith('Mouth closed, no speaking.')), '(4) orçamento da camada e cauda preservados')
ok(corr.relato.leitura?.ok === true && corr.relato.leitura.subject === sAviao.frase && corr.relato.leitura.head_noun === 'airplane' && corr.relato.leitura.word_use === 'literal' && corr.relato.leitura.model === 'gpt-4o-mini' && corr.relato.versao === 'k4_sujeito_0111_v5_semantico' && corr.relato.motivo_sem_sujeito === null, '(4) o relato do claim guarda a leitura semântica crua (auditoria)')
const shots = buildKling4TrialInput(corr.prompts, corr.stills, { voiceovers: falasAviao, wordsPerSecond: 2.5 }).input.multi_prompt as Array<{ prompt: string }>
ok(shots.every((s) => len(s.prompt) <= KLING4_PROMPT_MAX) && shots.some((s) => /C-54/.test(s.prompt)), '(4) no corpo do POST (multi_prompt) o avião chega e todo shot ≤ 512')
const semImagens = exigirSujeitoNoKling4({ pedido: ped, leitura: leituraAviao, falas: falasAviao, prompts: k4Aviao })
ok(semImagens.relato.cena === 1, '(4) sem imagens: a cena cuja fala cita o avião (ficha "C-54") é a corrigida')
// falha da chamada: prompts e imagens byte a byte
const falhou: ResultadoSemantico<LeituraDoSujeito> = { ok: false, erro: 'prazo', ms: 4001, model: 'gpt-4o-mini', tentativas: 2 }
const intacto = exigirSujeitoNoKling4({ pedido: ped, leitura: falhou, falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
ok(!intacto.relato.corrigido && intacto.prompts.every((q, i) => q === k4Aviao[i]) && intacto.stills.every((s, i) => s === stillsAviao[i]) && intacto.relato.leitura?.erro === 'prazo' && intacto.relato.motivo_sem_sujeito === 'leitura_falhou:prazo', '(4) chamada falhou (prazo): prompts e imagens byte a byte, e o relato diz por quê')
const descartadoJaws = exigirSujeitoNoKling4({ pedido: pedidoDaRota({ prompt: 'Jaws: facts you never knew', script_mode: 'ai' }, []), leitura: await leituraDe('Jaws: facts you never knew', gravado('rv4-jaws')), falas: falasAviao, prompts: k4Aviao })
ok(!descartadoJaws.relato.corrigido && /^uso_|^sem_sujeito$/.test(String(descartadoJaws.relato.motivo_sem_sujeito)), `(4) v5: todo descarte grava o motivo no relato ("Jaws": ${descartadoJaws.relato.motivo_sem_sujeito}) — nada some em silêncio`)
// o passo inteiro da rota (sujeitoNoKling4): rede, aplicação e falha segura
const passo = await sujeitoNoKling4({ pedido: ped, falas: falasAviao, prompts: k4Aviao, stills: stillsAviao }, { ...OPC, fetchImpl: mock(gravado('rev-aviao-c54')).fetch })
ok(passo.relato.corrigido && passo.relato.cena === 3 && passo.stills[2] === null, '(4) v5: sujeitoNoKling4 (o passo da rota) lê e corrige numa chamada')
const passoFalha = await sujeitoNoKling4({ pedido: ped, falas: falasAviao, prompts: k4Aviao, stills: stillsAviao }, { ...OPC, fetchImpl: mock(500, 500).fetch })
ok(!passoFalha.relato.corrigido && passoFalha.prompts.every((q, i) => q === k4Aviao[i]) && passoFalha.relato.motivo_sem_sujeito === 'leitura_falhou:http_500', '(4) v5: sujeitoNoKling4 com HTTP 500: nada muda, motivo no relato')
const mSemPedido = mock(gravado('rev-aviao-c54'))
const passoSemPedido = await sujeitoNoKling4({ pedido: { pedido: null, fonte: null, motivo: 'roteiro_da_pessoa' }, falas: falasAviao, prompts: k4Aviao }, { ...OPC, fetchImpl: mSemPedido.fetch })
ok(mSemPedido.chamadas === 0 && !passoSemPedido.relato.corrigido && passoSemPedido.relato.motivo_sem_sujeito === 'sem_pedido', '(4) v5: sem pedido original confiável a chamada nem sai')
const nula = exigirSujeitoNoKling4({ pedido: ped, leitura: null, falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
ok(!nula.relato.corrigido && nula.relato.leitura === null && nula.prompts.every((q, i) => q === k4Aviao[i]), '(4) leitura não chamada: nada muda')
// criança com caneta 3D (resposta gravada) e vida sob o gelo (resposta gravada)
const pedidoCaneta = 'criança com caneta 3D'
const sCaneta = sujeitoObrigatorio({ leitura: await leituraDe(pedidoCaneta, gravado('rev-caneta-3d')) })!
ok(sCaneta.tipo === 'pessoa' && sCaneta.chaves.length === 2, `(4) caneta 3D: "${sCaneta.frase}" exige criança E caneta`)
ok(!promptMostraOSujeito('A child smiles at a toy car', sCaneta) && promptMostraOSujeito('A young child holds a 3D printing pen over a desk', sCaneta), '(4) só a criança sem a caneta não conta; criança com a caneta conta')
const k4Caneta = k4De(pedidoCaneta, ['Macro shot of melted colorful plastic strands forming a tiny car shape on a wooden desk', 'Close-up of tiny plastic wheels and doors taking shape in the air', 'A finished colorful 3D-printed toy car rolling across a wooden desk'])
const corrCaneta = exigirSujeitoNoKling4({ pedido: pedidoDaRota({ prompt: pedidoCaneta, script_mode: 'ai' }, []), leitura: await leituraDe(pedidoCaneta, gravado('rev-caneta-3d')), falas: ['Layer by layer, a tiny car is born.', 'Wheels, doors, a shiny roof.', 'And the little car is ready to roll!'], prompts: k4Caneta })
ok(corrCaneta.relato.cena === 3 && promptMostraOSujeito(corrCaneta.prompts[2], sCaneta), '(4) nenhuma fala cita a criança: entra na última cena')
const sGelo = sujeitoObrigatorio({ leitura: await leituraDe('vida sob o gelo', gravado('rev-vida-gelo')) })!
ok(sGelo.tipo === 'criatura' && /ice/.test(sGelo.frase), `(4) vida sob o gelo (resposta gravada): "${sGelo.frase}"`)
ok(promptMostraOSujeito('Small glowing creatures drift beneath a thick ice ceiling', sGelo) && !promptMostraOSujeito('Aerial shot of an endless white ice sheet', sGelo), '(4) "já está em cena": criaturas debaixo do gelo contam; só o gelo não')
const falasGelo = ['Debaixo de três quilômetros de gelo, um oceano escuro espera.', 'Nenhuma luz chega lá embaixo.', 'E mesmo assim, ali, a vida existe sob o gelo.']
const corrGelo = exigirSujeitoNoKling4({ pedido: pedidoDaRota({ prompt: 'vida sob o gelo', script_mode: 'ai' }, falasGelo), leitura: await leituraDe('vida sob o gelo', gravado('rev-vida-gelo')), falas: falasGelo, prompts: k4De('vida sob o gelo', ['Aerial shot of an endless white ice sheet under a pale sky', 'Dark blue water beneath a thick ice ceiling, faint light', 'Aerial shot of an endless white ice sheet at dusk']) })
ok(corrGelo.relato.cena === 3, '(4) a fala em português que cita "vida sob o gelo" (palavra do próprio pedido) escolhe a cena 3')
// já presente / núcleo fora do dicionário
const comAviao = ['Photoreal film. Low-angle shot. A silver C-54 airplane flies low over snowy peaks. Mouth closed, no speaking.', ...k4Aviao.slice(1)]
const ja = exigirSujeitoNoKling4({ pedido: ped, leitura: leituraAviao, falas: falasAviao, prompts: comAviao, stills: stillsAviao })
ok(ja.relato.ja_presente && !ja.relato.corrigido && ja.prompts.every((q, i) => q === comAviao[i]), '(4) o avião já está em cena: nada muda')
ok(chavesDoSujeito('a plump raccoon on a windowsill', 'raccoon')[0]?.test('A raccoon sneaks along the sill') === true, '(4) fora do dicionário: o núcleo apontado pelo modelo ("raccoon") prova presença')
const apertado = comSujeitoNaCena('Photoreal film. ' + 'Very long descriptive scene text, '.repeat(20) + 'no readable text. Mouth closed, no speaking.', 'a child holding a 3D printing pen', 2)
ok(len(apertado) <= KLING4_ORCAMENTO_DA_CAMADA && apertado.includes('Main subject clearly visible in frame: a child holding a 3D printing pen.') && apertado.endsWith('Mouth closed, no speaking.'), '(4) orçamento apertado: a cláusula entra, o corpo encolhe, a cauda fica')
// romance adulto
ok(sujeitoObrigatorio({ leitura: await leituraDe(pedidoCaneta, gravado('rev-caneta-3d')), pessoaPermitida: false }) === null, '(4) pedido adulto (pessoaPermitida=false): gente genérica nunca vira sujeito')

// ═══ (5) o fim: detector estreito + juiz semântico ═══
const r = (hook: string, payoff: string) => `HOOK (0-2s): [Pexels: x] ${hook}\nMICRO REWARD 1: [Pexels: y] In 2014, Curiosity's sensors spiked tenfold in a single crater.\nPAYOFF: [Pexels: z] ${payoff}`
ok(finalFracoDoRoteiro(r('What did NASA never announce about Mars?', 'So what is NASA still hiding?')) === 'pergunta', '(5) estreito: termina em pergunta')
ok(finalFracoDoRoteiro(r('What NASA never announced about Mars.', 'NASA never announced it about Mars.')) === 'repete_gancho', '(5) estreito: quase igual ao HOOK')
ok(finalFracoDoRoteiro('HOOK: What NASA never announced about Mars.\nPAYOFF: ') === 'sem_revelacao', '(5) estreito: PAYOFF sem frase')
ok(finalFracoDoRoteiro(r('What NASA never announced about Mars.', 'Late at night, engineers say the truth is still out there.')) === null, '(5) estreito NÃO julga clima (isso é do juiz semântico) — nada de lista de bordões')
ok(finalFracoDoRoteiro(r('What NASA never announced about Mars.', 'Because methane spikes keep appearing, and NASA is still watching.')) === null && finalFracoDoRoteiro(r('What did NASA never announce about Mars?', 'The spikes were methane... a gas that on Earth comes mostly from living things.')) === null, '(5) estreito deixa passar fim concreto e fim ambíguo (o juiz decide)')
ok(!quaseIgualAoGancho('Mars hides methane in a single crater.', 'What NASA never announced about Mars.'), '(5) frase com fatos novos não é eco do HOOK')
ok(ultimaFraseDoRoteiro(`HOOK: x\nPAYOFF: The spikes were methane. Follow for more mysteries!`) === 'The spikes were methane.', '(5) o CTA de rede social não conta como última frase')
ok(/does not state the concrete answer/.test(problemaDoFinal('sem_resposta')) && /question/.test(problemaDoFinal('pergunta')), '(5) problemaDoFinal tem o motivo do juiz semântico')
const ent = entradaDoJuizDoFinal(r('What NASA never announced about Mars.', 'The spikes were methane. Follow for more!'))
ok(ent?.hook === 'What NASA never announced about Mars.' && /spiked tenfold/.test(ent.meio) && ent.payoff === 'The spikes were methane.' && !/\[/.test(JSON.stringify(ent)), '(5) o juiz lê HOOK, meio e PAYOFF falados (sem pistas, sem CTA)')
let finalIguais = 0, finalCertos = 0, finalContados = 0
for (const c of CAL.final as Array<{ id: string; rotulo: boolean | 'amb'; roteiro: string; passadas: Array<{ ends_with_concrete_answer: boolean | null; cru: string }> }>) {
  for (const p of c.passadas) {
    const j = await finalTemRespostaConcreta(c.roteiro, { ...OPC, fetchImpl: mock(p.cru).fetch })
    if (j.ok && j.valor.ends_with_concrete_answer === p.ends_with_concrete_answer) finalIguais++
    if (c.rotulo !== 'amb') { finalContados++; const fraco = !!finalFracoDoRoteiro(c.roteiro) || (j.ok && fimSemResposta(j.valor)); if (fraco === !c.rotulo) finalCertos++ }
  }
}
const finalTotal = (CAL.final as Array<{ passadas: unknown[] }>).reduce((n, c) => n + c.passadas.length, 0)
ok(finalIguais === finalTotal, `(5) o juiz do fim lê as ${finalTotal} respostas gravadas exatamente`)
ok(fimSemResposta({ hook_promises_answer: true, ends_with_concrete_answer: false }) && !fimSemResposta({ hook_promises_answer: false, ends_with_concrete_answer: false }) && !fimSemResposta({ hook_promises_answer: true, ends_with_concrete_answer: true }), '(5) v5: só "o gancho deve uma resposta E o fim não a entrega" pede a nova tentativa')
const narrativos = (CAL.final as Array<{ id: string; passadas: Array<{ cru: string }> }>).filter((c) => ['rv4-fim-menina-chave', 'rv4-fim-leao-leo', 'rv4-fim-keep-going', 'rv4-fim-3-habitos', 'cego-fim-raposa', 'cego-fim-devocional', 'cego-fim-romance', 'cego-fim-dicas-sono'].includes(c.id))
ok(narrativos.length === 8 && narrativos.every((c) => c.passadas.every((p) => !fimSemResposta(JSON.parse(p.cru)))), '(5) v5: fins de história, infantil, motivacional, devocional, romance e lista (os 3 que a v4 reprovava + 5 cegos) NÃO pedem nova tentativa nas respostas gravadas')
ok(CAL.placar.final.cego.contados >= 8 && CAL.placar.final.cego.fim_bom_reprovado === 0 && CAL.placar.final.cego.acertos / CAL.placar.final.cego.contados >= 0.85, `(5) v5: fim no conjunto CEGO: ${CAL.placar.final.cego.acertos}/${CAL.placar.final.cego.contados}, nenhum fim bom reprovado`)
ok(finalCertos / finalContados >= 0.85, `(5) fim (respostas gravadas): ${finalCertos}/${finalContados} decisões certas, incluindo os 5 fins de clima que a v3 deixava passar`)
const truthOutThere = (CAL.final as Array<{ id: string; passadas: Array<{ ends_with_concrete_answer: boolean }> }>).filter((c) => ['fim-truth-out-there', 'fim-something-waiting', 'fim-investigators', 'fim-ninguem-sabe', 'fim-nadie-sabe'].includes(c.id))
ok(truthOutThere.length === 5 && truthOutThere.every((c) => c.passadas.every((p) => fimSemResposta(JSON.parse((p as unknown as { cru: string }).cru)))), '(5) os 5 fins que derrubaram a v3 ("Late at night, engineers say the truth is still out there." etc.) são reprovados pelo juiz')

// ═══ (6) as rotas ═══
const rota = rd('app/api/generate-video-cinematic/route.ts')
const escritor = rd('app/api/generate-script/route.ts')
const cliente = rd('app/(dashboard)/generate/GenerateClient.tsx')
ok(!/comRevelacaoNoFim|finalResposta'/.test(rota), '(6) cinematic: a injeção crua da revelação na última cena SAIU (nem import)')
ok(/KINEO-FINAL-RESPOSTA-0111: when the opening narration promises an answer/.test(rota), '(6) cinematic: fica só a instrução do descritor (a última cena MOSTRA a resposta)')
ok(/submit: async \(\) => \{ await aplicarSujeitoNoKling4\(\); return submitKling4TrialVideo\(/.test(rota) && rota.indexOf('aplicarSujeitoNoKling4(); return') > rota.indexOf('reserve: () => reserveKling4Trial('), '(6) cinematic v5: a chamada semântica sai DENTRO do submit — depois da reserva aprovada e só no ramo das 3 cenas')
ok(!/await lerSujeitoDoPedido\(/.test(rota) && /if \(!kling4PedidoSujeito\) return/.test(rota) && /sujeitoNoKling4\(\{ pedido: kling4PedidoSujeito/.test(rota) && /sujeito_obrigatorio: kling4Sujeito\.r\?\.relato \?\? null/.test(rota), '(6) cinematic: sem pedido confiável nada sai; a leitura vai para a checagem e o relato (com a leitura crua e o motivo) vai no claim')
ok(/kling4TrialCandidate && !desenhoInfantil\.ativo \? pedidoOriginalDoSujeito/.test(rota), '(6) cinematic: só no Kling 4 grátis, nunca no desenho infantil')
ok(/if \(!colado\.pasted\) \{[\s\S]{0,500}if \(!outroMotivoDeRetry\) \{\s*const juiz = await finalTemRespostaConcreta\(script, \{ pedido: temaDoEscritor \}\)/.test(escritor), '(6) escritor v5: o juiz só roda no roteiro da IA, só quando nenhum outro motivo já pede a nova tentativa, e lê o pedido')
ok(/const outroMotivoDeRetry = missing\.length > 0 \|\| payoffIsEmpty\(script\) \|\| curtoParaOAlvo\(script\) \|\| longoParaOFilmeCurto\(script\) \|\| leuADescricao\(script\) \|\| !!finalFraco/.test(escritor), '(6) escritor v5: os outros motivos de nova tentativa são conferidos antes do juiz')
ok(/if \(juiz\.ok && fimSemResposta\(juiz\.valor\)\) \{ finalFraco = 'sem_resposta'; rastroDoFinal\.retry_so_pelo_final = true \}/.test(escritor), '(6) escritor v5: só deve-e-não-entrega = a MESMA nova tentativa; erro do juiz = nada muda')
ok(/\} else if \(!rastroDoFinal\?\.retry_so_pelo_final \|\| retryNaoPiora\(retryScript\)\) \{/.test(escritor) && /const adotaFinal = !rastroDoFinal\?\.retry_so_pelo_final \|\| retryNaoPiora\(fimDaTentativa\.script\)/.test(escritor), '(6) escritor v5: a reescrita pedida só pelo juiz só substitui a original se não piorar (filme longo e curto)')
ok(/final_resposta: rastroDoFinal/.test(escritor), '(6) escritor: o resultado vai no script_written (auditoria)')
ok(/\(colado\.pasted \|\| !finalFracoDoRoteiro\(t\)\)/.test(escritor), '(6) escritor: a escolha entre as duas versões do filme curto usa só o detector estreito (sem rede)')
ok(/original_idea: ideiaDoRoteiroRef\.current\.ideia\.slice\(0, 600\)/.test(cliente) && /ideiaDoRoteiroRef\.current\.roteiro === trimmed/.test(cliente), '(6) cliente: a ideia original só acompanha o roteiro que nasceu dela')

console.log(`\n${pass}/${pass + fail} verificações`)
if (fail) process.exit(1)
