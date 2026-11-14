// KINEO-FICHA-ANTES-DO-RENDER-1311 [CEO 13/11, caso da Maya 28f057bc] — guardião.
// Prova OFFLINE, EXECUTANDO o código real, com os 3 prompts REAIS do filme (cinematic_submission_claim.response.kling4_trial.scene_plan):
//   (A) o plano que o juiz marca com a ficha contradizendo o pedido tem a ordem do protagonista refeita com a pessoa da ideia: "the mother…
//       long, straight hair" some do plano INTEIRO (inclusive as frases que vazaram depois da ação) e fica "curly black hair"; a ação fica;
//   (B) sem pessoa da ideia: a ordem sai; o plano que o juiz não marcou fica igual; juiz ausente/UNVERIFIED/sem a_ficha = byte a byte;
//   (C) o texto que vai ao Kling 4 (promptDaCenaKling4) deixa de levar a ficha errada;
//   (D) a rota chama o juiz ANTES das imagens-chave e do 1º POST, só no Kling 4 grátis, atrás do interruptor, e grava o evento;
//   (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (t) => String(t).replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const ARQ = 'lib/cinematic/fichaAntesDoRender1311.ts'
const globals = { AbortController, setTimeout, clearTimeout }
const carrega = (mutar = null) => createOfflineLoader({ globals, source: (rel, text) => (mutar && rel === ARQ ? mutar(text) : text) })

// os 3 prompts do filme 28f057bc, como o claim gravou
const LOOK = 'stylized 3D animated film look, soft rounded shapes, bright saturated colors, not photorealistic'
const MAE = `the mother, a middle-aged woman with a warm demeanor, standing at an average height. She has smooth, caramel-toned skin and long, straight hair. Her eyes are deep brown, reflecting kindness. She wears a flowing, floral-patterned dress in vibrant colors, with a distinctive beaded necklace; origin: a Martiniquais woman, with the natural features of Martiniquais people; drawn in the film's own look (${LOOK}), the same character design in every scene`
const VAZOU = `She has smooth, caramel-toned skin and long, straight hair. Her eyes are deep brown, reflecting kindness. She wears a flowing, floral-patterned dress in vibrant colors, with a distinctive beaded necklace; origin: a Martiniquais woman, with the natural features of Martiniquais people; drawn in the film's own look (${LOOK}), the same character design in every scene.`
const MAYA = 'a beautiful 24-year-old Martinican woman, with curly black hair'
const cauda = `, same 3D animated art style in every scene, same character design and palette, consistent lighting, never mix with live-action or photorealism Setting as the customer asked: the back of the house. The same main character appears in this scene, consistent design: ${MAYA}.`
const ordem = `The only person in this shot is the same main character (${MAE}); any other person described below is replaced by this same character. `
const ACOES = [
  "Aerial view of Maya walking on a sunlit path towards her grandmother's house in Martinique.",
  'A close-up of the old Creole house, its wooden shutters slightly ajar, vibrant green vines cascading down, enveloping the weathered walls.',
  "A low-angle shot of a locked door, a shadowy figure's hand knocking softly; the air thick with anticipation as a whisper echoes, 'Enfin, Maya... Je t'attendais.'.",
]
const PROMPTS = ACOES.map((a, i) => `Film visual medium: ${LOOK}. ${ordem}${i === 0 ? 'Opening shot: show the described subject and action immediately in the first frame, clearly readable; no unrelated establishing landscape or slow fade-in. ' : ''}${LOOK}. ${a} ${VAZOU}${cauda}`)
const veredito = (over = {}) => ({ status: 'JUDGED', reprovado: true, falhas: ['a_ficha'], nota: 75, ms: 6809, cenas: 3, planos: [{ plano: 1, a: 'contradiz', b: 'nao', c: 'nao' }, { plano: 2, a: 'contradiz', b: 'nao', c: 'nao' }, { plano: 3, a: 'bate', b: 'nao', c: 'nao' }], defeitos: ['plano 1 · ficha contradiz "24-year-old Martinican woman": "the mother, a middle-aged woman"', 'plano 2 · ficha contradiz "24-year-old Martinican woman": "the mother, a middle-aged woman"'], ...over })

function provas(L) {
  const erros = []
  const m = L(ARQ), c = L('lib/cinematic/cenaKling4.ts'), st = L('lib/cinematic/sceneStyle.ts')
  if (m.fichaDaOrdem(PROMPTS[0]) !== MAE) erros.push('fixture: a ordem não foi lida')
  // (A) com a pessoa da ideia
  const r = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: MAYA })
  for (const i of [0, 1]) {
    const p = r.prompts[i]
    if (/the mother|straight hair|middle-aged|caramel-toned/.test(p)) erros.push(`A plano ${i + 1} ainda leva a ficha reprovada`)
    if (!p.includes(`The only person in this shot is the same main character (${MAYA})`) || !p.includes('curly black hair')) erros.push(`A plano ${i + 1} sem a pessoa da ideia na ordem`)
    if (!p.includes(ACOES[i]) || !p.startsWith(`Film visual medium: ${LOOK}. `)) erros.push(`A plano ${i + 1} perdeu a ação ou a trava do estilo`)
  }
  if (r.prompts[2] !== PROMPTS[2]) erros.push('B o plano que o juiz não marcou mudou')
  if (JSON.stringify(r.relato.refeitos) !== JSON.stringify([{ plano: 1, acao: 'ideia' }, { plano: 2, acao: 'ideia' }]) || r.relato.planos_contradiz.join() !== '1,2') erros.push('A relato: ' + JSON.stringify(r.relato))
  // (B) sem pessoa da ideia; juiz que não reprovou a ficha
  const s = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: null })
  if (/The only person in this shot|the mother|straight hair/.test(s.prompts[0]) || !s.prompts[0].includes(ACOES[0]) || s.relato.refeitos[0]?.acao !== 'sem_ordem') erros.push('B sem a ideia a ordem não saiu limpa')
  for (const [nome, v] of [['null', null], ['UNVERIFIED', veredito({ status: 'UNVERIFIED' })], ['sem a_ficha', veredito({ falhas: ['e_final'] })]]) {
    const x = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: v, pessoaDaIdeia: MAYA })
    if (x.prompts.some((p, i) => p !== PROMPTS[i]) || x.relato.refeitos.length) erros.push('B juiz ' + nome + ' mexeu no plano')
  }
  // (C) o texto que vai ao Kling 4
  const style = st.deriveStyleAnchor('stylized 3D animated film')
  const antes = c.promptDaCenaKling4(PROMPTS[0], style, 0, true), depois = c.promptDaCenaKling4(r.prompts[0], style, 0, true)
  if (!/the mother|straight hair/.test(antes)) erros.push('C fixture: o texto do Kling 4 de antes já não tinha a ficha errada')
  if (/the mother|straight hair/.test(depois) || !/curly black hair/.test(depois)) erros.push('C o texto do Kling 4 ainda leva a ficha errada: ' + depois.slice(0, 200))
  // revisão da CEO 13/11 — C3: sem pessoa da ideia, sujeito criatura/objeto/veículo → o sujeito do pedido no lugar da ordem (nunca vazio)
  const DINO = 'a huge long-necked Argentinosaurus dinosaur'
  const c3 = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: null, sujeitoDoPedido: { sujeito: DINO, tipo: 'criatura' } })
  if (!c3.prompts[0].includes(`Main subject clearly visible in frame: ${DINO}.`) || /The only person in this shot|the mother/.test(c3.prompts[0]) || c3.relato.refeitos[0]?.acao !== 'sujeito' || !c3.prompts[0].includes(ACOES[0])) erros.push('C3 criatura sem o sujeito no lugar da ordem: ' + JSON.stringify(c3.relato.refeitos))
  if (!/argentinosaurus/i.test(c.promptDaCenaKling4(c3.prompts[0], style, 0, true))) erros.push('C3 o sujeito não chegou ao texto do Kling 4')
  // revisão da CEO 14/11: o sujeito terminado em "s" chega inteiro ("octopus" virava "octopu"; "a red bus" virava "a red bu")
  for (const [suj, tipo] of [['a giant octopus', 'criatura'], ['three dinosaurs.', 'criatura'], ['a red bus ', 'veiculo']]) {
    const limpo = suj.replace(/[.\s]+$/u, '')
    const p = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: null, sujeitoDoPedido: { sujeito: suj, tipo } }).prompts[0]
    if (!p.includes(`Main subject clearly visible in frame: ${limpo}. `)) erros.push(`C3 o sujeito "${limpo}" não chegou inteiro: ${p.slice(p.indexOf('Main subject'), p.indexOf('Main subject') + 70)}`)
  }
  if (m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: null, sujeitoDoPedido: { sujeito: 'a young woman', tipo: 'pessoa' } }).prompts[0].includes('Main subject clearly visible')) erros.push('C3 pessoa virou sujeito (só criatura/objeto/veículo)')
  // C5: o juiz julgou outro número de planos (a reserva descarta cena vazia) → nada é refeito, e o relato diz
  const c5 = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito({ cenas: 2 }), pessoaDaIdeia: MAYA })
  if (c5.prompts.some((p, i) => p !== PROMPTS[i]) || !c5.relato.indice_incerto) erros.push('C5 com outro número de planos, mexeu')
  // C4: a frase da ação parecida com a ficha (mesmas palavras, outra frase) não é comida; só a frase IGUAL da ficha sai
  const PARECIDA = 'She has long, straight hair braided with ribbons and walks to the door.'
  const c4 = m.semFichaReprovada(PROMPTS[0].replace(ACOES[0], `${ACOES[0]} ${PARECIDA}`), MAYA).prompt
  if (!c4.includes(PARECIDA) || c4.includes('She has smooth, caramel-toned skin')) erros.push('C4 comeu a frase da ação ou deixou a da ficha')
  // C2: o eixo do filme grátis (passo seguinte da rota) não recoloca a ficha reprovada
  const comEixo = c.eixosDoFilmeGratis(r.prompts, style)
  if (comEixo.slice(0, 2).some((p) => /the mother|straight hair/.test(p))) erros.push('C2 o eixo do filme grátis recolocou a ficha reprovada nos planos refeitos')
  // ── revisão independente 14/11 ──
  // M6: a acusação do plano 2 foi DESCARTADA pelo próprio juiz (a citação não está no texto: não há linha "plano 2 · ficha contradiz" em defeitos) → só o plano 1 é refeito
  const m6 = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito({ defeitos: ['plano 1 · ficha contradiz "24-year-old": "the mother"'], citacoes_descartadas: 1, descartes: ['plano 2 · a_ficha: "a tall bearded sailor" × "a pirate captain"'] }), pessoaDaIdeia: MAYA })
  if (m6.relato.planos_contradiz.join() !== '1' || m6.prompts[1] !== PROMPTS[1] || m6.prompts[0] === PROMPTS[0]) erros.push('M6 refez o plano cuja acusação o juiz descartou: ' + JSON.stringify(m6.relato.refeitos))
  if (m.planosComFichaVerificada(veredito()).join() !== '1,2' || m.planosComFichaVerificada(null).length || m.planosComFichaVerificada({ defeitos: ['sujeito do pedido ausente', 'plano 3 · criatura/adjetivo no lugar do protagonista: "x"'] }).length) erros.push('M6 planosComFichaVerificada')
  // veredito torto (sem falhas, sem planos, sem defeitos) e prompts nulos: nada lança, nada muda
  for (const [nome, v] of [['sem falhas', { status: 'JUDGED', cenas: 3, planos: [] }], ['sem planos', { status: 'JUDGED', cenas: 3, falhas: ['a_ficha'] }], ['falhas não-lista', { status: 'JUDGED', cenas: 3, falhas: 7, planos: 'x', defeitos: 7 }]]) {
    let x = null
    try { x = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: v, pessoaDaIdeia: MAYA }) } catch (e) { erros.push(`veredito ${nome} LANÇOU: ${e.message}`) }
    if (x && (x.prompts.some((p, i) => p !== PROMPTS[i]) || x.relato.refeitos.length)) erros.push(`veredito ${nome} mexeu no plano`)
  }
  try { if (m.refazerPlanoDaFicha({ prompts: null, veredito: veredito(), pessoaDaIdeia: MAYA }).prompts.length) erros.push('prompts nulos viraram plano') } catch (e) { erros.push('prompts nulos LANÇOU: ' + e.message) }
  // C3 (mutante do revisor): sujeito de tipo DESCONHECIDO (null) não vira "Main subject" (só criatura, objeto e veículo)
  const semTipo = m.refazerPlanoDaFicha({ prompts: PROMPTS, veredito: veredito(), pessoaDaIdeia: null, sujeitoDoPedido: { sujeito: 'a giant octopus', tipo: null } })
  if (semTipo.prompts[0].includes('Main subject clearly visible') || semTipo.relato.refeitos[0]?.acao !== 'sem_ordem') erros.push('C3 sujeito de tipo desconhecido virou sujeito do plano')
  // C3 (bloqueio do revisor): o veredito só é reaproveitado quando o juiz leu EXATAMENTE o texto e as falas que foram à fal
  const FALAS = ['Maya walks home.', 'The old house waits.', 'Someone knocks.']
  const k4 = (ps) => ps.map((p, i) => ({ fala: FALAS[i], prompt: c.promptDaCenaKling4(p, style, i, true) }))
  // as 3 cenas da Maya já dizem o plano ("Aerial view", "A close-up", "A low-angle shot"): aqui as MESMAS cenas sem plano próprio, o caso em que o eixo entra
  const SEM_PLANO = ['Maya walks on a sunlit path towards her grandmother\'s house in Martinique.', 'Maya stands before the old Creole house, its wooden shutters slightly ajar.', 'Maya reaches the locked door as a hand knocks softly.']
  const CENAS = SEM_PLANO.map((a) => `Film visual medium: ${LOOK}. The only person in this shot is the same main character (the mother, with long, straight hair); any other person described below is replaced by this same character. ${LOOK}. ${a} She has long, straight hair, same 3D animated art style in every scene.`)
  const enviado = k4(c.eixosDoFilmeGratis(CENAS, style)) // o que vai à fal: os eixos do filme grátis entram DEPOIS do juiz, antes das imagens
  const lidoNovo = k4(c.eixosDoFilmeGratis(CENAS, style)) // o que o juiz lê hoje (a rota aplica os eixos na leitura)
  const lidoVelho = k4(CENAS) // o que ele lia antes da revisão
  if (!m.juizLeuOMesmoTexto(lidoNovo, enviado)) erros.push('C3 texto igual não foi reconhecido (o reaproveitamento morreu)')
  if (JSON.stringify(lidoVelho) !== JSON.stringify(enviado) && m.juizLeuOMesmoTexto(lidoVelho, enviado)) erros.push('C3 reaproveitou o veredito de um texto que mudou depois (eixos)')
  if (JSON.stringify(lidoVelho) === JSON.stringify(enviado)) erros.push('C3 fixture: os eixos do filme grátis não mudaram o texto (a prova ficou vazia)')
  const comOutraFicha = enviado.map((x, i) => (i === 0 ? { ...x, prompt: x.prompt.replace('straight hair', 'curly hair') } : x))
  if (comOutraFicha[0].prompt === enviado[0].prompt) erros.push('C3 fixture: a troca de ficha não mudou o texto')
  if (m.juizLeuOMesmoTexto(lidoNovo, comOutraFicha)) erros.push('C3 reaproveitou com a ficha trocada depois do juiz')
  if (m.juizLeuOMesmoTexto(lidoNovo, enviado.map((x, i) => (i === 2 ? { ...x, fala: 'Someone knocks twice.' } : x)))) erros.push('C3 reaproveitou com a fala encurtada depois do juiz')
  if (m.juizLeuOMesmoTexto(lidoNovo, enviado.slice(0, 2)) || m.juizLeuOMesmoTexto(lidoNovo.slice(0, 2), enviado) || m.juizLeuOMesmoTexto(null, enviado) || m.juizLeuOMesmoTexto([], []) || m.juizLeuOMesmoTexto(lidoNovo, null)) erros.push('C3 reaproveitou sem texto lido, vazio ou com outro número de planos')
  return erros
}

const base = provas(carrega())
checa(`A, B e C verdes nos prompts reais da Maya${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
// (D) a rota
const rota = lf(fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8'))
const iBloco = rota.indexOf('if (kling4TrialCandidate && fichaAntesDoRenderLigada() && !qualidadeHerdada) { // KINEO-FICHA-ANTES-DO-RENDER-1311')
// revisão independente 14/11 (C3): o "último toque" NÃO era o relógio — depois dele a rota ainda troca a ficha (pessoa do pedido, origem, trava de estilo),
// trava o desenho e limita o Kling 2.5. O juiz roda depois de TODOS e antes do ensaio de $0.
const ULTIMOS_TOQUES = ['classicScenePrompts[i] = relogioComPonteiros(classicScenePrompts[i])', 'const pessoa15 = elencoComPessoaDoPedido(pessoaPedida, elencoDoAjuste)', 'const travaEstiloDaCena = ', 'classicScenePrompts[i] = travarDesenhoInfantil(classicScenePrompts[i]', 'classicScenePrompts[i] = limitarPromptDoFilmeKling25(classicScenePrompts[i], i)']
const iRelogio = Math.max(...ULTIMOS_TOQUES.map((t) => { const i = rota.indexOf(t); return i < 0 ? Infinity : i }))
const iEnsaio = rota.indexOf('if (body.dry_run === true && isDryRunAccount(user.email)) {\n      const classicReport = classicDryRunReport({')
const iStills = rota.indexOf('const sceneStills: (string | null)[] = new Array(scenes.length).fill(null)')
const iPost = rota.indexOf('iniciarJuizDoPlano({ ...planoDoEnvio({ kling4Candidato: kling4TrialCandidate, kling4Input: () => (kling4Trial?.job')
checa('D o juiz roda depois de TODOS os toques no prompt e ANTES do ensaio de $0, das imagens-chave e do 1º POST', iRelogio > 0 && Number.isFinite(iRelogio) && iBloco > iRelogio && iEnsaio > iBloco && iStills > iEnsaio && iPost > iBloco)
checa('D um bloco só do juiz de antes (o interruptor e o filtro do Kling 4 grátis valem para tudo o que ele faz)', rota.split('fichaAntesDoRenderLigada()').length === 2 && rota.split('refazerPlanoDaFicha(').length === 2)
const bloco = rota.slice(iBloco, rota.indexOf('} // KINEO-FICHA-ANTES-DO-RENDER-1311', iBloco))
checa('D espera o veredito (teto do juiz), refaz pelo veredito com a pessoa da ideia e grava o evento', bloco.includes('await esperarJuizDoPlano(iniciarJuizDoPlano(') && bloco.includes('refazerPlanoDaFicha({ prompts: classicScenePrompts, veredito: vFicha, pessoaDaIdeia: ideiaNaFicha?.pessoa ?? null, sujeitoDoPedido: sujeitoDoPedido1311 })') && bloco.includes('name: FICHA_ANTES_EVENTO'))
// C1 (revisão da CEO): a 2ª leitura do juiz (depois do 1º POST) só roda quando a 1ª refez algum plano ou o Kling 4 não saiu; senão o evento
// de sempre leva o veredito de antes, marcado "antes_reaproveitado"
const iFinal = rota.indexOf("const envioFinal1311 = kling4Trial?.job && vereditoAntes1311?.status === 'JUDGED' && lidoPeloJuiz1311 ? planoDoEnvio({ kling4Candidato: true, kling4Input: () => { const e = kling4EnvioDoFilme(); return buildKling4TrialInput(e.prompts, e.approvedStills, e.timing).input }, falas: scenes.map((s) => s.voiceover ?? ''), inputs: classicSceneInputs }) : null")
const iReaproveita = rota.indexOf('const reaproveitaJuiz1311 = !!envioFinal1311 && juizLeuOMesmoTexto(lidoPeloJuiz1311, envioFinal1311.cenas)')
const trecho = rota.slice(iReaproveita, iPost)
checa('C3 o veredito só é reaproveitado quando o juiz leu o MESMO texto que kling4EnvioDoFilme() mandou; senão a 2ª leitura de sempre', iFinal > iBloco && iReaproveita > iFinal && iReaproveita < iPost && trecho.includes("rodada: 'antes_reaproveitado'") && trecho.trimEnd().endsWith('// KINEO-FICHA-ANTES-DO-RENDER-1311 (C1)') && trecho.includes('if (reaproveitaJuiz1311 && vereditoAntes1311) {') && trecho.includes('} else //'))
checa('C3 o juiz de antes lê o texto com os planos do filme grátis; plano refeito nunca reaproveita; o que é refeito vai ao vetor', bloco.includes('buildKling4TrialInput(eixosDoFilmeGratis(classicScenePrompts, styleAnchor).map((p, i) => promptDaCenaKling4(p, styleAnchor, i, true)), []') && bloco.includes('iniciarJuizDoPlano({ ...envioAntes1311, engine:') && bloco.includes('vereditoAntes1311 = vFicha; lidoPeloJuiz1311 = fichaRefez1311 ? null : envioAntes1311.cenas') && bloco.includes('if (fichaRefez1311) for (let i = 0; i < classicScenePrompts.length; i++) classicScenePrompts[i] = fichaAntes.prompts[i]'))
checa('M4 o evento reaproveitado é gravado mesmo sem o contexto da Vercel (a promessa nasce fora do waitUntil)', trecho.includes('const pJuiz1311 = writeServerEvent({ name: JUIZ_PLANO_EVENT') && trecho.includes('try { waitUntilDaRequisicao()?.(pJuiz1311) } catch') && !rota.includes('waitUntilDaRequisicao()?.(writeServerEvent('))
checa('M3 as 3 camadas novas de texto falham abertas (try/catch na rota)', rota.includes("} catch (e) { console.warn('[cinematic] KINEO-HISTORIA-REAL falhou, elenco segue como estava:") && rota.includes("} catch (e) { console.warn('[cinematic] KINEO-ATRIBUTOS-DO-PEDIDO falhou, prompts seguem como estavam:") && rota.includes("} catch (e) { console.warn('[cinematic] KINEO-ESTADO-NEGADO falhou, prompts seguem como estavam:"))
checa('C3 a rota guarda o sujeito lido do pedido para a camada da ficha', rota.includes('if (sujeitoClassico.relato.sujeito) sujeitoDoPedido1311 = { sujeito: sujeitoClassico.relato.sujeito, tipo: sujeitoClassico.relato.tipo ?? null }'))
checa('D falha aberta: erro do juiz não derruba o filme', bloco.includes("} catch (e) { console.warn('[cinematic] KINEO-FICHA-ANTES-DO-RENDER falhou"))
const eventos = lf(fs.readFileSync('app/api/events/route.ts', 'utf8'))
const soServidor = eventos.slice(eventos.indexOf('const SERVER_ONLY_EVENTS = new Set(['), eventos.indexOf('if (SERVER_ONLY_EVENTS.has(name))'))
checa('D e M9 os dois eventos do juiz são só do servidor', soServidor.includes("\n  'juiz_plano_ficha_antes',") && soServidor.includes("\n  'juiz_plano_verdict',") && lf(fs.readFileSync('lib/juizDoPlano.ts', 'utf8')).includes("export const JUIZ_PLANO_EVENT = 'juiz_plano_verdict'"))
const MUTANTES = [
  ['a ordem fica com a ficha reprovada', (s) => s.replace('  const nova = pessoa ?', '  const nova = m[0]; const _antiga = pessoa ?')],
  ['C3: criatura sem pessoa fica vazia', (s) => s.replace("const sujeito = !pessoa && sujeitoDoPedido && TIPOS_SEM_GENTE.has(String(sujeitoDoPedido.tipo))", "const sujeito = false && sujeitoDoPedido && TIPOS_SEM_GENTE.has(String(sujeitoDoPedido.tipo))")],
  ['C5: age com outro número de planos', (s) => s.replace('const indiceIncerto = !!v && v.status === \'JUDGED\' && v.cenas !== prompts.length', 'const indiceIncerto = false')],
  ['as frases vazadas ficam', (s) => s.replace('const resto = semVazamento(p.slice(0, m.index) + p.slice(m.index + m[0].length), ficha)', 'const resto = p.slice(0, m.index) + p.slice(m.index + m[0].length)')],
  ['refaz todo plano, não só os reprovados', (s) => s.replace("planosDoJuiz.filter((p) => p?.a === 'contradiz' && verificados.has(p.plano)).map((p) => p.plano)", 'planosDoJuiz.map((p) => p.plano)')],
  ['aceita veredito não julgado', (s) => s.replace("v && v.status === 'JUDGED' && falhasDoJuiz.includes('a_ficha')", "v && falhasDoJuiz.includes('a_ficha')")],
  // revisão independente 14/11
  ['M6: refaz o plano de acusação descartada', (s) => s.replace("p?.a === 'contradiz' && verificados.has(p.plano)", "p?.a === 'contradiz'")],
  ['C3: sujeito de tipo desconhecido vira sujeito', (s) => s.replace('TIPOS_SEM_GENTE.has(String(sujeitoDoPedido.tipo))', '(sujeitoDoPedido.tipo == null || TIPOS_SEM_GENTE.has(String(sujeitoDoPedido.tipo)))')],
  ['C3: reaproveita qualquer veredito (texto diferente)', (s) => s.replace('return lido.every((c, i) => typeof c?.prompt', 'return true || lido.every((c, i) => typeof c?.prompt')],
  ['C3: reaproveita com a fala trocada', (s) => s.replace(" && String(c?.fala ?? '') === String(enviado[i]?.fala ?? ''))", ')')],
  ['C3: reaproveita com outro número de planos', (s) => s.replace('lido.length === 0 || lido.length !== enviado.length', 'lido.length === 0')],
  ['C3: nunca reaproveita (2 leituras em todo filme)', (s) => s.replace('return lido.every((c, i) => typeof c?.prompt', 'return false && lido.every((c, i) => typeof c?.prompt')],
  ['veredito torto derruba (falhas não-lista)', (s) => s.replace('const falhasDoJuiz = Array.isArray(v?.falhas) ? (v as JuizPlanoVeredito).falhas : []', 'const falhasDoJuiz = (v as JuizPlanoVeredito)?.falhas ?? []')],
]
const src = lf(fs.readFileSync(ARQ, 'utf8'))
for (const [nome, fn] of MUTANTES) {
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
