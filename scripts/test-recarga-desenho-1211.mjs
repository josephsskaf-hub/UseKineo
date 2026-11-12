// KINEO-RECARGA-DESENHO-1211 — guardião: no /kids-cartoon, o assinante sem saldo vê o MESMO aviso de recarga/troca do Studio
// (SubscriberUpgradeNudge), no lugar do link de planos; quem não assina segue na porta de planos. Origem: o único assinante novo
// (Starter, desenho infantil) ficou com 8 créditos (35 s custa 21; 15 s custa 9) e o desenho só lhe mostrava "You need N credits"
// + o link de planos — a recarga de 60 por US$ 9 (RECARGA_ASSINANTE_1111_RELEASE='public') nunca aparecia no caminho dele.
// Prova: (1) o aviso aparece antes do clique (custo > saldo) e depois do 402, só para quem tem plano no desenho e está logado;
// (2) quem decide se pinta é o servidor (o componente de sempre; nenhuma regra, preço ou texto novo aqui); (3) o link de planos só sai
// quando o aviso PINTOU (onShown) — sem aviso, fica como hoje; (4) a porta "só com plano" de quem não assina intocada; (5) nada começa
// sozinho (o aviso não chama make/write). Rodar: node scripts/test-recarga-desenho-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const TPL = 'components/kidsCartoon/KidsCartoonTemplate.tsx'
const NUDGE = 'components/billing/SubscriberUpgradeNudge.tsx'
const SRC = { [TPL]: rd(TPL), [NUDGE]: rd(NUDGE) }

function battery(src) {
  const p = []
  const t = src[TPL]
  if (!t.includes("import SubscriberUpgradeNudge from '@/components/billing/SubscriberUpgradeNudge'")) p.push('o desenho não usa o aviso de sempre')
  const i = t.indexOf('<SubscriberUpgradeNudge surface="kids_cartoon_sem_saldo"')
  if (i < 0) return [...p, 'o aviso não está no desenho']
  const antes = t.slice(t.lastIndexOf('{', t.lastIndexOf('?', i)) - 200, i)
  if (!antes.includes("{!semPlano && !visitante && (costLine.enough === false || (stage === 'failed' && needPlans)) ? (")) p.push('o aviso não está preso a "tem plano", "logado" e "sem saldo antes do clique ou depois do 402"')
  const tag = t.slice(i, t.indexOf('/>', i) + 2)
  if (!tag.includes(' topup ')) p.push('o aviso não oferece a recarga (topup)')
  if (!tag.includes('onShown={() => setRecargaPintou(true)}')) p.push('o link de planos não sabe se o aviso pintou')
  if (/make\(|write\(|postJson|generate-video-cinematic/u.test(tag)) p.push('o aviso dispara geração (nada pode começar sozinho)')
  if (/\$\s?\d|US\$|credits for|60 credits/u.test(tag)) p.push('preço ou texto de oferta digitado no desenho (tem de vir do aviso/servidor)')
  if (!t.includes("{recargaPintou ? null : <Link className=\"kkc-go kkc-big\" href={KIDS_PLANS_PATH} onClick={() => { void trackEvent('kids_cartoon_plans_clicked', { credits: cost, balance, duration }) }}>")) p.push('o link de planos antes do clique não cede o lugar ao aviso (ou sumiu sem o aviso)')
  if (!t.includes("{stage === 'failed' && needPlans && !recargaPintou ? <p className=\"kkc-note\"><Link className=\"kkc-ghost\" href={KIDS_PLANS_PATH}>{t.plans}</Link></p> : null}")) p.push('o link de planos depois do 402 não cede o lugar ao aviso')
  if (!t.includes('const [recargaPintou, setRecargaPintou] = useState(false)')) p.push('o link de planos começa escondido (sem aviso, o assinante ficaria sem saída)')
  // a porta de quem não assina, intocada
  if (!t.includes("{semPlano && !visitante ? <button type=\"button\" className=\"kkc-go kkc-big\" data-kineo=\"kids-ver-planos\" onClick={irAosPlanos}>")) p.push('a porta "só com plano" de quem não assina mudou')
  // o aviso de sempre: o servidor decide; interruptor e rota intactos
  const n = src[NUDGE]
  if (!n.includes('fetch(`${RECARGA_ASSINANTE_API}?surface=${encodeURIComponent(surface)}`')) p.push('o aviso deixou de perguntar ao servidor')
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS desenho: assinante sem saldo vê o aviso de recarga (servidor decide) no lugar do link de planos; quem não assina segue na porta' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['aviso para quem não assina', muta(TPL, "{!semPlano && !visitante && (costLine.enough === false", "{!visitante && (costLine.enough === false")],
  ['só depois do 402', muta(TPL, "(costLine.enough === false || (stage === 'failed' && needPlans)) ? (", "(stage === 'failed' && needPlans) ? (")],
  ['sem recarga', muta(TPL, '<SubscriberUpgradeNudge surface="kids_cartoon_sem_saldo" topup idea=', '<SubscriberUpgradeNudge surface="kids_cartoon_sem_saldo" idea=')],
  ['link começa escondido', muta(TPL, 'const [recargaPintou, setRecargaPintou] = useState(false)', 'const [recargaPintou, setRecargaPintou] = useState(true)')],
  ['link não cede', muta(TPL, 'onShown={() => setRecargaPintou(true)}', 'onShown={() => undefined}')],
  ['começa sozinho', muta(TPL, 'onChoice={() => guardarRascunhoDoDesenho({ character, idea, ideaId, language, duration })}', 'onChoice={() => { void make() }}')],
  ['preço digitado', muta(TPL, '<SubscriberUpgradeNudge surface="kids_cartoon_sem_saldo" topup idea={idea.trim() || null}', '<SubscriberUpgradeNudge surface="kids_cartoon_sem_saldo" topup idea={"60 credits for US$ 9"}')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
