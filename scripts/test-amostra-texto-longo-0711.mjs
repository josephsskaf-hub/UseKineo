// KINEO-AMOSTRA-TEXTO-LONGO-0711 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — guardião do conserto
// "ANUNCIO — AMOSTRA RECUSADA POR TEXTO LONGO" (escolha_spoken_core_exceeds_15s).
//
// CASOS REAIS (Supabase só leitura, tabela events + ads_v2_orders):
//   · pedropaulonazario00 (BR, ChatGPT, 1º uso), pedido f9fbd513, 05/11 14:04 UTC: ads_sample_started → ads_sample_seed_released
//     reason=escolha_spoken_core_exceeds_15s em 5 s. O texto era o título da loja, 14 palavras: "Kit Linha Coreana Hidrabene K-Sérum
//     Harmonizador Facial + Sérum GHK-Cu + Sérum PDRN Skincare". Na 2ª tentativa (14:05) passou, e o plano guardou a fala
//     "Know Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial + Sérum GHK-Cu + Sérum PDRN Skincare? Choose it." — o nome inteiro,
//     com "+" e códigos, lido em voz alta numa amostra de 8 s.
//   · lopezgilantonio557 (ES), pedido 20b709d7, 06/11 08:04 UTC: a mesma recusa em espanhol, onde não há encurtamento nenhum; desistiu.
//
// CAUSA (lib/ads/cena/escolhaPlan.ts): a fala tem de conter o nome do produto INTEIRO (includes) dentro de 18 palavras (amostra) ou
// 30 (anúncio de 15 s). Com um título de loja de 14 palavras não sobra fala; em pt/en o colapso "Know X? <cta>" ainda lê o título
// inteiro; nas outras línguas a função só recusa.
//
// O QUE ESTE GUARDIÃO EXECUTA (sem rede, sem banco, sem fornecedor, sem gasto): o planCenaEscolha e o fitCenaEscolhaScript REAIS,
// duas vezes — o arquivo de hoje e o de ANTES desta entrega (hoje com o recibo exato desfeito) — com o MESMO escritor simulado,
// que devolve frases com o nome de produto que o prompt lhe pediu (como um escritor obediente faria).
//   (1) CASO REAL em inglês: a base recusa com o CTA de 6 palavras e, com "Choose it.", reproduz letra a letra a fala guardada no
//       banco; hoje nenhuma recusa, a fala cabe, nomeia "Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial" e não lê "+".
//   (2) ESPANHOL, nome longo: a base recusa; hoje passa com as frases do escritor.
//   (3) ESPANHOL, nome curto e frases longas: a base recusa (não há colapso fora de pt/en); hoje fica com as frases INTEIRAS do
//       próprio escritor que nomeiam o produto e terminam na chamada — nada escrito em outra língua.
//   (4) CONTROLES byte a byte, base × hoje: nome de até 7 palavras na amostra e até 12 no anúncio pago, en/pt/es, com e sem colapso,
//       com oferta e benefícios: o plano inteiro (JSON) e o prompt do escritor saem idênticos.
//   (5) O nome falado (tabela), a remedição da voz (escolhaMedia) e o upgrade pago sobre o plano da amostra.
//   (6) MUTANTES: seis estragos no conserto, cada um pego por esta mesma bateria.
//   (7) RECIBO: desfazer os trechos devolve exatamente a base (ea24830ca).
// Rodar: node scripts/test-amostra-texto-longo-0711.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createEscolhaWorld } from './test-ads-escolha-2310.mjs'
import { semEscolhaFala1111 } from './test-support/desfaz-escolha-fala-1111.mjs' // KINEO-ESCOLHA-FALA-1111
import { semAmostraTextoLongo0711, deltaAmostraTextoLongo0711Exato, AMOSTRA_TEXTO_LONGO_0711 } from './test-support/desfaz-amostra-texto-longo-0711.mjs'

const PLAN = 'lib/ads/cena/escolhaPlan.ts'
const BASE = 'ea24830ca23df4ffd106b6d046d6f6dae8485b9f' // origin/main em que este conserto nasceu
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const FONTE_HOJE = lf(semEscolhaFala1111(fs.readFileSync(PLAN, 'utf8'), PLAN)) // KINEO-ESCOLHA-FALA-1111 — a camada mais nova sai antes do recibo
const FONTE_BASE = lf(execFileSync('git', ['show', `${BASE}:${PLAN}`], { encoding: 'utf8', maxBuffer: 64 << 20 }))
const FOTO = 'https://offline.example/footage/produto.png'
const palavras = (s) => s.trim() ? s.trim().split(/\s+/u).length : 0
let ok = 0, falhas = 0
const checa = (n, c, extra = '') => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n + (extra ? ' — ' + extra : '')) } }

// ── o escritor simulado: devolve frases com o nome de produto que o prompt pediu; o classificador devolve o produto digitado ──
function escritor({ produto, hooks, use, benefit = '', cta, categoria = 'skincare' }) {
  const calls = []
  const json = async (c) => {
    calls.push(JSON.parse(JSON.stringify(c)))
    if (c.images?.length) return JSON.stringify({ category: categoria, confidence: .99, product: produto, offer: '', benefits: [] })
    const pedido = JSON.parse(c.text)
    return JSON.stringify({ hooks, use: use(pedido.product), benefit: typeof benefit === 'function' ? benefit(pedido.product) : benefit, cta: typeof cta === 'function' ? cta(pedido.product) : cta })
  }
  return { json, calls }
}
const mundo = (fonte) => createEscolhaWorld({ [PLAN]: fonte }, { current: true }).load(PLAN)
const modBase = mundo(FONTE_BASE), modHoje = mundo(FONTE_HOJE)
const selecao = (sample) => ({ presenter_id: 'sofia', scenario_id: 'skincare_bathroom', category: 'skincare', ...(sample ? { sample: true } : {}) })
const entrada = (frase, language, extra = {}) => ({ foto: FOTO, frase, oferta: '', formato: 'ugc', language, beneficios: [], voice_mode: 'narrated', ...extra })
async function planeja(mod, input, writer, sample = true) {
  try { const plan = await mod.planCenaEscolha(input, sample ? 'kling4' : 'kling3', writer.json, selecao(sample)); return { plan } }
  catch (e) { return { erro: e instanceof Error ? e.message : String(e) } }
}
const semMais = (s) => !/\+|GHK-Cu|PDRN/u.test(s)
const fold = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const nomeia = (texto, nome) => fold(texto).includes(fold(nome)) // o escritor pt/en põe "facial" em minúscula dentro da frase (ajusteProductCase, de sempre); a voz não distingue

// ═══ (1) CASO REAL — Pedro, inglês, amostra ═══════════════════════════════════════════════════════════════════════════════════
const PEDRO = 'Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial + Sérum GHK-Cu + Sérum PDRN Skincare'
const PEDRO_FALADO = 'Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial'
const FALA_GUARDADA = 'Know Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial + Sérum GHK-Cu + Sérum PDRN Skincare? Choose it.' // ads_v2_orders f9fbd513 → plan.cena.plan.script.narration
const HOOKS_EN = ['Ready for your routine?', 'Which skincare kit today?', 'Shall we take a look?']
async function casoReal(modBase, modHoje) {
  const falhas = []
  const f = (n, c, extra = '') => { if (!c) falhas.push(n + (extra ? ' — ' + extra : '')) }
  // 1.1 — a 1ª tentativa real: CTA de 6 palavras
  {
    const w = () => escritor({ produto: PEDRO, hooks: HOOKS_EN, use: (p) => `Meet ${p}.`, cta: 'Discover your new skincare routine today.' })
    const wb = w(), b = await planeja(modBase, entrada(PEDRO, 'en'), wb)
    f('1.1 base recusa o caso real (escolha_spoken_core_exceeds_15s)', b.erro === 'escolha_spoken_core_exceeds_15s', JSON.stringify(b).slice(0, 300))
    const wh = w(), h = await planeja(modHoje, entrada(PEDRO, 'en'), wh)
    f('1.2 hoje não recusa', !!h.plan, h.erro)
    if (h.plan) {
      const n = h.plan.script.narration
      f('1.3 a fala cabe em 18 palavras', palavras(n) <= 18, n)
      f('1.4 a fala nomeia o produto pelo nome falado', nomeia(n, PEDRO_FALADO), n)
      f('1.5 a fala não lê "+" nem os códigos', semMais(n), n)
      f('1.6 a fala termina na chamada do escritor', n.endsWith('Discover your new skincare routine today.'), n)
      f('1.7 plan.product guarda o nome COMPLETO (vitrine, etiqueta, brief)', h.plan.product === PEDRO, h.plan.product)
      f('1.8 o pedido chega ao fornecedor como amostra de 8 s', h.plan.escolha.sample === 'KINEO-AMOSTRA-ANUNCIO-2410' && /Absolute6–8s/u.test(h.plan.escolha.shotPrompts[2]), '')
      const prompt = wh.calls.find(c => !c.images?.length)
      f('1.9 o escritor recebeu o nome FALADO no prompt e no pedido', !!prompt && prompt.system.includes(JSON.stringify(PEDRO_FALADO)) && JSON.parse(prompt.text).product === PEDRO_FALADO, prompt?.system.slice(0, 200))
      const promptBase = wb.calls.find(c => !c.images?.length)
      f('1.10 na base o escritor recebia o nome inteiro', !!promptBase && JSON.parse(promptBase.text).product === PEDRO, '')
    }
  }
  // 1.2 — a 2ª tentativa real: "Choose it." — a base passa e reproduz a fala guardada no banco
  {
    const w = () => escritor({ produto: PEDRO, hooks: HOOKS_EN, use: (p) => `Meet ${p}.`, cta: 'Choose it.' })
    const b = await planeja(modBase, entrada(PEDRO, 'en'), w())
    f('1.11 base reproduz letra a letra a fala guardada no pedido f9fbd513', b.plan?.script.narration === FALA_GUARDADA, JSON.stringify(b).slice(0, 300))
    const h = await planeja(modHoje, entrada(PEDRO, 'en'), w())
    f('1.12 hoje a mesma tentativa sai sem "+" e com as frases do escritor', !!h.plan && semMais(h.plan.script.narration) && fold(h.plan.script.narration) === fold(`Ready for your routine? Meet ${PEDRO_FALADO}. Choose it.`), h.plan?.script.narration ?? h.erro)
  }
  // 1.3 — preâmbulo de loja ("Oferta da semana:") na frente do título (achado da revisão adversarial, 07/11)
  {
    const frase = `Oferta da semana: ${PEDRO_FALADO}`
    const w = () => escritor({ produto: frase, hooks: HOOKS.pt, use: (p) => `Conheça o ${p}.`, cta: 'Peça o seu.' })
    const b = await planeja(modBase, entrada(frase, 'pt'), w()), h = await planeja(modHoje, entrada(frase, 'pt'), w())
    f('1.13 base lia o preâmbulo junto ("Conhece Oferta da semana: …?")', !!b.plan && /^Conhece Oferta da semana:/u.test(b.plan.script.narration), b.plan?.script.narration ?? b.erro)
    f('1.14 hoje a fala nomeia o produto, não o preâmbulo', !!h.plan && nomeia(h.plan.script.narration, PEDRO_FALADO) && !nomeia(h.plan.script.narration, 'Oferta da semana'), h.plan?.script.narration ?? h.erro)
  }
  return falhas
}

// ═══ (2) ESPANHOL, nome longo — a porta do Lopez ═════════════════════════════════════════════════════════════════════════════
const LOPEZ = 'Kit Línea Coreana Hidrabene K-Sérum Armonizador Facial + Sérum GHK-Cu + Sérum PDRN Skincare'
const LOPEZ_FALADO = 'Kit Línea Coreana Hidrabene K-Sérum Armonizador Facial'
const HOOKS_ES = ['¿Qué kit eliges hoy?', '¿Lista para tu rutina?', '¿Vemos el kit?']
async function casoEspanhol(modBase, modHoje) {
  const falhas = []
  const f = (n, c, extra = '') => { if (!c) falhas.push(n + (extra ? ' — ' + extra : '')) }
  const w = () => escritor({ produto: LOPEZ, hooks: HOOKS_ES, use: (p) => `Conoce el ${p}.`, cta: 'Pídelo hoy mismo.' })
  const b = await planeja(modBase, entrada(LOPEZ, 'es'), w())
  f('2.1 base recusa em espanhol', b.erro === 'escolha_spoken_core_exceeds_15s', JSON.stringify(b).slice(0, 300))
  const h = await planeja(modHoje, entrada(LOPEZ, 'es'), w())
  f('2.2 hoje passa em espanhol', !!h.plan, h.erro)
  if (h.plan) {
    const n = h.plan.script.narration
    f('2.3 a fala cabe, nomeia o produto e não lê "+"', palavras(n) <= 18 && nomeia(n, LOPEZ_FALADO) && semMais(n), n)
    f('2.4 nenhuma palavra em inglês ou português entrou (só as frases do escritor)', n === `¿Qué kit eliges hoy? Conoce el ${LOPEZ_FALADO}. Pídelo hoy mismo.`, n)
    f('2.5 plan.product guarda o nome completo', h.plan.product === LOPEZ, '')
  }
  // nome SEM separador de 8 palavras (a base aceitava: 16 ≤ 18) e de 12 (a base recusava) — achado da revisão adversarial 07/11: a 1ª
  // chamada do ajuste usava o teto padrão (30 → nome de 12) contra um roteiro escrito para o nome de 7 e recusava com escolha_script_invalid
  for (const [n, nome, esperado] of [
    ['2.6', 'Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original Novo', 'Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original'],
    ['2.7', 'Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original Novo Premium Importado Autêntico Completo', 'Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original'],
  ]) {
    const w = () => escritor({ produto: nome, hooks: HOOKS_ES, use: (p) => `Conoce el ${p}.`, cta: 'Pídelo hoy.' })
    const b = await planeja(modBase, entrada(`${nome}; natural.`, 'es'), w()), h = await planeja(modHoje, entrada(`${nome}; natural.`, 'es'), w())
    if (n === '2.6') f('2.6 base aceitava o nome de 8 palavras sem separador', !!b.plan && b.plan.script.narration.includes(nome), b.plan?.script.narration ?? b.erro)
    else f('2.7 base recusava o nome de 12 palavras sem separador', b.erro === 'escolha_spoken_core_exceeds_15s', JSON.stringify(b).slice(0, 200))
    f(`${n} hoje aceita e fala o nome de 7 palavras`, !!h.plan && nomeia(h.plan.script.narration, esperado) && palavras(h.plan.script.narration) <= 18 && h.plan.product === nome, h.plan?.script.narration ?? h.erro)
  }
  return falhas
}

// ═══ (3) ESPANHOL, nome curto, frases longas — o encurtamento com as frases do autor ═════════════════════════════════════════
async function casoFrasesDoAutor(modBase, modHoje) {
  const falhas = []
  const f = (n, c, extra = '') => { if (!c) falhas.push(n + (extra ? ' — ' + extra : '')) }
  const frase = 'Crema GLOW; brillo natural.'
  const w = () => escritor({ produto: 'Crema GLOW', hooks: ['¿Qué crema con brillo natural eliges para tu rutina hoy?', '¿Lista para tu rutina?', '¿Vemos la crema?'], use: (p) => `Conoce la ${p} de verdad hoy.`, cta: 'Pídela ahora mismo.' })
  const b = await planeja(modBase, entrada(frase, 'es'), w())
  f('3.1 base recusa (hook de 10 + use de 7 + cta de 3 = 20 > 18; sem colapso fora de pt/en)', b.erro === 'escolha_spoken_core_exceeds_15s', JSON.stringify(b).slice(0, 300))
  const h = await planeja(modHoje, entrada(frase, 'es'), w())
  f('3.2 hoje fica com as frases inteiras do escritor que nomeiam o produto e terminam na chamada', h.plan?.script.narration === 'Conoce la Crema GLOW de verdad hoy. Pídela ahora mismo.', h.plan?.script.narration ?? h.erro)
  f('3.3 hoje o preflight aceita o plano (hook vazio é permitido)', !!h.plan && h.plan.script.hook === '' && h.plan.script.hooks[0] === '', '')
  return falhas
}

// ═══ (4) CONTROLES byte a byte ═══════════════════════════════════════════════════════════════════════════════════════════════
const PRODUTOS_CURTOS = {
  en: ['GLOW cream', 'Nike Air Max 90 White Sneakers', 'Hidrabene K-Sérum Facial Harmonizer Kit Set'], // 2, 6, 7 palavras
  pt: ['Creme GLOW', 'Tênis Nike Air Max 90 Branco', 'Kit Hidrabene K-Sérum Harmonizador Facial Coreano'],
  es: ['Crema GLOW', 'Zapatillas Nike Air Max 90 Blancas', 'Kit Hidrabene K-Sérum Armonizador Facial Coreano'],
}
const CTAS = { en: ['Shop now.', 'Discover your new skincare routine today.'], pt: ['Peça o seu.', 'Descubra sua nova rotina de cuidados hoje.'], es: ['Pídelo hoy.', 'Descubre tu nueva rutina de cuidado hoy.'] }
const HOOKS = { en: HOOKS_EN, pt: ['Pronto para sua rotina?', 'Qual kit escolher hoje?', 'Vamos conhecer?'], es: HOOKS_ES }
const USE = { en: (p) => `Meet ${p}.`, pt: (p) => `Conheça o ${p}.`, es: (p) => `Conoce el ${p}.` }
async function controles(modBase, modHoje) {
  const falhas = [], classes = { identicos: 0, recusa_virou_fala: 0 }
  const f = (n, c, extra = '') => { if (!c) falhas.push(n + (extra ? ' — ' + extra : '')) }
  for (const language of ['en', 'pt', 'es']) for (const produto of PRODUTOS_CURTOS[language]) for (const cta of CTAS[language]) for (const sample of [true, false]) {
    const w = () => escritor({ produto, hooks: HOOKS[language], use: USE[language], cta })
    const wb = w(), b = await planeja(modBase, entrada(`${produto}; natural.`, language), wb, sample)
    const wh = w(), h = await planeja(modHoje, entrada(`${produto}; natural.`, language), wh, sample)
    const rotulo = `4 ${language} "${produto}" cta=${palavras(cta)} ${sample ? 'amostra' : 'pago'}`
    f(rotulo + ': hoje nunca recusa o que a base aceitava', !h.erro, h.erro)
    if (b.erro) { // a base recusava (fora de pt/en não havia encurtamento): hoje só pode passar com as frases INTEIRAS do escritor, nomeando o produto, dentro do orçamento
      const n = h.plan?.script.narration ?? ''
      const frases = [h.plan?.script.hook, h.plan?.script.use, h.plan?.script.benefit, h.plan?.script.cta].filter(Boolean)
      const doAutor = [HOOKS[language][0], USE[language](produto), cta]
      f(rotulo + ': a base recusava; hoje a fala é feita só de frases inteiras do escritor, nomeia o produto e termina na chamada', !!h.plan && frases.every(s => doAutor.some(a => fold(a) === fold(s))) && nomeia(n, produto) && palavras(n) <= (sample ? 18 : 30) && n.endsWith(cta), `${b.erro} × ${n}`)
      classes.recusa_virou_fala++; continue
    }
    if (h.erro) continue
    f(rotulo + ': plano idêntico', JSON.stringify(b.plan) === JSON.stringify(h.plan), `${b.plan.script.narration} × ${h.plan.script.narration}`)
    f(rotulo + ': prompt do escritor idêntico', JSON.stringify(wb.calls) === JSON.stringify(wh.calls), '')
    classes.identicos++
  }
  // nome de 12 palavras no PAGO (teto 12): idêntico; a amostra encurta (teto 7)
  {
    const doze = 'Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial Sérum GHK-Cu Sérum PDRN Skincare'
    const w = () => escritor({ produto: doze, hooks: HOOKS_EN, use: USE.en, cta: 'Shop now.' })
    const b = await planeja(modBase, entrada(doze, 'en'), w(), false), h = await planeja(modHoje, entrada(doze, 'en'), w(), false)
    f('4.p nome de 12 palavras no anúncio pago: plano idêntico', !!b.plan && JSON.stringify(b.plan) === JSON.stringify(h.plan), `${b.plan?.script.narration ?? b.erro} × ${h.plan?.script.narration ?? h.erro}`)
    classes.identicos++
  }
  // colapso pt/en com nome curto: idêntico (o colapso de sempre continua o mesmo)
  {
    const w = () => escritor({ produto: 'GLOW cream', hooks: ['Ready for your routine with a natural glow today?', 'Which cream today?', 'Shall we take a look?'], use: (p) => `Meet ${p} and its natural glow every single day.`, cta: 'Discover your new skincare routine today.' })
    const b = await planeja(modBase, entrada('GLOW cream; natural glow.', 'en'), w()), h = await planeja(modHoje, entrada('GLOW cream; natural glow.', 'en'), w())
    f('4.c colapso pt/en de sempre (nome curto, frases longas): plano idêntico', !!b.plan && JSON.stringify(b.plan) === JSON.stringify(h.plan), `${b.plan?.script.narration ?? b.erro} × ${h.plan?.script.narration ?? h.erro}`)
    f('4.c2 e a base de fato colapsou', !!b.plan && /^Know GLOW cream\?/u.test(b.plan.script.narration) && b.plan.script.use === '', b.plan?.script.narration ?? b.erro)
    classes.identicos++
  }
  return { falhas, classes }
}

// ═══ (5) nome falado, remedição da voz, upgrade ══════════════════════════════════════════════════════════════════════════════
function tabelaNomeFalado(mod) {
  const falhas = []
  const f = (n, c, extra = '') => { if (!c) falhas.push(n + (extra ? ' — ' + extra : '')) }
  if (typeof mod.escolhaSpokenProduct !== 'function') { f('5.n escolhaSpokenProduct existe', false, 'função ausente (base)'); return falhas }
  const casos = [
    [PEDRO, 18, 'en', PEDRO_FALADO],
    [PEDRO, 30, 'en', PEDRO_FALADO], // o 1º segmento tem 7 palavras: cabe no teto de 12 inteiro
    ['Promoção: Tênis Nike Air Max 90 Branco Masculino Original', 18, 'pt', 'Tênis Nike Air Max 90 Branco Masculino'], // rótulo de 1 palavra não vira o nome
    ['Smartwatch Xiaomi Mi Band 8 Pro, pulseira preta, à prova d\'água', 18, 'pt', 'Smartwatch Xiaomi Mi Band 8 Pro'],
    ['iPhone 15 Pro Max 256GB Titânio Natural Apple Smartphone', 18, 'pt', 'iPhone 15 Pro Max 256GB Titânio Natural'], // sem separador: as 7 primeiras
    ['Zapatillas Nike Air Max 90 - Blancas Hombre Original Nuevas', 18, 'es', 'Zapatillas Nike Air Max 90'], // " - " separa
    ['GLOW cream', 18, 'en', 'GLOW cream'],
    ['Oferta da semana: Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial', 18, 'pt', 'Kit Linha Coreana Hidrabene K-Sérum Harmonizador Facial'], // preâmbulo de 3 palavras + dois-pontos
    ['Frete grátis: Tênis Nike Air Max 90 Branco Masculino Original', 18, 'pt', 'Tênis Nike Air Max 90 Branco Masculino'], // preâmbulo fora, 7 primeiras do título
    ['Lançamento exclusivo - Smartwatch Xiaomi Mi Band 8 Pro preta', 18, 'pt', 'Smartwatch Xiaomi Mi Band 8 Pro preta'],
    ['Pousada Vista Mar – Búzios: diária com café da manhã', 18, 'pt', 'Pousada Vista Mar'], // nome curto seguido de trecho MENOR não é preâmbulo
    ['Nike Air Zoom, tênis de corrida masculino leve e confortável', 18, 'pt', 'Nike Air Zoom'], // vírgula separa atributo, não preâmbulo
    ['Café, grãos especiais do Cerrado Mineiro torra média escura', 18, 'pt', 'grãos especiais do Cerrado Mineiro torra média'], // 1 palavra antes da vírgula não vira o nome
    ['Honda CG 160 Titan 2024 vermelha 0 km - financiamento', 18, 'pt', 'Honda CG 160 Titan 2024 vermelha 0'],
    ['Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original', 18, 'pt', 'Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original'], // 7 palavras: inteiro
    ['Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original Novo', 18, 'pt', 'Kit Hidrabene K-Sérum Harmonizador Facial Coreano Original'], // 8: corta na 7ª
    ['', 18, 'en', ''],
  ]
  for (const [produto, max, lang, esperado] of casos) f(`5.n "${produto}" (${max}) → "${esperado}"`, mod.escolhaSpokenProduct(produto, max, lang) === esperado, JSON.stringify(mod.escolhaSpokenProduct(produto, max, lang)))
  f('5.n sem língua informada vale o mesmo', mod.escolhaSpokenProduct(PEDRO, 18) === PEDRO_FALADO, '')
  return falhas
}
async function remedicaoEUpgrade(modHoje) {
  const falhas = []
  const f = (n, c, extra = '') => { if (!c) falhas.push(n + (extra ? ' — ' + extra : '')) }
  const h = await planeja(modHoje, entrada(PEDRO, 'en'), escritor({ produto: PEDRO, hooks: HOOKS_EN, use: USE.en, cta: 'Choose it.' }))
  if (!h.plan) { f('5.r plano de hoje existe', false, h.erro); return falhas }
  // escolhaMedia.ts: a voz medida pede uma 2ª fala mais curta com fitCenaEscolhaScript(script, input, plan.product, alvo)
  for (const alvo of [12, 8]) { // alvos reais da remedição (count × 13.5 / segundos medidos); com 4 palavras nem nome + chamada cabem, e a base também recusa
    try { const fitted = modHoje.fitCenaEscolhaScript(h.plan.script, h.plan.input, h.plan.product, alvo); f(`5.r remedição da voz com alvo ${alvo}: cabe e nomeia o produto`, palavras(fitted.narration) <= alvo && /Kit Linha Coreana/u.test(fitted.narration) && semMais(fitted.narration), fitted.narration) }
    catch (e) { f(`5.r remedição da voz com alvo ${alvo} não recusa`, false, e.message) }
  }
  try { const full = modHoje.fullEscolhaPlan(h.plan); f('5.u o upgrade pago reaproveita a mesma fala da amostra', full.script.narration === h.plan.script.narration && !full.escolha.sample, '') }
  catch (e) { f('5.u upgrade pago não recusa', false, e.message) }
  return falhas
}

// ═══ bateria ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function bateria(modBase, modHoje) {
  const todas = []
  todas.push(...await casoReal(modBase, modHoje))
  todas.push(...await casoEspanhol(modBase, modHoje))
  todas.push(...await casoFrasesDoAutor(modBase, modHoje))
  const c = await controles(modBase, modHoje); todas.push(...c.falhas)
  todas.push(...tabelaNomeFalado(modHoje))
  todas.push(...await remedicaoEUpgrade(modHoje))
  return { falhas: todas, classes: c.classes }
}

console.log('== (1)-(5) base × hoje ==')
const r = await bateria(modBase, modHoje)
for (const x of r.falhas) console.log('  FALHA ' + x)
checa(`caso real, espanhol, frases do autor, controles, tabela, remedição: ${r.falhas.length} falha(s); controles ${JSON.stringify(r.classes)}`, r.falhas.length === 0)

console.log('== herança: a base no lugar do conserto reprova ==')
const rb = await bateria(modBase, modBase)
checa('a base reprova 1.2/2.2/3.2 (recusa) e mantém 1.1/1.11/2.1/3.1 (reproduz o defeito)', rb.falhas.some(x => x.startsWith('1.2')) && rb.falhas.some(x => x.startsWith('2.2')) && rb.falhas.some(x => x.startsWith('3.2')) && !rb.falhas.some(x => /^(1\.1 |1\.11|2\.1|3\.1)/u.test(x)), rb.falhas.filter(x => /^(1\.1 |1\.11|2\.1|3\.1)/u.test(x)).join(' | '))

console.log('== (6) mutantes ==')
const troca = (de, para) => { if (FONTE_HOJE.split(de).length !== 2) throw Error('âncora de mutante ausente ou repetida: ' + de); return FONTE_HOJE.replace(de, () => para) }
const MUTANTES = [
  ['M1 teto do nome falado desligado', 'cap = Math.max(3, Math.floor(maxWords * 0.4))', 'cap = 999', ['1.', '2.', '5.n']],
  ['M2 encurtamento com as frases do autor removido', "= [['hook'], ['use'], ['benefit'], []] // KINEO", '= [] // KINEO', ['3.2']],
  ['M3 o escritor recebe o nome inteiro', 'writeAjusteScript(spoken, falado, json', 'writeAjusteScript(spoken, product, json', ['1.5', '1.9', '1.12']],
  ['M4 separador de lista ignorado', 'full.split(/(\\s*(?:[+/|·—–;:,([]|\\s-\\s)\\s*)/u)', '[full]', ['5.n']],
  ['M5 rótulo de 1 palavra vira o nome', 'words(segments[k].text, language) < 2 || ', '', ['5.n']],
  ['M6 colapso pt/en trocado pelas frases do autor', '> maxWords && legacy) {', '> maxWords && false) {', ['4.c']],
  ['M7 a 1ª chamada do ajuste volta ao teto padrão (o defeito da revisão)', 'script: fitCenaEscolhaScript(draft, input, product, maxWords), keyframePrompts', 'script: fitCenaEscolhaScript(draft, input, product), keyframePrompts', ['2.6']],
  ['M8 preâmbulo de 2+ palavras vira o nome', '/^[:—–-]$/u.test(segments[k].sep) && words(segments[k].text, language) < words(segments[k + 1].text, language)', 'false', ['1.14', '5.n']],
]
for (const [nome, de, para, esperadas] of MUTANTES) {
  const rm = await bateria(modBase, mundo(troca(de, para)))
  const pegas = esperadas.filter(p => rm.falhas.some(x => x.startsWith(p)))
  checa(`${nome}: pego (${pegas.join(', ') || 'NÃO'}; ${rm.falhas.length} falha(s))`, pegas.length > 0)
}

console.log('== (7) recibo exato ==')
checa('desfazer o recibo devolve exatamente a base', semAmostraTextoLongo0711(FONTE_HOJE, PLAN) === FONTE_BASE)
checa('o arquivo de hoje é exatamente base + esta entrega', deltaAmostraTextoLongo0711Exato(FONTE_HOJE, FONTE_BASE, PLAN) === true)
checa('um arquivo mexido fora do recibo não passa por "exato"', deltaAmostraTextoLongo0711Exato(FONTE_HOJE + '\n// x\n', FONTE_BASE, PLAN) === false)
checa('o recibo aponta para a base certa', AMOSTRA_TEXTO_LONGO_0711.base === BASE)
checa('todo trecho do conserto leva o marcador', FONTE_HOJE.split('\n').filter(l => !FONTE_BASE.includes(l)).every(l => l.includes('KINEO-AMOSTRA-TEXTO-LONGO-0711')))

console.log(`\n${ok} ok, ${falhas} falha(s); rede 0, render 0, banco 0`)
if (falhas) process.exit(1)
