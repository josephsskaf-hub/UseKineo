// KINEO-RABO-NAO-PASSA-1811 — guardião da montagem Hollywood (lib/compose.ts buildHollywoodCreatomateSource + seguraOFimDoClipeCurto).
// Caso real 18/11, filme 3ce4d510 (Kling 4 pago, 30 s, 2 clipes de 15,04 s): o rabo do clipe 1 entrava na faixa 2 depois da
// entrada do clipe 2 e o Creatomate apagou o clipe 2 inteiro (preto de 15,25 s a 30 s). Monta o source REAL de 1, 2 e 3 clipes
// com durações reais e falha se: (a) na mesma faixa um vídeo começa antes do anterior (ordem quebrada); (b) um trecho do clipe N
// começa na/depois da entrada do clipe N+1; (c) dois vídeos consecutivos da faixa se sobrepõem mais que o crossfade; (d) algum clipe
// some do source. E (e): o filme de 1 clipe sai byte a byte igual ao da main de 18/11 (7514f4996), pelo hash do source.
import { createHash } from 'node:crypto'
import { buildHollywoodCreatomateSource, seguraOFimDoClipeCurto } from '../lib/compose'

const U = (n: number) => `https://v3b.fal.media/files/b/test/clip${n}_output.mp4`
const erros: string[] = []
let ok = 0
const checa = (nome: string, cond: boolean) => { if (cond) ok++; else erros.push(nome) }

type Cena = { seconds: number; media: number }
function monta(cenas: Cena[], requestedDuration: number) {
  const clips = cenas.map((c, i) => ({ url: U(i + 1), engine: 'cinematic' as const, seconds: c.seconds, caption: '', mediaSeconds: c.media }))
  let t = 0
  const narrationBlocks = cenas.map((c) => { const b = { url: `https://test.invalid/n${t}.mp3`, time: t, audioDuration: c.seconds - 0.6, endCap: t + c.seconds + 0.5 }; t += c.seconds; return b })
  return buildHollywoodCreatomateSource({ clips: clips as never, requestedDuration, narrationBlocks: narrationBlocks as never, muteClipAudio: true, aspect: '9:16' as never }) as { elements: Array<Record<string, unknown>> }
}
const FADE = 0.25 + 0.002
function invariantes(src: { elements: Array<Record<string, unknown>> }, n: number): string[] {
  const falhas: string[] = []
  const v = src.elements.filter((e) => e.type === 'video') as Array<{ track: number; time: number; duration: number; source: string }>
  const porFaixa = new Map<number, typeof v>()
  for (const e of v) porFaixa.set(e.track, [...(porFaixa.get(e.track) ?? []), e])
  for (const [faixa, els] of porFaixa) {
    for (let i = 1; i < els.length; i++) {
      if (els[i].time < els[i - 1].time - 0.0005) falhas.push(`a faixa ${faixa}: elemento ${i} (${els[i].source.slice(-16)} em ${els[i].time}) começa antes do anterior (${els[i - 1].time})`)
      const sobra = els[i - 1].time + els[i - 1].duration - els[i].time
      if (sobra > FADE) falhas.push(`c faixa ${faixa}: ${els[i - 1].source.slice(-16)} passa ${sobra.toFixed(3)} s sobre o seguinte (crossfade ${FADE})`)
    }
  }
  for (let k = 1; k <= n; k++) if (!v.some((e) => e.source === U(k))) falhas.push(`d o clipe ${k} sumiu do source`)
  // e — sob o fade de entrada do clipe N+1 tem de haver imagem do clipe N (sem buraco para o fundo preto da faixa 1)
  for (let k = 1; k < n; k++) {
    const entrada = Math.min(...v.filter((e) => e.source === U(k + 1)).map((e) => e.time))
    const fimN = Math.max(...v.filter((e) => e.source === U(k)).map((e) => e.time + e.duration))
    if (fimN < entrada + 0.25 - 0.002) falhas.push(`e o clipe ${k} acaba em ${fimN.toFixed(3)} s, antes do fim do fade do clipe ${k + 1} (${(entrada + 0.25).toFixed(3)})`)
  }
  for (let k = 1; k < n; k++) {
    const entrada = Math.min(...v.filter((e) => e.source === U(k + 1)).map((e) => e.time))
    for (const e of v.filter((x) => x.source === U(k))) if (e.time >= entrada - 0.0005) falhas.push(`b um trecho do clipe ${k} começa em ${e.time}, na/depois da entrada do clipe ${k + 1} (${entrada})`)
  }
  return falhas
}
const hash = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex')

// 1 — o caso real: 2 clipes de 15,041667 s em cenas de 15 s
const real = monta([{ seconds: 15, media: 15.041667 }, { seconds: 15, media: 15.041667 }], 30)
const fr = invariantes(real, 2)
checa('real 3ce4d510: ' + fr.join(' | '), fr.length === 0)
// 2 — 3 clipes, um curto de verdade no meio (7 s numa cena de 7,4 s) e um que só perde o crossfade
const tres = monta([{ seconds: 10, media: 10.04 }, { seconds: 7.4, media: 7.0 }, { seconds: 10, media: 10.04 }], 27.4)
const f3 = invariantes(tres, 3)
checa('3 clipes: ' + f3.join(' | '), f3.length === 0)
// 3 — clipe muito curto no meio (rabo de vários trechos): 4 s numa cena de 10 s
const longo = monta([{ seconds: 10, media: 4.0 }, { seconds: 10, media: 10.04 }], 20)
const fl = invariantes(longo, 2)
checa('rabo longo: ' + fl.join(' | '), fl.length === 0)
// o clipe curto do meio continua sem recomeçar (o que a regra de 03/11 protege): sem loop, e o rabo cobre até a entrada do seguinte
const meio = (tres.elements as Array<Record<string, unknown>>).filter((e) => e.type === 'video' && e.source === U(2))
checa('3 clipes: o clipe curto do meio segue sem loop (regra de 03/11)', meio.length > 1 && meio.every((e) => e.loop === false))

// 4 — filme de 1 clipe: byte a byte o source da main (hash gravado da main 7514f4996)
const um = monta([{ seconds: 15, media: 14.6 }], 15)
const umCobre = monta([{ seconds: 15, media: 15.041667 }], 15)
const H_UM = '9c08c0a6cc327f8b56991128d14e53bd0edfcfc232fb8c0cb8dfeda4ea9ae734', H_UM_COBRE = '1fd3b6be800e3e6acfacff464019972f29da11a6b1f90c260e315aa65829d62a'
checa(`1 clipe curto igual à main (${hash(um).slice(0, 12)})`, hash(um) === H_UM)
checa(`1 clipe que cobre igual à main (${hash(umCobre).slice(0, 12)})`, hash(umCobre) === H_UM_COBRE)

// 5 — mutante: a regra sem o limite do seguinte (o código de 03/11) tem de reprovar o caso real
const elsMut: Array<Record<string, unknown>> = [
  { type: 'video', track: 2, time: 0, duration: 15.25, source: U(1), loop: true },
]
seguraOFimDoClipeCurto(elsMut as never, { url: U(1), engine: 'cinematic', seconds: 15, caption: '', mediaSeconds: 15.041667 } as never, false)
elsMut.push({ type: 'video', track: 2, time: 15, duration: 15.06, source: U(2), loop: true })
checa('mutante "sem limite do seguinte" morre', invariantes({ elements: elsMut }, 2).length > 0)

for (const e of erros) console.log('FAIL', e)
console.log(`${ok} ok, ${erros.length} falhas`)
process.exit(erros.length ? 1 : 0)
