// ═══ GUARDIÃO — o segundo clique depois do cadastro (KINEO-GPT-HANDOFF) ═════
//
// O QUE ESTE ARQUIVO PROTEGE
// Quem chega em /go/<token> deslogado e aperta "Make this video" é mandado
// para /signup?redirect=/go/<token>. O /auth/callback devolve a pessoa para o
// /go com `?signup=1` — e, até 06/09, a página se redesenhava com o MESMO
// botão, cobrando um SEGUNDO clique logo depois de a pessoa criar a conta,
// que é o ponto de maior intenção da jornada inteira.
//
// A correção desvia essa volta para a MESMA rota contadora do botão. As
// verificações abaixo existem porque cada uma delas, se cair, quebra em
// silêncio: um desvio sem `signedIn` vira laço, um redirect() dentro do
// try/catch é engolido pelo catch, e um destino copiado à mão diverge de
// buildStudioDestination() sem ninguém perceber.
//
// Estilo readFileSync de propósito: guardião que importa '@/...' morre no
// import antes da primeira verificação (lição registrada em memória).
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')

let pass = 0
let fail = 0
function ok(cond, label) {
  if (cond) {
    pass += 1
    console.log(`  ok   ${label}`)
  } else {
    fail += 1
    console.log(`  FALHA ${label}`)
  }
}

const page = read('app/go/[token]/page.tsx')
const rota = read('app/api/gpt/handoff/go/route.ts')

console.log('\n── A página desvia a volta do cadastro ──')

// (1) A página precisa RECEBER searchParams — sem isso não há como saber que a
// pessoa está voltando do cadastro, e o desvio nunca acontece.
ok(
  /export default async function GoPage\(\{\s*params,\s*searchParams,/.test(page),
  '(1) GoPage recebe searchParams (sem ele a volta do cadastro é invisível)',
)

// (2) A marca lida é `signup`, o MESMO nome que /auth/callback escreve ao
// devolver uma conta nova. Ler outro nome = desvio que nunca dispara.
ok(/searchParams\?\.signup/.test(page), '(2) a página lê searchParams.signup — o nome que o /auth/callback escreve')

// (3) O CORAÇÃO: a decisão é a CONJUNÇÃO das três condições. Este é o teste que
// mata o mutante: trocar `signedIn` por `true` abre laço (deslogado → rota →
// /signup → volta com signup=1 → desvia de novo), e tirar `!bot` gasta a rota
// com varredor. Amarrado à variável que decide, não a texto solto.
const decisao = (page.match(/const autoForward = ([^\n]+)/) || [])[1] ?? ''
ok(/\bsignedIn\b/.test(decisao), '(3) a decisão exige signedIn — é o que torna o laço IMPOSSÍVEL')
ok(/\bbackFromSignup\b/.test(decisao), '(3) a decisão exige backFromSignup — só a volta do cadastro desvia')
ok(/!\s*bot\b/.test(decisao), '(3) a decisão exige !bot — varredor não é desviado')
ok(/&&/.test(decisao) && !/\|\|/.test(decisao), '(3) as três condições são E, nunca OU (um OU sozinho reabre o laço)')
ok(/if \(autoForward\)/.test(page), '(3) o if usa a variável autoForward — a decisão mora num lugar só')

// (4) O destino é a ROTA CONTADORA, não uma cópia da regra dela. É lá que o
// clique é contado e que buildStudioDestination() monta a URL do Studio.
const bloco = page.slice(page.indexOf('const backFromSignup'), page.indexOf('const engine ='))
ok(/redirect\(goHref\)/.test(bloco), '(4) o desvio vai para goHref')
ok(
  /const goHref = `\/api\/gpt\/handoff\/go\?token=\$\{encodeURIComponent\(token\)\}`/.test(page),
  '(4) goHref é a rota contadora /api/gpt/handoff/go',
)
ok(
  !/\/studio\/create/.test(bloco),
  '(4) o bloco NÃO monta /studio/create à mão — quem monta o destino é buildStudioDestination()',
)
ok((page.match(/const goHref =/g) || []).length === 1, '(4) goHref é definido UMA vez (botão e desvio usam a mesma string)')

// (5) redirect() do Next sinaliza por EXCEÇÃO. Dentro do try/catch do contador
// ele seria engolido pelo catch e a pessoa ficaria parada na página — o
// contador falharia aberto para o lado errado.
const iCatch = bloco.indexOf('o contador nunca segura a pessoa na porta')
const iRedirect = bloco.indexOf('redirect(goHref)')
ok(iCatch !== -1 && iRedirect !== -1 && iRedirect > iCatch, '(5) redirect() está FORA do try/catch (senão o catch o engole)')
ok(/import \{ redirect \} from 'next\/navigation'/.test(page), '(5) redirect vem de next/navigation')

// (6) Sonda própria: sem evento, a próxima sessão não tem como saber quantas
// pessoas o desvio economizou (lição "entrega só de cliente não tem sonda").
ok(/name: 'gpt_landing_auto_forwarded'/.test(bloco), '(6) o desvio emite gpt_landing_auto_forwarded')
ok(/token: row\.token/.test(bloco), '(6) o evento carrega o token — sem ele o degrau não se liga ao handoff')

console.log('\n── A rota contadora fecha o laço (invariante de que a página depende) ──')

// (7) A prova do não-laço não está na página: está AQUI. O ramo logado precisa
// terminar no Studio. No dia em que ele passar a devolver /go ou /signup para
// alguém logado, o desvio da página vira laço infinito — e este teste cai
// ANTES disso chegar em produção.
const ternario = (rota.match(/const url = userId\s*\n?\s*\?([\s\S]{0,120}?)\n\s*:/) || [])[1] ?? ''
ok(ternario.trim().length > 0, '(7) o ramo logado de /api/gpt/handoff/go foi encontrado')
ok(/\$\{destino\}/.test(ternario), '(7) logado → destino (Studio), montado por buildStudioDestination()')
ok(!/GO_PATH_PREFIX|\/go\//.test(ternario), '(7) o ramo logado NUNCA volta para /go — é isso que impede o laço')
ok(!/signup|login|authPath/.test(ternario), '(7) o ramo logado NUNCA volta para o cadastro')
ok(
  /let destino = STUDIO_CREATE_PATH/.test(rota) && /normalizeInternalRedirect\(buildStudioDestination\(row\)\)/.test(rota),
  '(7) destino cai para STUDIO_CREATE_PATH se buildStudioDestination falhar (falha fechada no Studio)',
)

// (8) Nada de gerar filme sozinho: o link de terceiro jamais gasta crédito de
// quem clica. A trava do ciclo continua valendo no caminho novo.
ok(
  !/create_intent|autoanalyze/.test(bloco),
  '(8) o desvio não carrega create_intent/autoanalyze — o Studio abre preenchido e ESPERA o Generate',
)

console.log(`\n${pass} ok, ${fail} falhas`)
process.exit(fail ? 1 : 0)
