// Sprint UI #3 (29/08) — prova estatica: a Library nao mascara mais erro de
// leitura como "No videos yet" (divida do incidente JWT-skew de 28/08) e o
// loading e skeleton com a forma do resultado, nao texto.
import { readFileSync } from 'node:fs'
const src = readFileSync('app/(dashboard)/library/LibraryClient.tsx', 'utf8')
let fails = 0
let total = 0
const check = (name, ok) => { total++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name); if (!ok) fails++ }

check('estado loadFailed existe', src.includes('const [loadFailed, setLoadFailed] = useState(false)'))
check('fetch com falha resolve null (nao lista vazia)', src.includes("(r.ok ? r.json() : null)).catch(() => null)"))
check('qualquer null marca loadFailed', src.includes('if (v === null || i === null || a === null) setLoadFailed(true)'))
check('banner de erro com role=alert', src.includes('role="alert"'))
check('banner tranquiliza: dados salvos', src.includes('Your videos and credits are safe'))
check('botao Try again religa loadAll', src.includes('onClick={loadAll}'))
// KINEO-REANCORA-BIBLIOTECA-2026-09-07 — as tres travas exigiam a FORMA exata
// `loadFailed ? null : <p className="sub">No X yet`. Duas coisas se meteram
// entre o portao e o texto sem mudar a verdade: um ramo novo para quem tem
// midia recente, e o `<UiLabel>` da interface em espanhol (06/09).
//
// ⚠️ E a busca por linha tem uma armadilha propria: o COMENTARIO no topo do
// LibraryClient cita "No videos yet" ao explicar o defeito que ele conserta, e
// um `find` ingenuo casa com o comentario primeiro. Foi o que aconteceu na
// minha primeira tentativa hoje — a trava continuou vermelha por motivo errado.
// Por isso a linha e escolhida por RENDERIZAR (`className="sub"`), nao so por
// citar a frase.
//
// A regra exige a ESTRUTURA que importa: a frase do vazio mora na mesma linha
// do portao e DEPOIS dele. Ou seja, uma leitura que falhou nunca imprime "nao
// ha nada" com a midia intacta no banco — o defeito do incidente JWT-skew de
// 28/08, que e a razao de este arquivo existir.
for (const frase of ['No videos yet', 'No images yet', 'No audio yet']) {
  const linha = src.split('\n').find((l) => l.includes(frase) && l.includes('className="sub"')) ?? ''
  check(`a linha que RENDERIZA "${frase}" existe`, linha.length > 0)
  check(
    `"${frase}" so aparece sem falha`,
    linha.includes('loadFailed ? null :') &&
      linha.indexOf('loadFailed ? null :') < linha.indexOf(frase),
  )
}
check('skeleton shimmer no lugar do texto de loading', src.includes('@keyframes libsk') && !src.includes('Loading your library…</p>'))
check('skeleton em grade 9:16 (forma do resultado)', src.includes("aspectRatio: '9/16', borderRadius: 12"))

// O total era LITERAL ('11/11 OK') e passou a mentir no instante em que uma
// verificacao foi somada — o arquivo tinha 11 e passou a ter 14, e a saida
// continuava jurando 11. Contagem de verdade.
console.log(fails === 0 ? `\n${total}/${total} OK` : `\n${fails} FALHAS em ${total}`)
process.exit(fails === 0 ? 0 : 1)
