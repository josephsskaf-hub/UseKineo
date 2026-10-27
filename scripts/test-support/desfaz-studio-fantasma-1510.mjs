import { semConsertos2710 } from './desfaz-consertos-2710.mjs' // KINEO-CONSERTOS-2710 — as 6 entregas de 27/10 (camada mais nova) saem primeiro
// KINEO-STUDIO-FANTASMA-1510 — DESFAZ, em memória, os 4 consertos da tela do Studio em app/(dashboard)/generate/GenerateClient.tsx
// (filme fantasma do ?autoanalyze, trava de saldo, "failed" falso, download à vista), para os guardiões que conferem esse arquivo
// BYTE A BYTE contra uma base antiga. Módulo auxiliar; não é teste (o nome não começa com test-). Cada bloco tem de aparecer
// EXATAMENTE uma vez (senão lança: conserto pela metade não passa). Outros arquivos voltam intocados. Os blocos saíram do diff -U0
// contra a base (b1a8766f) e foram conferidos: aplicados em ordem, devolvem a base byte a byte.
export const MARCA_STUDIO_FANTASMA_1510 = 'KINEO-STUDIO-FANTASMA-1510'
const GEN = 'app/(dashboard)/generate/GenerateClient.tsx'

// [como estava na base, como ficou]
const BLOCOS = [
 [
  "",
  "import { AUTOANALYZE_SESSION_PREFIX, autoanalyzeSessionKey, jaConsumidoNaAba, enderecoSemAutoanalyze, decidirAutoanalyze, decidirAindaNoForno, filmeDoAvisoChegou, CHECKING_CREDITS_COPY, CREDITS_READ_FAILED_COPY, STILL_RENDERING_COPY, STILL_RENDERING_POLL_MAX_MS, STILL_RENDERING_POLL_EVERY_MS } from '@/lib/growth/studioFantasma' // KINEO-STUDIO-FANTASMA-1510\n"
 ],
 [
  "  // KINEO-PAREDE-NO-CLIQUE-2026-09-27 — o auto-analyze espera o saldo chegar (até 1,5 s) antes de decidir se abre a parede.\n",
  "  // KINEO-PAREDE-NO-CLIQUE-2026-09-27 — o auto-analyze espera o saldo chegar antes de decidir se abre a parede (KINEO-STUDIO-FANTASMA-1510: sem o teto de 1,5 s).\n"
 ],
 [
  "  const autoWaitScheduledRef = useRef(false)\n",
  "  // KINEO-STUDIO-FANTASMA-1510 (2) — o \"espera 1,5 s e segue sem a guarda\" morreu (Tab 15/10: 1 cr, filme a 9, roteiro escrito\n  // KINEO-STUDIO-FANTASMA-1510 (2) — mesmo assim). Sem saldo lido, nada começa: a tela diz que está conferindo ou pede para tentar de novo.\n  const [autoanalyzeSaldo, setAutoanalyzeSaldo] = useState<'checando_saldo' | 'saldo_falhou' | null>(null) // KINEO-STUDIO-FANTASMA-1510\n  const autoanalyzeSaldoFalhouLoggedRef = useRef(false) // KINEO-STUDIO-FANTASMA-1510\n  // KINEO-STUDIO-FANTASMA-1510 (3) — erro do NAVEGADOR com o filme ainda no forno do servidor: aviso honesto em vez de \"falhou\".\n  const [aindaNoForno, setAindaNoForno] = useState<{ desde: number; motivo: string } | null>(null) // KINEO-STUDIO-FANTASMA-1510\n  const renderJobAbertoRef = useRef<string | null>(null) // KINEO-STUDIO-FANTASMA-1510 — attempt_id do Kineo 1 que o servidor gravou (render_job_opened ok)\n  const geracaoInicioRef = useRef<number | null>(null) // KINEO-STUDIO-FANTASMA-1510 — relógio do clique que despachou: filme \"completed\" mais novo que isto é DESTE pedido\n"
 ],
 [
  "",
  "  // KINEO-STUDIO-FANTASMA-1510 (3) — enquanto o aviso \"Still rendering\" está na tela: pergunta ao servidor a cada 15 s até o filme\n  // KINEO-STUDIO-FANTASMA-1510 (3) — DESTE pedido aparecer (aí o cartão \"Your video is ready\" de sempre assume) ou 25 min passarem\n  // KINEO-STUDIO-FANTASMA-1510 (3) — (aí o aviso manda para a Biblioteca). Qualquer outra fase (novo pedido) apaga o aviso.\n  const [aindaNoFornoTick, setAindaNoFornoTick] = useState(0) // KINEO-STUDIO-FANTASMA-1510\n  useEffect(() => {\n    if (!aindaNoForno) return\n    if (phase !== 'idle') { setAindaNoForno(null); return }\n    if (Date.now() - aindaNoForno.desde > STILL_RENDERING_POLL_MAX_MS) return\n    let parado = false\n    const id = setInterval(() => {\n      setAindaNoFornoTick(Date.now())\n      if (Date.now() - aindaNoForno.desde > STILL_RENDERING_POLL_MAX_MS) { clearInterval(id); return }\n      void refreshServerActiveRender().then((probe) => {\n        if (parado || !probe) return\n        if (filmeDoAvisoChegou(probe.state === 'completed' ? { state: 'completed', completedAtMs: probe.completedAtMs } : { state: 'rendering' }, aindaNoForno.desde)) {\n          void trackEvent('generation_still_rendering_resolved', { verdict: aindaNoForno.motivo, waited_ms: Math.max(0, Date.now() - aindaNoForno.desde) })\n          setAindaNoForno(null)\n        }\n      })\n    }, STILL_RENDERING_POLL_EVERY_MS)\n    return () => { parado = true; clearInterval(id) }\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [aindaNoForno, phase])\n\n"
 ],
 [
  "",
  "        // KINEO-STUDIO-FANTASMA-1510 (1) — a recarga religou um render: este texto já virou filme nesta aba. Só a marca da aba\n        // KINEO-STUDIO-FANTASMA-1510 (1) — (a URL não é tocada aqui: mexer nos parâmetros no meio da retomada reexecutaria este efeito).\n        if (urlPrompt) { try { sessionStorage.setItem(autoanalyzeSessionKey(urlPrompt), String(Date.now())) } catch { /* storage bloqueado: a chave da montagem segura */ } }\n"
 ],
 [
  "",
  "        if (await aindaNoFornoAntesDeFalhar('clips_ready', 'compose_threw', err, null)) return // KINEO-STUDIO-FANTASMA-1510 (3)\n"
 ],
 [
  "",
  "  // ═══ KINEO-STUDIO-FANTASMA-1510 (3) — a tela só diz \"falhou\" depois de perguntar ao servidor ═══════════════════════════\n  // bu.app (23/09, Kineo 1 60 s): o fetch do NAVEGADOR caiu (TypeError após 53–83 s em 'generating'), a tela disse \"Video\n  // generation failed. Please try again.\" 2×, e os 2 filmes chegaram 11 min depois (o servidor seguiu: stranded/orphan). Agora,\n  // nos catch de erro do navegador (fast_threw, cinematic_threw, compose_threw), antes de declarar falha: /api/compose/active\n  // (render vivo ou filme mais novo que o clique) e, no Kineo 1, o pedido que o servidor gravou (render_job_opened ok = o cron\n  // termina). Em voo → aviso \"Still rendering…\" na tela de criar, sem generation_stage_error (que a sonda leria como morte).\n  // Nada no servidor muda: só a pergunta que a tela faz antes de falar. Regra em lib/growth/studioFantasma.ts.\n  async function aindaNoFornoAntesDeFalhar(etapa: 'generating' | 'clips_ready', motivo: string, err: unknown, elapsedMs: number | null): Promise<boolean> {\n    const attemptId = generationAttemptRef.current\n    const inicioMs = geracaoInicioRef.current ?? Date.now()\n    const probe = await refreshServerActiveRender()\n    const decisao = decidirAindaNoForno({\n      probe: probe ? (probe.state === 'rendering' ? { state: 'rendering' } : { state: 'completed', completedAtMs: probe.completedAtMs }) : null,\n      inicioMs,\n      pedidoKineo1Aberto: (mode === 'fast' || mode === 'creator') && attemptId !== null && renderJobAbertoRef.current === attemptId,\n    })\n    if (!decisao.emVoo) return false\n    setError(null)\n    setAindaNoForno({ desde: inicioMs, motivo: decisao.motivo })\n    setPhase('idle')\n    void trackEvent('generation_still_rendering_shown', {\n      attempt_id: attemptId,\n      stage: etapa,\n      client_reason: motivo,\n      verdict: decisao.motivo,\n      detail: err instanceof Error ? err.name : 'unknown',\n      message: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),\n      elapsed_ms: typeof elapsedMs === 'number' ? Math.round(elapsedMs) : null,\n      mode,\n    })\n    return true\n  }\n\n"
 ],
 [
  "    // (outOfCredits, a mesma do botão) roda AQUI, antes do roteiro. Enquanto o saldo não chegou (credits === null)\n    // espera até 1,5 s e tenta de novo; passado isso segue como sempre (nunca deixa a pessoa sem análise).\n    if (credits === null) {\n      if (!autoWaitScheduledRef.current) {\n        autoWaitScheduledRef.current = true\n        setTimeout(() => setAutoWaitTick((t) => t + 1), 1500)\n        return\n",
  "    // (outOfCredits, a mesma do botão) roda AQUI, antes do roteiro.\n    // KINEO-STUDIO-FANTASMA-1510 (1+2) — a ordem agora: (a) o MESMO texto já consumido nesta aba (recarga, voltar, remontagem)\n    // KINEO-STUDIO-FANTASMA-1510 (1+2) — não analisa de novo e o gatilho sai da URL; (b) sem saldo lido nada começa — \"Checking\n    // KINEO-STUDIO-FANTASMA-1510 (1+2) — your credits…\" enquanto carrega, \"tente de novo\" se a leitura falhou (antes: 1,5 s e seguia\n    // KINEO-STUDIO-FANTASMA-1510 (1+2) — SEM a guarda); (c) saldo lido → a guarda de sempre. Regras em lib/growth/studioFantasma.ts.\n    let consumidoNaSessao = false // KINEO-STUDIO-FANTASMA-1510\n    try { consumidoNaSessao = jaConsumidoNaAba({ marcaRaw: sessionStorage.getItem(autoanalyzeSessionKey(key)), studioGoRaw: sessionStorage.getItem('kineo:studio:go:v1'), agoraMs: Date.now() }) } catch { /* storage bloqueado: vale a chave da montagem */ } // KINEO-STUDIO-FANTASMA-1510\n    const passoAuto = decidirAutoanalyze({ auto, prompt: sp, chaveDaMontagem: autoAnalyzeKeyRef.current, consumidoNaSessao, credits, creditsLoading }) // KINEO-STUDIO-FANTASMA-1510\n    if (passoAuto === 'ja_consumido') { // KINEO-STUDIO-FANTASMA-1510\n      consumirAutoanalyze(key, false)\n      setAutoanalyzeSaldo(null)\n      void trackEvent('autoanalyze_replay_blocked', { reason: 'same_text_this_tab', prompt_length: key.length })\n      return\n    } // KINEO-STUDIO-FANTASMA-1510\n    if (passoAuto === 'checando_saldo') { setAutoanalyzeSaldo('checando_saldo'); return } // KINEO-STUDIO-FANTASMA-1510\n    if (passoAuto === 'saldo_falhou') { // KINEO-STUDIO-FANTASMA-1510\n      setAutoanalyzeSaldo('saldo_falhou')\n      if (!autoanalyzeSaldoFalhouLoggedRef.current) {\n        autoanalyzeSaldoFalhouLoggedRef.current = true\n        void trackEvent('autoanalyze_credits_unread', { surface: 'studio_create_autoanalyze', mode, engine: aiEngine, duration })\n"
 ],
 [
  "    } else if (outOfCredits()) {\n",
  "      return\n    } // KINEO-STUDIO-FANTASMA-1510\n    setAutoanalyzeSaldo(null) // KINEO-STUDIO-FANTASMA-1510\n    if (credits !== null && outOfCredits()) { // KINEO-STUDIO-FANTASMA-1510: credits !== null já é garantido acima; repetido para o tipo\n"
 ],
 [
  "      autoAnalyzeKeyRef.current = key\n",
  "      consumirAutoanalyze(key) // KINEO-STUDIO-FANTASMA-1510 (era: autoAnalyzeKeyRef.current = key) — consumido UMA vez: chave, marca da aba e URL\n"
 ],
 [
  "    autoAnalyzeKeyRef.current = key\n    if (process.env.NODE_ENV === 'development') console.log(`[ux1] autoanalyze-effect -> handleAnalyze() key=\"${key.slice(0,40)}\" phase=${phase} @${Date.now()}`)\n",
  "    consumirAutoanalyze(key) // KINEO-STUDIO-FANTASMA-1510 (era: autoAnalyzeKeyRef.current = key) — consumido UMA vez: chave, marca da aba e URL\n    if (process.env.NODE_ENV === 'development') console.log(`[ux1] autoanalyze-effect -> handleAnalyze() key=\"${key.slice(0,40)}\" phase=${phase} @${Date.now()}`)\n"
 ],
 [
  "  }, [searchParams, activeRenderRestoreResolved, credits, autoWaitTick])\n",
  "  }, [searchParams, activeRenderRestoreResolved, credits, autoWaitTick, creditsLoading]) // KINEO-STUDIO-FANTASMA-1510: + creditsLoading (a leitura do saldo terminou)\n\n  // KINEO-STUDIO-FANTASMA-1510 (1) — consome o ?autoanalyze=1 UMA vez: a chave da montagem, a marca da aba (sessionStorage, só\n  // KINEO-STUDIO-FANTASMA-1510 (1) — hash do texto) e o gatilho FORA da URL na hora (recarregar/voltar não reanalisa mais). O\n  // KINEO-STUDIO-FANTASMA-1510 (1) — replaceState vai SEM o estado do Next (null) de propósito: assim o roteador adota a URL nova\n  // KINEO-STUDIO-FANTASMA-1510 (1) — (useSearchParams) e não a regrava com o gatilho no próximo render. prompt/engine/duration/studio ficam.\n  function consumirAutoanalyze(key: string, marcar = true) {\n    autoAnalyzeKeyRef.current = key\n    if (marcar) { try { sessionStorage.setItem(autoanalyzeSessionKey(key), String(Date.now())) } catch { /* storage bloqueado: vale a chave da montagem */ } }\n    try {\n      const semGatilho = enderecoSemAutoanalyze(window.location.href)\n      if (semGatilho !== null) window.history.replaceState(null, '', semGatilho)\n    } catch { /* history bloqueado: a chave e a marca seguram */ }\n  }\n\n  // KINEO-STUDIO-FANTASMA-1510 (1) — os dois cliques que reabrem o auto-start na MESMA aba (série e ideia da fila) apagam as marcas.\n  function limparMarcasAutoanalyze() {\n    try {\n      const chaves: string[] = []\n      for (let i = 0; i < sessionStorage.length; i += 1) {\n        const k = sessionStorage.key(i)\n        if (k && k.startsWith(AUTOANALYZE_SESSION_PREFIX + ':')) chaves.push(k)\n      }\n      for (const k of chaves) sessionStorage.removeItem(k)\n    } catch { /* storage bloqueado: nada foi marcado */ }\n  }\n\n  // KINEO-STUDIO-FANTASMA-1510 (2) — \"Try again\" do aviso de saldo: relê /api/credits (o mesmo evento que a barra lateral escuta).\n  function tentarLerSaldoDeNovo() {\n    setAutoanalyzeSaldo('checando_saldo')\n    autoanalyzeSaldoFalhouLoggedRef.current = false\n    void trackEvent('autoanalyze_credits_retry_clicked', { surface: 'studio_create_autoanalyze' })\n    try { window.dispatchEvent(new Event('creditsChanged')) } catch { /* ignore */ }\n  }\n"
 ],
 [
  "    hasBlockingUi: Boolean(error || showUpgradeModal || activeRenderGateBlocked),\n",
  "    hasBlockingUi: Boolean(error || showUpgradeModal || activeRenderGateBlocked || aindaNoForno), // KINEO-STUDIO-FANTASMA-1510: + aindaNoForno (o aviso \"Still rendering\" segura a tela)\n"
 ],
 [
  "",
  "    geracaoInicioRef.current = Date.now() // KINEO-STUDIO-FANTASMA-1510\n"
 ],
 [
  "",
  "      const pedidoAttemptId = generationAttemptRef.current // KINEO-STUDIO-FANTASMA-1510\n      renderJobAbertoRef.current = null // KINEO-STUDIO-FANTASMA-1510 — pedido novo: só vale o ok DESTE\n"
 ],
 [
  "        }).catch(() => { /* o pedido é rede de segurança; nunca atrapalha o caminho normal */ })\n",
  "        }).then((r) => { if (r.ok) renderJobAbertoRef.current = pedidoAttemptId }) // KINEO-STUDIO-FANTASMA-1510 (3): o servidor tem o pedido → o cron termina o filme\n          .catch(() => { /* o pedido é rede de segurança; nunca atrapalha o caminho normal */ })\n"
 ],
 [
  "",
  "        if (await aindaNoFornoAntesDeFalhar('generating', 'cinematic_threw', err, null)) return // KINEO-STUDIO-FANTASMA-1510 (3)\n"
 ],
 [
  "",
  "        if (await aindaNoFornoAntesDeFalhar('generating', 'fast_threw', err, Date.now() - fastBranchStartedAt)) return // KINEO-STUDIO-FANTASMA-1510 (3)\n"
 ],
 [
  "",
  "    limparMarcasAutoanalyze() // KINEO-STUDIO-FANTASMA-1510 — clique explícito: o próximo episódio pode analisar sozinho\n"
 ],
 [
  "",
  "    limparMarcasAutoanalyze() // KINEO-STUDIO-FANTASMA-1510 — clique explícito: a ideia da fila pode analisar sozinha\n"
 ],
 [
  "",
  "      {/* KINEO-STUDIO-FANTASMA-1510 (3) — o navegador perdeu a resposta mas o servidor ainda tem o filme: aviso honesto, não \"failed\". */}\n      {phase === 'idle' && aindaNoForno && !(serverActiveRender && serverActiveRender.state === 'completed' && serverActiveRender.completedAtMs >= aindaNoForno.desde) && (\n        <div\n          role=\"status\"\n          data-testid=\"still-rendering-notice\"\n          className=\"gv-card rounded-xl px-4 py-4 mb-6 flex items-center justify-between gap-3 flex-wrap\"\n          style={{ background: 'rgba(41,151,255,.07)', border: '1px solid rgba(41,151,255,.35)' }}\n        >\n          <div>\n            <div className=\"font-bold text-sm\" style={{ color: 'var(--text)' }}>\n              {STILL_RENDERING_COPY}\n            </div>\n            <div className=\"text-xs mt-1\" style={{ color: 'var(--muted2)' }}>\n              {Math.max(aindaNoFornoTick, serverActiveRenderTick) - aindaNoForno.desde > STILL_RENDERING_POLL_MAX_MS\n                ? 'It is taking longer than usual. It will appear in your Library when it finishes — and any credits taken for a video you never receive are returned automatically.'\n                : 'Your connection dropped, not your video. No need to start it again — this page checks on its own and we also email you when it is ready.'}\n            </div>\n          </div>\n          <a\n            href=\"/library\"\n            className=\"font-bold text-sm px-4 py-2 rounded-lg\"\n            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', color: 'var(--text)' }}\n          >\n            Open Library\n          </a>\n        </div>\n      )}\n\n      {/* KINEO-STUDIO-FANTASMA-1510 (2) — o auto-start espera o saldo: nunca escreve roteiro de filme pago às cegas. */}\n      {phase === 'idle' && autoanalyzeSaldo && (\n        <div\n          role=\"status\"\n          data-testid=\"autoanalyze-credits-hold\"\n          className=\"gv-card rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3 flex-wrap\"\n          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)' }}\n        >\n          <div className=\"text-sm\" style={{ color: 'var(--text)' }}>\n            {autoanalyzeSaldo === 'saldo_falhou' ? CREDITS_READ_FAILED_COPY : CHECKING_CREDITS_COPY}\n          </div>\n          {autoanalyzeSaldo === 'saldo_falhou' && (\n            <button\n              type=\"button\"\n              onClick={() => tentarLerSaldoDeNovo()}\n              className=\"font-bold text-sm px-4 py-2 rounded-lg\"\n              style={{ background: '#2997ff', color: '#fff' }}\n            >\n              Try again\n            </button>\n          )}\n        </div>\n      )}\n\n"
 ],
 [
  "",
  "                {/* KINEO-STUDIO-FANTASMA-1510 (4) — download À VISTA, antes do player de 78vh: Tab (15/10) e AgentMail (20/09) não acharam\n                    o botão (ele fica abaixo do player) e foram ao /history baixar. Mesmo arquivo (finalVideoUrl) e mesmo handleDownload\n                    do botão grande lá embaixo (lib/videoDownload, o mesmo do /history); <a href download> com texto, que robô e leitor\n                    de tela entendem. Não é um div: o título (último <p>) continua sendo o último filho do cabeçalho. */}\n                <a\n                  href={finalVideoUrl}\n                  onClick={(e) => { void trackEvent('done_download_top_clicked', { video_id: publicVideoId ?? null, watermarked: currentResultHasWatermark }); void handleDownload(e) }}\n                  download={`${slugifyTitle(analysis?.title) || `kineo-${duration}s`}.mp4`}\n                  target=\"_blank\"\n                  rel=\"noreferrer\"\n                  data-testid=\"done-download-top\"\n                  aria-label=\"Download MP4\"\n                  className=\"inline-flex items-center justify-center gap-1.5 rounded-lg mt-3 py-2 px-4 text-sm font-bold\"\n                  style={{ background: 'var(--accent)', color: 'var(--on-accent)', textDecoration: 'none' }}\n                >\n                  <span aria-hidden=\"true\">⬇</span> Download MP4\n                </a>\n"
 ]
]

/** Tira os consertos do GenerateClient (em memória). Arquivo sem a marca = volta igual (o conserto ainda não está nesta árvore). */
export function desfazStudioFantasma1510(rel, src) {
  src = semConsertos2710(src, rel) // KINEO-CONSERTOS-2710
  if (rel !== GEN || typeof src !== 'string' || !src.includes(MARCA_STUDIO_FANTASMA_1510)) return src
  const crlf = src.includes('\r\n')
  let s = crlf ? src.replace(/\r\n/g, '\n') : src
  for (const [antes, depois] of BLOCOS) {
    const n = s.split(depois).length - 1
    if (n !== 1) throw new Error(`desfaz ${MARCA_STUDIO_FANTASMA_1510}: bloco achado ${n}× — ${depois.slice(0, 60)}`)
    s = s.split(depois).join(antes)
  }
  if (s.includes(MARCA_STUDIO_FANTASMA_1510)) throw new Error(`desfaz ${MARCA_STUDIO_FANTASMA_1510}: sobrou linha marcada`)
  return crlf ? s.replace(/\n/g, '\r\n') : s
}
