// KINEO-FRIO-2026-09-09 — guardião da instrumentação do tráfego frio na /ph.
//
// O que ele protege: a /ph media às cegas. Havia impressão e não havia rolagem
// nem clique, então "160 de 167 não fizeram nada" tanto podia ser copy ruim
// quanto página que ninguém chegou a ler. Se alguém apagar um desses sinais, a
// sprint volta a decidir no palpite — e o defeito é silencioso: a página
// continua funcionando, só para de contar.
//
// Estilo readFileSync de propósito: guardião que importa '@/...' morre no
// import antes da primeira verificação e passa a vida inteiro em falso verde.
import { readFileSync } from 'node:fs'

const BEACON = readFileSync(new URL('../components/PhLandingBeacon.tsx', import.meta.url), 'utf8')
const PAGE = readFileSync(new URL('../app/ph/page.tsx', import.meta.url), 'utf8')

let falhas = 0
function check(nome, condicao) {
  if (condicao) return
  falhas++
  console.error(`FALHOU: ${nome}`)
}

// --- os três sinais existem ---------------------------------------------
check('emite ph_landing_shown', /trackEvent\(\s*'ph_landing_shown'/.test(BEACON))
check('emite ph_scroll', /trackEvent\(\s*'ph_scroll'/.test(BEACON))
check('emite ph_cta_clicked', /trackEvent\(\s*'ph_cta_clicked'/.test(BEACON))

// --- o carimbo do bundle ------------------------------------------------
// Medir efeito por relógio inventa defeito; o corte tem que ser por campo novo.
const versao = BEACON.match(/const VERSAO = '([^']+)'/)
check('declara uma VERSAO literal', Boolean(versao))
check('a VERSAO é ph_sep10_v2 ou mais nova', Boolean(versao) && versao[1] !== 'ph_sep10_v1')
check(
  'os três eventos carregam version: VERSAO',
  (BEACON.match(/version:\s*VERSAO/g) ?? []).length >= 3,
)

// --- rolagem: marcos e dedupe -------------------------------------------
check('os marcos de rolagem são 25/50/75/100', /MARCOS_ROLAGEM\s*=\s*\[\s*25\s*,\s*50\s*,\s*75\s*,\s*100\s*\]/.test(BEACON))
check(
  'cada marco só é enviado uma vez (Set + add antes do envio)',
  /marcosEnviados\.current\.has\(marco\)/.test(BEACON) && /marcosEnviados\.current\.add\(marco\)/.test(BEACON),
)
check(
  'a profundidade conta a janela visível, não só o scrollY',
  /window\.scrollY\s*\+\s*window\.innerHeight/.test(BEACON),
)
check(
  'página que cabe na tela é conferida sem esperar rolagem',
  /conferirRolagem\(\)\s*\/\/|conferirRolagem\(\)\s*$/m.test(BEACON),
)

// --- clique: precisa sobreviver à navegação para fora ---------------------
// O CTA é <a href="/api/stripe/checkout...">: a página SAI no clique. O
// listener é registrado na fase de captura para disparar antes de qualquer
// handler que pare a propagação.
check(
  'o clique é ouvido na fase de captura',
  /document\.addEventListener\(\s*'click'\s*,\s*aoClicar\s*,\s*true\s*\)/.test(BEACON),
)
check(
  'o clique casa os dois CTAs pelo prefixo do data-testid',
  /closest\(\s*'a\[data-testid\^="ph-cta-trial"\]'\s*\)/.test(BEACON),
)
check('o clique distingue topo de rodapé', /position:\s*testid\.endsWith\('-bottom'\)/.test(BEACON))
check('o clique registra os segundos até o clique', /seconds:\s*segundos\(\)/.test(BEACON))

// --- a prova de que a reescrita do href aplicou --------------------------
// "Campo validado, gravado e ecoado não é campo honrado": o evento tem que ler
// a campanha do href REAL no momento do clique, não repetir a da URL.
check(
  'o evento de clique lê intent_campaign do href real',
  /href_campaign/.test(BEACON) && /searchParams\.get\('intent_campaign'\)/.test(BEACON),
)

// --- perfil do visitante -------------------------------------------------
check('mede a largura da janela', /viewport_w:\s*window\.innerWidth/.test(BEACON))
check('classifica celular por largura', /is_mobile:\s*window\.innerWidth\s*<\s*LARGURA_CELULAR/.test(BEACON))
check('registra fuso e idioma do navegador', /tz:/.test(BEACON) && /lang:/.test(BEACON))

// --- os alvos do listener continuam existindo na página ------------------
// Se a página trocar o data-testid, o listener casa zero e o número vira 0
// clique sem nenhum erro na tela. É o mesmo defeito de "peça sem superfície".
check('a página tem o CTA de topo', /data-testid="ph-cta-trial"/.test(PAGE))
check('a página tem o CTA de rodapé', /data-testid="ph-cta-trial-bottom"/.test(PAGE))
check('os dois CTAs casam com o prefixo ph-cta-trial', (PAGE.match(/data-testid="ph-cta-trial[^"]*"/g) ?? []).length >= 2)

// --- telemetria nunca quebra a navegação ---------------------------------
check('o handler de clique é embrulhado em try/catch', /const aoClicar = \(e: Event\) => \{\s*try \{/.test(BEACON))
check(
  'os listeners são removidos na limpeza do efeito',
  /removeEventListener\('scroll'/.test(BEACON) && /removeEventListener\('click'/.test(BEACON),
)

if (falhas) {
  console.error(`\ntest-ph-frio-beacon: ${falhas} verificação(ões) falharam`)
  process.exit(1)
}
console.log('test-ph-frio-beacon: OK (22 verificações)')
