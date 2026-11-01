// KINEO-K4-SUJEITO-0111 + KINEO-FINAL-RESPOSTA-0111 — guardião da v4 (chamada semântica), SEM REDE: toda resposta do modelo é a
// resposta CRUA gravada na calibração real (docs/calibracao/KINEO-K4-SUJEITO-0111.json) ou um mock de falha.
// (1) o sujeito do Kling 4 sai de UMA leitura semântica do PEDIDO ORIGINAL (nunca do roteiro com [Pexels]) — validada (inglês, com
//     substantivo comum, ancorada no pedido), com falha segura (erro, prazo, JSON inválido = nada injetado) e no máximo 1 tentativa extra;
// (2) a checagem "já está em cena" e a escolha da cena seguem as da v3 (orçamento, imagem de abertura, imagem-chave do meio);
// (3) o fim: detector estreito (pergunta / quase igual ao HOOK) + juiz semântico só no escritor e só no roteiro da IA; a injeção crua
//     da revelação na última cena (comRevelacaoNoFim) SAIU; "Use my script as is" intocado.
// Rodar: npx tsx scripts/test-k4-sujeito-final-0111.mts
import { readFileSync } from 'node:fs'
import { buildClassicVisualPrompt } from '@/lib/cinematic/visualPromptPolicy'
import { deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'
import { promptDaCenaKling4, KLING4_ORCAMENTO_DA_CAMADA, KLING4_PROMPT_MAX } from '@/lib/cinematic/cenaKling4'
import { buildKling4TrialInput } from '@/lib/kling4Trial'
import * as sujeitoMod from '@/lib/cinematic/sujeitoObrigatorio'
import { sujeitoObrigatorio, exigirSujeitoNoKling4, promptMostraOSujeito, comSujeitoNaCena, pedidoOriginalDoSujeito, pedidoCurto, lerSujeitoDoPedido, lerLeituraDoSujeito, perguntaSemantica, chavesDoSujeito, type ResultadoSemantico, type LeituraDoSujeito } from '@/lib/cinematic/sujeitoObrigatorio'
import * as finalMod from '@/lib/cinematic/finalResposta'
import { finalFracoDoRoteiro, ultimaFraseDoRoteiro, problemaDoFinal, finalTemRespostaConcreta, entradaDoJuizDoFinal, quaseIgualAoGancho } from '@/lib/cinematic/finalResposta'
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
const cruDe = (subject: string | null, kind: string, mention: string[] = [], real = false) => JSON.stringify({ subject, kind, real_person: real, mention_words: mention })

// ═══ (0) a adivinhação por lista de palavras SAIU ═══
const fonteSujeito = rd('lib/cinematic/sujeitoObrigatorio.ts')
const fonteFinal = rd('lib/cinematic/finalResposta.ts')
ok(!/const LEXICO\b/.test(fonteSujeito) && !/achadosDoLexico|modeloDoVeiculo|CONTEXTO_NAZISTA_RE/.test(fonteSujeito), '(0) sujeitoObrigatorio.ts não tem mais léxico de pedido (LEXICO/achados/contextos)')
ok(!/const CLIMA\b|function (?:fatoAntesDoClima|temFatoNovo|comRevelacaoNoFim|revelacaoDaFala)/.test(fonteFinal), '(0) finalResposta.ts sem lista de bordões e sem injeção crua da revelação')
ok(!('comRevelacaoNoFim' in finalMod) && !('revelacaoDaFala' in finalMod) && !('LEXICO' in sujeitoMod), '(0) exports antigos não existem mais')
ok(/temperature: 0/.test(fonteSujeito) && /json_schema/.test(fonteSujeito) && /strict: true/.test(fonteSujeito), '(0) chamada: temperature 0, json_schema estrito')
ok(/timeoutMs: 4_000, tentativasExtras: 1, prazoTotalMs: 8_500/.test(fonteSujeito), '(0) sujeito: prazo 4 s, no máximo 1 tentativa extra (8,5 s no total)')
ok(/timeoutMs: 4_000, tentativasExtras: 1, prazoTotalMs: 5_500/.test(fonteFinal), '(0) fim: prazo 4 s, a tentativa extra só se couber em 5,5 s (escritor tem teto de 60 s)')

// ═══ (1) FALHA SEGURA ═══
const pedidoAviao = 'o avião C-54 que sumiu'
const r500 = await lerSujeitoDoPedido(pedidoAviao, { ...OPC, fetchImpl: mock(500, 500).fetch })
ok(!r500.ok && r500.erro === 'http_500' && r500.tentativas === 2, `(1) HTTP 500 duas vezes: { ok: false, http_500 }, 2 tentativas (1 extra, nunca mais)`)
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
const rFinalFalha = await finalTemRespostaConcreta('HOOK: x y z?\nPAYOFF: The answer was methane.', { ...OPC, fetchImpl: mock(500, 500).fetch })
ok(!rFinalFalha.ok, '(1) juiz do fim com erro: { ok: false } (o escritor não pede nova tentativa)')
const rFinalSemPontas = await finalTemRespostaConcreta('só uma frase sem seções', { ...OPC, fetchImpl: mock('{"ends_with_concrete_answer":false}').fetch })
ok(!rFinalSemPontas.ok && rFinalSemPontas.erro === 'sem_hook_ou_payoff', '(1) roteiro sem HOOK/PAYOFF: o juiz nem é chamado')

// ═══ (2) validação da leitura (inglês, substantivo comum, âncora no pedido, pessoa real) ═══
const v = (pedido: string, o: Record<string, unknown>) => lerLeituraDoSujeito({ subject: null, kind: 'none', real_person: false, mention_words: [], ...o }, pedido)
ok(v('The real story of Billy the Kid', { subject: 'a child', kind: 'person_generic', real_person: true, mention_words: ['Kid'] })?.descartado === 'pessoa_real', '(2) real_person=true: nada a injetar, mesmo com subject')
ok(v('O que Lula disse', { subject: null, kind: 'none' })?.descartado === 'sem_sujeito', '(2) kind none: nada a injetar')
ok(v('cara ou coroa: a matemática da moeda', { subject: 'a moeda', kind: 'object', mention_words: ['moeda'] })?.descartado === 'sujeito_sem_traducao', '(2) sujeito copiado sem traduzir ("a moeda", resposta real da calibração): descartado')
ok(v('cara ou coroa: a matemática da moeda', { subject: 'a coin', kind: 'object', mention_words: ['moeda'] })?.subject === 'a coin', '(2) o mesmo pedido com "a coin": vale')
ok(v('What really happened to Flight 19', { subject: 'Flight 19', kind: 'vehicle', mention_words: ['Flight 19'] })?.descartado === 'sem_substantivo_comum', '(2) só nome/número ("Flight 19", resposta real): descartado — o motor não sabe o que desenhar')
ok(v('the SS St. Louis', { subject: 'the SS St. Louis', kind: 'vehicle', mention_words: ['the SS St. Louis'] })?.descartado === 'sem_substantivo_comum', '(2) "the SS St. Louis" sem "ship": descartado')
ok(v('O que Lula disse sobre a economia', { subject: 'a giant squid', kind: 'creature', mention_words: ['lula gigante'] })?.descartado === 'sem_ancora_no_pedido', '(2) citação que não está inteira no pedido ("lula gigante") e sujeito fora do texto: descartado — anti-invenção')
ok(v('How to train your brain', { subject: 'a train', kind: 'vehicle', mention_words: ['train'] })?.subject === 'a train', '(2) a âncora só prova que a palavra está no pedido, não o sentido — o sentido é do modelo (a resposta real aqui é kind none, seção 3)')
ok(v('um cachorro', { subject: 'a dog: very big', kind: 'creature', mention_words: ['cachorro'] })?.descartado === 'sujeito_mal_formado', '(2) dois-pontos no sujeito: mal formado (nunca entra texto que possa virar instrução no prompt)')
ok(v('um cachorro', { subject: 'a dog ' + 'very '.repeat(12), kind: 'creature', mention_words: ['cachorro'] })?.descartado === 'sujeito_mal_formado', '(2) sujeito com mais de 12 palavras: mal formado')
ok(v('um cachorro', { subject: 'собака', kind: 'creature', mention_words: ['cachorro'] })?.descartado === 'sujeito_mal_formado', '(2) sujeito fora do alfabeto latino: mal formado')
ok(v('a dragon guarding a castle', { subject: 'a dragon guarding a castle', kind: 'creature', mention_words: ['a dragon guarding a castle'] })?.subject === 'a dragon guarding a castle', '(2) pedido em inglês com o sujeito igual ao pedido: vale (a checagem de tradução só vale para pedido pt/es)')
ok(lerLeituraDoSujeito('não é objeto', 'x') === null && lerLeituraDoSujeito({ subject: 1, kind: 'object', real_person: false, mention_words: [] }, 'x') === null, '(2) resposta fora do formato: null (falha segura)')
const adulto = sujeitoObrigatorio({ leitura: await leituraDe('crianças brincando no parque', cruDe('children playing in the park', 'creature', ['crianças'])), pessoaPermitida: false })
ok(adulto === null, '(2) criança com kind errado ("creature", visto na calibração) em pedido adulto: nunca vira sujeito')
ok(sujeitoObrigatorio({ leitura: await leituraDe('crianças brincando no parque', cruDe('children playing in the park', 'creature', ['crianças'])) })?.tipo === 'pessoa', '(2) criança na frase é gente (tipo pessoa), seja qual for o kind')

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
const gravado = (id: string) => (CAL.sujeito as Array<{ id: string; passadas: Array<{ cru: string }> }>).find((c) => c.id === id)!.passadas[0].cru
for (const id of ['rev-robo-siglo', 'rev-planes-jubilarme', 'rev-sword-leverage', 'rev-ai-trains', 'rev-amazon-ships', 'rev-billy-kid', 'rev-el-nino', 'rev-lula-presidente', 'rev-tesouro-direto', 'rev-rocket-man', 'rev-ss-himmler']) {
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
ok(corr.relato.leitura?.ok === true && corr.relato.leitura.subject === sAviao.frase && corr.relato.leitura.model === 'gpt-4o-mini' && corr.relato.versao === 'k4_sujeito_0111_v4_semantico', '(4) o relato do claim guarda a leitura semântica crua (auditoria)')
const shots = buildKling4TrialInput(corr.prompts, corr.stills, { voiceovers: falasAviao, wordsPerSecond: 2.5 }).input.multi_prompt as Array<{ prompt: string }>
ok(shots.every((s) => len(s.prompt) <= KLING4_PROMPT_MAX) && shots.some((s) => /C-54/.test(s.prompt)), '(4) no corpo do POST (multi_prompt) o avião chega e todo shot ≤ 512')
const semImagens = exigirSujeitoNoKling4({ pedido: ped, leitura: leituraAviao, falas: falasAviao, prompts: k4Aviao })
ok(semImagens.relato.cena === 1, '(4) sem imagens: a cena cuja fala cita o avião (ficha "C-54") é a corrigida')
// falha da chamada: prompts e imagens byte a byte
const falhou: ResultadoSemantico<LeituraDoSujeito> = { ok: false, erro: 'prazo', ms: 4001, model: 'gpt-4o-mini', tentativas: 2 }
const intacto = exigirSujeitoNoKling4({ pedido: ped, leitura: falhou, falas: falasAviao, prompts: k4Aviao, stills: stillsAviao })
ok(!intacto.relato.corrigido && intacto.prompts.every((q, i) => q === k4Aviao[i]) && intacto.stills.every((s, i) => s === stillsAviao[i]) && intacto.relato.leitura?.erro === 'prazo', '(4) chamada falhou (prazo): prompts e imagens byte a byte, e o relato diz por quê')
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
ok(chavesDoSujeito('a plump raccoon on a windowsill')[0]?.test('A raccoon sneaks along the sill') === true, '(4) fora do dicionário: o núcleo do sintagma ("raccoon") prova presença')
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
    if (c.rotulo !== 'amb') { finalContados++; const fraco = !!finalFracoDoRoteiro(c.roteiro) || (j.ok && !j.valor.ends_with_concrete_answer); if (fraco === !c.rotulo) finalCertos++ }
  }
}
const finalTotal = (CAL.final as Array<{ passadas: unknown[] }>).reduce((n, c) => n + c.passadas.length, 0)
ok(finalIguais === finalTotal, `(5) o juiz do fim lê as ${finalTotal} respostas gravadas exatamente`)
ok(finalCertos / finalContados >= 0.85, `(5) fim (respostas gravadas): ${finalCertos}/${finalContados} decisões certas, incluindo os 5 fins de clima que a v3 deixava passar`)
const truthOutThere = (CAL.final as Array<{ id: string; passadas: Array<{ ends_with_concrete_answer: boolean }> }>).filter((c) => ['fim-truth-out-there', 'fim-something-waiting', 'fim-investigators', 'fim-ninguem-sabe', 'fim-nadie-sabe'].includes(c.id))
ok(truthOutThere.length === 5 && truthOutThere.every((c) => c.passadas.every((p) => p.ends_with_concrete_answer === false)), '(5) os 5 fins que derrubaram a v3 ("Late at night, engineers say the truth is still out there." etc.) são reprovados pelo juiz')

// ═══ (6) as rotas ═══
const rota = rd('app/api/generate-video-cinematic/route.ts')
const escritor = rd('app/api/generate-script/route.ts')
const cliente = rd('app/(dashboard)/generate/GenerateClient.tsx')
ok(!/comRevelacaoNoFim|finalResposta'/.test(rota), '(6) cinematic: a injeção crua da revelação na última cena SAIU (nem import)')
ok(/KINEO-FINAL-RESPOSTA-0111: when the opening narration promises an answer/.test(rota), '(6) cinematic: fica só a instrução do descritor (a última cena MOSTRA a resposta)')
ok(/await lerSujeitoDoPedido\(kling4PedidoSujeito\.pedido\)/.test(rota) && /kling4PedidoSujeito\?\.pedido \?/.test(rota), '(6) cinematic: a chamada semântica só sai quando há pedido original confiável')
ok(/exigirSujeitoNoKling4\(\{ pedido: kling4PedidoSujeito, leitura: kling4LeituraSujeito/.test(rota) && /sujeito_obrigatorio: kling4Sujeito\?\.relato \?\? null/.test(rota), '(6) cinematic: a leitura vai para a checagem e o relato (com a leitura crua) vai no claim')
ok(/kling4TrialCandidate && !desenhoInfantil\.ativo \? pedidoOriginalDoSujeito/.test(rota), '(6) cinematic: só no Kling 4 grátis, nunca no desenho infantil')
ok(/if \(!colado\.pasted\) \{[\s\S]{0,400}finalTemRespostaConcreta\(script\)/.test(escritor), '(6) escritor: o juiz semântico só roda no roteiro da IA (roteiro colado da pessoa: o fim é dela)')
ok(/if \(juiz\.ok && !juiz\.valor\.ends_with_concrete_answer\) finalFraco = 'sem_resposta'/.test(escritor), '(6) escritor: false = a MESMA nova tentativa; erro do juiz = nada muda')
ok(/final_resposta: rastroDoFinal/.test(escritor), '(6) escritor: o resultado vai no script_written (auditoria)')
ok(/\(colado\.pasted \|\| !finalFracoDoRoteiro\(t\)\)/.test(escritor), '(6) escritor: a escolha entre as duas versões do filme curto usa só o detector estreito (sem rede)')
ok(/original_idea: ideiaDoRoteiroRef\.current\.ideia\.slice\(0, 600\)/.test(cliente) && /ideiaDoRoteiroRef\.current\.roteiro === trimmed/.test(cliente), '(6) cliente: a ideia original só acompanha o roteiro que nasceu dela')

console.log(`\n${pass}/${pass + fail} verificações`)
if (fail) process.exit(1)
