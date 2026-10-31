// KINEO-ROSTO-NO-CLIPE-2810 — gera as camadas DESFAZ das entregas de 28/10 deste ramo (diff REVERSO, contexto 3), uma por entrega:
//   node scripts/test-support/generate-rosto-cards-2810-undo.mjs <camada>
// Cada camada vira scripts/test-support/desfaz-<camada>.mjs, autocontida (os blocos ficam no próprio arquivo). `tip` = o commit da
// entrega (null = árvore de trabalho, só enquanto a entrega não foi commitada). Rodar de novo só se a entrega mudar.
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
// KINEO-ROSTO-NO-CLIPE-2810 (interruptor desligado, 28/10): o commit "botão do rosto só interno" mexe SÓ em arquivos que nasceram
// neste ramo (lib/clips/faceRemix.ts e scripts/test-rosto-no-clipe-2810.mjs) — nada que exista em 24ebecdce —, então não tem camada.
export const CAMADAS = {
  // KINEO-DECISOES-PRECO-3110 — a camada MAIS NOVA (31/10): as 4 decisões de preço do fundador ("1 sim, 2 não, 3 sim, 4 sim") —
  // o filme grátis de região só para quem JÁ ganhou (evento até o corte), o pacote avulso no /pricing/parede/exit-intent e o
  // "Save $X/yr" na parede. Base = a main de então (b2b859801), tip = árvore de trabalho até o commit.
  'decisoes-preco-3110': {
    fn: 'semDecisoesPreco3110',
    marca: 'KINEO-DECISOES-PRECO-3110',
    o_que: 'as decisões de preço de 31/10 (filme de região dos já premiados, pacote avulso à vista, Save $X do anual)',
    base: 'b2b859801',
    tip: null,
    arquivos: ['app/api/generate-video-cinematic/route.ts', 'app/(dashboard)/layout.tsx', 'components/RegionPaidOnlyBanner.tsx', 'lib/freeFilmPolicy.ts',
      'components/OneTimeItemOffer.tsx', 'components/ExitIntentOffer.tsx', 'components/offers/ConversionUpgrade.tsx', 'lib/offers/mrrConversion.ts'],
    novos: ['lib/regionFreeFilmGrant.ts', 'scripts/test-decisoes-preco-3110.mjs', 'scripts/test-support/desfaz-decisoes-preco-3110.mjs'],
  },
  // KINEO-DANCA-SEXTOU-3110 — a camada MAIS NOVA (31/10): o Friday Groove (modelo de dança só da casa no remix de rosto) — a rota do /clips
  // passa `house` ao resolvedor e ao GET. lib/clips/faceRemix.ts e scripts/test-rosto-no-clipe-2810.mjs nasceram no ramo (sem camada).
  // Base = a main de então (255b655e3), tip = árvore de trabalho até o commit.
  'danca-sextou-3110': {
    fn: 'semDancaSextou3110',
    marca: 'KINEO-DANCA-SEXTOU-3110',
    o_que: 'o Friday Groove (dança só da casa no remix de rosto) na rota do /clips',
    base: '255b655e3',
    tip: null,
    arquivos: ['app/api/clips/route.ts'],
  },
  // KINEO-RECUSA-BOTAO-3110 — a camada MAIS NOVA (31/10): a recusa do gerador de filme vira botão de 1 clique (rota anexa `fix`,
  // /generate renderiza o botão nas duas telas de erro). Base = a main de então (086255b47), tip = árvore de trabalho até o commit.
  'recusa-botao-3110': {
    fn: 'semRecusaBotao3110',
    marca: 'KINEO-RECUSA-BOTAO-3110',
    o_que: 'o botão de 1 clique das recusas do gerador de filme (fix na resposta da rota + botão nas telas de erro do /generate)',
    base: '086255b47',
    tip: null,
    arquivos: ['app/api/generate-video-cinematic/route.ts', 'app/(dashboard)/generate/GenerateClient.tsx'],
    novos: ['lib/recusaBotao.ts', 'components/RecusaBotao.tsx', 'scripts/test-recusa-botao-3110.mjs', 'scripts/test-support/desfaz-recusa-botao-3110.mjs'],
  },
  // KINEO-VALOR-NO-CHECKOUT-3110 — a camada MAIS NOVA (31/10): o valor na hora de pagar — "≈ N more films like this" na parede
  // de pagamento e no /pricing, "Which plan fits me?", a prova social real e a linha do anual na Stripe na régua de filmes.
  // Base = a main de então (086255b47), tip = árvore de trabalho até o commit.
  'valor-no-checkout-3110': {
    fn: 'semValorNoCheckout3110',
    marca: 'KINEO-VALOR-NO-CHECKOUT-3110',
    o_que: 'o valor na hora de pagar (films like this, plan finder, prova social real, linha do anual na Stripe)',
    base: '086255b4711c998049e7f990318f6ebf40c2abe6',
    tip: null,
    arquivos: ['components/offers/ConversionUpgrade.tsx', 'app/pricing/PricingClient.tsx', 'app/api/stripe/checkout/route.ts'],
    novos: ['lib/valorNoCheckout.ts', 'components/checkout/ValorNoCheckout.tsx', 'app/api/films-made/route.ts', 'scripts/test-valor-no-checkout-3110.mjs'],
  },
  // KINEO-ESTREIA-3110 — a camada MAIS NOVA (31/10): a espera vira a estreia (components/premiere) nas 12 telas de geração.
  // Base = a main de então (51fe3d0e7), tip = árvore de trabalho até o commit.
  'estreia-3110': {
    fn: 'semEstreia3110',
    marca: 'KINEO-ESTREIA-3110',
    o_que: 'a estreia ao vivo (sala de espera + estreia final) nas 12 telas de geração',
    base: '51fe3d0e7e497a46750fb9f468f06dfc0d4b74f1',
    tip: null,
    arquivos: ['app/(dashboard)/ads/v2/AdsV2Client.tsx', 'app/(dashboard)/ads/v2/AdsV2Simple.tsx', 'app/(dashboard)/animate/AnimateClient.tsx',
      'app/(dashboard)/audio/AudioClient.tsx', 'app/(dashboard)/avatar/AvatarStudioClient.tsx', 'app/(dashboard)/clips/ClipsClient.tsx',
      'app/(dashboard)/generate/GenerateClient.tsx', 'app/(dashboard)/images/ImagesClient.tsx', 'app/(dashboard)/spaces/SpacesClient.tsx',
      'app/(dashboard)/studio/StudioClient.tsx', 'app/(dashboard)/thumbnail-generator/ThumbnailGeneratorClient.tsx',
      'components/kidsCartoon/BabyPodcastTemplate.tsx', 'components/kidsCartoon/KidsCartoonTemplate.tsx', 'components/video/useReadyBeacon.ts',
      'lib/videoDownload.ts'],
    novos: ['components/premiere/Premiere.tsx', 'components/premiere/premiere.module.css'],
  },
  // KINEO-ABRACO-BEIJO-3110 — a camada MAIS NOVA (30/10): Abraço/Beijo de 2 fotos na tela do /clips (junção lado a lado, um caminho só de
  // upload) e a borda forte do motor escolhido com vídeo. Base = a main de então (2a0f0b016), tip = árvore de trabalho até o commit.
  'abraco-beijo-3110': {
    fn: 'semAbracoBeijo3110',
    marca: 'KINEO-ABRACO-BEIJO-3110',
    o_que: 'o Abraço/Beijo de 2 fotos no /clips (junção lado a lado) e a borda do motor escolhido',
    base: '2a0f0b016830a4449089c597974c6a76fd6ffcd1',
    tip: null,
    arquivos: ['app/(dashboard)/clips/ClipsClient.tsx'],
  },
  // KINEO-ROSTO-QUADRO-CHAVE-2810 — a camada MAIS NOVA: as duas etapas do remix (quadro-chave Nano Banana + Kling a partir dele), 10 cr,
  // recorte do rosto, /images lendo o 403 da fal. Só os arquivos que já existiam em 24ebecdce (faceRemix.ts e o guardião nasceram no ramo).
  'rosto-quadro-chave-2810': {
    fn: 'semRostoQuadroChave2810',
    marca: 'KINEO-ROSTO-QUADRO-CHAVE-2810',
    o_que: 'o remix do rosto em duas etapas (quadro-chave + vídeo), 10 créditos, recorte do rosto e o /images lendo o erro real da fal',
    base: '796bb74d88379e2ad6c8f17faa6ea80fa4b6675f', // reaplicada em 30/10 sobre a main de então
    tip: null,
    arquivos: ['lib/homeGaleria.ts', 'app/api/clips/route.ts', 'app/(dashboard)/clips/ClipsClient.tsx', 'lib/clips/clipFlow.ts', 'lib/clips/clipServer.ts'] // o /images já está na main desde 28/10,
  },
  // KINEO-FILA-QUEDA-FAL-2810 (ramo codex/fila-queda-fal-2810, base = origin/main 9d6dd2e77): só os arquivos PRÉ-EXISTENTES que a
  // entrega modificou e carregam a marca (a rota cinematic e o cron de resgate); lib/filaQuedaFal*.ts, o cron novo e o guardião
  // nasceram no ramo (sem camada); vercel.json não carrega marca (JSON) e não é selado por guardião algum.
  'fila-queda-fal-2810': {
    fn: 'semFilaQuedaFal2810',
    marca: 'KINEO-FILA-QUEDA-FAL-2810',
    o_que: 'a fila da queda da fal: estacionar em vez de perder, modo serviço na rota, alarme horário, resgate honesto',
    base: '9d6dd2e7708d088724a6c7a0880bd45212f8ee40',
    tip: null,
    arquivos: ['app/api/generate-video-cinematic/route.ts', 'app/api/cron/send-failure-recovery/route.ts', 'vercel.json'],
    // vercel.json é JSON (não carrega a marca): o bloco do cron novo é a própria prova — presente, sai; ausente, volta igual.
    semMarca: ['vercel.json'],
    // Nascidos no ramo: entram em ARQUIVOS (inventários de guardiões antigos, ex. a fronteira de API do test-em-alta-2610) sem hunk.
    novos: ['app/api/cron/resume-parked-renders/route.ts', 'lib/filaQuedaFal.ts', 'lib/filaQuedaFalServer.ts', 'scripts/test-fila-queda-fal-2810.mjs', 'scripts/test-support/desfaz-fila-queda-fal-2810.mjs'],
  },
  'rosto-ajuste-2810': {
    fn: 'semRostoAjuste2810',
    marca: 'KINEO-ROSTO-AJUSTE-2810',
    o_que: 'o ajuste do remix no /clips: foto obrigatória dita na tela',
    base: '563542621',
    tip: '85dcf23db',
    arquivos: ['app/(dashboard)/clips/ClipsClient.tsx'],
  },
  'menu-uniforme-2810': {
    fn: 'semMenuUniforme2810',
    marca: 'KINEO-MENU-UNIFORME-2810',
    o_que: 'o menu do topo uniforme (home sem sublinhado/peso extra; cabeçalho claro sem cinza nem azul)',
    base: '1293fcb9f',
    tip: '563542621',
    arquivos: ['app/kineoLandingTheme.ts', 'app/examples/ExamplesGallery.module.css'],
  },
  'galeria-cheia-2810': {
    fn: 'semGaleriaCheia2810',
    marca: 'KINEO-GALERIA-CHEIA-2810',
    o_que: 'a galeria Made with Kineo cheia (tudo de cara, última fileira completa) e sem os filmes com usekineo.com/free',
    base: '49aa28d2c',
    tip: '1293fcb9f',
    arquivos: ['lib/homeGaleria.ts', 'lib/homeGaleriaItems.ts', 'components/KineoHouseGallery.tsx'],
  },
  'cards-rosto-2810': {
    fn: 'semCardsRosto2810',
    marca: 'KINEO-CARDS-ROSTO-2810',
    o_que: 'os cards 1, 2 e 4 da home: lobisomem, relógio no lugar do perfume, 3 desenhos de Halloween',
    base: '24ebecdcea27bf2896856d412e417211c39eed6b',
    tip: 'd22214ddf',
    arquivos: ['lib/ui/homeThreeCards.ts'],
  },
  'rosto-no-clipe-2810': {
    fn: 'semRostoNoClipe2810',
    marca: 'KINEO-ROSTO-NO-CLIPE-2810',
    o_que: 'o botão "Put your face in it" (remix do clipe da casa com a foto da pessoa)',
    base: '24ebecdcea27bf2896856d412e417211c39eed6b',
    tip: 'b7018237a',
    arquivos: ['lib/homeGaleria.ts', 'lib/homeGaleriaItems.ts', 'app/api/clips/route.ts', 'components/KineoHouseGallery.tsx', 'components/home/HomeClipsStrip.tsx', 'app/(dashboard)/clips/ClipsClient.tsx'],
  },
}

function hunksOf(c, rel) {
  const args = ['-C', ROOT, '-c', 'core.autocrlf=true', 'diff', '-U3', '--no-color', c.base, ...(c.tip ? [c.tip] : []), '--', rel]
  const diff = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r\n/g, '\n')
  const hunks = []
  let cur = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) { cur = { before: [], now: [] }; hunks.push(cur); continue }
    if (!cur || line.startsWith('\\')) continue
    if (line.startsWith(' ')) { cur.before.push(line.slice(1)); cur.now.push(line.slice(1)) }
    else if (line.startsWith('-')) cur.before.push(line.slice(1))
    else if (line.startsWith('+')) cur.now.push(line.slice(1))
  }
  return hunks.map((h) => ({ before: h.before.join('\n'), now: h.now.join('\n') }))
}

const nome = process.argv[2]
const c = CAMADAS[nome]
if (!c) { console.error('camada desconhecida: ' + nome + ' (' + Object.keys(CAMADAS).join(', ') + ')'); process.exit(1) }
const files = {}
for (const rel of c.arquivos) files[rel] = hunksOf(c, rel)
const K = c.fn
const out = `// ${c.marca} — DESFAZ, em memória, esta entrega (${c.o_que}) nos arquivos que ela MODIFICOU, para os guardiões que
// conferem arquivos BYTE A BYTE contra uma base anterior. Diff REVERSO exato (contexto 3, gerado por generate-rosto-cards-2810-undo.mjs
// ${nome}): cada bloco de AGORA (moldurado por quebras de linha) aparece UMA vez e volta a ser o de ANTES. Arquivo fora da lista ou sem
// a marca volta igual. Camadas mais novas do mesmo arquivo saem ANTES desta.
export const MARCA = '${c.marca}'
export const BASE = '${c.base}'
const DESFAZ = ${JSON.stringify(files)}
/** Arquivos sem lugar para a marca (JSON): o 1º bloco de AGORA presente = a camada está lá; ausente = volta igual. */
const SEM_MARCA = new Set(${JSON.stringify(c.semMarca ?? [])})
/** Nascidos nesta entrega (sem hunk): listados para inventários de guardiões antigos; o desfaz devolve o texto intacto. */
export const NOVOS = ${JSON.stringify(c.novos ?? [])}
export const ARQUIVOS = [...Object.keys(DESFAZ), ...NOVOS]
export function ${K}(text, rel) {
  if (typeof text !== 'string') return text
  const original = text
  const chave = String(rel ?? '').replace(/\\\\/g, '/').replace(/^\\.\\//, '')
  const hunks = DESFAZ[chave]
  if (!hunks) return original
  if (SEM_MARCA.has(chave) ? !original.replace(/\\r\\n/g, '\\n').includes(hunks[0].now) : !original.includes(MARCA)) return original
  const crlf = original.includes('\\r\\n')
  let s = '\\n' + original.replace(/\\r\\n/g, '\\n') + '\\n'
  for (const h of hunks) {
    const parts = s.split('\\n' + h.now + '\\n')
    if (parts.length !== 2) throw new Error('${K}: ' + rel + ' mudou fora da camada (' + (parts.length - 1) + 'x)')
    s = parts.join('\\n' + h.before + '\\n')
  }
  s = s.slice(1, -1)
  if (s.includes(MARCA)) throw new Error('${K}: sobrou linha marcada em ' + rel)
  return crlf ? s.replace(/\\n/g, '\\r\\n') : s
}
`
writeFileSync(path.join(ROOT, `scripts/test-support/desfaz-${nome}.mjs`), out)
console.log('ok', nome, Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.length])))
