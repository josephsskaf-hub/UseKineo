// KINEO-SUJEITO-TODO-PLANO-CORTE-1311 [CEO 13/11: "para caber nos 464, sai primeiro o texto fixo de estilo e só depois o eixo de câmera"] — guardião
// sem rede e sem custo. Os 3 planos REAIS do filme 7f92fe17 (gato ninja: os prompts da cena salvos no claim, kling4_trial.scene_plan, com a
// linha "Пиксар clearly visible…" fora, como o código no ar já faz) passam pela compactação do Kling 4 (promptDaCenaKling4) e pela peça (b) da
// aparência (sujeito completo em todo plano). Trava: (1) todo plano leva "a ninja cat running on rooftops (ginger)"; (2) o EIXO de câmera
// de cada plano sobrevive; (3) a ação de cada plano sobrevive inteira; (4) ≤ 464; (5) a proteção do fim (no readable text / Mouth closed) fica.
// Mutantes: a ordem antiga (comSujeitoNaCena: eixo antes do estilo) · sem o passo do estilo.
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const SUJ = 'lib/cinematic/sujeitoObrigatorio.ts'
const ler = (f) => readFileSync(f, 'utf8')
const CLASSICOS = [
  'Film visual medium: photorealistic, ultra-detailed. Medium shot, subject centered and clearly readable, slow push-in. Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. A sleek orange cat perched on a rooftop, silhouetted against a glowing sunset, exuding a ninja-like presence., faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes, 9:16 vertical framing',
  'Film visual medium: photorealistic, ultra-detailed. Close-up on a telling detail of the action, shallow depth of field, gentle rack focus. The orange cat effortlessly leaps from one rooftop to another, showcasing its agility and grace in mid-air., faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes, 9:16 vertical framing',
  'Film visual medium: photorealistic, ultra-detailed. Clear well-lit shot of the final moment with the subject fully recognizable, slow pull-back. In a vibrant, animated style, the cat performs an epic leap, embodying the essence of a superhero ninja in action., faceless cinematic b-roll, focus on the described subject and its environment, no foreground human faces, photorealistic, ultra-detailed, dramatic cinematic lighting, smooth camera motion, subject clearly framed with the lower third clear for captions, no watermark, no logo, no readable text, letters, numbers, labels or signage anywhere in the frame, same photorealistic look in every scene, one consistent color grade and lighting, same lens and film grain, energetic, natural, documentary, consistent color grade across all scenes, 9:16 vertical framing',
]
const ACOES = ['A sleek orange cat perched on a rooftop, silhouetted against a glowing sunset, exuding a ninja-like presence.', 'The orange cat effortlessly leaps from one rooftop to another, showcasing its agility and grace in mid-air.', 'the cat performs an epic leap, embodying the essence of a superhero ninja in action.']
const PEDIDO = 'рыжий кот ниндзя бежит по крышам как профисиналный супер ниндзя стиль пиксар'
const LEITURA = { reasoning: 'A ninja cat running on rooftops; the cat is a literal creature.', subject: 'a ninja cat running on rooftops', head_noun: 'cat', subject_visual_no_people: 'a ninja cat running on rooftops', kind: 'creature', real_person: false, has_human: false, mention_words: ['кот'], word_use: 'literal', request_language: 'ru' }
const FRASE = 'a ninja cat running on rooftops (ginger)'

function problemas(mut = {}) {
  const p = []
  const L = createOfflineLoader({ source: (rel, t) => { const k = rel.replace(/\\/g, '/'); return mut[k] ? mut[k](t) : t } })
  const S = L(SUJ), C = L('lib/cinematic/cenaKling4.ts'), St = L('lib/cinematic/sceneStyle.ts')
  const estilo = St.deriveStyleAnchor('photorealistic')
  const antes = CLASSICOS.map((c, i) => C.promptDaCenaKling4(c, estilo, i))
  const eixos = antes.map((q, i) => (q.includes(`${C.eixoCurtoKling4(i)}. `) ? C.eixoCurtoKling4(i) : null))
  if (eixos.filter(Boolean).length < 2) p.push(`(0) caso mal montado: só ${eixos.filter(Boolean).length} plano(s) com eixo antes`)
  const leitura = { ok: true, valor: { ...S.lerLeituraDoSujeito(LEITURA, PEDIDO), appearance: 'ginger' }, ms: 1, model: 'x', tentativas: 1 }
  const r = S.exigirSujeitoNoKling4({ pedido: { pedido: PEDIDO, fonte: 'ideia_original', motivo: 'ideia_original' }, leitura, falas: ['a', 'b', 'c'], prompts: antes, stills: ['s1', 's2', 's3'], todosOsPlanos: true })
  r.prompts.forEach((q, i) => {
    if (!q.includes(`Main subject clearly visible in frame: ${FRASE}.`)) p.push(`(1) plano ${i + 1} sem o sujeito completo`)
    if (eixos[i] && !q.includes(eixos[i])) p.push(`(2) plano ${i + 1} perdeu o eixo de câmera "${eixos[i]}"`)
    if (!q.includes(ACOES[i])) p.push(`(3) plano ${i + 1} perdeu parte da ação`)
    if (Array.from(q).length > 464) p.push(`(4) plano ${i + 1} com ${Array.from(q).length} caracteres`)
    if (!/no readable text/.test(q) || !/Mouth closed, no speaking\.$/.test(q)) p.push(`(5) plano ${i + 1} perdeu a proteção do fim`)
  })
  return p
}

const atual = problemas()
if (atual.length) { console.log('FALHA estado atual:\n  ' + atual.join('\n  ')); process.exit(1) }
console.log('ok  estado atual (7f92fe17: os 3 planos com o gato ruivo no telhado, o eixo e a ação de cada um inteiros, ≤ 464, proteção do fim)')
let ok = 1, falhas = 0
const MUTANTES = [
  ['M1 a ordem antiga (eixo antes do estilo)', { [SUJ]: (t) => t.replace('prompts[i] = comSujeitoEmTodoPlano(q, s.frase, i)', 'prompts[i] = comSujeitoNaCena(q, s.frase, i)') }],
  ['M2 sem o passo do estilo', { [SUJ]: (t) => t.replace('if (acao && !estilo.includes(\'.\')) {', 'if (false) {') }],
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
