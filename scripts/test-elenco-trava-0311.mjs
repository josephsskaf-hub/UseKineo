// KINEO-ELENCO-TRAVA-0311 [TRAVA 8.2 — pedido do fundador 03/11: o personagem nomeado troca entre as cenas] — guardião.
// Prova OFFLINE (sem fal, sem OpenAI, sem banco), EXECUTANDO o código REAL transpilado, com a FORMA REAL do caso youbykh
// (02/11 19:03 UTC, generation fb31ffa6, render 58ad28e8, espanhol, filme grátis 15 s, Kling 4 → Seedance 1.5, 3 cenas):
//   cena 1 = o cachorro (still com folha OK) · cena 2 = a menina (still com folha estourou o prazo: provider_timeout) ·
//   cena 3 = cachorro + menina (still refeito pelo crítico) · portão: troca de identidade → refez UMA cena → falhou → entregue.
// O que fica provado:
//   (c) ESTILO — a ficha REAL do cachorro (determinística, conto "small": sky blue + "cartoon style") perde a cor sorteada e o desenho num
//       filme fotorreal e ganha UMA linha positiva; o prompt REAL da cena 1 (já reescrito pela trava do filme) é trocado; o pedido
//       original "animación cinematográfica 3D" vira look 3D; cor DITA pelo cliente fica; idempotente.
//   (d) ÂNCORAS — a menina de 6 palavras é rala; âncoras lidas (fetch falso) entram na ficha e viajam verbatim; nome de gente famosa sai.
//   (a) STILL QUE FALHOU — o prazo estourado é retomado no MESMO pedido (sem 2º POST); a cena 2 (menina sozinha) não tem vizinha do
//       mesmo elenco → texto_ficha com a ficha no prompt; com vizinha do mesmo elenco → vizinha; a rota liga tudo isso na ordem certa.
//   (b) PORTÃO — troca de identidade refaz a cena SEM referência (a 2, não a 3), refaz o still com a folha, o clipe sai desse still;
//       ainda trocando → failed + identityUnresolved (nunca "passed"); sem folha no claim → o caminho de sempre.
//   M. MUTANTES — cada regra fica vermelha quando quebrada.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
const rd = (p) => lf(fs.readFileSync(p, 'utf8'))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const troca = (src, de, para) => { if (!src.includes(de)) throw new Error('mutante: trecho ausente — ' + de.slice(0, 70)); return src.replace(de, para) }
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {} }
const carrega = (arquivo, mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === mutar.arquivo ? mutar.fn(text) : text) })(arquivo)

// ═══ A forma REAL do caso youbykh (claim + eventos de 02/11) ═══
const PROMPT = 'HOOK (0-2s): [Pexels: rainy street] Un perro pequeño... cambia una vida.\n\nMICRO REWARD 1: [Pexels: small dog walking] En una noche lluviosa, un perro callejero busca refugio.\n\nMICRO REWARD 2: [Pexels: girl in park] Una niña perdida llora sola en el parque.\n\nPAYOFF: [Pexels: dog and girl happily reunited] El perro la encuentra, la guía a casa... y se convierte en su héroe.'
const IDEIA = 'Genera un vídeo viral de 40 segundos para YouTube Shorts. Una historia emocionante sobre un pequeño perro abandonado que salva a una niña. Estilo animación cinematográfica 3D familiar, personajes adorables, expresiones faciales detalladas, escenarios espectaculares y movimientos naturales.'
const CENA1_REAL = 'Film visual medium: photorealistic, ultra-detailed. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. photorealistic, ultra-detailed. A small, soaked dog huddles under a streetlight, seeking refuge from the pouring rain, its fur glistening in the dim light. 9:16 vertical framing, same photorealistic look in every scene The same main character appears in this scene, consistent design: the small dog, a small sky blue dog with true dog anatomy (the real ears, snout, paws and tail of a dog), drawn in a soft friendly photorealistic, ultra-detailed with a rounded body and big expressive eyes.'
const CENA2_REAL = 'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. A young girl stands in a park, tears on her cheeks, looking lost and alone, surrounded by tall trees and wet grass. 9:16 vertical framing, same photorealistic look in every scene'
const CENA3_REAL = 'Film visual medium: photorealistic, ultra-detailed. photorealistic, ultra-detailed. the dog joyfully bounds towards the girl, their eyes meeting as they embrace, a warm glow enveloping them against the backdrop of twilight. 9:16 vertical framing'

const trava = carrega('lib/cinematic/elencoTrava.ts')
const folha = carrega('lib/cinematic/folhaDePersonagem.ts')
const estilo = carrega('lib/cinematic/sceneStyle.ts')
const juiz = carrega('lib/cinematic/juizFicha.ts')
const ajuste = carrega('lib/cinematic/personagemAjuste.ts')

console.log('(c) ESTILO travado na ficha')
const fotorreal = estilo.deriveStyleAnchor(PROMPT)
checa('c0 sem a ideia o roteiro estruturado nasce fotorreal (o defeito de origem)', fotorreal.look === 'photoreal')
const look3d = estilo.deriveStyleAnchor(trava.textoDoLook(PROMPT, IDEIA))
checa('c1 com a ideia original ("animación cinematográfica 3D") o look é 3D', look3d.look === 'animated3d')
checa('c1b sem ideia, textoDoLook devolve o roteiro byte a byte', trava.textoDoLook(PROMPT, undefined) === PROMPT && trava.textoDoLook(PROMPT, 42) === PROMPT)
const lookDaIdeia = (ideia) => estilo.deriveStyleAnchor(trava.textoDoLook(PROMPT, ideia)).look
checa('c1c ideia "an animated debate about taxes" (animated solto) → filme real', lookDaIdeia('An animated debate about taxes between two neighbours') === 'photoreal')
checa('c1d ideia com "black and white" / "fairy tale" / "animation" solto não muda o look', lookDaIdeia('A black and white photo of my grandfather, a real fairy tale') === 'photoreal' && lookDaIdeia('The animation of the crowd when the goal happened') === 'photoreal')
checa('c1e "Estilo animación cinematográfica 3D familiar" → desenho', lookDaIdeia('Estilo animación cinematográfica 3D familiar, personajes adorables') === 'animated3d')
checa('c1f pedidos explícitos: "3D animation", "animated film", "cartoon", "Pixar", "desenho animado", "animação", "estilo animado" → desenho; "anime" → anime', ['A 3D animation of a fox', 'an animated film about a fox', 'cartoon fox story', 'Pixar-like fox', 'um desenho animado de raposa', 'animação de uma raposa', 'história em estilo animado'].every((t) => lookDaIdeia(t) === 'animated3d') && lookDaIdeia('estilo anime, raposa ninja') === 'anime')
checa('c1g pedido negado na ideia ("no cartoon, realistic") → filme real', lookDaIdeia('A fox story, no cartoon, realistic footage') === 'photoreal')
checa('c1h o roteiro em si segue a régua de sempre ("animated" no roteiro continua valendo)', estilo.deriveStyleAnchor(trava.textoDoLook('An animated story about a fox', null)).look === estilo.deriveStyleAnchor('An animated story about a fox').look)
// a ficha REAL do cachorro sai do gerador determinístico de hoje (o "small" do roteiro liga o conto infantil)
const canonicaCao = folha.canonicaDeterministica('the small dog', 'animal', 'dog', 'small dog | small dog walking', new Set())
checa('c2 a ficha real de hoje é o cachorro azul de desenho (reproduz o caso)', /sky blue|bright green|warm orange|soft purple|sunny yellow|teal/.test(canonicaCao) && /cartoon style/.test(canonicaCao))
const cao = { nome: 'the small dog', nucleo: 'dog', tipo: 'animal', canonica: canonicaCao, origem: 'deterministica', protagonista: true, genero: null }
const menina = { nome: 'the young girl', nucleo: 'girl', tipo: 'humano', canonica: 'the young girl, a young lost girl', origem: 'autor', protagonista: false, genero: 'woman' }
const travado = trava.travarEstiloDoElenco([cao, menina], fotorreal, trava.textoDoLook(PROMPT, null))
const caoT = travado.elenco[0], meninaT = travado.elenco[1]
checa('c3 filme fotorreal: sem cor sorteada, sem "cartoon"/"drawn in a soft friendly"', !/sky blue|bright green|warm orange|soft purple|sunny yellow|teal|cartoon|drawn in a soft friendly/i.test(caoT.canonica))
checa('c4 a linha de estilo é positiva e diz a espécie', caoT.canonica.includes('a real living dog filmed in photorealistic live action') && !/\bno (?:cartoon|plush|toy)|not a (?:cartoon|toy)/i.test(caoT.canonica))
checa('c5 a anatomia do cachorro fica ("true dog anatomy")', caoT.canonica.includes('true dog anatomy'))
checa('c6 a menina ganha a linha fotorreal de gente', meninaT.canonica.endsWith('a real person filmed in photorealistic live action, natural skin texture and real fabric clothing'))
checa('c7 idempotente', trava.travarEstiloDoElenco(travado.elenco, fotorreal, '').trocas.length === 0)
const pares = trava.trocasDaFicha(travado.trocas, fotorreal)
const cena1Nova = juiz.trocarFichaNoPrompt(CENA1_REAL, pares)
checa('c8 o prompt REAL da cena 1 (ficha já reescrita pela trava do filme) é trocado pela travada', !cena1Nova.includes('sky blue') && !cena1Nova.includes('drawn in a soft friendly') && cena1Nova.includes('filmed in photorealistic live action'))
const caoAzul = trava.travarEstiloDaFicha(cao, fotorreal, 'un perro azul pequeño')
checa('c9 cor DITA pelo cliente ("perro azul") fica', caoAzul.canonica.includes('sky blue') && !caoAzul.canonica.includes('cartoon style'))
const cao3d = trava.travarEstiloDaFicha(cao, look3d, IDEIA)
checa('c10 filme 3D: o desenho fica e entra a linha do mesmo desenho em toda cena', cao3d.canonica.includes('cartoon style') && cao3d.canonica.includes('the same character design in every scene'))

console.log('(d) ÂNCORAS lidas da folha')
checa('d1 a menina de 6 palavras é rala', trava.fichaRala(meninaT))
checa('d2 o cachorro travado sem pelagem é ralo', trava.fichaRala(caoT))
checa('d3 ficha com cabelo/roupa não é rala; mítica nunca', !trava.fichaRala({ ...menina, canonica: 'the girl, a girl about nine with curly black hair wearing a red dress' }) && !trava.fichaRala({ ...menina, origem: 'mitica' }))
// item 7 da revisão: o teste de 'mitica' NÃO é código morto — o elenco real cria figura humana mítica (FIGURAS_FIEIS tipo 'humano')
const elencoNatal = ajuste.elencoDoRoteiro('Father Christmas arrived. A little boy ran to the door.')
const natal = elencoNatal.find((f) => f.origem === 'mitica')
checa('d3b "Father Christmas" nasce humano + mitica no elenco real (o guarda de mítica é alcançável)', natal && natal.tipo === 'humano')
checa('d3c figura mítica humana sem palavra de cabelo/roupa (Buda) não ganha âncora inventada', !trava.fichaRala({ nome: 'Buddha', tipo: 'humano', origem: 'mitica', canonica: 'Buddha, a serene seated monk with a shaved head of tight curls, a topknot, a saffron robe' }) && trava.fichaRala({ nome: 'Buddha', tipo: 'humano', origem: 'autor', canonica: 'Buddha, a serene seated monk with a shaved head of tight curls, a topknot, a saffron robe' }))
const respostaMenina = JSON.stringify({ age_range: 'about eight years old', hair: 'long dark brown hair in a ponytail', skin_tone: 'light olive', clothing: 'yellow raincoat over a blue dress', coat: '', size: '' })
let pedidoVisao = null
const fetchFalso = async (url, init) => { pedidoVisao = JSON.parse(init.body); return { ok: true, json: async () => ({ choices: [{ message: { content: respostaMenina } }] }) } }
const ancoras = await trava.lerAncorasDaFolha(meninaT, 'https://fixture.invalid/folha-menina.png', { fetchImpl: fetchFalso, apiKey: 'sk-test' })
checa('d4 a leitura manda a FOLHA ao modelo de visão (imagem + ficha escrita)', pedidoVisao && JSON.stringify(pedidoVisao.messages).includes('https://fixture.invalid/folha-menina.png') && pedidoVisao.model === 'gpt-4o-mini')
const meninaA = trava.fichaComAncoras(meninaT, ancoras)
checa('d5 as âncoras entram na ficha (idade, cabelo, pele, roupa) antes da linha de estilo', meninaA.canonica.includes('appearance anchors: about eight years old, long dark brown hair in a ponytail, light olive skin, wearing yellow raincoat over a blue dress') && meninaA.canonica.endsWith('real fabric clothing'))
checa('d6 ficha ancorada deixa de ser rala (uma vez por filme)', !trava.fichaRala(meninaA) && trava.fichaComAncoras(meninaA, ancoras).canonica === meninaA.canonica)
const cena2ComFicha = trava.garantirFichasNoPrompt(CENA2_REAL, [meninaA])
const cena3Antes = trava.garantirFichasNoPrompt(CENA3_REAL, [caoT, meninaT])
const cena3Depois = juiz.trocarFichaNoPrompt(cena3Antes, [[meninaT.canonica, meninaA.canonica]])
checa('d7 as âncoras viajam VERBATIM na cena 2 e na cena 3', cena2ComFicha.includes(meninaA.canonica) && cena3Depois.includes(meninaA.canonica) && cena3Depois.includes(caoT.canonica))
const famosa = trava.lerAncoras(JSON.stringify({ hair: 'looks like Taylor Swift', clothing: 'Disney princess dress', age_range: 'Emma Watson style', skin_tone: 'fair' }))
checa('d8 nome/comparação com gente famosa ou franquia sai do campo', famosa && famosa.cabelo === '' && famosa.roupa === '' && famosa.idade === '' && famosa.pele === 'fair')
checa('d9 resposta ilegível = null (a ficha fica como estava)', trava.lerAncoras('not json') === null && trava.lerAncoras('{}') === null)
checa('d10 sem chave não chama rede', (await trava.lerAncorasDaFolha(meninaT, 'https://x.invalid/a.png', { fetchImpl: () => { throw new Error('rede') }, apiKey: '' })) === null)

console.log('(a) STILL QUE FALHOU — refaz uma vez, vizinha, texto com ficha')
const posts = [], leituras = []
const deps = {
  pedir: async (input, janela, retomar) => { if (retomar) { leituras.push({ retomar, janela }); return { url: 'https://fixture.invalid/still-cena2.png', motivo: 'ok', largura: 768, altura: 1376 } } posts.push(input); return { url: null, motivo: 'provider_timeout', requestId: 'req-cena-2' } },
  bytes: async () => null,
  moderar: async () => ({ ok: true }),
}
const r1 = await ajuste.stillComFolha({ prompt: 'p', imageUrls: ['https://f.invalid/folha.png'], aspect: '9:16', fichas: [meninaT], pollWindowMs: 40_000 }, deps)
checa('a1 1ª tentativa estoura o prazo e devolve o id do pedido (motivo real: provider_timeout)', r1.url === null && r1.motivo === 'provider_timeout' && r1.requestId === 'req-cena-2')
const plano1 = trava.planoDaRetentativa(r1, 60_000)
checa('a2 prazo estourado com id → retomar o MESMO pedido; moderação/sem chave não refazem', plano1 && plano1.retomar === 'req-cena-2' && plano1.janelaMs === trava.STILL_RETRY_JANELA_MS && trava.planoDaRetentativa({ motivo: 'moderation_blocked' }, 60_000) === null && trava.planoDaRetentativa({ motivo: 'no_key' }, 60_000) === null)
const r2 = await ajuste.stillComFolha({ prompt: 'p', imageUrls: ['https://f.invalid/folha.png'], aspect: '9:16', fichas: [meninaT], pollWindowMs: plano1.janelaMs, retomar: plano1.retomar }, deps)
checa('a3 a 2ª tentativa LÊ o mesmo pedido com janela maior — nenhum 2º POST pago', r2.url === 'https://fixture.invalid/still-cena2.png' && posts.length === 1 && leituras.length === 1 && leituras[0].retomar === 'req-cena-2' && leituras[0].janela > 40_000)
// BLOQUEIO da revisão de f009126dc — o POST que LANÇA (transporte/5xx = ambíguo, lib/falQueue) nunca é repetido. O servidor REAL (personagemAjusteServer) com a fal e a fila falsas.
const contaPosts = { n: 0 }
const servidorStill = (submit, status) => createOfflineLoader({ globals, env: { FAL_KEY: 'fal-test' }, mocks: {
  '@fal-ai/client': { fal: { config() {}, queue: { status: async () => status(), result: async () => ({ data: { images: [{ url: 'https://f.invalid/x.png', width: 768, height: 1376 }] } }) } } },
  '@/lib/falQueue': { submitFalQueueOnce: async () => { contaPosts.n++; return submit() } },
  '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
} })('lib/cinematic/personagemAjusteServer.ts')
const ambiguo = () => { const e = new Error('fetch failed (ambiguous)'); e.ambiguous = true; throw e }
const srvAmb = servidorStill(ambiguo, () => ({ status: 'IN_QUEUE' }))
const rAmb = await srvAmb.gerarStillComFolha({ prompt: 'p', imageUrls: ['https://f.invalid/folha.png'], aspect: '9:16', userId: 'u', engine: 'personagem:seedance', pollWindowMs: 40_000, fichas: [meninaT] })
const planoAmb = trava.planoDaRetentativa(rAmb, 60_000)
checa('a3b envio AMBÍGUO (POST lançou) → provider_failed sem id e SEM 2ª tentativa: zero 2º POST, direto à vizinha/texto_ficha', rAmb.url === null && rAmb.motivo === 'provider_failed' && rAmb.envioFalhou === true && !rAmb.requestId && planoAmb === null && contaPosts.n === 1)
contaPosts.n = 0
const srvFailed = servidorStill(async () => 'req-morto', () => ({ status: 'FAILED' }))
const rFailed = await srvFailed.gerarStillComFolha({ prompt: 'p', imageUrls: ['https://f.invalid/folha.png'], aspect: '9:16', userId: 'u', engine: 'personagem:seedance', pollWindowMs: 40_000, fichas: [meninaT] })
const planoFailed = trava.planoDaRetentativa(rFailed, 60_000)
checa('a3c a fal disse FAILED (com id) → um POST novo é permitido (o job morreu do lado dela)', rFailed.motivo === 'provider_failed' && rFailed.jobFalhou === true && rFailed.requestId === 'req-morto' && planoFailed && planoFailed.retomar === null)
checa('a3d provider_failed com id mas SEM a fal dizer FAILED (leitura/autorização) → não refaz', trava.planoDaRetentativa({ motivo: 'provider_failed', requestId: 'req-x' }, 60_000) === null)
checa('a3e a janela da 2ª tentativa nunca passa do prazo do lote; sem folga mínima, nada', trava.planoDaRetentativa(r1, 12_000).janelaMs === 12_000 && trava.planoDaRetentativa(r1, 3_000) === null && trava.planoDaRetentativa(r1, -5) === null)
const cenasYoubykh = [{ indice: 0, nomes: ['the small dog'] }, { indice: 1, nomes: ['the young girl'] }, { indice: 2, nomes: ['the small dog', 'the young girl'] }]
const stillsYoubykh = ['https://f.invalid/s1.png', null, 'https://f.invalid/s3.png']
checa('a4 youbykh: a menina sozinha não tem vizinha do MESMO elenco (cena 3 tem o cachorro) → texto_ficha', trava.vizinhaDoElenco(1, ['the young girl'], cenasYoubykh, stillsYoubykh) === null)
checa('a5 texto_ficha leva a ficha inteira (estilo + âncoras) no prompt da cena 2', cena2ComFicha.includes('appearance anchors:') && cena2ComFicha.includes('filmed in photorealistic live action') && cena2ComFicha.includes('The same main character appears in this scene'))
const cenas4 = [...cenasYoubykh, { indice: 3, nomes: ['the young girl'] }]
const v = trava.vizinhaDoElenco(1, ['the young girl'], cenas4, [...stillsYoubykh, 'https://f.invalid/s4-menina.png'])
checa('a6 com vizinha do mesmo elenco a cena usa o still aprovado mais próximo (vizinha)', v && v.indice === 3 && v.url === 'https://f.invalid/s4-menina.png')
checa('a7 empate de distância = a cena anterior', trava.vizinhaDoElenco(1, ['a'], [{ indice: 0, nomes: ['a'] }, { indice: 1, nomes: ['a'] }, { indice: 2, nomes: ['a'] }], ['u0', null, 'u2']).indice === 0)
checa('a8 garantirFichasNoPrompt é idempotente', trava.garantirFichasNoPrompt(cena2ComFicha, [meninaA]) === cena2ComFicha)
const rota = rd('app/api/generate-video-cinematic/route.ts')
const pos = (s) => rota.indexOf(s)
checa('a9 a rota decide a 2ª tentativa pelo plano (prazo do lote − agora) e usa a janela/retomar dele', rota.includes('planoDaRetentativa(r, prazoP - Date.now())') && rota.includes('pollWindowMs: planoR.janelaMs, fichas: fichasDaCena(c), retomar: planoR.retomar') && rota.includes("referenciaP[c.indice] = 'retry_ok'") && !rota.includes('MOTIVOS_QUE_REFAZEM'))
checa('a9b o juiz que escolhe o texto puro marca a cena texto_ficha (o portão a refaz primeiro)', pos("if (semFolha.url && semFolha.escolha === 'sem_folha') referenciaP[c.indice] = 'texto_ficha'") > 0 && pos("if (semFolha.url && semFolha.escolha === 'sem_folha') referenciaP[c.indice] = 'texto_ficha'") < pos("if (semFolha.url && semFolha.escolha === 'sem_folha') stillsP[c.indice] = semFolha.url"))
checa('a9c a cor dita é procurada no pedido inteiro (roteiro + ideia); o look só no pedido de desenho', rota.includes('textoDoPedido(prompt, body.original_idea)') && trava.textoDoPedido(PROMPT, 'un perro azul').includes('azul') && !trava.textoDoLook(PROMPT, 'un perro azul').includes('azul'))
checa('a10 a rota decide vizinha/texto_ficha e regenera o still com a ficha no prompt', rota.includes("referenciaP[c.indice] = 'vizinha'") && rota.includes("referenciaP[c.indice] = 'texto_ficha'") && /const novo = await generateCinematicSceneStill\(\{ scenePrompt: classicScenePrompts\[c\.indice\]/.test(rota))
checa('a11 âncoras e ficha em toda cena ANTES do 1º still com folha', pos('lerAncorasDaFolha(f, folhaDe.get(f.nome)') > 0 && pos('garantirFichasNoPrompt(classicScenePrompts[c.indice]') > pos('lerAncorasDaFolha(f, folhaDe.get(f.nome)') && pos('const trabalhadorP = async') > pos('garantirFichasNoPrompt(classicScenePrompts[c.indice]'))
checa('a12 estilo travado depois da ficha literal e antes da folha/still', pos('const travaEstiloDaCena =') > pos('if (fichaLiteral15 && fichaLiteral15.trocas.length > 0)') && pos('const travaEstiloDaCena =') < pos('const folhasP = await Promise.all'))
checa('a13 o relato vai ao claim assinado (elenco_trava) e ao evento (still_fallback)', rota.includes('response = { ...response, elenco_trava: elencoTravaRelato }') && rota.includes('still_fallback: stillFallbackP'))
checa('a14 hollywood: âncora que falhou ganha 2ª tentativa; envio ambíguo continua subindo', /if \(!anchors && !qualidadeHerdada\) \{ try \{ anchors = await generateHollywoodAnchors\(/.test(rota) && rota.includes("if (e instanceof FalQueueSubmitError && e.ambiguous) throw e; anchors = null }"))
checa('a15 o look lê a ideia original (body.original_idea)', rota.includes('textoDoLook(prompt, body.original_idea), // KINEO-ELENCO-TRAVA-0311'))

console.log('(b) PORTÃO do filme grátis')
const gate = carrega('lib/free15Gate.ts')
const original = { url: 'https://fixture.invalid/original.mp4', snapshotUrl: null, durationSeconds: 17.5 }
const source = { width: 1080, height: 1920, duration: 17.5, elements: [0, 1, 2].map(i => ({ type: 'video', source: `clip-${i}`, time: i * 5.84, duration: 5.9, trim_start: .1, track: 2 })) }
const frame = (i, t) => ({ i, t, score: 95, issues: [] })
const pixelBase = { score: 95, cap_limit: 100, caps: [], evidence_status: 'complete', caption_language_ok: true, caption_legible: true, identity_consistent: true, frames: [frame(0, 1), frame(1, 4.5), frame(2, 6.8), frame(3, 9), frame(4, 13.5)] }
const identidade = { ...pixelBase, score: 70, cap_limit: 70, caps: ['identity_changed'], identity_consistent: false, identity_changes: [{ from: 3, to: 4 }] }
const clone = (x) => JSON.parse(JSON.stringify(x))
const estado = () => ({ version: 'free15-gate-v1', status: 'ready', source: clone(source), captionElements: [], captionEvidence: null, attempted: false, reason: 'awaiting_delivery', updatedAt: 1000 })
const cenasGate = (src) => src.elements.filter(e => e.type === 'video').map((e, i) => ({ index: i, clipUrl: e.source, model: 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video', input: { image_url: `still-${i}`, prompt: `scene ${i} signed prompt with the ficha` }, seconds: 6 }))
checa('b1 sem a marca do claim: a culpada é a cena do quadro "depois da troca" (a 3) — o comportamento de 02/11', gate.decideFree15Gate(estado(), original, identidade, cenasGate(source)).sceneIndex === 2)
const dec = gate.decideFree15Gate(estado(), original, identidade, cenasGate(source), { semReferencia: [1] })
checa('b2 com a cena 2 marcada sem referência: refaz a 2 e marca identidade', dec.kind === 'scene' && dec.sceneIndex === 1 && dec.identity === true)
const semDefeito = { ...pixelBase, score: 55, cap_limit: 55, caps: ['invented_text'], frames: [frame(0, 1), frame(1, 7), frame(2, 12)].map((f, i) => i === 1 ? { ...f, issues: ['invented_text'] } : f) }
checa('b3 defeito que não é identidade não muda (sem flag, cena do quadro)', JSON.stringify(gate.decideFree15Gate(estado(), original, semDefeito, cenasGate(source), { semReferencia: [0] })) === JSON.stringify({ kind: 'scene', reason: 'pixel_scene_cap', sceneIndex: 1 }))
function harness({ judgments, comFolha = true, stillResult = { status: 'done', url: 'https://fixture.invalid/still-novo-com-folha.png' } }) {
  let atual = estado(), agora = 2000
  const calls = { judge: 0, scene: [], still: [], stillPolls: 0 }
  const d = {
    now: () => agora,
    read: async () => clone(atual),
    move: async (antes, depois) => { if (JSON.stringify(antes) !== JSON.stringify(atual)) return false; atual = clone(depois); return true },
    judge: async () => clone(judgments[Math.min(calls.judge++, judgments.length - 1)]),
    scenes: cenasGate,
    semReferencia: () => [1],
    submitStill: async (scene) => { calls.still.push(scene.index); return comFolha ? 'req-still' : null },
    pollStill: async () => { calls.stillPolls++; return stillResult },
    submitScene: async (scene, imageUrl) => { calls.scene.push({ index: scene.index, imageUrl: imageUrl ?? null }); return 'req-scene' },
    pollScene: async () => ({ status: 'done', url: 'clip-1-refeito' }),
    submitRender: async () => 'render-2',
    pollRender: async () => ({ status: 'succeeded', url: 'https://fixture.invalid/repaired.mp4', snapshotUrl: null, durationSeconds: 17.5 }),
  }
  return { d, calls, get: () => clone(atual), passo: () => gate.advanceFree15Gate(d, original) }
}
const h = harness({ judgments: [identidade, identidade] })
for (let i = 0; i < 6 && !['passed', 'failed'].includes(h.get().status); i++) await h.passo()
const fim = await h.passo()
checa('b4 refaz o STILL da cena 2 com a folha antes do clipe', h.calls.still.length === 1 && h.calls.still[0] === 1 && h.calls.stillPolls === 1)
checa('b5 o clipe refeito sai do still novo (1º quadro), uma vez só', h.calls.scene.length === 1 && h.calls.scene[0].index === 1 && h.calls.scene[0].imageUrl === 'https://fixture.invalid/still-novo-com-folha.png')
checa('b6 ainda trocando depois da refação: failed + identityUnresolved (nunca passed)', fim.status === 'failed' && fim.identityUnresolved === true && h.get().identityUnresolved === true && h.get().stillUrl === 'https://fixture.invalid/still-novo-com-folha.png')
const hOk = harness({ judgments: [identidade, pixelBase] })
for (let i = 0; i < 7 && !['passed', 'failed'].includes(hOk.get().status); i++) await hOk.passo()
checa('b7 refação com a folha resolve → passed, sem marca', hOk.get().status === 'passed' && !hOk.get().identityUnresolved)
const hSem = harness({ judgments: [identidade, identidade], comFolha: false })
for (let i = 0; i < 6 && !['passed', 'failed'].includes(hSem.get().status); i++) await hSem.passo()
checa('b8 sem folha no claim: o clipe refeito do still assinado de sempre (sem imageUrl)', hSem.calls.scene.length === 1 && hSem.calls.scene[0].imageUrl === null && hSem.calls.stillPolls === 0)
const hFalha = harness({ judgments: [identidade, identidade], stillResult: { status: 'failed' } })
for (let i = 0; i < 6 && !['passed', 'failed'].includes(hFalha.get().status); i++) await hFalha.passo()
checa('b9 still do portão barrado/fora do formato: o clipe sai do still assinado, o portão não para', hFalha.calls.scene.length === 1 && hFalha.calls.scene[0].imageUrl === null)
checa('b10 o claim sem elenco_trava não marca cena nenhuma; texto_ficha marca', trava.cenaSemReferencia(null).length === 0 && JSON.stringify(trava.cenaSemReferencia({ cenas: [{ cena: 2, referencia: 'texto_ficha' }, { cena: 1, referencia: 'ok' }] })) === '[1]')
checa('b11 a referência da cena no claim exige folha https e prompt do still', trava.referenciaDaCenaNoClaim({ cenas: [{ cena: 2, folhas: ['https://f.invalid/a.png'], prompt_still: 'x'.repeat(30) }] }, 1)?.folhas.length === 1 && trava.referenciaDaCenaNoClaim({ cenas: [{ cena: 2, folhas: ['http://f'], prompt_still: 'x'.repeat(30) }] }, 1) === null)
const servidor = rd('lib/free15GateServer.ts')
checa('b12 o adaptador real liga still com folha, cena sem referência e a imagem nova no payload assinado', servidor.includes('semReferencia: () => cenaSemReferencia(a.claim.response?.elenco_trava)') && servidor.includes('postarStillComFolha({ prompt: ref.prompt, imageUrls: ref.folhas') && servidor.includes("...(imageUrl && CLASSIC_I2V.has(scene.model) ? { image_url: imageUrl } : {}) }"))
const status = rd('app/api/compose/status/[renderId]/route.ts')
checa('b13 a entrega marcada: delivery_mark identity_unresolved + celebrate false', status.includes("...(free15GateFailure?.identityUnresolved ? { delivery_mark: 'identity_unresolved', celebrate: false } : {})"))

console.log('M. MUTANTES')
const mutGate = carrega('lib/free15Gate.ts', { arquivo: 'lib/free15Gate.ts', fn: (t) => troca(t, 'const sceneIndex = semReferencia ?? located', 'const sceneIndex = located') })
checa('M1 sem a preferência pela cena sem referência, a refação volta à cena 3 (vermelho)', mutGate.decideFree15Gate(estado(), original, identidade, cenasGate(source), { semReferencia: [1] }).sceneIndex === 2)
const mutGate2 = carrega('lib/free15Gate.ts', { arquivo: 'lib/free15Gate.ts', fn: (t) => troca(t, 'finish(\'failed\', decision.reason, media, decision.identity === true)', 'finish(\'failed\', decision.reason, media)') })
const hM = { ...harness({ judgments: [identidade, identidade] }) }
const passoM = () => mutGate2.advanceFree15Gate(hM.d, original)
for (let i = 0; i < 6 && !['passed', 'failed'].includes(hM.get().status); i++) await passoM()
checa('M2 sem a marca, a troca não resolvida não chega à entrega (vermelho)', !hM.get().identityUnresolved)
const mutTrava = carrega('lib/cinematic/elencoTrava.ts', { arquivo: 'lib/cinematic/elencoTrava.ts', fn: (t) => troca(t, "if (COR_DITA[cor].test(textoDoPedido)) continue", 'continue') })
checa('M3 sem tirar a cor sorteada, o cachorro azul volta (vermelho)', mutTrava.travarEstiloDaFicha(cao, fotorreal, '').canonica.includes('sky blue'))
const mutTrava2 = carrega('lib/cinematic/elencoTrava.ts', { arquivo: 'lib/cinematic/elencoTrava.ts', fn: (t) => troca(t, "c = c.split(ESTILO_INFANTIL).join('').replace(ESTILO_INFANTIL_RE, '')", '') })
checa('M4 sem tirar o "cartoon style" infantil, o desenho volta ao filme fotorreal (vermelho)', mutTrava2.travarEstiloDaFicha(cao, fotorreal, '').canonica.includes('cartoon style'))
const mutAjuste = carrega('lib/cinematic/personagemAjuste.ts', { arquivo: 'lib/cinematic/personagemAjuste.ts', fn: (t) => troca(t, 'reconferida: false, requestId: pedido.requestId ?? null,', 'reconferida: false,') })
const rM = await mutAjuste.stillComFolha({ prompt: 'p', imageUrls: ['https://f.invalid/folha.png'], aspect: '9:16', fichas: [meninaT], pollWindowMs: 40_000 }, deps)
checa('M5 sem o id do pedido, a 2ª tentativa teria de postar de novo (vermelho)', !rM.requestId)
const mutViz = carrega('lib/cinematic/elencoTrava.ts', { arquivo: 'lib/cinematic/elencoTrava.ts', fn: (t) => troca(t, '&& mesmoElenco(c.nomes, nomes))', ')') })
checa('M6 sem exigir o MESMO elenco, a cena da menina sozinha abriria no quadro do cachorro com a menina (vermelho)', mutViz.vizinhaDoElenco(1, ['the young girl'], cenasYoubykh, stillsYoubykh) !== null)
const mutPlano = carrega('lib/cinematic/elencoTrava.ts', { arquivo: 'lib/cinematic/elencoTrava.ts', fn: (t) => troca(troca(t, '|| r.envioFalhou) return null', ') return null'), 'return r.requestId && r.jobFalhou ? { retomar: null, janelaMs } : null', 'return { retomar: null, janelaMs }') })
checa('M7 sem a regra do envio ambíguo, o envio que lançou ganharia um 2º POST pago (vermelho)', mutPlano.planoDaRetentativa(rAmb, 60_000) !== null)
const mutSrv = createOfflineLoader({ globals, env: { FAL_KEY: 'fal-test' }, source: (rel, text) => rel === 'lib/cinematic/personagemAjusteServer.ts' ? troca(text, "motivo: 'provider_failed', envioFalhou: true }", "motivo: 'provider_failed', requestId: 'inventado', jobFalhou: true }") : text, mocks: {
  '@fal-ai/client': { fal: { config() {}, queue: { status: async () => ({ status: 'IN_QUEUE' }), result: async () => ({}) } } },
  '@/lib/falQueue': { submitFalQueueOnce: async () => ambiguo() },
  '@/lib/safety/contentModeration': { moderateContent: async () => ({ ok: true }) },
} })('lib/cinematic/personagemAjusteServer.ts')
const rMutSrv = await mutSrv.gerarStillComFolha({ prompt: 'p', imageUrls: ['https://f.invalid/folha.png'], aspect: '9:16', userId: 'u', engine: 'personagem:seedance', pollWindowMs: 40_000, fichas: [meninaT] })
checa('M8 servidor que esconde o envio ambíguo atrás de um "FAILED" levaria a um 2º POST (vermelho)', trava.planoDaRetentativa(rMutSrv, 60_000) !== null)
const mutLook = carrega('lib/cinematic/elencoTrava.ts', { arquivo: 'lib/cinematic/elencoTrava.ts', fn: (t) => troca(t, "...DRAWN_LOOK_PATTERNS.filter((re) => !/\\(animated\\|animation\\|anime\\|manga/.test(re.source)),", '...DRAWN_LOOK_PATTERNS,') })
checa('M9 com o "animated" solto da ideia de volta, o debate sobre impostos viraria desenho (vermelho)', estilo.deriveStyleAnchor(mutLook.textoDoLook(PROMPT, 'An animated debate about taxes')).look !== 'photoreal')

console.log(`\n${falhas.length === 0 ? '🟢' : '🔴'} elenco-trava-0311: ${ok}/${ok + falhas.length}`)
if (falhas.length) { for (const f of falhas) console.error('  · ' + f); process.exit(1) }
