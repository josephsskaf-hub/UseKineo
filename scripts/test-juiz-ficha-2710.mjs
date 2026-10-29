// KINEO-JUIZ-FICHA-2710 [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"] — guardião dos itens 1 e 2:
// o juiz não entrega o still que reprovou duas vezes em identidade; a ficha de personagem leva as palavras do cliente.
// Prova OFFLINE (sem fal, sem OpenAI), EXECUTANDO o código REAL transpilado: lib/cinematic/juizFicha.ts (novo), lib/cinematic/criticoStill.ts
// (o crítico de verdade, com fetch falso), lib/cinematic/folhaDePersonagem.ts + personagemAjuste.ts (o elenco e a folha de verdade) e
// lib/filmes/filme15Elenco.ts, com os DOIS pedidos de 27/10 reproduzidos à mão a partir dos eventos (Krishna 695d4e46, frutas 61bdbd1b):
//   A. FICHA LITERAL — "tiny blue-skinned Lord Krishna" e "beautiful strawberry girl wearing a pink dress" entram verbatim na canônica, na
//      folha e no prompt da cena; o mascote sorteado e a "menina de camiseta vermelha" somem; o casting não consegue trocar; idempotente.
//   B. DECISÃO — com os relatos REAIS de 27/10 (30→20 FAIL original; 30→40 FAIL refeita; 30/30/40): precisa do texto puro; PASS, erro,
//      anatomia e refação aprovada não; 2 cenas = folha errada; a escolha (nota maior; texto puro sem julgamento vence a reprovada 2x).
//   C. ORQUESTRAÇÃO — o crítico REAL reprova duas vezes (fetch falso) → julgarSemFolha gera UM still FLUX sem folha, julga sem referência e
//      a cena segue o texto puro; teto por filme, prazo, still que falha e julgamento ausente; custo ≤ 1 still por cena; metadado sem URL.
//   D. ROTA — as linhas novas existem, na ordem certa, só acrescentam (nenhuma linha da base mudou) e nenhuma carrega marca de camada antiga.
//   M. MUTANTES — cada regra fica vermelha quando quebrada (decisão, escolha, extração, origem, folha errada, rota).
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import { semElencoEpoca2710, semJuizFicha2710 } from './test-support/desfaz-consertos-2710.mjs' // KINEO-CONSERTOS-2710 — as irmãs de 27/10 saem em memória para isolar esta camada

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const MARCA = 'KINEO-JUIZ-FICHA-2710'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const LIB = 'lib/cinematic/juizFicha.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const rd = (p) => lf(readFileSync(join(RAIZ, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', RAIZ, ...a], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

// ── carregador: transpila um .ts e o executa com os imports mapeados ──
function carrega(src, mapa = {}) {
  const js = ts.transpileModule(src, { fileName: 'm.ts', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  const req = (n) => { if (n in mapa) return mapa[n]; if (n === '@/lib/cinematic/pessoasDaNarracao') return carrega(rd('lib/cinematic/pessoasDaNarracao.ts')); throw new Error(`import inesperado ${n}`) } // KINEO-ELENCO-MARCADOR-2910 — dependência pura real, sem mudar asserções.
  new Function('module', 'exports', 'require', 'process', js)(mod, mod.exports, req, { env: { OPENAI_API_KEY: 'k' } })
  return mod.exports
}
const SRC = { juiz: rd(LIB), critico: rd('lib/cinematic/criticoStill.ts'), folha: rd('lib/cinematic/folhaDePersonagem.ts'), ajuste: rd('lib/cinematic/personagemAjuste.ts'), elenco15: rd('lib/filmes/filme15Elenco.ts') }
function biblioteca(over = {}) {
  const seres = carrega(rd('lib/cinematic/seresFieis.ts'), {}) // KINEO-JUIZ-REFAZ-2810 — a tabela única de seres/figuras (módulo puro) que folha, ajuste e juiz importam
  const critico = carrega(over.critico ?? SRC.critico, { '@/lib/hollywood/juizStill': { JUIZ_STILL_MODELO: 'gpt-4o-mini' } })
  const folha = carrega(over.folha ?? SRC.folha, { '@/lib/cinematic/sceneStyle': { deriveExplicitCharacter: () => null }, '@/lib/estrelaDoFilme': { ESTRELA_EDIT_SLUG: 'x', buildEstrelaEditInput: () => ({}) }, '@/lib/aiModels': { AI_TEXT_MODELS: { scenePlannerLight: 'gpt-4o-mini' } }, '@/lib/cinematic/seresFieis': seres }) // KINEO-JUIZ-REFAZ-2810
  const ajuste = carrega(over.ajuste ?? SRC.ajuste, { '@/lib/cinematic/folhaDePersonagem': folha, '@/lib/safety/moderationPolicy': { mentionsMinor: () => false }, '@/lib/cinematic/seresFieis': seres }) // KINEO-JUIZ-REFAZ-2810
  const elenco15 = carrega(SRC.elenco15, {})
  const juiz = carrega(over.juiz ?? SRC.juiz, { '@/lib/cinematic/criticoStill': critico, '@/lib/cinematic/folhaDePersonagem': folha, '@/lib/cinematic/seresFieis': seres }) // KINEO-JUIZ-REFAZ-2810
  return { critico, folha, ajuste, elenco15, juiz }
}
const B = biblioteca()

// ── os dois pedidos de 27/10, reproduzidos à mão a partir dos trechos gravados nos eventos ──
// (o "demon" fica numa frase SEM o Krishna: é assim que o extrator REAL dá tipo 'criatura' sem espécie perto do nome e a canônica determinística sorteia o mascote — o texto que saiu em produção)
const KRISHNA = 'Under a deep indigo sky over the battlefield of Kurukshetra, a tiny blue-skinned Lord Krishna emerges from a lotus of golden light. Krishna smiles and raises one hand. The demon army trembles. Colossal Vishwaroop rises behind him, a thousand arms and faces filling the sky, while Arjuna kneels in awe.'
const FRUTAS = 'Cute 3D animated fruit characters with human bodies. A beautiful strawberry girl wearing a pink dress, a tall banana boy wearing a black suit, a cherry girl in a red dress, and a pineapple boy in a beige outfit dance together in a sunny kitchen and laugh.'
// os visuais que o escritor de cenas deu ao filme das frutas (papel sem descrição — é daqui que o elenco do 15 s sai quando o pedido não dá elenco)
const VISUAIS_FRUTAS = ['A cheerful girl in a pink dress twirls on a sunny kitchen counter, soft morning light', 'A tall boy in a black suit bows politely beside a fruit bowl, warm tones', 'The girl and the boy hold hands and laugh, confetti falling, bright 3D look']

console.log('== A. a ficha literal ==')
{
  const elencoK = B.ajuste.elencoDoRoteiro(KRISHNA)
  checa('A1 o elenco REAL do pedido do Krishna tem o Krishna', elencoK.length >= 1 && elencoK[0].nome === 'Krishna')
  const antes = elencoK[0]?.canonica ?? ''
  checa('A2 a canônica REAL de antes já NÃO é o mascote sorteado (KINEO-JUIZ-REFAZ-2810: o Krishna cai na tabela de figuras — pele azul — antes de qualquer ficha literal; "cream belly"/"big round friendly eyes" morreram)', !/cream belly|big round friendly eyes|short tail/.test(antes) && /deep blue skin/.test(antes)) // KINEO-JUIZ-REFAZ-2810 — era: exigia o mascote ("o defeito de 27/10 reproduzido")
  const lit = B.juiz.elencoComFichaLiteral(KRISHNA, elencoK)
  const k = lit.elenco[0]
  checa('A3 a canônica literal leva as palavras do cliente verbatim: "tiny blue-skinned Lord Krishna"', lit.literais.includes('Krishna') && k.canonica.includes('exactly as the author wrote: "tiny blue-skinned Lord Krishna"'))
  checa('A4 figura conhecida: a iconografia do Krishna (pele azul, pena de pavão, flauta) entra DEPOIS das palavras dele', /deep blue skin/.test(k.canonica) && /peacock feather/.test(k.canonica) && k.canonica.indexOf('author wrote') < k.canonica.indexOf('deep blue skin'))
  checa('A5 o mascote some: nada de "chubby", "cream belly", "short tail", "t-shirt" na canônica literal', !/chubby|cream belly|short tail|t-shirt|hoodie/i.test(k.canonica))
  checa('A6 origem "autor" — o leitor do casting REAL não troca (resposta do modelo com o mascote roxo é ignorada)', k.origem === 'autor' && B.ajuste.lerCastingAjuste(JSON.stringify({ characters: [{ name: 'Krishna', description: 'Krishna is a small and chubby soft purple creature with a cream belly, big round friendly eyes and a short tail, no clothes, cute mascot' }] }), lit.elenco, KRISHNA)[0].canonica === k.canonica)
  const folhaPrompt = B.folha.promptDaFolha(k, { lookPhrase: 'vibrant 3D animation' })
  checa('A7 o prompt REAL da folha carrega as palavras do cliente e a iconografia, não o mascote', folhaPrompt.includes('"tiny blue-skinned Lord Krishna"') && /peacock/.test(folhaPrompt) && !/chubby/.test(folhaPrompt))
  const stillPrompt = B.folha.promptDoStillComFolha('Krishna raises one hand under an indigo sky', [k])
  checa('A8 o prompt REAL do still com folha diz "Krishna is exactly as the author wrote: …"', stillPrompt.includes('Krishna is exactly as the author wrote: "tiny blue-skinned Lord Krishna"'))
  checa('A9 idempotente: aplicar de novo não muda nada e não conta literal de novo', (() => { const de = B.juiz.elencoComFichaLiteral(KRISHNA, lit.elenco); return de.literais.length === 0 && de.trocas.length === 0 && de.elenco[0].canonica === k.canonica })())
  checa('A10 nome nu sem descrição ("Krishna emerges") → null (nada literal a carregar)', B.juiz.descricaoLiteral('Krishna emerges from the river. Krishna smiles.', { nome: 'Krishna', nucleo: 'Krishna' }) === null)
  checa('A11 ficha do autor (origem "autor") fica como está', B.juiz.elencoComFichaLiteral(KRISHNA, [{ ...elencoK[0], origem: 'autor', canonica: 'Krishna, a man with a scar' }]).literais.length === 0)
  checa('A12 o nome não é confundido com parte de outra palavra ("Krishnamurti")', B.juiz.descricaoLiteral('A tiny Krishnamurti statue. Nothing else.', { nome: 'Krishna', nucleo: 'Krishna' }) === null)

  // frutas: o elenco do 15 s nasce dos VISUAIS (o pedido não dá elenco pelo extrator inglês de papéis), como lib/filmes/filme15Elenco faz
  const e15 = B.elenco15.elencoDoFilme15({ elencoDoPedido: B.ajuste.elencoDoRoteiro(FRUTAS), visuals: VISUAIS_FRUTAS, extrair: B.ajuste.elencoDoRoteiro })
  const temGirl = e15.elenco.some((f) => f.nucleo === 'girl')
  const temBoy = e15.elenco.some((f) => f.nucleo === 'boy')
  checa('A13 o elenco REAL do 15 s das frutas tem a menina e o menino (papéis vindos dos visuais ou do pedido)', temGirl && temBoy)
  const antesG = e15.elenco.find((f) => f.nucleo === 'girl')?.canonica ?? ''
  checa('A14 antes: a menina é uma menina humana inventada ("a girl about nine years old … wearing a red t-shirt") — a descrição não tem morango nem vestido rosa', /girl about nine years old/.test(antesG) && /wearing/.test(antesG) && !/strawberry|pink dress/.test(antesG.slice(antesG.indexOf(',') + 1)))
  const litF = B.juiz.elencoComFichaLiteral(FRUTAS, e15.elenco)
  const g = litF.elenco.find((f) => f.nucleo === 'girl')
  const b = litF.elenco.find((f) => f.nucleo === 'boy')
  checa('A15 a menina vira "beautiful strawberry girl wearing a pink dress" (verbatim), com a natureza do elenco', !!g && g.canonica.includes('"beautiful strawberry girl wearing a pink dress"') && g.canonica.includes('one of the fruit characters with human bodies'))
  checa('A16 o menino vira "tall banana boy wearing a black suit" (verbatim), nunca o corte na vírgula da outra fruta', !!b && b.canonica.includes('"tall banana boy wearing a black suit"') && !/cherry|strawberry/.test(b.canonica))
  checa('A17 natureza do elenco lida do pedido: "fruit characters with human bodies"', litF.natureza === 'fruit characters with human bodies')
  checa('A18 as trocas [antes, depois] existem para as duas fichas', litF.trocas.length === 2 && litF.trocas.every(([a, d]) => a !== d && d.includes('author wrote')))
  const promptCena = `Wide shot of a sunny kitchen. The same main character appears in this scene, consistent design: ${antesG}. Soft light.`
  const trocado = B.juiz.trocarFichaNoPrompt(promptCena, litF.trocas)
  checa('A19 o prompt de cena já escrito com a canônica inventada passa a dizer a literal', !trocado.includes(antesG) && trocado.includes('"beautiful strawberry girl wearing a pink dress"'))
  checa('A20 complemento "in a red dress" (sem "wearing") também é lido; "who is holding a flute" idem', (B.juiz.descricaoLiteral(FRUTAS, { nome: 'the cherry girl', nucleo: 'cherry girl' })?.literal ?? '') === 'cherry girl in a red dress' && (B.juiz.descricaoLiteral('There is a young shepherd who is holding a flute, and he walks home.', { nome: 'the shepherd', nucleo: 'shepherd' })?.literal ?? '').includes('holding a flute'))
  checa('A21 o still sem folha e o "mostra" do crítico levam as palavras do cliente (não a canônica inteira com a iconografia)', B.juiz.promptDoStillSemFolha('Krishna raises one hand', [k]).startsWith('The character must look exactly as the author wrote: tiny blue-skinned Lord Krishna;') && B.juiz.mostraSemFolha('a tiny figure in the sky', [k]).includes('exactly as the author wrote: tiny blue-skinned Lord Krishna'))
}

console.log('== B. a decisão (relatos REAIS de 27/10) ==')
const relato = (o) => ({ veredito: 'FAIL', problemas: ['identidade'], regerou: true, regeracao_ok: true, veredito_regerada: 'FAIL', problemas_regerada: ['identidade'], nota: 30, nota_regerada: 20, escolhida: 'original', ...o })
const K1 = relato({ nota: 30, nota_regerada: 20, escolhida: 'original' }) // Krishna cena 1
const K2 = relato({ nota: 30, nota_regerada: 40, escolhida: 'regerada' }) // Krishna cena 2
const F1 = relato({ nota: 30, nota_regerada: 30, escolhida: 'original', problemas: ['sujeito'], problemas_regerada: ['sujeito'] }) // frutas
{
  const d1 = B.juiz.decidirSemFolha(K1), d2 = B.juiz.decidirSemFolha(K2), d3 = B.juiz.decidirSemFolha(F1)
  checa('B1 Krishna cena 1 (30 → 20 FAIL, seguiu a original): precisa, reprovado_2x, nota da folha 30', d1.precisa && d1.motivo === 'reprovado_2x' && d1.notaFolha === 30)
  checa('B2 Krishna cena 2 (30 → 40 FAIL, seguiu a REFEITA): precisa — a "melhor das duas" ainda é o personagem errado; nota 40', d2.precisa && d2.motivo === 'reprovado_2x' && d2.notaFolha === 40)
  checa('B3 frutas (sujeito 30/30): precisa', d3.precisa && d3.motivo === 'reprovado_2x')
  checa('B4 2 cenas reprovadas = a folha está errada; 1 só, não', B.juiz.folhaErrada([d1, d2]) === true && B.juiz.folhaErrada([d1, { precisa: false }]) === false)
  checa('B5 PASS não precisa', B.juiz.decidirSemFolha(relato({ veredito: 'PASS', problemas: [], regerou: false, regeracao_ok: null, veredito_regerada: null, problemas_regerada: null, nota: 85, nota_regerada: null })).precisa === false)
  checa('B6 ERRO/PULADO não precisa (nao_julgado)', ['ERRO', 'PULADO'].every((v) => B.juiz.decidirSemFolha(relato({ veredito: v })).motivo === 'nao_julgado'))
  checa('B7 FAIL de anatomia/texto/artefato duas vezes NÃO é caso de folha (falha_de_outro_tipo)', B.juiz.decidirSemFolha(relato({ problemas: ['anatomia'], problemas_regerada: ['texto'] })).motivo === 'falha_de_outro_tipo')
  checa('B8 identidade reprovada e refação APROVADA e escolhida: não precisa', B.juiz.decidirSemFolha(relato({ veredito_regerada: 'PASS', problemas_regerada: [], nota_regerada: 80, escolhida: 'regerada' })).precisa === false)
  checa('B9 identidade reprovada e refação que NÃO saiu (sem tempo / teto): precisa (reprovado_sem_refacao)', B.juiz.decidirSemFolha(relato({ regerou: false, regeracao_ok: null, veredito_regerada: null, problemas_regerada: null, nota_regerada: null })).motivo === 'reprovado_sem_refacao' && B.juiz.decidirSemFolha(relato({ regeracao_ok: false, veredito_regerada: null, problemas_regerada: null, nota_regerada: null })).motivo === 'reprovado_sem_refacao')
  checa('B10 1ª reprovação de anatomia, 2ª de identidade: também precisa', B.juiz.decidirSemFolha(relato({ problemas: ['anatomia'] })).precisa === true)
  checa('B11 escolha: texto puro aprovado → sem_folha; sem 2º julgamento → sem_folha; texto 55 FAIL vs folha 40 → sem_folha; texto 35 FAIL vs folha 40 → folha; empate → sem_folha; sem texto → folha', B.juiz.escolherSemFolha(40, { veredito: 'PASS', nota: 70 }, true) === 'sem_folha' && B.juiz.escolherSemFolha(40, null, true) === 'sem_folha' && B.juiz.escolherSemFolha(40, { veredito: 'FAIL', nota: 55 }, true) === 'sem_folha' && B.juiz.escolherSemFolha(40, { veredito: 'FAIL', nota: 35 }, true) === 'folha' && B.juiz.escolherSemFolha(40, { veredito: 'FAIL', nota: 40 }, true) === 'sem_folha' && B.juiz.escolherSemFolha(40, null, false) === 'folha')
  const finais = B.juiz.stillsFinaisDaFolha({ comFolha: ['e1', 'e2', 'e3', null], semFolha: ['t1', null, null, null], flux: ['f1', 'f2', null, 'f4'], folhaDescartada: true })
  checa('B12 folha descartada: texto puro quando existe, FLUX (null = o laço deixa o FLUX) quando não, a folha só sem NENHUMA outra foto', JSON.stringify(finais) === JSON.stringify(['t1', null, 'e3', null]))
  checa('B13 folha mantida: as escolhas por cena ficam', JSON.stringify(B.juiz.stillsFinaisDaFolha({ comFolha: ['e1', 'e2'], semFolha: ['t1', null], flux: ['f1', 'f2'], folhaDescartada: false })) === JSON.stringify(['e1', 'e2']))
  checa('B14 o teto por filme é o orçamento de refações do crítico (nunca mais foto extra do que ele permitia)', B.juiz.JUIZ_FICHA_MAX_SEM_FOLHA_FILME === B.critico.STILL_CRITIC_MAX_REGERACOES_FILME && B.juiz.novoJuizFicha({ prazo: 1 }).restantes === B.critico.STILL_CRITIC_MAX_REGERACOES_FILME)
}

console.log('== C. a orquestração com o crítico REAL ==')
const fetchFalso = (respostas) => async (_url, init) => {
  const corpo = JSON.parse(init.body)
  const imgs = corpo.messages[1].content.filter((p) => p.type === 'image_url').map((p) => p.image_url.url)
  const still = imgs[imgs.length - 1]
  const r = respostas[still] ?? { verdict: 'PASS', issues: [], reason: '', score: 85 }
  return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(r) } }], usage: { prompt_tokens: 6000, completion_tokens: 40 } }) }
}
async function cenaCompleta({ respostas, flux = 'https://f/texto-1.jpg', restantes, prazoMs = 60_000, julgarLanca = false }) {
  const elencoK = B.juiz.elencoComFichaLiteral(KRISHNA, B.ajuste.elencoDoRoteiro(KRISHNA)).elenco
  const filme = B.critico.novoFilmeDoCritico('enforce', { prazo: Date.now() + prazoMs })
  const edits = []
  const julgado = await B.critico.criticarStill({ indice: 0, url: 'https://f/edit-1.jpg', mostra: 'a tiny figure rising from a lotus', fala: 'He was small, and the sky was his.', prompt: 'scene prompt with folha', seed: 1234, referencia: { url: 'https://f/folha-1.jpg', descricao: elencoK[0].canonica } }, {
    filme, tetoCenaMs: 55_000, janelaRegeracaoMs: 40_000, minRegeracaoMs: 20_000, relatarMotivo: true, fetchImpl: fetchFalso(respostas), apiKey: 'k',
    gerarStill: async (p) => { edits.push(p); return { url: 'https://f/edit-2.jpg', motivo: 'ok' } },
  })
  const estado = B.juiz.novoJuizFicha({ prazo: filme.prazo, ...(restantes !== undefined ? { maxPorFilme: restantes } : {}) })
  const fluxes = []
  const pedidosTexto = []
  const sf = await B.juiz.julgarSemFolha(estado, { indice: 0, relato: julgado.relato, scenePrompt: 'Krishna raises one hand under an indigo sky, cinematic', visual: 'a tiny figure rising from a lotus', fala: 'He was small, and the sky was his.', fichas: elencoK, seed: 1234 }, {
    gerarStill: async (p, seed, ms) => { fluxes.push({ p, seed, ms }); return flux },
    julgar: async (e, url, timeoutMs) => { if (julgarLanca) throw new Error('rede caiu'); pedidosTexto.push({ e, url, timeoutMs }); const r = respostas[url] ?? { verdict: 'PASS', issues: [], reason: '', score: 85 }; return B.critico.lerRespostaDoCritico(JSON.stringify(r), false) ? { ...B.critico.lerRespostaDoCritico(JSON.stringify(r), false), custoUsd: 0.0005, ms: 1, erro: null } : { veredito: 'ERRO', problemas: [], motivo: '', nota: null, custoUsd: 0, ms: 1, erro: 'ilegivel' } },
  })
  return { julgado, sf, edits, fluxes, pedidosTexto, estado }
}
{
  const duasVezes = { 'https://f/edit-1.jpg': { verdict: 'FAIL', issues: ['identity'], reason: 'Character is purple, not blue-skinned as required', score: 30 }, 'https://f/edit-2.jpg': { verdict: 'FAIL', issues: ['identity'], reason: 'still a purple mascot', score: 20 } }
  const r = await cenaCompleta({ respostas: duasVezes })
  checa('C1 o crítico REAL reprovou duas vezes (30 → 20) e, sozinho, seguiria a original — o defeito de 27/10 reproduzido', r.julgado.relato.veredito === 'FAIL' && r.julgado.relato.veredito_regerada === 'FAIL' && r.julgado.relato.escolhida === 'original' && r.julgado.url === 'https://f/edit-1.jpg' && r.edits.length === 1)
  checa('C2 o juiz pediu UM still de texto puro, SEM folha, com as palavras do cliente na frente e semente própria', r.fluxes.length === 1 && r.fluxes[0].p.startsWith('The character must look exactly as the author wrote: tiny blue-skinned Lord Krishna') && r.fluxes[0].seed !== 1234 && r.fluxes[0].seed !== B.critico.seedDaRegeracaoCritico(1234, 0) && r.fluxes[0].ms <= B.juiz.JUIZ_FICHA_JANELA_STILL_MS)
  checa('C3 o still de texto puro foi julgado SEM referência, com as palavras do cliente no "mostra"', r.pedidosTexto.length === 1 && !r.pedidosTexto[0].e.referencia && r.pedidosTexto[0].e.mostra.includes('tiny blue-skinned Lord Krishna') && r.pedidosTexto[0].url === 'https://f/texto-1.jpg')
  checa('C4 aprovado → a cena segue o texto puro', r.sf.escolha === 'sem_folha' && r.sf.url === 'https://f/texto-1.jpg' && r.sf.veredito === 'PASS' && r.sf.motivo === 'julgado_pass')
  const meta = B.juiz.metadadoSemFolha(r.sf)
  checa('C5 o metadado do evento diz fallback "sem_folha" e não carrega URL nem texto do cliente', meta.fallback === 'sem_folha' && meta.fallback_nota_folha === 30 && !JSON.stringify(meta).includes('https://') && !JSON.stringify(meta).includes('Krishna'))
  checa('C6 custo registrado ≤ 1 still + 1 julgamento; estado guarda o resultado', r.sf.custo_usd > 0 && r.sf.custo_usd <= B.critico.STILL_CRITIC_REGERACAO_USD + 0.001 && r.estado.resultados.length === 1 && r.estado.restantes === B.critico.STILL_CRITIC_MAX_REGERACOES_FILME - 1)

  const pior = await cenaCompleta({ respostas: { ...duasVezes, 'https://f/texto-1.jpg': { verdict: 'FAIL', issues: ['anatomy'], reason: 'six fingers', score: 25 } } })
  checa('C7 texto puro reprovado com nota MENOR que a da folha (25 < 30) → fica a folha; nota maior → texto puro', pior.sf.escolha === 'folha' && (await cenaCompleta({ respostas: { ...duasVezes, 'https://f/texto-1.jpg': { verdict: 'FAIL', issues: ['anatomy'], reason: 'x', score: 45 } } })).sf.escolha === 'sem_folha')
  const semTexto = await cenaCompleta({ respostas: duasVezes, flux: null })
  checa('C8 still de texto puro falhou → a folha segue (nunca "sem foto"), motivo still_falhou', semTexto.sf.escolha === 'folha' && semTexto.sf.motivo === 'still_falhou' && semTexto.sf.url === null)
  const lancou = await cenaCompleta({ respostas: duasVezes, julgarLanca: true })
  checa('C9 julgamento do texto puro caiu (rede) → o texto puro segue mesmo assim (desconhecido vence reprovado 2x), motivo sem_2o_julgamento', lancou.sf.escolha === 'sem_folha' && lancou.sf.motivo === 'sem_2o_julgamento')
  const teto = await cenaCompleta({ respostas: duasVezes, restantes: 0 })
  checa('C10 teto por filme esgotado → não tenta (teto_filme), nenhum still extra', teto.fluxes.length === 0 && teto.sf.tentou === false && teto.sf.motivo === 'teto_filme' && teto.sf.escolha === 'folha')
  const semTempo = await cenaCompleta({ respostas: duasVezes, prazoMs: 5_000 })
  checa('C11 sem folga até o prazo do crítico → não tenta (sem_tempo)', semTempo.fluxes.length === 0 && semTempo.sf.motivo === 'sem_tempo')
  const passou = await cenaCompleta({ respostas: { 'https://f/edit-1.jpg': { verdict: 'PASS', issues: [], reason: '', score: 90 } } })
  checa('C12 still com folha aprovado → nada muda (nenhum still extra, fallback null no evento)', passou.fluxes.length === 0 && passou.sf.decisao.precisa === false && B.juiz.metadadoSemFolha(passou.sf).fallback === null)
  const refeitaPassou = await cenaCompleta({ respostas: { 'https://f/edit-1.jpg': { verdict: 'FAIL', issues: ['identity'], reason: 'x', score: 30 }, 'https://f/edit-2.jpg': { verdict: 'PASS', issues: [], reason: '', score: 80 } } })
  checa('C13 refação com folha aprovada → o fluxo de sempre (segue a refeita, nenhum still extra)', refeitaPassou.julgado.url === 'https://f/edit-2.jpg' && refeitaPassou.fluxes.length === 0)
  const relatoFilme = B.juiz.relatoJuizFicha(r.estado, true, ['Krishna'])
  checa('C14 o relato do filme: folha_descartada, contagens e custo, sem URL', relatoFilme.folha_descartada === true && relatoFilme.sem_folha_escolhidas === 1 && relatoFilme.fichas_literais === 1 && JSON.stringify(relatoFilme.sem_folha_cenas) === '[1]' && !JSON.stringify(relatoFilme).includes('https://'))
}

console.log('== D. a rota ==')
const rota = rd(ROTA)
const linhasMarcadas = rota.split('\n').filter((l) => l.includes(MARCA))
{
  checa('D1 import do módulo novo com o selo da trava', rota.includes(`from '@/lib/cinematic/juizFicha' // ${MARCA} [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"]`))
  const i = (s) => rota.indexOf(s)
  checa('D2 a ficha literal do pedido vem depois do casting e ANTES do escritor de cenas (let scenes)', i('const fichaLiteral = personagem.ativo && personagemElenco.elenco.length > 0 ? elencoComFichaLiteral(prompt, personagemElenco.elenco)') > i('await elencoComCastingAjuste(prompt, elencoDoRoteiro(prompt))') && i('const fichaLiteral = ') < i('let scenes: { description: string; voiceover: string'))
  checa('D3 a literal refaz a política de cena (protagonista + elenco) e troca o elenco do pedido', rota.includes('personagemElenco.elenco = fichaLiteral.elenco;') && rota.includes('classicVisualPolicy.character = fichaDoProtagonista(fichaLiteral.elenco)'))
  checa('D4 a ficha literal do 15 s vem depois do elenco dos visuais e ANTES do dry-run, com os prompts já escritos trocados', i('const fichaLiteral15 = ') > i('const elencoDoAjuste = elencoFilme15') && i('const fichaLiteral15 = ') < i('if (body.dry_run === true && isDryRunAccount(user.email)) {\n      const classicReport') && rota.includes('classicScenePrompts[i] = trocarFichaNoPrompt(classicScenePrompts[i], fichaLiteral15.trocas)'))
  checa('D5 o juiz sem folha roda na tarefa da cena, DEPOIS do crítico com folha e ANTES do evento do crítico (que espalha julgado.relato)', i('const semFolha = await julgarSemFolha(juizFichaEstado') > i('const julgado = await criticarStill({ indice: c.indice, url: stillsP[c.indice] as string') && i('Object.assign(julgado.relato, metadadoSemFolha(semFolha))') < i("path_kind: 'personagem', ...julgado.relato"))
  checa('D6 o still de texto puro sai do gerador FLUX de sempre, sem folha (generateCinematicSceneStill, sem imageUrls)', /const semFolha = await julgarSemFolha\([^\n]*gerarStill: \(scenePrompt, seed, pollWindowMs\) => generateCinematicSceneStill\(\{ scenePrompt, styleSuffix: ''[^\n]*\}\) \}\)/.test(rota) && !/const semFolha = await julgarSemFolha\([^\n]*imageUrls/.test(rota))
  checa('D7 a cena segue o texto puro quando escolhido', rota.includes("if (semFolha.url && semFolha.escolha === 'sem_folha') stillsP[c.indice] = semFolha.url"))
  checa('D8 a folha errada é decidida depois do laço do crítico e ANTES de aplicar stillsP em sceneStills, com o FLUX de antes guardado', i('const folhaDescartada = folhaErrada(juizFichaEstado.resultados.map((r) => r.decisao))') > i('const semFolha = await julgarSemFolha') && i('const folhaDescartada = ') < i('for (let i = 0; i < scenes.length; i++) if (stillsP[i]) sceneStills[i] = stillsP[i]') && i('const fluxAntesP = sceneStills.slice()') < i('const trabalhadorP = async () =>') === false && i('const fluxAntesP = sceneStills.slice()') < i('const folhaDescartada = ') && rota.includes('stillsFinaisDaFolha({ comFolha: stillsP, semFolha: semFolhaP, flux: fluxAntesP, folhaDescartada })'))
  checa('D9 o relato do filme ganha o relato do juiz antes do evento da folha', i('personagemRelatoFinal = { ...personagemRelatoFinal, ...relatoJuizFicha(juizFichaEstado, folhaDescartada') > i('personagemRelatoFinal = { ...relatoDoPersonagem({') && i('personagemRelatoFinal = { ...personagemRelatoFinal, ...relatoJuizFicha(') < i('void writeServerEvent({ name: PERSONAGEM_EVENTO'))
  checa('D10 toda linha nova leva a marca e NENHUMA carrega marca de camada antiga (as projeções por linha das outras camadas não a contam)', linhasMarcadas.length >= 18 && linhasMarcadas.every((l) => !/KINEO-META95-PERSONAGEM|KINEO-FILME15-|KINEO-JUIZ-STILL-1410|KINEO-ROMANCE-ADULTO|KINEO-ESTRELA/.test(l)))
  // só acréscimos: a rota SÓ com esta camada (as irmãs de 27/10 mais novas saem em memória) menos as linhas marcadas
  // tem de ser byte a byte a camada de baixo (a rota sem esta entrega) — nenhuma linha preexistente mudou. // KINEO-CONSERTOS-2710
  const soEsta = lf(semElencoEpoca2710(rota, ROTA)), abaixo = lf(semJuizFicha2710(rota, ROTA)) // KINEO-CONSERTOS-2710
  const mais = soEsta.split('\n').filter((l) => l.includes(MARCA)) // KINEO-CONSERTOS-2710
  const menos = abaixo.split('\n').filter((l) => !soEsta.includes(l)) // KINEO-CONSERTOS-2710
  checa(`D11 a rota só ACRESCENTA linhas (nenhuma linha da base mudou) e cada uma leva a marca (+${mais.length} / -${menos.length})`, soEsta.split('\n').filter((l) => !l.includes(MARCA)).join('\n') === abaixo && mais.length === linhasMarcadas.length && soEsta !== abaixo) // KINEO-CONSERTOS-2710
  checa('D12 a lib nova leva o selo da trava no cabeçalho', SRC.juiz.startsWith(`// ═══ ${MARCA} [TRAVA 8.2 — vai do fundador 27/10 "faz todos esses consertos de 1 a 6"]`))
}

console.log('== M. mutantes ==')
const troca = (txt, de, para) => { if (!txt.includes(de)) throw new Error('mutante não aplicou: ' + de.slice(0, 60)); return txt.split(de).join(para) }
{
  const m1 = biblioteca({ juiz: troca(SRC.juiz, "if (r.regerou && r.regeracao_ok) return { precisa: true, motivo: 'reprovado_2x', notaFolha }", "if (r.regerou && r.regeracao_ok) return { precisa: false, motivo: 'reprovado_2x', notaFolha }") })
  checa('M1 decisão que deixa a reprovada 2x passar → B1 vermelho', m1.juiz.decidirSemFolha(K1).precisa === false)
  const m2 = biblioteca({ juiz: troca(SRC.juiz, "if (!texto || texto.veredito !== 'FAIL') return 'sem_folha'", "if (!texto) return 'folha'; if (texto.veredito !== 'FAIL') return 'sem_folha'") })
  checa('M2 texto puro sem julgamento perdendo para a reprovada 2x → B11/C9 vermelho', m2.juiz.escolherSemFolha(40, null, true) === 'folha')
  const m3 = biblioteca({ juiz: troca(SRC.juiz, 'if (!temDescricaoEsq && !compl) continue', 'if (!compl) continue') })
  checa('M3 extração que ignora os modificadores à esquerda → o Krishna perde "tiny blue-skinned" (A3 vermelho)', m3.juiz.descricaoLiteral(KRISHNA, { nome: 'Krishna', nucleo: 'Krishna' }) === null)
  const m4 = biblioteca({ juiz: troca(SRC.juiz, "origem: 'autor' as FichaDePersonagem['origem']", "origem: 'modelo' as FichaDePersonagem['origem']") })
  const e4 = m4.juiz.elencoComFichaLiteral(KRISHNA, B.ajuste.elencoDoRoteiro(KRISHNA)).elenco
  checa('M4 ficha literal sem origem "autor" → o casting REAL conseguiria trocá-la pelo mascote (A6 vermelho)', e4[0].origem !== 'autor' && B.ajuste.lerCastingAjuste(JSON.stringify({ characters: [{ name: 'Krishna', description: 'Krishna is a small and chubby soft purple monster with a cream belly, big round friendly eyes and a short tail, no clothes, cute mascot' }] }), e4, KRISHNA)[0].canonica !== e4[0].canonica)
  const m5 = biblioteca({ juiz: troca(SRC.juiz, 'export const JUIZ_FICHA_MIN_CENAS_FOLHA_ERRADA = 2', 'export const JUIZ_FICHA_MIN_CENAS_FOLHA_ERRADA = 99') })
  checa('M5 folha nunca descartada → B4 vermelho', m5.juiz.folhaErrada([{ precisa: true }, { precisa: true }]) === false)
  const m6 = rota.replace("if (semFolha.url && semFolha.escolha === 'sem_folha') stillsP[c.indice] = semFolha.url", "if (false) stillsP[c.indice] = semFolha.url")
  checa('M6 rota sem a linha que faz a cena seguir o texto puro → D7 vermelho', m6 !== rota && !m6.includes("if (semFolha.url && semFolha.escolha === 'sem_folha') stillsP[c.indice] = semFolha.url"))
  const m7 = biblioteca({ juiz: troca(SRC.juiz, 'if (estado.restantes <= 0) { r.motivo = \'teto_filme\'; return r }', 'if (false) { r.motivo = \'teto_filme\'; return r }') })
  const est7 = m7.juiz.novoJuizFicha({ prazo: Date.now() + 60_000, maxPorFilme: 0 })
  const fl7 = []
  await m7.juiz.julgarSemFolha(est7, { indice: 0, relato: K1, scenePrompt: 'x', visual: 'y', fala: '', fichas: [], seed: 1 }, { gerarStill: async () => { fl7.push(1); return 'https://f/t.jpg' }, julgar: async () => ({ veredito: 'PASS', problemas: [], motivo: '', nota: 80, custoUsd: 0, ms: 1, erro: null }) })
  checa('M7 teto por filme ignorado → still extra além do orçamento (C10 vermelho)', fl7.length === 1)
}

console.log(`\n${ok} ok · ${falhas.length} falha(s)`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
