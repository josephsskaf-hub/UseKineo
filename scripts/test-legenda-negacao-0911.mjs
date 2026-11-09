// KINEO-LEGENDA-NEGACAO-0911 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do conserto
// "FILME — LEGENDA parte uma negação ao meio" (cliente pagante, render dc469323-0e2a-4737-bd29-833f7c208cd0, H3 Max Turbo, 79 s,
// 09/11 07:59 UTC): a frase "Being clever doesn't mean you should forget Allah." saiu como "BEING CLEVER DOESN'T MEAN" e depois
// "YOU SHOULD FORGET ALLAH" sozinho na tela por 2,2 s — lido sozinho, o pedaço diz o CONTRÁRIO da frase.
//
// O que este guardião executa (sem rede, sem custo, sem render): o lib/compose.ts REAL, duas vezes — o de hoje e o de ANTES desta
// entrega (o arquivo de hoje com o recibo exato desfeito, test-support/desfaz-legenda-negacao-0911).
//   (1) CASO REAL: as legendas que a produção mandou ao Creatomate (evento free_redo_film_source de 09/11 07:56 UTC, 178 elementos
//       de texto da trilha 5) viram a linha de palavras do Whisper daquele render (palavra + início; o Whisper em si não ficou
//       guardado — limite declarado). Com ela, a BASE reproduz os 64 pedaços da produção, texto e tempo. HOJE: os pedaços que
//       diziam o contrário somem, nenhuma palavra se perde nem troca de lugar, e o resto do filme sai igual.
//   (2) AS FRASES REAIS do mesmo roteiro, uma a uma, com tempos sintéticos: sem pausa, com pausa e com a pontuação colada na palavra.
//   (3) CONTROLES byte a byte, base × hoje: frases sem negação em 6 línguas, as regras irmãs (palavra-função, preposição, nome antes
//       do número, número em RTL), o "no" do português, língua fora da lista, a grade de 3.000+ linhas sem negação, o source inteiro.
//   (4) LÍNGUAS: inglês, português, espanhol, francês, alemão e italiano — a negação fica junto do que ela nega.
//   (5) LIMITES declarados: o pedaço da negação vai até 3 linhas de pílula e 10 palavras; oração negada maior que isso continua
//       nos pedaços seguintes; pedaço que fechou em pausa ou ponto não é emendado.
//   (6) O CORTE PROPORCIONAL (sem Whisper) recebe a mesma regra pelo mesmo helper.
//   (7) MUTANTES: os estragos no conserto, cada um tem de ser pego por esta mesma bateria.
//   (8) A VOLTA DO REVISOR (2): as frases que a 1ª versão deixava como a base (oração negada com mais de 6 palavras ou 40 letras,
//       a forma comum do português e do espanhol "não significa que…", pedaço de 1 palavra antes da negação) e a REGRA GERAL,
//       conferida em toda linha com negação: pedaço com negação que não fecha a oração está no limite da pílula ou para antes
//       de palavra-função.
// Rodar: node scripts/test-legenda-negacao-0911.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { semLegendaNegacao0911 } from './test-support/desfaz-legenda-negacao-0911.mjs'

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const nativeRequire = createRequire(import.meta.url)
const proibido = () => { throw Error('rede, banco e fornecedor são proibidos neste guardião') }
const r3 = (v) => Math.round(v * 1000) / 1000
const ARQ_COMPOSE = path.resolve(RAIZ, 'lib/compose.ts')
const ARQ_NEGACAO = path.resolve(RAIZ, 'lib/legendaNegacao.ts')

// ── carregador: lib/compose.ts de verdade (e o que ele importa), transpilado e isolado. `compose`/`negacao` trocam só esses dois. ──
const dependencias = new Map()
function carregar({ compose, negacao } = {}) {
  const locais = new Map()
  const load = (file) => {
    const abs = path.resolve(file)
    const local = abs === ARQ_COMPOSE || abs === ARQ_NEGACAO
    const cache = local ? locais : dependencias
    if (cache.has(abs)) return cache.get(abs)
    const box = { exports: {} }; cache.set(abs, box.exports)
    const fonte = abs === ARQ_COMPOSE && compose != null ? compose : abs === ARQ_NEGACAO && negacao != null ? negacao : fs.readFileSync(abs, 'utf8')
    const code = ts.transpileModule(fonte, { compilerOptions: { module: 1, target: 9, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, {
      exports: box.exports, module: box, Buffer, URL, URLSearchParams, TextEncoder, Intl,
      process: { env: {} }, console: { log() {}, warn() {}, error() {} }, fetch: proibido, setTimeout: proibido, clearTimeout() {},
      require(id) {
        if (id === 'node:crypto' || id === 'crypto') return nativeRequire(id)
        if (id === 'openai') return { __esModule: true, default: class { constructor() { proibido() } }, toFile: proibido }
        if (id === '@supabase/supabase-js') return { createClient: proibido }
        if (id === 'server-only') return {}
        const base = id.startsWith('@/') ? path.join(RAIZ, id.slice(2)) : id.startsWith('.') ? path.join(path.dirname(abs), id) : null
        if (!base) throw Error('import inesperado ' + id)
        for (const ext of ['.ts', '.tsx']) if (fs.existsSync(base + ext)) return load(base + ext)
        throw Error('dependência ausente ' + base)
      },
    }, { timeout: 20000 })
    return box.exports
  }
  return { C: load(ARQ_COMPOSE), N: locais.get(ARQ_NEGACAO) ?? null }
}

const FONTE_HOJE = fs.readFileSync(ARQ_COMPOSE, 'utf8').replace(/\r\n/g, '\n')
const FONTE_BASE = semLegendaNegacao0911(FONTE_HOJE, 'lib/compose.ts').replace(/\r\n/g, '\n')
const FONTE_NEGACAO = fs.readFileSync(ARQ_NEGACAO, 'utf8').replace(/\r\n/g, '\n')
const TETO = 4 // CAPTION_WORDS_PER_CHUNK de lib/compose.ts (conferido em estática abaixo)

// ══ O CASO REAL (lido do Supabase em 09/11, só leitura) ══════════════════════════════════════════════════════════════
// narração assinada no compose_submission_claim (09/11 07:56:11 UTC, generationId 6248e015, language "en")
const NARRACAO = `Too Rich to Be Grateful? The Story of Qarun Imagine being so rich that even your treasure keys are too heavy for several strong men to carry! Sounds amazing, doesn't it? But this is the story of a man named Qarun. Qarun lived during the time of Prophet Musa (Alehis Salam). Allah had blessed him with enormous wealth, but instead of being thankful, he became proud and arrogant. His people reminded him: "Don't forget Allah! Be kind, help the poor and share what you have." But Qarun replied that all his wealth was because of his own knowledge and cleverness. He believed he needed no one! One day, Qarun proudly showed off his riches. Some people wished they could be as wealthy as him. But Allah's punishment came, and the earth swallowed Qarun and his treasures. His wealth could not save him! So, what can we learn from Qarun? Remember, children: Being rich doesn't make you better than others. Being clever doesn't mean you should forget Allah. And having more doesn't mean you should stop sharing! True success isn't about how much you own, but how thankful, kind and humble you are. Always be grateful to Allah, whether you have a little or a lot!`
const FALA_S = 79.104 // fim do último elemento de legenda no source enviado (78,64 + 0,464)
// as 178 legendas (trilha 5) do source que a PRODUÇÃO mandou ao Creatomate: início~duração~texto, a palavra pintada entre < >
const PRODUCAO = `0~0.32~<TOO> RICH TO BE ; 0.32~0.22~TOO <RICH> TO BE ; 0.54~0.22~TOO RICH <TO> BE ; 0.76~0.22~TOO RICH TO <BE> ; 1.13~1.24~GRATEFUL ; 2.37~0.33~<THE> STORY OF QARUN ; 2.7~0.38~THE STORY <OF> QARUN ; 3.08~1.43~THE STORY OF <QARUN> ; 4.51~0.13~<IMAGINE> BEING SO RICH ; 4.64~0.7~IMAGINE BEING <SO> RICH ; 5.34~0.15~IMAGINE BEING SO <RICH> ; 5.49~0.11~<THAT> EVEN YOUR TREASURE ; 5.6~0.22~THAT <EVEN> YOUR TREASURE ; 5.82~0.26~THAT EVEN <YOUR> TREASURE ; 6.08~0.41~THAT EVEN YOUR <TREASURE> ; 6.49~0.17~<KEYS> ARE TOO HEAVY ; 6.66~0.2~KEYS <ARE> TOO HEAVY ; 6.86~0.36~KEYS ARE <TOO> HEAVY ; 7.22~0.35~KEYS ARE TOO <HEAVY> ; 7.57~0.19~<FOR> SEVERAL STRONG MEN ; 7.76~0.26~FOR <SEVERAL> STRONG MEN ; 8.02~0.44~FOR SEVERAL <STRONG> MEN ; 8.46~0.27~FOR SEVERAL STRONG <MEN> ; 8.73~0.43~<TO> CARRY ; 9.16~0.89~TO <CARRY> ; 10.05~0.51~<SOUNDS> AMAZING DOESN'T IT ; 10.56~0.2~SOUNDS AMAZING <DOESN'T> IT ; 10.76~0.95~SOUNDS AMAZING DOESN'T <IT> ; 11.71~0.41~<BUT> THIS IS ; 12.12~0.22~BUT <THIS> IS ; 12.34~0.31~BUT THIS <IS> ; 12.65~0.09~<THE> STORY OF ; 12.74~0.24~THE <STORY> OF ; 12.98~0.35~THE STORY <OF> ; 13.33~0.05~<A> MAN NAMED QARUN ; 13.38~0.22~A <MAN> NAMED QARUN ; 13.6~0.28~A MAN <NAMED> QARUN ; 13.88~1.65~A MAN NAMED <QARUN> ; 15.53~0.23~<LIVED> DURING ; 15.76~0.43~LIVED <DURING> ; 16.19~0.23~<THE> TIME OF PROPHET ; 16.42~0.2~THE TIME <OF> PROPHET ; 16.62~0.45~THE TIME OF <PROPHET> ; 17.07~0.23~<MUSA> ALEHIS SALAM ; 17.3~0.56~MUSA <ALEHIS> SALAM ; 17.86~1.03~MUSA ALEHIS <SALAM> ; 18.89~0.49~<ALLAH> HAD BLESSED HIM ; 19.38~0.37~ALLAH HAD <BLESSED> HIM ; 19.75~0.19~<WITH> ENORMOUS WEALTH ; 19.94~0.46~WITH <ENORMOUS> WEALTH ; 20.4~0.79~WITH ENORMOUS <WEALTH> ; 21.19~0.23~<BUT> INSTEAD OF BEING ; 21.42~0.2~BUT <INSTEAD> OF BEING ; 21.62~0.26~BUT INSTEAD <OF> BEING ; 21.88~0.41~BUT INSTEAD OF <BEING> ; 22.29~0.41~<THANKFUL> HE BECAME PROUD ; 22.7~0.14~THANKFUL <HE> BECAME PROUD ; 22.84~0.32~THANKFUL HE <BECAME> PROUD ; 23.16~0.59~THANKFUL HE BECAME <PROUD> ; 23.75~0.65~<AND> ARROGANT ; 24.4~0.57~AND <ARROGANT> ; 24.97~0.31~<HIS> PEOPLE REMINDED HIM ; 25.28~0.42~HIS PEOPLE <REMINDED> HIM ; 25.7~1.19~HIS PEOPLE REMINDED <HIM> ; 26.89~0.27~<DON'T> FORGET ALLAH BE ; 27.16~0.4~DON'T FORGET <ALLAH> BE ; 27.56~0.77~DON'T FORGET ALLAH <BE> ; 28.33~1.08~KIND ; 29.41~0.43~<HELP> THE POOR ; 29.84~0.49~HELP THE <POOR> ; 30.33~0.21~<AND> SHARE WHAT YOU ; 30.54~0.24~AND <SHARE> WHAT YOU ; 30.78~0.31~AND SHARE WHAT <YOU> ; 31.09~1.64~HAVE ; 32.73~0.19~<BUT> QARUN REPLIED ; 32.92~0.75~BUT <QARUN> REPLIED ; 33.67~0.07~<THAT> ALL HIS WEALTH ; 33.74~0.28~THAT <ALL> HIS WEALTH ; 34.02~0.3~THAT ALL <HIS> WEALTH ; 34.32~0.33~THAT ALL HIS <WEALTH> ; 34.65~0.13~<WAS> BECAUSE OF ; 34.78~0.36~WAS <BECAUSE> OF ; 35.14~0.31~WAS BECAUSE <OF> ; 35.45~0.39~<HIS> OWN KNOWLEDGE ; 35.84~0.53~HIS OWN <KNOWLEDGE> ; 36.37~0.15~<AND> CLEVERNESS ; 36.52~1.79~AND <CLEVERNESS> ; 38.31~0.33~<HE> BELIEVED HE NEEDED ; 38.64~0.32~HE BELIEVED <HE> NEEDED ; 38.96~0.33~HE BELIEVED HE <NEEDED> ; 39.29~0.19~<NO> ONE ; 39.48~1.47~NO <ONE> ; 40.95~0.45~<DAY> QARUN PROUDLY ; 41.4~0.2~DAY <QARUN> PROUDLY ; 41.6~0.73~DAY QARUN <PROUDLY> ; 42.33~0.19~<SHOWED> OFF HIS RICHES ; 42.52~0.2~SHOWED <OFF> HIS RICHES ; 42.72~0.66~SHOWED OFF <HIS> RICHES ; 43.38~1.15~SHOWED OFF HIS <RICHES> ; 44.53~0.39~<SOME> PEOPLE WISHED THEY ; 44.92~0.22~SOME PEOPLE <WISHED> THEY ; 45.14~0.43~SOME PEOPLE WISHED <THEY> ; 45.57~0.19~<COULD> BE AS WEALTHY ; 45.76~0.52~COULD BE <AS> WEALTHY ; 46.28~0.15~COULD BE AS <WEALTHY> ; 46.43~0.17~<AS> HIM ; 46.6~0.85~AS <HIM> ; 47.45~0.47~<BUT> ALLAH'S PUNISHMENT CAME ; 47.92~0.4~BUT ALLAH'S <PUNISHMENT> CAME ; 48.32~0.63~BUT ALLAH'S PUNISHMENT <CAME> ; 48.95~0.13~<AND> THE EARTH SWALLOWED ; 49.08~0.5~AND <THE> EARTH SWALLOWED ; 49.58~0.67~AND THE <EARTH> SWALLOWED ; 50.25~0.37~<QARUN> AND HIS TREASURES ; 50.62~0.34~QARUN <AND> HIS TREASURES ; 50.96~0.42~QARUN AND <HIS> TREASURES ; 51.38~1.01~QARUN AND HIS <TREASURES> ; 52.39~0.09~<HIS> WEALTH COULD NOT ; 52.48~0.28~HIS <WEALTH> COULD NOT ; 52.76~0.28~HIS WEALTH <COULD> NOT ; 53.04~0.53~HIS WEALTH COULD <NOT> ; 53.57~0.09~<SAVE> HIM ; 53.66~1.05~SAVE <HIM> ; 54.71~0.55~<SO> WHAT CAN WE ; 55.26~0.24~SO <WHAT> CAN WE ; 55.5~0.12~SO WHAT <CAN> WE ; 55.62~0.45~SO WHAT CAN <WE> ; 56.07~0.21~<LEARN> FROM QARUN ; 56.28~1.21~LEARN FROM <QARUN> ; 57.49~0.74~REMEMBER ; 58.23~0.78~CHILDREN ; 59.01~0.19~<BEING> RICH DOESN'T MAKE ; 59.2~0.3~BEING <RICH> DOESN'T MAKE ; 59.5~0.32~BEING RICH <DOESN'T> MAKE ; 59.82~0.41~BEING RICH DOESN'T <MAKE> ; 60.23~0.05~<YOU> BETTER THAN OTHERS ; 60.28~0.2~YOU <BETTER> THAN OTHERS ; 60.48~0.28~YOU BETTER <THAN> OTHERS ; 60.76~1.23~YOU BETTER THAN <OTHERS> ; 61.99~0.29~<BEING> CLEVER DOESN'T MEAN ; 62.28~0.4~BEING CLEVER <DOESN'T> MEAN ; 62.68~0.43~BEING CLEVER DOESN'T <MEAN> ; 63.11~0.27~<YOU> SHOULD FORGET ALLAH ; 63.38~0.44~YOU SHOULD <FORGET> ALLAH ; 63.82~1.47~YOU SHOULD FORGET <ALLAH> ; 65.29~0.29~<AND> HAVING MORE DOESN'T ; 65.58~0.46~AND HAVING <MORE> DOESN'T ; 66.04~0.53~AND HAVING MORE <DOESN'T> ; 66.57~0.11~<MEAN> YOU SHOULD STOP ; 66.68~0.2~MEAN <YOU> SHOULD STOP ; 66.88~0.24~MEAN YOU <SHOULD> STOP ; 67.12~0.47~MEAN YOU SHOULD <STOP> ; 67.59~1.26~SHARING ; 68.85~0.57~<TRUE> SUCCESS ISN'T ; 69.42~0.53~TRUE SUCCESS <ISN'T> ; 69.95~0.17~<ABOUT> HOW MUCH YOU ; 70.12~0.3~ABOUT <HOW> MUCH YOU ; 70.42~0.18~ABOUT HOW <MUCH> YOU ; 70.6~0.55~ABOUT HOW MUCH <YOU> ; 71.15~0.33~<OWN> BUT HOW THANKFUL ; 71.48~0.22~OWN <BUT> HOW THANKFUL ; 71.7~0.28~OWN BUT <HOW> THANKFUL ; 71.98~1.15~OWN BUT HOW <THANKFUL> ; 73.13~0.33~<KIND> AND HUMBLE YOU ; 73.46~0.45~KIND AND <HUMBLE> YOU ; 73.91~0.84~ARE ; 74.75~0.09~<ALWAYS> BE GRATEFUL ; 74.84~0.28~ALWAYS <BE> GRATEFUL ; 75.12~0.41~ALWAYS BE <GRATEFUL> ; 75.53~0.27~<TO> ALLAH ; 75.8~0.95~TO <ALLAH> ; 76.75~0.15~<WHETHER> YOU HAVE ; 76.9~0.29~WHETHER YOU <HAVE> ; 77.19~0.17~<A> LITTLE OR ; 77.36~0.12~A <LITTLE> OR ; 77.48~0.91~A LITTLE <OR> ; 78.39~0.25~<A> LOT ; 78.64~0.464~A <LOT>`

// os pedaços da produção: texto, início e o início de cada palavra pintada
const elementosDaProducao = PRODUCAO.split(' ; ').map((s) => { const [t, d, ...x] = s.split('~'); return { t: +t, d: +d, cru: x.join('~') } })
const PEDACOS_PRODUCAO = []
for (const e of elementosDaProducao) {
  const texto = e.cru.replace(/[<>]/g, '')
  const j = e.cru.split(' ').findIndex((w) => w.startsWith('<'))
  const ult = PEDACOS_PRODUCAO[PEDACOS_PRODUCAO.length - 1]
  if (!ult || ult.texto !== texto || (j >= 0 && j <= ult.ultimaPintada)) PEDACOS_PRODUCAO.push({ texto, t: e.t, fim: r3(e.t + e.d), pintadas: new Map(), ultimaPintada: -1 })
  const b = PEDACOS_PRODUCAO[PEDACOS_PRODUCAO.length - 1]
  b.fim = r3(e.t + e.d)
  if (j >= 0) { b.pintadas.set(j, e.t); b.ultimaPintada = j }
}
// a linha de palavras do Whisper daquele render, reconstruída: o texto é o do roteiro como o Whisper o devolve (sem pontuação na
// palavra); o início de cada palavra é o da produção (1ª palavra do pedaço = início do pedaço − 0,15 s, o CAPTION_SYNC_OFFSET; as
// outras = o instante em que foram pintadas; palavra que não chegou a ser pintada, 20 ms depois da anterior). A produção perdeu
// duas palavras pelo anti-gagueira ("…named Qarun. | Qarun lived" e "…no one! | One day") — elas voltam à linha, e a base as perde
// de novo, igual. Fecho natural (ponto do roteiro ou pausa) só onde o pedaço da produção fechou e o roteiro tem pontuação.
const roteiro = NARRACAO.split(/\s+/).map((tok) => ({ word: tok.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '').replace(/^'+|'+$/g, ''), ponto: /[.!?]["')]*$/.test(tok), virgula: /[,:;]["')]*$/.test(tok) }))
const LINHA_REAL = (() => {
  let k = 0
  const ws = []
  PEDACOS_PRODUCAO.forEach((b, bi) => {
    const palavras = b.texto.split(' ')
    const t0 = bi === 0 ? b.t : r3(b.t - 0.15)
    let perdida = false
    if (roteiro[k].word.toUpperCase() !== palavras[0]) { ws.push({ ...roteiro[k], start: t0 }); k++; perdida = true }
    palavras.forEach((w, j) => {
      const r = roteiro[k++]
      if (!r || r.word.toUpperCase() !== w) throw Error(`roteiro × produção desalinhou em "${w}" (pedaço ${bi})`)
      const start = j === 0 ? (perdida ? r3(b.t + 0.02) : t0) : b.pintadas.has(j) ? b.pintadas.get(j) : r3(ws[ws.length - 1].start + 0.02)
      ws.push({ ...r, start, fimDePedaco: j === palavras.length - 1 })
    })
  })
  if (k !== roteiro.length) throw Error('sobrou roteiro')
  return ws.map((w, i) => {
    const prox = ws[i + 1]
    const natural = w.fimDePedaco && (w.ponto || w.virgula)
    const end = prox ? (natural && !w.ponto ? r3(prox.start - 0.3) : prox.start) : FALA_S
    return { word: w.word, start: w.start, end: Math.max(end, w.start), ...(natural && w.ponto ? { sentenceEnd: true } : {}) }
  })
})()
const clone = (x) => JSON.parse(JSON.stringify(x))

// ── linhas sintéticas a partir de um texto ──
const semBorda = (tok) => tok.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '').replace(/^'+|'+$/g, '')
/** modo 'whisper' = palavra sem pontuação, fim de frase carimbado, sem pausa · 'pausas' = idem + pausa no ponto (0,4 s) e na vírgula (0,3 s) · 'grafia' = a pontuação vem colada na palavra */
function linhaDoTexto(texto, modo = 'whisper', passo = 0.3) {
  let t = 0
  return texto.trim().split(/\s+/).map((tok) => {
    const ponto = /[.!?…]["'”’)]*$/.test(tok), virgula = /[,;:]["'”’)]*$/.test(tok)
    const w = { word: modo === 'grafia' ? tok.replace(/^["'“(]+|["'”)]+$/g, '') : semBorda(tok), start: r3(t), end: r3(t + passo * 0.9) }
    if (ponto) w.sentenceEnd = true
    t += passo * 0.9 + (modo === 'pausas' ? (ponto ? 0.4 : virgula ? 0.3 : 0) : 0) + passo * 0.1
    if (modo !== 'pausas') w.end = r3(t)
    return w
  })
}
// uma frase sem negação que ocupa mais de 6 s: o que vem depois dela sai na fonte normal da legenda (19 letras por linha), fora do gancho
const ANTES_6S = 'The old king of Rome walked slowly over the hill at night and looked at the great city for a very long time.'
const corpo = (texto, modo = 'whisper') => linhaDoTexto(ANTES_6S + ' ' + texto, modo)
const legendas = (mod, linha, teto = TETO) => mod.C.buildCaptionsFromWhisperWords(clone(linha), r3(linha[linha.length - 1].end + 0.2), 0, teto)
const textos = (caps) => caps.map((c) => c.text)
const chave = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, '').replace(/\s+/g, ' ').trim()
const temPedaco = (caps, alvo) => caps.some((c) => chave(c.text) === chave(alvo))
/** o pedaço que mostra `negacao` também mostra `ultima` (a última palavra da oração negada)? */
const negacaoComONegado = (caps, negacao, ultima) => caps.some((c) => { const ws = chave(c.text).split(' '); const i = ws.indexOf(chave(negacao)); return i >= 0 && ws.indexOf(chave(ultima), i) > i })
const todasAsPalavras = (caps) => JSON.stringify(caps.flatMap((c) => c.words))
const igualTexto = (a, b) => JSON.stringify(a.map(chave)) === JSON.stringify(b.map(chave))
const fatias = (texto) => dependencias.get(path.resolve(RAIZ, 'lib/openai.ts')).buildCaptionSegments(texto, TETO) // o corte proporcional de antes (lib/openai, intocado)
// ── a conta da pílula, refeita aqui (independente do lib): 9:16 = 1080 px, caixa de 78% com 8% de respiro, 0,72 em por letra;
// legenda 54 px → 19 letras por linha; gancho 64 px (a 1ª frase, até 6 s) → 16. A quebra é só entre palavras.
const ASPECTO = fs.readFileSync(path.join(RAIZ, 'lib/aspect.ts'), 'utf8')
const LETRAS_CORPO = Math.floor((1080 * 0.78 * 0.92) / (54 * 0.72)), LETRAS_GANCHO = Math.floor((1080 * 0.78 * 0.92) / (64 * 0.72))
const linhasDe = (palavras, porLinha) => { let linhas = 0, usado = 0; for (const p of palavras) { const n = Array.from(String(p).trim()).length; if (!n) continue; if (!linhas || usado + 1 + n > porLinha) { linhas++; usado = n } else usado += 1 + n } return linhas }
const linhasDoPedaco = (c) => linhasDe(c.words.map((w) => w.word), c.words[0].start < 6 ? LETRAS_GANCHO : LETRAS_CORPO)
const NEGACAO_EN = (p) => /^(?:not|never|no|cannot|nor|neither|nobody|nothing|none|nowhere)$|n't(?:'ve)?$/.test(chave(p))
/**
 * A REGRA GERAL, conferida no resultado: todo pedaço que mostra uma negação e NÃO fecha a oração (o pedaço seguinte continua a
 * mesma oração) está no limite da pílula (mais uma palavra passaria de 3 linhas ou de 10 palavras) ou para antes de uma
 * palavra-função (o que desce abre com artigo, preposição ou conjunção). Devolve os pedaços que quebram a regra.
 */
function negacaoSemONegado(caps, linha, mod, ehNegacao = NEGACAO_EN) {
  const natural = new Set()
  linha.forEach((w, i) => { const prox = linha[i + 1]; if (w.sentenceEnd === true || !prox || prox.start - w.end >= 0.28 || /[,;:]$/.test(String(w.word).trim())) natural.add(r3(w.start)) })
  const ruins = []
  const indice = new Map(linha.map((w, i) => [r3(w.start), i]))
  let depoisDoAnterior = 0 // o pedaço CORTADO vai da palavra seguinte ao pedaço anterior até a última mostrada (o anti-gagueira pode ter tirado a 1ª da tela)
  caps.forEach((c, k) => {
    const ultimo = indice.get(c.words[c.words.length - 1].start)
    const grupo = linha.slice(depoisDoAnterior, ultimo + 1)
    depoisDoAnterior = ultimo + 1
    const seguinte = linha[ultimo + 1]
    if (!seguinte || !caps[k + 1] || !grupo.some((w) => ehNegacao(w.word))) return
    if (natural.has(r3(grupo[grupo.length - 1].start))) return // fechou a oração
    const mais = [...grupo, seguinte]
    const cheio = mais.length > 10 || linhasDe(mais.map((w) => w.word), grupo[0].start < 6 ? LETRAS_GANCHO : LETRAS_CORPO) > 3
    if (!cheio && !mod.C.terminaEmPalavraFuncao(seguinte.word)) ruins.push(c.text + ' | ' + caps[k + 1].text)
  })
  return ruins
}

// ══ a bateria: devolve os nomes das checagens que falharam para um par (base, candidato) ═════════════════════════════
let verificacoes = 0 // quantas checagens a última bateria rodou
function bateria(BASE, HOJE) {
  const falhas = []
  verificacoes = 0
  const check = (nome, ok) => { verificacoes++; if (!ok) falhas.push(nome) }
  const idioma = (codigo) => { BASE.C.setActiveCaptionFont(codigo); HOJE.C.setActiveCaptionFont(codigo) }
  idioma('en')

  // (1) caso real
  {
    const base = legendas(BASE, LINHA_REAL), hoje = legendas(HOJE, LINHA_REAL)
    const capsBase = BASE.C.buildCaptionsFromWhisperWords(clone(LINHA_REAL), FALA_S, 0, TETO), capsHoje = HOJE.C.buildCaptionsFromWhisperWords(clone(LINHA_REAL), FALA_S, 0, TETO)
    check('R1 a base reproduz os 64 pedaços da produção, texto a texto', capsBase.length === 64 && capsBase.every((c, i) => c.text.toUpperCase() === PEDACOS_PRODUCAO[i].texto))
    check('R2 a base reproduz o início de cada pedaço da produção (±0,01 s) e o fim do último', capsBase.every((c, i) => Math.abs(c.time - PEDACOS_PRODUCAO[i].t) <= 0.0101) && Math.abs(capsBase[63].time + capsBase[63].duration - FALA_S) <= 0.0101)
    check('R3 a base mostra o defeito: "YOU SHOULD FORGET ALLAH" sozinho por mais de 2 s', capsBase.some((c) => chave(c.text) === 'you should forget allah' && c.duration > 2))
    check('R4 hoje: nenhum pedaço "YOU SHOULD FORGET ALLAH" nem "FORGET ALLAH" sozinho', !temPedaco(capsHoje, 'you should forget allah') && !temPedaco(capsHoje, 'forget allah') && !temPedaco(capsHoje, 'should forget allah'))
    check('R5 hoje: "BEING CLEVER" | "DOESN\'T MEAN YOU SHOULD FORGET ALLAH"', temPedaco(capsHoje, 'being clever') && temPedaco(capsHoje, "doesn't mean you should forget allah"))
    check('R6 hoje: "BEING RICH" | "DOESN\'T MAKE YOU BETTER THAN OTHERS" (some "YOU BETTER THAN OTHERS" sozinho)', temPedaco(capsHoje, 'being rich') && temPedaco(capsHoje, "doesn't make you better than others") && !temPedaco(capsHoje, 'you better than others'))
    check('R7 hoje: "HIS WEALTH COULD" | "NOT SAVE HIM" (some "SAVE HIM" sozinho)', temPedaco(capsHoje, 'his wealth could') && temPedaco(capsHoje, 'not save him') && !temPedaco(capsHoje, 'save him'))
    check('R8 hoje: "AND HAVING MORE" | "DOESN\'T MEAN YOU SHOULD STOP SHARING" (somem "MEAN YOU SHOULD STOP" e "SHARING" sozinhos)', temPedaco(capsHoje, 'and having more') && temPedaco(capsHoje, "doesn't mean you should stop sharing") && !temPedaco(capsHoje, 'mean you should stop') && !temPedaco(capsHoje, 'sharing'))
    check('R9 hoje: "HE BELIEVED HE NEEDED" | "NO ONE" e "SOUNDS AMAZING DOESN\'T IT" ficam como eram', temPedaco(capsHoje, 'he believed he needed') && temPedaco(capsHoje, 'no one') && temPedaco(capsHoje, "sounds amazing doesn't it"))
    check('R10 nenhuma palavra se perde, troca de lugar ou muda de tempo (o karaokê palavra a palavra é o mesmo)', todasAsPalavras(capsBase) === todasAsPalavras(capsHoje))
    const jsonBase = new Set(capsBase.map((c) => JSON.stringify(c))), jsonHoje = new Set(capsHoje.map((c) => JSON.stringify(c)))
    const soHoje = capsHoje.filter((c) => !jsonBase.has(JSON.stringify(c))), soBase = capsBase.filter((c) => !jsonHoje.has(JSON.stringify(c)))
    check('R8b hoje: "TRUE SUCCESS" | "ISN\'T ABOUT HOW MUCH YOU OWN BUT HOW THANKFUL" (somem "ABOUT HOW MUCH YOU" e "OWN BUT HOW THANKFUL" sozinhos)', temPedaco(capsHoje, 'true success') && temPedaco(capsHoje, "isn't about how much you own but how thankful") && !temPedaco(capsHoje, 'about how much you') && !temPedaco(capsHoje, 'own but how thankful'))
    check('R11 o resto do filme sai byte a byte: só 14 pedaços da base mudam e viram 11', soBase.length === 14 && soHoje.length === 11 && capsHoje.length === 61)
    check('R12 só o pedaço da negação passa de 4 palavras, e fica em até 10 palavras e 3 linhas de pílula', capsHoje.every((c) => c.words.length <= 4 || (c.words.length <= 10 && linhasDoPedaco(c) <= 3 && c.words.some((w) => NEGACAO_EN(w.word)))) && Math.max(...capsHoje.map((c) => c.words.length)) === 9)
    check('R12b a regra geral vale no filme inteiro: nenhum pedaço com negação larga o que ela nega', negacaoSemONegado(capsHoje, LINHA_REAL, HOJE).length === 0 && negacaoSemONegado(capsBase, LINHA_REAL, HOJE).length >= 4)
    check('R13 os pedaços continuam emendados no tempo (cada um acaba onde o seguinte começa, o último no fim da fala)', capsHoje.every((c, i) => i === capsHoje.length - 1 ? Math.abs(c.time + c.duration - FALA_S) <= 0.011 : i === 0 ? c.time + c.duration <= capsHoje[1].time : Math.abs(c.time + c.duration - capsHoje[i + 1].time) <= 0.011)) // o 1º pedaço não leva o atraso de 0,15 s
    // o source inteiro (o que vai para o Creatomate), base × hoje
    const montar = (mod) => mod.C.buildCreatomateSource({ clipUrls: Array.from({ length: 8 }, (_, i) => `https://fixture.invalid/clipe-${i + 1}.mp4`), voiceoverUrl: 'https://fixture.invalid/voz.mp3', voiceoverScript: NARRACAO, sceneCaptions: [], duration: 60, quality: 'cinematic_ai', realAudioDuration: FALA_S, whisperWords: clone(LINHA_REAL), musicUrl: null, aspect: '9:16' })
    const sb = montar(BASE), sh = montar(HOJE)
    const leg = (s) => s.elements.filter((e) => e.type === 'text' && e.track === 5)
    const limpo = (e) => String(e.text).replace(/\[color [^\]]+\]|\[\/color\]/g, '')
    const prodEl = elementosDaProducao.map((e) => `${e.t}~${e.d}~${e.cru}`)
    const baseEl = leg(sb).map((e) => `${e.time}~${e.duration}~${String(e.text).replace(/\[color [^\]]+\]/g, '<').replace(/\[\/color\]/g, '>')}`)
    check('R14 o source da base tem as 178 legendas da produção, uma a uma (início, duração, palavra pintada)', baseEl.length === 178 && baseEl.every((x, i) => x === prodEl[i]))
    check('R15 source de hoje: fora da trilha de legenda, tudo igual', JSON.stringify(sb.elements.filter((e) => !(e.type === 'text' && e.track === 5))) === JSON.stringify(sh.elements.filter((e) => !(e.type === 'text' && e.track === 5))) && JSON.stringify({ ...sb, elements: 0 }) === JSON.stringify({ ...sh, elements: 0 }))
    check('R16 source de hoje: nenhuma legenda na tela diz "YOU SHOULD FORGET ALLAH", "YOU BETTER THAN OTHERS" ou "SAVE HIM" sozinha', !leg(sh).some((e) => ['YOU SHOULD FORGET ALLAH', 'FORGET ALLAH', 'YOU BETTER THAN OTHERS', 'SAVE HIM'].includes(limpo(e))))
    const esticado = leg(sh).filter((e) => limpo(e) === "DOESN'T MEAN YOU SHOULD FORGET ALLAH")
    check('R17 source de hoje: o pedaço esticado tem o karaokê palavra a palavra, a mesma fonte, a mesma caixa e nenhuma propriedade nova', esticado.length >= 4 && esticado.every((e) => /\[color /.test(e.text)) && new Set(esticado.map((e) => e.font_size)).size === 1 && esticado[0].font_size === leg(sb).find((e) => limpo(e) === 'YOU SHOULD FORGET ALLAH').font_size && JSON.stringify(Object.keys(esticado[0]).sort()) === JSON.stringify(Object.keys(leg(sb).find((e) => limpo(e) === 'YOU SHOULD FORGET ALLAH')).sort()) && esticado[0].width === '78%' && esticado[0].y === '78%')
    check('R18 source de hoje: as legendas não se sobrepõem', leg(sh).every((e, i, a) => i === 0 || a[i - 1].time + a[i - 1].duration <= e.time + 0.0011))
    void base; void hoje
  }

  // (2) as frases reais, com tempos sintéticos
  const FRASES = {
    clever: "Being clever doesn't mean you should forget Allah.",
    rich: "Being rich doesn't make you better than others.",
    dont: "Don't forget Allah! Be kind, help the poor and share what you have.",
    noOne: 'He believed he needed no one!',
    wealth: 'His wealth could not save him!',
    imagine: 'Imagine being so rich that even your treasure keys are too heavy for several strong men to carry!',
    sounds: "Sounds amazing, doesn't it?",
    more: "And having more doesn't mean you should stop sharing!",
  }
  for (const modo of ['whisper', 'pausas', 'grafia']) {
    const L = (f) => linhaDoTexto('Remember this, children. ' + f + ' The end is near.', modo)
    const b = Object.fromEntries(Object.entries(FRASES).map(([k, f]) => [k, legendas(BASE, L(f))]))
    const h = Object.fromEntries(Object.entries(FRASES).map(([k, f]) => [k, legendas(HOJE, L(f))]))
    check(`F1[${modo}] base parte a negação: "you should forget Allah" sozinho`, temPedaco(b.clever, 'you should forget allah'))
    check(`F2[${modo}] hoje: sem "you should forget Allah" nem "forget Allah" sozinho; a negação fica com o que nega`, !temPedaco(h.clever, 'you should forget allah') && !temPedaco(h.clever, 'forget allah') && negacaoComONegado(h.clever, "doesn't", 'allah') && temPedaco(h.clever, 'being clever'))
    check(`F3[${modo}] "doesn't make you better than others" num pedaço só`, temPedaco(b.rich, 'you better than others') && !temPedaco(h.rich, 'you better than others') && temPedaco(h.rich, "doesn't make you better than others"))
    check(`F4[${modo}] "could not save him": some "save him" sozinho`, temPedaco(b.wealth, 'save him') && !temPedaco(h.wealth, 'save him') && temPedaco(h.wealth, 'not save him'))
    check(`F5[${modo}] "doesn't mean you should stop sharing" num pedaço só`, !temPedaco(h.more, 'sharing') && temPedaco(h.more, "doesn't mean you should stop sharing"))
    check(`F6[${modo}] "Don't forget Allah!" já fechava no ponto: igual à base`, JSON.stringify(b.dont) === JSON.stringify(h.dont) && temPedaco(h.dont, "don't forget allah"))
    check(`F7[${modo}] "He believed he needed | no one" igual à base ("no one" já anda junto)`, JSON.stringify(b.noOne) === JSON.stringify(h.noOne) && temPedaco(h.noOne, 'no one'))
    check(`F8[${modo}] frase sem negação ("Imagine being so rich…") igual à base`, JSON.stringify(b.imagine) === JSON.stringify(h.imagine))
    check(`F9[${modo}] "Sounds amazing, doesn't it?" igual à base`, JSON.stringify(b.sounds) === JSON.stringify(h.sounds) && negacaoComONegado(h.sounds, "doesn't", 'it'))
    for (const k of Object.keys(FRASES)) check(`F10[${modo}/${k}] nenhuma palavra perdida ou fora de ordem`, todasAsPalavras(b[k]) === todasAsPalavras(h[k]))
  }
  // a negação em qualquer posição do pedaço que fechou pelo teto, e a palavra que sobraria sozinha desce junto
  {
    const h1 = textos(legendas(HOJE, linhaDoTexto("It doesn't mean you should forget Allah.")))
    check('F11 "It doesn\'t mean you | should forget Allah": a negação no 2º lugar do pedaço — a palavra de antes fica com ela (nunca um pedaço de 1 palavra)', JSON.stringify(h1) === JSON.stringify(["It doesn't mean you should forget Allah"]))
    const h2 = textos(legendas(HOJE, linhaDoTexto('He never saw the car.')))
    check('F12 "He never saw | the car": a palavra que sobraria sozinha desce junto → um pedaço só', JSON.stringify(h2) === JSON.stringify(['He never saw the car']))
    const h2b = textos(legendas(HOJE, linhaDoTexto('He did not see the car.')))
    check('F12b "He did not see | the car" → "He did" | "not see the car"', JSON.stringify(h2b) === JSON.stringify(['He did', 'not see the car']))
    const h3 = textos(legendas(HOJE, linhaDoTexto('He went to the store and never came back home.')))
    check('F13 a palavra-função antes da negação desce junto ("and never came back home")', JSON.stringify(h3) === JSON.stringify(['He went to', 'the store', 'and never came back home']))
  }

  // (3) controles byte a byte
  {
    const SEM_NEGACAO = {
      en: 'The old man walked into the room and looked at the map on the wall. Then he smiled, picked up his hat and left the house before the sun came up over the hills.',
      pt: 'O velho entrou no quarto e olhou o mapa na parede. Depois ele sorriu, pegou o chapéu no armário e saiu da casa antes de o sol nascer no alto dos morros.',
      es: 'El viejo entró en la sala y miró el mapa en la pared. Luego sonrió, tomó su sombrero y salió de la casa antes de que el sol saliera sobre las colinas.',
      fr: 'Le vieil homme entra dans la salle et regarda la carte sur le mur. Puis il sourit, prit son chapeau et quitta la maison avant le lever du soleil sur les collines.',
      de: 'Der alte Mann ging in den Raum und sah die Karte an der Wand. Dann lachte er, nahm seinen Hut und verließ das Haus vor dem Aufgang der Sonne über den Bergen.',
      it: 'Il vecchio entrò nella stanza e guardò la mappa sul muro. Poi sorrise, prese il suo cappello e lasciò la casa prima che il sole sorgesse sopra le colline.',
    }
    for (const [lang, texto] of Object.entries(SEM_NEGACAO)) {
      idioma(lang)
      for (const modo of ['whisper', 'pausas', 'grafia']) for (const teto of [4, 5, 7]) {
        const L = linhaDoTexto(texto, modo)
        check(`C1[${lang}/${modo}/${teto}] frase sem negação: igual à base`, JSON.stringify(legendas(BASE, L, teto)) === JSON.stringify(legendas(HOJE, L, teto)))
      }
    }
    idioma('en')
    const IRMAS = [
      ['FRASE-3010', 'The man walked into the room'],
      ['PREPOSICAO-0311', 'In 1908 the sun exploded over Siberia and the forest fell flat'],
      ['NOME-NUMERO-0311', 'One man stopped World War 3 by doing nothing'],
      ['NOME-NUMERO-0311 b', 'It was a possible World War 3 yet he waited'],
      ['NUMERO-CARREGA-0311', 'La guerra terminó en 1945 pero un soldado siguió luchando'],
      ['NUMERO-RTL-0111', 'جريمة هزت ألمانيا عام ١٩٢٢ وما زالت لغزا'],
      ['AM-0916', 'He wakes at 5 A M daily'],
    ]
    for (const [nome, texto] of IRMAS) for (const modo of ['whisper', 'pausas']) {
      const L = linhaDoTexto(texto, modo)
      check(`C2[${nome}/${modo}] regra irmã: igual à base`, JSON.stringify(legendas(BASE, L)) === JSON.stringify(legendas(HOJE, L)))
    }
    // o "no" do português é "em + o": com o filme em português, nada muda
    idioma('pt')
    for (const texto of ['Ele caiu no chão da cozinha e ficou parado ali.', 'O gato pulou no muro alto e fugiu rápido.', 'Ela entrou no carro e foi embora cedo.']) for (const modo of ['whisper', 'pausas', 'grafia']) {
      const L = linhaDoTexto(texto, modo)
      check(`C3[${modo}] "no" do português (em + o) com o filme em português: igual à base — ${texto}`, JSON.stringify(legendas(BASE, L)) === JSON.stringify(legendas(HOJE, L)))
    }
    // língua fora da lista: regra desligada, mesmo com palavra que em outra língua seria negação
    for (const [lang, texto] of [['tr', 'Bu ne güzel bir gün ve biz no yolda kaldık bugün.'], ['ro', 'El nu mai vine acasă no astăzi după muncă.'], ['ar', 'لا تنس الله أبدا وكن لطيفا مع الناس دائما'], ['ur', 'اللہ کو مت بھولو اور سب کے ساتھ مہربان رہو'], ['ru', 'Он не забыл своего старого друга из школы.'], ['nl', "He doesn't mean you should forget him."], ['ja', "He doesn't mean you should forget him."]]) {
      idioma(lang)
      const L = linhaDoTexto(texto)
      check(`C4[${lang}] língua fora da lista: igual à base`, JSON.stringify(legendas(BASE, L)) === JSON.stringify(legendas(HOJE, L)))
    }
    idioma('en')
    // grade: linhas sem negação, tetos 4/5/7, com e sem pausas, com vírgulas e números
    const BANCO = 'the a of to in on at for with and but from by his her their over under after before about that as man woman king queen gold river city Rome Qarun Allah 1945 3 World War sun moon walked looked gave took built lost found great small old young quickly slowly yesterday today treasure heavy strong several keys people wealth proud kind humble share poor help story time prophet'.split(' ')
    let seed = 20261109
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    let grade = 0, iguais = 0
    for (let caso = 0; caso < 1100; caso++) {
      const n = 3 + Math.floor(rnd() * 26)
      const toks = Array.from({ length: n }, () => BANCO[Math.floor(rnd() * BANCO.length)]).map((w, i, a) => (i === a.length - 1 ? w + '.' : rnd() < 0.08 ? w + ',' : rnd() < 0.07 ? w + '.' : w))
      for (const modo of ['whisper', 'pausas', 'grafia']) {
        const L = linhaDoTexto(toks.join(' '), modo, 0.2 + rnd() * 0.3)
        const teto = [4, 4, 5, 7][caso % 4]
        grade++
        if (JSON.stringify(legendas(BASE, L, teto)) === JSON.stringify(legendas(HOJE, L, teto))) iguais++
      }
    }
    check(`C5 grade de ${grade} linhas sem negação: todas iguais à base (${iguais})`, grade === 3300 && iguais === grade)
    // grade COM negação: nunca perde palavra; a regra geral vale em todas; e a negação anda com o fim da oração sempre que ela cabe em 3 linhas
    const NEGS = ["doesn't", "don't", 'not', 'never', 'no', 'cannot', "can't", "isn't", "won't"]
    const SUJ = ['He', 'The old king', 'Being clever', 'His great wealth', 'All the gold in Rome', 'And they', 'But the proud man']
    const VERBOS = ['mean', 'make', 'save', 'help', 'forget', 'share', 'build']
    const RESTOS = ['him', 'you better', 'the poor people', 'you should stop', 'you should forget Allah', 'them in time', 'you better than others', 'that you should ever forget about Allah', 'you can stop paying all your taxes today']
    let comNeg = 0, juntas = 0, intactas = 0, regra = 0, pilula = 0, antes = 0
    for (const s of SUJ) for (const ng of NEGS) for (const v of VERBOS) for (const r of RESTOS) for (const modo of ['whisper', 'grafia']) for (const inicio of ['Listen now.', 'Listen now. The old king of Rome walked slowly over the hill at night.']) {
      const oracao = `${ng} ${v} ${r}`
      const L = linhaDoTexto(`${inicio} ${s} ${oracao}. The end came.`, modo)
      const b = legendas(BASE, L), h = legendas(HOJE, L)
      comNeg++
      if (todasAsPalavras(b) === todasAsPalavras(h)) intactas++
      if (negacaoSemONegado(h, L, HOJE).length === 0) regra++
      if (h.every((c) => c.words.length <= 4 || (c.words.length <= 10 && linhasDoPedaco(c) <= 3))) pilula++
      // nenhum pedaço de 1 palavra nasce ANTES da negação (o pedaço imediatamente anterior ao que a mostra, na mesma frase)
      const k = h.findIndex((c) => c.words.some((w) => chave(w.word) === chave(ng)))
      if (k < 1 || h[k - 1].words.length !== 1 || b.some((c) => c.words.length === 1 && c.words[0].start === h[k - 1].words[0].start)) antes++
      const desdeANegacao = oracao.split(' ')
      const cabe = desdeANegacao.length <= 5 && linhasDe([s.split(' ').pop(), ...desdeANegacao].map((p) => p.toUpperCase()), LETRAS_GANCHO) <= 3 // com folga: cabe mesmo levando a palavra de antes e na fonte do gancho
      if (!cabe || negacaoComONegado(h, ng, r.split(' ').pop())) juntas++
    }
    check(`C6 grade de ${comNeg} linhas COM negação: nenhuma palavra perdida (${intactas}), a regra geral em todas (${regra}), a pílula em até 3 linhas e 10 palavras (${pilula}), nenhum pedaço de 1 palavra novo antes da negação (${antes}) e a negação com o fim da oração quando ela cabe (${juntas})`, comNeg === 15876 && intactas === comNeg && regra === comNeg && pilula === comNeg && antes === comNeg && juntas === comNeg)
    // filme inteiro sem negação: o source sai byte a byte
    const L = linhaDoTexto(SEM_NEGACAO.en + ' ' + SEM_NEGACAO.en, 'pausas')
    const montar = (mod) => JSON.stringify(mod.C.buildCreatomateSource({ clipUrls: Array.from({ length: 4 }, (_, i) => `https://fixture.invalid/c${i}.mp4`), voiceoverUrl: 'https://fixture.invalid/v.mp3', voiceoverScript: SEM_NEGACAO.en, sceneCaptions: [], duration: 35, quality: 'cinematic_ai', realAudioDuration: r3(L[L.length - 1].end + 0.2), whisperWords: clone(L), musicUrl: null, aspect: '9:16' }))
    check('C7 filme sem negação: o source inteiro sai byte a byte', montar(BASE) === montar(HOJE))
    // maxWords 1 (lib/filmes/faceless15 usa o cortador como tokenizador): nada muda
    const LN = linhaDoTexto(FRASES.clever + ' ' + FRASES.wealth)
    check('C8 teto 1 (uso como tokenizador do filme de 15 s): igual à base, com negação e tudo', JSON.stringify(legendas(BASE, LN, 1)) === JSON.stringify(legendas(HOJE, LN, 1)))
  }

  // (4) línguas
  {
    const CASOS = [
      ['en', 'The proud man never thought of the poor.', 'never', 'poor'],
      ['en', 'A greedy heart cannot hold real joy.', 'cannot', 'joy'],
      ['en', 'All that shiny gold gave him no real peace.', 'no', 'peace'],
      ['pt', 'Ser esperto não quer dizer esquecer de Deus.', 'não', 'deus'],
      ['pt', 'O homem rico nunca dividiu o seu ouro.', 'nunca', 'ouro'],
      ['pt', 'Aquele velho rei jamais pediu ajuda ao povo.', 'jamais', 'povo'],
      ['pt', 'O ouro guardado nem sempre salva o dono.', 'nem', 'dono'],
      ['es', 'Ser muy listo no significa olvidar a Dios.', 'no', 'dios'],
      ['es', 'El hombre rico nunca compartió su gran tesoro.', 'nunca', 'tesoro'],
      ['es', 'Aquel viejo rey jamás pidió ayuda al pueblo.', 'jamás', 'pueblo'],
      ['es', 'El oro guardado ni siquiera salvó al dueño.', 'ni', 'dueño'],
      ['fr', 'Être très malin ne veut pas dire oublier Dieu.', 'ne', 'dieu'],
      ['fr', "Le vieil homme n'a jamais partagé son or.", "n'a", 'or'],
      ['de', 'Sehr klug zu sein bedeutet nicht Gott zu vergessen.', 'nicht', 'vergessen'],
      ['de', 'Der reiche alte Mann hatte nie Zeit für Arme.', 'nie', 'arme'],
      ['de', 'Der sehr stolze alte König gab kein Gold ab.', 'kein', 'ab'],
      ['it', 'Essere molto furbo non vuol dire dimenticare Dio.', 'non', 'dio'],
      ['it', 'Il vecchio re avaro mai divise il suo oro.', 'mai', 'oro'],
    ]
    for (const [lang, texto, neg, fim] of CASOS) {
      idioma(lang)
      for (const modo of ['whisper', 'grafia']) {
        const L = linhaDoTexto('Era uma vez. ' + texto + ' Fim da história.', modo)
        const b = legendas(BASE, L), h = legendas(HOJE, L)
        check(`L1[${lang}/${modo}] base separa a negação do que ela nega — ${texto}`, !negacaoComONegado(b, neg, fim))
        check(`L2[${lang}/${modo}] hoje a negação fica com o que nega — ${texto} → ${textos(h).join(' | ')}`, negacaoComONegado(h, neg, fim) && todasAsPalavras(b) === todasAsPalavras(h) && h.every((c) => c.words.length <= 10 && (c.words.length <= 4 || linhasDoPedaco(c) <= 3)))
      }
    }
    idioma('en')
  }

  // (5) limites declarados
  {
    const longa = legendas(HOJE, corpo("Being clever doesn't mean that you should ever forget about Allah."))
    check('X1 oração negada de 9 palavras ("…that you should ever forget about Allah") cabe em 3 linhas: um pedaço só, sem "FORGET ABOUT ALLAH" sozinho', temPedaco(longa, "doesn't mean that you should ever forget about allah") && !temPedaco(longa, 'forget about allah') && !temPedaco(longa, 'about allah'))
    const gancho = legendas(HOJE, linhaDoTexto("Being clever doesn't mean that you should ever forget about Allah."))
    check('X1b a mesma frase na fonte maior do gancho (16 letras por linha): o pedaço para em 3 linhas, antes da preposição — "… EVER FORGET" | "ABOUT ALLAH"', JSON.stringify(textos(gancho)) === JSON.stringify(['Being clever', "doesn't mean that you should ever forget", 'about Allah']))
    const comprida = legendas(HOJE, corpo('This does not mean that you can just go ahead and stop paying all of your taxes.'))
    check('X1c LIMITE DECLARADO — oração negada maior que a pílula: o pedaço da negação enche as 3 linhas e o resto da oração segue sem ela', JSON.stringify(textos(comprida).slice(-4)) === JSON.stringify(['This does', 'not mean that you can just go ahead and stop', 'paying all of', 'your taxes']))
    const letras = linhaDoTexto("Kings don't understand extraordinarily complicated administrative responsibilities.")
    check('X2 pílula cheia (palavras longas, já 3 linhas no teto normal): igual à base — o pedaço não passa de 3 linhas', JSON.stringify(legendas(BASE, letras)) === JSON.stringify(legendas(HOJE, letras)))
    const larga = corpo('He said that the old king of Rome did not want to see the proud man walk into the great city with all of his gold and his keys.')
    check('X2b nenhuma oração sem ponto faz o pedaço passar de 10 palavras nem de 3 linhas', legendas(HOJE, larga).every((c) => c.words.length <= 4 || (c.words.length <= 10 && linhasDoPedaco(c) <= 3)))
    const pausa = [['His', 0, 0.2], ['wealth', 0.2, 0.5], ['not', 0.5, 0.7], ['save', 1.2, 1.5], ['him', 1.5, 1.8, true]].map(([word, start, end, sentenceEnd]) => ({ word, start, end, ...(sentenceEnd ? { sentenceEnd } : {}) }))
    const ponto = linhaDoTexto('He did not go. She stayed home.')
    check('X4 pedaço que fechou em PONTO não é emendado na frase seguinte', JSON.stringify(legendas(BASE, ponto)) === JSON.stringify(legendas(HOJE, ponto)) && temPedaco(legendas(HOJE, ponto), 'he did not go'))
    check('X3 pedaço que fechou por PAUSA da própria fala (não pelo teto) fica como era (limite declarado)', JSON.stringify(legendas(BASE, pausa)) === JSON.stringify(legendas(HOJE, pausa)))
  }

  // (6) o corte proporcional (sem Whisper)
  {
    const seg = (mod, texto) => mod.C.buildCreatomateSource({ clipUrls: Array.from({ length: 3 }, (_, i) => `https://fixture.invalid/c${i}.mp4`), voiceoverUrl: 'https://fixture.invalid/v.mp3', voiceoverScript: texto, sceneCaptions: [], duration: 15, quality: 'cinematic_ai', realAudioDuration: 14, musicUrl: null, aspect: '9:16' }).elements.filter((e) => e.type === 'text' && e.track === 5).map((e) => e.text)
    const tb = seg(BASE, FRASES.rich + ' ' + FRASES.clever + ' ' + FRASES.wealth), th = seg(HOJE, FRASES.rich + ' ' + FRASES.clever + ' ' + FRASES.wealth)
    check('P1 base (sem Whisper) também parte: "YOU SHOULD FORGET ALLAH." sozinho', tb.includes('YOU SHOULD FORGET ALLAH.') && tb.includes('SAVE HIM!'))
    check('P2 hoje (sem Whisper): a negação fica com o que nega, sem perder palavra', JSON.stringify(th) === JSON.stringify(['BEING RICH', "DOESN'T MAKE YOU BETTER THAN OTHERS.", 'BEING CLEVER', "DOESN'T MEAN YOU SHOULD FORGET ALLAH.", 'HIS WEALTH COULD', 'NOT SAVE HIM!']) && tb.join(' ') === th.join(' '))
    const semNeg = 'The old man walked into the room and looked at the map on the wall. Then he smiled and left.'
    check('P3 sem negação (sem Whisper): legendas iguais à base', JSON.stringify(seg(BASE, semNeg)) === JSON.stringify(seg(HOJE, semNeg)))
    const f = HOJE.C.segmentosSemNegacaoPartida
    const s0 = [{ text: 'The old man walked', highlight: null }, { text: 'into the room.', highlight: 'room' }]
    check('P4 nada a juntar = o MESMO array de segmentos', typeof f === 'function' && f(s0, 4) === s0)
    const prop = (texto) => (typeof f === 'function' ? f(fatias(texto), 4) : fatias(texto)).map((x) => x.text)
    check('P5 (revisor 3, sem Whisper) "This does not mean you can stop paying taxes." → sem "you can stop paying" sozinho', JSON.stringify(prop('This does not mean you can stop paying taxes.')) === JSON.stringify(['This does', 'not mean you can stop paying taxes.']))
    check('P6 (sem Whisper) frase com negação no meio de um texto: as frases vizinhas saem com os MESMOS segmentos', (() => { const s = fatias('The old man walked into the room. This does not mean you can stop paying taxes. Then he smiled and left the house.'); const r = typeof f === 'function' ? f(s, 4) : s; return r !== s && r[0] === s[0] && r[1] === s[1] && r[r.length - 1] === s[s.length - 1] && r.map((x) => x.text).join(' ') === s.map((x) => x.text).join(' ') })())
    check('P7 (sem Whisper) a vírgula fecha a oração: "He did not go, she stayed home with them." não emenda as duas', !prop('He did not go, she stayed home with them.').some((x) => /not go, she/i.test(x)))
    check('P8 (sem Whisper) o pedaço da negação não termina em palavra-função quando a oração não cabe', (() => { const r = prop('The proud old king never gave any gold in the great city of Rome to the poor.'); return r.some((x) => /^never gave/i.test(x)) && !r.some((x) => /^never gave.*\b(?:of|the|in|to)$/i.test(x)) })())
  }

  // o helper, sozinho
  if (HOJE.N) {
    const N = HOJE.N
    const eh = (p, l) => N.ehNegacaoDaLegenda(p, l)
    check('H1 inglês: not, never, no, cannot, n\'t (com ’ também), em qualquer caixa e com pontuação colada', ['not', 'never', 'no', 'cannot', "doesn't", 'DON’T', "can't", '"Don\'t', 'NOT,', 'never.'].every((p) => eh(p, 'en')) && ['note', 'know', 'mean', 'nothingness', 'the', 'now'].every((p) => !eh(p, 'en')))
    check('H2 português: não, nunca, jamais, nem — e "no" NÃO é negação', ['não', 'nunca', 'jamais', 'nem', 'Não,'].every((p) => eh(p, 'pt')) && !eh('no', 'pt') && !eh('nos', 'pt') && !eh('na', 'pt'))
    check('H3 espanhol: no, nunca, jamás, ni', ['no', 'nunca', 'jamás', 'ni'].every((p) => eh(p, 'es')) && !eh('nos', 'es'))
    check('H4 francês, alemão, italiano', ['ne', 'pas', "n'est", 'jamais'].every((p) => eh(p, 'fr')) && ['nicht', 'nie', 'kein', 'keine'].every((p) => eh(p, 'de')) && ['non', 'mai', 'nessuno'].every((p) => eh(p, 'it')) && !eh('ne', 'it') && !eh('pas', 'en') && !eh('mai', 'en'))
    check('H5 idioma ausente = inglês; idioma fora da lista = nunca', eh("doesn't") && eh('not', null) && eh('not', '') && !eh('not', 'tr') && !eh('no', 'ar') && !eh('nie', 'pl'))
    check('H5b "couldn\'t\'ve" também é negação', eh("couldn't've", 'en') && !eh("could've", 'en'))
    const plano = (atual, resto, extra = {}) => typeof N.planoDaNegacao === 'function' ? N.planoDaNegacao(atual.split(' '), resto ? resto.split(' ') : [], { palavra: (w) => w, maxPalavras: 10, cabe: (itens) => linhasDe(itens, 19) <= 3, viajaComASeguinte: (w) => ['and', 'the', 'to', 'of', 'in', 'about'].includes(w), ...extra }) : undefined
    const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    check('H6 sem negação, ou sem nada depois: null (nada muda)', plano('the old man walked', 'into the room') === null && plano('he did not go', '') === null)
    check('H7 a negação abre o pedaço e leva a oração inteira quando cabe', igual(plano('being clever doesn\'t mean', 'you should forget allah'), { prefixo: 2, tamanho: 6 }) && igual(plano('his wealth could not', 'save him'), { prefixo: 3, tamanho: 3 }))
    check('H8 uma palavra sozinha antes da negação fica com ela; a palavra-função colada antes dela vem junto', igual(plano('he never saw the', 'car'), { prefixo: 0, tamanho: 5 }) && igual(plano('the store and never', 'came back home'), { prefixo: 2, tamanho: 5 }))
    check('H9 oração maior que a pílula: enche até 3 linhas / 10 palavras e não termina em palavra-função', igual(plano('this does not mean', 'that you can just go ahead and stop paying all of your taxes'), { prefixo: 2, tamanho: 10 }) && igual(plano('not see the gold', 'again in the city of rome tonight', { cabe: (itens) => itens.length <= 7 }), { prefixo: 0, tamanho: 5 }))
    check('H10 sem ganho (a pílula já está cheia, ou só entraria palavra-função): null', plano('kings don\'t understand extraordinarily', 'complicated administrative responsibilities', { cabe: (itens) => linhasDe(itens, 16) <= 3 }) === null && plano('he never lied once', 'to the old king of rome', { cabe: (itens) => itens.length <= 6 }) === null)
    check('H11 o plano não altera os arrays recebidos', (() => { const a = ['his', 'wealth', 'could', 'not'], r = ['save', 'him']; const antes = JSON.stringify([a, r]); N.planoDaNegacao?.(a, r, { palavra: (w) => w, maxPalavras: 10, cabe: () => true }); return JSON.stringify([a, r]) === antes })())
    check('H12 linhasDaLegenda: a quebra é só entre palavras e bate com a conta deste guardião', typeof N.linhasDaLegenda === 'function' && N.linhasDaLegenda(["DOESN'T", 'MEAN', 'YOU', 'SHOULD', 'DISRESPECT', 'MUHAMMAD'], 19) === 3 && N.linhasDaLegenda(["DOESN'T", 'MEAN', 'YOU', 'SHOULD', 'DISRESPECT', 'MUHAMMAD'], 16) === 4 && N.linhasDaLegenda([], 19) === 0 && N.linhasDaLegenda(['EXTRAORDINARILYLONGWORDHERE', 'A'], 10) === 2)
  } else check('H0 o helper lib/legendaNegacao foi carregado pelo compose de hoje', false)

  // (8) a volta do revisor (2): os casos que a 1ª versão deixava iguais à base
  {
    const linhasOk = (caps) => caps.every((c) => c.words.length <= 4 || (c.words.length <= 10 && linhasDoPedaco(c) <= 3))
    const CASOS = [
      // [nome, língua, frase, pedaços proibidos (sozinhos na tela), negação, palavra que tem de estar no pedaço dela, pedaços esperados na fonte normal]
      ['V1 revisor 1 (41 letras)', 'en', "Being clever doesn't mean you should disrespect Muhammad.", ['you should disrespect muhammad', 'should disrespect muhammad', 'disrespect muhammad'], "doesn't", 'disrespect', ['Being clever', "doesn't mean you should disrespect Muhammad"]],
      ['V2 revisor 2 (uma palavra a mais)', 'en', "Being clever doesn't mean you should forget about Allah.", ['you should forget', 'you should forget about allah', 'forget about allah', 'should forget about allah'], "doesn't", 'forget', ['Being clever', "doesn't mean you should forget about Allah"]],
      ['V3 revisor 3 (frase do pedido)', 'en', 'This does not mean you can stop paying taxes.', ['you can stop paying', 'you can stop paying taxes', 'stop paying taxes', 'can stop paying taxes'], 'not', 'stop', ['This does', 'not mean you can stop paying taxes']],
      ['V4a revisor 4 (português)', 'pt', 'Não significa que você deve esquecer sua família.', ['deve esquecer sua família', 'que você deve esquecer', 'esquecer sua família', 'você deve esquecer sua família'], 'não', 'esquecer', ['Não significa que você deve esquecer sua família']],
      ['V4b revisor 4 (português)', 'pt', 'Ser inteligente não significa que você deve esquecer Deus.', ['que você deve esquecer', 'você deve esquecer deus', 'deve esquecer deus', 'esquecer deus'], 'não', 'esquecer', ['Ser inteligente', 'não significa que você deve esquecer Deus']],
      ['V4c revisor 4 (português)', 'pt', 'Ter dinheiro não quer dizer que você é melhor.', ['dizer que você é', 'você é melhor', 'que você é melhor'], 'não', 'melhor', ['Ter dinheiro', 'não quer dizer que você é melhor']],
      ['V4d revisor 4 (espanhol)', 'es', 'Ser rico no significa que debes olvidar a Dios.', ['que debes olvidar', 'debes olvidar a dios', 'olvidar a dios'], 'no', 'olvidar', ['Ser rico', 'no significa que debes olvidar a Dios']],
      ['V4e revisor 4 (espanhol)', 'es', 'Ser fuerte no significa que debes lastimar a otros.', ['que debes lastimar', 'debes lastimar a otros', 'lastimar a otros'], 'no', 'lastimar', ['Ser fuerte', 'no significa que debes lastimar a otros']],
      ['V5a revisor 5', 'en', "Your parents don't want you to lie to them.", ['you to lie', 'you to lie to them', 'lie to them', 'to lie to them'], "don't", 'lie', ['Your parents', "don't want you to lie to them"]],
      ['V5b revisor 5', 'en', 'The government cannot force you to pay this unconstitutional tax.', ['you to pay this', 'pay this unconstitutional tax', 'you to pay this unconstitutional tax', 'to pay this unconstitutional tax'], 'cannot', 'pay', ['The government', 'cannot force you to pay this unconstitutional', 'tax']],
      ['V5c revisor 5', 'en', 'Remember that being rich does not mean you should forget the poor people around you.', ['should forget the poor', 'you should forget the poor', 'forget the poor people', 'should forget the poor people'], 'not', 'forget', ['Remember that being rich', 'does not mean you should forget the poor people', 'around you']],
      ['V6a mais um advérbio', 'en', "Being clever doesn't mean that you should ever forget Allah.", ['forget allah', 'ever forget allah', 'that you should ever', 'you should ever forget allah', 'should ever forget allah'], "doesn't", 'forget', ['Being clever', "doesn't mean that you should ever forget Allah"]],
      ['V6b "no longer"', 'en', 'The doctor told him he could no longer eat sugar at all.', ['eat sugar at all', 'eat sugar'], 'no', 'sugar', ['The doctor told him', 'he could', 'no longer eat sugar at all']],
      ['V6c "is not good"', 'en', 'Smoking cigarettes is not good for your lungs.', ['good for your lungs'], 'not', 'lungs', ['Smoking cigarettes is', 'not good for your lungs']],
    ]
    for (const [nome, lang, frase, proibidos, neg, com, esperado] of CASOS) {
      idioma(lang)
      for (const modo of ['whisper', 'pausas', 'grafia']) {
        const Lc = corpo(frase, modo), Lg = linhaDoTexto(frase, modo)
        const bc = legendas(BASE, Lc), hc = legendas(HOJE, Lc), hg = legendas(HOJE, Lg), bg = legendas(BASE, Lg)
        check(`${nome}[${modo}] a base mostra sozinho um pedaço proibido — ${frase}`, proibidos.some((p) => temPedaco(bc, p)))
        check(`${nome}[${modo}] hoje (fonte normal): nenhum pedaço proibido, a negação com "${com}" — ${textos(hc).slice(-esperado.length).join(' | ')}`, !proibidos.some((p) => temPedaco(hc, p)) && negacaoComONegado(hc, neg, com) && igualTexto(textos(hc).slice(-esperado.length), esperado))
        check(`${nome}[${modo}] hoje (fonte do gancho, frase nos primeiros 6 s): nenhum pedaço proibido, a negação com "${com}" — ${textos(hg).join(' | ')}`, !proibidos.some((p) => temPedaco(hg, p)) && negacaoComONegado(hg, neg, com))
        check(`${nome}[${modo}] nenhuma palavra perdida ou fora de ordem; a pílula em até 3 linhas e 10 palavras`, todasAsPalavras(bc) === todasAsPalavras(hc) && todasAsPalavras(bg) === todasAsPalavras(hg) && linhasOk(hc) && linhasOk(hg))
      }
    }
    // revisor 1, na fonte do gancho: 6 palavras dariam 4 linhas → o pedaço para em 3 linhas e só o nome fica para depois (nunca "DISRESPECT MUHAMMAD")
    idioma('en')
    check('V1g revisor 1 na fonte do gancho: "doesn\'t mean you should disrespect" | "Muhammad"', JSON.stringify(textos(legendas(HOJE, linhaDoTexto("Being clever doesn't mean you should disrespect Muhammad.")))) === JSON.stringify(['Being clever', "doesn't mean you should disrespect", 'Muhammad']))
    // revisor 7: nenhum pedaço de 1 palavra nasce antes da negação, e "ne … jamais" ficam juntos
    const SEM_ORFA = [
      ['en', 'Our teacher said we should not hit other kids at school.', ['Our teacher said we', 'should not hit other kids at school']],
      ['es', 'Tú no debes robar a nadie nunca.', ['Tú no debes robar a nadie nunca']],
      ['fr', 'Ne jamais oublier Dieu dans sa vie.', ['Ne jamais oublier Dieu dans sa vie']],
      ['it', 'Tu non devi mai dimenticare tua madre.', ['Tu non devi mai dimenticare tua madre']],
      ['en', 'The doctor told him he could no longer eat sugar at all.', ['The doctor told him', 'he could', 'no longer eat sugar at all']],
      ['pt', 'Você não deve mentir para os seus pais.', ['Você não deve mentir para os seus pais']],
      ['en', 'They never found the body of the missing pilot.', ['They never found the body of the missing pilot']],
    ]
    for (const [lang, frase, esperado] of SEM_ORFA) {
      idioma(lang)
      for (const modo of ['whisper', 'grafia']) {
        const b = legendas(BASE, corpo(frase, modo)), h = legendas(HOJE, corpo(frase, modo)), hg = legendas(HOJE, linhaDoTexto(frase, modo))
        const umaPalavra = (caps) => caps.filter((c) => c.words.length === 1).length
        check(`V7[${lang}/${modo}] sem pedaço de 1 palavra novo — ${frase} → ${textos(h).slice(-esperado.length).join(' | ')}`, igualTexto(textos(h).slice(-esperado.length), esperado) && umaPalavra(h) <= umaPalavra(b) && umaPalavra(hg) <= umaPalavra(legendas(BASE, linhaDoTexto(frase, modo))) && todasAsPalavras(b) === todasAsPalavras(h))
      }
    }
    idioma('en')
    // revisor 8: o anti-gagueira é o mesmo código, na mesma fronteira natural; repetição no fecho de frase sai igual à base
    for (const texto of ["Think for it. It's called the long game.", 'He had no one. One day he left.', 'She did not stop. Stop and think about it.']) {
      const L = linhaDoTexto(texto)
      check(`V8 gagueira em fecho de frase ("${texto}"): as mesmas palavras da base`, todasAsPalavras(legendas(BASE, L)) === todasAsPalavras(legendas(HOJE, L)))
    }
    // grade aleatória COM negação (o vocabulário do revisor): a regra geral, a pílula, nenhuma palavra perdida fora do anti-gagueira
    const VOC = "you should never trust a stranger with your money he did not save the city she could not forget her mother we cannot stop now they won't come back it isn't over don't forget god no one came nothing happened nobody knew the king was not rich".split(' ')
    let s2 = 9112026
    const rnd2 = () => { s2 = (s2 * 1103515245 + 12345) & 0x7fffffff; return s2 / 0x7fffffff }
    let linhasTestadas = 0, regraOk = 0, pilulaOk = 0, palavrasOk = 0, ordemOk = 0, umaHoje = 0, umaBase = 0
    for (let caso = 0; caso < 1500; caso++) {
      const n = 2 + Math.floor(rnd2() * 20)
      const toks = Array.from({ length: n }, () => VOC[Math.floor(rnd2() * VOC.length)]).map((w, i, a) => (i === a.length - 1 ? w + '.' : rnd2() < 0.06 ? w + ',' : rnd2() < 0.05 ? w + '.' : w))
      for (const modo of ['whisper', 'pausas', 'grafia']) {
        const L = (caso % 2 ? corpo : linhaDoTexto)(toks.join(' '), modo)
        const b = legendas(BASE, L), h = legendas(HOJE, L)
        linhasTestadas++
        if (negacaoSemONegado(h, L, HOJE).length === 0) regraOk++
        if (h.every((c) => c.words.length <= 4 || (c.words.length <= 10 && linhasDoPedaco(c) <= 3))) pilulaOk++
        // toda palavra da fala aparece, na ordem, salvo a que o anti-gagueira tira (a 1ª de um pedaço, igual à última do pedaço anterior)
        const mostradas = new Set(h.flatMap((c) => c.words.map((w) => w.start)))
        if (L.every((w, i) => mostradas.has(r3(w.start)) || (i > 0 && chave(L[i - 1].word) === chave(w.word)))) palavrasOk++
        if (h.every((c, i) => i === 0 || c.time >= h[i - 1].time) && JSON.stringify(h.flatMap((c) => c.words.map((w) => w.start))) === JSON.stringify(h.flatMap((c) => c.words.map((w) => w.start)).slice().sort((x, y) => x - y))) ordemOk++
        umaHoje += h.filter((c) => c.words.length === 1).length; umaBase += b.filter((c) => c.words.length === 1).length
      }
    }
    check(`V9 grade aleatória de ${linhasTestadas} linhas COM negação: a regra geral (${regraOk}), a pílula (${pilulaOk}), nenhuma palavra perdida fora do anti-gagueira (${palavrasOk}), ordem (${ordemOk})`, linhasTestadas === 4500 && regraOk === linhasTestadas && pilulaOk === linhasTestadas && palavrasOk === linhasTestadas && ordemOk === linhasTestadas)
    check(`V10 na mesma grade, hoje há MENOS pedaços de 1 palavra que na base (${umaHoje} × ${umaBase})`, umaHoje <= umaBase)
  }
  return falhas
}

// ══ execução ═════════════════════════════════════════════════════════════════════════════════════════════════════
let falhou = 0, passou = 0
const diz = (nome, ok, extra = '') => { if (ok) { passou++; console.log('  ✓ ' + nome) } else { falhou++; console.log('  ✗ ' + nome + (extra ? ' — ' + extra : '')) } }

console.log('KINEO-LEGENDA-NEGACAO-0911 — a legenda não separa a negação do que ela nega')
console.log('0) O recibo e a ligação nos caminhos')
diz('a base é o arquivo de hoje com o recibo exato desfeito (e é diferente dele)', FONTE_BASE !== FONTE_HOJE && !FONTE_BASE.includes('KINEO-LEGENDA-NEGACAO-0911') && FONTE_HOJE.includes('KINEO-LEGENDA-NEGACAO-0911'))
diz('CAPTION_WORDS_PER_CHUNK continua 4 (o teto que este guardião usa)', /\nconst CAPTION_WORDS_PER_CHUNK = 4\n/.test(FONTE_HOJE))
{
  const chamadas = FONTE_HOJE.split('\n').filter((l) => l.includes('buildCaptionsFromWhisperWords(') && !l.includes('export function') && !l.trim().startsWith('//') && !l.trim().startsWith('*'))
  diz('os 3 cortes por Whisper do filme (clássico, bloco hollywood, fala nativa por clipe) passam pelo mesmo cortador', chamadas.length === 3, String(chamadas.length))
  const proporcionais = FONTE_HOJE.split('\n').filter((l) => l.includes('buildCaptionSegments(') && !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.startsWith('import'))
  diz('os 2 cortes proporcionais (clássico e bloco hollywood) passam por segmentosSemNegacaoPartida', proporcionais.length === 2 && proporcionais.every((l) => l.includes('segmentosSemNegacaoPartida(buildCaptionSegments(')), String(proporcionais.length))
  diz('o cortador por Whisper e o corte proporcional pedem o plano ao MESMO helper quando o pedaço bate no teto, com o idioma do filme', /planoDaNegacao\(current, [^\n]*idioma: ACTIVE_CAPTION_IDIOMA/.test(FONTE_HOJE) && /planoDaNegacao\(atual, [^\n]*idioma: ACTIVE_CAPTION_IDIOMA/.test(FONTE_HOJE) && /ACTIVE_CAPTION_IDIOMA = typeof language === 'string' \? language : null/.test(FONTE_HOJE))
  diz('a conta da pílula deste guardião usa os números do formato 9:16 de hoje (caixa 78%, legenda 54, gancho 64) e a letra de 0,72 em', /'9:16': \{[\s\S]*?captionWidth: '78%',[\s\S]*?captionFontSize: 54,\s*hookFontSize: 64,/.test(ASPECTO) && /\nconst LEGENDA_LETRA_EM = 0\.72\n/.test(FONTE_HOJE) && LETRAS_CORPO === 19 && LETRAS_GANCHO === 16)
  diz('o anti-gagueira é o mesmo código da base (este conserto não o toca)', (() => { const trecho = (f) => f.slice(f.indexOf('// Anti-stutter guard.'), f.indexOf('const text = joinNarrationTokens(chunkWords).trim()')); return trecho(FONTE_HOJE).length > 300 && trecho(FONTE_HOJE) === trecho(FONTE_BASE) })())
  diz('o helper é puro: nenhum import, nenhuma rede, nenhum relógio', !/\bimport\b|\brequire\(|fetch\(|Date\.|process\./.test(FONTE_NEGACAO))
}

const BASE = carregar({ compose: FONTE_BASE })
const HOJE = carregar({ compose: FONTE_HOJE })
console.log('1-6) A bateria: base × hoje')
const falhas = bateria(BASE, HOJE)
const rodadas = verificacoes
if (process.env.LISTA) console.log(falhas.map((f) => '      ' + f).join('\n')) // LISTA=1 mostra todas as checagens que falharam
diz(`a bateria inteira passa com o código de hoje: ${rodadas} verificações${falhas.length ? '' : ' (caso real, frases reais, controles, línguas, limites, corte proporcional, helper)'}`, falhas.length === 0, falhas.slice(0, 12).join(' · '))
const iguais = bateria(BASE, BASE)
diz('a mesma bateria REPROVA a base contra ela mesma (o defeito está lá, e também nos casos do revisor)', iguais.some((f) => f.startsWith('R4')) && iguais.some((f) => f.startsWith('F2')) && iguais.some((f) => f.startsWith('L2')) && iguais.some((f) => f.startsWith('P2')) && ['V1 ', 'V2 ', 'V3 ', 'V4a', 'V4b', 'V4c', 'V4d', 'V4e', 'V5a', 'V5b', 'V5c', 'V6a'].every((v) => iguais.some((f) => f.startsWith(v))), iguais.slice(0, 6).join(' · '))

console.log('7) Mutantes: cada estrago tem de ser pego')
const mutante = (nome, alvo, de, para, esperadas) => {
  const fonte = alvo === 'compose' ? FONTE_HOJE : FONTE_NEGACAO
  if (fonte.split(de).length !== 2) return diz(`mutante "${nome}" aplicável`, false, 'trecho ausente ou repetido')
  let f
  try { f = bateria(BASE, carregar({ [alvo]: fonte.replace(de, () => para) })) } catch (e) { f = ['erro: ' + e.message] }
  diz(`mutante "${nome}" é pego (${f.length} falhas)`, esperadas.every((p) => f.some((x) => x.startsWith(p))), f.slice(0, 5).join(' · '))
}
mutante('o cortador não pede mais o plano', 'compose', 'if (maxWords > 1 && !natural && next && !pedacoDaNegacao && current.length >= teto) {', 'if (maxWords > 99 && !natural && next && !pedacoDaNegacao && current.length >= teto) {', ['R4', 'F2', 'L2', 'V1 '])
mutante('pedaço que fechou em ponto ou pausa também é planejado', 'compose', 'if (maxWords > 1 && !natural && next && !pedacoDaNegacao && current.length >= teto) {', 'if (maxWords > 1 && next && !pedacoDaNegacao && current.length >= teto) {', ['X4'])
mutante('o idioma do filme não chega ao helper', 'compose', "ACTIVE_CAPTION_IDIOMA = typeof language === 'string' ? language : null", 'ACTIVE_CAPTION_IDIOMA = null', ['C3', 'L2'])
mutante('o corte proporcional fica de fora', 'compose', 'if (planejou) { mudou = true;', 'if (planejou && false) { mudou = true;', ['P2', 'P5'])
mutante('a palavra que desce some (o prefixo fecha com uma palavra a menos)', 'compose', 'if (plano.prefixo > 0) { groups.push(current.slice(0, plano.prefixo)); current = current.slice(plano.prefixo) }', 'if (plano.prefixo > 0) { groups.push(current.slice(0, plano.prefixo)); current = current.slice(plano.prefixo + 1) }', ['R10'])
mutante('o teto do pedaço da negação não volta ao normal no pedaço seguinte', 'compose', 'teto = maxWords // KINEO-LEGENDA-NEGACAO-0911 — o pedaço seguinte volta ao teto normal', '// KINEO-LEGENDA-NEGACAO-0911 — (mutante)', ['R11'])
mutante('a frase nos primeiros 6 s é medida com a fonte normal (a pílula do gancho passa de 3 linhas)', 'compose', 'itens[0].start < LEGENDA_GANCHO_ATE_SEGUNDOS', 'false', ['V1g'])
mutante('sem estica: o pedaço da negação fica no teto normal', 'negacao', 'export const LEGENDA_NEGACAO_PALAVRAS = 10', 'export const LEGENDA_NEGACAO_PALAVRAS = 4', ['R4', 'F2', 'V1 '])
mutante('volta o teto de 6 palavras da 1ª versão', 'negacao', 'export const LEGENDA_NEGACAO_PALAVRAS = 10', 'export const LEGENDA_NEGACAO_PALAVRAS = 6', ['V2 ', 'V3 ', 'V6a'])
mutante('volta a exigir a oração inteira (a 1ª versão)', 'negacao', 'return tamanho > jaTem ? { prefixo, tamanho } : null', 'return tamanho === oracao.length ? { prefixo, tamanho } : null', ['V5b', 'V5c'])
mutante('sem limite de linhas (a pílula estoura)', 'negacao', 'export const LEGENDA_NEGACAO_LINHAS = 3', 'export const LEGENDA_NEGACAO_LINHAS = 30', ['X2', 'V1g'])
mutante('"doesn\'t" deixa de ser negação', 'negacao', "if (lingua === 'en') return /n't(?:'ve)?$/.test(p)", "if (lingua === 'en') return false", ['R4', 'F2'])
mutante('língua fora da lista cai no inglês', 'negacao', 'if (!lista) return false', "if (!lista) return ehNegacaoDaLegenda(palavra, 'en')", ['C4'])
mutante('a palavra sozinha antes da negação vira pedaço (revisor, item 7)', 'negacao', 'if (prefixo === 1) prefixo = 0', 'if (prefixo === 99) prefixo = 0', ['V7', 'F11'])
mutante('a palavra-função colada antes da negação fica para trás', 'negacao', 'while (prefixo > 0 && viaja(atual[prefixo - 1])) prefixo--', 'while (false) prefixo--', ['F13'])
mutante('o pedaço da negação termina em palavra-função', 'negacao', 'if (tamanho < oracao.length) while (tamanho > jaTem && viaja(oracao[tamanho - 1])) tamanho--', '', ['P8'])

console.log(`\n${falhou === 0 ? '✅' : '❌'} ${passou} verdes, ${falhou} vermelhas`)
process.exit(falhou === 0 ? 0 : 1)
