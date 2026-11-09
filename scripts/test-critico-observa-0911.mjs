// KINEO-CRITICO-OBSERVA-0911 [TRAVA 8.2 — "vai no crítico" do fundador 09/11] — guardião.
// Prova OFFLINE (sem OpenAI, sem fal), EXECUTANDO o código REAL transpilado de lib/cinematic/criticoStill.ts:
//   (A) sem folha de personagem o crítico manda o pedido OBSERVADOR (o modelo descreve; nenhuma ordem "ALSO FAIL");
//       com folha, o pedido de sempre, byte a byte; STILL_CRITIC_FORMAT=veredito volta tudo ao pedido de sempre.
//   (B) a decisão sai do CÓDIGO: estilo pedido × meio visto, "sem gente" × pessoas visíveis, época/origem só quando o prompt as declara.
//       Casos reais da medição de 09/11 (docs/MEDICAO-CRITICO-STILL-2026-11-09.md): Dino/Léo em 3D num filme animado e a Mara/Jesus
//       fotografados num filme fotorreal eram reprovados por "estilo" — agora passam; a cena "sem gente" com pessoa continua FAIL.
//   (C) resposta no formato antigo ({verdict}) continua lida pela leitura de sempre; o laço do 'enforce' refaz e escolhe a aprovada.
//   (M) mutantes ficam vermelhos.  (R) recibo exato da trava.
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
import { readFileSync } from 'node:fs'
import { deltaCriticoObserva0911Exato } from './test-support/desfaz-critico-observa-0911.mjs'
import { execFileSync } from 'node:child_process'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const F = 'lib/cinematic/criticoStill.ts'
const globals = { AbortController, setTimeout: () => 0, clearTimeout() {}, Date, Math, JSON, Promise, process: { env: {} } }
const carrega = (mut) => createOfflineLoader({ globals, source: (rel, text) => (rel === F && mut ? mut(text) : text) })(F)

const resp = (obj) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(obj) } }], usage: { prompt_tokens: 1000, completion_tokens: 120 } }) })
const fila = (lista) => { const pedidos = []; let i = 0; const f = async (_u, init) => { pedidos.push(JSON.parse(init.body)); return resp(lista[Math.min(i++, lista.length - 1)]) }; f.pedidos = pedidos; return f }
const obs = (o) => ({ seen: 'x', medium: 'photo', people_visible: 1, anatomy_defect: false, garbled_text: false, artifact: false, subject_kind_ok: true, era_violation: false, main_person_looks: '', origin_mismatch: false, reason: '', ...o })

// formas reais (prompts gravados nos pedidos de 06-09/11)
const FOTO = 'Film visual medium: photorealistic, ultra-detailed. '
const DESENHO = 'Film visual medium: stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic. '
const P_MARA = `${FOTO}A dimly lit old elevator interior with Mara entering, her silhouette visible as she steps inside.`
const P_DINO = `${DESENHO}A vibrant, colorful forest with Dino, the dinosaur, joyfully discovering a basket overflowing with bright, assorted fruits.`
const P_SEM_GENTE = `${FOTO}A busy professional in a dimly lit room, looking at a dirty Range Rover through a window. No people, no human figures and no faces anywhere in this shot.`
const P_ARABE = `${FOTO}The main person, if one is shown in this shot, is Arab, with the natural features of Arab people. A wide shot of several strong men straining under enormous treasure keys.`
const e = (prompt, extra = {}) => ({ indice: 0, url: 'https://f/s.jpg', mostra: prompt.replace(/^Film visual medium:[^.]*\.\s*/, ''), fala: 'narração', prompt, seed: 7, ...extra })
const FOLHA = { referencia: { url: 'https://f/folha.jpg', descricao: 'Dino, a green dinosaur with yellow eyes' } }

const C = carrega()

// (A) qual pedido sai
{
  const f = fila([obs({})])
  await C.chamarCritico(e(P_MARA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: f })
  const p = f.pedidos[0]
  checa('A1 sem folha: sistema observador', p.messages[0].content === C.STILL_CRITIC_SISTEMA_OBSERVA)
  checa('A2 sem folha: nenhuma ordem "ALSO FAIL" e nenhum critério (6) STYLE no pedido', !JSON.stringify(p).includes('ALSO FAIL') && !JSON.stringify(p).includes('(6) STYLE'))
  checa('A3 sem folha: 1 imagem detail low e teto de 320 tokens', p.messages[1].content.filter((x) => x.type === 'image_url').length === 1 && p.messages[1].content[1].image_url.detail === 'low' && p.max_tokens === 320)
  const g = fila([{ verdict: 'PASS', issues: [], reason: '', score: 90 }])
  await C.chamarCritico(e(P_DINO, FOLHA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: g })
  checa('A4 com folha: o pedido de sempre, byte a byte', JSON.stringify(g.pedidos[0].messages) === JSON.stringify(C.montarPedidoAoCritico(e(P_DINO, FOLHA), 'https://f/s.jpg').messages) && g.pedidos[0].max_tokens === 120)
  checa('A5 interruptor STILL_CRITIC_FORMAT=veredito desliga o observador', C.usarCriticoObservador({}, C.formatoDoCritico('veredito')) === false && C.usarCriticoObservador({}, C.formatoDoCritico('')) === true && C.usarCriticoObservador(FOLHA, 'observa') === false)
}

// (B) a decisão em código, casos reais
const decide = async (prompt, o) => C.chamarCritico(e(prompt), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fila([obs(o)]) })
{
  const dino = await decide(P_DINO, { medium: '3d_animation', people_visible: 0 })
  checa('B1 Dino em 3D num filme animado: PASS (antes: "photographic, not animated")', dino.veredito === 'PASS' && dino.problemas.length === 0)
  const dinoFoto = await decide(P_DINO, { medium: 'photo', people_visible: 0 })
  checa('B2 dinossauro FOTOGRAFADO num filme animado: FAIL estilo', dinoFoto.veredito === 'FAIL' && dinoFoto.problemas.join() === 'estilo')
  const mara = await decide(P_MARA, { medium: 'photo' })
  checa('B3 Mara fotografada num filme fotorreal: PASS (antes: "not photorealistic live action")', mara.veredito === 'PASS')
  const maraDesenho = await decide(P_MARA, { medium: '3d_animation' })
  checa('B4 Mara em 3D num filme fotorreal: FAIL estilo', maraDesenho.veredito === 'FAIL' && maraDesenho.problemas.join() === 'estilo')
  const semGente = await decide(P_SEM_GENTE, { people_visible: 1 })
  checa('B5 cena "sem gente" com pessoa visível: FAIL pessoa', semGente.veredito === 'FAIL' && semGente.problemas.includes('pessoa'))
  const semGenteVazia = await decide(P_SEM_GENTE, { people_visible: 0 })
  checa('B6 cena "sem gente" vazia: PASS', semGenteVazia.veredito === 'PASS')
  const pessoaComum = await decide(P_MARA, { people_visible: 3 })
  checa('B7 pessoas numa cena que NÃO é "sem gente": não reprova', pessoaComum.veredito === 'PASS')
  const origem = await decide(P_ARABE, { origin_mismatch: true, reason: 'Main person looks Sub-Saharan African, not Arab.' })
  checa('B8 origem declarada e diferente: FAIL origem com o motivo do modelo', origem.veredito === 'FAIL' && origem.problemas.join() === 'origem' && /not Arab/.test(origem.motivo))
  const origemSemMarca = await decide(P_MARA, { origin_mismatch: true })
  checa('B9 origem sem marca no prompt: ignorada', origemSemMarca.veredito === 'PASS')
  const epocaSemMarca = await decide(P_MARA, { era_violation: true })
  checa('B10 época sem marca no prompt: ignorada', epocaSemMarca.veredito === 'PASS')
  const texto = await decide(P_MARA, { garbled_text: true, reason: 'Sign reads TANDIDANEY WOTER' })
  checa('B11 letreiro embaralhado: FAIL texto', texto.veredito === 'FAIL' && texto.problemas.join() === 'texto')
  const sujeito = await decide(P_MARA, { subject_kind_ok: false, reason: 'a hen instead of a woman' })
  checa('B12 tipo de sujeito errado: FAIL sujeito', sujeito.veredito === 'FAIL' && sujeito.problemas.join() === 'sujeito')
  const dois = await decide(P_MARA, { anatomy_defect: true, artifact: true })
  checa('B13 nota cai com mais defeitos (PASS 90 > 1 defeito 30 > 2 defeitos 20)', mara.nota === 90 && sujeito.nota === 30 && dois.nota === 20)
  // revisão adversarial 09/11 (volta 1): as proteções antigas que o pedido observador tinha perdido
  const pelucia = await decide(`${FOTO}A small blue dog sits alone on a rainy city sidewalk at dusk.`, { medium: 'toy_plush_doll_figurine_or_clay', people_visible: 0 })
  checa('B14 youbykh: pelúcia fotografada num filme fotorreal é FAIL estilo', pelucia.veredito === 'FAIL' && pelucia.problemas.join() === 'estilo')
  const variante = await decide(P_MARA, { medium: '3D animation' }), variante2 = await decide(P_DINO, { medium: 'Photograph', people_visible: 0 })
  checa('B15 meio escrito fora do enum ("3D animation", "Photograph") é normalizado', variante.problemas.join() === 'estilo' && variante2.problemas.join() === 'estilo')
  const textoBool = await decide(P_MARA, { garbled_text: 'true', subject_kind_ok: 'false' })
  checa('B16 booleano escrito como texto ("true"/"false") conta', textoBool.veredito === 'FAIL' && textoBool.problemas.join() === 'texto,sujeito')
  const semMotivo = await decide(P_MARA, { subject_kind_ok: false, reason: '' })
  checa('B17 FAIL sem "reason" deixa o motivo vazio (nunca vira exigência inventada)', semMotivo.veredito === 'FAIL' && semMotivo.motivo === '')
  checa('B18 pedido cobre jeans/moletom/tênis "fashionable only after" (gustavoq 1950) e o mascote no lugar do personagem (Krishna/Lucifer)',
    /became common or fashionable only after the stated period: jeans or denim, hoodies, sneakers/.test(C.STILL_CRITIC_SISTEMA_OBSERVA) && /cute cartoon mascot, plush toy, chibi or generic smiling creature standing in for a requested person, god, hero/.test(C.STILL_CRITIC_SISTEMA_OBSERVA))
  checa('B20 época julgada contra o ANO declarado (1997: jeans/tênis/puffer são da época)', /judge each item against the stated year/.test(C.STILL_CRITIC_SISTEMA_OBSERVA) && /in 1997 jeans, hoodies, sneakers and puffer jackets are fine/.test(C.STILL_CRITIC_SISTEMA_OBSERVA))
  const render = await decide(P_MARA, { medium: 'photorealistic render' }), cgi = await decide(P_MARA, { medium: 'Photorealistic CGI' }), anim3d = await decide(P_DINO, { medium: 'realistic 3D animation', people_visible: 0 })
  checa('B21 "photorealistic render/CGI" num filme fotorreal é foto (PASS); "realistic 3D animation" num filme animado passa', render.veredito === 'PASS' && cgi.veredito === 'PASS' && anim3d.veredito === 'PASS')
  const hibrida = await C.chamarCritico(e(P_MARA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fila([{ seen: 'x', medium: 'photo', verdict: 'FAIL', issues: ['text'], reason: 'garbled', score: 20 }]) })
  checa('B19 resposta híbrida (seen + verdict) segue a leitura de sempre', hibrida.veredito === 'FAIL' && hibrida.problemas.join() === 'texto' && hibrida.nota === 20)
}

// (C) compatibilidade e o laço do enforce
{
  const velho = await C.chamarCritico(e(P_MARA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fila([{ verdict: 'FAIL', issues: ['text'], reason: 'garbled sign', score: 20 }]) })
  checa('C1 resposta no formato antigo continua lida (FAIL texto)', velho.veredito === 'FAIL' && velho.problemas.join() === 'texto')
  checa('C2 JSON ilegível vira null na leitura observadora', C.lerObservacaoDoCritico('nada', C.contextoDoCritico0311(P_MARA)) === null && C.lerObservacaoDoCritico('{"verdict":"PASS"}', C.contextoDoCritico0311(P_MARA)) === null)
  const filme = C.novoFilmeDoCritico('enforce')
  const f = fila([obs({ medium: '3d_animation' }), obs({ medium: 'photo' })])
  const r = await C.criticarStill(e(P_MARA), { filme, gerarStill: async () => 'novo://1', apiKey: 'k', agora: () => 0, fetchImpl: f })
  checa('C3 enforce: foto em 3D num filme fotorreal é refeita e a nova aprovada segue', r.url === 'novo://1' && r.relato.regeracoes === 1 && f.pedidos.length === 2)
}

// (M) mutantes
{
  const M1 = carrega((t) => t.replace("if (ctx.estilo === 'desenho' && medio === 'photo') problemas.push('estilo')", "if (medio !== '3d_animation') problemas.push('estilo')"))
  const m1 = await M1.chamarCritico(e(P_MARA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fila([obs({ medium: 'photo' })]) })
  checa('M1 regra de estilo que ignora o pedido é pega (Mara reprovada)', m1.veredito === 'FAIL')
  const M2 = carrega((t) => t.replace("return formato === 'observa' && !e.referencia", "return formato === 'observa'"))
  const g = fila([obs({})])
  await M2.chamarCritico(e(P_DINO, FOLHA), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: g })
  checa('M2 observador ligado também com folha é pego (pedido de sempre some)', g.pedidos[0].messages[0].content === M2.STILL_CRITIC_SISTEMA_OBSERVA)
  const M3 = carrega((t) => t.replace("if (ctx.semGente && Number(j.people_visible) > 0) problemas.push('pessoa')", ''))
  const m3 = await M3.chamarCritico(e(P_SEM_GENTE), 'https://f/s.jpg', { timeoutMs: 6000, apiKey: 'k', fetchImpl: fila([obs({ people_visible: 1 })]) })
  checa('M3 sem a regra "sem gente" a pessoa passaria (mutante vivo seria PASS)', m3.veredito === 'PASS')
}

// (R) recibo exato
{
  const atual = readFileSync(new URL('../' + F, import.meta.url), 'utf8')
  let base = null
  try { base = execFileSync('git', ['show', `${JSON.parse(readFileSync(new URL('./test-support/desfaz-critico-observa-0911-fontes.json', import.meta.url), 'utf8')).base}:${F}`], { encoding: 'utf8', maxBuffer: 64 << 20 }) } catch {}
  checa('R1 recibo exato: base + esta entrega = arquivo de hoje', deltaCriticoObserva0911Exato(atual, base, F))
  checa('R2 recibo recusa edição a mais', !deltaCriticoObserva0911Exato(atual + '\n// a mais', base, F))
}

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) { console.log('Falhas:\n  · ' + falhas.join('\n  · ')); process.exit(1) }
