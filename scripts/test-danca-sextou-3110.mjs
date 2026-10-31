// KINEO-DANCA-SEXTOU-3110 — guardião do "Friday Groove" [TRAVA 8.2 — vai do fundador 31/10 "quero colocar essa dança nos clips"].
// A foto da pessoa vira um clipe DELA puxando uma aula de dança em grupo (groove de sexta: dois passos de lado, ombro no tempo,
// quadril, mão aberta para a câmera). Mesmo remix de 2 etapas do "Put your face in it" (lib/clips/faceRemix.ts): quadro-chave
// Nano Banana Pro + Kling 3 i2v, 10 créditos. Prova:
//   (A) o modelo da casa existe, com prévia e pôster no disco, plano de DANÇA (braços e mãos inteiros), sem gênero, sem nome de
//       música/artista/criador, sem repetir o que o código cola;
//   (B) é SÓ DA CASA até o "vai" do fundador: fora da galeria e da faixa da home (hasFaceRemix/faceRemixItems), fora do GET de conta
//       comum, conta comum que pede o id leva o mesmo 400 de id desconhecido; a casa vê o cartão e resolve o pedido;
//   (C) o servidor monta tudo (prompt/motor/duração do navegador ignorados) e o submitClip/settleClip reconhecem pedido e linha;
//   (D) preço 10 e custo fal US$ 0,71 (quadro-chave 0,15 + Kling 3 i2v 5 s 0,56);
//   (E) a rota passa `house: isInternalEmail(user.email)` ao resolvedor e ao GET;
//   (F) KINEO-DANCA-PUBLICA-3110 [TRAVA 8.2 — vai do fundador 31/10 "3A"]: LANÇADO depois do 4º render (011452f0) — o (B) agora prova o
//       lançamento (todos veem/resolvem, 10 cr, house:true) e a trava da casa numa cópia com launched:false; cartão na grade de efeitos
//       do /clips sem preço, home intocada, prévia/pôster recortados do 4º render;
//   (M) mutantes ficam vermelhos.
// Rodar: node scripts/test-danca-sextou-3110.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(import.meta.dirname, '..')
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const MARCA = 'KINEO-DANCA-SEXTOU-3110'
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

const F = { remix: 'lib/clips/faceRemix.ts', route: 'app/api/clips/route.ts', galeria: 'lib/homeGaleria.ts', ui: 'app/(dashboard)/clips/ClipsClient.tsx' } // KINEO-DANCA-PUBLICA-3110 — + ui (cartão na grade de efeitos)
const MARCA_PUB = 'KINEO-DANCA-PUBLICA-3110'
const HOME = ['components/home/HomeClipsStrip.tsx', 'components/home/HomeMosaic.tsx', 'lib/homeGaleria.ts', 'lib/engineWall.ts'] // a home é curadoria do fundador

function load(entry, over = {}) {
  const cache = new Map()
  const loadTs = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const src = over[rel] ?? read(rel)
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: rel }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (name) => {
      if (name.startsWith('./') || name.startsWith('../')) return loadTs(path.posix.normalize(path.posix.join(path.posix.dirname(rel), name)) + '.ts')
      if (name.startsWith('@/')) return loadTs(name.slice(2) + '.ts')
      throw new Error(`${rel}: import inesperado ${name}`)
    }
    new Function('require', 'module', 'exports', js)(req, mod, mod.exports)
    return mod.exports
  }
  return loadTs(entry)
}

const PHOTO = 'https://x.supabase.co/storage/v1/object/public/avatars/00000000-0000-0000-0000-000000000001/p.jpg'
const ID = 'friday-groove'

function checa(over = {}) {
  const e = []
  const fr = load(F.remix, over)
  const gal = load(F.galeria, over)
  const route = over[F.route] ?? read(F.route)
  const src = over[F.remix] ?? read(F.remix)

  // (A) o modelo
  const house = fr.faceRemixHouseById?.(ID)
  if (!house) return ['Friday Groove fora do catálogo da casa']
  if (house.title !== 'Friday Groove' || house.engine !== 'hollywood' || house.seconds !== 5) e.push('Friday Groove: título/motor/duração (Kling 3, 5 s)')
  for (const p of [house.video, house.poster]) if (!p || !fs.existsSync(path.join(ROOT, 'public', p))) e.push('Friday Groove sem arquivo ' + p)
  const t = house.template
  if (t.framing !== 'dance' || t.maxPeople !== 1) e.push('modelo sem o plano de dança / 1 pessoa')
  if (!/the person from the photo/.test(t.keyframeScene) || !/the person from the photo/i.test(t.motionPrompt)) e.push('modelo não fala em "the person from the photo"')
  for (const txt of [t.keyframeScene, t.motionPrompt, t.extras]) if (/\b(man|woman|his|her|he|she|guy|girl)\b/i.test(txt)) e.push('modelo com gênero fixo')
  for (const txt of [t.keyframeScene, t.motionPrompt, t.extras]) if (/no text|no logos|exactly two arms|do not beautify|medium shot|knees-up shot/i.test(txt)) e.push('modelo repete o que o código cola')
  for (const txt of [t.keyframeScene, t.motionPrompt, t.extras, house.title]) if (/family affair|blige|mary j|polka|sextou|instagram|reel/i.test(txt)) e.push('modelo cita música/artista/criador do vídeo de referência')
  if (!/never raised in front of the face/.test(t.motionPrompt) || !/stays centered in the frame/.test(t.motionPrompt)) e.push('movimento sem as 2 correções dos testes (mão não cobre o rosto; fica no centro)')
  // KINEO-DANCA-PUBLICA-3110 — 3º render (71e83039): "beside the face, never covering it" NÃO segurou (mão tapou meio rosto ~4,1–4,4 s).
  if (!/at shoulder height, far out to the side and below the chin/.test(t.motionPrompt) || !/never pushed toward the lens/.test(t.motionPrompt) || !/whole face stays uncovered from the first frame to the last/.test(t.motionPrompt)) e.push('mão do aceno sem posição segura (longe, para o lado, ombro, abaixo do queixo, nunca para a lente)')
  if (/beside the face/.test(t.motionPrompt) || /palm-out toward the camera/.test(t.keyframeScene)) e.push('voltou a frase reprovada no 3º render (mão ao lado do rosto / palma para a câmera no quadro-chave)')
  if (!/open hand at shoulder height, well away from the face/.test(t.keyframeScene)) e.push('quadro-chave não abre com a mão longe do rosto')
  if (!/side-to-side two-step/.test(t.motionPrompt) || !/shoulders bouncing/.test(t.motionPrompt) || !/palm-forward/.test(t.motionPrompt) || !/follow the exact same moves in sync/.test(t.motionPrompt)) e.push('coreografia perdeu um passo (dois passos, ombro, mão aberta, grupo em sincronia)')
  if (!/visibly|older|shaved|braids|glasses/.test(t.extras)) e.push('figurantes sem descrição de pessoas diferentes (clones)')

  // (B) KINEO-DANCA-PUBLICA-3110 [TRAVA 8.2 — vai do fundador 31/10 "3A"] — LANÇADO depois do 4º render aprovado (011452f0): todo mundo vê
  // e resolve; a home continua intocada (fora da galeria e da faixa); o cartão mora na grade de efeitos do /clips (`house: true`).
  if (house.launched !== true) e.push('Friday Groove não está lançado (vai do fundador "3A" depois do 4º render)')
  if (fr.faceRemixItems().some((i) => i.id === ID)) e.push('Friday Groove entrou na galeria/faixa (faceRemixItems)')
  if (fr.hasFaceRemix(ID, true)) e.push('Friday Groove ganhou botão público na galeria/faixa')
  if (gal.GALERIA_NEW_CLIPS.some((c) => c.id === ID)) e.push('Friday Groove na galeria "Made with Kineo"')
  const comumCard = fr.publicFaceRemixes(() => true).find((p) => p.id === ID)
  if (!comumCard) e.push('GET de conta comum sem o Friday Groove (lançado)')
  else {
    if (comumCard.credits !== 10) e.push('cartão com preço ≠ 10')
    if (comumCard.house !== true) e.push('cartão do Friday Groove sem house:true (não aparece na grade de efeitos)')
    if ('prompt' in comumCard || 'template' in comumCard || 'launched' in comumCard) e.push('GET expõe prompt/modelo')
  }
  const casaCard = fr.publicFaceRemixes(() => true, true).find((p) => p.id === ID)
  if (!casaCard || casaCard.credits !== 10) e.push('GET da casa sem o cartão do Friday Groove a 10')
  if (fr.publicFaceRemixes(() => true, true).filter((p) => p.id === ID).length !== 1) e.push('cartão do Friday Groove duplicado na casa')
  const gbCard = fr.publicFaceRemixes(() => true, true).find((p) => p.id === 'golden-ball')
  if (!gbCard) e.push('a casa perdeu a Golden Ball')
  else if (gbCard.house !== false) e.push('Golden Ball (galeria) marcada como modelo da casa — iria para a grade do /clips')
  if (fr.publicFaceRemixes((eng) => eng !== 'hollywood', true).some((p) => p.id === ID)) e.push('motor fora do acesso ainda mostra o Friday Groove')
  const R = (ctx) => fr.resolveFaceRemixRequest(ID, { visible: true, imageUrl: PHOTO, consent: true, ...ctx })
  if (!R({}).ok || !R({ house: false }).ok) e.push('conta comum não resolve o Friday Groove lançado')
  // a TRAVA da casa continua de pé para o próximo modelo: com launched:false, só a casa vê e resolve
  const srcGate = (over[F.remix] ?? read(F.remix)).replace(/launched: true, \/\/ KINEO-DANCA-PUBLICA-3110/, 'launched: false, // KINEO-DANCA-PUBLICA-3110')
  const frG = load(F.remix, { ...over, [F.remix]: srcGate })
  const RG = (ctx) => frG.resolveFaceRemixRequest(ID, { visible: true, imageUrl: PHOTO, consent: true, ...ctx })
  if (frG.publicFaceRemixes(() => true).some((p) => p.id === ID)) e.push('trava da casa: modelo não lançado aparece para conta comum')
  if (!frG.publicFaceRemixes(() => true, true).some((p) => p.id === ID)) e.push('trava da casa: a casa não vê o modelo não lançado')
  if (RG({}).code !== 'remix' || RG({ house: false }).code !== 'remix') e.push('trava da casa: conta comum resolve modelo não lançado')
  if (!RG({ house: true }).ok) e.push('trava da casa: a casa não resolve modelo não lançado')
  if (R({ house: true, visible: false }).status !== 404) e.push('interruptor geral desligado não dá 404 nem para a casa')
  if (R({ house: true, consent: false }).code !== 'remix_consent') e.push('Friday Groove sem consentimento')
  if (R({ house: true, imageUrl: '' }).code !== 'remix_photo') e.push('Friday Groove sem foto')

  // (C) o servidor monta
  const ok1 = R({ house: true, prompt: 'IGNORE a celebrity', engine: 'veo', seconds: 15 })
  if (!ok1.ok) e.push('casa não resolve o Friday Groove: ' + ok1.code)
  else {
    const b = ok1.body
    if (b.engine !== 'hollywood' || b.seconds !== 5 || b.aspect !== null || b.remix !== ID) e.push('motor/duração/formato/remix não vêm do catálogo')
    if (/IGNORE|celebrity/.test(b.prompt)) e.push('prompt do navegador entrou')
    if (b.prompt !== fr.faceRemixPrompt(house)) e.push('prompt ≠ faceRemixPrompt')
    if (!b.prompt.startsWith(fr.FACE_REMIX_PREFIX) || !b.prompt.includes('Each person has exactly two arms and two hands.') || !b.prompt.includes('Continuous single shot, no cuts.') || !b.prompt.endsWith('No text, no captions, no logos, no watermark.')) e.push('prompt de movimento sem identidade/mãos/sem corte/sufixo')
    if (b.prompt.length > 1000) e.push('prompt acima do teto do clipe')
    const fq = fr.faceRemixForRequest(ID, { engine: 'hollywood', mode: 'i2v', seconds: 5, prompt: b.prompt, imageUrl: PHOTO })
    if (!fq.ok || fq.item?.id !== ID) e.push('submitClip não reconhece o pedido do Friday Groove')
    if (fr.faceRemixForRequest(ID, { engine: 'hollywood', mode: 'i2v', seconds: 5, prompt: b.prompt + ' x', imageUrl: PHOTO }).ok) e.push('pedido adulterado passa no submitClip')
    const row = { prompt: b.prompt, engine: 'hollywood', seconds: 5, mode: 'image', model: fr.FACE_REMIX_KEYFRAME_MODEL }
    if (fr.faceRemixForRow(row)?.id !== ID || fr.faceRemixStageForRow(row) !== 'keyframe') e.push('settleClip não reconhece a linha (etapa 1)')
    if (fr.faceRemixStageForRow({ ...row, model: 'fal-ai/kling-video/o3/pro/image-to-video' }) !== 'video') e.push('settleClip não reconhece a etapa 2')
  }
  const kp = fr.faceRemixKeyframePrompt(house, true)
  if (!kp.includes(fr.FACE_REMIX_FRAMING_DANCE) || !/both arms and both hands fully inside the frame/.test(fr.FACE_REMIX_FRAMING_DANCE)) e.push('quadro-chave sem o plano de dança com braços e mãos inteiros')
  if (kp.length > 2000) e.push('quadro-chave acima de 2000 caracteres')
  if (!kp.includes(fr.FACE_REMIX_IDENTITY) || !kp.includes('visibly DIFFERENT person')) e.push('quadro-chave sem identidade / sem anti-clone')
  const kin = fr.faceRemixKeyframeInput(house, PHOTO)
  if (kin.aspect_ratio !== '9:16' || kin.resolution !== '1K' || kin.num_images !== 1) e.push('quadro-chave fora de 9:16/1K/1 imagem')
  // os modelos da galeria seguem com os planos de antes
  const gb = fr.faceRemixById('golden-ball')
  if (!gb || !fr.faceRemixKeyframePrompt(gb).includes(fr.FACE_REMIX_FRAMING)) e.push('Golden Ball perdeu o plano médio')

  // (D) dinheiro
  if (fr.faceRemixCredits(house) !== 10) e.push('preço ≠ 10')
  if (fr.faceRemixFalUsd(house) !== 0.71) e.push('custo fal ≠ US$ 0,71: ' + fr.faceRemixFalUsd(house))

  // (E) rota
  if (!route.includes('publicFaceRemixes((engine) => access(engine).ok, isInternalEmail(user.email))')) e.push('GET da conta não passa a casa aos modelos da casa')
  if (!route.includes('imageUrl: body.image_url ?? body.imageUrl, house: isInternalEmail(user.email), consent: body.consent')) e.push('POST não passa a casa ao resolvedor')
  if (!/const guestRemixes = faceRemixVisible\(false\) \? publicFaceRemixes\(\(engine\) => guest\(engine\)\.ok\) : \[\]/.test(route)) e.push('visitante passou a ver modelos da casa')

  // (F) KINEO-DANCA-PUBLICA-3110 — o cartão na grade de efeitos do /clips (onde a pessoa procura efeito); home intocada
  const ui = over[F.ui] ?? read(F.ui)
  if (!ui.includes('const houseRemixes = faceRemixes.filter((r) => r.house === true)')) e.push('/clips não separa os modelos da casa')
  if (!/\{!remix && \(effects\.length > 0 \|\| houseRemixes\.length > 0\) && \(/.test(ui)) e.push('grade de efeitos some sem efeitos mesmo com modelo da casa')
  const card = ui.match(/\{houseRemixes\.map\(\(rx\) => \([\s\S]*?\n {12}\)\)\}/)?.[0] ?? ''
  if (!card) e.push('/clips sem o cartão do modelo da casa na grade de efeitos')
  else {
    if (!card.includes('data-clip-action="select_face_remix"') || !card.includes('onClick={() => chooseHouseRemix(rx.id)}')) e.push('cartão não abre o remix')
    if (!card.includes('src={rx.video} poster={rx.poster}') || !card.includes('{rx.engine_label}')) e.push('cartão sem prévia/selo do motor')
    if (/credits|\bcr\b|\$/.test(card)) e.push('cartão com preço (o preço mora só no botão do painel)')
  }
  const fn = ui.match(/function chooseHouseRemix\(id: string\) \{[\s\S]*?\n {2}\} \/\/ KINEO-DANCA-PUBLICA-3110/)?.[0] ?? ''
  if (!fn.includes('setRemixId(id)') || !fn.includes('setEffectKey(null)') || !fn.includes("trackClosedEvent('face_remix_opened'")) e.push('chooseHouseRemix não abre o painel / não mede')
  if (/fetch\(|send\(|generateRemix\(/.test(fn)) e.push('clicar no cartão gera/cobra algo')
  if (/\brx\.house\b|faceRemixes\.map\(/.test(ui.replace(card, ''))) e.push('/clips lista os remixes da galeria (Golden Ball etc.) fora da home')
  for (const h of HOME) if (fs.existsSync(path.join(ROOT, h)) && /friday-groove|DANCA-PUBLICA/.test(over[h] ?? read(h))) e.push('home tocada: ' + h)
  for (const p of [house.video, house.poster]) { const st = fs.existsSync(path.join(ROOT, 'public', p)) ? fs.statSync(path.join(ROOT, 'public', p)) : null; if (!st || st.size < 20_000 || st.size > 1_500_000) e.push('prévia/pôster fora do tamanho: ' + p) }

  // marca
  if (!src.includes(MARCA) || !src.includes('[TRAVA 8.2 — vai do fundador 31/10 "quero colocar essa dança nos clips"]')) e.push('módulo sem marca/TRAVA')
  for (const [rel, txt] of [[F.remix, src], [F.ui, ui]]) if (!txt.includes(MARCA_PUB) || !txt.includes('[TRAVA 8.2 — vai do fundador 31/10 "3A"]')) e.push(rel + ' sem a marca/TRAVA do lançamento')
  if (!route.includes(MARCA)) e.push('rota sem a marca')
  return e
}

console.log('KINEO-DANCA-SEXTOU-3110 — Friday Groove (dança de sexta no remix de rosto)')
const roda = (over) => { try { return checa(over) } catch (err) { return ['checa lançou: ' + (err instanceof Error ? err.message : String(err))] } }
const erros = roda()
for (const x of erros) console.log('   ·', x)
ok(erros.length === 0, `fonte atual: ${erros.length} erro(s)`)

const mut = (rel, from, to) => { const s = read(rel); if (!s.includes(from)) throw new Error('mutante não aplicável: ' + from.slice(0, 60)); return { [rel]: s.replace(from, to) } }
const mutantes = [
  ['volta a ser só da casa', mut(F.remix, 'launched: true, // KINEO-DANCA-PUBLICA-3110', 'launched: false, // KINEO-DANCA-PUBLICA-3110')], // KINEO-DANCA-PUBLICA-3110
  ['casa ignorada no filtro (todos veem)', mut(F.remix, 'i.launched === true || isInternal === true', 'true')],
  ['filtro ignora o lançamento (só a casa vê)', mut(F.remix, 'i.launched === true || isInternal === true', 'isInternal === true')], // KINEO-DANCA-PUBLICA-3110
  ['cartão perde house (some da grade)', mut(F.remix, 'house: faceRemixHouseById(i.id) !== null,', 'house: false,')], // KINEO-DANCA-PUBLICA-3110
  ['Golden Ball vira modelo da casa', mut(F.remix, 'house: faceRemixHouseById(i.id) !== null,', 'house: true,')], // KINEO-DANCA-PUBLICA-3110
  ['/clips sem o cartão', mut(F.ui, 'const houseRemixes = faceRemixes.filter((r) => r.house === true)', 'const houseRemixes = faceRemixes.filter(() => false)')], // KINEO-DANCA-PUBLICA-3110
  ['/clips lista todos os remixes', mut(F.ui, 'const houseRemixes = faceRemixes.filter((r) => r.house === true)', 'const houseRemixes = faceRemixes')], // KINEO-DANCA-PUBLICA-3110
  ['cartão com preço', mut(F.ui, '<span className="pr trend-go"><UiLabel>Put your face in it →</UiLabel></span>', '<span className="pr trend-go">{rx.credits} credits</span>')], // KINEO-DANCA-PUBLICA-3110
  ['cartão não abre o painel', mut(F.ui, '    setRemixId(id) // KINEO-DANCA-PUBLICA-3110\n', '')], // KINEO-DANCA-PUBLICA-3110
  ['grade some sem efeitos', mut(F.ui, '{!remix && (effects.length > 0 || houseRemixes.length > 0) && (', '{!remix && effects.length > 0 && (')], // KINEO-DANCA-PUBLICA-3110
  ['resolvedor dá o modelo da casa a qualquer um', mut(F.remix, 'faceRemixHouseFor(raw, ctx.house === true)', 'faceRemixHouseFor(raw, true)')],
  ['GET de conta comum com modelos da casa', mut(F.remix, 'isInternal: boolean = false): PublicFaceRemix[]', 'isInternal: boolean = true): PublicFaceRemix[]')],
  ['rota diz que todo mundo é da casa', mut(F.route, 'house: isInternalEmail(user.email), consent:', 'house: true, consent:')],
  ['submitClip não conhece o modelo da casa', mut(F.remix, 'return faceRemixById(id) ?? faceRemixHouseById(id)', 'return faceRemixById(id)')],
  ['settleClip não conhece a linha da casa', mut(F.remix, '[...faceRemixItems(), ...faceRemixHouseItems(true)].find((i) =>', 'faceRemixItems().find((i) =>')],
  ['plano de dança corta as mãos', mut(F.remix, 'both arms and both hands fully inside the frame with empty space on each side, ', '')],
  ['dança vira plano médio', mut(F.remix, "framing === 'dance' ? FACE_REMIX_FRAMING_DANCE :", "framing === 'dance' ? FACE_REMIX_FRAMING :")],
  ['coreografia perde a mão aberta', mut(F.remix, 'the open hand waves palm-forward at shoulder height', 'smiles at the camera')],
  ['mão volta a cobrir o rosto', mut(F.remix, ', never raised in front of the face and never pushed toward the lens, so the whole face stays uncovered from the first frame to the last,', ',')], // 2º e 3º testes (12501432, 71e83039): a mão aberta tapou meio rosto no fim
  ['volta a frase reprovada do 3º render', mut(F.remix, 'at shoulder height, far out to the side and below the chin', 'beside the face, never covering it')], // KINEO-DANCA-PUBLICA-3110
  ['quadro-chave volta a abrir com a palma na frente', mut(F.remix, 'one arm stretched out to the side with the open hand at shoulder height, well away from the face', 'one hand raised palm-out toward the camera')], // KINEO-DANCA-PUBLICA-3110
  ['dançarina sai do centro', mut(F.remix, ' The person from the photo stays centered in the frame the whole time.', '')], // 1º teste (58222917): saiu para a borda direita no fim
  ['figurantes viram clones', mut(F.remix, "extras: 'four dancers in a loose row behind, all in plain black outfits, copying the same moves — an older person with short grey hair, a tall young person with a shaved head, a person with long braids and a short person with curly hair and glasses'", "extras: 'four dancers behind'")],
]
for (const [nome, over] of mutantes) ok(roda(over).length > 0, `mutante fica vermelho: ${nome}`)

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
