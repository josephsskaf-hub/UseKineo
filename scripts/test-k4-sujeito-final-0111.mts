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
// v6 (revisão do c5dbdbcf3): presença exige o NÚCLEO (família só reforça), nome de pessoa fora do texto injetado, juiz do fim e
// reescrita dentro do prazo de 60 s da rota, regra do sujeito no descritor só no Kling 4 grátis; casos rv5-* com resposta MOCKADA
// (OpenAI sem crédito em 01/11 — pendente de medir com scripts/calibrar-k4-sujeito-final-0111.mts).
// v7 (revisão do 21d3c2333): nome de pessoa em "by X", possessivo de grupo e verbo no passado também fora do prompt pago; artigo
// refeito; lugar/navio/árvore/marca ficam; núcleo com gênero e "Lego" exigidos; regra do descritor só com 3 cenas; casos rv6-* MOCKADOS.
// v8 (revisão do c04a09837): o corte cirúrgico do nome (semNomeDePessoa) SAIU. O motor recebe o campo subject_visual_no_people que o
// modelo escreve sem gente, validado por visualSemPessoas (corta oração de dono/autor, tira possessivo de pessoa, recusa maiúscula fora
// da lista fechada e nome escondido em minúscula, recusa texto quebrado). Prompt mudou → calibração REAL refeita (os mocks saíram).
// Rodar: npx tsx scripts/test-k4-sujeito-final-0111.mts
import { readFileSync, existsSync } from 'node:fs'
import { buildClassicVisualPrompt } from '@/lib/cinematic/visualPromptPolicy'
import { deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'
import { promptDaCenaKling4, KLING4_ORCAMENTO_DA_CAMADA, KLING4_PROMPT_MAX } from '@/lib/cinematic/cenaKling4'
import { buildKling4TrialInput } from '@/lib/kling4Trial'
import * as sujeitoMod from '@/lib/cinematic/sujeitoObrigatorio'
import { sujeitoObrigatorio, avaliarSujeito, exigirSujeitoNoKling4, sujeitoNoKling4, promptMostraOSujeito, comSujeitoNaCena, pedidoOriginalDoSujeito, pedidoCurto, lerSujeitoDoPedido, lerLeituraDoSujeito, chavesDoSujeito, visualSemPessoas, EXEMPLOS_SUJEITO_0111, SYSTEM_SUJEITO_0111, type ResultadoSemantico, type LeituraDoSujeito } from '@/lib/cinematic/sujeitoObrigatorio'
import * as finalMod from '@/lib/cinematic/finalResposta'
import { finalFracoDoRoteiro, ultimaFraseDoRoteiro, problemaDoFinal, finalTemRespostaConcreta, entradaDoJuizDoFinal, quaseIgualAoGancho, fimSemResposta, orcamentoDoJuizDoFinal, cabeReescritaDoFinal, PRAZO_DA_ROTA_DO_ESCRITOR_MS } from '@/lib/cinematic/finalResposta'
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
const cruDe = (subject: string | null, kind: string, mention: string[] = [], real = false, extra: Record<string, unknown> = {}) => JSON.stringify({ reasoning: 'teste', subject, head_noun: subject ? subject.split(/\s+/).filter((w) => /^\p{Ll}{3,}$/u.test(w) && !['the', 'that', 'with'].includes(w)).pop() ?? null : null, subject_visual_no_people: subject, kind, real_person: real, has_human: false, mention_words: mention, word_use: kind === 'none' ? 'none' : 'literal', request_language: 'pt', ...extra })

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
const v = (pedido: string, o: Record<string, unknown>) => lerLeituraDoSujeito({ reasoning: 'teste', subject: null, head_noun: null, subject_visual_no_people: o.subject ?? null, kind: 'none', real_person: false, has_human: false, mention_words: [], word_use: 'literal', request_language: 'en', ...o }, pedido)
ok(v('The real story of Billy the Kid', { subject: 'a child', kind: 'person_generic', real_person: true, mention_words: ['Kid'] })?.descartado === 'pessoa_real', '(2) real_person=true: nada a injetar, mesmo com subject')
ok(v('O que Lula disse', { subject: null, kind: 'none' })?.descartado === 'sem_sujeito', '(2) kind none: nada a injetar')
ok(v('cara ou coroa: a matemática da moeda', { subject: 'a moeda', head_noun: 'moeda', kind: 'object', mention_words: ['moeda'], request_language: 'pt' })?.descartado === 'sujeito_sem_traducao', '(2) sujeito copiado sem traduzir ("a moeda", resposta real da calibração): descartado')
ok(v('cara ou coroa: a matemática da moeda', { subject: 'a coin', head_noun: 'coin', kind: 'object', mention_words: ['moeda'], request_language: 'pt' })?.subject_visual === 'a coin', '(2) o mesmo pedido com "a coin": vale')
ok(v("Leonardo da Vinci's flying machine", { subject: "Leonardo da Vinci's flying machine", subject_visual_no_people: 'a wooden flying machine', head_noun: 'machine', kind: 'object', mention_words: ['flying machine'], request_language: 'en' })?.subject_visual === 'a wooden flying machine', '(2) v5/v8: pedido em inglês com "da" não cai na checagem de tradução (a língua é a que o modelo leu) — e o motor recebe o campo visual, sem o inventor (v8)')
ok(v("Leonardo da Vinci's flying machine", { subject: "Leonardo da Vinci's flying machine", head_noun: 'machine', kind: 'object', mention_words: ['flying machine'], request_language: 'en' })?.subject_visual === null, '(2) v8: se o campo visual copiar o nome ("Leonardo da Vinci\'s flying machine"), tirar o possessivo deixa "Leonardo da flying machine" — maiúscula, nada injetado (nunca consertado)')
const fl19 = v('What really happened to Flight 19', { subject: 'Flight 19', head_noun: 'flight', kind: 'vehicle', mention_words: ['Flight 19'] })
ok(fl19?.subject_visual === null && fl19?.descartado === 'visual_com_maiuscula', '(2) só nome/número ("Flight 19"): o campo visual tem nome com maiúscula — descartado, o motor não sabe o que desenhar')
const ssl = v('the SS St. Louis', { subject: 'the SS St. Louis', head_noun: 'louis', kind: 'vehicle', mention_words: ['the SS St. Louis'] })
ok(ssl?.subject_visual === null && !!ssl?.descartado, '(2) "the SS St. Louis" sem "ship" (núcleo "Louis" é nome, não substantivo comum): descartado')
ok(lerLeituraDoSujeito({ reasoning: 't', subject: 'a cat', head_noun: 'cat', kind: 'creature', real_person: false, has_human: false, mention_words: ['cat'], word_use: 'literal', request_language: 'en' }, 'a cat') === null, '(2) v8: resposta sem o campo subject_visual_no_people (formato da v7) = null (falha segura)')
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
let proibidosNoTexto = 0
for (const c of CAL.sujeito as Array<{ id: string; pedido: string; rotulo: string; aceita?: string; secundario?: string; proibido?: string; passadas: Array<{ subject: string | null; cru: string }> }>) {
  const aceita = c.aceita ? new RegExp(c.aceita, 'i') : null
  let pior = 'ok'
  for (const p of c.passadas) {
    const s = sujeitoObrigatorio({ leitura: await leituraDe(c.pedido, p.cru) })
    total++; if ((s?.frase ?? null) === p.subject) iguais++ // v8: o gravado já é o texto do motor (campo visual validado)
    const f = s?.frase ?? null
    if (f && c.proibido && new RegExp(c.proibido, 'i').test(f)) { proibidosNoTexto++; console.log('    nome proibido no texto:', c.id, f) }
    const vered = f && c.proibido && new RegExp(c.proibido, 'i').test(f) ? 'grave' : c.rotulo === 'neg' ? (f ? 'grave' : 'ok') : !f ? (c.rotulo === 'pos' ? 'perdeu' : 'ok') : aceita!.test(f) ? 'ok' : c.secundario && new RegExp(c.secundario, 'i').test(f) ? 'perdeu' : 'grave'
    if (vered === 'grave') pior = 'grave'; else if (vered === 'perdeu' && pior === 'ok') pior = 'perdeu'
  }
  if (pior === 'grave') { graves++; console.log('    grave:', c.id) }
  if (c.rotulo === 'pos') { posTotal++; if (pior === 'ok') posAcertos++ }
}
ok(iguais === total, `(3) a validação de hoje reproduz o texto do motor gravado na calibração REAL da v8 (${iguais}/${total})`)
ok(proibidosNoTexto === 0, `(3) v8: nenhum nome "proibido" (sem caixa) no texto do motor das ${total} respostas reais gravadas`)
ok(CAL.placar.sujeito.versao === 'k4_sujeito_0111_v8_semantico' && (CAL.sujeito as Array<{ passadas: Array<{ cru: string }> }>).every((c) => c.passadas.every((p) => 'subject_visual_no_people' in JSON.parse(p.cru))), '(3) v8: a calibração gravada é da v8 (toda resposta crua tem o campo subject_visual_no_people — nenhum mock)')
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
ok(corr.relato.leitura?.ok === true && corr.relato.leitura.subject_visual === sAviao.frase && typeof corr.relato.leitura.subject === 'string' && typeof corr.relato.leitura.subject_visual_no_people === 'string' && corr.relato.leitura.head_noun === 'airplane' && corr.relato.leitura.word_use === 'literal' && corr.relato.leitura.model === 'gpt-4o-mini' && corr.relato.versao === 'k4_sujeito_0111_v8_semantico' && corr.relato.motivo_sem_sujeito === null, '(4) o relato do claim guarda a leitura semântica crua (subject, campo visual cru e o validado que foi ao motor)')
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
ok(/\$\{kling4Gratis \? \x60\n- KINEO-K4-SUJEITO-0111: /.test(rota) && /sheet: desenhoInfantil\.personagem\.sheet \} : null, kling4TrialCandidate && scenes\.length === 3\)\)/.test(rota) && !/or as wreckage/.test(rota), '(6) cinematic v6: a regra do sujeito no descritor de cenas só vai no Kling 4 grátis (os outros motores clássicos recebem o system de antes), sem o exemplo de destroços')
ok(/if \(!colado\.pasted\) \{[\s\S]{0,900}const orcamentoDoJuiz = outroMotivoDeRetry \? null : orcamentoDoJuizDoFinal\(Date\.now\(\) - inicioDaRota, OPENAI_SCRIPT_TIMEOUT_MS\)[\s\S]{0,400}if \(!outroMotivoDeRetry && orcamentoDoJuiz\) \{\s*const juiz = await finalTemRespostaConcreta\(script, \{ pedido: temaDoEscritor, \.\.\.orcamentoDoJuiz \}\)/.test(escritor), '(6) escritor v6: o juiz só roda no roteiro da IA, só quando nenhum outro motivo já pede a nova tentativa, lê o pedido e só sai com prazo que deixa a reescrita caber')
ok(/const outroMotivoDeRetry = missing\.length > 0 \|\| payoffIsEmpty\(script\) \|\| curtoParaOAlvo\(script\) \|\| longoParaOFilmeCurto\(script\) \|\| leuADescricao\(script\) \|\| !!finalFraco/.test(escritor), '(6) escritor v5: os outros motivos de nova tentativa são conferidos antes do juiz')
ok(/if \(juiz\.ok && fimSemResposta\(juiz\.valor\)\) \{\s*if \(cabeReescritaDoFinal\(Date\.now\(\) - inicioDaRota, OPENAI_SCRIPT_TIMEOUT_MS\)\) \{ finalFraco = 'sem_resposta'; rastroDoFinal\.retry_so_pelo_final = true \}\s*else rastroDoFinal\.retry_pulado_por_prazo = true/.test(escritor), '(6) escritor v6: só deve-e-não-entrega = a MESMA nova tentativa, e só se a reescrita ainda couber; erro do juiz = nada muda')
ok(/export async function POST\(req: NextRequest\) \{\s*const inicioDaRota = Date\.now\(\)/.test(escritor) && /export const maxDuration = 60\b/.test(escritor) && PRAZO_DA_ROTA_DO_ESCRITOR_MS === 60_000, '(6) escritor v6: o relógio começa na entrada da rota e o prazo do juiz é o mesmo maxDuration (60 s)')
ok(/\} else if \(!rastroDoFinal\?\.retry_so_pelo_final \|\| retryNaoPiora\(retryScript\)\) \{/.test(escritor) && /const adotaFinal = !rastroDoFinal\?\.retry_so_pelo_final \|\| retryNaoPiora\(fimDaTentativa\.script\)/.test(escritor), '(6) escritor v5: a reescrita pedida só pelo juiz só substitui a original se não piorar (filme longo e curto)')
ok(/final_resposta: rastroDoFinal/.test(escritor), '(6) escritor: o resultado vai no script_written (auditoria)')
ok(/\(colado\.pasted \|\| !finalFracoDoRoteiro\(t\)\)/.test(escritor), '(6) escritor: a escolha entre as duas versões do filme curto usa só o detector estreito (sem rede)')
ok(/original_idea: ideiaDoRoteiroRef\.current\.ideia\.slice\(0, 600\)/.test(cliente) && /ideiaDoRoteiroRef\.current\.roteiro === trimmed/.test(cliente), '(6) cliente: a ideia original só acompanha o roteiro que nasceu dela')

// ═══ (7) v6 — revisão adversarial do c5dbdbcf3 ═══
// 7a. a presença exige o NÚCLEO; a família só reforça (os 5 casos da revisão, que no c5dbdbcf3 passavam como "já em cena")
for (const [frase, nucleo, semNucleo, comNucleo] of [
  ['a dog waiting at a train station', 'dog', 'A train pulls into an empty station at dusk', 'A loyal dog sits on a train platform as a train pulls in'],
  ['an astronaut cat on the moon', 'cat', 'An astronaut plants a flag on the moon', 'A cat in a tiny astronaut suit bounces on the moon'],
  ['a boy who found a meteorite', 'boy', 'A glowing meteorite smokes in a crater', 'A boy kneels beside a glowing meteorite'],
  ['a flying car stuck in traffic', 'car', 'Cars stuck bumper to bumper in traffic', 'A flying car hovers above a traffic jam'],
  ['an old fisherman with his boat', 'fisherman', 'A wooden boat rocks in the harbor at dawn', 'Two old fishermen haul a net into a wooden boat'],
] as const) {
  const sj = { frase, tipo: 'objeto' as const, chaves: chavesDoSujeito(frase, nucleo), tokens: [] as string[], mencoes: [] as string[], origem: 'pedido' as const }
  ok(!promptMostraOSujeito(semNucleo, sj) && promptMostraOSujeito(comNucleo, sj), `(7) v6: "${frase}" — sem o núcleo "${nucleo}" NÃO está em cena; com ele, está`)
}
ok(chavesDoSujeito('a cat on the moon', 'cat').length === 1 && chavesDoSujeito('a talking parrot', 'parrot').length === 1, '(7) v6: núcleo sem família nem modificador visual = 1 chave ("talking" não muda o que se vê)')
ok(chavesDoSujeito('a pack of wolves', 'wolves')[0].test('A lone wolf howls') && chavesDoSujeito('an old fisherman', 'fisherman')[0].test('Fishermen at dawn') && chavesDoSujeito('two women walking', 'women')[0].test('A woman walks'), '(7) v6: plural irregular do núcleo (wolf/wolves, fisherman/fishermen, woman/women)')
ok(chavesDoSujeito('a dog', 'cat').length === 0 && chavesDoSujeito('a dog at a train station', null).length === 0, '(7) v6: núcleo ausente da frase, ou sem núcleo = nada a provar (a leitura já foi descartada como sem_nucleo)')
const pedDog = pedidoOriginalDoSujeito({ prompt: 'a dog waiting at a train station', ideiaSolta: true, scriptMode: 'ai' })
// v8: os mocks rv5/rv6 SAÍRAM — as respostas são as REAIS gravadas na calibração da v8
ok(!existsSync('scripts/test-support/k4-sujeito-0111-v6-mocks.json') && !existsSync('scripts/test-support/k4-sujeito-0111-v7-mocks.json'), '(7) v8: os arquivos de resposta MOCKADA saíram (as respostas reais estão na calibração gravada)')
const leDog = await leituraDe('a dog waiting at a train station', gravado('rv5-dog-train'))
const k4Dog = ['Photoreal film. Wide shot. A train pulls into an empty station at dusk. Mouth closed, no speaking.', 'Photoreal film. Close-up. Rain on the station clock. Mouth closed, no speaking.', 'Photoreal film. Aerial. The train leaves into the fog. Mouth closed, no speaking.']
const corrDog = exigirSujeitoNoKling4({ pedido: pedDog, leitura: leDog, falas: ['Every day at five, he came back.', 'Rain or shine, he waited.', 'For ten years, the dog never missed a train.'], prompts: k4Dog })
ok(!corrDog.relato.ja_presente && corrDog.relato.corrigido && corrDog.relato.cena === 3 && /Main subject clearly visible in frame: a dog waiting at a train station\./.test(corrDog.prompts[2]), `(7) v6: "a dog waiting at a train station" com prompts só de trem: corrigido na cena ${corrDog.relato.cena} (no c5dbdbcf3 era "já presente")`)
// 7b. nome de pessoa real fora do texto injetado — v8: pelo campo visual validado, não mais pelo corte dentro do subject
const napGravado = (CAL.sujeito as Array<{ id: string; passadas: Array<{ cru: string }> }>).find((c) => c.id === 'rv4-napoleon-hat')!
const lNap = await leituraDe("Why Napoleon's hat sold for 2 million dollars", napGravado.passadas[0].cru)
ok(lNap.ok && /hat/.test(String(lNap.valor.subject_visual)) && !/napoleon/i.test(String(lNap.valor.subject_visual)), `(7) v8: a resposta REAL gravada do Napoleão vai ao motor como "${lNap.ok ? lNap.valor.subject_visual : null}" (sem o nome)`)
const sNapMal = lerLeituraDoSujeito({ reasoning: 't', subject: "Napoleon's hat", head_noun: 'napoleon', subject_visual_no_people: "Napoleon's hat", kind: 'object', real_person: false, has_human: false, mention_words: ['hat'], word_use: 'literal', request_language: 'en' }, "Napoleon's hat")
ok(sNapMal?.subject_visual === null, '(7) v6/v8: se o núcleo for o próprio nome, nada é injetado')
const lEinstein = lerLeituraDoSujeito({ reasoning: 't', subject: "Einstein's violin", head_noun: 'violin', subject_visual_no_people: 'a vintage violin', kind: 'object', real_person: false, has_human: false, mention_words: ['violino'], word_use: 'literal', request_language: 'pt' }, 'o violino de Einstein')
ok(lEinstein?.subject_visual === 'a vintage violin', '(7) v8: pedido em português com dono famoso: o motor recebe "a vintage violin"')
// 7c. os casos rv5-* com a resposta REAL gravada (v8)
const { CASOS_SUJEITO } = await import('./calibracao-k4-sujeito-final-0111-casos.mjs')
const crusDe = (id: string) => (CAL.sujeito as Array<{ id: string; passadas: Array<{ cru: string }> }>).find((c) => c.id === id)?.passadas.map((p) => p.cru) ?? []
const rv5 = (CASOS_SUJEITO as Array<{ id: string; pedido: string; aceita: string; proibido?: string; presente?: string[]; ausente?: string[] }>).filter((c) => c.id.startsWith('rv5-'))
ok(rv5.length === 11 && rv5.every((c) => crusDe(c.id).length === 2), '(7) v8: os 11 casos rv5-* têm as 2 respostas reais gravadas')
for (const c of rv5) for (const cru of crusDe(c.id)) {
  const s = sujeitoObrigatorio({ leitura: await leituraDe(c.pedido, cru) })
  const certo = !!s && new RegExp(c.aceita, 'i').test(s.frase) && (!c.proibido || !new RegExp(c.proibido, 'i').test(s.frase))
  const pres = !!s && (c.presente ?? []).every((q) => promptMostraOSujeito(q, s)) && (c.ausente ?? []).every((q) => !promptMostraOSujeito(q, s))
  ok(certo && pres, `(7) v8 [real] "${c.pedido}" → "${s?.frase ?? null}"${c.proibido ? ' (sem nome de pessoa)' : ''}${c.presente ? ' e presença pelo núcleo' : ''}`)
}
ok(lerLeituraDoSujeito({ reasoning: 't', subject: 'a moeda', head_noun: 'moeda', subject_visual_no_people: 'a moeda', kind: 'object', real_person: false, has_human: false, mention_words: ['moeda'], word_use: 'literal', request_language: 'pt' }, 'a moeda de ouro')?.descartado === 'sujeito_sem_traducao', '(7) v6: "a moeda" continua descartado (a lista de palavras iguais nas duas línguas é fechada)')
// 7d. o juiz do fim e a reescrita respeitam o prazo de 60 s da rota
const o0 = orcamentoDoJuizDoFinal(10_000, 35_000)
ok(o0?.prazoTotalMs === 5_500 && o0.timeoutMs === 4_000, '(7) v6: com 10 s gastos, o juiz tem os 5,5 s de sempre')
const o1 = orcamentoDoJuizDoFinal(19_000, 35_000)
ok(o1?.prazoTotalMs === 3_000 && o1.timeoutMs === 3_000, '(7) v6: com 19 s gastos, o prazo do juiz encolhe para a reescrita caber (3 s)')
ok(orcamentoDoJuizDoFinal(21_000, 35_000) === null && orcamentoDoJuizDoFinal(34_000, 35_000) === null, '(7) v6: 1ª chamada lenta (21 s, 34 s): o juiz nem é chamado — nenhuma 2ª chamada que estoure os 60 s')
ok(cabeReescritaDoFinal(22_000, 35_000) && !cabeReescritaDoFinal(22_001, 35_000), '(7) v6: a reescrita só sai se 35 s + 3 s de folga ainda cabem nos 60 s')
for (const gasto of [0, 5_000, 15_000, 17_000, 19_000, 20_000, 30_000]) {
  const o = orcamentoDoJuizDoFinal(gasto, 35_000)
  const pior = o ? gasto + o.prazoTotalMs + (cabeReescritaDoFinal(gasto + o.prazoTotalMs, 35_000) ? 35_000 : 0) : gasto
  ok(pior <= 57_000, `(7) v6: ${gasto / 1000} s gastos → pior caso ${pior / 1000} s ≤ 57 s (60 s − folga)`)
}
const mLento = mock('pendura', 'pendura')
const t0 = Date.now()
const jLento = await finalTemRespostaConcreta(r('What NASA never announced about Mars.', 'The truth is out there.'), { ...OPC, fetchImpl: mLento.fetch, timeoutMs: 60, prazoTotalMs: 90 })
ok(!jLento.ok && mLento.chamadas === 1 && Date.now() - t0 < 1_000, '(7) v6: o prazo encolhido do juiz é respeitado (sem 2ª tentativa que não caiba)')

// ═══ (8) v7/v8 — revisões do 21d3c2333 e do c04a09837 ═══
// 8a. v8: o campo visual validado — oração de dono/autor sai inteira; possessivo de pessoa sai; o que sobra de nome = nada injetado
for (const [visual, subject, nucleo, sai] of [
  ['a telescope built by Galileo Galilei 400 years ago', 'a telescope built by Galileo Galilei', 'telescope', 'a telescope'],
  ['a pen used by Abraham Lincoln to sign laws', "Abraham Lincoln's pen", 'pen', 'a pen'],
  ['a guitar signed by John Lennon years ago', 'a guitar signed by John Lennon', 'guitar', 'a guitar'],
  ['a guitar played by Jimi Hendrix 50 years ago', 'the guitar Jimi Hendrix played', 'guitar', 'a guitar'],
  ['a car owned by Elvis Presley as a teenager', "Elvis Presley's car", 'car', 'a car'],
  ['a car once owned by Elvis Presley then sold', "Elvis Presley's car", 'car', 'a car'],
  ['a flying machine designed by Leonardo da Vinci 500 years ago', "Leonardo da Vinci's flying machine", 'machine', 'a flying machine'],
  ['a car similar to the one James Dean drove', 'the car James Dean drove', 'car', 'a car'],
  ['a crown belonging to King Arthur centuries ago', "King Arthur's crown", 'crown', 'a crown'],
  ['a sculpture by Michelangelo Buonarroti called David', 'a sculpture by Michelangelo', 'sculpture', 'a sculpture'],
  ['a painting by the Dutch master Rembrandt', 'a painting by Rembrandt', 'painting', 'a painting'],
  ['a sword wielded by Joan of Arc', "Joan of Arc's sword", 'sword', 'a sword'],
  ['the lifeboats of the Titanic', "the Titanic's lifeboats", 'lifeboats', 'the lifeboats'],
  ["the Titanic's lifeboats", "the Titanic's lifeboats", 'lifeboats', 'the lifeboats'],
  ['a vintage postcard of San Francisco', 'a postcard of San Francisco', 'postcard', 'a vintage postcard'],
  ['a ancient mask', "King Tut's golden mask", 'mask', 'an ancient mask'],
  ["napoleon's old hat", "Napoleon's hat", 'hat', 'old hat'],
] as const) ok(visualSemPessoas(visual, subject, nucleo).frase === sai, `(8) v8: "${visual}" → "${visualSemPessoas(visual, subject, nucleo).frase}" (esperado "${sai}")`)
// nome com epíteto, nome escondido em minúscula, marca/modelo e texto quebrado: NADA injetado (nunca consertado)
for (const [visual, subject, nucleo] of [
  ['an Alexander the helmet', "Alexander the Great's helmet", 'helmet'], ['a Catherine the crown', "Catherine the Great's crown", 'crown'],
  ['a Richard the sword', "Richard the Lionheart's sword", 'sword'], ['a Joan of sword', "Joan of Arc's sword", 'sword'],
  ["Alexander the Great's helmet", "Alexander the Great's helmet", 'helmet'], ["Joan of Arc's sword", "Joan of Arc's sword", 'sword'],
  ['a sword of arc', "Joan of Arc's sword", 'sword'], ['a hat napoleon wore', "Napoleon's hat", 'hat'],
  ['a car elvis presley gave away', 'the car Elvis Presley gave away', 'car'], ['a wolf, as mowgli saw it', 'a wolf, as Mowgli saw it', 'wolf'],
  ['a 1961 Lincoln Continental limousine', 'the car that John F. Kennedy rode in', 'limousine'], ['a silver Porsche 550 Spyder', 'the car James Dean drove', 'car'],
  ['a vintage McDonald restaurant', "the first McDonald's restaurant", 'restaurant'], ['a used car', 'a used car', 'car'], ['the', 'the car', 'car'],
  ['a the helmet', 'a helmet', 'helmet'], ['a helmet of', 'a helmet', 'helmet'], ['a black hat', 'a black hat', 'cap'], [null, 'a hat', 'hat'],
] as const) ok(visualSemPessoas(visual, subject, nucleo).frase === null, `(8) v8: "${visual}" → nada injetado (${visualSemPessoas(visual, subject, nucleo).motivo})`)
// o que não é nome de gente fica: código com dígito, nacionalidade/época/espécie da lista fechada, possessivo de substantivo comum
for (const [visual, subject, nucleo] of [
  ['a C-54 military airplane', 'a 1950s C-54 Skymaster airplane', 'airplane'], ['a child with a 3D pen', 'a child with a 3D pen', 'child'],
  ['a golden ancient Egyptian mask', "King Tut's golden mask", 'mask'], ['a Komodo dragon', 'a Komodo dragon', 'dragon'],
  ["students in a girls' school wearing hijabs", "students in a girls' school in Iran", 'students'], ["the American flag on the moon's surface", 'the flag of the United States on the moon', 'flag'],
  ['a boy who found a meteorite', 'a boy who found a meteorite', 'boy'], ['a fleet of C-54 airplanes', 'a fleet of C-54 airplanes', 'airplanes'],
  ['goats roaming a mountain village', 'Goats roaming a mountain village', 'goats'], ['a lego toy car', 'a Lego car', 'car'],
] as const) ok(visualSemPessoas(visual, subject, nucleo).frase === visual, `(8) v8: "${visual}" fica igual`)
ok(!('semNomeDePessoa' in sujeitoMod) && !/const (?:DEPOIS_DO_AUTOR|MARCA_COM_POSSESSIVO|COISA_COM_NOME_DE_GENTE|LUGAR_ANTES_DO_OF)/.test(fonteSujeito), '(8) v8: o corte cirúrgico do nome (semNomeDePessoa e suas exceções de lugar/navio/marca) SAIU')
// 8b. presença frouxa (menor 6) e formas do núcleo (menor 9)
const sjDe = (frase: string, nucleo: string) => ({ frase, tipo: 'objeto' as const, chaves: chavesDoSujeito(frase, nucleo), tokens: [] as string[], mencoes: [] as string[], origem: 'pedido' as const })
ok(!promptMostraOSujeito('a young girl running', sjDe('a 7-year-old boy', 'boy')) && promptMostraOSujeito('a little boy running', sjDe('a 7-year-old boy', 'boy')), '(8) v7: "a 7-year-old boy" não está em cena com "a young girl running" (a família child não substitui núcleo com gênero)')
ok(!promptMostraOSujeito('cars stuck in traffic', sjDe('a Lego car', 'car')) && promptMostraOSujeito('a red LEGO car on a desk', sjDe('a Lego car', 'car')), '(8) v7: "a Lego car" exige o Lego')
ok(!promptMostraOSujeito('cars stuck in traffic', sjDe('a toy brick car', 'car')) && promptMostraOSujeito('a small Lego car rolls across the floor', sjDe('a toy brick car', 'car')), '(8) v8: "a toy brick car" (modificador 2 palavras antes do núcleo) exige o brinquedo; "Lego" prova "toy"')
const wolves = chavesDoSujeito('a pack of wolves', 'wolves')[0]
ok(wolves.test('a lone wolf') && wolves.test('wolves at night') && !/wolfe/.test(wolves.source) && chavesDoSujeito('kitchen knives', 'knives')[0].test('a knife') && !/knifes/.test(chavesDoSujeito('a knife', 'knife')[0].source), '(8) v7: -ves volta a UM singular (wolf, knife; sem "wolfe"/"knifes")')
ok(chavesDoSujeito('bats sleeping in caves', 'caves')[0].test('a dark cave') && chavesDoSujeito('winter gloves', 'gloves')[0].test('a red glove') && !/caf|glof/.test(chavesDoSujeito('caves', 'caves')[0].source + chavesDoSujeito('gloves', 'gloves')[0].source), '(8) v8: "caves" → cave, "gloves" → glove (nunca "caf"/"glof")')
ok(chavesDoSujeito('a C-54 airplane', 'airplane')[0].test('a plane in the sky') && chavesDoSujeito('a Komodo dragon', 'dragon')[0].test('a huge monitor lizard'), '(8) v7: a família que contém o núcleo continua valendo (avião, Komodo)')
// 8c. o fluxo inteiro (lerLeituraDoSujeito → exigirSujeitoNoKling4) com as respostas REAIS gravadas dos casos rv6-* e rv7-*: o nome
// proibido nunca chega ao prompt pago, e o veredito gravado se repete
const rv67 = (CASOS_SUJEITO as Array<{ id: string; pedido: string; rotulo: string; aceita: string; proibido?: string; presente?: string[]; ausente?: string[] }>).filter((c) => /^rv[67]-/.test(c.id))
ok(rv67.length === 34 && rv67.every((c) => crusDe(c.id).length === 2), '(8) v8: os 34 casos rv6-*/rv7-* têm as 2 respostas reais gravadas')
const falasNeutras = ['It started quietly.', 'Nobody noticed at first.', 'Then everything changed.']
const promptsNeutros = ['Photoreal film. Wide shot. An empty room at dusk. Mouth closed, no speaking.', 'Photoreal film. Close-up. Dust in a beam of light. Mouth closed, no speaking.', 'Photoreal film. Aerial. A quiet street at dawn. Mouth closed, no speaking.']
let nomeNoPrompt = 0, rv67Acertos = 0, rv67Pos = 0
for (const c of rv67) {
  let todasCertas = true
  for (const cru of crusDe(c.id)) {
    const le = await leituraDe(c.pedido, cru)
    const s = sujeitoObrigatorio({ leitura: le })
    const k4 = exigirSujeitoNoKling4({ pedido: pedidoOriginalDoSujeito({ prompt: c.pedido, ideiaSolta: true, scriptMode: 'ai' }), leitura: le, falas: falasNeutras, prompts: promptsNeutros })
    if (c.proibido && k4.prompts.some((q) => new RegExp(c.proibido!, 'i').test(q))) { nomeNoPrompt++; console.log('    nome no prompt pago:', c.id, s?.frase) }
    const pres = !s || ((c.presente ?? []).every((q) => promptMostraOSujeito(q, s)) && (c.ausente ?? []).every((q) => !promptMostraOSujeito(q, s)))
    if (!s || !new RegExp(c.aceita, 'i').test(s.frase) || !pres) todasCertas = false
  }
  if (c.rotulo === 'pos') { rv67Pos++; if (todasCertas) rv67Acertos++ }
}
ok(nomeNoPrompt === 0, `(8) v8: nenhum nome proibido (sem caixa) no prompt pago dos 34 casos rv6/rv7 x 2 respostas reais`)
const gravadosRv67 = (CAL.sujeito as Array<{ id: string; rotulo: string; veredito: string }>).filter((c) => /^rv[67]-/.test(c.id) && c.rotulo === 'pos')
ok(rv67Acertos === gravadosRv67.filter((c) => c.veredito === 'acerto').length && rv67Acertos >= 24, `(8) v8: rv6/rv7 positivos certos nas 2 respostas reais: ${rv67Acertos}/${rv67Pos} (igual ao placar gravado)`)
// ponta a ponta com resposta que COPIA o nome no campo visual: o que sobra sem nome entra; o quebrado não entra e a cena fica intacta
const cruCopia = (subject: string, visual: string, head: string) => JSON.stringify({ reasoning: 't', subject, head_noun: head, subject_visual_no_people: visual, kind: 'object', real_person: false, has_human: false, mention_words: [head], word_use: 'literal', request_language: 'en' })
const pedGal = 'the telescope Galileo Galilei built 400 years ago'
const leGal = await leituraDe(pedGal, cruCopia('a telescope built by Galileo Galilei', 'a telescope built by Galileo Galilei 400 years ago', 'telescope'))
const k4Gal = exigirSujeitoNoKling4({ pedido: pedidoOriginalDoSujeito({ prompt: pedGal, ideiaSolta: true, scriptMode: 'ai' }), leitura: leGal, falas: falasNeutras, prompts: promptsNeutros })
ok(k4Gal.relato.corrigido && k4Gal.prompts.some((q) => q.includes('Main subject clearly visible in frame: a telescope.')) && k4Gal.prompts.every((q) => !/galile/i.test(q)), '(8) v8: "built by Galileo Galilei 400 years ago" no campo visual: entra "a telescope", o nome nunca')
const pedAlex = "Alexander the Great's helmet"
const leAlex = await leituraDe(pedAlex, cruCopia("Alexander the Great's helmet", 'an Alexander the helmet', 'helmet'))
const k4Alex = exigirSujeitoNoKling4({ pedido: pedidoOriginalDoSujeito({ prompt: pedAlex, ideiaSolta: true, scriptMode: 'ai' }), leitura: leAlex, falas: falasNeutras, prompts: promptsNeutros })
ok(!k4Alex.relato.corrigido && k4Alex.prompts.every((q, i) => q === promptsNeutros[i]) && k4Alex.relato.motivo_sem_sujeito === 'visual_com_maiuscula', '(8) v8: "an Alexander the helmet" (texto quebrado com nome): nada injetado, prompts byte a byte, motivo no relato')
// 8d. a regra do sujeito no descritor: só com o plano de 3 cenas que o Kling 4 grátis aceita (menor 7)
ok(/sheet: desenhoInfantil\.personagem\.sheet \} : null, kling4TrialCandidate && scenes\.length === 3\)\)/.test(rota) && /if \(kling4TrialCandidate && scenes\.length === 3 && scenes\.every/.test(rota), '(8) v7: a regra do sujeito no descritor só vai com 3 cenas (com outra contagem o Kling 4 cai no Seedance: fallback_plan_unavailable)')
// 8e. a recalibração cobra o nome proibido SEM caixa e a presença, e ensaia sem rede (MOCK=1) sobre o 'cru' real gravado
const calib = rd('scripts/calibrar-k4-sujeito-final-0111.mts')
ok(/c\.proibido && new RegExp\(c\.proibido, 'i'\)\.test\(subject\)\) return 'falso_positivo_grave'/.test(calib) && /presenca_ok/.test(calib) && /const MOCK = process\.env\.MOCK === '1'/.test(calib) && !/mocks\.json/.test(calib) && /visual_cru/.test(calib), '(8) v8: a recalibração julga nome proibido sem caixa (grave) e presença, grava o campo visual cru e ensaia sem rede com MOCK=1 (sem mocks)')

// ═══ (9) v8 — o campo próprio do modelo ═══
ok(/required: \['reasoning', 'subject', 'head_noun', 'subject_visual_no_people',/.test(fonteSujeito) && /subject_visual_no_people: \{ type: \['string', 'null'\] \}/.test(fonteSujeito), '(9) v8: o schema estrito exige subject_visual_no_people (depois do head_noun: o modelo escreve o visual em volta do núcleo)')
ok(/subject_visual_no_people: the text the image model will receive/.test(SYSTEM_SUJEITO_0111) && /NO proper name of any kind, not even in lowercase/.test(SYSTEM_SUJEITO_0111) && /containing the head_noun word exactly/.test(SYSTEM_SUJEITO_0111), '(9) v8: o system pede o campo visual sem nome próprio nenhum e com o núcleo')
const exVis = EXEMPLOS_SUJEITO_0111.map((e) => JSON.parse(e.assistant) as { subject: string | null; head_noun: string | null; subject_visual_no_people: string | null })
ok(exVis.every((o) => 'subject_visual_no_people' in o) && exVis.every((o) => o.subject_visual_no_people === null ? o.subject === null : visualSemPessoas(o.subject_visual_no_people, o.subject, o.head_noun).frase === o.subject_visual_no_people), '(9) v8: todo exemplo resolvido traz o campo visual, e cada um passa intacto pela validação (o exemplo ensina a forma certa)')
ok(exVis.some((o) => /Elvis/.test(String(o.subject)) && o.subject_visual_no_people === 'a vintage acoustic guitar') && exVis.some((o) => /Cleopatra/.test(String(o.subject)) && !/cleop/i.test(String(o.subject_visual_no_people))), '(9) v8: os exemplos com dono famoso mostram o nome no subject e FORA do campo visual')
const lCampo = lerLeituraDoSujeito({ reasoning: 't', subject: "Napoleon's hat", head_noun: 'hat', subject_visual_no_people: 'a black bicorne hat', kind: 'object', real_person: false, has_human: false, mention_words: ['hat'], word_use: 'literal', request_language: 'en' }, "Napoleon's hat")
const sCampo = avaliarSujeito({ leitura: { ok: true, valor: lCampo!, ms: 1, model: 'gpt-4o-mini', tentativas: 1 } })
ok(lCampo?.subject === "Napoleon's hat" && lCampo.subject_visual === 'a black bicorne hat' && sCampo.sujeito?.frase === 'a black bicorne hat', '(9) v8: o subject ("Napoleon\'s hat") fica só na auditoria; o motor recebe o campo visual ("a black bicorne hat")')

console.log(`\n${pass}/${pass + fail} verificações`)
if (fail) process.exit(1)
