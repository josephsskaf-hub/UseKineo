// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DOWNLOAD-TRUTH-2026-08-04 — o maior buraco do funil era CEGO
//
// MEDIDO em 04/08 (contas internas fora): 327 pessoas geraram um vídeo
// `completed`, 67 dispararam `video_downloaded`. **20%.** Entre as 109 que
// chegaram na tela pós-render (`next_shorts_shown`), só 40 baixaram — 36,7%.
// Dito de outro jeito: 260 pessoas fizeram um vídeo e foram embora sem o
// arquivo. Nenhuma delas vira cliente: a compra nasce depois de usar.
//
// O PROBLEMA NÃO ERA O NÚMERO, ERA A CEGUEIRA. As três telas de download
// (done screen, /history, /my-videos) tinham a MESMA implementação e o MESMO
// defeito:
//
//     try { fetch → blob → a.click() ; track('video_downloaded') }
//     catch { window.open(url) }        // ← silêncio absoluto
//
// `video_downloaded` só existia no caminho FELIZ. Todo download que caiu no
// fallback nunca foi contado, e todo CLIQUE que não virou download nunca
// existiu. Com isso os 80% que "não baixam" podiam ser três coisas
// completamente diferentes — e cada uma pede uma correção oposta:
//
//   (a) nunca clicaram          → problema de UI/valor  → CTA sticky (Medida 5)
//   (b) clicaram e o blob falhou→ problema de servidor  → CORS/tamanho/rede
//   (c) clicaram, caiu no       → problema de MOBILE    → o `window.open` roda
//       fallback e foi bloqueado                          DEPOIS de um `await`,
//                                                         fora do gesto do
//                                                         usuário: o Safari/
//                                                         Chrome mobile bloqueia
//                                                         o popup e a pessoa
//                                                         fica com NADA na mão,
//                                                         sem erro na tela.
//
// Construir a Medida 5 (CTA sticky) sem saber se o caso é (a) seria gastar uma
// sprint numa hipótese não testada — se a causa for (c), CTA nenhum resolve.
//
// ESTE MÓDULO FAZ DUAS COISAS, e é a ÚNICA implementação de download do produto
// (as três telas passam a chamar daqui — sem drift futuro):
//
//  1. INSTRUMENTA os três desfechos.
//     · `video_download_clicked` dispara ANTES de qualquer `await` — é o
//       denominador honesto que nunca existiu. Clique é clique mesmo que o
//       arquivo nunca chegue.
//     · `video_download_failed` carrega o motivo do blob ter falhado.
//     · `video_downloaded` ganha `method` (blob | popup | navigate) e `device`.
//       Os campos ANTIGOS (`export_type`, `video_id`, `filename`) continuam
//       exatamente como estavam — /api/admin/funnel, /api/admin/metrics,
//       send-comeback50 e o cron send-video-ready leem esse evento e NÃO podem
//       quebrar. Esta mudança é puramente aditiva no payload.
//
//  2. TORNA O FALLBACK VISÍVEL — sem inventar entrega.
//
//     ⚠️ DECISÃO DELIBERADA, e ela contraria o rascunho desta mesma sprint. A
//     primeira versão adicionava um 3º degrau (`location.href`) "que nenhum
//     navegador bloqueia". Duas razões mataram esse degrau na revisão:
//
//       · `location.href` NAVEGA A MESMA ABA. Se a URL do Supabase não vier com
//         `Content-Disposition: attachment`, o usuário é jogado num player de
//         vídeo e PERDE o app — na done screen isso destrói justamente o upsell
//         de marca d'água e o `VideoRatingAsk` que rodam depois. O fallback
//         antigo (`_blank`) ao menos preservava a página.
//       · Emitir `video_downloaded` ali seria FALSO POSITIVO: navegar para uma
//         URL não prova entrega nenhuma. E `video_downloaded` é lido por
//         `send-comeback50` e pelo cron `send-video-ready` para decidir quem
//         NÃO precisa de e-mail — inflar esse evento faria a empresa parar de
//         resgatar exatamente quem falhou.
//
//     A tese desta sprint é "medir antes de corrigir". Aplicá-la a si mesma
//     significa: o comportamento de entrega fica IDÊNTICO ao que já estava em
//     produção (blob → `window.open`), e o que muda é só a visibilidade. Se
//     `video_download_popup_blocked` aparecer com volume, a correção certa não
//     é sequestrar a aba — é mostrar na tela um link que o usuário toca (gesto
//     real do usuário nunca é bloqueado). Isso é UI, e vira trabalho de sprint
//     com o número na mão, não palpite às 21h.
//
//     Consequência importante: `video_downloaded` continua sendo emitido
//     SOMENTE quando temos os bytes na mão (degrau do blob) — semântica
//     inalterada, nenhum consumidor histórico muda de leitura.
//
//  3. NÃO CASCATEIA QUANDO NÃO ADIANTA. Se o `fetch` devolveu um STATUS HTTP
//     (403/404/410...), o CORS deixou passar e o servidor disse que o arquivo
//     não está lá — abrir a mesma URL numa aba nova só entrega uma página de
//     erro. Cascata só faz sentido no erro sem status (rede/CORS), onde a
//     navegação direta ainda pode funcionar.
//
// REGRA: telemetria nunca pode quebrar o download. Todo `track` é
// fire-and-forget e todo caminho está dentro de try/catch.
// ═══════════════════════════════════════════════════════════════════════════

import { trackEvent } from '@/lib/analytics'
import { anunciarVideoEntregue } from '@/lib/postVideoSignal'

export type DownloadSurface = 'done_screen' | 'history' | 'my_videos'

/**
 * Desfecho do download. Só `blob` conta como `video_downloaded` — é o único em
 * que os bytes passaram pela nossa mão.
 *   blob            → salvo com nome legível (ideal)
 *   fallback_opened → abriu numa aba nova; o usuário tem o arquivo na tela
 *   popup_blocked   → o navegador barrou; a pessoa ficou SEM NADA
 *   unavailable     → o servidor negou o arquivo (status HTTP definitivo)
 */
export type DownloadOutcome =
  | 'blob'
  | 'fallback_opened'
  | 'popup_blocked'
  | 'unavailable'
  /**
   * O MESMO arquivo já estava baixando quando o usuário tocou de novo. Nenhum
   * `fetch` novo foi aberto: o toque virou o painel de resgate. Não é entrega
   * (o call site não pode contar como `delivered`) e não é falha — é o segundo
   * toque deixando de ser dano. Ver KINEO-DOWNLOAD-SIMULTANEOUS-DEATH-2026-08-16.
   */
  | 'coalesced'

export interface DownloadVideoOptions {
  url: string
  /** Nome final do arquivo, já com .mp4. */
  filename: string
  /** 'watermarked' | 'clean' | 'current_asset' — NÃO renomear: o funil lê isto. */
  exportType: string
  /** Tela que originou o clique. */
  surface: DownloadSurface
  videoId?: string | null
  /** Metadados extras específicos da tela (opcional). */
  extra?: Record<string, unknown>
  /**
   * Bytes já baixados, entregues ao caller sem uma segunda transferência.
   * É best-effort: exceção do callback nunca pode quebrar o download.
   */
  onBlobReady?: (blob: Blob) => void
}

/**
 * 'mobile' | 'desktop'. Serve para separar a hipótese (c) das demais já na
 * primeira leitura, sem precisar de um segundo deploy para descobrir isso.
 */
function deviceClass(): 'mobile' | 'desktop' | 'unknown' {
  try {
    if (typeof navigator === 'undefined') return 'unknown'
    const ua = navigator.userAgent || ''
    if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua)) return 'mobile'
    // iPadOS 13+ se apresenta como Mac; o toque desempata.
    if (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document) {
      return 'mobile'
    }
    return 'desktop'
  } catch {
    return 'unknown'
  }
}

function fire(name: string, metadata: Record<string, unknown>): void {
  // fire-and-forget: telemetria NUNCA segura nem quebra o download.
  try {
    void trackEvent(name, metadata)
  } catch {
    /* silencioso de propósito */
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DOWNLOAD-MOBILE-RESCUE-2026-08-07 — o fallback nunca salvou ninguém
//
// MEDIDO no banco de produção, todos os eventos desde 05/08 (quando a
// instrumentação acima nasceu):
//
//   desktop → 19 cliques · 19 `video_downloaded` · 7 pessoas · 1,8s médios
//             ZERO falhas.
//   mobile  → 49 cliques · 15 pessoas · 31 `video_downloaded` (12,1s médios)
//             10 `video_download_failed` (5 pessoas, 69,4s médios)
//             10 `video_download_popup_blocked` (5 pessoas)
//   `video_download_fallback_opened` → **0 eventos na história.**
//
// Os dois "10" são o mesmo 10: TODA falha de blob terminou em popup barrado.
// O degrau 2 deste arquivo — o `window.open` — tem 0 de 10 de aproveitamento
// desde que existe. Não é um fallback degradado; é um fallback que nunca
// funcionou uma única vez, porque roda depois de um `await` de 69 segundos e
// todo navegador mobile barra popup fora do gesto do usuário.
//
// Quem cai ali fica com NADA: sem arquivo, sem aba, sem erro na tela. São 5 de
// 15 pessoas que tentaram baixar no celular — 33% — e duas são de hoje:
// `b61881d5` (trial, 2 popups barrados às 21:05 e 21:07) e `e934461f`, o único
// cadastro do dia que chegou a clicar em COMPRAR.
//
// O bloco de comentário no topo deste arquivo prescreveu a correção com o
// número na mão: "a correção certa não é sequestrar a aba — é mostrar na tela
// um link que o usuário toca (gesto real do usuário nunca é bloqueado)".
// É exatamente isto, três dias depois, com o número que faltava.
//
// TRÊS DECISÕES QUE LIMITAM O RAIO DA MUDANÇA:
//
//  1. O DESKTOP NÃO MUDA. São 19/19 hoje. O gatilho proativo é
//     `device === 'mobile'` e só; no desktop o painel aparece apenas se o
//     download REALMENTE falhar — caminho que hoje termina em nada.
//
//  2. O BLOB CONTINUA SENDO O DEGRAU 1 NO MOBILE. Ele entrega 31 de 41
//     tentativas e é o único que salva com nome legível. Trocá-lo por
//     navegação direta consertaria 10 casos e arriscaria 31 — entre um número
//     medido e uma hipótese, manda o medido. O que muda é a espera: aos 20s
//     (sucesso mobile = 12,1s; falha = 69,4s) o link aparece POR CIMA do blob,
//     que continua correndo, e some sozinho se os bytes chegarem.
//
//  3. `video_downloaded` NÃO MUDA DE SEMÂNTICA. Continua saindo só no degrau
//     do blob, com os bytes na mão. `send-comeback50` e o cron
//     `send-video-ready` leem esse evento para decidir quem NÃO precisa de
//     e-mail de resgate: inflá-lo faria a empresa parar de procurar
//     exatamente quem falhou. O toque no link manual tem evento próprio.
//
// POR QUE O LINK MANUAL ENTREGA E O `window.open` NÃO:
//   · é tocado pelo usuário — gesto real, nenhum navegador barra;
//   · 251 dos 259 vídeos dos últimos 10 dias moram em
//     `cqqukkvjjrguayiyjvhh.supabase.co`, e o Storage do Supabase aceita
//     `?download=<nome>`, que responde `Content-Disposition: attachment`.
//     Sem isso o iOS abre um player e a pessoa continua sem arquivo. O
//     parâmetro só entra em host `*.supabase.co` (os 8 vídeos no Backblaze
//     recebem a URL intocada).
//
// SEGURANÇA: `filename` vem do TÍTULO QUE O USUÁRIO DIGITOU (`slugifyTitle`).
// Todo texto entra por `textContent` e todo atributo por `setAttribute` —
// `innerHTML` não aparece uma vez neste arquivo. E o href passa por
// `safeDownloadHref`, que recusa qualquer coisa fora de http/https.
// ═══════════════════════════════════════════════════════════════════════════

const MANUAL_LINK_ID = 'kineo-manual-download'
/** Sucesso médio no mobile = 12,1s; falha média = 69,4s. 20s separa os dois. */
const MANUAL_LINK_AFTER_MS = 20_000
/** Painel órfão não pode morar para sempre em cima do app. */
const MANUAL_LINK_AUTO_HIDE_MS = 180_000

/**
 * O painel é um NÓ ÚNICO no DOM, mas `downloadVideoFile` pode estar rodando
 * duas vezes ao mesmo tempo: `handleDownload` da done screen não tem guarda de
 * in-flight e está ligado a dois botões — duplo-toque impaciente é o
 * comportamento ESPERADO de quem está esperando 69 segundos. Sem dono, a
 * conclusão do download A apagaria o painel de resgate do download B, e o
 * timer de A pintaria o painel do vídeo ERRADO depois que o usuário já mudou
 * de tela. Cada invocação leva um token; o nó carrega o token de quem o criou
 * e só o dono (ou uma limpeza explícita sem token) pode removê-lo.
 */
let manualLinkToken = 0

function hideManualDownloadLink(token?: number): void {
  try {
    if (typeof document === 'undefined') return
    const node = document.getElementById(MANUAL_LINK_ID)
    if (!node) return
    if (token !== undefined && node.dataset.token !== String(token)) return
    const hideTimer = node.dataset.hideTimer
    if (hideTimer) clearTimeout(Number(hideTimer))
    const routeTimer = node.dataset.routeTimer
    if (routeTimer) clearInterval(Number(routeTimer))
    node.remove()
  } catch {
    /* ignore */
  }
}

/**
 * href seguro.
 *  · SEM `base`: uma URL relativa ou lixo (`'not a url'`) resolveria contra a
 *    origem do app e viraria um link que promete o vídeo e entrega um 404.
 *    `video_url` é sempre absoluta — se não for, não há link a oferecer.
 *  · `javascript:`, `data:`, `blob:` e afins morrem na checagem de protocolo.
 *  · `?download=` só no Storage do Supabase, onde é documentado e vira
 *    `Content-Disposition: attachment`. As URLs são PÚBLICAS (`getPublicUrl`),
 *    não assinadas: não existe token de assinatura para invalidar. Anexado por
 *    texto, para não re-serializar uma query que um dia pode ter assinatura.
 */
function safeDownloadHref(url: string, filename: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (/(^|\.)supabase\.co$/i.test(u.hostname) && !u.searchParams.has('download')) {
      const param = 'download=' + encodeURIComponent(filename)
      u.search = u.search ? `${u.search}&${param}` : `?${param}`
    }
    return u.toString()
  } catch {
    return null
  }
}

function isSupabaseHost(url: string): boolean {
  try {
    return /(^|\.)supabase\.co$/i.test(new URL(url).hostname)
  } catch {
    return false
  }
}

type ManualLinkTrigger = 'slow' | 'blob_failed' | 'popup_blocked' | 'unavailable' | 'retry'

function manualLinkTitle(trigger: ManualLinkTrigger): string {
  // 'retry' = o usuário tocou de novo enquanto o primeiro download ainda corre.
  // A frase é a MESMA de 'slow' porque o estado do mundo é o mesmo — o que muda
  // é só quem trouxe o painel para a tela (o relógio ou o dedo).
  if (trigger === 'slow' || trigger === 'retry') return 'Still downloading…'
  if (trigger === 'unavailable') return 'This file is no longer available.'
  return 'Your download didn’t start.'
}

/**
 * Mostra (ou ATUALIZA) o painel. Devolve `true` só quando existe painel na
 * tela — o chamador grava esse booleano na telemetria, e ele não pode afirmar
 * uma impressão que não aconteceu (`document.body` ausente, href recusado,
 * exceção engolida).
 *
 * `trigger === 'unavailable'` monta o painel SEM LINK: o servidor devolveu um
 * status HTTP, então a mesma URL entregaria a mesma página de erro. Mas sumir
 * calado depois de 49s de "Still downloading…" seria recriar, para as falhas
 * com status, exatamente o silêncio que esta mudança existe para matar.
 */
function showManualDownloadLink(
  url: string,
  filename: string,
  trigger: ManualLinkTrigger,
  base: Record<string, unknown>,
  token: number,
): boolean {
  try {
    if (typeof document === 'undefined' || !document.body) return false

    const href = trigger === 'unavailable' ? null : safeDownloadHref(url, filename)
    if (trigger !== 'unavailable' && !href) return false

    // Reaproveita o nó do MESMO download em vez de recriá-lo: a transição
    // 'slow' → 'blob_failed' acontece aos ~69s, e se o dedo do usuário estiver
    // no link nesse instante, remover o alvo do toque perderia o toque.
    const existing = document.getElementById(MANUAL_LINK_ID)
    if (existing && existing.dataset.token === String(token)) {
      // ⚠️ SÓ reaproveita se a ESTRUTURA não muda — isto é, se o painel
      // continua com link ou continua sem. 'slow' → 'unavailable' troca o
      // título para "This file is no longer available" mas deixaria na tela o
      // botão "Tap here to save your video" apontando para a URL que o
      // servidor acabou de negar: o painel se contradiria e o toque entregaria
      // a página de erro. Estrutura diferente cai fora e o nó é refeito.
      if (!!existing.querySelector('a') === !!href) {
        const t = existing.querySelector('[data-role="title"]')
        if (t) t.textContent = manualLinkTitle(trigger)
        const from = existing.dataset.trigger
        existing.dataset.trigger = trigger
        // O `shown` já foi contado com o gatilho de NASCIMENTO (no mobile,
        // quase sempre 'slow', porque 20s < 69s). Sem esta linha, um funil que
        // cruzasse shown→clicked por `trigger` leria conversão infinita em
        // 'blob_failed' e zero em 'slow'.
        if (from && from !== trigger) {
          fire('video_download_manual_link_escalated', { ...base, from, to: trigger })
        }
        return true
      }
    }

    hideManualDownloadLink()

    const box = document.createElement('div')
    box.id = MANUAL_LINK_ID
    box.dataset.token = String(token)
    box.dataset.trigger = trigger
    box.setAttribute('role', 'status')
    box.style.cssText = [
      'position:fixed',
      'left:12px',
      'right:12px',
      // Acima da MobileNav e da StickyUpgradeBar, NUNCA por cima delas: o
      // painel de resgate não pode enterrar o CTA de compra por 3 minutos.
      // A 1a declaracao e o fallback de quem nao entende env().
      'bottom:150px',
      'bottom:calc(150px + env(safe-area-inset-bottom))',
      'margin:0 auto',
      'max-width:420px',
      // MEDIDO no repo, tudo montado em app/(dashboard)/layout.tsx e portanto
      // presente nas 3 telas de download: MobileNav 50 · StickyUpgradeBar 50 ·
      // EnablePushBanner 69 · InstallAppBanner 70 · TrialDowngradeModal 999 ·
      // UpgradeModal 1000. Um valor "logo acima das barras" enterraria o
      // resgate embaixo do UpgradeModal de marca d'água, que abre NA MESMA
      // TELA do botão de download — invisível E inclicável (o overlay inset:0
      // come o toque), com o auto-hide de 180s correndo por baixo. Um download
      // travado é mais urgente que um upsell. Abaixo do exit-intent (9000) e
      // do SocialProofToast (9999), que são de saída, não de entrega.
      'z-index:1200',
      'background:#111827',
      'color:#f9fafb',
      'border:1px solid #374151',
      'border-radius:14px',
      'padding:14px',
      'font-size:14px',
      'line-height:1.45',
      'box-shadow:0 10px 30px rgba(0,0,0,.45)',
    ].join(';')

    const title = document.createElement('div')
    title.setAttribute('data-role', 'title')
    title.textContent = manualLinkTitle(trigger)
    title.style.cssText = 'font-weight:700;margin-bottom:8px;padding-right:44px'
    box.appendChild(title)

    if (href) {
      const link = document.createElement('a')
      link.setAttribute('href', href)
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
      link.setAttribute('download', filename)
      // `download` é inerte cross-origin. No Supabase o `?download=` força o
      // attachment e o arquivo SALVA; fora dele o navegador vai abrir um
      // player, e o botão não pode prometer o que não entrega.
      link.textContent = isSupabaseHost(url)
        ? 'Tap here to save your video'
        : 'Tap here to open your video'
      link.style.cssText = [
        'display:block',
        'text-align:center',
        'background:#f9fafb',
        'color:#111827',
        'font-weight:700',
        'text-decoration:none',
        'border-radius:10px',
        'padding:12px 14px',
      ].join(';')
      link.addEventListener('click', () => {
        fire('video_download_manual_link_clicked', {
          ...base,
          trigger: box.dataset.trigger ?? trigger,
        })
        // O painel não pode continuar dizendo "didn't start" por cima de um
        // download que acabou de começar.
        const t = box.querySelector('[data-role="title"]')
        if (t) t.textContent = 'Opening your video…'
        setTimeout(() => hideManualDownloadLink(token), 1500)
      })
      box.appendChild(link)
    }

    const hint = document.createElement('div')
    hint.textContent = href
      ? 'Opens in a new tab. If it plays instead of saving, use your browser’s share or save button.'
      : 'Nothing was charged for this. You can regenerate it from My Videos.'
    hint.style.cssText = 'margin-top:8px;font-size:12px;color:#9ca3af'
    box.appendChild(hint)

    const close = document.createElement('button')
    close.setAttribute('type', 'button')
    close.setAttribute('aria-label', 'Dismiss')
    close.textContent = '×'
    // 44x44: é a única forma de dispensar o painel num aparelho de toque.
    close.style.cssText = [
      'position:absolute',
      'top:0',
      'right:0',
      'width:44px',
      'height:44px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:transparent',
      'border:0',
      'color:#9ca3af',
      'font-size:22px',
      'line-height:1',
      'cursor:pointer',
    ].join(';')
    close.addEventListener('click', () => {
      fire('video_download_manual_link_dismissed', {
        ...base,
        trigger: box.dataset.trigger ?? trigger,
      })
      hideManualDownloadLink(token)
    })
    box.appendChild(close)

    document.body.appendChild(box)

    // Nunca fica órfão: nem no tempo, nem depois de trocar de página. O App
    // Router navega por pushState, que NÃO dispara popstate — daí a sondagem
    // do pathname em vez de um listener.
    const hideTimer = setTimeout(() => hideManualDownloadLink(token), MANUAL_LINK_AUTO_HIDE_MS)
    box.dataset.hideTimer = String(hideTimer)
    try {
      const bornPath = window.location.pathname
      const routeTimer = setInterval(() => {
        if (window.location.pathname !== bornPath) hideManualDownloadLink(token)
      }, 1000)
      box.dataset.routeTimer = String(routeTimer)
    } catch {
      /* ignore */
    }

    // A impressão é contada UM TICK DEPOIS, e só se o painel ainda estiver na
    // tela. No caminho `blob_failed` o `window.open` roda logo em seguida, de
    // forma síncrona: se ele conseguir abrir a aba, o painel é removido antes
    // deste callback e a impressão nunca existe. Sem isso, todo fallback bem
    // sucedido cunharia uma impressão falsa de "o resgate foi necessário" —
    // envenenando justamente a métrica que vai decidir se esta caixa fica.
    setTimeout(() => {
      try {
        if (document.getElementById(MANUAL_LINK_ID) === box) {
          fire('video_download_manual_link_shown', { ...base, trigger })
        }
      } catch {
        /* ignore */
      }
    }, 0)

    return true
  } catch {
    /* o painel NUNCA pode derrubar o download */
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-DOWNLOAD-SIMULTANEOUS-DEATH-2026-08-16 — as falhas não expiram, elas
// são MORTAS TODAS JUNTAS. E o segundo toque é quem as multiplica.
//
// MEDIDO em produção, 30 dias, contas internas fora:
//
//   desktop → 81 cliques · 76 `video_downloaded` · **0 falhas** (0 de 81)
//   mobile  → 328 cliques · 178 downloads · **106 falhas** · 105 popups barrados
//   `reason` = "Load failed" e `http_status` = null em **106 de 106**.
//
// 100% das falhas do produto são mobile. Nenhuma tem status HTTP — logo nenhuma
// é o servidor negando o arquivo.
//
// A FORMA DAS FALHAS É O ACHADO, e ela elimina a explicação óbvia. Agrupando as
// falhas de cada pessoa por proximidade no relógio:
//
//   falhas no grupo │ espalhamento do FIM │ espalhamento da DURAÇÃO
//   ────────────────┼─────────────────────┼────────────────────────
//         13        │       1,75 s        │        35,4 s
//         11        │       0,77 s        │        31,8 s
//         10        │       0,40 s        │         7,9 s
//         10        │       0,61 s        │        52,3 s
//          8        │       0,62 s        │       118,8 s
//          5        │       1,27 s        │      **204,7 s**
//
// Ler a última linha devagar: cinco `fetch` que começaram em instantes até
// **205 segundos** diferentes morreram dentro de **1,3 segundo** um do outro.
// Isso não é timeout — timeout independente daria durações IGUAIS e fins
// espalhados, e o que se mede é exatamente o contrário. **Um único evento mata
// todos os fetches em voo ao mesmo tempo.** É a assinatura de um recurso
// compartilhado caindo (aba suspensa em segundo plano, pressão de memória do
// WebKit, troca de rede) — nunca de N falhas independentes.
//
// E O SEGUNDO TOQUE É O QUE ENCHE O VOO. A done screen é a única das três telas
// SEM guarda de in-flight (`/history` e `/my-videos` já têm `downloadingId`), e
// cada toque abria um `fetch` novo do MESMO MP4 de vários MB. Por VÍDEO, no
// mobile:
//
//   1 clique  → 52 vídeos ·  5 com falha  →  **9,6%**
//   2 cliques → 20 vídeos ·  9 com falha  →  **45%**
//   3 cliques →  8 vídeos ·  4 com falha  →  **50%**
//
// ⚠️ O QUE ISTO **NÃO** PROVA, E POR QUE A CORREÇÃO NÃO DEPENDE DISSO. A
// causalidade é ambígua nos dois sentidos: a repetição pode estar causando a
// morte (13 buffers de MP4 vivos num celular = pressão de memória) ou apenas
// acompanhando-a (quem falha é quem toca de novo). E `/history`, que JÁ TEM a
// guarda, falhou 5 de 16 cliques — se a guarda fosse o conserto, ali seria
// zero. (n=16 não decide nada: o intervalo de confiança dessa taxa vai de ~11%
// a ~59%. Não estou tratando 31% e 33% como iguais; estou dizendo que **um dos
// dois números não sabe de nada**, e é o de n=16.)
//
// Então a correção foi escolhida por um critério mais duro que "qual hipótese
// eu prefiro": **ela é a ação certa sob AS DUAS.**
//   · Se a concorrência mata (memória): remove a causa — de até 13 `fetch`
//     simultâneos do mesmo arquivo para 1.
//   · Se não mata (suspensão da aba): o segundo toque deixa de ser um `fetch`
//     desperdiçado e vira o PAINEL DE RESGATE na tela. E o painel é o caminho
//     que funciona, porque o toque no link é **gesto real do usuário** —
//     nenhum navegador barra gesto, e era exatamente isso que o `window.open`
//     depois do `await` nunca teve (0 de 10 de aproveitamento, medido em 07/08).
//
// O comportamento do PRIMEIRO toque não muda em NADA — o blob continua sendo o
// degrau 1, e ele entrega 178 de 328 no mobile e 76 de 81 no desktop. Trocar o
// caminho que entrega por uma hipótese seria o erro que este arquivo já evitou
// duas vezes.
//
// O INSTRUMENTO QUE DECIDE O MECANISMO (e por que ele entra no MESMO commit):
// coalescer derruba a concorrência para 1 e com isso **apaga a evidência** que
// separaria memória de suspensão — a partir de amanhã não haveria mais grupos
// de 13 para medir. Então a falha passa a carregar `visibility_at_fail` e
// `hidden_during` (a aba ficou em segundo plano em algum momento deste fetch?)
// e `concurrent_downloads`. Com um dia de tráfego a pergunta se fecha sozinha:
// falha com a aba ESCONDIDA → suspensão; falha com a aba VISÍVEL e
// concorrência 1 → é rede/memória e o próximo degrau é range-request ou
// Content-Disposition direto. Sem isto, o conserto de hoje cegaria o próximo.
// ═══════════════════════════════════════════════════════════════════════════

interface InFlightDownload {
  /** Dono do painel de resgate. O toque repetido NÃO rouba a posse. */
  token: number
  startedAt: number
}

/**
 * Chave = URL do arquivo, não o `videoId`: dois tamanhos do mesmo vídeo
 * (watermarked/clean) são dois arquivos e podem baixar em paralelo sem se
 * atrapalhar. É a URL que define o `fetch` que está em voo.
 */
const inFlightDownloads = new Map<string, InFlightDownload>()

/**
 * ⚠️ REDE DE SEGURANÇA CONTRA O PIOR MODO DE FALHA DESTE ARQUIVO. Uma entrada
 * que nunca fosse removida trancaria aquele vídeo para SEMPRE naquela sessão —
 * todo toque seguinte viraria `coalesced` esperando um download que já morreu, e
 * a pessoa jamais baixaria o arquivo. Isso seria um estrago maior que o bug que
 * este commit conserta. O `finally` já garante a remoção; este teto é o cinto
 * além do suspensório.
 *
 * ⚠️ A PRIMEIRA VERSÃO DESTA LINHA ESTAVA ERRADA e foi pega na revisão
 * adversarial: ela reusava `MANUAL_LINK_AUTO_HIDE_MS` (180s) "porque passado
 * esse tempo não há mais painel na tela". Número escolhido por analogia com
 * outra grandeza — exatamente o erro que este repositório mais registra. A
 * DURAÇÃO REAL dos downloads, medida em 30 dias:
 *
 *   `video_downloaded`      mobile  n=178 · p50 1,2s · p90 36,0s · max 101,1s
 *   `video_downloaded`      desktop n=76  · p50 1,4s · p90 14,9s · max  43,5s
 *   `video_download_failed` mobile  n=106 · p50 51,3s · p90 215,9s · **max 350,9s**
 *
 * O p90 das falhas (215,9s) é MAIOR que os 180s. Ou seja: o corte antigo
 * declararia morto um download vivo em ~1 de cada 10 falhas — e deixaria um
 * segundo `fetch` entrar em voo — precisamente na cauda lenta, que é onde este
 * bug mora. A guarda teria se desligado sozinha no único caso que importa.
 *
 * 15 minutos ficam confortavelmente acima do mais longo que já se mediu (350,9s)
 * e continuam limitados. Este número não regula comportamento nenhum no caminho
 * normal: ele só é lido se uma exceção escapar do `finally`.
 */
const INFLIGHT_STALE_MS = 15 * 60_000

function activeDownload(url: string): InFlightDownload | null {
  const running = inFlightDownloads.get(url)
  if (!running) return null
  if (Date.now() - running.startedAt > INFLIGHT_STALE_MS) {
    inFlightDownloads.delete(url)
    return null
  }
  return running
}

/**
 * Baixa o vídeo e conta a verdade sobre o que aconteceu.
 *
 * Devolve o desfecho. `null` só em ambiente sem `window` (SSR).
 */
export async function downloadVideoFile(
  opts: DownloadVideoOptions,
): Promise<DownloadOutcome | null> {
  const { url, filename, exportType, surface, videoId, extra } = opts
  const device = deviceClass()

  // Base compartilhada por TODOS os eventos desta função. `export_type` e
  // `video_id` mantêm os nomes históricos.
  const base: Record<string, unknown> = {
    surface,
    device,
    export_type: exportType,
    filename,
    ...(videoId ? { video_id: videoId } : {}),
    ...(extra ?? {}),
  }

  // ── Degrau 0: o denominador. Antes de qualquer await, sempre. ────────────
  // Continua saindo no toque COALESCIDO também: clique é clique, e mexer neste
  // denominador quebraria a série histórica de download que o funil já lê.
  fire('video_download_clicked', base)

  if (typeof window === 'undefined') return null

  // ── Degrau 0.5: o mesmo arquivo JÁ está em voo? ──────────────────────────
  // Roda ANTES do `hideManualDownloadLink()` abaixo de propósito: aquela linha
  // existe para matar o painel de uma tentativa ANTERIOR, e o painel de um
  // download que ainda corre não é anterior a nada — apagá-lo aqui tiraria da
  // tela justamente o link tocável que este caminho quer entregar.
  const running = activeDownload(url)
  if (running) {
    // O painel dos 20s pode já estar na tela (o toque veio depois do timer) ou
    // não (veio antes). Se já está, NÃO se mexe nele: ele já diz a verdade
    // ("Still downloading…") com o link certo, e reescrever o gatilho cunharia
    // um `escalated` que não descreve escalada nenhuma.
    let panelShown = false
    try {
      const node = typeof document !== 'undefined' ? document.getElementById(MANUAL_LINK_ID) : null
      panelShown = !!node && node.dataset.token === String(running.token)
    } catch {
      /* ignore */
    }
    // ⚠️ 2ª ARMADILHA MORTA NA REVISÃO: só pinta o painel se o download em voo
    // ainda for o MAIS RECENTE do app. `showManualDownloadLink` começa com um
    // `hideManualDownloadLink()` SEM token — ele derruba o painel de quem
    // estiver lá. Se outro download (outro vídeo, outra tela) tiver começado
    // depois, ele é o dono legítimo da tela, e pintar aqui com o token ANTIGO
    // faria duas coisas ruins de uma vez: apagaria o painel do download novo e
    // deixaria na tela um nó que o novo dono não consegue mais remover (token
    // divergente), preso até o auto-hide de 180s — dizendo "still downloading"
    // sobre o vídeo errado. Neste caso o toque não pinta nada e a telemetria
    // registra `panel_shown: false`, que é a verdade.
    if (!panelShown && running.token === manualLinkToken) {
      // Token do DONO, nunca um novo: quem termina o download tem de continuar
      // conseguindo remover o painel (`hideManualDownloadLink(myToken)`). Um
      // token novo aqui deixaria o painel órfão em cima de um download que deu
      // certo — dizendo "still downloading" com o arquivo já salvo.
      panelShown = showManualDownloadLink(url, filename, 'retry', base, running.token)
    }
    fire('video_download_coalesced', {
      ...base,
      waiting_ms: Date.now() - running.startedAt,
      panel_shown: panelShown,
    })
    return 'coalesced'
  }

  // ── Rede de segurança (KINEO-DOWNLOAD-MOBILE-RESCUE) ─────────────────────
  // O token torna este download DONO do painel: duas chamadas simultâneas
  // (telas diferentes, arquivos diferentes) não podem apagar o painel uma da
  // outra nem pintar o vídeo errado.
  const myToken = ++manualLinkToken
  inFlightDownloads.set(url, { token: myToken, startedAt: Date.now() })
  try {
    return await runDownload(opts, myToken, base, device)
  } finally {
    // Sem `finally` uma exceção inesperada trancaria este arquivo para sempre
    // na sessão. Ver INFLIGHT_STALE_MS.
    //
    // ⚠️ 3ª ARMADILHA MORTA NA REVISÃO: apaga só se a entrada ainda for MINHA.
    // Se este download passar dos 15 min, `activeDownload` o considera morto e
    // um toque novo registra a URL DE NOVO, com outro token. Um `delete` cego
    // aqui removeria a entrada do download NOVO ao terminar o velho — e a
    // proteção sumiria em silêncio justamente na sessão mais degradada.
    if (inFlightDownloads.get(url)?.token === myToken) inFlightDownloads.delete(url)
  }
}

async function runDownload(
  opts: DownloadVideoOptions,
  myToken: number,
  base: Record<string, unknown>,
  device: 'mobile' | 'desktop' | 'unknown',
): Promise<DownloadOutcome | null> {
  const { url, filename } = opts

  // Painel de uma tentativa ANTERIOR não pode sobreviver à próxima: ele
  // apontaria para o vídeo errado.
  hideManualDownloadLink()

  const startedAt = Date.now()

  // Inclui ESTE download (o registro já foi feito pelo chamador). Vale 1 quando
  // nada mais está em voo — nunca 0, e o nome diz isso.
  const concurrentAtStart = inFlightDownloads.size

  // ── Instrumento do mecanismo (ver bloco KINEO-DOWNLOAD-SIMULTANEOUS-DEATH) ─
  // A pergunta que sobra depois deste commit é uma só: quando o fetch morre, a
  // aba estava em segundo plano? Um `boolean` observado ao longo de TODA a
  // vida do fetch, porque o estado no instante da falha não conta a ida e
  // volta — quem some e volta antes do erro deixaria `visibilityState` em
  // 'visible' e a suspensão passaria despercebida.
  let hiddenDuring = false
  let onVisibility: (() => void) | null = null
  try {
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'hidden') hiddenDuring = true
      onVisibility = () => {
        try {
          if (document.visibilityState === 'hidden') hiddenDuring = true
        } catch {
          /* ignore */
        }
      }
      document.addEventListener('visibilitychange', onVisibility)
    }
  } catch {
    onVisibility = null
  }
  const stopWatchingVisibility = () => {
    try {
      if (onVisibility && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
        onVisibility = null
      }
    } catch {
      /* ignore */
    }
  }
  // `manualShown` só vira true quando existe painel NA TELA de verdade — a
  // função devolve false quando não há `document.body`, quando o href é
  // recusado ou quando algo estoura. Telemetria não pode afirmar impressão
  // que não aconteceu.
  let manualShown = false
  const showManual = (trigger: ManualLinkTrigger) => {
    // A guarda vale para TODOS os gatilhos, não só o timer dos 20s. O caminho
    // de falha é o mais longevo (69s em média) e portanto o MAIS provável de
    // já estar obsoleto: sem isto, o download A falhando repintaria o painel
    // do download B com a URL do vídeo A.
    if (myToken !== manualLinkToken) return
    manualShown = showManualDownloadLink(url, filename, trigger, base, myToken) || manualShown
  }

  // Só no mobile: 100% das falhas medidas são mobile e no desktop são 19/19 em
  // 1,8s — lá o painel seria ruído. Roda POR CIMA do blob, que segue correndo.
  let slowTimer: ReturnType<typeof setTimeout> | null = null
  const clearSlowTimer = () => {
    if (slowTimer !== null) {
      clearTimeout(slowTimer)
      slowTimer = null
    }
  }
  if (device === 'mobile') {
    slowTimer = setTimeout(() => {
      slowTimer = null
      // Um download mais novo já assumiu a tela: este timer é passado.
      if (myToken !== manualLinkToken) return
      showManual('slow')
    }, MANUAL_LINK_AFTER_MS)
  }

  // ── Degrau 1: blob nomeado (o único que salva com nome legível) ──────────
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    try {
      opts.onBlobReady?.(blob)
    } catch {
      // O arquivo continua sendo entregue mesmo se a superfície opcional de
      // compartilhamento não conseguir guardar a referência em memória.
    }
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Os bytes chegaram: o painel some antes de ser lido, mesmo que os 20s já
    // tenham passado. Ninguém é convidado a baixar o que acabou de baixar.
    clearSlowTimer()
    stopWatchingVisibility()
    hideManualDownloadLink(myToken)
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch {
        /* ignore */
      }
    }, 4000)

    fire('video_downloaded', {
      ...base,
      method: 'blob',
      bytes: blob.size,
      ms: Date.now() - startedAt,
      // ⚠️ O CONTROLE. `hidden_during` na FALHA sozinho não decide nada: se
      // metade de todo mundo troca de aba enquanto espera, a taxa de escondido
      // entre quem falhou seria alta mesmo que a suspensão não matasse ninguém.
      // A comparação honesta é falha × SUCESSO, e por isso o campo sai aqui
      // também. Regra 3 do PROMPT-DIARIO: número de falha só é notícia junto do
      // denominador que o gerou.
      hidden_during: hiddenDuring,
      concurrent_downloads: concurrentAtStart,
    })

    // KINEO-SINAL-POS-ENTREGA-2026-08-31 (sprint-v1v4 #19) — o arquivo chegou.
    // Este e o UNICO ponto do produto que PROVA entrega, e por isso e o unico
    // que anuncia. A prateleira do proximo episodio escuta este sinal para
    // sair de baixo de mil pixels de pacote de texto no instante exato em que
    // a pessoa termina o que veio fazer. Fire-and-forget e blindado: ver
    // lib/postVideoSignal.ts, nunca lanca.
    anunciarVideoEntregue({ method: 'blob', ms: Date.now() - startedAt })

    return 'blob'
  } catch (err) {
    // O motivo importa e decide se vale cascatear:
    //   `HTTP 4xx/5xx` → o CORS passou e o SERVIDOR negou o arquivo. Abrir a
    //                    mesma URL numa aba nova entrega uma página de erro.
    //   qualquer outro → rede ou CORS. A navegação direta ainda pode funcionar.
    clearSlowTimer()
    // Lido ANTES de parar o observador — depois deste ponto o estado da aba não
    // pertence mais a este fetch.
    let visibilityAtFail: string | null = null
    try {
      visibilityAtFail = typeof document !== 'undefined' ? document.visibilityState : null
    } catch {
      visibilityAtFail = null
    }
    stopWatchingVisibility()
    const reason = err instanceof Error ? err.message.slice(0, 120) : 'unknown'
    const httpStatus = /^HTTP (\d{3})$/.exec(reason)?.[1] ?? null
    fire('video_download_failed', {
      ...base,
      reason,
      http_status: httpStatus,
      // Lido ANTES de `showManual` desta falha rodar: diz se o painel dos 20s
      // JÁ estava aberto quando a falha chegou, não se esta falha ganhou
      // painel. Nome honesto, senão vira um `device` disfarçado.
      panel_already_open: manualShown,
      ms: Date.now() - startedAt,
      // ── Os três campos que decidem o mecanismo (ver bloco do topo) ────────
      // `hidden_during` responde "a aba sumiu em ALGUM momento deste fetch?" e
      // `visibility_at_fail` responde "e no instante da morte?". Os dois juntos
      // separam quem foi suspenso de quem só deu uma espiada no WhatsApp e
      // voltou. `concurrent_downloads` fica para provar que a coalescência de
      // hoje realmente derrubou o voo para 1 — se este número continuar >1 nas
      // falhas de amanhã, a guarda não pegou o caminho que importa e eu quero
      // descobrir isso pelo dado, não pela minha convicção.
      visibility_at_fail: visibilityAtFail,
      hidden_during: hiddenDuring,
      concurrent_downloads: concurrentAtStart,
    })
    if (httpStatus) {
      // O servidor NEGOU o arquivo (403/404/410...). Oferecer o link seria
      // prometer na tela algo que entregaria a MESMA página de erro. Mas
      // apagar o painel dos 20s sem dizer nada recriaria, para as falhas com
      // status, exatamente o silêncio que esta mudança existe para matar:
      // painel SEM link, com o que fazer a seguir.
      showManual('unavailable')
      return 'unavailable'
    }
    // Rede ou CORS: a navegação direta ainda pode funcionar, e é ESTE o caso
    // dos 10 eventos medidos (`http_status: null` em 10 de 10).
    showManual('blob_failed')
  }

  // ── Degrau 2: aba nova. Pode ser BARRADA (estamos fora do gesto). ────────
  // Comportamento IDÊNTICO ao que já estava em produção — o que muda é que
  // agora sabemos quando ele é barrado. Deliberadamente NÃO emite
  // `video_downloaded`: abrir uma aba não prova que o arquivo chegou, e esse
  // evento decide quem os e-mails de resgate deixam de procurar.
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (win) {
      // A aba abriu de verdade: o arquivo ESTÁ na tela da pessoa. Deixar o
      // painel dizendo "your download didn't start" seria uma frase falsa em
      // cima de um download que aconteceu — e `delivered` no call site já
      // conta este caso.
      hideManualDownloadLink(myToken)
      fire('video_download_fallback_opened', { ...base, ms: Date.now() - startedAt })
      return 'fallback_opened'
    }
    // `win === null` = popup bloqueado. ESTE era o buraco silencioso: a pessoa
    // ficava sem arquivo e sem mensagem de erro, e o banco não registrava
    // nada. Desde 05/08 registra — 10 de 10 — e a partir de agora o painel
    // já está na tela quando isto acontece (o `blob_failed` acima o abriu),
    // então a pessoa tem um link tocável em vez de nada.
    // `showManual` ANTES do evento de propósito: o campo abaixo é a resposta à
    // única pergunta que importa neste caminho — "a pessoa ficou com NADA na
    // mão, como aconteceu 10 vezes em 10, ou tem um link para tocar?". Ele é
    // `true` na esmagadora maioria dos casos e `false` quando o painel não
    // pôde ser montado (href recusado, sem `document.body`); é essa minoria
    // que precisa aparecer numa query.
    showManual('popup_blocked')
    fire('video_download_popup_blocked', { ...base, rescued_by_manual_link: manualShown })
  } catch {
    showManual('popup_blocked')
    fire('video_download_popup_blocked', {
      ...base,
      threw: true,
      rescued_by_manual_link: manualShown,
    })
  }

  return 'popup_blocked'
}
