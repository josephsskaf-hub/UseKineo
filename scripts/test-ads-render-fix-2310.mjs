// KINEO-ADS-RENDER-FIX-2310 — guardião: o prompt de cada tomada do Kling3 cabe no limite da fal (2500) e preserva a parte da tomada.
// Caso real: render do fluxo ESCOLHA em 23/10 (order 1a09131b) mandou 2642, 2657 e 2819 caracteres por tomada e falhou sem erro gravado.
import { readFileSync } from 'node:fs'
import ts from 'typescript'

let ok = 0, falha = 0
const check = (cond, nome) => { if (cond) { ok++; console.log('  ok  ' + nome) } else { falha++; console.log('  FALHA  ' + nome) } }

const src = readFileSync('lib/ads/cena/escolhaVideo.ts', 'utf8')
const ini = src.indexOf('export const ESCOLHA_SHOT_PROMPT_MAX')
check(ini > 0, 'R0 o arquivo declara o teto e a função de ajuste')
const trecho = src.slice(ini)
const js = ts.transpileModule(trecho, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }
new Function('module', 'exports', js)(mod, mod.exports)
const { escolhaShotPromptFit, ESCOLHA_SHOT_PROMPT_MAX } = mod.exports

const comum = "Use the customer's CHOSEN still as the exact first frame and identity/composition reference. PRODUCT AD: the actual product is the hero through a clear demonstration by the selected recognizable actor, with a wide full-body establishing take, a medium demonstration and a detailed product-in-use close-up. Every take uses the same referenced product and the same selected person. Exactly one adult: the exact approved adult presenter, with the same natural face, hair, skin and clothing as the supplied portrait. Preserve outfit the exact original outfit visible in the approved presenter portrait, with identical colour, fabric and sleeves. Only this person's own hands attached continuously to their arms: five anatomically natural fingers per visible hand, correct left/right ownership, never reversed or mirrored hands; no extra people or limbs. Preserve the exact customer's entire product, label spelling, colours, materials, scale and proportions. The real label remains readable and unobstructed; do not cover it with hands or added graphics. Clean uncluttered premium lighting: no unrelated dishes, random props, duplicate reflections or invented label text. Only objects required by the selected product interaction may be present. Keep the product separated from the face. In a premium beachfront promenade at sunrise, coral sky, golden rim light and ocean in the distance; premium aspirational advertising art direction, warm coral or golden-hour light where natural, intentional cinematic contrast, clean uncluttered setting, ties the real shoes on their own feet with their own connected hands, then takes two steps. COMPOSITION LOCK: vertical9:16, one full-screen view at any moment, never quadrants, collage, split-screen or picture-in-picture. Keep the face in the upper third when visible. In the WIDE full-body take, the real shoes stay naturally on the feet in the bottom80–100% of the frame, below the caption band; never lift or relocate worn shoes to the chest. In the final CLOSE, reframe the whole real shoes and any printed label above56% of the close-up frame. Reserve a quiet text-safe strip centred at 62% for captions. Product label and face must never enter or be obscured by that strip. Leave62–72% uncluttered for final text. Do not generate any text, logo, badge, price, discount, subtitle or card; the editor adds those once."
const tomadas = [
  'Absolute0–5s: WIDE FULL-BODY, entire selected person from head to feet, recognizable face, both legs, knees and connected limbs visible while naturally using the exact product. SILENT scene, closed relaxed lips, no speech or lip-sync; a separate full narration is added in editing.',
  'Absolute5–10s: MEDIUM demonstration of the same selected person and product, the natural face and connected hands clearly visible. Preserve every detail of the same outfit, scene and product. SILENT scene, closed relaxed lips, no speech or lip-sync; a separate full narration is added in editing.',
  'Absolute10–15s: CLOSE-UP of the exact REAL product in active use by the same selected person, including their own connected fingers/body part as appropriate. Preserve the whole product and readable unchanged label. Live natural movement continues under final text13–15s; no original-photo insert, still photograph, frozen frame, plain card or new scene. SILENT scene, closed relaxed lips, no speech or lip-sync; a separate full narration is added in editing.',
]
check(ESCOLHA_SHOT_PROMPT_MAX <= 2500, 'R1 teto abaixo do maxLength 2500 da fal')
for (const [k, t] of tomadas.entries()) {
  const orig = comum + ' ' + t
  const fit = escolhaShotPromptFit(orig)
  check(orig.length > 2500, `R2.${k} o caso real passa de 2500 (${orig.length})`)
  check(fit.length <= ESCOLHA_SHOT_PROMPT_MAX, `R3.${k} ajustado cabe (${fit.length})`)
  check(fit.endsWith(t), `R4.${k} a parte da tomada (Absolute…) fica inteira no fim`)
  check(fit.length <= 500, `R5.${k} cabe em 500 caracteres`)
  check(/SILENT scene|closed relaxed lips/.test(fit), `R6.${k} a regra de boca fechada da tomada segue presente`)
}
const curto = 'Short prompt. Absolute0–5s: wide.'
check(escolhaShotPromptFit(curto) === curto, 'R7 prompt curto volta intocado')
// mutante: sem o ajuste, o prompt real reprova R3
const mutante = (p) => p
check(mutante(comum + ' ' + tomadas[2]).length > ESCOLHA_SHOT_PROMPT_MAX, 'M1 sem o ajuste, o caso real estoura o teto (o guardião reprovaria)')
check(/shotPrompts\.map\(p => escolhaShotPromptFit\(p\)\)/.test(src.slice(0, ini)), 'R8 as tomadas do Kling3 passam pelo ajuste antes do multi_prompt')

console.log(`\n${ok} ok, ${falha} falha(s)`)
process.exit(falha ? 1 : 0)
