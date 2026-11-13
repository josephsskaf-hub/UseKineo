// KINEO-IDEIA-VIAJA-1311 [CEO 13/11, dono 16:42: "as notas dos filmes que a gente dá de trial subam"] — guardião sem rede e sem custo.
// (1) A cabeça gravada de 200 caracteres que termina em espaço ("…MICRO REWARD ") casa pelo começo: o trim a encurtava para 199, ela virava
//     "roteiro curto" e exigia o texto inteiro igual — 7 dos 38 filmes grátis do Kling 4 de 7 dias (d5f666ce, 441c0b99, 57b21b25…) não
//     casavam por isso (26 → 32 de 38 com o conserto). Cabeça curta de verdade continua exigindo o mesmo texto.
// (2) Todo filme grava film_idea_status: origem tela / recuperada / ausente e "a tela mandou o próprio roteiro como ideia"; a rota grava DEPOIS
//     da recuperação e ANTES da cópia estacionada, uma vez.
// Mutantes: tamanho pelo trim (o defeito) · origem trocada · sinal de roteiro desligado · rota sem o evento · evento antes da recuperação.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ESC = 'lib/cinematic/ideiaDoEscritor1311.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const ler = (f) => readFileSync(f, 'utf8')
const AGORA = Date.parse('2026-11-13T12:00:00Z')
const IDEIA = 'A short film about Mara, a young security guard, in an old elevator at 3:03 AM.'
// a forma real de d5f666ce: o roteiro despachado e um script_head de 200 caracteres terminado em espaço
const ROTEIRO = 'HOOK: [Pexels: elevator interior closeup] At 3:03 AM, Mara enters an old elevator.\n\nMICRO REWARD 2: [Pexels: flickering elevator lights] She presses it. The lights flicker. A whisper echoes, “Welcome back, Mara.”\n\nPAYOFF: [Pexels: dark corridor] The doors open onto her own apartment.'
const evento = (head, minutos = 2) => ({ created_at: new Date(AGORA - minutos * 60_000).toISOString(), metadata: { original_idea: IDEIA, script_head: head } })

function problemas(mut = {}) {
  const p = []
  const L = createOfflineLoader({ source: (rel, t) => { const k = rel.replace(/\\/g, '/'); return mut[k] ? mut[k](t) : t } })
  const E = L(ESC)
  // (1) a cabeça de 200 que termina em espaço
  let head = ROTEIRO.slice(0, 200)
  if (!head.endsWith(' ')) { head = ROTEIRO.slice(0, 199) + ' '; if (head.length !== 200) p.push('(1) montagem do caso falhou') }
  const roteiroDoCaso = head + ROTEIRO.slice(200)
  if (E.ideiaDoRoteiroEscrito(roteiroDoCaso, [evento(head)], AGORA) !== IDEIA) p.push('(1) cabeça de 200 terminada em espaço não casou (o trim a fazia "curta")')
  if (E.ideiaDoRoteiroEscrito(roteiroDoCaso.replace('Mara enters', 'Mara walks into'), [evento(head)], AGORA) !== null) p.push('(1) começo diferente casou')
  const curto = 'HOOK: Mara enters an old elevator at 3:03 AM and hears her name. '
  if (E.ideiaDoRoteiroEscrito(curto.trim(), [evento(curto)], AGORA) !== IDEIA) p.push('(1) roteiro curto idêntico (com espaço no fim) não casou')
  if (E.ideiaDoRoteiroEscrito(curto + 'Then the doors open.', [evento(curto)], AGORA) !== null) p.push('(1) roteiro curto com frase a mais casou')
  // (2) o registro
  const s = (o) => E.statusDaIdeiaDoFilme(o)
  const tela = s({ daTela: IDEIA, final: IDEIA, roteiro: ROTEIRO, generationId: 'g1' })
  if (tela.origem !== 'tela' || tela.ideia_e_o_roteiro !== false || tela.chars !== IDEIA.length || tela.generation_id !== 'g1') p.push(`(2) ideia da tela: ${JSON.stringify(tela)}`)
  const rec = s({ daTela: null, final: IDEIA, roteiro: ROTEIRO })
  if (rec.origem !== 'recuperada') p.push(`(2) ideia recuperada: ${rec.origem}`)
  const aus = s({ daTela: '  ', final: undefined, roteiro: ROTEIRO })
  if (aus.origem !== 'ausente' || aus.chars !== 0) p.push(`(2) sem ideia: ${aus.origem}`)
  const rot = s({ daTela: ROTEIRO + '\r\n', final: ROTEIRO, roteiro: ROTEIRO })
  if (rot.origem !== 'tela' || rot.ideia_e_o_roteiro !== true) p.push('(2) a tela mandou o próprio roteiro como ideia e o sinal não acendeu')
  // a rota
  const rota = mut[ROTA] ? mut[ROTA](ler(ROTA)) : ler(ROTA)
  const iRec = rota.indexOf('await recuperarIdeiaDoEscritor(user.id, body.prompt)')
  const iEv = rota.indexOf('void writeServerEvent({ name: FILM_IDEA_STATUS_EVENT')
  const iEst = rota.indexOf('const pedidoEstacionado = pedidoEstacionavel(body)')
  if (iEv < 0) p.push('(2) a rota não grava film_idea_status')
  else if (!(iRec >= 0 && iRec < iEv && iEv < iEst)) p.push('(2) film_idea_status fora do lugar (depois da recuperação, antes da cópia estacionada)')
  if ((rota.match(/name: FILM_IDEA_STATUS_EVENT/g) ?? []).length > 1) p.push('(2) film_idea_status gravado mais de uma vez')
  if (!/const ideiaDaTela1311 = typeof body\.original_idea === 'string' && body\.original_idea\.trim\(\) \? body\.original_idea : null/.test(rota)) p.push('(2) a origem "tela" não é lida antes da recuperação')
  return p
}

const atual = problemas()
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log('ok  estado atual (cabeça de 200 com espaço casa; curta exige o mesmo texto; film_idea_status tela/recuperada/ausente/roteiro; rota no lugar)')
let ok = 1, falhas = 0
const troca = (de, para) => (t) => t.replace(de, para)
const MUTANTES = [
  ['M1 tamanho pelo trim (o defeito)', { [ESC]: troca("String(e.metadata?.script_head ?? '').length < CABECA_GRAVADA_CHARS", 'cabeca.length < CABECA_GRAVADA_CHARS') }],
  ['M2 origem trocada', { [ESC]: troca("const origem: OrigemDaIdeia = tela ? 'tela' : final ? 'recuperada' : 'ausente'", "const origem: OrigemDaIdeia = final ? 'tela' : 'ausente'") }],
  ['M3 sinal de roteiro desligado', { [ESC]: troca('ideia_e_o_roteiro: !!tela && !!roteiro && norma(tela) === roteiro,', 'ideia_e_o_roteiro: false,') }],
  ['M4 rota sem o evento', { [ROTA]: troca('void writeServerEvent({ name: FILM_IDEA_STATUS_EVENT', 'void ({ name: FILM_IDEA_STATUS_EVENT') }],
  ['M5 origem lida depois da recuperação', { [ROTA]: troca('const ideiaDaTela1311 = typeof body.original_idea', 'const ideiaDaTela1311X = typeof body.original_idea') }],
]
for (const [nome, mut] of MUTANTES) {
  const alvo = Object.entries(mut).every(([arq, fn]) => fn(ler(arq)) !== ler(arq))
  if (!alvo) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  const m = problemas(mut)
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
