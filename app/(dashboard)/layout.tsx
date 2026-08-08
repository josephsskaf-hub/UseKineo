import { createClient } from '@/lib/supabase/server'
import DashboardShell from './DashboardShell'
// Push #423 — mobile users see a one-tap "Install app" banner (Android)
// or the Add-to-Home-Screen hint (iOS). Dashboard only, so the public
// landing/ads funnel stays distraction-free.
import InstallAppBanner from '@/components/InstallAppBanner'
// Push #427 — push-notification opt-in ("know when your video is ready")
import EnablePushBanner from '@/components/EnablePushBanner'
// Push #443 — referral loop: fires attribute+qualify on any authenticated page
import ReferralAutoTrigger from '@/components/ReferralAutoTrigger'
// #479 — affiliate attribution: finalizes first-touch on any authenticated page
import AffiliateAutoTrigger from '@/components/AffiliateAutoTrigger'
// PUSH #100 — o loop de indicação (#443) está vivo ponta a ponta desde então,
// mas o banner que o anuncia (components/ReferralPromoBanner.tsx, #452) nunca
// foi importado em lugar nenhum: um grep no repo inteiro só encontrava o
// próprio arquivo. Montado aqui ao lado do InstallAppBanner, que é o padrão de
// banner de dashboard. Só para usuário logado — /referral exige sessão, e um
// visitante deslogado clicando em "Get my link" cairia numa parede de login.
import ReferralPromoBanner from '@/components/ReferralPromoBanner'
// KINEO-GLOBAL-RENDER-PILL-2026-08-05 — o render deixou de se perder: uma
// pílula flutuante lê /api/compose/active e leva de volta ao vídeo em
// QUALQUER página do app (o /generate já tinha esse card, o resto não tinha).
// Só para usuário logado: a probe exige sessão e devolveria 401.
import ActiveRenderPill from '@/components/ActiveRenderPill'
// KINEO-TRIAL-PAYWALL-2026-08-06 (fase 2, item 2b) - modal comparativo de
// downgrade do reverse trial. Montado aqui porque e a unica superficie que
// TODA tela autenticada atravessa, e quem saiu do trial volta pelo dashboard,
// nao necessariamente pelo /generate.
//
// A FLAG E LIDA AQUI, NO SERVIDOR, e nao dentro do componente: com
// KINEO_REVERSE_TRIAL_ENABLED OFF o componente nem chega ao browser, entao o
// custo desta feature no estado atual de producao e exatamente ZERO - nenhum
// fetch a mais por navegacao. O componente ainda pergunta ao servidor quem ele
// pode mostrar (a elegibilidade nunca e decidida no cliente); a flag aqui so
// evita gastar a pergunta quando a resposta e conhecida.
import TrialDowngradeModal from '@/components/TrialDowngradeModal'
// KINEO-TRIAL-ENTRY-VISIBILITY-2026-08-08 — o ANÚNCIO do trial, que nunca
// existiu. Medido em produção 08/08: das 36 pessoas em trial, as ÚNICAS
// superfícies que mencionam o trial são um evento de servidor (invisível), a
// caixa pós-vídeo (13 pessoas, só depois do vídeo pronto) e o e-mail (9
// pessoas, primeiro disparo hoje 16:30Z). Um reverse trial converte por aversão
// à perda, e ninguém teme perder o que não sabe que tem — 0 conversões em 36.
//
// Montado ANTES de `{children}`, em FLUXO NORMAL (sem `position: fixed` e sem
// `z-index`): o rodapé já tem 5 camadas disputando espaço e a revisão do painel
// de download de 07/08 pagou pelo defeito de um resgate que enterrava o CTA de
// compra. Um anúncio não pode cobrir a oferta.
//
// A flag é lida AQUI, no servidor, pelo mesmo motivo do TrialDowngradeModal:
// com KINEO_REVERSE_TRIAL_ENABLED OFF o componente não chega ao browser e o
// custo desta feature é exatamente ZERO — nenhum fetch a mais por navegação.
import TrialActiveBanner from '@/components/TrialActiveBanner'
// KINEO-TRIAL-ABUSE-PMP-2026-08-07 - O PRIMEIRO MINUTO PAGO. Tres SKUs do
// checkout (topup, bulk e o piloto do Autopilot) redirecionam DIRETO para
// /generate?success=true e /autopilot?success=true, e um grep por `success` em
// todo o (dashboard) nao encontra nenhum leitor: o cartao era cobrado e o app
// nao dizia nada. Este toast le o parametro, confirma o pagamento e repola
// /api/credits por ~20s ate o saldo do webhook chegar, disparando
// `creditsChanged` para o resto da UI se atualizar SEM refresh manual.
// Montado no layout porque os destinos sao telas diferentes; sem `success` na
// URL ele retorna no primeiro efeito (zero fetch, zero render).
import PaymentConfirmedToast from '@/components/PaymentConfirmedToast'
import { REVERSE_TRIAL_ENABLED } from '@/lib/reverseTrial'
import type { Metadata } from 'next'

// KINEO-ACQ-SPRINT-2026-07-29 — KEEP THE APP OUT OF THE SEARCH INDEX.
//
// WHAT WAS MEASURED (Google Search Console, sc-domain:usekineo.com, 29/07):
//   55 pages indexed · 43 NOT indexed · 8 total clicks from web search, ever.
//   26 of the 43 sit in "Discovered/Crawled — currently not indexed", which is
//   Google saying it has already seen those money pages and judged them not
//   worth the index.
//
// Meanwhile a `site:usekineo.com` search returns /avatar, /animate, /affiliate
// and /signup — logged-in app screens — ranking with titles Google cached
// BEFORE the rename: "AI Avatar Studio — ShortsForgeAI", "From $11.90/mo".
// Neither that brand nor that price exists anywhere in this codebase any more.
// So a searcher who finds Kineo today can be shown a dead brand at a price we
// never charged, on a screen they cannot use without an account.
//
// Two costs, both real:
//   1. Crawl budget. On a domain where Google is already declining 26 real
//      landing pages, every crawl spent on an app screen is one not spent on a
//      page built to convert.
//   2. Brand. The stale snippet IS the first impression.
//
// WHY noindex AND NOT robots.txt Disallow — this order matters and getting it
// backwards is a classic own-goal. `Disallow` blocks the CRAWL, and a page
// Google cannot crawl is a page whose `noindex` Google can never read, so an
// already-indexed URL would be frozen in the index with its stale title
// forever. The correct sequence is: serve noindex (here), let Google re-crawl
// and drop them, and only then consider blocking. `follow: true` is deliberate
// — internal links from these pages keep passing signal while they age out.
//
// The public marketing twins are NOT affected: /ai-avatar, /viral-now and the
// rest of the acquisition cluster live outside this route group and keep their
// own metadata.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No redirect — dashboard is public. Auth is enforced at the generate action.
  let profile = null
  let videosCount = 0
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('is_pro, email')
      .eq('id', user.id)
      .single()
    profile = data

    // PUSH #96 — `generations_used` is a dead column: it's written only by the
    // legacy app/api/generate/route.ts (old /create flow), never by the real
    // video pipeline (generate-video-fast/compose), so it's stuck at 0 for
    // every profile created since 2026-06-01. DashboardShell/Sidebar require a
    // `generationsUsed` number prop but never actually render its value today
    // (verified: Sidebar.tsx doesn't destructure it) — still, if it's ever
    // wired up for display, it should reflect something real. Reusing the
    // same "count rows in `videos`" approach as videos_count in
    // app/api/admin/users/route.ts.
    const { count } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    videosCount = count ?? 0
  }

  return (
    <DashboardShell
      userEmail={profile?.email ?? user?.email ?? ''}
      isPro={profile?.is_pro ?? false}
      generationsUsed={videosCount}
      isLoggedIn={!!user}
    >
      {/* KINEO-TRIAL-ENTRY-VISIBILITY-2026-08-08 — ANTES de `{children}` de
          propósito: em fluxo normal, no topo do `<main>`, é o único lugar do app
          que toda tela autenticada atravessa e que não cobre nada. `userKey`
          vem do SERVIDOR pelo mesmo motivo do modal abaixo. */}
      {user && REVERSE_TRIAL_ENABLED && <TrialActiveBanner userKey={user.id.slice(0, 8)} />}
      {children}
      <InstallAppBanner />
      {user && <ReferralPromoBanner />}
      <EnablePushBanner />
      {user && <ReferralAutoTrigger />}
      {user && <AffiliateAutoTrigger />}
      {user && <ActiveRenderPill />}
      {user && <PaymentConfirmedToast />}
      {/* `userKey` vem daqui, do SERVIDOR, e nao de /api/credits: a chave de
          dispensa precisa ser conhecida ANTES do fetch, senao quem ja dispensou
          o modal continua pagando uma chamada a /api/credits (3 queries) em toda
          navegacao, para sempre. Com a prop, o componente le o localStorage e sai
          em ~0ms. Prefixo curto do id serve so de namespace de chave, nunca de
          autorizacao - o cliente ja tem o id inteiro pela sessao do Supabase. */}
      {user && REVERSE_TRIAL_ENABLED && <TrialDowngradeModal userKey={user.id.slice(0, 8)} />}
    </DashboardShell>
  )
}
