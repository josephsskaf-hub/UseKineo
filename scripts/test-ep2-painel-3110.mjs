// KINEO-EP2-PAINEL-3110 — guardião das duas peças de 31/10:
//   A) a carta do episódio 2 do dia seguinte (lib/episode2Email.ts + app/api/cron/send-episode2 + vercel.json armado);
//   B) o cartão do /admin com o placar das mudanças do dia (lib/admin/funilDoDia3110.ts + components/admin/FunilDoDia3110.tsx).
// Carrega os módulos PUROS reais (Node com type stripping) e lê o código das rotas. Depois roda MUTANTES: cada mutante
// precisa derrubar pelo menos uma prova — senão o guardião não guarda nada.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
const F = {
  carta: 'lib/episode2Email.ts',
  funil: 'lib/admin/funilDoDia3110.ts',
  rota: 'app/api/cron/send-episode2/route.ts',
  cartao: 'components/admin/FunilDoDia3110.tsx',
  pagina: 'app/admin/page.tsx',
  vercel: 'vercel.json',
  eventos: 'lib/lifecycle/emailEvents.ts',
  serie: 'lib/seriesContinuation.ts',
  temporada: 'app/api/admin/send-season-letter/route.ts',
}
const TMP = join(tmpdir(), `kineo-ep2-painel-3110-${process.pid}`)
mkdirSync(TMP, { recursive: true })
let seq = 0
async function carregar(src) {
  const p = join(TMP, `m${seq++}.ts`)
  writeFileSync(p, src)
  return import(pathToFileURL(p).href)
}

const H = 3_600_000
const AGORA = Date.parse('2026-10-31T18:00:00Z')

async function provar(S) {
  const falhas = []
  let ok = 0
  const checa = (n, fn) => { let r = false; try { r = fn() } catch { r = false } if (r) ok++; else falhas.push(n) }
  const E = await carregar(S.carta)
  const P = await carregar(S.funil)

  // ── A1. a decisão ──────────────────────────────────────────────────────────
  const base = { completedFilms: 1, firstFilmAtMs: AGORA - 24 * H, nowMs: AGORA, email: 'ana@x.com', optedOut: false, internal: false, alreadyStamped: false, sisterLetter: false, balance: 30, cost: 15 }
  const dec = (o) => E.decidirEpisodio2({ ...base, ...o })
  checa('A1a caso feliz (24 h, 1 filme, saldo 30 ≥ 15) envia', () => dec({}).ok === true)
  checa('A1b janela: 19,9 h fora, 20 h dentro, 28 h dentro, 28,1 h fora', () =>
    dec({ firstFilmAtMs: AGORA - 19.9 * H }).reason === 'fora_da_janela' && dec({ firstFilmAtMs: AGORA - 20 * H }).ok &&
    dec({ firstFilmAtMs: AGORA - 28 * H }).ok && dec({ firstFilmAtMs: AGORA - 28.1 * H }).reason === 'fora_da_janela')
  checa('A1c segundo filme já feito = não envia', () => dec({ completedFilms: 2 }).reason === 'ja_tem_segundo_filme')
  checa('A1d interna, descadastrada e sem e-mail ficam fora', () => dec({ internal: true }).reason === 'interna' && dec({ optedOut: true }).reason === 'descadastrado' && dec({ email: '' }).reason === 'sem_email')
  checa('A1e 1 vez por pessoa: carimbo próprio ou carta irmã = não envia', () => dec({ alreadyStamped: true }).reason === 'ja_recebeu' && dec({ sisterLetter: true }).reason === 'recebeu_carta_irma')
  checa('A1f saldo: abaixo do custo, ilegível ou custo desconhecido = não promete filme', () =>
    dec({ balance: 14 }).reason === 'sem_saldo' && dec({ balance: null }).reason === 'sem_saldo' && dec({ cost: null }).reason === 'sem_custo' && dec({ balance: 15 }).ok)
  checa('A1g o evento, a fonte e as irmãs são os combinados', () => E.EPISODE2_EMAIL_EVENT === 'episode2_email_sent' && E.EPISODE2_SOURCE === 'lifecycle_episode2_email' &&
    E.EPISODE2_SISTER_STAMPS.includes('season_letter_emailed_v1') && E.EPISODE2_SISTER_STAMPS.includes('next_episode_wall_emailed_v1'))

  // ── A2. a ideia (lida, nunca escrita) ──────────────────────────────────────
  checa('A2a prioridade: next_episode_written > season_written > tema do filme', () => {
    const a = E.escolherIdeiaEpisodio2({ written: { title: 'The Second Door' }, season: { title: 'S', seed: 's' }, filmTitle: 'Film' })
    const b = E.escolherIdeiaEpisodio2({ written: null, season: { title: 'Ep2 of season', seed: 'seed of ep2' }, filmTitle: 'Film' })
    const c = E.escolherIdeiaEpisodio2({ filmTitle: 'The Lost City' })
    return a.source === 'next_episode_written' && a.title === 'The Second Door' && b.source === 'season_written' && b.seed === 'seed of ep2' &&
      c.source === 'film_title' && c.title === null && c.seed === 'The Lost City' && E.escolherIdeiaEpisodio2({}) === null
  })

  // ── A3. a carta ────────────────────────────────────────────────────────────
  const URL_ = 'https://www.usekineo.com/api/episode-link?prompt=x&continuation_source=lifecycle_episode2_email'
  const carta = E.montarCartaEpisodio2({ filmTitle: 'Tom & <Jerry>', thumbnailUrl: 'https://cdn.x/t.jpg', idea: { title: 'Part "two"', seed: 'p', source: 'next_episode_written' }, url: URL_ })
  checa('A3a assunto "Episode 2 of "<título>" is ready to film"', () => carta.subject === 'Episode 2 of "Tom & <Jerry>" is ready to film' && E.assuntoEpisodio2(null) === 'Episode 2 of your film is ready to film')
  checa('A3b HTML escapa título e ideia; miniatura e botão presentes', () => carta.html.includes('Tom &amp; &lt;Jerry&gt;') && !carta.html.includes('<Jerry>') &&
    carta.html.includes('Part &quot;two&quot;') && carta.html.includes('<img src="https://cdn.x/t.jpg"') && carta.html.includes('Film episode 2') && carta.text.includes(URL_))
  checa('A3c miniatura só https sem aspas; sem miniatura, sem <img>', () => E.miniaturaSegura('http://x/a.jpg') === null && E.miniaturaSegura('https://x/a".jpg') === null &&
    !E.montarCartaEpisodio2({ filmTitle: null, thumbnailUrl: 'javascript:alert(1)', idea: { title: null, seed: 's', source: 'film_title' }, url: URL_ }).html.includes('<img'))
  checa('A3d honesta: sem ideia gravada não diz "already written"; nunca cita preço', () => {
    const neutra = E.montarCartaEpisodio2({ filmTitle: 'X', thumbnailUrl: null, idea: { title: null, seed: 'X', source: 'film_title' }, url: URL_ })
    return !neutra.text.includes('already written') && carta.text.includes('already written') && !/\$\s?\d|credits? cost|per month/i.test(carta.text + neutra.text)
  })

  // ── A4. a rota e o encanamento ─────────────────────────────────────────────
  const rota = S.rota
  checa('A4a vercel.json agenda a rota COM ?confirm=SEND (de hora em hora)', () => JSON.parse(S.vercel).crons.some((c) => c.path === '/api/cron/send-episode2?confirm=SEND' && /^\d+ \* \* \* \*$/.test(c.schedule)))
  checa('A4b dry-run por padrão: só confirm=SEND envia, e o envio vem DEPOIS do return do dry-run', () =>
    /const confirm = req\.nextUrl\.searchParams\.get\('confirm'\) === 'SEND'/.test(rota) && rota.indexOf("if (!confirm) {") > 0 && rota.indexOf("api.resend.com") > rota.indexOf("if (!confirm) {"))
  checa('A4c auth: Bearer CRON_SECRET fail-closed ou sessão de admin', () => /if \(!cronSecret\) return false/.test(rota) && /if \(!viaCron && !\(await isAdminSession\(\)\)\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/.test(rota))
  checa('A4d leitura paginada (readAll) e sem .limit(); .in() em lotes', () => (rota.match(/readAll</g) || []).length >= 2 && !/\.limit\(/.test(rota) && /const IN_CHUNK = 150/.test(rota))
  checa('A4e supressão 24 h, internas, descadastro e cota diária respeitados', () => /loadLifecycleSuppression\(admin/.test(rota) && /internal: isInternalEmail\(email\)/.test(rota) &&
    /optedOut: p\.email_opted_out === true/.test(rota) && /claimEmailSlot\(\{ kind: EPISODE2_CAMPAIGN, priority: 'product'/.test(rota) && /unsubscribeHeaders\(c\.id\)/.test(rota) && /emailFooterHtml\(c\.id\)/.test(rota))
  checa('A4f carimbo episode2_email_sent SÓ depois do res.ok', () => {
    const i = rota.indexOf("if (!res.ok) throw"), j = rota.indexOf('name: EPISODE2_EMAIL_EVENT')
    return i > 0 && j > i
  })
  checa('A4g o botão passa pela porta /api/episode-link com a fonte nova (buildSeriesContinuationEmailUrl)', () => /buildSeriesContinuationEmailUrl\(SITE, seed, EPISODE2_SOURCE/.test(rota) &&
    /\| 'lifecycle_episode2_email'/.test(S.serie))
  checa('A4h ninguém recebe duas cartas: supressão da casa vê o carimbo e a season_letter o exclui', () =>
    /'episode2_email_sent',\n\] as const/.test(S.eventos) && /const OTHER_CAMPAIGNS = \[[^\]]*'episode2_email_sent'/.test(S.temporada))
  checa('A4i a ideia é LIDA (next_episode_written / season_written), nunca escrita: sem garantirTemporada nem OpenAI', () =>
    /EPISODIO_ESCRITO_EVENT, TEMPORADA_EVENT/.test(rota) && !/garantirTemporada|api\.openai\.com/.test(rota))

  // ── B1. o funil puro ───────────────────────────────────────────────────────
  const d = (h) => new Date(AGORA - h * H).toISOString()
  const ext = new Set(['u1', 'u2', 'u3'])
  const linhas = [
    { name: 'premiere_shown', user_id: 'u1', created_at: d(1) },
    { name: 'premiere_shown', user_id: 'u1', created_at: d(2) }, // mesma pessoa: conta 1
    { name: 'premiere_shown', user_id: 'u2', created_at: d(30) },
    { name: 'premiere_shown', user_id: 'int', created_at: d(3) }, // interna: fora
    { name: 'premiere_shown', user_id: 'u3', created_at: d(24 * 8) }, // janela anterior
    { name: 'plan_finder_opened', user_id: null, session_id: 'sA', created_at: d(5) }, // anônimo: pela sessão
    { name: 'plan_finder_opened', user_id: null, session_id: 'sA', created_at: d(6) },
    { name: 'premiere_next_clicked', user_id: 'u1', created_at: d(24 * 15) }, // fora das duas janelas
  ]
  const funis = P.contarFunisDeEvento(linhas, ext, AGORA)
  const deg = (chave, nome) => funis.find((f) => f.chave === chave).degraus.find((x) => x.nome === nome)
  checa('B1a pessoas distintas, interna fora, janela anterior separada, fora das janelas ignorado', () => {
    const s = deg('estreia', 'premiere_shown')
    return s.atual === 2 && s.anterior === 1 && deg('estreia', 'premiere_next_clicked').atual === 0 && deg('estreia', 'premiere_next_clicked').anterior === 0
  })
  checa('B1b evento anônimo conta pela sessão (uma vez)', () => deg('plano', 'plan_finder_opened').atual === 1)
  checa('B1c todos os degraus pedidos existem, na ordem', () => JSON.stringify(P.FUNIS_DE_EVENTO.map((f) => f.degraus)) === JSON.stringify([
    ['premiere_shown', 'premiere_ready_seen', 'premiere_download_clicked', 'premiere_next_clicked'],
    ['refusal_fix_shown', 'refusal_fix_clicked'], ['plan_finder_opened', 'plan_finder_recommended'],
    ['cancel_flow_opened', 'cancel_saved_downgrade', 'cancel_continued'],
  ]) && ['checkout_started', 'payment_success', 'generate_started'].every((n) => P.NOMES_DO_PAINEL.includes(n)))
  const j = P.janelas(AGORA).atual
  const pf = P.contarPrimeiroFilme(
    [{ id: 'u1', created_at: d(10) }, { id: 'u2', created_at: d(20) }, { id: 'u3', created_at: d(24 * 9) }],
    [{ name: 'generate_started', user_id: 'u1', created_at: d(9) }, { name: 'mrr_generate_clicked', user_id: 'u2', created_at: d(19) },
      { name: 'checkout_started', user_id: 'u1', created_at: d(5) }, { name: 'payment_success', user_id: 'u1', created_at: d(4) },
      { name: 'generate_started', user_id: 'u3', created_at: d(1) }],
    [{ user_id: 'u1', created_at: d(8), quality_mode: 'cinematic_ai' }, { user_id: 'u2', created_at: d(18), quality_mode: 'ads_v2' }], j)
  checa('B1d primeiro filme: coorte da janela → gerou → filme (anúncio v2 fora) → checkout → pagou', () =>
    pf.cadastros === 2 && pf.gerou === 2 && pf.primeiroFilme === 1 && pf.checkout === 1 && pf.pagou === 1)
  checa('B1e variação e taxa', () => P.variacao(5, 3) === '+2' && P.variacao(3, 5) === '−2' && P.variacao(4, 4) === '=' && P.taxa(1, 4) === '25%' && P.taxa(1, 0) === '—')

  // ── B2. o cartão e a página ────────────────────────────────────────────────
  checa('B2a cartão: tudo via readAll, sem .limit()/.range(), internas pela régua da casa, .in() em lotes de 150', () =>
    (S.cartao.match(/readAll</g) || []).length >= 4 && !/\.limit\(|\.range\(/.test(S.cartao) && /isInternalEmail\(p\.email\)/.test(S.cartao) && /i \+= 150/.test(S.cartao))
  checa('B2b cartão nunca derruba o /admin (try/catch com aviso)', () => /Painel indisponível agora/.test(S.cartao) && /catch \(e\)/.test(S.cartao))
  checa('B2c página: o cartão só aparece depois do portão de admin', () => {
    const g = S.pagina.indexOf('if (!user || !isAdminEmail(email))'), c = S.pagina.indexOf('<FunilDoDia3110 />')
    return g > 0 && c > g
  })
  return { ok, falhas }
}

const REAL = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, rd(p)]))
const real = await provar(REAL)
console.log(`test-ep2-painel-3110: ${real.ok} ok · ${real.falhas.length} falhas`)
for (const f of real.falhas) console.log('  FAIL ' + f)

// ── MUTANTES ────────────────────────────────────────────────────────────────
const MUTANTES = [
  ['janela começa em 12 h', 'carta', 'export const EPISODE2_MIN_H = 20', 'export const EPISODE2_MIN_H = 12'],
  ['aceita segundo filme', 'carta', "if (i.completedFilms !== 1)", "if (i.completedFilms > 5)"],
  ['interna passa', 'carta', "if (i.internal) return { ok: false, reason: 'interna' }", ''],
  ['carta irmã ignorada', 'carta', "if (i.sisterLetter) return { ok: false, reason: 'recebeu_carta_irma' }", ''],
  ['saldo ilegível promete filme', 'carta', 'if (i.balance === null || !Number.isFinite(i.balance) || i.balance < i.cost)', 'if (i.balance !== null && i.balance < i.cost)'],
  ['season antes do episódio escrito', 'carta', "  const wTitle = limpar(input.written?.title, 120)\n", "  const wTitle = ''\n"],
  ['HTML sem escape', 'carta', "return s.replace(/&/g, '&amp;')", "return s; s.replace(/&/g, '&amp;')"],
  ['miniatura aceita http', 'carta', "/^https:\\/\\/[^\\s\"'<>]+$/", "/^https?:\\/\\/[^\\s\"'<>]+$/"],
  ['carta sem ideia diz already written', 'carta', "'Episode 2 picks up the same subject with a new hook and new facts.'", "'Episode 2 is already written.'"],
  ['vercel sem confirm', 'vercel', '"/api/cron/send-episode2?confirm=SEND"', '"/api/cron/send-episode2"'],
  ['rota envia sem confirm', 'rota', "const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'", "const confirm = true"],
  ['rota sem supressão', 'rota', 'const sup = await loadLifecycleSuppression(admin, candidatos.map((c) => c.id))', 'const sup = { isSuppressed: () => false, suppressedCount: 0, degraded: false }'],
  ['carimbo antes do envio', 'rota', "      if (!res.ok) throw new Error(`resend ${res.status}`)\n", ''],
  ['rota com .limit', 'rota', "      .in('name', [EPISODIO_ESCRITO_EVENT, TEMPORADA_EVENT])", "      .in('name', [EPISODIO_ESCRITO_EVENT, TEMPORADA_EVENT]).limit(1000)"],
  ['supressão da casa não vê o carimbo', 'eventos', "  'episode2_email_sent',\n", ''],
  ['season_letter não exclui', 'temporada', "  'episode2_email_sent', // KINEO-EP2-PAINEL-3110", "  'outro', // KINEO-EP2-PAINEL-3110"],
  ['funil conta interna', 'funil', 'if (e.user_id && !externos.has(e.user_id)) continue', ''],
  ['funil conta eventos, não pessoas', 'funil', 'if (dentro(e.created_at, atual)) a.add(quem)', 'if (dentro(e.created_at, atual)) a.add(quem + Math.random())'],
  ['primeiro filme conta anúncio v2', 'funil', "v.quality_mode === 'ads_v2' || ", ''],
  ['degrau do plano some', 'funil', "degraus: ['plan_finder_opened', 'plan_finder_recommended']", "degraus: ['plan_finder_opened']"],
  ['cartão com página única', 'cartao', ".in('name', NOMES_DO_PAINEL).gte('created_at', desde)", ".in('name', NOMES_DO_PAINEL).gte('created_at', desde).limit(1000)"],
  ['cartão antes do portão', 'pagina', "      <FunilDoDia3110 /> {/* KINEO-EP2-PAINEL-3110 */}\n", ''],
]
let vivos = 0
for (const [nome, alvo, de, para] of MUTANTES) {
  if (!REAL[alvo].includes(de)) { console.log(`  MUTANTE INAPLICÁVEL (trecho sumiu): ${nome}`); vivos++; continue }
  const S = { ...REAL, [alvo]: REAL[alvo].replace(de, para) }
  let r
  try { r = await provar(S) } catch { r = { falhas: ['carregou com erro'] } }
  if (r.falhas.length === 0) { console.log(`  MUTANTE VIVO: ${nome}`); vivos++ }
}
console.log(`mutantes: ${MUTANTES.length - vivos}/${MUTANTES.length} mortos`)
try { rmSync(TMP, { recursive: true, force: true }) } catch { /* temp */ }
process.exit(real.falhas.length || vivos ? 1 : 0)
