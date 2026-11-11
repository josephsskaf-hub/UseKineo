// KINEO-ESPERA-HONESTA-1111 — guardião: a tela de espera do filme (modo cinematic, que inclui o Kling 4 grátis) diz o tempo real
// e convida a FICAR; o e-mail é o plano B. Medido em 11/11 (14 dias, 74 primeiros filmes): p50 7,3 min / p90 10,1 min no Kling 4;
// o texto antigo prometia "~3 min" e "You can close this tab" — 13 de 22 que saíram foram embora nos 2 primeiros minutos.
// Rodar: node scripts/test-espera-honesta-1111.mjs
import fs from 'node:fs'

const F = 'app/(dashboard)/generate/GenerateClient.tsx'
const src = fs.readFileSync(F, 'utf8').replace(/\r\n/g, '\n')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }

// o bloco do rodapé da estreia: do `footnote={(mode === 'fast'` até o `}` que fecha a prop
function rodape(t) {
  const i = t.indexOf("footnote={(mode === 'fast' || mode === 'creator')")
  if (i < 0) return null
  const j = t.indexOf('/>', i)
  return j < 0 ? null : t.slice(i, j)
}
function confere(t) {
  const r = rodape(t)
  if (!r) return { achou: false }
  const partes = r.split('\n  ').join('\n')
  const filme = partes.slice(partes.indexOf(': "'))
  const rapido = partes.slice(0, partes.indexOf(': "'))
  return {
    achou: true,
    semTresMinNoFilme: !/~3 min/.test(filme),
    semConviteAFechar: !/You can close this tab/.test(filme),
    tempoHonesto: /5–10 minutes/.test(filme),
    ficaETocaAqui: /Stay on this page/.test(filme) && /plays right here/.test(filme),
    emailPlanoB: /we'll email you the link/.test(filme),
    rapidoIntacto: rapido.includes('"Typically ready in ~3 min. Keeping this tab open is fastest — if you close it, we finish the film and email you the link."'),
  }
}

const c = confere(src)
ok(c.achou, 'o rodapé da estreia existe no GenerateClient')
ok(c.semTresMinNoFilme, 'filme: não promete mais "~3 min"')
ok(c.semConviteAFechar, 'filme: não convida mais a fechar a aba')
ok(c.tempoHonesto, 'filme: diz "5–10 minutes" (p50 7,3 / p90 10,1 do Kling 4 grátis; H3 Turbo ~3,7)')
ok(c.ficaETocaAqui, 'filme: convida a ficar — o filme toca nesta página')
ok(c.emailPlanoB, 'filme: o e-mail continua prometido, como plano B')
ok(c.rapidoIntacto, 'modo rápido/creator: texto de antes, byte a byte (fora desta mudança)')

// mutantes: o texto antigo volta → vermelho
const velho = "\"Typically ready in ~3 min. You can close this tab — we'll email you the link when your premiere is ready.\"}"
const comVelho = src.replace(/"Usually ready in 5–10 minutes\.[^"]*"\}/, () => velho)
const m = confere(comVelho)
ok(comVelho !== src && (!m.semTresMinNoFilme || !m.semConviteAFechar), 'mutante: o texto antigo de volta fica vermelho')
const semEmail = src.replace(" — if you need to leave, we'll email you the link.", '.')
ok(semEmail !== src && !confere(semEmail).emailPlanoB, 'mutante: tirar a promessa do e-mail fica vermelho')

console.log(`\n${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
