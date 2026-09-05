// TESTE DA "FAIXA CONTINUE DE ONDE PAROU" (sprint v1->v4 #13)
//
// Nao roda React nem Next: le os arquivos e prova as invariantes que a
// mudanca nao pode quebrar. Sem rede, sem banco, sem credito.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lerArq = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8")

let falhas = 0
let n = 0
function checar(nome, condicao) {
  n++
  if (condicao) { console.log('  ok   ' + nome) }
  else { falhas++; console.log('  FALHOU  ' + nome) }
}

console.log('')
console.log('TESTE faixa continue-de-onde-parou')
console.log('')

const strip = lerArq('components/ResumeStrip.tsx')
const page = lerArq('app/page.tsx')
const land = lerArq('app/KineoLanding.tsx')
const serie = lerArq('lib/seriesContinuation.ts')
const libT = lerArq('lib/resumeStrip.ts')
const vezes = (src, t) => src.split(t).length - 1

// --- a medida (licao da rodada #9: shown no fetch nao e olho) ---
checar("resume_strip_seen e emitido exatamente 1x", vezes(strip, "trackEvent('resume_strip_seen'") === 1)
checar("resume_strip_clicked e emitido exatamente 1x", vezes(strip, "trackEvent('resume_strip_clicked'") === 1)
checar("usa IntersectionObserver de verdade", /new IntersectionObserver\(/.test(strip))
checar("so conta como visto com metade da faixa na tela", /intersectionRatio >= 0\.5/.test(strip))
checar("seen so dispara uma vez (guardado por ref)", /seenRef\.current\s*=\s*true/.test(strip) && /if \(seenRef\.current\) return/.test(strip))
checar("tem fallback quando IntersectionObserver nao existe", /typeof IntersectionObserver === .undefined./.test(strip))
checar("observer e desconectado (sem vazamento)", vezes(strip, "disconnect()") >= 2)
checar("IntersectionObserver dentro de try/catch", /try \{[\s\S]{0,400}new IntersectionObserver/.test(strip))

// --- a aposta: ancora, nao ideia nova ---
// UX L2b 05/09: the old assertion pinned a direct helper call, not behavior.
// Review now uses an adapter that still consumes the canonical writer.
// This remains a SOURCE guard; real component + reader + click coverage is
// in test-home-resume-studio.mjs. Do not call a regex proof of conversion.
checar("adaptador de revisao preserva o escritor canonico", /buildStudioSeriesReviewHref\(limpo, .landing_resume_strip.\)/.test(strip) && /buildSeriesContinuationHref\(topic, source/.test(lerArq('lib/navigation/studioSeriesReview.ts')))
checar("a fonte nova existe no tipo de lib/seriesContinuation", /landing_resume_strip/.test(serie))
checar("um unico botao de acao na faixa", vezes(strip, "<Link") === 1)

// --- falha invisivel ---
checar("sem titulo legivel a faixa nao existe", /if \(!limpo\) return null/.test(strip))
checar("extractShortTitle devolve string vazia quando nao sabe", /return ''/.test(libT))
checar("a leitura do banco esta dentro de try/catch", /try \{[\s\S]{0,2000}catch \{[\s\S]{0,80}resume = null/.test(page))

// --- fiacao completa (senao o conserto existe e nao aparece) ---
checar("page.tsx importa extractShortTitle", /import \{ extractShortTitle \} from .@\/lib\/resumeStrip./.test(page))
checar("page.tsx passa resume para KineoLanding", /resume=\{resume\}/.test(page))
checar("page.tsx le o ultimo video completado", /\.eq\(.status., .completed.\)/.test(page) && /ascending: false/.test(page))
checar("KineoLanding importa ResumeStrip 1x", vezes(land, "import ResumeStrip from") === 1)
checar("KineoLanding recebe resume na assinatura", /resume = null,\s*\}: Props/.test(land))
// rodada #14: a entrega de 10:22 morreu porque o Codex mexeu nestes dois
// arquivos. Se um patch meu apagar uma prop dele, o portao reprova.
checar("props do Codex intactas (nao pisei na pista dele)", /showWelcomeGoalRouter/.test(land) && /initialAcquisitionSource/.test(land) && /showWelcomeGoalRouter=\{showWelcomeGoalRouter\}/.test(page))
checar("faixa so renderiza quando resume existe", /\{resume \? \(/.test(land))
checar("faixa fica ACIMA da barra de progresso", land.indexOf("<ResumeStrip") < land.indexOf('<div className="progress"'))

// --- limites de pista (acordo com o Codex) ---
checar("faixa nao fala de preco/plano/upgrade/checkout", !/(upgrade|checkout|subscribe|pricing|\$\d|credits?\b)/i.test(strip))
checar("faixa nao usa localStorage/sessionStorage", !/localStorage|sessionStorage/.test(strip))
checar("nao encostei no EngineCycleCard", !/KINEO-FAIXA-CONTINUAR/.test(lerArq("components/EngineCycleCard.tsx")))
checar("nao encostei em lib/engineWall.ts", !/KINEO-FAIXA-CONTINUAR/.test(lerArq("lib/engineWall.ts")))
checar("os cards de motor continuam na home", vezes(land, "EngineCycleCard") >= 1)

console.log('')
console.log(falhas === 0
  ? '  RESULTADO: ' + n + '/' + n + ' verificacoes passaram.'
  : '  RESULTADO: ' + falhas + ' de ' + n + ' FALHARAM.')
console.log('')
process.exit(falhas === 0 ? 0 : 1)
