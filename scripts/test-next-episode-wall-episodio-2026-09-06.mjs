// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — sprint-assinaturas #15 (06/09/2026)
// A carta da parede de episódio 2 NOMEIA o episódio que a casa já escreveu.
//
// POR QUE ELE LÊ O ARQUIVO EM VEZ DE IMPORTAR: a rota importa '@/lib/...' e
// um teste de scripts/ morre no alias antes da 1ª verificação — a memória
// `guardioes-com-alias-nao-rodam` registra 72 testes perdidos por isso.
//
// O QUE ELE PRECISA PROVAR (e cada uma tem um mutante que a mata):
//   1. a memória do #14 é LIDA pela rota (evento + reader + TTL);
//   2. a chave é `session_id` (o escritor grava ali; `metadata` não tem);
//   3. o assunto e o prefill usam o episódio QUANDO ele existe;
//   4. sem episódio, a carta sai como hoje (fallback preservado);
//   5. a copy NÃO promete o roteiro inteiro no e-mail (o link leva prompt);
//   6. a leitura falha ABERTA — erro de memória nunca impede o envio;
//   7. o carimbo separa as duas cartas (`tinha_episodio_escrito`).
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROTA = join(raiz, 'app/api/admin/send-next-episode-wall/route.ts')
const src = readFileSync(ROTA, 'utf8').replace(/\r\n/g, '\n')

// A copy que o cliente lê, SEM comentários. Sem isto, uma checagem de "esta
// frase não pode existir" casa com o comentário que explica por que ela não
// pode existir — e o guardião reprova o próprio texto que o protege.
const codigo = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

let ok = 0
const falhas = []
function checa(nome, condicao) {
  if (condicao) ok++
  else falhas.push(nome)
}

// ── 1. a memória do #14 é lida ────────────────────────────────────────────
checa('importa a memória do episódio (#14)', /from '@\/lib\/nextEpisodeMemoria'/.test(src))
checa('usa o nome de evento da casa, não uma string digitada', /EPISODIO_ESCRITO_EVENT/.test(src))
checa('não redigita o nome do evento à mão', !/'next_episode_written'/.test(src))
checa('valida com o reader do produto (lerGravado)', /lerGravado\(/.test(src))
checa('respeita o TTL da memória (memoriaAindaVale)', /memoriaAindaVale\(/.test(src))

// ── 2. a chave é session_id ───────────────────────────────────────────────
checa('consulta a memória por session_id', /\.in\('session_id', videoIds\)/.test(src))
checa('seleciona session_id na leitura', /select\('session_id, metadata, created_at'\)/.test(src))
checa('traz o id do vídeo do banco', /select\('id, user_id, credits_used/.test(src))
checa('guarda o videoId no último filme de cada pessoa', /videoId:/.test(src))
checa('o mais novo vence (ordenado desc)', /order\('created_at', \{ ascending: false \}\)[\s\S]{0,400}session_id/.test(src) || /\.in\('session_id'[\s\S]{0,200}ascending: false/.test(src))

// ── 3. assunto e prefill usam o episódio ──────────────────────────────────
checa('assunto recebe o episódio', /function assunto\(filme: string \| null, episodio: string \| null\)/.test(src))
checa('assunto nomeia o episódio escrito', /if \(episodio\) return `Episode 2: "\$\{episodio\}"`/.test(src))
// A preferencia continua a MESMA (`episodio ?? filme`); o que mudou no #24 e
// que ela viaja pela PORTA CONTADA (`/api/episode-link`, que manda para /login
// e conta o clique) em vez de ir direto ao compositor — que sondado em
// producao dava `307 -> /signup`, um formulario de CRIAR CONTA para quem ja
// tem conta.
// A fonte tem de ser a PROPRIA desta carta: as duas coortes sao opostas (com
// saldo x sem saldo) e precisam de contadores separados.
checa('o prefill prefere o episódio ao tema do filme 1', /buildSeriesContinuationEmailUrl\(SITE, episodio \?\? filme, 'lifecycle_episode_wall'/.test(src))
checa('#24: o link do episódio passa pela porta contada, não direto', !/composerUrl\(/.test(src) && /from '@\/lib\/seriesContinuation'/.test(src))
checa('continuarUrl recebe os dois', /function continuarUrl\(filme: string \| null, episodio: string \| null\)/.test(src))
// ATUALIZADAS PELO #23 (06/09), E NAO AFROUXADAS.
// A sprint-assinaturas #23 acrescentou um SEXTO argumento aos construtores (a
// temporada). As verificacoes continuam exigindo o episodio na MESMA posicao e
// com o MESMO tipo — o que mudou foi so admitir o argumento novo depois dele.
// A prova de que nao afrouxou: trocar d.episodio por null na chamada de envio
// continua deixando isto vermelho.
checa('o corpo texto recebe o episódio', /function corpoTexto\([\s\S]{0,160}episodio: string \| null(,|\))/.test(src))
checa('o corpo html recebe o episódio', /function corpoHtml\([\s\S]{0,160}episodio: string \| null(,|\))/.test(src))
checa(
  'o envio passa o episódio nas três peças',
  /assunto\(d\.filme, d\.episodio\)/.test(src) &&
    /corpoTexto\(d\.filme, d\.saldo, d\.custo, d\.id, d\.episodio(,|\))/.test(src) &&
    /corpoHtml\(d\.filme, d\.saldo, d\.custo, d\.id, d\.episodio(,|\))/.test(src),
)
// E o argumento novo tem de ser a TEMPORADA, nao qualquer coisa: um literal
// ali faria o e-mail prometer "o resto da temporada" sem ter uma.
checa(
  '#23: o sexto argumento e a temporada escrita, nos dois corpos',
  /corpoTexto\(d\.filme, d\.saldo, d\.custo, d\.id, d\.episodio, temporada\)/.test(src) &&
    /corpoHtml\(d\.filme, d\.saldo, d\.custo, d\.id, d\.episodio, temporada\)/.test(src),
)
checa(
  '#23: sem temporada os dois blocos sao string vazia (a carta de hoje sobrevive)',
  /const restoTexto = resto\.length/.test(src) &&
    /const restoHtml = restoEp\.length/.test(src) &&
    (src.match(/\n\s*: ''\n/g) ?? []).length >= 2,
)
checa(
  '#23: a temporada e escrita no ENVIO, dentro de try/catch, nunca no dry-run',
  // O teto de 10s veio junto no #23b: 30 pessoas x 25s estouraria o cron.
  /temporada = await garantirTemporada\(admin, d\.id, d\.filmeRaw, \{ timeoutMs: 10_000 \}\)/.test(src) &&
    /let temporada = null/.test(src) &&
    src.indexOf('temporada = await garantirTemporada') > src.indexOf('const batch = destinatarios.slice(0, lote)'),
)
checa('#23: o carimbo registra se a temporada viajou', /tinha_temporada: !!temporada,/.test(src))

// ── 4. sem episódio, a carta de hoje sobrevive ────────────────────────────
checa('fallback do assunto para o título do filme', /Episode 2 of "\$\{filme\}"/.test(src))
checa('fallback do assunto sem título nenhum', /Your next episode is ready to write/.test(src))
checa('fallback do corpo (texto) preservado', /already typed into the box/.test(src))
checa('o campo aceita ausência de memória', /episodio: string \| null/.test(src))
checa('candidato nasce com null quando não há memória', /episodio: episodioDe\.get\(id\) \?\? null/.test(src))

// ── 5. a copy não promete o roteiro inteiro ───────────────────────────────
// O link carrega um `prompt`, não o texto. Prometer o roteiro no e-mail seria
// reintroduzir exatamente a mentira que o #14 removeu.
checa('não promete o roteiro carregado', !/full script|entire script|script is loaded/i.test(codigo))
checa('a frase do episódio diz apenas que ele está escrito', /is already written — it is called/.test(src))

// ── 6. falha aberta ───────────────────────────────────────────────────────
checa('erro de memória não interrompe o envio', /if \(!memErr\)/.test(src))
checa('não lança quando a memória falha', !/if \(memErr\) return NextResponse/.test(src))
checa('só consulta a memória se houver vídeo', /if \(videoIds\.length > 0\)/.test(src))

// ── 7. o carimbo separa as duas cartas ────────────────────────────────────
checa('o carimbo registra qual carta saiu', /tinha_episodio_escrito: !!d\.episodio/.test(src))
checa('o dry-run conta as cartas com episódio', /com_episodio_escrito: destinatarios\.filter\(\(d\) => !!d\.episodio\)\.length/.test(src))
checa('a lista do dry-run mostra o episódio', /ep2 escrito:/.test(src))

// ── 8. nada do que é proibido mudou ───────────────────────────────────────
checa('não inventa preço', !/\$\d+(\.\d+)?\/(mo|month)/.test(src.replace(/planoUrl\(\)/g, '')))
checa('não promete crédito', !/free credits|bonus credits|extra credits/i.test(src))
checa('a supressão de 24h continua', /loadLifecycleSuppression/.test(src))
checa('o bloqueio de contatos continua', /isBloqueado/.test(src))
checa('o teto de 30 por lote continua', /Math\.min\(limiteParam, 30\)/.test(src))
checa('dry-run continua sendo o padrão', /get\('confirm'\) === 'SEND'/.test(codigo) && /if \(!confirm\)/.test(codigo))

console.log(`\n${ok} verificações ok, ${falhas.length} falhas`)
if (falhas.length) {
  for (const f of falhas) console.log(`  ✗ ${f}`)
  process.exit(1)
}
console.log('✓ a carta nomeia o episódio escrito, e sem memória sai como antes')
