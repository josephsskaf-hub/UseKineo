// KINEO-NOTA-AUTO-V2-1311 — guardião do JUIZ POR CENA (2ª tentativa da nota automática, lib/regua95/notaPorCena.ts).
// OFFLINE: executa o código real com fetch falso (nenhuma rede, chave ou custo). Provas:
//   P1  plano: clipe único vira 4 janelas sem perder palavra; várias cenas usam clip_seconds escalado à duração REAL;
//       elenco_trava/personagem.elenco dão os nomes de cada cena; sem elenco, só nome próprio que a fala repete em ≥ 2 momentos;
//   P2  a pergunta "mesma pessoa" só existe onde o PLANO diz que é a mesma pessoa (resposta fora disso é ignorada);
//   P3  a nota sai do CÓDIGO: sem defeito = base; negativa sem "vejo" não conta; "nota"/"score" do modelo ignorados;
//       troca só com diferença listada; régua congelada = a ajustada no ensaio (metade de ajuste);
//   P4  texto inventado: número na tela que não está na fala nem no pedido; texto ilegível; número dito não conta;
//   P5  prompt: 5 perguntas fechadas, campo "vejo", NÃO pede nota, quadros rotulados por momento, referência citada;
//       modelos só do registro (lib/aiModels.ts);
//   P6  julgarNotaCena: custo pelo uso; HTTP != 200, JSON quebrado ou sem momentos = null (nunca lança);
//   P7  quadros por tempo pela fal: o quadro mais perto de cada instante; fal fora = null; ≤ 12 quadros, dentro do momento;
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
// Rodar: npx tsx scripts/test-nota-auto-v2-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const ARQ = 'lib/regua95/notaPorCena.ts'
const FONTE = lf(fs.readFileSync(ARQ, 'utf8'))
// a régua que o ensaio achou na metade de AJUSTE (scripts/calibra-nota-auto-v2-1311.mts ajustar) — mudar só com ensaio novo
const REGUA_CONGELADA = { base: 8, semSujeito: 4, acao: 2, troca: 1, texto: 1, epoca: 0, piso: 1 }

function carregar(transform) {
  const globals = { setTimeout: () => 0, clearTimeout() {}, AbortController }
  return createOfflineLoader({ globals, env: { OPENAI_API_KEY: 'k', FAL_KEY: 'f' }, source: transform ? (rel, text) => (rel.replace(/\\/g, '/').endsWith(ARQ) ? transform(lf(text)) : text) : null })(ARQ)
}

const VEJO = 'a fox walking on fresh snow'
const MOM = (m, o = {}) => ({ m, sujeito: { da_fala: 'fox', aparece: 'sim', vejo: VEJO }, acao: { bate: 'sim', vejo: VEJO }, texto: { outro_texto: '', ilegivel: false }, epoca_lugar: { bate: 'sim', vejo: VEJO }, ...o })
function falsoFetch({ visao, visaoOk = true, falOk = true, chamadas = [] } = {}) {
  return async (url, init) => {
    chamadas.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null })
    if (String(url).startsWith('https://fal.run/')) {
      if (!falOk) return { ok: false, status: 500, json: async () => ({}) }
      return { ok: true, status: 200, json: async () => ({ images: Array.from({ length: 40 }, (_, i) => ({ url: `https://fal.media/q${i}.jpg` })) }) }
    }
    if (!visaoOk) return { ok: false, status: 429, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: typeof visao === 'string' ? visao : JSON.stringify(visao) } }], usage: { prompt_tokens: 8000, completion_tokens: 1000 } }) }
  }
}

// nascimento de 3 cenas com clip_seconds [10,5,5] num MP4 de 15 s; elenco_trava põe "Ana" nas cenas 1 e 3
const NASC3 = { voiceover_script: 'Ana opens the old door. The hallway is dark and cold. Ana finds the letter at 02:46.', clip_word_starts: [0, 5, 11], scene_prompts: ['p1', 'p2', 'p3'], clip_seconds: [10, 5, 5], duration: 15, elenco_trava: { cenas: [{ cena: 1, nomes: ['Ana'] }, { cena: 3, nomes: ['Ana'] }] } }
// clipe único, sem elenco: o nome próprio "Marco" aparece em 2 janelas; "He" não é nome
const NASC1 = { voiceover_script: 'Marco wakes up early. He walks to the bakery in Lisbon. The baker smiles at Marco. They share bread and coffee.', clip_word_starts: [0], scene_prompts: ['p'], duration: 15 }

async function provas(N) {
  const falhas = []
  const checa = (nome, cond) => { if (!cond) falhas.push(nome) }
  // P1
  const p3 = N.planoDoNascimento(NASC3, 12)
  checa('P1 clip_seconds escalado à duração real', p3 && p3.momentos.length === 3 && p3.momentos[0].fim === 6 && p3.momentos[1].fim === 9 && p3.momentos[2].fim === 12)
  checa('P1 fala de cada cena pelas palavras', p3?.momentos[1].fala === 'The hallway is dark and cold.' && /02:46/.test(p3?.momentos[2].fala ?? ''))
  checa('P1 elenco_trava dá os nomes por cena', JSON.stringify(p3?.momentos.map((m) => m.nomes)) === '[["Ana"],[],["Ana"]]')
  const p1 = N.planoDoNascimento(NASC1, 16)
  const palavras = NASC1.voiceover_script.split(/\s+/).length
  checa('P1 clipe único = 4 janelas sem perder palavra', p1?.momentos.length === 4 && p1.momentos.map((m) => m.fala).join(' ').split(/\s+/).length === palavras && p1.momentos[3].fim === 16)
  checa('P1 sem elenco: nome próprio repetido na fala vira personagem; pronome não', JSON.stringify(p1?.elenco) === '["Marco"]')
  const pPers = N.planoDoNascimento({ ...NASC3, elenco_trava: undefined, personagem: { elenco: [{ nome: 'the old fox', tipo: 'animal' }, { nome: 'Castle', tipo: 'lugar' }] }, scene_prompts: ['an old fox at the door', 'empty hallway', 'the fox reads'] }, 15)
  checa('P1 personagem.elenco citado no prompt da cena (lugar não é personagem)', JSON.stringify(pPers?.momentos.map((m) => m.nomes)) === '[["the old fox"],[],["the old fox"]]')
  checa('P1 sem cena = null', N.planoDoNascimento({ voiceover_script: 'x' }, 10) === null)
  // P2
  const id = N.checagensDeIdentidade(p3)
  checa('P2 identidade só onde o plano repete o nome; referência = 1º momento', id.size === 1 && id.get(3)?.ref === 1 && id.get(3)?.nome === 'Ana')
  const forasDoPlano = N.normalizarRespostas({ momentos: [MOM(2, { mesma_pessoa: { resposta: 'nao', diferencas: ['rosto'], vejo: 'another woman with red hair' } })] }, p3)
  checa('P2 "mesma pessoa" fora do plano é ignorada', forasDoPlano.respostas[0]?.pessoa === null && forasDoPlano.respostas[0]?.diferencas.length === 0)
  // P3
  checa('P3 régua congelada = a do ajuste', JSON.stringify(N.REGUA_NOTA_CENA) === JSON.stringify(REGUA_CONGELADA))
  const conta = (rs, p = p3, pedido = 'a girl finds a letter') => N.defeitosDasRespostas(N.normalizarRespostas({ momentos: rs }, p).respostas, p, pedido)
  const limpo = conta([MOM(1), MOM(2), MOM(3)])
  checa('P3 sem defeito = base', limpo.defeitos.length === 0 && N.notaDasRespostas(limpo.contagem) === REGUA_CONGELADA.base)
  const semVejo = conta([MOM(1, { sujeito: { aparece: 'nao', vejo: '' }, acao: { bate: 'nao', vejo: 'n/a' } }), MOM(2, { epoca_lugar: { bate: 'nao', vejo: 'old' } }), MOM(3)])
  checa('P3 negativa sem "vejo" não conta', semVejo.defeitos.length === 0)
  const umaAcao = conta([MOM(1), MOM(2, { acao: { bate: 'nao', vejo: 'a sunny beach instead of a hallway' } }), MOM(3)])
  const esperado = Math.round((REGUA_CONGELADA.base - REGUA_CONGELADA.acao / 3) * 2) / 2
  checa('P3 1 de 3 momentos com a ação errada = base − acao/3 (passo 0,5)', umaAcao.defeitos.length === 1 && umaAcao.defeitos[0].categoria === 'CENA_FORA_DO_PEDIDO' && N.notaDasRespostas(umaAcao.contagem) === Math.max(REGUA_CONGELADA.piso, esperado))
  const trocaSemDif = conta([MOM(1), MOM(2), MOM(3, { mesma_pessoa: { resposta: 'nao', diferencas: [], vejo: 'looks a bit different overall' } })])
  const trocaComDif = conta([MOM(1), MOM(2), MOM(3, { mesma_pessoa: { resposta: 'nao', diferencas: ['cabelo', 'etnia'], vejo: 'short blond hair, was long black hair' } })])
  checa('P3 troca só com diferença listada', trocaSemDif.contagem.troca === 0 && trocaComDif.contagem.troca === 1 && trocaComDif.defeitos[0].categoria === 'PERSONAGEM_TROCOU')
  checa('P3 piso e passos de 0,5', N.notaDasRespostas({ momentos: 3, semSujeito: 3, acao: 3, troca: 5, texto: 5, epoca: 3 }) === REGUA_CONGELADA.piso && [0, 1, 2, 3].every((k) => Number.isInteger(N.notaDasRespostas({ momentos: 7, semSujeito: k, acao: k / 2, troca: 0, texto: 0, epoca: 0 }) * 2)))
  // P4
  checa('P4 número da tela fora da fala = inventado; o número dito não conta', JSON.stringify(N.numerosInventados('CLOCK 03:15', 'at 02:46')) === '["3","15"]' && N.numerosInventados('02:46', 'at 02:46').length === 0 && N.numerosInventados('Year 1998', 'a photo from 1998').length === 0)
  const txt = conta([MOM(1, { texto: { outro_texto: 'CLOCK 03:15', ilegivel: false } }), MOM(2, { texto: { outro_texto: 'OPEN', ilegivel: false } }), MOM(3, { texto: { outro_texto: 'XQRT LMNO', ilegivel: true } })])
  checa('P4 texto inventado: número fora da fala + ilegível; placa legível sem número não conta', txt.contagem.texto === 2 && txt.defeitos.every((d) => d.categoria === 'TEXTO_INVENTADO'))
  // P5
  const quadros = [{ url: 'data:image/jpeg;base64,AA', t: 1, m: 1 }, { url: 'https://x/q.jpg', t: 7, m: 2 }, { url: 'https://x/r.jpg', t: 10, m: 3 }]
  const msgs = N.buildNotaCenaMessages({ plano: p3, quadros, pedido: 'HOOK: [Pexels: house] a girl finds a letter', produto: 'filme', motor: 'kling4' }, 'high')
  const sys = msgs[0].content, user = msgs[1].content
  const textoUser = user.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
  checa('P5 cinco perguntas fechadas com "vejo"', ['Q1 sujeito', 'Q2 acao', 'Q3 mesma_pessoa', 'Q4 texto', 'Q5 epoca_lugar'].every((q) => sys.includes(q)) && /"vejo"/.test(sys))
  checa('P5 não pede nota ao modelo', !/"(score|rating|nota|grade)"/i.test(sys))
  checa('P5 quadros em high, rotulados por momento, na ordem', user.filter((c) => c.type === 'image_url').length === 3 && user.filter((c) => c.type === 'image_url').every((c) => c.image_url.detail === 'high') && /MOMENT 1[\s\S]*Frame #0[\s\S]*MOMENT 2[\s\S]*Frame #1[\s\S]*MOMENT 3[\s\S]*Frame #2/.test(textoUser))
  checa('P5 referência de identidade citada no momento certo', /MOMENT 3[^\n]*\nIdentity check: the plan says "Ana" here is the SAME character as in reference frame #0 \(moment 1\)/.test(textoUser) && /MOMENT 2[^\n]*\nNo identity check/.test(textoUser))
  checa('P5 pedido sem marcadores do roteirista', /a girl finds a letter/.test(textoUser) && !/Pexels|HOOK/.test(textoUser))
  checa('P5 modelos só do registro', !/['"]gpt-[^'"]*['"]/.test(FONTE) && /AI_TEXT_MODELS\.writer/.test(FONTE))
  // P6
  const ent = { plano: p3, quadros, pedido: 'p', produto: 'filme', motor: 'kling4' }
  const r6 = await N.julgarNotaCena(ent, { apiKey: 'k', model: 'gpt-4o', fetchImpl: falsoFetch({ visao: { momentos: [MOM(1), MOM(2, { acao: { bate: 'nao', vejo: 'a sunny beach instead of a hallway' } }), MOM(3)], nota: 10, score: 10 } }) })
  checa('P6 nota pela régua do código, não pela do modelo', r6?.nota === N.notaDasRespostas(umaAcao.contagem) && r6?.nota !== 10)
  checa('P6 custo pelo uso (gpt-4o: 8k entrada + 1k saída = US$ 0,03)', Math.abs((r6?.usd ?? 0) - 0.03) < 1e-6)
  checa('P6 HTTP != 200 = null', (await N.julgarNotaCena(ent, { apiKey: 'k', fetchImpl: falsoFetch({ visaoOk: false }) })) === null)
  checa('P6 JSON quebrado = null', (await N.julgarNotaCena(ent, { apiKey: 'k', fetchImpl: falsoFetch({ visao: 'não é json' }) })) === null)
  checa('P6 sem momentos válidos = null', (await N.julgarNotaCena(ent, { apiKey: 'k', fetchImpl: falsoFetch({ visao: { momentos: [{ m: 99 }] } }) })) === null)
  // P7
  const t7 = N.temposDosQuadros(p1)
  checa('P7 ≤ 12 quadros, cada um dentro do seu momento', t7.flat().length <= 12 && t7.every((ts, i) => ts.every((t) => t > p1.momentos[i].inicio && t < p1.momentos[i].fim)))
  const ch = []
  const ex = await N.extrairQuadrosPorTempoFal('https://x/v.mp4', p3, { falKey: 'f', fetchImpl: falsoFetch({ chamadas: ch }) })
  const tempos3 = N.temposDosQuadros(p3).flat()
  checa('P7 fal: o quadro mais perto de cada instante (1 por segundo)', ex && ex.quadros.length === tempos3.length && ex.quadros.every((q, i) => q.url === `https://fal.media/q${Math.round(tempos3[i])}.jpg`) && ch[0]?.body.frame_interval === 24)
  checa('P7 fal fora = null', (await N.extrairQuadrosPorTempoFal('https://x/v.mp4', p3, { falKey: 'f', fetchImpl: falsoFetch({ falOk: false }) })) === null)
  return falhas
}

let ok = 0, ruim = 0
const linha = (bom, nome) => { if (bom) { ok++; console.log('  ok  ' + nome) } else { ruim++; console.log('  XX  ' + nome) } }
const real = await provas(carregar(null))
linha(real.length === 0, `código real: todas as provas P1–P7 verdes${real.length ? ' — falharam: ' + real.join(' | ') : ''}`)

const MUTANTES = [
  ['M1 negativa sem "vejo" conta', (s) => s.replace("if (r.sujeito === 'nao' && temEvidencia(r.vejo.sujeito))", "if (r.sujeito === 'nao')").replace("if ((r.acao === 'nao' || r.acao === 'parcial') && temEvidencia(r.vejo.acao))", "if (r.acao === 'nao' || r.acao === 'parcial')")],
  ['M2 "mesma pessoa" vale fora do plano', (s) => s.replace("pessoa: ident.has(m) ? umDe(pe.resposta, ['sim', 'nao', 'nao_aparece'] as const) : null,", "pessoa: umDe(pe.resposta, ['sim', 'nao', 'nao_aparece'] as const),").replace('diferencas: ident.has(m) ? arr(pe.diferencas)', 'diferencas: true ? arr(pe.diferencas)')],
  ['M3 número dito na fala vira inventado', (s) => s.replace('.filter((d) => !conhecidos.has(d))', '')],
  ['M4 confia na nota do modelo', (s) => s.replace('nota: notaDasRespostas(contagem, opts?.regua),', 'nota: Number((parsed as { nota?: number }).nota ?? 8),')],
  ['M5 ignora clip_seconds (partes iguais)', (s) => s.replace('const pesos = cs.length === n && cs.every((x) => Number.isFinite(x) && x > 0) ? cs : ', 'const pesos = false ? cs : ')],
  ['M6 troca sem diferença listada conta', (s) => s.replace("if (r.pessoa === 'nao' && r.diferencas.length > 0 && temEvidencia(r.vejo.pessoa))", "if (r.pessoa === 'nao' && temEvidencia(r.vejo.pessoa))")],
  ['M7 pronome/qualquer maiúscula vira personagem', (s) => s.replace('.filter(([, c]) => c >= 2)', '.filter(([, c]) => c >= 1)')],
  ['M8 pede nota ao modelo', (s) => s.replace('"resumo": string (one line, Portuguese)}', '"resumo": string (one line, Portuguese), "score": number}')],
]
for (const [nome, f] of MUTANTES) {
  const mutada = f(FONTE)
  if (mutada === FONTE) { linha(false, `${nome}: o mutante NÃO aplicou (âncora sumiu)`); continue }
  let falhas
  try { falhas = await provas(carregar(f)) } catch (e) { falhas = ['carregar: ' + e.message] }
  linha(falhas.length > 0, `${nome} → vermelho (${falhas.slice(0, 2).join(' | ') || 'NENHUMA prova pegou'})`)
}
console.log(`\n${ruim === 0 ? '🟢' : '🔴'} nota-auto-v2-1311: ${ok}/${ok + ruim}`)
process.exit(ruim === 0 ? 0 : 1)
