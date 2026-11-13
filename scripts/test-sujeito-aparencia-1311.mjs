// KINEO-SUJEITO-APARENCIA-1311 [CEO 13/11, gato ninja 7f92fe17] — guardião sem rede e sem custo (as respostas do modelo são gravadas).
// O caso real: "рыжий кот ниндзя бежит по крышам … стиль пиксар" foi lido como "a ninja cat running on rooftops" (sem o ruivo) e os planos
// 2 e 3 do Kling 4 (metades de cena) saíram "cat jumping rooftop", sem cor e na rua.
// Trava: (1) a pergunta da aparência só aceita palavras que ESTÃO no pedido (cirílico, acento); sem elas = null; "(ginger)" vai à frase
// e não repete o que a frase já diz; (2) sem ficha, o sujeito completo vai a TODO plano, sem tirar imagem-chave; com ficha, o de sempre;
// (3) a metade de cena leva a linha do sujeito; (4) a rota passa o sujeito às metades e sujeitoNoKling4 faz as DUAS perguntas;
// (5) 'off' = byte a byte o de hoje (uma pergunta só, um plano só).
// Mutantes: interruptor 'off' · âncora da aparência desligada · ficha ignorada · metade sem o sujeito · rota sem o sujeito ·
// frase sem a aparência.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const SUJ = 'lib/cinematic/sujeitoObrigatorio.ts'
const QP = 'lib/kling4QuatroPlanos.ts'
const ROTA = 'app/api/generate-video-cinematic/route.ts'
const ler = (f) => readFileSync(f, 'utf8')
const PEDIDO = 'рыжий кот ниндзя бежит по крышам как профисиналный супер ниндзя стиль пиксар'
// os planos do filme real (claim de 7f92fe17, scene_plan), sem ficha
const PLANOS = [
  'Scene 1: use the start image. Photoreal film. A sleek orange cat perched on a rooftop, silhouetted against a glowing sunset, exuding a ninja-like presence. photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain no readable text, letters, numbers, labels or signage anywhere in the frame Mouth closed, no speaking.',
  'Scene 2: use middle keyframe 1. Photoreal film. The cat leaps from roof to roof with professional grace, then moves stealthily and silently. photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, same photorealistic look in every scene no readable text, letters, numbers, labels or signage anywhere in the frame Mouth closed, no speaking.',
  'Scene 3: use middle keyframe 2. Photoreal film. The cat performs an epic leap, embodying the essence of a superhero ninja in action. photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, same photorealistic look in every scene, no readable text, letters, numbers, labels or signage Mouth closed, no speaking.',
]
const LEITURA = { reasoning: 'A ninja cat running on rooftops; the cat is a literal creature.', subject: 'a ninja cat running on rooftops', head_noun: 'cat', subject_visual_no_people: 'a ninja cat running on rooftops', kind: 'creature', real_person: false, has_human: false, mention_words: ['кот'], word_use: 'literal', request_language: 'ru' }
const APARENCIA = { request_words: ['рыжий'], appearance: 'ginger' }
const resposta = (o) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(o) } }] }) })

async function problemas(mut = {}) {
  const p = []
  const L = createOfflineLoader({ source: (rel, t) => { const k = rel.replace(/\\/g, '/'); return mut[k] ? mut[k](t) : t }, globals: { setTimeout, clearTimeout, AbortController } })
  const S = L(SUJ), Q = L(QP)
  const ligado = S.sujeitoAparenciaLigada()
  if (S.SUJEITO_APARENCIA_1311 !== 'all' || !ligado) p.push(`(0) interruptor = ${S.SUJEITO_APARENCIA_1311}, esperado 'all'`)
  // (1) a pergunta da aparência
  if (S.lerAparencia(APARENCIA, PEDIDO)?.appearance !== 'ginger') p.push('(1) "рыжий" no pedido não virou "ginger"')
  if (S.lerAparencia({ request_words: ['черный'], appearance: 'black' }, PEDIDO)?.appearance !== null) p.push('(1) palavra que NÃO está no pedido virou aparência (invenção)')
  if (S.lerAparencia({ request_words: [], appearance: 'orange' }, PEDIDO)?.appearance !== null) p.push('(1) aparência sem palavra do pedido passou')
  if (S.lerAparencia({ request_words: ['alazao'], appearance: 'chestnut' }, 'um cavalo alazão na praia')?.appearance !== 'chestnut') p.push('(1) acento ("alazão") impediu a âncora')
  if (S.fraseComAparencia('a ninja cat running on rooftops', 'ginger') !== 'a ninja cat running on rooftops (ginger)') p.push('(1) a frase não ganhou "(ginger)"')
  if (S.fraseComAparencia('an adorable orange baby dragon', 'orange') !== 'an adorable orange baby dragon') p.push('(1) aparência repetida na frase')
  if (S.aparenciaValida('Ginger Cat') !== null || S.aparenciaValida('рыжий') !== null) p.push('(1) aparência com maiúscula/sem tradução passou')
  // (2) sem ficha: todo plano; com ficha: o de sempre
  const leitura = { ok: true, valor: S.lerLeituraDoSujeito(LEITURA, PEDIDO), ms: 1, model: 'x', tentativas: 1 }
  leitura.valor.appearance = 'ginger'
  const pedido = { pedido: PEDIDO, fonte: 'ideia_original', motivo: 'ideia_original' }
  const stills = ['img1', 'img2', 'img3']
  const r = S.exigirSujeitoNoKling4({ pedido, leitura, falas: ['Рыжий кот — ниндзя на крыше.', 'Он прыгает через крыши.', 'В стиле Пиксар, этот кот — супер ниндзя.'], prompts: PLANOS, stills, todosOsPlanos: ligado })
  const frase = 'a ninja cat running on rooftops (ginger)'
  if (!r.prompts.every((q) => q.includes(`Main subject clearly visible in frame: ${frase}.`))) p.push(`(2) o sujeito completo não foi a todo plano: ${r.prompts.map((q) => q.includes(frase)).join(',')}`)
  if (!r.prompts.every((q) => Array.from(q).length <= 464)) p.push('(2) plano passou do orçamento de 464')
  if (!r.prompts[2].includes('performs an epic leap') || !r.prompts[1].includes('leaps from roof to roof')) p.push('(2) a ação do plano foi cortada')
  if (JSON.stringify(r.stills) !== JSON.stringify(stills)) p.push('(2) imagem-chave saiu')
  if (JSON.stringify(r.relato.planos_com_sujeito) !== '[1,2,3]') p.push(`(2) relato planos_com_sujeito = ${JSON.stringify(r.relato.planos_com_sujeito)}`)
  const comFicha = PLANOS.map((q, i) => i === 0 ? q.replace('Photoreal film. ', 'Photoreal film. Identity: Rex, a ginger cat. ') : q)
  const rf = S.exigirSujeitoNoKling4({ pedido, leitura, falas: ['a', 'b', 'c'], prompts: comFicha, stills, todosOsPlanos: ligado })
  if (rf.prompts.some((q, i) => q !== comFicha[i])) p.push('(2) com ficha, o sujeito foi a todo plano (a ficha manda)')
  // sujeito ausente de TODOS os planos (o avião C-54 do guardião antigo): a correção de sempre — uma cena, e a imagem dela sai
  const semGato = PLANOS.map((q) => q.replace(/\b(?:cat|orange cat)\b/g, 'fox'))
  const ra = S.exigirSujeitoNoKling4({ pedido, leitura, falas: ['a', 'b', 'c'], prompts: semGato, stills, todosOsPlanos: ligado })
  if (ra.relato.planos_com_sujeito || ra.prompts.filter((q, i) => q !== semGato[i]).length !== 1 || ra.stills.filter((x) => x === null).length !== 1) p.push('(2) sujeito ausente de todos os planos não seguiu a correção de sempre (uma cena, imagem sai)')
  const r0 = S.exigirSujeitoNoKling4({ pedido, leitura, falas: ['a', 'b', 'c'], prompts: PLANOS, stills })
  if (r0.prompts.some((q, i) => q !== PLANOS[i]) || r0.relato.ja_presente !== true) p.push('(2) sem todosOsPlanos, mudou o comportamento de sempre')
  // (3) a metade de cena
  const meta = ['Photoreal film. Main subject of this shot: cat jumping rooftop, shown in motion.', 'Photoreal film. Main subject of this shot: cat stealthy movement, shown in motion.']
  const planos4 = [r.prompts[0], ...meta, r.prompts[2]]
  const grupos = [[0], [1, 2], [3]]
  const comMetades = Q.comSujeitoNasMetades(planos4, grupos, frase)
  if (!comMetades[1].includes(`Main subject clearly visible in frame: ${frase}.`) || !comMetades[2].includes(`Main subject clearly visible in frame: ${frase}.`)) p.push('(3) a metade de cena não leva o sujeito')
  if (comMetades[0] !== planos4[0] || comMetades[3] !== planos4[3]) p.push('(3) plano que não é metade mudou')
  if (JSON.stringify(Q.comSujeitoNasMetades(planos4, grupos, null)) !== JSON.stringify(planos4)) p.push('(3) sem sujeito, as metades mudaram')
  // (4) a rota e as duas perguntas
  const rota = mut[ROTA] ? mut[ROTA](ler(ROTA)) : ler(ROTA)
  if (!rota.includes('if (q && sujeitoAparenciaLigada() && kling4Sujeito.r?.relato.planos_com_sujeito?.length) q.prompts.splice(0, q.prompts.length, ...comSujeitoNasMetades(q.prompts, q.grupos, kling4Sujeito.r.relato.sujeito))')) p.push('(4) a rota não passa o sujeito às metades')
  const chamadas = []
  const fetchImpl = async (_u, init) => { const b = JSON.parse(init.body); chamadas.push(b.response_format.json_schema.name); return resposta(b.response_format.json_schema.name === 'aparencia_do_sujeito' ? APARENCIA : LEITURA) }
  const k = await S.sujeitoNoKling4({ pedido, falas: ['a', 'b', 'c'], prompts: PLANOS, stills }, { fetchImpl, apiKey: 'k' })
  if (chamadas.join(',') !== 'sujeito_do_pedido,aparencia_do_sujeito') p.push(`(4) perguntas = ${chamadas.join(',')}`)
  if (k.relato.sujeito !== frase || !k.prompts.every((q) => q.includes(frase))) p.push(`(4) sujeitoNoKling4: ${k.relato.sujeito}`)
  return p
}

const atual = await problemas()
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log('ok  estado atual (gato ninja: "(ginger)" do pedido, sujeito em todo plano e nas metades, ação inteira, imagens mantidas; com ficha o de sempre)')
// 'off' = byte a byte o de hoje
{
  const L = createOfflineLoader({ source: (rel, t) => (rel.replace(/\\/g, '/') === SUJ ? t.replace("SUJEITO_APARENCIA_1311: ModoSujeitoAparencia = 'all'", "SUJEITO_APARENCIA_1311: ModoSujeitoAparencia = 'off'") : t), globals: { setTimeout, clearTimeout, AbortController } })
  const S = L(SUJ)
  const chamadas = []
  const fetchImpl = async (_u, init) => { const b = JSON.parse(init.body); chamadas.push(b.response_format.json_schema.name); return resposta(LEITURA) }
  const k = await S.sujeitoNoKling4({ pedido: { pedido: PEDIDO, fonte: 'ideia_original', motivo: 'ideia_original' }, falas: ['a', 'b', 'c'], prompts: PLANOS, stills: ['a', 'b', 'c'] }, { fetchImpl, apiKey: 'k' })
  if (chamadas.join(',') !== 'sujeito_do_pedido' || k.prompts.some((q, i) => q !== PLANOS[i]) || k.relato.sujeito !== 'a ninja cat running on rooftops') { console.log(`FALHA 'off' não é o de hoje: ${chamadas.join(',')} · ${k.relato.sujeito}`); process.exit(1) }
  console.log("ok  'off' = o de hoje (uma pergunta, sujeito sem cor, planos intactos — como no filme real)")
}
let ok = 2, falhas = 0
const troca = (de, para) => (t) => t.replace(de, para)
const MUTANTES = [
  ["M1 interruptor 'off'", { [SUJ]: troca("SUJEITO_APARENCIA_1311: ModoSujeitoAparencia = 'all'", "SUJEITO_APARENCIA_1311: ModoSujeitoAparencia = 'off'") }],
  ['M2 âncora da aparência desligada', { [SUJ]: troca('if (citadas.length === 0 || !citadas.every((w) => p.includes(norma(w)))) return { appearance: null }', '') }],
  ['M3 ficha ignorada', { [SUJ]: troca('if (args.todosOsPlanos && !prompts.some((q) => FICHA_NO_PLANO_RE.test(q))) {', 'if (args.todosOsPlanos) {') }],
  ['M4 metade sem o sujeito', { [QP]: troca('if (g.length < 2 || k >= saida.length || saida[k].includes(f)) continue', 'continue') }],
  ['M5 rota sem o sujeito', { [ROTA]: troca('q.prompts.splice(0, q.prompts.length, ...comSujeitoNasMetades(q.prompts, q.grupos, kling4Sujeito.r.relato.sujeito))', 'void 0') }],
  ['M6 frase sem a aparência', { [SUJ]: troca('frase: fraseComAparencia(frase, l.appearance), tipo:', 'frase, tipo:') }],
]
for (const [nome, mut] of MUTANTES) {
  const alvo = Object.entries(mut).every(([arq, fn]) => fn(ler(arq)) !== ler(arq))
  if (!alvo) { console.log(`FALHA ${nome}: alvo não encontrado`); falhas++; continue }
  const m = await problemas(mut)
  if (!m.length) { console.log(`FALHA ${nome}: ficou verde`); falhas++; continue }
  console.log(`ok  ${nome}: vermelho (${m[0]})`); ok++
}
console.log(`${ok} ok · ${falhas} falha(s)`)
process.exit(falhas ? 1 : 0)
