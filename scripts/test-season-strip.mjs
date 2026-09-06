// sprint-assinaturas #30 — GUARDIAO: a temporada tem de ter CHAMADOR na tela.
//
// O DEFEITO (medido 06/09 19:00 UTC, producao): `season_written` = 11 pessoas,
// `season_shown` = ZERO. A porta de servidor da temporada (app/api/season, #18/
// #19) subiu de manha, escreve os titulos dos episodios 2 a 6, devolve o custo
// de cada um vindo de creditCostForDuration e o saldo da pessoa — e nenhuma
// tela do produto a chamava. Terceira vez em 8 horas que a memoria
// `contrato-de-servidor-sem-chamador` bate.
//
// Este arquivo le os ARQUIVOS REAIS (nada de import com alias '@/', que morre
// fora do bundler — memoria `guardioes-com-alias-nao-rodam`) e amarra cada
// verificacao a VARIAVEL QUE DECIDE, nunca a contagem de texto (memoria
// `guardiao-contar-texto-nao-prova-condicao`).
import { readFileSync } from 'node:fs'

let ok = 0
let fail = 0
const falhas = []
function check(nome, cond) {
  if (cond) { ok++ } else { fail++; falhas.push(nome) }
}
const norm = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

/**
 * O texto SEM comentarios. Estes arquivos documentam-se a si proprios em prosa
 * densa, e um regex solto casa com o proprio comentario que o explica — foi
 * exatamente o que aconteceu na 1a versao deste guardiao (memoria
 * `falsificar-mutacao-commitar-antes`): tres verificacoes deram FALHA porque
 * `creditCostForDuration`, `season_shown` e `<NextShortsSection/>` aparecem em
 * comentarios. Uma verificacao estrutural tem de ler CODIGO.
 * O `(?<!:)` preserva `https://`.
 */
const code = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(?<!:)\/\/.*$/gm, '')

const STRIP = norm('components/video/SeasonStrip.tsx')
const GC = norm('app/(dashboard)/generate/GenerateClient.tsx')
const ROTA = norm('app/api/season/route.ts')
const NOTE = norm('components/TopupUnavailableNote.tsx')
const STRIP_C = code(STRIP)
const GC_C = code(GC)

// ── 1. O CHAMADOR EXISTE — o defeito inteiro era este ───────────────────────
check('GenerateClient importa SeasonStrip',
  /import\s+SeasonStrip\s+from\s+'@\/components\/video\/SeasonStrip'/.test(GC))
check('SeasonStrip esta MONTADO em JSX (nao so importado)',
  /<SeasonStrip\b/.test(GC))
check('a montagem passa videoId',
  /<SeasonStrip[\s\S]{0,400}?videoId=\{publicVideoId\}/.test(GC))
check('a montagem passa onPick',
  /<SeasonStrip[\s\S]{0,600}?onPick=\{/.test(GC))
check('a montagem passa onEvent (sem isso nada se mede)',
  /<SeasonStrip[\s\S]{0,600}?onEvent=\{/.test(GC))

// A faixa so pode aparecer na tela de filme PRONTO. Amarrado a condicao real.
const guarda = GC.match(/\{phase === 'done' && finalVideoUrl && \(\s*\n\s*<SeasonStrip/)
check('a faixa so renderiza com phase done E finalVideoUrl', guarda !== null)

// Ordem: a faixa vem ANTES da prateleira. A prateleira diz "faca outro"; a
// faixa diz "o episodio 3 chama-se assim". Trocar a ordem inverte a leitura.
const iStrip = GC_C.indexOf('<SeasonStrip')
const iShelf = GC_C.indexOf('<NextShortsSection')
check('a faixa fica ACIMA da prateleira next-shorts', iStrip > 0 && iShelf > 0 && iStrip < iShelf)
check('ha exatamente UM sitio de render da prateleira (o par que a regra manda conferir)',
  GC_C.split('<NextShortsSection').length - 1 === 1)

// ── 2. POST, NAO GET — a escolha que decide se alguem ve alguma coisa ───────
// O GET tem `escrever: false` e devolve null para quem ainda nao tem temporada
// gravada, que e todo mundo no instante em que o filme 1 fica pronto. Um GET
// aqui renderizaria nada para 100% das pessoas.
const fetchStrip = STRIP.match(/fetch\('\/api\/season'[\s\S]{0,320}?\}\)/)
check('SeasonStrip chama /api/season', fetchStrip !== null)
check('e chama por POST (GET nao escreve e devolveria null)',
  fetchStrip !== null && /method:\s*'POST'/.test(fetchStrip[0]))
check('manda o cookie da sessao (a rota e 401 sem ele)',
  fetchStrip !== null && /credentials:\s*'same-origin'/.test(fetchStrip[0]))
check('a rota realmente tem GET com escrever:false',
  /export async function GET[\s\S]{0,600}?escrever:\s*false/.test(ROTA))
check('a rota realmente tem POST que escreve',
  /export async function POST[\s\S]{0,500}?garantirTemporada\(admin, userId, alvo\)/.test(ROTA))

// Uma escrita por filme: sem o ref, cada re-render dispararia uma chamada de
// modelo. Amarrado a variavel que guarda, nao ao texto do comentario.
check('a chamada e guardada por ref (uma vez por filme)',
  /requestedRef\.current === chave/.test(STRIP) && /requestedRef\.current = chave/.test(STRIP))

// ── 3. FALHA CALADA — a tela de filme pronto nunca mostra erro ──────────────
check('renderiza null sem temporada', /if \(!data\?\.season\) return null/.test(STRIP))
check('res nao-ok nao quebra a tela', /if \(!res\.ok\) return/.test(STRIP))
check('o fetch tem catch', /\}\s*catch\s*\{[\s\S]{0,120}?\}\s*\n\s*\}\)\(\)/.test(STRIP))
check('episodios vazios nao renderizam faixa vazia',
  /payload\.season\.episodes\.length === 0/.test(STRIP))

// ── 4. `season_shown` = VISTO, nao "carregou" ───────────────────────────────
// A licao do next_shorts_shown: numa tela com video + pacote de texto +
// prateleira + upsell, "o fetch resolveu" e "um humano viu" sao numeros muito
// diferentes. O evento tem de nascer dentro do observador.
const marcar = STRIP.match(/const marcarVisto = \(\) => \{[\s\S]*?\n    \}/)
check('marcarVisto existe', marcar !== null)
check('season_shown e emitido DENTRO de marcarVisto',
  marcar !== null && /season_shown/.test(marcar[0]))
check('season_shown so aparece UMA vez no codigo, e e dentro de marcarVisto',
  STRIP_C.split('season_shown').length - 1 === 1)
check('marcarVisto e guardado por seenRef (uma vez por filme)',
  marcar !== null && /if \(seenRef\.current\) return/.test(marcar[0]) && /seenRef\.current = true/.test(marcar[0]))
check('usa IntersectionObserver com limiar real',
  /intersectionRatio >= 0\.35/.test(STRIP))
check('sem IntersectionObserver conta como visto (nao perde a metrica)',
  /typeof IntersectionObserver === 'undefined'[\s\S]{0,80}?marcarVisto\(\)/.test(STRIP))

// ── 5. O CLIQUE tem de dizer QUAL episodio, senao nao se aprende nada ───────
const clique = STRIP.match(/onEvent\?\.\('season_episode_clicked',\s*\{[\s\S]*?\}\)/)
check('season_episode_clicked existe', clique !== null)
check('e carrega o numero do episodio', clique !== null && /episode:\s*ep\.n/.test(clique[0]))
check('e carrega se cabia no saldo', clique !== null && /affordable:\s*ep\.affordable/.test(clique[0]))
check('season_plan_clicked mede quem vai para o plano',
  /onEvent\?\.\('season_plan_clicked'/.test(STRIP))

// O clique carrega a semente para o compositor e NAO gera nada. Um clique que
// gerasse sozinho gastaria credito de gente que so estava a espreitar.
check('onPick usa ep.seed', /setPrompt\(ep\.seed\)/.test(GC))
check('onPick reseta ANTES de escrever o prompt (senao o reset apaga-o)',
  /handleReset\(\)\s*\n\s*setPrompt\(ep\.seed\)/.test(GC))
check('o clique NAO dispara geracao', !/<SeasonStrip[\s\S]{0,900}?handleGenerate\(/.test(GC))

// ── 6. A FAIXA NAO ESCREVE PRECO — a regra do fundador ──────────────────────
// Preco publico e decisao dele. A faixa fala em creditos (que vem da rota) e
// manda para /pricing, onde o preco vive.
check('nenhum cifrao no componente', !/\$\d/.test(STRIP))
check('nenhum preco de plano digitado', !/9\.90|19\.90|39\.90|299/.test(STRIP))
check('o custo do episodio vem do payload, nao e recalculado',
  /ep\.cost/.test(STRIP_C) && !/creditCostFor/.test(STRIP_C))
check('affordable vem do payload, nao e recalculado',
  /ep\.affordable/.test(STRIP_C) && !/cost\s*<=\s*balance/.test(STRIP_C))
check('quantos episodios o saldo paga vem de affordableEpisodes da rota',
  /affordableEpisodes/.test(STRIP) && /Math\.floor\(balance \/ custo\)/.test(ROTA))
check('a saida bloqueada aponta para /pricing', /href="\/pricing"/.test(STRIP))

// A rota nao pode passar a cobrar por causa desta faixa.
check('a rota nao chama a fal', !/fal\.run|submitToFal|fal\.subscribe/.test(ROTA))
check('a rota nao debita credito', !/video_credits:\s*|deductCredits|debitar/.test(ROTA))

// ── 7. A PROVA DA #29 — a entrega das 15:21 nao tinha rastro nenhum ─────────
check('TopupUnavailableNote emite topup_unavailable_note_shown',
  /trackEvent\('topup_unavailable_note_shown'/.test(NOTE))
check('e importa trackEvent de verdade',
  /import \{ trackEvent \} from '@\/lib\/analytics'/.test(NOTE))
check('uma vez por montagem (ref), nao a cada render',
  /if \(trackedRef\.current\) return/.test(NOTE) && /trackedRef\.current = true/.test(NOTE))
check('a telemetria nao pode derrubar o pop-up (try/catch)',
  /try \{[\s\S]{0,240}?topup_unavailable_note_shown[\s\S]{0,240}?\}\s*catch/.test(NOTE))
check('o evento diz QUAL plano foi oferecido no lugar',
  /tier:\s*fit\?\.fittingPlanIds\[0\]/.test(NOTE))

console.log(`\nseason-strip: ${ok} passaram, ${fail} falharam`)
if (fail) {
  console.log('FALHAS:')
  for (const f of falhas) console.log('  - ' + f)
  process.exit(1)
}
