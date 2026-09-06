#!/usr/bin/env node
// GUARDIÃO — sprint-assinaturas #10 (06/09/2026)
// "O filme que fica pronto e nunca é montado."
//
// O que este guardião existe para impedir, em ordem de gravidade:
//   1. que a rota de recuperação vire uma porta lateral de PRIVILÉGIO (dono
//      vindo do corpo, payload repassado sem validação, host de mídia livre);
//   2. que a Fase 4 do cron recomponha filme já entregue, ou entre em laço
//      recompondo o mesmo filme para sempre;
//   3. que o `return` cedo do cron volte e mate as fases 3 e 4 de novo — foi
//      exatamente esse `return` que deixou o motor mais usado da casa sem
//      resgate quando não havia claim cinematográfico na janela;
//   4. que a chamada durável do cliente saia do caminho, ou passe a bloquear
//      a montagem (ela é fire-and-forget de propósito).
//
// Lê os ARQUIVOS REAIS. Nenhuma verificação aqui roda sobre string inventada.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

const ROTA = 'app/api/render-recovery/route.ts'
const CRON = 'app/api/cron/finish-stranded-renders/route.ts'
const CLIENTE = 'app/(dashboard)/generate/GenerateClient.tsx'

const rota = ler(ROTA)
const cron = ler(CRON)
const cliente = ler(CLIENTE)

// Fonte CRU para as checagens de segurança. Tirar comentário com um regex de
// `//` engole `https://` e some com host — a armadilha que já mordeu duas
// vezes nesta sprint (#4). Aqui a gente corta comentário SÓ de linha inteira.
const semComentarios = (s) =>
  s
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n')

const rotaCodigo = semComentarios(rota)
const cronCodigo = semComentarios(cron)
const clienteCodigo = semComentarios(cliente)

let ok = 0
const falhas = []
function checa(nome, condicao) {
  if (condicao) ok++
  else falhas.push(nome)
}

// ── 1. A ROTA NÃO CONFIA NO NAVEGADOR ────────────────────────────────────────
checa('rota: o dono vem do cookie (auth.getUser)', /auth\.getUser\(\)/.test(rotaCodigo))
checa(
  'rota: 401 quando não há sessão',
  /if \(!user\) return NextResponse\.json\([^)]*401|if \(!user\)[\s\S]{0,120}status: 401/.test(rotaCodigo),
)
checa(
  'rota: NUNCA lê user_id/userId do corpo',
  !/body\.(user_id|userId)/.test(rotaCodigo) && !/composePayload\.(user_id|userId)/.test(rotaCodigo),
)
checa(
  'rota: grava user_id a partir do usuário autenticado',
  /user_id: user\.id/.test(rotaCodigo),
)
checa(
  'rota: o payload gravado é o SANITIZADO, não o do corpo',
  /metadata: \{ payload,/.test(rotaCodigo) && !/metadata: \{ payload: body/.test(rotaCodigo),
)

// ── 2. O SANITIZADOR ─────────────────────────────────────────────────────────
checa("sanitizador: só aceita quality 'fast'", /p\.quality !== 'fast'/.test(rotaCodigo))
checa(
  'sanitizador: força o generationId validado dentro do payload',
  /const out: Record<string, unknown> = \{[\s\S]{0,200}\n\s*generationId,/.test(rotaCodigo),
)
checa('sanitizador: exige https', /u\.protocol !== 'https:'/.test(rotaCodigo))
checa('sanitizador: recusa URL com credencial embutida', /u\.username \|\| u\.password/.test(rotaCodigo))
checa(
  'sanitizador: host precisa estar na lista (igual ou subdomínio)',
  /ALLOWED_CLIP_HOSTS\.some\(\(h\) => host === h \|\| host\.endsWith\(`\.\$\{h\}`\)\)/.test(rotaCodigo),
)
checa('sanitizador: um único host reprovado derruba o payload inteiro', /if \(!hostAllowed\(u\)\) return null/.test(rotaCodigo))
checa('sanitizador: teto de clipes', /urls\.length > MAX_CLIPS/.test(rotaCodigo))
checa('sanitizador: duração dentro de faixa sã', /duration < 5 \|\| duration > 120/.test(rotaCodigo))
checa('sanitizador: exige narração', /if \(!voiceover\) return null/.test(rotaCodigo))

// A lista de hosts é o coração da recusa: se alguém abrir para tudo, o
// resgate passa a compor mídia de origem desconhecida em modo serviço.
const listaHosts = (rotaCodigo.match(/const ALLOWED_CLIP_HOSTS = \[([\s\S]*?)\]/) ?? [])[1] ?? ''
checa('lista de hosts: existe e é fechada', listaHosts.length > 0 && !/['"]\*['"]|['"]{2}/.test(listaHosts))
checa('lista de hosts: cobre o Pixabay (motor de b-roll do Kineo 1)', /pixabay\.com/.test(listaHosts))
checa('lista de hosts: cobre o nosso bucket', /supabase\.co/.test(listaHosts))

// ── 3. FASE 4 DO CRON: NÃO RECOMPOR, NÃO ENTRAR EM LAÇO ──────────────────────
// As fases são NOMEADAS em comentário — localizar no fonte CRU e só depois
// passar o corpo extraído pelo removedor de comentário. Procurar "FASE 4" no
// texto já sem comentário devolveria vazio, e o guardião ficaria verde por
// não achar nada que reprovar.
const fase4 = semComentarios((cron.match(/FASE 4[\s\S]*?(?=const SILENT_TERMINAL)/) ?? [''])[0])
checa('cron: a Fase 4 existe', fase4.length > 400)
checa(
  'fase 4: entra pelo evento da rota de recuperação',
  /\.eq\('name', RECOVERABLE_EVENT\)/.test(fase4),
)
checa(
  'fase 4: pula quem já compôs sozinho (compose_submission_claim)',
  /composedGens\.has\(genId\)/.test(fase4) && /compose_submission_claim/.test(fase4),
)
checa('fase 4: respeita o teto de tentativas', /tried >= MAX_COMPOSE_ATTEMPTS/.test(fase4))
checa('fase 4: tem orçamento por rodada', /fastFinished >= MAX_RECOVERY_PER_RUN/.test(fase4))
checa('fase 4: pula conta interna/descartável', /isInternalOrJunkEmail\(email\)/.test(fase4))
checa(
  'fase 4: REVALIDA o payload guardado antes de compor',
  /sanitizeFastComposePayload\(genId,/.test(fase4),
)
checa(
  'fase 4: compõe pelo modo serviço (não inventa autenticação)',
  /serviceHeaders\(userId\)/.test(fase4) && /composePost\(composeReq\)/.test(fase4),
)

// A trava anti-laço, e ela é dupla: o marcador de tentativa é gravado ANTES do
// compose E a falha de gravação ABORTA. Sem isso uma rodada com PostgREST ruim
// recompõe o mesmo filme para sempre — e cada volta cobra crédito da pessoa.
const idxMarcador = fase4.indexOf('RECOVERY_ATTEMPT_EVENT, session_id: genId')
const idxCompose = fase4.indexOf('composePost(composeReq)')
checa('fase 4: o marcador de tentativa EXISTE', idxMarcador > 0)
checa('fase 4: o compose EXISTE', idxCompose > 0)
// Ordem só é pergunta legítima quando os dois existem — `indexOf` de algo
// ausente devolve −1, que é menor que tudo e APROVA a remoção que a checagem
// existe para pegar. (Mutante que furou o guardião da #4.)
checa(
  'fase 4: marcador ANTES do compose',
  idxMarcador > 0 && idxCompose > 0 && idxMarcador < idxCompose,
)
checa(
  'fase 4: falha ao gravar o marcador ABORTA (fail-closed, não compõe às cegas)',
  /if \(recAttemptErr\) \{[\s\S]{0,200}continue/.test(fase4),
)
checa(
  'fase 4: erro no lote de marcadores NÃO libera compose',
  /if \(!recMarkerErr\) \{/.test(fase4),
)

// ── 4. O `return` CEDO NÃO PODE VOLTAR ───────────────────────────────────────
// Ele existia e matava as fases 3 e 4 inteiras quando não havia claim
// cinematográfico settled na janela — o motor mais usado da casa só era
// resgatado por acaso.
checa(
  'cron: nenhum return cedo por ausência de claim cinematográfico',
  !/if \(candidates\.length === 0\) return/.test(cronCodigo),
)
checa(
  'cron: a ausência de claim virou marcador, não saída',
  /const noCinematicClaims = candidates\.length === 0/.test(cronCodigo),
)
// A Fase 3 (Kineo 1) e a Fase 4 precisam vir DEPOIS do ponto onde o return
// morava, e nada pode retornar entre o cálculo de `candidates` e elas.
const idxCandidatos = cron.indexOf('const noCinematicClaims')
const idxFase3 = cron.indexOf('FASE 3')
const idxFase4 = cron.indexOf('FASE 4')
checa('cron: Fase 3 depois do marcador', idxCandidatos > 0 && idxFase3 > idxCandidatos)
checa('cron: Fase 4 depois da Fase 3', idxFase3 > 0 && idxFase4 > idxFase3)
const entre = semComentarios(cron.slice(idxCandidatos, idxFase3))
checa(
  'cron: nenhum return incondicional entre o marcador e a Fase 3',
  !/^\s{0,2}return /m.test(entre),
)

// ── 5. A CHAMADA DURÁVEL DO CLIENTE ──────────────────────────────────────────
checa('cliente: a chamada durável existe', /\/api\/render-recovery/.test(clienteCodigo))
checa(
  'cliente: é fire-and-forget (não bloqueia a montagem)',
  /void fetch\('\/api\/render-recovery'/.test(clienteCodigo),
)
checa(
  'cliente: erro da chamada é engolido, nunca derruba o render',
  /\/api\/render-recovery[\s\S]{0,400}\.catch\(\(\) => \{\}\)/.test(clienteCodigo),
)
checa(
  'cliente: manda o payload de compose e a geração',
  /generationId: fastGenerationId, composePayload: checkpointComposePayload/.test(clienteCodigo),
)
// FORA do try do localStorage: quando o storage está bloqueado o navegador não
// consegue retomar nada, e é justamente aí que o servidor precisa da cópia.
const idxFetch = clienteCodigo.indexOf("void fetch('/api/render-recovery'")
const idxSetItem = clienteCodigo.indexOf('localStorage.setItem(activeRenderStorageKey', idxFetch > 0 ? idxFetch : 0)
checa('cliente: o setItem do checkpoint existe', idxSetItem > 0)
checa(
  'cliente: a chamada durável vem ANTES do try do localStorage',
  idxFetch > 0 && idxSetItem > 0 && idxFetch < idxSetItem,
)
checa(
  'cliente: nada de await na chamada durável',
  !/await fetch\('\/api\/render-recovery'/.test(clienteCodigo),
)

// ── 6. NADA DO PIPELINE DE QUALIDADE FOI TOCADO ──────────────────────────────
// O ciclo proíbe mexer no filme. A prova possível aqui é negativa e barata:
// a rota nova não importa nada do pipeline, e não escreve prompt de cena.
checa(
  'rota: não importa nada do pipeline de qualidade',
  !/from '@\/lib\/(compose|hollywood|cinematic|broll|lyriaMusic)/.test(rotaCodigo),
)
checa(
  'rota: não inventa roteiro nem prompt de cena',
  !/visual_prompt|scene_prompt|generateScript|openai/i.test(rotaCodigo),
)

console.log(`\n${falhas.length === 0 ? '✅' : '❌'} guardião #10 — ${ok}/${ok + falhas.length} verificações`)
if (falhas.length > 0) {
  console.log('\nFALHAS:')
  for (const f of falhas) console.log(`  · ${f}`)
  process.exit(1)
}
