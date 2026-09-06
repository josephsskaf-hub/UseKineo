// Guardião do KINEO-EPISODIO2-MEMORIA-2026-09-06 (sprint-assinaturas #14).
//
// O que este teste existe para impedir:
//   (1) que a leitura da memória volte para DEPOIS do cooldown ou DEPOIS da
//       chamada ao OpenAI — a ordem É o conserto: quem volta do e-mail no
//       mesmo minuto levava 429 e card vazio;
//   (2) que a gravação suma e a rota volte a jogar fora o episódio que
//       escreveu;
//   (3) que a leitura passe a usar o cliente do USUÁRIO — `events` é
//       service-role-only desde 26/08 e a leitura voltaria vazia em silêncio,
//       o que a rota leria como "não há memória";
//   (4) que um erro de banco deixe de falhar ABERTO e passe a derrubar o card.
//
// Estilo readFileSync de propósito: guardião com import `@/` morre no import
// antes da 1ª verificação (memória `guardioes-com-alias-nao-rodam`).
// Toda leitura normaliza CRLF (memória `guardiao-crlf-falso-vermelho`).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const raiz = process.cwd()
const ler = (p) => readFileSync(join(raiz, p), 'utf8').replace(/\r\n/g, '\n')

let ok = 0
let falhas = 0
function checa(nome, condicao) {
  if (condicao) { ok++; return }
  falhas++
  console.error(`  ✗ ${nome}`)
}

const ROTA = 'app/api/next-episode/route.ts'
const LIB = 'lib/nextEpisodeMemoria.ts'
const rota = ler(ROTA)
const lib = ler(LIB)

// ── 1. A ORDEM, que é o conserto inteiro ────────────────────────────────────
const iLeitura = rota.indexOf('await episodioJaEscrito(')
const iCooldown = rota.indexOf('agora - ultima < COOLDOWN_MS')
const iOpenAI = rota.indexOf('https://api.openai.com/v1/chat/completions')
const iApiKey = rota.indexOf("process.env.OPENAI_API_KEY")
const iBody = rota.indexOf('await req.json()')
const iAuth = rota.indexOf("status: 401")

checa('1.1 a rota consulta a memória do episódio', iLeitura > 0)
checa('1.2 o cooldown de 45s ainda existe', iCooldown > 0)
checa('1.3 a chamada ao OpenAI ainda existe', iOpenAI > 0)
checa('1.4 a LEITURA vem ANTES do cooldown', iLeitura < iCooldown)
checa('1.5 a LEITURA vem ANTES do OpenAI', iLeitura < iOpenAI)
checa('1.6 a LEITURA vem ANTES do 503 por falta de chave do OpenAI', iLeitura < iApiKey)
checa('1.7 a LEITURA vem DEPOIS de saber quem é a pessoa (401)', iLeitura > iAuth)
checa('1.8 a LEITURA vem DEPOIS de ler o corpo (precisa do fromVideoId)', iLeitura > iBody)

// ── 2. A chave durável ──────────────────────────────────────────────────────
checa('2.1 a leitura é chaveada pelo filme (fromVideoId)', /if \(fromVideoId\)\s*\{[\s\S]{0,400}?episodioJaEscrito\(user\.id, fromVideoId\)/.test(rota))
checa('2.2 sem fromVideoId a rota segue o caminho de sempre (não há else que bloqueie)', !/episodioJaEscrito[\s\S]{0,200}else\s*\{\s*return/.test(rota))
checa('2.3 a consulta filtra por session_id = fromVideoId', /\.eq\('session_id', fromVideoId\)/.test(rota))
checa('2.4 a consulta filtra pelo dono', /\.eq\('user_id', userId\)/.test(rota))
checa('2.5 a consulta filtra pelo nome do evento da memória', /\.eq\('name', EPISODIO_ESCRITO_EVENT\)/.test(rota))
checa('2.6 pega a mais recente', /\.order\('created_at', \{ ascending: false \}\)/.test(rota) && /\.limit\(1\)/.test(rota))

// ── 3. Service role, não o cliente do usuário ───────────────────────────────
const blocoAdmin = rota.slice(rota.indexOf('function adminOuNulo'), rota.indexOf('function adminOuNulo') + 700)
checa('3.1 existe um cliente de serviço próprio', /createServiceClient\(url, key/.test(blocoAdmin))
checa('3.2 ele usa a chave de SERVIÇO', /SUPABASE_SERVICE_ROLE_KEY/.test(blocoAdmin))
checa('3.3 sem chave de serviço, não há memória (devolve null)', /if \(!url \|\| !key\) return null/.test(blocoAdmin))
const blocoLeitura = rota.slice(rota.indexOf('async function episodioJaEscrito'), rota.indexOf('async function guardarEpisodio'))
checa('3.4 a leitura NÃO usa o cliente do usuário', !/\bsupabase\b/.test(blocoLeitura))
checa('3.5 a leitura usa o admin', /const admin = adminOuNulo\(\)/.test(blocoLeitura))

// ── 4. Falha ABERTA: memória é bônus, card não é ────────────────────────────
checa('4.1 erro de consulta devolve null (escreve um novo)', /if \(error\) return null/.test(blocoLeitura))
checa('4.2 a leitura inteira é try/catch com null no catch', /\} catch \{\s*\n\s*return null\s*\n\s*\}/.test(blocoLeitura))
checa('4.3 memória fora da janela devolve null', /memoriaAindaVale\(/.test(blocoLeitura))
checa('4.4 metadata quebrada devolve null (lerGravado valida)', /return lerGravado\(linha\.metadata\)/.test(blocoLeitura))

// ── 5. A gravação ───────────────────────────────────────────────────────────
const iGravacao = rota.indexOf('await guardarEpisodio(')
checa('5.1 a rota grava o episódio escrito', iGravacao > 0)
checa('5.2 a gravação acontece DEPOIS do texto estar pronto', iGravacao > rota.indexOf('const garantido = garantirMarcadores'))
checa('5.3 a gravação acontece ANTES da resposta', iGravacao < rota.lastIndexOf('return NextResponse.json({'))
checa('5.4 grava só o que passa pela validação', /prepararParaGravar\(\{[\s\S]{0,400}?\}\)\s*\n\s*if \(paraGravar\) await guardarEpisodio/.test(rota))
const blocoGrava = rota.slice(rota.indexOf('async function guardarEpisodio'), rota.indexOf('async function guardarEpisodio') + 900)
checa('5.5 a gravação usa o nome de evento da memória', /name: EPISODIO_ESCRITO_EVENT/.test(blocoGrava))
checa('5.6 a gravação é chaveada pelo filme', /session_id: fromVideoId\.slice\(0, 64\)/.test(blocoGrava))
checa('5.7 a gravação nunca derruba a resposta (try/catch)', /try \{[\s\S]*?\} catch \{[\s\S]*?\}/.test(blocoGrava))
checa('5.8 nenhuma migration nova: a memória mora em `events`', /\.from\('events'\)\.insert\(/.test(blocoGrava))

// ── 6. O texto do filme NÃO muda (limite do CLAUDE.md) ──────────────────────
checa('6.1 o prompt do sistema segue intacto (modelo gpt-4o-mini)', /model: 'gpt-4o-mini'/.test(rota))
checa('6.2 os marcadores seguem os mesmos', /const MARCADORES = \['HOOK', 'MICRO REWARD', 'ESCALATION', 'PAYOFF'\]/.test(rota))
checa('6.3 a temperatura não foi mexida', /temperature: 0\.8/.test(rota))
checa('6.4 a resposta em cache devolve o script GRAVADO, sem reescrever', /script: lembrado\.script/.test(rota))
checa('6.5 a resposta em cache se declara cache', /cached: true/.test(rota))

// ── 7. A biblioteca, exercitada de verdade ──────────────────────────────────
const mod = await import('../lib/nextEpisodeMemoria.ts').catch(() => null)
if (mod) {
  // Ambiente com loader de TS: exercita as funções.
  const bom = { title: 'The City That Vanished', script: 'HOOK\n' + 'word '.repeat(40), words: 42, episodeNumber: 3, markersVia: 'model' }
  const p = mod.prepararParaGravar(bom)
  checa('7.1 episódio válido é aceito', p && p.title === bom.title && p.episodeNumber === 3)
  checa('7.2 sem título, rejeita', mod.prepararParaGravar({ ...bom, title: '  ' }) === null)
  checa('7.3 script curto demais, rejeita', mod.prepararParaGravar({ ...bom, script: 'oi' }) === null)
  checa('7.4 script gigante, rejeita', mod.prepararParaGravar({ ...bom, script: 'x'.repeat(9000) }) === null)
  checa('7.5 words zero, rejeita', mod.prepararParaGravar({ ...bom, words: 0 }) === null)
  // A propriedade que importa: o que foi GRAVADO volta byte a byte. (A única
  // transformação da escrita é o trim das pontas — por isso o alvo é `p`, o
  // registro gravado, e não o objeto cru de entrada.)
  checa('7.6 ida e volta preserva o script byte a byte', mod.lerGravado({ ...p }).script === p.script && p.script === bom.script.trim())
  checa('7.7 metadata vazia devolve null', mod.lerGravado(null) === null && mod.lerGravado({}) === null)
  const agora = Date.parse('2026-09-06T09:00:00Z')
  checa('7.8 memória de 1h vale', mod.memoriaAindaVale('2026-09-06T08:00:00Z', agora) === true)
  checa('7.9 memória de 20 dias não vale', mod.memoriaAindaVale('2026-08-17T08:00:00Z', agora) === false)
  checa('7.10 data inválida não vale', mod.memoriaAindaVale('nao-e-data', agora) === false)
  checa('7.11 relógio do banco à frente conta como recente', mod.memoriaAindaVale('2026-09-06T09:30:00Z', agora) === true)
} else {
  // Sem loader de TS: as mesmas garantias, lidas do arquivo.
  checa('7.1 (texto) episódio sem título é rejeitado', /if \(!title\) return null/.test(lib))
  checa('7.2 (texto) script curto é rejeitado', /if \(script\.length < 40\) return null/.test(lib))
  checa('7.3 (texto) script gigante é rejeitado', /if \(script\.length > MAX_SCRIPT_CHARS\) return null/.test(lib))
  checa('7.4 (texto) words<=0 é rejeitado', /if \(words <= 0\) return null/.test(lib))
  checa('7.5 (texto) a leitura reusa a MESMA validação da escrita', /return prepararParaGravar\(\{/.test(lib))
  checa('7.6 (texto) TTL de 14 dias', /MEMORIA_TTL_MS = 14 \* 24 \* 60 \* 60 \* 1000/.test(lib))
  checa('7.7 (texto) idade negativa conta como recente', /if \(idade < 0\) return true/.test(lib))
  checa('7.8 (texto) data inválida não vale', /if \(!Number\.isFinite\(t\)\) return false/.test(lib))
  checa('7.9 (texto) o nome do evento é único e nomeado', /EPISODIO_ESCRITO_EVENT = 'next_episode_written'/.test(lib))
  checa('7.10 (texto) teto de script declarado', /MAX_SCRIPT_CHARS = 4000/.test(lib))
  checa('7.11 (texto) teto de título declarado', /MAX_TITULO_CHARS = 160/.test(lib))
}

// ── 8. Nada de crédito, preço ou plano nesta camada ─────────────────────────
checa('8.1 a lib não conhece crédito/preço/plano', !/credit|price|plan|checkout|stripe/i.test(lib.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')))
checa('8.2 a memória não concede nem gasta crédito', !/video_credits|grantCredits|debit/i.test(blocoGrava + blocoLeitura))

console.log(`\n${ok} ok / ${falhas} falhas`)
process.exit(falhas === 0 ? 0 : 1)
