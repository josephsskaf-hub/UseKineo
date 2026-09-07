#!/usr/bin/env node
// ═══ KINEO-PACOTE-DE-PUBLICACAO-2026-09-06 — guardiao ════════════════════
//
// Esta peca entra dentro de um cron de e-mail que JA FUNCIONA e que e o unico
// aviso de que o filme ficou pronto. Por isso o guardiao gasta a maior parte
// das verificacoes numa pergunta so: **se o pacote nao nascer, o e-mail de
// hoje sai igual?**
//
//   (A) COMPORTAMENTO de lib/publishPack.ts — o arquivo REAL, importado e
//       executado, contra os modos de falha do modelo e contra a garantia que
//       da sentido a peca inteira (o credito sempre entra).
//   (B) FALHA ABERTA no cron — a parte que protege o que ja existia.
//   (C) CUSTO e DENOMINADOR.
//
// Rodar: node scripts/test-pacote-publicacao.mjs   (sem rede, sem custo)

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (rel) => readFileSync(join(raiz, rel), 'utf8').split('\r\n').join('\n')

let ok = 0
const falhas = []
const check = (nome, cond) => {
  if (cond) ok++
  else falhas.push(nome)
}

// ══ (A) COMPORTAMENTO — o arquivo real, executado ════════════════════════
const lib = await import('../lib/publishPack.ts')
const { prepararPacote, lerPacote, pacoteAindaVale, MAX_YT_TITULO, PACOTE_TTL_MS } = lib
if (typeof prepararPacote !== 'function') {
  console.error('lib/publishPack.ts nao expos prepararPacote — teste invalido, nao verde')
  process.exit(1)
}

const cheio = {
  ytTitle: 'The Lake That Turns Animals To Stone',
  ytDescription: 'Lake Natron looks like a painting and behaves like a chemical trap.\n\n#shorts #nature #africa',
  tiktokCaption: 'This lake mummifies whatever touches it 😳 #fyp #ai #nature',
  pinnedComment: 'The birds are not petrified — the water preserves them.',
}

check('1. pacote completo passa', !!prepararPacote(cheio))
check('2. titulo e descricao sao obrigatorios', prepararPacote({ ytTitle: 'x' }) === null && prepararPacote({ ytDescription: 'y' }) === null)
check('3. prosa e null devolvem null', prepararPacote('texto solto') === null && prepararPacote(null) === null)
check('4. legenda e comentario sao opcionais (o pacote nasce mesmo sem eles)', !!prepararPacote({ ytTitle: 'a', ytDescription: 'b' }))
check('5. aceita os nomes alternativos que o modelo usa (title/description)', !!prepararPacote({ title: 'a', description: 'b' }))

// ── A REGRA DO CREDITO, E ELA MUDOU DENTRO DA PROPRIA ROTACAO ────────────
// A casa NAO poe credito para quem paga: `buildBrandedYouTubeDescription`
// devolve a descricao limpa quando `isFreePlan` e falso. Quem assina compra,
// entre outras coisas, nao ter de anunciar a ferramenta.
//
// A primeira versao desta peca creditava TODO MUNDO — desfazendo pelas costas
// uma decisao deliberada de produto. Agora o credito so entra quando QUEM
// CHAMA passa a linha, e quem chama so passa no plano gratuito. As cinco
// verificacoes seguintes existem para que essa regra nao se perca de novo.
const LINHA_TESTE = 'Made with Kineo — https://www.usekineo.com?utm_source=video_desc'
const base4 = { ytTitle: 'a', ytDescription: 'b', tiktokCaption: 'c', pinnedComment: 'd' }
const comCredito = prepararPacote(base4, { creditLine: LINHA_TESTE })
const semCredito = prepararPacote(base4)
check('6. no GRATUITO o credito entra na descricao', comCredito.ytDescription.includes('usekineo.com'))
check('7. no GRATUITO entra tambem na legenda e no comentario', comCredito.tiktokCaption.includes('usekineo.com') && comCredito.pinnedComment.includes('usekineo.com'))
check('7b. NO PAGO o pacote sai LIMPO nos tres campos', !semCredito.ytDescription.includes('usekineo.com') && !semCredito.tiktokCaption.includes('usekineo.com') && !semCredito.pinnedComment.includes('usekineo.com'))
check('7c. FAIL-CLOSED: sem informacao de plano, nada de credito', !prepararPacote(base4, {}).ytDescription.includes('usekineo.com'))
check('8. o credito NAO e duplicado quando o modelo ja escreveu o dominio', (prepararPacote({ ytTitle: 'a', ytDescription: 'ja tem usekineo.com aqui' }, { creditLine: LINHA_TESTE }).ytDescription.match(/usekineo\.com/g) ?? []).length === 1)
check('9. o credito nao entra em campo vazio (nao inventa legenda)', prepararPacote({ ytTitle: 'a', ytDescription: 'b' }, { creditLine: LINHA_TESTE }).tiktokCaption === '')
check('10. a deteccao do credito ignora caixa', (prepararPacote({ ytTitle: 'a', ytDescription: 'USEKINEO.COM' }, { creditLine: LINHA_TESTE }).ytDescription.match(/usekineo\.com/gi) ?? []).length === 1)
check('11. a linha creditada e EXATAMENTE a que quem chama passou', comCredito.ytDescription.includes(LINHA_TESTE))
// O modulo tem de continuar SEM IMPORT: e assim que este guardiao consegue
// executa-lo direto (o Node nao resolve o alias `@/` do tsconfig — memoria
// `guardioes-com-alias-nao-rodam`). A linha canonica mora no ESCRITOR.
check('11b. lib/publishPack.ts continua sem nenhum import', !/^import /m.test(ler('lib/publishPack.ts')))
check("11c. a linha canonica vem de lib/videoDescription, no escritor", /import \{ KINEO_CREDIT_LINE \} from '@\/lib\/videoDescription'/.test(ler('lib/publishPackServer.ts')))
check('11d. o escritor so credita quando isFreePlan e explicitamente true', /creditLine: opts\?\.isFreePlan === true \? KINEO_CREDIT_LINE : null/.test(ler('lib/publishPackServer.ts')))
check('11e. o cron deriva o plano do MESMO predicado do rodape, sem redigitar', /isFreePlan: !isSubscriberProfile\(prof\)/.test(ler('app/api/cron/send-video-ready/route.ts')))

// ── recortes: o teto nao pode decapitar o credito ────────────────────────
// Foi assim que o "menino da bolha" nasceu em 27/08: cortar por tamanho no fim
// de um texto que carrega a parte importante na cauda.
const gigante = prepararPacote({ ytTitle: 'x'.repeat(300), ytDescription: 'y'.repeat(4000) }, { creditLine: LINHA_TESTE })
check('12. o titulo respeita o teto do YouTube', gigante.ytTitle.length === MAX_YT_TITULO)
check('13. a descricao gigante NAO perde o credito no corte', gigante.ytDescription.includes('usekineo.com'))
check('14. quebra de linha sobrevive (descricao tem paragrafo e hashtags)', prepararPacote(cheio).ytDescription.includes('\n'))
check('15. espaco horizontal duplo e aspas de borda saem', prepararPacote({ ytTitle: '  "Um   titulo"  ', ytDescription: 'b' }).ytTitle === 'Um titulo')

// ── ida e volta pela memoria ─────────────────────────────────────────────
const gravado = prepararPacote(cheio)
check('16. ler de volta devolve o MESMO pacote (idempotente)', JSON.stringify(lerPacote(gravado)) === JSON.stringify(gravado))
check('17. metadata corrompida nao explode', lerPacote({ ytTitle: 123 }) === null && lerPacote(null) === null)
const agora = Date.parse('2026-09-06T14:00:00Z')
check('18. TTL: 1 dia vale, 15 dias nao, ilegivel nao', pacoteAindaVale('2026-09-05T14:00:00Z', agora) && !pacoteAindaVale('2026-08-22T14:00:00Z', agora) && !pacoteAindaVale('lixo', agora))
check('19. o TTL e o mesmo das outras memorias (14 dias)', PACOTE_TTL_MS === 14 * 24 * 60 * 60 * 1000)

// ══ (B) FALHA ABERTA NO CRON — a parte que protege o que ja existia ══════
const cron = ler('app/api/cron/send-video-ready/route.ts')
const escritor = ler('lib/publishPackServer.ts')

check('20. o cron chama o escritor', /pack = await garantirPacote\(\n\s*admin,\n\s*u\.id as string,/.test(cron))
check('21. a chamada esta dentro de try/catch (segunda rede)', /try \{\n\s*pack = await garantirPacote\([\s\S]{0,900}?\} catch \(e\) \{/.test(cron))
check('22. o pack comeca null, entao um catch deixa o e-mail intacto', /let pack = null/.test(cron))
check('23. o catch NAO interrompe o laco (nada de continue/throw ali)', !/\} catch \(e\) \{\n\s*console\.warn\('\[send-video-ready\] publish pack failed[\s\S]{0,200}?(continue|throw)/.test(cron))
// A prova de que o e-mail de hoje nao muda: as duas variaveis sao string
// vazia quando nao ha pacote, e sao as UNICAS insercoes no template.
// KINEO-PACOTE-NA-ENTREGA-2026-09-07 — a marcacao saiu do cron para
// lib/publishPackEmail.ts (fonte unica, lida tambem pelo e-mail de entrega,
// que alcanca 44x mais gente). As verificacoes 24/25/28 passaram a olhar o
// renderizador compartilhado e a prova de que o cron o usa, em vez do
// template inline que nao existe mais.
const renderizador = ler('lib/publishPackEmail.ts')
check('24. sem pacote, o bloco de texto e string vazia', /export function packEmailText\([\s\S]{0,200}?if \(!pk\) return ''/.test(renderizador) && /const packText = packEmailText\(ctx\.pack\)/.test(cron))
check('25. sem pacote, o bloco de html e string vazia', /export function packEmailHtml\([\s\S]{0,300}?if \(!pk\) return ''/.test(renderizador) && /const packHtml = packEmailHtml\(ctx\.pack, \{ theme: 'light' \}\)/.test(cron))
check('26. o assunto do e-mail NAO foi tocado', /const subject = ctx\.sawIt/.test(cron) && !/subject[\s\S]{0,80}packText|subject[\s\S]{0,80}pk\./.test(cron))
check('27. o botao e o link de download continuam antes do pacote', cron.indexOf('Watch &amp; download') < cron.indexOf('${packHtml}'))
// Conteudo do cliente e escapado: um titulo com `<` nao pode injetar HTML.
check('28. o pacote e escapado no HTML (no renderizador; o cron nao tem mais marcacao propria)', /\$\{escapePackHtml\(valor\)\}/.test(renderizador) && !/const bloco = \(rotulo/.test(cron))

// ══ (C) CUSTO, DENOMINADOR E LIMITES ═════════════════════════════════════
check('29. o escritor le a memoria ANTES de gastar', escritor.indexOf('pacoteGravado(') > 0 && escritor.indexOf('pacoteGravado(') < escritor.indexOf('api.openai.com'))
check('30. memoria encontrada devolve sem gastar', /const jaTem = await pacoteGravado\([\s\S]{0,120}?if \(jaTem\) return jaTem/.test(escritor))
// KINEO-PACOTE-OBSERVAVEL-2026-09-06 — esta verificacao exigia o LITERAL
// `return null`. Em 06/09 as sete saidas mudas de garantirPacote passaram a
// nomear-se (`return falhou('so_leitura')`), porque `publish_pack_written`
// estava em zero e nao havia como saber em qual das sete portas ele parava.
// A SEMANTICA nao mudou — `falhou()` devolve `null` — mas o texto sim, e a
// verificacao ficou vermelha sem que nada tivesse quebrado.
// Agora ela cobra a PROPRIEDADE, que era o que importava desde sempre: existe
// uma guarda de so-leitura, ela devolve (direto ou via `falhou`), e ela vem
// ANTES da leitura da chave. Um mutante que apague a guarda, ou que a mova
// para depois do OPENAI_API_KEY, continua reprovando.
check('31. o modo so-leitura corta antes de a chave ser lida',
  /if \(opts\?\.escrever === false\) return (null|falhou\([^)]*\))/.test(escritor) &&
  escritor.indexOf('opts?.escrever === false') > 0 &&
  escritor.indexOf('opts?.escrever === false') < escritor.indexOf('OPENAI_API_KEY'))
check('32. modelo barato e so ele', /model: 'gpt-4o-mini'/.test(escritor) && (escritor.match(/api\.openai\.com/g) ?? []).length === 1)
// Roda em LOTE dentro de um cron: 30 filmes x 25s estouraria o maxDuration.
check('33. o timeout e curto porque roda em lote (12s, nao 25s)', /AbortSignal\.timeout\(12_000\)/.test(escritor))
check('34. todo caminho de erro devolve null, nunca lanca', (escritor.match(/return null/g) ?? []).length >= 6 && !/throw /.test(escritor))
check('35. o unico insert e o da memoria em events', (escritor.match(/\.insert\(/g) ?? []).length === 1 && /name: PACOTE_EVENT/.test(escritor))
// Denominador: sem isto, "ninguem publicou" seria indistinguivel de "ninguem
// recebeu o pacote" — o erro da memoria `remedio-nunca-apertado`.
check('36. o carimbo do e-mail registra se o pacote viajou', /publish_pack: !!ctx\.pack,/.test(cron))
// Dinheiro e pipeline.
check('37. nada disto cobra credito, chama a fal ou renderiza', !/video_credits:\s|debit|fal\.run|fal\.ai|submitToFal/.test(escritor) && !/\.update\(/.test(escritor))
check('38. o pipeline de qualidade nao e lido nem tocado', !/lib\/(compose|hollywood|cinematic|broll)|lyriaMusic|quality_mode/.test(escritor + ler('lib/publishPack.ts')))

// ══ (D) A PORTA DA TELA (#22) ════════════════════════════════════════════
// A #20 pendurou o pacote no e-mail que alcanca 4 pessoas por semana; o que
// alcanca 104 e o instantaneo, e ele sai de dentro do poll de render — nao da
// para pendurar ate 12s de modelo ali sem arriscar a tela parecer travada no
// minuto em que o filme fica pronto. Esta rota e o contrato para a TELA, que e
// lote do Codex: servidor pronto, montagem de uma linha do lado de la.
const porta = ler('app/api/publish-pack/route.ts')
check('39. a porta da tela existe com GET e POST', /export async function GET/.test(porta) && /export async function POST/.test(porta))
check('40. o GET so LE (escrever:false) — custo zero garantido', porta.includes('garantirPacote(admin, userId, alvo, { escrever: false, isFreePlan: gratuito })'))
check('41. o GET nao chama modelo nem grava por conta propria', !/api\.openai\.com/.test(porta) && !/\.insert\(/.test(porta))
check('42. ausencia de pacote e 200 com pack:null, nunca 404', !/status: 404/.test(porta) && /if \(!alvo\) return resposta\(null, null\)/.test(porta))
check('43. so o 401 de nao-autenticado sai como erro', (porta.match(/status: \d+/g) ?? []).filter((x) => x !== 'status: 200').join() === 'status: 401')
check('44. toda leitura de videos e filtrada pelo dono', (porta.match(/from\('videos'\)/g) ?? []).length === (porta.match(/\.eq\('user_id', user\.id\)/g) ?? []).length)
check('45. o credito segue a MESMA regra: gratuito sim, pago nao', /gratuito: !ent\.treatAsPaid/.test(porta) && /isFreePlan: gratuito/.test(porta))
check('46. a resposta diz a tela se o credito viajou (a tela nao deduz do plano)', /hasCredit: pack \?/.test(porta))
check('47. a porta nao cobra credito, nao chama a fal e nao renderiza', !/video_credits:\s|debit|fal\.run|fal\.ai|submitToFal/.test(porta) && !/\.update\(/.test(porta))

console.log(`\n${ok}/${ok + falhas.length} verificacoes passaram`)
if (falhas.length) {
  console.error('\nFALHOU:')
  for (const f of falhas) console.error('  ✗ ' + f)
  process.exit(1)
}
console.log('✓ o pacote nasce com credito, e quando nao nasce o e-mail de hoje segue igual')
