// KINEO-META95-ASSUNTO-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — guardião do conserto "o filtro anti-invenção não apaga o assunto".
//
// Diagnóstico (docs/DIAGNOSTICO-META-95-2026-10-19.md, causa C2 — 51% dos filmes abaixo de 95 contra 8% dos ≥95): o filtro comparava o prompt da
// cena (inglês) com as PALAVRAS do pedido/fala (na língua da pessoa) e apagava o assunto — "Ottoman" com o pedido "Osmanlı" (4a2e21ee), "Bermuda
// Triangle" com a fala "Triângulo das Bermudas" (2f3692ff); na fala escrita pela IA deixava buraco — "In the year," (7ef91122), "No Oceano, em,"
// e "O : uma área" (2f3692ff), "साल पुरानी" sem o número (9de38488); e o apagão do nome inventado deixava "of confidently posing in front of the
// iconic at sunrise" (a0b58200).
//
// O que este guardião prova, EXECUTANDO as libs reais (scripts/test-support/offline-ts-loader.mjs), com os casos reais do banco:
//   A  depois: assunto fica com o pedido traduzido; acento/i sem ponto/plural/sufixo turco casam; fala sem buraco; restos do apagão limpos;
//   B  antes (lib da base, em memória): os mesmos casos saíam ERRADOS — este guardião era vermelho no código de antes;
//   C  mutantes: comparação sem normalização, buraco de volta, verbatim sem guarda, tradução ignorada → vermelho;
//   D  rota: o contexto do filtro passa pelo assunto traduzido nos 4 pontos; null = não apaga; verbatim nunca passa pela fala;
//   E  estrada de sempre: inglês puro sem escrita estrangeira = byte a byte igual à lib da base;
//   F  desfaz exato + novos + marca + encadeamento (as camadas filme-rápido e trilha-15s tiram esta PRIMEIRO).
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const { createOfflineLoader } = await import(pathToFileURL(join(ROOT, 'scripts/test-support/offline-ts-loader.mjs')).href)
const SUP = await import(pathToFileURL(join(ROOT, 'scripts/test-support/desfaz-meta95-assunto-1910.mjs')).href)
const { semFilmeRapido1710 } = await import(pathToFileURL(join(ROOT, 'scripts/test-support/desfaz-filme-rapido-1710.mjs')).href)
const { semTrilha15s1610 } = await import(pathToFileURL(join(ROOT, 'scripts/test-support/desfaz-trilha-15s-1610.mjs')).href)
const MARCA = 'KINEO-META95-ASSUNTO-1910'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const VPP = 'lib/cinematic/visualPromptPolicy.ts'
const FALA = 'lib/cinematic/falaSemBuraco.ts'
const TRAD = 'lib/cinematic/assuntoTraduzido.ts'
const lf = (s) => s.replace(/\r\n/g, '\n')
const disco = (p) => lf(readFileSync(join(ROOT, p), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
let BASE = 'HEAD'
try { const shas = git('log', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean); BASE = shas.length ? shas[shas.length - 1] + '^' : 'HEAD' } catch { BASE = 'HEAD' }
const base = (p) => { try { return lf(git('show', `${BASE}:${p}`)) } catch { return null } }

let ok = 0
const falhas = []
const checa = (n, c, extra = '') => { if (c) ok++; else falhas.push(n + (extra ? ` — ${extra}` : '')) }

// ── libs: depois (disco), antes (base em memória), mutantes (fonte transformada) ─────────────────────────────────────────
const carrega = (transforma) => createOfflineLoader({ source: transforma ?? null })
const depois = carrega()
const vppD = depois('@/lib/cinematic/visualPromptPolicy')
const falaD = depois('@/lib/cinematic/falaSemBuraco')
const tradD = depois('@/lib/cinematic/assuntoTraduzido')
const fid = depois('@/lib/hollywood/fidelidade')
const baseVpp = base(VPP)
const antes = carrega((rel, txt) => (rel === VPP && baseVpp ? baseVpp : txt))
const vppA = antes('@/lib/cinematic/visualPromptPolicy')
const velho = (texto, ctx) => { const r = fid.removerDatasInventadas(texto, ctx); const r2 = vppA.scrubInventedSetting(r.texto, ctx); return r2.removed.length ? r2.text : r.texto }

// ── os casos reais (banco cqqukkvjjrguayiyjvhh, eventos compose/cinematic_submission_claim e cinematic_dispatch_result) ──
const TR = "Osmanlı padişahının savaşta esir düştüğünü biliyor muydunuz? Yıl 1402. Osmanlı hükümdarı Yıldırım Bayezid, Timur tehlikesiyle karşılaştı. Osmanlı askerleri Timur'un ordusuna katıldı, güçleri zayıfladı. Bayezid yenildi ve esir düştü... Osmanlı, Fetret Devri'ne sürüklendi."
const TR_EN = "Did you know the Ottoman sultan was taken prisoner in battle? The year 1402. The Ottoman ruler Yıldırım Bayezid faced the Timur threat. Ottoman soldiers joined Timur's army, their forces weakened. Bayezid was defeated and captured... The Ottoman Empire was dragged into the Interregnum. Ottoman Bayezid I Timur 1402 Interregnum"
const TR_VISUAL = 'A dimly lit Ottoman throne room in Topkapi Palace, Istanbul, with an ornate throne, empty and imposing, symbolizing the captured sultan of the Ottoman Empire.'
const UR = 'ایک بات بتاؤں؟ خوبصورت تو میں ہوں ہی! لیکن میرا بینک بیلنس مجھ سے بالکل متاثر نہیں ہے! وہ بھی تو ضروری ہے، ہے نا؟ اسی لیے خوبصورتی کے ساتھ کمائی بھی ضروری ہے، جناب!'
const UR_V1 = 'A vibrant scene of Ayesha confidently posing in front of the iconic Taj Mahal at sunrise, with soft golden light illuminating her features. No other characters, no animals, no Taj Mahal, no added props.'
const UR_V3 = 'A vibrant scene inside the bustling Spice Bazaar of Istanbul, showing Ayesha with a joyful expression, counting cash in her hands.'
const PT = 'Short falando sobre os 3 maiores mistérios do oceano'
const PT_FALA = 'No Oceano Atlântico, em 1968, um submarino desaparece de forma misteriosa, sem deixar quaisquer rastros. Em 2004, cientistas capturam imagens de uma lula gigante nas profundezas do oceano. O Triângulo das Bermudas: uma área onde navios e aviões desaparecem sem explicação.'
const PT_FALA_OK = 'No Oceano, um submarino desaparece de forma misteriosa, sem deixar quaisquer rastros. Cientistas capturam imagens de uma lula gigante nas profundezas do oceano. O Triângulo das Bermudas: uma área onde navios e aviões desaparecem sem explicação.'
const PT_V3 = 'Aerial view of the Bermuda Triangle, a vast turbulent ocean area with dark clouds overhead and no ships or planes visible.'
const EN_PEDIDO = 'A mysterious disappearance in an abandoned hallway, a key under the floorboards'
const EN_FALA = 'In the year 1923, a mysterious disappearance took place in this very hallway. The key, which was found beneath the floorboards, had remained untouched for decades.'
const EN_FALA_OK = 'A mysterious disappearance took place in this very hallway. The key, which was found beneath the floorboards, had remained untouched for decades.'
const HI_PEDIDO = 'The unsolved mystery of Amazon revar'
const HI_FALA = 'अमेज़न नदी का रहस्य 6,400 किलोमीटर लंबा है, अब तक अनसुलझा। इन पत्थरों पर प्राचीन चित्रलिपि 2000 साल पुरानी हो सकती है।'
const buraco = (s) => /(^|\s)(in|the year|em|o|a|an|of)\s*[,.:;]/i.test(s) || /[,:;]\s*[,:;]/.test(s)

console.log('== A. depois: os casos reais, executados ==')
{
  const r = vppD.scrubInventedSetting(TR_VISUAL, `${TR} ${TR_EN}`)
  checa('A1 4a2e21ee (tr): com o pedido traduzido, "Ottoman" fica nas duas cenas; Topkapi/Istanbul (não estão no pedido: em 1402 nem existiam) saem sem buraco', r.text === 'A dimly lit Ottoman throne room, with an ornate throne, empty and imposing, symbolizing the captured sultan of the Ottoman Empire.' && r.removed.join(' ') === 'Topkapi Palace Istanbul', r.text)
  const r1 = vppD.scrubInventedSetting(UR_V1, UR)
  checa('A2 a0b58200 (ur) cena 1: nome inventado e Taj Mahal saem, sem resto — "of a person confidently posing in front of the iconic landmark at sunrise" e "no animals, no added props"', r1.text === 'A vibrant scene of a person confidently posing in front of the iconic landmark at sunrise, with soft golden light illuminating her features. No other characters, no animals, no added props.', r1.text)
  const r3 = vppD.scrubInventedSetting(UR_V3, UR)
  checa('A3 a0b58200 (ur) cena 3: "inside the bustling place, showing a person with a joyful expression"', r3.text === 'A vibrant scene inside the bustling place, showing a person with a joyful expression, counting cash in her hands.', r3.text)
  const f = falaD.filtrarFalaSemBuraco(PT_FALA, PT)
  checa('A4 2f3692ff (pt) fala: ano e oceano inventados saem com a oração inteira; "O Triângulo das Bermudas: uma área…" fica inteira (buraco impossível de fechar)', f.texto === PT_FALA_OK && f.mantidas.length === 1 && f.mantidas[0].startsWith('O Triângulo') && f.reescritas.length === 2 && f.removidas.join(' ') === '1968 Atlântico 2004', f.texto)
  const v3 = vppD.scrubInventedSetting(PT_V3, `${PT} ${f.texto} Bermuda Triangle Atlantic Ocean`)
  checa('A5 2f3692ff (pt) cena 3: com a fala inteira + a tradução, "Bermuda Triangle" fica no prompt', v3.text === PT_V3 && v3.removed.length === 0, v3.text)
  const e = falaD.filtrarFalaSemBuraco(EN_FALA, EN_PEDIDO)
  checa('A6 7ef91122 (en) fala: "In the year 1923," sai INTEIRA — "A mysterious disappearance took place…", sem "In the year,"', e.texto === EN_FALA_OK && e.reescritas.length === 1 && e.removidas.join(' ') === '1923', e.texto)
  const h = falaD.filtrarFalaSemBuraco(HI_FALA, HI_PEDIDO)
  checa('A7 9de38488 (hi) fala: número + unidade ("2000 साल") — a frase fica inteira, nunca "साल पुरानी" sem número', h.texto === HI_FALA && h.mantidas.length === 1, h.texto)
  checa('A8 normalização: İstanbul × Istanbul, Bermudas × Bermuda, Tomás × Tomas, Timur\'un × Timur, Mohenjo-daro × Mohenjo Daro — tudo casa',
    vppD.scrubInventedSetting('The skyline of Istanbul at dusk', 'Bir gece İstanbul').removed.length === 0 &&
    vppD.scrubInventedSetting('Aerial view of Bermuda at dusk', 'as ilhas Bermudas').removed.length === 0 &&
    vppD.scrubInventedSetting('Close-up of Tomas writing', 'o Tomás escreve').removed.length === 0 &&
    vppD.scrubInventedSetting('The army of Timur advances', TR).removed.length === 0 &&
    vppD.scrubInventedSetting('Ruins of Mohenjo-daro at noon', 'the Great Bath of Mohenjo Daro').removed.length === 0)
  checa('A9 fala: data no meio da frase sai sem reescrever; frase só com buraco no fim (sem vírgula) fica inteira (nunca "The time is exactly.")',
    falaD.filtrarFalaSemBuraco('A flight vanished in 1953 over the desert.', 'a flight vanished over the desert').texto === 'A flight vanished over the desert.' &&
    falaD.filtrarFalaSemBuraco('The time is exactly 12:00 AM. The train stops.', 'a night train at midnight').texto === 'The time is exactly 12:00 AM. The train stops.')
  checa('A10 fala: roteiro colado contra ele mesmo (verbatim) = byte a byte igual', falaD.filtrarFalaSemBuraco(TR, TR).texto === TR && falaD.filtrarFalaSemBuraco(PT_FALA, PT_FALA).texto === PT_FALA)
  checa('A11 repararExistentes: frase que JÁ chegou com buraco ("In the year, a…") perde a oração; sem a opção fica como está',
    falaD.filtrarFalaSemBuraco('In the year, a flight vanished over the desert.', 'x', { repararExistentes: true }).texto === 'A flight vanished over the desert.' &&
    falaD.filtrarFalaSemBuraco('In the year, a flight vanished over the desert.', 'x').texto === 'In the year, a flight vanished over the desert.')
  checa('A12 precisaTraducao: turco/urdu/pt = sim; inglês sem escrita estrangeira = não; inglês com devanágari = sim',
    tradD.precisaTraducao(TR, 'tr') && tradD.precisaTraducao(UR, 'en') && tradD.precisaTraducao(PT, 'pt') && !tradD.precisaTraducao('A flight vanished over the Nevada desert', 'en') && tradD.precisaTraducao(HI_FALA, 'en'))
  checa('A13 lerTraducao: JSON certo vira texto + nomes; JSON ruim/vazio = null',
    JSON.stringify(tradD.lerTraducao('{"english":"Ottoman sultan","names":["Ottoman","Bayezid I",""]}')) === '{"texto":"Ottoman sultan","nomes":["Ottoman","Bayezid I"]}' && tradD.lerTraducao('nope') === null && tradD.lerTraducao('{}') === null)
  const chamadas = []
  const fetchOk = async (url, init) => { chamadas.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ choices: [{ message: { content: '{"english":"Did you know the Ottoman sultan…","names":["Ottoman","Bayezid I","Timur"]}' } }] }) } }
  const tradLib = createOfflineLoader({ env: { OPENAI_API_KEY: 'k' }, globals: { setTimeout: () => 0, clearTimeout() {}, AbortController } })('@/lib/cinematic/assuntoTraduzido')
  const t = await tradLib.traduzirAssunto(TR, { fetchImpl: fetchOk })
  checa('A14 traduzirAssunto: uma chamada gpt-4o-mini (temperatura 0, JSON) com o pedido; devolve inglês + nomes; vocabularioDoAssunto junta tudo', chamadas.length === 1 && chamadas[0].model === 'gpt-4o-mini' && chamadas[0].temperature === 0 && chamadas[0].response_format?.type === 'json_object' && chamadas[0].messages[1].content === TR && t && t.nomes.join(' ') === 'Ottoman Bayezid I Timur' && tradLib.vocabularioDoAssunto(t).includes('Ottoman Bayezid I Timur'), JSON.stringify(t))
  const tFalha = await tradLib.traduzirAssunto(TR, { fetchImpl: async () => ({ ok: false }) })
  const tErro = await tradLib.traduzirAssunto(TR, { fetchImpl: async () => { throw new Error('rede') } })
  const semChave = await createOfflineLoader({ globals: { setTimeout: () => 0, clearTimeout() {}, AbortController } })('@/lib/cinematic/assuntoTraduzido').traduzirAssunto(TR, { fetchImpl: fetchOk })
  checa('A15 traduzirAssunto falha fechada: 5xx, erro de rede e sem chave = null (o chamador não apaga), nunca lança', tFalha === null && tErro === null && semChave === null)
}

console.log('== B. antes: a lib da base, em memória, saía errada (este guardião era vermelho) ==')
{
  checa('B0 a base do visualPromptPolicy foi lida', typeof baseVpp === 'string' && baseVpp.length > 1000)
  checa('B1 antes: "Istanbul" saía com o pedido "İstanbul"; "Bermuda" saía com "Bermudas"', vppA.scrubInventedSetting('The skyline of Istanbul at dusk', 'Bir gece İstanbul').removed.length === 1 && vppA.scrubInventedSetting('Aerial view of Bermuda at dusk', 'as ilhas Bermudas').removed.length === 1)
  checa('B2 antes: a0b58200 saía "of confidently posing in front of the iconic at sunrise" e "no , no added props"', /of confidently posing in front of the iconic at sunrise/.test(vppA.scrubInventedSetting(UR_V1, UR).text) && /no , no added props|no animals, no , no/.test(vppA.scrubInventedSetting(UR_V1, UR).text) || /inside the bustling, showing with/.test(vppA.scrubInventedSetting(UR_V3, UR).text))
  checa('B3 antes: a fala do 2f3692ff saía "No Oceano, em, um… Em, cientistas… O : uma área"', velho(PT_FALA, PT) === 'No Oceano, em, um submarino desaparece de forma misteriosa, sem deixar quaisquer rastros. Em, cientistas capturam imagens de uma lula gigante nas profundezas do oceano. O : uma área onde navios e aviões desaparecem sem explicação.', velho(PT_FALA, PT))
  checa('B4 antes: a fala do 7ef91122 saía "In the year, a mysterious…"', velho(EN_FALA, EN_PEDIDO).startsWith('In the year, a mysterious'), velho(EN_FALA, EN_PEDIDO))
  checa('B5 antes: a fala do 9de38488 saía "साल पुरानी" sem o número', /चित्रलिपि साल पुरानी/.test(velho(HI_FALA, HI_PEDIDO)), velho(HI_FALA, HI_PEDIDO))
  const rotaBase = base(ROTA)
  checa('B6 antes: a rota montava o contexto do filtro sem tradução e sem "null = não apaga"', typeof rotaBase === 'string' && !rotaBase.includes('contextoDoFiltro') && !rotaBase.includes('traduzirAssunto') && rotaBase.includes("if (typeof v !== 'string' || !v.trim()) continue"))
}

console.log('== C. mutantes ==')
{
  const m1a = carrega((rel, txt) => (rel === VPP ? txt.replace(".normalize('NFD').replace(/[\u0300-\u036f]/g, '')", ".normalize('NFC')") : txt))('@/lib/cinematic/visualPromptPolicy')
  const m1b = carrega((rel, txt) => (rel === VPP ? txt.replace("const emCtx = (b: string) => ctx.has(b) || ctx.has(b + 's') || ctx.has(b + 'es') ||", 'const emCtx = (b: string) => ctx.has(b) || false ||') : txt))('@/lib/cinematic/visualPromptPolicy')
  checa('C1 mutantes "comparação ignora acento" (sem NFD) e "ignora plural" (sem o +s) → İstanbul/Tomás e Bermudas voltam a ser apagados → vermelho', m1a.scrubInventedSetting('The skyline of Istanbul at dusk', 'Bir gece İstanbul').removed.length === 1 && m1a.scrubInventedSetting('Close-up of Tomas writing', 'o Tomás escreve').removed.length === 1 && m1b.scrubInventedSetting('Aerial view of Bermuda at dusk', 'as ilhas Bermudas').removed.length === 1 && vppD.scrubInventedSetting('Aerial view of Bermuda at dusk', 'as ilhas Bermudas').removed.length === 0)
  const m2 = carrega((rel, txt) => (rel === FALA ? txt.replace('if (!temBuracoNaFala(candidata, { numeroRemovido }))', 'if (true)') : txt))('@/lib/cinematic/falaSemBuraco')
  checa('C2 mutante "buraco de volta" (detector desligado) → "In the year," e "O : uma área" reaparecem → vermelho', m2.filtrarFalaSemBuraco(EN_FALA, EN_PEDIDO).texto.startsWith('In the year, a') && /O : uma área/.test(m2.filtrarFalaSemBuraco(PT_FALA, PT).texto))
  const m3 = carrega((rel, txt) => (rel === VPP ? txt.replace("if (kept.length === 0) return restoDoApagao(before, whole.slice(offset + run.length))", '') : txt))('@/lib/cinematic/visualPromptPolicy')
  checa('C3 mutante "restos do apagão" (sem restoDoApagao) → "of confidently posing" volta → vermelho', /of confidently posing/.test(m3.scrubInventedSetting(UR_V1, UR).text))
  const rota = disco(ROTA)
  const semGuarda = rota.replace(" || verbatim) continue // KINEO-META95-ASSUNTO-1910", ') continue // KINEO-META95-ASSUNTO-1910')
  checa('C4 mutante "verbatim alterado" (guarda da varredura final sem `|| verbatim`) → vermelho', rota.includes("if (typeof v !== 'string' || !v.trim() || verbatim) continue // KINEO-META95-ASSUNTO-1910") && semGuarda !== rota && !semGuarda.includes("|| verbatim) continue // KINEO-META95-ASSUNTO-1910"))
  const m5 = carrega((rel, txt) => (rel === TRAD ? txt.replace("if (lang && lang !== 'en') return true", 'if (lang && lang !== \'en\') return false') : txt))('@/lib/cinematic/assuntoTraduzido')
  checa('C5 mutante "tradução ignorada para outra língua" (precisaTraducao devolve false para tr) → vermelho', m5.precisaTraducao(TR, 'tr') === false)
}

console.log('== D. a rota ==')
{
  const rota = disco(ROTA)
  const conta = (s) => rota.split(s).length - 1
  checa('D1 o ajudante contextoDoFiltro existe uma vez, memoizado, com precisaTraducao + traduzirAssunto + vocabularioDoAssunto e a língua do filme', conta('const contextoDoFiltro = async (contexto: string): Promise<string | null> =>') === 1 && conta('let assuntoTraduzidoPromessa: Promise<string | null> | null = null') === 1 && rota.includes('if (!precisaTraducao(contexto, narrationLanguage.language)) return contexto') && rota.includes('if (!assuntoTraduzidoPromessa) assuntoTraduzidoPromessa = traduzirAssunto(contexto)') && rota.includes('return t ? vocabularioDoAssunto(t) : null'))
  checa('D2 os 4 contextos do filtro de imagem passam pelo assunto traduzido (clássico, alinhado, S25 ensaio, hollywood)', conta('const historia = await contextoDoFiltro(comVocabularioDoLugar(') === 1 && conta('const historiaAlinhada = await contextoDoFiltro(comVocabularioDoLugar(') === 1 && conta('const historiaE = await contextoDoFiltro(') === 1 && conta('const historiaH = await contextoDoFiltro(') === 1)
  checa('D3 null = NÃO apaga: as 3 fontes do clássico, o plano alinhado, o S25 e o hollywood pulam o scrub (e a rota avisa)', conta('historia !== null && s.aiPrompt ?') === 1 && conta('historia !== null && s.stockSearchQuery ?') === 1 && conta('historia !== null && s.description ?') === 1 && conta('historiaAlinhada === null ? c.shot :') === 1 && conta('historiaE === null ? c.shot :') === 1 && conta('historiaH === null ? c.shot :') === 1 && rota.includes("if (historia === null) console.warn('[cinematic] KINEO-META95-ASSUNTO: cenario-scrub pulado"))
  checa('D4 a fala escrita pela IA passa por filtrarFalaSemBuraco nos 2 pontos (clássico verbatim=false; varredura final do hollywood com repararExistentes), e a varredura final pula verbatim', conta('const f = filtrarFalaSemBuraco(sc.voiceover, contextoFalaClassica)') === 1 && conta('const f = filtrarFalaSemBuraco(v, contextoDatas, { repararExistentes: true })') === 1 && conta("if (typeof v !== 'string' || !v.trim() || verbatim) continue") === 1 && !rota.includes('removerDatasInventadas(sc.voiceover') && !rota.includes('removerDatasInventadas(v, contextoDatas)'))
  checa('D5 o clássico só filtra a fala no ramo `else` do verbatim (generateScenes), como antes', /\} else \{\s*\n\s*const generated = await generateScenes\([\s\S]{0,2400}const f = filtrarFalaSemBuraco\(sc\.voiceover, contextoFalaClassica\)/.test(rota))
  checa('D6 o evento cinematic_dispatch_result grava subject_translation (precisou/ok/ms/nomes/filtro_pulado)', rota.includes('subject_translation: ctx.assuntoTraduzido ?? null') && rota.includes('assuntoTraduzido?: { precisou: boolean; ok: boolean; ms: number | null; nomes: string[]; filtro_pulado: boolean } | null') && rota.includes("ctxDespacho().assuntoTraduzido = { precisou: true, ok: !!t, ms: t?.ms ?? null, nomes: t?.nomes.slice(0, 20) ?? [], filtro_pulado: !t }"))
  checa('D7 imports em linha própria', rota.includes("import { precisaTraducao, traduzirAssunto, vocabularioDoAssunto } from '@/lib/cinematic/assuntoTraduzido' // KINEO-META95-ASSUNTO-1910") && rota.includes("import { filtrarFalaSemBuraco } from '@/lib/cinematic/falaSemBuraco' // KINEO-META95-ASSUNTO-1910"))
}

console.log('== E. a estrada de sempre ==')
{
  const LUCAS = 'Eram exatamente 3h17 da madrugada quando o telefone de Lucas começou a tocar. Número desconhecido. Ele ignorou. O telefone tocou de novo. Dessa vez, apareceu uma mensagem: Não atenda.'
  const DANIEL = 'Daniel lived alone in his apartment. He installed a security camera above the front door. Police searched his apartment and found a hidden room covered in photos.'
  const visuais = [
    ['A close-up of a vintage black rotary phone from the 1960s, resting on a wooden table in a dimly lit room', LUCAS],
    ['A close-up of a 1970s black Bakelite rotary phone sitting on a cracked marble countertop in a dimly lit, abandoned Victorian home', LUCAS],
    ['A vintage security camera at the entrance of the Amityville House, infamous for paranormal events', DANIEL],
    ["A wide shot of Daniel's apartment door with a security camera above it", DANIEL],
    ['The geologist, Elena Vance, observes the eruption of Mount St. Helens from the observatory', DANIEL],
  ]
  checa('E1 inglês/pt sem escrita estrangeira: o scrub de hoje = o da base, byte a byte, nos casos do vigia (Lucas/Daniel/R19)', visuais.every(([v, c]) => vppD.scrubInventedSetting(v, c).text === vppA.scrubInventedSetting(v, c).text && vppD.scrubInventedSetting(v, c).removed.join('|') === vppA.scrubInventedSetting(v, c).removed.join('|')))
  checa('E2 fala sem nada a tirar = o mesmo objeto de texto; precisaTraducao("en", inglês) = false (nenhuma chamada)', falaD.filtrarFalaSemBuraco(DANIEL, DANIEL).texto === DANIEL && falaD.filtrarFalaSemBuraco(DANIEL, DANIEL).removidas.length === 0 && !tradD.precisaTraducao(DANIEL, 'en'))
  checa('E3 a lib de datas (lib/hollywood/fidelidade.ts) e o router do hollywood não mudaram', base('lib/hollywood/fidelidade.ts') === disco('lib/hollywood/fidelidade.ts') && base('lib/hollywood/router.ts') === disco('lib/hollywood/router.ts'))
}

console.log('== F. desfaz exato, novos, marca, encadeamento ==')
{
  const ARQ = SUP.META95_ASSUNTO_1910_ARQUIVOS
  checa(`F1 cada arquivo tocado, desfeito (scripts/test-support/desfaz-meta95-assunto-1910.mjs), é EXATAMENTE a base ${String(BASE).slice(0, 9)}; os novos existem e não existiam lá`,
    ARQ.length === 27 && ARQ.every((f) => { const b = base(f); return b !== null && lf(SUP.semMeta95Assunto1910(disco(f), f)) === b }) &&
    SUP.META95_ASSUNTO_1910_NOVOS.length === 6 && SUP.META95_ASSUNTO_1910_NOVOS.every((f) => existsSync(join(ROOT, f)) && base(f) === null) && SUP.MARCA_META95_ASSUNTO_1910 === MARCA,
    ARQ.filter((f) => { const b = base(f); try { return b === null || lf(SUP.semMeta95Assunto1910(disco(f), f)) !== b } catch (e) { return true } }).join(', '))
  checa('F2 toda linha nova traz a marca (troca listada inteira, a da base existe lá); a marca não contém as das camadas de antes; contagem errada = erro', (() => {
    const ts = Object.entries(SUP.TROCAS_META95_ASSUNTO_1910)
    return ts.length === 25 && ts.every(([f, l]) => l.every(([nova, antiga]) => nova.includes(MARCA) && !antiga.includes(MARCA) && disco(f).split('\n').includes(nova) && base(f).split('\n').includes(antiga))) &&
      ['KINEO-FILME-RAPIDO-1710', 'KINEO-TRILHA-15S', 'KINEO-MONUMENTO-2026-10-13', 'KINEO-CLOSE-REAL-LEGENDA-1910'].every((m) => !MARCA.includes(m)) &&
      ARQ.every((f) => { const b = new Set(base(f).split('\n')); return disco(f).split('\n').filter((l) => !b.has(l)).every((l) => l.includes(MARCA)) }) &&
      (() => { try { SUP.semMeta95Assunto1910(`${disco(VPP)}\nx // ${MARCA}`, VPP); return false } catch { return true } })() && SUP.semMeta95Assunto1910(`a // ${MARCA}`, 'lib/x.ts') === `a // ${MARCA}`
  })())
  checa('F3 encadeamento: semFilmeRapido1710 (rota) e semTrilha15s1610 (rota + visualPromptPolicy) tiram esta camada PRIMEIRO', (() => {
    const r = disco(ROTA), v = disco(VPP)
    return semFilmeRapido1710(r, ROTA) === semFilmeRapido1710(SUP.semMeta95Assunto1910(r, ROTA), ROTA) && !semFilmeRapido1710(r, ROTA).includes(MARCA) &&
      semTrilha15s1610(v, VPP) === semTrilha15s1610(SUP.semMeta95Assunto1910(v, VPP), VPP) && !semTrilha15s1610(v, VPP).includes(MARCA) && !semTrilha15s1610(r, ROTA).includes(MARCA) &&
      disco('scripts/test-support/desfaz-filme-rapido-1710.mjs').includes('texto = semMeta95Assunto1910(texto, p) // KINEO-META95-ASSUNTO-1910') && disco('scripts/test-support/desfaz-trilha-15s-1610.mjs').includes('s = semMeta95Assunto1910(s, p) // KINEO-META95-ASSUNTO-1910')
  })())
  const contagem = Object.entries(SUP.ACRESCIMOS_META95_ASSUNTO_1910).every(([f, n]) => { const b = new Set(base(f).split('\n')); const trocas = new Set((SUP.TROCAS_META95_ASSUNTO_1910[f] ?? []).map(([nova]) => nova)); return disco(f).split('\n').filter((l) => l.includes(MARCA) && !trocas.has(l) && !b.has(l)).length === n })
  checa('F4 a contagem de acréscimos por arquivo bate com o disco', contagem)
}

console.log(`\n${ok} verificações passaram${falhas.length ? `, ${falhas.length} FALHARAM:` : '.'}`)
for (const f of falhas) console.log('  ✗ ' + f)
process.exit(falhas.length ? 1 : 0)
