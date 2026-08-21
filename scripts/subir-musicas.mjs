// ═══ KINEO-TRILHA-59-2026-08-21 — sobe as 59 faixas para o bucket `music` ═══
//
// POR QUE ESTE SCRIPT EXISTE, e não um upload feito por mim:
// tentei três caminhos antes. (1) O MCP do Supabase não tem operação de
// storage. (2) O upload pelo navegador foi recusado nesta sessão — a própria
// ferramenta respondeu "tell the user instead of retrying". (3) Arrastar
// arquivo por controle de tela é bloqueado no Chrome.
//
// O caminho limpo é este: o script LÊ a service key do .env.local, que já está
// na máquina do fundador. Eu escrevi o código; a chave nunca passou por mim,
// nunca apareceu no chat e nunca ficou no histórico. É a mesma lógica dos
// N-PUSH.bat — o segredo mora onde já morava.
//
// IDEMPOTENTE: usa upsert. Rodar duas vezes não duplica nem quebra nada.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const PASTA = join(RAIZ, 'music-novas')
const BUCKET = 'music'

function lerEnv() {
  const bruto = readFileSync(join(RAIZ, '.env.local'), 'utf8')
  const env = {}
  for (const linha of bruto.split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return env
}

// ⚠ DESCOBERTO EM 21/08: o .env.local desta maquina NUNCA foi preenchido — e
// o arquivo de exemplo, com 'your-project.supabase.co' e chaves de 13/21
// caracteres. O site funciona porque a VERCEL tem as chaves reais; a maquina
// local nao tem. O erro aparecia como 'TypeError: fetch failed' nas 59, que
// nao aponta nada, ate imprimir error.cause e revelar ENOTFOUND no dominio
// de exemplo. Licao: 'fetch failed' no Node quase sempre esconde a causa.
//
// A URL do projeto e PUBLICA (ja esta em lib/pixabayMusic.ts como
// SUPABASE_MUSIC_BASE), entao fica cravada aqui e sai do caminho.
const URL_BASE = 'https://cqqukkvjjrguayiyjvhh.supabase.co'

// A CHAVE nao. Prioridade: variavel de ambiente da sessao > .env.local.
// Assim o fundador pode colar a chave numa janela de terminal SEM gravar ela
// em arquivo nenhum, e ela morre quando a janela fecha.
const env = lerEnv()
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ''
// ⚠ ACEITA OS DOIS FORMATOS. Eu tinha exigido `eyJ` (o JWT legado) e isso
// REJEITOU a chave real: o Supabase migrou para `sb_secret_...`, que e o que
// a pagina "API Keys" mostra hoje. A chave chegou certa e a MINHA validacao
// derrubou — a janela dizia "Chave recebida. Subindo..." e logo abaixo
// "FALTA A CHAVE". Validacao mais estrita que a realidade e um jeito caro de
// travar quem esta certo.
const FORMATO_OK = CHAVE.startsWith('eyJ') || CHAVE.startsWith('sb_secret_') || CHAVE.length > 30
if (!CHAVE || !FORMATO_OK) {
  console.error('')
  console.error('  FALTA A CHAVE DE SERVICO (service_role) — e so ela.')
  console.error('')
  console.error('  Onde pegar: Supabase > Project Settings > API > service_role')
  console.error('  (ou Vercel > Settings > Environment Variables > SUPABASE_SERVICE_ROLE_KEY)')
  console.error('')
  console.error('  Como usar, SEM gravar em arquivo — cole no PowerShell:')
  console.error('    $env:SUPABASE_SERVICE_ROLE_KEY="COLE_AQUI"')
  console.error('    node scripts\\subir-musicas.mjs')
  console.error('')
  console.error('  A chave some quando voce fechar a janela.')
  console.error('')
  process.exit(1)
}

// DIAGNOSTICO: 'TypeError: fetch failed' no Node esconde a causa real dentro
// de error.cause (DNS, TLS, proxy, ECONNREFUSED...). Sem imprimir isso, os 59
// erros dizem a mesma coisa e nao apontam nada. Primeiro um teste de alcance.
console.log('Node', process.version)
console.log('Testando alcance do Supabase...')
try {
  const t = await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${CHAVE}`, apikey: CHAVE },
  })
  console.log('  alcance OK — HTTP', t.status)
} catch (e) {
  console.error('  ALCANCE FALHOU:', String(e))
  console.error('  causa:', e?.cause ? `${e.cause.code ?? ''} ${e.cause.message ?? e.cause}` : '(sem causa)')
  console.error('\n  Sem alcance nao adianta tentar os 59. Parando.')
  process.exit(1)
}

const arquivos = readdirSync(PASTA).filter((f) => f.endsWith('.mp3')).sort()
if (arquivos.length === 0) {
  console.error(`ERRO: nenhum .mp3 em ${PASTA}`)
  process.exit(1)
}
console.log(`Subindo ${arquivos.length} faixas para o bucket "${BUCKET}"...\n`)

let ok = 0
let falhou = 0
for (const [i, nome] of arquivos.entries()) {
  const caminho = join(PASTA, nome)
  const bytes = readFileSync(caminho)
  const kb = Math.round(statSync(caminho).size / 1024)
  const alvo = `${URL_BASE}/storage/v1/object/${BUCKET}/${encodeURIComponent(nome)}`
  try {
    const r = await fetch(alvo, {
      method: 'POST',
      headers: {
        // ⚠ O `apikey` E OBRIGATORIO AQUI, nao e redundante.
        // A chave nova do Supabase (sb_secret_...) NAO e um JWT. Mandando so
        // `Authorization: Bearer`, o storage tenta ler como JWT e responde
        // 403 "Invalid Compact JWS". Com o `apikey` junto, ele reconhece a
        // chave nova. A prova estava no proprio script: o teste de alcance
        // mandava os DOIS e passava; o upload mandava so um e falhava nas 59.
        apikey: CHAVE,
        Authorization: `Bearer ${CHAVE}`,
        'Content-Type': 'audio/mpeg',
        'x-upsert': 'true', // idempotente: sobrescreve em vez de estourar 409
      },
      body: new Uint8Array(bytes),
    })
    if (r.ok) {
      ok++
      console.log(`  [${String(i + 1).padStart(2)}/${arquivos.length}] OK   ${nome} (${kb} KB)`)
    } else {
      falhou++
      console.log(`  [${String(i + 1).padStart(2)}/${arquivos.length}] FALHA ${nome} — HTTP ${r.status} ${(await r.text()).slice(0, 120)}`)
    }
  } catch (e) {
    falhou++
    const causa = e?.cause ? `${e.cause.code ?? ''} ${e.cause.message ?? e.cause}` : String(e)
    console.log(`  [${String(i + 1).padStart(2)}/${arquivos.length}] ERRO ${nome} — ${String(causa).slice(0, 140)}`)
    if (falhou === 1) console.log('     (primeira falha — se todas repetirem isto, e ambiente, nao arquivo)')
  }
}

console.log(`\nResultado: ${ok} subiram, ${falhou} falharam.`)

// Conferência de verdade: baixa o cabeçalho de 3 arquivos e confirma que o
// storage devolve audio/mpeg. Sem isto, "subiu" é só a palavra do POST.
if (ok > 0) {
  console.log('\nConferindo 3 arquivos no ar...')
  for (const nome of [arquivos[0], arquivos[Math.floor(arquivos.length / 2)], arquivos[arquivos.length - 1]]) {
    const pub = `${URL_BASE}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(nome)}`
    try {
      const r = await fetch(pub, { method: 'HEAD' })
      console.log(`  ${r.ok ? 'OK  ' : 'FALHA'} ${nome} — HTTP ${r.status} ${r.headers.get('content-type') ?? ''}`)
    } catch (e) {
      console.log(`  ERRO ${nome} — ${String(e).slice(0, 80)}`)
    }
  }
}

console.log(falhou === 0 ? '\nTudo certo. Pode rodar o push.' : '\nTeve falha — NAO rode o push ainda.')
