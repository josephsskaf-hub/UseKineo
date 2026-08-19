// Kineo landing — new Apple-dark redesign (replaces the old HomePageClient on the homepage).
// Self-contained, styles scoped under .klp so they don't leak into the rest of the app.
// Marker: KINEO-LANDING-V3-2026-06-30
import Link from 'next/link'
import NavCreditsBadge from '@/components/NavCreditsBadge'
import StickyFreeShortCTA from '@/components/StickyFreeShortCTA'
import ExitIntentOffer from '@/components/ExitIntentOffer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import Footer from '@/components/Footer'
import PhWelcomeBanner from '@/components/PhWelcomeBanner'
import CostCalculatorLink from '@/components/CostCalculatorLink'
import LandingViewTracker from '@/components/LandingViewTracker'
import RevealOnScroll from './RevealOnScroll'
import LiveStatsBand from '@/components/LiveStatsBand'
import type { WallVideo } from '@/lib/engineWall'
import WallMedia from '@/components/WallMedia'
import LiveStatsBadge from '@/components/LiveStatsBadge'
import EngineCycleCard from '@/components/EngineCycleCard'
import TrendingRow from '@/components/TrendingRow'
// KINEO-VITRINE-MOEDA-2026-08-19 — LandingStarterPrice cobria SÓ o Starter, e
// por isso a home mostrava R$24,90 (regional) ao lado de $19.90 e $39.90
// (chumbados). Agora os TRÊS planos falam a moeda do visitante.
import LandingPlanPrice from '@/components/LandingPlanPrice'
import { TIER_CREDITS, TIER_PRICES } from '@/lib/checkoutPricing' // KINEO-AEO-PRICE-TRUTH-2026-08-19
// KINEO-CLIPES-2026-08-19 — filme pronto + cenas, ver lib/marketingPrice.
import { filmsAndScenes } from '@/lib/marketingPrice'

/** Centavos → "19.90". O FAQ de preco NUNCA digita numero a mao (ver #faq). */
const usdPrice = (cents: number) => (cents / 100).toFixed(2)
// KINEO-NAV-MEGA-PREVIEW-2026-08-17 — item de motor com mini-clipe no hover.
import NavEngineItem from '@/components/NavEngineItem'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

type Props = {
  initialUser?: { id: string } | null
  initialEmail?: string
  initialIsPro?: boolean
}

const KLP_CSS = `
/* KINEO-HOME-POLISH-2026-07-27 — refino visual do hero. Nenhum preço, CTA,
   promessa ou copy mudou; só tipografia, espaçamento, profundidade e cor.
   Tokens novos (--r-*, --sh-*, --blue-soft) centralizam raio/sombra/glow para
   que card, plano, FAQ e botao parem de cada um inventar o proprio acabamento. */
html{scroll-behavior:smooth}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
/* KINEO-UI-DIARIO-2026-08-14 — dia 12 do roadmap Higgsfield (metade "cinzas"),
   na landing. A escala de raios ja e unica desde o dia 11; a de CINZA nao era:
   este arquivo tinha 21 tons quase-neutros distintos para ~6 papeis reais, e a
   maioria nascia solta dentro de um gradiente ou de um style inline, sem passar
   por nenhuma das vars que a propria .klp ja declarava. A rampa abaixo fecha o
   conjunto em 4 superficies + 3 tracos + 4 textos. Toda colagem de SUPERFICIE
   tem delta <= 6/255 por canal; a unica colagem de TEXTO (#86868b do rodape ->
   --muted2 #8f8f96) sobe 11/255, ou seja CLAREIA — nenhum texto ficou mais
   escuro. E consolidacao, nao redesign: nada muda a olho.
   Papeis: s0 = poco (fundo de wash, overlay) · card = superficie base ·
   card2 = superficie elevada · s3 = realce (mesmo tom do traco --line de
   proposito: 1px dele le como hairline, uma area dele le como degrau) ·
   line/line2/line3 = traco quieto / forte / de enfase ·
   txt > txt2 > muted > muted2 = a rampa de texto, do titulo ao rodape.
   NAO colapsadas de proposito, porque a diferenca SE VE e exigiria decisao do
   fundador, nao consolidacao: --line3 (#4d4d50, a borda do plano Most Popular,
   19/255 acima de --line2) e --muted2 (#8f8f96, 18/255 abaixo de --muted).
   Sao exatamente as 2 que faltam para a meta de 9 tons do dia 20. */
.klp{--bg:#000;--s0:#0c0c0e;--card:#141416;--card2:#1d1d1f;--s3:#26262a;--line:#26262a;--line2:#3a3a3d;--line3:#4d4d50;--txt:#f5f5f7;--txt2:#c7c7cd;--muted:#a1a1a8;--muted2:#8f8f96;--blue:#2997ff;--blue-soft:rgba(41,151,255,.16);--r-xs:8px;--r-sm:13px;--r-md:18px;--r-lg:22px;--r-pill:999px;--sh-card:inset 0 1px 0 rgba(255,255,255,.045),0 18px 44px -30px rgba(0,0,0,.95);--sh-card-h:inset 0 1px 0 rgba(255,255,255,.07),0 26px 60px -30px rgba(0,0,0,1);--sh-cta:0 1px 0 rgba(255,255,255,.5) inset,0 10px 28px -12px rgba(255,255,255,.32);--dur-fast:150ms;--dur-base:250ms;--dur-slow:400ms;--ease-swift:cubic-bezier(.2,0,0,1);--ease-out-expo:cubic-bezier(.16,1,.3,1);background:var(--bg);color:var(--txt);font-family:var(--font-inter),'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;line-height:1.5;min-height:100vh}
.klp *{box-sizing:border-box;margin:0;padding:0}
.klp a{text-decoration:none;color:inherit}
.klp .wrap{max-width:none;margin:0 auto;padding:0 32px}
.klp .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:650;font-size:16px;letter-spacing:-.01em;padding:14px 30px;border-radius:var(--r-pill);cursor:pointer;transition:transform var(--dur-fast) var(--ease-swift),background var(--dur-fast) ease,box-shadow var(--dur-fast) ease;border:1px solid transparent}
.klp .btn-w{background:var(--txt);color:#000;box-shadow:var(--sh-cta);position:relative;overflow:hidden}
/* Dia 17 (13/08): sheen — um brilho diagonal atravessa o CTA branco UMA vez
   apos o load e a cada hover. CSS puro, sem repetir sozinho (cafona se
   repetir — regra do backlog). */
@media (prefers-reduced-motion: no-preference){
.klp .btn-w::before{content:'';position:absolute;top:-30%;bottom:-30%;left:-70%;width:42%;background:linear-gradient(105deg,transparent,rgba(120,175,255,.38),transparent);transform:skewX(-18deg);pointer-events:none;animation:ctaSheen 1s var(--ease-swift) .9s 1 both}
.klp .btn-w:hover::before{animation:ctaSheen .8s var(--ease-swift) 1}
@keyframes ctaSheen{from{left:-70%}to{left:130%}}
}
.klp .btn-w:hover{background:#fff;transform:translateY(-1px);box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 14px 34px -12px rgba(255,255,255,.42)}
.klp .btn-w:active{transform:translateY(0) scale(.985);box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 6px 16px -10px rgba(255,255,255,.3)}
.klp .btn:focus-visible{outline:2px solid var(--blue);outline-offset:3px}
.klp .btn[disabled]{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
.klp .link{color:var(--blue);font-weight:600;font-size:16px;display:inline-flex;align-items:center;gap:4px;background:linear-gradient(currentColor,currentColor) 0 100%/0 1px no-repeat;transition:background-size var(--dur-base) var(--ease-swift)}
.klp .link:hover{background-size:100% 1px}
.klp .link:hover{text-decoration:underline}
/* O gradiente antigo comecava a apagar em 35% e terminava em #a1a1a6, o que
   deixava a segunda linha do h1 visivelmente lavada. Agora fica solido ate
   58% e para em #c7c7cd — mesma sensacao, muito mais presenca. */
.klp .gtxt{background:linear-gradient(180deg,#fff 0%,#fff 64%,var(--txt2) 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.klp section[id],.klp #pricing,.klp #how,.klp #toolkit,.klp #faq,.klp #compare{scroll-margin-top:78px}
.klp .progress{position:fixed;top:0;left:0;height:2px;width:calc(var(--scroll-p,0)*100%);background:var(--blue);z-index:60;pointer-events:none;transition:width 80ms linear}
.klp nav{position:sticky;top:0;z-index:50;background:rgba(0,0,0,.7);backdrop-filter:blur(20px);border-bottom:1px solid var(--line)}
.klp .nav-in{display:flex;align-items:center;justify-content:space-between;height:62px}
.klp .logo{display:flex;align-items:center;gap:9px;font-weight:600;font-size:18px;letter-spacing:-.01em;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif}
.klp .logo .mk{width:28px;height:28px;border-radius:var(--r-xs);background:linear-gradient(135deg,var(--card2),var(--card));border:1px solid rgba(41,151,255,.45);box-shadow:0 0 14px rgba(41,151,255,.4),0 0 6px rgba(41,151,255,.25);display:grid;place-items:center;font-size:14px}
.klp .nav-links{display:flex;gap:26px;font-size:15px;color:var(--muted);font-weight:550;align-items:center}
.klp .nav-links a:hover{color:var(--txt)}
/* Dia 14 (13/08): estado ativo da nav — o RevealOnScroll poe .nav-on no link
   da secao visivel (hoje so #pricing tem ancora na nav). */
.klp .nav-links a{position:relative;transition:color var(--dur-fast) ease}
.klp .nav-links a .badge{height:15px;font-size:8.5px;padding:0 5px;margin-left:5px;vertical-align:2px;animation:none}
.klp .nd{position:relative;display:inline-flex}
/* KINEO-NAV-HOVER-2026-08-17 (fundador: "o sub menu desaparece antes de eu
   clicar") — dois defeitos: (1) o dropdown abria deslocado 4px pra baixo,
   criando um VAO MORTO entre o titulo e o menu onde o hover morria no
   caminho do mouse; (2) o fechamento era instantaneo — 1px fora e sumia.
   Cura: ::after cria uma PONTE invisivel cobrindo o vao (e um respiro
   lateral pro trajeto diagonal), o menu abre colado (translateY 0) e o
   fechamento ganha 0.25s de tolerancia (delay so na SAIDA; abrir segue
   imediato). */
.klp .nd::after{content:'';position:absolute;left:-14px;right:-14px;top:100%;height:16px}
.klp .nd-car{font-size:8px;margin-left:5px;opacity:.6;vertical-align:1px}
.klp .nd-menu{position:absolute;top:100%;left:50%;transform:translate(-50%,10px);padding-top:12px;opacity:0;pointer-events:none;transition:opacity var(--dur-fast) ease .25s,transform var(--dur-fast) var(--ease-swift) .25s,visibility 0s linear .45s;visibility:hidden;z-index:60}
.klp .nd:hover .nd-menu,.klp .nd:focus-within .nd-menu{opacity:1;pointer-events:auto;visibility:visible;transform:translate(-50%,0);transition-delay:0s,0s,0s}
.klp .nd-menu{display:flex}
.klp .nd-menu>*{display:block}
.klp .nd-menu{flex-direction:column;min-width:172px;background:transparent}
.klp .nd-menu::before{content:'';position:absolute;inset:12px 0 0 0;background:#111115;border:1px solid var(--line);border-radius:var(--r-sm);box-shadow:0 18px 44px rgba(0,0,0,.55)}
.klp .nd-menu a{position:relative;z-index:1}
.klp .nd-menu a{padding:10px 15px;border-radius:var(--r-xs);font-size:14px;white-space:nowrap;margin:0 5px}
.klp .nd-menu a:first-child{margin-top:17px}
.klp .nd-menu a:last-child{margin-bottom:5px}
/* KINEO-NAV-MEGA-2026-08-17 (fundador: 'dentro de Video todos os motores,
   parecido com o Higgsfield — motores de um lado, o resto do outro'): o
   dropdown Video vira mega-menu de DUAS COLUNAS. Coluna 1 = o catalogo dos
   5 motores com descricao+preco (o dropdown vira vitrine de casa multi-motor);
   coluna 2 = ferramentas de criacao. */
.klp .nd-mega{min-width:500px}
.klp .nd-mega .nm-col{display:flex;flex-direction:column;position:relative;z-index:1;min-width:235px;margin-top:12px;padding:8px 5px 8px}
.klp .nd-mega .nm-col+.nm-col{border-left:1px solid var(--line)}
.klp .nd-mega .nm-h{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt2);font-weight:700;padding:6px 15px 7px;margin:0 5px}
.klp .nd-mega .nm-col a{margin:0 5px;line-height:1.25;display:flex;align-items:center;gap:11px}
.klp .nm-ic{flex-shrink:0;width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);font-weight:800;font-size:14px;color:#e8eaee;letter-spacing:-.02em}
.klp .nm-tx{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
.klp .nd-mega .nm-col a i{display:block;font-style:normal;font-size:11.5px;color:var(--txt2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px}
.klp .nd-mega .nm-col a b{font-weight:600}
/* KINEO-NAV-MEGA-PREVIEW-2026-08-17 — mini-clipe flutuando a direita do menu
   no hover do motor (preview de 8s ja existente; preload none = zero custo
   ate o primeiro hover). */
.klp .nd-mega .nvp{position:absolute;left:calc(100% - 2px);top:12px;width:268px;height:150px;border-radius:12px;overflow:hidden;border:1px solid var(--line);box-shadow:0 18px 44px rgba(0,0,0,.55);background:#0a0a0c;opacity:0;pointer-events:none;transition:opacity .18s ease}
.klp .nd-mega .nvp video{width:100%;height:100%;object-fit:cover;display:block}
.klp .nd-mega .nm-col a:hover .nvp{opacity:1}
/* Chip de tier (STUDIO) — ensina a hierarquia sem uma palavra. */
.klp .nm-chip{display:inline-block;margin-left:7px;font-style:normal;font-size:9px;font-weight:800;letter-spacing:.1em;padding:2px 7px;border-radius:99px;background:rgba(41,151,255,.16);color:#7cc0ff;vertical-align:1px}
.klp .nd-menu a:hover{background:rgba(255,255,255,.06);color:#fff}

.klp .nav-links a.nav-on{color:var(--txt)}
.klp .nav-links a.nav-on::after{content:'';position:absolute;left:0;right:0;bottom:-8px;height:2px;border-radius:var(--r-pill);background:var(--blue)}
.klp .nav-right{display:flex;align-items:center;gap:14px}
.klp .nav-toggle-wrap{display:none}
.klp .nav-toggle-input{position:absolute;inset:0;width:44px;height:44px;opacity:0;margin:0;cursor:pointer;z-index:2}
.klp .nav-toggle-btn{display:flex;flex-direction:column;gap:5px;pointer-events:none}
.klp .nav-toggle-btn .bar{display:block;width:20px;height:2px;background:var(--txt);border-radius:var(--r-pill);transition:var(--dur-fast)}
.klp .nav-toggle-input:checked~.nav-toggle-btn .bar:nth-child(1){transform:translateY(7px) rotate(45deg)}
.klp .nav-toggle-input:checked~.nav-toggle-btn .bar:nth-child(2){opacity:0}
.klp .nav-toggle-input:checked~.nav-toggle-btn .bar:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.klp .nav-mobile-menu{display:none}
.klp .nav-toggle-input:checked~.nav-mobile-menu{display:flex}
/* KINEO-HERO-FIRSTFOLD-2026-08-07 — os espacos verticais do hero deixam de ser
   fixos e passam a escalar com a ALTURA da viewport (vh). Num notebook comum
   (1440x900 => ~790px uteis) 96px de padding-top eram quase 12% da dobra
   gastos em vazio antes de qualquer palavra. O clamp mantem o respiro em
   monitores altos (cap 88px) e comprime onde falta espaco (piso 22px).
   Medido, nao chutado — ver a conta completa no corpo do commit. */
.klp .hero::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.025;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.klp .hero{position:relative;padding:clamp(16px,2.4vh,40px) 0 0;overflow:hidden}
/* rgba(120,140,175) era um azul-acinzentado que nao existe em lugar nenhum da
   paleta — o unico tom solto do hero. Trocado pelo azul da marca, em duas
   camadas (uma quente e larga, uma fria e concentrada) para dar profundidade
   em vez de uma mancha chapada. */
.klp .hero .glow{position:absolute;width:980px;height:600px;left:50%;top:-180px;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 40%,rgba(41,151,255,.13),transparent 64%),radial-gradient(ellipse at 50% 26%,rgba(255,255,255,.05),transparent 60%);pointer-events:none}
/* KINEO-HERO-FIRSTFOLD-2026-08-07 — 22px fixos viram clamp por altura de tela.
   A FONTE nao muda (o fundador aprovou a escala tipografica); so o respiro. */
.klp .hero-center .sub{font-size:clamp(1.08rem,2.1vw,1.3rem);color:var(--muted);max-width:544px;margin:clamp(10px,1.5vh,22px) 0 0;line-height:1.52;letter-spacing:-.005em;text-wrap:balance}
/* KINEO-HERO-NO-CHIPS-2026-08-05 — o <form> é o SHELL (sem moldura) e o card
   visual é um filho .composer. Os chips de tópico que ladeavam/empilhavam foram
   removidos (decisão do fundador após ver no ar), então o shell é uma coluna em
   todas as larguras e o card ocupa a largura toda do shell no desktop. */
.klp .composer-shell{display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:30px;width:100%}
.klp .composer:focus-within{border-color:rgba(41,151,255,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 26px 64px -30px rgba(0,0,0,1),0 0 0 3px rgba(41,151,255,.14)}
.klp .composer{display:flex;flex-direction:column;gap:14px;background:linear-gradient(180deg,var(--card2) 0%,var(--card) 100%);border:1px solid var(--line2);border-radius:var(--r-lg);padding:26px;width:100%;max-width:820px;min-height:300px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 26px 64px -30px rgba(0,0,0,1),0 0 0 1px rgba(41,151,255,.08);transition:box-shadow var(--dur-base) ease,border-color var(--dur-base) ease}
.klp .composer:focus-within{border-color:rgba(41,151,255,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 26px 64px -30px rgba(0,0,0,1),0 0 0 3px var(--blue-soft)}
.klp #try-kineo{scroll-margin-top:82px}
.klp .composer .ci{flex:1;width:100%;min-height:170px;resize:none;background:transparent;border:none;outline:none;color:var(--txt);font-size:18px;line-height:1.55;font-family:inherit;padding:6px 2px}
.klp .composer .ci::placeholder{color:var(--muted2)}
.klp .composer .cbtn{align-self:flex-end;white-space:nowrap;padding:14px 28px;font-size:15.5px;border-radius:var(--r-sm);transition:transform var(--dur-fast) var(--ease-swift),box-shadow var(--dur-base) ease}
.klp .composer .cbtn:hover{transform:translateY(-1px)}
.klp .composer-head{display:flex;align-items:center;justify-content:space-between;gap:14px}
.klp .composer-head label{font-size:15px;font-weight:700;color:var(--txt)}
.klp .composer-head span{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:var(--r-pill);background:rgba(41,151,255,.13);border:1px solid rgba(41,151,255,.28);color:var(--blue);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.klp .composer-proof{font-size:12px;line-height:1.45;color:var(--muted2);text-align:right}
.klp section{padding:34px 0}
/* Sticky nav is 62px — keep in-page anchor targets from landing underneath it. */
.klp section[id],.klp [id^="try-"]{scroll-margin-top:78px}
.klp .sec-h{text-align:center;max-width:660px;margin:0 auto 26px}
/* ONDA7 (14/08): eyebrow de secao — o rotulo pequeno acima do h2 da estrutura de leitura (padrao Higgsfield) sem pedir um pixel a mais. */
.klp .hero a[target]{transition:border-color var(--dur-fast) ease,color var(--dur-fast) ease}
.klp .hero a[target]:hover{border-color:rgba(41,151,255,.5)!important;color:var(--txt)!important}
.klp #compare::before,.klp #toolkit::before,.klp #pricing::before,.klp #faq::before{content:'';display:block;width:min(560px,72%);height:1px;margin:0 auto clamp(48px,7vh,84px);background:linear-gradient(90deg,transparent,var(--line2),transparent)}
/* KINEO-CONCORRENTES-2026-08-15 — 4 blocos da analise de concorrentes:
   statband (numeros reais), niches (29 paginas viram chips), sv (mini-visual
   por passo), fnote (nota do fundador — o toque humano que nenhum template tem). */
/* KINEO-ENGINE-WALL-2026-08-15 v2 — o layout REAL da home do Higgsfield
   (print do fundador): fileira de cards LARGOS com titulo caps ABAIXO da
   midia + bento dos motores (promo grande a esquerda, 6 tiles a direita com
   icone, nome, frase e badge). Nossos videos e motores reais. */
@keyframes ewsh{0%{background-position:200% 0}100%{background-position:-200% 0}}
.klp .ew-wrap{max-width:none;margin:0 auto;padding:0 32px}
.klp .ftr-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.klp .ftr{display:block}
.klp .ftr-media{position:relative;aspect-ratio:16/10;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line);background:linear-gradient(100deg,rgba(255,255,255,.035) 40%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.035) 60%) var(--card2);background-size:200% 100%;animation:ewsh 1.6s linear infinite;transition:border-color var(--dur-fast) ease,transform var(--dur-base) var(--ease-swift)}
.klp .ftr:hover .ftr-media{border-color:rgba(41,151,255,.5);transform:translateY(-2px)}
.klp .ftr h3{margin-top:12px;font-size:13.5px;font-weight:750;letter-spacing:.04em;text-transform:uppercase;color:var(--txt);font-family:var(--font-display),var(--font-inter),sans-serif}
.klp .ftr p{margin-top:4px;font-size:13px;color:var(--muted2);line-height:1.45}
.klp .bento{display:grid;grid-template-columns:1.35fr 1fr 1fr 1fr;grid-auto-rows:minmax(122px,auto);gap:12px;margin-top:12px}
.klp .bento .promo{grid-row:span 2;position:relative;border-radius:var(--r-md);overflow:hidden;border:1px solid rgba(41,151,255,.28);background:radial-gradient(120% 90% at 15% 10%,rgba(41,151,255,.28),transparent 55%),radial-gradient(100% 80% at 85% 95%,rgba(41,151,255,.12),transparent 60%),linear-gradient(160deg,#0b1830 0%,#0a0f1c 45%,#0c0c0e 100%);display:flex;flex-direction:column;justify-content:center;padding:30px 28px}
.klp .bento .promo::before{content:'';position:absolute;left:-40px;top:-40px;width:220px;height:220px;border-radius:var(--r-pill);background:radial-gradient(circle,rgba(41,151,255,.35),transparent 70%);filter:blur(30px);pointer-events:none}
.klp .bento .promo>*{position:relative;z-index:1}
.klp .bento .promo h3{font-size:clamp(1.3rem,2.4vw,1.8rem);font-weight:650;letter-spacing:-.01em;line-height:1.12;text-transform:uppercase;font-family:var(--font-display),var(--font-inter),sans-serif}
.klp .bento .promo p{margin-top:10px;font-size:.95rem;color:var(--txt2);max-width:34ch}
.klp .bento .promo .btn{margin-top:20px;align-self:flex-start;padding:12px 24px;font-size:14.5px}
.klp .tile .tvid{position:absolute;inset:0;z-index:0;opacity:.45}
.klp .tile::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,13,.5) 0%,rgba(10,10,13,.9) 100%);z-index:1;pointer-events:none}
.klp .tile .trow,.klp .tile .tbody{position:relative;z-index:2}
.klp .tile:hover .tvid{opacity:.65}
.klp .tile{position:relative;border-radius:var(--r-md);border:1px solid var(--line);background:linear-gradient(160deg,var(--card2) 0%,var(--card) 60%);padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;transition:border-color var(--dur-fast) ease,background var(--dur-fast) ease,transform var(--dur-base) var(--ease-swift)}
.klp .tile .trow{display:flex;align-items:center;justify-content:space-between}
.klp .tile .tbody{display:flex;flex-direction:column;gap:2px}
.klp .tile:hover{border-color:rgba(41,151,255,.5);background:var(--card2);transform:translateY(-2px)}
.klp .tile .tic{width:30px;height:30px;border-radius:var(--r-xs);display:grid;place-items:center;color:var(--blue);background:rgba(41,151,255,.12);border:1px solid rgba(41,151,255,.3);transition:box-shadow var(--dur-fast) ease,border-color var(--dur-fast) ease}
.klp .tile:hover .tic{border-color:rgba(41,151,255,.6);box-shadow:0 0 14px rgba(41,151,255,.35)}
.klp .tile h3{font-size:1.02rem;font-weight:650;letter-spacing:-.01em;color:var(--txt);font-family:var(--font-display),var(--font-inter),sans-serif}
.klp .tile p{font-size:12.5px;color:var(--muted2);line-height:1.4}
.klp .tile .tb{font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:var(--r-pill);background:rgba(41,151,255,.13);border:1px solid rgba(41,151,255,.32);color:var(--blue)}
.klp .tile.hot{background:linear-gradient(135deg,#0b2a52 0%,#123a6e 45%,var(--card) 100%);border-color:rgba(41,151,255,.5)}
.klp .tile.hot:hover{background:linear-gradient(135deg,#0d3160 0%,#164382 45%,var(--card2) 100%)}
@media(max-width:1000px){.klp .ftr-row{grid-template-columns:repeat(2,1fr)}.klp .bento{grid-template-columns:1fr 1fr;grid-auto-rows:minmax(128px,auto)}.klp .bento .promo{grid-column:span 2;grid-row:span 1;min-height:0;padding:24px 22px}}
@media(max-width:560px){.klp .ftr-row{grid-template-columns:1fr 1fr;gap:10px}.klp .bento{grid-template-columns:1fr 1fr;gap:10px}}
.klp .ftr-row.rv .ftr,.klp .bento.rv>*{opacity:0;transform:translateY(14px);transition:opacity var(--dur-slow) var(--ease-out-expo),transform var(--dur-slow) var(--ease-out-expo)}
.klp .ftr-row.rv-in .ftr,.klp .bento.rv-in>*{opacity:1;transform:none}
.klp .ftr-row.rv-in .ftr:nth-child(2){transition-delay:60ms}
.klp .ftr-row.rv-in .ftr:nth-child(3){transition-delay:120ms}
.klp .ftr-row.rv-in .ftr:nth-child(4){transition-delay:180ms}
.klp .bento.rv-in>*:nth-child(2){transition-delay:60ms}
.klp .bento.rv-in>*:nth-child(3){transition-delay:110ms}
.klp .bento.rv-in>*:nth-child(4){transition-delay:160ms}
.klp .bento.rv-in>*:nth-child(5){transition-delay:210ms}
.klp .bento.rv-in>*:nth-child(6){transition-delay:260ms}
.klp .bento.rv-in>*:nth-child(7){transition-delay:310ms}
.klp .statband{display:flex;justify-content:center;gap:clamp(28px,6vw,84px);flex-wrap:wrap;margin:28px auto 0;padding-top:22px;border-top:1px solid var(--line)}
.klp .statband-item{display:flex;flex-direction:column;align-items:center;gap:4px}
.klp .statband-n{font-family:var(--font-display),var(--font-inter),sans-serif;font-weight:600;font-size:clamp(1.9rem,4vw,2.6rem);letter-spacing:-.02em;color:var(--txt)}
.klp .statband-l{font-size:12.5px;color:var(--muted2);letter-spacing:.02em}
.klp .niches{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:820px;margin:0 auto}
.klp .niches a{display:inline-flex;align-items:center;padding:9px 16px;border-radius:var(--r-pill);border:1px solid var(--line);background:var(--card);color:var(--txt2);font-size:13.5px;font-weight:600;transition:border-color var(--dur-fast) ease,color var(--dur-fast) ease,transform var(--dur-fast) var(--ease-swift)}
.klp .niches a:hover{border-color:rgba(41,151,255,.5);color:var(--txt);transform:translateY(-1px)}
.klp .sv{height:72px;border-radius:var(--r-sm);border:1px solid var(--line);background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.klp .sv1 span{font-size:12.5px;color:var(--muted);font-style:italic;padding:0 14px;text-align:center}
.klp .sv2{flex-direction:column;gap:6px;padding:0 18px}
.klp .sv2 i{display:block;height:6px;border-radius:var(--r-pill);background:linear-gradient(90deg,rgba(41,151,255,.35),rgba(255,255,255,.10));width:100%}
.klp .sv2 i:nth-child(2){width:78%}
.klp .sv2 i:nth-child(3){width:56%}
.klp .sv3{background:url('/videos/example-sentinel.webp') center/cover}
.klp .sv3::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.25)}
.klp .sv3 b{position:relative;z-index:1;width:26px;height:26px;border-radius:var(--r-pill);background:rgba(41,151,255,.9);display:grid;place-items:center;color:#fff;font-size:10px}
.klp .fnote{max-width:640px;margin:0 auto;text-align:center}
.klp .fnote p{font-size:1.08rem;line-height:1.7;color:var(--txt2)}
.klp .fnote .sig{margin-top:14px;font-size:13px;color:var(--muted2)}
.klp .fnote .sig b{color:var(--txt);font-weight:650}
.klp .sec-eyebrow{display:block;margin-bottom:14px;font-size:11.5px;font-weight:750;letter-spacing:.14em;text-transform:uppercase;color:var(--blue)}
.klp .sec-h h2{font-size:clamp(2.05rem,4.4vw,3.05rem);font-weight:600;letter-spacing:-.026em;line-height:1.08;text-wrap:balance;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif}
.klp .sec-h p{margin-top:18px;color:var(--muted);font-size:1.12rem;line-height:1.55;text-wrap:balance}
.klp .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
/* ONDA7: conector visual entre os passos — a sequencia vira um caminho, nao 3 caixas soltas. */
.klp .steps{counter-reset:kstep}
.klp .step{position:relative;counter-increment:kstep;overflow:hidden}
.klp .step::before{content:counter(kstep);position:absolute;right:14px;top:2px;font-size:112px;font-weight:700;line-height:1;color:rgba(255,255,255,.035);font-family:var(--font-display),var(--font-inter),'Inter',sans-serif;pointer-events:none}
@media(min-width:781px){.klp .step:not(:last-child)::after{content:'→';position:absolute;top:50%;right:-17px;transform:translateY(-50%);color:var(--muted2);font-size:15px;pointer-events:none}}
.klp .step{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:32px;box-shadow:var(--sh-card);transition:transform var(--dur-fast) var(--ease-swift),border-color var(--dur-fast) ease,box-shadow var(--dur-fast) ease}
.klp .step:hover{border-color:rgba(41,151,255,.35);transform:translateY(-3px);box-shadow:var(--sh-card-h)}
/* "Step 1/2/3" era texto cinza solto de 14px, do mesmo peso do corpo — nao
   marcava sequencia nenhuma. Virou um selo numerado, que e o que a palavra
   "step" promete. Mesmo texto. */
.klp .step .n{display:inline-flex;align-items:center;height:26px;padding:0 11px;border-radius:var(--r-pill);font-size:11px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);background:rgba(41,151,255,.11);border:1px solid rgba(41,151,255,.26)}
.klp .step h3{margin-top:18px;font-size:1.28rem;font-weight:600;letter-spacing:-.018em;line-height:1.22;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif}
.klp .step p{margin-top:11px;color:var(--muted);font-size:.99rem;line-height:1.62}
.klp .vcard{aspect-ratio:9/16;border-radius:var(--r-md);background:radial-gradient(120% 80% at 50% 0%,var(--s3),var(--s0) 72%);border:1px solid var(--line);position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:15px;box-shadow:var(--sh-card);transition:transform var(--dur-base) var(--ease-swift),border-color var(--dur-base) ease,box-shadow var(--dur-base) ease}
.klp .vcard:hover,.klp .vcard:focus-visible,.klp .vcard:focus-within{border-color:rgba(41,151,255,.4);transform:translateY(-5px);box-shadow:var(--sh-card-h),0 0 0 1px rgba(41,151,255,.18)}
/* O texto do card fica sobre video em movimento — sem esta camada o titulo
   some assim que passa um frame claro. */
.klp .vcard::after{content:'';position:absolute;left:0;right:0;bottom:0;height:58%;background:linear-gradient(180deg,transparent,rgba(0,0,0,.72));pointer-events:none;z-index:1}
.klp .vcard .vt{position:relative;z-index:2}
.klp .vcard .vt{font-size:14px;font-weight:700;line-height:1.25;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.6)}
.klp .cmp{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);overflow-x:auto;position:relative;box-shadow:var(--sh-card)}
.klp .cmp table{width:100%;min-width:560px;border-collapse:collapse;font-size:14.5px}
.klp .cmp th,.klp .cmp td{padding:15px 18px;text-align:center;border-bottom:1px solid rgba(255,255,255,.055)}
.klp .cmp th:first-child,.klp .cmp td:first-child{text-align:left;color:var(--muted);font-weight:400;position:sticky;left:0;background:var(--card2);z-index:1}
.klp .cmp thead th{font-weight:650;color:var(--muted);font-size:13px;letter-spacing:.02em;padding-top:18px;padding-bottom:18px}
/* A coluna "Kineo" agora e uma coluna de verdade — faixa azul continua, com
   as pontas arredondadas no topo e na base, em vez de um cinza quase invisivel
   em rgba(255,255,255,.04) que nao dizia qual coluna importa. */
.klp .cmp thead th.us,.klp .cmp td.us{background:linear-gradient(180deg,rgba(41,151,255,.13),rgba(41,151,255,.07));box-shadow:inset 1px 0 0 rgba(41,151,255,.22),inset -1px 0 0 rgba(41,151,255,.22)}
.klp .cmp thead th.us{color:var(--txt);border-top-left-radius:var(--r-sm);border-top-right-radius:var(--r-sm);box-shadow:inset 1px 1px 0 rgba(41,151,255,.3),inset -1px 0 0 rgba(41,151,255,.3)}
.klp .cmp tbody tr:last-child td.us{border-bottom-left-radius:var(--r-sm);border-bottom-right-radius:var(--r-sm);box-shadow:inset 1px 0 0 rgba(41,151,255,.22),inset -1px -1px 0 rgba(41,151,255,.22)}
.klp .cmp td.us{color:var(--txt);font-weight:700}
.klp .cmp tbody tr:nth-child(even) td{background:rgba(255,255,255,.012)}
.klp .cmp tbody tr:hover td{background:rgba(255,255,255,.018)}
.klp .cmp tbody tr:hover td:first-child{background:var(--s3)}
.klp .cmp .no{color:var(--muted2)}
.klp .cmp tr:last-child td{border-bottom:none}
.klp .price{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}
.klp .plan{background:var(--card);border:1px solid var(--line);border-radius:var(--r-lg);padding:32px 28px;display:flex;flex-direction:column;box-shadow:var(--sh-card);transition:transform var(--dur-fast) var(--ease-swift),border-color var(--dur-fast) ease,box-shadow var(--dur-fast) ease}
.klp .plan:hover,.klp .plan:focus-visible,.klp .plan:focus-within{transform:translateY(-4px);border-color:var(--blue);box-shadow:0 0 0 1.5px var(--blue),0 18px 44px -18px rgba(41,151,255,.32)}
.klp .plan.pop{background:linear-gradient(180deg,var(--s3) 0%,var(--card2) 100%);border-color:rgba(41,151,255,.55);box-shadow:0 0 0 1px rgba(41,151,255,.25),var(--sh-card-h)}
.klp .plan.pop:hover,.klp .plan.pop:focus-visible,.klp .plan.pop:focus-within{border-color:var(--blue);box-shadow:0 0 0 1.5px var(--blue),0 12px 34px rgba(41,151,255,.16)}
.klp .plan{position:relative}
.klp .plan .pt{font-size:11px;font-weight:750;letter-spacing:.07em;text-transform:uppercase;color:var(--muted2)}
/* O card "Most popular" so tinha um cinza levemente mais claro para se
   distinguir — na pratica, nada. O proprio rotulo que ja estava la vira uma
   fita flutuante na borda de cima, que e como um plano recomendado se anuncia.
   Mesmo texto, so reposicionado. */
.klp .plan.pop{padding-top:40px}
.klp .plan.pop .pt{position:absolute;top:-12px;left:50%;transform:translateX(-50%);white-space:nowrap;color:#fff;background:var(--blue);border-radius:var(--r-pill);padding:6px 15px;font-size:10.5px;letter-spacing:.1em;box-shadow:0 6px 20px -6px rgba(41,151,255,.85)}
.klp .plan .nm{margin-top:12px;font-size:1.34rem;font-weight:600;letter-spacing:-.014em;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif}
.klp .plan.pop .nm{margin-top:0}
.klp .plan .pr{margin-top:8px;font-size:2.75rem;font-weight:600;letter-spacing:-.03em;line-height:1;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif}
.klp .plan .pr span{font-size:1rem;font-weight:500;color:var(--muted);letter-spacing:0}
.klp .plan .pr-then{margin-top:7px;font-size:.85rem;font-weight:550;color:var(--muted2)}
/* Linha fina separando "quanto custa" de "o que vem" — antes as duas
   informacoes eram um bloco unico e a lista comecava sem respiro. */
.klp .plan ul{list-style:none;margin:24px 0 26px;padding-top:22px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:13px}
.klp .plan li{display:flex;gap:11px;font-size:14.5px;line-height:1.5;color:var(--muted)}
.klp .plan li b{color:var(--txt);font-weight:650}
.klp .plan li .ck{color:var(--blue);flex:none;display:grid;place-items:center;width:19px;height:19px;margin-top:1px;border-radius:var(--r-pill);background:rgba(41,151,255,.13);font-size:11px;font-weight:800}
.klp .plan .btn{justify-content:center;margin-top:auto;width:100%}
.klp .snote{margin:26px auto 0;max-width:600px;text-align:center;font-size:14.5px;line-height:1.6;color:var(--muted)}
.klp .snote b{color:var(--txt);font-weight:650}
.klp .final{position:relative;text-align:center;overflow:hidden;border-radius:var(--r-lg);padding:88px 24px;background:linear-gradient(180deg,var(--card2) 0%,var(--card) 100%);border:1px solid var(--line);box-shadow:var(--sh-card-h)}
.klp .final::before{content:'';position:absolute;inset:-40px;background:url('/videos/example-turkmenistan.webp') center 30%/cover no-repeat;opacity:.07;filter:blur(26px) saturate(1.2);pointer-events:none}
.klp .final .glow{position:absolute;width:720px;height:400px;left:50%;top:-140px;transform:translateX(-50%);background:radial-gradient(ellipse at center,rgba(41,151,255,.18),transparent 66%);opacity:.75}
.klp .final h2{font-size:clamp(2rem,4.4vw,3rem);font-weight:600;letter-spacing:-.024em;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif}
.klp .final p{margin-top:14px;color:var(--muted);font-size:1.15rem}
.klp .final .fcta{display:flex;justify-content:center;margin-top:30px}
.klp .taaft-badge{margin:0 auto 18px;opacity:.8;line-height:0}
.klp .taaft-badge img{max-width:190px;height:auto;display:inline-block}
.klp .taaft-badge:hover{opacity:1}
/* KINEO-HOME-POLISH-R2-2026-07-27 — ICONOGRAFIA PROPRIA.
   Os 8 cards do toolkit usavam emoji de sistema (🎬 🎭 🫥 📦 🌀 🖼️ 🔥 ⚡).
   Emoji renderiza com desenho, peso e altura-x diferentes em cada SO — no
   Windows os oito ficavam coloridos e desalinhados entre si, o que le como
   "clipart", nao como produto. Agora sao 8 SVGs inline no MESMO grid de
   24x24, mesma espessura de traco (1.6), todos herdando currentColor, dentro
   de uma placa de 46px identica. Sem biblioteca, sem fonte, sem dependencia. */
.klp .tico{width:52px;height:52px;border-radius:var(--r-sm);display:grid;place-items:center;color:var(--blue);background:linear-gradient(180deg,rgba(41,151,255,.14),rgba(41,151,255,.05));border:1px solid rgba(41,151,255,.26);box-shadow:inset 0 1px 0 rgba(255,255,255,.08);flex:none;transition:transform var(--dur-fast) var(--ease-swift),border-color var(--dur-fast) ease,box-shadow var(--dur-fast) ease}
.klp .tcard:hover .tico,.klp .tcard:focus-within .tico{transform:translateY(-1px) scale(1.04);border-color:rgba(41,151,255,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 6px 18px -8px rgba(41,151,255,.6)}
.klp .tico svg{display:block}
.klp .tools{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.klp .tcard{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:26px 22px;box-shadow:var(--sh-card);transition:transform var(--dur-fast) var(--ease-swift),border-color var(--dur-fast) ease,box-shadow var(--dur-fast) ease;display:flex;flex-direction:column;gap:6px}
.klp .tcard:hover,.klp .tcard:focus-visible,.klp .tcard:focus-within{border-color:rgba(41,151,255,.38);transform:translateY(-3px);box-shadow:var(--sh-card-h)}
.klp .tcard h3{font-size:1.06rem;font-weight:650;letter-spacing:-.015em;margin-top:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif;font-weight:600}
.klp .tcard p{font-size:.93rem;color:var(--muted);line-height:1.58;margin-top:6px}
.klp .tcard .tlink{margin-top:auto;padding-top:16px;color:var(--blue);font-size:.87rem;font-weight:650;display:inline-flex;align-items:center;gap:5px;transition:gap var(--dur-fast) ease}
.klp .tcard:hover .tlink{gap:9px}
@keyframes badgeIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
.klp .badge{animation:badgeIn .4s var(--ease-out-expo) .3s both;display:inline-flex;align-items:center;height:19px;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--blue);background:rgba(41,151,255,.13);border:1px solid rgba(41,151,255,.32);padding:0 7px;border-radius:var(--r-pill)}
.klp .pricing-more{margin-top:20px;text-align:center;font-size:12.5px;color:var(--muted2)}
.klp .final h2{letter-spacing:-.03em;text-wrap:balance;font-weight:640}
.klp .final p{max-width:520px;margin-left:auto;margin-right:auto;text-wrap:balance}
.klp .gallery-cap{max-width:760px;margin-left:auto;margin-right:auto;line-height:1.65}
.klp .nav-cta{display:flex;align-items:center;gap:10px}
/* Dia 5 (13/08): fade-up das secoes ao rolar. .rv so e aplicada por JS (o
   RevealOnScroll) a secoes abaixo da dobra — sem JS nada fica escondido. */
/* R3 (14/08): cascata interna — o RevealOnScroll ja observa .tools/.steps/.price; os FILHOS entram em degrau quando o bloco revela. Sem JS novo. */
.klp .steps.rv .step,.klp .tools.rv .tcard,.klp .price.rv .plan{opacity:0;transform:translateY(14px);transition:opacity var(--dur-slow) var(--ease-out-expo),transform var(--dur-slow) var(--ease-out-expo)}
.klp .steps.rv-in .step,.klp .tools.rv-in .tcard,.klp .price.rv-in .plan{opacity:1;transform:none}
.klp .steps.rv-in .step:nth-child(2){transition-delay:70ms}
.klp .steps.rv-in .step:nth-child(3){transition-delay:140ms}
.klp .price.rv-in .plan:nth-child(2){transition-delay:80ms}
.klp .price.rv-in .plan:nth-child(3){transition-delay:160ms}
.klp .tools.rv-in .tcard:nth-child(2){transition-delay:40ms}
.klp .tools.rv-in .tcard:nth-child(3){transition-delay:80ms}
.klp .tools.rv-in .tcard:nth-child(4){transition-delay:120ms}
.klp .tools.rv-in .tcard:nth-child(5){transition-delay:160ms}
.klp .tools.rv-in .tcard:nth-child(6){transition-delay:200ms}
.klp .tools.rv-in .tcard:nth-child(7){transition-delay:240ms}
.klp .tools.rv-in .tcard:nth-child(8){transition-delay:280ms}
.klp .rv{opacity:0;transform:translateY(18px);transition:opacity var(--dur-slow) var(--ease-out-expo),transform var(--dur-slow) var(--ease-out-expo)}
.klp .rv.rv-in{opacity:1;transform:none}
.klp .hvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;transition:transform var(--dur-base) var(--ease-swift),opacity var(--dur-base) var(--ease-swift)}
.klp .vcard .hvid{border-radius:var(--r-md)}
/* KINEO-HIGGSFIELD-20D dias 2-4 (13/08). Dia 2: o <video> nasce invisivel por
   cima do poster (que agora e camada permanente) e entra em crossfade
   --dur-base no evento playing — nada "pisca". Dia 4: hover da zoom 1.04 no
   CONTEUDO (img ou video), dentro da moldura com overflow:hidden — a
   microinteracao assinatura do Higgsfield: o conteudo responde, nao so a
   moldura. */
.klp .vcard video.hvid{opacity:0}
.klp .vcard video.hvid.hv-on{opacity:1}
.klp .vcard:hover .hvid,.klp .vcard:focus-within .hvid{transform:scale(1.04)}
/* Dia 3: entrada em cascata da galeria — fade-up 400ms com 60ms de degrau por
   card, so opacity/transform (CLS zero), fill backwards (o delay segura o
   estado inicial). So roda para quem aceita movimento; reduced-motion ve os
   seis posters parados, como sempre. */
@media (prefers-reduced-motion: no-preference){
.klp .hero-gallery .vcard{animation:hgIn var(--dur-slow) var(--ease-out-expo) backwards}
.klp .hero-gallery .vcard:nth-child(2){animation-delay:60ms}
.klp .hero-gallery .vcard:nth-child(3){animation-delay:120ms}
.klp .hero-gallery .vcard:nth-child(4){animation-delay:180ms}
.klp .hero-gallery .vcard:nth-child(5){animation-delay:240ms}
.klp .hero-gallery .vcard:nth-child(6){animation-delay:300ms}
@keyframes hgIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
}
@media(max-width:820px){.klp .tools{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.klp .tools{grid-template-columns:1fr}}
/* Empilhado, a fita "Most popular" (top:-12px) invadiria o card de cima com
   o gap original de 18px. 30px deixa a fita respirar. */
@media(max-width:880px){.klp .composer{margin-left:auto;margin-right:auto}.klp .price{grid-template-columns:1fr;max-width:400px;margin:0 auto;gap:30px}}
@media(max-width:780px){
.klp .steps{grid-template-columns:1fr}
.klp .nav-links{display:none}
.klp section{padding:26px 0}
.klp .sec-h{margin-bottom:40px}
.klp .final{padding:60px 20px;border-radius:var(--r-lg)}
.klp .nav-toggle-wrap{display:inline-flex;position:relative;width:44px;height:44px;align-items:center;justify-content:center}
.klp .nav-mobile-menu{position:fixed;top:62px;left:0;right:0;flex-direction:column;background:var(--s0);border-bottom:1px solid var(--line);padding:8px 28px 20px;gap:2px;max-height:calc(100vh - 62px);overflow-y:auto;z-index:49}
.klp .nav-mobile-menu a{min-height:44px;display:flex;align-items:center;padding:10px 4px;font-size:15px;font-weight:500;color:var(--txt);border-bottom:1px solid var(--line)}
.klp .nav-mobile-menu a:last-child{border-bottom:none}
.klp .nav-mobile-menu a:hover,.klp .nav-mobile-menu a:focus-visible{color:var(--blue)}
.klp .nav-mobile-menu a.btn{margin-top:12px;min-height:48px;justify-content:center;border-bottom:none;color:#000;font-weight:600}
.klp .nav-mobile-menu a.btn:hover,.klp .nav-mobile-menu a.btn:focus-visible{color:#000}
/* KINEO-HOME-POLISH-R2-2026-07-27 — TABELA DE COMPARACAO NO MOBILE.
   Antes: scroll horizontal cru de uma tabela de 560px dentro de uma tela de
   390px. O visitante via UMA coluna e meia, tinha que arrastar para descobrir
   que a coluna dele era a primeira, e a dica "Swipe to compare" ficava
   alinhada a direita, longe de onde o dedo estava.
   Agora: cada LINHA vira um card. O nome da caracteristica e o titulo do card;
   os 4 concorrentes viram linhas rotuladas (o rotulo sai do atributo
   data-label no <td>, que espelha exatamente o <th> do cabecalho — nenhum
   texto novo foi escrito). A linha do Kineo fica destacada em azul dentro de
   cada card, entao a resposta "e o Kineo, faz?" aparece sem nenhum arraste.
   Nenhuma palavra da tabela mudou; so a forma. */
/* ONDA7 (14/08): .cmp-hint removido — nunca renderizava (display:none sem override) e o mobile usa cards, nao swipe. */
.klp .cmp{background:transparent;border:none;border-radius:0;overflow:visible;box-shadow:none}
.klp .cmp table,.klp .cmp tbody,.klp .cmp tr,.klp .cmp td{display:block;width:100%;min-width:0}
.klp .cmp thead{display:none}
.klp .cmp tr{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);box-shadow:var(--sh-card);margin-bottom:12px;overflow:hidden}
.klp .cmp tr:last-child{margin-bottom:0}
.klp .cmp td{display:flex;align-items:center;justify-content:space-between;gap:18px;text-align:right;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.05);font-size:14px}
.klp .cmp td::before{content:attr(data-label);color:var(--muted);font-weight:500;font-size:13px;text-align:left;flex:none}
/* Primeira celula = titulo do card (a caracteristica). */
.klp .cmp td:first-child{display:block;position:static;text-align:left;background:rgba(255,255,255,.028);color:var(--txt);font-weight:650;font-size:14.5px;line-height:1.35;padding:14px 16px}
.klp .cmp td:first-child::before{content:none}
.klp .cmp thead th.us,.klp .cmp td.us{border-radius:0;box-shadow:none}
.klp .cmp td.us{background:rgba(41,151,255,.1);box-shadow:inset 2px 0 0 var(--blue)}
.klp .cmp td.us::before{color:#8cc6ff;font-weight:700}
.klp .cmp tbody tr:last-child td.us{border-radius:0}
.klp .cmp tr td:last-child{border-bottom:none}
.klp .cmp tbody tr:hover td,.klp .cmp tbody tr:hover td:first-child{background:inherit}
.klp .cmp tbody tr:hover td.us{background:rgba(41,151,255,.1)}
}
@media(max-width:520px){.klp .composer{flex-direction:column;align-items:stretch;padding:14px;gap:12px}.klp .composer .cbtn{align-self:stretch;justify-content:center}.klp .composer-proof{text-align:center}}
@media(max-width:560px){.klp .composer .ci{min-height:64px}.klp .hero{padding-top:40px}.klp .composer-shell{margin-top:28px;gap:12px}.klp .composer .cbtn{order:1}.klp .composer-proof{order:1}}
/* KINEO-HERO-BIGGER-2026-08-05 — 780px era a medida de leitura do h1/.sub, mas
   também travava a largura útil do composer. O container passa a 1024px (= a
   largura interna do .wrap, então nada estoura na horizontal) e o h1 recebe a
   medida de leitura antiga de volta, já que é ele quem precisava dela. */
.klp .hero-center{position:relative;z-index:1;text-align:center;max-width:1024px;margin:0 auto}
.klp .hero-center h1{margin:0 auto;max-width:780px;font-size:clamp(3.1rem,7.6vw,6rem);font-weight:640;line-height:.99;letter-spacing:-.045em;text-wrap:balance;font-family:var(--font-display),var(--font-inter),'Inter',sans-serif;font-weight:600;letter-spacing:-.028em}
.klp .hero-center .sub{margin-left:auto;margin-right:auto}
@media(max-width:780px){.klp .hero-center h1{font-size:clamp(2.35rem,8.4vw,3.7rem);line-height:1.02;letter-spacing:-.038em}.klp .hero-center .sub{font-size:1.06rem;max-width:38ch}}
/* KINEO-HERO-FIRSTFOLD-2026-08-07 — 44px fixos entre o subtitulo e a caixa.
   Vira clamp por vh: 44px continua em telas altas, ~19px num notebook de 790px
   uteis. A caixa (667x432) nao encolhe — so o vazio acima dela. */
.klp .hero-center .composer-shell{margin:clamp(15px,2.4vh,44px) auto 0;max-width:1024px;text-align:left}
.klp .hero-center .composer{margin:0 auto;max-width:860px;min-height:auto}
/* KINEO-HERO-DECLUTTER-2026-07-30 — 104px deixava um vazio de quase uma dobra
   entre o placeholder e os atalhos de tópico, e o card lia como "faltando algo".
   84px ainda comporta as 3 linhas de rows={3} sem barra de rolagem.
   KINEO-HERO-BIGGER-2026-08-05 — os atalhos saíram de dentro do card, então os
   ~58px que eles ocupavam (pílula de 44px + gap) voltam para a área de escrita:
   118px a 18px/1.55 são ~4 linhas visíveis. O card não fica mais comprido do
   que era — só deixa de ser uma faixa fina. */
.klp .hero-center .composer .ci{min-height:118px}
.klp .hero-center .trust{text-align:center}
/* KINEO-HERO-667x432-2026-08-06 — nova medida decidida pelo fundador: 820×475
   empurrava a fileira de 6 Shorts (hero-gallery) para fora da primeira dobra.
   Com 667px de largura por 432px de altura os cards da galeria aparecem JÁ
   na 1ª dobra, que é o objetivo. min-height em vez de height travado porque
   a linha de erro e o script gerado inline nascem DENTRO do card — com
   altura fixa eles estourariam; no estado vazio o card fecha em exatamente
   432px porque a textarea (flex:1 na base) absorve toda a folga vertical
   entre label, CTA e proof, sem scroll interno. Fonte da textarea volta de
   19px para 18px — 19px ficava desproporcional na caixa menor.
   Abaixo de 900px nada disto se aplica: o card volta a width:100% fluido
   com altura auto (textarea 118px → 92px em ≤560), nunca 667 fixo, nunca
   overflow horizontal. */
@media(min-width:900px){
.klp .hero-center .composer{width:667px;max-width:667px;min-height:432px}
.klp .hero-center .composer .ci{font-size:18px}
}
@media(max-width:560px){.klp .hero-center .composer-shell{margin-top:28px}.klp .hero-center .composer .ci{min-height:92px}}
/* KINEO-HERO-SHOWCASE-2026-08-05 — seis Shorts reais lado a lado, logo abaixo
   da caixa. No desktop é uma fileira de 6; até 900px vira carrossel horizontal
   com scroll-snap (o container rola, a PÁGINA não — nada de overflow lateral)
   e o card fica com ~38% da largura, então três aparecem e o quarto assoma na
   borda, que é o que convida a arrastar. */
/* KINEO-HERO-FIRSTFOLD-2026-08-07 — margem superior da fileira em clamp por vh.
   Os overrides de <=900px (34px) e <=560px (30px) vem DEPOIS no arquivo e
   continuam ganhando por ordem — mobile/tablet nao herdam este clamp. */
.klp .hero-gallery::before{content:'';position:absolute;left:50%;bottom:-60px;transform:translateX(-50%);width:min(900px,90%);height:260px;background:radial-gradient(ellipse at 50% 100%,rgba(41,151,255,.10),transparent 70%);pointer-events:none;z-index:0}
.klp .hero-gallery{position:relative;z-index:1;display:grid;grid-template-columns:repeat(6,1fr);gap:12px;max-width:100%;margin:clamp(15px,2.2vh,44px) auto 0}
.klp .sr-h1{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.klp .hero-ftr{position:relative;z-index:1;margin-top:clamp(14px,2.2vh,30px);display:flex;gap:14px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:8px}
.klp .hero-ftr::-webkit-scrollbar{display:none}
.klp .hero-ftr .ftr{flex:1 0 clamp(280px,calc((100vw - 106px)/4),560px);scroll-snap-align:start}
@media(max-width:700px){.klp .hero-ftr{display:grid;grid-template-columns:1fr 1fr;gap:10px;overflow:visible}.klp .hero-ftr .ftr{flex:none;width:100%}.klp .hero-ftr .ftr h3{font-size:12px}.klp .hero-ftr .ftr p{font-size:11px}}
.klp .hero-ftr::after{content:'';position:absolute;left:50%;bottom:-70px;transform:translateX(-50%);width:min(900px,90%);height:260px;background:radial-gradient(ellipse at 50% 100%,rgba(41,151,255,.10),transparent 70%);pointer-events:none;z-index:0}
.klp .ec-ftr .ftr-media{display:block;aspect-ratio:500/280}
.klp .ec-ftr .ftr-media video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .28s cubic-bezier(.4,0,.2,1)}/*KINEO-CARD-SHARP-2026-08-19: 0.65s de blend entre dois frames diferentes lia como 'sem brilho/borrado' (fundador); 0.28s = corte com respiro*/
.klp .ec-ftr .ftr-media video.hv-on{opacity:1}
.klp .hero-line{position:relative;z-index:1;text-align:center;font-size:14.5px;font-weight:600;color:var(--txt);margin:2px auto 0;max-width:72ch}
.klp .hero-line span{color:var(--muted2);font-weight:550}
@media(max-width:700px){.klp .hero-line{font-size:12.5px}.klp .ec-go{opacity:1;transform:none;font-size:11px;padding:6px 11px}}
.klp .tr-wrap{position:relative}
.klp .tr-wrap::after{content:'';position:absolute;top:0;bottom:6px;right:0;width:70px;background:linear-gradient(90deg,transparent,var(--s0));pointer-events:none;z-index:2}
.klp .tr-nav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:38px;height:38px;border-radius:var(--r-pill);border:1px solid var(--line);background:rgba(17,17,21,.9);color:#fff;font-size:20px;line-height:1;display:grid;place-items:center;cursor:pointer;transition:border-color var(--dur-fast) ease,background var(--dur-fast) ease}
.klp .tr-nav:hover{border-color:rgba(41,151,255,.6);background:rgba(41,151,255,.15)}
.klp .tr-prev{left:-8px}
.klp .tr-next{right:-8px}
@media(max-width:700px){.klp .tr-nav{display:none}.klp .tr-wrap::after{width:34px}}
.klp .faq .qa{max-width:860px;margin-left:auto;margin-right:auto}
.klp .fnote{max-width:820px;margin-left:auto;margin-right:auto}

.klp .ec-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.klp .ec-chip{position:absolute;top:10px;left:10px;z-index:2;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.25);border-radius:var(--r-pill);padding:4px 10px;backdrop-filter:blur(6px)}
.klp .ec-dots{position:absolute;top:14px;right:12px;z-index:2;display:flex;gap:4px}
.klp .ec-dots i{position:relative;overflow:hidden;width:14px;height:2.5px;border-radius:var(--r-pill);background:rgba(255,255,255,.3)}
.klp .ec-dots i.on::after{content:'';position:absolute;inset:0;background:#fff;transform-origin:left;animation:ecFill 8s linear forwards}
@keyframes ecFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.klp .ec-go{position:absolute;right:10px;bottom:10px;z-index:2;font-size:12px;font-weight:700;color:#000;background:#fff;border-radius:var(--r-pill);padding:7px 14px;opacity:0;transform:translateY(4px);transition:opacity var(--dur-fast) ease,transform var(--dur-fast) var(--ease-swift)}
.klp .ec-ftr:hover .ec-go,.klp .ec-ftr:focus-visible .ec-go{opacity:1;transform:none}
.klp .proofline{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-bottom:10px;font-size:12px;color:var(--muted2)}
.klp .pl-badge{font-weight:600;font-size:11.5px;border:1px solid var(--line);border-radius:var(--r-pill);padding:4px 10px;color:var(--muted2);text-decoration:none}
a.pl-badge:hover{color:var(--txt);border-color:rgba(41,151,255,.5)}
.klp .tr-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.klp .tr-all{font-size:13.5px;font-weight:650}
.klp .tr-row{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;scrollbar-width:none;padding-bottom:6px}
.klp .tr-row::-webkit-scrollbar{display:none}
.klp .tr-card{position:relative;flex:0 0 clamp(150px,13vw,200px);aspect-ratio:9/16;border-radius:var(--r-sm);overflow:hidden;border:1px solid var(--line);background:linear-gradient(100deg,rgba(255,255,255,.035) 40%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.035) 60%) var(--card2);background-size:200% 100%;animation:ewsh 1.6s linear infinite;scroll-snap-align:start;transition:transform var(--dur-base) var(--ease-swift),border-color var(--dur-fast) ease}
.klp .tr-card:hover{transform:translateY(-3px);border-color:rgba(41,151,255,.5)}
.klp .tr-badge{position:absolute;top:8px;left:8px;z-index:2;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.22);border-radius:var(--r-xs);padding:3px 7px;backdrop-filter:blur(4px)}
.klp .tr-title{position:absolute;inset-inline:0;bottom:0;z-index:2;padding:26px 10px 10px;font-size:11.5px;font-weight:650;line-height:1.3;color:#fff;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent)}
.klp .tcredits{margin-top:6px;font-size:10.5px;font-weight:700;letter-spacing:.04em;color:var(--blue);text-transform:uppercase}
.klp .bento .promo{overflow:hidden}
.klp .pstack{position:absolute;right:-14px;bottom:-20px;display:flex;gap:8px;transform:rotate(-8deg);opacity:.9}
.klp .pstack img{width:74px;aspect-ratio:9/14;object-fit:cover;border-radius:var(--r-xs);border:1px solid rgba(255,255,255,.18);box-shadow:0 10px 26px rgba(0,0,0,.45)}
.klp .pstack img:nth-child(2){transform:translateY(10px)}
.klp .pstack img:nth-child(3){transform:translateY(22px)}
@media(max-width:1000px){.klp .pstack{display:none}}
.klp .fchips{margin-top:20px;display:flex;justify-content:center;gap:9px;flex-wrap:wrap}
.klp .fchips a{font-size:13px;font-weight:650;color:var(--txt);border:1px solid var(--line);border-radius:var(--r-pill);padding:8px 16px;background:rgba(255,255,255,.04);transition:border-color var(--dur-fast) ease,background var(--dur-fast) ease}
.klp .fchips a:hover{border-color:rgba(41,151,255,.6);background:rgba(41,151,255,.1)}
@media (prefers-reduced-motion: no-preference){
.klp .hero-ftr .ftr{animation:hgIn var(--dur-slow) var(--ease-out-expo) backwards}
.klp .hero-ftr .ftr:nth-child(2){animation-delay:60ms}
.klp .hero-ftr .ftr:nth-child(3){animation-delay:120ms}
.klp .hero-ftr .ftr:nth-child(4){animation-delay:180ms}
.klp .hero-ftr .ftr:nth-child(5){animation-delay:240ms}
}


.klp .hero-gallery .vcard{aspect-ratio:9/16;padding:11px}
.klp .hero-gallery .vcard .vt{font-size:12px;letter-spacing:-.01em}

.klp .hero-gallery .vcard .hvid-play span{width:32px;height:32px;font-size:12px}
.klp .gallery-cap{position:relative;z-index:1;margin-top:18px;text-align:center;font-size:12.5px;color:var(--muted2)}
/* Amplitude real: acima de 1240px sobram ≥80px de cada lado do .wrap (1080),
   então a fileira de seis Shorts sai 60px para fora dele e cada card ganha
   ~12% de largura. O .hero tem overflow:hidden, então isto nunca vira barra
   de rolagem horizontal. KINEO-HERO-667x432-2026-08-06: o composer-shell
   SAIU deste bloco — o card agora é 667px fixo e centrado, alargar o shell
   não fazia mais nada por ele. */
@media(min-width:1240px){
.klp .hero-gallery{max-width:none;margin-left:-72px;margin-right:-72px;gap:11px}
}
@media(max-width:900px){
.klp .hero-gallery{display:flex;gap:10px;margin-top:34px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:6px}
.klp .hero-gallery::-webkit-scrollbar{display:none}
.klp .hero-gallery .vcard{flex:0 0 38%;max-width:190px;scroll-snap-align:start}
/* O lift de -5px do hover seria cortado pelo overflow-y:hidden do trilho. */
.klp .hero-gallery .vcard:hover,.klp .hero-gallery .vcard:focus-within{transform:none}
}
@media (prefers-reduced-motion: no-preference){
.klp .scroll-cue{position:relative;z-index:1;width:22px;height:34px;margin:26px auto 0;border:1.5px solid var(--line2);border-radius:12px;opacity:.7;transition:opacity var(--dur-base) ease}
.klp .scroll-cue::before{content:'';position:absolute;left:50%;top:7px;width:3px;height:7px;margin-left:-1.5px;border-radius:2px;background:var(--blue);animation:cueDrop 1.8s var(--ease-out-expo) infinite}
@keyframes cueDrop{0%{transform:translateY(0);opacity:1}70%{transform:translateY(12px);opacity:0}100%{transform:translateY(0);opacity:0}}
.klp.scrolled .scroll-cue{opacity:0}
}
@media (prefers-reduced-motion: reduce){.klp .scroll-cue{display:none}}
.klp .platforms{position:relative;z-index:1;margin:22px auto 0;text-align:center;font-size:12px;font-weight:600;letter-spacing:.09em;color:var(--muted2);text-transform:uppercase}
.klp .platforms b{color:var(--muted);font-weight:700}
.klp .faq{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
/* ONDA6 (14/08): 12 cards sempre abertos em coluna unica eram ~1400px de cinza identico — 2 colunas cortam a altura pela metade sem tocar em texto. */
@media(min-width:900px){.klp .faq{max-width:960px;display:grid;grid-template-columns:1fr 1fr;align-items:start}}
.klp .qa{background:var(--card);border:1px solid var(--line);border-radius:var(--r-md);padding:24px 26px;box-shadow:var(--sh-card);transition:border-color var(--dur-fast) ease,box-shadow var(--dur-fast) ease}
.klp .qa:hover,.klp .qa:focus-visible,.klp .qa:focus-within{border-color:rgba(41,151,255,.3);box-shadow:var(--sh-card-h)}
.klp .qa h3{font-size:1.04rem;font-weight:650;letter-spacing:-.018em;line-height:1.35}
.klp .qa p{margin-top:10px;color:var(--muted);font-size:.96rem;line-height:1.65}
/* MOBILE DO HERO — o publico chega no celular e o produto e vertical.
   O h1 ganha a maior parte do ganho: menos padding morto em cima, tracking
   mais fechado no tamanho grande, e a .sub travada em medida de leitura. */
@media(max-width:560px){
.klp .hero{padding:44px 0 60px}
.klp .hero .glow{width:640px;height:420px;top:-150px}
.klp .wrap{padding:0 20px}
.klp .hero-center h1{font-size:clamp(2.5rem,11.2vw,3.4rem);line-height:1.0;letter-spacing:-.042em}
.klp .hero-center .sub{font-size:1.02rem;margin-top:16px;max-width:34ch}
.klp .hero-gallery{gap:10px;margin-top:30px}
.klp .composer{padding:18px;border-radius:var(--r-lg)}
.klp .composer .cbtn{padding:15px 24px;font-size:16px;min-height:52px}
.klp .step,.klp .plan{padding:26px 22px}
.klp .plan.pop{padding-top:38px}
.klp .tcard{padding:22px 20px}
.klp .tico{width:42px;height:42px;border-radius:var(--r-sm)}
.klp .plan .pr{font-size:2.5rem}
.klp .snote{padding:18px 20px;font-size:14px}
}
/* Respeita quem desligou animacao no sistema — os lifts de hover viram
   mudanca de cor apenas. */
@media(prefers-reduced-motion:reduce){
.klp *,.klp *::before,.klp *::after{transition-duration:.01ms!important;animation-duration:.01ms!important}
.klp .btn-w:hover,.klp .step:hover,.klp .tcard:hover,.klp .plan:hover,.klp .vcard:hover{transform:none}
}
`

// KINEO-HOME-POLISH-R2-2026-07-27 — set de icones proprio do toolkit.
// Regras que TODOS os oito obedecem, e que sao a razao de eles lerem como um
// conjunto e nao como oito desenhos avulsos:
//   · mesmo viewBox 24x24, mesma area optica (nada encostando na borda)
//   · fill="none", stroke="currentColor", strokeWidth 1.6, cantos e pontas
//     arredondados — a placa .tico define a cor, o SVG nunca a repete
//   · aria-hidden: o significado ja esta no <h3> do card, entao para um leitor
//     de tela estes sao puramente decorativos
// O icone de Viral Now e deliberadamente o MESMO desenho ja usado em
// components/Sidebar.tsx e components/MobileNav.tsx, para que o item nao mude
// de cara entre o site publico e o app.
const ICON_BASE = {
  width: 23,
  height: 23,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const TOOL_ICONS = {
  // Apresentador: figura enquadrada — o rosto que fala na tela.
  presenter: (
    <svg {...ICON_BASE} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M7.6 17.8a4.6 4.6 0 0 1 8.8 0" />
    </svg>
  ),
  // Character Lock: a mesma figura, agora com cadeado — "trancada".
  lock: (
    <svg {...ICON_BASE} aria-hidden="true">
      <circle cx="9.6" cy="8.2" r="3.3" />
      <path d="M3.4 19.4a6.3 6.3 0 0 1 9-5.7" />
      <rect x="14.3" y="14.4" width="6.9" height="5.8" rx="1.6" />
      <path d="M16.2 14.4v-1.3a1.6 1.6 0 0 1 3.1 0v1.3" />
    </svg>
  ),
  // Transparente: o mesmo enquadramento do apresentador, mas com a moldura
  // tracejada — a convencao universal de "sem fundo".
  transparent: (
    <svg {...ICON_BASE} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5.2" strokeDasharray="3.4 3" />
      <circle cx="12" cy="10" r="2.4" />
      <path d="M8 17.6a4.1 4.1 0 0 1 8 0" />
    </svg>
  ),
  // Anuncio de produto: caixa isometrica.
  product: (
    <svg {...ICON_BASE} aria-hidden="true">
      <path d="m12 2.7 8.1 4.4v9.8L12 21.3 3.9 16.9V7.1z" />
      <path d="M3.9 7.1 12 11.5l8.1-4.4M12 11.5v9.8" />
    </svg>
  ),
  // Animar foto: foto parada + ondas de movimento saindo dela.
  // O <g> so recentra (medido: o desenho caia em 12.7/11.0 em vez de 12/12,
  // porque as ondas puxam massa para a direita e nao somam altura). Translate
  // puro, sem escala — o traco continua identico ao dos outros sete.
  animate: (
    <svg {...ICON_BASE} aria-hidden="true">
      <g transform="translate(-0.7 1)">
        <rect x="2.8" y="4.4" width="13.2" height="13.2" rx="3.4" />
        <circle cx="7.3" cy="9" r="1.4" />
        <path d="m3.2 14.9 4-3.5 3.5 3" />
        <path d="M18.9 9.5a6.4 6.4 0 0 1 0 5.2M21.5 7.6a9.8 9.8 0 0 1 0 9" />
      </g>
    </svg>
  ),
  // Thumbnail: imagem cheia + brilho, o "clique" da miniatura.
  // Mesmo caso do anterior: o brilho no canto superior puxava o centro optico
  // para cima (cy 10.8). Translate puro.
  thumbnail: (
    <svg {...ICON_BASE} aria-hidden="true">
      <g transform="translate(0 1.2)">
        <rect x="2.8" y="5" width="18.4" height="14.4" rx="3.4" />
        <circle cx="8.4" cy="10.4" r="1.5" />
        <path d="m3.4 17 4.9-4.3 4.1 3.5 2.9-2.5 4.5 3.9" />
        <path d="m18.6 2.2.62 1.58 1.58.62-1.58.62-.62 1.58-.62-1.58-1.58-.62 1.58-.62z" />
      </g>
    </svg>
  ),
  // Viral: chama. O desenho e o MESMO path do Sidebar/MobileNav — nao vale
  // redesenhar um simbolo que o usuario ja aprendeu a reconhecer dentro do app.
  // Mas aquele path foi desenhado para uma caixa de 19px na nav e transborda a
  // viewBox aqui: medido, ele ocupa y 3 -> 24.6 (a base da chama era CORTADA)
  // e o centro optico caia em 13.4/13.8 em vez de 12/12, o que o deixava baixo
  // e a direita ao lado dos outros sete. O <g> reenquadra sem tocar no desenho;
  // strokeWidth 1.93 e 1.6 / 0.83, entao depois da escala o traco volta a ser
  // exatamente 1.6 como o dos demais.
  viral: (
    <svg {...ICON_BASE} aria-hidden="true">
      <g transform="translate(0.9 0.55) scale(0.83)" strokeWidth={1.93}>
        <path d="M12 3c1 3-3 5-3 8.5a3.5 3.5 0 0 0 7 0c0-1-.4-2-1-2.8.2 2-1 2.6-1 1.3 0-2.5-1-5.5-2-7Z" />
        <path d="M8 14.5A6.5 6.5 0 1 0 18.5 14" />
      </g>
    </svg>
  ),
  // Gratis / Fast: raio — o mesmo simbolo do logo no topo da pagina.
  bolt: (
    <svg {...ICON_BASE} aria-hidden="true">
      <path d="M13.2 2.4 4.3 13.7h6.4l-1 7.9 8.9-11.2h-6.3z" />
    </svg>
  ),
} as const

function pricingCheckoutHref(checkoutPath: string, isSignedIn: boolean): string {
  if (isSignedIn) return checkoutPath

  // Signed-out buyers see the auth screen before the payment API. This keeps
  // public link checkers from inflating checkout telemetry while preserving
  // the exact plan and intro offer through signup/OAuth.
  const separator = checkoutPath.includes('?') ? '&' : '?'
  const resumePath = `${checkoutPath}${separator}resumed=1`
  return `/signup?reason=checkout&redirect=${encodeURIComponent(resumePath)}`
}

export default function KineoLanding({ initialUser, engineWall = [], trending = [] }: Props & { engineWall?: WallVideo[]; trending?: WallVideo[] }) {
  const isSignedIn = Boolean(initialUser)
  const starterCheckoutHref = pricingCheckoutHref('/api/stripe/checkout?tier=starter&intro=1', isSignedIn)
  const creatorCheckoutHref = pricingCheckoutHref('/api/stripe/checkout?tier=basic&intro=1', isSignedIn)
  const studioCheckoutHref = pricingCheckoutHref('/api/stripe/checkout?tier=pro', isSignedIn)

  return (
    <>
    <main className="klp">
      {/* KINEO-HIGGSFIELD-20D (13/08): os comentarios do KLP_CSS sao a memoria
          institucional deste arquivo, mas estavam sendo ENVIADOS a cada
          visitante — 16,5KB (9%) do HTML da home. Ficam no fonte, saem do
          fio. O replace so remove blocos completos, nao toca em url() nem em
          seletores. */}
      <style dangerouslySetInnerHTML={{ __html: KLP_CSS.replace(/\/\*[\s\S]*?\*\//g, '') }} />
      <LandingViewTracker signedIn={Boolean(initialUser)} />
      <RevealOnScroll />
      {/* KINEO-PH-WELCOME-2026-08-04 — só renderiza com utm/ref do Product
          Hunt (launch ter 04/08); invisível para o resto do tráfego. */}
      <PhWelcomeBanner />

      <div className="progress" aria-hidden="true" />
      <nav aria-label="Main"><div className="wrap nav-in">
        <Link href="/" className="logo">
          <div className="mk">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#2997ff" stroke="#2997ff" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>
          Kineo
        </Link>
        <div className="nav-links">
            <Link href="/examples">Explore</Link>
            {/* KINEO-NAV-DROPDOWN-2026-08-15 — menus de categoria estilo
                Higgsfield: Image e Video abrem submenu no hover/focus (CSS
                puro, sem JS). O clique no proprio rotulo leva ao destino
                principal da categoria. */}
            {/* KINEO-NAV-IMAGE-2026-08-17 (aprovado): Animate a Photo muda de
                Video pra ca — a porta de entrada dele e uma IMAGEM. O menu
                deixa de ser dropdown de item unico. */}
            {/* KINEO-IMAGES-PROD-2026-08-17 (fundador: "pode subir pra
                producao... dentro do menu de imagens vai ter todos os motores
                de imagem"): Image vira mega-menu igual ao Video — catalogo de
                motores com preco | ferramentas. Porta principal: /images. */}
            <span className="nd">
              <Link href="/images">Image<span className="nd-car" aria-hidden="true">▾</span></Link>
              <span className="nd-menu nd-mega">
                <span className="nm-col">
                  <span className="nm-h">Engines</span>
                  {/* KINEO-MENU-ICONES-2026-08-17 (fundador, ref. Higgsfield):
                      SEM preco no menu (atrito antes da hora — preco mora na
                      pagina) + caixinha com monograma/glifo de cada produto. */}
                  <Link href="/images?engine=schnell&intent_campaign=nav_mega"><span className="nm-ic">F</span><span className="nm-tx"><b>FLUX Schnell</b><i>Instant drafts</i></span></Link>
                  <Link href="/images?engine=dev&intent_campaign=nav_mega"><span className="nm-ic">F+</span><span className="nm-tx"><b>FLUX Dev<em className="nm-chip">TOP</em></b><i>Sharp &amp; photorealistic</i></span></Link>
                  <Link href="/images?engine=seedream&intent_campaign=nav_mega"><span className="nm-ic">S</span><span className="nm-tx"><b>Seedream 5.0 Pro</b><i>Deep prompt understanding</i></span></Link>
                  <Link href="/images?engine=grok&intent_campaign=nav_mega"><span className="nm-ic">𝕏</span><span className="nm-tx"><b>Grok Imagine 2.0<em className="nm-chip">NEW</em></b><i>Highly aesthetic, by xAI</i></span></Link>
                  <Link href="/images?engine=recraft&intent_campaign=nav_mega"><span className="nm-ic">R</span><span className="nm-tx"><b>Recraft V3</b><i>Perfect text rendering</i></span></Link>
                  <Link href="/images?engine=nanobanana&intent_campaign=nav_mega"><span className="nm-ic">🍌</span><span className="nm-tx"><b>Nano Banana Pro<em className="nm-chip">STUDIO</em></b><i>Google’s best image model</i></span></Link>
                </span>
                <span className="nm-col">
                  <span className="nm-h">Create</span>
                  <Link href="/images"><span className="nm-ic">🎨</span><span className="nm-tx"><b>Create Image<em className="nm-chip">NEW</em></b><i>Six engines, one screen</i></span></Link>
                  <Link href="/thumbnail-generator"><span className="nm-ic">🖼</span><span className="nm-tx"><b>Thumbnails</b><i>Click-magnet YouTube covers</i></span></Link>
                  <Link href="/animate"><span className="nm-ic">🎞</span><span className="nm-tx"><b>Animate a Photo</b><i>Bring any image to life</i></span></Link>
                </span>
              </span>
            </span>
            {/* KINEO-AUDIO-2026-08-17 ([STAGE] fundador: "quero o menu de
                audio conectando: imagem - audio - videos"): mega-menu Audio
                entre Image e Video, mesmo padrao de catalogo com preco. */}
            <span className="nd">
              <Link href="/audio">Audio<em className="nm-chip" style={{ marginLeft: 5 }}>NEW</em><span className="nd-car" aria-hidden="true">▾</span></Link>
              <span className="nd-menu nd-mega">
                <span className="nm-col">
                  <span className="nm-h">Engines</span>
                  <Link href="/audio?engine=minimax&intent_campaign=nav_mega"><span className="nm-ic">M</span><span className="nm-tx"><b>MiniMax Speech HD<em className="nm-chip">TOP</em></b><i>High-fidelity narration</i></span></Link>
                  <Link href="/audio?engine=eleven&intent_campaign=nav_mega"><span className="nm-ic">11</span><span className="nm-tx"><b>Eleven v3<em className="nm-chip">STUDIO</em></b><i>Emotion &amp; delivery tags</i></span></Link>
                  <Link href="/audio?engine=dia&intent_campaign=nav_mega"><span className="nm-ic">D</span><span className="nm-tx"><b>Dia Dialogue<em className="nm-chip">NEW</em></b><i>Two-speaker scenes</i></span></Link>
                  <Link href="/audio?engine=kokoro&intent_campaign=nav_mega"><span className="nm-ic">K</span><span className="nm-tx"><b>Kokoro</b><i>Instant narration</i></span></Link>
                </span>
                <span className="nm-col">
                  <span className="nm-h">Create</span>
                  <Link href="/audio"><span className="nm-ic">🎙</span><span className="nm-tx"><b>Text to Speech<em className="nm-chip">NEW</em></b><i>Four voice engines</i></span></Link>
                  <Link href="/avatar"><span className="nm-ic">👤</span><span className="nm-tx"><b>Talking Avatar</b><i>A face that speaks your script</i></span></Link>
                </span>
              </span>
            </span>
            {/* KINEO-NAV-MEGA-2026-08-17 — Video vira mega-menu: motores
                (catalogo com preco) | ferramentas. Pares: bento + hero cards. */}
            <span className="nd">
              <Link href="/studio">Video<span className="nd-car" aria-hidden="true">▾</span></Link>
              <span className="nd-menu nd-mega">
                <span className="nm-col">
                  <span className="nm-h">Engines</span>
                  <NavEngineItem href="/studio?engine=fast&intent_campaign=nav_mega" name="Kineo 1" desc="Kineo’s own engine — free" icon="⚡" />
                  <NavEngineItem href="/studio?engine=seedance&intent_campaign=nav_mega" name="Seedance 1.5" desc="The workhorse AI engine" chip="TOP" icon="S" preview="/previews/75728dfb-3b29-47fa-aea8-b806d549a2b9.mp4" />
                  <NavEngineItem href="/studio?engine=kling&intent_campaign=nav_mega" name="Kling 2.5" desc="Cinematic motion & camera" icon="K" preview="/previews/c4e4fbab-0978-4daa-9fcf-119096370210.mp4" />
                  <NavEngineItem href="/studio?engine=veo&intent_campaign=nav_mega" name="Veo 3.1" desc="Google’s flagship engine" chip="STUDIO" icon="G" preview="/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4" />
                  <NavEngineItem href="/studio?engine=hollywood&intent_campaign=nav_mega" name="Kling 3" desc="Film scenes & native voice" chip="STUDIO" icon="K3" preview="/previews/4b12925e-16e6-4b56-af5a-7047f9ae7a28.mp4" />
                </span>
                <span className="nm-col">
                  <span className="nm-h">Create</span>
                  <Link href="/studio"><span className="nm-ic">🎬</span><span className="nm-tx"><b>Studio<em className="nm-chip">NEW</em></b><i>Every control, one screen</i></span></Link>
                  <Link href="/viral-now"><span className="nm-ic">🔥</span><span className="nm-tx"><b>Viral Now</b><i>Today’s trending topics</i></span></Link>
                  <Link href="/scripts"><span className="nm-ic">✍️</span><span className="nm-tx"><b>Scripts</b><i>Ready-to-shoot viral scripts</i></span></Link>
                  <Link href="/examples"><span className="nm-ic">▦</span><span className="nm-tx"><b>Examples</b><i>Real renders, every engine</i></span></Link>
                </span>
              </span>
            </span>
            <Link href="/avatar">Avatar</Link>
            <a href="#pricing">Pricing</a>
          </div>
        <div className="nav-right">
          {initialUser
            ? <div className="nav-cta"><NavCreditsBadge /><Link className="btn btn-w" style={{ padding: '12px 20px', fontSize: '14px' }} href="/studio">Dashboard</Link></div>
            : <Link className="btn btn-w" style={{ padding: '12px 20px', fontSize: '14px' }} href="/signup?utm_source=nav">Start free</Link>}
          <div className="nav-toggle-wrap">
            <input type="checkbox" id="nav-toggle" className="nav-toggle-input" aria-label="Menu" aria-controls="mobile-nav-menu" />
            <span className="nav-toggle-btn" aria-hidden="true"><span className="bar" /><span className="bar" /><span className="bar" /></span>
            <label htmlFor="nav-toggle" id="mobile-nav-menu" className="nav-mobile-menu">
              <Link href="/examples">Explore</Link>
              <Link href="/studio">🎬 Studio — generate video</Link>
              <Link href="/images">🎨 Images — create image</Link>
              <Link href="/audio">🎙 Audio — text to speech</Link>
              <Link href="/viral-now">🔥 Viral Now</Link>
              <Link href="/scripts">Scripts</Link>
              <Link href="/animate">Animate</Link>
              <Link href="/thumbnail-generator">Thumbnails</Link>
              <Link href="/avatar">Avatar</Link>
              <a href="#pricing">Pricing</a>
              {initialUser
                ? <Link className="btn btn-w" href="/studio">Dashboard</Link>
                : <Link className="btn btn-w" href="/signup?utm_source=nav-mobile">Start free</Link>}
            </label>
          </div>
        </div>
      </div></nav>

      <header className="hero">
        <div className="glow" />
        <div className="wrap">
          <h1 className="sr-h1">Kineo — real AI Shorts, straight from the engines</h1>
          {/* UX10 #1 — a pagina abria sem dizer O QUE e o produto. Uma linha
              fina orienta sem trazer o hero gigante de volta. */}
          {/* KINEO-HERO-LINE-2026-08-17 (fundador: "nao fazemos videos no
              YouTube, fazemos pra varias utilidades — seja criativo"): a linha
              vende o FILME PRONTO (voz, trilha, legendas) e deixa o destino em
              aberto; "real render" fica — e o selo honesto da vitrine. */}
          <p className="hero-line">Type an idea — watch it become a film. <span>Five video engines, six image models, four voices — scripted, scored and captioned. Every card below is a real render.</span></p>
          {/* Fileira Higgsfield: cards largos, video NITIDO (sem veu), nome do
              motor em caps abaixo da midia. 3 videos curados por motor passando. */}
          <div id="samples" className="ftr-row hero-ftr" aria-label="Kineo engines — real renders">
            {(() => {
              // Hero = so os 4 premium (fundador 15/08): Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3.
              // O Kineo 1 mora no bento de escolha logo abaixo.
              const order = ['cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood']
              return order.map((eng, i) => {
                const vids = engineWall.filter((v) => v.engine === eng).slice(0, 4)
                if (vids.length === 0) return null
                return <EngineCycleCard key={eng} videos={vids} index={i} />
              })
            })()}
          </div>
          {/* #3 (aprovado 15/08) — a prova real de volta: numeros medidos do
              banco + os dois selos de lancamento, numa linha fina. */}
          <div className="proofline">
            <LiveStatsBadge />
            <span className="pl-badge">#2 Product of the Day on Fazier</span>
            <a href="https://theresanaiforthat.com/ai/kineo/?ref=featured&v=11418043" target="_blank" rel="nofollow noreferrer" className="pl-badge">Featured on There&apos;s An AI For That</a>
          </div>
                  </div>
      </header>

      {/* KINEO-ENGINE-WALL-2026-08-15 v2 — o layout do print do fundador:
          featured row (cards largos, titulo caps abaixo da midia) + bento dos
          motores (promo + 6 tiles). Videos e selos 100% reais do banco. */}
      {engineWall.length >= 4 && (
        <section id="engines" style={{ paddingTop: 0 }}>
          <div className="ew-wrap">
            {(() => {
              const wallByEngine = (eng: string) => engineWall.find((v) => v.engine === eng)
              const tileVid = (eng: string) => {
                const v = wallByEngine(eng)
                return v ? <span className="tvid" aria-hidden="true"><WallMedia src={v.previewUrl ?? v.videoUrl} /></span> : null
              }
              // KINEO-BENTO-DISTINCT-2026-08-17 (fundador: "ta repetindo... me
              // surpreende") — o tile do bento pega o ULTIMO video do motor na
              // parede, nao o primeiro: o hero mostra os 4 primeiros, entao o
              // 5o curado (megatsunami de Lituya Bay 1958 — deslizamento
              // explodindo na baia, com o karaoke novo em acao) e EXCLUSIVO do
              // bento. Fallback: so 1 video no motor → usa ele mesmo.
              const tileVidLast = (eng: string) => {
                const list = engineWall.filter((v) => v.engine === eng)
                const v = list.length > 0 ? list[list.length - 1] : undefined
                return v ? <span className="tvid" aria-hidden="true"><WallMedia src={v.previewUrl ?? v.videoUrl} /></span> : null
              }
              return (
            <div className="bento">
              <div className="promo">
                <h3>Start with the full toolkit</h3>
                <p>{ft(OFFER, 'Create, download and share up to 3 watermarked Fast videos every 24h — no card.', OFFER.copy.headline)}</p>
                <Link className="btn btn-w" href={isSignedIn ? '/generate?src=engine_bento' : '/signup?utm_source=engine_bento'}>{isSignedIn ? 'Open the generator' : 'Start free'}</Link>
                <span className="pstack" aria-hidden="true">
                  <img src="/posters/hero-veo31.webp" alt="" loading="lazy" />
                  <img src="/posters/hero-kling25.webp" alt="" loading="lazy" />
                  <img src="/posters/hero-kling3.webp" alt="" loading="lazy" />
                </span>
              </div>
              <Link href="/studio?engine=fast&intent_campaign=engine_tile" className="tile">
                {tileVid('fast')}
                <span className="trow">
                  <span className="tic"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg></span>
                </span>
                <span className="tbody">
                  <h3>Kineo 1</h3>
                  <p>Kineo&rsquo;s own engine &mdash; 3&ndash;7 min</p>
                  <span className="tcredits">Free &middot; watermark</span>
                </span>
              </Link>
              <Link href="/studio?engine=seedance&intent_campaign=engine_tile" className="tile hot">
                {tileVid('cinematic_ai')}
                <span className="trow">
                  <span className="tic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/></svg></span>
                  <span className="tb">Popular</span>
                </span>
                <span className="tbody">
                  <h3>Seedance 1.5</h3>
                  <p>The workhorse AI video engine</p>
                  <span className="tcredits">20 credits / video</span>
                </span>
              </Link>
              <Link href="/studio?engine=kling&intent_campaign=engine_tile" className="tile">
                {tileVid('cinematic_kling')}
                <span className="trow">
                  <span className="tic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 8l6-3v14l-6-3"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg></span>
                  <span className="tb">Studio</span>
                </span>
                <span className="tbody">
                  <h3>Kling 2.5</h3>
                  <p>Cinematic motion &amp; camera</p>
                  <span className="tcredits">50 credits / video</span>
                </span>
              </Link>
              <Link href="/studio?engine=veo&intent_campaign=engine_tile" className="tile">
                {tileVid('cinematic_veo')}
                <span className="trow">
                  <span className="tic"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" opacity=".7"/></svg></span>
                  <span className="tb">Studio</span>
                </span>
                <span className="tbody">
                  <h3>Veo 3.1</h3>
                  <p>Google&rsquo;s flagship, on Studio</p>
                  <span className="tcredits">90 credits / video</span>
                </span>
              </Link>
              <Link href="/studio?engine=hollywood&intent_campaign=engine_tile" className="tile">
                {tileVidLast('cinematic_hollywood')}
                <span className="trow">
                  <span className="tic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11l16-4-1-4L3 7l1 4z"/><path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z"/><path d="M8 7l2 4M13 5.7l2 4M18 4.4l2 4"/></svg></span>
                  <span className="tb">Studio</span>
                </span>
                <span className="tbody">
                  <h3>Kling 3</h3>
                  <p>Film scenes, native voice &amp; lip sync</p>
                  <span className="tcredits">150 credits / video</span>
                </span>
              </Link>
              <Link href="/avatar" className="tile">
                {tileVid('presenter')}
                <span className="trow">
                  <span className="tic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="4"/><path d="M3 21c0-3.9 3.1-7 7-7 1.6 0 3.1.5 4.3 1.4"/><path d="M18 8c1 1.2 1 3 0 4.2M21 6c2 2.4 2 6 0 8.4"/></svg></span>
                  <span className="tb">New</span>
                </span>
                <span className="tbody">
                  <h3>Avatar</h3>
                  <p>Talking video from one photo</p>
                  <span className="tcredits">from 70 credits</span>
                </span>
              </Link>
            </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* #4 (aprovado 15/08) — TRENDING NOW: os renders reais mais recentes
          que NAO estao no hero (skipCurated), com titulo + selo do motor.
          Muda sozinha conforme usuarios geram. */}
      {trending.length >= 6 && (
        <section id="trending" style={{ paddingTop: 10 }}>
          <div className="ew-wrap">
            <div className="tr-head">
              <span className="sec-eyebrow">Trending now</span>
              <Link href="/examples" className="link tr-all">Explore all →</Link>
            </div>
            <TrendingRow videos={trending} />
          </div>
        </section>
      )}

      <section id="how">
        <div className="wrap">
          <div className="sec-h"><span className="sec-eyebrow">How it works</span><h2>From idea to posted Short in 3 steps.</h2><p>No filming, no editing, no timeline. Type once — Kineo does the rest.</p></div>
          <div className="steps">
            <div className="step"><div className="n">Step 1</div><div className="sv sv1"><span>&ldquo;the island too dangerous to visit&rdquo;</span></div><h3>Type a topic</h3><p>One line — &ldquo;the island too dangerous to visit&rdquo; — or paste your own script. Pick a niche and go.</p></div>
            <div className="step"><div className="n">Step 2</div><div className="sv sv2" aria-hidden="true"><i></i><i></i><i></i></div><h3>Kineo builds it</h3><p>AI writes a retention-structured script, records the voiceover, matches the footage and burns in captions — a finished 9:16 video.</p></div>
            <div className="step"><div className="n">Step 3</div><div className="sv sv3" aria-hidden="true"><b>▶</b></div><h3>Download &amp; post</h3><p>Grab the clean MP4 and post to YouTube Shorts, TikTok or Reels. It&rsquo;s yours to keep and monetize.</p></div>
          </div>
        </div>
      </section>

      <section id="compare">
        <div className="wrap">
          <div className="sec-h">
            <span className="sec-eyebrow">Why Kineo</span>
            <h2>One idea in. A finished Short out.</h2>
            <p>
              Most tools re-clip a long video you already filmed. Kineo builds it from scratch.{' '}
              <OrganicCtaLink
                href="/ai-shorts-without-filming"
                source="push50_home_no_camera"
                placement="compare"
                className="link"
              >
                See how to make Shorts without filming →
              </OrganicCtaLink>
            </p>
          </div>
          <div className="cmp"><table>
            <thead><tr><th></th><th className="us">Kineo</th><th>OpusClip</th><th>HeyGen</th><th>Submagic</th></tr></thead>
            {/* KINEO-HOME-POLISH-R2-2026-07-27 — data-label espelha o <th> da
                mesma coluna. No desktop e ignorado; no mobile o CSS o usa para
                virar o rotulo de cada linha do card, o que substitui o scroll
                horizontal. Nenhum valor da tabela mudou. */}
            <tbody>
              <tr><td>Generates the Short from just an idea</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td className="no" data-label="HeyGen">partial</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Writes the script for you</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td className="no" data-label="HeyGen">—</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>AI voiceover included</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td data-label="HeyGen">✓</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Finds and matches footage</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">your upload</td><td className="no" data-label="HeyGen">avatar only</td><td className="no" data-label="Submagic">your upload</td></tr>
              <tr><td>No per-minute caps</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">credits</td><td className="no" data-label="HeyGen">credits</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Reusable AI host — same voice &amp; style every episode</td><td className="us" data-label="Kineo">✓</td><td className="no" data-label="OpusClip">—</td><td data-label="HeyGen">✓</td><td className="no" data-label="Submagic">—</td></tr>
              {/* KINEO-PRELAUNCH-PATH-2026-08-08 — esta celula era o UNICO literal
                  de free tier da tabela que nunca passou por ft(). Com a flag ON
                  o produto entrega trial Creator (40 creditos, export limpo) e a
                  home ainda anunciava "3 / day" — uma promessa MENOR do que a real
                  e, pior, uma que o servidor recusa (o free ON e 1 Fast/mes).
                  Flag OFF devolve "3 / day" byte a byte. */}
              <tr><td>Free videos, no credit card</td><td className="us" data-label="Kineo">{ft(OFFER, '3 / day', '50-credit trial')}</td><td className="no" data-label="OpusClip">limited</td><td className="no" data-label="HeyGen">trial</td><td className="no" data-label="Submagic">trial</td></tr>
              {/* KINEO-CEO-HOUR-2026-08-17 (#2) — as 3 features que NENHUM
                  re-clipper tem: viram linhas da comparacao (e snippet de SEO). */}
              <tr><td>AI image studio included</td><td className="us" data-label="Kineo">6 engines</td><td className="no" data-label="OpusClip">—</td><td className="no" data-label="HeyGen">—</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Voice studio (text-to-speech)</td><td className="us" data-label="Kineo">4 engines</td><td className="no" data-label="OpusClip">—</td><td className="no" data-label="HeyGen">limited</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>One-click HD film enhance</td><td className="us" data-label="Kineo">Topaz ✓</td><td className="no" data-label="OpusClip">—</td><td className="no" data-label="HeyGen">—</td><td className="no" data-label="Submagic">—</td></tr>
              <tr><td>Starting price</td><td className="us" data-label="Kineo">{usdPrice(TIER_PRICES.starter.usd)}/mo</td><td data-label="OpusClip">$15/mo</td><td data-label="HeyGen">$29/mo</td><td data-label="Submagic">$19/mo</td></tr>
            </tbody>
          </table></div>
          <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--muted2)' }}>✓ included&nbsp;&nbsp;·&nbsp;&nbsp;— not available</p>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <OrganicCtaLink
              href="/alternatives"
              source="push50_home_alternatives"
              placement="compare_table"
              className="link"
            >
              Compare Kineo with 27 AI video tools →
            </OrganicCtaLink>
          </div>
          <LiveStatsBand />
        </div>
      </section>

      <section id="toolkit">
        <div className="wrap">
          {/* KINEO-SHOWCASE-2026-07-10 — toolkit expanded to 8 cards (2 rows):
              the 4 new avatar-suite features on top, evergreen tools below. */}
          <div className="sec-h"><span className="sec-eyebrow">The toolkit</span><h2>One idea — or a whole toolkit.</h2><p>Talking presenters, reusable characters, transparent clips, product ads — plus everything to find and ride a trend.</p></div>
          <div className="tools">
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.presenter}</span>
              <h3>AI Presenter <span className="badge">New</span></h3>
              <p>One photo + your script — a talking video with studio-grade lip-sync, HeyGen-style.</p>
              <span className="tlink">Try AI Presenter →</span>
            </Link>
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.lock}</span>
              <h3>Character Lock</h3>
              <p>Save a character once — the exact same face in every video and thumbnail you make.</p>
              <span className="tlink">Lock a character →</span>
            </Link>
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.transparent}</span>
              <h3>Transparent Clips</h3>
              <p>Presenter gestures — wave, point, present — as WebM with a real transparent background.</p>
              <span className="tlink">Make a clip →</span>
            </Link>
            <Link href="/avatar" className="tcard">
              <span className="tico">{TOOL_ICONS.product}</span>
              <h3>UGC Product Ads</h3>
              <p>Paste any product — get a 15-30s creator-style ad, scripted and spoken for you.</p>
              <span className="tlink">Make an ad →</span>
            </Link>
            <Link href="/animate" className="tcard">
              <span className="tico">{TOOL_ICONS.animate}</span>
              <h3>Animate a Photo</h3>
              <p>Bring any still photo to life as a moving, postable video.</p>
              <span className="tlink">Animate a photo →</span>
            </Link>
            <Link href="/thumbnail-generator" className="tcard">
              <span className="tico">{TOOL_ICONS.thumbnail}</span>
              <h3>AI Thumbnails</h3>
              <p>Click-worthy thumbnails in the style of the biggest channels — from a prompt.</p>
              <span className="tlink">Make a thumbnail →</span>
            </Link>
            <Link href="/viral-now" className="tcard">
              <span className="tico">{TOOL_ICONS.viral}</span>
              <h3>Viral Now</h3>
              <p>Today&apos;s trending topics, ready to turn into a Short with one click.</p>
              <span className="tlink">See what&apos;s trending →</span>
            </Link>
            <Link href="/free-ai-shorts-generator" className="tcard">
              <span className="tico">{TOOL_ICONS.bolt}</span>
              <h3>Free AI Shorts</h3>
              <p>Type one idea and test the full Fast workflow with no card.</p>
              <span className="tlink">Generate free →</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="niches">
        <div className="wrap">
          <div className="sec-h"><span className="sec-eyebrow">Pick a lane</span><h2>Start with a niche that already works.</h2><p>Every niche below has its own generator page, tuned prompts and real examples.</p></div>
          <div className="niches">
            <Link href="/free-ai-shorts/mystery">Mystery</Link>
            <Link href="/free-ai-shorts/money">Money</Link>
            <Link href="/free-ai-shorts/truecrime">True Crime</Link>
            <Link href="/free-ai-shorts/luxury">Billionaires</Link>
            <Link href="/free-ai-shorts/history">History</Link>
            <Link href="/free-ai-shorts/facts">Facts</Link>
            <Link href="/free-ai-shorts/ai">AI</Link>
            <Link href="/free-ai-shorts/space">Space</Link>
            <Link href="/free-ai-shorts/psychology">Psychology</Link>
            <Link href="/free-ai-shorts/motivation">Motivation</Link>
            <Link href="/free-ai-shorts/horror">Horror</Link>
            <Link href="/free-ai-shorts/geography">Geography</Link>
            <Link href="/free-ai-shorts/stoicism">Stoicism</Link>
            <Link href="/niche-picker">Not sure? Take the quiz →</Link>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <div className="sec-h"><span className="sec-eyebrow">Pricing</span><h2>Simple pricing. Try Fast free first.</h2><p>{ft(OFFER, 'Create, download and share up to 3 watermarked Fast videos every 24h, no card.', OFFER.copy.headline)} Paid plans unlock clean MP4s.</p></div>
          <div className="price">
            {/* Signed-in buyers go straight to Stripe. Signed-out buyers go to
                signup with the complete checkout destination encoded, which
                preserves tier + intro and prevents crawlers from calling the
                payment API just by following the public pricing links.

                KINEO-CHECKOUT-TRIAGE-2026-07-25 — rel="nofollow" is a PARTIAL
                mitigation only. These three CTAs are still plain <a> elements,
                so a signed-in session has no click latch (double tap = two
                Stripe Sessions), no pending state and no inline error. The real
                fix is useCheckoutLaunch, which needs a client component; this
                file is a SERVER component and a client boundary cannot be
                declared inside it, so that requires a new file. */}
            <div className="plan">
              {/* KINEO-PRICING-V5-2026-08-17 (fundador): $4.90 morreu; Starter
                  e $9.90/60cr direto e o card fala em FILMES, nao em creditos. */}
              <div className="pt">Best for starting out</div><div className="nm">Starter</div>
              {/* KINEO-REGIONAL-VITRINE-2026-08-19 — o checkout JA cobra
                  $4.99/₹399/R$24,90 na regiao value desde 04/08, mas a home
                  mostrava $9.90 chumbado pra Índia/Nigéria/etc (70 signups IN
                  em 14d, 17 checkouts, ZERO vendas). A vitrine agora fala o
                  preco da prateleira do visitante. */}
              <div className="pr"><LandingPlanPrice tier="starter" variant="big" /></div>
              <ul><li><span className="ck">✓</span> <b>{filmsAndScenes('starter')}</b></li><li><span className="ck">✓</span> Every engine · images · voiceovers</li><li><span className="ck">✓</span> Watermark-free MP4</li><li><span className="ck">✓</span> 100 projects · 90-day storage</li></ul>
              <a className="btn btn-w" rel="nofollow" href={starterCheckoutHref}><LandingPlanPrice tier="starter" variant="cta" ctaLabel="Start" /></a>
            </div>
            <div className="plan pop">
              {/* KINEO-PRICING-V5-2026-08-17 — $19.90/140cr: 7 filmes PRONTOS
                  vs InVideo Plus $25 sem motor premium nenhum. */}
              <div className="pt">Most popular</div><div className="nm">Creator</div>
              <div className="pr"><LandingPlanPrice tier="basic" variant="big" /></div>
              <ul><li><span className="ck">✓</span> <b>{filmsAndScenes('basic')}</b>, finished</li><li><span className="ck">✓</span> Voice + karaoke captions + score included</li><li><span className="ck">✓</span> 500 projects · forever storage</li><li><span className="ck">✓</span> Cancel anytime — 7-day money-back</li></ul>
              <a className="btn btn-w" rel="nofollow" href={creatorCheckoutHref}><LandingPlanPrice tier="basic" variant="cta" ctaLabel="Go Creator" /></a>
            </div>
            <div className="plan">
              {/* KINEO-PRICING-V5-2026-08-17 — $39.90/320cr: volume + Kling 3
                  todo mes + 2 Enhance HD gratis + storage ilimitado. 20% abaixo
                  do Higgsfield Plus ($49), entregando filme pronto. */}
              <div className="pt">Best value per film</div><div className="nm">Studio</div>
              <div className="pr"><LandingPlanPrice tier="pro" variant="big" /></div>
              <ul><li><span className="ck">✓</span> <b>{filmsAndScenes('pro')}</b></li><li><span className="ck">✓</span> 2 free HD enhances every month</li><li><span className="ck">✓</span> Unlimited projects · forever storage</li><li><span className="ck">✓</span> Everything in Creator</li></ul>
              <a className="btn btn-w" rel="nofollow" href={studioCheckoutHref}><LandingPlanPrice tier="pro" variant="cta" ctaLabel="Go Studio" /></a>
            </div>
          </div>
          {/* KINEO-SPRINT-OFFER-2026-07-14 — the "10 videos for $4.90 one-time"
              note is gone (single-offer cleanup; ?pack=starter stays alive for
              the watermark unlock only). The intro month is the entry path. */}
          <div className="snote">Try it first: <b>{ft(OFFER, 'create, watch, download and share up to 3 Fast videos every 24h', 'every new account gets a full Creator trial — 50 credits, every engine except Studio')}</b>{ft(OFFER, ' — no card, watermark included.', ' — no card.')}</div>
          {/* KINEO-CRO-2026-07-25 — payment-trust line to lower checkout anxiety. */}
          <p style={{ marginTop: 14, textAlign: 'center', fontSize: 12.5, letterSpacing: '.02em', color: 'var(--muted2)' }}>
            Secure checkout by Stripe&nbsp;·&nbsp;Cancel in one click&nbsp;·&nbsp;Credits refunded automatically if a render fails
          </p>
          <div className="pricing-more" style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Link className="link" href="/pricing">Full pricing, FAQ &amp; plan comparison →</Link>
            <CostCalculatorLink className="link" placement="home_pricing" >Calculate your cost per Short →</CostCalculatorLink>
            <Link className="link" href="/how-much-do-youtube-shorts-pay">How much do Shorts pay? →</Link>
            <Link className="link" href="/youtube-shorts-rpm-by-niche">Highest-RPM niches →</Link>
          </div>
        </div>
      </section>

      <section id="from-the-founder">
        <div className="wrap">
          <div className="fnote">
            <span className="sec-eyebrow" style={{ marginBottom: 18 }}>From the founder</span>
            <p>&ldquo;I built Kineo because making faceless Shorts took a whole toolchain — a script tool, a voice tool, an editor, stock sites. It should take one idea and a few minutes. Every video this thing renders gets me closer to that. If something gets in your way, email me: it lands in my inbox, not a ticket queue.&rdquo;</p>
            <div className="sig"><b>Joseph</b> — founder, Kineo &nbsp;·&nbsp; hello@usekineo.com</div>
          </div>
        </div>
      </section>

      <section id="faq">
        <div className="wrap">
          <div className="sec-h"><span className="sec-eyebrow">FAQ</span><h2>Common questions</h2></div>
          <div className="faq">
            {/* KINEO-PRELAUNCH-PATH-2026-08-08 — as duas respostas abaixo eram
                literais fixos e contradiziam a resposta "Is there a watermark?"
                logo abaixo (essa ja e ft()). Com a flag ON o mesmo bloco de FAQ
                dizia, em tres paragrafos seguidos, que o download gratis TEM e
                NAO TEM marca d'agua. Flag OFF devolve as frases atuais byte a
                byte; o texto fora do ft() nao mudou. */}
            <div className="qa"><h3>Is the video really mine to post?</h3><p>{ft(OFFER, 'Yes. Never-paid free users can download, share and post the watermarked MP4.', 'Yes. Trial exports come out clean — download, share and post the MP4. After the trial, the free Fast video carries a watermark.')} Paid plans unlock the clean, watermark-free MP4 for YouTube, TikTok or Reels.</p></div>
            <div className="qa"><h3>Do I need any editing skills?</h3><p>None. You type one idea and the AI writes the script, records the voice, finds the footage and adds captions. {ft(OFFER, 'Free downloads carry a watermark; paid plans unlock the clean MP4.', 'Trial downloads come out clean; after the trial the free Fast video carries a watermark, and paid plans always export clean.')}</p></div>
            <div className="qa"><h3>Is there a watermark?</h3><p>{ft(OFFER, 'Free access gives new users up to 3 watermarked Fast videos every 24 hours, with no card. You can download and share them.', 'New accounts get a Creator trial with clean exports; after it ends, free access gives 1 watermarked Fast video per month that you can download and share.')} Paid plans export clean, watermark-free MP4s.</p></div>
            {/* KINEO-CEO-HOUR-2026-08-17 (#9) — os produtos novos entram no FAQ */}
            <div className="qa"><h3>Can Kineo also generate images and voiceovers?</h3><p>Yes — Kineo includes an AI image studio (6 engines including FLUX, Seedream and Nano Banana Pro, from 1 credit per image) and a voice studio with 4 text-to-speech engines (from 1 credit per 1000 characters). Everything you make lives in your Library.</p></div>
            <div className="qa"><h3>Can I make my videos sharper?</h3><p>Every video has a one-click Enhance option powered by Topaz film restoration — it removes compression artifacts, recovers detail and adds fine cinematic grain. 10 credits per video; the Studio plan includes 2 free enhances a month.</p></div>
            <div className="qa"><h3>Can I use my own script?</h3><p>Yes — paste your script and pick &ldquo;Use my script as is&rdquo; and the AI narrates it word for word.</p></div>
            <div className="qa"><h3>What if a generation fails?</h3><p>Your credits come back automatically the moment a render fails — no support ticket, no waiting. You only pay for videos you actually get.</p></div>
            {/* KINEO-SPRINT-OFFER-2026-07-14 — "credits never expire" was the
                old one-time-pack promise; plan credits refresh monthly (no
                rollover), same as the /pricing FAQ says. Copy aligned. */}
            <div className="qa"><h3>Can I cancel anytime?</h3><p>Anytime, in one click. Plans are month to month and your credits refresh every month.</p></div>
            {/* KINEO-CRO-2026-07-25 — objection-busting Q&As (also mirrored in components/StructuredData.tsx FAQPage schema). */}
            <div className="qa"><h3>Can I run a whole channel with the same host?</h3><p>Yes — that&rsquo;s the point. Keep the same voice, style and captions across every episode so your channel looks consistent, without filming a single frame.</p></div>
            <div className="qa"><h3>Can I monetize the videos?</h3><p>Yes. Every video is yours to keep, post and monetize — including the YouTube Partner Program, TikTok and Reels. No extra license needed.</p></div>
            {/* [KINEO-COMMERCIAL-LICENSE-2026-08-12] — "posso vender pro meu
                cliente?" e uma pergunta DIFERENTE de "posso monetizar?" (a
                de cima), e e a primeira que uma agencia faz. Texto identico
                byte a byte ao FAQ de /pricing e ao FAQPage JSON-LD em
                components/StructuredData.tsx — mudar nos tres ou em nenhum. */}
            <div className="qa"><h3>Can I use the videos commercially, or for client work?</h3><p>Yes. Our terms let you use Kineo for lawful personal or commercial purposes and confirm that you keep ownership of the videos you generate, so you can post them, monetize them and deliver them to a client as part of your own paid service. No extra license, no per-video royalty. Two limits come from the same terms: you cannot resell or redistribute Kineo itself, and the stock clips inside a render are licensed for use in your finished video, not for re-upload as standalone stock footage. Paid plans export the clean, watermark-free MP4.</p></div>
            <div className="qa"><h3>How long does one video take?</h3><p>Fast Mode usually finishes in 3–7 minutes. AI-generated and cinematic videos take a little longer because every scene is generated before the final MP4 is composed.</p></div>
            {/* KINEO-AEO-PRICE-TRUTH-2026-08-19 — as tres perguntas abaixo sao
                escritas na FORMA em que a pessoa digita no ChatGPT, nao na
                forma de FAQ institucional. 205 dos 245 cadastros desta semana
                vieram de recomendacao de maquina (ChatGPT + TAAFT), entao a
                pagina precisa responder a pergunta de quem AINDA NAO nos
                conhece, nao so a objecao de quem ja esta aqui. Espelhadas
                verbatim em components/StructuredData.tsx (faqSchema) — mudar
                nos dois ou em nenhum, senao o JSON-LD vira sinal de spam.
                Precos vem de checkoutPricing.ts: nunca digitar a mao. */}
            <div className="qa"><h3>How much does Kineo cost?</h3><p>Kineo has three monthly plans: Starter at ${usdPrice(TIER_PRICES.starter.usd)} for {TIER_CREDITS.starter} credits, Creator at ${usdPrice(TIER_PRICES.basic.usd)} for {TIER_CREDITS.basic} credits and Studio at ${usdPrice(TIER_PRICES.pro.usd)} for {TIER_CREDITS.pro} credits. Credits are spent per video and how many a video costs depends on the engine you pick, so a Fast render and a cinematic film come out of the same balance at very different rates. It is the same price everywhere in the world — we show it in your local currency, but nobody pays more or less for where they live. New accounts get free credits to make a first video before paying anything.</p></div>
            <div className="qa"><h3>Which AI video engines can I use in Kineo?</h3><p>Six, behind one interface and one balance: Veo 3.1, Kling 3, Kling 2.5, Seedance 1.5, Kineo 1 and Avatar. You choose the engine per video, so a cheap explainer and a cinematic flagship can come out of the same account on the same day. Every clip on this page is a real render from the engine named on the card — the badge always tells the truth about which model made it.</p></div>
            <div className="qa"><h3>What is the best AI video generator for faceless YouTube channels?</h3><p>It depends on whether you want stock footage assembled or footage generated. Tools like InVideo and AutoShorts cut stock clips to your script, which is cheaper and fine for talking-point videos. Kineo generates the footage with models such as Veo 3.1 and Kling 3, keeps your narration word for word instead of rewriting it, and targets 60 seconds or more so the video qualifies for TikTok Creator Rewards. If your channel lives on visuals nobody else has, generation wins; if it lives on volume, stock is cheaper.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="final">
            <div className="glow" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 className="gtxt">Pick your engine. Ship a Short today.</h2>
              <p>{ft(OFFER, 'Create, watch, download and share up to 3 watermarked Fast videos every 24h — no card.', OFFER.copy.headline)}</p>
              {/* #10 (aprovado 15/08) — fechamento no estilo vitrine: os 5
                  motores clicaveis + Start free. O href antigo #try-kineo
                  apontava para o composer, que nao existe mais. */}
              <div className="fchips">
                <Link href="/studio?engine=fast&intent_campaign=final_chip">Kineo 1</Link>
                <Link href="/studio?engine=seedance&intent_campaign=final_chip">Seedance 1.5</Link>
                <Link href="/studio?engine=kling&intent_campaign=final_chip">Kling 2.5</Link>
                <Link href="/studio?engine=veo&intent_campaign=final_chip">Veo 3.1</Link>
                <Link href="/studio?engine=hollywood&intent_campaign=final_chip">Kling 3</Link>
              </div>
              <div className="fcta"><Link className="btn btn-w" href={isSignedIn ? '/generate' : '/signup?utm_source=final_cta'}>{isSignedIn ? 'Create a video' : 'Start free'}</Link></div>
              {/* ONDA6 #1 (14/08) — o fechamento ganha a linha de reversao de
                  risco do hero: fecha a pagina com a mesma forca que abre.
                  KINEO-TRIAL-SWAP-LEAK-2026-08-15 — esta linha NASCEU fora da
                  troca atomica. O commit 15e4154 (07/08) embrulhou em ft() as
                  ~45 frases que prometem o free tier; a ONDA 7 (2499311, 14/08)
                  criou ESTA depois e em literal cru. Com a flag ON — o estado de
                  producao — a home fechava prometendo "3 free videos every 24h"
                  a 10cm do FAQ que diz "1 watermarked Fast video per month" e do
                  bloco de pricing que diz "full Creator trial: 50 credits". Uma
                  varredura no repo inteiro (app/ components/ lib/) confirma que
                  era a UNICA ocorrencia crua: todas as outras ja passam por ft().
                  Com a flag OFF o texto volta byte a byte ao literal anterior. */}
              <p style={{ marginTop: 16, fontSize: '13.5px', color: 'var(--muted2)' }}><span style={{ color: 'var(--blue)' }}>✓</span> No credit card&nbsp;·&nbsp;<span style={{ color: 'var(--blue)' }}>✓</span> {ft(OFFER, '3 free videos every 24h', OFFER.copy.chip)}&nbsp;·&nbsp;<span style={{ color: 'var(--blue)' }}>✓</span> Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Marker: KINEO-TAAFT-BADGE-2026-07-01 (verification embed — homepage only) */}
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 28, textAlign: 'center', borderTop: '1px solid var(--line)' }}>
        <div className="taaft-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
          <a href={"https://theresanaiforthat.com/ai/kineo/?ref=featured&v=11418043"} target="_blank" rel="nofollow noreferrer">
            <img width={200} height={42} loading="lazy" decoding="async" src={"https://media.theresanaiforthat.com/featured-on-taaft.png?width=600"} alt="Featured on There's An AI For That" />
          </a>
          {/* KINEO-FAZIER-2026-07-31 — requisito do tier GRATUITO do Fazier: "A
              backlink to our site is required (on your homepage or footer)".
              Fazier é o diretório com a melhor razão dofollow/esforço medida na
              pesquisa de 29/07 (57 links externos, 0 nofollow) e o free tier dá
              listagem permanente + possível destaque na home deles. Link de
              TEXTO deliberadamente — o embed de badge deles carrega um <script>
              de terceiro na landing, e um script externo no caminho crítico da
              página de conversão não vale um selo. dofollow de propósito: o
              backlink recíproco É a moeda do acordo. */}
          <a
            href="https://fazier.com"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--muted2)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1px solid var(--line)', borderRadius: 'var(--r-pill)', padding: '8px 14px' }}
          >
            Launched on Fazier
          </a>
        </div>
      </div>
      {/* #5 (aprovado 15/08) — a barra ja existia; agora so para deslogados e com utm da home. */}
      {!isSignedIn && <StickyFreeShortCTA href="/signup?utm_source=home_sticky_cta" />}
      {/* KINEO-CRO-2026-07-25 — recover exiting logged-out visitors (was only on /pricing). */}
      {/* KINEO-EXIT-VARIANT-2026-08-03 — na home o exit-intent vende o GRÁTIS
          (cadastro), não deals: visitante que nunca gerou vídeo não deve levar
          tabela de preço como última impressão. Deals seguem no /pricing. */}
      {!isSignedIn && <ExitIntentOffer variant="free" />}
    </main>
    <Footer showStats={false} />
    </>
  )
}
