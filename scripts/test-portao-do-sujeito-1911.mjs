// KINEO-PORTAO-DO-SUJEITO-1911 · B1(a) [CEO 19/11] — o sujeito obrigatório do Kling 4 grátis passa a usar a ideia original quando o roteiro literal é do NOSSO
// escritor e quando a ideia é longa; roteiro colado pelo cliente continua de fora. Node puro, sem rede: executa a lib REAL (pedidoOriginalDoSujeito e o
// embrulho pedidoOriginalDoSujeito1911) nas formas dos casos reais de 14 dias (banco, 19/11: 36 "roteiro_da_pessoa" = 14 do nosso escritor + 22 colados;
// 26 "ideia_original_invalida" = todas nossas, média 1.194 caracteres, 2 com colchete/cabeçalho) e confere a ligação na rota. Mutantes no fim.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')
const LIB = 'lib/cinematic/sujeitoObrigatorio.ts', ROTA = 'app/api/generate-video-cinematic/route.ts'
const ROTEIRO = 'HOOK: [Pexels: luxury restaurant exterior] A white lion desperately looks for work.\n\nPAYOFF: [Pexels: blue lion offering job] Leon, a billionaire, sees Aaron and doubles his salary.'
const FALAS = ['A white lion desperately looks for work.', 'Leon, a billionaire, sees Aaron and doubles his salary.']
const frase = 'A poor white lion called Aaron walks into a luxury restaurant looking for a job, and the rich customers laugh at him while he waits. '
const IDEIA_LONGA = (frase.repeat(14)).trim() // ~1.800 caracteres: acima do corte de 1.500 (as 26 "inválidas": média 1.194, 5 acima de 1.500)
const IDEIA_CURTA = 'A poor white lion looks for a job in a luxury restaurant.'

async function prova(over = {}) {
  const p = []
  const no = (ruim, msg) => { if (ruim) p.push(msg) }
  let S
  try { S = createOfflineLoader({ source: (rel, src) => over[rel] ?? src })('@/' + LIB) } catch (e) { return [`lib não carrega: ${e.message}`] }
  const base = (o) => ({ prompt: ROTEIRO, ideiaSolta: false, scriptMode: 'verbatim', originalIdea: IDEIA_LONGA, falas: FALAS, ...o })
  const novo = (o, ctx) => S.pedidoOriginalDoSujeito1911({ ...base(o), portao: true, roteiroDoEscritor: true, ...ctx })
  no(S.PORTAO_DO_SUJEITO_1911 !== 'internal', "A0 estado de publicação: 'internal' (só a conta exata do ensaio); 'public' só com revisor independente + prova paga + sim do dono")
  { const rr = over[ROTA] ?? read(ROTA)
    no(!rr.includes("(isDryRunAccount(user.email) && body.k4_gratis_ensaio === true && (body as { k4_roteiro_do_escritor?: unknown }).k4_roteiro_do_escritor === true)"), 'A0b só a conta exata do ensaio, no modo ensaio (dry_run ou a prova paga), declara "roteiro do nosso escritor" (cliente nunca)') }
  no(S.portaoDoSujeitoLigado('internal', false) || !S.portaoDoSujeitoLigado('internal', true) || !S.portaoDoSujeitoLigado('public', false) || S.portaoDoSujeitoLigado('off', true), 'A1 off | internal (só a casa) | public')
  // desligado = o de sempre, byte a byte, em todas as formas
  for (const o of [{}, { originalIdea: IDEIA_CURTA }, { scriptMode: 'ai' }, { scriptMode: 'ai', originalIdea: IDEIA_CURTA }, { originalIdea: null }, { ideiaSolta: true, prompt: IDEIA_CURTA, scriptMode: 'ai' }])
    no(JSON.stringify(S.pedidoOriginalDoSujeito1911({ ...base(o), portao: false, roteiroDoEscritor: true })) !== JSON.stringify(S.pedidoOriginalDoSujeito(base(o))), `B0 desligado = pedidoOriginalDoSujeito (${JSON.stringify(Object.keys(o))})`)
  // (1) os 14: roteiro literal do NOSSO escritor, ideia longa → entra
  const r1 = novo({})
  no(!r1.pedido || r1.fonte !== 'ideia_original' || r1.motivo !== 'ideia_longa_do_escritor' || r1.pedido.length > S.PEDIDO_LONGO_MAX, `B1 roteiro do nosso escritor + ideia longa: entra, cortada (${r1.motivo}, ${r1.pedido?.length})`)
  no(!/[.!?]$/.test(r1.pedido ?? ''), 'B1b o corte cai em fronteira de frase')
  const r1c = novo({ originalIdea: IDEIA_CURTA })
  no(r1c.pedido !== IDEIA_CURTA || r1c.motivo !== 'ideia_original_do_escritor', `B2 roteiro do nosso escritor + ideia curta: a ideia de sempre (${r1c.motivo})`)
  // (2) os 22: roteiro colado pelo cliente → continua de fora
  for (const ideia of [IDEIA_LONGA, IDEIA_CURTA, null]) {
    const r = novo({ originalIdea: ideia }, { roteiroDoEscritor: false })
    no(r.pedido !== null || r.motivo !== 'roteiro_da_pessoa', `B3 roteiro colado pelo cliente: continua de fora (${r.motivo})`)
  }
  // (3) as 26: ideia longa no roteiro do Studio (não literal) → entra
  const r3 = novo({ scriptMode: 'ai' }, { roteiroDoEscritor: false })
  no(!r3.pedido || r3.motivo !== 'ideia_longa', `B4 ideia longa (não literal): entra (${r3.motivo})`)
  // nunca roteiro como pedido; nunca texto gigante; a fala que discorda continua barrando
  no(novo({ scriptMode: 'ai', originalIdea: IDEIA_LONGA + ' [Pexels: lion]' }).pedido !== null, 'B5 ideia com colchete [Pexels] = roteiro: fora')
  no(novo({ scriptMode: 'ai', originalIdea: 'HOOK: a lion\n' + IDEIA_LONGA }).pedido !== null, 'B6 ideia com cabeçalho de seção = roteiro: fora')
  no(novo({ scriptMode: 'ai', originalIdea: 'x '.repeat(2100) }).pedido !== null, 'B7 acima de 4.000 caracteres: fora')
  const disc = novo({ scriptMode: 'ai', originalIdea: ('A spaceship crew explores a frozen planet orbiting a dying star far away. ').repeat(8), falas: FALAS })
  no(disc.pedido !== null || disc.motivo !== 'ideia_original_discorda_da_fala', `B8 ideia longa que discorda da fala: fora (${disc.motivo})`)
  no(novo({ scriptMode: 'ai', originalIdea: null }).motivo !== 'sem_pedido_original', 'B9 sem ideia: o de sempre')
  // ── C · a rota ──
  const rota = over[ROTA] ?? read(ROTA)
  no(!rota.includes('const portaoDoSujeito1911 = portaoDoSujeitoLigado(PORTAO_DO_SUJEITO_1911, isDryRunAccount(user.email))'), 'C1 o portão pelo interruptor e pela régua EXATA do ensaio (isDryRunAccount)')
  no(!rota.includes('const roteiroDoEscritor1911 = portaoDoSujeito1911 ? (Boolean(await recuperarIdeiaDoEscritor(user.id, body.prompt)) ||'), 'C2 "roteiro do nosso escritor" = o script_written casado, lido só com o portão ligado')
  no(!rota.includes('? pedidoOriginalDoSujeito1911({ portao: portaoDoSujeito1911, roteiroDoEscritor: roteiroDoEscritor1911, prompt: intake.text,'), 'C3 o Kling 4 grátis usa o embrulho com os dois sinais')
  return p
}

const MUT = [
  ['portão público', LIB, (s) => s.replace("export const PORTAO_DO_SUJEITO_1911: 'off' | 'internal' | 'public' = 'internal'", "export const PORTAO_DO_SUJEITO_1911: 'off' | 'internal' | 'public' = 'public'")],
  ['rota: declaração do escritor fora do modo ensaio', ROTA, (s) => s.replace('(isDryRunAccount(user.email) && body.k4_gratis_ensaio === true && (body as { k4_roteiro_do_escritor?: unknown })', '(isDryRunAccount(user.email) && (body as { k4_roteiro_do_escritor?: unknown })')],
  ['rota: declaração do escritor de qualquer conta', ROTA, (s) => s.replace('(isDryRunAccount(user.email) && body.k4_gratis_ensaio === true && (body as { k4_roteiro_do_escritor?: unknown })', '(body.k4_gratis_ensaio === true && (body as { k4_roteiro_do_escritor?: unknown })')],
  ['internal para todos', LIB, (s) => s.replace("return modo === 'public' || (modo === 'internal' && contaDaCasa === true)\n}\n/** A ideia longa", "return modo !== 'off'\n}\n/** A ideia longa")],
  ['abre roteiro colado', LIB, (s) => s.replace("base.motivo === 'roteiro_da_pessoa' && args.roteiroDoEscritor ?", "base.motivo === 'roteiro_da_pessoa' ?")],
  ['aceita colchete', LIB, (s) => s.replace("if (!t || t.length > 4000 || /[[\\]]/.test(t) || CABECALHO_DE_SECAO.test(String(ideia ?? ''))) return null", "if (!t || t.length > 4000 || CABECALHO_DE_SECAO.test(String(ideia ?? ''))) return null")],
  ['aceita cabeçalho', LIB, (s) => s.replace(" || CABECALHO_DE_SECAO.test(String(ideia ?? ''))) return null", ') return null')],
  ['sem teto de 4000', LIB, (s) => s.replace('if (!t || t.length > 4000 ||', 'if (!t ||')],
  ['sem o corte de 1500', LIB, (s) => s.replace('if (t.length <= PEDIDO_LONGO_MAX) return t\n', 'return t\n')],
  ['ignora a fala que discorda', LIB, (s) => s.replace("  if (temaDiscordaDaFala(longo, (args.falas ?? []).join(' '))) return { pedido: null, fonte: null, motivo: 'ideia_original_discorda_da_fala' }\n", '')],
  ['desligado muda', LIB, (s) => s.replace('  if (!args.portao) return base\n', '')],
  ['rota: lê o banco sem o portão', ROTA, (s) => s.replace('const roteiroDoEscritor1911 = portaoDoSujeito1911 ? (Boolean(await recuperarIdeiaDoEscritor(user.id, body.prompt)) ||', 'const roteiroDoEscritor1911 = true ? (Boolean(await recuperarIdeiaDoEscritor(user.id, body.prompt)) ||')],
  ['rota: sem o sinal do escritor', ROTA, (s) => s.replaceAll('roteiroDoEscritor: roteiroDoEscritor1911, prompt: intake.text,', 'roteiroDoEscritor: true, prompt: intake.text,')],
]
const p0 = await prova()
if (p0.length) { console.error('FAIL test-portao-do-sujeito-1911:\n  ' + p0.join('\n  ')); process.exit(1) }
const vivos = []
for (const [nome, arq, f] of MUT) { const o = read(arq), m = f(o); if (m === o) { vivos.push(`${nome} (não pegou a fonte)`); continue } if (!(await prova({ [arq]: m })).length) vivos.push(nome) }
if (vivos.length) { console.error('FAIL test-portao-do-sujeito-1911: mutantes vivos:\n  ' + vivos.join('\n  ')); process.exit(1) }
console.log(`PASS test-portao-do-sujeito-1911 (${MUT.length} mutantes mortos)`)
