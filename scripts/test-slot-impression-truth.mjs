// KINEO-SLOT-IMPRESSAO-DIZ-A-VERDADE-2026-09-07 — o NOME do evento de impressao
// do slot pos-entrega tem de vir do MESMO lugar que decide o JSX.
// Sem rede, sem banco, sem credencial, sem escrita fora de /tmp.
//
// O DEFEITO QUE ESTE GUARDIAO IMPEDE DE VOLTAR (medido em producao, 07/09):
// a fv-r5 (`fa09b1eb`, 17:50 BRT) fez o JSX escolher a superficie por
// `decidePostDeliverySlot` — filme com marca d'agua na mao => a pergunta
// comercial ganha o slot. O efeito da impressao continuou escolhendo o NOME do
// evento pela precedencia ANTIGA (ponte -> episodio -> pergunta). No caso que a
// fv-r5 criou (ponte elegivel + filme marcado) a tela mostrava a PERGUNTA e o
// evento saia `trial_balance_bridge_viewed`.
// Efeito colateral medido: 143 entregas pessoa-dia em 7d liam ponte 78 /
// episodio 20 / pergunta 7 — numeros sobre os quais se decide se a porta de $1
// esta sendo vista.
//
// O guardiao amarra o contrato as VARIAVEIS que decidem (memoria:
// guardiao-contar-texto-nao-prova-condicao), le com CRLF normalizado (memoria:
// guardiao-crlf-falso-vermelho) e cada mutante PROVA que a mutacao foi escrita
// antes de exigir vermelho (memoria: mutacao-precisa-provar-que-aplicou).

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT_PATH = join(root, 'app/(dashboard)/generate/GenerateClient.tsx')
const SLOT_PATH = join(root, 'lib/growth/postDeliverySlot.ts')

// `.gitattributes` entrega estes arquivos com \r\n no Windows. Ancora que
// atravessa duas linhas nunca casaria — e o vermelho falso treina gente a
// ignorar guardiao.
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
const check = (name, cond) => {
  if (cond) { pass += 1 } else { fail += 1; console.error(`  FALHOU: ${name}`) }
}

// ─── As verificacoes, aplicadas a um TEXTO — para poder rodar nos mutantes ───
function contract(client) {
  const results = []
  const t = (name, cond) => results.push([name, Boolean(cond)])

  // 1. A ponte existe e e um ref (o `const` mora ~6.000 linhas abaixo: TDZ).
  t('declara postDeliverySlotOwnerRef',
    /const postDeliverySlotOwnerRef = useRef<PostDeliverySlotOwner \| null>\(null\)/.test(client))

  // 2. O ref e escrito NO RENDER, imediatamente depois do `const` que o JSX usa.
  //    Um `useEffect` de sincronia rodaria DEPOIS do efeito que registra o
  //    IntersectionObserver — a callback poderia ler o ref vazio.
  const writeAfterConst =
    /const postDeliverySlotOwner = decidePostDeliverySlot\(\{[\s\S]{0,400}?\}\)\n(?:\s*\/\/[^\n]*\n)*\s*postDeliverySlotOwnerRef\.current = postDeliverySlotOwner/
  t('o ref e escrito no render, colado no const que o JSX usa', writeAfterConst.test(client))
  t('nao ha useEffect sincronizando o ref (ordem de efeito nao e garantida)',
    !/useEffect\(\(\) => \{\s*postDeliverySlotOwnerRef\.current/.test(client))

  // 3. A callback do observer BRANCHA nas variaveis derivadas do ref — nunca
  //    mais na precedencia antiga.
  t('o efeito le o ref numa variavel local',
    /const renderedSlotOwner = postDeliverySlotOwnerRef\.current/.test(client))
  t('impressionIsBridge deriva do dono renderizado',
    /const impressionIsBridge = renderedSlotOwner !== null\n\s*\? renderedSlotOwner === 'balance_bridge'/.test(client))
  t('impressionIsEpisode deriva do dono renderizado',
    /const impressionIsEpisode = renderedSlotOwner !== null\n\s*\? renderedSlotOwner === 'repeat_episode'/.test(client))
  t('a callback ramifica em impressionIsBridge',
    /trialPostVideoOfferTrackedKeyRef\.current = offerImpressionKey\n\s*if \(impressionIsBridge\) \{/.test(client))
  t('a callback ramifica em impressionIsEpisode',
    /if \(impressionIsEpisode\) \{\n\s*trackEvent\('trial_repeat_episode_viewed'/.test(client))

  // 4. A precedencia ANTIGA nao pode sobreviver ao lado da nova dentro da
  //    callback (foi assim que as duas divergiram por 5 horas).
  t('a guarda antiga da ponte nao decide mais o evento',
    !/if \(balanceBridgeForImpression\.eligible\) \{\n\s*trackEvent\('trial_balance_bridge_viewed'/.test(client))
  t('a guarda antiga do episodio nao decide mais o evento',
    !/if \(repeatForImpression\.action === 'episode'\) \{\n\s*trackEvent\('trial_repeat_episode_viewed'/.test(client))

  // 5. A chave de deduplicacao usa a MESMA decisao do evento. Divergir aqui
  //    faria a impressao ser contada sob a variante da superficie errada.
  t('a chave de dedupe usa impressionIsBridge/impressionIsEpisode',
    /const impressionVariant = impressionIsBridge\n[\s\S]{0,160}?: impressionIsEpisode\n/.test(client))

  // 6. Carimbo do deploy nos TRES eventos — sem ele nao da para separar as
  //    linhas conferidas das antigas por nada que nao seja relogio.
  const stamps = client.match(/slot_owner: renderedSlotOwner \?\? 'unknown',/g) || []
  t('os tres eventos do slot carregam slot_owner', stamps.length === 3)

  // 7. O comportamento antigo continua sendo o fallback quando o ref esta vazio
  //    — nenhuma impressao pode ser PERDIDA por causa deste conserto.
  t('fallback preserva a precedencia antiga quando o ref esta vazio',
    /: balanceBridgeForImpression\.eligible/.test(client) &&
    /: repeatForImpression\.action === 'episode'/.test(client))

  return results
}

console.log('── contrato: a impressao do slot diz a verdade ──')
const client = read(CLIENT_PATH)
for (const [name, ok] of contract(client)) check(name, ok)

// ─── O JSX e o evento tem de ler a MESMA decisao ────────────────────────────
console.log('── o JSX e o evento leem a mesma fonte ──')
check('o JSX da ponte e guardado por postDeliverySlotOwner',
  /\{postDeliverySlotOwner === 'balance_bridge' && \(/.test(client))
check('o JSX da pergunta comercial e guardado por postDeliverySlotOwner',
  /\{postDeliverySlotOwner === 'commercial_ask' && \(/.test(client))
check('o episodio tambem sai do mesmo dono',
  /const showTrialRepeatEpisode = postDeliverySlotOwner === 'repeat_episode'/.test(client))
check('o modulo do slot exporta o tipo importado pelo ref',
  /export type PostDeliverySlotOwner/.test(read(SLOT_PATH)))
check('o cliente importa o tipo da fonte unica',
  /import \{ decidePostDeliverySlot, type PostDeliverySlotOwner \} from '@\/lib\/growth\/postDeliverySlot'/.test(client))

// ─── Mutacao: cada guarda precisa de dentes ─────────────────────────────────
// Cada mutante PROVA que foi escrito (conteudo diferente do original) antes de
// exigir que o contrato fique vermelho. Mutante que nao aplica devolve verde e
// se le como guardiao resistindo.
console.log('── mutantes ──')
const mutants = [
  ['reverter a ramificacao da ponte para a precedencia antiga',
    (s) => s.replace('if (impressionIsBridge) {', 'if (balanceBridgeForImpression.eligible) {')],
  ['reverter a ramificacao do episodio para a precedencia antiga',
    (s) => s.replace('if (impressionIsEpisode) {', "if (repeatForImpression.action === 'episode') {")],
  ['apagar a escrita do ref no render',
    (s) => s.replace('  postDeliverySlotOwnerRef.current = postDeliverySlotOwner\n', '')],
  ['cravar impressionIsBridge em true (texto intacto, condicao morta)',
    (s) => s.replace(
      "const impressionIsBridge = renderedSlotOwner !== null\n      ? renderedSlotOwner === 'balance_bridge'",
      'const impressionIsBridge = true\n      ? true')],
  ['tirar o carimbo slot_owner dos eventos',
    (s) => s.replace(/\s*slot_owner: renderedSlotOwner \?\? 'unknown',/g, '')],
  ['desfazer a chave de dedupe (voltar a variante antiga)',
    (s) => s.replace('const impressionVariant = impressionIsBridge',
      'const impressionVariant = balanceBridgeForImpression.eligible')],
]

for (const [name, mutate] of mutants) {
  const mutated = mutate(client)
  if (mutated === client) {
    fail += 1
    console.error(`  FALHOU: mutante NAO FOI ESCRITO (ancora nao casou): ${name}`)
    continue
  }
  const broke = contract(mutated).some(([, ok]) => !ok)
  check(`mutante derruba o contrato: ${name}`, broke)
}

console.log(`\n${pass} verificacoes OK, ${fail} falha(s)`)
process.exit(fail === 0 ? 0 : 1)
