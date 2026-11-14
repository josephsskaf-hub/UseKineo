// KINEO-LINHA-DE-EPOCA-1411 [CEO 14/11 12:25, lote 1b: a Earhart refeita piorou de 6 para 5 — casal e sedã dos anos 30 na ilha, sedã no mar] — guardião.
// Prova OFFLINE, EXECUTANDO o código real (aplicarEpoca, o que a camada de época põe no fim de cada cena), com os planos REAIS do dry-run:
//   (A) cena marcada sem gente (a ilha) e cena sem gente nem veículo no plano (os navios procurando no mar): só a data, nenhuma roupa, carro,
//       catálogo nem frase negativa;
//   (B) cena com gente (a Earhart, os mecânicos, "confused visitors", "anxious travelers"): a década e "true to their own place and role", sem o
//       catálogo ("fedoras, wide-lapel suits…"); posse não é gente ("the driver's seat remains empty");
//   (C) cena com veículo de rua (o carro do Bobbie, a charrete): a frase de veículo; avião e navio não chamam carro; "no cars" não é veículo;
//   (D) desligado e quem não passa a cena: a linha de sempre, byte a byte; (M) mutantes ficam vermelhos.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }
const EP = 'lib/cinematic/elencoEpoca.ts'
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const carrega = (mutar = null) => createOfflineLoader({ globals: { AbortController, setTimeout, clearTimeout }, source: (rel, text) => (mutar && rel === EP ? mutar(lf(text)) : text) })
const E1937 = { ano: 1937, decada: 1930, rotulo: '1930s', origem: 'ano' }
const E1923 = { ano: 1923, decada: 1920, rotulo: '1920s', origem: 'ano' }
const E1845 = { ano: 1845, decada: 1840, rotulo: '19th-century', origem: 'ano' }
const MOLDURA = ', characters act naturally within the scene without addressing the viewer, 9:16 vertical framing, subject framed in the upper two-thirds'
const ORIGEM = 'The main person, if one is shown in this shot, is American, with the natural features of American people. '
const LOCK = ', period piece set strictly in the year 1937: every person, building, street, vehicle and object belongs to that exact time — period clothing, period architecture and period transport only, as it really looked then'
// os planos do dry-run da Earhart (2-earhart-r1.json) e do corpus de 30 dias
const ILHA = `${ORIGEM}photorealistic, ultra-detailed. Aerial view of Howland Island, a tiny strip of sand in the open sea, with no radio tower visible.${MOLDURA}${LOCK}. No people, no human figures and no faces anywhere in this shot.`
const NAVIOS = `${ORIGEM}photorealistic, ultra-detailed. Tracking shot of navy ships and planes searching the ocean, waves crashing against the hulls.${MOLDURA}${LOCK}`
const MECANICOS = `photorealistic, ultra-detailed. Wide shot of Amelia Earhart climbing into her gleaming silver twin-engine plane, surrounded by ten young mechanics in grey overalls.${MOLDURA}${LOCK}`
const VISITANTES = 'A tracking shot reveals a museum wall with four empty iron hooks, as confused visitors gather in the foreground.'
const VIAJANTES = "A low-angle shot of a flight information display showing multiple 'Delayed' signs, while anxious travelers check their phones in the foreground."
const CARRO_VAZIO = "A close-up of a car parked on a deserted road, its engine hood slightly open, steam rising, while the driver's seat remains empty and the door ajar."
const CARRO_BOBBIE = 'A car drives down a sun-drenched Indiana road in August 1923, the back seat empty as the family gazes ahead.'
const CHARRETE = 'An overhead shot of a horse and buggy traveling along a dusty road, with a church steeple visible in the distance.'
const ANTIGA = 'An aerial shot of a battlefield at dawn, absolutely no modern objects, no tanks, no cars, no trucks, no modern military vehicles.'
const RUIM = /fedora|wide-lapel|bias-cut|wool overcoat|sedan|spare wheel|only if|do not add|present-day|absolutely no|no hoodies|car or carriage/i

function provas(L) {
  const erros = []
  const E = L(EP)
  const linha = (cena, ep = E1937) => E.aplicarEpoca(cena, ep).prompt.slice(String(cena).replace(/\s+$/, '').length)
  // (A)
  for (const [nome, cena] of [['a ilha (sem gente)', ILHA], ['os navios (sem gente nem veículo no plano)', NAVIOS]]) {
    const l = linha(cena)
    if (l.trim().replace(/^\./, '').trim() !== 'Period setting: 1937 (1930s).') erros.push(`A ${nome}: ${l.trim()}`)
  }
  // (B)
  for (const [nome, cena, ep] of [['os mecânicos', MECANICOS, E1937], ['os visitantes', VISITANTES, E1937], ['os viajantes', VIAJANTES, E1937]]) {
    const l = linha(cena, ep)
    if (!/People in the shot wear period-accurate 1930s clothing true to their own place and role/.test(l) || RUIM.test(l) || /Street vehicles/.test(l)) erros.push(`B ${nome}: ${l.trim()}`)
  }
  if (/People in the shot/.test(linha(CARRO_VAZIO, E1923)) || /People in the shot/.test(linha("A close-up of the lighthouse keeper's logbook open on a wooden desk, a candle beside it.", E1937))) erros.push('B posse ("the keeper\'s logbook") ou "the driver\'s seat" virou gente')
  // (C)
  const lb = linha(CARRO_BOBBIE, E1923), lc = linha(CHARRETE, E1845), lv = linha(CARRO_VAZIO, E1923)
  if (!/Street vehicles in the shot are boxy black 1920s automobiles and streetcars\./.test(lb) || !/Street vehicles in the shot are horse-drawn carriages/.test(lc) || !/Street vehicles/.test(lv)) erros.push(`C o veículo de rua não chamou a frase: ${lb.trim()} | ${lc.trim()}`)
  if (/Street vehicles/.test(linha(NAVIOS)) || /Street vehicles/.test(linha(MECANICOS)) || /Street vehicles/.test(linha(ANTIGA, E1937))) erros.push('C avião, navio ou "no cars" chamou a frase do carro')
  for (const c of [ILHA, NAVIOS, MECANICOS, VISITANTES, CARRO_BOBBIE, CHARRETE]) { const l = linha(c, c === CARRO_BOBBIE ? E1923 : c === CHARRETE ? E1845 : E1937); if (RUIM.test(l)) erros.push('A/B/C catálogo ou frase negativa: ' + l.trim().slice(0, 120)) }
  // (D) quem não passa a cena (o refazer-cena do grátis) recebe a linha de sempre
  const antiga = E.sufixoDeEpoca(E1937)
  if (!/Any person the shot describes wears 1930s dress/.test(antiga)) erros.push('D quem não passa a cena perdeu a linha de sempre')
  return erros
}

const base = provas(carrega())
checa(`A, B, C e D verdes nos planos reais${base.length ? ': ' + base.join(' · ') : ''}`, base.length === 0)
{
  const E = carrega((s) => s.replace("export const LINHA_DE_EPOCA_1411: ModoLinhaDeEpoca = 'all'", "export const LINHA_DE_EPOCA_1411: ModoLinhaDeEpoca = 'off'"))(EP)
  const l = E.aplicarEpoca(ILHA, E1937).prompt
  checa('D desligado: a ilha volta a receber a linha de sempre (catálogo e sedã)', /fedoras, wide-lapel suits/.test(l) && /rounded 1930s sedans/.test(l))
}
const MUTANTES = [
  ['a cena marcada sem gente ganha roupa', (s) => s.replace("  const semGente = t.includes(SEM_GENTE_NA_CENA_1411)", '  const semGente = false')],
  ['a moldura da casa conta como gente', (s) => s.replace("PESSOA_NA_CENA_RE_1411.test(t.replace(MOLDURA_SEM_GENTE_RE_1411, ' '))", 'PESSOA_NA_CENA_RE_1411.test(t)')],
  ['veículo sempre', (s) => s.replace("  const veiculo = VEICULO_DE_RUA_RE_1411.test(t.replace(VEICULO_NEGADO_RE_1411, ' '))", '  const veiculo = true')],
  ['"no cars" conta como veículo', (s) => s.replace("VEICULO_DE_RUA_RE_1411.test(t.replace(VEICULO_NEGADO_RE_1411, ' '))", 'VEICULO_DE_RUA_RE_1411.test(t)')],
  ['a aplicação não passa a cena (volta a linha de sempre)', (s) => s.replace('const longa = sep + sufixoDeEpoca(epoca, false, base)', 'const longa = sep + sufixoDeEpoca(epoca)')],
  ['posse vira gente', (s) => s.replace("(?![\\p{L}])(?!['’]s?(?![\\p{L}]))/iu", '(?![\\p{L}])/iu')],
]
for (const [nome, fn] of MUTANTES) {
  const src = lf(fs.readFileSync(EP, 'utf8'))
  const mudou = fn(src) !== src
  let e = ['(mutante não aplicou)']
  if (mudou) { try { e = provas(carrega(fn)) } catch (x) { e = ['lançou: ' + x.message] } }
  checa(`mutante "${nome}" fica vermelho (${mudou ? e.length + ' erro(s)' : 'NÃO APLICOU'})`, mudou && e.length > 0)
}
console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
process.exit(falhas.length ? 1 : 0)
